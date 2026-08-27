use rusqlite::{Connection, Result};
use serde::Serialize;

#[derive(Serialize, Clone)]
pub struct User {
    pub id: i64,
    pub first_name: String,
    pub last_name: String,
    pub position: Option<String>,
    pub email: Option<String>,
    pub avatar: Option<Vec<u8>>,
    pub login: String,
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
    let mut stmt = conn.prepare("SELECT id, first_name, last_name, position, email, avatar, login FROM user_tab ORDER BY last_name ASC")?;
    let user_iter = stmt.query_map([], |row| {
        Ok(User {
            id: row.get(0)?,
           first_name: row.get(1)?,
           last_name: row.get(2)?,
           position: row.get(3)?,
           email: row.get(4)?,
           avatar: row.get(5)?,
           login: row.get(6)?,
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
    login: &str,
    password: &str,
    first_name: &str,
    last_name: &str,
    email: Option<String>
) -> Result<i64> {
    conn.execute(
        "INSERT INTO user_tab (first_name, last_name, position, email, avatar, login, password, enabled)
    VALUES (?, ?, ?, ?, ?, ?, ?, 1)",
                 (
                     first_name,
                  last_name,
                  None::<String>,
                  email,
                  None::<Vec<u8>>,
                  login,
                  password,
                 ),
    )?;
    Ok(conn.last_insert_rowid())
}

pub fn delete_user(conn: &Connection, login: &str) -> Result<usize> {
    if login == "admin" {
        return Ok(0);
    }
    conn.execute("DELETE FROM user_tab WHERE login = ?", [login])
}

pub fn update_user(
    conn: &Connection,
    login: &str,
    password: &str,
    first_name: &str,
    last_name: &str,
    email: Option<String>
) -> Result<usize> {
    if login == "admin" {
        return Ok(0);
    }

    if password.is_empty() {
        conn.execute(
            "UPDATE user_tab SET first_name = ?, last_name = ?, email = ? WHERE login = ?",
            (first_name, last_name, email, login),
        )
    } else {
        conn.execute(
            "UPDATE user_tab SET first_name = ?, last_name = ?, email = ?, password = ? WHERE login = ?",
            (first_name, last_name, email, password, login),
        )
    }
}

pub fn set_user_status(conn: &Connection, login: &str, enabled: bool) -> Result<usize> {
    if login == "admin" {
        return Ok(0);
    }
    let status_val = if enabled { 1 } else { 0 };
    conn.execute("UPDATE user_tab SET enabled = ? WHERE login = ?", (status_val, login))
}
