/**
 * Контроллер управления MIP-панелью доменов (SHUB Core)
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
                <tr class="mip-row" data-id="${d.id}" data-name="${mip_domains.esc(d.name)}">
                <td style="display:flex; align-items:center; gap:8px; border:none; padding:3px 6px;">
                <!-- Используем иконку doc-webglobe (X=25%, Y=100% в спрайте), идеальная иконка @ для домена -->
                <span class="icon icon-doc-webglobe" style="width:16px; height:16px; background-size:900% 500%!important; margin:0; flex-shrink:0;"></span>
                <span style="font-weight: ${d.is_primary ? 'bold' : 'normal'}">${mip_domains.esc(d.name)} ${d.is_primary ? '<span style="color:#666; font-weight:normal; font-style:italic; margin-left:4px;">(primary)</span>' : ''}</span>
                </td>
                <td>${mip_domains.esc(d.description)}</td>
                </tr>`).join('');
            };
            renderRows(domains);

            // Обработка клика и выделения строк
            tbody.onmousedown = (e) => {
                const row = e.target.closest(".mip-row");
                if (!row) return;
                tbody.querySelectorAll(".mip-row").forEach(r => r.classList.remove("selected"));
                row.classList.add("selected");
            };

            // Делегирование подвальных кнопок Add / Remove
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

    async cmd(act, row) {
        if (act !== "add" && !row) return alert("Please select a domain from the list first.");

        if (act === "add") {
            // Открываем модальное окно создания домена
            mip_groups_handlers.win("Add Domain", mip_domains_components.renderAddForm(), async () => {
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
            });
        }
        else if (act === "remove") {
            const domainId = parseInt(row.dataset.id);
            const domainName = row.dataset.name;

            // Открываем окно подтверждения удаления (isConfirm = true)
            mip_groups_handlers.win("Confirmation", mip_domains_components.renderConfirmDelete(domainName), async () => {
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

    esc: str => str ? str.replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m])) : '—'
};
