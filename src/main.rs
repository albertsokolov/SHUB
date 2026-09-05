use axum::{
    extract::State,
    response::{IntoResponse, Response},
    routing::{get, post},
    Json, Router,
};
use tower_cookies::{Cookie, Cookies, CookieManagerLayer};
use tower_http::services::ServeDir;
use once_cell::sync::Lazy;
use serde::{Deserialize, Serialize};
use std::net::SocketAddr;
use std::sync::{Arc, Mutex};
use rusqlite::Connection;
use axum::response::Html;

mod db_tools;
mod db_init;
mod logger;
mod mip_users;
mod mip_group;
mod mip_advoptions;
mod mip_domains;

static APP_NAME: &str = "SHUB";
static DB_PATH: Lazy<String> = Lazy::new(|| format!("{}.db", APP_NAME));

type DbState = Arc<Mutex<Connection>>;

#[derive(Deserialize)]
struct LoginRequest {
    login: String,
    password: String,
}

#[derive(Serialize)]
struct LoginResponse {
    success: bool,
    message: String,
}

#[tokio::main]
async fn main() {
    logger::init_logger(APP_NAME);

    let conn = Connection::open(&*DB_PATH).expect("Нет доступа к файлу БД");
    conn.pragma_update(None, "key", "12344").expect("Ошибка инициализации SQLCipher");

    // Вызываем инициализацию и сидинг структуры из нового изолированного модуля db_init
    db_init::init_tables(&conn).expect("Ошибка структуры таблиц");
    db_init::seed_default_data(&conn).expect("Ошибка дефолтных данных");

    let server_port = db_tools::get_http_port(&conn);
    let db_state: DbState = Arc::new(Mutex::new(conn));

    let api_routes = Router::new()
    .route("/login", post(login_handler))
    .route("/groups", get(get_groups_handler))
    .route("/users", get(get_users_handler))
    .nest("/mip", mip_users::router())
    .nest("/mip-g", mip_group::router()) // Добавляем эндпоинты групп
    .nest("/mip-adv", mip_advoptions::router()) // Добавляем эндпоинты расширенных настроек
    .nest("/mip-d", mip_domains::router())
    .with_state(db_state);

    let app = Router::new()
    .nest("/api", api_routes)
    .route("/", get(root_handler))
    .route("/admin", get(admin_handler))
    .route("/admin/", get(admin_handler))
    .nest_service("/login", ServeDir::new("frontend/login"))
    .nest_service("/client", ServeDir::new("frontend/client"))
    .nest_service("/admin-files", ServeDir::new("frontend/admin"))
    .nest_service("/admin-login", ServeDir::new("frontend/admin/login"))
    .layer(CookieManagerLayer::new());

    let addr = SocketAddr::from(([0, 0, 0, 0], server_port));
    logger::info(APP_NAME, &format!("Сервер успешно запущен на http://{}", addr));

    let listener = tokio::net::TcpListener::bind(addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}

async fn root_handler(cookies: Cookies) -> Response {
    if cookies.get("session_token").is_some() {
        let body = std::fs::read_to_string("frontend/client/index.html").unwrap_or_default();
        Html(body).into_response()
    } else {
        let body = std::fs::read_to_string("frontend/login/index.html").unwrap_or_default();
        Html(body).into_response()
    }
}

async fn admin_handler(cookies: Cookies) -> Response {
    // ЖЕСТКАЯ ЗАЩИТА: В админку пускаем ТОЛЬКО тех, у кого есть admin_token
    if cookies.get("admin_token").is_some() {
        let body = std::fs::read_to_string("frontend/admin/index.html").unwrap_or_default();
        Html(body).into_response()
    } else {
        // Обычные пользователи или неавторизованные гости улетают на экран входа
        let body = std::fs::read_to_string("frontend/admin/login/index.html").unwrap_or_default();
        Html(body).into_response()
    }
}

async fn login_handler(
    State(db): State<DbState>,
                       cookies: Cookies,
                       Json(payload): Json<LoginRequest>,
) -> Json<LoginResponse> {
    logger::info(APP_NAME, &format!("Попытка входа для пользователя: {}", payload.login));
    let conn = db.lock().unwrap();

    let mut stmt = conn.prepare("SELECT password, username, enabled FROM user_tab WHERE username = ?").unwrap();
    let user_res = stmt.query_row([&payload.login], |row| {
        Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?, row.get::<_, i32>(2)?))
    });

    match user_res {
        Ok((db_password, username, enabled)) => {
            if enabled != 1 {
                return Json(LoginResponse { success: false, message: "Учетная запись заблокирована".to_string() });
            }
            if db_password == payload.password {
                // ПРОВЕРКА РОЛЕЙ НА ОСНОВЕ ДАННЫХ ИЗ БАЗЫ ДАННЫХ member_tab
                if db_tools::is_user_in_group(&conn, &username, "Администраторы") {
                    // Администратор получает админский токен
                    let mut cookie = Cookie::new("admin_token", "secret_admin_val");
                    cookie.set_path("/");
                    cookies.add(cookie);
                    Json(LoginResponse { success: true, message: "ОК".to_string() })
                } else if db_tools::is_user_in_group(&conn, &username, "Пользователи") {
                    // Обычный пользователь получает только клиентский токен
                    let mut cookie = Cookie::new("session_token", "secret_client_val");
                    cookie.set_path("/");
                    cookies.add(cookie);
                    Json(LoginResponse { success: true, message: "ОК".to_string() })
                } else {
                    Json(LoginResponse { success: false, message: "Пользователь не привязан ни к одной группе".to_string() })
                }
            } else {
                Json(LoginResponse { success: false, message: "Неверный пароль".to_string() })
            }
        }
        Err(_) => Json(LoginResponse { success: false, message: "Пользователь не найден".to_string() }),
    }
}

async fn get_groups_handler(State(db): State<DbState>) -> impl IntoResponse {
    Json(db_tools::fetch_all_groups(&db.lock().unwrap()).unwrap())
}

async fn get_users_handler(State(db): State<DbState>) -> impl IntoResponse {
    Json(db_tools::fetch_all_users(&db.lock().unwrap()).unwrap())
}
