/**
 * Инициализатор и диспетчер событий для MIP-панели групп (SHUB Core)
 * ИСПРАВЛЕН: Вызовы win переведены на собственный локальный метод объекта
 */
const mip_groups = {
    async init() {
        const tbody = document.getElementById("mip-groups-tbody");
        if (!tbody) return;

        try {
            tbody.innerHTML = `<tr><td colspan="3" style="padding:10px; color:#666">Загрузка списка групп...</td></tr>`;
            const groups = await (await fetch("/api/groups")).json();

            const countEl = document.getElementById("mip-group-count");
            if (countEl) countEl.innerText = groups.length;

            mip_groups.currentSort = { field: null, asc: true };

            const renderRows = (dataList) => {
                tbody.innerHTML = dataList.map(g => `
                <tr class="mip-row" data-id="${g.id}" data-name="${mip_groups.esc(g.name)}" data-desc="${mip_groups.esc(g.description)}">
                <td>${g.id}</td>
                <td style="display:flex;align-items:center;gap:6px">
                <span class="icon icon-groups" style="width:16px;height:16px;background-size:900% 500%!important;margin:0;flex-shrink:0"></span>
                <span>${mip_groups.esc(g.name)}</span>
                </td>
                <td>${mip_groups.esc(g.description)}</td>
                </tr>`).join('');
            };
            renderRows(groups);

            const sortRow = document.getElementById("mip-group-th-sort-row");
            if (sortRow) {
                sortRow.onclick = (e) => {
                    const th = e.target.closest("th[data-sort]");
                    if (!th) return;
                    const sortField = th.dataset.sort;
                    mip_groups.currentSort.asc = mip_groups.currentSort.field === sortField ? !mip_groups.currentSort.asc : true;
                    mip_groups.currentSort.field = sortField;

                    document.querySelectorAll("#mip-group-th-sort-row .sort-arrow").forEach(s => s.innerText = "");
                    const arrowSpan = th.querySelector(".sort-arrow");
                    if (arrowSpan) arrowSpan.innerText = mip_groups.currentSort.asc ? " ▲" : " ▼";

                    groups.sort((a, b) => {
                        if (sortField === "id") return mip_groups.currentSort.asc ? a.id - b.id : b.id - a.id;
                        const valA = a[sortField === "name" ? "name" : "description"] || "";
                        const valB = b[sortField === "name" ? "name" : "description"] || "";
                        return mip_groups.currentSort.asc ? valA.localeCompare(valB) : valB.localeCompare(valA);
                    });
                    renderRows(groups); applyFilters();
                };
            }

            const filterInput = document.getElementById("mip-group-filter");
            const applyFilters = () => {
                if (!filterInput) return;
                const query = filterInput.value.toLowerCase().trim();
                let visibleCount = 0;
                tbody.querySelectorAll(".mip-row").forEach(row => {
                    const matches = row.dataset.name.toLowerCase().includes(query) || row.dataset.desc.toLowerCase().includes(query);
                    row.style.display = matches ? "" : "none";
                    if (matches) visibleCount++;
                });
                    const cnt = document.getElementById("mip-group-count");
                    if (cnt) cnt.innerText = visibleCount;
            };
                if (filterInput) filterInput.oninput = applyFilters;

                tbody.onmousedown = (e) => {
                    const row = e.target.closest(".mip-row");
                    if (!row) return;
                    mip_groups.sel(tbody, row);

                    if (e.button === 2) {
                        e.preventDefault(); mip_groups.closeMenu();
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
                            if (item) mip_groups.cmd(item.dataset.act, row);
                        };
                    }
                };

                tbody.ondblclick = (e) => mip_groups.cmd("edit", e.target.closest(".mip-row"));
                tbody.oncontextmenu = (e) => e.preventDefault();
                document.onclick = (e) => e.target.closest("#mip-active-menu") || mip_groups.closeMenu();

                const actionGroup = document.getElementById("mip-group-actions");
                if (actionGroup) {
                    actionGroup.onclick = (e) => {
                        const btn = e.target.closest("[data-act]");
                        if (btn) mip_groups.cmd(btn.dataset.act, tbody.querySelector(".mip-row.selected"));
                    };
                }
        } catch (err) {
            tbody.innerHTML = `<tr><td colspan="3" style="color:red;padding:10px">Ошибка init(): ${err.message}</td></tr>`;
        }
    },

    sel: (tbody, row) => {
        if (!tbody || !row) return;
        tbody.querySelectorAll(".mip-row").forEach(r => r.classList.remove("selected"));
        row.classList.add("selected");
    },

    closeMenu: () => document.getElementById("mip-active-menu")?.remove(),

    async cmd(act, row) {
        mip_groups.closeMenu();
        if (act !== "add" && !row) return alert("Пожалуйста, выберите группу в таблице.");

        if (act === "add") {
            // ИСПРАВЛЕНО: Заменен вызов с внешнего хэндлера на локальный метод mip_groups.win
            mip_groups.win("Создание группы", mip_groups_components.renderAddForm(), async () => {
                const name = document.getElementById("mg-name").value.trim();
                const description = document.getElementById("mg-desc").value.trim();
                if (!name) { alert("Имя группы обязательно!"); return false; }

                const res = await (await fetch("/api/mip-g/groups/add", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ name, description })
                })).json();

                if (res.success) {
                    mip_groups.init();
                    return true;
                } else {
                    alert("Ошибка: " + res.message);
                    return false;
                }
            });
        }
        else if (act === "edit") {
            const groupId = row.dataset.id;

            // ИСПРАВЛЕНО: Заменен вызов на локальный метод mip_groups.win
            mip_groups.win("Edit Group", mip_groups_components.renderEditForm(row.dataset.name, row.dataset.desc), async () => {
                const permRows = document.querySelectorAll("#w-rights-tbody .mip-row-perm");
                const permissionsData = [];
                permRows.forEach(r => {
                    permissionsData.push({
                        module_id: parseInt(r.dataset.moduleId),
                                         can_read: r.querySelector(".chk-read").checked,
                                         can_write: r.querySelector(".chk-write").checked
                    });
                });
                try {
                    const res = await (await fetch("/api/mip-g/groups/rights/save", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ group_id: parseInt(groupId), permissions: permissionsData })
                    })).json();
                    if (!res.success) { alert("Ошибка保存 прав: " + res.message); return false; }
                } catch (e) { console.error(e); return false; }

                alert("Изменения успешно сохранены!");
                return true;
            }, false, "640px");

            mip_groups_api.loadMembers(groupId);
            mip_groups_api.loadRights(groupId);

            const btnAddMem = document.getElementById("w-btn-add-member");
            if (btnAddMem) {
                btnAddMem.onclick = async () => {
                    try {
                        const allUsers = await (await fetch("/api/users")).json();
                        const optionsHtml = allUsers.map(u => `<option value="${mip_groups.esc(u.username)}">${mip_groups.esc(u.username)} (${mip_groups.esc(u.full_name)})</option>`).join('');
                        // ИСПРАВЛЕНО: Вложенное окно тоже переведено на локальный win
                        mip_groups.win("Select User", mip_groups_components.renderSelectUserForm(optionsHtml), async () => {
                            const selectedUsername = document.getElementById("w-select-user-dropdown").value;
                            if (!selectedUsername) return true;

                            const res = await (await fetch("/api/mip-g/groups/members/add", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ group_id: parseInt(groupId), username: selectedUsername })
                            })).json();
                            if (res.success) { mip_groups_api.loadMembers(groupId); return true; }
                            alert("Ошибка привязки: " + res.message); return false;
                        }, true, "320px");
                    } catch (e) { console.error(e); }
                };
            }

            const btnRemMem = document.getElementById("w-btn-remove-member");
            if (btnRemMem) {
                btnRemMem.onclick = async () => {
                    const selectedRow = document.querySelector("#w-members-tbody .mip-row.selected-member");
                    if (!selectedRow) return alert("Пожалуйста, выберите пользователя!");

                    const memberUsername = selectedRow.dataset.username;
                    if (confirm(`Вы уверены, что хотите удалить пользователя "${memberUsername}" из группы?`)) {
                        const res = await (await fetch("/api/mip-g/groups/members/remove", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ group_id: parseInt(groupId), username: memberUsername })
                        })).json();
                        res.success ? mip_groups_api.loadMembers(groupId) : alert("Ошибка отвязки: " + res.message);
                    }
                };
            }
        }
        else if (act === "remove") {
            const groupId = parseInt(row.dataset.id);
            const groupName = row.dataset.name;

            // ОЖИВЛЕНО: Окно подтверждения переведено на локальный win
            mip_groups.win("Подтверждение", mip_groups_components.renderConfirmDelete(groupName), async () => {
                const res = await (await fetch("/api/mip-g/groups/remove", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ id: groupId })
                })).json();

                if (res.success) {
                    mip_groups.init();
                    return true;
                } else {
                    alert("Ошибка удаления: " + res.message);
                    return false;
                }
            }, true);
        }
    },

    win(title, bodyHtml, onOk, isConfirm = false, customWidth = "330px") {
        const winId = isConfirm ? "mip-group-nested-overlay" : "mip-group-win-overlay";
        const cls = isConfirm ? "mip-confirm-window" : "mip-modal-window";
        if (document.getElementById(winId)) return;

        const overlay = document.createElement("div");
        Object.assign(overlay, { id: winId, className: "mip-modal-overlay" });
        if (isConfirm) overlay.style.zIndex = "2100";

        overlay.innerHTML = `
        <div class="${cls}" style="width: ${customWidth}">
        <div class="mip-modal-header">
        <div class="mip-modal-title">${!isConfirm ? '<span class="icon icon-groups" style="width:14px;height:14px;background-size:900% 500%"></span>' : ''}<span>${title}</span></div>
        <div class="mip-modal-close-btn" id="mg-close-${winId}">X</div>
        </div>
        <div class="${isConfirm ? 'mip-confirm-body' : 'mip-modal-body'}">${bodyHtml}</div>
        <div class="mip-modal-footer">
        <button class="mip-btn" id="mg-ok-${winId}" style="font-weight:bold">OK</button>
        <button class="mip-btn" id="mg-cancel-${winId}">Cancel</button>
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
        document.getElementById(`mg-close-${winId}`).onclick = document.getElementById(`mg-cancel-${winId}`).onclick = close;
        document.getElementById(`mg-ok-${winId}`).onclick = async () => { if (await onOk() !== false) close(); };
    },

    esc: str => str ? str.replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m])) : '—'
};
