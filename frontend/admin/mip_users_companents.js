/**
 * Компонент отрисовки GUI для MIP-панели пользователей (SHUB Core)
 */
const mip_users_components = {
    render: () => `
    <div class="mip-panel-wrapper">
    <div class="mip-filter-bar">
    <div><label>Domain:</label><select><option>Local User Database</option></select></div>
    <div><input type="checkbox" id="hide-disabled"><label for="hide-disabled">Hide disabled user accounts</label></div>
    <div class="mip-filter-input-wrapper"><label>Filter:</label><input type="text" id="mip-user-filter" class="mip-filter-input"></div>
    </div>
    <div class="mip-table-container">
    <table class="mip-grid">
    <thead>
    <tr id="mip-th-sort-row">
    <th style="width:30%; cursor:pointer; user-select:none;" data-sort="user">Username <span class="sort-arrow"></span></th>
    <th style="width:35%; cursor:pointer; user-select:none;" data-sort="full">Full Name <span class="sort-arrow"></span></th>
    <th style="width:35%; cursor:pointer; user-select:none;" data-sort="desc">Description <span class="sort-arrow"></span></th>
    </tr>
    </thead>
    <tbody id="mip-users-tbody"></tbody>
    </table>
    </div>
    <div class="mip-status-bar">
    <span class="icon icon-user-status" style="width:16px;height:16px;background-size:900% 500%"></span>
    <span>Number of users in this domain: <b id="mip-user-count">0</b>.</span>
    </div>
    <div class="mip-action-bar">
    <div class="mip-btn-group" id="mip-actions">
    <button class="mip-btn" data-act="add">Add...</button>
    <button class="mip-btn" data-act="edit">Edit...</button>
    <button class="mip-btn" data-act="remove">Remove</button>
    <button class="mip-btn">More Actions ▾</button>
    </div>
    <div class="mip-btn-group"><button class="mip-btn">Template...</button><button class="mip-btn">Import...</button></div>
    </div>
    </div>`
};
