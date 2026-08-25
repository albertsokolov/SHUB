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
    <thead><tr><th style="width:25%">Username <span>▲</span></th><th style="width:25%">Full Name</th><th style="width:30%">Description</th><th style="width:20%">Groups</th></tr></thead>
    <tbody id="mip-users-tbody"></tbody>
    </table>
    </div>
    <div class="mip-status-bar">
    <span class="icon icon-user-status" style="width:16px;height:16px;background-size:900% 500%"></span>
    <span>Number of users in this domain: <b id="mip-user-count">0</b>.</span>
    </div>
    <div class="mip-action-bar">
    <div class="mip-btn-group" id="mip-actions">
    <button class="mip-btn" data-act="add">Add...</button>
    <button class="mip-btn" data-act="edit">Edit...</button>
    <button class="mip-btn" data-act="remove">Remove</button>
    <button class="mip-btn">More Actions ▾</button>
    </div>
    <div class="mip-btn-group"><button class="mip-btn">Template...</button><button class="mip-btn">Import...</button></div>
    </div>
    </div>`,

    async init() {
        const tbody = document.getElementById("mip-users-tbody");
        if (!tbody) return;
        try {
            const users = await (await fetch("/api/mip/users")).json();
            document.getElementById("mip-user-count").innerText = users.length;

            tbody.innerHTML = users.map(u => `
            <tr class="mip-row ${!u.enabled ? 'mip-row-disabled' : ''}" data-user="${this.esc(u.username)}" data-full="${this.esc(u.full_name)}" data-desc="${this.esc(u.description)}" data-enabled="${u.enabled}">
            <td class="mip-row-username">
            <span class="icon icon-user" style="width:16px;height:16px;background-size:900% 500%!important;margin:0;flex-shrink:0;opacity:${u.enabled ? 1 : 0.4}"></span>
            <span>${this.esc(u.username)}</span>
            </td>
            <td>${this.esc(u.full_name)}</td><td>${this.esc(u.description)}</td><td>${this.esc(u.groups)}</td>
            </tr>`).join('');

            tbody.onmousedown = (e) => {
                const row = e.target.closest(".mip-row");
                if (!row) return;
                this.sel(tbody, row);

                if (e.button === 2) { // ПКМ
                    e.preventDefault();
                    this.closeMenu();

                    // Считываем текущий статус из data-атрибута строки ("true" или "false")
                    const isEnabled = row.dataset.enabled === "true";

                    const menu = document.createElement("div");
                    Object.assign(menu, { id: "mip-active-menu", className: "mip-context-menu" });
                    menu.style.cssText = `left:${e.clientX}px; top:${e.clientY}px;`;

                    // Формируем базовые команды (Add, Edit, Remove)
                    // Находим, где генерируется переменная menuHtml, и заменяем на этот чистый код:
                    let menuHtml = `
                    <div class="mip-context-item" data-act="add">Add...</div>
                    <div class="mip-context-item" data-act="edit">Edit...</div>
                    <div class="mip-context-item" data-act="remove">Remove</div>
                    `;

                    // Добавляем разделитель и одну динамическую команду статуса
                    menuHtml += `<div class="mip-context-separator"></div>`;
                    if (isEnabled) {
                        menuHtml += `<div class="mip-context-item" data-act="disable">Disable user</div>`;
                    } else {
                        menuHtml += `<div class="mip-context-item" data-act="enable">Enable user</div>`;
                    }

                    // Финальный неактивный пункт
                    menuHtml += `<div class="mip-context-separator"></div>
                    <div class="mip-context-item disabled">Disable 2-step verification</div>`;


                    menu.innerHTML = menuHtml;
                    document.body.appendChild(menu);

                    menu.onclick = (ev) => {
                        const item = ev.target.closest("[data-act]");
                        if (item) this.cmd(item.dataset.act, row);
                    };
                }

            };
            tbody.ondblclick = (e) => this.cmd("edit", e.target.closest(".mip-row"));
            tbody.oncontextmenu = (e) => e.preventDefault();
            document.onclick = (e) => e.target.closest("#mip-active-menu") || this.closeMenu();

            document.getElementById("mip-actions").onclick = (e) => {
                const btn = e.target.closest("[data-act]");
                if (btn) this.cmd(btn.dataset.act, tbody.querySelector(".mip-row.selected"));
            };
        } catch (err) {
            tbody.innerHTML = `<tr><td colspan="4" style="color:red;padding:10px">Ошибка: ${err}</td></tr>`;
        }
    },

    sel: (tbody, row) => {
        tbody.querySelectorAll(".mip-row").forEach(r => r.classList.remove("selected"));
        row.classList.add("selected");
    },
    closeMenu: () => document.getElementById("mip-active-menu")?.remove(),

    async cmd(act, row) {
        this.closeMenu();
        if (act !== "add" && !row) return alert("Пожалуйста, выберите пользователя в таблице.");
        if (act !== "add" && row.dataset.user === "admin") return alert(`Нельзя изменять или удалять администратора!`);

        // Обработка новых команд переключения статуса
        if (act === "enable" || act === "disable") {
            const isEnable = act === "enable";
            const res = await (await fetch("/api/mip/users/status", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ login: row.dataset.user, enabled: isEnable })
            })).json();
            res.success ? this.init() : alert(`Ошибка: ${res.message}`);
            return;
        }

        if (act === "remove") {
            this.win(true, 'Confirmation', `<div class="mip-confirm-icon-question">?</div><div class="mip-confirm-text">Are you sure you want to remove user "${row.dataset.user}"?</div>`, async () => {
                const res = await (await fetch("/api/mip/users/remove", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ login: row.dataset.user }) })).json();
                res.success ? this.init() : alert(`Ошибка: ${res.message}`);
            });
        } else {
            const isEdit = act === "edit", f = row?.dataset.full || "", s = f.indexOf(" ");
            const data = { login: isEdit ? row.dataset.user : "", first: s !== -1 ? f.substring(0, s) : f, last: s !== -1 ? f.substring(s + 1) : "", email: row?.dataset.desc === "—" ? "" : row?.dataset.desc || "" };

            const fields = [
                { id: "login", label: "Username:", type: "text", val: data.login, dis: isEdit },
                { id: "firstname", label: "First Name:", type: "text", val: data.first },
                { id: "lastname", label: "Last Name:", type: "text", val: data.last },
                { id: "email", label: "Email / Desc:", type: "email", val: data.email },
                { id: "password", label: "Password:", type: "password", val: "", ph: isEdit ? "Leave blank to keep" : "" }
            ];

            const html = fields.map(x => `<div class="mip-form-group"><label>${x.label}</label><input type="${x.type}" id="m-${x.id}" class="mip-form-input" value="${x.val}" ${x.dis ? 'disabled style="background:#e9e9e9;color:#666"' : ''} placeholder="${x.ph || ''}" autocomplete="off"></div>`).join('');
            this.win(false, isEdit ? 'Edit User Data' : 'Add New User', html, async () => {
                const vals = {};
                fields.forEach(x => vals[x.id] = document.getElementById(`m-${x.id}`).value.trim());
                if (!vals.login || (!isEdit && !vals.password) || !vals.firstname || !vals.lastname) return alert("Заполните обязательные поля!");

                const res = await (await fetch(isEdit ? "/api/mip/users/edit" : "/api/mip/users/add", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(vals) })).json();
                if (res.success) { this.init(); return true; }
                alert(`Ошибка: ${res.message}`); return false;
            });
        }
    },

    win(isConfirm, title, bodyHtml, onOk) {
        const id = "mip-win-overlay", cls = isConfirm ? "mip-confirm-window" : "mip-modal-window";
        if (document.getElementById(id)) return;

        const overlay = document.createElement("div");
        Object.assign(overlay, { id, className: "mip-modal-overlay" });
        overlay.innerHTML = `
        <div class="${cls}">
        <div class="mip-modal-header">
        <div class="mip-modal-title">${!isConfirm ? '<span class="icon icon-user" style="width:14px;height:14px;background-size:900% 500%"></span>' : ''}<span>${title}</span></div>
        <div class="mip-modal-close-btn" id="m-close">X</div>
        </div>
        <div class="${isConfirm ? 'mip-confirm-body' : 'mip-modal-body'}">${bodyHtml}</div>
        <div class="mip-modal-footer"><button class="mip-btn" id="m-ok" style="font-weight:bold">${isConfirm ? 'Yes' : 'OK'}</button><button class="mip-btn" id="m-cancel">${isConfirm ? 'No' : 'Cancel'}</button></div>
        </div>`;
        document.body.appendChild(overlay);

        const close = () => overlay.remove();
        document.getElementById("m-close").onclick = document.getElementById("m-cancel").onclick = close;
        document.getElementById("m-ok").onclick = async () => { if (await onOk() !== false) close(); };
    },

    esc: str => str ? str.replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m])) : '—'
};
