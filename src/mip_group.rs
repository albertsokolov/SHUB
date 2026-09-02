use axum::{
    extract::{State, Query},
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

type DbState = Arc<Mutex<Connection>>;

pub fn router() -> Router<DbState> {
    Router::new()
    .route("/groups", get(get_mip_groups_handler))
    .route("/groups/members", get(get_group_members_handler))
    .route("/groups/members/add", post(add_group_member_handler))       // Новый
    .route("/groups/members/remove", post(remove_group_member_handler)) // Новый
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

#[derive(Deserialize)]
pub struct MemberActionRequest {
    pub group_id: i64,
    pub username: String,
}

#[derive(Serialize)]
pub struct GroupActionResponse {
    pub success: bool,
    pub message: String,
}

// Получение списка всех групп
pub async fn get_mip_groups_handler(
    State(db): State<DbState>,
                                    cookies: Cookies,
) -> impl IntoResponse {
    if cookies.get("admin_token").is_none() {
        return (StatusCode::FORBIDDEN, "Access Denied").into_response();
    }
    let conn = db.lock().unwrap();
    let mut stmt = conn.prepare("SELECT id, name, description FROM group_tab ORDER BY name ASC").unwrap();
    let group_iter = stmt.query_map([], |row| {
        Ok(MipGroup {
            id: row.get(0)?,
           name: row.get(1)?,
           description: row.get::<_, Option<String>>(2)?.unwrap_or_else(|| "—".to_string()),
        })
    }).unwrap();
    let mut groups = Vec::new();
    for group in group_iter { if let Ok(g) = group { groups.push(g); } }
    Json(groups).into_response()
}

// Получение участников конкретной группы
pub async fn get_group_members_handler(
    State(db): State<DbState>,
                                       cookies: Cookies,
                                       Query(query): Query<GroupIdQuery>,
) -> impl IntoResponse {
    if cookies.get("admin_token").is_none() {
        return (StatusCode::FORBIDDEN, "Access Denied").into_response();
    }
    let conn = db.lock().unwrap();
    let mut stmt = conn.prepare(
        "SELECT u.username, u.fullname, u.description FROM user_tab u
        JOIN member_tab m ON u.id = m.user_id WHERE m.group_id = ? ORDER BY u.username ASC"
    ).unwrap();
    let member_iter = stmt.query_map([query.id], |row| {
        Ok(GroupMember {
            username: row.get(0)?,
           fullname: row.get(1)?,
           description: row.get::<_, Option<String>>(2)?.unwrap_or_else(|| "—".to_string()),
        })
    }).unwrap();
    let mut members = Vec::new();
    for member in member_iter { if let Ok(m) = member { members.push(m); } }
    Json(members).into_response()
}

// Обработчик привязки пользователя к группе
pub async fn add_group_member_handler(
    State(db): State<DbState>,
                                      cookies: Cookies,
                                      Json(payload): Json<MemberActionRequest>,
) -> impl IntoResponse {
    if cookies.get("admin_token").is_none() {
        return (StatusCode::FORBIDDEN, "Access Denied").into_response();
    }
    let conn = db.lock().unwrap();

    // Запрещаем менять состав системных администраторов для безопасности
    if payload.group_id == 1 && payload.username != "admin" {
        return Json(GroupActionResponse { success: false, message: "Нельзя модифицировать группу системных администраторов".to_string() }).into_response();
    }

    // Ищем ID пользователя по юзернейму
    let user_id_res: Result<i64, _> = conn.query_row(
        "SELECT id FROM user_tab WHERE username = ?",
        [&payload.username],

        |row| row.get(0)
    );

    match user_id_res {
        Ok(user_id) => {
            if db_tools::is_member_exists(&conn, user_id, payload.group_id) {
                return Json(GroupActionResponse { success: false, message: "Пользователь уже состоит в этой группе".to_string() }).into_response();
            }
            match db_tools::add_group_member(&conn, user_id, payload.group_id) {
                Ok(_) => Json(GroupActionResponse { success: true, message: "Member added".to_string() }).into_response(),
                Err(e) => Json(GroupActionResponse { success: false, message: e.to_string() }).into_response()
            }
        }
        Err(_) => Json(GroupActionResponse { success: false, message: "Пользователь не найден".to_string() }).into_response()
    }
}

// Обработчик удаления пользователя из состава группы
pub async fn remove_group_member_handler(
    State(db): State<DbState>,
                                         cookies: Cookies,
                                         Json(payload): Json<MemberActionRequest>,
) -> impl IntoResponse {
    if cookies.get("admin_token").is_none() {
        return (StatusCode::FORBIDDEN, "Access Denied").into_response();
    }
    let conn = db.lock().unwrap();

    // Запрещаем удалять корневого admin из группы Администраторы
    if payload.group_id == 1 && payload.username == "admin" {
        return Json(GroupActionResponse { success: false, message: "Нельзя удалить корневого администратора из его роли".to_string() }).into_response();
    }

    match db_tools::remove_group_member(&conn, &payload.username, payload.group_id) {
        Ok(rows) if rows > 0 => Json(GroupActionResponse { success: true, message: "Member removed".to_string() }).into_response(),
        Ok(_) => Json(GroupActionResponse { success: false, message: "Пользователь не найден в этой группе".to_string() }).into_response(),
        Err(e) => Json(GroupActionResponse { success: false, message: e.to_string() }).into_response()
    }
}
