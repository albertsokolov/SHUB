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
    .route("/ports", get(get_ports_handler))
    .route("/ports/add", post(add_port_handler))
    .route("/ports/remove", post(delete_port_handler))
}

#[derive(Serialize)]
pub struct MipPort {
    pub id: i64,
    pub name: String,
    pub description: String,
    pub interpreter: String,
}

#[derive(Deserialize)]
pub struct CreatePortRequest {
    pub name: String,
    pub description: String,
    pub interpreter: String,
}

#[derive(Deserialize)]
pub struct DeletePortRequest {
    pub id: i64,
}

#[derive(Serialize)]
pub struct PortActionResponse {
    pub success: bool,
    pub message: String,
}

// ИСПРАВЛЕНО: Чистая выборка плоского списка портов (скриптов) без удаления колонки service_id
pub async fn get_ports_handler(
    State(db): State<DbState>,
                               cookies: Cookies,
) -> impl IntoResponse {
    if cookies.get("admin_token").is_none() {
        return (StatusCode::FORBIDDEN, "Access Denied").into_response();
    }

    // Защищаем выполнение через безопасный lock() без паники при Poison
    let conn = match db.lock() {
        Ok(guard) => guard,
        Err(poisoned) => poisoned.into_inner(),
    };

    let mut stmt = match conn.prepare("SELECT id, name, description, interpreter FROM ports_tab ORDER BY name ASC") {
        Ok(s) => s,
        Err(e) => return (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response(),
    };

    let port_iter = stmt
    .query_map([], |row| {
        Ok(MipPort {
            id: row.get(0)?,
           name: row.get(1)?,
           description: row.get::<_, Option<String>>(2)?.unwrap_or_else(|| "—".to_string()),
           interpreter: row.get(3)?,
        })
    })
    .unwrap();

    let mut ports = Vec::new();
    for port in port_iter {
        if let Ok(p) = port {
            ports.push(p);
        }
    }

    Json(ports).into_response()
}

// Регистрация нового скрипта
pub async fn add_port_handler(
    State(db): State<DbState>,
                              cookies: Cookies,
                              Json(payload): Json<CreatePortRequest>,
) -> impl IntoResponse {
    if cookies.get("admin_token").is_none() {
        return (StatusCode::FORBIDDEN, "Access Denied").into_response();
    }

    let port_name = payload.name.trim().to_string();
    if port_name.is_empty() {
        return Json(PortActionResponse { success: false, message: "Имя скрипта не может быть пустым".to_string() }).into_response();
    }

    let conn = match db.lock() {
        Ok(guard) => guard,
        Err(poisoned) => poisoned.into_inner(),
    };

    match conn.execute(
        "INSERT INTO ports_tab (name, description, interpreter) VALUES (?, ?, ?)",
                       (&port_name, &payload.description, &payload.interpreter),
    ) {
        Ok(_) => {
            logger::info(APP_NAME, &format!("Успешно портирован скрипт автоматизации: {}", port_name));
            Json(PortActionResponse { success: true, message: "Port script added".to_string() }).into_response()
        },
        Err(e) => Json(PortActionResponse { success: false, message: format!("Ошибка базы данных: {}", e) }).into_response(),
    }
}

// Удаление (отмена регистрации) скрипта
pub async fn delete_port_handler(
    State(db): State<DbState>,
                                 cookies: Cookies,
                                 Json(payload): Json<DeletePortRequest>,
) -> impl IntoResponse {
    if cookies.get("admin_token").is_none() {
        return (StatusCode::FORBIDDEN, "Access Denied").into_response();
    }

    let conn = match db.lock() {
        Ok(guard) => guard,
        Err(poisoned) => poisoned.into_inner(),
    };

    match conn.execute("DELETE FROM ports_tab WHERE id = ?", [payload.id]) {
        Ok(rows) if rows > 0 => {
            logger::info(APP_NAME, &format!("Удален скрипт/порт автоматизации ID {}", payload.id));
            Json(PortActionResponse { success: true, message: "Port script removed".to_string() }).into_response()
        },
        Ok(_) => Json(PortActionResponse { success: false, message: "Скрипт не найден".to_string() }).into_response(),
        Err(e) => Json(PortActionResponse { success: false, message: e.to_string() }).into_response(),
    }
}
