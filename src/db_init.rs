use rusqlite::{Connection, Result};

/// Инициализация структуры таблиц в БД SQLite/SQLCipher
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
            password TEXT NOT NULL,
            enabled INTEGER NOT NULL DEFAULT 1
    )",
    [],
    )?;

    Ok(())
}

/// Наполнение таблиц дефолтными системными данными при первом старте
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
            "INSERT INTO user_tab (first_name, last_name, position, email, avatar, login, password, enabled)
        VALUES (?, ?, ?, ?, ?, ?, ?, 1)",
                     ("Иван", "Иванов", "Системный администратор", "admin@kapavto.by", None::<Vec<u8>>, "admin", "12344"),
        )?;
    }

    // Менеджер (Петр Петров)
    let user_exists: i64 = conn.query_row("SELECT COUNT(*) FROM user_tab WHERE login = 'user'", [], |r| r.get(0))?;
    if user_exists == 0 {
        conn.execute(
            "INSERT INTO user_tab (first_name, last_name, position, email, avatar, login, password, enabled)
        VALUES (?, ?, ?, ?, ?, ?, ?, 1)",
                     ("Петр", "Петров", "Менеджер", "petrov@kapavto.by", None::<Vec<u8>>, "user", "12344"),
        )?;
    }

    Ok(())
}
