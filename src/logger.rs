use std::fs::{self, OpenOptions};
use std::io::Write;
use std::path::Path;
use chrono::Local;
use rusqlite::Connection;

/// Внутренняя функция получения активного пути хранения из Key-Value таблицы cfg_tab.
/// Если БД недоступна или запись отсутствует, откатывается на дефолтную папку "./store/"
fn get_log_directory_from_db() -> String {
    // Открываем локальное соединение с базой данных
    if let Ok(conn) = Connection::open("SHUB.db") {
        // Если база зашифрована SQLCipher, раскомментируйте строку ниже и укажите ваш ключ:
        // let _ = conn.execute("PRAGMA key = 'ваш_ключ';", []);

        let query_res: Result<String, _> = conn.query_row(
            "SELECT value FROM cfg_tab WHERE parameter = 'storage'",
            [],

            |r| r.get(0)
        );

        if let Ok(mut base_path) = query_res {
            base_path = base_path.trim().to_string();
            // Гарантируем, что путь заканчивается слешем
            if !base_path.ends_with('/') && !base_path.ends_with('\\') {
                base_path.push('/');
            }
            // Конкатенируем с целевой поддиректорией log/
            return format!("{}log", base_path);
        }
    }
    "./store/log".to_string()
}

/// Универсальная функция записи системных логов на диск по новому динамическому пути
pub fn write_to_log(level: &str, app_name: &str, message: &str) {
    let timestamp = Local::now().format("%Y-%m-%d %H:%M:%S");
    let log_line = format!("[{}] [{}] [{}] {}\n", timestamp, level, app_name, message);

    // Дублируем вывод строки в консоль сервера (терминал cargo run)
    print!("{}", log_line);

    // 1. Динамически получаем актуальный путь к папке логов из БД cfg_tab
    let log_dir_str = get_log_directory_from_db();
    let log_dir = Path::new(&log_dir_str);

    // 2. ЗАЩИТА: Автоматически создаем подкаталог \log, если админ переключил storage
    if !log_dir.exists() {
        let _ = fs::create_dir_all(log_dir);
    }

    // 3. Формируем финальный абсолютный путь к файлу shub.log
    let log_file_path = log_dir.join("shub.log");

    // 4. Безопасно открываем дескриптор файла на дозапись (Append)
    if let Ok(mut file) = OpenOptions::new()
        .create(true)
        .write(true)
        .append(true)
        .open(log_file_path)
        {
            let _ = file.write_all(log_line.as_bytes());
        }
}

pub fn info(app_name: &str, message: &str) {
    write_to_log("INFO", app_name, message);
}

pub fn error(app_name: &str, message: &str) {
    write_to_log("ERROR", app_name, message);
}

pub fn warn(app_name: &str, message: &str) {
    write_to_log("WARN", app_name, message);
}
