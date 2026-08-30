/**
 * Оптимизированный модуль управления MIP-панелью групп (SHUB Core)
 */
const mip_groups = {
    async init() {
        const tbody = document.getElementById("mip-groups-tbody");
        if (!tbody) return;
        try {
            const groups = await (await fetch("/api/groups")).json();
            document.getElementById("mip-group-count").innerText = groups.length;
            this.currentSort = { field: null, asc: true };

            const renderRows = (dataList) => {
                tbody.innerHTML = dataList.map(g => `
                <tr class="mip-row" data-id="${g.id}" data-name="${this.esc(g.name)}" data-desc="${this.esc(g.description)}">
                <td>${g.id}</td>
                <td style="display:flex;align-items:center;gap:6px">
                <span class="icon icon-groups" style="width:16px;height:16px;background-size:900% 500%!important;margin:0;flex-shrink:0"></span>
                <span>${this.esc(g.name)}</span>
                </td>
                <td>${this.esc(g.description)}</td>
                </tr>`).join('');
            };
            renderRows(groups);

            // КЛИЕНТСКАЯ СОРТИРОВКА ГРУПП
            document.getElementById("mip-group-th-sort-row").onclick = (e) => {
                const th = e.target.closest("th[data-sort]");
                if (!th) return;
                const sortField = th.dataset.sort;
                this.currentSort.asc = this.currentSort.field === sortField ? !this.currentSort.asc : true;
                this.currentSort.field = sortField;

                document.querySelectorAll("#mip-group-th-sort-row .sort-arrow").forEach(s => s.innerText = "");
                th.querySelector(".sort-arrow").innerText = this.currentSort.asc ? " ▲" : " ▼";

                groups.sort((a, b) => {
                    if (sortField === "id") return this.currentSort.asc ? a.id - b.id : b.id - a.id;
                    const valA = a[sortField === "name" ? "name" : "description"] || "";
                    const valB = b[sortField === "name" ? "name" : "description"] || "";
                    return this.currentSort.asc ? valA.localeCompare(valB) : valB.localeCompare(valA);
                });
                renderRows(groups); applyFilters();
            };

            // ЖИВАЯ ФИЛЬТРАЦИЯ
            const filterInput = document.getElementById("mip-group-filter");
            const applyFilters = () => {
                const query = filterInput.value.toLowerCase().trim();
                let visibleCount = 0;
                tbody.querySelectorAll(".mip-row").forEach(row => {
                    const matches = row.dataset.name.toLowerCase().includes(query) || row.dataset.desc.toLowerCase().includes(query);
                    row.style.display = matches ? "" : "none";
                    if (matches) visibleCount++;
                });
                    document.getElementById("mip-group-count").innerText = visibleCount;
            };
            if (filterInput) filterInput.oninput = applyFilters;

            // ОБЪЕДИНЕННЫЙ СЛУШАТЕЛЕЙ СОБЫТИЙ ТАБЛИЦЫ (ЛКМ, ПКМ, ДВУКЛИК)
            tbody.onmousedown = (e) => {
                const row = e.target.closest(".mip-row");
                if (!row) return;
                this.sel(tbody, row);

                if (e.button === 2) { // ПКМ
                    e.preventDefault(); this.closeMenu();
                    const menu = document.createElement("div");
                    Object.assign(menu, { id: "mip-active-menu", className: "mip-context-menu" });
                    menu.style.cssText = `left:${e.clientX}px; top:${e.clientY}px;`;
                    menu.innerHTML = `
                    <div class="mip-context-item" data-act="add">Добавить</div>
                    <div class="mip-context-item" data-act="edit">Редактировать...</div>
                    <div class="mip-context-item" data-act="remove">Удалить...</div>`;
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

            // ДЕЛЕГИРОВАНИЕ КНОПОК ПОДВАЛА
            document.getElementById("mip-group-actions").onclick = (e) => {
                const btn = e.target.closest("[data-act]");
                if (btn) this.cmd(btn.dataset.act, tbody.querySelector(".mip-row.selected"));
            };
        } catch (err) {
            tbody.innerHTML = `<tr><td colspan="3" style="color:red;padding:10px">Ошибка: ${err}</td></tr>`;
        }
    },

    sel: (tbody, row) => {
        tbody.querySelectorAll(".mip-row").forEach(r => r.classList.remove("selected"));
        row.classList.add("selected");
    },
    closeMenu: () => document.getElementById("mip-active-menu")?.remove(),

    cmd(act, row) {
        this.closeMenu();
        if (act !== "add" && !row) return alert("Пожалуйста, выберите группу в таблице.");

        if (act === "add") {
            const html = `<div class="mip-form-group"><label>Имя группы:</label><input type="text" id="mg-name" class="mip-form-input" autocomplete="off"></div>
            <div class="mip-form-group"><label>Описание:</label><input type="text" id="mg-desc" class="mip-form-input" autocomplete="off"></div>`;
            this.win("Создание группы", html, async () => {
                const name = document.getElementById("mg-name").value.trim();
                if (!name) return alert("Имя группы обязательно!");
                alert(`Добавить группу: "${name}"`); return true;
            });
        }
        else if (act === "edit") {
            // ФОРМИРУЕМ ОКНО РЕДАКТИРОВАНИЯ С ФИКСИРОВАННЫМ РАЗМЕРОМ ДЛЯ ВСЕХ ВКЛАДОК
            const html = `
            <!-- Вкладки ExtJS стиля -->
            <ul class="x-tab-strip" style="margin-top:0; margin-bottom:15px; flex-direction:row; height:24px; width:100%; border-bottom:1px solid #99bbe8">
            <li class="active" data-win-tab="general" style="background:none; width:70px; height:23px; text-align:center; line-height:23px; border:1px solid #99bbe8; border-bottom:none; border-radius:3px 3px 0 0">General</li>
            <li data-win-tab="members" style="background:none; width:70px; height:23px; text-align:center; line-height:23px; border:1px solid transparent; border-bottom:none; border-radius:3px 3px 0 0">Members</li>
            <li data-win-tab="rights" style="background:none; width:70px; height:23px; text-align:center; line-height:23px; border:1px solid transparent; border-bottom:none; border-radius:3px 3px 0 0">Rights</li>
            </ul>

            <!-- Контент вкладки 1: General (Фиксированная высота 120px) -->
            <div id="w-tab-general" class="win-tab-content" style="height:120px; display:flex; flex-direction:column; gap:10px; padding-top:5px">
            <div class="mip-form-group"><label>Name:</label><input type="text" id="mg-name" class="mip-form-input" value="${row.dataset.name}" disabled style="background:#e9e9e9;color:#666"></div>
            <div class="mip-form-group"><label>Description:</label><input type="text" id="mg-desc" class="mip-form-input" value="${row.dataset.desc}"></div>
            </div>

            <!-- Контент вкладки 2: Members (Точно такая же фиксированная высота 120px) -->
            <div id="w-tab-members" class="win-tab-content" style="display:none; height:120px; box-sizing:border-box; padding-top:5px">
            <div style="border:1px solid #a3bae9; background:#fff; height:100%; padding:8px; overflow-y:auto; color:#666">
            Список участников группы подгружается...
            </div>
            </div>

            <!-- Контент вкладки 3: Rights (Точно такая же фиксированная высота 120px) -->
            <div id="w-tab-rights" class="win-tab-content" style="display:none; height:120px; box-sizing:border-box; padding-top:5px">
            <div style="border:1px solid #a3bae9; background:#fff; height:100%; padding:8px; overflow-y:auto; color:#666">
            Матрица прав доступа к модулям подгружается...
            </div>
            </div>
            `;

            this.win("Edit Group", html, async () => {
                const desc = document.getElementById("mg-desc").value.trim();
                alert(`Сохранение изменений группы "${row.dataset.name}". Описание: "${desc}"`);
                return true;
            }, false, "500px"); // Ширина 500px жестко зафиксирована в win()
        }
    },

    win(title, bodyHtml, onOk, isConfirm = false, customWidth = "330px") {
        const id = "mip-group-win-overlay", cls = isConfirm ? "mip-confirm-window" : "mip-modal-window";
        if (document.getElementById(id)) return;

        const overlay = document.createElement("div");
        Object.assign(overlay, { id, className: "mip-modal-overlay" });
        overlay.innerHTML = `
        <div class="${cls}" style="width: ${customWidth}">
        <div class="mip-modal-header">
        <div class="mip-modal-title">${!isConfirm ? '<span class="icon icon-groups" style="width:14px;height:14px;background-size:900% 500%"></span>' : ''}<span>${title}</span></div>
        <div class="mip-modal-close-btn" id="mg-close">X</div>
        </div>
        <div class="${isConfirm ? 'mip-confirm-body' : 'mip-modal-body'}">${bodyHtml}</div>
        <div class="mip-modal-footer">
        <button class="mip-btn" id="mg-ok" style="font-weight:bold">${isConfirm ? 'Да' : 'OK'}</button>
        <button class="mip-btn" id="mg-cancel">${isConfirm ? 'Нет' : 'Cancel'}</button>
        </div>
        </div>`;
        document.body.appendChild(overlay);

        // ИНИЦИАЛИЗАЦИЯ ИНТЕРАКТИВНЫХ ТАБОВ ВНУТРИ ОКНА
        const winTabs = overlay.querySelectorAll("[data-win-tab]");
        if (winTabs.length > 0) {
            winTabs.forEach(tab => {
                tab.onclick = (e) => {
                    e.stopPropagation();
                    winTabs.forEach(t => {
                        t.classList.remove("active");
                        t.style.borderColor = "transparent";
                    });
                    tab.classList.add("active");
                    tab.style.borderColor = "#99bbe8";

                    overlay.querySelectorAll(".win-tab-content").forEach(c => c.style.display = "none");
                    const targetContent = overlay.querySelector(`#w-tab-${tab.dataset.winTab}`);
                    if (targetContent) targetContent.style.display = "block";
                };
            });
        }

        const close = () => overlay.remove();
        document.getElementById("mg-close").onclick = document.getElementById("mg-cancel").onclick = close;
        document.getElementById("mg-ok").onclick = async () => { if (await onOk() !== false) close(); };
    },

    esc: str => str ? str.replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m])) : '—'
};
