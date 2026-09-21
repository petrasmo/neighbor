// js/ukis/templates/fieldsTemplate.js

export function getMainFieldsHtml(todayStr) {
    return `
        <div class="space-y-6 max-w-6xl mx-auto w-full">
            
            <!-- HEADERIS -->
            <div class="border-b border-tractorBorder pb-4">
                <h2 class="font-oswald text-2xl md:text-3xl font-bold uppercase tracking-wider text-white flex items-center gap-2">
                    <span>🗺️</span> Mano Laukai ir Gyvas Sentinel-2 NDVI Palydovas
                </h2>
                <p class="text-xs md:text-sm text-slate-300 mt-1">
                    Tikrasis Europos Kosmoso Agentūros (ESA) Sentinel-2 NDVI spektras, NMA laukų importas ir laukų valdymas.
                </p>
            </div>

            <!-- BRAIŽYMO BANERIS -->
            <div id="draw-helper-banner" class="hidden bg-tractorPrimary/20 border border-tractorPrimary text-tractorPrimaryLight p-3.5 rounded-xl text-xs font-semibold">
                📍 Spauskite ant žemėlapio taškus aplink lauko ribas. Baigę spauskite „Išsaugoti lauką“ viršuje.
            </div>

            <!-- 1. PALYDOVINIS IR NDVI ŽEMĖLAPIS SU KONTROLIŲ JUOSTA -->
            <div class="bg-tractorSurface border border-tractorBorder rounded-2xl p-4 md:p-5 shadow-xl space-y-3 w-full">
                <div class="bg-tractorBg border border-tractorBorder p-3 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs">
                    <div class="flex items-center gap-2">
                        <span class="text-base">📅</span>
                        <strong class="text-white">Palydovo data:</strong>
                        <input id="sentinel-date-input" type="date" value="${todayStr}" max="${todayStr}"
                            class="bg-tractorSurface border border-tractorBorder focus:border-tractorPrimary rounded-lg px-2.5 py-1 text-white font-mono font-bold outline-none cursor-pointer">
                    </div>

                    <!-- KONTROLIAI IR MYGTUKAI -->
                    <div class="flex flex-wrap items-center gap-2">
                        <span class="text-slate-400">Debesys:</span>
                        <select id="sentinel-cloud-select" class="bg-tractorSurface border border-tractorBorder rounded-lg py-1 px-2 text-white font-bold outline-none cursor-pointer">
                            <option value="15">15%</option>
                            <option value="25" selected>25%</option>
                            <option value="40">40%</option>
                        </select>
                        
                        <button id="btn-refresh-satellite" class="px-3 py-1 bg-tractorPrimary hover:bg-tractorPrimaryHover text-white rounded-lg font-bold transition cursor-pointer">
                            🔄 Atnaujinti
                        </button>

                        <button id="btn-import-nma-modal" class="px-3.5 py-1.5 bg-tractorSurface hover:bg-zinc-800 text-blue-400 border border-blue-500/60 font-bold rounded-lg flex items-center gap-1.5 transition cursor-pointer">
                            <span>📁</span> Įkelti NMA laukus
                        </button>
                        <input type="file" id="nma-file-hidden-input" accept=".geojson,.json" class="hidden">

                        <button id="btn-start-draw" class="px-3.5 py-1.5 bg-tractorPrimary hover:bg-tractorPrimaryHover text-white font-bold rounded-lg flex items-center gap-1.5 shadow transition cursor-pointer">
                            <span>✏️</span> Brėžti lauką
                        </button>

                        <button id="btn-save-draw-toolbar" class="px-3.5 py-1.5 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg shadow hidden transition cursor-pointer">
                            Išsaugoti lauką
                        </button>
                        
                        <button id="btn-cancel-draw" class="px-3.5 py-1.5 bg-red-950/40 hover:bg-red-900 border border-red-800/60 text-red-300 rounded-lg font-bold hidden transition cursor-pointer">
                            ✕ Atšaukti
                        </button>
                    </div>
                </div>

                <div id="fields-map" class="h-[530px] w-full rounded-xl z-0 relative overflow-hidden border border-tractorBorder/80 bg-zinc-900"></div>

                <div class="flex justify-between items-center text-xs md:text-sm text-slate-300 px-1 pt-1">
                    <span>🛰️ Gyvas Copernicus Sentinel-2 vaizdas su 10m NDVI analize</span>
                    <span>Viso ūkio plotas: <strong id="total-area-counter" class="text-green-400 font-bold text-base">0.00 ha</strong></span>
                </div>
            </div>

            <!-- 2. LAUKŲ SĄRAŠAS EILUTĖMIS -->
            <div class="bg-tractorSurface border border-tractorBorder rounded-2xl p-6 md:p-8 shadow-xl space-y-4">
                <div class="flex justify-between items-center border-b border-tractorBorder/70 pb-3">
                    <h3 class="font-oswald text-xl md:text-2xl font-bold uppercase tracking-wider flex items-center gap-2" style="color: var(--text-main);">
                        <span>📋</span> Visi ūkio laukai (<span id="fields-count-badge">0</span>)
                    </h3>
                    <span class="text-xs text-slate-400">Paspauskite „Atverti pasą →“ redagavimui ar trynimui.</span>
                </div>

                <div id="fields-table-list" class="space-y-3 pt-1">
                    <div class="text-center py-8 text-slate-500 text-xs">Kraunami jūsų laukai...</div>
                </div>
            </div>

            <!-- MODALAS: NAUJO LAUKO IŠSAUGOJIMAS (BOTTOM SHEET) -->
            <div id="field-save-modal" class="fixed inset-0 bg-black/80 z-[9999] hidden flex flex-col justify-end items-center p-0 backdrop-blur-sm transition-all duration-300">
                <div class="bg-tractorSurface border-t-2 border-x-2 border-b-0 border-tractorBorder rounded-t-3xl rounded-b-none p-6 md:p-8 pb-12 max-h-[90vh] overflow-y-auto max-w-xl w-full space-y-4 shadow-2xl relative transform transition-transform duration-300">
                    <div class="flex justify-between items-center border-b border-tractorBorder pb-3">
                        <h3 class="font-oswald text-xl font-bold text-white uppercase tracking-wider">Išsaugoti naują lauką</h3>
                        <button type="button" id="btn-close-save-modal" class="text-slate-400 hover:text-white text-2xl font-bold cursor-pointer">&times;</button>
                    </div>

                    <form id="save-field-form" class="space-y-4">
                        <div class="space-y-1">
                            <label class="text-xs font-bold text-slate-300 uppercase">Lauko pavadinimas *</label>
                            <input id="field-name-input" type="text" required autocomplete="off" placeholder="Pvz.: Prie miško" 
                                class="w-full h-11 bg-tractorBg border border-tractorBorder rounded-xl px-3.5 text-xs text-white outline-none">
                        </div>

                        <div class="grid grid-cols-2 gap-3">
                            <div class="space-y-1">
                                <label class="text-xs font-bold text-slate-300 uppercase">Plotas</label>
                                <input id="field-area-input" type="text" readonly class="w-full h-11 bg-tractorBg/50 border border-tractorBorder rounded-xl px-3.5 text-xs text-green-400 font-bold outline-none">
                            </div>
                            <div class="space-y-1">
                                <label class="text-xs font-bold text-slate-300 uppercase">Bloko Nr.</label>
                                <input id="field-block-input" type="text" autocomplete="off" placeholder="Pvz.: 123-01" class="w-full h-11 bg-tractorBg border border-tractorBorder rounded-xl px-3.5 text-xs text-white outline-none">
                            </div>
                        </div>

                        <div class="space-y-1">
                            <label class="text-xs font-bold text-tractorPrimaryLight uppercase">Pasėlis</label>
                            <select id="field-crop-select" class="w-full h-11 bg-tractorBg border border-tractorBorder rounded-xl px-3 text-xs text-white outline-none cursor-pointer">
                                <option value="Žieminiai kviečiai">🌾 Žieminiai kviečiai</option>
                                <option value="Žieminiai rapsai">🌱 Žieminiai rapsai</option>
                                <option value="Vasariniai miežiai">🌾 Vasariniai miežiai</option>
                                <option value="Žirniai / Pupos">🫘 Žirniai / Pupos</option>
                                <option value="Kukurūzai">🌽 Kukurūzai</option>
                            </select>
                        </div>

                        <div class="space-y-1">
                            <label class="text-xs font-bold text-slate-300 uppercase">Pastabos</label>
                            <input id="field-notes-input" type="text" autocomplete="off" placeholder="Pastabos" class="w-full h-11 bg-tractorBg border border-tractorBorder rounded-xl px-3 text-xs text-white outline-none">
                        </div>

                        <button type="submit" class="w-full h-12 bg-tractorPrimary hover:bg-tractorPrimaryHover text-white font-extrabold rounded-xl text-xs uppercase tracking-wider shadow transition cursor-pointer flex items-center justify-center">
                            Išsaugoti lauką
                        </button>
                    </form>
                </div>
            </div>

            <!-- 🌟 MODALAS: REDAGAVIMAS + TRYNIMAS (TIKRAS BOTTOM SHEET SU IŠSAUGOTI IR IŠTRINTI) -->
            <div id="field-edit-modal" class="fixed inset-0 bg-black/80 z-[9999] hidden flex flex-col justify-end items-center p-0 backdrop-blur-sm transition-all duration-300">
                <div class="bg-tractorSurface border-t-2 border-x-2 border-b-0 border-tractorBorder rounded-t-3xl rounded-b-none p-6 md:p-8 pb-12 max-h-[90vh] overflow-y-auto max-w-xl w-full space-y-4 shadow-2xl relative transform transition-transform duration-300">
                    <div class="flex justify-between items-center border-b border-tractorBorder pb-3">
                        <div class="flex items-center gap-2">
                            <span class="text-xl">🌾</span>
                            <h3 id="edit-modal-title" class="font-oswald text-xl font-bold uppercase tracking-wider" style="color: var(--text-main);">Lauko pasas ir redagavimas</h3>
                        </div>
                        <button type="button" id="btn-close-edit-modal" class="text-slate-400 hover:text-white text-2xl font-bold cursor-pointer">&times;</button>
                    </div>

                    <form id="edit-field-form" class="space-y-4">
                        <div class="space-y-1">
                            <label class="text-xs font-bold text-slate-300 uppercase">Lauko pavadinimas *</label>
                            <input id="edit-field-name" type="text" required autocomplete="off" class="w-full h-11 bg-tractorBg border border-tractorBorder rounded-xl px-3.5 text-xs font-bold outline-none" style="color: var(--text-main);">
                        </div>
                        <div class="grid grid-cols-2 gap-3">
                            <div class="space-y-1">
                                <label class="text-xs font-bold text-slate-300 uppercase">Bloko Nr.</label>
                                <input id="edit-field-block" type="text" autocomplete="off" class="w-full h-11 bg-tractorBg border border-tractorBorder rounded-xl px-3.5 text-xs outline-none" style="color: var(--text-main);">
                            </div>
                            <div class="space-y-1">
                                <label class="text-xs font-bold text-tractorPrimaryLight uppercase">Pasėlis</label>
                                <select id="edit-field-crop" class="w-full h-11 bg-tractorBg border border-tractorBorder rounded-xl px-3 text-xs outline-none cursor-pointer" style="color: var(--text-main);">
                                    <option value="Žieminiai kviečiai">🌾 Žieminiai kviečiai</option>
                                    <option value="Žieminiai rapsai">🌱 Žieminiai rapsai</option>
                                    <option value="Vasariniai miežiai">🌾 Vasariniai miežiai</option>
                                    <option value="Žirniai / Pupos">🫘 Žirniai / Pupos</option>
                                    <option value="Kukurūzai">🌽 Kukurūzai</option>
                                </select>
                            </div>
                        </div>
                        <div class="space-y-1">
                            <label class="text-xs font-bold text-slate-300 uppercase">Pastabos</label>
                            <input id="edit-field-notes" type="text" autocomplete="off" class="w-full h-11 bg-tractorBg border border-tractorBorder rounded-xl px-3 text-xs outline-none" style="color: var(--text-main);">
                        </div>
                        
                        <!-- 🌟 DU MYGTUKAI: IŠSAUGOTI IR IŠTRINTI -->
                        <div class="flex gap-3 pt-2">
                            <button type="submit" class="flex-1 h-12 bg-tractorPrimary hover:bg-tractorPrimaryHover text-white font-extrabold rounded-xl text-xs uppercase tracking-wider shadow transition cursor-pointer flex items-center justify-center">
                                Išsaugoti pakeitimus
                            </button>
                            <button type="button" id="btn-delete-field-modal" class="px-5 h-12 bg-red-950/40 hover:bg-red-900 text-red-400 border border-red-800/60 font-bold rounded-xl text-xs uppercase tracking-wider transition cursor-pointer flex items-center justify-center gap-1.5">
                                <span>🗑️</span> <span>Ištrinti</span>
                            </button>
                        </div>
                    </form>
                </div>
            </div>

            <!-- MODALAS: NMA IMPORTAS (BOTTOM SHEET) -->
            <div id="nma-import-modal" class="fixed inset-0 bg-black/80 z-[9999] hidden flex flex-col justify-end items-center p-0 backdrop-blur-sm transition-all duration-300">
                <div class="bg-tractorSurface border-t-2 border-x-2 border-b-0 border-tractorBorder rounded-t-3xl rounded-b-none p-6 md:p-8 pb-12 max-h-[90vh] overflow-y-auto max-w-xl w-full space-y-5 shadow-2xl relative transform transition-transform duration-300">
                    <div class="flex justify-between items-center border-b border-tractorBorder pb-3">
                        <h3 class="font-oswald text-xl font-bold text-white uppercase tracking-wider">📁 Įkelti NMA Laukus</h3>
                        <button type="button" id="btn-close-nma-import" class="text-slate-400 hover:text-white text-2xl font-bold cursor-pointer">&times;</button>
                    </div>
                    <p class="text-xs text-slate-300">
                        Įkelkite deklaracijos failą (<strong>.geojson</strong> arba <strong>.json</strong>), atsisiųstą iš NMA / PPIS sistemos.
                    </p>
                    <button type="button" id="btn-trigger-file-pick" class="w-full h-16 bg-tractorPrimary/20 hover:bg-tractorPrimary/30 border-2 border-dashed border-tractorPrimary text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2.5 cursor-pointer transition">
                        <span class="text-2xl">📤</span> <span>Pasirinkti laukų failą iš kompiuterio</span>
                    </button>
                </div>
            </div>

        </div>
    `;
}

export function getEmptyListHtml() {
    return `
        <div class="text-center py-10 text-slate-500 text-sm">
            Dar neturite pažymėtų laukų.<br>Spauskite <strong>„📁 Įkelti NMA laukus“</strong> arba <strong>„✏️ Brėžti lauką“</strong> viršuje žemėlapio!
        </div>
    `;
}

export function getFieldRowHtml(f, idx, isSelected, ndvi) {
    return `
        <div id="field-row-${f.id}" class="field-item-row p-4 sm:p-5 rounded-2xl border transition cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
            isSelected 
            ? 'bg-myPostBg border-tractorPrimary ring-2 ring-tractorPrimary shadow-xl' 
            : 'bg-tractorBg border-tractorBorder hover:border-tractorPrimary'
        }" onclick="window.selectAndFocusField('${f.id}')">
            
            <div class="space-y-1">
                <div class="flex flex-wrap items-center gap-2">
                    <span class="text-xs text-slate-400 font-mono font-bold bg-tractorSurface px-2 py-0.5 rounded border border-tractorBorder">#${idx + 1}</span>
                    <h4 class="font-bold text-base md:text-lg" style="color: var(--text-main);">${f.name}</h4>
                    ${f.fieldBlockNumber ? `<span class="text-xs text-slate-400 font-mono">(${f.fieldBlockNumber})</span>` : ''}
                    <span class="text-xs bg-tractorPrimary/20 text-tractorPrimaryLight px-2.5 py-0.5 rounded-lg font-bold border border-tractorPrimary/40">${f.areaHa} ha</span>
                    <span class="text-xs bg-green-950/40 text-green-400 px-2.5 py-0.5 rounded-md font-bold font-mono border border-green-800/50">🛰️ NDVI: ${ndvi.score}</span>
                </div>
                <p class="text-xs md:text-sm text-slate-300">
                    🌱 Pasėlis: <strong class="text-slate-200">${f.crop}</strong> ${f.notes ? `• <span class="text-slate-400 italic">${f.notes}</span>` : ''}
                </p>
            </div>

            <div class="flex items-center justify-end shrink-0 pt-1 sm:pt-0">
                <button type="button" class="h-10 px-4 bg-tractorSurface hover:bg-tractorPrimary hover:text-white border border-tractorBorder rounded-xl text-xs font-bold text-slate-200 flex items-center gap-1.5 transition cursor-pointer shadow-sm">
                    <span>Atverti pasą</span> <span>→</span>
                </button>
            </div>
        </div>
    `;
}