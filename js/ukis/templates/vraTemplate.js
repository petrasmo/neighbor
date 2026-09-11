// js/ukis/templates/vraTemplate.js

export function getVraFertilizerHtml(todayStr) {
    return `
        <div class="space-y-6 max-w-6xl mx-auto w-full">
            
            <!-- ANTRAŠTĖ SU SUTVARKYTU MYGTUKU -->
            <div class="border-b border-tractorBorder pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div class="space-y-1">
                    <h2 class="font-oswald text-2xl md:text-3xl font-bold uppercase tracking-wider text-white flex items-center gap-2">
                        <span>🧪</span> VRA Kintamos Normos Tręšimo Projektų Centras
                    </h2>
                    <p class="text-xs md:text-sm text-slate-300 mt-1">
                        Kurkite kintamos normos tręšimo žemėlapius pagal Sentinel-2 NDVI biomasę, koreguokite juos ir eksportuokite į USB.
                    </p>
                </div>

                <button id="btn-open-new-vra-modal" class="h-11 px-5 bg-tractorPrimary hover:bg-tractorPrimaryHover text-white font-extrabold text-xs md:text-sm rounded-xl flex items-center justify-center gap-2 shadow-lg transition cursor-pointer whitespace-nowrap shrink-0 self-start sm:self-auto">
                    <span>➕</span> <span>Naujas tręšimo projektas</span>
                </button>
            </div>

            <!-- 1. IŠSAUGOTŲ TRĘŠIMO PROJEKTŲ BLOKAS -->
            <div class="bg-tractorSurface border border-tractorBorder rounded-2xl p-5 md:p-7 shadow-xl space-y-4">
                <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-tractorBorder/70 pb-4">
                    <div>
                        <h3 class="font-oswald text-lg md:text-xl font-bold uppercase tracking-wider flex items-center gap-2" style="color: var(--text-main);">
                            <span>📋</span> <span>Išsaugoti tręšimo projektai</span>
                            <span id="vra-projects-count" class="bg-tractorPrimary/20 text-green-700 dark:text-green-400 px-2.5 py-0.5 rounded-full text-xs font-mono font-bold">0</span>
                        </h3>
                    </div>

                    <div class="flex items-center gap-2 w-full sm:w-80">
                        <div id="vra-filter-field-box" class="w-full"></div>
                    </div>
                </div>

                <div id="vra-saved-projects-list" class="space-y-3 pt-1">
                    <div class="text-center py-8 text-slate-500 text-xs">Kraunami tręšimo projektai...</div>
                </div>
            </div>

            <!-- 🌟 KOMPAKTIŠKAS, VIETĄ TAUPANTIS 2 STULPELIŲ BOTTOM SHEET -->
            <div id="vra-creator-modal" class="fixed inset-0 bg-black/75 z-[120] hidden flex flex-col justify-end backdrop-blur-sm transition-all duration-300">
                <div class="bg-tractorCard border-t-2 border-tractorBorder p-5 md:p-6 rounded-t-3xl rounded-b-none w-full space-y-4 shadow-2xl relative max-h-[95vh] overflow-y-auto mb-0">
                    
                    <!-- VIRŠUTINĖ JUOSTA: ANTRAŠTĖ IR UŽDARYMAS -->
                    <div class="flex justify-between items-center border-b border-tractorBorder/70 pb-2.5">
                        <div class="flex items-center gap-2">
                            <span class="text-xl">🚜</span>
                            <h3 id="vra-modal-title" class="font-oswald text-xl font-bold uppercase tracking-wider" style="color: var(--text-main);">
                                Naujas VRA Tręšimo Žemėlapis
                            </h3>
                        </div>
                        <button id="btn-close-vra-creator" class="text-slate-400 hover:text-white text-2xl font-bold cursor-pointer p-1">&times;</button>
                    </div>

                    <!-- 4 PARAMETRAI VIENOJE HORIZONTALIOJE EILUTĖJE -->
                    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                        <div class="space-y-0.5">
                            <label class="text-[11px] font-bold text-tractorPrimaryLight uppercase block">Pasirinkti lauką *</label>
                            <div id="vra-field-select-box"></div>
                        </div>

                        <div class="space-y-0.5">
                            <label class="text-[11px] font-bold text-slate-400 uppercase block">Trąšų rūšis</label>
                            <select id="vra-fert-select" class="w-full h-11 bg-tractorBg border border-tractorBorder rounded-xl px-3 text-xs font-bold outline-none cursor-pointer" style="color: var(--text-main);">
                                <option value="Amonio salietra (N 34.4%)">Amonio salietra (N 34.4%)</option>
                                <option value="NPK Kompleksinės (16-16-16)">NPK Kompleksinės (16-16-16)</option>
                                <option value="Karbamidas (N 46%)">Karbamidas (N 46%)</option>
                                <option value="KAS-32 (Skystos trąšos)">KAS-32 (Skystos trąšos)</option>
                            </select>
                        </div>

                        <div class="space-y-0.5">
                            <label class="text-[11px] font-bold text-amber-500 uppercase block">Bazinė norma (kg/ha) *</label>
                            <input id="vra-modal-base-rate" type="number" step="10" value="200" 
                                class="w-full h-11 bg-tractorBg border border-amber-500 rounded-xl px-3 text-xs font-mono font-bold outline-none" style="color: var(--text-main);">
                        </div>

                        <div class="space-y-0.5">
                            <label class="text-[11px] font-bold text-green-600 dark:text-green-400 uppercase block">📅 Tręšimo data *</label>
                            <input id="vra-modal-fert-date" type="date" value="${todayStr}" 
                                class="w-full h-11 bg-tractorBg border border-tractorBorder rounded-xl px-3 text-xs font-mono font-bold outline-none cursor-pointer" style="color: var(--text-main);">
                        </div>
                    </div>

                    <!-- 🌟 2 STULPELIAI: KAIRĖJE ŽEMĖLAPIS, DEŠINĖJE ZONOS IR MYGTUKAI -->
                    <div class="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
                        
                        <!-- KAIRĖ (ŽEMĖLAPIS) - 7 STULPELIAI -->
                        <div class="lg:col-span-7 space-y-1.5 flex flex-col">
                            <div class="flex justify-between items-center text-xs text-slate-400">
                                <span class="font-bold text-[11px]">🛰️ Sentinel-2 NDVI peržiūra:</span>
                                <div class="flex items-center gap-1.5">
                                    <span class="text-[10px]">Kadras:</span>
                                    <input id="vra-modal-sat-date" type="date" value="${todayStr}" class="bg-tractorBg border border-tractorBorder rounded-lg px-2 py-0.5 font-mono text-xs cursor-pointer" style="color: var(--text-main);">
                                </div>
                            </div>
                            <div id="vra-preview-map" class="h-[310px] w-full rounded-xl border border-tractorBorder bg-zinc-900 z-0"></div>
                        </div>

                        <!-- DEŠINĖ (ZONOS, SKAIČIAVIMAS IR MYGTUKAI) - 5 STULPELIAI -->
                        <div class="lg:col-span-5 bg-tractorBg border border-tractorBorder p-4 rounded-xl flex flex-col justify-between space-y-3">
                            
                            <div class="space-y-2.5">
                                <span class="text-[11px] font-bold text-slate-400 uppercase tracking-wider block border-b border-tractorBorder/60 pb-1.5">
                                    Normų paskirstymas pagal NDVI:
                                </span>

                                <div class="space-y-2 text-xs">
                                    <div class="flex justify-between items-center bg-tractorSurface p-2.5 rounded-xl border border-tractorBorder">
                                        <div class="flex items-center gap-2">
                                            <span class="w-3 h-3 rounded-full bg-amber-500"></span>
                                            <span class="font-bold">Geltona zona (+20%)</span>
                                        </div>
                                        <strong id="vra-mod-weak" class="font-mono text-amber-500 font-bold">240 kg/ha</strong>
                                    </div>

                                    <div class="flex justify-between items-center bg-tractorSurface p-2.5 rounded-xl border border-tractorBorder">
                                        <div class="flex items-center gap-2">
                                            <span class="w-3 h-3 rounded-full bg-green-500"></span>
                                            <span class="font-bold">Žalia zona (Bazinė)</span>
                                        </div>
                                        <strong id="vra-mod-norm" class="font-mono text-green-600 dark:text-green-400 font-bold">200 kg/ha</strong>
                                    </div>

                                    <div class="flex justify-between items-center bg-tractorSurface p-2.5 rounded-xl border border-tractorBorder">
                                        <div class="flex items-center gap-2">
                                            <span class="w-3 h-3 rounded-full bg-green-800"></span>
                                            <span class="font-bold">T. Žalia zona (-20%)</span>
                                        </div>
                                        <strong id="vra-mod-strong" class="font-mono text-green-700 dark:text-green-500 font-bold">160 kg/ha</strong>
                                    </div>
                                </div>

                                <div class="pt-2 border-t border-tractorBorder/60 flex justify-between items-center text-xs" style="color: var(--text-main);">
                                    <span>Viso trąšų: <strong id="vra-mod-total-tons" class="font-mono font-bold text-sm">2.00 t</strong></span>
                                    <span>Sutaupoma: <strong id="vra-mod-saved" class="text-green-600 dark:text-green-400 font-mono font-bold">~12.5%</strong></span>
                                </div>
                            </div>

                            <!-- 🌟 VEIKSMŲ MYGTUKAI - VISADA MATOMI EKRANE BE JOKIO SCROLL! -->
                            <div class="space-y-2 pt-2 border-t border-tractorBorder/60">
                                <button type="button" id="btn-save-vra-project" class="w-full h-11 bg-tractorPrimary hover:bg-tractorPrimaryHover text-white font-bold rounded-xl text-xs uppercase tracking-wider shadow transition cursor-pointer flex items-center justify-center gap-2">
                                    <span>💾</span> <span id="vra-save-btn-text">Išsaugoti tręšimo projektą</span>
                                </button>
                                <button type="button" id="btn-download-vra-shp" class="w-full h-11 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs uppercase tracking-wider shadow transition cursor-pointer flex items-center justify-center gap-2">
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