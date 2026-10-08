// js/ukis/templates/fieldsTemplate.js

export function getMainFieldsHtml(todayStr) {
    return `
        <div class="space-y-4 max-w-6xl mx-auto w-full">
            
            <!-- HEADERIS -->
            <div class="border-b border-tractorBorder pb-3">
                <h2 class="font-oswald text-xl sm:text-2xl md:text-3xl font-bold uppercase tracking-wider text-white flex items-center gap-2">
                    <span>🗺️</span> Mano Laukai ir Sentinel-2 NDVI Palydovas
                </h2>
                <p class="text-[11px] sm:text-xs text-slate-300 mt-0.5">
                    Tikrasis Europos Kosmoso Agentūros (ESA) Sentinel-2 NDVI spektras ir laukų valdymas.
                </p>
            </div>

            <!-- BRAIŽYMO PAGALBINĖ JUOSTA -->
            <div id="draw-helper-banner" class="hidden bg-tractorPrimary/20 border border-tractorPrimary text-tractorPrimaryLight p-3 rounded-xl text-xs font-semibold">
                📍 Spauskite ant žemėlapio taškus aplink lauko ribas. Baigę spauskite žalią <strong>✓</strong> mygtuką žemėlapyje.
            </div>

            <!-- 🌟 PER VISĄ EKRANĄ AIŠKUS KROVIMOSI MODALAS (RAMINANTIS INDIKAVIMAS) -->
            <div id="field-processing-indicator" class="fixed inset-0 bg-black/80 z-[9999] hidden flex flex-col items-center justify-center p-4 backdrop-blur-md transition-all duration-300">
                <div class="bg-tractorSurface border-2 border-tractorPrimary rounded-3xl p-6 sm:p-8 max-w-md w-full text-center space-y-4 shadow-2xl">
                    <div class="relative w-20 h-20 mx-auto flex items-center justify-center">
                        <div class="w-20 h-20 rounded-full border-4 border-tractorBorder border-t-tractorPrimaryLight animate-spin"></div>
                        <span class="text-3xl absolute animate-pulse">🛰️</span>
                    </div>
                    <div class="space-y-1.5">
                        <h3 class="font-oswald text-xl sm:text-2xl font-bold uppercase tracking-wider text-white">Nustatomas Laukas</h3>
                        <p class="text-xs text-slate-300 leading-relaxed">
                            Nustatomas oficialus NMA KPS blokas, rajonas ir skenuojamas naujausias Sentinel-2 palydovo kadras...
                        </p>
                    </div>
                    <div class="inline-flex items-center gap-2 bg-tractorBg px-4 py-1.5 rounded-full border border-tractorBorder text-xs font-mono font-bold text-tractorPrimaryLight">
                        <span class="w-2 h-2 rounded-full bg-tractorPrimaryLight animate-ping"></span>
                        <span>Prašome palaukti kelias sekundes...</span>
                    </div>
                </div>
            </div>

            <!-- 1. ŽEMĖLAPIS -->
            <div class="bg-tractorSurface border border-tractorBorder rounded-2xl p-3 sm:p-4 shadow-xl space-y-2.5 w-full">
                
                <div class="bg-tractorBg border border-tractorBorder p-2.5 rounded-xl flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div class="flex items-center gap-2">
                        <span class="text-sm">📅</span>
                        <strong class="text-white text-[11px] sm:text-xs">Kadras:</strong>
                        <input id="sentinel-date-input" type="date" value="${todayStr}" max="${todayStr}"
                            class="bg-tractorSurface border border-tractorBorder focus:border-tractorPrimary rounded-lg px-2 py-1 text-white font-mono font-bold text-xs outline-none cursor-pointer">
                    </div>

                    <div class="flex flex-wrap items-center gap-1.5">
                        <span class="text-slate-400 text-[11px]">Debesys:</span>
                        <select id="sentinel-cloud-select" class="bg-tractorSurface border border-tractorBorder rounded-lg py-1 px-2 text-white font-bold text-xs outline-none cursor-pointer">
                            <option value="15">15%</option>
                            <option value="25" selected>25%</option>
                            <option value="40">40%</option>
                        </select>
                        
                        <button id="btn-refresh-satellite" class="px-2.5 py-1 bg-tractorPrimary hover:bg-tractorPrimaryHover text-white rounded-lg font-bold text-xs transition cursor-pointer">
                            🔄
                        </button>

                        <button id="btn-import-nma-modal" class="px-3 py-1 bg-tractorSurface hover:bg-zinc-800 text-blue-400 border border-blue-500/60 font-bold rounded-lg flex items-center gap-1 text-xs transition cursor-pointer">
                            <span>📁</span> <span>Įkelti NMA failą</span>
                        </button>
                        <input type="file" id="nma-file-hidden-input" accept=".geojson,.json" class="hidden">
                    </div>
                </div>

                <div id="fields-map" class="h-[520px] w-full rounded-xl z-0 relative overflow-hidden border border-tractorBorder/80 bg-zinc-900"></div>

                <div class="flex justify-between items-center text-xs text-slate-300 px-1 pt-0.5">
                    <span>🛰️ Gyvas Copernicus Sentinel-2 vaizdas</span>
                    <span>Viso ūkio plotas: <strong id="total-area-counter" class="text-green-400 font-bold text-sm">0.00 ha</strong></span>
                </div>
            </div>

            <!-- 2. LAUKŲ SĄRAŠAS -->
            <div class="bg-tractorSurface border border-tractorBorder rounded-2xl p-4 sm:p-6 md:p-7 shadow-xl space-y-3.5">
                <div class="flex justify-between items-center border-b border-tractorBorder/70 pb-2.5">
                    <h3 class="font-oswald text-base sm:text-xl font-bold uppercase tracking-wider flex items-center gap-2" style="color: var(--text-main);">
                        <span>📋</span> Visi ūkio laukai (<span id="fields-count-badge">0</span>)
                    </h3>
                    <span class="text-xs text-slate-400">Paspauskite „Atverti pasą →“ redagavimui</span>
                </div>

                <div id="fields-table-list" class="space-y-2.5 pt-0.5">
                    <div class="text-center py-6 text-slate-500 text-xs">Kraunami jūsų laukai...</div>
                </div>
            </div>

            <!-- 🌟 VIENINTELIS UNIKALUS MODALAS: PILNAS LAUKO PASAS (NAUJAM IR ESAMAM LAUKUI) -->
            <div id="field-edit-modal" class="fixed inset-0 bg-black/80 z-[9999] hidden flex flex-col justify-end items-center p-0 backdrop-blur-sm transition-all duration-300">
                <div class="bg-tractorSurface border-t-2 border-x-2 border-b-0 border-tractorBorder rounded-t-3xl rounded-b-none p-5 sm:p-7 pb-12 max-h-[90vh] overflow-y-auto max-w-xl w-full space-y-4 shadow-2xl relative">
                    <div class="flex justify-between items-center border-b border-tractorBorder pb-3">
                        <div class="flex items-center gap-2">
                            <span class="text-xl">🌾</span>
                            <h3 id="edit-modal-title" class="font-oswald text-xl font-bold uppercase tracking-wider" style="color: var(--text-main);">
                                Lauko Pasas
                            </h3>
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
                                <select id="edit-field-crop" class="w-full h-11 bg-tractorBg border border-tractorBorder rounded-xl px-3 text-xs outline-none cursor-pointer" style="color: var(--text-main);"></select>
                            </div>
                        </div>

                        <!-- 🛰️ TIKRAS SENTINEL-2 PALYDOVO BLOKELIS -->
                        <div class="p-3.5 bg-tractorBg border border-tractorBorder rounded-xl flex items-center justify-between gap-3 shadow-inner">
                            <div class="space-y-0.5">
                                <strong class="text-xs block text-white flex items-center gap-1.5 font-bold">
                                    <span>🛰️</span> <span>Sentinel-2 Palydovo Būsena</span>
                                </strong>
                                <div class="flex items-center gap-2 text-xs">
                                    <span class="text-slate-400">Paskutinis kadras:</span>
                                    <strong id="edit-field-sat-date" class="font-mono text-green-400 font-bold">Laukiama...</strong>
                                </div>
                            </div>
                            <div class="text-right">
                                <span class="text-[10px] text-slate-400 uppercase font-bold block">Biomasės NDVI</span>
                                <strong id="edit-field-ndvi-val" class="font-mono text-base font-black text-green-400">...</strong>
                            </div>
                        </div>

                        <!-- 🏆 LYGA IR RAJONAS -->
                        <div class="p-3 bg-tractorBg border border-tractorBorder rounded-xl flex items-center justify-between gap-3">
                            <div class="space-y-0.5">
                                <strong class="text-xs block text-white flex items-center gap-1.5">
                                    <span>🏆</span> <span>Dalyvauti Pasėlių Lygoje (TOP 10)</span>
                                </strong>
                                <span id="edit-field-region-text" class="text-[11px] text-green-400 font-bold block">
                                    Regionas: Nustatomas...
                                </span>
                            </div>
                            <input type="checkbox" id="edit-field-in-league" class="w-4 h-4 accent-tractorPrimary cursor-pointer" checked>
                        </div>

                        <div class="space-y-1">
                            <label class="text-xs font-bold text-slate-300 uppercase">Pastabos</label>
                            <input id="edit-field-notes" type="text" autocomplete="off" placeholder="Pastabos apie lauką..." class="w-full h-11 bg-tractorBg border border-tractorBorder rounded-xl px-3 text-xs outline-none" style="color: var(--text-main);">
                        </div>
                        
                        <!-- 🌟 DINAMINIAI VEIKSMŲ MYGTUKAI -->
                        <div class="flex gap-3 pt-2">
                            <button type="submit" id="btn-save-field-action" class="flex-1 h-12 bg-tractorPrimary hover:bg-tractorPrimaryHover text-white font-extrabold rounded-xl text-xs uppercase tracking-wider shadow transition cursor-pointer flex items-center justify-center">
                                💾 Išsaugoti pakeitimus
                            </button>
                            <button type="button" id="btn-secondary-field-action" class="px-5 h-12 font-bold rounded-xl text-xs uppercase tracking-wider transition cursor-pointer flex items-center justify-center gap-1.5">
                                <span>🗑️</span> <span>Ištrinti</span>
                            </button>
                        </div>
                    </form>
                </div>
            </div>

            <!-- MODALAS: NMA IMPORTAS -->
            <div id="nma-import-modal" class="fixed inset-0 bg-black/80 z-[9999] hidden flex flex-col justify-end items-center p-0 backdrop-blur-sm transition-all duration-300">
                <div class="bg-tractorSurface border-t-2 border-x-2 border-b-0 border-tractorBorder rounded-t-3xl rounded-b-none p-5 sm:p-7 pb-12 max-h-[90vh] overflow-y-auto max-w-xl w-full space-y-4 shadow-2xl relative">
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
            Dar neturite pažymėtų laukų.<br>Spauskite <strong>„➕“</strong> mygtuką žemėlapyje naujam laukui nubrėžti!
        </div>
    `;
}

export function getFieldRowHtml(f, idx, isSelected, ndvi) {
    const cropText = f.crop || 'Nėra (Arimas)';
    const regionBadge = f.region ? `<span class="text-xs text-slate-400 font-mono">(${f.region})</span>` : '';
    const leagueBadge = (f.inLeague !== false) ? `<span class="text-[10px] bg-amber-500/20 text-amber-400 border border-amber-500/40 px-2 py-0.5 rounded font-bold">🏆 Lygoje</span>` : '';

    return `
        <div id="field-row-${f.id}" class="field-item-row p-3.5 sm:p-4 rounded-2xl border transition cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 ${
            isSelected 
            ? 'bg-myPostBg border-tractorPrimary ring-2 ring-tractorPrimary shadow-lg' 
            : 'bg-tractorBg border-tractorBorder hover:border-tractorPrimary'
        }" onclick="window.selectAndFocusField('${f.id}')">
            
            <div class="space-y-1">
                <div class="flex flex-wrap items-center gap-2">
                    <span class="text-xs text-slate-400 font-mono font-bold bg-tractorSurface px-2 py-0.5 rounded border border-tractorBorder">#${idx + 1}</span>
                    <h4 class="font-bold text-sm sm:text-base text-white">${f.name}</h4>
                    ${f.fieldBlockNumber ? `<span class="text-xs text-slate-400 font-mono">(${f.fieldBlockNumber})</span>` : ''}
                    ${regionBadge}
                    <span class="text-xs bg-tractorPrimary/20 text-tractorPrimaryLight px-2.5 py-0.5 rounded font-bold border border-tractorPrimary/40">${f.areaHa} ha</span>
                    <span class="text-xs bg-green-950/40 text-green-400 px-2.5 py-0.5 rounded font-bold font-mono border border-green-800/50">🛰️ NDVI: ${f.ndvi ? f.ndvi.toFixed(2) : ndvi.score}</span>
                    ${leagueBadge}
                </div>
                <p class="text-xs text-slate-300">
                    🌱 Pasėlis: <strong class="text-slate-200">${cropText}</strong> ${f.notes ? `• <span class="text-slate-400 italic">${f.notes}</span>` : ''}
                </p>
            </div>

            <div class="flex items-center justify-end shrink-0 pt-0.5 sm:pt-0">
                <button type="button" class="h-9 px-3.5 bg-tractorSurface hover:bg-tractorPrimary hover:text-white border border-tractorBorder rounded-xl text-xs font-bold text-slate-200 flex items-center gap-1.5 transition cursor-pointer shadow-sm">
                    <span>Atverti pasą</span> <span>→</span>
                </button>
            </div>
        </div>
    `;
}