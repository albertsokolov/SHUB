use chrono::Local; // Для добавления точного времени в логи
use std::fs::OpenOptions;
use std::io::Write;
use std::sync::Mutex;

// Потокобезопасный мьютекс для синхронизации записи в один файл из разных потоков Axum
static LOG_MUTEX: Mutex<()> = Mutex::new(());

/// Инициализирует файл лога (очищает или создает пустой при старте, если необходимо)
pub fn init_logger(app_name: &str) {
    let file_name = format!("{}.log", app_name);
    let _file = OpenOptions::new()
        .create(true)
        .append(true)
        .open(&file_name)
        .expect("Не удалось инициализировать файл лога");
        
    info(app_name, "Система логирования успешно запущена.");
}

/// Запись лога с уровнем INFO
pub fn info(app_name: &str, message: &str) {
    log(app_name, "INFO", message);
}

/// Запись лога с уровнем WARN
pub fn warn(app_name: &str, message: &str) {
    log(app_name, "WARN", message);
}

/// Запись лога с уровнем ERROR
pub fn error(app_name: &str, message: &str) {
    log(app_name, "ERROR", message);
}

// Внутренний метод форматирования и записи
fn log(app_name: &str, level: &str, message: &str) {
    // Получаем текущее время в красивом формате
    let timestamp = Local::now().format("%Y-%m-%d %H:%M:%S").to_string();
    
    // Формируем строку лога
    let log_line = format!("[{}] [{}] {}\n", timestamp, level, message);

    // Выводим в терминал (stdout)
    print!("{}", log_line);

    // Блокируем поток для безопасной записи в файл
    let _lock = LOG_MUTEX.lock().unwrap();
    let file_name = format!("{}.log", app_name);
    
    if let Ok(mut file) = OpenOptions::new().create(true).append(true).open(file_name) {
        let _ = file.write_all(log_line.as_bytes());
    }
}
