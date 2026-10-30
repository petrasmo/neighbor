// js/ukis/limingSoil.js
import { db } from '../core/firebase.js';
import { showBottomToast, showDialog } from '../core/ui.js';
import { createCustomSelect } from '../core/customSelect.js';
import { getLimingHtml } from './templates/limingTemplate.js';
import {
    generateLimingVraGrid,
    buildBinaryShapefileFromCells
} from './vraGridEngine.js';

const CDSE_INSTANCE_ID = "2ecdf3ed-4338-4577-a502-11dd5b2df254";
const CDSE_WMS_URL = `https://sh.dataspace.copernicus.eu/ogc/wms/${CDSE_INSTANCE_ID}`;

let userFieldsList = [];
let selectedField = null;
let fieldSelectInstance = null;
let editingPlanId = null;
let activeFilterFieldId = 'all';

let currentSamples = [];
let currentLimingCells = [];
let currentDensityHa = 3;
let isAddingSampleMode = false;

let previewMap = null;
let sampleMarkersLayer = null;
let previewPolygonLayer = null;
let esriBaseLayer = null;
let sentinelNdviLayer = null;
let sentinelTrueColorLayer = null;
let sentinelMoistureLayer = null;
let streetLayer = null;

export function initLimingSoilTab(currentUser, userData) {
    const container = document.getElementById('view-tab-fields');
    if (!container) return;

    editingPlanId = null;
    activeFilterFieldId = 'all';
    isAddingSampleMode = false;

    const todayStr = new Date().toISOString().split('T')[0];
    container.innerHTML = getLimingHtml(todayStr);

    setupLimingHubEvents(currentUser);
    loadUserFields(currentUser);
    loadSavedLimingProjects(currentUser);
}

function loadUserFields(currentUser) {
    if (!currentUser) return;

    db.collection("user_fields").where("userId", "==", currentUser.uid).get().then(snap => {
        userFieldsList = [];
        const items = [];
        const filterItems = [{ id: 'all', name: '🌾 Visi laukai (rodyti visus)', icon: '🌾' }];

        snap.forEach(doc => {
            const f = doc.data();
            userFieldsList.push(f);
            items.push({ id: f.id, name: f.name, icon: '🌾', subtext: `${f.areaHa} ha • ${f.crop}` });
            filterItems.push({ id: f.id, name: f.name, icon: '🌾', subtext: `${f.areaHa} ha` });
        });

        if (items.length > 0 && !selectedField) selectedField = userFieldsList[0];

        fieldSelectInstance = createCustomSelect({
            containerId: 'liming-field-select-box',
            placeholder: 'Pasirinkite lauką...',
            items: items,
            selectedId: selectedField ? selectedField.id : '',
            onSelect: (item) => {
                if (!item) return;
                selectedField = userFieldsList.find(f => f.id === item.id);
                renderFieldAndSamples(selectedField, null);
            }
        });

        createCustomSelect({
            containerId: 'liming-filter-field-box',
            placeholder: 'Filtruoti pagal lauką...',
            items: filterItems,
            selectedId: 'all',
            onSelect: (item) => {
                activeFilterFieldId = item ? item.id : 'all';
                loadSavedLimingProjects(currentUser);
            }
        });

        if (selectedField) {
            renderFieldAndSamples(selectedField, null);
        }
    });
}

function setupLimingHubEvents(currentUser) {
    const modal = document.getElementById('liming-creator-modal');
    const openBtn = document.getElementById('btn-open-new-liming-modal');
    const closeBtn = document.getElementById('btn-close-liming-creator');
    const dateInput = document.getElementById('liming-modal-date');
    const satDateInput = document.getElementById('liming-sat-date');
    const addPointBtn = document.getElementById('btn-lime-add-point');
    const saveProjBtn = document.getElementById('btn-save-liming-project');
    const downloadShpBtn = document.getElementById('btn-download-liming-shp');

    if (openBtn) {
        openBtn.onclick = () => {
            editingPlanId = null;
            document.getElementById('liming-modal-title').textContent = "Naujas Kalkinimo Projektas";
            document.getElementById('liming-save-btn-text').textContent = "Išsaugoti projektą";
            if (dateInput) dateInput.value = new Date().toISOString().split('T')[0];
            modal.classList.remove('hidden');
            setTimeout(() => {
                initPreviewMap();
                if (selectedField) renderFieldAndSamples(selectedField, null);
            }, 200);
        };
    }

    if (closeBtn) closeBtn.onclick = () => modal.classList.add('hidden');

    if (modal) {
        modal.onclick = (e) => {
            if (e.target === modal) modal.classList.add('hidden');
        };
    }

    if (satDateInput) {
        satDateInput.onchange = (e) => {
            const dateVal = e.target.value;
            if (!dateVal || !sentinelNdviLayer) return;

            let target = new Date(dateVal);
            if (target.getFullYear() >= 2026) {
                target = new Date("2024-07-25");
            }

            const end = new Date(target);
            const start = new Date(target);
            start.setDate(start.getDate() - 30);

            const timeRange = `${start.toISOString().split('T')[0]}/${end.toISOString().split('T')[0]}`;

            if (sentinelNdviLayer) sentinelNdviLayer.setParams({ time: timeRange });
            if (sentinelTrueColorLayer) sentinelTrueColorLayer.setParams({ time: timeRange });
            if (sentinelMoistureLayer) sentinelMoistureLayer.setParams({ time: timeRange });

            showBottomToast(`Palydovo kadras atnaujintas (${timeRange}) 🛰️`);
        };
    }

    document.querySelectorAll('.btn-lime-density').forEach(btn => {
        btn.onclick = () => {
            document.querySelectorAll('.btn-lime-density').forEach(b => {
                b.className = "btn-lime-density flex-1 h-full rounded-lg text-xs font-bold transition cursor-pointer text-slate-400 hover:text-white";
            });
            btn.className = "btn-lime-density flex-1 h-full rounded-lg text-xs font-bold transition cursor-pointer bg-tractorPrimary text-white shadow";
            currentDensityHa = parseFloat(btn.getAttribute('data-ha')) || 3;
            if (selectedField) renderFieldAndSamples(selectedField, null);
        };
    });

    if (addPointBtn) {
        addPointBtn.onclick = () => {
            isAddingSampleMode = !isAddingSampleMode;
            if (isAddingSampleMode) {
                addPointBtn.className = "w-full h-11 bg-zinc-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow transition cursor-pointer";
                addPointBtn.innerHTML = `<span>✕</span> <span>Spustelėkite žemėlapyje</span>`;
                if (previewMap) previewMap.getContainer().style.cursor = 'crosshair';
            } else {
                addPointBtn.className = "w-full h-11 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow transition cursor-pointer";
                addPointBtn.innerHTML = `<span>➕</span> <span>Pridėti tašką žemėlapyje</span>`;
                if (previewMap) previewMap.getContainer().style.cursor = '';
            }
        };
    }

    if (saveProjBtn) {
        saveProjBtn.onclick = async () => {
            if (!currentUser || !selectedField) {
                showBottomToast("Pasirinkite lauką!", "error");
                return;
            }

            const limeDate = dateInput?.value || new Date().toISOString().split('T')[0];
            const entered = currentSamples.filter(s => s.ph !== null && s.ph > 0 && !isNaN(s.ph));
            const summaryStats = calculateLimingStatsFromCells(currentLimingCells, selectedField, entered);

            try {
                const fieldRef = db.collection("user_fields").doc(selectedField.id);
                let existingPlans = selectedField.limingPlans || [];

                const cleanSamples = currentSamples.map(s => ({ id: s.id, lat: Number(s.lat), lng: Number(s.lng), ph: s.ph }));

                if (editingPlanId) {
                    existingPlans = existingPlans.map(p => {
                        if (p.id === editingPlanId) {
                            return {
                                ...p,
                                createdAtDate: limeDate,
                                totalTons: parseFloat(summaryStats.totalLimeTons.toFixed(1)),
                                avgPh: summaryStats.avgPh,
                                samples: cleanSamples
                            };
                        }
                        return p;
                    });
                    showBottomToast("Kalkinimo projekto pakeitimai išsaugoti! 🍋");
                } else {
                    const newPlan = {
                        id: 'lime_' + Date.now(),
                        fieldName: selectedField.name,
                        crop: selectedField.crop || "Kviečiai",
                        createdAtDate: limeDate,
                        totalTons: parseFloat(summaryStats.totalLimeTons.toFixed(1)),
                        avgPh: summaryStats.avgPh,
                        samples: cleanSamples
                    };
                    existingPlans.unshift(newPlan);
                    showBottomToast("Kalkinimo projektas sėkmingai išsaugotas! 🍋");
                }

                await fieldRef.update({ limingPlans: existingPlans });
                selectedField.limingPlans = existingPlans;

                modal.classList.add('hidden');
                editingPlanId = null;
                loadSavedLimingProjects(currentUser);
            } catch (err) {
                showBottomToast("Klaida saugant: " + err.message, "error");
            }
        };
    }

    if (downloadShpBtn) {
        downloadShpBtn.onclick = async () => {
            if (!selectedField) return;
            await exportLimingShapefile(selectedField, currentSamples);
        };
    }
}

function initPreviewMap() {
    const container = document.getElementById('liming-preview-map');
    if (!container) return;

    if (previewMap) {
        previewMap.remove();
        previewMap = null;
    }

    previewMap = L.map('liming-preview-map', { zoomControl: true }).setView([55.2885, 23.9745], 13);

    const defaultTime = "2024-05-01/2024-07-25";

    esriBaseLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', { maxNativeZoom: 17, maxZoom: 18 });
    sentinelNdviLayer = L.tileLayer.wms(CDSE_WMS_URL, { layers: 'VEGETATION_INDEX', format: 'image/png', transparent: true, maxcc: 35, time: defaultTime });
    sentinelTrueColorLayer = L.tileLayer.wms(CDSE_WMS_URL, { layers: 'TRUE_COLOR', format: 'image/png', transparent: true, maxcc: 35, time: defaultTime });
    sentinelMoistureLayer = L.tileLayer.wms(CDSE_WMS_URL, { layers: 'MOISTURE_INDEX', format: 'image/png', transparent: true, maxcc: 35, time: defaultTime });
    streetLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 18 });

    esriBaseLayer.addTo(previewMap);
    sentinelNdviLayer.addTo(previewMap);

    previewPolygonLayer = new L.FeatureGroup().addTo(previewMap);
    sampleMarkersLayer = new L.FeatureGroup().addTo(previewMap);

    addLimingLayerControl();

    previewMap.on('click', (e) => {
        if (!isAddingSampleMode || !selectedField) return;

        currentSamples.push({
            id: currentSamples.length + 1,
            lat: Number(e.latlng.lat),
            lng: Number(e.latlng.lng),
            ph: null
        });

        isAddingSampleMode = false;
        const addBtn = document.getElementById('btn-lime-add-point');
        if (addBtn) {
            addBtn.className = "w-full h-11 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow transition cursor-pointer";
            addBtn.innerHTML = `<span>➕</span> <span>Pridėti tašką žemėlapyje</span>`;
        }
        previewMap.getContainer().style.cursor = '';
        renderSampleMarkersAndInputs();
    });

    previewMap.on('popupopen', (e) => {
        const btn = e.popup._contentNode.querySelector('.btn-popup-delete-sample');
        if (btn) {
            btn.onclick = () => {
                const id = parseInt(btn.getAttribute('data-id'));
                removeSamplePoint(id);
                previewMap.closePopup();
            };
        }
    });
}

function addLimingLayerControl() {
    const controlClass = L.Control.extend({
        options: { position: 'topright' },
        onAdd: function () {
            const div = L.DomUtil.create('div', 'leaflet-bar leaflet-control');
            div.innerHTML = `
                <div style="background: rgba(15,18,15,0.95); padding: 5px; border-radius: 12px; border: 1.5px solid #2E7D32; display: flex; flex-wrap: wrap; gap: 4px; box-shadow: 0 6px 18px rgba(0,0,0,0.6);">
                    <button type="button" id="lime-layer-sat" style="background: transparent; color: #CBD5E1; border: none; padding: 5px 9px; border-radius: 8px; font-weight: 800; font-size: 11px; cursor: pointer;">🌍 Bazinė HD</button>
                    <button type="button" id="lime-layer-ndvi" style="background: #15803D; color: #fff; border: 1px solid #2E7D32; padding: 5px 9px; border-radius: 8px; font-weight: 800; font-size: 11px; cursor: pointer;">🌿 VRA + NDVI</button>
                    <button type="button" id="lime-layer-truecolor" style="background: transparent; color: #CBD5E1; border: none; padding: 5px 9px; border-radius: 8px; font-weight: 800; font-size: 11px; cursor: pointer;">🛰️ Sentinel-2</button>
                    <button type="button" id="lime-layer-moisture" style="background: transparent; color: #60A5FA; border: none; padding: 5px 9px; border-radius: 8px; font-weight: 800; font-size: 11px; cursor: pointer;">💧 Drėgmė</button>
                    <button type="button" id="lime-layer-street" style="background: transparent; color: #CBD5E1; border: none; padding: 5px 9px; border-radius: 8px; font-weight: 800; font-size: 11px; cursor: pointer;">🗺️ Keliai</button>
                </div>
            `;
            L.DomEvent.disableClickPropagation(div);
            setTimeout(() => {
                const bSat = document.getElementById('lime-layer-sat');
                const bNdvi = document.getElementById('lime-layer-ndvi');
                const bTc = document.getElementById('lime-layer-truecolor');
                const bMoist = document.getElementById('lime-layer-moisture');
                const bStr = document.getElementById('lime-layer-street');

                const reset = () => { [bSat, bNdvi, bTc, bMoist, bStr].forEach(b => { if(b) { b.style.background='transparent'; b.style.color='#CBD5E1'; } }); };

                if (bSat) bSat.onclick = () => { [sentinelNdviLayer, sentinelTrueColorLayer, sentinelMoistureLayer, streetLayer].forEach(l => previewMap.removeLayer(l)); esriBaseLayer.addTo(previewMap); reset(); bSat.style.background='#2E7D32'; bSat.style.color='#fff'; sampleMarkersLayer.bringToFront(); };
                if (bNdvi) bNdvi.onclick = () => { esriBaseLayer.addTo(previewMap); sentinelNdviLayer.addTo(previewMap); reset(); bNdvi.style.background='#15803D'; bNdvi.style.color='#fff'; sampleMarkersLayer.bringToFront(); };
                if (bTc) bTc.onclick = () => { esriBaseLayer.addTo(previewMap); previewMap.removeLayer(sentinelNdviLayer); sentinelTrueColorLayer.addTo(previewMap); reset(); bTc.style.background='#2E7D32'; bTc.style.color='#fff'; sampleMarkersLayer.bringToFront(); };
                if (bMoist) bMoist.onclick = () => { esriBaseLayer.addTo(previewMap); sentinelMoistureLayer.addTo(previewMap); reset(); bMoist.style.background='#1E40AF'; bMoist.style.color='#fff'; sampleMarkersLayer.bringToFront(); };
                if (bStr) bStr.onclick = () => { [esriBaseLayer, sentinelNdviLayer, sentinelTrueColorLayer, sentinelMoistureLayer].forEach(l => previewMap.removeLayer(l)); streetLayer.addTo(previewMap); reset(); bStr.style.background='#334155'; bStr.style.color='#fff'; sampleMarkersLayer.bringToFront(); };
            }, 100);
            return div;
        }
    });
    previewMap.addControl(new controlClass());
}

function renderFieldAndSamples(field, samples = null) {
    if (!field || !previewMap) return;

    const coords = field.polygonCoordinates || [];
    if (coords.length < 3) return;

    const latLngs = coords.map(p => [parseFloat(p.lat), parseFloat(p.lng)]);
    const poly = L.polygon(latLngs);
    previewMap.fitBounds(poly.getBounds(), { padding: [25, 25] });

    if (samples && Array.isArray(samples) && samples.length > 0) {
        currentSamples = samples;
    } else {
        const totalArea = parseFloat(field.areaHa || 10);
        const targetCount = Math.max(1, Math.round(totalArea / currentDensityHa));
        currentSamples = generateEqualCoverageGrid(latLngs, poly.getBounds(), targetCount);
    }

    renderSampleMarkersAndInputs();
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
        ph: null
    }));
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

function renderSampleMarkersAndInputs() {
    if (!previewMap || !sampleMarkersLayer) return;
    sampleMarkersLayer.clearLayers();

    const box = document.getElementById('liming-samples-inputs-box');
    let inputsHtml = '';

    currentSamples.forEach(s => {
        let color = '#16A34A';
        if (s.ph !== null && s.ph > 0 && !isNaN(s.ph)) {
            if (s.ph < 5.3) color = '#DC2626';
            else if (s.ph < 6.0) color = '#D97706';
        }

        const icon = L.divIcon({
            className: 'custom-soil-sample-icon',
            html: `<div style="background:${color};border:2px solid #fff;border-radius:50%;width:24px;height:24px;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:bold;font-size:10px;box-shadow:0 2px 6px rgba(0,0,0,0.5);">${s.id}</div>`,
            iconSize: [24, 24],
            iconAnchor: [12, 12]
        });

        const marker = L.marker([s.lat, s.lng], { draggable: true, icon }).addTo(sampleMarkersLayer);
        marker.on('dragend', (e) => {
            const pos = e.target.getLatLng();
            s.lat = Number(pos.lat);
            s.lng = Number(pos.lng);
            recalculateLimingSummaryAndZones();
        });

        marker.bindPopup(`
            <div class="text-xs space-y-2 p-1 font-sans">
                <strong class="block text-slate-900 font-bold">Ėminys #${s.id}</strong>
                <a href="https://www.google.com/maps/dir/?api=1&destination=${s.lat},${s.lng}&travelmode=walking" target="_blank" class="block w-full py-1 bg-blue-600 text-white text-center rounded font-bold text-[11px]">
                    🧭 Eiti į tašką (Maps)
                </a>
                <button type="button" class="btn-popup-delete-sample w-full py-1 bg-red-600 hover:bg-red-700 text-white rounded font-bold cursor-pointer transition text-[11px]" data-id="${s.id}">
                    🗑️ Panaikinti šį tašką
                </button>
            </div>
        `);

        const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${s.lat},${s.lng}&travelmode=walking`;

        inputsHtml += `
            <div class="flex items-center justify-between bg-tractorSurface p-2 rounded-xl border border-tractorBorder text-xs transition hover:border-slate-400">
                <div class="flex items-center gap-2">
                    <span class="w-3 h-3 rounded-full shrink-0 shadow-sm" style="background:${color};"></span>
                    <span class="font-bold text-slate-800 dark:text-slate-100">#${s.id}</span>
                </div>

                <div class="flex items-center gap-1.5">
                    <span class="text-slate-500 text-[11px] font-semibold">pH:</span>
                    <input type="number" step="0.1" min="3.5" max="8.5" value="${s.ph !== null && !isNaN(s.ph) ? s.ph : ''}" placeholder="--" data-id="${s.id}"
                        class="lime-ph-inp w-14 h-8 bg-tractorBg border border-tractorBorder focus:border-amber-500 rounded-lg text-center font-mono font-bold text-slate-800 dark:text-white text-xs outline-none">
                    
                    <a href="${googleMapsUrl}" target="_blank" class="h-8 px-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg flex items-center justify-center gap-1 shadow transition cursor-pointer" title="Naviguoti į šį tašką">
                        <span>🧭</span> <span class="text-[10px] font-black uppercase">GPS</span>
                    </a>

                    <button type="button" class="btn-delete-single-sample w-8 h-8 rounded-lg bg-red-100 dark:bg-red-950/40 hover:bg-red-200 dark:hover:bg-red-900 border border-red-300 dark:border-red-800/60 text-red-600 dark:text-red-400 font-black text-xs flex items-center justify-center cursor-pointer transition" data-id="${s.id}" title="Ištrinti šį tašką">
                        ✕
                    </button>
                </div>
            </div>
        `;
    });

    if (box) {
        box.innerHTML = inputsHtml;

        box.querySelectorAll('.lime-ph-inp').forEach(inp => {
            inp.oninput = (e) => {
                const id = parseInt(e.target.getAttribute('data-id'));
                const val = parseFloat(e.target.value);
                const sample = currentSamples.find(s => s.id === id);
                if (sample) {
                    sample.ph = isNaN(val) ? null : val;
                }
                recalculateLimingSummaryAndZones();
            };
        });

        box.querySelectorAll('.btn-delete-single-sample').forEach(btn => {
            btn.onclick = () => {
                const id = parseInt(btn.getAttribute('data-id'));
                removeSamplePoint(id);
            };
        });
    }

    recalculateLimingSummaryAndZones();
}

function removeSamplePoint(sampleId) {
    showDialog(
        "Panaikinti ėminio tašką?",
        `Ar tikrai norite pašalinti ėminio tašką #${sampleId}?`,
        "🗑️",
        () => {
            currentSamples = currentSamples.filter(s => s.id !== sampleId);
            reindexSamples();
            renderSampleMarkersAndInputs();
            showBottomToast("Ėminio taškas pašalintas.");
        },
        true
    );
}

function reindexSamples() {
    currentSamples.forEach((s, idx) => {
        s.id = idx + 1;
    });
}

function calculateLimingStatsFromCells(cells, field, enteredSamples) {
    let sumPh = 0;
    enteredSamples.forEach(s => { sumPh += s.ph; });
    const avgPh = enteredSamples.length > 0 ? (sumPh / enteredSamples.length).toFixed(2) : "--";

    if (!cells || cells.length === 0 || enteredSamples.length === 0) {
        return { avgPh, totalLimeTons: 0 };
    }

    const sumCellsArea = cells.reduce((acc, c) => acc + c.areaHa, 0) || 1;
    const officialArea = parseFloat(field?.areaHa || sumCellsArea);
    const scaleFactor = officialArea / sumCellsArea;

    let totalTons = 0;
    cells.forEach(c => {
        totalTons += (c.areaHa * scaleFactor) * (c.rate / 1000);
    });

    return { avgPh, totalLimeTons: totalTons };
}

/**
 * 🌟 PERSKAIČIUOJA IR NUPIEŠIA TIKRAS KALKINIMO VRA GARDELES ŽEMĖLAPYJE PAGAL PH TAŠKUS!
 */
function recalculateLimingSummaryAndZones() {
    const entered = currentSamples.filter(s => s.ph !== null && s.ph > 0 && !isNaN(s.ph));
    const totalArea = parseFloat(selectedField?.areaHa || 10);

    if (selectedField && selectedField.polygonCoordinates) {
        previewPolygonLayer?.clearLayers();

        if (entered.length > 0) {
            currentLimingCells = generateLimingVraGrid(selectedField.polygonCoordinates, currentSamples);

            // Nupiešiame spalvotas pH zonas žemėlapyje
            currentLimingCells.forEach(cell => {
                const latLngs = cell.ring.map(pt => [pt[1], pt[0]]);
                const cellPoly = L.polygon(latLngs, {
                    color: '#FFFFFF',
                    weight: 1,
                    opacity: 0.65,
                    fillColor: cell.color,
                    fillOpacity: 0.55
                });

                cellPoly.bindTooltip(
                    `<div class="text-xs font-sans"><b>${cell.zoneName}</b><br>Interpoliuotas pH: <b>${cell.ph}</b><br>Norma: <b>${cell.rate} kg/ha</b></div>`,
                    { sticky: true }
                );
                previewPolygonLayer.addLayer(cellPoly);
            });
        } else {
            currentLimingCells = [];
        }

        // Išorinis lauko kontūras
        const outerLatLngs = selectedField.polygonCoordinates.map(p => [parseFloat(p.lat), parseFloat(p.lng)]);
        const outerPoly = L.polygon(outerLatLngs, { color: '#F59E0B', weight: 3, fill: false, interactive: false });
        previewPolygonLayer.addLayer(outerPoly);
        sampleMarkersLayer?.bringToFront();
    }

    const stats = calculateLimingStatsFromCells(currentLimingCells, selectedField, entered);
    const blindTons = totalArea * 4.0;
    const savedTons = entered.length > 0 ? Math.max(0, blindTons - stats.totalLimeTons) : 0;
    const savedEuros = Math.round(savedTons * 35);

    const avgEl = document.getElementById('liming-avg-ph-badge');
    const tonsEl = document.getElementById('liming-total-tons');
    const savedEl = document.getElementById('liming-saved-info');

    if (avgEl) avgEl.textContent = `Vid. pH: ${stats.avgPh}`;
    if (tonsEl) tonsEl.textContent = `${stats.totalLimeTons.toFixed(1)} t`;
    if (savedEl) savedEl.textContent = `~${savedTons.toFixed(1)} t (~${savedEuros} €)`;
}

function loadSavedLimingProjects(currentUser) {
    if (!currentUser) return;

    db.collection("user_fields")
        .where("userId", "==", currentUser.uid)
        .onSnapshot(snapshot => {
            const listEl = document.getElementById('liming-saved-projects-list');
            const countEl = document.getElementById('liming-projects-count');
            if (!listEl) return;

            let allPlans = [];

            snapshot.forEach(doc => {
                const f = doc.data();
                if (f.limingPlans && Array.isArray(f.limingPlans)) {
                    f.limingPlans.forEach(p => {
                        allPlans.push({ ...p, fieldDocId: f.id });
                    });
                }
            });

            if (activeFilterFieldId !== 'all') {
                allPlans = allPlans.filter(p => p.fieldDocId === activeFilterFieldId);
            }

            if (countEl) countEl.textContent = allPlans.length;

            if (allPlans.length > 0) {
                listEl.innerHTML = allPlans.map(p => `
                    <div class="bg-tractorBg border border-tractorBorder hover:border-tractorPrimary rounded-xl p-3.5 md:p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 transition shadow-sm">
                        <div class="space-y-1">
                            <div class="flex flex-wrap items-center gap-2">
                                <span class="text-base">🍋</span>
                                <h4 class="font-bold text-base md:text-lg" style="color: var(--text-main);">${p.fieldName}</h4>
                                <span class="text-xs bg-tractorSurface px-2.5 py-0.5 rounded-md font-bold text-slate-700 dark:text-slate-200 border border-tractorBorder">
                                    ${p.crop}
                                </span>
                            </div>
                            <div class="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs md:text-sm">
                                <span class="text-slate-400">Vidutinis pH:</span>
                                <strong class="text-amber-600 dark:text-amber-400 font-mono font-bold">${p.avgPh}</strong>
                                <span class="text-slate-400">•</span>
                                <span class="text-slate-400">Poreikis:</span>
                                <strong class="font-mono font-bold text-green-600 dark:text-green-400">${p.totalTons} t</strong>
                                <span class="text-slate-400">•</span>
                                <span class="text-slate-400">Data:</span>
                                <strong class="font-mono font-bold text-slate-700 dark:text-slate-300">📅 ${p.createdAtDate || '2026-09-11'}</strong>
                            </div>
                        </div>

                        <div class="flex items-center gap-2 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-tractorBorder/60">
                            <button type="button" class="btn-edit-saved-lime h-9 px-3 bg-tractorSurface hover:bg-zinc-800 text-slate-700 dark:text-slate-200 border border-tractorBorder rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1" data-field-id="${p.fieldDocId}" data-plan-id="${p.id}">
                                <span>✏️</span> <span>Koreguoti</span>
                            </button>
                            <button type="button" class="btn-download-saved-lime-shp h-9 px-3.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-lg text-xs flex items-center gap-1.5 shadow transition cursor-pointer" data-field-id="${p.fieldDocId}" data-plan-id="${p.id}">
                                <span>🚜</span> <span>Atsisiųsti į USB</span>
                            </button>
                            <button type="button" class="btn-delete-saved-lime h-9 px-2.5 bg-red-950/20 hover:bg-red-950/40 border border-red-800/40 text-red-600 dark:text-red-300 rounded-lg text-xs font-bold transition cursor-pointer flex items-center justify-center" data-field-id="${p.fieldDocId}" data-plan-id="${p.id}" title="Ištrinti">
                                <span>🗑️</span>
                            </button>
                        </div>
                    </div>
                `).join('');

                listEl.querySelectorAll('.btn-edit-saved-lime').forEach(btn => {
                    btn.onclick = () => {
                        const planId = btn.getAttribute('data-plan-id');
                        const fieldId = btn.getAttribute('data-field-id');

                        const field = userFieldsList.find(f => f.id === fieldId);
                        const plan = (field?.limingPlans || []).find(p => p.id === planId);
                        if (!field || !plan) return;

                        editingPlanId = plan.id;
                        selectedField = field;
                        currentSamples = plan.samples || [];

                        if (fieldSelectInstance) fieldSelectInstance.setValue(field.id);
                        if (document.getElementById('liming-modal-date')) {
                            document.getElementById('liming-modal-date').value = plan.createdAtDate || new Date().toISOString().split('T')[0];
                        }

                        document.getElementById('liming-modal-title').textContent = `✏️ Koreguoti: ${field.name}`;
                        document.getElementById('liming-save-btn-text').textContent = "Išsaugoti pakeitimus";

                        document.getElementById('liming-creator-modal').classList.remove('hidden');
                        setTimeout(() => {
                            initPreviewMap();
                            renderFieldAndSamples(field, plan.samples || []);
                        }, 200);
                    };
                });

                listEl.querySelectorAll('.btn-download-saved-lime-shp').forEach(btn => {
                    btn.onclick = async () => {
                        const planId = btn.getAttribute('data-plan-id');
                        const fieldId = btn.getAttribute('data-field-id');
                        const field = userFieldsList.find(f => f.id === fieldId);
                        const plan = (field?.limingPlans || []).find(p => p.id === planId);
                        if (field && plan) await exportLimingShapefile(field, plan.samples || []);
                    };
                });

                listEl.querySelectorAll('.btn-delete-saved-lime').forEach(btn => {
                    btn.onclick = () => {
                        const planId = btn.getAttribute('data-plan-id');
                        const fieldId = btn.getAttribute('data-field-id');

                        const field = userFieldsList.find(f => f.id === fieldId);
                        const plan = (field?.limingPlans || []).find(p => p.id === planId);
                        if (!field || !plan) return;

                        showDialog(
                            "Trinti kalkinimo projektą?",
                            `Ar tikrai norite pašalinti lauko „${field.name}“ kalkinimo planą (${plan.totalTons} t, vid. pH ${plan.avgPh})?`,
                            "🗑️",
                            async () => {
                                const updated = field.limingPlans.filter(p => p.id !== planId);
                                await db.collection("user_fields").doc(fieldId).update({ limingPlans: updated });
                                field.limingPlans = updated;
                                showBottomToast("Kalkinimo projektas sėkmingai pašalintas! 🗑️");
                            },
                            true
                        );
                    };
                });
            } else {
                listEl.innerHTML = `<div class="text-center py-8 text-slate-500 text-xs">Nėra kalkinimo projektų pagal pasirinktą filtrą.</div>`;
            }
        });
}

/**
 * 🚜 TIKRASIS BINARINIS KALKINIMO SHAPEFILE EKSPORTAS (.SHP, .SHX, .DBF, .PRJ) SU PH ZONŲ TINKLELIU!
 */
async function exportLimingShapefile(field, samples) {
    if (!field || !field.polygonCoordinates || field.polygonCoordinates.length < 3) {
        showBottomToast("Laukas neturi tinkamų koordinačių!", "error");
        return;
    }

    const entered = (samples || []).filter(s => s.ph !== null && s.ph > 0 && !isNaN(s.ph));
    if (entered.length === 0) {
        showBottomToast("⚠️ Negalima eksportuoti: nesuvestas nė vienas laboratorijos pH rezultatas!", "error");
        return;
    }

    showBottomToast("Generuojamas VRA kalkinimo Shapefile paketas į USB (.ZIP)...");

    try {
        await ensureZipLibraries();
        const cleanFieldName = field.name.replace(/[^a-zA-Z0-9_-]/g, '_');
        const dateStr = new Date().toISOString().split('T')[0];
        const baseName = `KALKINIMAS_${cleanFieldName}_${dateStr}`;

        const cells = generateLimingVraGrid(field.polygonCoordinates, samples);
        const shpPkg = buildBinaryShapefileFromCells(cells, "Kalkes", dateStr);

        const zip = new JSZip();

        // 1. Rx/ aplankas John Deere terminalams
        const rxFolder = zip.folder("Rx");
        rxFolder.file(`${baseName}.shp`, shpPkg.shp);
        rxFolder.file(`${baseName}.shx`, shpPkg.shx);
        rxFolder.file(`${baseName}.dbf`, shpPkg.dbf);
        rxFolder.file(`${baseName}.prj`, shpPkg.prj);

        // 2. Šakninis katalogas kitiems barstytuvų kompiuteriams
        zip.file(`${baseName}.shp`, shpPkg.shp);
        zip.file(`${baseName}.shx`, shpPkg.shx);
        zip.file(`${baseName}.dbf`, shpPkg.dbf);
        zip.file(`${baseName}.prj`, shpPkg.prj);

        const geoJsonData = {
            type: "FeatureCollection",
            name: baseName,
            features: shpPkg.features.map(f => ({
                type: "Feature",
                properties: { RATE: f.rate, ZONE: f.zone, PRODUCT: "Kalkes", UNIT: "KG/HA" },
                geometry: { type: "Polygon", coordinates: [f.coords] }
            }))
        };
        zip.file(`${baseName}.geojson`, JSON.stringify(geoJsonData, null, 2));

        const zipBlob = await zip.generateAsync({ type: "blob" });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(zipBlob);
        a.download = `${baseName}.zip`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        showBottomToast(`Kalkinimo Shapefile (${cells.length} zonų) sėkmingai atsiųstas į USB! 🚜`);
    } catch (err) {
        showBottomToast("Klaida generuojant: " + err.message, "error");
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