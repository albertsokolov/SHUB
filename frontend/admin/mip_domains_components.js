/**
 * Компонент отрисовки GUI для MIP-панели доменов (SHUB Core)
 */
const mip_domains_components = {
    render: () => `
    <div class="mip-panel-wrapper">
    <div style="padding: 10px 0; font-family: Tahoma, sans-serif; font-size:12px; color:#333;">
    Internet hostname: <b style="font-weight:bold; color:#000">master-hub.local</b>
    </div>
    <div class="mip-table-container">
    <table class="mip-grid">
    <thead>
    <tr style="background: linear-gradient(to bottom, #f9fbfd, #e2eefb); height: 23px; border-bottom: 1px solid #99bbe8;">
    <th style="width:50%; color:#15428b; font-weight:normal; padding:4px 6px;">Name ▾</th>
    <th style="width:50%; color:#15428b; font-weight:normal; padding:4px 6px;">Description</th>
    </tr>
    </thead>
    <tbody id="mip-domains-tbody"></tbody>
    </table>
    </div>
    <div class="mip-action-bar" style="padding-left:0; padding-right:0;">
    <div class="mip-btn-group" id="mip-domain-actions">
    <button class="mip-btn" data-act="add" style="font-weight:bold; width:90px">Add...</button>
    <button class="mip-btn" data-act="edit" style="width:80px">Edit...</button>
    <button class="mip-btn" data-act="remove" style="width:80px">Remove</button>
    <button class="mip-btn" style="width:110px" disabled>Set as Primary</button>
    </div>
    </div>
    </div>`,

    // Многовкладочное окно Add / Edit для доменов
    renderDomainWindowForm: (name = "", desc = "", isPrimary = false) => `
    <!-- Вкладки ExtJS стиля -->
    <ul class="x-tab-strip" style="margin-top:0; margin-bottom:15px; flex-direction:row; height:24px; width:100%; border-bottom:1px solid #99bbe8; list-style:none; padding:0; display:flex;">
    <li class="active" data-win-tab="general" style="background:none; width:70px; height:23px; text-align:center; line-height:23px; border:1px solid #99bbe8; border-bottom:none; border-radius:3px 3px 0 0; cursor:pointer;">General</li>
    <li data-win-tab="advanced" style="background:none; width:70px; height:23px; text-align:center; line-height:23px; border:1px solid transparent; border-bottom:none; border-radius:3px 3px 0 0; cursor:pointer;">Advanced</li>
    </ul>

    <!-- Контент вкладки 1: General (Высота 200px) -->
    <div id="w-tab-general" class="win-tab-content" style="height:200px; display:flex; flex-direction:column; gap:12px; padding-top:5px">
    <div class="mip-form-group">
    <label style="width:110px; display:inline-block;">Domain Name:</label>
    <input type="text" id="md-name" class="mip-form-input" style="flex:1;" value="${name}" ${isPrimary ? "disabled style='background:#e9e9e9;color:#666'" : ""} placeholder="e.g. sivanatoys.by" autocomplete="off">
    </div>
    <div class="mip-form-group">
    <label style="width:110px; display:inline-block;">Description:</label>
    <input type="text" id="md-desc" class="mip-form-input" style="flex:1;" value="${desc}" placeholder="Optional notes" autocomplete="off">
    </div>
    </div>

    <!-- Контент вкладки 2: Advanced -->
    <div id="w-tab-advanced" class="win-tab-content" style="display:none; height:200px; box-sizing:border-box; padding-top:5px">
    <div style="padding:4px 0 10px 0; color:#333; font-family:Tahoma; font-size:11px; font-weight:bold;">Статус и параметры маршрутизации:</div>
    <div style="margin-top:5px; color:#555; background:#f4f7fb; padding:10px; border:1px solid #a3bae9; border-radius:3px; font-size:12px; line-height:16px;">
    Тип домена: <b>Локальная база данных (Local)</b>.
    <br><br>
    Текущее состояние: ${isPrimary ? "<span style='color:green; font-weight:bold;'>Основной (Primary) домен системы</span>" : "<span>Второстепенный домен</span>"}.
    <br><br>
    <small style="color:#666;">ℹ Смена основного домена осуществляется кнопкой «Set as Primary» на главной панели.</small>
    </div>
    </div>`,

    renderConfirmDelete: (name) => `
    <div class="mip-confirm-icon-question">?</div>
    <div class="mip-confirm-text">Are you sure you want to permanently remove domain "${name}"?</div>`
};
