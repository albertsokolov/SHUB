const mp_configuration = {
    render() {
        return `
        <div id="menu_panel_configuration" class="menu-sub-panel hide">
        <ul class="menu-tree">
        <li data-action="net-ports"><span class="icon icon-cloud-cfg"></span>Сетевые порты</li>
        <li data-action="db-crypto"><span class="icon icon-doc-cfg"></span>Шифрование БД</li>
        <li data-action="ssl-certs"><span class="icon icon-cert"></span>Сертификаты SSL</li>
        </ul>
        </div>
        `;
    }
};

