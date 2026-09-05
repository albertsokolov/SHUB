document.addEventListener("DOMContentLoaded", () => {
    // В точности как на скриншоте имя пользователя
    const currentUserName = "Albert";

    const root = document.getElementById("client-root");
    if (!root) return;

    root.innerHTML = `
    <!-- 1. Верхняя панель client_upper_panel -->
    <div class="client-upper-panel">
    <!-- Логотип Workspace -->
    <div class="client-logo-area">Workspace</div>

    <!-- Центральный инпут живого поиска -->
    <div class="client-search-wrapper">
    <input type="text" class="client-search-input" placeholder="Search">
    <svg class="client-search-icon" viewBox="0 0 24 24">
    <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
    </svg>
    </div>

    <!-- Правый блок профиля с именем пользователя -->
    <div class="client-user-wrapper">
    <div class="client-user-selector" id="client-user-menu-btn">
    <span class="client-user-name">${currentUserName}</span>
    <span class="client-user-arrow">▼</span>
    </div>

    <!-- Контекстное меню в соответствии со скриншотом -->
    <div class="client-dropdown-menu" id="client-user-dropdown-menu">
    <div class="client-dropdown-item" onclick="alert('Настройки аккаунта')">
    <span class="c-icon" style="border: 2px dashed #999; border-radius:50%"></span>Settings...
    </div>
    <div class="client-dropdown-item" onclick="alert('Инструменты импорта')">
    <span class="c-icon" style="border: 2px dashed #999; border-radius:50%"></span>Tools...
    </div>
    <div class="client-dropdown-item" onclick="alert('Справка системы')">
    <span class="c-icon" style="visibility:hidden"></span>Help
    </div>

    <div class="client-dropdown-separator"></div>

    <!-- Пункт перехода в административную часть, если у пользователя есть права -->
    <div class="client-dropdown-item" id="client-btn-go-admin" style="font-weight:bold">
    <span class="c-icon" style="border: 2px dotted #15428b"></span>Launch Administration
    </div>
    <div class="client-dropdown-item" onclick="alert('Режим контент-менеджера')">
    <span class="c-icon" style="border: 1px solid #444"></span>Content Manager Mode
    </div>

    <div class="client-dropdown-separator"></div>

    <div class="client-dropdown-item" id="client-btn-logout" style="color: #cc0000;">
    <span class="c-icon" style="visibility:hidden"></span>Logout
    </div>
    </div>
    </div>
    </div>

    <!-- 2. Основная рабочая область под шапкой -->
    <div class="client-main-content" id="client-main-viewport">
    <div style="padding: 30px; font-family: sans-serif;">
    <h2 style="color: #333; font-weight: normal; margin-bottom: 8px;">News Feed</h2>
    <p style="color: #666; font-size: 13px;">The latest updates in your favorite items</p>
    </div>
    </div>
    `;

    // Инициализация событий контекстного меню шапки
    initClientDropdown();
});

/**
 * Логика управления отображением выпадающего списка
 */
function initClientDropdown() {
    const btn = document.getElementById("client-user-menu-btn");
    const dropdown = document.getElementById("client-user-dropdown-menu");
    const logoutBtn = document.getElementById("client-btn-logout");
    const goAdminBtn = document.getElementById("client-btn-go-admin");

    if (!btn || !dropdown) return;

    // Переключение видимости по клику на имя
    btn.onclick = (e) => {
        e.stopPropagation();
        dropdown.classList.toggle("show");
    };

    // Скрытие меню при клике в любое свободное место экрана
    document.addEventListener("click", () => dropdown.classList.remove("show"));

    // Переход в админку (проверит куку на бэкенде)
    if (goAdminBtn) {
        goAdminBtn.onclick = () => {
            window.location.href = "/admin";
        };
    }

    // Полное уничтожение сессии при нажатии на Logout
    if (logoutBtn) {
        logoutBtn.onclick = () => {
            // Стираем клиентский session_token, выставив дату в прошлое
            document.cookie = "session_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT;";
            // Перенаправляем на корень, бэкенд выбросит форму ввода
            window.location.href = "/";
        };
    }
}
