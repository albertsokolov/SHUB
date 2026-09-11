/**
 * Компонент отрисовки GUI для MIP-панели сервисов (SHUB Core)
 */
const mip_services_components = {
    render: () => `
    <div class="mip-panel-wrapper">
    <div style="padding: 10px 0; font-family: Tahoma, sans-serif; font-size:12px; color:#333;">
    Логические пакеты автоматизации (наборы портов/скриптов):
    </div>
    <div class="mip-table-container">
    <table class="mip-grid">
    <thead>
    <tr id="mip-services-th-sort-row">
    <th style="width:35%; cursor:pointer; user-select:none;" data-sort="name">Service Name <span class="sort-arrow"></span></th>
    <th style="width:25%; cursor:pointer; user-select:none;" data-sort="port">Active Port / Script <span class="sort-arrow"></span></th>
    <th style="width:40%; cursor:pointer; user-select:none;" data-sort="desc">Description <span class="sort-arrow"></span></th>
    </tr>
    </thead>
    <tbody id="mip-services-tbody"></tbody>
    </table>
    </div>
    <div class="mip-action-bar" style="padding-left:0; padding-right:0;">
    <div class="mip-btn-group" id="mip-services-actions">
    <button class="mip-btn" data-act="add" style="font-weight:bold; width:90px">Add...</button>
    <button class="mip-btn" data-act="edit" style="width:80px">Edit...</button>
    <button class="mip-btn" data-act="remove" style="width:80px">Remove</button>
    </div>
    </div>
    </div>`,

    // Многовкладочное окно Add / Edit для сервисов
    renderServiceWindowForm: (name = "", desc = "", portsOptionsHtml = "") => `
    <!-- Вкладки ExtJS стиля -->
    <ul class="x-tab-strip" style="margin-top:0; margin-bottom:15px; flex-direction:row; height:24px; width:100%; border-bottom:1px solid #99bbe8; list-style:none; padding:0;">
    <li class="active" data-win-tab="general" style="background:none; width:70px; height:23px; text-align:center; line-height:23px; border:1px solid #99bbe8; border-bottom:none; border-radius:3px 3px 0 0; cursor:pointer;">General</li>
    <li data-win-tab="ports" style="background:none; width:70px; height:23px; text-align:center; line-height:23px; border:1px solid transparent; border-bottom:none; border-radius:3px 3px 0 0; cursor:pointer;">Ports</li>
    </ul>

    <!-- Контент вкладки 1: General (Высота 200px) -->
    <div id="w-tab-general" class="win-tab-content" style="height:200px; display:flex; flex-direction:column; gap:12px; padding-top:5px">
    <div class="mip-form-group">
    <label style="width:110px; display:inline-block;">Service Name:</label>
    <input type="text" id="ms-name" class="mip-form-input" style="flex:1;" value="${name}" autocomplete="off">
    </div>
    <div class="mip-form-group">
    <label style="width:110px; display:inline-block;">Description:</label>
    <input type="text" id="ms-desc" class="mip-form-input" style="flex:1;" value="${desc}" autocomplete="off">
    </div>
    </div>

    <!-- Контент вкладки 2: Ports -->
    <div id="w-tab-ports" class="win-tab-content" style="display:none; height:200px; box-sizing:border-box; padding-top:5px">
    <div style="padding:4px 0 10px 0; color:#333; font-family:Tahoma; font-size:11px;">Выберите адаптированный портативный скрипт (Port) для привязки к этому сервису:</div>
    <div class="mip-form-group">
    <label style="width:110px; display:inline-block;">Active Script:</label>
    <select id="ms-port-id" class="adv-sel" style="flex:1; height:24px; border-color:#a3bae9">
    <option value="">— Без привязки к скрипту —</option>
    ${portsOptionsHtml}
    </select>
    </div>
    <div style="margin-top:15px; color:#555; background:#edf2fa; padding:8px; border:1px solid #a3bae9; border-radius:3px; font-size:11px; line-height:14px;">
    ℹ При вызове данного сервиса система автоматически выполнит привязанный портативный скрипт с использованием соответствующего Bash/PowerShell интерпретатора.
    </div>
    </div>`,

    renderConfirmDelete: (name) => `
    <div class="mip-confirm-icon-question">?</div>
    <div class="mip-confirm-text">Вы уверены, что хотите удалить сервис "${name}"?</div>`
};
