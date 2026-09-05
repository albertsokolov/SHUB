/**
 * Компонент отрисовки GUI для MIP-панели групп и ролей (SHUB Core)
 */
const mip_groups_components = {
    // Главный экран модуля групп
    render: () => `
    <div class="mip-panel-wrapper">
    <div class="mip-filter-bar">
    <div><label>Domain:</label><select><option>Local User Database</option></select></div>
    <div class="mip-filter-input-wrapper"><label>Filter:</label><input type="text" id="mip-group-filter" class="mip-filter-input"></div>
    </div>
    <div class="mip-table-container">
    <table class="mip-grid">
    <thead>
    <tr id="mip-group-th-sort-row">
    <th style="width:10%; cursor:pointer; user-select:none;" data-sort="id">ID <span class="sort-arrow"></span></th>
    <th style="width:40%; cursor:pointer; user-select:none;" data-sort="name">Group Name <span class="sort-arrow"></span></th>
    <th style="width:50%; cursor:pointer; user-select:none;" data-sort="desc">Description <span class="sort-arrow"></span></th>
    </tr>
    </thead>
    <tbody id="mip-groups-tbody"></tbody>
    </table>
    </div>
    <div class="mip-status-bar">
    <span class="icon icon-groups" style="width:16px;height:16px;background-size:900% 500%"></span>
    <span>Number of groups in this domain: <b id="mip-group-count">0</b>.</span>
    </div>
    <div class="mip-action-bar">
    <div class="mip-btn-group" id="mip-group-actions">
    <button class="mip-btn" data-act="add">Add...</button>
    <button class="mip-btn" data-act="edit">Edit...</button>
    <button class="mip-btn" data-act="remove">Remove</button>
    <button class="mip-btn">More Actions ▾</button>
    </div>
    <div class="mip-btn-group"><button class="mip-btn">Template...</button></div>
    </div>
    </div>`,

    // Форма добавления новой группы
    renderAddForm: () => `
    <div class="mip-form-group"><label>Имя группы:</label><input type="text" id="mg-name" class="mip-form-input" autocomplete="off"></div>
    <div class="mip-form-group"><label>Описание:</label><input type="text" id="mg-desc" class="mip-form-input" autocomplete="off"></div>`,

    // Окно подтверждения удаления
    renderConfirmDelete: (name) => `
    <div class="mip-confirm-icon-question">?</div>
    <div class="mip-confirm-text">Вы уверены, что хотите удалить группу "${name}"?</div>`,

    // Маленькое вложенное окно привязки пользователя к группе
    renderSelectUserForm: (usersHtml) => `
    <div style="padding:4px 0 10px 0; color:#333">Выберите пользователя для привязки:</div>
    <select id="w-select-user-dropdown" class="adv-sel" style="width:100%; height:24px; border-color:#a3bae9">
    ${usersHtml}
    </select>`,

    // Большое трехвкладочное окно редактирования существующей группы (Ширина 640px)
    renderEditForm: (name, desc) => `
    <!-- Вкладки ExtJS стиля -->
    <ul class="x-tab-strip" style="margin-top:0; margin-bottom:15px; flex-direction:row; height:24px; width:100%; border-bottom:1px solid #99bbe8">
    <li class="active" data-win-tab="general" style="background:none; width:70px; height:23px; text-align:center; line-height:23px; border:1px solid #99bbe8; border-bottom:none; border-radius:3px 3px 0 0">General</li>
    <li data-win-tab="members" style="background:none; width:70px; height:23px; text-align:center; line-height:23px; border:1px solid transparent; border-bottom:none; border-radius:3px 3px 0 0">Members</li>
    <li data-win-tab="rights" style="background:none; width:70px; height:23px; text-align:center; line-height:23px; border:1px solid transparent; border-bottom:none; border-radius:3px 3px 0 0">Rights</li>
    </ul>

    <!-- Контент вкладки 1: General (Высота 320px) -->
    <div id="w-tab-general" class="win-tab-content" style="height:320px; display:flex; flex-direction:column; gap:10px; padding-top:5px">
    <div class="mip-form-group"><label>Name:</label><input type="text" id="mg-name" class="mip-form-input" value="${name}" disabled style="background:#e9e9e9;color:#666"></div>
    <div class="mip-form-group"><label>Description:</label><input type="text" id="mg-desc" class="mip-form-input" value="${desc}"></div>
    </div>

    <!-- Контент вкладки 2: Members -->
    <div id="w-tab-members" class="win-tab-content" style="display:none; height:320px; box-sizing:border-box; padding-top:5px">
    <div style="display:flex; gap:10px; height:100%; width:100%">
    <div class="mip-table-container" style="flex:1; margin:0; border:1px solid #a3bae9; overflow-y:auto; background:#fff;">
    <table class="mip-grid">
    <thead>
    <tr style="background: linear-gradient(to bottom, #f9fbfd, #e2eefb); height:22px; border-bottom:1px solid #a3bae9">
    <th style="width:30%; color:#15428b; font-weight:normal; padding:2px 6px">Name ▾</th>
    <th style="width:35%; color:#15428b; font-weight:normal; padding:2px 6px">Full Name</th>
    <th style="width:35%; color:#15428b; font-weight:normal; padding:2px 6px">Description</th>
    </tr>
    </thead>
    <tbody id="w-members-tbody">
    <tr id="w-members-group-row" style="background:#f0f4f8; font-weight:bold; height:20px; user-select:none">
    <td colspan="3" style="padding:2px 6px; display:flex; align-items:center; gap:6px; border:none">
    <span class="icon icon-net-tree" style="width:16px; height:16px; background-size:900% 500%!important; margin:0"></span>
    <span style="color:#15428b; font-family:Tahoma; font-size:11px">USERS</span>
    </td>
    </tr>
    </tbody>
    </table>
    </div>
    <div style="width:100px; flex-shrink:0; display:flex; flex-direction:column; gap:6px">
    <button class="mip-btn" style="width:100%" id="w-btn-add-member">Add Users...</button>
    <button class="mip-btn" style="width:100%; background:#e9e9e9; color:#999" disabled>Add Groups...</button>
    <button class="mip-btn" style="width:100%; margin-top:auto" id="w-btn-remove-member">Remove</button>
    </div>
    </div>
    </div>

    <!-- Контент вкладки 3: Rights (Высота 320px) -->
    <div id="w-tab-rights" class="win-tab-content" style="display:none; height:320px; box-sizing:border-box; padding-top:5px">
    <div style="border:1px solid #a3bae9; background:#fff; height:100%; padding:8px; overflow-y:auto; color:#666">
    Матрица прав доступа к модулям домена подгружается...
    </div>
    </div>`
};
