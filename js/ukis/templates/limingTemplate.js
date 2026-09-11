// js/ukis/templates/limingTemplate.js

export function getLimingHtml(todayStr) {
    return `
        <div class="space-y-6 max-w-6xl mx-auto w-full">
            
            <!-- ANTRAŠTĖ -->
            <div class="border-b border-tractorBorder pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div class="space-y-1">
                    <h2 class="font-oswald text-2xl md:text-3xl font-bold uppercase tracking-wider text-white flex items-center gap-2">
                        <span>🍋</span> VRA Kalkinimo ir Dirvožemio Tyrimų Centras
                    </h2>
                    <p class="text-xs md:text-sm text-slate-300 mt-1">
                        Ėminių tinkleliai, laboratorijos pH suvedimas, kintamos normos žemėlapiai ir Shapefile užduotys barstytuvui.
                    </p>
                </div>

                <button id="btn-open-new-liming-modal" class="h-11 px-5 bg-tractorPrimary hover:bg-tractorPrimaryHover text-white font-extrabold text-xs md:text-sm rounded-xl flex items-center justify-center gap-2 shadow-lg transition cursor-pointer whitespace-nowrap shrink-0 self-start sm:self-auto">
                    <span>➕</span> <span>Naujas kalkinimo projektas</span>
                </button>
            </div>

            <!-- 1. IŠSAUGOTŲ PROJEKTŲ BLOKAS -->
            <div class="bg-tractorSurface border border-tractorBorder rounded-2xl p-5 md:p-7 shadow-xl space-y-4">
                <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-tractorBorder/70 pb-4">
                    <div>
                        <h3 class="font-oswald text-lg md:text-xl font-bold uppercase tracking-wider flex items-center gap-2" style="color: var(--text-main);">
                            <span>📋</span> <span>Išsaugoti kalkinimo projektai</span>
                            <span id="liming-projects-count" class="bg-tractorPrimary/20 text-green-700 dark:text-green-400 px-2.5 py-0.5 rounded-full text-xs font-mono font-bold">0</span>
                        </h3>
                    </div>

                    <div class="flex items-center gap-2 w-full sm:w-80">
                        <div id="liming-filter-field-box" class="w-full"></div>
                    </div>
                </div>

                <div id="liming-saved-projects-list" class="space-y-3 pt-1">
                    <div class="text-center py-8 text-slate-500 text-xs">Kraunami kalkinimo projektai...</div>
                </div>
            </div>

            <!-- 🌟 BOTTOM SHEET: KALKINIMO KŪRIMO IR KOREGAVIMO LAPAS -->
            <div id="liming-creator-modal" class="fixed inset-0 bg-black/75 z-[120] hidden flex flex-col justify-end backdrop-blur-sm transition-all duration-300">
                <div class="bg-tractorCard border-t-2 border-tractorBorder p-5 md:p-6 rounded-t-3xl rounded-b-none w-full space-y-4 shadow-2xl relative max-h-[95vh] overflow-y-auto mb-0">
                    
                    <div class="flex justify-between items-center border-b border-tractorBorder/70 pb-2.5">
                        <div class="flex items-center gap-2">
                            <span class="text-xl">🍋</span>
                            <h3 id="liming-modal-title" class="font-oswald text-xl font-bold uppercase tracking-wider" style="color: var(--text-main);">
                                Naujas Kalkinimo Projektas
                            </h3>
                        </div>
                        <button id="btn-close-liming-creator" class="text-slate-400 hover:text-white text-2xl font-bold cursor-pointer p-1">&times;</button>
                    </div>

                    <!-- VIRŠUTINIAI PARAMETRAI -->
                    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                        <div class="space-y-0.5">
                            <label class="text-[11px] font-bold text-tractorPrimaryLight uppercase block">Pasirinkti lauką *</label>
                            <div id="liming-field-select-box"></div>
                        </div>

                        <div class="space-y-0.5">
                            <label class="text-[11px] font-bold text-green-600 dark:text-green-400 uppercase block">📅 Tyrimo data *</label>
                            <input id="liming-modal-date" type="date" value="${todayStr}" 
                                class="w-full h-11 bg-tractorBg border border-tractorBorder rounded-xl px-3 text-xs font-mono font-bold outline-none cursor-pointer" style="color: var(--text-main);">
                        </div>

                        <div class="space-y-0.5">
                            <label class="text-[11px] font-bold text-slate-400 uppercase block">Tinklelio tankis</label>
                            <div class="flex items-center gap-1 bg-tractorBg p-1 rounded-xl border border-tractorBorder h-11">
                                <button type="button" class="btn-lime-density flex-1 h-full rounded-lg text-xs font-bold transition cursor-pointer text-slate-400 hover:text-white" data-ha="5">5 ha</button>
                                <button type="button" class="btn-lime-density flex-1 h-full rounded-lg text-xs font-bold transition cursor-pointer bg-tractorPrimary text-white shadow" data-ha="3">3 ha</button>
                                <button type="button" class="btn-lime-density flex-1 h-full rounded-lg text-xs font-bold transition cursor-pointer text-slate-400 hover:text-white" data-ha="1.5">1.5 ha</button>
                            </div>
                        </div>

                        <div class="space-y-0.5 flex flex-col justify-end">
                            <button type="button" id="btn-lime-add-point" class="w-full h-11 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow transition cursor-pointer">
                                <span>➕</span> <span>Pridėti tašką žemėlapyje</span>
                            </button>
                        </div>
                    </div>

                    <!-- 2 STULPELIAI: KAIRĖJE ŽEMĖLAPIS, DEŠINĖJE PH SUVEDIMAS IR VEIKSMAI -->
                    <div class="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
                        
                        <!-- KAIRĖ (ŽEMĖLAPIS SU 5 SLUOKSNIAIS) - 7 STULPELIAI -->
                        <div class="lg:col-span-7 space-y-1.5 flex flex-col">
                            <div class="flex justify-between items-center text-xs text-slate-400">
                                <span class="font-bold text-[11px]">🛰️ Sentinel-2 NDVI ir ėminių taškai:</span>
                                <div class="flex items-center gap-1.5">
                                    <span class="text-[10px]">Kadras:</span>
                                    <input id="liming-sat-date" type="date" value="${todayStr}" class="bg-tractorBg border border-tractorBorder rounded-lg px-2 py-0.5 font-mono text-xs cursor-pointer" style="color: var(--text-main);">
                                </div>
                            </div>
                            <div id="liming-preview-map" class="h-[330px] w-full rounded-xl border border-tractorBorder bg-zinc-900 z-0"></div>
                        </div>

                        <!-- DEŠINĖ (PH REZULTATAI IR MYGTUKAI) - 5 STULPELIAI -->
                        <div class="lg:col-span-5 bg-tractorBg border border-tractorBorder p-4 rounded-xl flex flex-col justify-between space-y-3">
                            
                            <div class="space-y-2">
                                <div class="flex justify-between items-center border-b border-tractorBorder/60 pb-1.5">
                                    <span class="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                                        Ėminių pH reikšmės:
                                    </span>
                                    <span id="liming-avg-ph-badge" class="text-xs font-mono font-bold text-amber-500">Vid. pH: --</span>
                                </div>

                                <!-- ĮVESTŲ TAŠKŲ SĄRAŠAS SU SCROLL -->
                                <div id="liming-samples-inputs-box" class="max-h-[140px] overflow-y-auto space-y-1.5 pr-1 text-xs"></div>

                                <!-- ZONŲ REZULTATAI -->
                                <div class="pt-2 border-t border-tractorBorder/60 space-y-1 text-xs" style="color: var(--text-main);">
                                    <div class="flex justify-between">
                                        <span>Kalkių poreikis laukui:</span>
                                        <strong id="liming-total-tons" class="font-mono font-bold text-sm text-green-600 dark:text-green-400">0.0 t</strong>
                                    </div>
                                    <div class="flex justify-between text-[11px] text-slate-400">
                                        <span>Sutaupyta neberiant neutraliose:</span>
                                        <strong id="liming-saved-info" class="text-green-500 font-mono">~0 t (0 €)</strong>
                                    </div>
                                </div>
                            </div>

                            <!-- 🌟 VEIKSMŲ MYGTUKAI (ŠVARŪS, BE JOKIŲ PERTEKLINIŲ MYGTUKŲ) -->
                            <div class="space-y-2 pt-2 border-t border-tractorBorder/60">
                                <button type="button" id="btn-save-liming-project" class="w-full h-11 bg-tractorPrimary hover:bg-tractorPrimaryHover text-white font-bold rounded-xl text-xs uppercase tracking-wider shadow transition cursor-pointer flex items-center justify-center gap-2">
                                    <span>💾</span> <span id="liming-save-btn-text">Išsaugoti projektą</span>
                                </button>
                                <button type="button" id="btn-download-liming-shp" class="w-full h-11 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs uppercase tracking-wider shadow transition cursor-pointer flex items-center justify-center gap-2">
                                    <span>🚜</span> Atsisiųsti Shapefile į USB (.ZIP)
                                </button>
                            </div>

                        </div>

                    </div>

                </div>
            </div>

        </div>
    `;
}