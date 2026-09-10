use axum::{
    extract::{State, Query},
    response::IntoResponse,
    routing::{get, post},
    http::StatusCode,
    Json, Router,
};
use serde::{Deserialize, Serialize};
use std::sync::{Arc, Mutex};
use rusqlite::Connection;
use tower_cookies::Cookies;
use crate::logger;
use std::fs;
use std::path::Path;

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

// Сохранение настроек в KeyValue таблицу cfg_tab
pub async fn save_adv_options_handler(
    State(db): State<DbState>,
                                      cookies: Cookies,
                                      Json(payload): Json<AdvOptionsResponse>,
) -> impl IntoResponse {
    if cookies.get("admin_token").is_none() {
        return (StatusCode::FORBIDDEN, "Access Denied").into_response();
    }

    let mut conn = db.lock().unwrap();
    let tx = match conn.transaction() {
        Ok(t) => t,
        Err(e) => return (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response(),
    };

    let query = "INSERT OR REPLACE INTO cfg_tab (parameter, value) VALUES (?, ?)";

    if tx.execute(query, ["storage", &payload.path]).is_err() ||
        tx.execute(query, ["http", &payload.http_port]).is_err() ||
        tx.execute(query, ["https", &payload.https_port]).is_err() ||
        tx.execute(query, ["https_status", &payload.https_status]).is_err() {
            logger::error(APP_NAME, "Ошибка сохранения Key-Value параметров конфигурации в cfg_tab");
            return Json(AdvOptionsActionResponse { success: false }).into_response();
        }

        if tx.commit().is_err() {
            return Json(AdvOptionsActionResponse { success: false }).into_response();
        }

        logger::info(APP_NAME, &format!(
            "Конфигурация успешно обновлена: storage={}, http={}, https={}, status={}",
            payload.path, payload.http_port, payload.https_port, payload.https_status
        ));

        Json(AdvOptionsActionResponse { success: true }).into_response()
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

// Безопасный эндпоинт серверного обхода папок с защитой от несуществующих путей
pub async fn browse_directory_handler(
    cookies: Cookies,
    Query(query): Query<BrowseDirQuery>,
) -> impl IntoResponse {
    if cookies.get("admin_token").is_none() {
        return (StatusCode::FORBIDDEN, "Access Denied").into_response();
    }

    // Очищаем путь от возможных хвостовых слешей для корректной проверки
    let mut clean_path = query.path.trim().to_string();
    if clean_path.ends_with('/') && clean_path.len() > 1 {
        clean_path.pop();
    }

    let mut target_path = Path::new(&clean_path).to_path_buf();

    // ЗАЩИТА: Если путь пустой или физически не существует, откатываемся на текущую папку программы
    if clean_path.is_empty() || !target_path.exists() || !target_path.is_dir() {
        // Пробуем создать папку, если это наш дефолтный store
        if clean_path.contains("store") {
            let _ = fs::create_dir_all(&clean_path);
        }

        if !target_path.exists() {
            target_path = std::env::current_dir().unwrap_or_else(|_| Path::new("/").to_path_buf());
        }
    }

    // Безопасное получение каноничного пути без падения
    let absolute_target = fs::canonicalize(&target_path)
    .unwrap_or(target_path);

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
