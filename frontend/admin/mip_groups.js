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

            // ОБРАБОТЧИК КЛИКОВ (ЛКМ, ПКМ, ДВУКЛИК)
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

    async cmd(act, row) {
        this.closeMenu();
        if (act !== "add" && !row) return alert("Пожалуйста, выберите группу в таблице.");

        if (act === "add") {
            mip_groups_handlers.win("Создание группы", mip_groups_components.renderAddForm(), async () => {
                const name = document.getElementById("mg-name").value.trim();
                if (!name) return alert("Имя группы обязательно!");
                alert(`Добавить группу: "${name}"`); return true;
            });
        }
        else if (act === "edit") {
            const groupId = row.dataset.id;

            mip_groups_handlers.win("Edit Group", mip_groups_components.renderEditForm(row.dataset.name, row.dataset.desc), async () => {
                const desc = document.getElementById("mg-desc").value.trim();
                alert(`Сохранение изменений группы "${row.dataset.name}". Описание: "${desc}"`);
                return true;
            }, false, "640px");

            mip_groups_handlers.loadMembers(groupId);

            // КНОПКА ДОБАВЛЕНИЯ УЧАСТНИКА
            document.getElementById("w-btn-add-member").onclick = async () => {
                try {
                    const allUsers = await (await fetch("/api/mip/users")).json();
                    const optionsHtml = allUsers.map(u => `<option value="${this.esc(u.username)}">${this.esc(u.username)} (${this.esc(u.full_name)})</option>`).join('');

                    mip_groups_handlers.win("Select User", mip_groups_components.renderSelectUserForm(optionsHtml), async () => {
                        const selectedUsername = document.getElementById("w-select-user-dropdown").value;
                        if (!selectedUsername) return true;

                        const res = await (await fetch("/api/mip-g/groups/members/add", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ group_id: parseInt(groupId), username: selectedUsername })
                        })).json();

                        if (res.success) { mip_groups_handlers.loadMembers(groupId); return true; }
                        alert("Ошибка: " + res.message); return false;
                    }, true, "320px");
                } catch (e) { console.error(e); }
            };

            // КНОПКА УДАНЕНИЯ УЧАСТНИКА
            document.getElementById("w-btn-remove-member").onclick = async () => {
                const selectedRow = document.querySelector("#w-members-tbody .mip-row.selected-member");
                if (!selectedRow) return alert("Пожалуйста, выберите пользователя в списке участников для удаления!");

                const memberUsername = selectedRow.dataset.username;
                if (confirm(`Вы уверены, что хотите удалить пользователя "${memberUsername}" из этой группы?`)) {
                    const res = await (await fetch("/api/mip-g/groups/members/remove", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ group_id: parseInt(groupId), username: memberUsername })
                    })).json();

                    res.success ? mip_groups_handlers.loadMembers(groupId) : alert("Ошибка: " + res.message);
                }
            };
        }
        else if (act === "remove") {
            mip_groups_handlers.win("Подтверждение", mip_groups_components.renderConfirmDelete(row.dataset.name), async () => {
                alert(`Удалить группу ID ${row.dataset.id}`); return true;
            }, true);
        }
    },

    esc: str => str ? str.replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m])) : '—'
};
