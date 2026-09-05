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

type DbState = Arc<Mutex<Connection>>;

pub fn router() -> Router<DbState> {
    Router::new()
    .route("/domains", get(get_domains_handler))
    .route("/domains/add", post(add_domain_handler))
    .route("/domains/remove", post(delete_domain_handler))
}

#[derive(Serialize)]
pub struct MipDomain {
    pub id: i64,
    pub name: String,
    pub description: String,
    pub is_primary: bool, // Имитируем флаг основного домена из макета
}

#[derive(Deserialize)]
pub struct CreateDomainRequest {
    pub name: String,
    pub description: String,
}

#[derive(Deserialize)]
pub struct DeleteDomainRequest {
    pub id: i64,
}

#[derive(Serialize)]
pub struct DomainActionResponse {
    pub success: bool,
    pub message: String,
}

// Получение списка доменов
pub async fn get_domains_handler(
    State(db): State<DbState>,
                                 cookies: Cookies,
) -> impl IntoResponse {
    if cookies.get("admin_token").is_none() {
        return (StatusCode::FORBIDDEN, "Access Denied").into_response();
    }

    let conn = db.lock().unwrap();
    let mut stmt = conn
    .prepare("SELECT id, name, description FROM domain_tab ORDER BY id ASC")
    .unwrap();

    let domain_iter = stmt
    .query_map([], |row| {
        let id: i64 = row.get(0)?;
        Ok(MipDomain {
            id,
            name: row.get(1)?,
           description: row.get::<_, Option<String>>(2)?.unwrap_or_else(|| "—".to_string()),
           is_primary: id == 1, // Первый созданный или системный домен делаем primary
        })
    })
    .unwrap();

    let mut domains = Vec::new();
    for domain in domain_iter {
        if let Ok(d) = domain {
            domains.push(d);
        }
    }

    Json(domains).into_response()
}

// Добавление домена
pub async fn add_domain_handler(
    State(db): State<DbState>,
                                cookies: Cookies,
                                Json(payload): Json<CreateDomainRequest>,
) -> impl IntoResponse {
    if cookies.get("admin_token").is_none() {
        return (StatusCode::FORBIDDEN, "Access Denied").into_response();
    }

    let domain_name = payload.name.trim().to_lowercase();
    if domain_name.is_empty() {
        return Json(DomainActionResponse { success: false, message: "Имя домена не может быть пустым".to_string() }).into_response();
    }

    let conn = db.lock().unwrap();
    match conn.execute(
        "INSERT INTO domain_tab (name, description, enabled) VALUES (?, ?, 1)",
                       (&domain_name, &payload.description),
    ) {
        Ok(_) => Json(DomainActionResponse { success: true, message: "Domain added".to_string() }).into_response(),
        Err(e) => Json(DomainActionResponse { success: false, message: format!("Домен уже существует или ошибка БД: {}", e) }).into_response(),
    }
}

// Удаление домена
pub async fn delete_domain_handler(
    State(db): State<DbState>,
                                   cookies: Cookies,
                                   Json(payload): Json<DeleteDomainRequest>,
) -> impl IntoResponse {
    if cookies.get("admin_token").is_none() {
        return (StatusCode::FORBIDDEN, "Access Denied").into_response();
    }

    if payload.id == 1 {
        return Json(DomainActionResponse { success: false, message: "Нельзя удалить основной встроенный домен системы".to_string() }).into_response();
    }

    let conn = db.lock().unwrap();
    match conn.execute("DELETE FROM domain_tab WHERE id = ?", [payload.id]) {
        Ok(rows) if rows > 0 => Json(DomainActionResponse { success: true, message: "Domain removed".to_string() }).into_response(),
        Ok(_) => Json(DomainActionResponse { success: false, message: "Домен не найден".to_string() }).into_response(),
        Err(e) => Json(DomainActionResponse { success: false, message: e.to_string() }).into_response(),
    }
}
