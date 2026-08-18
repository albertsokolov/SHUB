use axum::{
    extract::State,
    response::IntoResponse,
    routing::{get, post},
    Json, Router,
};
use serde::{Deserialize, Serialize};
use std::sync::{Arc, Mutex};
use rusqlite::Connection;
use crate::db_tools;
use crate::logger;

type DbState = Arc<Mutex<Connection>>;
static APP_NAME: &str = "SHUB";

// Суб-роутер для группировки эндпоинтов MIP-панели
pub fn router() -> Router<DbState> {
    Router::new()
    .route("/users", get(get_mip_users_handler))
    .route("/users/add", post(add_user_handler))
    .route("/users/remove", post(delete_user_handler)) // Новый роут удаления
}

#[derive(Serialize)]
pub struct MipUser {
    pub username: String,
    pub full_name: String,
    pub description: String,
    pub groups: String,
}

#[derive(Deserialize)]
pub struct CreateUserRequest {
    pub login: String,
    pub password: String,
    pub firstname: String,
    pub lastname: String,
    pub email: Option<String>,
}

#[derive(Serialize)]
pub struct UserActionResponse {
    pub success: bool,
    pub message: String,
}

// Получение списка пользователей
pub async fn get_mip_users_handler(State(db): State<DbState>) -> impl IntoResponse {
    let conn = db.lock().unwrap();
    let mut stmt = conn
    .prepare("SELECT login, first_name || ' ' || last_name, email, '—' FROM user_tab")
    .unwrap();

    let user_iter = stmt
    .query_map([], |row| {
        Ok(MipUser {
            username: row.get(0)?,
           full_name: row.get(1)?,
           description: row.get(2)?,
           groups: row.get(3)?,
        })
    })
    .unwrap();

    let mut users = Vec::new();
    for user in user_iter {
        if let Ok(u) = user {
            users.push(u);
        }
    }

    Json(users)
}

// Обработчик добавления нового пользователя
pub async fn add_user_handler(
    State(db): State<DbState>,
                              Json(payload): Json<CreateUserRequest>,
) -> impl IntoResponse {
    let conn = db.lock().unwrap();

    let email_opt = payload.email
    .as_deref()
    .map(|s| s.trim())
    .filter(|s| !s.is_empty())
    .map(|s| s.to_string());

    match db_tools::add_user(
        &conn,
        &payload.login,
        &payload.password,
        &payload.firstname,
        &payload.lastname,
        email_opt
    ) {
        Ok(_) => {
            logger::info(APP_NAME, &format!("Успешно добавлен пользователь: {}", payload.login));
            Json(UserActionResponse {
                success: true,
                message: "User added".to_string()
            })
        }
        Err(e) => {
            logger::error(APP_NAME, &format!("Ошибка добавления пользователя {}: {}", payload.login, e));
            Json(UserActionResponse {
                success: false,
                message: e.to_string()
            })
        }
    }
}
// Маленькая структура, чтобы не тянуть внешнюю библиотеку serde_json в main.rs
#[derive(Deserialize)]
pub struct DeleteUserRequest {
    pub login: String,
}

// Обработчик удаления пользователя
pub async fn delete_user_handler(
    State(db): State<DbState>,
                                 Json(payload): Json<DeleteUserRequest>,
) -> impl IntoResponse {
    let conn = db.lock().unwrap();
    let login = &payload.login;

    if login == "admin" {
        return Json(UserActionResponse {
            success: false,
            message: "Cannot delete system administrator".to_string()
        });
    }

    match db_tools::delete_user(&conn, login) {
        Ok(rows) if rows > 0 => {
            logger::info(APP_NAME, &format!("Успешно удален пользователь: {}", login));
            Json(UserActionResponse {
                success: true,
                message: "User removed".to_string()
            })
        }
        Ok(_) => Json(UserActionResponse {
            success: false,
            message: "User not found".to_string()
        }),
        Err(e) => {
            logger::error(APP_NAME, &format!("Ошибка удаления пользователя {}: {}", login, e));
            Json(UserActionResponse {
                success: false,
                message: e.to_string()
            })
        }
    }
}
