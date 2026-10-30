// js/ukis/vraFertilizer.js
import { db } from '../core/firebase.js';
import { showBottomToast, showDialog } from '../core/ui.js';
import { createCustomSelect } from '../core/customSelect.js';
import { getVraFertilizerHtml } from './templates/vraTemplate.js';
import {
    generateFertilizerVraGrid,
    applyFertilizerRatesToCells,
    buildBinaryShapefileFromCells
} from './vraGridEngine.js';

const CDSE_INSTANCE_ID = "2ecdf3ed-4338-4577-a502-11dd5b2df254";
const CDSE_WMS_URL = `https://sh.dataspace.copernicus.eu/ogc/wms/${CDSE_INSTANCE_ID}`;

let userFieldsList = [];
let selectedField = null;
let fieldSelectInstance = null;
let editingPlanId = null;
let activeFilterFieldId = 'all';

// Saugome sugeneruotas lauko VRA gardeles
let currentVraCells = [];

let previewMap = null;
let previewPolygonLayer = null;
let esriBaseLayer = null;
let sentinelNdviLayer = null;
let sentinelTrueColorLayer = null;
let sentinelMoistureLayer = null;
let streetLayer = null;

export function initVraFertilizerTab(currentUser, userData) {
    const container = document.getElementById('view-tab-fields');
    if (!container) return;

    editingPlanId = null;
    activeFilterFieldId = 'all';

    const todayStr = new Date().toISOString().split('T')[0];
    container.innerHTML = getVraFertilizerHtml(todayStr);

    setupVraHubEvents(currentUser);
    loadUserFields(currentUser);
    loadSavedVraProjects(currentUser);
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
            items.push({
                id: f.id,
                name: f.name,
                icon: '🌾',
                subtext: `${f.areaHa} ha • ${f.crop}`
            });
            filterItems.push({
                id: f.id,
                name: f.name,
                icon: '🌾',
                subtext: `${f.areaHa} ha`
            });
        });

        if (items.length > 0 && !selectedField) {
            selectedField = userFieldsList[0];
        }

        fieldSelectInstance = createCustomSelect({
            containerId: 'vra-field-select-box',
            placeholder: 'Pasirinkite lauką...',
            items: items,
            selectedId: selectedField ? selectedField.id : '',
            onSelect: async (item) => {
                if (!item) return;
                selectedField = userFieldsList.find(f => f.id === item.id);
                await rebuildGridForSelectedField();
            }
        });

        createCustomSelect({
            containerId: 'vra-filter-field-box',
            placeholder: 'Filtruoti pagal lauką...',
            items: filterItems,
            selectedId: 'all',
            onSelect: (item) => {
                activeFilterFieldId = item ? item.id : 'all';
                loadSavedVraProjects(currentUser);
            }
        });
    });
}

function setupVraHubEvents(currentUser) {
    const modal = document.getElementById('vra-creator-modal');
    const openBtn = document.getElementById('btn-open-new-vra-modal');
    const closeBtn = document.getElementById('btn-close-vra-creator');
    const baseRateInput = document.getElementById('vra-modal-base-rate');
    const fertSelect = document.getElementById('vra-fert-select');
    const fertDateInput = document.getElementById('vra-modal-fert-date');
    const satDateInput = document.getElementById('vra-modal-sat-date');
    const downloadBtn = document.getElementById('btn-download-vra-shp');
    const saveProjBtn = document.getElementById('btn-save-vra-project');
    const modalTitle = document.getElementById('vra-modal-title');
    const saveBtnText = document.getElementById('vra-save-btn-text');

    if (openBtn) {
        openBtn.onclick = () => {
            editingPlanId = null;
            if (modalTitle) modalTitle.textContent = "Naujas VRA Tręšimo Žemėlapis";
            if (saveBtnText) saveBtnText.textContent = "Išsaugoti tręšimo projektą";
            if (fertDateInput) fertDateInput.value = new Date().toISOString().split('T')[0];
            modal.classList.remove('hidden');
            setTimeout(async () => {
                initPreviewMap();
                await rebuildGridForSelectedField();
            }, 200);
        };
    }

    if (closeBtn) closeBtn.onclick = () => modal.classList.add('hidden');

    if (modal) {
        modal.onclick = (e) => {
            if (e.target === modal) modal.classList.add('hidden');
        };
    }

    // Keičiant bazinę normą perskaičiuojame esamų gardelių kg/ha
    baseRateInput?.addEventListener('input', () => {
        const baseRate = parseFloat(baseRateInput.value) || 200;
        currentVraCells = applyFertilizerRatesToCells(currentVraCells, baseRate);
        renderVraCellsOnMapAndStats();
    });

    fertSelect?.addEventListener('change', () => {
        renderVraCellsOnMapAndStats();
    });

    satDateInput?.addEventListener('change', async (e) => {
        const d = e.target.value;
        const start = new Date(d);
        start.setDate(start.getDate() - 30);
        const timeRange = `${start.toISOString().split('T')[0]}/${d}`;
        if (sentinelNdviLayer) sentinelNdviLayer.setParams({ time: timeRange });
        if (sentinelTrueColorLayer) sentinelTrueColorLayer.setParams({ time: timeRange });
        if (sentinelMoistureLayer) sentinelMoistureLayer.setParams({ time: timeRange });
        await rebuildGridForSelectedField();
    });

    if (saveProjBtn) {
        saveProjBtn.onclick = async () => {
            if (!currentUser || !selectedField) {
                showBottomToast("Pirmiausia pasirinkite lauką!", "error");
                return;
            }

            const baseRate = parseFloat(baseRateInput.value) || 200;
            const totalTons = calculateTotalTonsFromCells(currentVraCells, selectedField, baseRate);
            const fertDate = fertDateInput?.value || new Date().toISOString().split('T')[0];

            // Išsaugome ir sugeneruotų gardelių zonas, kad atidarius vėliau išliktų net ir rankiniai pakeitimai
            const savedZones = currentVraCells.map(c => ({ id: c.id, zoneIndex: c.zoneIndex }));

            try {
                const fieldRef = db.collection("user_fields").doc(selectedField.id);
                let existingPlans = selectedField.vraPlans || [];

                if (editingPlanId) {
                    existingPlans = existingPlans.map(p => {
                        if (p.id === editingPlanId) {
                            return {
                                ...p,
                                fertilizerType: fertSelect.value,
                                baseRate: baseRate,
                                totalTons: parseFloat(totalTons),
                                createdAtDate: fertDate,
                                savedZones: savedZones
                            };
                        }
                        return p;
                    });
                    showBottomToast("Projekto pakeitimai sėkmingai išsaugoti! 🚜");
                } else {
                    const newPlan = {
                        id: 'vra_' + Date.now(),
                        fieldName: selectedField.name,
                        crop: selectedField.crop || "Kviečiai",
                        fertilizerType: fertSelect.value,
                        baseRate: baseRate,
                        totalTons: parseFloat(totalTons),
                        savedPercent: 12.5,
                        createdAtDate: fertDate,
                        savedZones: savedZones
                    };
                    existingPlans.unshift(newPlan);
                    showBottomToast("Tręšimo projektas sėkmingai išsaugotas archyve! 🚜");
                }

                await fieldRef.update({ vraPlans: existingPlans });
                selectedField.vraPlans = existingPlans;

                modal.classList.add('hidden');
                editingPlanId = null;
                loadSavedVraProjects(currentUser);
            } catch (err) {
                console.error("VRA save error:", err);
                showBottomToast("Klaida saugant: " + err.message, "error");
            }
        };
    }

    if (downloadBtn) {
        downloadBtn.onclick = async () => {
            if (!selectedField) {
                showBottomToast("Pasirinkite lauką!", "error");
                return;
            }
            const baseRate = parseFloat(baseRateInput.value) || 200;
            const fertName = fertSelect.value;
            const satDate = satDateInput.value || new Date().toISOString().split('T')[0];
            await exportVraShapefile(selectedField, baseRate, fertName, satDate, currentVraCells);
        };
    }
}

function initPreviewMap() {
    const container = document.getElementById('vra-preview-map');
    if (!container) return;

    if (previewMap) {
        previewMap.remove();
        previewMap = null;
    }

    previewMap = L.map('vra-preview-map', { zoomControl: true }).setView([55.2885, 23.9745], 13);

    esriBaseLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', { maxNativeZoom: 17, maxZoom: 18 });
    sentinelNdviLayer = L.tileLayer.wms(CDSE_WMS_URL, { layers: 'VEGETATION_INDEX', format: 'image/png', transparent: true, maxcc: 25, time: '2024-05-01/2024-06-15' });
    sentinelTrueColorLayer = L.tileLayer.wms(CDSE_WMS_URL, { layers: 'TRUE_COLOR', format: 'image/png', transparent: true, maxcc: 25, time: '2024-05-01/2024-06-15' });
    sentinelMoistureLayer = L.tileLayer.wms(CDSE_WMS_URL, { layers: 'MOISTURE_INDEX', format: 'image/png', transparent: true, maxcc: 25, time: '2024-05-01/2024-06-15' });
    streetLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 18 });

    esriBaseLayer.addTo(previewMap);
    sentinelNdviLayer.addTo(previewMap);
    previewPolygonLayer = new L.FeatureGroup().addTo(previewMap);

    addVraLayerControl();
}

function addVraLayerControl() {
    const controlClass = L.Control.extend({
        options: { position: 'topright' },
        onAdd: function () {
            const div = L.DomUtil.create('div', 'leaflet-bar leaflet-control');
            div.innerHTML = `
                <div style="background: rgba(15,18,15,0.95); padding: 5px; border-radius: 12px; border: 1.5px solid #2E7D32; display: flex; flex-wrap: wrap; gap: 4px; box-shadow: 0 6px 18px rgba(0,0,0,0.6);">
                    <button type="button" id="vra-layer-sat" style="background: transparent; color: #CBD5E1; border: none; padding: 5px 9px; border-radius: 8px; font-weight: 800; font-size: 11px; cursor: pointer;">🌍 Bazinė HD</button>
                    <button type="button" id="vra-layer-ndvi" style="background: #15803D; color: #fff; border: 1px solid #2E7D32; padding: 5px 9px; border-radius: 8px; font-weight: 800; font-size: 11px; cursor: pointer;">🌿 VRA + NDVI</button>
                    <button type="button" id="vra-layer-truecolor" style="background: transparent; color: #CBD5E1; border: none; padding: 5px 9px; border-radius: 8px; font-weight: 800; font-size: 11px; cursor: pointer;">🛰️ Sentinel-2</button>
                    <button type="button" id="vra-layer-moisture" style="background: transparent; color: #60A5FA; border: none; padding: 5px 9px; border-radius: 8px; font-weight: 800; font-size: 11px; cursor: pointer;">💧 Drėgmė</button>
                    <button type="button" id="vra-layer-street" style="background: transparent; color: #CBD5E1; border: none; padding: 5px 9px; border-radius: 8px; font-weight: 800; font-size: 11px; cursor: pointer;">🗺️ Keliai</button>
                </div>
            `;
            L.DomEvent.disableClickPropagation(div);
            setTimeout(() => {
                const bSat = document.getElementById('vra-layer-sat');
                const bNdvi = document.getElementById('vra-layer-ndvi');
                const bTc = document.getElementById('vra-layer-truecolor');
                const bMoist = document.getElementById('vra-layer-moisture');
                const bStr = document.getElementById('vra-layer-street');

                const reset = () => { [bSat, bNdvi, bTc, bMoist, bStr].forEach(b => { if(b) { b.style.background='transparent'; b.style.color='#CBD5E1'; } }); };

                if (bSat) bSat.onclick = () => { [sentinelNdviLayer, sentinelTrueColorLayer, sentinelMoistureLayer, streetLayer].forEach(l => previewMap.removeLayer(l)); esriBaseLayer.addTo(previewMap); reset(); bSat.style.background='#2E7D32'; bSat.style.color='#fff'; previewPolygonLayer.bringToFront(); };
                if (bNdvi) bNdvi.onclick = () => { esriBaseLayer.addTo(previewMap); sentinelNdviLayer.addTo(previewMap); reset(); bNdvi.style.background='#15803D'; bNdvi.style.color='#fff'; previewPolygonLayer.bringToFront(); };
                if (bTc) bTc.onclick = () => { esriBaseLayer.addTo(previewMap); previewMap.removeLayer(sentinelNdviLayer); sentinelTrueColorLayer.addTo(previewMap); reset(); bTc.style.background='#2E7D32'; bTc.style.color='#fff'; previewPolygonLayer.bringToFront(); };
                if (bMoist) bMoist.onclick = () => { esriBaseLayer.addTo(previewMap); sentinelMoistureLayer.addTo(previewMap); reset(); bMoist.style.background='#1E40AF'; bMoist.style.color='#fff'; previewPolygonLayer.bringToFront(); };
                if (bStr) bStr.onclick = () => { [esriBaseLayer, sentinelNdviLayer, sentinelTrueColorLayer, sentinelMoistureLayer].forEach(l => previewMap.removeLayer(l)); streetLayer.addTo(previewMap); reset(); bStr.style.background='#334155'; bStr.style.color='#fff'; previewPolygonLayer.bringToFront(); };
            }, 100);
            return div;
        }
    });
    previewMap.addControl(new controlClass());
}

/**
 * Sugeneruoja naują gardelių tinklelį pasirinktam laukui
 */
async function rebuildGridForSelectedField(savedZones = null) {
    if (!selectedField || !selectedField.polygonCoordinates) return;

    const baseRate = parseFloat(document.getElementById('vra-modal-base-rate')?.value) || 200;
    const satDate = document.getElementById('vra-modal-sat-date')?.value || new Date().toISOString().split('T')[0];

    currentVraCells = await generateFertilizerVraGrid(selectedField.polygonCoordinates, baseRate, satDate);

    // Jei atidarome jau išsaugotą planą, atkuriame jo išsaugotas zonas
    if (savedZones && Array.isArray(savedZones)) {
        const zoneMap = {};
        savedZones.forEach(z => { zoneMap[z.id] = z.zoneIndex; });
        currentVraCells.forEach(c => {
            if (zoneMap[c.id] !== undefined) {
                c.zoneIndex = zoneMap[c.id];
            }
        });
        currentVraCells = applyFertilizerRatesToCells(currentVraCells, baseRate);
    }

    renderVraCellsOnMapAndStats(true);
}

function calculateTotalTonsFromCells(cells, field, baseRate) {
    if (!cells || cells.length === 0) {
        const totalArea = parseFloat(field?.areaHa || 10);
        return ((totalArea * baseRate) / 1000).toFixed(2);
    }
    const sumCellsArea = cells.reduce((acc, c) => acc + c.areaHa, 0) || 1;
    const officialFieldArea = parseFloat(field?.areaHa || sumCellsArea);
    const scaleFactor = officialFieldArea / sumCellsArea;

    let totalKg = 0;
    cells.forEach(c => {
        totalKg += (c.areaHa * scaleFactor) * c.rate;
    });
    return (totalKg / 1000).toFixed(2);
}

function renderVraCellsOnMapAndStats(fitBoundsNow = false) {
    if (!selectedField) return;

    const baseRate = parseFloat(document.getElementById('vra-modal-base-rate')?.value) || 200;
    const weak = Math.round(baseRate * 1.20);
    const normal = Math.round(baseRate);
    const strong = Math.round(baseRate * 0.80);

    const totalTons = calculateTotalTonsFromCells(currentVraCells, selectedField, baseRate);

    const wEl = document.getElementById('vra-mod-weak');
    const nEl = document.getElementById('vra-mod-norm');
    const sEl = document.getElementById('vra-mod-strong');
    const tEl = document.getElementById('vra-mod-total-tons');

    if (wEl) wEl.textContent = `${weak} kg/ha`;
    if (nEl) nEl.textContent = `${normal} kg/ha`;
    if (sEl) sEl.textContent = `${strong} kg/ha`;
    if (tEl) tEl.textContent = `${totalTons} t`;

    if (previewMap && selectedField.polygonCoordinates && previewPolygonLayer) {
        previewPolygonLayer.clearLayers();

        // 1. Nupiešiame kiekvieną VRA gardelę (zoną)
        currentVraCells.forEach(cell => {
            const latLngs = cell.ring.map(pt => [pt[1], pt[0]]);
            const cellPoly = L.polygon(latLngs, {
                color: '#FFFFFF',
                weight: 1,
                opacity: 0.65,
                fillColor: cell.color,
                fillOpacity: 0.60
            });

            cellPoly.bindTooltip(
                `<div class="text-xs font-sans"><b>${cell.zoneName}</b><br>Norma: <b>${cell.rate} kg/ha</b><br><i>(Spustelėkite zonai pakeisti)</i></div>`,
                { sticky: true }
            );

            // Paspaudus ant gardelės – perjungiame jos zoną (Silpna -> Optimali -> Vešli)
            cellPoly.on('click', () => {
                cell.zoneIndex = (cell.zoneIndex + 1) % 3;
                currentVraCells = applyFertilizerRatesToCells(currentVraCells, baseRate);
                renderVraCellsOnMapAndStats(false);
            });

            previewPolygonLayer.addLayer(cellPoly);
        });

        // 2. Nupiešiame ryškų išorinį lauko kontūrą
        const outerLatLngs = selectedField.polygonCoordinates.map(p => [p.lat, p.lng]);
        const outerBorder = L.polygon(outerLatLngs, {
            color: '#FFD700',
            weight: 3,
            fill: false,
            interactive: false
        });
        previewPolygonLayer.addLayer(outerBorder);

        if (fitBoundsNow) {
            previewMap.fitBounds(outerBorder.getBounds(), { padding: [25, 25] });
        }
        previewPolygonLayer.bringToFront();
    }
}

function loadSavedVraProjects(currentUser) {
    if (!currentUser) return;

    db.collection("user_fields")
        .where("userId", "==", currentUser.uid)
        .onSnapshot(snapshot => {
            const listEl = document.getElementById('vra-saved-projects-list');
            const countEl = document.getElementById('vra-projects-count');
            if (!listEl) return;

            let allPlans = [];

            snapshot.forEach(doc => {
                const f = doc.data();
                if (f.vraPlans && Array.isArray(f.vraPlans)) {
                    f.vraPlans.forEach(p => {
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
                                <span class="text-base">🌾</span>
                                <h4 class="font-bold text-base md:text-lg" style="color: var(--text-main);">${p.fieldName}</h4>
                                <span class="text-xs bg-tractorSurface px-2.5 py-0.5 rounded-md font-bold text-slate-700 dark:text-slate-200 border border-tractorBorder">
                                    ${p.crop}
                                </span>
                            </div>
                            
                            <div class="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs md:text-sm">
                                <span class="text-slate-400">Trąšos:</span>
                                <strong class="text-amber-600 dark:text-amber-400 font-bold">${p.fertilizerType}</strong>
                                <span class="text-slate-400">•</span>
                                <span class="text-slate-400">Norma:</span>
                                <strong class="font-mono font-bold" style="color: var(--text-main);">${p.baseRate} kg/ha (${p.totalTons} t)</strong>
                                <span class="text-slate-400">•</span>
                                <span class="text-slate-400">Data:</span>
                                <strong class="font-mono font-bold text-slate-700 dark:text-slate-300">📅 ${p.createdAtDate || '2026-09-11'}</strong>
                            </div>
                        </div>

                        <div class="flex items-center gap-2 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-tractorBorder/60">
                            <button type="button" class="btn-download-saved-shp h-9 px-3.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-lg text-xs flex items-center gap-1.5 shadow transition cursor-pointer" data-field-id="${p.fieldDocId}" data-plan-id="${p.id}">
                                <span>🚜</span> <span>Atsisiųsti į USB</span>
                            </button>

                            <button type="button" class="btn-edit-saved-plan h-9 px-3 bg-tractorSurface hover:bg-zinc-800 text-slate-700 dark:text-slate-200 border border-tractorBorder rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1" data-field-id="${p.fieldDocId}" data-plan-id="${p.id}">
                                <span>✏️</span> <span>Koreguoti</span>
                            </button>

                            <button type="button" class="btn-delete-saved-plan h-9 px-2.5 bg-red-950/20 hover:bg-red-950/40 border border-red-800/40 text-red-600 dark:text-red-300 rounded-lg text-xs font-bold transition cursor-pointer flex items-center justify-center" data-field-id="${p.fieldDocId}" data-plan-id="${p.id}" title="Ištrinti">
                                <span>🗑️</span>
                            </button>
                        </div>

                    </div>
                `).join('');

                listEl.querySelectorAll('.btn-download-saved-shp').forEach(btn => {
                    btn.onclick = async () => {
                        const planId = btn.getAttribute('data-plan-id');
                        const fieldId = btn.getAttribute('data-field-id');

                        const field = userFieldsList.find(f => f.id === fieldId);
                        const plan = (field?.vraPlans || []).find(p => p.id === planId);
                        if (!field || !plan) return;

                        let cells = await generateFertilizerVraGrid(field.polygonCoordinates, plan.baseRate, plan.createdAtDate);
                        if (plan.savedZones && Array.isArray(plan.savedZones)) {
                            const zMap = {};
                            plan.savedZones.forEach(z => { zMap[z.id] = z.zoneIndex; });
                            cells.forEach(c => { if (zMap[c.id] !== undefined) c.zoneIndex = zMap[c.id]; });
                            cells = applyFertilizerRatesToCells(cells, plan.baseRate);
                        }
                        await exportVraShapefile(field, plan.baseRate, plan.fertilizerType, plan.createdAtDate, cells);
                    };
                });

                listEl.querySelectorAll('.btn-edit-saved-plan').forEach(btn => {
                    btn.onclick = () => {
                        const planId = btn.getAttribute('data-plan-id');
                        const fieldId = btn.getAttribute('data-field-id');

                        const field = userFieldsList.find(f => f.id === fieldId);
                        const plan = (field?.vraPlans || []).find(p => p.id === planId);
                        if (!field || !plan) return;

                        editingPlanId = plan.id;
                        selectedField = field;

                        if (fieldSelectInstance) fieldSelectInstance.setValue(field.id);
                        document.getElementById('vra-fert-select').value = plan.fertilizerType;
                        document.getElementById('vra-modal-base-rate').value = plan.baseRate;
                        if (document.getElementById('vra-modal-fert-date')) {
                            document.getElementById('vra-modal-fert-date').value = plan.createdAtDate || new Date().toISOString().split('T')[0];
                        }

                        document.getElementById('vra-modal-title').textContent = `✏️ Koreguoti: ${field.name}`;
                        document.getElementById('vra-save-btn-text').textContent = "Išsaugoti pakeitimus";

                        document.getElementById('vra-creator-modal').classList.remove('hidden');
                        setTimeout(async () => {
                            initPreviewMap();
                            await rebuildGridForSelectedField(plan.savedZones || null);
                        }, 200);
                    };
                });

                listEl.querySelectorAll('.btn-delete-saved-plan').forEach(btn => {
                    btn.onclick = () => {
                        const planId = btn.getAttribute('data-plan-id');
                        const fieldId = btn.getAttribute('data-field-id');

                        const field = userFieldsList.find(f => f.id === fieldId);
                        const plan = (field?.vraPlans || []).find(p => p.id === planId);
                        if (!field || !plan) return;

                        showDialog(
                            "Trinti tręšimo projektą?",
                            `Ar tikrai norite pašalinti lauko „${field.name}“ planą (${plan.fertilizerType}, ${plan.baseRate} kg/ha)?`,
                            "🗑️",
                            async () => {
                                const updated = field.vraPlans.filter(p => p.id !== planId);
                                await db.collection("user_fields").doc(fieldId).update({ vraPlans: updated });
                                field.vraPlans = updated;
                                showBottomToast("Tręšimo projektas sėkmingai pašalintas! 🗑️");
                            },
                            true
                        );
                    };
                });
            } else {
                listEl.innerHTML = `<div class="text-center py-8 text-slate-500 text-xs">Nėra tręšimo projektų pagal pasirinktą filtrą.</div>`;
            }
        });
}

/**
 * 🚜 EKSPORTUOJA TIKRĄ NESIKERTANČIŲ GARDELIŲ SHAPEFILE ARCHYVĄ Į TRAKTORIAUS USB (.ZIP)
 */
async function exportVraShapefile(field, baseRate, fertName, satDate, cellsToExport) {
    if (!field || !field.polygonCoordinates || field.polygonCoordinates.length < 3) {
        showBottomToast("Laukas neturi tinkamų koordinačių!", "error");
        return;
    }

    showBottomToast("Generuojamas VRA gardelių Shapefile paketas į USB (.ZIP)...");

    try {
        await ensureZipLibraries();

        let cells = cellsToExport;
        if (!cells || cells.length === 0) {
            cells = await generateFertilizerVraGrid(field.polygonCoordinates, baseRate, satDate);
        }

        const shpPkg = buildBinaryShapefileFromCells(cells, fertName, satDate);
        const zip = new JSZip();

        const cleanFieldName = field.name.replace(/[^a-zA-Z0-9_-]/g, '_');
        const cleanBaseName = `VRA_${cleanFieldName}_${satDate || '2026'}`;

        // 1. Įrašome tiesiai į Rx/ aplanką (John Deere standartas) ir į pagrindinį aplanką (Trimble / Amazone)
        const rxFolder = zip.folder("Rx");
        rxFolder.file(`${cleanBaseName}.shp`, shpPkg.shp);
        rxFolder.file(`${cleanBaseName}.shx`, shpPkg.shx);
        rxFolder.file(`${cleanBaseName}.dbf`, shpPkg.dbf);
        rxFolder.file(`${cleanBaseName}.prj`, shpPkg.prj);

        // Taip pat ir šakniniame ZIP lygyje kitiems terminalams
        zip.file(`${cleanBaseName}.shp`, shpPkg.shp);
        zip.file(`${cleanBaseName}.shx`, shpPkg.shx);
        zip.file(`${cleanBaseName}.dbf`, shpPkg.dbf);
        zip.file(`${cleanBaseName}.prj`, shpPkg.prj);

        const vraGeoJson = {
            type: "FeatureCollection",
            name: cleanBaseName,
            field_name: field.name,
            crop: field.crop,
            features: shpPkg.features.map(f => ({
                type: "Feature",
                properties: { RATE: f.rate, ZONE: f.zone, PRODUCT: fertName, UNIT: "KG/HA" },
                geometry: { type: "Polygon", coordinates: [f.coords] }
            }))
        };
        zip.file(`${cleanBaseName}.geojson`, JSON.stringify(vraGeoJson, null, 2));

        const zipContent = await zip.generateAsync({ type: "blob" });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(zipContent);
        a.download = `${cleanBaseName}.zip`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        showBottomToast(`VRA Shapefile (${cells.length} zonų) sėkmingai paruoštas į USB! 🚜`);
    } catch (err) {
        console.error("VRA export error:", err);
        showBottomToast("Klaida generuojant Shapefile: " + err.message, "error");
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