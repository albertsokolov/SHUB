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
    .route("/services", get(get_services_handler))
    .route("/services/add", post(add_service_handler))
    .route("/services/remove", post(delete_service_handler))
}

#[derive(Serialize)]
pub struct MipService {
    pub id: i64,
    pub name: String,
    pub description: String,
}

#[derive(Deserialize)]
pub struct CreateServiceRequest {
    pub name: String,
    pub description: String,
}

#[derive(Deserialize)]
pub struct DeleteServiceRequest {
    pub id: i64,
}

#[derive(Serialize)]
pub struct ServiceActionResponse {
    pub success: bool,
    pub message: String,
}

// Получение списка всех сервисов
pub async fn get_services_handler(
    State(db): State<DbState>,
                                  cookies: Cookies,
) -> impl IntoResponse {
    if cookies.get("admin_token").is_none() {
        return (StatusCode::FORBIDDEN, "Access Denied").into_response();
    }

    let conn = db.lock().unwrap();
    let mut stmt = conn
    .prepare("SELECT id, name, description FROM services_tab ORDER BY name ASC")
    .unwrap();

    let svc_iter = stmt
    .query_map([], |row| {
        Ok(MipService {
            id: row.get(0)?,
           name: row.get(1)?,
           description: row.get::<_, Option<String>>(2)?.unwrap_or_else(|| "—".to_string()),
        })
    })
    .unwrap();

    let mut services = Vec::new();
    for svc in svc_iter {
        if let Ok(s) = svc {
            services.push(s);
        }
    }

    Json(services).into_response()
}

// Добавление нового сервиса
pub async fn add_service_handler(
    State(db): State<DbState>,
                                 cookies: Cookies,
                                 Json(payload): Json<CreateServiceRequest>,
) -> impl IntoResponse {
    if cookies.get("admin_token").is_none() {
        return (StatusCode::FORBIDDEN, "Access Denied").into_response();
    }

    let svc_name = payload.name.trim().to_string();
    if svc_name.is_empty() {
        return Json(ServiceActionResponse { success: false, message: "Имя сервиса не может быть пустым".to_string() }).into_response();
    }

    let conn = db.lock().unwrap();
    match conn.execute(
        "INSERT INTO services_tab (name, description) VALUES (?, ?)",
                       (&svc_name, &payload.description),
    ) {
        Ok(_) => {
            logger::info(APP_NAME, &format!("Добавлен новый сервис автоматизации: {}", svc_name));
            Json(ServiceActionResponse { success: true, message: "Service added".to_string() }).into_response()
        },
        Err(e) => Json(ServiceActionResponse { success: false, message: format!("Ошибка базы данных: {}", e) }).into_response(),
    }
}

// Удаление сервиса
pub async fn delete_service_handler(
    State(db): State<DbState>,
                                    cookies: Cookies,
                                    Json(payload): Json<DeleteServiceRequest>,
) -> impl IntoResponse {
    if cookies.get("admin_token").is_none() {
        return (StatusCode::FORBIDDEN, "Access Denied").into_response();
    }

    let conn = db.lock().unwrap();

    // При удалении сервиса, связанные порты в ports_tab получат service_id = NULL благодаря ON DELETE SET NULL
    match conn.execute("DELETE FROM services_tab WHERE id = ?", [payload.id]) {
        Ok(rows) if rows > 0 => {
            logger::info(APP_NAME, &format!("Удален сервис автоматизации ID {}", payload.id));
            Json(ServiceActionResponse { success: true, message: "Service removed".to_string() }).into_response()
        },
        Ok(_) => Json(ServiceActionResponse { success: false, message: "Сервис не найден".to_string() }).into_response(),
        Err(e) => Json(ServiceActionResponse { success: false, message: e.to_string() }).into_response(),
    }
}
