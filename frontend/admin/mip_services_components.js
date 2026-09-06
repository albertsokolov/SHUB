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
    <th style="width:40%; cursor:pointer; user-select:none;" data-sort="name">Service Name <span class="sort-arrow"></span></th>
    <th style="width:60%; cursor:pointer; user-select:none;" data-sort="desc">Description <span class="sort-arrow"></span></th>
    </tr>
    </thead>
    <tbody id="mip-services-tbody"></tbody>
    </table>
    </div>
    <div class="mip-action-bar" style="padding-left:0; padding-right:0;">
    <div class="mip-btn-group" id="mip-services-actions">
    <button class="mip-btn" data-act="add" style="font-weight:bold; width:90px">Add Service...</button>
    <button class="mip-btn" data-act="edit" style="width:80px" disabled>Edit...</button>
    <button class="mip-btn" data-act="remove" style="width:80px">Remove</button>
    </div>
    </div>
    </div>`,

    renderAddForm: () => `
    <div class="mip-form-group"><label>Service Name:</label><input type="text" id="ms-name" class="mip-form-input" placeholder="e.g. Database Maintenance" autocomplete="off"></div>
    <div class="mip-form-group"><label>Description:</label><input type="text" id="ms-desc" class="mip-form-input" placeholder="Назначение пакета скриптов" autocomplete="off"></div>`,

    renderConfirmDelete: (name) => `
    <div class="mip-confirm-icon-question">?</div>
    <div class="mip-confirm-text">Вы уверены, что хотите удалить сервис "${name}"?<br><br><small style="color:#666">Связанные порты/скрипты не удалятся, но потеряют привязку к этому сервису.</small></div>`
};
