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

pub fn init_tables(conn: &Connection) -> Result<()> {
    conn.execute(
        "CREATE TABLE IF NOT EXISTS cfg_tab (
            id INTEGER PRIMARY KEY,
            http_port INTEGER NOT NULL,
            https_port INTEGER NOT NULL,
            https_status TEXT NOT NULL
    )",
    [],
    )?;

    conn.execute(
        "CREATE TABLE IF NOT EXISTS group_tab (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE,
            description TEXT
    )",
    [],
    )?;

    conn.execute(
        "CREATE TABLE IF NOT EXISTS user_tab (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            first_name TEXT NOT NULL,
            last_name TEXT NOT NULL,
            position TEXT,
            email TEXT UNIQUE,
            avatar BLOB,
            login TEXT NOT NULL UNIQUE,
            password TEXT NOT NULL
    )",
    [],
    )?;

    Ok(())
}

pub fn seed_default_data(conn: &Connection) -> Result<()> {
    // --- 1. Конфигурация ---
    let cfg_count: i64 = conn.query_row("SELECT COUNT(*) FROM cfg_tab", [], |r| r.get(0))?;
    if cfg_count == 0 {
        conn.execute(
            "INSERT INTO cfg_tab (id, http_port, https_port, https_status) VALUES (1, 3000, 3001, 'off')",
                     [],
        )?;
    }

    // --- 2. Группы пользователей ---
    let group_count: i64 = conn.query_row("SELECT COUNT(*) FROM group_tab", [], |r| r.get(0))?;
    if group_count == 0 {
        let default_groups = [
            ("Администраторы", "Полный доступ к управлению системой"),
            ("Администраторы весь сервер только чтение", "Просмотр всех настроек сервера без права изменения"),
            ("Пользователи", "Обычные учетные записи сотрудников"),
            ("Супер пользователи", "Расширенные права управления без доступа к системным логам"),
            ("Супер пользователи только чтение", "Доступ к расширенным отчетам в режиме чтения"),
        ];
        for (name, desc) in default_groups.iter() {
            conn.execute("INSERT INTO group_tab (name, description) VALUES (?, ?)", [name, desc])?;
        }
    }

    // --- 3. Пользователи ---

    // Администратор (Иван Иванов)
    let admin_exists: i64 = conn.query_row("SELECT COUNT(*) FROM user_tab WHERE login = 'admin'", [], |r| r.get(0))?;
    if admin_exists == 0 {
        conn.execute(
            "INSERT INTO user_tab (first_name, last_name, position, email, avatar, login, password)
        VALUES (?, ?, ?, ?, ?, ?, ?)",
                     ("Иван", "Иванов", "Системный администратор", "admin@kapavto.by", None::<Vec<u8>>, "admin", "12344"),
        )?;
    }

    // Менеджер (Петр Петров)
    let user_exists: i64 = conn.query_row("SELECT COUNT(*) FROM user_tab WHERE login = 'user'", [], |r| r.get(0))?;
    if user_exists == 0 {
        conn.execute(
            "INSERT INTO user_tab (first_name, last_name, position, email, avatar, login, password)
        VALUES (?, ?, ?, ?, ?, ?, ?)",
                     ("Петр", "Петров", "Менеджер", "petrov@kapavto.by", None::<Vec<u8>>, "user", "12344"),
        )?;
    }

    Ok(())
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
