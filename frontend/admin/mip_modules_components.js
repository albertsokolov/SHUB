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
    <!-- ОЖИВЛЕНО: Добавлены интерактивные заголовки сортировки -->
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
    <button class="mip-btn" data-act="edit" style="width:80px" disabled>Edit...</button>
    <button class="mip-btn" data-act="remove" style="width:80px">Remove</button>
    </div>
    </div>
    </div>`,

    renderAddForm: () => `
    <div class="mip-form-group"><label>Module Name:</label><input type="text" id="mm-name" class="mip-form-input" placeholder="e.g. Mail Server Core" autocomplete="off"></div>
    <div class="mip-form-group"><label>Description:</label><input type="text" id="mm-desc" class="mip-form-input" placeholder="Subsystem role notes" autocomplete="off"></div>`,

    renderConfirmDelete: (name) => `
    <div class="mip-confirm-icon-question">?</div>
    <div class="mip-confirm-text">Are you sure you want to completely unregister module "${name}"?<br><br><small style="color:#666">Warning: This will clear all entries in permissions matrices!</small></div>`
};
