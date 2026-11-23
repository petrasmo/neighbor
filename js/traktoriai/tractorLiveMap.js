// js/traktoriai/tractorLiveMap.js
import { switchTractorSubTab } from './tractorsTab.js';

let tractorMap = null;
let tractorMarker = null;
let tractorTrailPolyline = null;
let fieldPolygonsLayer = null;
let simTimer = null;
let activeFieldIndex = 0;
let simWaypoints = [];
let simWaypointIdx = 0;
let simProgress = 0;
let simTrailCoords = [];
let localFieldsRef = [];

const TEST_DEERE_UNIT = {
    id: "jd_8r_370",
    name: "John Deere 8R 370",
    brandBadge: "🦌 JDLink™ Cloud",
    terminalName: "CommandCenter™ 4600",
    icon: "🚜",
    vin: "1RW8370PPRD094512",
    model: "8R 370 AutoPowr™ IVT (370 AG)",
    gpsReceiver: "StarFire™ 7000 RTK (±2.5 cm)",
    isWorking: true,
    speedKmh: 9.4,
    rpm: 1840,
    engineLoadPct: 76,
    fuelLevelPct: 78,
    fuelTankCapL: 725,
    fuelRateLh: 36.4,
    coolantTempC: 89,
    defLevelPct: 84,
    batteryVolts: 14.1,
    engineHours: 412.6,
    currentVraRate: 3000,
    workedAreaHa: 4.85
};

let activeUnit = { ...TEST_DEERE_UNIT, lat: 55.2885, lng: 23.9745, heading: 90, fieldName: "Laukas" };

export function setLiveTractorVraRate(rate) {
    if (rate) {
        activeUnit.currentVraRate = rate;
        TEST_DEERE_UNIT.currentVraRate = rate;
        updateCockpitHud();
    }
}

export function stopLiveTractorSimulation() {
    if (simTimer) {
        clearInterval(simTimer);
        simTimer = null;
    }
}

function getActiveFleetList(realMachines = []) {
    if (realMachines && realMachines.length > 0) {
        return realMachines.map(m => {
            const isComb = (m.category || '').toLowerCase().includes('combine') || (m.name || '').toLowerCase().includes('s7') || (m.name || '').toLowerCase().includes('kombain');
            return {
                id: m.id,
                name: m.name || `${m.make || 'John Deere'} ${m.model || ''}`,
                brandBadge: "🦌 JDLink™ Online",
                terminalName: isComb ? "CommandCenter™ G5Plus" : "CommandCenter™ 4600",
                icon: isComb ? '🌾' : '🚜',
                vin: m.vin || "JDLink",
                model: `${m.make || 'John Deere'} ${m.model || ''}`,
                gpsReceiver: "StarFire™ RTK",
                isWorking: true,
                speedKmh: isComb ? 6.4 : 9.2,
                rpm: isComb ? 2100 : 1820,
                engineLoadPct: isComb ? 85 : 75,
                fuelLevelPct: 80,
                fuelTankCapL: isComb ? 1250 : 725,
                fuelRateLh: isComb ? 52.0 : 35.0,
                coolantTempC: 88,
                defLevelPct: 85,
                batteryVolts: 14.1,
                engineHours: m.engineHours ? parseFloat(m.engineHours) : 412.6,
                currentVraRate: isComb ? 0 : 3000,
                workedAreaHa: 5.20,
                realLocation: m.location || null
            };
        });
    }

    return [];
}

export function renderTractorFleetCardsSection(realMachines = [], userFields = []) {
    const fleet = getActiveFleetList(realMachines);
    if (fleet.length === 0) {
        return `
            <div class="bg-tractorSurface border-2 border-tractorBorder rounded-2xl p-8 text-center space-y-3 shadow-xl w-full">
                <span class="text-4xl block">🦌</span>
                <h3 class="font-oswald text-xl font-bold uppercase" style="color: var(--text-main);">Technikos Parkas Tuščias (Neprijungta)</h3>
                <p class="text-xs text-slate-400 max-w-md mx-auto">
                    Prijunkite savo John Deere Operations Center paskyrą skirtuke <strong>„3. Cloud Integracijos“</strong>, kad čia atsirastų jūsų traktoriai ir kombainai.
                </p>
            </div>
        `;
    }
    const primaryFieldName = userFields[0]?.name || "Laukas 010541-7197";

    const cardsHtml = fleet.map((unit, idx) => {
        const assignedField = userFields[idx % Math.max(1, userFields.length)]?.name || primaryFieldName;
        const liters = Math.round((unit.fuelLevelPct / 100) * (unit.fuelTankCapL || 725));

        return `
            <div class="bg-tractorSurface border-2 border-tractorBorder hover:border-tractorPrimary rounded-2xl p-5 shadow-xl flex flex-col justify-between space-y-4 transition group">
                
                <div class="space-y-3">
                    <div class="flex items-start justify-between gap-2">
                        <div class="flex items-center gap-3">
                            <span class="text-2xl bg-tractorBg p-2.5 rounded-xl border border-tractorBorder block">${unit.icon}</span>
                            <div>
                                <h3 class="font-oswald text-lg font-bold tracking-wide group-hover:text-green-400 transition uppercase" style="color: var(--text-main);">
                                    ${unit.name}
                                </h3>
                                <span class="text-[11px] text-slate-400 font-mono block">${unit.model}</span>
                            </div>
                        </div>
                        <span class="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-green-950/50 text-green-400 border border-green-800/70 shrink-0">
                            🟢 Dirba lauke
                        </span>
                    </div>

                    <div class="bg-tractorBg border border-tractorBorder rounded-xl px-3 py-2 text-xs space-y-1">
                        <div class="flex items-center justify-between">
                            <span class="text-slate-400">📍 Vieta dabar:</span>
                            <strong class="text-green-400 font-bold truncate max-w-[200px]">
                                ${assignedField}
                            </strong>
                        </div>
                        <div class="flex items-center justify-between text-[11px]">
                            <span class="text-slate-400">Ryšys / VIN:</span>
                            <span class="font-mono text-slate-300">${unit.brandBadge} • ${unit.vin}</span>
                        </div>
                    </div>

                    <div class="grid grid-cols-2 gap-2 text-xs">
                        <div class="bg-tractorBg border border-tractorBorder rounded-xl p-2.5">
                            <span class="text-[10px] text-slate-400 uppercase font-bold block">Greitis / Sūkiai</span>
                            <strong class="font-mono font-bold text-green-400">${unit.speedKmh.toFixed(1)} km/h • ${unit.rpm} RPM</strong>
                        </div>
                        <div class="bg-tractorBg border border-tractorBorder rounded-xl p-2.5">
                            <span class="text-[10px] text-slate-400 uppercase font-bold block">Kuro bakas</span>
                            <strong class="font-mono font-bold text-amber-400">${unit.fuelLevelPct}% (${liters} L)</strong>
                        </div>
                        <div class="bg-tractorBg border border-tractorBorder rounded-xl p-2.5">
                            <span class="text-[10px] text-slate-400 uppercase font-bold block">Moto-valandos</span>
                            <strong class="font-mono font-bold" style="color: var(--text-main);">${unit.engineHours.toFixed(1)} h</strong>
                        </div>
                        <div class="bg-tractorBg border border-tractorBorder rounded-xl p-2.5">
                            <span class="text-[10px] text-slate-400 uppercase font-bold block">ISOBUS / VRA</span>
                            <strong class="font-mono font-bold text-sky-400">${unit.currentVraRate > 0 ? unit.currentVraRate + ' kg/ha' : 'Paruošta'}</strong>
                        </div>
                    </div>
                </div>

                <div class="flex gap-2 pt-1">
                    <button type="button" data-open-cockpit="${unit.id}" data-field-idx="${idx % Math.max(1, userFields.length)}" class="btn-open-unit-cockpit flex-1 h-11 bg-tractorPrimary hover:bg-tractorPrimaryHover text-white font-extrabold rounded-xl text-xs uppercase tracking-wider shadow-lg flex items-center justify-center gap-1.5 transition cursor-pointer">
                        <span>🛰️</span> <span>Valdymo Pultas ir GPS →</span>
                    </button>
                    <button type="button" data-order-unit="${unit.name}" class="btn-quick-unit-order h-11 px-3.5 bg-tractorBg hover:bg-tractorCard border border-tractorBorder rounded-xl text-xs font-bold transition cursor-pointer" style="color: var(--text-main);" title="Siųsti darbo užduotį šiai technikai">
                        📋 Užduotis
                    </button>
                </div>

            </div>
        `;
    }).join('');

    return `
        <style>
            .cockpit-split-grid {
                display: grid;
                grid-template-columns: 1fr;
                gap: 16px;
                width: 100%;
            }
            @media (min-width: 960px) {
                .cockpit-split-grid {
                    grid-template-columns: minmax(0, 1.75fr) 390px;
                }
            }
        </style>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 w-full">
            ${cardsHtml}
        </div>

        <!-- 🌟 TELEMETRIJOS PULTAS (KAIRĖJE DIDELIS ŽEMĖLAPIS 65%, DEŠINĖJE KOMPAKTIŠKAS 390px KABINOS MONITORIUS) -->
        <div id="tractor-cockpit-bottom-sheet" class="fixed inset-0 bg-black/80 z-[9995] hidden flex flex-col justify-end items-center p-0 sm:p-4 backdrop-blur-md transition-all duration-300">
            <div class="bg-tractorSurface border-2 border-tractorPrimary rounded-t-3xl sm:rounded-3xl w-full max-w-6xl max-h-[94dvh] overflow-y-auto p-4 sm:p-5 space-y-4 shadow-2xl">
                
                <!-- VIRŠUTINĖ ANTRAŠTĖ -->
                <div class="flex flex-wrap items-center justify-between gap-3 border-b border-tractorBorder pb-3">
                    <div class="flex items-center gap-3">
                        <div id="sheet-tractor-icon" class="w-11 h-11 rounded-xl bg-green-500/20 border border-green-500/40 flex items-center justify-center text-2xl">🚜</div>
                        <div>
                            <div class="flex items-center gap-2 flex-wrap">
                                <h3 id="sheet-tractor-title" class="font-oswald text-xl font-bold uppercase tracking-wide" style="color: var(--text-main);">JOHN DEERE 8R 370</h3>
                                <span class="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-green-500/20 text-green-400 border border-green-500/40 flex items-center gap-1.5">
                                    <span class="w-2 h-2 rounded-full bg-green-400 animate-ping"></span>
                                    <span id="sheet-tractor-badge">JDLink™ GPS Online</span>
                                </span>
                            </div>
                            <p id="sheet-tractor-sub" class="text-xs text-slate-400 font-mono">
                                VIN: 1RW8370PPRD094512 • StarFire™ 7000 RTK (Tikslumas ±2.5 cm)
                            </p>
                        </div>
                    </div>

                    <div class="flex flex-wrap items-center gap-2">
                        <select id="sel-sim-target-field" class="h-10 bg-tractorBg border border-tractorBorder rounded-xl px-3 text-xs font-bold outline-none cursor-pointer" style="color: var(--text-main);"></select>

                        <button type="button" id="btn-center-tractor-map" class="h-10 px-3.5 bg-tractorBg hover:bg-tractorCard border border-tractorBorder rounded-xl text-xs font-bold transition cursor-pointer" style="color: var(--text-main);">
                            🎯 Centruoti GPS
                        </button>

                        <button type="button" id="btn-sheet-send-order" class="h-10 px-4 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs uppercase tracking-wider shadow flex items-center gap-1.5 transition cursor-pointer">
                            <span>📋</span> <span>Siųsti Užduotį</span>
                        </button>

                        <button type="button" id="btn-close-cockpit-sheet" class="h-10 px-4 bg-red-500/20 hover:bg-red-500 text-red-300 hover:text-white border border-red-500/40 rounded-xl text-xs font-extrabold uppercase cursor-pointer transition">
                            ✕ Uždaryti
                        </button>
                    </div>
                </div>

                <!-- 2 BLOKAI: KAIRĖJE DIDELIS ŽEMĖLAPIS (1.75fr), DEŠINĖJE KOMPAKTIŠKAS 390px KABINOS MONITORIUS -->
                <div class="cockpit-split-grid">
                    
                    <!-- 1 VAIZDELIS: DIDELIS PALYDOVINIS ŽEMĖLAPIS -->
                    <div class="bg-tractorBg border-2 border-tractorBorder rounded-2xl overflow-hidden shadow-xl flex flex-col">
                        <div class="bg-tractorSurface border-b border-tractorBorder px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs font-mono shrink-0">
                            <div class="flex items-center gap-3">
                                <span class="text-green-400 font-bold" id="hud-gps-coords">📍 55.28850, 23.97450</span>
                                <span class="text-slate-400">|</span>
                                <span class="text-amber-400 font-bold" id="hud-heading">🧭 Kryptis: 90°</span>
                            </div>
                            <div class="flex items-center gap-2">
                                <span class="inline-block w-3 h-1 bg-green-400 rounded"></span>
                                <span class="text-[11px] text-slate-300 font-sans">AutoTrac™ AB linija (Padargas: 24 m)</span>
                            </div>
                        </div>

                        <div id="deere-live-map" style="width: 100%; flex: 1 1 auto; min-height: 520px; position: relative; z-index: 10; background: #0f1712;"></div>
                    </div>

                    <!-- 2 VAIZDELIS: KOMPAKTIŠKAS KABINOS MONITORIUS (390px PLOČIO) -->
                    <div class="bg-tractorBg border-2 border-tractorBorder rounded-2xl p-4 shadow-xl flex flex-col justify-between space-y-3">
                        
                        <div class="border-b border-tractorBorder/70 pb-2.5 flex items-center justify-between">
                            <div>
                                <span id="hud-terminal-brand" class="text-[10px] font-black uppercase tracking-widest text-green-500 block">CommandCenter™ 4600</span>
                                <h4 class="font-oswald text-base font-bold uppercase" style="color: var(--text-main);">Kabinos Telemetrija Gyvai</h4>
                            </div>
                            <span id="hud-work-status" class="px-2.5 py-1 rounded-lg bg-green-500/20 text-green-400 border border-green-500/40 text-[11px] font-extrabold">
                                🟢 DIRBA LAUKE
                            </span>
                        </div>

                        <div class="grid grid-cols-2 gap-2.5">
                            <div class="bg-tractorSurface border border-tractorBorder rounded-xl p-3 text-center">
                                <span class="text-[10px] text-slate-400 uppercase font-bold block">Važiavimo Greitis</span>
                                <div class="font-oswald text-3xl font-black text-green-400 mt-0.5" id="hud-speed">9.4 <span class="text-xs font-sans font-bold text-slate-400">km/h</span></div>
                                <span class="text-[10px] text-slate-400 block mt-0.5">AutoPowr™ IVT</span>
                            </div>
                            <div class="bg-tractorSurface border border-tractorBorder rounded-xl p-3 text-center">
                                <span class="text-[10px] text-slate-400 uppercase font-bold block">Variklio Sūkiai</span>
                                <div class="font-oswald text-3xl font-black text-amber-400 mt-0.5" id="hud-rpm">1840 <span class="text-xs font-sans font-bold text-slate-400">RPM</span></div>
                                <span class="text-[10px] text-slate-400 block mt-0.5">PowerTech™ 9.0L</span>
                            </div>
                        </div>

                        <div class="space-y-2.5 bg-tractorSurface border border-tractorBorder rounded-xl p-3 text-xs">
                            <div>
                                <div class="flex justify-between font-bold mb-1">
                                    <span class="text-slate-300">⛽ Kuro bakas (Dyzelinas)</span>
                                    <span id="hud-fuel-pct" class="text-green-400 font-mono">78% (565 L)</span>
                                </div>
                                <div class="w-full h-2.5 bg-zinc-800 rounded-full overflow-hidden">
                                    <div id="bar-fuel-pct" class="h-full bg-green-500 rounded-full transition-all duration-300" style="width: 78%;"></div>
                                </div>
                            </div>

                            <div>
                                <div class="flex justify-between font-bold mb-1">
                                    <span class="text-slate-300">🔥 Variklio apkrova</span>
                                    <span id="hud-load-pct" class="text-amber-400 font-mono">76%</span>
                                </div>
                                <div class="w-full h-2.5 bg-zinc-800 rounded-full overflow-hidden">
                                    <div id="bar-load-pct" class="h-full bg-amber-500 rounded-full transition-all duration-300" style="width: 76%;"></div>
                                </div>
                            </div>

                            <div>
                                <div class="flex justify-between font-bold mb-1">
                                    <span class="text-slate-300">💧 AdBlue® (DEF) lygis</span>
                                    <span id="hud-def-pct" class="text-sky-400 font-mono">84%</span>
                                </div>
                                <div class="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
                                    <div id="bar-def-pct" class="h-full bg-sky-500 rounded-full transition-all duration-300" style="width: 84%;"></div>
                                </div>
                            </div>
                        </div>

                        <div class="grid grid-cols-2 gap-2 text-xs">
                            <div class="bg-tractorSurface p-2.5 rounded-xl border border-tractorBorder">
                                <span class="text-[10px] text-slate-400 uppercase font-bold block">Kuro Sąnaudos</span>
                                <strong id="hud-fuel-rate" class="font-mono font-bold text-sm" style="color: var(--text-main);">36.4 l/val.</strong>
                            </div>
                            <div class="bg-tractorSurface p-2.5 rounded-xl border border-tractorBorder">
                                <span class="text-[10px] text-slate-400 uppercase font-bold block">Aušinimo Temp.</span>
                                <strong id="hud-coolant" class="font-mono font-bold text-sm text-green-400">89 °C</strong>
                            </div>
                            <div class="bg-tractorSurface p-2.5 rounded-xl border border-tractorBorder">
                                <span class="text-[10px] text-slate-400 uppercase font-bold block">VRA Norma (ISOBUS)</span>
                                <strong id="hud-vra-rate" class="font-mono font-bold text-sm text-amber-400">3000 kg/ha</strong>
                            </div>
                            <div class="bg-tractorSurface p-2.5 rounded-xl border border-tractorBorder">
                                <span class="text-[10px] text-slate-400 uppercase font-bold block">Nudirbta Lauke</span>
                                <strong id="hud-worked-ha" class="font-mono font-bold text-sm text-green-400">4.82 ha</strong>
                            </div>
                            <div class="bg-tractorSurface p-2.5 rounded-xl border border-tractorBorder">
                                <span class="text-[10px] text-slate-400 uppercase font-bold block">Moto-valandos</span>
                                <strong id="hud-eng-hours" class="font-mono font-bold text-sm" style="color: var(--text-main);">412.6 h</strong>
                            </div>
                            <div class="bg-tractorSurface p-2.5 rounded-xl border border-tractorBorder">
                                <span class="text-[10px] text-slate-400 uppercase font-bold block">Akumuliatorius</span>
                                <strong id="hud-voltage" class="font-mono font-bold text-sm text-green-400">14.1 V</strong>
                            </div>
                        </div>

                        <div class="p-2.5 rounded-xl bg-green-500/10 border border-green-500/30 flex items-center justify-between text-xs">
                            <span class="font-bold text-green-400 flex items-center gap-1.5">
                                <span>🛡️</span> <span>CAN-BUS DTC Diagnostika:</span>
                            </span>
                            <span class="font-mono font-bold text-green-300">0 klaidų (OK)</span>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    `;
}

export function bindFleetCardsEvents(userFields = [], realMachines = []) {
    localFieldsRef = userFields || [];
    const fleet = getActiveFleetList(realMachines);
    const sheet = document.getElementById('tractor-cockpit-bottom-sheet');

    document.querySelectorAll('.btn-open-unit-cockpit').forEach(btn => {
        btn.addEventListener('click', () => {
            const unitId = btn.getAttribute('data-open-cockpit');
            const fIdx = parseInt(btn.getAttribute('data-field-idx') || '0', 10);
            const selected = fleet.find(u => u.id === unitId) || fleet[0];

            activeUnit = {
                ...selected,
                lat: 55.2885,
                lng: 23.9745,
                heading: 90,
                fieldName: localFieldsRef[fIdx]?.name || "Laukas"
            };
            activeFieldIndex = fIdx;

            openCockpitBottomSheet(activeUnit, activeFieldIndex);
        });
    });

    document.querySelectorAll('.btn-quick-unit-order').forEach(btn => {
        btn.addEventListener('click', () => {
            const unitName = btn.getAttribute('data-order-unit');
            switchTractorSubTab('orders', unitName);
        });
    });

    const closeSheet = () => {
        stopLiveTractorSimulation();
        sheet?.classList.add('hidden');
    };

    document.getElementById('btn-close-cockpit-sheet')?.addEventListener('click', closeSheet);
    sheet?.addEventListener('click', (e) => {
        if (e.target === sheet) closeSheet();
    });

    document.getElementById('btn-sheet-send-order')?.addEventListener('click', () => {
        closeSheet();
        switchTractorSubTab('orders', activeUnit.name);
    });

    document.getElementById('btn-center-tractor-map')?.addEventListener('click', () => {
        if (tractorMap && activeUnit.lat && activeUnit.lng) {
            tractorMap.invalidateSize();
            tractorMap.setView([activeUnit.lat, activeUnit.lng], 17, { animate: true });
        }
    });
}

function openCockpitBottomSheet(unit, fieldIdx) {
    const sheet = document.getElementById('tractor-cockpit-bottom-sheet');
    if (!sheet) return;

    const titleEl = document.getElementById('sheet-tractor-title');
    const subEl = document.getElementById('sheet-tractor-sub');
    const badgeEl = document.getElementById('sheet-tractor-badge');
    const iconEl = document.getElementById('sheet-tractor-icon');
    const termEl = document.getElementById('hud-terminal-brand');

    if (titleEl) titleEl.textContent = unit.name;
    if (subEl) subEl.textContent = `VIN: ${unit.vin} • ${unit.gpsReceiver}`;
    if (badgeEl) badgeEl.textContent = unit.brandBadge;
    if (iconEl) iconEl.textContent = unit.icon || '🚜';
    if (termEl) termEl.textContent = unit.terminalName || 'CommandCenter™ 4600';

    sheet.classList.remove('hidden');

    setTimeout(() => {
        initSheetMap(fieldIdx);
    }, 100);
}

function initSheetMap(fieldIdx) {
    const mapEl = document.getElementById('deere-live-map');
    if (!mapEl || !window.L) return;

    if (tractorMap) {
        tractorMap.remove();
        tractorMap = null;
    }

    const fieldSel = document.getElementById('sel-sim-target-field');
    if (fieldSel) {
        if (localFieldsRef.length > 0) {
            fieldSel.innerHTML = localFieldsRef.map((f, idx) =>
                `<option value="${idx}" ${idx === fieldIdx ? 'selected' : ''}>📍 Laukas: ${f.name} (${Number(f.areaHa || 0).toFixed(2)} ha)</option>`
            ).join('');
        } else {
            fieldSel.innerHTML = `<option value="0">📍 Demonstracinis laukas</option>`;
        }
        fieldSel.onchange = (e) => {
            activeFieldIndex = parseInt(e.target.value, 10) || 0;
            setupFieldWaypoints(activeFieldIndex, true);
        };
    }

    tractorMap = L.map('deere-live-map', {
        center: [activeUnit.lat, activeUnit.lng],
        zoom: 16,
        zoomControl: true
    });

    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        maxZoom: 19,
        attribution: '© Esri Satellite & John Deere JDLink'
    }).addTo(tractorMap);

    fieldPolygonsLayer = L.layerGroup().addTo(tractorMap);
    drawUserFieldsOnTractorMap();

    tractorTrailPolyline = L.polyline([], {
        color: '#4ADE80',
        weight: 6,
        opacity: 0.9,
        lineCap: 'round'
    }).addTo(tractorMap);

    tractorMarker = L.marker([activeUnit.lat, activeUnit.lng], {
        icon: createTractorMapIcon(activeUnit.name, activeUnit.speedKmh),
        zIndexOffset: 1000
    }).addTo(tractorMap);

    setTimeout(() => {
        if (tractorMap) tractorMap.invalidateSize();
    }, 150);

    if (activeUnit.realLocation && activeUnit.realLocation.lat && activeUnit.realLocation.lng) {
        const loc = activeUnit.realLocation;
        activeUnit.lat = loc.lat;
        activeUnit.lng = loc.lng;
        activeUnit.heading = loc.heading || 0;
        activeUnit.status = "JDLink™ Tikras GPS";

        if (fieldSel) fieldSel.classList.add('hidden');

        const realTrail = (loc.trail && loc.trail.length > 0) ? loc.trail : [[loc.lat, loc.lng]];
        if (tractorTrailPolyline) tractorTrailPolyline.setLatLngs(realTrail);
        if (tractorMarker) {
            tractorMarker.setLatLng([loc.lat, loc.lng]);
            tractorMarker.setIcon(createTractorMapIcon(activeUnit.name, activeUnit.speedKmh));
        }
        if (tractorMap) {
            tractorMap.setView([loc.lat, loc.lng], 16, { animate: true });
        }
        updateCockpitHud();
    } else {
        if (fieldSel) fieldSel.classList.remove('hidden');
        setupFieldWaypoints(fieldIdx, true);
        startLiveSimulation();
    }
}

function drawUserFieldsOnTractorMap() {
    if (!fieldPolygonsLayer) return;
    fieldPolygonsLayer.clearLayers();

    localFieldsRef.forEach((f, idx) => {
        const coords = (f.polygonCoordinates || []).map(p => [
            Number(Array.isArray(p) ? p[0] : p.lat),
            Number(Array.isArray(p) ? p[1] : p.lng)
        ]).filter(c => c[0] && c[1]);

        if (coords.length >= 3) {
            const isSelected = idx === activeFieldIndex;
            const poly = L.polygon(coords, {
                color: isSelected ? '#FACC15' : '#4ADE80',
                weight: isSelected ? 3 : 2,
                fillColor: isSelected ? '#22C55E' : '#16A34A',
                fillOpacity: isSelected ? 0.22 : 0.12
            }).addTo(fieldPolygonsLayer);

            poly.bindTooltip(`🌾 ${f.name} (${Number(f.areaHa || 0).toFixed(2)} ha)`, { sticky: true });
        }
    });
}

function createTractorMapIcon(name, speed) {
    return L.divIcon({
        className: 'custom-jd-tractor-marker',
        html: `
            <div style="position: relative; display: flex; flex-direction: column; align-items: center; transform: translate(-50%, -50%);">
                <div style="background: rgba(15, 23, 15, 0.94); color: #4ADE80; border: 1.5px solid #22C55E; padding: 2px 8px; border-radius: 999px; font-size: 11px; font-weight: 900; white-space: nowrap; margin-bottom: 4px; box-shadow: 0 4px 12px rgba(0,0,0,0.7); font-family: monospace;">
                    ${activeUnit.icon || '🚜'} ${name} • ${Number(speed).toFixed(1)} km/h
                </div>
                <div style="width: 44px; height: 44px; border-radius: 50%; background: radial-gradient(circle, #16A34A 0%, #14532D 100%); border: 3px solid #FACC15; box-shadow: 0 0 22px rgba(34, 197, 94, 0.9); display: flex; align-items: center; justify-content: center; font-size: 22px;">
                    ${activeUnit.icon || '🚜'}
                </div>
            </div>
        `,
        iconSize: [0, 0],
        iconAnchor: [0, 0]
    });
}

function setupFieldWaypoints(fieldIdx, centerMap = true) {
    drawUserFieldsOnTractorMap();

    const f = localFieldsRef[fieldIdx];
    let coords = [];

    if (f && f.polygonCoordinates && f.polygonCoordinates.length >= 3) {
        coords = f.polygonCoordinates.map(p => [
            Number(Array.isArray(p) ? p[0] : p.lat),
            Number(Array.isArray(p) ? p[1] : p.lng)
        ]).filter(c => c[0] && c[1]);
        activeUnit.fieldName = f.name;
    } else {
        coords = [
            [55.2895, 23.9720],
            [55.2895, 23.9770],
            [55.2875, 23.9770],
            [55.2875, 23.9720]
        ];
        activeUnit.fieldName = "Laukas #1";
    }

    let minLat = Infinity, maxLat = -Infinity, minLng = Infinity, maxLng = -Infinity;
    coords.forEach(([lat, lng]) => {
        if (lat < minLat) minLat = lat;
        if (lat > maxLat) maxLat = lat;
        if (lng < minLng) minLng = lng;
        if (lng > maxLng) maxLng = lng;
    });

    const padLat = (maxLat - minLat) * 0.15;
    const padLng = (maxLng - minLng) * 0.15;
    const sLat = minLat + padLat;
    const eLat = maxLat - padLat;
    const sLng = minLng + padLng;
    const eLng = maxLng - padLng;

    const passes = 6;
    simWaypoints = [];
    for (let i = 0; i < passes; i++) {
        const frac = i / (passes - 1);
        const curLat = sLat + (eLat - sLat) * frac;
        if (i % 2 === 0) {
            simWaypoints.push([curLat, sLng]);
            simWaypoints.push([curLat, eLng]);
        } else {
            simWaypoints.push([curLat, eLng]);
            simWaypoints.push([curLat, sLng]);
        }
    }

    simWaypointIdx = 0;
    simProgress = 0.25;
    const pA = simWaypoints[0];
    const pB = simWaypoints[1];
    activeUnit.lat = pA[0] + (pB[0] - pA[0]) * simProgress;
    activeUnit.lng = pA[1] + (pB[1] - pA[1]) * simProgress;
    simTrailCoords = [pA, [activeUnit.lat, activeUnit.lng]];

    if (tractorTrailPolyline) tractorTrailPolyline.setLatLngs(simTrailCoords);
    if (tractorMarker) tractorMarker.setLatLng([activeUnit.lat, activeUnit.lng]);
    if (centerMap && tractorMap) {
        tractorMap.invalidateSize();
        const bounds = L.latLngBounds(coords);
        tractorMap.fitBounds(bounds, { padding: [35, 35], maxZoom: 17 });
    }
    updateCockpitHud();
}

function startLiveSimulation() {
    if (simTimer) clearInterval(simTimer);

    simTimer = setInterval(() => {
        if (simWaypoints.length < 2) return;

        const nextIdx = (simWaypointIdx + 1) % simWaypoints.length;
        const isHeadlandTurn = simWaypointIdx % 2 === 1;
        simProgress += isHeadlandTurn ? 0.08 : 0.025;

        if (simProgress >= 1) {
            simProgress = 0;
            simWaypointIdx = nextIdx;
        }

        const curA = simWaypoints[simWaypointIdx];
        const curB = simWaypoints[(simWaypointIdx + 1) % simWaypoints.length];

        const newLat = curA[0] + (curB[0] - curA[0]) * simProgress;
        const newLng = curA[1] + (curB[1] - curA[1]) * simProgress;

        const dLat = curB[0] - curA[0];
        const dLng = curB[1] - curA[1];
        let angle = Math.atan2(dLng, dLat) * (180 / Math.PI);
        if (angle < 0) angle += 360;

        activeUnit.lat = newLat;
        activeUnit.lng = newLng;
        activeUnit.heading = Math.round(angle);

        if (isHeadlandTurn) {
            activeUnit.speedKmh = +(5.2 + Math.random() * 0.6).toFixed(1);
            activeUnit.rpm = Math.round(1450 + Math.random() * 60);
            activeUnit.engineLoadPct = Math.round(48 + Math.random() * 8);
            activeUnit.fuelRateLh = +(21.5 + Math.random() * 2.0).toFixed(1);
            activeUnit.status = "Apsisuka galulaukėje";
        } else {
            activeUnit.speedKmh = +(9.2 + Math.random() * 0.7).toFixed(1);
            activeUnit.rpm = Math.round(1820 + Math.random() * 50);
            activeUnit.engineLoadPct = Math.round(74 + Math.random() * 9);
            activeUnit.fuelRateLh = +(35.8 + Math.random() * 2.4).toFixed(1);
            activeUnit.status = "Dirba lauke (AutoTrac™ RTK)";
        }

        activeUnit.workedAreaHa = +(activeUnit.workedAreaHa + 0.01).toFixed(2);
        activeUnit.engineHours = +(activeUnit.engineHours + 0.0003).toFixed(2);

        simTrailCoords.push([newLat, newLng]);
        if (simTrailCoords.length > 140) simTrailCoords.shift();

        if (tractorMarker) {
            tractorMarker.setLatLng([newLat, newLng]);
            tractorMarker.setIcon(createTractorMapIcon(activeUnit.name, activeUnit.speedKmh));
        }
        if (tractorTrailPolyline) {
            tractorTrailPolyline.setLatLngs(simTrailCoords);
        }

        updateCockpitHud();
    }, 1000);
}

function updateCockpitHud() {
    const setTxt = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.innerHTML = val;
    };

    setTxt('hud-gps-coords', `📍 ${activeUnit.lat.toFixed(5)}, ${activeUnit.lng.toFixed(5)}`);
    setTxt('hud-heading', `🧭 Kryptis: ${activeUnit.heading}°`);
    setTxt('hud-work-status', `🟢 ${activeUnit.status || 'Dirba lauke'}`);
    setTxt('hud-speed', `${activeUnit.speedKmh.toFixed(1)} <span class="text-xs font-sans font-bold text-slate-400">km/h</span>`);
    setTxt('hud-rpm', `${activeUnit.rpm} <span class="text-xs font-sans font-bold text-slate-400">RPM</span>`);

    const liters = Math.round((activeUnit.fuelLevelPct / 100) * (activeUnit.fuelTankCapL || 725));
    setTxt('hud-fuel-pct', `${activeUnit.fuelLevelPct}% (${liters} L)`);
    setTxt('hud-load-pct', `${activeUnit.engineLoadPct}%`);
    setTxt('hud-def-pct', `${activeUnit.defLevelPct}%`);

    const fuelBar = document.getElementById('bar-fuel-pct');
    if (fuelBar) fuelBar.style.width = `${activeUnit.fuelLevelPct}%`;
    const loadBar = document.getElementById('bar-load-pct');
    if (loadBar) loadBar.style.width = `${activeUnit.engineLoadPct}%`;
    const defBar = document.getElementById('bar-def-pct');
    if (defBar) defBar.style.width = `${activeUnit.defLevelPct}%`;

    setTxt('hud-fuel-rate', `${activeUnit.fuelRateLh} l/val.`);
    setTxt('hud-coolant', `${activeUnit.coolantTempC} °C`);
    setTxt('hud-vra-rate', `${activeUnit.currentVraRate} kg/ha`);
    setTxt('hud-worked-ha', `${activeUnit.workedAreaHa.toFixed(2)} ha`);
    setTxt('hud-eng-hours', `${Number(activeUnit.engineHours).toFixed(1)} h`);
    setTxt('hud-voltage', `${activeUnit.batteryVolts} V`);
}