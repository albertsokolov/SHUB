/**
 * Компонент отрисовки GUI для MIP-панели портированных скриптов (SHUB Core)
 */
const mip_ports_components = {
    render: () => `
    <div class="mip-panel-wrapper">
    <div style="padding: 10px 0; font-family: Tahoma, sans-serif; font-size:12px; color:#333;">
    Репозиторий адаптированных портативных скриптов автоматизации:
    </div>
    <div class="mip-table-container">
    <table class="mip-grid">
    <thead>
    <tr id="mip-port-th-sort-row">
    <th style="width:30%; cursor:pointer; user-select:none;" data-sort="name">Script / Port Name <span class="sort-arrow"></span></th>
    <th style="width:20%; cursor:pointer; user-select:none;" data-sort="interpreter">Interpreter <span class="sort-arrow"></span></th>
    <th style="width:25%; cursor:pointer; user-select:none;" data-sort="service">Belongs to Service <span class="sort-arrow"></span></th>
    <th style="width:25%; cursor:pointer; user-select:none;" data-sort="desc">Description <span class="sort-arrow"></span></th>
    </tr>
    </thead>
    <tbody id="mip-ports-tbody"></tbody>
    </table>
    </div>
    <div class="mip-action-bar" style="padding-left:0; padding-right:0;">
    <div class="mip-btn-group" id="mip-port-actions">
    <button class="mip-btn" data-act="add" style="font-weight:bold; width:90px">Add Port...</button>
    <button class="mip-btn" data-act="edit" style="width:80px" disabled>Edit...</button>
    <button class="mip-btn" data-act="remove" style="width:80px">Remove</button>
    </div>
    </div>
    </div>`,

    renderAddForm: (servicesOptionsHtml) => `
    <div class="mip-form-group"><label>Script Name:</label><input type="text" id="mp-name" class="mip-form-input" placeholder="e.g. backup_dump.sh" autocomplete="off"></div>
    <div class="mip-form-group">
    <label>Interpreter:</label>
    <select id="mp-interpreter" class="adv-sel" style="width:100%; height:20px;">
    <option value="bash">bash (/bin/bash)</option>
    <option value="powershell">powershell (pwsh)</option>
    <option value="native_cmd">native_cmd (cli binary)</option>
    </select>
    </div>
    <div class="mip-form-group">
    <label>Target Service:</label>
    <select id="mp-service-id" class="adv-sel" style="width:100%; height:20px;">
    <option value="">— Без привязки к сервису —</option>
    ${servicesOptionsHtml}
    </select>
    </div>
    <div class="mip-form-group"><label>Description:</label><input type="text" id="mp-desc" class="mip-form-input" placeholder="Назначение автоматизации" autocomplete="off"></div>`,

    renderConfirmDelete: (name) => `
    <div class="mip-confirm-icon-question">?</div>
    <div class="mip-confirm-text">Вы уверены, что хотите удалить и отозвать скрипт автоматизации "${name}"?</div>`
};
