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
use crate::db_tools;
use crate::logger;

type DbState = Arc<Mutex<Connection>>;
static APP_NAME: &str = "SHUB";

// Суб-роутер для группировки эндпоинтов MIP-панели пользователей
pub fn router() -> Router<DbState> {
    Router::new()
    .route("/users", get(get_mip_users_handler))
    .route("/users/add", post(add_user_handler))
    .route("/users/remove", post(delete_user_handler))
    .route("/users/edit", post(edit_user_handler))
    .route("/users/status", post(set_status_handler))
}

#[derive(Serialize)]
pub struct MipUser {
    pub username: String,
    pub full_name: String,
    pub description: String,
    pub groups: String,
    pub enabled: bool,
}

#[derive(Deserialize)]
pub struct CreateUserRequest {
    pub login: String,
    pub firstname: String,
    pub lastname: String,
    pub email: Option<String>,
    pub password: String,
}

#[derive(Serialize)]
pub struct UserActionResponse {
    pub success: bool,
    pub message: String,
}

#[derive(Deserialize)]
pub struct DeleteUserRequest {
    pub login: String,
}

#[derive(Deserialize)]
pub struct SetStatusRequest {
    pub login: String,
    pub enabled: bool,
}

// Получение списка пользователей для ExtJS-таблицы
pub async fn get_mip_users_handler(
    State(db): State<DbState>,
                                   cookies: Cookies,
) -> impl IntoResponse {
    if cookies.get("admin_token").is_none() {
        return (StatusCode::FORBIDDEN, "Access Denied").into_response();
    }

    let conn = db.lock().unwrap();
    let mut stmt = conn
    .prepare("SELECT username, fullname, description, enabled FROM user_tab")
    .unwrap();

    let user_iter = stmt
    .query_map([], |row| {
        let is_enabled: i32 = row.get(3)?;
        Ok(MipUser {
            username: row.get(0)?,
           full_name: row.get(1)?,
           description: row.get::<_, Option<String>>(2)?.unwrap_or_else(|| "—".to_string()),
           groups: "—".to_string(),
           enabled: is_enabled == 1,
        })
    })
    .unwrap();

    let mut users = Vec::new();
    for user in user_iter {
        if let Ok(u) = user {
            users.push(u);
        }
    }

    Json(users).into_response()
}

// Обработчик добавления нового пользователя
pub async fn add_user_handler(
    State(db): State<DbState>,
                              cookies: Cookies,
                              Json(payload): Json<CreateUserRequest>,
) -> impl IntoResponse {
    if cookies.get("admin_token").is_none() {
        return (StatusCode::FORBIDDEN, "Access Denied").into_response();
    }

    let conn = db.lock().unwrap();
    let full_name = format!("{} {}", payload.firstname.trim(), payload.lastname.trim());
    let desc_opt = payload.email.as_deref().map(|s| s.trim()).filter(|s| !s.is_empty()).map(|s| s.to_string());
    let email_opt = desc_opt.clone();

    match db_tools::add_user(
        &conn,
        &payload.login,
        &payload.password,
        &full_name,
        email_opt,
        desc_opt,
    ) {
        Ok(_) => {
            logger::info(APP_NAME, &format!("Успешно добавлен пользователь: {}", payload.login));
            Json(UserActionResponse {
                success: true,
                message: "User added".to_string(),
            }).into_response()
        }
        Err(e) => {
            logger::error(APP_NAME, &format!("Ошибка добавления пользователя {}: {}", payload.login, e));
            Json(UserActionResponse {
                success: false,
                message: e.to_string(),
            }).into_response()
        }
    }
}

// Обработчик удаления пользователя
pub async fn delete_user_handler(
    State(db): State<DbState>,
                                 cookies: Cookies,
                                 Json(payload): Json<DeleteUserRequest>,
) -> impl IntoResponse {
    if cookies.get("admin_token").is_none() {
        return (StatusCode::FORBIDDEN, "Access Denied").into_response();
    }

    let conn = db.lock().unwrap();
    let username = &payload.login;

    if username == "admin" {
        return Json(UserActionResponse {
            success: false,
            message: "Cannot delete system administrator".to_string(),
        }).into_response();
    }

    match db_tools::delete_user(&conn, username) {
        Ok(rows) if rows > 0 => {
            logger::info(APP_NAME, &format!("Успешно удален пользователь: {}", username));
            Json(UserActionResponse {
                success: true,
                message: "User removed".to_string(),
            }).into_response()
        }
        Ok(_) => Json(UserActionResponse {
            success: false,
            message: "User not found".to_string(),
        }).into_response(),
        Err(e) => {
            logger::error(APP_NAME, &format!("Ошибка удаления пользователя {}: {}", username, e));
            Json(UserActionResponse {
                success: false,
                message: e.to_string(),
            }).into_response()
        }
    }
}

// Обработчик изменения данных пользователя
pub async fn edit_user_handler(
    State(db): State<DbState>,
                               cookies: Cookies,
                               Json(payload): Json<CreateUserRequest>,
) -> impl IntoResponse {
    if cookies.get("admin_token").is_none() {
        return (StatusCode::FORBIDDEN, "Access Denied").into_response();
    }

    let conn = db.lock().unwrap();
    let username = &payload.login;

    if username == "admin" {
        return Json(UserActionResponse {
            success: false,
            message: "Cannot modify system administrator".to_string(),
        }).into_response();
    }

    let full_name = format!("{} {}", payload.firstname.trim(), payload.lastname.trim());
    let desc_opt = payload.email.as_deref().map(|s| s.trim()).filter(|s| !s.is_empty()).map(|s| s.to_string());
    let email_opt = desc_opt.clone();

    match db_tools::update_user(
        &conn,
        username,
        &payload.password,
        &full_name,
        email_opt,
        desc_opt,
    ) {
        Ok(rows) if rows > 0 => {
            logger::info(APP_NAME, &format!("Успешно обновлен пользователь: {}", username));
            Json(UserActionResponse {
                success: true,
                message: "User updated".to_string(),
            }).into_response()
        }
        Ok(_) => Json(UserActionResponse {
            success: false,
            message: "User not found".to_string(),
        }).into_response(),
        Err(e) => {
            logger::error(APP_NAME, &format!("Ошибка обновления пользователя {}: {}", username, e));
            Json(UserActionResponse {
                success: false,
                message: e.to_string(),
            }).into_response()
        }
    }
}

// Обработчик изменения статуса (активен / заблокирован)
pub async fn set_status_handler(
    State(db): State<DbState>,
                                cookies: Cookies,
                                Json(payload): Json<SetStatusRequest>,
) -> impl IntoResponse {
    if cookies.get("admin_token").is_none() {
        return (StatusCode::FORBIDDEN, "Access Denied").into_response();
    }

    let conn = db.lock().unwrap();

    if payload.login == "admin" {
        return Json(UserActionResponse {
            success: false,
            message: "Cannot disable admin".to_string(),
        }).into_response();
    }

    match db_tools::set_user_status(&conn, &payload.login, payload.enabled) {
        Ok(rows) if rows > 0 => {
            logger::info(APP_NAME, &format!("Статус пользователя {} изменен на enabled={}", payload.login, payload.enabled));
            Json(UserActionResponse {
                success: true,
                message: "Status updated".to_string(),
            }).into_response()
        }
        Ok(_) => Json(UserActionResponse {
            success: false,
            message: "User not found".to_string(),
        }).into_response(),
        Err(e) => Json(UserActionResponse {
            success: false,
            message: e.to_string(),
        }).into_response(),
    }
}
