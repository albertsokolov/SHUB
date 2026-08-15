document.addEventListener("DOMContentLoaded", () => {
    // 1. Генерируем каркас интерфейса, динамически внедряя изолированные файлы меню
    renderInterface();

    // 2. Инициализируем интерактивную логику
    initPhantomResizable();
    initMenuTabs();
    initWindowResizeDebounce();
    initMenuTreeClicks();
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
    <div class="mainMenu">
    <div id="app-logo" class="logo-wrapper">
    <a class="logo-link" id="btn-0" title="Dashboard"></a>
    </div>

    <ul class="x-tab-strip">
    <li class="btn-1" title="Accounts" data-target="accounts"></li>
    <li class="btn-2 active" title="Status" data-target="status"></li>
    <li class="btn-3" title="Configuration" data-target="configuration"></li>
    <li class="btn-4" title="Logs" data-target="logs"></li>
    </ul>
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
    <span id="title-icon" class="icon icon-dashboard" style="margin-right: 10px;"></span>
    <span id="title-text">Dashboard</span>
    </h2>
    </div>
    <div class="content-area" id="main-content" style="padding: 20px; font-family: sans-serif;">
    <div class="section-block">
    <h4 style="color: #15428b; border-bottom: 1px dotted #a3bae9; padding-bottom: 4px; margin-top: 0;">Система</h4>
    <table style="width: 100%; font-size: 13px; color: #333;">
    <tr><td style="width: 200px; padding: 4px 0;">Версия:</td><td>9.x (SQLCipher Core)</td></tr>
    <tr><td style="padding: 4px 0;">Операционная система:</td><td>Arch Linux</td></tr>
    <tr><td style="padding: 4px 0;">Имя хоста:</td><td>master-hub.local</td></tr>
    </table>
    </div>
    </div>
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

                    const firstItem = panel.querySelector(".menu-tree li");
                    if (firstItem) {
                        panel.querySelectorAll(".menu-tree li").forEach(li => li.classList.remove("active"));
                        firstItem.classList.add("active");
                        firstItem.click();
                    }
                } else {
                    panel.classList.remove("active");
                    panel.classList.add("hide");
                }
            });
        });
    });
}

/**
 * ЛОГИКА КЛИКОВ ПО ДЕРЕВУ МЕНЮ
 */
function initMenuTreeClicks() {
    const menuContainer = document.querySelector(".menu-panel");
    if (!menuContainer) return;

    menuContainer.addEventListener("click", (e) => {
        const li = e.target.closest("li");
        if (!li) return;

        document.querySelectorAll(".menu-tree li").forEach(item => item.classList.remove("active"));
        li.classList.add("active");

        const itemText = li.textContent.trim();
        const iconClass = li.querySelector(".icon").className;

        document.getElementById("title-text").innerText = itemText;
        document.getElementById("title-icon").className = iconClass;

        const action = li.getAttribute("data-action");
        executeMenuAction(action);
    });
}

/**
 * МАРШРУТИЗАЦИЯ ДЕЙСТВИЙ (ОТРИСОВКА КОНТЕНТА)
 */
function executeMenuAction(action) {
    const content = document.getElementById("main-content");
    if (!content) return;

    if (action === "user-list") {
        content.innerHTML = `<i>Загрузка списка пользователей...</i>`;
        fetch("/api/users").then(r => r.json()).then(users => {
            let html = `<table class="data-table"><tr><th>ID</th><th>Имя</th><th>Фамилия</th><th>Логин</th><th>Email</th></tr>`;
            users.forEach(u => {
                html += `<tr><td>${u.id}</td><td>${u.first_name}</td><td>${u.last_name}</td><td><b>${u.login}</b></td><td>${u.email || '—'}</td></tr>`;
            });
            content.innerHTML = html + `</table>`;
        });
    } else if (action === "group-list") {
        content.innerHTML = `<i>Загрузка системных групп...</i>`;
        fetch("/api/groups").then(r => r.json()).then(groups => {
            let html = `<table class="data-table"><tr><th>ID</th><th>Группа</th><th>Описание прав</th></tr>`;
            groups.forEach(g => {
                html += `<tr><td>${g.id}</td><td><b>${g.name}</b></td><td>${g.description || '—'}</td></tr>`;
            });
            content.innerHTML = html + `</table>`;
        });
    } else if (action === "dashboard") {
        content.innerHTML = `
        <div class="section-block">
        <h4 style="color: #15428b; border-bottom: 1px dotted #a3bae9; padding-bottom: 4px; margin-top: 0;">Система</h4>
        <table style="width: 100%; font-size: 13px; color: #333;">
        <tr><td style="width: 200px; padding: 4px 0;">Версия:</td><td>9.x (SQLCipher Core)</td></tr>
        <tr><td style="padding: 4px 0;">Операционная система:</td><td>Arch Linux</td></tr>
        <tr><td style="padding: 4px 0;">Имя хоста:</td><td>master-hub.local</td></tr>
        </table>
        </div>
        `;
    } else {
        content.innerHTML = `<p style="color:#666;">Раздел <b>${action}</b> подключен и ожидает верстки данных бэкенда.</p>`;
    }
}

/**
 * РЕСАЙЗЕР И DEBOUNCE ОКНА
 */
function initPhantomResizable() {
    const resizer = document.getElementById('dragMe');
    const phantom = document.getElementById('phantom');
    const menuPanel = document.querySelector('.menu-panel');
    if (!resizer || !phantom || !menuPanel) return;

    let startX = 0; let currentDeltaX = 0; let initialMenuWidth = 0;

    resizer.addEventListener('mousedown', (e) => {
        e.preventDefault();
        startX = e.clientX; initialMenuWidth = menuPanel.offsetWidth; currentDeltaX = 0;
        phantom.style.transform = 'translateX(0px)';
        document.body.classList.add('is-resizing');
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    });

    function onMouseMove(e) {
        let deltaX = e.clientX - startX;
        let potentialWidth = initialMenuWidth + deltaX;
        if (potentialWidth < 150) deltaX = 150 - initialMenuWidth;
        else if (potentialWidth > 400) deltaX = 400 - initialMenuWidth;
        currentDeltaX = deltaX; phantom.style.transform = `translateX(${currentDeltaX}px)`;
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

function initWindowResizeDebounce() {
    function debounce(func, delay) {
        let timeoutId;
        return function (...args) {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => func.apply(this, args), delay);
        };
    }
    window.addEventListener('resize', debounce(() => {
        const contentArea = document.querySelector('.content-area');
        if (contentArea) {
            contentArea.style.display = 'none'; contentArea.offsetHeight; contentArea.style.display = 'block';
        }
    }, 200));
}
