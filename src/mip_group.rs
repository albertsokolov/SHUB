use axum::{
    extract::{State, Query},
    response::IntoResponse,
    routing::get,
    Json, Router,
};
use serde::{Deserialize, Serialize};
use std::sync::{Arc, Mutex};
use rusqlite::Connection;

type DbState = Arc<Mutex<Connection>>;

pub fn router() -> Router<DbState> {
    Router::new()
    .route("/groups", get(get_mip_groups_handler))
    .route("/groups/members", get(get_group_members_handler)) // Новый эндпоинт
}

#[derive(Serialize)]
pub struct MipGroup {
    pub id: i64,
    pub name: String,
    pub description: String,
}

#[derive(Serialize)]
pub struct GroupMember {
    pub username: String,
    pub fullname: String,
    pub description: String,
}

#[derive(Deserialize)]
pub struct GroupIdQuery {
    pub id: i64,
}

// Получение списка всех групп
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

// Получение участников конкретной группы через JOIN
pub async fn get_group_members_handler(
    State(db): State<DbState>,
                                       Query(query): Query<GroupIdQuery>,
) -> impl IntoResponse {
    let conn = db.lock().unwrap();
    let mut stmt = conn
    .prepare(
        "SELECT u.username, u.fullname, u.description
        FROM user_tab u
        JOIN member_tab m ON u.id = m.user_id
        WHERE m.group_id = ?
        ORDER BY u.username ASC"
    )
    .unwrap();

    let member_iter = stmt
    .query_map([query.id], |row| {
        Ok(GroupMember {
            username: row.get(0)?,
           fullname: row.get(1)?,
           description: row.get::<_, Option<String>>(2)?.unwrap_or_else(|| "—".to_string()),
        })
    })
    .unwrap();

    let mut members = Vec::new();
    for member in member_iter {
        if let Ok(m) = member {
            members.push(m);
        }
    }
    Json(members)
}
