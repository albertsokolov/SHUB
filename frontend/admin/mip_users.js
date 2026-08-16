const mip_users = {
    // Метод возвращает HTML-каркас панели
    render() {
        return `
        <div class="mip-panel-wrapper" style="display: flex; flex-direction: column; height: 100%; font-family: Tahoma, sans-serif; font-size: 12px; background: #fff;">

        <!-- Верхняя панель фильтрации (Domain & Filter) -->
        <div class="mip-filter-bar" style="background: #cbdcf2; padding: 6px 10px; display: flex; align-items: center; gap: 15px; border-bottom: 1px solid #99bbe8;">
        <div>
        <label>Domain:</label>
        <select style="font-size: 12px; padding: 2px;"><option>Local User Database</option></select>
        </div>
        <div>
        <input type="checkbox" id="hide-disabled"> <label for="hide-disabled">Hide disabled user accounts</label>
        </div>
        <div style="margin-left: auto; display: flex; align-items: center; gap: 5px;">
        <label>Filter:</label>
        <input type="text" id="mip-user-filter" style="width: 200px; padding: 2px; border: 1px solid #99bbe8;">
        </div>
        </div>

        <!-- Центральная область таблицы данных -->
        <div class="mip-table-container" style="flex: 1; overflow-y: auto; padding: 1px;">
        <table class="mip-grid" style="width: 100%; border-collapse: collapse; text-align: left;">
        <thead>
        <tr style="background: linear-gradient(to bottom, #f9fbfd, #eaf2fb); border-bottom: 1px solid #99bbe8; color: #15428b; height: 24px;">
        <th style="padding: 4px 8px; border-right: 1px solid #d0d0d0; width: 25%;">Username <span style="font-size: 9px;">▲</span></th>
        <th style="padding: 4px 8px; border-right: 1px solid #d0d0d0; width: 25%;">Full Name</th>
        <th style="padding: 4px 8px; border-right: 1px solid #d0d0d0; width: 30%;">Description</th>
        <th style="padding: 4px 8px; width: 20%;">Groups</th>
        </tr>
        </thead>
        <tbody id="mip-users-tbody">
        <!-- Строки данных будут внедрены через fetch -->
        </tbody>
        </table>
        </div>

        <!-- Нижний статус-бар подсчета -->
        <div class="mip-status-bar" style="background: #cbdcf2; padding: 4px 10px; border-top: 1px solid #99bbe8; border-bottom: 1px solid #99bbe8; color: #15428b; display: flex; align-items: center; gap: 6px;">
        <span class="icon icon-user-status" style="margin-right: 2px;"></span>
        <span>Number of users in this domain: <b id="mip-user-count">0</b>.</span>
        </div>

        <!-- Подвальная панель управления (Кнопки действий) -->
        <div class="mip-action-bar" style="background: #eaf2fb; padding: 6px 10px; display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #fff;">
        <div style="display: flex; gap: 5px;">
        <button class="mip-btn">Add...</button>
        <button class="mip-btn">Edit...</button>
        <button class="mip-btn">Remove</button>
        <button class="mip-btn">More Actions ▾</button>
        </div>
        <div style="display: flex; gap: 5px;">
        <button class="mip-btn">Template...</button>
        <button class="mip-btn">Import...</button>
        </div>
        </div>

        </div>
        `;
    },

    // Метод инициализирует логику загрузки данных после встраивания HTML в DOM
    async init() {
        const tbody = document.getElementById("mip-users-tbody");
        const countEl = document.getElementById("mip-user-count");
        if (!tbody) return;

        try {
            const res = await fetch("/api/mip/users");
            const users = await res.json();

            if (countEl) countEl.innerText = users.length;

            tbody.innerHTML = users.map(u => `
            <tr class="mip-row" style="height: 22px; border-bottom: 1px dotted #d0d0d0; cursor: pointer;">
            <td style="padding: 2px 8px; white-space: nowrap;"><span class="icon icon-user"></span>${u.username}</td>
            <td style="padding: 2px 8px; color: #444;">${u.full_name || ''}</td>
            <td style="padding: 2px 8px; color: #666;">${u.description || ''}</td>
            <td style="padding: 2px 8px; color: #444;">${u.groups || ''}</td>
            </tr>
            `).join('');

            // Логика выделения строки при клике как на скриншоте
            document.querySelectorAll(".mip-row").forEach(row => {
                row.addEventListener("click", () => {
                    document.querySelectorAll(".mip-row").forEach(r => r.style.background = "none");
                    row.style.background = "#d9e4f4";
                });
            });

        } catch (err) {
            tbody.innerHTML = `<tr><td colspan="4" style="color:red; padding: 10px;">Ошибка: ${err}</td></tr>`;
        }
    }
};
