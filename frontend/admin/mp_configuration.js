const mp_configuration = {
    render() {
        return `
        <div id="menu_panel_configuration" class="menu-sub-panel hide">
        <ul class="menu-tree">
        <li data-action="domains"><span class="icon icon-doc-globe"></span>Domains</li>
        <li data-action="modules"><span class="icon icon-cloud-cfg"></span>Modules</li>
        <li data-action="services"><span class="icon icon-doc-gear"></span>Services</li>
        <li data-action="ports"><span class="icon icon-nic"></span>Ports</li>
        <li data-action="advancedOptions"><span class="icon icon-tools"></span>Advanced Options</li>
        </ul>
        </div>
        `;
    }
};


