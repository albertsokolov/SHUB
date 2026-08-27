use rusqlite::{Connection, Result};
use serde::Serialize;

#[derive(Serialize, Clone)]
pub struct User {
    pub id: i64,
    pub username: String,
    pub fullname: String,
    pub email: Option<String>,
    pub description: Option<String>,
    pub enabled: bool,
}

#[derive(Serialize, Clone)]
pub struct Group {
    pub id: i64,
    pub name: String,
    pub description: Option<String>,
}

#[derive(Serialize, Clone)]
pub struct AppConfig {
    pub id: i64,
    pub http_port: u16,
    pub https_port: u16,
    pub https_status: String,
}

pub fn get_http_port(conn: &Connection) -> u16 {
    conn.query_row("SELECT http_port FROM cfg_tab WHERE id = 1", [], |r| r.get(0)).unwrap_or(3000)
}

pub fn fetch_config(conn: &Connection) -> Result<AppConfig> {
    conn.query_row(
        "SELECT id, http_port, https_port, https_status FROM cfg_tab WHERE id = 1",
        [],

        |row| {
            Ok(AppConfig {
                id: row.get(0)?,
               http_port: row.get(1)?,
               https_port: row.get(2)?,
               https_status: row.get(3)?,
            })
        },
    )
}

pub fn fetch_all_groups(conn: &Connection) -> Result<Vec<Group>> {
    let mut stmt = conn.prepare("SELECT id, name, description FROM group_tab ORDER BY name ASC")?;
    let group_iter = stmt.query_map([], |row| {
        Ok(Group {
            id: row.get(0)?,
           name: row.get(1)?,
           description: row.get(2)?,
        })
    })?;

    let mut groups = Vec::new();
    for group in group_iter {
        groups.push(group?);
    }
    Ok(groups)
}

pub fn fetch_all_users(conn: &Connection) -> Result<Vec<User>> {
    let mut stmt = conn.prepare("SELECT id, username, fullname, email, description, enabled FROM user_tab ORDER BY username ASC")?;
    let user_iter = stmt.query_map([], |row| {
        let is_enabled: i32 = row.get(5)?;
        Ok(User {
            id: row.get(0)?,
           username: row.get(1)?,
           fullname: row.get(2)?,
           email: row.get(3)?,
           description: row.get(4)?,
           enabled: is_enabled == 1,
        })
    })?;

    let mut users = Vec::new();
    for user in user_iter {
        users.push(user?);
    }
    Ok(users)
}

pub fn add_user(
    conn: &Connection,
    username: &str,
    password: &str,
    fullname: &str,
    email: Option<String>,
    description: Option<String>,
) -> Result<i64> {
    conn.execute(
        "INSERT INTO user_tab (username, fullname, email, description, password, enabled)
    VALUES (?, ?, ?, ?, ?, 1)",
                 (
                     username,
                  fullname,
                  email,
                  description,
                  password,
                 ),
    )?;
    Ok(conn.last_insert_rowid())
}

pub fn delete_user(conn: &Connection, username: &str) -> Result<usize> {
    if username == "admin" {
        return Ok(0);
    }
    conn.execute("DELETE FROM user_tab WHERE username = ?", [username])
}

pub fn update_user(
    conn: &Connection,
    username: &str,
    password: &str,
    fullname: &str,
    email: Option<String>,
    description: Option<String>,
) -> Result<usize> {
    if username == "admin" {
        return Ok(0);
    }

    if password.is_empty() {
        conn.execute(
            "UPDATE user_tab SET fullname = ?, email = ?, description = ? WHERE username = ?",
            (fullname, email, description, username),
        )
    } else {
        conn.execute(
            "UPDATE user_tab SET fullname = ?, email = ?, description = ?, password = ? WHERE username = ?",
            (fullname, email, description, password, username),
        )
    }
}

pub fn set_user_status(conn: &Connection, username: &str, enabled: bool) -> Result<usize> {
    if username == "admin" {
        return Ok(0);
    }
    let status_val = if enabled { 1 } else { 0 };
    conn.execute("UPDATE user_tab SET enabled = ? WHERE username = ?", (status_val, username))
}
