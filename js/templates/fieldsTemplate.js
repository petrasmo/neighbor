// js/templates/fieldsTemplate.js

export function getMainFieldsHtml(todayStr) {
    return `
        <div class="space-y-6 max-w-6xl mx-auto w-full">
            
            <!-- HEADERIS IR VALDYMAS -->
            <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-tractorBorder pb-4">
                <div>
                    <h2 class="font-oswald text-2xl md:text-3xl font-bold uppercase tracking-wider text-white flex items-center gap-2">
                        <span>🗺️</span> Mano Laukai ir Gyvas Sentinel-2 NDVI Palydovas
                    </h2>
                    <p class="text-xs md:text-sm text-slate-300 mt-1">
                        Tikrasis Europos Kosmoso Agentūros (ESA) Sentinel-2 NDVI spektras, NMA laukų importas ir VRA tręšimas traktoriui.
                    </p>
                </div>

                <div class="flex flex-wrap items-center gap-2.5">
                    <button id="btn-import-nma-modal" class="h-11 px-4 bg-tractorBg hover:bg-zinc-800 text-blue-400 border border-blue-500/60 text-xs md:text-sm font-bold rounded-xl flex items-center gap-2 transition cursor-pointer">
                        <span>📁</span> Įkelti NMA laukus
                    </button>
                    <input type="file" id="nma-file-hidden-input" accept=".geojson,.json" class="hidden">

                    <button id="btn-open-reports-modal" class="h-11 px-4 bg-tractorBg hover:bg-zinc-800 text-green-400 border border-tractorPrimary/60 text-xs md:text-sm font-bold rounded-xl flex items-center gap-2 transition cursor-pointer">
                        <span>📄</span> NMA Žurnalai (PDF / Excel)
                    </button>
                    
                    <button id="btn-start-draw" class="h-11 px-5 bg-tractorPrimary hover:bg-tractorPrimaryHover text-white text-xs md:text-sm font-bold rounded-xl flex items-center gap-2 shadow-lg shadow-tractorPrimary/20 transition cursor-pointer">
                        <span>✏️</span> Brėžti lauką
                    </button>

                    <button id="btn-cancel-draw" class="h-11 px-4 bg-zinc-800 hover:bg-zinc-700 text-slate-300 text-xs font-bold rounded-xl border border-tractorBorder hidden transition cursor-pointer">
                        Atšaukti braižymą
                    </button>
                </div>
            </div>

            <!-- BRAIŽYMO BANERIS -->
            <div id="draw-helper-banner" class="hidden bg-tractorPrimary/20 border border-tractorPrimary text-tractorPrimaryLight p-4 rounded-xl text-xs md:text-sm font-semibold flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <span>📍 Spauskite ant žemėlapio taškus aplink lauko ribas. Baigę spauskite „Išsaugoti lauką“.</span>
                <button id="btn-finish-draw" class="px-5 py-2 bg-tractorPrimary hover:bg-tractorPrimaryHover text-white rounded-lg text-xs font-bold shadow">
                    💾 Išsaugoti lauką
                </button>
            </div>

            <!-- 1. PALYDOVINIS IR NDVI ŽEMĖLAPIS SU DATOS PARINKIKLIU -->
            <div class="bg-tractorSurface border border-tractorBorder rounded-2xl p-4 md:p-5 shadow-xl space-y-3 w-full">
                <div class="bg-tractorBg border border-tractorBorder p-3 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs">
                    <div class="flex items-center gap-2">
                        <span class="text-base">📅</span>
                        <strong class="text-white">Palydovo data:</strong>
                        <input id="sentinel-date-input" type="date" value="${todayStr}" max="${todayStr}"
                            class="bg-tractorSurface border border-tractorBorder focus:border-tractorPrimary rounded-lg px-2.5 py-1 text-white font-mono font-bold outline-none cursor-pointer">
                    </div>

                    <div class="flex items-center gap-2">
                        <span class="text-slate-400">Maks. debesuotumas:</span>
                        <select id="sentinel-cloud-select" class="bg-tractorSurface border border-tractorBorder rounded-lg px-2 py-1 text-white font-bold outline-none cursor-pointer">
                            <option value="15">15% (Tik giedra)</option>
                            <option value="25" selected>25% (Rekomenduojama)</option>
                            <option value="40">40% (Daugiau kadrų)</option>
                        </select>
                        <button id="btn-refresh-satellite" class="px-3 py-1 bg-tractorPrimary hover:bg-tractorPrimaryHover text-white rounded-lg font-bold transition">
                            🔄 Atnaujinti
                        </button>
                    </div>
                </div>

                <div id="fields-map" class="h-[530px] w-full rounded-xl z-0 relative overflow-hidden border border-tractorBorder/80 bg-zinc-900"></div>

                <div class="flex justify-between items-center text-xs md:text-sm text-slate-300 px-1 pt-1">
                    <span id="map-layer-indicator-label">🛰️ Gyvas Copernicus Sentinel-2 vaizdas su 10m NDVI analize</span>
                    <span>Viso ūkio plotas: <strong id="total-area-counter" class="text-green-400 font-bold text-base">0.00 ha</strong></span>
                </div>
            </div>

            <!-- 2. DETALUS LAUKO PASAS IR VRA TRĘŠIMO GENERATORIUS -->
            <div id="field-detail-section" class="hidden bg-tractorSurface border-2 border-tractorPrimary rounded-2xl p-6 md:p-8 shadow-2xl space-y-6">
                <div class="flex flex-col md:flex-row md:items-start justify-between gap-4 border-b border-tractorBorder/80 pb-5">
                    <div class="space-y-1.5 flex-1">
                        <div class="flex flex-wrap items-center gap-2">
                            <span class="inline-flex items-center gap-1 bg-tractorPrimary/20 text-tractorPrimaryLight px-3 py-0.5 rounded-full text-xs font-extrabold uppercase tracking-wider">
                                🌾 Pasirinktas lauko pasas
                            </span>
                        </div>
                        <h3 id="detail-field-title" class="font-oswald text-2xl md:text-3xl font-bold text-white tracking-wide">Kraunasi...</h3>
                        <p id="detail-field-meta" class="text-sm text-slate-300 mt-1"></p>
                    </div>

                    <div class="flex flex-wrap items-center gap-2.5 shrink-0 self-start md:self-auto">
                        <button id="btn-open-vra-generator" class="h-10 px-4 bg-amber-500 hover:bg-amber-600 text-black font-extrabold text-xs rounded-xl flex items-center gap-1.5 shadow-lg transition cursor-pointer">
                            <span>🚜</span> <span>VRA Tręšimo failas į USB</span>
                        </button>
                        <button id="btn-edit-field-info" class="h-10 px-4 bg-tractorBg hover:bg-zinc-800 text-slate-200 border border-tractorBorder hover:border-tractorPrimary text-xs font-bold rounded-xl flex items-center gap-1.5 transition cursor-pointer">
                            <span>✏️</span> Redaguoti
                        </button>
                        <button id="btn-delete-field-entirely" class="h-10 px-4 bg-red-950/40 hover:bg-red-900 text-red-300 border border-red-800/60 text-xs font-bold rounded-xl flex items-center gap-1.5 transition cursor-pointer">
                            <span>🗑️</span> Ištrinti
                        </button>
                    </div>
                </div>

                <!-- PALYDOVINIS NDVI BLOKAS -->
                <div id="field-ndvi-live-box"></div>

                <!-- FINANSINĖ LAUKO SUVESTINĖ -->
                <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <div class="bg-tractorBg border border-tractorBorder p-3.5 rounded-xl text-center">
                        <span class="text-[10px] uppercase font-bold text-slate-400 block">Visos Išlaidos</span>
                        <strong class="text-amber-400 text-base md:text-lg font-mono font-bold" id="detail-stat-cost">0.00 €</strong>
                        <span class="text-[10px] text-slate-400 block" id="detail-stat-cost-ha">0.00 €/ha</span>
                    </div>
                    <div class="bg-tractorBg border border-tractorBorder p-3.5 rounded-xl text-center">
                        <span class="text-[10px] uppercase font-bold text-slate-400 block">Gautas Derlius</span>
                        <strong class="text-green-400 text-base md:text-lg font-mono font-bold" id="detail-stat-yield">0.00 t</strong>
                        <span class="text-[10px] text-slate-400 block" id="detail-stat-yield-ha">0.00 t/ha</span>
                    </div>
                    <div class="bg-tractorBg border border-tractorBorder p-3.5 rounded-xl text-center col-span-2 sm:col-span-1">
                        <span class="text-[10px] uppercase font-bold text-slate-400 block">Darbų skaičius</span>
                        <strong class="text-white text-base md:text-lg font-mono font-bold" id="detail-stat-ops">0</strong>
                        <span class="text-[10px] text-slate-400 block">operacijos</span>
                    </div>
                </div>

                <!-- REGISTRUOTI DARBĄ FORMA -->
                <div class="bg-tractorBg/90 border border-tractorBorder p-5 md:p-6 rounded-2xl space-y-4">
                    <div class="flex justify-between items-center">
                        <h4 class="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                            <span>➕</span> Registruoti atliktą darbą šiame lauke
                        </h4>
                        <button type="button" id="btn-cancel-edit-op" class="text-xs text-amber-400 hover:underline hidden font-bold cursor-pointer">
                            Atšaukti redagavimą ✕
                        </button>
                    </div>

                    <form id="add-operation-form" class="space-y-4">
                        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div class="space-y-1">
                                <label class="text-[11px] font-bold text-tractorPrimaryLight uppercase block">Darbo tipas *</label>
                                <select id="op-type" class="w-full h-11 bg-tractorSurface border border-tractorBorder focus:border-tractorPrimary rounded-xl px-3 text-xs md:text-sm text-white outline-none cursor-pointer">
                                    <option value="Sėja">🌱 Sėja</option>
                                    <option value="Tręšimas">🧪 Tręšimas</option>
                                    <option value="Purškimas">💦 Purškimas (Augalų apsauga)</option>
                                    <option value="Kūlimas">🚜 Kūlimas / Derlius</option>
                                    <option value="Žemės dirbimas">🚜 Skutimas / Arimas</option>
                                    <option value="Kalkinimas">⚪ Kalkinimas</option>
                                </select>
                            </div>
                            <div class="space-y-1">
                                <label class="text-[11px] font-bold text-slate-300 uppercase block">Data (YYYY-MM-DD) *</label>
                                <input id="op-date" type="text" pattern="[0-9]{4}-[0-9]{2}-[0-9]{2}" placeholder="2026-09-01" required 
                                    class="w-full h-11 bg-tractorSurface border border-tractorBorder focus:border-tractorPrimary rounded-xl px-3 text-xs md:text-sm text-white font-mono font-bold outline-none">
                            </div>
                            <div class="space-y-1">
                                <label class="text-[11px] font-bold text-slate-300 uppercase block">Produktas / Medžiaga</label>
                                <input id="op-product" type="text" placeholder="Pvz.: KAS-32, Salietra, Sekator" class="w-full h-11 bg-tractorSurface border border-tractorBorder focus:border-tractorPrimary rounded-xl px-3 text-xs md:text-sm text-white outline-none">
                            </div>
                        </div>

                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div class="space-y-1">
                                <label class="text-[11px] font-bold text-slate-300 uppercase block">Norma / Kiekis *</label>
                                <input id="op-rate" type="text" placeholder="Pvz.: 180 kg/ha arba 7.5 t/ha kūlimui" required class="w-full h-11 bg-tractorSurface border border-tractorBorder focus:border-tractorPrimary rounded-xl px-3 text-xs md:text-sm text-white outline-none">
                            </div>
                            <div class="space-y-1">
                                <label class="text-[11px] font-bold text-amber-400 uppercase block">Išlaidos / Savikaina (€ viso)</label>
                                <input id="op-cost" type="number" step="0.01" placeholder="Pvz.: 450.00" class="w-full h-11 bg-tractorSurface border border-amber-400 rounded-xl px-3 text-xs md:text-sm text-amber-300 font-mono font-bold outline-none">
                            </div>
                        </div>

                        <div class="space-y-1">
                            <label class="text-[11px] font-bold text-slate-400 uppercase block">Pastabos / Oro sąlygos</label>
                            <input id="op-notes" type="text" placeholder="Pvz.: Vėjas 2 m/s, oro temp. +18°C" class="w-full h-11 bg-tractorSurface border border-tractorBorder focus:border-tractorPrimary rounded-xl px-3 text-xs md:text-sm text-white outline-none">
                        </div>

                        <button type="submit" id="btn-submit-operation" class="w-full h-12 bg-tractorPrimary hover:bg-tractorPrimaryHover text-white font-bold rounded-xl text-xs md:text-sm uppercase tracking-wider shadow-lg shadow-tractorPrimary/20 transition cursor-pointer">
                            📝 Įrašyti darbą į lauko žurnalą
                        </button>
                    </form>
                </div>

                <!-- ISTORIJA -->
                <div class="space-y-3">
                    <h4 class="text-xs md:text-sm font-bold text-slate-200 uppercase tracking-wider">Atliktų darbų chronologija</h4>
                    <div id="detail-operations-list" class="space-y-2.5"></div>
                </div>
            </div>

            <!-- 3. LAUKŲ SĄRAŠAS EILUTĖMIS -->
            <div class="bg-tractorSurface border border-tractorBorder rounded-2xl p-6 md:p-8 shadow-xl space-y-4">
                <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-tractorBorder/70 pb-3">
                    <div>
                        <h3 class="font-oswald text-xl md:text-2xl font-bold text-white uppercase tracking-wider flex items-center gap-2">
                            <span>📋</span> Visi ūkio laukai (<span id="fields-count-badge">0</span>)
                        </h3>
                        <p class="text-xs md:text-sm text-slate-400">Paspauskite ant lauko eilutės, kad žemėlapis prisiartintų prie jo ribų.</p>
                    </div>
                </div>

                <div id="fields-table-list" class="space-y-3 pt-1">
                    <div class="text-center py-8 text-slate-500 text-xs">Kraunami jūsų laukai...</div>
                </div>
            </div>

            <!-- MODALAI: BRĖŽIMAS IR REDAGAVIMAS -->
            <div id="field-save-modal" class="fixed inset-0 bg-black/80 flex items-center justify-center z-[110] hidden p-4 backdrop-blur-sm">
                <div class="bg-tractorSurface border border-tractorBorder p-6 md:p-8 rounded-2xl max-w-md w-full space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
                    <div class="flex justify-between items-center border-b border-tractorBorder pb-3">
                        <h3 class="font-oswald text-xl font-bold text-white uppercase tracking-wider">Išsaugoti naują lauką</h3>
                        <button id="btn-close-save-modal" class="text-slate-400 hover:text-white text-xl cursor-pointer">&times;</button>
                    </div>

                    <form id="save-field-form" class="space-y-4">
                        <div class="space-y-1">
                            <label class="text-xs font-bold text-slate-300 uppercase tracking-wider">Lauko pavadinimas *</label>
                            <input id="field-name-input" type="text" required placeholder="Pvz.: Prie miško, Pakalnė" 
                                class="w-full h-11 bg-tractorBg border border-tractorBorder focus:border-tractorPrimary rounded-xl px-3.5 text-xs text-white outline-none">
                        </div>

                        <div class="grid grid-cols-2 gap-3">
                            <div class="space-y-1">
                                <label class="text-xs font-bold text-slate-300 uppercase tracking-wider">Plotas</label>
                                <input id="field-area-input" type="text" readonly 
                                    class="w-full h-11 bg-tractorBg/50 border border-tractorBorder rounded-xl px-3.5 text-xs text-green-400 font-bold outline-none">
                            </div>

                            <div class="space-y-1">
                                <label class="text-xs font-bold text-slate-300 uppercase tracking-wider">Bloko / Lauko Nr.</label>
                                <input id="field-block-input" type="text" placeholder="Pvz.: 123-01" 
                                    class="w-full h-11 bg-tractorBg border border-tractorBorder focus:border-tractorPrimary rounded-xl px-3.5 text-xs text-white outline-none">
                            </div>
                        </div>

                        <div class="space-y-1">
                            <label class="text-xs font-bold text-tractorPrimaryLight uppercase tracking-wider">Pagrindinis pasėlis</label>
                            <select id="field-crop-select" class="w-full h-11 bg-tractorBg border border-tractorBorder focus:border-tractorPrimary rounded-xl px-3 text-xs text-white outline-none cursor-pointer">
                                <option value="Žieminiai kviečiai">🌾 Žieminiai kviečiai</option>
                                <option value="Žieminiai rapsai">🌱 Žieminiai rapsai</option>
                                <option value="Vasariniai miežiai">🌾 Vasariniai miežiai</option>
                                <option value="Žirniai / Pupos">🫘 Žirniai / Pupos</option>
                                <option value="Kukurūzai">🌽 Kukurūzai</option>
                                <option value="Cukriniai runkeliai">🌱 Cukriniai runkeliai</option>
                                <option value="Pūdymas / Kita">🌾 Pūdymas / Kita</option>
                            </select>
                        </div>

                        <div class="space-y-1">
                            <label class="text-xs font-bold text-slate-300 uppercase tracking-wider">Veislė / Pastabos</label>
                            <input id="field-notes-input" type="text" placeholder="Pvz.: Veislė 'Skagen'" 
                                class="w-full h-11 bg-tractorBg border border-tractorBorder focus:border-tractorPrimary rounded-xl px-3.5 text-xs text-white outline-none">
                        </div>

                        <button type="submit" class="w-full h-12 bg-tractorPrimary hover:bg-tractorPrimaryHover text-white font-bold rounded-xl text-xs uppercase tracking-wider shadow-lg shadow-tractorPrimary/20 transition cursor-pointer">
                            💾 Išsaugoti lauką
                        </button>
                    </form>
                </div>
            </div>

            <div id="field-edit-modal" class="fixed inset-0 bg-black/80 flex items-center justify-center z-[110] hidden p-4 backdrop-blur-sm">
                <div class="bg-tractorSurface border border-tractorBorder p-6 md:p-8 rounded-2xl max-w-md w-full space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
                    <div class="flex justify-between items-center border-b border-tractorBorder pb-3">
                        <h3 class="font-oswald text-xl font-bold text-white uppercase tracking-wider">✏️ Redaguoti lauko duomenis</h3>
                        <button id="btn-close-edit-modal" class="text-slate-400 hover:text-white text-xl">&times;</button>
                    </div>

                    <form id="edit-field-form" class="space-y-4">
                        <div class="space-y-1">
                            <label class="text-xs font-bold text-slate-300 uppercase tracking-wider">Lauko pavadinimas *</label>
                            <input id="edit-field-name" type="text" required class="w-full h-11 bg-tractorBg border border-tractorBorder focus:border-tractorPrimary rounded-xl px-3.5 text-xs text-white outline-none font-bold">
                        </div>

                        <div class="grid grid-cols-2 gap-3">
                            <div class="space-y-1">
                                <label class="text-xs font-bold text-slate-300 uppercase tracking-wider">Bloko / Lauko Nr.</label>
                                <input id="edit-field-block" type="text" class="w-full h-11 bg-tractorBg border border-tractorBorder focus:border-tractorPrimary rounded-xl px-3.5 text-xs text-white outline-none">
                            </div>

                            <div class="space-y-1">
                                <label class="text-xs font-bold text-tractorPrimaryLight uppercase tracking-wider">Pasėlis</label>
                                <select id="edit-field-crop" class="w-full h-11 bg-tractorBg border border-tractorBorder focus:border-tractorPrimary rounded-xl px-3 text-xs text-white outline-none cursor-pointer">
                                    <option value="Žieminiai kviečiai">🌾 Žieminiai kviečiai</option>
                                    <option value="Žieminiai rapsai">🌱 Žieminiai rapsai</option>
                                    <option value="Vasariniai miežiai">🌾 Vasariniai miežiai</option>
                                    <option value="Žirniai / Pupos">🫘 Žirniai / Pupos</option>
                                    <option value="Kukurūzai">🌽 Kukurūzai</option>
                                    <option value="Cukriniai runkeliai">🌱 Cukriniai runkeliai</option>
                                    <option value="Pūdymas / Kita">🌾 Pūdymas / Kita</option>
                                </select>
                            </div>
                        </div>

                        <div class="space-y-1">
                            <label class="text-xs font-bold text-slate-300 uppercase tracking-wider">Veislė / Pastabos</label>
                            <input id="edit-field-notes" type="text" class="w-full h-11 bg-tractorBg border border-tractorBorder focus:border-tractorPrimary rounded-xl px-3.5 text-xs text-white outline-none">
                        </div>

                        <button type="submit" class="w-full h-12 bg-tractorPrimary hover:bg-tractorPrimaryHover text-white font-bold rounded-xl text-xs uppercase tracking-wider shadow-lg shadow-tractorPrimary/20 transition cursor-pointer">
                            💾 Išsaugoti pakeitimus
                        </button>
                    </form>
                </div>
            </div>

            <!-- MODALAS: NMA LAUKŲ ĮKĖLIMAS -->
            <div id="nma-import-modal" class="fixed inset-0 bg-black/80 flex items-center justify-center z-[115] hidden p-4 backdrop-blur-sm">
                <div class="bg-tractorSurface border border-tractorBorder p-6 md:p-8 rounded-2xl max-w-lg w-full space-y-5 shadow-2xl max-h-[90vh] overflow-y-auto">
                    <div class="flex justify-between items-center border-b border-tractorBorder pb-3">
                        <h3 class="font-oswald text-xl font-bold text-white uppercase tracking-wider flex items-center gap-2">
                            <span>📁</span> Įkelti NMA Laukų Deklaraciją
                        </h3>
                        <button id="btn-close-nma-import" class="text-slate-400 hover:text-white text-xl cursor-pointer">&times;</button>
                    </div>

                    <p class="text-xs text-slate-300 leading-relaxed">
                        Įkelkite deklaracijos failą (<strong>.geojson</strong> arba <strong>.json</strong>), atsisiųstą iš NMA / PPIS sistemos. Visi jūsų laukai su plotais ir pasėliais bus automatiškai išsaugoti ūkio žemėlapyje!
                    </p>

                    <button type="button" id="btn-trigger-file-pick" class="w-full h-16 bg-tractorPrimary/20 hover:bg-tractorPrimary/30 border-2 border-dashed border-tractorPrimary text-white rounded-xl text-xs md:text-sm font-bold flex items-center justify-center gap-2.5 transition cursor-pointer">
                        <span class="text-2xl">📤</span> <span>Pasirinkti laukų failą (.geojson) iš kompiuterio</span>
                    </button>
                </div>
            </div>

            <!-- MODALAS: NMA ATASKAITOS -->
            <div id="reports-choice-modal" class="fixed inset-0 bg-black/80 flex items-center justify-center z-[110] hidden p-4 backdrop-blur-sm">
                <div class="bg-tractorSurface border border-tractorBorder p-6 md:p-8 rounded-2xl max-w-xl w-full space-y-5 shadow-2xl max-h-[90vh] overflow-y-auto">
                    <div class="flex justify-between items-center border-b border-tractorBorder pb-3">
                        <h3 class="font-oswald text-xl font-bold text-white uppercase tracking-wider flex items-center gap-2">
                            <span>📄</span> Oficialių NMA Žurnalų Generavimas
                        </h3>
                        <button id="btn-close-reports-modal" class="text-slate-400 hover:text-white text-xl">&times;</button>
                    </div>

                    <p class="text-xs text-slate-300">
                        Pasirinkite reikalingą žurnalą ir norimą formatą (A4 spausdinimui arba Excel bylą):
                    </p>

                    <div class="space-y-3.5">
                        <div class="p-4 bg-tractorBg border border-tractorBorder rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div>
                                <div class="font-bold text-white text-sm">💦 Augalų apsaugos (Purškimo) žurnalas</div>
                                <div class="text-[11px] text-slate-400">Oficiali forma pagal LR ŽŪM reikalavimus.</div>
                            </div>
                            <div class="flex items-center gap-2 shrink-0">
                                <button id="btn-pdf-spray" class="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg transition cursor-pointer">📄 PDF</button>
                                <button id="btn-xls-spray" class="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-bold rounded-lg transition cursor-pointer">📊 Excel (.XLS)</button>
                            </div>
                        </div>

                        <div class="p-4 bg-tractorBg border border-tractorBorder rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div>
                                <div class="font-bold text-white text-sm">🧪 Trąšų naudojimo apskaitos žurnalas</div>
                                <div class="text-[11px] text-slate-400">Tręšimo normos, NPK ir kalkinimo operacijos.</div>
                            </div>
                            <div class="flex items-center gap-2 shrink-0">
                                <button id="btn-pdf-fert" class="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg transition cursor-pointer">📄 PDF</button>
                                <button id="btn-xls-fert" class="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-bold rounded-lg transition cursor-pointer">📊 Excel (.XLS)</button>
                            </div>
                        </div>

                        <div class="p-4 bg-tractorBg border border-tractorBorder rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div>
                                <div class="font-bold text-white text-sm">🌾 Sėjomainos ir derliaus suvestinė</div>
                                <div class="text-[11px] text-slate-400">Visi laukai, plotai, pasėliai, nukultas derlius ir savikaina.</div>
                            </div>
                            <div class="flex items-center gap-2 shrink-0">
                                <button id="btn-pdf-rot" class="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg transition cursor-pointer">📄 PDF</button>
                                <button id="btn-xls-rot" class="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-bold rounded-lg transition cursor-pointer">📊 Excel (.XLS)</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- 🌟 ŠVARUS IR PAGRAŽINTAS VRA MODALAS SU TIKSLIA PALYDOVO DATA -->
            <div id="vra-export-modal" class="fixed inset-0 bg-black/80 flex items-center justify-center z-[125] hidden p-4 backdrop-blur-md">
                <div class="bg-tractorSurface border border-tractorBorder p-6 md:p-8 rounded-3xl max-w-xl w-full space-y-5 shadow-2xl relative max-h-[90vh] overflow-y-auto"">
                    
                    <!-- ANTRAŠTĖ -->
                    <div class="flex justify-between items-start border-b border-tractorBorder/70 pb-3">
                        <div class="space-y-1">
                            <div class="inline-flex items-center gap-1.5 bg-amber-500/15 border border-amber-500/30 text-amber-500 px-3 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider">
                                <span>🚜</span> <span>ISOBUS / VRA Kintamos Normos Užduotis</span>
                            </div>
                            <h3 class="font-oswald text-2xl font-bold text-white uppercase tracking-wide">
                                Tręšimo Žemėlapis Traktoriui
                            </h3>
                            <p class="text-xs text-slate-400">Pritaikyta John Deere, Amazone, Claas, Trimble, Bogballe barstytuvams</p>
                        </div>
                        <button id="btn-close-vra-modal" class="text-slate-400 hover:text-white text-2xl font-bold transition cursor-pointer p-1">&times;</button>
                    </div>

                    <!-- 🛰️ AIŠKUS PALYDOVO DATOS ANTSPAUDAS -->
                    <div class="p-3.5 bg-tractorBg border border-tractorBorder rounded-2xl flex items-center justify-between gap-3 text-xs">
                        <div class="flex items-center gap-2.5">
                            <span class="text-2xl">🛰️</span>
                            <div>
                                <span class="text-[10px] text-slate-400 uppercase font-bold block">Panaudotas palydovo kadras:</span>
                                <strong id="vra-satellite-date-badge" class="text-green-400 font-mono text-sm font-black">2024-06-15</strong>
                            </div>
                        </div>
                        <div class="text-right">
                            <span class="text-[10px] text-slate-400 uppercase font-bold block">Užduotis formuojama:</span>
                            <span id="vra-created-date-badge" class="text-slate-300 font-mono text-xs font-semibold">Šiandien</span>
                        </div>
                    </div>

                    <!-- 2 ŠVARŪS PARAMETRAI -->
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div class="space-y-1.5">
                            <label class="text-[11px] font-bold text-slate-300 uppercase tracking-wider block">Trąšų rūšis</label>
                            <select id="vra-fert-type" class="w-full h-11 bg-tractorBg border border-tractorBorder focus:border-amber-500 rounded-xl px-3.5 text-xs text-white font-bold outline-none cursor-pointer">
                                <option value="salietra">Amonio salietra (N 34.4%)</option>
                                <option value="npk">NPK Kompleksinės (16-16-16)</option>
                                <option value="karbamidas">Karbamidas (N 46%)</option>
                                <option value="kas32">KAS-32 (Skystos trąšos)</option>
                            </select>
                        </div>

                        <div class="space-y-1.5">
                            <label class="text-[11px] font-bold text-amber-400 uppercase tracking-wider block">Bazinė norma (kg/ha) *</label>
                            <input id="vra-base-rate" type="number" step="10" value="200" 
                                class="w-full h-11 bg-tractorBg border border-amber-500/80 focus:border-amber-400 rounded-xl px-3.5 text-sm text-amber-300 font-mono font-bold outline-none">
                        </div>
                    </div>

                    <!-- 3 ZONŲ DETALUS SKAIČIAVIMAS -->
                    <div class="bg-tractorBg border border-tractorBorder p-4.5 rounded-2xl space-y-3 shadow-inner">
                        <span class="text-xs uppercase font-bold text-slate-300 block border-b border-tractorBorder/60 pb-2">
                            📐 Normų paskirstymas pagal Sentinel-2 NDVI biomasę:
                        </span>

                        <div class="space-y-2">
                            <div class="flex justify-between items-center bg-tractorSurface p-3 rounded-xl border border-tractorBorder text-xs">
                                <div class="flex items-center gap-2.5">
                                    <span class="w-3.5 h-3.5 rounded-full bg-amber-400 shrink-0 shadow"></span>
                                    <div>
                                        <strong class="text-white block font-bold">Geltona zona (silpnesnė +20%)</strong>
                                        <span id="vra-zone-weak-area" class="text-[11px] text-slate-400">~2.5 ha (25% ploto)</span>
                                    </div>
                                </div>
                                <strong id="vra-zone-weak-rate" class="font-mono text-amber-400 text-base font-black">240 kg/ha</strong>
                            </div>

                            <div class="flex justify-between items-center bg-tractorSurface p-3 rounded-xl border border-tractorBorder text-xs">
                                <div class="flex items-center gap-2.5">
                                    <span class="w-3.5 h-3.5 rounded-full bg-green-500 shrink-0 shadow"></span>
                                    <div>
                                        <strong class="text-white block font-bold">Žalia zona (optimali norma)</strong>
                                        <span id="vra-zone-normal-area" class="text-[11px] text-slate-400">~5.0 ha (50% ploto)</span>
                                    </div>
                                </div>
                                <strong id="vra-zone-normal-rate" class="font-mono text-green-400 text-base font-black">200 kg/ha</strong>
                            </div>

                            <div class="flex justify-between items-center bg-tractorSurface p-3 rounded-xl border border-tractorBorder text-xs">
                                <div class="flex items-center gap-2.5">
                                    <span class="w-3.5 h-3.5 rounded-full bg-green-700 shrink-0 shadow"></span>
                                    <div>
                                        <strong class="text-white block font-bold">Tamsiai žalia zona (-20%)</strong>
                                        <span id="vra-zone-strong-area" class="text-[11px] text-slate-400">~2.5 ha (Apsauga nuo išgulimo)</span>
                                    </div>
                                </div>
                                <strong id="vra-zone-strong-rate" class="font-mono text-green-300 text-base font-black">160 kg/ha</strong>
                            </div>
                        </div>

                        <!-- REZULTATAI -->
                        <div class="pt-2.5 border-t border-tractorBorder/70 grid grid-cols-2 gap-3 text-xs">
                            <div class="bg-tractorSurface p-3 rounded-xl border border-tractorBorder space-y-0.5">
                                <span class="text-slate-400 text-[11px] block">Viso trąšų poreikis:</span>
                                <strong id="vra-total-tons" class="text-white font-mono text-base font-black">2.00 t</strong>
                            </div>
                            <div class="bg-tractorSurface p-3 rounded-xl border border-tractorBorder space-y-0.5 text-right">
                                <span class="text-slate-400 text-[11px] block">Sutaupoma trąšų:</span>
                                <strong id="vra-saved-percent" class="text-green-400 font-mono text-base font-black">~12.5% (~185 kg)</strong>
                            </div>
                        </div>
                    </div>

                    <!-- 🌟 STAMBUS RYŠKUS ATSISIUNTIMO MYGTUKAS -->
                    <button type="button" id="btn-download-vra-shapefile" class="w-full h-14 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-2xl text-xs sm:text-sm uppercase tracking-wider shadow-xl shadow-amber-500/20 flex items-center justify-center gap-3 transition transform active:scale-95 cursor-pointer">
                        <span class="text-xl">💾</span>
                        <span>Atsisiųsti Shapefile Archyvą į USB (.ZIP)</span>
                    </button>
                </div>
            </div>

        </div>
    `;
}

export function getEmptyListHtml() {
    return `
        <div class="text-center py-10 text-slate-500 text-sm">
            Dar neturite pažymėtų laukų.<br>Spauskite <strong>„📁 Įkelti NMA laukus“</strong> arba <strong>„✏️ Brėžti lauką“</strong> viršuje!
        </div>
    `;
}

export function getFieldRowHtml(f, idx, isSelected, ndvi) {
    return `
        <div id="field-row-${f.id}" class="field-item-row p-5 rounded-2xl border transition cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
            isSelected 
            ? 'bg-myPostBg border-tractorPrimary ring-2 ring-tractorPrimary shadow-2xl' 
            : 'bg-tractorBg border-tractorBorder hover:border-tractorPrimary'
        }" onclick="window.selectAndFocusField('${f.id}')">
            
            <div class="space-y-1">
                <div class="flex items-center gap-2.5">
                    <span class="text-xs text-slate-400 font-mono font-bold bg-tractorSurface px-2 py-0.5 rounded border border-tractorBorder">#${idx + 1}</span>
                    <h4 class="font-bold text-white text-base md:text-lg">${f.name}</h4>
                    ${f.fieldBlockNumber ? `<span class="text-xs text-slate-400">(${f.fieldBlockNumber})</span>` : ''}
                    <span class="text-xs bg-tractorPrimary/20 text-tractorPrimaryLight px-3 py-1 rounded-lg font-bold border border-tractorPrimary/40">${f.areaHa} ha</span>
                    <span class="text-xs bg-green-950/40 text-green-400 px-2.5 py-0.5 rounded-md font-bold font-mono border border-green-800/50">🛰️ NDVI: ${ndvi.score}</span>
                </div>
                <p class="text-xs md:text-sm text-slate-300">
                    🌱 Pasėlis: <strong class="text-white">${f.crop}</strong> ${f.notes ? `• <span class="text-slate-400 italic">${f.notes}</span>` : ''}
                </p>
            </div>

            <div class="flex items-center justify-between sm:justify-end gap-5 pt-2 sm:pt-0 border-t sm:border-t-0 border-tractorBorder/60">
                <div class="text-left sm:text-right text-xs">
                    <span class="text-slate-400 block">Darbų žurnale:</span>
                    <strong class="text-white font-bold text-sm">${f.operations ? f.operations.length : 0} operacijos</strong>
                </div>
                <span class="h-10 px-4 bg-tractorSurface hover:bg-tractorPrimary hover:text-white border border-tractorBorder rounded-xl text-xs font-bold text-slate-200 flex items-center gap-1 transition">
                    ${isSelected ? 'Pasirinktas ✓' : 'Atverti pasą →'}
                </span>
            </div>

        </div>
    `;
}