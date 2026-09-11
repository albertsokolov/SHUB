/**
 * Контроллер управления MIP-панелью планировщика времени (SHUB Core)
 */
const mip_time = {
    async init() {
        const tbody = document.getElementById("mip-time-tbody");
        if (!tbody) return;

        try {
            tbody.innerHTML = `<tr><td colspan="3" style="padding:10px; color:#666">Loading schedules...</td></tr>`;
            const tasks = await (await fetch("/api/mip-t/time-tasks")).json();

            mip_time.currentSort = { field: null, asc: true };

            const renderRows = (dataList) => {
                tbody.innerHTML = dataList.map(t => `
                <tr class="mip-row" data-id="${t.id}" data-name="${mip_time.esc(t.name)}" data-cron="${mip_time.esc(t.cron_expression)}" data-desc="${mip_time.esc(t.description)}">
                <td style="display:flex; align-items:center; gap:8px; border:none; padding:3px 6px;">
                <span class="icon icon-doc-warn" style="width:16px; height:16px; background-size:900% 500%!important; margin:0; flex-shrink:0;"></span>
                <span style="font-weight:bold; color:#15428b;">${mip_time.esc(t.name)}</span>
                </td>
                <td style="font-family:monospace;">${mip_time.esc(t.cron_expression)}</td>
                <td>${mip_time.esc(t.description)}</td>
                </tr>`).join('');
            };
            renderRows(tasks);

            // КЛИЕНТСКАЯ СОРТИРОВКА
            const sortRow = document.getElementById("mip-time-th-sort-row");
            if (sortRow) {
                sortRow.onclick = (e) => {
                    const th = e.target.closest("th[data-sort]");
                    if (!th) return;
                    const sortField = th.dataset.sort;
                    mip_time.currentSort.asc = mip_time.currentSort.field === sortField ? !mip_time.currentSort.asc : true;
                    mip_time.currentSort.field = sortField;

                    document.querySelectorAll("#mip-time-th-sort-row .sort-arrow").forEach(s => s.innerText = "");
                    const arrowSpan = th.querySelector(".sort-arrow");
                    if (arrowSpan) arrowSpan.innerText = mip_time.currentSort.asc ? " ▲" : " ▼";

                    tasks.sort((a, b) => {
                        const valA = (sortField === "name" ? a.name : sortField === "cron" ? a.cron_expression : a.description) || "";
                        const valB = (sortField === "name" ? b.name : sortField === "cron" ? b.cron_expression : b.description) || "";
                        return mip_time.currentSort.asc ? valA.localeCompare(valB, undefined, {numeric:true}) : valB.localeCompare(valA, undefined, {numeric:true});
                    });
                    renderRows(tasks);
                };
            }

            // МЫШЬ (ПКМ, ЛКМ, ДВУКЛИК)
            tbody.onmousedown = (e) => {
                const row = e.target.closest(".mip-row");
                if (!row) return;
                tbody.querySelectorAll(".mip-row").forEach(r => r.classList.remove("selected"));
                row.classList.add("selected");

                if (e.button === 2) {
                    e.preventDefault(); mip_time.closeMenu();
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
                        if (item) mip_time.cmd(item.dataset.act, row);
                    };
                }
            };
            tbody.ondblclick = (e) => mip_time.cmd("edit", e.target.closest(".mip-row"));
            tbody.oncontextmenu = (e) => e.preventDefault();
            document.onclick = (e) => e.target.closest("#mip-active-menu") || mip_time.closeMenu();

            const actionGroup = document.getElementById("mip-time-actions");
            if (actionGroup) {
                actionGroup.onclick = (e) => {
                    const btn = e.target.closest("[data-act]");
                    if (btn) mip_time.cmd(btn.dataset.act, tbody.querySelector(".mip-row.selected"));
                };
            }
        } catch (err) { tbody.innerHTML = `<tr><td colspan="3" style="color:red; padding:10px">Error: ${err.message}</td></tr>`; }
    },

    closeMenu: () => document.getElementById("mip-active-menu")?.remove(),

    async cmd(act, row) {
        mip_time.closeMenu();
        if (act !== "add" && !row) return alert("Пожалуйста, выберите запись в таблице.");

        if (act === "add") {
            mip_time.win("Add Time Schedule", mip_time_components.renderTimeWindowForm("", "", ""), async () => {
                const name = document.getElementById("mt-name").value.trim();
                const cron_expression = document.getElementById("mt-cron").value.trim();
                const description = document.getElementById("mt-desc").value.trim();
                if (!name || !cron_expression) { alert("Name and Cron specs are required!"); return false; }

                const res = await (await fetch("/api/mip-t/time-tasks/add", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ name, cron_expression, description })
                })).json();
                if (res.success) { mip_time.init(); return true; }
                alert("Error: " + res.message); return false;
            }, false, "500px");
        }
        else if (act === "edit") {
            mip_time.win("Edit Time Schedule", mip_time_components.renderTimeWindowForm(row.dataset.name, row.dataset.cron, row.dataset.desc), async () => {
                const name = document.getElementById("mt-name").value.trim();
                const cron_expression = document.getElementById("mt-cron").value.trim();
                const description = document.getElementById("mt-desc").value.trim();
                if (!name || !cron_expression) { alert("Fields cannot be empty!"); return false; }

                const res = await (await fetch("/api/mip-t/time-tasks/add", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ name, cron_expression, description })
                })).json();
                if (res.success) { mip_time.init(); return true; }
                alert("Error saving: " + res.message); return false;
            }, false, "500px");
        }
        else if (act === "remove") {
            mip_time.win("Confirmation", mip_time_components.renderConfirmDelete(row.dataset.name), async () => {
                const res = await (await fetch("/api/mip-t/time-tasks/remove", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ id: parseInt(row.dataset.id) })
                })).json();
                if (res.success) { mip_time.init(); return true; }
                alert("Error: " + res.message); return false;
            }, true);
        }
    },

    win(title, bodyHtml, onOk, isConfirm = false, customWidth = "330px") {
        const winId = isConfirm ? "mip-time-nested-overlay" : "mip-time-win-overlay";
        const cls = isConfirm ? "mip-confirm-window" : "mip-modal-window";
        if (document.getElementById(winId)) return;

        const overlay = document.createElement("div");
        Object.assign(overlay, { id: winId, className: "mip-modal-overlay" });
        if (isConfirm) overlay.style.zIndex = "2200";

        overlay.innerHTML = `
        <div class="${cls}" style="width: ${customWidth}">
        <div class="mip-modal-header">
        <div class="mip-modal-title">${!isConfirm ? '<span class="icon icon-doc-warn" style="width:14px;height:14px;background-size:900% 500%"></span>' : ''}<span>${title}</span></div>
        <div class="mip-modal-close-btn" id="mt-close-${winId}">X</div>
        </div>
        <div class="${isConfirm ? 'mip-confirm-body' : 'mip-modal-body'}">${bodyHtml}</div>
        <div class="mip-modal-footer">
        <button class="mip-btn" id="mt-ok-${winId}" style="font-weight:bold">OK</button>
        <button class="mip-btn" id="mt-cancel-${winId}">Cancel</button>
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
        document.getElementById(`mt-close-${winId}`).onclick = document.getElementById(`mt-cancel-${winId}`).onclick = close;
        document.getElementById(`mt-ok-${winId}`).onclick = async () => { if (await onOk() !== false) close(); };
    },

    esc: str => str ? str.replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m])) : '—'
};
