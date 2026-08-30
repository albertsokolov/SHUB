/**
 * Компонент отрисовки GUI для MIP-панели групп и ролей (SHUB Core)
 */
const mip_groups_components = {
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
    </div>`
};
