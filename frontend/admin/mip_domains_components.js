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
    <button class="mip-btn" data-act="add" style="font-weight:bold; width:90px">Add</button>
    <button class="mip-btn" data-act="edit" style="width:80px" disabled>Edit...</button>
    <button class="mip-btn" data-act="remove" style="width:80px">Remove</button>
    <button class="mip-btn" style="width:110px" disabled>Set as Primary</button>
    </div>
    </div>
    </div>`,

    renderAddForm: () => `
    <div class="mip-form-group"><label>Domain Name:</label><input type="text" id="md-name" class="mip-form-input" placeholder="e.g. sivanatoys.by" autocomplete="off"></div>
    <div class="mip-form-group"><label>Description:</label><input type="text" id="md-desc" class="mip-form-input" placeholder="Optional notes" autocomplete="off"></div>`,

    renderConfirmDelete: (name) => `
    <div class="mip-confirm-icon-question">?</div>
    <div class="mip-confirm-text">Are you sure you want to permanently remove domain "${name}"?</div>`
};
