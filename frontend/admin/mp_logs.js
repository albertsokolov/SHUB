const mp_logs = {
    render() {
        return `
        <div id="menu_panel_logs" class="menu-sub-panel hide">
        <ul class="menu-tree">
        <li data-action="sys-journal"><span class="icon icon-doc-list"></span>Системный журнал</li>
        <li data-action="db-errors"><span class="icon icon-doc-danger"></span>Ошибки БД</li>
        <li data-action="audit"><span class="icon icon-secure-work"></span>Аудит входов</li>
        </ul>
        </div>
        `;
    }
};

