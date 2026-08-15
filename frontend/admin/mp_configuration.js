const mp_configuration = {
    render() {
        return `
        <div id="menu_panel_configuration" class="menu-sub-panel hide">
        <ul class="menu-tree">
        <li data-action="net-ports"><span class="icon icon-ports"></span>Сетевые порты</li>
        <li data-action="db-crypto"><span class="icon icon-crypto"></span>Шифрование БД</li>
        <li data-action="ssl-certs"><span class="icon icon-ssl"></span>Сертификаты SSL</li>
        </ul>
        </div>
        `;
    }
};
