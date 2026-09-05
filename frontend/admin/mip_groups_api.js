/**
 * Слой асинхронного взаимодействия с API бэкенда для модуля групп (SHUB Core)
 */
const mip_groups_api = {
    // Асинхронная подгрузка участников во внутренний грид модального окна
    async loadMembers(groupId) {
        const mBody = document.getElementById("w-members-tbody");
        if (!mBody) return;
        try {
            const members = await (await fetch(`/api/mip-g/groups/members?id=${groupId}`)).json();
            const groupHeader = document.getElementById("w-members-group-row");
            mBody.innerHTML = "";
            if (groupHeader) mBody.appendChild(groupHeader);

            const rowsHtml = members.map(m => `
            <tr class="mip-row" data-username="${mip_groups.esc(m.username)}" style="height:20px; border-bottom:1px solid #ededed; background:#fff">
            <td style="display:flex; align-items:center; gap:6px; border:none; padding:3px 6px">
            <span class="icon icon-user" style="width:16px; height:16px; background-size:900% 500%!important; margin:0; flex-shrink:0"></span>
            <span>${mip_groups.esc(m.username)}</span>
            </td>
            <td style="padding:3px 6px">${mip_groups.esc(m.fullname)}</td>
            <td style="padding:3px 6px">${mip_groups.esc(m.description)}</td>
            </tr>`).join('');
            mBody.insertAdjacentHTML('beforeend', rowsHtml);

            mBody.onclick = (e) => {
                const row = e.target.closest(".mip-row");
                if (row && row.id !== "w-members-group-row") {
                    mBody.querySelectorAll(".mip-row").forEach(r => { r.classList.remove("selected-member"); r.style.background = "#fff"; });
                    row.classList.add("selected-member");
                    row.style.background = "#cbdcf2";
                }
            };
        } catch (err) { console.error("Ошибка загрузки участников группы:", err); }
    },

    // Асинхронная подгрузка матрицы прав во внутренний грид модального окна
    async loadRights(groupId) {
        const rBody = document.getElementById("w-rights-tbody");
        if (!rBody) return;
        try {
            const permissions = await (await fetch(`/api/mip-g/groups/rights?id=${groupId}`)).json();

            rBody.innerHTML = permissions.map(p => `
            <tr class="mip-row-perm" data-module-id="${p.module_id}" style="height:22px; border-bottom:1px solid #ededed; background:#fff">
            <td style="padding:3px 6px; display:flex; flex-direction:column; gap:2px">
            <span style="font-weight:bold; color:#333">${mip_groups.esc(p.module_name)}</span>
            <span style="color:#777; font-size:10px">${mip_groups.esc(p.module_desc)}</span>
            </td>
            <td style="text-align:center; vertical-align:middle">
            <input type="checkbox" class="chk-read" ${p.can_read ? 'checked' : ''}>
            </td>
            <td style="text-align:center; vertical-align:middle">
            <input type="checkbox" class="chk-write" ${p.can_write ? 'checked' : ''}>
            </td>
            </tr>`).join('');
        } catch (err) { console.error("Ошибка загрузки матрицы прав группы:", err); }
    }
};
