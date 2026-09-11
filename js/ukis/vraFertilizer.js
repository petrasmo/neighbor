// js/ukis/vraFertilizer.js
import { db } from '../core/firebase.js';
import { showBottomToast } from '../core/ui.js';
import { createCustomSelect } from '../core/customSelect.js';
import { getVraFertilizerHtml } from './templates/vraTemplate.js';

const CDSE_INSTANCE_ID = "2ecdf3ed-4338-4577-a502-11dd5b2df254";
const CDSE_WMS_URL = `https://sh.dataspace.copernicus.eu/ogc/wms/${CDSE_INSTANCE_ID}`;

let userFieldsList = [];
let selectedField = null;
let fieldSelectInstance = null;
let editingPlanId = null;
let activeFilterFieldId = 'all';

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
            onSelect: (item) => {
                if (!item) return;
                selectedField = userFieldsList.find(f => f.id === item.id);
                updateVraPreview();
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

        if (selectedField) {
            updateVraPreview();
        }
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
            setTimeout(() => {
                initPreviewMap();
                updateVraPreview();
            }, 200);
        };
    }

    if (closeBtn) closeBtn.onclick = () => modal.classList.add('hidden');

    baseRateInput?.addEventListener('input', updateVraPreview);
    fertSelect?.addEventListener('change', updateVraPreview);
    satDateInput?.addEventListener('change', (e) => {
        const d = e.target.value;
        const start = new Date(d);
        start.setDate(start.getDate() - 30);
        const timeRange = `${start.toISOString().split('T')[0]}/${d}`;
        if (sentinelNdviLayer) sentinelNdviLayer.setParams({ time: timeRange });
        if (sentinelTrueColorLayer) sentinelTrueColorLayer.setParams({ time: timeRange });
        if (sentinelMoistureLayer) sentinelMoistureLayer.setParams({ time: timeRange });
    });

    if (saveProjBtn) {
        saveProjBtn.onclick = async () => {
            if (!currentUser || !selectedField) {
                showBottomToast("Pirmiausia pasirinkite lauką!", "error");
                return;
            }

            const baseRate = parseFloat(baseRateInput.value) || 200;
            const totalArea = parseFloat(selectedField.areaHa || 10);
            const totalTons = ((totalArea * baseRate) / 1000).toFixed(2);
            const fertDate = fertDateInput?.value || new Date().toISOString().split('T')[0];

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
                                createdAtDate: fertDate
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
                        createdAtDate: fertDate
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
            await exportVraShapefile(selectedField, baseRate, fertName, satDate);
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
                    <button type="button" id="vra-layer-ndvi" style="background: #15803D; color: #fff; border: 1px solid #2E7D32; padding: 5px 9px; border-radius: 8px; font-weight: 800; font-size: 11px; cursor: pointer;">🌿 NDVI Spektras</button>
                    <button type="button" id="vra-layer-truecolor" style="background: transparent; color: #CBD5E1; border: none; padding: 5px 9px; border-radius: 8px; font-weight: 800; font-size: 11px; cursor: pointer;">🛰️ Sentinel-2 (Foto)</button>
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

                bSat.onclick = () => { [sentinelNdviLayer, sentinelTrueColorLayer, sentinelMoistureLayer, streetLayer].forEach(l => previewMap.removeLayer(l)); esriBaseLayer.addTo(previewMap); reset(); bSat.style.background='#2E7D32'; bSat.style.color='#fff'; previewPolygonLayer.bringToFront(); };
                bNdvi.onclick = () => { esriBaseLayer.addTo(previewMap); sentinelNdviLayer.addTo(previewMap); reset(); bNdvi.style.background='#15803D'; bNdvi.style.color='#fff'; previewPolygonLayer.bringToFront(); };
                bTc.onclick = () => { esriBaseLayer.addTo(previewMap); previewMap.removeLayer(sentinelNdviLayer); sentinelTrueColorLayer.addTo(previewMap); reset(); bTc.style.background='#2E7D32'; bTc.style.color='#fff'; previewPolygonLayer.bringToFront(); };
                bMoist.onclick = () => { esriBaseLayer.addTo(previewMap); sentinelMoistureLayer.addTo(previewMap); reset(); bMoist.style.background='#1E40AF'; bMoist.style.color='#fff'; previewPolygonLayer.bringToFront(); };
                bStr.onclick = () => { [esriBaseLayer, sentinelNdviLayer, sentinelTrueColorLayer, sentinelMoistureLayer].forEach(l => previewMap.removeLayer(l)); streetLayer.addTo(previewMap); reset(); bStr.style.background='#334155'; bStr.style.color='#fff'; previewPolygonLayer.bringToFront(); };
            }, 100);
            return div;
        }
    });
    previewMap.addControl(new controlClass());
}

function updateVraPreview() {
    if (!selectedField) return;

    const baseRate = parseFloat(document.getElementById('vra-modal-base-rate')?.value) || 200;
    const totalArea = parseFloat(selectedField.areaHa || 10);

    const weak = Math.round(baseRate * 1.20);
    const normal = Math.round(baseRate);
    const strong = Math.round(baseRate * 0.80);

    const totalKg = (totalArea * 0.25 * weak) + (totalArea * 0.50 * normal) + (totalArea * 0.25 * strong);
    const totalTons = (totalKg / 1000).toFixed(2);

    document.getElementById('vra-mod-weak').textContent = `${weak} kg/ha`;
    document.getElementById('vra-mod-norm').textContent = `${normal} kg/ha`;
    document.getElementById('vra-mod-strong').textContent = `${strong} kg/ha`;
    document.getElementById('vra-mod-total-tons').textContent = `${totalTons} t`;

    if (previewMap && selectedField.polygonCoordinates) {
        previewPolygonLayer.clearLayers();
        const latLngs = selectedField.polygonCoordinates.map(p => [p.lat, p.lng]);
        const poly = L.polygon(latLngs, { color: '#F59E0B', weight: 3, fill: false });
        previewPolygonLayer.addLayer(poly);
        previewMap.fitBounds(poly.getBounds(), { padding: [25, 25] });
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
                                <strong class="font-mono font-bold" style="color: var(--text-main);">${p.baseRate} kg/ha</strong>
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

                        await exportVraShapefile(field, plan.baseRate, plan.fertilizerType, plan.createdAtDate);
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
                        setTimeout(() => {
                            initPreviewMap();
                            updateVraPreview();
                        }, 200);
                    };
                });

                listEl.querySelectorAll('.btn-delete-saved-plan').forEach(btn => {
                    btn.onclick = async () => {
                        const planId = btn.getAttribute('data-plan-id');
                        const fieldId = btn.getAttribute('data-field-id');

                        const field = userFieldsList.find(f => f.id === fieldId);
                        if (field && field.vraPlans) {
                            const updated = field.vraPlans.filter(p => p.id !== planId);
                            await db.collection("user_fields").doc(fieldId).update({ vraPlans: updated });
                            field.vraPlans = updated;
                            showBottomToast("Tręšimo projektas pašalintas.");
                        }
                    };
                });
            } else {
                listEl.innerHTML = `<div class="text-center py-8 text-slate-500 text-xs">Nėra tręšimo projektų pagal pasirinktą filtrą.</div>`;
            }
        });
}

// ==========================================
// 🚜 TIKRASIS BINARINIS SHAPEFILE GENERATORIUS TRAKTORIAUS USB
// ==========================================

async function exportVraShapefile(field, baseRate, fertName, satDate) {
    if (!field || !field.polygonCoordinates || field.polygonCoordinates.length < 3) {
        showBottomToast("Laukas neturi tinkamų koordinačių!", "error");
        return;
    }

    showBottomToast("Ruošiamas traktoriaus Shapefile archyvas į USB (.ZIP)...");

    try {
        await ensureZipLibraries();

        const weakRate = Math.round(baseRate * 1.20);
        const strongRate = Math.round(baseRate * 0.80);

        const coords = field.polygonCoordinates.map(p => [p.lng, p.lat]);
        coords.push(coords[0]); // uždarome poligoną

        const features = [
            { rate: weakRate, zone: "SILPNA (+20%)", coords },
            { rate: baseRate, zone: "OPTIMALI", coords },
            { rate: strongRate, zone: "VESLI (-20%)", coords }
        ];

        const shapefileBuffers = generateBinaryShapefilePackage(features, fertName, satDate);
        const zip = new JSZip();

        const cleanFieldName = field.name.replace(/[^a-zA-Z0-9_-]/g, '_');
        const cleanBaseName = `VRA_${cleanFieldName}_${satDate || '2026'}`;
        const folder = zip.folder(cleanBaseName);

        folder.file(`${cleanBaseName}.shp`, shapefileBuffers.shp);
        folder.file(`${cleanBaseName}.dbf`, shapefileBuffers.dbf);
        folder.file(`${cleanBaseName}.shx`, shapefileBuffers.shx);
        folder.file(`${cleanBaseName}.prj`, `GEOGCS["GCS_WGS_1984",DATUM["D_WGS_1984",SPHEROID["WGS_1984",6378137.0,298.257223563]],PRIMEM["Greenwich",0.0],UNIT["Degree",0.0174532925199433]]`);

        const vraGeoJson = {
            type: "FeatureCollection",
            name: cleanBaseName,
            field_name: field.name,
            crop: field.crop,
            features: features.map(f => ({
                type: "Feature",
                properties: { RATE: f.rate, ZONE: f.zone, PRODUCT: fertName, UNIT: "KG/HA" },
                geometry: { type: "Polygon", coordinates: [f.coords] }
            }))
        };
        folder.file(`${cleanBaseName}.geojson`, JSON.stringify(vraGeoJson, null, 2));

        const zipContent = await zip.generateAsync({ type: "blob" });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(zipContent);
        a.download = `${cleanBaseName}.zip`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        showBottomToast("Failas sėkmingai atsiųstas į USB! 🚜");
    } catch (err) {
        console.error("VRA export error:", err);
        showBottomToast("Klaida generuojant Shapefile: " + err.message, "error");
    }
}

function generateBinaryShapefilePackage(features, fertName, satDate) {
    let minX = 180, minY = 90, maxX = -180, maxY = -90;

    features.forEach(f => {
        f.coords.forEach(pt => {
            const x = pt[0], y = pt[1];
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
        });
    });

    const numRecords = features.length;
    let totalShpBytes = 100;
    const recordOffsetsWords = [];

    features.forEach(f => {
        recordOffsetsWords.push(totalShpBytes / 2);
        const numPoints = f.coords.length;
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
    features.forEach((f, idx) => {
        const numPoints = f.coords.length;
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
        f.coords.forEach(pt => {
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

    features.forEach((f, idx) => {
        const numPoints = f.coords.length;
        const recordContentWords = (48 + numPoints * 16) / 2;
        shxView.setInt32(100 + idx * 8, recordOffsetsWords[idx], false);
        shxView.setInt32(104 + idx * 8, recordContentWords, false);
    });

    const headerBytes = 32 + (4 * 32) + 1;
    const recordBytes = 1 + 10 + 20 + 20 + 10;
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
    writeDbfField(dbfBytes, 64, "ZONE", "C", 20, 0);
    writeDbfField(dbfBytes, 96, "PRODUCT", "C", 20, 0);
    writeDbfField(dbfBytes, 128, "SAT_DATE", "C", 10, 0);

    dbfView.setUint8(160, 0x0D);

    let recOffset = headerBytes;
    features.forEach(f => {
        dbfBytes[recOffset] = 0x20;
        writeDbfString(dbfBytes, recOffset + 1, String(f.rate).padStart(10, " "), 10);
        writeDbfString(dbfBytes, recOffset + 11, f.zone.padEnd(20, " "), 20);
        writeDbfString(dbfBytes, recOffset + 31, fertName.slice(0, 20).padEnd(20, " "), 20);
        writeDbfString(dbfBytes, recOffset + 51, (satDate || "").slice(0, 10).padEnd(10, " "), 10);
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