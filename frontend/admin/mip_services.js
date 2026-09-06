/**
 * Контроллер управления MIP-панелью сервисов (SHUB Core)
 */
const mip_services = {
    async init() {
        const tbody = document.getElementById("mip-services-tbody");
        if (!tbody) return;

        try {
            tbody.innerHTML = `<tr><td colspan="2" style="padding:10px; color:#666">Загрузка списка сервисов...</td></tr>`;
            const services = await (await fetch("/api/mip-s/services")).json();

            mip_services.currentSort = { field: null, asc: true };

            const renderRows = (dataList) => {
                tbody.innerHTML = dataList.map(s => `
                <tr class="mip-row" data-id="${s.id}" data-name="${mip_services.esc(s.name)}">
                <td style="display:flex; align-items:center; gap:8px; border:none; padding:3px 6px;">
                <span class="icon icon-doc-gear" style="width:16px; height:16px; background-size:900% 500%!important; margin:0; flex-shrink:0;"></span>
                <span style="font-weight:bold; color:#15428b;">${mip_services.esc(s.name)}</span>
                </td>
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
                    if (mip_services.currentSort.field === sortField) {
                        mip_services.currentSort.asc = !mip_services.currentSort.asc;
                    } else {
                        mip_services.currentSort.field = sortField;
                        mip_services.currentSort.asc = true;
                    }

                    document.querySelectorAll("#mip-services-th-sort-row .sort-arrow").forEach(s => s.innerText = "");
                    const arrowSpan = th.querySelector(".sort-arrow");
                    if (arrowSpan) arrowSpan.innerText = mip_services.currentSort.asc ? " ▲" : " ▼";

                    services.sort((a, b) => {
                        const valA = (sortField === "name" ? a.name : a.description) || "";
                        const valB = (sortField === "name" ? b.name : b.description) || "";

                        return mip_services.currentSort.asc
                        ? valA.localeCompare(valB, undefined, { numeric: true, sensitivity: 'base' })
                        : valB.localeCompare(valA, undefined, { numeric: true, sensitivity: 'base' });
                    });
                    renderRows(services);
                };
            }

            tbody.onmousedown = (e) => {
                const row = e.target.closest(".mip-row");
                if (!row) return;
                tbody.querySelectorAll(".mip-row").forEach(r => r.classList.remove("selected"));
                row.classList.add("selected");
            };

            const actionGroup = document.getElementById("mip-services-actions");
            if (actionGroup) {
                actionGroup.onclick = (e) => {
                    const btn = e.target.closest("[data-act]");
                    if (btn) mip_services.cmd(btn.dataset.act, tbody.querySelector(".mip-row.selected"));
                };
            }

        } catch (err) {
            tbody.innerHTML = `<tr><td colspan="2" style="color:red; padding:10px">Ошибка загрузки: ${err.message}</td></tr>`;
        }
    },

    async cmd(act, row) {
        if (act !== "add" && !row) return alert("Пожалуйста, выберите сервис из списка.");

        if (act === "add") {
            mip_groups.win("Add Service Package", mip_services_components.renderAddForm(), async () => {
                const name = document.getElementById("ms-name").value.trim();
                const description = document.getElementById("ms-desc").value.trim();

                if (!name) { alert("Service name is required!"); return false; }

                const res = await (await fetch("/api/mip-s/services/add", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ name, description })
                })).json();

                if (res.success) { mip_services.init(); return true; }
                alert("Ошибка: " + res.message); return false;
            });
        }
        else if (act === "remove") {
            const svcId = parseInt(row.dataset.id);
            const svcName = row.dataset.name;

            mip_groups.win("Confirmation", mip_services_components.renderConfirmDelete(svcName), async () => {
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

    esc: str => str ? str.replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m])) : '—'
};
