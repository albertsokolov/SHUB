/**
 * Модуль обработчиков и API-запросов для панели групп (SHUB Core)
 */
const mip_groups_handlers = {
    // Вспомогательный метод асинхронной загрузки и рендера участников
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
                    row.classList.add("selected-member"); row.style.background = "#cbdcf2";
                }
            };
        } catch (err) { console.error("Ошибка загрузки участников группы:", err); }
    },

    // Универсальный генератор модальных окон Windows / ExtJS стиля
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
    }
};
