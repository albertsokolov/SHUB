/**
 * Модуль управления MIP-панелью Advanced Options (Диспетчер)
 */
const mip_advoptions = {
    originalData: null,
    isDirty: false,

    render: () => `
    <div class="mip-panel-wrapper" style="background:#dfecfa; padding:8px; height:100%; display:flex; flex-direction:column; box-sizing:border-box">
    <ul class="x-tab-strip" style="margin:0; padding:0; flex-direction:row; display:flex; width:100%; border-bottom:1px solid #99bbe8; flex-shrink:0; list-style:none;">
    <li class="active" data-adv-tab="misc" data-text="Miscellaneous">Miscellaneous</li>
    <li data-adv-tab="store" data-text="Store Directory">Store Directory</li>
    <li data-adv-tab="auth" data-text="Master Auth">Master Auth</li>
    <li data-adv-tab="proxy" data-text="HTTP Proxy">HTTP Proxy</li>
    <li data-adv-tab="updates" data-text="Updates">Updates</li>
    </ul>

    <div style="flex:1; background:#fff; border:1px solid #99bbe8; border-top:none; padding:15px; overflow-y:auto; display:flex; flex-direction:column; gap:30px; box-sizing:border-box">
    <!-- Динамически внедряем контент обособленных вкладок -->
    ${mip_advoptions_misc.render()}
    ${mip_advoptions_store.render()}

    <div id="adv-tab-content-auth" class="adv-tab-pane" style="display:none">Параметры Master Authentication подгружаются...</div>
    <div id="adv-tab-content-proxy" class="adv-tab-pane" style="display:none">Конфигурация HTTP Proxy подгружаются...</div>
    <div id="adv-tab-content-updates" class="adv-tab-pane" style="display:none">Управление Software Updates подгружаются...</div>
    </div>

    <div style="height:40px; display:flex; justify-content:flex-end; align-items:center; gap:6px; padding:0 8px; flex-shrink:0">
    <button class="mip-btn" id="adv-btn-apply" disabled style="font-weight:bold; width:80px">Apply</button>
    <button class="mip-btn" id="adv-btn-reset" disabled style="width:80px">Reset</button>
    </div>
    </div>`,

    async init() {
        const wrapper = document.querySelector(".mip-panel-wrapper");
        if (!wrapper) return;

        const winTabs = wrapper.querySelectorAll("[data-adv-tab]");
        winTabs.forEach(tab => {
            tab.onclick = (e) => {
                e.stopPropagation();
                winTabs.forEach(t => { t.classList.remove("active"); t.style.background = "none"; t.style.borderColor = "transparent"; });
                tab.classList.add("active"); tab.style.borderColor = "#99bbe8"; tab.style.background = "#fff";

                wrapper.querySelectorAll(".adv-tab-pane").forEach(c => c.style.display = "none");
                const target = wrapper.querySelector(`#adv-tab-content-${tab.dataset.advTab}`);
                if (target) target.style.display = (tab.dataset.advTab === "misc" || tab.dataset.advTab === "store") ? "flex" : "block";
            };
        });

        // Объединенная сериализация всей формы из разных файлов
        this.serializeForm = () => JSON.stringify({
            misc: mip_advoptions_misc.serialize(),
                                                  store: mip_advoptions_store.serialize()
        });

        this.checkChanges = () => {
            this.isDirty = this.serializeForm() !== this.originalData;
            document.getElementById("adv-btn-apply").disabled = !this.isDirty;
            document.getElementById("adv-btn-reset").disabled = !this.isDirty;
        };

        const contentBox = wrapper.querySelector("div[style*='flex:1']");
        contentBox.oninput = contentBox.onchange = () => this.checkChanges();

        const loadSettings = async () => {
            try {
                await fetch("/api/mip-adv/advoptions");
                this.originalData = this.serializeForm();
                this.isDirty = false;
                this.checkChanges();
            } catch (err) { console.error(err); }
        };

        await loadSettings();

        document.getElementById("adv-btn-reset").onclick = () => {
            if (!this.isDirty) return;
            const orig = JSON.parse(this.originalData);
            mip_advoptions_misc.deserialize(orig.misc);
            mip_advoptions_store.deserialize(orig.store);
            this.isDirty = false;
            this.checkChanges();
        };

        document.getElementById("adv-btn-apply").onclick = () => {
            if (!this.isDirty) return;
            this.originalData = this.serializeForm();
            this.isDirty = false;
            this.checkChanges();
            alert("Настройки успешно сохранены!");
        };
    },

    showLeaveConfirm(onSave, onDiscard, onCancel) {
        if (document.getElementById("mip-confirm-leave-overlay")) return;
        const overlay = document.createElement("div");
        Object.assign(overlay, { id: "mip-confirm-leave-overlay", className: "mip-modal-overlay" });
        overlay.style.zIndex = "3000";
        overlay.innerHTML = `
        <div class="mip-confirm-window" style="width: 380px;">
        <div class="mip-modal-header"><div class="mip-modal-title">Confirm</div><div class="mip-modal-close-btn" id="m-leave-close">X</div></div>
        <div class="mip-confirm-body" style="padding: 15px 12px;">
        <div class="mip-confirm-icon-question">?</div>
        <div class="mip-confirm-text" style="font-size:12px; font-family:Tahoma">You have modified data in this section. Do you want to save changes?</div>
        </div>
        <div class="mip-modal-footer" style="padding-bottom: 8px">
        <button class="mip-btn" id="m-leave-yes" style="font-weight:bold; width:65px">Yes</button>
        <button class="mip-btn" id="m-leave-no" style="width:65px">No</button>
        <button class="mip-btn" id="m-leave-cancel" style="width:65px">Cancel</button>
        </div>
        </div>`;
        document.body.appendChild(overlay);
        const close = () => overlay.remove();
        document.getElementById("m-leave-close").onclick = document.getElementById("m-leave-cancel").onclick = () => { close(); onCancel(); };
        document.getElementById("m-leave-yes").onclick = () => { close(); onSave(); };
        document.getElementById("m-leave-no").onclick = () => { close(); onDiscard(); };
    },
    esc: s => s ? s.replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m])) : '—'
};
