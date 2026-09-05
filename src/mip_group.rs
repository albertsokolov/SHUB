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
use crate::logger;

type DbState = Arc<Mutex<Connection>>;
static APP_NAME: &str = "SHUB";

pub fn router() -> Router<DbState> {
    Router::new()
    .route("/groups", get(get_mip_groups_handler))
    .route("/groups/members", get(get_group_members_handler))
    .route("/groups/members/add", post(add_group_member_handler))
    .route("/groups/members/remove", post(remove_group_member_handler))
    .route("/groups/rights", get(get_group_rights_handler))              // Новый
    .route("/groups/rights/save", post(save_rights_handler))        // Новый
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

#[derive(Serialize)]
pub struct ModulePermission {
    pub module_id: i64,
    pub module_name: String,
    pub module_desc: String,
    pub can_read: bool,
    pub can_write: bool,
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

#[derive(Deserialize)]
pub struct SavePermissionItem {
    pub module_id: i64,
    pub can_read: bool,
    pub can_write: bool,
}

#[derive(Deserialize)]
pub struct SaveRightsRequest {
    pub group_id: i64,
    pub permissions: Vec<SavePermissionItem>,
}

#[derive(Serialize)]
pub struct GroupActionResponse {
    pub success: bool,
    pub message: String,
}

// Получение списка всех групп
pub async fn get_mip_groups_handler(State(db): State<DbState>, cookies: Cookies) -> impl IntoResponse {
    if cookies.get("admin_token").is_none() { return (StatusCode::FORBIDDEN, "Access Denied").into_response(); }
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
pub async fn get_group_members_handler(State(db): State<DbState>, cookies: Cookies, Query(query): Query<GroupIdQuery>) -> impl IntoResponse {
    if cookies.get("admin_token").is_none() { return (StatusCode::FORBIDDEN, "Access Denied").into_response(); }
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

// Получение матрицы прав доступа для конкретной группы
pub async fn get_group_rights_handler(State(db): State<DbState>, cookies: Cookies, Query(query): Query<GroupIdQuery>) -> impl IntoResponse {
    if cookies.get("admin_token").is_none() { return (StatusCode::FORBIDDEN, "Access Denied").into_response(); }
    let conn = db.lock().unwrap();

    // Левое соединение, чтобы вывелись ВСЕ модули, даже если для этой группы записи в permission_matrix_tab еще нет
    let mut stmt = conn.prepare(
        "SELECT mod.id, mod.name, mod.description,
        COALESCE(pm.can_read, 0), COALESCE(pm.can_write, 0)
    FROM module_tab mod
    LEFT JOIN permission_matrix_tab pm ON mod.id = pm.module_id AND pm.group_id = ?
    ORDER BY mod.name ASC"
    ).unwrap();

    let perm_iter = stmt.query_map([query.id], |row| {
        let r: i32 = row.get(3)?;
        let w: i32 = row.get(4)?;
        Ok(ModulePermission {
            module_id: row.get(0)?,
           module_name: row.get(1)?,
           module_desc: row.get::<_, Option<String>>(2)?.unwrap_or_else(|| "—".to_string()),
           can_read: r == 1,
           can_write: w == 1,
        })
    }).unwrap();

    let mut permissions = Vec::new();
    for perm in perm_iter { if let Ok(p) = perm { permissions.push(p); } }
    Json(permissions).into_response()
}

// Сохранение измененной матрицы прав доступа
pub async fn save_rights_handler(State(db): State<DbState>, cookies: Cookies, Json(payload): Json<SaveRightsRequest>) -> impl IntoResponse {
    if cookies.get("admin_token").is_none() { return (StatusCode::FORBIDDEN, "Access Denied").into_response(); }
    let mut conn = db.lock().unwrap();

    // Открываем транзакцию для безопасности записи пакета прав
    let tx = conn.transaction().unwrap();

    for item in payload.permissions {
        let r_val = if item.can_read { 1 } else { 0 };
        let w_val = if item.can_write { 1 } else { 0 };

        // Используем INSERT OR REPLACE (или UPSERT) для перезаписи матрицы прав
        let query = "INSERT OR REPLACE INTO permission_matrix_tab (group_id, module_id, can_read, can_write) VALUES (?, ?, ?, ?)";
        if let Err(e) = tx.execute(query, [payload.group_id, item.module_id, r_val, w_val]) {
            logger::error(APP_NAME, &format!("Ошибка сохранения прав группы: {}", e));
            return Json(GroupActionResponse { success: false, message: e.to_string() }).into_response();
        }
    }

    tx.commit().unwrap();
    logger::info(APP_NAME, &format!("Успешно обновлена матрица прав для группы ID {}", payload.group_id));
    Json(GroupActionResponse { success: true, message: "Rights updated".to_string() }).into_response()
}

pub async fn add_group_member_handler(State(db): State<DbState>, cookies: Cookies, Json(payload): Json<MemberActionRequest>) -> impl IntoResponse {
    if cookies.get("admin_token").is_none() { return (StatusCode::FORBIDDEN, "Access Denied").into_response(); }
    let conn = db.lock().unwrap();

    if payload.group_id == 1 && payload.username != "admin" {
        return Json(GroupActionResponse { success: false, message: "Нельзя добавлять сторонних пользователей в группу системных администраторов".to_string() }).into_response();
    }

    let user_id_res: Result<i64, _> = conn.query_row("SELECT id FROM user_tab WHERE username = ?", [&payload.username], |row| row.get(0));

    match user_id_res {
        Ok(user_id) => {
            if db_tools::is_member_exists(&conn, user_id, payload.group_id) {
                return Json(GroupActionResponse { success: false, message: "Пользователь уже состоит в этой группе".to_string() }).into_response();
            }
            match db_tools::add_group_member(&conn, user_id, payload.group_id) {
                Ok(_) => {
                    logger::info(APP_NAME, &format!("Пользователь {} добавлен в группу ID {}", payload.username, payload.group_id));
                    Json(GroupActionResponse { success: true, message: "Member added".to_string() }).into_response()
                },
                Err(e) => Json(GroupActionResponse { success: false, message: e.to_string() }).into_response()
            }
        }
        Err(_) => Json(GroupActionResponse { success: false, message: "Пользователь не найден".to_string() }).into_response()
    }
}

pub async fn remove_group_member_handler(State(db): State<DbState>, cookies: Cookies, Json(payload): Json<MemberActionRequest>) -> impl IntoResponse {
    if cookies.get("admin_token").is_none() { return (StatusCode::FORBIDDEN, "Access Denied").into_response(); }
    let conn = db.lock().unwrap();

    if payload.group_id == 1 && payload.username == "admin" {
        return Json(GroupActionResponse { success: false, message: "Нельзя удалить корневого администратора из его роли".to_string() }).into_response();
    }

    match db_tools::remove_group_member(&conn, &payload.username, payload.group_id) {
        Ok(rows) if rows > 0 => {
            logger::info(APP_NAME, &format!("Пользователь {} удален из группы ID {}", payload.username, payload.group_id));
            Json(GroupActionResponse { success: true, message: "Member removed".to_string() }).into_response()
        },
        Ok(_) => Json(GroupActionResponse { success: false, message: "Пользователь не найден в этой группе".to_string() }).into_response(),
        Err(e) => Json(GroupActionResponse { success: false, message: e.to_string() }).into_response()
    }
}
