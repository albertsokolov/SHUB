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
mod logger;
mod mip_users;

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

    db_tools::init_tables(&conn).expect("Ошибка структуры таблиц");
    db_tools::seed_default_data(&conn).expect("Ошибка дефолтных данных");

    let server_port = db_tools::get_http_port(&conn);
    let db_state: DbState = Arc::new(Mutex::new(conn));

    let api_routes = Router::new()
    .route("/login", post(login_handler))
    .route("/groups", get(get_groups_handler))
    .route("/users", get(get_users_handler))
    .route("/mip/users", get(mip_users::get_mip_users_handler)) // Наш новый роут для MIP-панели
    .with_state(db_state);

    let app = Router::new()
    .nest("/api", api_routes)
    // Точки входа (Контролируются куками на бэкенде)
    .route("/", get(root_handler))
    .route("/admin", get(admin_handler))
    .route("/admin/", get(admin_handler))
    // Сервисная раздача статических ресурсов (скрипты, стили) напрямую из их папок
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

// Контроль корневого адреса address:port
async fn root_handler(cookies: Cookies) -> Response {
    if cookies.get("session_token").is_some() {
        let body = std::fs::read_to_string("frontend/client/index.html").unwrap_or_default();
        Html(body).into_response()
    } else {
        let body = std::fs::read_to_string("frontend/login/index.html").unwrap_or_default();
        Html(body).into_response()
    }
}

// Контроль адреса address:port/admin
async fn admin_handler(cookies: Cookies) -> Response {
    if cookies.get("admin_token").is_some() {
        let body = std::fs::read_to_string("frontend/admin/index.html").unwrap_or_default();
        Html(body).into_response()
    } else {
        let body = std::fs::read_to_string("frontend/admin/login/index.html").unwrap_or_default();
        Html(body).into_response()
    }
}

// Проверка авторизации
async fn login_handler(
    State(db): State<DbState>,
                       cookies: Cookies,
                       Json(payload): Json<LoginRequest>,
) -> Json<LoginResponse> {
    logger::info(APP_NAME, &format!("Попытка входа для пользователя: {}", payload.login));
    let conn = db.lock().unwrap();

    let mut stmt = conn.prepare("SELECT password, login FROM user_tab WHERE login = ?").unwrap();
    let user_res = stmt.query_row([&payload.login], |row| {
        Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?))
    });

    match user_res {
        Ok((db_password, login)) => {
            if db_password == payload.password {
                if login == "admin" {
                    let mut cookie = Cookie::new("admin_token", "secret_admin_val");
                    cookie.set_path("/");
                    cookies.add(cookie);
                } else {
                    let mut cookie = Cookie::new("session_token", "secret_client_val");
                    cookie.set_path("/");
                    cookies.add(cookie);
                }
                Json(LoginResponse { success: true, message: "ОК".to_string() })
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
