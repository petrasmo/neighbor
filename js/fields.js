// js/fields.js
import { db } from './firebase.js';
import { showDialog } from './ui.js';
import { 
    initOrRefreshMap, drawFieldsOnMap, highlightFieldPolygon, 
    startDrawing, stopDrawing, getDrawingPoints, calculatePolygonAreaHa 
} from './fieldsMap.js';
import { getTodayDateString, openFieldDetail, renderOperationsList } from './fieldsJournal.js';
import { generateOfficialReport, exportReportToExcel } from './fieldsReport.js';

let userFieldsList = [];
let unsubscribeFields = null;
let selectedFieldId = null;
let currentMapCoords = { lat: 56.0593, lng: 24.4036 };
let cachedUserData = null; // 👈 IŠSAUGOME VARTOTOJO DUOMENIS GARAŽUI

export function initFieldsTab(currentUser, userData) {
    const container = document.getElementById('view-tab-fields');
    if (!container) return;

    cachedUserData = userData;

    if (userData?.garageLat && userData?.garageLon) {
        currentMapCoords = { lat: userData.garageLat, lng: userData.garageLon };
    }

    container.innerHTML = `
        <div class="space-y-6 max-w-6xl mx-auto w-full">
            
            <!-- HEADERIS -->
            <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-tractorBorder pb-4">
                <div>
                    <h2 class="font-oswald text-2xl md:text-3xl font-bold uppercase tracking-wider text-white flex items-center gap-2">
                        <span>🗺️</span> Mano Laukai ir Agronominis Žurnalas
                    </h2>
                    <p class="text-xs md:text-sm text-slate-300 mt-1">
                        Valdykite laukų ribas palydove, registruokite sėją, trąšas, derlių bei generuokite NMA ataskaitas.
                    </p>
                </div>

                <div class="flex flex-wrap items-center gap-2.5">
                    <button id="btn-open-reports-modal" class="h-11 px-4 bg-tractorBg hover:bg-zinc-800 text-green-400 border border-tractorPrimary/60 text-xs md:text-sm font-bold rounded-xl flex items-center gap-2 transition cursor-pointer">
                        <span>📄</span> NMA Žurnalai (PDF / Excel)
                    </button>
                    <button id="btn-start-draw" class="h-11 px-5 bg-tractorPrimary hover:bg-tractorPrimaryHover text-white text-xs md:text-sm font-bold rounded-xl flex items-center gap-2 shadow-lg shadow-tractorPrimary/20 transition cursor-pointer">
                        <span>✏️</span> Brėžti naują lauką
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

            <!-- 1. PALYDOVINIS ŽEMĖLAPIS -->
            <div class="bg-tractorSurface border border-tractorBorder rounded-2xl p-4 md:p-5 shadow-xl space-y-3 w-full">
                <div id="fields-map" class="h-[520px] w-full rounded-xl z-0 relative overflow-hidden border border-tractorBorder/80 bg-zinc-900"></div>
                <div class="flex justify-between items-center text-xs md:text-sm text-slate-300 px-1 pt-1">
                    <span id="map-layer-indicator-label">🛰️ Palydovinis vaizdas (ESRI World Imagery)</span>
                    <span>Viso ūkio plotas: <strong id="total-area-counter" class="text-green-400 font-bold text-base">0.00 ha</strong></span>
                </div>
            </div>

            <!-- 2. DETALUS LAUKO PASAS -->
            <div id="field-detail-section" class="hidden bg-tractorSurface border-2 border-tractorPrimary rounded-2xl p-6 md:p-8 shadow-2xl space-y-6">
                <div class="flex flex-col md:flex-row md:items-start justify-between gap-4 border-b border-tractorBorder/80 pb-5">
                    <div>
                        <div class="inline-flex items-center gap-1.5 bg-tractorPrimary/20 text-tractorPrimaryLight px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-wider mb-2">
                            <span>🌾</span> Pasirinktas lauko pasas
                        </div>
                        <h3 id="detail-field-title" class="font-oswald text-2xl md:text-3xl font-bold text-white tracking-wide">Kraunasi...</h3>
                        <p id="detail-field-meta" class="text-sm text-slate-300 mt-1"></p>
                    </div>

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
                </div>

                <!-- OPERACIJOS REGISTRAVIMAS -->
                <div class="bg-tractorBg/90 border border-tractorBorder p-5 md:p-6 rounded-2xl space-y-4">
                    <h4 class="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                        <span>➕</span> Registruoti atliktą darbą šiame lauke
                    </h4>

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
                                <input id="op-date" type="text" pattern="[0-9]{4}-[0-9]{2}-[0-9]{2}" placeholder="2026-08-31" required 
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
                                <input id="op-cost" type="number" step="0.01" placeholder="Pvz.: 450.00" class="w-full h-11 bg-tractorSurface border border-tractorBorder focus:border-amber-400 rounded-xl px-3 text-xs md:text-sm text-amber-300 font-mono font-bold outline-none">
                            </div>
                        </div>

                        <div class="space-y-1">
                            <label class="text-[11px] font-bold text-slate-400 uppercase block">Pastabos / Oro sąlygos</label>
                            <input id="op-notes" type="text" placeholder="Pvz.: Vėjas 2 m/s, oro temp. +18°C" class="w-full h-11 bg-tractorSurface border border-tractorBorder focus:border-tractorPrimary rounded-xl px-3 text-xs md:text-sm text-white outline-none">
                        </div>

                        <button type="submit" class="w-full h-12 bg-tractorPrimary hover:bg-tractorPrimaryHover text-white font-bold rounded-xl text-xs md:text-sm uppercase tracking-wider shadow-lg shadow-tractorPrimary/20 transition cursor-pointer">
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

            <!-- 3. LAUKŲ SĄRAŠAS EILUTĖMIS PER VISĄ PLOTĮ -->
            <div class="bg-tractorSurface border border-tractorBorder rounded-2xl p-6 md:p-8 shadow-xl space-y-4">
                <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-tractorBorder/70 pb-3">
                    <div>
                        <h3 class="font-oswald text-xl md:text-2xl font-bold text-white uppercase tracking-wider flex items-center gap-2">
                            <span>📋</span> Visi ūkio laukai (<span id="fields-count-badge">0</span>)
                        </h3>
                        <p class="text-xs md:text-sm text-slate-400">Paspauskite ant lauko eilutės, kad žemėlapis prisiartintų ir atvertų jo pasą.</p>
                    </div>
                </div>

                <div id="fields-table-list" class="space-y-3 pt-1">
                    <div class="text-center py-8 text-slate-500 text-xs">Kraunami jūsų laukai...</div>
                </div>
            </div>

            <!-- MODALAS: NAUJO LAUKO IŠSAUGOJIMAS -->
            <div id="field-save-modal" class="fixed inset-0 bg-black/80 flex items-center justify-center z-[110] hidden p-4 backdrop-blur-sm">
                <div class="bg-tractorSurface border border-tractorBorder p-6 md:p-8 rounded-2xl max-w-md w-full space-y-4 shadow-2xl">
                    <div class="flex justify-between items-center border-b border-tractorBorder pb-3">
                        <h3 class="font-oswald text-xl font-bold text-white uppercase tracking-wider">Išsaugoti naują lauką</h3>
                        <button id="btn-close-save-modal" class="text-slate-400 hover:text-white text-xl">&times;</button>
                    </div>

                    <form id="save-field-form" class="space-y-4">
                        <div class="space-y-1">
                            <label class="text-xs font-bold text-slate-300 uppercase tracking-wider">Lauko pavadinimas *</label>
                            <input id="field-name-input" type="text" required placeholder="Pvz.: Prie miško, Pakalnė" 
                                class="w-full h-11 bg-tractorBg border border-tractorBorder focus:border-tractorPrimary rounded-xl px-3.5 text-xs text-white outline-none">
                        </div>

                        <div class="grid grid-cols-2 gap-3">
                            <div class="space-y-1">
                                <label class="text-xs font-bold text-slate-300 uppercase tracking-wider">Lauko / Bloko Nr. (NMA)</label>
                                <input id="field-block-input" type="text" placeholder="Pvz.: 12-04 / Laukas 1" 
                                    class="w-full h-11 bg-tractorBg border border-tractorBorder focus:border-tractorPrimary rounded-xl px-3.5 text-xs text-white outline-none">
                            </div>

                            <div class="space-y-1">
                                <label class="text-xs font-bold text-slate-300 uppercase tracking-wider">Plotas</label>
                                <input id="field-area-input" type="text" readonly 
                                    class="w-full h-11 bg-tractorBg/50 border border-tractorBorder rounded-xl px-3.5 text-xs text-green-400 font-bold outline-none">
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

            <!-- MODALAS: NMA ATASKAITOS -->
            <div id="reports-choice-modal" class="fixed inset-0 bg-black/80 flex items-center justify-center z-[110] hidden p-4 backdrop-blur-sm">
                <div class="bg-tractorSurface border border-tractorBorder p-6 md:p-8 rounded-2xl max-w-xl w-full space-y-5 shadow-2xl">
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
                                <button id="btn-pdf-spray" class="px-3 py-1.5 bg-red-950/40 hover:bg-red-900 border border-red-800/60 text-red-300 text-xs font-bold rounded-lg transition cursor-pointer">📄 PDF</button>
                                <button id="btn-xls-spray" class="px-3 py-1.5 bg-green-950/40 hover:bg-green-900 border border-green-800/60 text-green-300 text-xs font-bold rounded-lg transition cursor-pointer">📊 Excel (.CSV)</button>
                            </div>
                        </div>

                        <div class="p-4 bg-tractorBg border border-tractorBorder rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div>
                                <div class="font-bold text-white text-sm">🧪 Trąšų naudojimo apskaitos žurnalas</div>
                                <div class="text-[11px] text-slate-400">Tręšimo normos, NPK ir kalkinimo operacijos.</div>
                            </div>
                            <div class="flex items-center gap-2 shrink-0">
                                <button id="btn-pdf-fert" class="px-3 py-1.5 bg-red-950/40 hover:bg-red-900 border border-red-800/60 text-red-300 text-xs font-bold rounded-lg transition cursor-pointer">📄 PDF</button>
                                <button id="btn-xls-fert" class="px-3 py-1.5 bg-green-950/40 hover:bg-green-900 border border-green-800/60 text-green-300 text-xs font-bold rounded-lg transition cursor-pointer">📊 Excel (.CSV)</button>
                            </div>
                        </div>

                        <div class="p-4 bg-tractorBg border border-tractorBorder rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div>
                                <div class="font-bold text-white text-sm">🌾 Sėjomainos ir derliaus suvestinė</div>
                                <div class="text-[11px] text-slate-400">Visi laukai, plotai, pasėliai, nukultas derlius ir savikaina.</div>
                            </div>
                            <div class="flex items-center gap-2 shrink-0">
                                <button id="btn-pdf-rot" class="px-3 py-1.5 bg-red-950/40 hover:bg-red-900 border border-red-800/60 text-red-300 text-xs font-bold rounded-lg transition cursor-pointer">📄 PDF</button>
                                <button id="btn-xls-rot" class="px-3 py-1.5 bg-green-950/40 hover:bg-green-900 border border-green-800/60 text-green-300 text-xs font-bold rounded-lg transition cursor-pointer">📊 Excel (.CSV)</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

        </div>
    `;

    // 👈 PERDUODAME userData SU GARAŽO KOORDINATĖMIS
    initOrRefreshMap(currentMapCoords, userData);
    setupFieldEvents(currentUser, userData);
    listenToUserFields(currentUser);
}

export function refreshFieldsMap() {
    initOrRefreshMap(currentMapCoords, cachedUserData);
}

function setupFieldEvents(currentUser, userData) {
    const drawBtn = document.getElementById('btn-start-draw');
    const cancelBtn = document.getElementById('btn-cancel-draw');
    const finishBtn = document.getElementById('btn-finish-draw');
    const helperBanner = document.getElementById('draw-helper-banner');
    const saveModal = document.getElementById('field-save-modal');
    const closeSaveModalBtn = document.getElementById('btn-close-save-modal');

    const reportsModal = document.getElementById('reports-choice-modal');
    const openReportsBtn = document.getElementById('btn-open-reports-modal');
    const closeReportsBtn = document.getElementById('btn-close-reports-modal');

    openReportsBtn.onclick = () => reportsModal.classList.remove('hidden');
    closeReportsBtn.onclick = () => reportsModal.classList.add('hidden');

    document.getElementById('btn-pdf-spray').onclick = () => { reportsModal.classList.add('hidden'); generateOfficialReport('spray', userFieldsList, userData); };
    document.getElementById('btn-pdf-fert').onclick = () => { reportsModal.classList.add('hidden'); generateOfficialReport('fertilizer', userFieldsList, userData); };
    document.getElementById('btn-pdf-rot').onclick = () => { reportsModal.classList.add('hidden'); generateOfficialReport('rotation', userFieldsList, userData); };

    document.getElementById('btn-xls-spray').onclick = () => { reportsModal.classList.add('hidden'); exportReportToExcel('spray', userFieldsList, userData); };
    document.getElementById('btn-xls-fert').onclick = () => { reportsModal.classList.add('hidden'); exportReportToExcel('fertilizer', userFieldsList, userData); };
    document.getElementById('btn-xls-rot').onclick = () => { reportsModal.classList.add('hidden'); exportReportToExcel('rotation', userFieldsList, userData); };

    drawBtn.onclick = () => {
        if (!currentUser) {
            showDialog("Reikalingas prisijungimas", "Prisijunkite, kad galėtumėte braižyti savo laukus.", "🔒");
            return;
        }
        startDrawing();
        drawBtn.classList.add('hidden');
        cancelBtn.classList.remove('hidden');
        helperBanner.classList.remove('hidden');
    };

    cancelBtn.onclick = () => {
        stopDrawing();
        drawBtn.classList.remove('hidden');
        cancelBtn.classList.add('hidden');
        helperBanner.classList.add('hidden');
    };

    finishBtn.onclick = () => {
        const points = getDrawingPoints();
        if (points.length < 3) {
            showDialog("Trūksta taškų", "Pažymėkite bent 3 taškus aplink lauką žemėlapyje.", "⚠️");
            return;
        }
        const areaHa = calculatePolygonAreaHa(points);
        document.getElementById('field-area-input').value = `${areaHa} ha`;
        saveModal.classList.remove('hidden');
    };

    closeSaveModalBtn.onclick = () => saveModal.classList.add('hidden');

    document.getElementById('save-field-form').onsubmit = async (e) => {
        e.preventDefault();
        const name = document.getElementById('field-name-input').value.trim();
        const blockNumber = document.getElementById('field-block-input').value.trim();
        const areaHa = parseFloat(document.getElementById('field-area-input').value) || 0;
        const crop = document.getElementById('field-crop-select').value;
        const notes = document.getElementById('field-notes-input').value.trim();

        const cleanCoords = getDrawingPoints().map(p => ({ lat: p.lat, lng: p.lng }));

        const fieldDocRef = db.collection("user_fields").doc();
        await fieldDocRef.set({
            id: fieldDocRef.id,
            userId: currentUser.uid,
            name: name,
            fieldBlockNumber: blockNumber,
            areaHa: areaHa,
            crop: crop,
            notes: notes,
            polygonCoordinates: cleanCoords,
            operations: [
                {
                    type: "Sėja",
                    date: getTodayDateString(),
                    product: crop,
                    rate: "Sėjos pradžia",
                    cost: 0,
                    notes: `Pradinis lauko įkėlimas. ${notes}`
                }
            ],
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        saveModal.classList.add('hidden');
        cancelBtn.click();
        showDialog("Laukas išsaugotas! 🌾", `Laukas „${name}“ (${areaHa} ha) sėkmingai pridėtas.`, "✅");
    };

    document.getElementById('add-operation-form').onsubmit = async (e) => {
        e.preventDefault();
        if (!selectedFieldId) return;

        const opType = document.getElementById('op-type').value;
        const opDate = document.getElementById('op-date').value || getTodayDateString();
        const opProduct = document.getElementById('op-product').value.trim();
        const opRate = document.getElementById('op-rate').value.trim();
        const opCost = parseFloat(document.getElementById('op-cost').value) || 0;
        const opNotes = document.getElementById('op-notes').value.trim();

        const newOp = {
            type: opType,
            date: opDate,
            product: opProduct,
            rate: opRate,
            cost: opCost,
            notes: opNotes
        };

        await db.collection("user_fields").doc(selectedFieldId).update({
            operations: firebase.firestore.FieldValue.arrayUnion(newOp)
        });

        document.getElementById('op-product').value = '';
        document.getElementById('op-rate').value = '';
        document.getElementById('op-cost').value = '';
        document.getElementById('op-notes').value = '';

        const field = userFieldsList.find(f => f.id === selectedFieldId);
        if (field) {
            field.operations = field.operations || [];
            field.operations.push(newOp);
            renderOperationsList(field);
        }

        showDialog("Įrašyta! 🚜", "Operacija sėkmingai įtraukta į žurnalą.", "✅");
    };
}

function listenToUserFields(currentUser) {
    if (!currentUser) return;
    if (unsubscribeFields) unsubscribeFields();

    unsubscribeFields = db.collection("user_fields")
        .where("userId", "==", currentUser.uid)
        .onSnapshot((snapshot) => {
            userFieldsList = [];
            let totalHa = 0;

            snapshot.forEach(doc => {
                const f = doc.data();
                userFieldsList.push(f);
                totalHa += parseFloat(f.areaHa || 0);
            });

            const countBadge = document.getElementById('fields-count-badge');
            const totalAreaEl = document.getElementById('total-area-counter');
            if (countBadge) countBadge.textContent = userFieldsList.length;
            if (totalAreaEl) totalAreaEl.textContent = `${totalHa.toFixed(2)} ha`;

            renderFieldsTableRows();
            drawFieldsOnMap(userFieldsList, selectedFieldId, (id) => window.selectAndFocusField(id));
        });
}

function renderFieldsTableRows() {
    const box = document.getElementById('fields-table-list');
    if (!box) return;

    if (userFieldsList.length === 0) {
        box.innerHTML = `
            <div class="text-center py-10 text-slate-500 text-sm">
                Dar neturite pažymėtų laukų.<br>Paspauskite <strong>„✏️ Brėžti naują lauką“</strong> viršuje ir apveskite savo sklypą palydove!
            </div>
        `;
        return;
    }

    box.innerHTML = userFieldsList.map((f, idx) => {
        const isSelected = f.id === selectedFieldId;

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
                    </div>
                    <p class="text-xs md:text-sm text-slate-300">
                        🌱 Pagrindinis pasėlis: <strong class="text-white">${f.crop}</strong> ${f.notes ? `• <span class="text-slate-400 italic">${f.notes}</span>` : ''}
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
    }).join('');
}

window.selectAndFocusField = function(fieldId) {
    selectedFieldId = fieldId;
    const field = userFieldsList.find(f => f.id === fieldId);
    if (!field) return;

    openFieldDetail(field);
    highlightFieldPolygon(fieldId);
    renderFieldsTableRows();
};