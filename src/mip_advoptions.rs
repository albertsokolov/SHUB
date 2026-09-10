use axum::{
    extract::{State, Query},
    response::IntoResponse,
    routing::{get, post},
    http::StatusCode,
    Json, Router,
};
use serde::{Deserialize, Serialize};
use std::sync::{Arc, Mutex};
use std::fs;
use std::path::Path;
use rusqlite::Connection;
use tower_cookies::Cookies;
use crate::logger;

type DbState = Arc<Mutex<Connection>>;
static APP_NAME: &str = "SHUB";

pub fn router() -> Router<DbState> {
    Router::new()
    .route("/advoptions", get(get_adv_options_handler))
    .route("/advoptions/save", post(save_adv_options_handler))
    .route("/browse-dir", get(browse_directory_handler))
}

#[derive(Serialize, Deserialize, Clone)]
pub struct AdvOptionsResponse {
    pub path: String,
    pub http_port: String,
    pub https_port: String,
    pub https_status: String,
}

#[derive(Serialize)]
pub struct AdvOptionsActionResponse {
    pub success: bool,
    pub message: String,
}

#[derive(Deserialize)]
pub struct BrowseDirQuery {
    pub path: String,
}

#[derive(Serialize)]
pub struct DirItem {
    pub name: String,
    pub absolute_path: String,
}

#[derive(Serialize)]
pub struct BrowseDirResponse {
    pub current_path: String,
    pub parent_path: Option<String>,
    pub folders: Vec<DirItem>,
}

// Рекурсивная функция безопасного переноса содержимого из одной папки в другую
fn move_dir_contents(from: &Path, to: &Path) -> std::io::Result<()> {
    if !from.exists() || !from.is_dir() {
        return Ok(()); // Если старой папки нет, переносить нечего
    }
    // Гарантируем физическое существование целевого каталога назначения
    fs::create_dir_all(to)?;

    for entry in fs::read_dir(from)? {
        let entry = entry?;
        let file_type = entry.file_type()?;
        let source_path = entry.path();
        let target_path = to.join(entry.file_name());

        if file_type.is_dir() {
            // Рекурсивно уходим вглубь подпапки
            move_dir_contents(&source_path, &target_path)?;
            // Удаляем пустую исходную подпапку после копирования содержимого
            let _ = fs::remove_dir(source_path);
        } else {
            // Переносим одиночный файл. Сначала пробуем переименовать (быстро)
            if fs::rename(&source_path, &target_path).is_err() {
                // Если cross-device (разные разделы), делаем потоковое копирование и удаление
                fs::copy(&source_path, &target_path)?;
                fs::remove_file(source_path)?;
            }
        }
    }
    Ok(())
}

// Получение настроек из KeyValue таблицы cfg_tab
pub async fn get_adv_options_handler(
    State(db): State<DbState>,
                                     cookies: Cookies,
) -> impl IntoResponse {
    if cookies.get("admin_token").is_none() {
        return (StatusCode::FORBIDDEN, "Access Denied").into_response();
    }

    let conn = db.lock().unwrap();
    let get_param = |p: &str, default: &str| -> String {
        conn.query_row(
            "SELECT value FROM cfg_tab WHERE parameter = ?",
            [p],

            |r| r.get::<_, String>(0)
        ).unwrap_or_else(|_| default.to_string())
    };

    let options = AdvOptionsResponse {
        path: get_param("storage", "/store/"),
        http_port: get_param("http", "3000"),
        https_port: get_param("https", "3001"),
        https_status: get_param("https_status", "off"),
    };

    Json(options).into_response()
}

// Сохранение настроек с автоматической миграцией файлов данных
pub async fn save_adv_options_handler(
    State(db): State<DbState>,
                                      cookies: Cookies,
                                      Json(payload): Json<AdvOptionsResponse>,
) -> impl IntoResponse {
    if cookies.get("admin_token").is_none() {
        return (StatusCode::FORBIDDEN, "Access Denied").into_response();
    }

    let mut old_path_str = String::new();

    // Считываем текущий (старый) сохраненный путь до перезаписи базы данных
    {
        let conn = db.lock().unwrap();
        if let Ok(path) = conn.query_row(
            "SELECT value FROM cfg_tab WHERE parameter = 'storage'",
            [],

            |r| r.get::<_, String>(0)
        ) {
            old_path_str = path;
        }
    }

    // Приводим новый целевой путь к единому каноничному формату
    let mut new_path_str = payload.path.trim().to_string();
    if !new_path_str.ends_with('/') {
        new_path_str.push('/');
    }

    // ПРОВЕРКА И МИГРАЦИЯ: Если администратор физически изменил каталог хранения
    if !old_path_str.is_empty() && old_path_str != new_path_str {
        let source_dir = Path::new(&old_path_str);
        let target_dir = Path::new(&new_path_str);

        logger::info(APP_NAME, &format!("Запущена миграция файлов хранилища из {} в {}", old_path_str, new_path_str));

        if let Err(e) = move_dir_contents(source_dir, target_dir) {
            logger::error(APP_NAME, &format!("Критическая ошибка переноса файлов: {}", e));
            return Json(AdvOptionsActionResponse {
                success: false,
                message: format!("Не удалось перенести файлы в новое место: {}", e)
            }).into_response();
        }
    }

    // Сохраняем новые параметры в SQLite cfg_tab
    let mut conn = db.lock().unwrap();
    let tx = match conn.transaction() {
        Ok(t) => t,
        Err(e) => return (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response(),
    };

    let query = "INSERT OR REPLACE INTO cfg_tab (parameter, value) VALUES (?, ?)";

    if tx.execute(query, ["storage", &new_path_str]).is_err() ||
        tx.execute(query, ["http", &payload.http_port]).is_err() ||
        tx.execute(query, ["https", &payload.https_port]).is_err() ||
        tx.execute(query, ["https_status", &payload.https_status]).is_err() {
            logger::error(APP_NAME, "Ошибка сохранения Key-Value параметров конфигурации в cfg_tab");
            return Json(AdvOptionsActionResponse { success: false, message: "Ошибка записи БД".to_string() }).into_response();
        }

        if tx.commit().is_err() {
            return Json(AdvOptionsActionResponse { success: false, message: "Ошибка фиксации транзакции".to_string() }).into_response();
        }

        logger::info(APP_NAME, &format!("Конфигурация успешно обновлена в базе данных. Активный путь: {}", new_path_str));
        Json(AdvOptionsActionResponse { success: true, message: "Success".to_string() }).into_response()
}

// Безопасный эндпоинт серверного обхода папок
pub async fn browse_directory_handler(
    cookies: Cookies,
    Query(query): Query<BrowseDirQuery>,
) -> impl IntoResponse {
    if cookies.get("admin_token").is_none() {
        return (StatusCode::FORBIDDEN, "Access Denied").into_response();
    }

    let mut clean_path = query.path.trim().to_string();
    if clean_path.ends_with('/') && clean_path.len() > 1 {
        clean_path.pop();
    }

    let mut target_path = Path::new(&clean_path).to_path_buf();

    if clean_path.is_empty() || !target_path.exists() || !target_path.is_dir() {
        if clean_path.contains("store") {
            let _ = fs::create_dir_all(&clean_path);
        }
        if !target_path.exists() {
            target_path = std::env::current_dir().unwrap_or_else(|_| Path::new("/").to_path_buf());
        }
    }

    let absolute_target = fs::canonicalize(&target_path).unwrap_or(target_path);
    let current_path_str = absolute_target.to_string_lossy().into_owned();
    let parent_path = absolute_target.parent().map(|p| p.to_string_lossy().into_owned());

    let mut folders = Vec::new();

    if let Ok(entries) = fs::read_dir(&absolute_target) {
        for entry in entries.flatten() {
            if let Ok(file_type) = entry.file_type() {
                if file_type.is_dir() {
                    let name = entry.file_name().to_string_lossy().into_owned();
                    if !name.starts_with('.') {
                        let absolute_path = entry.path().to_string_lossy().into_owned();
                        folders.push(DirItem { name, absolute_path });
                    }
                }
            }
        }
    }

    folders.sort_by(|a, b| a.name.to_lowercase().cmp(&b.name.to_lowercase()));

    Json(BrowseDirResponse {
        current_path: current_path_str,
         parent_path,
         folders,
    }).into_response()
}
