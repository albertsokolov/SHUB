/**
 * Контроллер управления MIP-панелью модулей (SHUB Core)
 * ДОБАВЛЕНО: Полноценная клиентская сортировка колонок Name и Description
 */
const mip_modules = {
    async init() {
        const tbody = document.getElementById("mip-modules-tbody");
        if (!tbody) return;

        try {
            tbody.innerHTML = `<tr><td colspan="2" style="padding:10px; color:#666">Loading software modules...</td></tr>`;
            const modules = await (await fetch("/api/mip-m/modules")).json();

            // Фиксируем изначальное пустое состояние сортировки
            mip_modules.currentSort = { field: null, asc: true };

            const renderRows = (dataList) => {
                tbody.innerHTML = dataList.map(m => `
                <tr class="mip-row" data-id="${m.id}" data-name="${mip_modules.esc(m.name)}">
                <td style="display:flex; align-items:center; gap:8px; border:none; padding:3px 6px;">
                <span class="icon icon-cloud-cfg" style="width:16px; height:16px; background-size:900% 500%!important; margin:0; flex-shrink:0;"></span>
                <span style="font-weight: ${m.is_system ? 'bold' : 'normal'}">${mip_modules.esc(m.name)} ${m.is_system ? '<span style="color:#15428b; font-weight:normal; font-size:10px; margin-left:4px;">(system)</span>' : ''}</span>
                </td>
                <td>${mip_modules.esc(m.description)}</td>
                </tr>`).join('');
            };

            // Первичный вывод данных с сервера
            renderRows(modules);

            // ЛОГИКА СОРТИРОВКИ ПО КЛИКУ НА ЗАГОЛОВКИ ПОЛЕЙ
            const sortRow = document.getElementById("mip-module-th-sort-row");
            if (sortRow) {
                sortRow.onclick = (e) => {
                    const th = e.target.closest("th[data-sort]");
                    if (!th) return;

                    const sortField = th.dataset.sort;

                    // Переключаем направление (asc / desc)
                    if (mip_modules.currentSort.field === sortField) {
                        mip_modules.currentSort.asc = !mip_modules.currentSort.asc;
                    } else {
                        mip_modules.currentSort.field = sortField;
                        mip_modules.currentSort.asc = true;
                    }

                    // Очищаем стрелочки у всех колонок шапки модуля
                    document.querySelectorAll("#mip-module-th-sort-row .sort-arrow").forEach(s => s.innerText = "");

                    // Выставляем нужный символ направления активному TH
                    const arrowSpan = th.querySelector(".sort-arrow");
                    if (arrowSpan) {
                        arrowSpan.innerText = mip_modules.currentSort.asc ? " ▲" : " ▼";
                    }

                    // Алгоритм безопасной сортировки массива объектов
                    modules.sort((a, b) => {
                        const valA = (sortField === "name" ? a.name : a.description) || "";
                        const valB = (sortField === "name" ? b.name : b.description) || "";

                        return mip_groups.currentSort.asc
                        ? valA.localeCompare(valB, undefined, { numeric: true, sensitivity: 'base' })
                        : valB.localeCompare(valA, undefined, { numeric: true, sensitivity: 'base' });
                    });

                    // Перерисовываем таблицу с новым порядком строк
                    renderRows(modules);
                };
            }

            // Обработка клика и выделения строк
            tbody.onmousedown = (e) => {
                const row = e.target.closest(".mip-row");
                if (!row) return;
                tbody.querySelectorAll(".mip-row").forEach(r => r.classList.remove("selected"));
                row.classList.add("selected");
            };

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

    async cmd(act, row) {
        if (act !== "add" && !row) return alert("Please select a module from the list first.");

        if (act === "add") {
            mip_groups.win("Add Module", mip_modules_components.renderAddForm(), async () => {
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
            });
        }
        else if (act === "remove") {
            const moduleId = parseInt(row.dataset.id);
            const moduleName = row.dataset.name;

            mip_groups.win("Confirmation", mip_modules_components.renderConfirmDelete(moduleName), async () => {
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

    esc: str => str ? str.replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m])) : '—'
};
