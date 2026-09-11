// js/ukis/templates/operationsTemplate.js

export function getOperationsTemplateHtml(todayStr) {
    return `
        <div class="space-y-6 max-w-6xl mx-auto w-full">
            
            <!-- ANTRAŠTĖ -->
            <div class="border-b border-tractorBorder pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div class="space-y-1">
                    <h2 class="font-oswald text-2xl md:text-3xl font-bold uppercase tracking-wider text-white flex items-center gap-2">
                        <span>📝</span> Lauko Darbų Žurnalas ir Operacijos
                    </h2>
                    <p class="text-xs md:text-sm text-slate-300 mt-1">
                        Registruokite sėjos, purškimo, kūlimo, žemės dirbimo darbus, sekite išlaidas ir derlingumą.
                    </p>
                </div>

                <button id="btn-open-new-op-modal" class="h-11 px-5 bg-tractorPrimary hover:bg-tractorPrimaryHover text-white font-extrabold text-xs md:text-sm rounded-xl flex items-center justify-center gap-2 shadow-lg transition cursor-pointer whitespace-nowrap shrink-0 self-start sm:self-auto">
                    <span>➕</span> <span>Registruoti naują darbą</span>
                </button>
            </div>

            <!-- 1. ŽURNALO IR FILTRŲ BLOKAS -->
            <div class="bg-tractorSurface border border-tractorBorder rounded-2xl p-5 md:p-7 shadow-xl space-y-4">
                
                <!-- 🔍 DVIGUBAS FILTRAS: PAGAL LAUKĄ IR PAGAL DARBO TIPĄ -->
                <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-tractorBorder/70 pb-4">
                    <div class="flex items-center gap-2">
                        <h3 class="font-oswald text-lg md:text-xl font-bold uppercase tracking-wider flex items-center gap-2" style="color: var(--text-main);">
                            <span>📋</span> <span>Darbų žurnalas</span>
                            <span id="ops-count-badge" class="bg-tractorPrimary/20 text-green-700 dark:text-green-400 px-2.5 py-0.5 rounded-full text-xs font-mono font-bold">0</span>
                        </h3>
                    </div>

                    <div class="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
                        <!-- LAUKO FILTRAS -->
                        <div class="w-full sm:w-64">
                            <div id="op-filter-field-box"></div>
                        </div>

                        <!-- OPERACIJOS TIPO FILTRAS -->
                        <select id="op-filter-type-select" class="h-11 bg-tractorBg border border-tractorBorder rounded-xl px-3 text-xs font-bold outline-none cursor-pointer" style="color: var(--text-main);">
                            <option value="all">🔍 Visi darbų tipai</option>
                            <option value="Sėja">🌱 Sėja</option>
                            <option value="Purškimas">💦 Purškimas</option>
                            <option value="Kūlimas">🚜 Kūlimas / Derlius</option>
                            <option value="Žemės dirbimas">🚜 Žemės dirbimas</option>
                            <option value="Tręšimas">🧪 Tręšimas</option>
                            <option value="Kalkinimas">🍋 Kalkinimas</option>
                        </select>
                    </div>
                </div>

                <!-- DARBŲ SĄRAŠAS -->
                <div id="ops-saved-list" class="space-y-3 pt-1">
                    <div class="text-center py-8 text-slate-500 text-xs">Kraunami žurnalo įrašai...</div>
                </div>
            </div>

            <!-- 🌟 BOTTOM SHEET: DARBO REGISTRAVIMO IR KOREGAVIMO LAPAS -->
            <div id="op-creator-modal" class="fixed inset-0 bg-black/75 z-[120] hidden flex flex-col justify-end backdrop-blur-sm transition-all duration-300">
                <div class="bg-tractorCard border-t-2 border-tractorBorder p-6 md:p-8 rounded-t-3xl rounded-b-none w-full max-w-4xl mx-auto space-y-5 shadow-2xl relative max-h-[90vh] overflow-y-auto mb-0">
                    
                    <div class="flex justify-between items-center border-b border-tractorBorder/70 pb-3">
                        <div class="flex items-center gap-2.5">
                            <span class="text-2xl">📝</span>
                            <h3 id="op-modal-title" class="font-oswald text-xl md:text-2xl font-bold uppercase tracking-wider" style="color: var(--text-main);">
                                Registruoti atliktą darbą
                            </h3>
                        </div>
                        <button id="btn-close-op-creator" class="text-slate-400 hover:text-white text-2xl font-bold cursor-pointer p-1">&times;</button>
                    </div>

                    <!-- FORMOS LAUKELIAI -->
                    <form id="op-modal-form" class="space-y-4">
                        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div class="space-y-1">
                                <label class="text-xs font-bold text-tractorPrimaryLight uppercase block">Pasirinkti lauką *</label>
                                <div id="op-modal-field-box"></div>
                            </div>

                            <div class="space-y-1">
                                <label class="text-xs font-bold text-tractorPrimaryLight uppercase block">Darbo tipas *</label>
                                <select id="op-modal-type-select" class="w-full h-11 bg-tractorBg border border-tractorBorder rounded-xl px-3 text-xs font-bold outline-none cursor-pointer" style="color: var(--text-main);">
                                    <option value="Sėja">🌱 Sėja</option>
                                    <option value="Purškimas">💦 Purškimas</option>
                                    <option value="Kūlimas">🚜 Kūlimas / Derlius</option>
                                    <option value="Žemės dirbimas">🚜 Žemės dirbimas / Arimas</option>
                                    <option value="Tręšimas">🧪 Tręšimas</option>
                                    <option value="Kalkinimas">🍋 Kalkinimas</option>
                                </select>
                            </div>

                            <div class="space-y-1">
                                <label class="text-xs font-bold text-green-600 dark:text-green-400 uppercase block">📅 Darbo data *</label>
                                <input id="op-modal-date" type="date" value="${todayStr}" required 
                                    class="w-full h-11 bg-tractorBg border border-tractorBorder rounded-xl px-3 text-xs font-mono font-bold outline-none cursor-pointer" style="color: var(--text-main);">
                            </div>
                        </div>

                        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div class="space-y-1">
                                <label class="text-xs font-bold text-slate-400 uppercase block">Produktas / Medžiaga</label>
                                <input id="op-modal-product" type="text" placeholder="Pvz.: KAS-32, Sėkla Skagen, Sekator" 
                                    class="w-full h-11 bg-tractorBg border border-tractorBorder rounded-xl px-3 text-xs text-white outline-none">
                            </div>

                            <div class="space-y-1">
                                <label class="text-xs font-bold text-slate-400 uppercase block">Norma / Kiekis *</label>
                                <input id="op-modal-rate" type="text" required placeholder="Pvz.: 200 kg/ha arba 6.5 t/ha" 
                                    class="w-full h-11 bg-tractorBg border border-tractorBorder rounded-xl px-3 text-xs text-white outline-none">
                            </div>

                            <div class="space-y-1">
                                <label class="text-xs font-bold text-amber-500 uppercase block">Išlaidos (€ viso)</label>
                                <input id="op-modal-cost" type="number" step="0.01" placeholder="Pvz.: 450.00" 
                                    class="w-full h-11 bg-tractorBg border border-amber-500 rounded-xl px-3 text-xs font-mono font-bold text-amber-500 outline-none">
                            </div>
                        </div>

                        <div class="space-y-1">
                            <label class="text-xs font-bold text-slate-400 uppercase block">Pastabos / Oro sąlygos</label>
                            <input id="op-modal-notes" type="text" placeholder="Pvz.: Vėjas 2 m/s, oro temp. +18°C" 
                                class="w-full h-11 bg-tractorBg border border-tractorBorder rounded-xl px-3 text-xs text-white outline-none">
                        </div>

                        <div class="pt-2 border-t border-tractorBorder/60 flex gap-3">
                            <button type="submit" id="btn-submit-op-modal" class="w-full h-12 bg-tractorPrimary hover:bg-tractorPrimaryHover text-white font-bold rounded-xl text-xs uppercase tracking-wider shadow transition cursor-pointer flex items-center justify-center gap-2">
                                <span>💾</span> <span id="op-save-btn-text">Įrašyti darbą į žurnalą</span>
                            </button>
                        </div>
                    </form>

                </div>
            </div>

        </div>
    `;
}