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
                <td style="display:flex; align-items:center; gap:6px;">
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
                if (this.currentSort.field === sortField) {
                    this.currentSort.asc = !this.currentSort.asc;
                } else {
                    this.currentSort.field = sortField;
                    this.currentSort.asc = true;
                }

                document.querySelectorAll("#mip-group-th-sort-row .sort-arrow").forEach(span => span.innerText = "");
                th.querySelector(".sort-arrow").innerText = this.currentSort.asc ? " ▲" : " ▼";

                groups.sort((a, b) => {
                    let valA = "", valB = "";
                    if (sortField === "id") return this.currentSort.asc ? a.id - b.id : b.id - a.id;
                    if (sortField === "name") { valA = a.name; valB = b.name; }
                    else if (sortField === "desc") { valA = a.description || ""; valB = b.description || ""; }

                    return this.currentSort.asc
                    ? valA.localeCompare(valB)
                    : valB.localeCompare(valA);
                });

                renderRows(groups);
                applyFilters();
            };

            // ЖИВАЯ ФИЛЬТРАЦИЯ ГРУПП
            const filterInput = document.getElementById("mip-group-filter");
            const applyFilters = () => {
                const query = filterInput.value.toLowerCase().trim();
                const rows = tbody.querySelectorAll(".mip-row");
                let visibleCount = 0;

                rows.forEach(row => {
                    const name = row.dataset.name.toLowerCase();
                    const description = row.dataset.desc.toLowerCase();

                    if (name.includes(query) || description.includes(query)) {
                        row.style.display = "";
                        visibleCount++;
                    } else {
                        row.style.display = "none";
                    }
                });
                document.getElementById("mip-group-count").innerText = visibleCount;
            };

            filterInput.oninput = applyFilters;

            // Выделение строки ЛКМ
            tbody.onmousedown = (e) => {
                const row = e.target.closest(".mip-row");
                if (row) this.sel(tbody, row);
            };

                // Заглушка на действия кнопок
                document.getElementById("mip-group-actions").onclick = (e) => {
                    const btn = e.target.closest("[data-act]");
                    if (btn) alert(`Операция ${btn.dataset.act.toUpperCase()} для групп в разработке`);
                };

        } catch (err) {
            tbody.innerHTML = `<tr><td colspan="3" style="color:red;padding:10px">Ошибка: ${err}</td></tr>`;
        }
    },

    sel: (tbody, row) => {
        tbody.querySelectorAll(".mip-row").forEach(r => r.classList.remove("selected"));
        row.classList.add("selected");
    },

    esc: str => str ? str.replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m])) : '—'
};
