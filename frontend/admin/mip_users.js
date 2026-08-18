/**
 * Модуль управления MIP-панелью пользователей (SHUB Core)
 */
const mip_users = {
    // Чистый метод рендеринга структуры панели
    render() {
        return `
        <div class="mip-panel-wrapper">

        <!-- Верхняя панель фильтрации -->
        <div class="mip-filter-bar">
        <div>
        <label>Domain:</label>
        <select><option>Local User Database</option></select>
        </div>
        <div>
        <input type="checkbox" id="hide-disabled">
        <label for="hide-disabled">Hide disabled user accounts</label>
        </div>
        <div class="mip-filter-input-wrapper">
        <label>Filter:</label>
        <input type="text" id="mip-user-filter" class="mip-filter-input">
        </div>
        </div>

        <!-- Центральная таблица данных -->
        <div class="mip-table-container">
        <table class="mip-grid">
        <thead>
        <tr>
        <th style="width: 25%;">Username <span>▲</span></th>
        <th style="width: 25%;">Full Name</th>
        <th style="width: 30%;">Description</th>
        <th style="width: 20%;">Groups</th>
        </tr>
        </thead>
        <tbody id="mip-users-tbody">
        <!-- Данные пользователей из бэкенда загружаются асинхронно -->
        </tbody>
        </table>
        </div>

        <!-- Нижний статус-бар подсчета -->
        <div class="mip-status-bar">
        <span class="icon icon-user-status" style="width: 16px; height: 16px; background-size: 900% 500%;"></span>
        <span>Number of users in this domain: <b id="mip-user-count">0</b>.</span>
        </div>

        <!-- Подвальная панель с кнопками действий -->
        <div class="mip-action-bar">
        <div class="mip-btn-group">
        <button class="mip-btn" id="mip-btn-add">Add...</button>
        <button class="mip-btn" id="mip-btn-edit">Edit...</button>
        <button class="mip-btn" id="mip-btn-remove">Remove</button>
        <button class="mip-btn">More Actions ▾</button>
        </div>
        <div class="mip-btn-group">
        <button class="mip-btn">Template...</button>
        <button class="mip-btn">Import...</button>
        </div>
        </div>

        </div>
        `;
    },

    // Метод инициализации логики, событий и загрузки данных
    async init() {
        const tbody = document.getElementById("mip-users-tbody");
        const countEl = document.getElementById("mip-user-count");
        if (!tbody) return;

        try {
            // Запрос к бэкенду на Axum
            const res = await fetch("/api/mip/users");
            const users = await res.json();

            if (countEl) countEl.innerText = users.length;

            // Рендеринг строк. Добавлены инлайновые стили для иконки для идеального сжатия до 16px
            tbody.innerHTML = users.map(u => `
            <tr class="mip-row">
            <td class="mip-row-username">
            <span class="icon icon-user" style="width: 16px; height: 16px; background-size: 900% 500% !important; margin: 0; flex-shrink: 0;"></span>
            <span>${this.escapeHtml(u.username)}</span>
            </td>
            <td class="mip-row-fullname">${this.escapeHtml(u.full_name)}</td>
            <td class="mip-row-desc">${this.escapeHtml(u.description)}</td>
            <td class="mip-row-groups">${this.escapeHtml(u.groups)}</td>
            </tr>
            `).join('');

            // 1. Управление левым кликом мыши (выделение активной строки)
            tbody.addEventListener("click", (e) => {
                const row = e.target.closest(".mip-row");
                if (!row) return;
                this.selectRow(tbody, row);
            });

            // 2. Управление ПРАВЫМ кликом мыши (Кастомное контекстное меню)
            tbody.addEventListener("contextmenu", (e) => {
                const row = e.target.closest(".mip-row");
                if (!row) return;

                // Блокируем дефолтное контекстное меню браузера
                e.preventDefault();

                // Автоматически выделяем строку, по которой кликнули правой кнопкой
                this.selectRow(tbody, row);

                // Закрываем предыдущее контекстное меню, если оно было на экране
                this.closeActiveMenu();

                // Создаем и позиционируем новое контекстное меню
                const menu = document.createElement("div");
                menu.id = "mip-active-menu";
                menu.className = "mip-context-menu";

                menu.innerHTML = `
                <div class="mip-context-item" data-cmd="add">Add...</div>
                <div class="mip-context-item" data-cmd="edit">Edit...</div>
                <div class="mip-context-item" data-cmd="remove">Remove</div>
                <div class="mip-context-separator"></div>
                <div class="mip-context-item disabled">Disable 2-step verification</div>
                <div class="mip-context-separator"></div>
                <div class="mip-context-item" data-cmd="enable">Enable users</div>
                <div class="mip-context-item" data-cmd="disable">Disable users</div>
                <div class="mip-context-separator"></div>
                <div class="mip-context-item" data-cmd="template">Template...</div>
                <div class="mip-context-item" data-cmd="import">Import...</div>
                `;

                // Устанавливаем координаты вызова в месте курсора мыши
                menu.style.left = `${e.clientX}px`;
                menu.style.top = `${e.clientY}px`;
                document.body.appendChild(menu);

                // Обработчик нажатий внутри контекстного меню
                menu.addEventListener("click", (menuEvent) => {
                    const item = menuEvent.target.closest(".mip-context-item");
                    if (!item || item.classList.contains("disabled")) return;

                    const command = item.getAttribute("data-cmd");
                    const usernameText = row.querySelector(".mip-row-username span:not(.icon)").textContent.trim();

                    this.executeCommand(command, usernameText);
                });
            });

            // 3. Закрытие меню при левом клике в любую пустую область экрана
            document.addEventListener("click", (e) => {
                if (!e.target.closest("#mip-active-menu")) {
                    this.closeActiveMenu();
                }
            });

            // 4. Привязка обычных подвальных кнопок действий к той же логике команд
            document.getElementById("mip-btn-add").addEventListener("click", () => this.executeCommand("add", null));
            document.getElementById("mip-btn-edit").addEventListener("click", () => this.handleRowAction("edit", tbody));
            document.getElementById("mip-btn-remove").addEventListener("click", () => this.handleRowAction("remove", tbody));

        } catch (err) {
            tbody.innerHTML = `<tr><td colspan="4" style="color:red; padding: 10px; font-family: Tahoma;">Ошибка загрузки: ${err}</td></tr>`;
        }
    },

    // Вспомогательный метод переключения класса выделения строки
    selectRow(tbody, row) {
        tbody.querySelectorAll(".mip-row").forEach(r => r.classList.remove("selected"));
        row.classList.add("selected");
    },

    // Метод удаления контекстного меню из DOM
    closeActiveMenu() {
        const activeMenu = document.getElementById("mip-active-menu");
        if (activeMenu) activeMenu.remove();
    },

    // Обработка действий подвальных кнопок, требующих предварительного выбора строки
    handleRowAction(command, tbody) {
        const selectedRow = tbody.querySelector(".mip-row.selected");
        if (!selectedRow) {
            alert("Пожалуйста, сначала выберите пользователя в таблице.");
            return;
        }
        const usernameText = selectedRow.querySelector(".mip-row-username span:not(.icon)").textContent.trim();
        this.executeCommand(command, usernameText);
    },

    // Централизованный обработчик выполнения бизнес-логики (Add, Edit, Remove)
    executeCommand(command, username) {
        this.closeActiveMenu();
        console.log(`[SHUB Admin] Команда: ${command}. Целевой пользователь: ${username || 'Новый'}`);

        // Временная заглушка-индикатор до реализации модальных окон управления SQLite
        if (command === "add") {
            alert("Вызов интерфейса создания нового пользователя");
        } else {
            alert(`Действие: ${command.toUpperCase()}\nПользователь: ${username}`);
        }
    },

    // Метод экранирования строк для защиты от XSS атак через БД
    escapeHtml(str) {
        if (!str) return '—';
        return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
    }
};
