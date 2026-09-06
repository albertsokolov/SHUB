use axum::{
    extract::State,
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

type DbState = Arc<Mutex<Connection>>;
static APP_NAME: &str = "SHUB";

pub fn router() -> Router<DbState> {
    Router::new()
    .route("/modules", get(get_modules_handler))
    .route("/modules/add", post(add_module_handler))
    .route("/modules/remove", post(delete_module_handler))
}

#[derive(Serialize)]
pub struct MipModule {
    pub id: i64,
    pub name: String,
    pub description: String,
    pub is_system: bool, // Защитный флаг для Core Auth
}

#[derive(Deserialize)]
pub struct CreateModuleRequest {
    pub name: String,
    pub description: String,
}

#[derive(Deserialize)]
pub struct DeleteModuleRequest {
    pub id: i64,
}

#[derive(Serialize)]
pub struct ModuleActionResponse {
    pub success: bool,
    pub message: String,
}

// Получение списка всех модулей
pub async fn get_modules_handler(
    State(db): State<DbState>,
                                 cookies: Cookies,
) -> impl IntoResponse {
    if cookies.get("admin_token").is_none() {
        return (StatusCode::FORBIDDEN, "Access Denied").into_response();
    }

    let conn = db.lock().unwrap();
    let mut stmt = conn
    .prepare("SELECT id, name, description FROM module_tab ORDER BY name ASC")
    .unwrap();

    let module_iter = stmt
    .query_map([], |row| {
        let name: String = row.get(1)?;
        Ok(MipModule {
            id: row.get(0)?,
           is_system: name == "Core Auth", // Запрещаем удалять базовый системный модуль
           name,
           description: row.get::<_, Option<String>>(2)?.unwrap_or_else(|| "—".to_string()),
        })
    })
    .unwrap();

    let mut modules = Vec::new();
    for module in module_iter {
        if let Ok(m) = module {
            modules.push(m);
        }
    }

    Json(modules).into_response()
}

// Добавление нового модуля
pub async fn add_module_handler(
    State(db): State<DbState>,
                                cookies: Cookies,
                                Json(payload): Json<CreateModuleRequest>,
) -> impl IntoResponse {
    if cookies.get("admin_token").is_none() {
        return (StatusCode::FORBIDDEN, "Access Denied").into_response();
    }

    let module_name = payload.name.trim().to_string();
    if module_name.is_empty() {
        return Json(ModuleActionResponse { success: false, message: "Имя модуля не может быть пустым".to_string() }).into_response();
    }

    let conn = db.lock().unwrap();
    match conn.execute(
        "INSERT INTO module_tab (name, description) VALUES (?, ?)",
                       (&module_name, &payload.description),
    ) {
        Ok(_) => {
            logger::info(APP_NAME, &format!("Добавлен новый программный модуль: {}", module_name));
            Json(ModuleActionResponse { success: true, message: "Module added".to_string() }).into_response()
        },
        Err(e) => Json(ModuleActionResponse { success: false, message: format!("Модуль с таким именем уже зарегистрирован: {}", e) }).into_response(),
    }
}

// Удаление модуля
pub async fn delete_module_handler(
    State(db): State<DbState>,
                                   cookies: Cookies,
                                   Json(payload): Json<DeleteModuleRequest>,
) -> impl IntoResponse {
    if cookies.get("admin_token").is_none() {
        return (StatusCode::FORBIDDEN, "Access Denied").into_response();
    }

    let conn = db.lock().unwrap();

    // Проверяем имя перед удалением, чтобы защитить ядро авторизации
    let is_system_res: Result<String, _> = conn.query_row(
        "SELECT name FROM module_tab WHERE id = ?",
        [payload.id],

        |row| row.get(0)
    );

    if let Ok(name) = is_system_res {
        if name == "Core Auth" {
            return Json(ModuleActionResponse { success: false, message: "Запрещено удалять системный модуль авторизации ядра!".to_string() }).into_response();
        }
    }

    // Удаление записи каскадно очистит связанные права в permission_matrix_tab
    match conn.execute("DELETE FROM module_tab WHERE id = ?", [payload.id]) {
        Ok(rows) if rows > 0 => {
            logger::info(APP_NAME, &format!("Удален программный модуль ID {}", payload.id));
            Json(ModuleActionResponse { success: true, message: "Module removed".to_string() }).into_response()
        },
        Ok(_) => Json(ModuleActionResponse { success: false, message: "Модуль не найден".to_string() }).into_response(),
        Err(e) => Json(ModuleActionResponse { success: false, message: e.to_string() }).into_response(),
    }
}
