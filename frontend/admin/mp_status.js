const mp_status = {
    render() {
        return `
        <div id="menu_panel_status" class="menu-sub-panel active">
        <ul class="menu-tree">
        <li class="active" data-action="dashboard"><span class="icon icon-dashboard"></span>Dashboard</li>
        <li data-action="msg-queue"><span class="icon icon-nic"></span>Очередь сообщений</li>
        <li data-action="traffic-charts"><span class="icon icon-axes"></span>Диаграммы трафика</li>
        <li data-action="statistics"><span class="icon icon-db-chart"></span>Статистика</li>
        <li data-action="active-connections"><span class="icon icon-connections"></span>Активные соединения</li>
        <li data-action="open-folders"><span class="icon icon-doc-globe"></span>Открытые папки</li>
        <li data-action="sys-state"><span class="icon icon-monitor"></span>Состояние системы</li>
        </ul>
        </div>
        `;
    }
};

