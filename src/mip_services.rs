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
    pub port_id: Option<i64>,
    pub name: String,
    pub description: String,
    pub port_name: String,
}

#[derive(Deserialize)]
pub struct CreateServiceRequest {
    pub name: String,
    pub description: String,
    pub port_id: Option<i64>,
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

// Получение списка всех сервисов с JOIN к портативным скриптам (ports_tab)
pub async fn get_services_handler(
    State(db): State<DbState>,
                                  cookies: Cookies,
) -> impl IntoResponse {
    if cookies.get("admin_token").is_none() {
        return (StatusCode::FORBIDDEN, "Access Denied").into_response();
    }

    let conn = match db.lock() {
        Ok(guard) => guard,
        Err(poisoned) => poisoned.into_inner(),
    };

    let mut stmt = conn
    .prepare(
        "SELECT s.id, s.port_id, s.name, s.description, COALESCE(p.name, '—')
    FROM services_tab s
    LEFT JOIN ports_tab p ON s.port_id = p.id
    ORDER BY s.name ASC"
    )
    .unwrap();

    let svc_iter = stmt
    .query_map([], |row| {
        Ok(MipService {
            id: row.get(0)?,
           port_id: row.get(1)?,
           name: row.get(2)?,
           description: row.get::<_, Option<String>>(3)?.unwrap_or_else(|| "—".to_string()),
           port_name: row.get(4)?,
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

// Добавление или обновление сервиса (INSERT OR REPLACE)
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

    let conn = match db.lock() {
        Ok(guard) => guard,
        Err(poisoned) => poisoned.into_inner(),
    };

    match conn.execute(
        "INSERT OR REPLACE INTO services_tab (port_id, name, description) VALUES (?, ?, ?)",
                       (payload.port_id, &svc_name, &payload.description),
    ) {
        Ok(_) => {
            logger::info(APP_NAME, &format!("Сохранена конфигурация сервиса автоматизации: {}", svc_name));
            Json(ServiceActionResponse { success: true, message: "Service saved".to_string() }).into_response()
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

    let conn = match db.lock() {
        Ok(guard) => guard,
        Err(poisoned) => poisoned.into_inner(),
    };

    match conn.execute("DELETE FROM services_tab WHERE id = ?", [payload.id]) {
        Ok(rows) if rows > 0 => {
            logger::info(APP_NAME, &format!("Удален сервис автоматизации ID {}", payload.id));
            Json(ServiceActionResponse { success: true, message: "Service removed".to_string() }).into_response()
        },
        Ok(_) => Json(ServiceActionResponse { success: false, message: "Сервис не найден".to_string() }).into_response(),
        Err(e) => Json(ServiceActionResponse { success: false, message: e.to_string() }).into_response(),
    }
}
