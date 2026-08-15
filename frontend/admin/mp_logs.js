const mp_logs = {
    render() {
        return `
        <div id="menu_panel_logs" class="menu-sub-panel hide">
        <ul class="menu-tree">
        <li data-action="sys-journal"><span class="icon icon-journal"></span>Системный журнал</li>
        <li data-action="db-errors"><span class="icon icon-error"></span>Ошибки БД</li>
        <li data-action="audit"><span class="icon icon-audit"></span>Аудит входов</li>
        </ul>
        </div>
        `;
    }
};
