/**
 * Компонент отрисовки GUI для MIP-панели планирования времени (SHUB Core)
 */
const mip_time_components = {
    render: () => `
    <div class="mip-panel-wrapper">
    <div style="padding: 10px 0; font-family: Tahoma, sans-serif; font-size:12px; color:#333;">
    Временные интервалы выполнения и расписание задач (Time Tasks):
    </div>
    <div class="mip-table-container">
    <table class="mip-grid">
    <thead>
    <tr id="mip-time-th-sort-row">
    <th style="width:40%; cursor:pointer; user-select:none;" data-sort="name">Task Name <span class="sort-arrow"></span></th>
    <th style="width:25%; cursor:pointer; user-select:none;" data-sort="cron">Cron Expression <span class="sort-arrow"></span></th>
    <th style="width:35%; cursor:pointer; user-select:none;" data-sort="desc">Description <span class="sort-arrow"></span></th>
    </tr>
    </thead>
    <tbody id="mip-time-tbody"></tbody>
    </table>
    </div>
    <div class="mip-action-bar" style="padding-left:0; padding-right:0;">
    <div class="mip-btn-group" id="mip-time-actions">
    <button class="mip-btn" data-act="add" style="font-weight:bold; width:90px">Add...</button>
    <button class="mip-btn" data-act="edit" style="width:80px">Edit...</button>
    <button class="mip-btn" data-act="remove" style="width:80px">Remove</button>
    </div>
    </div>
    </div>`,

    renderTimeWindowForm: (name = "", cron = "", desc = "") => `
    <ul class="x-tab-strip" style="margin-top:0; margin-bottom:15px; flex-direction:row; height:24px; width:100%; border-bottom:1px solid #99bbe8; list-style:none; padding:0; display:flex;">
    <li class="active" data-win-tab="general" style="background:none; width:70px; height:23px; text-align:center; line-height:23px; border:1px solid #99bbe8; border-bottom:none; border-radius:3px 3px 0 0; cursor:pointer;">General</li>
    <li data-win-tab="cron" style="background:none; width:70px; height:23px; text-align:center; line-height:23px; border:1px solid transparent; border-bottom:none; border-radius:3px 3px 0 0; cursor:pointer;">Cron Specs</li>
    </ul>

    <div id="w-tab-general" class="win-tab-content" style="height:180px; display:flex; flex-direction:column; gap:12px; padding-top:5px">
    <div class="mip-form-group">
    <label style="width:110px; display:inline-block;">Task Name:</label>
    <input type="text" id="mt-name" class="mip-form-input" style="flex:1;" value="${name}" autocomplete="off">
    </div>
    <div class="mip-form-group">
    <label style="width:110px; display:inline-block;">Description:</label>
    <input type="text" id="mt-desc" class="mip-form-input" style="flex:1;" value="${desc}" autocomplete="off">
    </div>
    </div>

    <div id="w-tab-cron" class="win-tab-content" style="display:none; height:180px; box-sizing:border-box; padding-top:5px">
    <div class="mip-form-group">
    <label style="width:110px; display:inline-block;">Expression:</label>
    <input type="text" id="mt-cron" class="mip-form-input" style="flex:1; font-family:monospace;" value="${cron || '0 0 * * * ?'}" autocomplete="off">
    </div>
    <div style="margin-top:15px; color:#555; background:#f4f7fb; padding:8px; border:1px solid #a3bae9; border-radius:3px; font-size:11px; line-height:14px;">
    ℹ Формат: Секунды Минуты Часы Дни Месяцы Дни_недели.
    </div>
    </div>`,

    renderConfirmDelete: (name) => `
    <div class="mip-confirm-icon-question">?</div>
    <div class="mip-confirm-text">Удалить правило планировщика "${name}"?</div>`
};
