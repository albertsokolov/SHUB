use rusqlite::{Connection, Result};

/// Инициализация новой структуры таблиц и матрицы прав в БД SQLite/SQLCipher
pub fn init_tables(conn: &Connection) -> Result<()> {
    // Включаем поддержку внешних ключей в сессии SQLite
    conn.execute("PRAGMA foreign_keys = ON;", [])?;

    // 1. Таблица конфигурации системы (cfg_tab)
    conn.execute(
        "CREATE TABLE IF NOT EXISTS cfg_tab (
            id INTEGER PRIMARY KEY,
            http_port INTEGER NOT NULL,
            https_port INTEGER NOT NULL,
            https_status TEXT NOT NULL
    )",
    [],
    )?;

    // 2. Таблица пользователей (user_tab)
    conn.execute(
        "CREATE TABLE IF NOT EXISTS user_tab (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL UNIQUE,
            fullname TEXT NOT NULL,
            email TEXT UNIQUE,
            description TEXT,
            password TEXT NOT NULL,
            enabled INTEGER NOT NULL DEFAULT 1
    )",
    [],
    )?;

    // 3. Таблица доменов (domain_tab)
    conn.execute(
        "CREATE TABLE IF NOT EXISTS domain_tab (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE,
            description TEXT,
            enabled INTEGER NOT NULL DEFAULT 1
    )",
    [],
    )?;

    // 4. Таблица хостов (host_tab)
    conn.execute(
        "CREATE TABLE IF NOT EXISTS host_tab (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            domain_id INTEGER NOT NULL,
            name TEXT NOT NULL,
            description TEXT,
            os TEXT,
            ip_address TEXT,
            agent_version TEXT,
            FOREIGN KEY (domain_id) REFERENCES domain_tab(id) ON DELETE CASCADE
    )",
    [],
    )?;

    // 5. Таблица программных модулей доменов (module_tab)
    conn.execute(
        "CREATE TABLE IF NOT EXISTS module_tab (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            domain_id INTEGER NOT NULL,
            name TEXT NOT NULL,
            description TEXT,
            UNIQUE(domain_id, name),
                 FOREIGN KEY (domain_id) REFERENCES domain_tab(id) ON DELETE CASCADE
    )",
    [],
    )?;

    // 6. Таблица групп пользователей / ролей (group_tab)
    conn.execute(
        "CREATE TABLE IF NOT EXISTS group_tab (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE,
            description TEXT
    )",
    [],
    )?;

    // 7. Таблица членства пользователей в группах (member_tab)
    conn.execute(
        "CREATE TABLE IF NOT EXISTS member_tab (
            user_id INTEGER NOT NULL,
            group_id INTEGER NOT NULL,
            PRIMARY KEY (user_id, group_id),
                 FOREIGN KEY (user_id) REFERENCES user_tab(id) ON DELETE CASCADE,
                 FOREIGN KEY (group_id) REFERENCES group_tab(id) ON DELETE CASCADE
    )",
    [],
    )?;

    // 8. Матрица прав доступа (permission_matrix_tab)
    conn.execute(
        "CREATE TABLE IF NOT EXISTS permission_matrix_tab (
            group_id INTEGER NOT NULL,
            module_id INTEGER NOT NULL,
            can_read INTEGER NOT NULL DEFAULT 1,
            can_write INTEGER NOT NULL DEFAULT 0,
            PRIMARY KEY (group_id, module_id),
                 FOREIGN KEY (group_id) REFERENCES group_tab(id) ON DELETE CASCADE,
                 FOREIGN KEY (module_id) REFERENCES module_tab(id) ON DELETE CASCADE
    )",
    [],
    )?;

    Ok(())
}

/// Наполнение таблиц базовыми дефолтными данными (Seed) по новой схеме
pub fn seed_default_data(conn: &Connection) -> Result<()> {
    // --- 1. Дефолтная конфигурация портов ---
    let cfg_count: i64 = conn.query_row("SELECT COUNT(*) FROM cfg_tab", [], |r| r.get(0))?;
    if cfg_count == 0 {
        conn.execute(
            "INSERT INTO cfg_tab (id, http_port, https_port, https_status) VALUES (1, 3000, 3001, 'off')",
                     [],
        )?;
    }

    // --- 2. Дефолтный корневой домен ---
    let domain_count: i64 = conn.query_row("SELECT COUNT(*) FROM domain_tab", [], |r| r.get(0))?;
    if domain_count == 0 {
        conn.execute(
            "INSERT INTO domain_tab (name, description, enabled) VALUES ('Local Domain', 'Основной встроенный домен системы', 1)",
                     [],
        )?;
    }
    let default_domain_id: i64 = conn.query_row("SELECT id FROM domain_tab WHERE name = 'Local Domain'", [], |r| r.get(0))?;

    // --- 3. Дефолтный модуль для этого домена ---
    let module_count: i64 = conn.query_row("SELECT COUNT(*) FROM module_tab", [], |r| r.get(0))?;
    if module_count == 0 {
        conn.execute(
            "INSERT INTO module_tab (domain_id, name, description) VALUES (?, 'Core Auth', 'Системный модуль авторизации и управления')",
                     [default_domain_id],
        )?;
    }
    let default_module_id: i64 = conn.query_row("SELECT id FROM module_tab WHERE name = 'Core Auth'", [], |r| r.get(0))?;

    // --- 4. Группы ролей ---
    let group_count: i64 = conn.query_row("SELECT COUNT(*) FROM group_tab", [], |r| r.get(0))?;
    if group_count == 0 {
        let default_groups = [
            ("Администраторы", "Полный доступ к управлению системой"),
            ("Пользователи", "Обычные учетные записи сотрудников с базовыми правами чтения"),
        ];
        for (name, desc) in default_groups.iter() {
            conn.execute("INSERT INTO group_tab (name, description) VALUES (?, ?)", [name, desc])?;
        }
    }
    let admin_group_id: i64 = conn.query_row("SELECT id FROM group_tab WHERE name = 'Администраторы'", [], |r| r.get(0))?;
    let user_group_id: i64 = conn.query_row("SELECT id FROM group_tab WHERE name = 'Пользователи'", [], |r| r.get(0))?;

    // --- 5. Матрица прав (Permissions Matrix Sync) ---
    let matrix_count: i64 = conn.query_row("SELECT COUNT(*) FROM permission_matrix_tab", [], |r| r.get(0))?;
    if matrix_count == 0 {
        // Администраторы: Чтение (1) и Запись (1)
        conn.execute(
            "INSERT INTO permission_matrix_tab (group_id, module_id, can_read, can_write) VALUES (?, ?, 1, 1)",
                     [admin_group_id, default_module_id],
        )?;
        // Пользователи: Только Чтение (1), Без записи (0)
        conn.execute(
            "INSERT INTO permission_matrix_tab (group_id, module_id, can_read, can_write) VALUES (?, ?, 1, 0)",
                     [user_group_id, default_module_id],
        )?;
    }

    // --- 6. Пользователи ---
    // Системный Администратор (admin)
    let admin_exists: i64 = conn.query_row("SELECT COUNT(*) FROM user_tab WHERE username = 'admin'", [], |r| r.get(0))?;
    if admin_exists == 0 {
        conn.execute(
            "INSERT INTO user_tab (username, fullname, email, description, password, enabled) VALUES (?, ?, ?, ?, ?, 1)",
                     ("admin", "Иван Иванов", "admin@kapavto.by", "Системный администратор", "12344"),
        )?;
        let new_admin_id: i64 = conn.query_row("SELECT id FROM user_tab WHERE username = 'admin'", [], |r| r.get(0))?;
        // Добавляем админа в группу администраторов
        conn.execute("INSERT INTO member_tab (user_id, group_id) VALUES (?, ?)", [new_admin_id, admin_group_id])?;
    }

    // Обычный Пользователь (user)
    let user_exists: i64 = conn.query_row("SELECT COUNT(*) FROM user_tab WHERE username = 'user'", [], |r| r.get(0))?;
    if user_exists == 0 {
        conn.execute(
            "INSERT INTO user_tab (username, fullname, email, description, password, enabled) VALUES (?, ?, ?, ?, ?, 1)",
                     ("user", "Петр Петров", "petrov@kapavto.by", "Менеджер", "12344"),
        )?;
        let new_user_id: i64 = conn.query_row("SELECT id FROM user_tab WHERE username = 'user'", [], |r| r.get(0))?;
        // Добавляем пользователя в обычную группу пользователей
        conn.execute("INSERT INTO member_tab (user_id, group_id) VALUES (?, ?)", [new_user_id, user_group_id])?;
    }

    Ok(())
}
