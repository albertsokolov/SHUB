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
    .route("/advoptions", get(get_adv_options_handler))
    .route("/advoptions/save", post(save_adv_options_handler))
}

#[derive(Serialize, Deserialize, Clone)]
pub struct AdvOptions {
    pub session_timeout: i32,
    pub enable_crypto: bool,
    pub debug_logging: bool,
}

// Получение настроек с защитой доступа
pub async fn get_adv_options_handler(
    State(db): State<DbState>,
                                     cookies: Cookies,
) -> impl IntoResponse {
    if cookies.get("admin_token").is_none() {
        return (StatusCode::FORBIDDEN, "Access Denied").into_response();
    }

    // Временные дефолтные настройки, пока не расширили cfg_tab в БД
    let options = AdvOptions {
        session_timeout: 30,
        enable_crypto: true,
        debug_logging: false,
    };

    Json(options).into_response()
}

// Сохранение настроек с защитой доступа
pub async fn save_adv_options_handler(
    State(db): State<DbState>,
                                      cookies: Cookies,
                                      Json(payload): Json<AdvOptions>,
) -> impl IntoResponse {
    if cookies.get("admin_token").is_none() {
        return (StatusCode::FORBIDDEN, "Access Denied").into_response();
    }

    logger::info(APP_NAME, &format!(
        "Расширенные настройки обновлены: Timeout={}, Crypto={}, Debug={}",
        payload.session_timeout, payload.enable_crypto, payload.debug_logging
    ));

    #[derive(Serialize)]
    struct Response { success: bool }
    Json(Response { success: true }).into_response()
}
