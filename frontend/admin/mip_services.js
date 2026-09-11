/**
 * Контроллер управления MIP-панелью сервисов (SHUB Core)
 * СТАБИЛИЗИРОВАН: Исправлены опечатки парсинга и сортировки строк
 */
const mip_services = {
    async init() {
        const tbody = document.getElementById("mip-services-tbody");
        if (!tbody) return;

        try {
            tbody.innerHTML = `<tr><td colspan="3" style="padding:10px; color:#666">Загрузка списка сервисов...</td></tr>`;
            const services = await (await fetch("/api/mip-s/services")).json();

            mip_services.currentSort = { field: null, asc: true };

            const renderRows = (dataList) => {
                tbody.innerHTML = dataList.map(s => `
                <tr class="mip-row" data-id="${s.id}" data-name="${mip_services.esc(s.name)}" data-desc="${mip_services.esc(s.description)}" data-port-id="${s.port_id || ''}">
                <td style="display:flex; align-items:center; gap:8px; border:none; padding:3px 6px;">
                <span class="icon icon-doc-gear" style="width:16px; height:16px; background-size:900% 500%!important; margin:0; flex-shrink:0;"></span>
                <span style="font-weight:bold; color:#15428b;">${mip_services.esc(s.name)}</span>
                </td>
                <td style="color:#222; font-family:monospace; font-weight:bold;">${mip_services.esc(s.port_name || '—')}</td>
                <td>${mip_services.esc(s.description)}</td>
                </tr>`).join('');
            };
            renderRows(services);

            // КЛИЕНТСКАЯ СОРТИРОВКА КОЛОНОК
            const sortRow = document.getElementById("mip-services-th-sort-row");
            if (sortRow) {
                sortRow.onclick = (e) => {
                    const th = e.target.closest("th[data-sort]");
                    if (!th) return;

                    const sortField = th.dataset.sort;
                    mip_services.currentSort.asc = mip_services.currentSort.field === sortField ? !mip_services.currentSort.asc : true;
                    mip_services.currentSort.field = sortField;

                    document.querySelectorAll("#mip-services-th-sort-row .sort-arrow").forEach(s => s.innerText = "");
                    const arrowSpan = th.querySelector(".sort-arrow");
                    if (arrowSpan) arrowSpan.innerText = mip_services.currentSort.asc ? " ▲" : " ▼";

                    services.sort((a, b) => {
                        const valA = (sortField === "name" ? a.name : sortField === "port" ? a.port_name : a.description) || "";
                        const valB = (sortField === "name" ? b.name : sortField === "port" ? b.port_name : b.description) || "";

                        return mip_services.currentSort.asc
                        ? valA.localeCompare(valB, undefined, { numeric: true, sensitivity: 'base' })
                        : valB.localeCompare(valA, undefined, { numeric: true, sensitivity: 'base' });
                    });
                    renderRows(services);
                };
            }

            // ОБРАБОТЧИК КЛИКОВ (ЛКМ, ПКМ, ДВУКЛИК)
            tbody.onmousedown = (e) => {
                const row = e.target.closest(".mip-row");
                if (!row) return;

                tbody.querySelectorAll(".mip-row").forEach(r => r.classList.remove("selected"));
                row.classList.add("selected");

                if (e.button === 2) { // ПКМ
                    e.preventDefault();
                    mip_services.closeMenu();

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
                        if (item) mip_services.cmd(item.dataset.act, row);
                    };
                }
            };

            tbody.ondblclick = (e) => mip_services.cmd("edit", e.target.closest(".mip-row"));
            tbody.oncontextmenu = (e) => e.preventDefault();
            document.onclick = (e) => e.target.closest("#mip-active-menu") || mip_services.closeMenu();

            // КНОПКИ ПОДВАЛА
            const actionGroup = document.getElementById("mip-services-actions");
            if (actionGroup) {
                actionGroup.onclick = (e) => {
                    const btn = e.target.closest("[data-act]");
                    if (btn) mip_services.cmd(btn.dataset.act, tbody.querySelector(".mip-row.selected"));
                };
            }

        } catch (err) {
            tbody.innerHTML = `<tr><td colspan="3" style="color:red; padding:10px">Ошибка загрузки: ${err.message}</td></tr>`;
        }
    },

    closeMenu: () => document.getElementById("mip-active-menu")?.remove(),

    async cmd(act, row) {
        mip_services.closeMenu();
        if (act !== "add" && !row) return alert("Пожалуйста, выберите сервис из списка.");

        // Подгружаем список доступных портированных скриптов для комбобокса
        let portsOptionsHtml = "";
        try {
            const ports = await (await fetch("/api/mip-p/ports")).json();
            const currentPortId = row ? row.dataset.portId : "";
            portsOptionsHtml = ports.map(p => `
            <option value="${p.id}" ${parseInt(currentPortId) === p.id ? 'selected' : ''}>
            ${mip_services.esc(p.name)} [ ${mip_services.esc(p.interpreter)} ]
            </option>`).join('');
        } catch (e) { console.error("Ошибка загрузки портов для комбобокса:", e); }

        if (act === "add") {
            mip_services.win("Add Service Package", mip_services_components.renderServiceWindowForm("", "", portsOptionsHtml), async () => {
                const name = document.getElementById("ms-name").value.trim();
                const description = document.getElementById("ms-desc").value.trim();
                const pIdVal = document.getElementById("ms-port-id").value;

                if (!name) { alert("Service name is required!"); return false; }

                const res = await (await fetch("/api/mip-s/services/add", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        name,
                        description,
                        port_id: pIdVal ? parseInt(pIdVal) : null
                    })
                })).json();

                if (res.success) { mip_services.init(); return true; }
                alert("Ошибка: " + res.message); return false;
            }, false, "500px");
        }
        else if (act === "edit") {
            const svcId = parseInt(row.dataset.id);

            mip_services.win("Edit Service Package", mip_services_components.renderServiceWindowForm(row.dataset.name, row.dataset.desc, portsOptionsHtml), async () => {
                const name = document.getElementById("ms-name").value.trim();
                const description = document.getElementById("ms-desc").value.trim();
                const pIdVal = document.getElementById("ms-port-id").value;

                if (!name) { alert("Service name is required!"); return false; }

                const res = await (await fetch("/api/mip-s/services/add", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        name,
                        description,
                        port_id: pIdVal ? parseInt(pIdVal) : null
                    })
                })).json();

                if (res.success) { mip_services.init(); return true; }
                alert("Ошибка сохранения: " + res.message); return false;
            }, false, "500px");
        }
        else if (act === "remove") {
            const svcId = parseInt(row.dataset.id);
            const svcName = row.dataset.name;

            mip_services.win("Confirmation", mip_services_components.renderConfirmDelete(svcName), async () => {
                const res = await (await fetch("/api/mip-s/services/remove", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ id: svcId })
                })).json();

                if (res.success) { mip_services.init(); return true; }
                alert("Ошибка: " + res.message); return false;
            }, true);
        }
    },

    win(title, bodyHtml, onOk, isConfirm = false, customWidth = "330px") {
        const winId = isConfirm ? "mip-service-nested-overlay" : "mip-service-win-overlay";
        const cls = isConfirm ? "mip-confirm-window" : "mip-modal-window";
        if (document.getElementById(winId)) return;

        const overlay = document.createElement("div");
        Object.assign(overlay, { id: winId, className: "mip-modal-overlay" });
        if (isConfirm) overlay.style.zIndex = "2200";

        overlay.innerHTML = `
        <div class="${cls}" style="width: ${customWidth}">
        <div class="mip-modal-header">
        <div class="mip-modal-title">${!isConfirm ? '<span class="icon icon-doc-gear" style="width:14px;height:14px;background-size:900% 500%"></span>' : ''}<span>${title}</span></div>
        <div class="mip-modal-close-btn" id="ms-close-${winId}">X</div>
        </div>
        <div class="${isConfirm ? 'mip-confirm-body' : 'mip-modal-body'}">${bodyHtml}</div>
        <div class="mip-modal-footer">
        <button class="mip-btn" id="ms-ok-${winId}" style="font-weight:bold">OK</button>
        <button class="mip-btn" id="ms-cancel-${winId}">Cancel</button>
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
        document.getElementById(`ms-close-${winId}`).onclick = document.getElementById(`ms-cancel-${winId}`).onclick = close;
        document.getElementById(`ms-ok-${winId}`).onclick = async () => { if (await onOk() !== false) close(); };
    },

    esc: str => str ? str.replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m])) : '—'
};
