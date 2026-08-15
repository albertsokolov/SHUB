const mp_status = {
    render() {
        return `
        <div id="menu_panel_status" class="menu-sub-panel active">
        <ul class="menu-tree">
        <li class="active" data-action="dashboard"><span class="icon icon-dashboard"></span>Dashboard</li>
        <li data-action="msg-queue"><span class="icon icon-queue"></span>Очередь сообщений</li>
        <li data-action="traffic-charts"><span class="icon icon-charts"></span>Диаграммы трафика</li>
        <li data-action="statistics"><span class="icon icon-stats"></span>Статистика</li>
        <li data-action="active-connections"><span class="icon icon-connections"></span>Активные соединения</li>
        <li data-action="open-folders"><span class="icon icon-folders"></span>Открытые папки</li>
        <li data-action="sys-state"><span class="icon icon-sys"></span>Состояние системы</li>
        </ul>
        </div>
        `;
    }
};
