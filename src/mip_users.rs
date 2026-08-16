use axum::{extract::State, response::IntoResponse, Json};
use serde::Serialize;
use std::sync::{Arc, Mutex};
use rusqlite::Connection;

type DbState = Arc<Mutex<Connection>>;

#[derive(Serialize)]
struct MipUser {
    username: String,
    full_name: String,
    description: String,
    groups: String,
}

// API-эндпоинт для отдачи данных в mip_users.js
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
