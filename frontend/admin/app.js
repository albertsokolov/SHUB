document.addEventListener("DOMContentLoaded", () => {
    // ПОЛНОЕ ОТКЛЮЧЕНИЕ МЕНЮ БРАУЗЕРА НА ВСЕЙ СТРАНИЦЕ АДМИНКИ
    document.addEventListener("contextmenu", e => e.preventDefault());
    // 1. Генерируем каркас интерфейса, динамически внедряя изолированные файлы меню
    renderInterface();

    // 2. Инициализируем интерактивную логику, табы и ресайзер
    initPhantomResizable();
    initMenuTabs();
    initWindowResizeDebounce();
    initMenuTreeClicks();

    // 3. Запускаем хэш-роутер для отслеживания текущего адреса панели (например, #users)
    window.addEventListener("hashchange", handleHashRouter);
    handleHashRouter(); // Проверка хэша при первичной загрузке страницы
});

/**
 * ГЕНЕРАЦИЯ ИНТЕРФЕЙСА
 */
function renderInterface() {
    const root = document.getElementById("app-root");
    if (!root) return;

    root.innerHTML = `
    <div class="app-layout">

    <!-- Панель баннера (40px) -->
    <div class="baner-panel">
    <div class="mainMenu" style="position: relative; height: 100%;">
    <div id="app-logo" class="logo-wrapper">
    <a class="logo-link" id="btn-0" title="Dashboard"></a>
    </div>

    <ul class="x-tab-strip">
    <li class="btn-1" title="Accounts" data-target="accounts"></li>
    <li class="btn-2 active" title="Status" data-target="status"></li>
    <li class="btn-3" title="Configuration" data-target="configuration"></li>
    <li class="btn-4" title="Logs" data-target="logs"></li>
    </ul>

    <!-- Логотип в нижней части панели -->
    <div class="bottom-logo-wrapper">
    <img src="/admin-files/img/shub-logo-transparent.png" alt="SHUB" class="bottom-logo-img">
    </div>
    </div>
    </div>

    <!-- Белая панель меню: собирает данные из четырех внешних файлов -->
    <div class="menu-panel">
    ${mp_accounts.render()}
    ${mp_status.render()}
    ${mp_configuration.render()}
    ${mp_logs.render()}
    </div>

    <!-- Интерактивный разделитель с фантомом -->
    <div class="spacer" id="dragMe">
    <div class="phantom-line" id="phantom"></div>
    </div>

    <!-- Основная правая часть страницы -->
    <div class="main-container">
    <div class="upper-panel">
    <h2 id="panel-title" style="margin: 0; font-family: sans-serif; color: #333; padding-left: 20px; line-height: 40px; font-weight: normal; display: flex; align-items: center;">
    <span id="title-icon" class="icon icon-dashboard"></span>
    <span id="title-text">Dashboard</span>
    </h2>
    </div>
    <!-- Рабочая область для динамических MIP-панелей -->
    <div class="content-area" id="main-content" style="font-family: sans-serif; height: calc(100% - 40px); background: #fff;"></div>
    </div>
    </div>
    `;
}

/**
 * УПРАВЛЕНИЕ ТАБАМИ — Переключение подпанелей меню
 */
function initMenuTabs() {
    const tabs = document.querySelectorAll(".x-tab-strip li");
    const subPanels = document.querySelectorAll(".menu-sub-panel");

    tabs.forEach(tab => {
        tab.addEventListener("click", () => {
            tabs.forEach(t => t.classList.remove("active"));
            tab.classList.add("active");

            const target = tab.getAttribute('data-target');
            const targetPanelId = `menu_panel_${target}`;

            subPanels.forEach(panel => {
                if (panel.id === targetPanelId) {
                    panel.classList.remove("hide");
                    panel.classList.add("active");
                } else {
                    panel.classList.remove("active");
                    panel.classList.add("hide");
                }
            });
        });
    });
}

/**
 * ЛОГИКА КЛИКОВ ПО ДЕРЕВУ МЕНЮ — Формирует красивый URL со слешем
 */
function initMenuTreeClicks() {
    const menuContainer = document.querySelector(".menu-panel");
    if (!menuContainer) return;

    menuContainer.addEventListener("click", (e) => {
        const li = e.target.closest("li");
        if (!li) return;

        const action = li.getAttribute("data-action");
        let targetHash = "dashboard";

        if (action === "user-list") {
            targetHash = "users";
        } else if (action === "dashboard") {
            targetHash = "dashboard";
        } else {
            targetHash = action;
        }

        // Формируем красивый путь "/admin/#users" вместо "/admin#users"
        const targetUrl = `/admin/#${targetHash}`;

        // Обновляем адресную строку без перезагрузки страницы
        window.history.pushState({ hash: `#${targetHash}` }, "", targetUrl);

        // Принудительно вызываем роутер, так как pushState не триггерит событие hashchange
        handleHashRouter();
    });
}


/**
 * ГЛОБАЛЬНЫЙ ХЭШ-РОУТЕР (Управляет отображением MIP-панелей)
 */
function handleHashRouter() {
    const hash = window.location.hash || "#dashboard";
    const contentArea = document.getElementById("main-content");
    const titleText = document.getElementById("title-text");
    const titleIcon = document.getElementById("title-icon");

    if (!contentArea) return;

    // Сбрасываем старую подсветку со всех списков во всех левых панелях
    document.querySelectorAll(".menu-tree li").forEach(li => li.classList.remove("active"));

    // Маршрутизация по хэшам
    if (hash === "#users") {
        const userLi = document.querySelector('[data-action="user-list"]');
        if (userLi) userLi.classList.add("active");

        if (titleText) titleText.innerText = "Список пользователей";
        if (titleIcon) titleIcon.className = "icon icon-user";

        // Рендерим и инициализируем MIP-панель пользователей
        contentArea.innerHTML = mip_users.render();
        mip_users.init();

    } else if (hash === "#dashboard") {
        const dashLi = document.querySelector('[data-action="dashboard"]');
        if (dashLi) dashLi.classList.add("active");

        if (titleText) titleText.innerText = "Dashboard";
        if (titleIcon) titleIcon.className = "icon icon-dashboard";

        contentArea.innerHTML = `
        <div class="section-block" style="margin: 20px;">
        <h4 style="color: #15428b; border-bottom: 1px dotted #a3bae9; padding-bottom: 4px; margin-top: 0;">Система</h4>
        <table style="width: 100%; font-size: 13px; color: #333;">
        <tr><td style="width: 200px; padding: 4px 0;">Версия:</td><td>9.x (SQLCipher Core)</td></tr>
        <tr><td style="padding: 4px 0;">Операционная система:</td><td>Arch Linux</td></tr>
        <tr><td style="padding: 4px 0;">Имя хоста:</td><td>master-hub.local</td></tr>
        </table>
        </div>
        `;
    } else {
        // Заглушка для остальных MIP-панелей, которые мы будем создавать далее
        const dynamicLi = document.querySelector(`[data-action="${hash.replace('#', '')}"]`);
        if (dynamicLi) {
            dynamicLi.classList.add("active");
            if (titleText) titleText.innerText = dynamicLi.textContent.trim();
            if (titleIcon) titleIcon.className = dynamicLi.querySelector(".icon").className;
        }

        contentArea.innerHTML = `
        <div style="padding: 20px; color: #666;">
        <h3>Панель в разработке</h3>
        <p>MIP-компонент для адреса <b>${hash}</b> подключен к роутеру и ожидает верстки фронтенда.</p>
        </div>
        `;
    }
}

/**
 * ФАНТОМНЫЙ РЕСАЙЗЕР ДЛЯ MENU-PANEL
 */
function initPhantomResizable() {
    const resizer = document.getElementById('dragMe');
    const phantom = document.getElementById('phantom');
    const menuPanel = document.querySelector('.menu-panel');

    if (!resizer || !phantom || !menuPanel) return;

    let startX = 0;
    let currentDeltaX = 0;
    let initialMenuWidth = 0;

    resizer.addEventListener('mousedown', (e) => {
        e.preventDefault();
        startX = e.clientX;
        initialMenuWidth = menuPanel.offsetWidth;
        currentDeltaX = 0;
        phantom.style.transform = 'translateX(0px)';
        document.body.classList.add('is-resizing');

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    });

    function onMouseMove(e) {
        let deltaX = e.clientX - startX;
        let potentialWidth = initialMenuWidth + deltaX;
        const MIN_WIDTH = 150;
        const MAX_WIDTH = 400;

        if (potentialWidth < MIN_WIDTH) {
            deltaX = MIN_WIDTH - initialMenuWidth;
        } else if (potentialWidth > MAX_WIDTH) {
            deltaX = MAX_WIDTH - initialMenuWidth;
        }

        currentDeltaX = deltaX;
        phantom.style.transform = `translateX(${currentDeltaX}px)`;
    }

    function onMouseUp() {
        let finalWidth = initialMenuWidth + currentDeltaX;
        menuPanel.style.width = `${finalWidth}px`;
        menuPanel.style.minWidth = `${finalWidth}px`;
        menuPanel.style.flexBasis = `${finalWidth}px`;
        document.body.classList.remove('is-resizing');
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
    }
}

/**
 * ОПТИМИЗАЦИЯ ИЗМЕНЕНИЯ РАЗМЕРОВ ОКНА (DEBOUNCE)
 */
function initWindowResizeDebounce() {
    function debounce(func, delay) {
        let timeoutId;
        return function (...args) {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => func.apply(this, args), delay);
        };
    }

    function repaintLayout() {
        const contentArea = document.querySelector('.content-area');
        if (contentArea) {
            contentArea.style.display = 'none';
            contentArea.offsetHeight;
            contentArea.style.display = 'block';
        }
    }
    window.addEventListener('resize', debounce(repaintLayout, 200));
}
