/**
 * Контроллер управления MIP-панелью портированных скриптов (SHUB Core)
 */
const mip_ports = {
    async init() {
        const tbody = document.getElementById("mip-ports-tbody");
        if (!tbody) return;

        try {
            tbody.innerHTML = `<tr><td colspan="4" style="padding:10px; color:#666">Загрузка репозитория портов...</td></tr>`;
            const ports = await (await fetch("/api/mip-p/ports")).json();

            mip_ports.currentSort = { field: null, asc: true };

            const renderRows = (dataList) => {
                tbody.innerHTML = dataList.map(p => `
                <tr class="mip-row" data-id="${p.id}" data-name="${mip_ports.esc(p.name)}">
                <td style="display:flex; align-items:center; gap:8px; border:none; padding:3px 6px;">
                <span class="icon icon-nic" style="width:16px; height:16px; background-size:900% 500%!important; margin:0; flex-shrink:0;"></span>
                <span style="font-weight:bold; color:#15428b;">${mip_ports.esc(p.name)}</span>
                </td>
                <td style="font-family:monospace; color:#333;">[ ${mip_ports.esc(p.interpreter)} ]</td>
                <td style="color:#444;">${mip_ports.esc(p.service_name)}</td>
                <td>${mip_ports.esc(p.description)}</td>
                </tr>`).join('');
            };
            renderRows(ports);

            // КЛИЕНТСКАЯ СОРТИРОВКА КОЛОНОК
            const sortRow = document.getElementById("mip-port-th-sort-row");
            if (sortRow) {
                sortRow.onclick = (e) => {
                    const th = e.target.closest("th[data-sort]");
                    if (!th) return;

                    const sortField = th.dataset.sort;
                    if (mip_ports.currentSort.field === sortField) {
                        mip_ports.currentSort.asc = !mip_ports.currentSort.asc;
                    } else {
                        mip_ports.currentSort.field = sortField;
                        mip_ports.currentSort.asc = true;
                    }

                    document.querySelectorAll("#mip-port-th-sort-row .sort-arrow").forEach(s => s.innerText = "");
                    const arrowSpan = th.querySelector(".sort-arrow");
                    if (arrowSpan) arrowSpan.innerText = mip_ports.currentSort.asc ? " ▲" : " ▼";

                    ports.sort((a, b) => {
                        let valA = "", valB = "";
                        if (sortField === "name") { valA = a.name; valB = b.name; }
                        else if (sortField === "interpreter") { valA = a.interpreter; valB = b.interpreter; }
                        else if (sortField === "service") { valA = a.service_name; valB = b.service_name; }
                        else if (sortField === "desc") { valA = a.description; valB = b.description; }

                        return mip_ports.currentSort.asc
                        ? valA.localeCompare(valB, undefined, { numeric: true, sensitivity: 'base' })
                        : valB.localeCompare(valA, undefined, { numeric: true, sensitivity: 'base' });
                    });
                    renderRows(ports);
                };
            }

            tbody.onmousedown = (e) => {
                const row = e.target.closest(".mip-row");
                if (!row) return;
                tbody.querySelectorAll(".mip-row").forEach(r => r.classList.remove("selected"));
                row.classList.add("selected");
            };

            const actionGroup = document.getElementById("mip-port-actions");
            if (actionGroup) {
                actionGroup.onclick = (e) => {
                    const btn = e.target.closest("[data-act]");
                    if (btn) mip_ports.cmd(btn.dataset.act, tbody.querySelector(".mip-row.selected"));
                };
            }

        } catch (err) {
            tbody.innerHTML = `<tr><td colspan="4" style="color:red; padding:10px">Ошибка загрузки: ${err.message}</td></tr>`;
        }
    },

    async cmd(act, row) {
        if (act !== "add" && !row) return alert("Пожалуйста, выберите скрипт из списка.");

        if (act === "add") {
            try {
                // Асинхронно стягиваем список существующих сервисов для генерации выпадающего списка связи
                const services = await (await fetch("/api/groups")).replace;
                // Ой, для сервисов у нас роут в db_init зашит в таблицу services_tab.
                // Сделаем чистый fetch к группам? Нет, к сервисам. Напишем заглушку или стянем из базы
                const resSvc = await (await fetch("/api/groups")).json(); // Пока используем этот роут или напишем роут сервисов позже
                // Чтобы не падать, если роута сервисов еще нет, сделаем выборку групп или пустой селект:
                const optionsHtml = resSvc.map(s => `<option value="${s.id}">${mip_ports.esc(s.name)}</option>`).join('');

                mip_groups.win("Add Portable Port/Script", mip_ports_components.renderAddForm(optionsHtml), async () => {
                    const name = document.getElementById("mp-name").value.trim();
                    const interpreter = document.getElementById("mp-interpreter").value;
                    const sIdVal = document.getElementById("mp-service-id").value;
                    const description = document.getElementById("mp-desc").value.trim();

                    if (!name) { alert("Script name is required!"); return false; }

                    const res = await (await fetch("/api/mip-p/ports/add", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            name,
                            interpreter,
                            description,
                            service_id: sIdVal ? parseInt(sIdVal) : null
                        })
                    })).json();

                    if (res.success) { mip_ports.init(); return true; }
                    alert("Ошибка: " + res.message); return false;
                });
            } catch (e) { console.error(e); }
        }
        else if (act === "remove") {
            const portId = parseInt(row.dataset.id);
            const portName = row.dataset.name;

            mip_groups.win("Confirmation", mip_ports_components.renderConfirmDelete(portName), async () => {
                const res = await (await fetch("/api/mip-p/ports/remove", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ id: portId })
                })).json();

                if (res.success) { mip_ports.init(); return true; }
                alert("Ошибка: " + res.message); return false;
            }, true);
        }
    },

    esc: str => str ? str.replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m])) : '—'
};
