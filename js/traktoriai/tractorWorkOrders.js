// js/traktoriai/tractorWorkOrders.js
import { db } from '../core/firebase.js';
import { showBottomToast, showDialog } from '../core/ui.js';
import { loadCropsClassifier, getAllCrops } from '../core/cropsClassifier.js';
import {
    generateFertilizerVraGrid,
    applyFertilizerRatesToCells,
    generateLimingVraGrid,
    buildBinaryShapefileFromCells
} from '../ukis/vraGridEngine.js';

let previewMap = null;
let previewPolygonLayer = null;
let previewAbLinesLayer = null;

// Gyvos rinkos kainos iš Firestore (be statinių „iš lubų“ reikšmių)
let liveDieselPriceEurL = null;
let liveFertPriceEurTon = null;
let loadedCropsList = [];

let currentPreviewMetrics = {
    passesCount: 0,
    turnsCount: 0,
    tramlinesCount: 0,
    tramlineEveryN: 0,
    distanceKm: 0,
    hoursEst: 0,
    fuelLiters: 0,
    fuelCostEur: 0,
    totalCostEur: 0,
    angleDeg: 90,
    waypointsLatLng: []
};

let currentSeedingMetrics = {
    cropName: '',
    variety: '',
    rateKgHa: 0,
    totalSeedKg: 0,
    bigBagsCount: 0,
    hopperFills: 0,
    seedCostEur: 0,
    fertTotalKg: 0,
    fertBagsCount: 0,
    fertCostEur: 0,
    withFert: false
};

let unsubscribeFieldsTasks = null;
let unsubscribeDeereTasks = null;
let cachedCloudTasks = [];
let cachedFieldTasks = [];
let pendingSubmitAction = 'planned'; // 'planned' | 'send_now'

export function refreshWorkOrdersTractorDropdown(realMachines = []) {
    const sel = document.getElementById('order-tractor-select');
    if (!sel) return;

    let machineOptions = '';
    if (realMachines && realMachines.length > 0) {
        machineOptions = realMachines.map(m => {
            const isComb = (m.category || '').toLowerCase().includes('combine') || (m.name || '').toLowerCase().includes('kombain') || (m.model || '').toUpperCase().includes('S7');
            return `<option value="${m.name}|johndeere">${isComb ? '🌾' : '🚜'} ${m.name} (Belaidis JDLink™ Cloud)</option>`;
        }).join('');
    } else {
        machineOptions = `<option value="John Deere 8R 370|johndeere">🦌 John Deere 8R 370 (Belaidis JDLink™ Cloud)</option>`;
    }

    const usbOption = `<option value="Ūkio Traktorius (USB)|universal">📱 Kitas ūkio traktorius (USB / Kabinos ekranas)</option>`;
    sel.innerHTML = machineOptions + usbOption;
}

export function renderTractorWorkOrdersSection() {
    const todayStr = new Date().toISOString().split('T')[0];
    if (previewMap) {
        previewMap.remove();
        previewMap = null;
    }

    return `
        <style>
            .work-orders-split {
                display: grid;
                grid-template-columns: 1fr;
                gap: 20px;
                width: 100%;
            }
            @media (min-width: 1024px) {
                .work-orders-split {
                    grid-template-columns: 490px minmax(0, 1fr);
                }
            }
        </style>

        <div class="work-orders-split">
            
            <!-- KAIRĖ PUSĖ: DARBO UŽDUOTIES FORMA + SĖJOS / AB LINIJŲ KONFIGŪRATORIUS -->
            <div class="bg-tractorSurface border-2 border-tractorBorder rounded-2xl p-5 shadow-xl space-y-4 h-fit">
                <div class="border-b border-tractorBorder/70 pb-3">
                    <span class="text-[10px] font-black uppercase tracking-widest text-amber-400 block">AutoTrac™ Planavimas & Dispečerinė</span>
                    <h3 class="font-oswald text-xl font-bold uppercase tracking-wide flex items-center gap-2" style="color: var(--text-main);">
                        <span>📤</span> Suplanuoti Lauko Darbą ir Vagas
                    </h3>
                    <p class="text-xs text-slate-400 mt-0.5">
                        Nustatykite padargo plotį, sėjos ar kitas normas, patikrinkite vagas žemėlapyje, išsaugokite planą arba siųskite į kabiną.
                    </p>
                </div>

                <form id="form-create-tractor-order" novalidate class="space-y-3.5 text-xs">
                    
                    <!-- 1. TECHNIKA -->
                    <div class="space-y-1">
                        <label class="font-bold uppercase text-slate-300 block">1. Kuriai technikai priskiriame? *</label>
                        <select id="order-tractor-select" class="w-full h-11 bg-tractorBg border border-tractorBorder focus:border-tractorPrimary rounded-xl px-3 font-bold outline-none cursor-pointer" style="color: var(--text-main);">
                            <option value="John Deere 8R 370|johndeere">🦌 John Deere 8R 370 (Belaidis JDLink™ Cloud)</option>
                        </select>
                    </div>

                    <!-- 2. DARBO TIPAS -->
                    <div class="space-y-1">
                        <label class="font-bold uppercase text-slate-300 block">2. Darbo tipas (pagal Darbų Žurnalą) *</label>
                        <select id="order-category-select" class="w-full h-11 bg-tractorBg border border-tractorBorder focus:border-tractorPrimary rounded-xl px-3 font-bold outline-none cursor-pointer" style="color: var(--text-main);">
                            <option value="Žemės dirbimas" selected>🚜 Žemės dirbimas (Arimas / Skutimas / Kultivavimas)</option>
                            <option value="Sėja">🌱 Sėja (MTG norma, didmaišiai, bunkeriai ir vėžės)</option>
                            <option value="Kūlimas">🌾 Kūlimas / Derlius (Javų kūlimas kombainu)</option>
                            <option value="Purškimas">💦 Purškimas (Augalų apsauga – į NMA AAP žurnalą)</option>
                            <option value="Tręšimas">🧪 Tręšimas vienoda norma (į NMA Trąšų žurnalą)</option>
                            <option value="vra_map">🗺️ Tikslusis VRA Tręšimas / Kalkinimas (Pagal žemėlapį .ZIP)</option>
                        </select>
                    </div>

                    <!-- 3. LAUKAS (BENDRAS STANDARTINIAMS DARBAMS IR SĖJAI) -->
                    <div id="box-order-field-wrap" class="space-y-1">
                        <label class="font-bold uppercase text-green-400 block">3. Pasirinkite Lauką *</label>
                        <select id="order-field-select" class="w-full h-11 bg-tractorBg border border-tractorBorder rounded-xl px-3 font-bold outline-none cursor-pointer" style="color: var(--text-main);">
                            <option value="">Kraunami laukai...</option>
                        </select>
                    </div>

                    <!-- 3A. JEI PASIRINKTAS VRA ŽEMĖLAPIS -->
                    <div id="box-order-vra-select" class="space-y-1 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 hidden">
                        <label class="font-bold uppercase text-amber-400 block">3. Pasirinkite paruoštą VRA projektą *</label>
                        <select id="order-vra-plan-select" class="w-full h-10 bg-tractorBg border border-tractorBorder rounded-xl px-3 font-bold outline-none cursor-pointer mt-1" style="color: var(--text-main);">
                            <option value="">Kraunami VRA projektai...</option>
                        </select>
                    </div>

                    <!-- 3B. STANDARTINIAI PARAMETRAI (ARIMUI, KŪLIMUI, PURŠKIMUI, TRĘŠIMUI) -->
                    <div id="box-order-standard-fields" class="grid grid-cols-2 gap-2.5">
                        <div class="space-y-1">
                            <label id="lbl-order-product" class="font-bold uppercase text-slate-300 block">Operacija / Produktas *</label>
                            <input id="order-product-input" type="text" value="Arimas verčiamu plūgu"
                                class="w-full h-10 bg-tractorBg border border-tractorBorder rounded-xl px-3 font-bold outline-none" style="color: var(--text-main);">
                        </div>
                        <div class="space-y-1">
                            <label id="lbl-order-rate" class="font-bold uppercase text-slate-300 block">Gylis / Norma *</label>
                            <input id="order-rate-input" type="text" value="22 cm gylis"
                                class="w-full h-10 bg-tractorBg border border-tractorBorder rounded-xl px-3 font-mono font-bold outline-none" style="color: var(--text-main);">
                        </div>
                    </div>

                    <!-- 🌱 3C. IŠMANUS SĖJOS KONFIGŪRATORIUS (RODOMAS TIK PASIRINKUS „🌱 Sėja“) -->
                    <div id="box-order-seeding-config" class="hidden p-3.5 bg-green-500/10 border border-green-500/40 rounded-xl space-y-3">
                        <div class="flex items-center justify-between border-b border-green-500/30 pb-2">
                            <span class="font-extrabold uppercase text-[11px] text-green-500 flex items-center gap-1.5">
                                <span>🌱</span> <span>Tikslusis Sėjos Planavimas (Iš Pasėlių Klasifikatoriaus)</span>
                            </span>
                            <strong id="seed-order-calc-rate-badge" class="font-mono font-black text-xs text-green-400">0 kg/ha</strong>
                        </div>

                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            <div class="space-y-1">
                                <label class="text-[11px] font-bold text-slate-300 block">Ką sėjame (Kultūra) *</label>
                                <select id="seed-order-crop-select" class="w-full h-10 bg-tractorBg border border-tractorBorder rounded-xl px-2.5 font-bold outline-none cursor-pointer" style="color: var(--text-main);">
                                    <option value="">Kraunami pasėliai...</option>
                                </select>
                            </div>
                            <div class="space-y-1">
                                <label class="text-[11px] font-bold text-slate-300 block">Veislė (nebūtina)</label>
                                <input id="seed-order-variety" type="text" placeholder="Pvz.: Skagen / KWS Emil"
                                    class="w-full h-10 bg-tractorBg border border-tractorBorder rounded-xl px-3 font-bold outline-none" style="color: var(--text-main);">
                            </div>
                        </div>

                        <div class="grid grid-cols-4 gap-2">
                            <div class="space-y-1">
                                <label class="text-[10px] font-bold text-slate-300 block truncate">Daigai (mln/ha)</label>
                                <input id="seed-order-density" type="number" step="0.05" min="0.1"
                                    class="w-full h-9 bg-tractorBg border border-tractorBorder rounded-lg px-2 font-mono font-bold outline-none" style="color: var(--text-main);">
                            </div>
                            <div class="space-y-1">
                                <label class="text-[10px] font-bold text-slate-300 block truncate">MTG (g)</label>
                                <input id="seed-order-mtg" type="number" step="0.1" min="1"
                                    class="w-full h-9 bg-tractorBg border border-tractorBorder rounded-lg px-2 font-mono font-bold outline-none" style="color: var(--text-main);">
                            </div>
                            <div class="space-y-1">
                                <label class="text-[10px] font-bold text-slate-300 block truncate">Daigum. (%)</label>
                                <input id="seed-order-germ" type="number" step="1" min="50" max="100"
                                    class="w-full h-9 bg-tractorBg border border-tractorBorder rounded-lg px-2 font-mono font-bold outline-none" style="color: var(--text-main);">
                            </div>
                            <div class="space-y-1">
                                <label class="text-[10px] font-bold text-slate-300 block truncate">Švarum. (%)</label>
                                <input id="seed-order-purity" type="number" step="0.5" min="70" max="100"
                                    class="w-full h-9 bg-tractorBg border border-tractorBorder rounded-lg px-2 font-mono font-bold outline-none" style="color: var(--text-main);">
                            </div>
                        </div>

                        <div class="grid grid-cols-3 gap-2">
                            <div class="space-y-1">
                                <label class="text-[10px] font-bold text-amber-400 block truncate">Sėklos kaina (€/t)</label>
                                <input id="seed-order-price" type="number" step="10" min="0"
                                    class="w-full h-9 bg-tractorBg border border-tractorBorder rounded-lg px-2 font-mono font-bold text-amber-400 outline-none">
                            </div>
                            <div class="space-y-1">
                                <label class="text-[10px] font-bold text-slate-300 block truncate">Sėkladėžė (kg)</label>
                                <input id="seed-order-hopper" type="number" step="100" min="200" value="3000"
                                    class="w-full h-9 bg-tractorBg border border-tractorBorder rounded-lg px-2 font-mono font-bold outline-none" style="color: var(--text-main);">
                            </div>
                            <div class="space-y-1">
                                <label class="text-[10px] font-bold text-sky-400 block truncate">Vėžės purkšt. (m)</label>
                                <input id="seed-order-tramline-width" type="number" step="1" min="0" max="48" value="24"
                                    class="w-full h-9 bg-tractorBg border border-tractorBorder rounded-lg px-2 font-mono font-bold text-sky-400 outline-none" title="0 = be technologinių vėžių">
                            </div>
                        </div>

                        <!-- STARTINĖS TRĄŠOS KARTU SU SĖJA -->
                        <div class="pt-1 border-t border-green-500/20 space-y-2">
                            <label class="flex items-center gap-2 cursor-pointer font-bold text-slate-200 select-none">
                                <input id="seed-order-with-fert" type="checkbox" class="w-4 h-4 accent-tractorPrimary cursor-pointer">
                                <span>🧪 Sėti kartu su startinėmis NPK trąšomis (dvigubas bunkeris)</span>
                            </label>

                            <div id="box-seed-starter-fert" class="hidden grid grid-cols-2 gap-2">
                                <div class="space-y-1">
                                    <label class="text-[10px] font-bold text-slate-300 block">Trąšų norma (kg/ha)</label>
                                    <input id="seed-order-fert-rate" type="number" step="5" value="150"
                                        class="w-full h-9 bg-tractorBg border border-tractorBorder rounded-lg px-2 font-mono font-bold outline-none" style="color: var(--text-main);">
                                </div>
                                <div class="space-y-1">
                                    <label class="text-[10px] font-bold text-amber-400 block">Trąšų kaina (€/t)</label>
                                    <input id="seed-order-fert-price" type="number" step="5" value="380"
                                        class="w-full h-9 bg-tractorBg border border-tractorBorder rounded-lg px-2 font-mono font-bold text-amber-400 outline-none">
                                </div>
                            </div>

                            <label class="flex items-center gap-2 cursor-pointer text-[11px] text-green-400 font-bold select-none">
                                <input id="seed-order-update-crop" type="checkbox" checked class="w-4 h-4 accent-tractorPrimary cursor-pointer">
                                <span>🌾 Užbaigus darbą, automatiškai atnaujinti šio lauko pasėlį pase</span>
                            </label>
                        </div>
                    </div>

                    <!-- 4. PADARGO PLOTIS IR AUTOTRAC AB KRYPTIES KAMPAS -->
                    <div class="p-3.5 bg-tractorBg border border-tractorBorder rounded-xl space-y-3">
                        <div class="flex items-center justify-between">
                            <span class="font-extrabold uppercase text-[11px] text-green-400">📐 AutoTrac™ Vagų (AB Linijos) Nustatymas</span>
                            <button type="button" id="btn-auto-optimal-angle" style="background-color: #2E7D32; color: #FFFFFF;" class="px-2.5 py-1 hover:opacity-90 rounded-lg text-[10px] font-extrabold transition cursor-pointer shadow-sm">
                                ⚡ Pagal ilgiausią kraštinę
                            </button>
                        </div>

                        <div class="grid grid-cols-2 gap-2.5">
                            <div class="space-y-1">
                                <label class="text-[11px] font-bold text-slate-300 block">Padargo plotis (m)</label>
                                <input id="order-implement-width" type="number" step="0.5" min="1.5" max="48" value="4.0"
                                    class="w-full h-10 bg-tractorSurface border border-tractorBorder rounded-xl px-3 font-mono font-bold outline-none" style="color: var(--text-main);">
                            </div>
                            <div class="space-y-1">
                                <label class="text-[11px] font-bold text-slate-300 block">Bendra savikaina (€)</label>
                                <input id="order-cost-input" type="number" step="1" value="0"
                                    class="w-full h-10 bg-tractorSurface border border-tractorBorder rounded-xl px-3 font-mono font-bold text-amber-500 outline-none">
                            </div>
                        </div>

                        <div class="space-y-1">
                            <div class="flex justify-between text-[11px] font-bold">
                                <span class="text-slate-300">🧭 Važiavimo vagų kryptis (AB kampas):</span>
                                <strong id="lbl-ab-angle-val" class="font-mono text-amber-500">90°</strong>
                            </div>
                            <input id="order-ab-angle-slider" type="range" min="0" max="179" step="1" value="90"
                                class="w-full accent-tractorPrimary cursor-pointer h-2 bg-zinc-800 rounded-lg">
                            <div class="flex justify-between text-[10px] text-slate-400 font-mono">
                                <span>0° (Š–P)</span>
                                <span>45°</span>
                                <span>90° (R–V)</span>
                                <span>135°</span>
                                <span>179°</span>
                            </div>
                        </div>
                    </div>

                    <!-- 5. DATA IR PASTABA -->
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <div class="space-y-1">
                            <label class="font-bold uppercase text-slate-300 block">Planuojama darbo data</label>
                            <input id="order-date-input" type="date" value="${todayStr}"
                                class="w-full h-10 bg-tractorBg border border-tractorBorder rounded-xl px-3 font-mono font-bold outline-none" style="color: var(--text-main);">
                        </div>
                        <div class="space-y-1">
                            <label class="font-bold uppercase text-slate-300 block">Komentaras traktorininkui</label>
                            <input id="order-notes-input" type="text" placeholder="Pvz.: Saugoti melioracijos žiotis..."
                                class="w-full h-10 bg-tractorBg border border-tractorBorder rounded-xl px-3 outline-none" style="color: var(--text-main);">
                        </div>
                    </div>

                    <!-- 2 VEIKSMO MYGTUKAI -->
                    <div class="pt-1 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <button type="submit" id="btn-save-planned-order" class="w-full h-12 bg-tractorPrimary hover:bg-tractorPrimaryHover text-white font-extrabold rounded-xl text-xs uppercase tracking-wider shadow-lg transition cursor-pointer flex items-center justify-center gap-1.5">
                            <span>📅</span> <span>Išsaugoti Planą</span>
                        </button>

                        <button type="submit" id="btn-send-order-now" class="w-full h-12 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs uppercase tracking-wider shadow-lg transition cursor-pointer flex items-center justify-center gap-1.5">
                            <span>📡</span> <span>Siųsti į Kabiną Dabar</span>
                        </button>
                    </div>
                </form>
            </div>

            <!-- DEŠINĖ PUSĖ: 1) VAGŲ PATIKROS ŽEMĖLAPIS + SĖJOS LOGISTIKA + 2) DARBŲ ŽURNALAS -->
            <div class="space-y-5">
                
                <!-- 1. VAGŲ (AB LINIJŲ) IR MARŠRUTO PATIKROS SIMULIATORIUS -->
                <div class="bg-tractorSurface border-2 border-tractorBorder rounded-2xl p-4 sm:p-5 shadow-xl space-y-3">
                    <div class="flex flex-wrap items-center justify-between gap-2 border-b border-tractorBorder/70 pb-2.5">
                        <div>
                            <span class="text-[10px] font-black uppercase tracking-widest text-green-500 block">AutoTrac™ Guidance & Logistikos Patikra</span>
                            <h3 class="font-oswald text-lg font-bold uppercase tracking-wide" style="color: var(--text-main);">
                                🗺️ Vagų, Technologinių Vėžių ir Maršruto Patikra
                            </h3>
                        </div>
                        <span id="preview-field-badge" class="px-2.5 py-1 rounded-lg bg-tractorBg border border-tractorBorder text-xs font-mono font-bold text-green-500">
                            Pasirinkite lauką
                        </span>
                    </div>

                    <!-- MINI ŽEMĖLAPIS SU VAGOMIS IR TECHNOLOGINĖMIS VĖŽĖMIS -->
                    <div id="order-ab-preview-map" style="width: 100%; height: 310px; min-height: 310px; border-radius: 14px; overflow: hidden; border: 1.5px solid var(--border-color); background: #0f1712; position: relative; z-index: 10;"></div>

                    <!-- 4 MARŠRUTO PATIKROS RODIKLIAI -->
                    <div class="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs pt-1">
                        <div class="bg-tractorBg border border-tractorBorder rounded-xl p-2.5">
                            <span class="text-[10px] text-slate-400 uppercase font-bold block">Vagos / Apsisukimai</span>
                            <strong id="prev-stat-passes" class="font-mono font-bold text-sm text-green-500">0 vagų</strong>
                            <span id="prev-stat-turns" class="text-[10px] text-slate-400 block">0 apsisukimų</span>
                        </div>
                        <div class="bg-tractorBg border border-tractorBorder rounded-xl p-2.5">
                            <span class="text-[10px] text-slate-400 uppercase font-bold block">Traktoriaus Kelias</span>
                            <strong id="prev-stat-dist" class="font-mono font-bold text-sm" style="color: var(--text-main);">0.0 km</strong>
                            <span id="prev-stat-time" class="text-[10px] text-amber-500 font-mono block">~0.0 val.</span>
                        </div>
                        <div class="bg-tractorBg border border-tractorBorder rounded-xl p-2.5">
                            <span class="text-[10px] text-slate-400 uppercase font-bold block">Dyzelino Sąnaudos</span>
                            <strong id="prev-stat-fuel" class="font-mono font-bold text-sm text-green-500">~0 L</strong>
                            <span id="prev-stat-fuel-price-src" class="text-[10px] text-slate-400 block">Kuro kaina tikrinama...</span>
                        </div>
                        <div class="bg-tractorBg border border-tractorBorder rounded-xl p-2.5">
                            <span class="text-[10px] text-slate-400 uppercase font-bold block">Bendra Savikaina</span>
                            <strong id="prev-stat-cost" class="font-mono font-bold text-sm text-amber-500">~0 €</strong>
                            <span id="prev-stat-cost-sub" class="text-[10px] text-slate-400 block">Visos sąnaudos</span>
                        </div>
                    </div>

                    <!-- 🌱 SĖJOS LOGISTIKOS SUVESTINĖ (RODOMA TIK PASIRINKUS „🌱 Sėja“) -->
                    <div id="seed-order-logistics-summary" class="hidden grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs pt-2 border-t border-tractorBorder/70">
                        <div class="bg-green-500/10 border border-green-500/40 rounded-xl p-2.5 space-y-0.5">
                         <span class="text-[10px] text-green-400 uppercase font-extrabold block">🛍️ Reikės Didmaišių (po 500 kg)</span>
                         <strong id="seed-sum-total-weight" class="font-mono font-black text-xs sm:text-sm block" style="color: var(--text-main);">0.00 t</strong>
                         <span id="seed-sum-bigbags" class="text-[11px] text-green-400 font-bold block">0 didmaišių</span>
                         <span id="seed-sum-fert-bags-line" class="hidden text-[11px] text-amber-400 font-bold block">+ Trąšos: 0 t (0 didm.)</span>
                     </div>
                        <div class="bg-tractorBg border border-tractorBorder rounded-xl p-2.5">
                            <span class="text-[10px] text-slate-400 uppercase font-bold block">🚜 Sėkladėžės Pildymai</span>
                            <strong id="seed-sum-hoppers" class="font-mono font-bold text-sm" style="color: var(--text-main);">0 kartai</strong>
                            <span id="seed-sum-hopper-cap" class="text-[10px] text-slate-400 block">Bunkeris: 3000 kg</span>
                        </div>
                        <div class="bg-tractorBg border border-tractorBorder rounded-xl p-2.5">
                            <span class="text-[10px] text-amber-400 uppercase font-bold block">🛤️ Technologinės Vėžės</span>
                            <strong id="seed-sum-tramlines" class="font-mono font-bold text-sm text-amber-400">Kas 4-ą vagą</strong>
                            <span id="seed-sum-tramlines-cnt" class="text-[10px] text-slate-400 block">0 vėžių lauke</span>
                        </div>
                        <div class="bg-tractorBg border border-tractorBorder rounded-xl p-2.5">
                            <span class="text-[10px] text-slate-400 uppercase font-bold block">💶 Sėklos + Trąšų Biudžetas</span>
                            <strong id="seed-sum-materials-cost" class="font-mono font-bold text-sm text-amber-400">0 €</strong>
                            <span id="seed-sum-fert-extra" class="text-[10px] text-slate-400 block">Be startinių trąšų</span>
                        </div>
                    </div>
                </div>

                <!-- 2. SUPLANUOTŲ, VYKDOMŲ IR ATLIKTŲ DARBŲ SĄRAŠAS -->
                <div class="bg-tractorSurface border-2 border-tractorBorder rounded-2xl p-5 shadow-xl space-y-3.5">
                    <div class="border-b border-tractorBorder/70 pb-3 flex flex-wrap items-center justify-between gap-2">
                        <div>
                            <span class="text-[10px] font-black uppercase tracking-widest text-green-500 block">Planai ➔ Siuntimas į kabiną ➔ Darbų Žurnalas</span>
                            <h3 class="font-oswald text-xl font-bold uppercase tracking-wide flex items-center gap-2" style="color: var(--text-main);">
                                <span>📋</span> Suplanuoti, Vykdomi ir Atlikti Darbai
                            </h3>
                        </div>
                        <span class="text-[11px] text-slate-400">
                            Suplanuotą darbą bet kada išsiųskite mygtuku <strong>„📡 Siųsti į traktorių“</strong>
                        </span>
                    </div>

                    <div id="tractor-work-orders-list" class="space-y-3 text-xs">
                        <div class="py-8 text-center text-slate-400">Kraunamos darbo užduotys...</div>
                    </div>
                </div>

            </div>

        </div>
    `;
}

export async function bindWorkOrdersEvents(currentUser, userData, getFieldsFn, getDeereStateFn, onVraRateSent) {
    const catSel = document.getElementById('order-category-select');
    const fieldWrap = document.getElementById('box-order-field-wrap');
    const vraBox = document.getElementById('box-order-vra-select');
    const stdBox = document.getElementById('box-order-standard-fields');
    const seedBox = document.getElementById('box-order-seeding-config');
    const seedLogisticsBox = document.getElementById('seed-order-logistics-summary');

    const fieldSel = document.getElementById('order-field-select');
    const prodInp = document.getElementById('order-product-input');
    const rateInp = document.getElementById('order-rate-input');
    const widthInp = document.getElementById('order-implement-width');
    const costInp = document.getElementById('order-cost-input');
    const angleSlider = document.getElementById('order-ab-angle-slider');
    const angleLbl = document.getElementById('lbl-ab-angle-val');
    const autoAngleBtn = document.getElementById('btn-auto-optimal-angle');

    // Sėjos laukai
    const seedCropSel = document.getElementById('seed-order-crop-select');
    const seedVarietyInp = document.getElementById('seed-order-variety');
    const seedDensityInp = document.getElementById('seed-order-density');
    const seedMtgInp = document.getElementById('seed-order-mtg');
    const seedGermInp = document.getElementById('seed-order-germ');
    const seedPurityInp = document.getElementById('seed-order-purity');
    const seedPriceInp = document.getElementById('seed-order-price');
    const seedHopperInp = document.getElementById('seed-order-hopper');
    const seedTramWidthInp = document.getElementById('seed-order-tramline-width');
    const seedWithFertChk = document.getElementById('seed-order-with-fert');
    const seedStarterBox = document.getElementById('box-seed-starter-fert');
    const seedFertRateInp = document.getElementById('seed-order-fert-rate');
    const seedFertPriceInp = document.getElementById('seed-order-fert-price');

    // 1. Užkrauname gyvas rinkos kainas ir pasėlių klasifikatorių iš Firestore!
    const loadLiveMarketAndClassifier = async () => {
        try {
            await loadCropsClassifier();
            loadedCropsList = getAllCrops().filter(c => (c.seedRateKgHa || 0) > 0 && c.id !== 'fallow_black');
            if (seedCropSel && loadedCropsList.length > 0) {
                seedCropSel.innerHTML = loadedCropsList.map(c =>
                    `<option value="${c.id}">${c.icon || '🌱'} ${c.name?.lt || c.id}</option>`
                ).join('');
                applyCropDefaultsFromClassifier(loadedCropsList[0].id);
            }
        } catch (e) {}

        // Gyva ORLEN žymėto dyzelino kaina
        try {
            const dDoc = await db.collection("diesel_prices").doc("market_benchmark").get();
            if (dDoc.exists && dDoc.data().officialBasePriceNoVat) {
                liveDieselPriceEurL = parseFloat(dDoc.data().officialBasePriceNoVat);
            }
        } catch (e) {}

        // Gyva trąšų indikacinė kaina iš Trąšų Barometro
        try {
            const fDoc = await db.collection("fertilizer_market").doc("barometer_data").get();
            if (fDoc.exists && fDoc.data().indicators?.estimatedSalietra) {
                liveFertPriceEurTon = parseFloat(fDoc.data().indicators.estimatedSalietra);
                if (seedFertPriceInp) seedFertPriceInp.value = liveFertPriceEurTon;
            }
        } catch (e) {}
    };

    const applyCropDefaultsFromClassifier = (cropId) => {
        const crop = loadedCropsList.find(c => c.id === cropId) || loadedCropsList[0];
        if (!crop) return;

        const mtg = parseFloat(crop.mtgGram) || 45.0;
        const germ = parseFloat(crop.germinationPct) || 95;
        const pur = parseFloat(crop.purityPct) || 99;
        const rateKgHa = parseFloat(crop.seedRateKgHa) || 220;
        const priceTon = parseFloat(crop.seedPriceTon) || 420;

        // Dinamiškai išskaičiuojame daigų tankį (mln./ha) iš klasifikatoriaus kg/ha pagal seedCalculator formulę!
        const realGerm = (germ * pur) / 100;
        const densityMln = mtg > 0 ? +((rateKgHa * realGerm) / (mtg * 100)).toFixed(2) : 4.5;

        if (seedDensityInp) seedDensityInp.value = densityMln;
        if (seedMtgInp) seedMtgInp.value = mtg;
        if (seedGermInp) seedGermInp.value = germ;
        if (seedPurityInp) seedPurityInp.value = pur;
        if (seedPriceInp) seedPriceInp.value = priceTon;
    };

    document.getElementById('btn-save-planned-order')?.addEventListener('click', () => {
        pendingSubmitAction = 'planned';
    });
    document.getElementById('btn-send-order-now')?.addEventListener('click', () => {
        pendingSubmitAction = 'send_now';
    });

    const getActiveTargetField = () => {
        const fields = getFieldsFn() || [];
        if (catSel?.value === 'vra_map') {
            const val = document.getElementById('order-vra-plan-select')?.value || '';
            const fId = val.split('|')[1];
            return fields.find(f => f.id === fId) || fields[0] || null;
        }
        const fId = fieldSel?.value;
        return fields.find(f => f.id === fId) || fields[0] || null;
    };

    const recalculateAllPreview = () => {
        const f = getActiveTargetField();
        const widthM = Math.max(1.5, parseFloat(widthInp?.value) || 4.0);
        const angleDeg = parseInt(angleSlider?.value || '90', 10);
        const category = catSel?.value || 'Žemės dirbimas';

        // 1. Paskaičiuojame AB linijas, technologines vėžes ir kuro sąnaudas
        const tramWidthM = category === 'Sėja' ? (parseFloat(seedTramWidthInp?.value) || 0) : 0;
        drawAbPreviewForField(f, widthM, angleDeg, category, tramWidthM);

        // 2. Jei tai Sėja – paskaičiuojame tikslią MTG normą, didmaišius, bunkerius ir bendrą biudžetą
        if (category === 'Sėja' && f) {
            const areaHa = Math.max(0.1, parseFloat(f.areaHa) || 1.0);
            const densityMln = parseFloat(seedDensityInp?.value) || 0;
            const mtg = parseFloat(seedMtgInp?.value) || 0;
            const germ = parseFloat(seedGermInp?.value) || 95;
            const pur = parseFloat(seedPurityInp?.value) || 99;
            const pricePerTon = parseFloat(seedPriceInp?.value) || 0;
            const hopperCapKg = Math.max(100, parseFloat(seedHopperInp?.value) || 3000);

            const realGerm = (germ * pur) / 100;
            const rateKgHa = realGerm > 0 ? (densityMln * mtg * 100) / realGerm : 0;

            const totalSeedKg = rateKgHa * areaHa;
            const totalSeedTons = totalSeedKg / 1000;
            const bigBags = Math.ceil(totalSeedKg / 500);
            const hopperFills = Math.max(1, Math.ceil(totalSeedKg / hopperCapKg));
            const seedCostEur = totalSeedTons * pricePerTon;

            let fertTotalKg = 0;
            let fertBagsCount = 0;
            let fertCostEur = 0;
            const withFert = !!seedWithFertChk?.checked;

            if (withFert) {
                const fRate = parseFloat(seedFertRateInp?.value) || 0;
                const fPrice = parseFloat(seedFertPriceInp?.value) || 0;
                fertTotalKg = fRate * areaHa;
                fertBagsCount = Math.ceil(fertTotalKg / 500);
                fertCostEur = (fertTotalKg / 1000) * fPrice;
            }

            const selectedCropObj = loadedCropsList.find(c => c.id === seedCropSel?.value);
            const cropName = selectedCropObj?.name?.lt || seedCropSel?.options[seedCropSel.selectedIndex]?.text || 'Pasėlis';
            const variety = seedVarietyInp?.value.trim() || '';

            const materialsCost = Math.round(seedCostEur + fertCostEur);
            const grandTotalCost = Math.round(materialsCost + currentPreviewMetrics.fuelCostEur);

            currentSeedingMetrics = {
                cropName,
                variety,
                rateKgHa: +rateKgHa.toFixed(1),
                totalSeedKg: Math.round(totalSeedKg),
                bigBagsCount: bigBags,
                hopperFills,
                seedCostEur: Math.round(seedCostEur),
                fertTotalKg: Math.round(fertTotalKg),
                fertBagsCount,
                fertCostEur: Math.round(fertCostEur),
                withFert
            };

            currentPreviewMetrics.totalCostEur = grandTotalCost;
            if (costInp) costInp.value = grandTotalCost;

            const setTxt = (id, t) => { const el = document.getElementById(id); if (el) el.textContent = t; };
            setTxt('seed-order-calc-rate-badge', `${rateKgHa.toFixed(1)} kg/ha`);
            setTxt('seed-sum-total-weight', `${totalSeedTons.toFixed(2)} t (${Math.round(totalSeedKg)} kg)`);
            setTxt('seed-sum-bigbags', `${bigBags} didmaišiai (po 500 kg)`);
            setTxt('seed-sum-hoppers', `${hopperFills} užpild.`);
            setTxt('seed-sum-hopper-cap', `Bunkeris: ${hopperCapKg} kg`);
            setTxt('seed-sum-tramlines', currentPreviewMetrics.tramlineEveryN > 0 ? `Kas ${currentPreviewMetrics.tramlineEveryN}-ą vagą` : 'Išjungtos');
            setTxt('seed-sum-tramlines-cnt', currentPreviewMetrics.tramlineEveryN > 0 ? `${currentPreviewMetrics.tramlinesCount} vėžių (${tramWidthM} m purkšt.)` : 'Be vėžių');
            setTxt('seed-sum-materials-cost', `${materialsCost.toLocaleString('lt-LT')} €`);
            setTxt('seed-sum-fert-extra', withFert ? `+ Trąšos: ${Math.round(fertTotalKg)} kg (${fertBagsCount} didm.)` : `Tik sėkla (be trąšų)`);
            const fertBagsEl = document.getElementById('seed-sum-fert-bags-line');
            if (fertBagsEl) {
                if (withFert && fertTotalKg > 0) {
                    fertBagsEl.classList.remove('hidden');
                    fertBagsEl.textContent = `🧪 Trąšos: ${(fertTotalKg / 1000).toFixed(2)} t (${fertBagsCount} didm.)`;
                } else {
                    fertBagsEl.classList.add('hidden');
                }
            }
            setTxt('prev-stat-cost', `~${grandTotalCost.toLocaleString('lt-LT')} €`);
            setTxt('prev-stat-cost-sub', `Kuras ${currentPreviewMetrics.fuelCostEur} € + Medž. ${materialsCost} €`);
        } else {
            currentPreviewMetrics.totalCostEur = currentPreviewMetrics.fuelCostEur;
            if (costInp) costInp.value = currentPreviewMetrics.fuelCostEur;
            const setTxt = (id, t) => { const el = document.getElementById(id); if (el) el.textContent = t; };
            setTxt('prev-stat-cost', `~${currentPreviewMetrics.fuelCostEur} €`);
            setTxt('prev-stat-cost-sub', `Dyzelino sąnaudos`);
        }
    };

    const populateSelects = () => {
        const fields = getFieldsFn() || [];
        const vraSel = document.getElementById('order-vra-plan-select');

        if (fieldSel) {
            fieldSel.innerHTML = fields.length > 0
                ? fields.map(f => `<option value="${f.id}">🌾 ${f.name} (${Number(f.areaHa || 0).toFixed(2)} ha • ${f.crop || 'Pasėlis'})</option>`).join('')
                : `<option value="">Pirmiausia įbraižykite bent vieną lauką</option>`;
        }

        if (vraSel) {
            const opts = [];
            fields.forEach(f => {
                (f.vraPlans || []).forEach(p => {
                    opts.push(`<option value="vra|${f.id}|${p.id}">🧪 VRA Tręšimas: ${f.name} (${p.fertilizerType}, ${p.baseRate} kg/ha)</option>`);
                });
                (f.limingPlans || []).forEach(p => {
                    opts.push(`<option value="lime|${f.id}|${p.id}">🍋 VRA Kalkinimas: ${f.name} (Vid. pH ${p.avgPh})</option>`);
                });
            });
            vraSel.innerHTML = opts.length > 0
                ? opts.join('')
                : `<option value="">Nėra VRA projektų (pasirinkite kitą darbo tipą viršuje)</option>`;
        }

        setTimeout(() => {
            autoSetOptimalFieldAngle();
            recalculateAllPreview();
        }, 120);
    };

    const autoSetOptimalFieldAngle = () => {
        const f = getActiveTargetField();
        if (!f || !f.polygonCoordinates || f.polygonCoordinates.length < 3) return;
        const optAngle = calculateLongestEdgeAngleDeg(f.polygonCoordinates);
        if (angleSlider) angleSlider.value = optAngle;
        if (angleLbl) angleLbl.textContent = `${optAngle}° (Pagal ilgiausią kraštinę)`;
    };

    await loadLiveMarketAndClassifier();
    populateSelects();

    document.querySelector('.tractor-subtab-btn[data-subtab="orders"]')?.addEventListener('click', () => {
        setTimeout(() => {
            populateSelects();
            if (previewMap) previewMap.invalidateSize();
        }, 120);
    });

    if (catSel) {
        catSel.onchange = () => {
            const val = catSel.value;
            vraBox?.classList.add('hidden');
            stdBox?.classList.add('hidden');
            seedBox?.classList.add('hidden');
            seedLogisticsBox?.classList.add('hidden');
            fieldWrap?.classList.remove('hidden');

            if (val === 'vra_map') {
                fieldWrap?.classList.add('hidden');
                vraBox?.classList.remove('hidden');
                if (widthInp) widthInp.value = "24.0";
            } else if (val === 'Sėja') {
                seedBox?.classList.remove('hidden');
                seedLogisticsBox?.classList.remove('hidden');
                if (widthInp) widthInp.value = "6.0";
            } else {
                stdBox?.classList.remove('hidden');
                if (val === 'Žemės dirbimas') {
                    if (prodInp) prodInp.value = "Arimas verčiamu plūgu";
                    if (rateInp) rateInp.value = "22 cm gylis";
                    if (widthInp) widthInp.value = "4.0";
                } else if (val === 'Kūlimas') {
                    if (prodInp) prodInp.value = "Javų kūlimas (pjaunamoji 10.7 m)";
                    if (rateInp) rateInp.value = "6.8 t/ha";
                    if (widthInp) widthInp.value = "10.7";
                } else if (val === 'Purškimas') {
                    if (prodInp) prodInp.value = "Herbicidas + Mikroelementai";
                    if (rateInp) rateInp.value = "200 l/ha";
                    if (widthInp) widthInp.value = "24.0";
                } else if (val === 'Tręšimas') {
                    if (prodInp) prodInp.value = "Amonio salietra (N34)";
                    if (rateInp) rateInp.value = "250 kg/ha";
                    if (widthInp) widthInp.value = "24.0";
                }
            }
            recalculateAllPreview();
        };
    }

    seedCropSel?.addEventListener('change', () => {
        applyCropDefaultsFromClassifier(seedCropSel.value);
        recalculateAllPreview();
    });

    seedWithFertChk?.addEventListener('change', () => {
        if (seedWithFertChk.checked) seedStarterBox?.classList.remove('hidden');
        else seedStarterBox?.classList.add('hidden');
        recalculateAllPreview();
    });

    [
        seedVarietyInp, seedDensityInp, seedMtgInp, seedGermInp, seedPurityInp,
        seedPriceInp, seedHopperInp, seedTramWidthInp, seedFertRateInp, seedFertPriceInp, widthInp
    ].forEach(el => el?.addEventListener('input', recalculateAllPreview));

    fieldSel?.addEventListener('change', () => {
        autoSetOptimalFieldAngle();
        recalculateAllPreview();
    });

    document.getElementById('order-vra-plan-select')?.addEventListener('change', () => {
        autoSetOptimalFieldAngle();
        recalculateAllPreview();
    });

    angleSlider?.addEventListener('input', () => {
        const deg = angleSlider.value;
        if (angleLbl) angleLbl.textContent = `${deg}° kryptis`;
        recalculateAllPreview();
    });

    autoAngleBtn?.addEventListener('click', () => {
        autoSetOptimalFieldAngle();
        recalculateAllPreview();
        showBottomToast("⚡ Nustatytas optimalus važiavimo kampas pagal ilgiausią lauko kraštinę!");
    });

    // DARBO UŽDUOTIES FORMA (IŠSAUGOTI PLANĄ / SIŲSTI Į KABINĄ DABAR)
    document.getElementById('form-create-tractor-order')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!currentUser) return;

        const isSendNow = pendingSubmitAction === 'send_now';
        const fields = getFieldsFn() || [];
        const deereState = getDeereStateFn() || {};
        const [tractorName, brandKey] = (document.getElementById('order-tractor-select')?.value || 'John Deere 8R 370|johndeere').split('|');
        const category = catSel?.value || 'Žemės dirbimas';
        const workDate = document.getElementById('order-date-input')?.value || new Date().toISOString().split('T')[0];
        const widthM = parseFloat(widthInp?.value) || 4.0;
        const costEur = parseFloat(costInp?.value) || currentPreviewMetrics.totalCostEur || 0;
        const angleDeg = parseInt(angleSlider?.value || '90', 10);
        const userNotes = document.getElementById('order-notes-input')?.value.trim() || '';

        let targetField = getActiveTargetField();
        if (!targetField) {
            showBottomToast("Pasirinkite lauką!", "warning");
            return;
        }

        let journalType = category;
        let productName = prodInp?.value.trim() || "Arimas verčiamu plūgu";
        let rateText = rateInp?.value.trim() || "22 cm";
        let fileName = null;
        let extraSeedingData = {};

        if (category === 'Sėja') {
            journalType = 'Sėja';
            const vTxt = currentSeedingMetrics.variety ? ` „${currentSeedingMetrics.variety}“` : '';
            const fertTxt = currentSeedingMetrics.withFert ? ` + Start. NPK (${seedFertRateInp?.value} kg/ha)` : '';
            productName = `${currentSeedingMetrics.cropName}${vTxt}${fertTxt}`;
            rateText = `${currentSeedingMetrics.rateKgHa} kg/ha (${seedDensityInp?.value} mln./ha, MTG ${seedMtgInp?.value}g)`;

            extraSeedingData = {
                sownCropName: currentSeedingMetrics.cropName,
                updateFieldCrop: !!document.getElementById('seed-order-update-crop')?.checked,
                totalSeedKg: currentSeedingMetrics.totalSeedKg,
                bigBagsCount: currentSeedingMetrics.bigBagsCount,
                hopperFills: currentSeedingMetrics.hopperFills,
                tramlineEveryN: currentPreviewMetrics.tramlineEveryN
            };
        } else if (category === 'vra_map') {
            const selVal = document.getElementById('order-vra-plan-select')?.value;
            if (!selVal) {
                showBottomToast("Pasirinkite VRA projektą arba perjunkite darbo tipą!", "warning");
                return;
            }
            const [planType, fieldId, planId] = selVal.split('|');
            targetField = fields.find(f => f.id === fieldId) || targetField;

            let baseRate = 200;
            if (planType === 'vra') {
                const plan = (targetField.vraPlans || []).find(p => p.id === planId);
                journalType = "Tręšimas";
                productName = plan?.fertilizerType || "Amonio salietra (VRA)";
                baseRate = plan?.baseRate || 200;
                rateText = `${baseRate} kg/ha (VRA)`;
            } else {
                const plan = (targetField.limingPlans || []).find(p => p.id === planId);
                journalType = "Kalkinimas";
                productName = `VRA Kalkės (Vid. pH ${plan?.avgPh || '4.7'})`;
                baseRate = 3000;
                rateText = `3000 kg/ha (VRA)`;
            }

            if (isSendNow) {
                showBottomToast(`Ruošiamas Shapefile .ZIP ir siunčiama užduotis į „${tractorName}“... 📡`, "info");
                await ensureZipLibrary();

                let cells = [];
                if (planType === 'vra') {
                    const plan = (targetField.vraPlans || []).find(p => p.id === planId);
                    cells = await generateFertilizerVraGrid(targetField.polygonCoordinates, baseRate, workDate);
                    if (plan?.savedZones) {
                        const zMap = {};
                        plan.savedZones.forEach(z => { zMap[z.id] = z.zoneIndex; });
                        cells.forEach(c => { if (zMap[c.id] !== undefined) c.zoneIndex = zMap[c.id]; });
                        cells = applyFertilizerRatesToCells(cells, baseRate);
                    }
                } else {
                    const plan = (targetField.limingPlans || []).find(p => p.id === planId);
                    cells = generateLimingVraGrid(targetField.polygonCoordinates, plan?.samples || []);
                }

                const shpPkg = buildBinaryShapefileFromCells(cells, productName, workDate);
                const zip = new JSZip();
                const cleanBaseName = `JurgisAgro_${planType.toUpperCase()}_${targetField.name.replace(/[^a-zA-Z0-9_-]/g, '_')}`;
                fileName = `${cleanBaseName}.zip`;

                const rxFolder = zip.folder("Rx");
                rxFolder.file(`${cleanBaseName}.shp`, shpPkg.shp);
                rxFolder.file(`${cleanBaseName}.shx`, shpPkg.shx);
                rxFolder.file(`${cleanBaseName}.dbf`, shpPkg.dbf);
                rxFolder.file(`${cleanBaseName}.prj`, shpPkg.prj);

                if (brandKey === 'johndeere' && deereState?.organization?.id && !deereState.needsOrgConnection) {
                    const zipBase64 = await zip.generateAsync({ type: "base64" });
                    await fetch("https://us-central1-neighborpm-b9968.cloudfunctions.net/sendVraFileToJohnDeere", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            userId: currentUser.uid,
                            orgId: deereState.organization.id,
                            fileName: fileName,
                            zipBase64: zipBase64,
                            fieldName: targetField.name,
                            taskType: `${journalType}: ${productName}`,
                            baseRate: baseRate
                        })
                    });
                } else {
                    const blob = await zip.generateAsync({ type: "blob" });
                    const a = document.createElement("a");
                    a.href = URL.createObjectURL(blob);
                    a.download = fileName;
                    a.click();
                }

                if (typeof onVraRateSent === 'function') onVraRateSent(baseRate);
            }
        }

        const seedingNotePart = category === 'Sėja'
            ? `Sėkla: ${currentSeedingMetrics.totalSeedKg} kg (${currentSeedingMetrics.bigBagsCount} didm., ${currentSeedingMetrics.hopperFills} bunkeriai)${currentPreviewMetrics.tramlineEveryN > 0 ? `, vėžės kas ${currentPreviewMetrics.tramlineEveryN}-ą vagą` : ''}. `
            : '';

        const newTask = {
            id: 'task_' + Date.now(),
            tractorName: tractorName,
            type: journalType,
            product: `${productName} (${widthM} m)`,
            rate: rateText,
            cost: costEur,
            date: workDate,
            angleDeg: angleDeg,
            implementWidthM: widthM,
            passesCount: currentPreviewMetrics.passesCount,
            distanceKm: currentPreviewMetrics.distanceKm,
            fuelLiters: currentPreviewMetrics.fuelLiters,
            fileName: fileName,
            ...extraSeedingData,
            notes: `Technika: ${tractorName} • AB kryptis: ${angleDeg}° (${currentPreviewMetrics.passesCount} vagos, ~${currentPreviewMetrics.fuelLiters} L kuro). ${seedingNotePart}${userNotes}`.trim(),
            status: isSendNow ? 'in_progress' : 'planned',
            loggedToJournal: false,
            createdAt: new Date().toISOString()
        };

        try {
            const fieldDoc = await db.collection("user_fields").doc(targetField.id).get();
            const fData = fieldDoc.exists ? fieldDoc.data() : targetField;
            const existingTasks = Array.isArray(fData.tractorTasks) ? [...fData.tractorTasks] : [];
            existingTasks.unshift(newTask);

            const updatePayload = { tractorTasks: existingTasks };
            if (isSendNow) {
                updatePayload.activeTractorOrder = {
                    tractorName: tractorName,
                    taskTitle: `${journalType}: ${productName}`,
                    angleDeg: angleDeg,
                    implementWidthM: widthM,
                    updatedAt: new Date().toISOString()
                };
            }

            await db.collection("user_fields").doc(targetField.id).update(updatePayload);

            if (isSendNow) {
                showBottomToast(`📡 Užduotis „${journalType}“ (${currentPreviewMetrics.passesCount} vagos, ${angleDeg}°) išsiųsta į „${tractorName}“ kabiną!`);
            } else {
                showBottomToast(`📅 Suplanuotas darbas „${journalType}“ lauke „${targetField.name}“ išsaugotas!`);
            }
        } catch (err) {
            showBottomToast("Klaida saugant užduotį: " + err.message, "error");
        }
    });

    listenToAllWorkOrders(currentUser, getFieldsFn, recalculateAllPreview, widthInp, angleSlider, angleLbl, fieldSel);
}

// ============================================================================
// 📐 MATEMATINIS AUTOTRAC™ AB LINIJŲ IR TECHNOLOGINIŲ VĖŽIŲ SKAIČIAVIMAS
// ============================================================================
function calculateLongestEdgeAngleDeg(coords) {
    const pts = coords.map(p => [
        Number(Array.isArray(p) ? p[0] : p.lat),
        Number(Array.isArray(p) ? p[1] : p.lng)
    ]).filter(c => c[0] && c[1]);

    if (pts.length < 2) return 90;

    let maxDist = -1;
    let bestAngle = 90;
    const cosLat = Math.cos((pts[0][0] * Math.PI) / 180);

    for (let i = 0; i < pts.length; i++) {
        const p1 = pts[i];
        const p2 = pts[(i + 1) % pts.length];
        const dY = (p2[0] - p1[0]) * 111320;
        const dX = (p2[1] - p1[1]) * 111320 * cosLat;
        const dist = Math.hypot(dX, dY);

        if (dist > maxDist) {
            maxDist = dist;
            let deg = (Math.atan2(dX, dY) * 180) / Math.PI;
            while (deg < 0) deg += 180;
            while (deg >= 180) deg -= 180;
            bestAngle = Math.round(deg);
        }
    }
    return bestAngle;
}

function drawAbPreviewForField(field, widthM, angleDeg, category, tramlineWidthM = 0) {
    const mapEl = document.getElementById('order-ab-preview-map');
    const badgeEl = document.getElementById('preview-field-badge');
    if (!mapEl || !window.L) return;

    if (!previewMap) {
        previewMap = L.map('order-ab-preview-map', {
            center: [55.2885, 23.9745],
            zoom: 15,
            zoomControl: true
        });
        L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
            maxZoom: 19,
            attribution: '© Esri Satellite & AutoTrac™ AB Planner'
        }).addTo(previewMap);

        previewPolygonLayer = L.layerGroup().addTo(previewMap);
        previewAbLinesLayer = L.layerGroup().addTo(previewMap);
    }

    previewPolygonLayer.clearLayers();
    previewAbLinesLayer.clearLayers();

    if (!field || !field.polygonCoordinates || field.polygonCoordinates.length < 3) return;

    const coords = field.polygonCoordinates.map(p => [
        Number(Array.isArray(p) ? p[0] : p.lat),
        Number(Array.isArray(p) ? p[1] : p.lng)
    ]).filter(c => c[0] && c[1]);

    const areaHa = Math.max(0.1, parseFloat(field.areaHa) || 1.0);
    if (badgeEl) {
        badgeEl.textContent = `🌾 ${field.name} (${areaHa.toFixed(2)} ha)`;
    }

    const poly = L.polygon(coords, {
        color: '#FACC15',
        weight: 3,
        fillColor: '#16A34A',
        fillOpacity: 0.14
    }).addTo(previewPolygonLayer);

    previewMap.invalidateSize();
    previewMap.fitBounds(poly.getBounds(), { padding: [22, 22], maxZoom: 17 });

    const centerLat = coords.reduce((s, c) => s + c[0], 0) / coords.length;
    const centerLng = coords.reduce((s, c) => s + c[1], 0) / coords.length;
    const cosLat = Math.cos((centerLat * Math.PI) / 180);

    const toMeters = ([lat, lng]) => [
        (lng - centerLng) * 111320 * cosLat,
        (lat - centerLat) * 111320
    ];
    const toLatLng = ([x, y]) => [
        centerLat + y / 111320,
        centerLng + x / (111320 * cosLat)
    ];

    const polyMeters = coords.map(toMeters);

    const rad = ((90 - angleDeg) * Math.PI) / 180;
    const cosA = Math.cos(-rad);
    const sinA = Math.sin(-rad);

    const rotatePt = ([x, y]) => [x * cosA - y * sinA, x * sinA + y * cosA];
    const unrotatePt = ([u, v]) => [u * cosA + v * sinA, -u * sinA + v * cosA];

    const rotatedPoly = polyMeters.map(rotatePt);

    let minV = Infinity, maxV = -Infinity;
    rotatedPoly.forEach(([u, v]) => {
        if (v < minV) minV = v;
        if (v > maxV) maxV = v;
    });

    const allRealSegments = [];
    let totalWorkTrackMeters = 0;
    const headlandMarginM = Math.min(3.0, widthM * 0.4);

    let passIdx = 0;
    for (let v = minV + widthM * 0.5; v <= maxV - widthM * 0.5; v += widthM) {
        const intersectionsU = [];
        for (let i = 0; i < rotatedPoly.length; i++) {
            const p1 = rotatedPoly[i];
            const p2 = rotatedPoly[(i + 1) % rotatedPoly.length];
            if ((p1[1] <= v && p2[1] > v) || (p2[1] <= v && p1[1] > v)) {
                const frac = (v - p1[1]) / (p2[1] - p1[1]);
                const u = p1[0] + frac * (p2[0] - p1[0]);
                intersectionsU.push(u);
            }
        }
        intersectionsU.sort((a, b) => a - b);

        for (let k = 0; k + 1 < intersectionsU.length; k += 2) {
            const uStart = intersectionsU[k] + headlandMarginM;
            const uEnd = intersectionsU[k + 1] - headlandMarginM;

            if (uEnd > uStart + 2) {
                const segLenM = uEnd - uStart;
                totalWorkTrackMeters += segLenM;

                const ptA = toLatLng(unrotatePt([uStart, v]));
                const ptB = toLatLng(unrotatePt([uEnd, v]));

                if (passIdx % 2 === 0) {
                    allRealSegments.push([ptA, ptB, passIdx]);
                } else {
                    allRealSegments.push([ptB, ptA, passIdx]);
                }
                passIdx++;
            }
        }
    }

    const realPassesCount = Math.max(1, allRealSegments.length);
    const turnsCount = Math.max(0, realPassesCount - 1);

    // Technologinės vėžės sėjai (pvz. 24m / 6m = kas 4-a vaga pažymima auksine linija!)
    const tramlineEveryN = (category === 'Sėja' && tramlineWidthM >= widthM)
        ? Math.max(1, Math.round(tramlineWidthM / widthM))
        : 0;
    const tramlineOffset = tramlineEveryN > 0 ? Math.floor(tramlineEveryN / 2) : 0;
    let tramlinesCount = 0;

    const maxLinesToDraw = 160;
    const drawEveryN = Math.max(1, Math.ceil(allRealSegments.length / maxLinesToDraw));
    const snakePoints = [];

    allRealSegments.forEach(([ptA, ptB, pIndex], idx) => {
        const isTramline = tramlineEveryN > 0 && ((pIndex - tramlineOffset) % tramlineEveryN === 0);
        if (isTramline) tramlinesCount++;

        if (idx % drawEveryN === 0 || isTramline) {
            snakePoints.push(ptA, ptB);
            L.polyline([ptA, ptB], {
                color: isTramline ? '#F59E0B' : '#4ADE80',
                weight: isTramline ? 3.2 : (widthM <= 6 ? 1.7 : 2.5),
                opacity: isTramline ? 0.95 : 0.85,
                dashArray: isTramline ? '8, 4' : null
            }).addTo(previewAbLinesLayer);
        }
    });

    if (snakePoints.length >= 2) {
        L.marker(snakePoints[0], {
            icon: L.divIcon({
                className: 'ab-start-badge',
                html: `<div style="background:#16A34A;color:#fff;border:2px solid #FACC15;border-radius:50%;width:24px;height:24px;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:900;transform:translate(-50%,-50%);box-shadow:0 2px 8px rgba(0,0,0,0.7);">🚜</div>`,
                iconSize: [0, 0]
            })
        }).addTo(previewAbLinesLayer);
    }

    const turnArcMeters = Math.max(18, widthM * 2.2);
    const totalDistKm = +((totalWorkTrackMeters + turnsCount * turnArcMeters) / 1000).toFixed(1);

    const opParams = {
        'Žemės dirbimas': { speedKmh: 7.8, fuelLhWork: 38.0, fuelPerTurnL: 0.35, turnSec: 26 },
        'Kūlimas':        { speedKmh: 6.2, fuelLhWork: 52.0, fuelPerTurnL: 0.45, turnSec: 30 },
        'Purškimas':      { speedKmh: 12.5, fuelLhWork: 18.0, fuelPerTurnL: 0.18, turnSec: 20 },
        'Tręšimas':       { speedKmh: 13.0, fuelLhWork: 19.0, fuelPerTurnL: 0.18, turnSec: 18 },
        'Sėja':           { speedKmh: 9.5, fuelLhWork: 28.0, fuelPerTurnL: 0.28, turnSec: 24 },
        'vra_map':        { speedKmh: 12.0, fuelLhWork: 20.0, fuelPerTurnL: 0.20, turnSec: 18 }
    };

    const p = opParams[category] || opParams['Žemės dirbimas'];

    const pureWorkHours = (totalWorkTrackMeters / 1000) / p.speedKmh;
    const turnsHours = (turnsCount * p.turnSec) / 3600;
    const hoursEst = +(pureWorkHours + turnsHours).toFixed(1);

    const fuelLiters = Math.max(1, Math.round(pureWorkHours * p.fuelLhWork + turnsCount * p.fuelPerTurnL));
    const dieselPriceUsed = liveDieselPriceEurL || 1.45;
    const fuelCostEur = Math.round(fuelLiters * dieselPriceUsed);

    currentPreviewMetrics = {
        passesCount: realPassesCount,
        turnsCount: turnsCount,
        tramlinesCount: tramlinesCount,
        tramlineEveryN: tramlineEveryN,
        distanceKm: totalDistKm,
        hoursEst: hoursEst,
        fuelLiters: fuelLiters,
        fuelCostEur: fuelCostEur,
        totalCostEur: fuelCostEur,
        angleDeg: angleDeg,
        waypointsLatLng: snakePoints
    };

    const setTxt = (id, t) => { const el = document.getElementById(id); if (el) el.textContent = t; };
    setTxt('prev-stat-passes', `${realPassesCount} vagos`);
    setTxt('prev-stat-turns', `${turnsCount} apsisukimai`);
    setTxt('prev-stat-dist', `${totalDistKm} km`);
    setTxt('prev-stat-time', `~${hoursEst} val.`);
    setTxt('prev-stat-fuel', `~${fuelLiters} L`);
    setTxt('prev-stat-fuel-price-src', liveDieselPriceEurL ? `ORLEN: ${liveDieselPriceEurL.toFixed(3)} €/l` : `Kuro kaina: ${dieselPriceUsed.toFixed(2)} €/l`);
}

// ============================================================================
// 📋 DARBO UŽDUOČIŲ SĄRAŠAS (SUPLANUOTA -> SIŲSTI -> UŽBAIGTI Į DARBŲ ŽURNALĄ)
// ============================================================================
function listenToAllWorkOrders(currentUser, getFieldsFn, recalculateAllPreview, widthInp, angleSlider, angleLbl, fieldSel) {
    if (!currentUser) return;
    if (unsubscribeFieldsTasks) unsubscribeFieldsTasks();
    if (unsubscribeDeereTasks) unsubscribeDeereTasks();

    const renderMergedList = () => {
        const listEl = document.getElementById('tractor-work-orders-list');
        const badgeEl = document.getElementById('badge-orders-count');

        const all = [...cachedFieldTasks, ...cachedCloudTasks];
        if (badgeEl) badgeEl.textContent = all.length;
        if (!listEl) return;

        if (all.length === 0) {
            listEl.innerHTML = `<div class="text-center py-8 text-slate-400">Dar nėra suplanuotų ar išsiųstų darbo užduočių.</div>`;
            return;
        }

        listEl.innerHTML = all.map(t => {
            const isDone = t.loggedToJournal === true || t.status === 'completed';
            const isPlanned = !isDone && t.status === 'planned';

            let statusBadge = '';
            let borderClass = 'border-tractorBorder';

            if (isDone) {
                borderClass = 'border-green-500/40';
                statusBadge = `<span style="background-color: rgba(34,197,94,0.18); color: #16A34A; border: 1px solid rgba(34,197,94,0.4);" class="px-2.5 py-1 rounded-lg font-extrabold text-[11px]">✅ Atlikta • Įrašyta į Darbų Žurnalą</span>`;
            } else if (isPlanned) {
                borderClass = 'border-sky-500/40';
                statusBadge = `<span style="background-color: rgba(14,165,233,0.15); color: #0284C7; border: 1px solid rgba(14,165,233,0.4);" class="px-2.5 py-1 rounded-lg font-extrabold text-[11px]">📅 Suplanuota (${t.passesCount || 15} vagos • ${t.angleDeg || 90}°)</span>`;
            } else {
                borderClass = 'border-amber-500/50';
                statusBadge = `<span style="background-color: rgba(245,158,11,0.18); color: #D97706; border: 1px solid rgba(245,158,11,0.4);" class="px-2.5 py-1 rounded-lg font-extrabold text-[11px]">📡 Išsiųsta į kabiną (Vykdoma)</span>`;
            }

            return `
                <div class="p-4 bg-tractorBg rounded-2xl border ${borderClass} space-y-2.5 shadow-md">
                    <div class="flex flex-wrap items-start justify-between gap-2">
                        <div class="space-y-1">
                            <div class="flex items-center gap-2 flex-wrap">
                                <span class="px-2 py-0.5 rounded bg-tractorSurface border border-tractorBorder font-bold text-[11px]" style="color: var(--text-main);">🚜 ${t.tractorName || 'John Deere 8R 370'}</span>
                                <strong class="text-sm font-bold" style="color: var(--text-main);">${t.type} ➔ ${t.fieldName}</strong>
                            </div>
                            <div class="text-[11px] text-slate-400 flex flex-wrap items-center gap-2">
                                <span>🛠️ <strong>${t.product || ''}</strong></span>
                                ${t.rate ? `<span>• Norma/Gylis: <strong class="text-amber-500 font-mono">${t.rate}</strong></span>` : ''}
                                ${t.cost ? `<span>• Savikaina: <strong class="text-green-500 font-mono">${Number(t.cost).toFixed(0)} €</strong></span>` : ''}
                                <span>• 📅 <strong>${t.date || 'Šiandien'}</strong></span>
                            </div>
                            ${t.notes ? `<p class="text-[11px] text-slate-400 italic">${t.notes}</p>` : ''}
                        </div>
                        ${statusBadge}
                    </div>

                    ${t.isFieldTask ? `
                        <div class="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-tractorBorder/60">
                            <button type="button" data-preview-task="${t.id}" data-field-id="${t.fieldId}" class="btn-preview-saved-task px-3 py-1.5 bg-tractorSurface hover:bg-tractorCard border border-tractorBorder rounded-xl text-[11px] font-bold transition cursor-pointer flex items-center gap-1" style="color: var(--text-main);">
                                <span>🗺️</span> <span>Rodyti vagas</span>
                            </button>

                            ${isPlanned ? `
                                <button type="button" data-send-task="${t.id}" data-field-id="${t.fieldId}" class="btn-send-planned-to-cabin px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-[11px] shadow transition cursor-pointer flex items-center gap-1.5">
                                    <span>📡</span> <span>Siųsti į traktorių</span>
                                </button>
                            ` : ''}

                            ${!isDone ? `
                                <button type="button" data-complete-task="${t.id}" data-field-id="${t.fieldId}" class="btn-complete-to-journal px-3.5 py-1.5 bg-tractorPrimary hover:bg-tractorPrimaryHover text-white font-extrabold rounded-xl text-[11px] shadow transition cursor-pointer flex items-center gap-1.5">
                                    <span>✅</span> <span>Užbaigti (Į Darbų Žurnalą)</span>
                                </button>
                            ` : ''}

                            <button type="button" data-delete-task="${t.id}" data-field-id="${t.fieldId}" class="btn-delete-field-task px-2.5 py-1.5 bg-tractorSurface hover:bg-red-500/20 text-red-500 border border-tractorBorder rounded-xl text-[11px] font-bold transition cursor-pointer" title="Ištrinti užduotį">
                                🗑️
                            </button>
                        </div>
                    ` : ''}
                </div>
            `;
        }).join('');

        listEl.querySelectorAll('.btn-preview-saved-task').forEach(btn => {
            btn.onclick = () => {
                const taskId = btn.getAttribute('data-preview-task');
                const fieldId = btn.getAttribute('data-field-id');
                const fields = getFieldsFn() || [];
                const f = fields.find(x => x.id === fieldId);
                const task = cachedFieldTasks.find(x => x.id === taskId);
                if (!f || !task) return;

                if (fieldSel) fieldSel.value = f.id;
                if (widthInp && task.implementWidthM) widthInp.value = task.implementWidthM;
                if (angleSlider && task.angleDeg !== undefined) angleSlider.value = task.angleDeg;
                if (angleLbl && task.angleDeg !== undefined) angleLbl.textContent = `${task.angleDeg}° (Išsaugotas planas)`;
                recalculateAllPreview();
                showBottomToast(`🗺️ Parodytos suplanuoto darbo „${task.type}“ vagos (${task.angleDeg || 90}°)!`, "info");
            };
        });

        listEl.querySelectorAll('.btn-send-planned-to-cabin').forEach(btn => {
            btn.onclick = async () => {
                const taskId = btn.getAttribute('data-send-task');
                const fieldId = btn.getAttribute('data-field-id');
                await sendPlannedTaskToTractorCabin(fieldId, taskId);
            };
        });

        listEl.querySelectorAll('.btn-complete-to-journal').forEach(btn => {
            btn.onclick = async () => {
                const taskId = btn.getAttribute('data-complete-task');
                const fieldId = btn.getAttribute('data-field-id');
                await completeTaskAndSaveToFieldOperations(fieldId, taskId);
            };
        });

        listEl.querySelectorAll('.btn-delete-field-task').forEach(btn => {
            btn.onclick = () => {
                const taskId = btn.getAttribute('data-delete-task');
                const fieldId = btn.getAttribute('data-field-id');
                deleteTaskFromField(fieldId, taskId);
            };
        });
    };

    unsubscribeFieldsTasks = db.collection("user_fields")
        .where("userId", "==", currentUser.uid)
        .onSnapshot(snap => {
            cachedFieldTasks = [];
            snap.forEach(doc => {
                const f = doc.data();
                if (Array.isArray(f.tractorTasks)) {
                    f.tractorTasks.forEach(t => {
                        cachedFieldTasks.push({
                            ...t,
                            fieldId: doc.id,
                            fieldName: f.name,
                            isFieldTask: true
                        });
                    });
                }
            });
            renderMergedList();
        });

    unsubscribeDeereTasks = db.collection("johndeere_tasks")
        .where("userId", "==", currentUser.uid)
        .onSnapshot(snap => {
            cachedCloudTasks = [];
            snap.forEach(doc => {
                const d = doc.data();
                cachedCloudTasks.push({
                    id: doc.id,
                    tractorName: "John Deere 8R 370 (Cloud Files)",
                    type: d.taskType || "VRA Siuntimas",
                    fieldName: d.fieldName || "Laukas",
                    product: d.fileName || "Shapefile .ZIP",
                    rate: d.baseRate ? `${d.baseRate} kg/ha` : "",
                    date: "John Deere Cloud",
                    loggedToJournal: true,
                    isFieldTask: false
                });
            });
            renderMergedList();
        });
}

async function sendPlannedTaskToTractorCabin(fieldId, taskId) {
    try {
        const fRef = db.collection("user_fields").doc(fieldId);
        const fDoc = await fRef.get();
        if (!fDoc.exists) return;

        const fData = fDoc.data();
        const tasks = Array.isArray(fData.tractorTasks) ? [...fData.tractorTasks] : [];
        const targetTask = tasks.find(t => t.id === taskId);
        if (!targetTask) return;

        targetTask.status = 'in_progress';

        await fRef.update({
            tractorTasks: tasks,
            activeTractorOrder: {
                tractorName: targetTask.tractorName || 'John Deere 8R 370',
                taskTitle: `${targetTask.type}: ${targetTask.product}`,
                angleDeg: targetTask.angleDeg || 90,
                implementWidthM: targetTask.implementWidthM || 4.0,
                updatedAt: new Date().toISOString()
            }
        });

        showBottomToast(`📡 Suplanuota užduotis „${targetTask.type}“ nusiųsta į „${targetTask.tractorName || 'John Deere 8R 370'}“ kabiną!`);
    } catch (err) {
        showBottomToast("Klaida siunčiant užduotį: " + err.message, "error");
    }
}

async function completeTaskAndSaveToFieldOperations(fieldId, taskId) {
    try {
        const fRef = db.collection("user_fields").doc(fieldId);
        const fDoc = await fRef.get();
        if (!fDoc.exists) return;

        const fData = fDoc.data();
        const tasks = Array.isArray(fData.tractorTasks) ? [...fData.tractorTasks] : [];
        const targetTask = tasks.find(t => t.id === taskId);
        if (!targetTask) return;

        targetTask.loggedToJournal = true;
        targetTask.status = 'completed';

        const newJournalOp = {
            type: targetTask.type || 'Žemės dirbimas',
            date: targetTask.date || new Date().toISOString().split('T')[0],
            product: targetTask.product || 'Lauko darbas',
            rate: targetTask.rate || '',
            cost: parseFloat(targetTask.cost) || 0,
            notes: targetTask.notes || `Atliko: ${targetTask.tractorName || 'John Deere 8R 370'}`
        };

        const operations = Array.isArray(fData.operations) ? [...fData.operations] : [];
        operations.unshift(newJournalOp);

        const updatePayload = {
            tractorTasks: tasks,
            operations: operations
        };

        // Jei tai buvo Sėja ir pažymėta atnaujinti lauko pasėlį -> iškart atnaujiname field.crop!
        let cropUpdatedMsg = '';
        if (targetTask.type === 'Sėja' && targetTask.updateFieldCrop && targetTask.sownCropName) {
            updatePayload.crop = targetTask.sownCropName;
            cropUpdatedMsg = ` • Lauko pasėlis atnaujintas į „${targetTask.sownCropName}“!`;
        }

        await fRef.update(updatePayload);

        showBottomToast(`🎉 Darbas „${newJournalOp.type}“ įrašytas į lauko „${fData.name}“ Darbų Žurnalą!${cropUpdatedMsg}`);
    } catch (err) {
        showBottomToast("Klaida įrašant į Darbų Žurnalą: " + err.message, "error");
    }
}

function deleteTaskFromField(fieldId, taskId) {
    const task = cachedFieldTasks.find(x => x.id === taskId);
    const taskTitle = task ? `${task.type} ➔ ${task.fieldName}` : "šią darbo užduotį";

    showDialog(
        "Trinti darbo užduotį?",
        `Ar tikrai norite pašalinti užduotį <strong>„${taskTitle}“</strong>?`,
        "🗑️",
        async () => {
            try {
                const fRef = db.collection("user_fields").doc(fieldId);
                const fDoc = await fRef.get();
                if (!fDoc.exists) return;

                const fData = fDoc.data();
                const updatedTasks = (fData.tractorTasks || []).filter(t => t.id !== taskId);
                await fRef.update({ tractorTasks: updatedTasks });
                showBottomToast(`🗑️ Užduotis „${taskTitle}“ sėkmingai pašalinta!`);
            } catch (err) {
                showBottomToast("Klaida trinant: " + err.message, "error");
            }
        },
        true
    );
}

async function ensureZipLibrary() {
    if (window.JSZip) return;
    return new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
        s.onload = () => resolve();
        s.onerror = () => reject(new Error("Nepavyko užkrauti ZIP bibliotekos"));
        document.head.appendChild(s);
    });
}