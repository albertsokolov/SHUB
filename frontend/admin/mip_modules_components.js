/**
 * Компонент отрисовки GUI для MIP-панели модулей (SHUB Core)
 */
const mip_modules_components = {
    render: () => `
    <div class="mip-panel-wrapper">
    <div style="padding: 10px 0; font-family: Tahoma, sans-serif; font-size:12px; color:#333;">
    Registered software modules and subsystem plug-ins:
    </div>
    <div class="mip-table-container">
    <table class="mip-grid">
    <thead>
    <tr id="mip-module-th-sort-row">
    <th style="width:45%; cursor:pointer; user-select:none;" data-sort="name">Module Name <span class="sort-arrow"></span></th>
    <th style="width:55%; cursor:pointer; user-select:none;" data-sort="desc">Description <span class="sort-arrow"></span></th>
    </tr>
    </thead>
    <tbody id="mip-modules-tbody"></tbody>
    </table>
    </div>
    <div class="mip-action-bar" style="padding-left:0; padding-right:0;">
    <div class="mip-btn-group" id="mip-module-actions">
    <button class="mip-btn" data-act="add" style="font-weight:bold; width:90px">Add...</button>
    <button class="mip-btn" data-act="edit" style="width:80px">Edit...</button>
    <button class="mip-btn" data-act="remove" style="width:80px">Remove</button>
    </div>
    </div>
    </div>`,

    // Многовкладочное окно Add / Edit для модулей подсистем
    renderModuleWindowForm: (name = "", desc = "") => `
    <!-- Вкладки ExtJS стиля -->
    <ul class="x-tab-strip" style="margin-top:0; margin-bottom:15px; flex-direction:row; height:24px; width:100%; border-bottom:1px solid #99bbe8; list-style:none; padding:0; display:flex;">
    <li class="active" data-win-tab="general" style="background:none; width:70px; height:23px; text-align:center; line-height:23px; border:1px solid #99bbe8; border-bottom:none; border-radius:3px 3px 0 0; cursor:pointer;">General</li>
    <li data-win-tab="rights" style="background:none; width:70px; height:23px; text-align:center; line-height:23px; border:1px solid transparent; border-bottom:none; border-radius:3px 3px 0 0; cursor:pointer;">Rights</li>
    </ul>

    <!-- Контент вкладки 1: General (Высота 200px) -->
    <div id="w-tab-general" class="win-tab-content" style="height:200px; display:flex; flex-direction:column; gap:12px; padding-top:5px">
    <div class="mip-form-group">
    <label style="width:110px; display:inline-block;">Module Name:</label>
    <input type="text" id="mm-name" class="mip-form-input" style="flex:1;" value="${name}" ${name === "Core Auth" ? "disabled style='background:#e9e9e9;color:#666'" : ""} autocomplete="off">
    </div>
    <div class="mip-form-group">
    <label style="width:110px; display:inline-block;">Description:</label>
    <input type="text" id="mm-desc" class="mip-form-input" style="flex:1;" value="${desc}" autocomplete="off">
    </div>
    </div>

    <!-- Контент вкладки 2: Rights -->
    <div id="w-tab-rights" class="win-tab-content" style="display:none; height:200px; box-sizing:border-box; padding-top:5px">
    <div style="padding:4px 0 10px 0; color:#333; font-family:Tahoma; font-size:11px; font-weight:bold;">Матрица политик безопасности модуля:</div>
    <div style="margin-top:5px; color:#555; background:#f4f7fb; padding:10px; border:1px solid #a3bae9; border-radius:3px; font-size:12px; line-height:16px; height:130px; overflow-y:auto;">
    ℹ Изменение прав доступа групп пользователей к данному модулю настраивается централизованно через вкладку <b>«Группы и роли»</b> внутри модального окна управления конкретной ролью (раздел <i>Rights</i>).
    <br><br>
    Текущий статус модуля: <span style="color:green; font-weight:bold;">Активен (Задействован в ядре)</span>.
    </div>
    </div>`,

    renderConfirmDelete: (name) => `
    <div class="mip-confirm-icon-question">?</div>
    <div class="mip-confirm-text">Are you sure you want to completely unregister module "${name}"?<br><br><small style="color:#666">Warning: This will clear all entries in permissions matrices!</small></div>`
};
