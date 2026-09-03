/**
 * Модуль вкладки Miscellaneous (SHUB Core)
 */
const mip_advoptions_misc = {
    render: () => `
    <div id="adv-tab-content-misc" class="adv-tab-pane" style="display:flex; flex-direction:column; gap:30px">
    <fieldset class="adv-fs">
    <legend>Directory location</legend>
    <div class="adv-row"><label>Path to the store directory:</label><input type="text" id="adv-store-path" class="mip-form-input" style="flex:1; max-width:400px" value="/store/"><button class="mip-btn">Select Folder...</button></div>
    <div class="adv-info">
    <div>ℹ Network storage is not recommended. It can cause corruption of files. <a href="#">Learn more...</a></div>
    <div>ℹ If you change the path, you must stop the server, copy old files to the new location and restart.</div>
    </div>
    </fieldset>

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
    <div class="adv-row"><label>Send a message to this address:</label><input type="text" id="adv-quota-email" class="mip-form-input" style="width:250px" placeholder="admin@kapavto.by"></div>
    </fieldset>
    </div>`,

    serialize: () => ({
        path: document.getElementById("adv-store-path")?.value || "",
                      search: document.getElementById("adv-enable-search")?.checked || false,
                      soft: document.getElementById("adv-watchdog-soft")?.value || "",
                      soft_u: document.getElementById("adv-watchdog-soft-unit")?.value || "",
                      hard: document.getElementById("adv-watchdog-hard")?.value || "",
                      hard_u: document.getElementById("adv-watchdog-hard-unit")?.value || "",
                      quota: document.getElementById("adv-quota-limit")?.value || "",
                      quota_a: document.getElementById("adv-quota-action")?.value || "",
                      email: document.getElementById("adv-quota-email")?.value || ""
    }),

    deserialize: (orig) => {
        if (!orig) return;
        if (document.getElementById("adv-store-path")) document.getElementById("adv-store-path").value = orig.path;
        if (document.getElementById("adv-enable-search")) document.getElementById("adv-enable-search").checked = orig.search;
        if (document.getElementById("adv-watchdog-soft")) document.getElementById("adv-watchdog-soft").value = orig.soft;
        if (document.getElementById("adv-watchdog-soft-unit")) document.getElementById("adv-watchdog-soft-unit").value = orig.soft_u;
        if (document.getElementById("adv-watchdog-hard")) document.getElementById("adv-watchdog-hard").value = orig.hard;
        if (document.getElementById("adv-watchdog-hard-unit")) document.getElementById("adv-watchdog-hard-unit").value = orig.hard_u;
        if (document.getElementById("adv-quota-limit")) document.getElementById("adv-quota-limit").value = orig.quota;
        if (document.getElementById("adv-quota-action")) document.getElementById("adv-quota-action").value = orig.quota_a;
        if (document.getElementById("adv-quota-email")) document.getElementById("adv-quota-email").value = orig.email;
    }
};
