/**
 * Модуль вкладки Miscellaneous (SHUB Core)
 */
const mip_advoptions_misc = {
    render: () => `
    <div id="adv-tab-content-misc" class="adv-tab-pane" style="display:flex; flex-direction:column; gap:30px">

    <fieldset class="adv-fs">
    <legend>Full text search</legend>
    <div class="adv-row" style="font-weight:bold"><input type="checkbox" id="adv-enable-search"><label for="adv-enable-search">Enable full text search</label></div>
    <div class="adv-row"><label>Index location:</label><input type="text" id="adv-index-path" class="mip-form-input" style="flex:1; max-width:400px" value="/opt/kerio/mailserver/store/fulltext" disabled><button class="mip-btn" disabled>Select Folder...</button></div>
    <div style="margin-left:170px; color:#666">ℹ Network storage is not recommended. <a href="#">Learn more...</a></div>
    <div style="margin-left:170px; color:#555; display:flex; flex-direction:column; gap:4px">
    <div>Index status: <span>Full text search is disabled</span></div>
    <div>Index size: <span>—</span></div>
    </div>
    <button class="mip-btn" style="margin-left:170px; width:120px" disabled>Rebuild Index...</button>
    </fieldset>

    <fieldset class="adv-fs">
    <legend>Storage space watchdog (minimum of free disk space required)</legend>
    <div class="adv-row"><label>Watchdog Soft Limit:</label><input type="number" id="adv-watchdog-soft" class="mip-form-input" style="width:70px" value="1"><select id="adv-watchdog-soft-unit" class="adv-sel"><option>GB</option><option>MB</option></select><span>If the available disk space drops below this value, a warning message is displayed.</span></div>
    <div class="adv-row"><label>Watchdog Hard Limit:</label><input type="number" id="adv-watchdog-hard" class="mip-form-input" style="width:70px" value="100"><select id="adv-watchdog-hard-unit" class="adv-sel"><option>MB</option><option>GB</option></select><span>If the available disk space drops below this value, Kerio Connect is stopped.</span></div>
    </fieldset>

    <fieldset class="adv-fs">
    <legend>User quota</legend>
    <div class="adv-row"><label>Warning limit:</label><input type="number" id="adv-quota-limit" class="mip-form-input" style="width:60px" value="90"><span>%</span></div>
    <div class="adv-row"><label>If the warning limit is reached:</label><select id="adv-quota-action" class="adv-sel" style="width:150px"><option>Once</option><option>Daily</option></select></div>
    <div class="adv-row"><label>Send a message to this address:</label><input type="text" id="adv-quota-email" class="mip-form-input" style="width:250px" value="tyutyu" placeholder="admin@kapavto.by"></div>
    </fieldset>
    </div>`,

    serialize: () => ({
        search: document.getElementById("adv-enable-search")?.checked || false,
                      soft: document.getElementById("adv-watchdog-soft")?.value || "",
                      soft_u: document.getElementById("adv-watchdog-soft-unit")?.value || "GB",
                      hard: document.getElementById("adv-watchdog-hard")?.value || "",
                      hard_u: document.getElementById("adv-watchdog-hard-unit")?.value || "MB",
                      quota: document.getElementById("adv-quota-limit")?.value || "",
                      quota_a: document.getElementById("adv-quota-action")?.value || "Once",
                      email: document.getElementById("adv-quota-email")?.value || ""
    }),

    deserialize: (data) => {
        if (!data) return;
        const setVal = (id, val, prop = 'value') => { const el = document.getElementById(id); if (el) el[prop] = val; };
        setVal("adv-enable-search", data.search, "checked");
        setVal("adv-watchdog-soft", data.soft);
        setVal("adv-watchdog-soft-unit", data.soft_u);
        setVal("adv-watchdog-hard", data.hard);
        setVal("adv-watchdog-hard-unit", data.hard_u);
        setVal("adv-quota-limit", data.quota);
        setVal("adv-quota-action", data.quota_a);
        setVal("adv-quota-email", data.email);
    }
};
