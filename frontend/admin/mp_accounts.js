const mp_accounts = {
    render() {
        return `
        <div id="menu_panel_accounts" class="menu-sub-panel hide">
        <ul class="menu-tree">
        <li data-action="user-list"><span class="icon icon-user"></span>Список пользователей</li>
        <li data-action="group-list"><span class="icon icon-groups"></span>Группы и роли</li>
        <li data-action="sessions"><span class="icon icon-operator"></span>Активные сессии</li>
        </ul>
        </div>
        `;
    }
};

