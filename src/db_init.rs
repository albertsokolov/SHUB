use rusqlite::{Connection, Result};

/// Инициализация структуры таблиц автоматизации и матрицы прав в БД SQLite/SQLCipher
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

    // 5. Таблица программных модулей (module_tab)
    conn.execute(
        "CREATE TABLE IF NOT EXISTS module_tab (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE,
            description TEXT
    )",
    [],
    )?;

    // 6. Таблица СЕРВИСОВ (services_tab) — Наборы скриптов и автоматизаций
    conn.execute(
        "CREATE TABLE IF NOT EXISTS services_tab (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE,
            description TEXT
    )",
    [],
    )?;

    // 7. Таблица ПОРТОВ (ports_tab) — Портативные Bash/PowerShell скрипты и команды
    // ДОБАВЛЕНО: service_id для связывания портативного скрипта с его родительским сервисом
    conn.execute(
        "CREATE TABLE IF NOT EXISTS ports_tab (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            service_id INTEGER,
            name TEXT NOT NULL,
            description TEXT,
            interpreter TEXT, -- 'bash', 'powershell', 'native_cmd'
    FOREIGN KEY (service_id) REFERENCES services_tab(id) ON DELETE SET NULL
    )",
    [],
    )?;

    // 8. Таблица групп пользователей / ролей (group_tab)
    conn.execute(
        "CREATE TABLE IF NOT EXISTS group_tab (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE,
            description TEXT
    )",
    [],
    )?;

    // 9. Таблица членства пользователей в группах (member_tab)
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

    // 10. Матрица прав доступа (permission_matrix_tab)
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

/// Наполнение таблиц базовыми дефолтными данными (Seed) с правильной терминологией
pub fn seed_default_data(conn: &Connection) -> Result<()> {
    // --- 1. Дефолтная конфигурация веб-интерфейса консоли ---
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

    // --- 3. Дефолтный модуль ядра ---
    let module_count: i64 = conn.query_row("SELECT COUNT(*) FROM module_tab", [], |r| r.get(0))?;
    if module_count == 0 {
        conn.execute(
            "INSERT INTO module_tab (name, description) VALUES ('Core Auth', 'Системный модуль авторизации и управления')",
                     [],
        )?;
    }
    let default_module_id: i64 = conn.query_row("SELECT id FROM module_tab WHERE name = 'Core Auth'", [], |r| r.get(0))?;

    // --- 4. НАПОЛНЕНИЕ СЕРВИСОВ (Комплексные наборы автоматизации) ---
    let svc_count: i64 = conn.query_row("SELECT COUNT(*) FROM services_tab", [], |r| r.get(0))?;
    if svc_count == 0 {
        let default_services = [
            ("Backup & Rotation", "Пакет автоматического резервного копирования и ротации архивов"),
            ("Health Monitor", "Сбор телеметрии, нагрузка на CPU и мониторинг дискового пространства"),
            ("Network Diagnostics", "Утилиты проверки связности узлов и трассировки каналов"),
        ];
        for (name, desc) in default_services.iter() {
            conn.execute("INSERT INTO services_tab (name, description) VALUES (?, ?)", [name, desc])?;
        }
    }

    // --- 5. НАПОЛНЕНИЕ ПОРТОВ (Портативные скрипты) со связью к сервисам ---
    let port_count: i64 = conn.query_row("SELECT COUNT(*) FROM ports_tab", [], |r| r.get(0))?;
    if port_count == 0 {
        // Получаем ID родительских сервисов для связки
        let backup_svc_id: i64 = conn.query_row("SELECT id FROM services_tab WHERE name = 'Backup & Rotation'", [], |r| r.get(0))?;
        let health_svc_id: i64 = conn.query_row("SELECT id FROM services_tab WHERE name = 'Health Monitor'", [], |r| r.get(0))?;

        let default_ports = [
            (backup_svc_id, "tar_compress.sh", "Bash-скрипт архивации целевых директорий бэкенда", "bash"),
            (backup_svc_id, "clean_old_bak.sh", "Скрипт очистки дампов старше 14 дней", "bash"),
            (health_svc_id, "disk_watchdog.sh", "Портированная утилита проверки свободного места", "bash"),
            (health_svc_id, "get_cpu_load.ps1", "PowerShell скрипт замера мгновенной утилизации ядер", "powershell"),
        ];

        for (svc_id, name, desc, interp) in default_ports.iter() {
            conn.execute(
                "INSERT INTO ports_tab (service_id, name, description, interpreter) VALUES (?, ?, ?, ?)",
                         (svc_id, name, desc, interp),
            )?;
        }
    }

    // --- 6. Группы ролей ---
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

    // --- 7. Матрица прав ---
    let matrix_count: i64 = conn.query_row("SELECT COUNT(*) FROM permission_matrix_tab", [], |r| r.get(0))?;
    if matrix_count == 0 {
        conn.execute(
            "INSERT INTO permission_matrix_tab (group_id, module_id, can_read, can_write) VALUES (?, ?, 1, 1)",
                     [admin_group_id, default_module_id],
        )?;
        conn.execute(
            "INSERT INTO permission_matrix_tab (group_id, module_id, can_read, can_write) VALUES (?, ?, 1, 0)",
                     [user_group_id, default_module_id],
        )?;
    }

    // --- 8. Пользователи ---
    let admin_exists: i64 = conn.query_row("SELECT COUNT(*) FROM user_tab WHERE username = 'admin'", [], |r| r.get(0))?;
    if admin_exists == 0 {
        conn.execute(
            "INSERT INTO user_tab (username, fullname, email, description, password, enabled) VALUES (?, ?, ?, ?, ?, 1)",
                     ("admin", "Иван Иванов", "admin@kapavto.by", "Системный администратор", "12344"),
        )?;
        let new_admin_id: i64 = conn.query_row("SELECT id FROM user_tab WHERE username = 'admin'", [], |r| r.get(0))?;
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
        conn.execute("INSERT INTO member_tab (user_id, group_id) VALUES (?, ?)", [new_user_id, user_group_id])?;
    }

    Ok(())
}
