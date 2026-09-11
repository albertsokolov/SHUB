/**
 * Контроллер управления MIP-панелью модулей (SHUB Core)
 * ОЖИВЛЕНО: Добавлены вкладки x-tab-strip, контекстное меню ПКМ и двойной клик по строкам
 */
const mip_modules = {
    async init() {
        const tbody = document.getElementById("mip-modules-tbody");
        if (!tbody) return;

        try {
            tbody.innerHTML = `<tr><td colspan="2" style="padding:10px; color:#666">Loading software modules...</td></tr>`;
            const modules = await (await fetch("/api/mip-m/modules")).json();

            mip_modules.currentSort = { field: null, asc: true };

            const renderRows = (dataList) => {
                tbody.innerHTML = dataList.map(m => `
                <tr class="mip-row" data-id="${m.id}" data-name="${mip_modules.esc(m.name)}" data-desc="${mip_modules.esc(m.description)}">
                <td style="display:flex; align-items:center; gap:8px; border:none; padding:3px 6px;">
                <span class="icon icon-cloud-cfg" style="width:16px; height:16px; background-size:900% 500%!important; margin:0; flex-shrink:0;"></span>
                <span style="font-weight: ${m.is_system ? 'bold' : 'normal'}">${mip_modules.esc(m.name)} ${m.is_system ? '<span style="color:#15428b; font-weight:normal; font-size:10px; margin-left:4px;">(system)</span>' : ''}</span>
                </td>
                <td>${mip_modules.esc(m.description)}</td>
                </tr>`).join('');
            };
            renderRows(modules);

            // КЛИЕНТСКАЯ СОРТИРОВКА КОЛОНОК
            const sortRow = document.getElementById("mip-module-th-sort-row");
            if (sortRow) {
                sortRow.onclick = (e) => {
                    const th = e.target.closest("th[data-sort]");
                    if (!th) return;

                    const sortField = th.dataset.sort;
                    if (mip_modules.currentSort.field === sortField) {
                        mip_modules.currentSort.asc = !mip_modules.currentSort.asc;
                    } else {
                        mip_modules.currentSort.field = sortField;
                        mip_modules.currentSort.asc = true;
                    }

                    document.querySelectorAll("#mip-module-th-sort-row .sort-arrow").forEach(s => s.innerText = "");
                    const arrowSpan = th.querySelector(".sort-arrow");
                    if (arrowSpan) arrowSpan.innerText = mip_modules.currentSort.asc ? " ▲" : " ▼";

                    modules.sort((a, b) => {
                        const valA = (sortField === "name" ? a.name : a.description) || "";
                        const valB = (sortField === "name" ? b.name : b.description) || "";

                        return mip_modules.currentSort.asc
                        ? valA.localeCompare(valB, undefined, { numeric: true, sensitivity: 'base' })
                        : valB.localeCompare(valA, undefined, { numeric: true, sensitivity: 'base' });
                    });
                    renderRows(modules);
                };
            }

            // ОБРАБОТЧИК КЛИКОВ (ЛКМ, ПКМ, ДВУКЛИК)
            tbody.onmousedown = (e) => {
                const row = e.target.closest(".mip-row");
                if (!row) return;

                tbody.querySelectorAll(".mip-row").forEach(r => r.classList.remove("selected"));
                row.classList.add("selected");

                if (e.button === 2) { // Клик правой кнопкой мыши (ПКМ)
                    e.preventDefault();
                    mip_modules.closeMenu();

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
                        if (item) mip_modules.cmd(item.dataset.act, row);
                    };
                }
            };

            tbody.ondblclick = (e) => mip_modules.cmd("edit", e.target.closest(".mip-row"));
            tbody.oncontextmenu = (e) => e.preventDefault();
            document.onclick = (e) => e.target.closest("#mip-active-menu") || mip_modules.closeMenu();

            // КНОПКИ ПОДВАЛА
            const actionGroup = document.getElementById("mip-module-actions");
            if (actionGroup) {
                actionGroup.onclick = (e) => {
                    const btn = e.target.closest("[data-act]");
                    if (btn) mip_modules.cmd(btn.dataset.act, tbody.querySelector(".mip-row.selected"));
                };
            }

        } catch (err) {
            tbody.innerHTML = `<tr><td colspan="2" style="color:red; padding:10px">Error loading modules: ${err.message}</td></tr>`;
        }
    },

    closeMenu: () => document.getElementById("mip-active-menu")?.remove(),

    async cmd(act, row) {
        mip_modules.closeMenu();
        if (act !== "add" && !row) return alert("Please select a module from the list first.");

        if (act === "add") {
            mip_modules.win("Add Module / Plug-in", mip_modules_components.renderModuleWindowForm("", ""), async () => {
                const name = document.getElementById("mm-name").value.trim();
                const description = document.getElementById("mm-desc").value.trim();
                if (!name) { alert("Module name is required!"); return false; }

                const res = await (await fetch("/api/mip-m/modules/add", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ name, description })
                })).json();

                if (res.success) { mip_modules.init(); return true; }
                alert("Error: " + res.message); return false;
            }, false, "500px");
        }
        else if (act === "edit") {
            const moduleId = parseInt(row.dataset.id);

            mip_modules.win("Edit Module Configuration", mip_modules_components.renderModuleWindowForm(row.dataset.name, row.dataset.desc), async () => {
                const name = document.getElementById("mm-name").value.trim();
                const description = document.getElementById("mm-desc").value.trim();
                if (!name) { alert("Module name is required!"); return false; }

                const res = await (await fetch("/api/mip-m/modules/add", { // Эндпоинт адаптирован под INSERT OR REPLACE
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ name, description })
                })).json();

                if (res.success) { mip_modules.init(); return true; }
                alert("Error saving: " + res.message); return false;
            }, false, "500px");
        }
        else if (act === "remove") {
            const moduleId = parseInt(row.dataset.id);
            const moduleName = row.dataset.name;

            mip_modules.win("Confirmation", mip_modules_components.renderConfirmDelete(moduleName), async () => {
                const res = await (await fetch("/api/mip-m/modules/remove", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ id: moduleId })
                })).json();

                if (res.success) { mip_modules.init(); return true; }
                alert("Error: " + res.message); return false;
            }, true);
        }
    },

    win(title, bodyHtml, onOk, isConfirm = false, customWidth = "330px") {
        const winId = isConfirm ? "mip-module-nested-overlay" : "mip-module-win-overlay";
        const cls = isConfirm ? "mip-confirm-window" : "mip-modal-window";
        if (document.getElementById(winId)) return;

        const overlay = document.createElement("div");
        Object.assign(overlay, { id: winId, className: "mip-modal-overlay" });
        if (isConfirm) overlay.style.zIndex = "2200";

        overlay.innerHTML = `
        <div class="${cls}" style="width: ${customWidth}">
        <div class="mip-modal-header">
        <div class="mip-modal-title">${!isConfirm ? '<span class="icon icon-cloud-cfg" style="width:14px;height:14px;background-size:900% 500%"></span>' : ''}<span>${title}</span></div>
        <div class="mip-modal-close-btn" id="mm-close-${winId}">X</div>
        </div>
        <div class="${isConfirm ? 'mip-confirm-body' : 'mip-modal-body'}">${bodyHtml}</div>
        <div class="mip-modal-footer">
        <button class="mip-btn" id="mm-ok-${winId}" style="font-weight:bold">OK</button>
        <button class="mip-btn" id="mm-cancel-${winId}">Cancel</button>
        </div>
        </div>`;
        document.body.appendChild(overlay);

        const winTabs = overlay.querySelectorAll("[data-win-tab]");
        if (winTabs.length > 0) {
            winTabs.forEach(tab => {
                tab.onclick = (e) => {
                    e.stopPropagation();
                    winTabs.forEach(t => { t.classList.remove("active"); t.style.borderColor = "transparent"; });
                    tab.classList.add("active"); tab.style.borderColor = "#99bbe8";
                    overlay.querySelectorAll(".win-tab-content").forEach(c => c.style.display = "none");
                    const targetContent = overlay.querySelector(`#w-tab-${tab.dataset.winTab}`);
                    if (targetContent) targetContent.style.display = "block";
                };
            });
        }

        const close = () => overlay.remove();
        document.getElementById(`mm-close-${winId}`).onclick = document.getElementById(`mm-cancel-${winId}`).onclick = close;
        document.getElementById(`mm-ok-${winId}`).onclick = async () => { if (await onOk() !== false) close(); };
    },

    esc: str => str ? str.replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m])) : '—'
};
