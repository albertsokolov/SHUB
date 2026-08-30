use axum::{
    extract::State,
    response::IntoResponse,
    routing::get,
    Json, Router,
};
use serde::Serialize;
use std::sync::{Arc, Mutex};
use rusqlite::Connection;

type DbState = Arc<Mutex<Connection>>;

pub fn router() -> Router<DbState> {
    Router::new()
    .route("/groups", get(get_mip_groups_handler))
}

#[derive(Serialize)]
pub struct MipGroup {
    pub id: i64,
    pub name: String,
    pub description: String,
}

// Получение списка групп для ExtJS-таблицы ролей
pub async fn get_mip_groups_handler(State(db): State<DbState>) -> impl IntoResponse {
    let conn = db.lock().unwrap();

    let mut stmt = conn
    .prepare("SELECT id, name, description FROM group_tab ORDER BY name ASC")
    .unwrap();

    let group_iter = stmt
    .query_map([], |row| {
        Ok(MipGroup {
            id: row.get(0)?,
           name: row.get(1)?,
           description: row.get::<_, Option<String>>(2)?.unwrap_or_else(|| "—".to_string()),
        })
    })
    .unwrap();

    let mut groups = Vec::new();
    for group in group_iter {
        if let Ok(g) = group {
            groups.push(g);
        }
    }

    Json(groups)
}
