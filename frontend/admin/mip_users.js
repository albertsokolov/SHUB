const mip_users = {
    // Чистый метод рендеринга структуры без инлайновых стилей
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

        <!-- Центральная таблица -->
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
        <!-- Данные пользователей из бэкенда -->
        </tbody>
        </table>
        </div>

        <!-- Нижний статус-бар подсчета -->
        <div class="mip-status-bar">
        <span class="icon icon-user-status"></span>
        <span>Number of users in this domain: <b id="mip-user-count">0</b>.</span>
        </div>

        <!-- Подвальная панель с кнопками действий -->
        <div class="mip-action-bar">
        <div class="mip-btn-group">
        <button class="mip-btn">Add...</button>
        <button class="mip-btn">Edit...</button>
        <button class="mip-btn">Remove</button>
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

    // Метод инициализации логики
    async init() {
        const tbody = document.getElementById("mip-users-tbody");
        const countEl = document.getElementById("mip-user-count");
        if (!tbody) return;

        try {
            const res = await fetch("/api/mip/users");
            const users = await res.json();

            if (countEl) countEl.innerText = users.length;

            tbody.innerHTML = users.map(u => `
            <tr class="mip-row">
            <td class="mip-row-username"><span class="icon icon-user"></span>${u.username}</td>
            <td class="mip-row-fullname">${u.full_name || ''}</td>
            <td class="mip-row-desc">${u.description || ''}</td>
            <td class="mip-row-groups">${u.groups || ''}</td>
            </tr>
            `).join('');

            // Управление выделением строк через переключение CSS-класса classList
            tbody.addEventListener("click", (e) => {
                const row = e.target.closest(".mip-row");
                if (!row) return;

                tbody.querySelectorAll(".mip-row").forEach(r => r.classList.remove("selected"));
                row.classList.add("selected");
            });

        } catch (err) {
            tbody.innerHTML = `<tr><td colspan="4" style="color:red; padding: 10px;">Ошибка: ${err}</td></tr>`;
        }
    }
};
