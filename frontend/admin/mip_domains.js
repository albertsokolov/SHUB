/**
 * Контроллер управления MIP-панелью доменов (SHUB Core)
 * ОЖИВЛЕНО: Добавлены вкладки x-tab-strip, контекстное меню ПКМ и двойной клик по строкам
 */
const mip_domains = {
    async init() {
        const tbody = document.getElementById("mip-domains-tbody");
        if (!tbody) return;

        try {
            tbody.innerHTML = `<tr><td colspan="2" style="padding:10px; color:#666">Loading domains...</td></tr>`;
            const domains = await (await fetch("/api/mip-d/domains")).json();

            const renderRows = (dataList) => {
                tbody.innerHTML = dataList.map(d => `
                <tr class="mip-row" data-id="${d.id}" data-name="${mip_domains.esc(d.name)}" data-desc="${mip_domains.esc(d.description)}" data-primary="${d.is_primary}">
                <td style="display:flex; align-items:center; gap:8px; border:none; padding:3px 6px;">
                <span class="icon icon-doc-webglobe" style="width:16px; height:16px; background-size:900% 500%!important; margin:0; flex-shrink:0;"></span>
                <span style="font-weight: ${d.is_primary ? 'bold' : 'normal'}">${mip_domains.esc(d.name)} ${d.is_primary ? '<span style="color:#666; font-weight:normal; font-style:italic; margin-left:4px;">(primary)</span>' : ''}</span>
                </td>
                <td>${mip_domains.esc(d.description)}</td>
                </tr>`).join('');
            };
            renderRows(domains);

            // ОБРАБОТЧИК КЛИКОВ (ЛКМ, ПКМ, ДВУКЛИК)
            tbody.onmousedown = (e) => {
                const row = e.target.closest(".mip-row");
                if (!row) return;

                tbody.querySelectorAll(".mip-row").forEach(r => r.classList.remove("selected"));
                row.classList.add("selected");

                if (e.button === 2) { // Клик правой кнопкой мыши (ПКМ)
                    e.preventDefault();
                    mip_domains.closeMenu();

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
                        if (item) mip_domains.cmd(item.dataset.act, row);
                    };
                }
            };

            tbody.ondblclick = (e) => mip_domains.cmd("edit", e.target.closest(".mip-row"));
            tbody.oncontextmenu = (e) => e.preventDefault();
            document.onclick = (e) => e.target.closest("#mip-active-menu") || mip_domains.closeMenu();

            // КНОПКИ ПОДВАЛА
            const actionGroup = document.getElementById("mip-domain-actions");
            if (actionGroup) {
                actionGroup.onclick = (e) => {
                    const btn = e.target.closest("[data-act]");
                    if (btn) mip_domains.cmd(btn.dataset.act, tbody.querySelector(".mip-row.selected"));
                };
            }

        } catch (err) {
            tbody.innerHTML = `<tr><td colspan="2" style="color:red; padding:10px">Error loading domains: ${err.message}</td></tr>`;
        }
    },

    closeMenu: () => document.getElementById("mip-active-menu")?.remove(),

    async cmd(act, row) {
        mip_domains.closeMenu();
        if (act !== "add" && !row) return alert("Please select a domain from the list first.");

        if (act === "add") {
            mip_domains.win("Add Domain", mip_domains_components.renderDomainWindowForm("", "", false), async () => {
                const name = document.getElementById("md-name").value.trim();
                const description = document.getElementById("md-desc").value.trim();
                if (!name) { alert("Domain name is required!"); return false; }

                const res = await (await fetch("/api/mip-d/domains/add", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ name, description })
                })).json();

                if (res.success) { mip_domains.init(); return true; }
                alert("Error: " + res.message); return false;
            }, false, "500px");
        }
        else if (act === "edit") {
            const isPrimary = row.dataset.primary === "true";

            mip_domains.win("Edit Domain Configuration", mip_domains_components.renderDomainWindowForm(row.dataset.name, row.dataset.desc, isPrimary), async () => {
                const name = document.getElementById("md-name").value.trim();
                const description = document.getElementById("md-desc").value.trim();
                if (!name) { alert("Domain name is required!"); return false; }

                const res = await (await fetch("/api/mip-d/domains/add", { // Эндпоинт адаптирован под INSERT OR REPLACE
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ name, description })
                })).json();

                if (res.success) { mip_domains.init(); return true; }
                alert("Error saving: " + res.message); return false;
            }, false, "500px");
        }
        else if (act === "remove") {
            const domainId = parseInt(row.dataset.id);
            const domainName = row.dataset.name;

            mip_domains.win("Confirmation", mip_domains_components.renderConfirmDelete(domainName), async () => {
                const res = await (await fetch("/api/mip-d/domains/remove", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ id: domainId })
                })).json();

                if (res.success) { mip_domains.init(); return true; }
                alert("Error: " + res.message); return false;
            }, true);
        }
    },

    win(title, bodyHtml, onOk, isConfirm = false, customWidth = "330px") {
        const winId = isConfirm ? "mip-domain-nested-overlay" : "mip-domain-win-overlay";
        const cls = isConfirm ? "mip-confirm-window" : "mip-modal-window";
        if (document.getElementById(winId)) return;

        const overlay = document.createElement("div");
        Object.assign(overlay, { id: winId, className: "mip-modal-overlay" });
        if (isConfirm) overlay.style.zIndex = "2200";

        overlay.innerHTML = `
        <div class="${cls}" style="width: ${customWidth}">
        <div class="mip-modal-header">
        <div class="mip-modal-title">${!isConfirm ? '<span class="icon icon-doc-globe" style="width:14px;height:14px;background-size:900% 500%"></span>' : ''}<span>${title}</span></div>
        <div class="mip-modal-close-btn" id="md-close-${winId}">X</div>
        </div>
        <div class="${isConfirm ? 'mip-confirm-body' : 'mip-modal-body'}">${bodyHtml}</div>
        <div class="mip-modal-footer">
        <button class="mip-btn" id="md-ok-${winId}" style="font-weight:bold">OK</button>
        <button class="mip-btn" id="md-cancel-${winId}">Cancel</button>
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
        document.getElementById(`md-close-${winId}`).onclick = document.getElementById(`md-cancel-${winId}`).onclick = close;
        document.getElementById(`md-ok-${winId}`).onclick = async () => { if (await onOk() !== false) close(); };
    },

    esc: str => str ? str.replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m])) : '—'
};
