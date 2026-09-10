/**
 * Модуль управления Advanced Options (ОЖИВЛЕННЫЙ)
 */
const mip_advoptions = {
    // Наша переменная отслеживания изменений (по умолчанию true - изменений нет)
    chk_chnges_state: true,

    // Переменная обратной совместимости для глобального роутера табов в app.js
    get isDirty() {
        return !this.chk_chnges_state;
    },
    set isDirty(val) {
        this.chk_chnges_state = !val;
    },

    render: () => `
    <div class="mip-panel-wrapper" style="background:#dfecfa; padding:8px; height:100%; display:flex; flex-direction:column; box-sizing:border-box">
    <ul class="x-tab-strip" style="margin:0; padding:0; flex-direction:row; display:flex; width:100%; border-bottom:1px solid #99bbe8; flex-shrink:0; list-style:none;">
    <li class="active" data-adv-tab="misc" data-text="Miscellaneous">Miscellaneous</li>
    <li data-adv-tab="store" data-text="Store Directory">Store Directory</li>
    <li data-adv-tab="auth" data-text="Master Auth">Master Auth</li>
    <li data-adv-tab="proxy" data-text="HTTP Proxy">HTTP Proxy</li>
    <li data-adv-tab="updates" data-text="Updates">Updates</li>
    </ul>
    <div id="adv-main-container" style="flex:1; background:#fff; border:1px solid #99bbe8; border-top:none; padding:15px; overflow-y:auto; display:flex; flex-direction:column; gap:30px; box-sizing:border-box">
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

    // Хранилище эталонного слепка данных, пришедшего с сервера (для отката по кнопке Reset)
    serverBak: null,

    async init() {
        const wrapper = document.querySelector(".mip-panel-wrapper");
        if (!wrapper) return;

        // 1. ИНТЕРАКТИВНОЕ ПЕРЕКЛЮЧЕНИЕ ТАБОВ
        const winTabs = wrapper.querySelectorAll("[data-adv-tab]");
        winTabs.forEach(tab => {
            tab.onclick = (e) => {
                e.stopPropagation();
                winTabs.forEach(t => { t.classList.remove("active"); t.style.background = "none"; t.style.borderColor = "transparent"; });
                tab.classList.add("active"); tab.style.borderColor = "#99bbe8"; tab.style.background = "#fff";
                wrapper.querySelectorAll(".adv-tab-pane").forEach(c => c.style.display = "none");
                const target = wrapper.querySelector(`#adv-tab-content-${tab.dataset.advTab}`);
                if (target) target.style.display = ["misc", "store"].includes(tab.dataset.advTab) ? "flex" : "block";
            };
        });

        // Клик по кнопке "Select Folder..." вызывает серверный проводник
        const btnSelectDir = document.getElementById("adv-btn-select-store-dir");
        if (btnSelectDir) {
            btnSelectDir.onclick = () => {
                const currentPathValue = document.getElementById("adv-store-path").value;
                mip_advoptions_store.openDirectoryBrowser(currentPathValue);
            };
        }
        // 2. ФУНКЦИЯ УПРАВЛЕНИЯ АКТИВНОСТЬЮ КНОПОК
        this.updateButtonsUI = () => {
            const btnApply = document.getElementById("adv-btn-apply");
            const btnReset = document.getElementById("adv-btn-reset");
            if (btnApply && btnReset) {
                btnApply.disabled = this.chk_chnges_state;
                btnReset.disabled = this.chk_chnges_state;
            }
        };

        // 3. ОБРАБОТЧИК ИЗМЕНЕНИЙ В ДЕРЕВЕ КОНТРОЛЛЕРОВ СИСТЕМЫ
        const onControlInput = () => {
            this.chk_chnges_state = false;
            this.updateButtonsUI();
        };

        const container = document.getElementById("adv-main-container");
        if (container) {
            container.addEventListener("input", onControlInput);
            container.addEventListener("change", onControlInput);
        }

        // Изначальный жесткий сброс состояния кнопок
        this.chk_chnges_state = true;
        this.updateButtonsUI();

        // 4. ОЖИВЛЕНО: ЗАПРОС ТЕКУЩИХ ЗНАЧЕНИЙ НАСТРОЕК ИЗ БАЗЫ ДАННЫХ
        try {
            const res = await fetch("/api/mip-adv/advoptions");
            if (res.ok) {
                const data = await res.json();

                // Сохраняем слепок данных во внутреннюю память для Reset
                this.serverBak = {
                    path: data.path,
                    http_port: data.http_port,
                    https_port: data.https_port,
                    https_status: data.https_status,
                    // Заполняем дефолтные флаги для исключения падений serialize
                    search: false, soft: "1", soft_u: "GB", hard: "100", hard_u: "MB",
                    quota: "90", quota_a: "Once", email: "admin@kapavto.by",
                    cache: true, interval: "10"
                };

                // Распределяем реальные данные из БД по инпутам вкладок
                mip_advoptions_misc.deserialize(this.serverBak);
                mip_advoptions_store.deserialize(this.serverBak);
            }
        } catch (err) {
            console.error("Ошибка загрузки конфигурации из БД:", err);
        }

        // КНОПКА RESET: Откатывает поля к эталонному слепку serverBak
        document.getElementById("adv-btn-reset").onclick = () => {
            if (this.chk_chnges_state || !this.serverBak) return;

            mip_advoptions_misc.deserialize(this.serverBak);
            mip_advoptions_store.deserialize(this.serverBak);

            this.chk_chnges_state = true;
            this.updateButtonsUI();
        };

        // КНОПКА APPLY: Отправляет измененный Key-Value JSON-пакет в SQLite
        document.getElementById("adv-btn-apply").onclick = async () => {
            if (this.chk_chnges_state) return;

            // Атомарно собираем данные со всех обособленных вкладок
            const miscData = mip_advoptions_misc.serialize();
            const storeData = mip_advoptions_store.serialize();

            // Формируем плоский пакет под контракт бэкенда AdvOptionsResponse
            const payload = {
                path: storeData.path, // Наш инпут adv-store-path
                http_port: "3000",    // Значения по умолчанию, пока не вывели инпуты портов в макет
                https_port: "3001",
                https_status: "off"
            };

            try {
                const res = await fetch("/api/mip-adv/advoptions/save", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload)
                });
                const result = await res.json();

                if (result.success) {
                    // Обновляем локальный слепок бэкапа на новое сохраненное состояние
                    this.serverBak.path = payload.path;

                    this.chk_chnges_state = true;
                    this.updateButtonsUI();
                    alert("Настройки конфигурации успешно сохранены в БД!");
                } else {
                    alert("Ошибка сохранения настроек на стороне бэкенда.");
                }
            } catch (err) {
                console.error("Сетевая ошибка сохранения параметров:", err);
                alert("Не удалось сохранить конфигурацию: ошибка сети.");
            }
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
        <div class="mip-confirm-body" style="padding:15px 12px">
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
