/**
 * Модуль вкладки Store Directory (SHUB Core)
 */
const mip_advoptions_store = {
    render: () => `
    <div id="adv-tab-content-store" class="adv-tab-pane" style="display:none; flex-direction:column; gap:30px">

    <!-- БЛОК: Directory location -->
    <fieldset class="adv-fs">
    <legend>Directory location</legend>
    <div class="adv-row">
    <label>Path to the store directory:</label>
    <input type="text" id="adv-store-path" class="mip-form-input" style="flex:1; max-width:400px" value="/store/">
    <!-- ИСПРАВЛЕНО: Добавлен ID для привязки диалога выбора папки -->
    <button class="mip-btn" id="adv-btn-select-store-dir">Select Folder...</button>
    </div>
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
    },

    // НОВЫЙ МЕТОД: Генерация и рендеринг серверного проводника папок
    async openDirectoryBrowser(initialPath) {
        if (document.getElementById("mip-dir-browser-overlay")) return;

        const overlay = document.createElement("div");
        Object.assign(overlay, { id: "mip-dir-browser-overlay", className: "mip-modal-overlay" });
        overlay.style.zIndex = "3500"; // Поверх всех окон

        overlay.innerHTML = `
        <div class="mip-modal-window" style="width: 480px;">
        <div class="mip-modal-header">
        <div class="mip-modal-title"><span class="icon icon-doc-globe" style="width:14px;height:14px;background-size:900% 500%"></span><span>Select Server Directory</span></div>
        <div class="mip-modal-close-btn" id="mdb-close">X</div>
        </div>
        <div class="mip-modal-body" style="gap:8px;">
        <div style="display:flex; gap:6px; align-items:center;">
        <span style="font-weight:bold; color:#15428b;">Current path:</span>
        <input type="text" id="mdb-current-input" class="mip-form-input" style="background:#f0f0f0;" readonly>
        <button class="mip-btn" id="mdb-btn-up" style="font-weight:bold; padding:2px 8px;">⬉ Up</button>
        </div>

        <!-- Список папок в стиле ExtJS сетки -->
        <div class="mip-table-container" style="height:220px; margin:4px 0; border:1px solid #99bbe8; overflow-y:auto; background:#fff;">
        <table class="mip-grid">
        <tbody id="mdb-dir-tbody"></tbody>
        </table>
        </div>
        </div>
        <div class="mip-modal-footer">
        <button class="mip-btn" id="mdb-btn-ok" style="font-weight:bold; width:70px;">Select</button>
        <button class="mip-btn" id="mdb-btn-cancel" style="width:70px;">Cancel</button>
        </div>
        </div>`;

        document.body.appendChild(overlay);

        let activePath = initialPath || "";

        // Внутренняя функция асинхронного обновления списка папок
        const refreshList = async (pathToSend) => {
            const tbody = document.getElementById("mdb-dir-tbody");
            const currentInput = document.getElementById("mdb-current-input");
            const btnUp = document.getElementById("mdb-btn-up");
            if (!tbody) return;

            tbody.innerHTML = `<tr><td style="padding:8px; color:#666;">Reading filesystem...</td></tr>`;

            try {
                const res = await fetch(`/api/mip-adv/browse-dir?path=${encodeURIComponent(pathToSend)}`);
                if (!res.ok) throw new Error("Директория недоступна");

                const data = await res.json();
                activePath = data.current_path;
                if (currentInput) currentInput.value = activePath;

                // Управляем кнопкой "Вверх"
                if (btnUp) btnUp.disabled = !data.parent_path;
                if (btnUp) btnUp.dataset.parent = data.parent_path || "";

                if (data.folders.length === 0) {
                    tbody.innerHTML = `<tr><td style="padding:8px; color:#999; font-style:italic;">— Нет вложенных папок —</td></tr>`;
                    return;
                }

                tbody.innerHTML = data.folders.map(f => `
                <tr class="mip-row mdb-row-folder" data-abs-path="${mip_advoptions.esc(f.absolute_path)}">
                <td style="display:flex; align-items:center; gap:8px; padding:4px 8px;">
                <span class="icon icon-net-tree" style="width:16px; height:16px; background-size:900% 500%!important; margin:0;"></span>
                <span style="color:#000;">${mip_advoptions.esc(f.name)}</span>
                </td>
                </tr>`).join('');

                // Вешаем события навигации по клику
                tbody.querySelectorAll(".mdb-row-folder").forEach(tr => {
                    tr.onclick = (e) => {
                        tbody.querySelectorAll(".mdb-row-folder").forEach(r => r.style.background = "");
                        tr.style.background = "#cbdcf2"; // Выделение папки
                        activePath = tr.dataset.absPath;
                        if (currentInput) currentInput.value = activePath;
                    };
                        // Двойной клик заходит внутрь папки
                        tr.ondblclick = () => {
                            refreshList(tr.dataset.absPath);
                        };
                });

            } catch (err) {
                tbody.innerHTML = `<tr><td style="padding:8px; color:red;">Ошибка доступа к пути.</td></tr>`;
            }
        };

        // Навешиваем обработчики кнопок диалога
        document.getElementById("mdb-btn-up").onclick = () => {
            const parent = document.getElementById("mdb-btn-up").dataset.parent;
            if (parent) refreshList(parent);
        };

            const closeDialog = () => overlay.remove();
            document.getElementById("mdb-close").onclick = document.getElementById("mdb-btn-cancel").onclick = closeDialog;

            document.getElementById("mdb-btn-ok").onclick = () => {
                const inputPath = document.getElementById("adv-store-path");
                if (inputPath) {
                    inputPath.value = activePath;
                    // Инициируем триггер изменений формы, чтобы зажечь кнопки Apply/Reset
                    inputPath.dispatchEvent(new Event('input', { bubbles: true }));
                }
                closeDialog();
            };

            // Запускаем первичное чтение папки
            refreshList(activePath);
    }
};
