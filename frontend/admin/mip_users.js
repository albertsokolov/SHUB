/**
 * Оптимизированный модуль управления MIP-панелью пользователей (SHUB Core)
 */
const mip_users = {
    render: () => `
    <div class="mip-panel-wrapper">
    <div class="mip-filter-bar">
    <div><label>Domain:</label><select><option>Local User Database</option></select></div>
    <div><input type="checkbox" id="hide-disabled"><label for="hide-disabled">Hide disabled user accounts</label></div>
    <div class="mip-filter-input-wrapper"><label>Filter:</label><input type="text" id="mip-user-filter" class="mip-filter-input"></div>
    </div>
    <div class="mip-table-container">
    <table class="mip-grid">
    <thead><tr><th style="width: 25%;">Username <span>▲</span></th><th style="width: 25%;">Full Name</th><th style="width: 30%;">Description</th><th style="width: 20%;">Groups</th></tr></thead>
    <tbody id="mip-users-tbody"></tbody>
    </table>
    </div>
    <div class="mip-status-bar">
    <span class="icon icon-user-status" style="width:16px;height:16px;background-size:900% 500%;"></span>
    <span>Number of users in this domain: <b id="mip-user-count">0</b>.</span>
    </div>
    <div class="mip-action-bar">
    <div class="mip-btn-group">
    <button class="mip-btn" id="mip-btn-add">Add...</button>
    <button class="mip-btn" id="mip-btn-edit">Edit...</button>
    <button class="mip-btn" id="mip-btn-remove">Remove</button>
    <button class="mip-btn">More Actions ▾</button>
    </div>
    <div class="mip-btn-group"><button class="mip-btn">Template...</button><button class="mip-btn">Import...</button></div>
    </div>
    </div>`,

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
            <td class="mip-row-username">
            <span class="icon icon-user" style="width:16px;height:16px;background-size:900% 500%!important;margin:0;flex-shrink:0;"></span>
            <span>${this.esc(u.username)}</span>
            </td>
            <td class="mip-row-fullname">${this.esc(u.full_name)}</td>
            <td class="mip-row-desc">${this.esc(u.description)}</td>
            <td class="mip-row-groups">${this.esc(u.groups)}</td>
            </tr>`).join('');

            // Выделение строки при клике ЛКМ
            tbody.addEventListener("click", e => {
                const row = e.target.closest(".mip-row");
                if (row) this.sel(tbody, row);
            });

                // Контекстное меню ПКМ
                tbody.addEventListener("contextmenu", e => {
                    const row = e.target.closest(".mip-row");
                    if (!row) return e.preventDefault();
                    this.sel(tbody, row);
                    this.closeMenu();

                    const menu = document.createElement("div");
                    Object.assign(menu, { id: "mip-active-menu", className: "mip-context-menu" });
                    menu.style.cssText = `left:${e.clientX}px; top:${e.clientY}px;`;
                    menu.innerHTML = `
                    ${['add', 'edit', 'remove'].map(c => `<div class="mip-context-item" data-cmd="${c}">${c[0].toUpperCase() + c.slice(1)}...</div>`).join('')}
                    <div class="mip-context-separator"></div>
                    <div class="mip-context-item disabled">Disable 2-step verification</div>
                    <div class="mip-context-separator"></div>
                    <div class="mip-context-item" data-cmd="enable">Enable users</div>
                    <div class="mip-context-item" data-cmd="disable">Disable users</div>
                    `;
                    document.body.appendChild(menu);

                    // Нажатие внутри контекстного меню (ПКМ)
                    menu.addEventListener("click", ev => {
                        const item = ev.target.closest(".mip-context-item:not(.disabled)");
                        if (item) this.cmd(item.dataset.cmd, row.querySelector(".mip-row-username span:not(.icon)").textContent.trim(), row);
                    });
                });

                document.addEventListener("click", e => e.target.closest("#mip-active-menu") || this.closeMenu());

                // Обработчик двойного клика для редактирования
                tbody.addEventListener("dblclick", e => {
                    const row = e.target.closest(".mip-row");
                    if (!row) return;
                    this.sel(tbody, row);
                    const usernameText = row.querySelector(".mip-row-username span:not(.icon)").textContent.trim();
                    this.cmd("edit", usernameText, row);
                });

                // Назначение событий нижним кнопкам в подвале
                ["add", "edit", "remove"].forEach(act => {
                    document.getElementById(`mip-btn-${act}`).addEventListener("click", () => {
                        this.closeMenu();
                        if (act === "add") return this.cmd("add");
                        const sel = tbody.querySelector(".mip-row.selected");
                        if (sel) {
                            const userText = sel.querySelector(".mip-row-username span:not(.icon)").textContent.trim();
                            this.cmd(act, userText, sel); // Передаем выделенную строку третьим параметром
                        } else {
                            alert("Пожалуйста, выберите пользователя в таблице.");
                        }
                    });
                });

        } catch (err) {
            tbody.innerHTML = `<tr><td colspan="4" style="color:red;padding:10px;font-family:Tahoma;">Ошибка: ${err}</td></tr>`;
        }
    },

    sel: (tbody, row) => {
        tbody.querySelectorAll(".mip-row").forEach(r => r.classList.remove("selected"));
        row.classList.add("selected");
    },

    closeMenu: () => document.getElementById("mip-active-menu")?.remove(),

    // Обновленный обработчик команд для перенаправления на Edit
    cmd(command, username, selectedRow = null) {
        this.closeMenu();
        if (command === "add") return this.showModal();

        if (command === "edit") {
            if (username === "admin") return alert("Нельзя редактировать системного администратора!");
            return this.showModal(selectedRow); // Передаем строку для заполнения формы данными
        }

        if (command === "remove") {
            if (username === "admin") return alert("Нельзя удалить системного администратора!");
            this.showConfirm(`Are you sure you want to remove user "${username}"?`, async () => {
                try {
                    const response = await fetch("/api/mip/users/remove", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ login: username })
                    });
                    const result = await response.json();
                    if (result.success) this.init();
                    else alert(`Ошибка удаления: ${result.message}`);
                } catch (err) { alert(`Сетевая ошибка: ${err}`); }
            });
        } else {
            alert(`Действие: ${command.toUpperCase()} для ${username}`);
        }
    },

    // Универсальный метод модального окна (работает и на Add, и на Edit)
    showModal(editRow = null) {
        const isEdit = !!editRow;
        const modalId = isEdit ? "mip-user-edit-overlay" : "mip-user-modal-overlay";
        if (document.getElementById(modalId)) return;

        // Извлекаем текущие данные из строки таблицы, если включен режим редактирования
        let currentData = { login: "", firstname: "", lastname: "", email: "" };
        if (isEdit) {
            currentData.login = editRow.querySelector(".mip-row-username span:not(.icon)").textContent.trim();
            const fullNameText = editRow.querySelector(".mip-row-fullname").textContent.trim();
            const spaceIdx = fullNameText.indexOf(" ");
            if (spaceIdx !== -1) {
                currentData.firstname = fullNameText.substring(0, spaceIdx);
                currentData.lastname = fullNameText.substring(spaceIdx + 1);
            } else {
                currentData.firstname = fullNameText;
            }
            const descText = editRow.querySelector(".mip-row-desc").textContent.trim();
            currentData.email = descText === "—" ? "" : descText;
        }

        const overlay = document.createElement("div");
        Object.assign(overlay, { id: modalId, className: "mip-modal-overlay" });

        const fields = [
            { id: "login", label: "Username:", type: "text", value: currentData.login, disabled: isEdit },
            { id: "firstname", label: "First Name:", type: "text", value: currentData.firstname, disabled: false },
            { id: "lastname", label: "Last Name:", type: "text", value: currentData.lastname, disabled: false },
            { id: "email", label: "Email / Desc:", type: "email", value: currentData.email, disabled: false },
            { id: "password", label: "Password:", type: "password", value: "", disabled: false, placeholder: isEdit ? "Leave blank to keep current" : "" }
        ];

        overlay.innerHTML = `
        <div class="mip-modal-window">
        <div class="mip-modal-header">
        <div class="mip-modal-title">
        <span class="icon icon-user" style="width:14px;height:14px;background-size:900% 500%;"></span>
        <span>${isEdit ? 'Edit User Data' : 'Add New User'}</span>
        </div>
        <div class="mip-modal-close-btn" id="mip-modal-close">X</div>
        </div>
        <div class="mip-modal-body">
        ${fields.map(f => `
            <div class="mip-form-group">
            <label>${f.label}</label>
            <input type="${f.type}" id="modal-input-${f.id}" class="mip-form-input"
            value="${f.value}" ${f.disabled ? 'disabled style="background:#e9e9e9;color:#666;"' : ''}
            placeholder="${f.placeholder || ''}" autocomplete="off">
            </div>`).join('')}
            </div>
            <div class="mip-modal-footer">
            <button class="mip-btn" id="mip-modal-save" style="font-weight:bold;">OK</button>
            <button class="mip-btn" id="mip-modal-cancel">Cancel</button>
            </div>
            </div>`;

            document.body.appendChild(overlay);

            const close = () => overlay.remove();
            document.getElementById("mip-modal-close").onclick = close;
            document.getElementById("mip-modal-cancel").onclick = close;

            document.getElementById("mip-modal-save").onclick = async () => {
                const vals = {};
                fields.forEach(f => vals[f.id] = document.getElementById(`modal-input-${f.id}`).value.trim());

                // При создании пароль обязателен, при редактировании — может быть пустым
                if (!vals.login || (!isEdit && !vals.password) || !vals.firstname || !vals.lastname)
                    return alert("Заполните обязательные поля!");

                try {
                    // Выбираем эндпоинт в зависимости от режима окна (add или edit)
                    const apiUrl = isEdit ? "/api/mip/users/edit" : "/api/mip/users/add";
                    const response = await fetch(apiUrl, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(vals)
                    });
                    const result = await response.json();
                    if (result.success) {
                        close();
                        this.init(); // Перерисовываем таблицу для отображения изменений
                    } else {
                        alert(`Ошибка сохранения: ${result.message}`);
                    }
                } catch (err) {
                    alert(`Сетевая ошибка: ${err}`);
                }
            };
    },



    esc: str => str ? str.replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[m])) : '—'
};
