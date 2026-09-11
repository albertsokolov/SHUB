use rusqlite::{Connection, Result};
use std::env;
use std::fs;
use std::path::Path;

/// Инициализация структуры таблиц автоматизации и матрицы прав в БД SQLite/SQLCipher
pub fn init_tables(conn: &Connection) -> Result<()> {
    // Включаем поддержку внешних ключей в сессии SQLite
    conn.execute("PRAGMA foreign_keys = ON;", [])?;

    // 1. Таблица конфигурации системы (cfg_tab) в формате Key-Value
    conn.execute(
        "CREATE TABLE IF NOT EXISTS cfg_tab (
            parameter TEXT PRIMARY KEY,
            value TEXT NOT NULL
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

    // 6. Таблица ПОРТОВ (ports_tab) — Портативные Bash/PowerShell скрипты и команды
    conn.execute(
        "CREATE TABLE IF NOT EXISTS ports_tab (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE,
            description TEXT,
            interpreter TEXT -- 'bash', 'powershell', 'native_cmd'
    )",
    [],
    )?;

    // 7. Таблица СЕРВИСОВ (services_tab) — Наборы портов/скриптов
    conn.execute(
        "CREATE TABLE IF NOT EXISTS services_tab (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            port_id INTEGER,
            name TEXT NOT NULL UNIQUE,
            description TEXT,
            FOREIGN KEY (port_id) REFERENCES ports_tab(id) ON DELETE SET NULL
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
    // 11. Таблица ПЛАНИРОВЩИКА ВРЕМЕНИ И ЗАДАЧ (time_tab) — ДОБАВЛЕНО
    conn.execute(
        "CREATE TABLE IF NOT EXISTS time_tab (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE,
            cron_expression TEXT NOT NULL,
            description TEXT
    )",
    [],
    )?;

    Ok(())
}

/// Наполнение таблиц дефолтными данными со скорректированной структурой сервисов и созданием файлов портов
pub fn seed_default_data(conn: &Connection) -> Result<()> {
    // --- 1. Дефолтная конфигурация портов ---
    let mut stmt = conn.prepare("INSERT OR IGNORE INTO cfg_tab (parameter, value) VALUES (?, ?)")?;
    stmt.execute(["http", "3000"])?;
    stmt.execute(["https", "3001"])?;
    stmt.execute(["https_status", "off"])?;

    let current_dir = env::current_dir()
    .map(|p| p.to_string_lossy().into_owned())
    .unwrap_or_else(|_| ".".to_string());
    let default_storage_path = format!("{}/store/", current_dir);
    let _ = fs::create_dir_all(&default_storage_path);
    stmt.execute(["storage", &default_storage_path])?;
    drop(stmt);

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

    // --- 4. НАПОЛНЕНИЕ ПОРТОВ (Скриптов) В БД ---
    let port_count: i64 = conn.query_row("SELECT COUNT(*) FROM ports_tab", [], |r| r.get(0))?;
    if port_count == 0 {
        let default_ports = [
            ("tar_compress.sh", "Bash-скрипт архивации целевых директорий бэкенда", "bash"),
            ("clean_old_bak.sh", "Скрипт очистки дампов старше 14 дней", "bash"),
            ("disk_watchdog.sh", "Портированная утилита проверки свободного места", "bash"),
            ("get_cpu_load.ps1", "PowerShell скрипт замера мгновенной утилизации ядер", "powershell"),
        ];
        for (name, desc, interp) in default_ports.iter() {
            let _ = conn.execute(
                "INSERT OR IGNORE INTO ports_tab (name, description, interpreter) VALUES (?, ?, ?)",
                                 (name, desc, interp),
            );
        }
    }

    // --- ДОБАВЛЕНО: ФИЗИЧЕСКОЕ СОЗДАНИЕ ФАЙЛОВ-ЗАГЛУШЕК В КАТАЛОГЕ текущий_путь\Ports ---
    let active_storage: String = conn.query_row(
        "SELECT value FROM cfg_tab WHERE parameter = 'storage'",
        [],

        |r| r.get(0)
    ).unwrap_or(default_storage_path);

    let ports_dir_path = Path::new(&active_storage).join("Ports");
    if !ports_dir_path.exists() {
        let _ = fs::create_dir_all(&ports_dir_path);
    }

    // Шаблоны кодов для файлов-заглушек
    let bash_stub = "#!/bin/bash\n\necho \"[SHUB Port Engine] Running portable automation script...\"\necho \"Status: Success\"\nexit 0\n";
    let ps_stub = "# [SHUB Port Engine] Running portable PowerShell script\nWrite-Output \"Status: Success\"\nExit 0\n";

    let _ = fs::write(ports_dir_path.join("tar_compress.sh"), bash_stub);
    let _ = fs::write(ports_dir_path.join("clean_old_bak.sh"), bash_stub);
    let _ = fs::write(ports_dir_path.join("disk_watchdog.sh"), bash_stub);
    let _ = fs::write(ports_dir_path.join("get_cpu_load.ps1"), ps_stub);

    // Получаем ID только что созданных скриптов для связывания с сервисами
    let p_tar_id: i64 = conn.query_row("SELECT id FROM ports_tab WHERE name = 'tar_compress.sh'", [], |r| r.get(0))?;
    let p_watch_id: i64 = conn.query_row("SELECT id FROM ports_tab WHERE name = 'disk_watchdog.sh'", [], |r| r.get(0))?;

    // --- 5. НАПОЛНЕНИЕ СЕРВИСОВ ---
    let svc_count: i64 = conn.query_row("SELECT COUNT(*) FROM services_tab", [], |r| r.get(0))?;
    if svc_count == 0 {
        let default_services = [
            (Some(p_tar_id), "Backup & Rotation", "Пакет автоматического резервного копирования и ротации архивов"),
            (Some(p_watch_id), "Health Monitor", "Сбор телеметрии, нагрузка на CPU и мониторинг дискового пространства"),
            (None, "Network Diagnostics", "Утилиты проверки связности узлов и трассировки каналов"),
        ];
        for (port_id, name, desc) in default_services.iter() {
            let _ = conn.execute(
                "INSERT OR IGNORE INTO services_tab (port_id, name, description) VALUES (?, ?, ?)",
                                 (port_id, name, desc),
            );
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
            let _ = conn.execute("INSERT INTO group_tab (name, description) VALUES (?, ?)", [name, desc]);
        }
    }
    let admin_group_id: i64 = conn.query_row("SELECT id FROM group_tab WHERE name = 'Администраторы'", [], |r| r.get(0))?;
    let user_group_id: i64 = conn.query_row("SELECT id FROM group_tab WHERE name = 'Пользователи'", [], |r| r.get(0))?;

    // --- 7. Матрица прав ---
    let matrix_count: i64 = conn.query_row("SELECT COUNT(*) FROM permission_matrix_tab", [], |r| r.get(0))?;
    if matrix_count == 0 {
        let _ = conn.execute(
            "INSERT INTO permission_matrix_tab (group_id, module_id, can_read, can_write) VALUES (?, ?, 1, 1)",
                             [admin_group_id, default_module_id],
        );
        let _ = conn.execute(
            "INSERT INTO permission_matrix_tab (group_id, module_id, can_read, can_write) VALUES (?, ?, 1, 0)",
                             [user_group_id, default_module_id],
        );
    }

    // --- 8. Пользователи ---
    let admin_exists: i64 = conn.query_row("SELECT COUNT(*) FROM user_tab WHERE username = 'admin'", [], |r| r.get(0))?;
    if admin_exists == 0 {
        let _ = conn.execute(
            "INSERT INTO user_tab (username, fullname, email, description, password, enabled) VALUES (?, ?, ?, ?, ?, 1)",
                             ("admin", "Иван Иванов", "admin@kapavto.by", "Системный администратор", "12344"),
        )?;
        let new_admin_id: i64 = conn.query_row("SELECT id FROM user_tab WHERE username = 'admin'", [], |r| r.get(0))?;
        let _ = conn.execute("INSERT INTO member_tab (user_id, group_id) VALUES (?, ?)", [new_admin_id, admin_group_id]);
    }

    let user_exists: i64 = conn.query_row("SELECT COUNT(*) FROM user_tab WHERE username = 'user'", [], |r| r.get(0))?;
    if user_exists == 0 {
        let _ = conn.execute(
            "INSERT INTO user_tab (username, fullname, email, description, password, enabled) VALUES (?, ?, ?, ?, ?, 1)",
                             ("user", "Петр Петров", "petrov@kapavto.by", "Менеджер", "12344"),
        )?;
        let new_user_id: i64 = conn.query_row("SELECT id FROM user_tab WHERE username = 'user'", [], |r| r.get(0))?;
        let _ = conn.execute("INSERT INTO member_tab (user_id, group_id) VALUES (?, ?)", [new_user_id, user_group_id]);
    }
    // --- 9. НАПОЛНЕНИЕ ТРИГГЕРОВ ПЛАНИРОВЩИКА (Time Tasks Seed) — ДОБАВЛЕНО ---
    let time_count: i64 = conn.query_row("SELECT COUNT(*) FROM time_tab", [], |r| r.get(0))?;
    if time_count == 0 {
        let default_tasks = [
            ("Nightly Backup Trigger", "0 0 2 * * ?", "Запуск ночного резервного копирования в 02:00 ежедневно"),
            ("Hourly Telemetry Sync", "0 0 * * * ?", "Ежечасный сбор системных метрик и логов с агентов"),
            ("Weekly Database Cleanup", "0 0 3 ? * SUN", "Очистка устаревших дампов каждую неделю в воскресенье"),
        ];
        for (name, cron, desc) in default_tasks.iter() {
            conn.execute(
                "INSERT INTO time_tab (name, cron_expression, description) VALUES (?, ?, ?)",
                         (name, cron, desc),
            )?;
        }
    }

    Ok(())
}
