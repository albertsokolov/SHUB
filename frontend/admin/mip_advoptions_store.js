/**
 * Модуль вкладки Store Directory (SHUB Core)
 */
const mip_advoptions_store = {
    render: () => `
    <div id="adv-tab-content-store" class="adv-tab-pane" style="display:none; flex-direction:column; gap:30px">

    <!-- ПЕРЕНЕСЕННЫЙ БЛОК: Directory location -->
    <fieldset class="adv-fs">
    <legend>Directory location</legend>
    <div class="adv-row"><label>Path to the store directory:</label><input type="text" id="adv-store-path" class="mip-form-input" style="flex:1; max-width:400px" value="/store/"><button class="mip-btn">Select Folder...</button></div>
    <div class="adv-info">
    <div>ℹ Network storage is not recommended. It can cause corruption of files. <a href="#">Learn more...</a></div>
    <div>ℹ If you change the path, you must stop the server, copy old files to the new location and restart.</div>
    </div>
    </fieldset>

    <fieldset class="adv-fs">
    <legend>Mail store options</legend>
    <div class="adv-row" style="font-weight:bold"><input type="checkbox" id="adv-store-free-cache" checked><label for="adv-store-free-cache">Enable free space caching mode</label></div>
    <div class="adv-row"><label>Cache update interval:</label><input type="number" id="adv-store-interval" class="mip-form-input" style="width:70px" value="10"><span>seconds</span></div>
    </fieldset>
    </div>`,

    serialize: () => ({
        path: document.getElementById("adv-store-path")?.value || "",
                      cache: document.getElementById("adv-store-free-cache")?.checked || false,
                      interval: document.getElementById("adv-store-interval")?.value || ""
    }),

    deserialize: (data) => {
        if (!data) return;
        const elStorePath = document.getElementById("adv-store-path");
        const elCache = document.getElementById("adv-store-free-cache");
        const elInt = document.getElementById("adv-store-interval");

        if (elStorePath && data.path !== undefined) elStorePath.value = data.path;
        if (elCache && data.cache !== undefined) elCache.checked = data.cache;
        if (elInt && data.interval !== undefined) elInt.value = data.interval;
    }
};
