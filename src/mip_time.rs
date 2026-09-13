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
    .route("/time-tasks", get(get_time_tasks_handler))
    .route("/time-tasks/add", post(add_time_task_handler))
    .route("/time-tasks/remove", post(delete_time_task_handler))
}

#[derive(Serialize, Deserialize, Clone)]
pub struct TimeTask {
    pub id: i64,
    pub name: String,
    pub cron_expression: String,
    pub description: String,
}

#[derive(Deserialize)]
pub struct CreateTimeTaskRequest {
    pub id: Option<i64>, // Присутствует, если выполняется редактирование (UPDATE)
    pub name: String,
    pub cron_expression: String,
    pub description: String,
}

#[derive(Deserialize)]
pub struct DeleteTimeTaskRequest {
    pub id: i64,
}

#[derive(Serialize)]
pub struct TimeActionResponse {
    pub success: bool,
    pub message: String,
}

// Получение списка всех задач планировщика
pub async fn get_time_tasks_handler(
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
    .prepare("SELECT id, name, cron_expression, description FROM time_tab ORDER BY name ASC")
    .unwrap();

    let task_iter = stmt
    .query_map([], |row| {
        Ok(TimeTask {
            id: row.get(0)?,
           name: row.get(1)?,
           cron_expression: row.get(2)?,
           description: row.get::<_, Option<String>>(3)?.unwrap_or_else(|| "—".to_string()),
        })
    })
    .unwrap();

    let mut tasks = Vec::new();
    for task in task_iter {
        if let Ok(t) = task {
            tasks.push(t);
        }
    }

    Json(tasks).into_response()
}

// Добавление или обновление задачи планировщика (Точечный UPDATE/INSERT)
pub async fn add_time_task_handler(
    State(db): State<DbState>,
                                   cookies: Cookies,
                                   Json(payload): Json<CreateTimeTaskRequest>,
) -> impl IntoResponse {
    if cookies.get("admin_token").is_none() {
        return (StatusCode::FORBIDDEN, "Access Denied").into_response();
    }

    let task_name = payload.name.trim().to_string();
    let cron_expr = payload.cron_expression.trim().to_string();
    if task_name.is_empty() || cron_expr.is_empty() {
        return Json(TimeActionResponse { success: false, message: "Имя и Cron-выражение обязательны!".to_string() }).into_response();
    }

    let conn = match db.lock() {
        Ok(guard) => guard,
        Err(poisoned) => poisoned.into_inner(),
    };

    let result = if let Some(task_id) = payload.id {
        // Выполняем UPDATE, если редактируем старую запись
        conn.execute(
            "UPDATE time_tab SET name = ?, cron_expression = ?, description = ? WHERE id = ?",
            (&task_name, &cron_expr, &payload.description, task_id),
        )
    } else {
        // Выполняем INSERT, если создаем новую
        conn.execute(
            "INSERT INTO time_tab (name, cron_expression, description) VALUES (?, ?, ?)",
                     (&task_name, &cron_expr, &payload.description),
        )
    };

    match result {
        Ok(_) => {
            logger::info(APP_NAME, &format!("Конфигурация планировщика успешно сохранена: {}", task_name));
            Json(TimeActionResponse { success: true, message: "Task saved successfully".to_string() }).into_response()
        },
        Err(e) => Json(TimeActionResponse { success: false, message: format!("Ошибка базы данных: {}", e) }).into_response(),
    }
}

// Удаление задачи планировщика
pub async fn delete_time_task_handler(
    State(db): State<DbState>,
                                      cookies: Cookies,
                                      Json(payload): Json<DeleteTimeTaskRequest>,
) -> impl IntoResponse {
    if cookies.get("admin_token").is_none() {
        return (StatusCode::FORBIDDEN, "Access Denied").into_response();
    }

    let conn = match db.lock() {
        Ok(guard) => guard,
        Err(poisoned) => poisoned.into_inner(),
    };

    match conn.execute("DELETE FROM time_tab WHERE id = ?", [payload.id]) {
        Ok(rows) if rows > 0 => {
            logger::info(APP_NAME, &format!("Удалена задача планировщика ID {}", payload.id));
            Json(TimeActionResponse { success: true, message: "Task removed".to_string() }).into_response()
        },
        Ok(_) => Json(TimeActionResponse { success: false, message: "Задача не найдена".to_string() }).into_response(),
        Err(e) => Json(TimeActionResponse { success: false, message: e.to_string() }).into_response(),
    }
}
