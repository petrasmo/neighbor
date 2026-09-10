// js/fieldsSoil.js
import { db } from './firebase.js';
import { showDialog } from './ui.js';

const CDSE_INSTANCE_ID = "2ecdf3ed-4338-4577-a502-11dd5b2df254";
const CDSE_WMS_URL = `https://sh.dataspace.copernicus.eu/ogc/wms/${CDSE_INSTANCE_ID}`;

let soilMap = null;
let sampleMarkersLayer = null;
let fieldPolygonLayer = null;
let esriBaseLayer = null;
let sentinelNdviLayer = null;
let limingZonesLayer = null;

let currentSamples = [];
let activeField = null;
let currentMode = 'ndvi'; // 'uniform' arba 'ndvi'
let activeSatelliteDate = getVegetationPeakDate();
let currentDensityHa = 3;
let isAddingSampleMode = false;
let currentPlanId = null;

function getVegetationPeakDate() {
    const now = new Date();
    const currentYear = now.getFullYear();
    const year = now.getMonth() < 5 ? currentYear - 1 : currentYear;
    return `${year}-06-15`;
}

function getSentinelTimeRange(dateStr) {
    const end = new Date(dateStr);
    const start = new Date(dateStr);
    start.setDate(start.getDate() - 30);
    return `${start.toISOString().split('T')[0]}/${end.toISOString().split('T')[0]}`;
}

export function initSoilTab(container, field) {
    if (!container || !field) return;
    activeField = field;
    isAddingSampleMode = false;

    if (!activeField.soilAnalyses) {
        activeField.soilAnalyses = [];
        if (activeField.soilAnalysis && activeField.soilAnalysis.samples) {
            activeField.soilAnalyses.push({
                id: 'plan_' + Date.now(),
                title: 'Dirvožemio tyrimas (' + (activeField.soilAnalysis.date || new Date().toISOString().split('T')[0]) + ')',
                date: activeField.soilAnalysis.date || new Date().toISOString().split('T')[0],
                avgPh: activeField.soilAnalysis.avgPh || null,
                mapMode: 'ndvi',
                satelliteDate: getVegetationPeakDate(),
                samples: activeField.soilAnalysis.samples
            });
        }
    }

    container.innerHTML = `
        <div class="bg-tractorSurface border border-tractorBorder rounded-2xl p-6 md:p-8 space-y-6 shadow-xl">
            
            <!-- ANTRAŠTĖ IR SLUOKSNIAI -->
            <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-tractorBorder/70 pb-5">
                <div class="space-y-1">
                    <div class="inline-flex items-center gap-1.5 bg-amber-500/15 border border-amber-500/30 text-amber-500 text-xs px-3 py-1 rounded-full font-bold uppercase tracking-wider">
                        <span>🍋</span> Agrocheminis Dirvožemio Tyrimas ir Zonavimas
                    </div>
                    <h3 class="font-oswald text-xl md:text-2xl font-bold uppercase tracking-wider" style="color: var(--text-main);">
                        Ėminių Tinklelio ir Kalkinimo Žemėlapis
                    </h3>
                    <p class="text-xs md:text-sm text-slate-400">
                        Laukas: <strong class="text-green-500 font-bold">${field.name} (${field.areaHa} ha)</strong>
                    </p>
                </div>

                <div class="flex flex-wrap items-center gap-2 bg-tractorBg p-1.5 rounded-xl border border-tractorBorder">
                    <button type="button" id="btn-mode-uniform" class="px-3.5 py-2 rounded-lg text-xs font-bold transition cursor-pointer text-slate-400 hover:text-white">
                        🌍 Bazinis žemėlapis
                    </button>
                    <button type="button" id="btn-mode-ndvi" class="px-3.5 py-2 rounded-lg text-xs font-bold transition cursor-pointer bg-tractorPrimary text-white shadow">
                        🛰️ Sentinel-2 NDVI spektras
                    </button>
                </div>
            </div>

            <!-- 📑 PLANŲ ĮRAŠŲ VALDYMO SKYDELIS -->
            <div class="bg-tractorBg border border-tractorBorder p-4 rounded-xl space-y-3">
                <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-tractorBorder/50 pb-3">
                    <div class="flex items-center gap-2">
                        <span class="text-base">📁</span>
                        <span class="font-bold text-xs text-white uppercase tracking-wider">Išsaugoti planai:</span>
                        <select id="select-soil-plan" class="bg-tractorSurface border border-tractorBorder focus:border-amber-500 rounded-lg px-3 py-1.5 text-xs text-white font-bold outline-none cursor-pointer">
                        </select>
                    </div>

                    <div class="flex items-center gap-2">
                        <button type="button" id="btn-create-new-plan" class="px-3 py-1.5 rounded-lg text-xs font-bold bg-green-600 hover:bg-green-500 text-white flex items-center gap-1 transition shadow cursor-pointer">
                            <span>➕</span> Naujas planas
                        </button>
                        <button type="button" id="btn-delete-current-plan" class="px-3 py-1.5 rounded-lg text-xs font-bold bg-red-950/40 hover:bg-red-900 border border-red-800/60 text-red-300 flex items-center gap-1 transition cursor-pointer">
                            <span>🗑️</span> Ištrinti planą
                        </button>
                    </div>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-1">
                    <div class="flex items-center gap-2">
                        <span class="text-slate-400">Pavadinimas:</span>
                        <input type="text" id="input-plan-title" placeholder="Pvz.: 2026 m. Pavasario tyrimas" class="bg-tractorSurface border border-tractorBorder focus:border-amber-500 rounded-lg px-3 py-1 text-xs text-white font-bold outline-none flex-1">
                    </div>
                    <div class="flex items-center gap-2">
                        <span class="text-slate-400">Palydovo data:</span>
                        <input type="date" id="input-soil-sat-date" value="${activeSatelliteDate}" class="bg-tractorSurface border border-tractorBorder focus:border-amber-500 rounded-lg px-3 py-1 text-xs text-white font-mono font-bold outline-none cursor-pointer">
                    </div>
                </div>
            </div>

            <!-- TINKLELIO TANKIS IR VEIKSMAI -->
            <div class="flex flex-wrap items-center justify-between gap-3 bg-tractorBg p-3.5 rounded-xl border border-tractorBorder text-xs">
                <div class="flex flex-wrap items-center gap-2">
                    <span class="font-bold text-slate-300">Generuoti tinklelį:</span>
                    <button type="button" class="btn-grid-density px-3 py-1.5 rounded-lg font-bold transition cursor-pointer text-slate-400 hover:text-white" data-ha="5">5 ha / mėg.</button>
                    <button type="button" class="btn-grid-density px-3 py-1.5 rounded-lg font-bold transition cursor-pointer bg-tractorPrimary text-white shadow" data-ha="3">3 ha / mėg.</button>
                    <button type="button" class="btn-grid-density px-3 py-1.5 rounded-lg font-bold transition cursor-pointer text-slate-400 hover:text-white" data-ha="1.5">1.5 ha / mėg.</button>
                    
                    <button type="button" id="btn-toggle-add-sample" class="ml-2 px-3.5 py-1.5 rounded-lg font-bold transition cursor-pointer bg-amber-600 hover:bg-amber-500 text-white flex items-center gap-1.5 shadow">
                        <span>➕</span> Pridėti tašką
                    </button>
                </div>

                <div class="flex items-center gap-2" id="soil-cadre-info">
                    <span class="text-slate-400">Aktyvus kadras:</span>
                    <strong id="label-cadre-display" class="text-green-500 font-mono font-bold">${activeSatelliteDate}</strong>
                </div>
            </div>

            <div id="add-sample-hint-banner" class="hidden bg-amber-500/20 border border-amber-500 text-amber-300 px-4 py-2.5 rounded-xl text-xs flex items-center justify-between">
                <span>📍 Spustelėkite bet kur lauko ribose žemėlapyje, kad pridėtumėte naują tašką.</span>
                <button type="button" id="btn-cancel-add-sample" class="font-bold hover:underline">Atšaukti ✕</button>
            </div>

            <!-- ŽEMĖLAPIS -->
            <div class="relative w-full rounded-2xl overflow-hidden border border-tractorBorder bg-zinc-950 shadow-inner">
                <div id="soil-samples-map" style="height: 480px; width: 100%;" class="z-0"></div>
            </div>

            <!-- REZULTATAI IR PH SUVEDIMAS -->
            <div id="soil-results-wrapper" class="space-y-6">
                <div class="border-t border-tractorBorder/70 pt-5 space-y-3">
                    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <h4 class="font-oswald text-lg font-bold uppercase tracking-wider text-white flex items-center gap-2">
                            <span>📝</span> Įveskite laboratorijos pH rezultatus
                        </h4>
                        <span class="text-xs text-slate-400">Pagal pH reikšmes formuojamos normos barstytuvui</span>
                    </div>

                    <div id="soil-samples-inputs-grid" class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 text-xs"></div>
                </div>

                <div id="soil-summary-card" class="bg-tractorBg border border-tractorBorder p-6 rounded-2xl space-y-4 shadow-xl"></div>
            </div>

        </div>
    `;

    setTimeout(() => {
        initSoilLeafletMap(field);
        setupSoilEventListeners();
        setupPlanManagement();
    }, 150);
}

function setupPlanManagement() {
    const plans = activeField.soilAnalyses || [];
    const select = document.getElementById('select-soil-plan');
    const inputTitle = document.getElementById('input-plan-title');
    const inputSatDate = document.getElementById('input-soil-sat-date');

    if (plans.length > 0) {
        loadPlan(plans[plans.length - 1].id);
    } else {
        createNewPlan();
    }

    renderPlansDropdown();

    if (select) {
        select.onchange = (e) => loadPlan(e.target.value);
    }

    document.getElementById('btn-create-new-plan')?.addEventListener('click', () => createNewPlan());

    document.getElementById('btn-delete-current-plan')?.addEventListener('click', () => {
        if (!currentPlanId) return;
        showDialog("Trinti planą", "Ar tikrai norite pašalinti šį dirvožemio tyrimo planą?", "🗑️", async () => {
            activeField.soilAnalyses = activeField.soilAnalyses.filter(p => p.id !== currentPlanId);
            await persistPlansToDb();

            if (activeField.soilAnalyses.length > 0) {
                loadPlan(activeField.soilAnalyses[activeField.soilAnalyses.length - 1].id);
            } else {
                createNewPlan();
            }
            renderPlansDropdown();
        }, true);
    });

    if (inputTitle) {
        inputTitle.oninput = (e) => {
            const plan = (activeField.soilAnalyses || []).find(p => p.id === currentPlanId);
            if (plan) {
                plan.title = e.target.value;
                renderPlansDropdown();
            }
        };
    }

    if (inputSatDate) {
        inputSatDate.onchange = (e) => {
            activeSatelliteDate = e.target.value;
            const display = document.getElementById('label-cadre-display');
            if (display) display.textContent = activeSatelliteDate;

            if (sentinelNdviLayer) {
                sentinelNdviLayer.setParams({ time: getSentinelTimeRange(activeSatelliteDate) });
            }

            const plan = (activeField.soilAnalyses || []).find(p => p.id === currentPlanId);
            if (plan) plan.satelliteDate = activeSatelliteDate;
        };
    }
}

function renderPlansDropdown() {
    const select = document.getElementById('select-soil-plan');
    if (!select) return;

    const plans = activeField.soilAnalyses || [];
    select.innerHTML = plans.map(p => `
        <option value="${p.id}" ${p.id === currentPlanId ? 'selected' : ''}>
            ${p.title || 'Planai'} (${p.date || '-'})
        </option>
    `).join('');
}

function createNewPlan() {
    currentPlanId = 'plan_' + Date.now();
    const todayStr = new Date().toISOString().split('T')[0];
    const newTitle = `Tyrimas #${(activeField.soilAnalyses || []).length + 1} (${todayStr})`;
    activeSatelliteDate = getVegetationPeakDate();
    currentMode = 'ndvi';

    const titleInput = document.getElementById('input-plan-title');
    if (titleInput) titleInput.value = newTitle;

    const satDateInput = document.getElementById('input-soil-sat-date');
    if (satDateInput) satDateInput.value = activeSatelliteDate;

    const display = document.getElementById('label-cadre-display');
    if (display) display.textContent = activeSatelliteDate;

    applyMapMode(currentMode);
    generateFieldSamples();

    const cleanSamples = currentSamples.map(s => ({
        id: s.id,
        lat: Number(s.lat),
        lng: Number(s.lng),
        ph: null,
        zone: s.zoneTitle || "Tinklinis ėminys"
    }));

    const newPlanObj = {
        id: currentPlanId,
        title: newTitle,
        date: todayStr,
        avgPh: null,
        mapMode: currentMode,
        satelliteDate: activeSatelliteDate,
        samples: cleanSamples
    };

    if (!activeField.soilAnalyses) activeField.soilAnalyses = [];
    activeField.soilAnalyses.push(newPlanObj);

    renderPlansDropdown();
}

function loadPlan(planId) {
    const plan = (activeField.soilAnalyses || []).find(p => p.id === planId);
    if (!plan) return;

    currentPlanId = plan.id;
    const titleInput = document.getElementById('input-plan-title');
    if (titleInput) titleInput.value = plan.title || '';

    activeSatelliteDate = plan.satelliteDate || getVegetationPeakDate();
    const satDateInput = document.getElementById('input-soil-sat-date');
    if (satDateInput) satDateInput.value = activeSatelliteDate;

    const display = document.getElementById('label-cadre-display');
    if (display) display.textContent = activeSatelliteDate;

    currentMode = plan.mapMode || 'ndvi';
    applyMapMode(currentMode);

    if (sentinelNdviLayer) {
        sentinelNdviLayer.setParams({ time: getSentinelTimeRange(activeSatelliteDate) });
    }

    currentSamples = (plan.samples || []).map(s => ({
        id: s.id,
        lat: Number(s.lat),
        lng: Number(s.lng),
        zoneTitle: s.zone || s.zoneTitle || "Tinklinis ėminys",
        color: s.ph ? (s.ph < 5.3 ? "#DC2626" : s.ph < 6.0 ? "#D97706" : "#16A34A") : "#16A34A",
        ph: s.ph !== null && !isNaN(s.ph) ? Number(s.ph) : null,
        markerInstance: null
    }));

    renderPlansDropdown();
    drawMarkersAndTable();
}

function applyMapMode(mode) {
    const btnUniform = document.getElementById('btn-mode-uniform');
    const btnNdvi = document.getElementById('btn-mode-ndvi');
    const cadreInfo = document.getElementById('soil-cadre-info');

    if (mode === 'uniform') {
        if (btnUniform) btnUniform.className = "px-3.5 py-2 rounded-lg text-xs font-bold bg-tractorPrimary text-white shadow transition cursor-pointer";
        if (btnNdvi) btnNdvi.className = "px-3.5 py-2 rounded-lg text-xs font-bold text-slate-400 hover:text-white transition cursor-pointer";
        if (soilMap && sentinelNdviLayer && soilMap.hasLayer(sentinelNdviLayer)) {
            soilMap.removeLayer(sentinelNdviLayer);
        }
        if (cadreInfo) cadreInfo.style.display = 'none';
    } else {
        if (btnNdvi) btnNdvi.className = "px-3.5 py-2 rounded-lg text-xs font-bold bg-tractorPrimary text-white shadow transition cursor-pointer";
        if (btnUniform) btnUniform.className = "px-3.5 py-2 rounded-lg text-xs font-bold text-slate-400 hover:text-white transition cursor-pointer";
        if (soilMap && sentinelNdviLayer && !soilMap.hasLayer(sentinelNdviLayer)) {
            sentinelNdviLayer.addTo(soilMap);
            fieldPolygonLayer?.bringToFront();
            limingZonesLayer?.bringToFront();
            sampleMarkersLayer?.bringToFront();
        }
        if (cadreInfo) cadreInfo.style.display = 'flex';
    }
}

async function persistPlansToDb() {
    const entered = currentSamples.filter(s => s.ph !== null && s.ph > 0);
    const currentAvg = entered.length > 0 
        ? (entered.reduce((acc, s) => acc + s.ph, 0) / entered.length).toFixed(2)
        : null;

    const cleanSamples = currentSamples.map(s => ({
        id: s.id,
        lat: Number(s.lat),
        lng: Number(s.lng),
        ph: s.ph !== null && !isNaN(s.ph) ? Number(s.ph) : null,
        zone: s.zoneTitle || "Tinklinis ėminys"
    }));

    const cleanPlans = (activeField.soilAnalyses || []).map(p => {
        if (p.id === currentPlanId) {
            return {
                id: p.id,
                title: document.getElementById('input-plan-title')?.value || p.title || "Tyrimas",
                date: p.date || new Date().toISOString().split('T')[0],
                avgPh: currentAvg,
                mapMode: currentMode,
                satelliteDate: activeSatelliteDate,
                samples: cleanSamples
            };
        }
        return {
            id: p.id,
            title: p.title || "Tyrimas",
            date: p.date || new Date().toISOString().split('T')[0],
            avgPh: p.avgPh || null,
            mapMode: p.mapMode || 'ndvi',
            satelliteDate: p.satelliteDate || getVegetationPeakDate(),
            samples: (p.samples || []).map(s => ({
                id: s.id,
                lat: Number(s.lat),
                lng: Number(s.lng),
                ph: s.ph !== null && !isNaN(s.ph) ? Number(s.ph) : null,
                zone: s.zone || s.zoneTitle || "Tinklinis ėminys"
            }))
        };
    });

    activeField.soilAnalyses = cleanPlans;
    const currentPlan = cleanPlans.find(p => p.id === currentPlanId);

    await db.collection("user_fields").doc(activeField.id).update({
        soilAnalyses: cleanPlans,
        soilAnalysis: currentPlan ? {
            date: currentPlan.date,
            avgPh: currentPlan.avgPh,
            mapMode: currentPlan.mapMode,
            satelliteDate: currentPlan.satelliteDate,
            samples: currentPlan.samples
        } : null
    });
}

function initSoilLeafletMap(field) {
    const mapContainer = document.getElementById('soil-samples-map');
    if (!mapContainer) return;

    const rawCoords = field.polygonCoordinates || [];
    if (rawCoords.length < 3) return;

    const latLngs = rawCoords.map(p => {
        if (Array.isArray(p)) return [parseFloat(p[0]), parseFloat(p[1])];
        return [parseFloat(p.lat), parseFloat(p.lng)];
    });

    if (soilMap) {
        soilMap.remove();
        soilMap = null;
    }

    soilMap = L.map('soil-samples-map', {
        zoomControl: true,
        maxZoom: 18,
        minZoom: 6
    }).fitBounds(latLngs, { padding: [40, 40] });

    esriBaseLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: '&copy; Esri',
        maxNativeZoom: 17,
        maxZoom: 18
    }).addTo(soilMap);

    sentinelNdviLayer = L.tileLayer.wms(CDSE_WMS_URL, {
        layers: 'VEGETATION_INDEX',
        format: 'image/png',
        transparent: true,
        maxcc: 25,
        time: getSentinelTimeRange(activeSatelliteDate),
        tileSize: 512,
        attribution: '&copy; Copernicus Sentinel-2'
    });

    if (currentMode === 'ndvi') {
        sentinelNdviLayer.addTo(soilMap);
    }

    limingZonesLayer = new L.FeatureGroup().addTo(soilMap);

    fieldPolygonLayer = L.polygon(latLngs, {
        color: '#FFD700',
        fill: false,
        weight: 3.5
    }).addTo(soilMap);

    sampleMarkersLayer = new L.FeatureGroup().addTo(soilMap);

    soilMap.on('click', (e) => {
        if (!isAddingSampleMode) return;
        const pt = [e.latlng.lat, e.latlng.lng];
        if (!isPointInPolygon(pt, latLngs)) {
            showDialog("Už lauko ribų", "Ėminio tašką galima padėti tik lauko kontūro viduje.", "⚠️");
            return;
        }

        addNewSamplePoint(e.latlng.lat, e.latlng.lng);
        setAddingSampleMode(false);
    });

    setTimeout(() => {
        if (soilMap) soilMap.invalidateSize();
    }, 200);
}

function setAddingSampleMode(enabled) {
    isAddingSampleMode = enabled;
    const banner = document.getElementById('add-sample-hint-banner');
    const btn = document.getElementById('btn-toggle-add-sample');
    if (!banner || !btn) return;

    if (enabled) {
        banner.classList.remove('hidden');
        btn.classList.replace('bg-amber-600', 'bg-zinc-700');
        btn.innerHTML = `<span>✕</span> Atšaukti dėti`;
        if (soilMap) soilMap.getContainer().style.cursor = 'crosshair';
    } else {
        banner.classList.add('hidden');
        btn.classList.replace('bg-zinc-700', 'bg-amber-600');
        btn.innerHTML = `<span>➕</span> Pridėti tašką`;
        if (soilMap) soilMap.getContainer().style.cursor = '';
    }
}

function addNewSamplePoint(lat, lng) {
    currentSamples.push({
        id: currentSamples.length + 1,
        lat: Number(lat),
        lng: Number(lng),
        zoneTitle: "Papildomas ėminys",
        color: "#16A34A",
        ph: null,
        markerInstance: null
    });
    reindexSamples();
    drawMarkersAndTable();
}

function removeSamplePoint(sampleId) {
    currentSamples = currentSamples.filter(s => s.id !== sampleId);
    reindexSamples();
    drawMarkersAndTable();
}

function reindexSamples() {
    currentSamples.forEach((s, idx) => {
        s.id = idx + 1;
    });
}

function setupSoilEventListeners() {
    const btnUniform = document.getElementById('btn-mode-uniform');
    const btnNdvi = document.getElementById('btn-mode-ndvi');

    if (btnUniform) {
        btnUniform.onclick = () => {
            currentMode = 'uniform';
            applyMapMode('uniform');
            const plan = (activeField.soilAnalyses || []).find(p => p.id === currentPlanId);
            if (plan) plan.mapMode = 'uniform';
        };
    }

    if (btnNdvi) {
        btnNdvi.onclick = () => {
            currentMode = 'ndvi';
            applyMapMode('ndvi');
            const plan = (activeField.soilAnalyses || []).find(p => p.id === currentPlanId);
            if (plan) plan.mapMode = 'ndvi';
        };
    }

    document.getElementById('btn-toggle-add-sample')?.addEventListener('click', () => {
        setAddingSampleMode(!isAddingSampleMode);
    });

    document.getElementById('btn-cancel-add-sample')?.addEventListener('click', () => {
        setAddingSampleMode(false);
    });

    document.querySelectorAll('.btn-grid-density').forEach(btn => {
        btn.onclick = () => {
            document.querySelectorAll('.btn-grid-density').forEach(b => {
                b.className = "btn-grid-density px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer text-slate-400 hover:text-white";
            });
            btn.className = "btn-grid-density px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer bg-tractorPrimary text-white shadow";
            currentDensityHa = parseFloat(btn.getAttribute('data-ha')) || 3;
            generateFieldSamples();
        };
    });
}

function generateFieldSamples() {
    if (!soilMap || !activeField || !sampleMarkersLayer) return;
    sampleMarkersLayer.clearLayers();

    const rawCoords = activeField.polygonCoordinates || [];
    if (rawCoords.length < 3) return;

    const latLngs = rawCoords.map(p => {
        if (Array.isArray(p)) return [parseFloat(p[0]), parseFloat(p[1])];
        return [parseFloat(p.lat), parseFloat(p.lng)];
    });

    const totalArea = parseFloat(activeField.areaHa) || 10;
    const targetCount = Math.max(1, Math.round(totalArea / currentDensityHa));
    const bounds = L.polygon(latLngs).getBounds();

    currentSamples = generateEqualCoverageGrid(latLngs, bounds, targetCount);
    drawMarkersAndTable();
}

function drawMarkersAndTable() {
    if (!sampleMarkersLayer) return;
    sampleMarkersLayer.clearLayers();

    currentSamples.forEach((s) => {
        const marker = L.marker([s.lat, s.lng], {
            draggable: true,
            icon: createSoilIcon(s.id, s.color)
        }).addTo(sampleMarkersLayer);

        s.markerInstance = marker;

        marker.on('dragend', (e) => {
            const pos = e.target.getLatLng();
            s.lat = Number(pos.lat);
            s.lng = Number(pos.lng);
            renderLimingZonesOnMap();
        });

        marker.bindPopup(`
            <div class="text-xs space-y-2 p-1 font-sans">
                <strong class="block text-slate-900 font-bold">Ėminys #${s.id}</strong>
                <button type="button" class="btn-popup-delete-sample px-2.5 py-1 bg-red-600 hover:bg-red-700 text-white rounded font-bold cursor-pointer transition text-[11px]" data-id="${s.id}">
                    🗑️ Panaikinti šį tašką
                </button>
            </div>
        `);

        marker.bindTooltip(`Ėminys #${s.id} (${s.zoneTitle})`, { direction: 'top', offset: [0, -10] });
    });

    renderSamplesInputs();
    renderLimingZonesOnMap();
    recalculateLimingSummary();

    soilMap.off('popupopen');
    soilMap.on('popupopen', (e) => {
        const btn = e.popup._contentNode.querySelector('.btn-popup-delete-sample');
        if (btn) {
            btn.onclick = () => {
                const id = parseInt(btn.getAttribute('data-id'));
                removeSamplePoint(id);
                soilMap.closePopup();
            };
        }
    });
}

function generateEqualCoverageGrid(polygonCoords, bounds, k) {
    const minLat = bounds.getSouth(), maxLat = bounds.getNorth();
    const minLng = bounds.getWest(), maxLng = bounds.getEast();

    const steps = 40;
    const latStep = (maxLat - minLat) / steps;
    const lngStep = (maxLng - minLng) / steps;
    const pool = [];

    for (let lat = minLat + latStep * 0.5; lat < maxLat; lat += latStep) {
        for (let lng = minLng + lngStep * 0.5; lng < maxLng; lng += lngStep) {
            if (isPointInPolygon([lat, lng], polygonCoords)) {
                pool.push({ lat, lng });
            }
        }
    }

    if (pool.length === 0) return [];

    let cols = Math.round(Math.sqrt(k));
    let rows = Math.ceil(k / cols);
    const seeds = [];

    for (let r = 0; r < rows; r++) {
        const lat = maxLat - ((r + 0.5) / rows) * (maxLat - minLat);
        for (let c = 0; c < cols; c++) {
            if (seeds.length >= k) break;
            const lng = minLng + ((c + 0.5) / cols) * (maxLng - minLng);

            let nearest = pool[0];
            let minD = Infinity;
            pool.forEach(p => {
                const d = Math.hypot(p.lat - lat, (p.lng - lng) * 0.56);
                if (d < minD) { minD = d; nearest = p; }
            });
            seeds.push({ lat: nearest.lat, lng: nearest.lng });
        }
    }

    let centroids = seeds;
    for (let iter = 0; iter < 10; iter++) {
        const clusters = Array.from({ length: k }, () => []);
        pool.forEach(p => {
            let bestDistSq = Infinity;
            let bestIdx = 0;
            for (let c = 0; c < k; c++) {
                const dy = (p.lat - centroids[c].lat) * 111300;
                const dx = (p.lng - centroids[c].lng) * 62200;
                const dSq = dx * dx + dy * dy;
                if (dSq < bestDistSq) { bestDistSq = dSq; bestIdx = c; }
            }
            clusters[bestIdx].push(p);
        });

        centroids = clusters.map((pts, idx) => {
            if (pts.length === 0) return centroids[idx];
            return {
                lat: pts.reduce((acc, p) => acc + p.lat, 0) / pts.length,
                lng: pts.reduce((acc, p) => acc + p.lng, 0) / pts.length
            };
        });
    }

    centroids.sort((a, b) => b.lat - a.lat || a.lng - b.lng);

    return centroids.map((c, idx) => ({
        id: idx + 1,
        lat: Number(c.lat),
        lng: Number(c.lng),
        zoneTitle: "Tinklinis ėminys",
        color: "#16A34A",
        ph: null,
        markerInstance: null
    }));
}

function createSoilIcon(number, color) {
    return L.divIcon({
        className: 'custom-soil-sample-icon',
        html: `
            <div style="background: ${color}; border: 2.5px solid #FFFFFF; border-radius: 50%; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; color: #FFFFFF; font-weight: 900; font-size: 11px; box-shadow: 0 4px 10px rgba(0,0,0,0.7); cursor: grab;">
                ${number}
            </div>
        `,
        iconSize: [28, 28],
        iconAnchor: [14, 14]
    });
}

function buildFieldLimingZones() {
    if (!activeField || currentSamples.length === 0) return [];

    const rawCoords = activeField.polygonCoordinates || [];
    if (rawCoords.length < 3) return [];

    const latLngs = rawCoords.map(p => {
        if (Array.isArray(p)) return [parseFloat(p[0]), parseFloat(p[1])];
        return [parseFloat(p.lat), parseFloat(p.lng)];
    });

    return currentSamples.map(s => {
        const phVal = s.ph !== null ? s.ph : 7.0;
        let rate = 0;
        let zoneName = "NEUTRALI (0 t/ha)";

        if (phVal < 5.3) {
            rate = 4500;
            zoneName = "RŪGŠTI (+4.5 t/ha)";
        } else if (phVal < 6.0) {
            rate = 2000;
            zoneName = "VIDUTINĖ (+2.0 t/ha)";
        }

        const ring = latLngs.map(pt => [pt[1], pt[0]]);
        ring.push([latLngs[0][1], latLngs[0][0]]);

        return {
            id: s.id,
            ph: phVal,
            rateKgHa: rate,
            zone: zoneName,
            ring: ring
        };
    });
}

function renderLimingZonesOnMap() {
    if (!limingZonesLayer || !soilMap) return;
    limingZonesLayer.clearLayers();
}

function renderSamplesInputs() {
    const inputsGrid = document.getElementById('soil-samples-inputs-grid');
    if (!inputsGrid) return;

    inputsGrid.innerHTML = currentSamples.map(s => {
        const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${s.lat},${s.lng}&travelmode=walking`;

        return `
            <div class="bg-tractorBg p-3.5 rounded-xl border border-tractorBorder space-y-2 relative group">
                <div class="flex items-center justify-between">
                    <span class="font-bold flex items-center gap-1.5 text-sm" style="color: ${s.color};">
                        <span class="w-3 h-3 rounded-full" style="background: ${s.color};"></span>
                        <span>Ėminys #${s.id}</span>
                    </span>
                    
                    <button type="button" data-id="${s.id}" class="btn-delete-single-sample text-slate-400 hover:text-red-500 font-black px-1.5 py-0.5 rounded transition text-sm cursor-pointer" title="Ištrinti šį tašką">
                        ✕
                    </button>
                </div>

                <!-- TIKSLIOS KOORDINATĖS IR DIDELIS NAVIGACIJOS MYGTUKAS -->
                <div class="space-y-1.5 bg-tractorSurface p-2 rounded-lg border border-tractorBorder/70">
                    <div class="text-[11px] font-mono text-slate-400 font-bold text-center">
                        ${s.lat.toFixed(5)}, ${s.lng.toFixed(5)}
                    </div>
                    <a href="${googleMapsUrl}" target="_blank" 
                       style="background-color: #2563EB !important; color: #FFFFFF !important;" 
                       class="w-full h-9 rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 shadow transition cursor-pointer hover:opacity-90">
                        <span>🧭</span> <span>NAVIGUOTI Į TAŠKĄ</span>
                    </a>
                </div>

                <div class="flex items-center gap-2 pt-1">
                    <span class="text-xs text-slate-300 font-bold">pH:</span>
                    <input type="number" step="0.1" min="3.5" max="8.5" placeholder="Pvz. 5.1" 
                        value="${s.ph !== null ? s.ph : ''}" 
                        data-id="${s.id}"
                        class="ph-val-input w-full h-10 bg-tractorSurface border border-tractorBorder focus:border-amber-500 rounded-lg px-2.5 text-sm text-white font-mono font-bold outline-none">
                </div>
            </div>
        `;
    }).join('');

    inputsGrid.querySelectorAll('.btn-delete-single-sample').forEach(btn => {
        btn.onclick = () => {
            const id = parseInt(btn.getAttribute('data-id'));
            removeSamplePoint(id);
        };
    });

    inputsGrid.querySelectorAll('.ph-val-input').forEach(inp => {
        inp.oninput = (e) => {
            const id = parseInt(e.target.getAttribute('data-id'));
            const val = parseFloat(e.target.value);
            const sample = currentSamples.find(s => s.id === id);

            if (sample) {
                sample.ph = isNaN(val) ? null : val;
                if (sample.ph !== null) {
                    let updatedColor = "#16A34A";
                    if (sample.ph < 5.3) updatedColor = "#DC2626";
                    else if (sample.ph < 6.0) updatedColor = "#D97706";
                    
                    sample.color = updatedColor;
                    sample.markerInstance?.setIcon(createSoilIcon(sample.id, updatedColor));
                }
            }
            renderLimingZonesOnMap();
            recalculateLimingSummary();
        };
    });
}

function recalculateLimingSummary() {
    const card = document.getElementById('soil-summary-card');
    if (!card || !activeField) return;

    const entered = currentSamples.filter(s => s.ph !== null && s.ph > 0);
    const totalArea = parseFloat(activeField.areaHa) || 10;
    const areaPerSample = totalArea / Math.max(1, currentSamples.length);

    let contentHtml = '';

    if (entered.length === 0) {
        contentHtml = `
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-tractorBorder/70 pb-4">
                <div>
                    <span class="text-xs uppercase font-extrabold text-amber-400 tracking-wider block">Paruoštas taškų planas:</span>
                    <h3 class="font-oswald text-xl font-bold text-white uppercase tracking-wide">
                        Išdėstyta ėminių: <span class="font-mono text-green-400">${currentSamples.length} vnt.</span>
                    </h3>
                </div>
                <div class="text-left sm:text-right text-xs text-slate-400">
                    Kalkinimo normos ir kintamo barstymo failas sugeneruojami suvedus laboratorijos pH.
                </div>
            </div>

            <div class="text-center py-3 text-slate-400 text-xs bg-tractorSurface p-3.5 rounded-xl border border-tractorBorder">
                ℹ️ Įrašykite bent vieną pH reikšmę, kad sistema aktyvuotų kintamos normos zonavimą traktoriui.
            </div>
        `;
    } else {
        let sumPh = 0;
        let totalLimeTons = 0;
        let acidicHa = 0;
        let mediumHa = 0;
        let neutralHa = 0;

        entered.forEach(s => {
            sumPh += s.ph;
            let rateTons = 0;
            if (s.ph < 5.3) {
                rateTons = 4.5;
                acidicHa += areaPerSample;
            } else if (s.ph < 6.0) {
                rateTons = 2.0;
                mediumHa += areaPerSample;
            } else {
                rateTons = 0.0;
                neutralHa += areaPerSample;
            }
            totalLimeTons += (rateTons * areaPerSample);
        });

        const avgPh = (sumPh / entered.length).toFixed(2);
        const blindTotalTons = totalArea * 4.0;
        const savedTons = Math.max(0, blindTotalTons - totalLimeTons);
        const savedEuros = Math.round(savedTons * 35);

        contentHtml = `
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-tractorBorder/70 pb-4">
                <div>
                    <span class="text-xs uppercase font-extrabold text-amber-400 tracking-wider block">4 ŽINGSNIS: Zonavimas ir Kalkių Poreikis</span>
                    <h3 class="font-oswald text-2xl font-black text-white uppercase tracking-wide">
                        Vidutinis lauko pH: <span class="font-mono text-amber-300">${avgPh}</span>
                    </h3>
                </div>
                <div class="text-left sm:text-right">
                    <span class="text-[10px] text-slate-400 uppercase font-bold block">Viso kalkių poreikis laukui</span>
                    <strong class="font-mono text-3xl font-black text-green-400">${totalLimeTons.toFixed(1)} t</strong>
                </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div class="bg-tractorSurface p-3.5 rounded-xl border border-tractorBorder space-y-1">
                    <span class="text-slate-400 block font-semibold">🔴 Rūgšti zona (pH < 5.3 • 4.5 t/ha):</span>
                    <strong class="text-red-400 font-mono text-base font-bold">${acidicHa.toFixed(1)} ha</strong>
                </div>
                <div class="bg-tractorSurface p-3.5 rounded-xl border border-tractorBorder space-y-1">
                    <span class="text-slate-400 block font-semibold">🟡 Vidutinė zona (pH 5.3–5.9 • 2.0 t/ha):</span>
                    <strong class="text-amber-400 font-mono text-base font-bold">${mediumHa.toFixed(1)} ha</strong>
                </div>
                <div class="bg-tractorSurface p-3.5 rounded-xl border border-tractorBorder space-y-1">
                    <span class="text-slate-400 block font-semibold">🟢 Neutrali zona (pH ≥ 6.0 • 0 t/ha):</span>
                    <strong class="text-green-400 font-mono text-base font-bold">${neutralHa.toFixed(1)} ha</strong>
                </div>
            </div>

            <div class="bg-tractorBg border border-tractorBorder p-3 rounded-xl flex items-center justify-between text-xs">
                <span class="text-slate-300 font-semibold">💰 Finansinis taupymas:</span>
                <strong class="text-green-400 font-mono text-sm font-bold">
                    Sutaupyta neberiant ant neutralių plotų: ~${savedTons.toFixed(1)} t (~${savedEuros} €)
                </strong>
            </div>
        `;
    }

    card.innerHTML = `
        ${contentHtml}

        <div class="pt-4 border-t border-tractorBorder/70 flex flex-wrap gap-3">
            <button type="button" id="btn-save-soil-data" class="flex-1 min-w-[200px] h-12 bg-tractorPrimary hover:bg-tractorPrimaryHover text-white font-bold rounded-xl text-xs uppercase tracking-wider shadow transition cursor-pointer flex items-center justify-center gap-2">
                <span>💾</span> Išsaugoti planą
            </button>

            <!-- RYŠKUS, GERAI MATOMAS GPX MYGTUKAS -->
            <button type="button" id="btn-export-samples-gpx" 
                    style="background-color: #0284C7 !important; color: #FFFFFF !important;" 
                    class="h-12 px-5 font-extrabold rounded-xl text-xs uppercase tracking-wider transition cursor-pointer flex items-center justify-center gap-2 shadow hover:opacity-90">
                <span class="text-base">📍</span> <span>Atsisiųsti taškus (GPX)</span>
            </button>

            <button type="button" id="btn-export-liming-usb" class="flex-1 min-w-[240px] h-12 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs uppercase tracking-wider shadow-lg shadow-amber-500/20 transition cursor-pointer flex items-center justify-center gap-2">
                <span class="text-lg">🍋</span> Kalkinimo Shapefile į USB (.ZIP)
            </button>
        </div>
    `;

    document.getElementById('btn-save-soil-data')?.addEventListener('click', async () => {
        try {
            await persistPlansToDb();
            renderPlansDropdown();
            showDialog("Išsaugota! 🍋", "Dirvožemio tyrimo planas ir taškai sėkmingai išsaugoti.", "✅");
        } catch (err) {
            showDialog("Klaida", "Nepavyko išsaugoti: " + err.message, "🛑");
        }
    });

    document.getElementById('btn-export-samples-gpx')?.addEventListener('click', () => {
        downloadSamplesGpx();
    });

    document.getElementById('btn-export-liming-usb')?.addEventListener('click', async () => {
        await exportLimingShapefilePackage();
    });
}

function downloadSamplesGpx() {
    if (!activeField || currentSamples.length === 0) {
        showDialog("Nėra taškų", "Pirmiausia sugeneruokite arba pridėkite ėminių taškus.", "⚠️");
        return;
    }

    const cleanFieldName = activeField.name.replace(/[^a-zA-Z0-9_-]/g, '_');
    const todayStr = new Date().toISOString().split('T')[0];

    let gpxContent = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="JurgisAgro" xmlns="http://www.topografix.com/GPX/1/1">
  <metadata>
    <name>Eminiai_${cleanFieldName}</name>
    <time>${new Date().toISOString()}</time>
  </metadata>\n`;

    currentSamples.forEach(s => {
        gpxContent += `  <wpt lat="${s.lat}" lon="${s.lng}">
    <name>Eminys #${s.id}</name>
    <desc>Laukas: ${activeField.name}, pH: ${s.ph !== null ? s.ph : 'Nesuvesta'}</desc>
    <sym>Flag, Blue</sym>
  </wpt>\n`;
    });

    gpxContent += `</gpx>`;

    const blob = new Blob([gpxContent], { type: 'application/gpx+xml;charset=utf-8' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `Eminiai_${cleanFieldName}_${todayStr}.gpx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

async function exportLimingShapefilePackage() {
    if (!activeField) return;

    const exportBtn = document.getElementById('btn-export-liming-usb');
    if (exportBtn) {
        exportBtn.disabled = true;
        exportBtn.innerHTML = `<span>⏳</span> Ruošiamas barstytuvo paketas...`;
    }

    try {
        const zones = buildFieldLimingZones();
        if (zones.length === 0) {
            showDialog("Trūksta duomenų", "Pirmiausia pridėkite laukui ėminių taškus.", "⚠️");
            return;
        }

        await ensureZipLibraries();

        const cleanFieldName = activeField.name.replace(/[^a-zA-Z0-9_-]/g, '_');
        const todayStr = new Date().toISOString().split('T')[0];
        const baseName = `KALKINIMAS_${cleanFieldName}_${todayStr}`;

        const shapePackage = generateBinaryShapefilePackage(zones);

        const zip = new JSZip();
        const folder = zip.folder(baseName);

        folder.file(`${baseName}.shp`, shapePackage.shp);
        folder.file(`${baseName}.dbf`, shapePackage.dbf);
        folder.file(`${baseName}.shx`, shapePackage.shx);
        folder.file(`${baseName}.prj`, `GEOGCS["GCS_WGS_1984",DATUM["D_WGS_1984",SPHEROID["WGS_1984",6378137.0,298.257223563]],PRIMEM["Greenwich",0.0],UNIT["Degree",0.0174532925199433]]`);

        const geoJsonData = {
            type: "FeatureCollection",
            name: baseName,
            field_name: activeField.name,
            field_area_ha: activeField.areaHa,
            crop: activeField.crop || "Kviečiai",
            export_date: todayStr,
            features: zones.map(z => ({
                type: "Feature",
                properties: {
                    SAMPLE_ID: z.id,
                    PH: Number(z.ph.toFixed(1)),
                    RATE_KG_HA: z.rateKgHa,
                    RATE_T_HA: Number((z.rateKgHa / 1000).toFixed(2)),
                    ZONE: z.zone,
                    MATERIAL: "Dolomitmilciai / Kalkes",
                    UNIT: "KG/HA"
                },
                geometry: {
                    type: "Polygon",
                    coordinates: [z.ring]
                }
            }))
        };
        folder.file(`${baseName}.geojson`, JSON.stringify(geoJsonData, null, 2));

        const zipBlob = await zip.generateAsync({ type: "blob" });
        const downloadUrl = URL.createObjectURL(zipBlob);
        const link = document.createElement("a");
        link.href = downloadUrl;
        link.download = `${baseName}.zip`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        showDialog("Eksportuota! 🚜", `Failas „${baseName}.zip“ paruoštas. Nukopijuokite archyvo turinį tiesiai į traktoriaus USB atmintinę.`, "✅");

    } catch (err) {
        console.error("Kalkinimo eksporto klaida:", err);
        showDialog("Eksporto klaida", "Nepavyko sugeneruoti Shapefile paketo: " + err.message, "🛑");
    } finally {
        if (exportBtn) {
            exportBtn.disabled = false;
            exportBtn.innerHTML = `<span class="text-lg">🍋</span> Kalkinimo Shapefile į USB (.ZIP)`;
        }
    }
}

function generateBinaryShapefilePackage(zones) {
    let minX = 180, minY = 90, maxX = -180, maxY = -90;

    zones.forEach(z => {
        z.ring.forEach(pt => {
            const x = pt[0], y = pt[1];
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
        });
    });

    const numRecords = zones.length;
    let totalShpBytes = 100;
    const recordOffsetsWords = [];

    zones.forEach(z => {
        recordOffsetsWords.push(totalShpBytes / 2);
        const numPoints = z.ring.length;
        const recordContentBytes = 48 + numPoints * 16;
        totalShpBytes += 8 + recordContentBytes;
    });

    const shpBuffer = new ArrayBuffer(totalShpBytes);
    const shpView = new DataView(shpBuffer);

    shpView.setInt32(0, 9994, false);
    shpView.setInt32(24, totalShpBytes / 2, false);
    shpView.setInt32(28, 1000, true);
    shpView.setInt32(32, 5, true);
    shpView.setFloat64(36, minX, true);
    shpView.setFloat64(44, minY, true);
    shpView.setFloat64(52, maxX, true);
    shpView.setFloat64(60, maxY, true);

    let byteOffset = 100;
    zones.forEach((z, idx) => {
        const numPoints = z.ring.length;
        const recordContentBytes = 48 + numPoints * 16;
        const recordContentWords = recordContentBytes / 2;

        shpView.setInt32(byteOffset, idx + 1, false);
        shpView.setInt32(byteOffset + 4, recordContentWords, false);

        const contentOffset = byteOffset + 8;
        shpView.setInt32(contentOffset, 5, true);
        shpView.setFloat64(contentOffset + 4, minX, true);
        shpView.setFloat64(contentOffset + 12, minY, true);
        shpView.setFloat64(contentOffset + 20, maxX, true);
        shpView.setFloat64(contentOffset + 28, maxY, true);
        shpView.setInt32(contentOffset + 36, 1, true);
        shpView.setInt32(contentOffset + 40, numPoints, true);
        shpView.setInt32(contentOffset + 44, 0, true);

        let ptOffset = contentOffset + 48;
        z.ring.forEach(pt => {
            shpView.setFloat64(ptOffset, pt[0], true);
            shpView.setFloat64(ptOffset + 8, pt[1], true);
            ptOffset += 16;
        });

        byteOffset += 8 + recordContentBytes;
    });

    const totalShxBytes = 100 + numRecords * 8;
    const shxBuffer = new ArrayBuffer(totalShxBytes);
    const shxView = new DataView(shxBuffer);

    shxView.setInt32(0, 9994, false);
    shxView.setInt32(24, totalShxBytes / 2, false);
    shxView.setInt32(28, 1000, true);
    shxView.setInt32(32, 5, true);
    shxView.setFloat64(36, minX, true);
    shxView.setFloat64(44, minY, true);
    shxView.setFloat64(52, maxX, true);
    shxView.setFloat64(60, maxY, true);

    zones.forEach((z, idx) => {
        const numPoints = z.ring.length;
        const recordContentWords = (48 + numPoints * 16) / 2;
        shxView.setInt32(100 + idx * 8, recordOffsetsWords[idx], false);
        shxView.setInt32(104 + idx * 8, recordContentWords, false);
    });

    const headerBytes = 32 + (4 * 32) + 1;
    const recordBytes = 1 + 10 + 6 + 20 + 20;
    const totalDbfBytes = headerBytes + (numRecords * recordBytes) + 1;

    const dbfBuffer = new ArrayBuffer(totalDbfBytes);
    const dbfView = new DataView(dbfBuffer);
    const dbfBytes = new Uint8Array(dbfBuffer);

    dbfView.setUint8(0, 0x03);
    const now = new Date();
    dbfView.setUint8(1, now.getFullYear() - 1900);
    dbfView.setUint8(2, now.getMonth() + 1);
    dbfView.setUint8(3, now.getDate());
    dbfView.setUint32(4, numRecords, true);
    dbfView.setUint16(8, headerBytes, true);
    dbfView.setUint16(10, recordBytes, true);

    writeDbfField(dbfBytes, 32, "RATE", "N", 10, 0);
    writeDbfField(dbfBytes, 64, "PH", "N", 6, 1);
    writeDbfField(dbfBytes, 96, "ZONE", "C", 20, 0);
    writeDbfField(dbfBytes, 128, "MATERIAL", "C", 20, 0);

    dbfView.setUint8(160, 0x0D);

    let recOffset = headerBytes;
    zones.forEach(z => {
        dbfBytes[recOffset] = 0x20;
        writeDbfString(dbfBytes, recOffset + 1, String(z.rateKgHa).padStart(10, " "), 10);
        writeDbfString(dbfBytes, recOffset + 11, z.ph.toFixed(1).padStart(6, " "), 6);
        writeDbfString(dbfBytes, recOffset + 17, z.zone.padEnd(20, " "), 20);
        writeDbfString(dbfBytes, recOffset + 37, "Dolomitmilciai".padEnd(20, " "), 20);
        recOffset += recordBytes;
    });

    dbfBytes[totalDbfBytes - 1] = 0x1A;

    return {
        shp: new Uint8Array(shpBuffer),
        shx: new Uint8Array(shxBuffer),
        dbf: dbfBytes
    };
}

function writeDbfField(bytes, offset, name, type, len, decimals) {
    for (let i = 0; i < 11; i++) bytes[offset + i] = 0;
    for (let i = 0; i < name.length && i < 10; i++) bytes[offset + i] = name.charCodeAt(i);
    bytes[offset + 11] = type.charCodeAt(0);
    bytes[offset + 16] = len;
    bytes[offset + 17] = decimals;
}

function writeDbfString(bytes, offset, str, maxLen) {
    for (let i = 0; i < maxLen; i++) {
        bytes[offset + i] = i < str.length ? str.charCodeAt(i) : 0x20;
    }
}

async function ensureZipLibraries() {
    if (window.JSZip) return;
    return new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
        s.onload = () => resolve();
        s.onerror = () => reject(new Error("Nepavyko užkrauti ZIP bibliotekos"));
        document.head.appendChild(s);
    });
}

function isPointInPolygon(point, vs) {
    const x = point[0], y = point[1];
    let inside = false;
    for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
        const xi = vs[i][0] !== undefined ? vs[i][0] : vs[i].lat;
        const yi = vs[i][1] !== undefined ? vs[i][1] : vs[i].lng;
        const xj = vs[j][0] !== undefined ? vs[j][0] : vs[j].lat;
        const yj = vs[j][1] !== undefined ? vs[j][1] : vs[j].lng;

        const intersect = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
        if (intersect) inside = !inside;
    }
    return inside;
}