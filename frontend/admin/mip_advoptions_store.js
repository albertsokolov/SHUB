/**
 * Модуль вкладки Store Directory (SHUB Core)
 */
const mip_advoptions_store = {
    render: () => `
    <div id="adv-tab-content-store" class="adv-tab-pane" style="display:none; flex-direction:column; gap:30px">
    <fieldset class="adv-fs">
    <legend>Mail store options</legend>
    <div class="adv-row" style="font-weight:bold"><input type="checkbox" id="adv-store-free-cache" checked><label for="adv-store-free-cache">Enable free space caching mode</label></div>
    <div class="adv-row"><label>Cache update interval:</label><input type="number" id="adv-store-interval" class="mip-form-input" style="width:70px" value="10"><span>seconds</span></div>
    </fieldset>
    </div>`,

    serialize: () => ({
        cache: document.getElementById("adv-store-free-cache")?.checked || false,
                      interval: document.getElementById("adv-store-interval")?.value || ""
    }),

    deserialize: (orig) => {
        if (!orig) return;
        if (document.getElementById("adv-store-free-cache")) document.getElementById("adv-store-free-cache").checked = orig.cache;
        if (document.getElementById("adv-store-interval")) document.getElementById("adv-store-interval").value = orig.interval;
    }
};
