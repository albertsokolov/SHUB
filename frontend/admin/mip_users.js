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

                    menu.addEventListener("click", ev => {
                        const item = ev.target.closest(".mip-context-item:not(.disabled)");
                        if (item) this.cmd(item.dataset.cmd, row.querySelector(".mip-row-username span:not(.icon)").textContent.trim());
                    });
                });

                document.addEventListener("click", e => e.target.closest("#mip-active-menu") || this.closeMenu());

                // Компактное назначение событий нижним кнопкам
                ["add", "edit", "remove"].forEach(act => {
                    document.getElementById(`mip-btn-${act}`).addEventListener("click", () => {
                        if (act === "add") return this.cmd("add");
                        const sel = tbody.querySelector(".mip-row.selected");
                        sel ? this.cmd(act, sel.querySelector(".mip-row-username span:not(.icon)").textContent.trim()) : alert("Выберите пользователя");
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

    cmd(command, username) {
        this.closeMenu();
        if (command === "add") this.showModal();
        else alert(`Действие: ${command.toUpperCase()} для ${username}`);
    },

    showModal() {
        if (document.getElementById("mip-user-modal-overlay")) return;

        const overlay = document.createElement("div");
        Object.assign(overlay, { id: "mip-user-modal-overlay", className: "mip-modal-overlay" });

        const fields = [
            { id: "login", label: "Username:", type: "text" },
            { id: "firstname", label: "First Name:", type: "text" },
            { id: "lastname", label: "Last Name:", type: "text" },
            { id: "email", label: "Email / Desc:", type: "email" },
            { id: "password", label: "Password:", type: "password" }
        ];

        overlay.innerHTML = `
        <div class="mip-modal-window">
        <div class="mip-modal-header">
        <div class="mip-modal-title">
        <span class="icon icon-user" style="width:14px;height:14px;background-size:900% 500%;"></span>
        <span>Add New User</span>
        </div>
        <div class="mip-modal-close-btn" id="mip-modal-close">X</div>
        </div>
        <div class="mip-modal-body">
        ${fields.map(f => `
            <div class="mip-form-group">
            <label>${f.label}</label>
            <input type="${f.type}" id="modal-input-${f.id}" class="mip-form-input" autocomplete="off">
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

                if (!vals.login || !vals.password || !vals.firstname || !vals.lastname)
                    return alert("Заполните обязательные поля!");

                try {
                    // Отправляем структурированные данные на наш новый эндпоинт в Axum
                    const response = await fetch("/api/users/add", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(vals)
                    });

                    const result = await response.json();

                    if (result.success) {
                        close();
                        this.init(); // Автоматически обновляем таблицу и инкрементируем счетчик пользователей
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
