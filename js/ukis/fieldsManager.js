// js/ukis/fieldsManager.js
import { db } from '../core/firebase.js';
import { showDialog, showBottomToast } from '../core/ui.js';
import { 
    initOrRefreshMap, drawFieldsOnMap, highlightFieldPolygon, 
    startDrawing, stopDrawing, getDrawingPoints, calculatePolygonAreaHa,
    getMockNdviScore, updateSentinelFilter, setFirstPointCallback,
    drawExternalPolygon
} from './fieldsMap.js';
import { setupNmaImportEvents } from './fieldsImport.js';
import { getMainFieldsHtml, getEmptyListHtml, getFieldRowHtml } from './templates/fieldsTemplate.js';
import { getDistrictFromCoords } from '../core/geoDistricts.js';
import { loadCropsClassifier, getAllCrops } from '../core/cropsClassifier.js';

let userFieldsList = [];
let unsubscribeFields = null;
let selectedFieldId = null;
let currentMapCoords = { lat: 56.1955, lng: 24.2805 };
let cachedUserData = null;

let isNewFieldMode = false;
let isManualOnlyMode = false; // 🌟 Apsauga: jei pasirinko „Brėšiu pats“, automatinė NMA paieška nebeblokuoja
let pendingNewFieldCoords = [];
let pendingNewAreaHa = 0;
let pendingDetectedRegion = null;
let pendingRealNdvi = null;
let pendingRealSatDate = null;
let pendingRealScore = null;

export function getSelectedFieldId() { return selectedFieldId; }
export function getUserFieldsList() { return userFieldsList; }

function isPointInPoly(pt, vs) {
    const x = pt[0], y = pt[1];
    let inside = false;
    for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
        const xi = vs[i][0], yi = vs[i][1];
        const xj = vs[j][0], yj = vs[j][1];
        const intersect = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
        if (intersect) inside = !inside;
    }
    return inside;
}

export async function initFieldsManager(currentUser, userData) {
    const container = document.getElementById('view-tab-fields');
    if (!container) return;
    cachedUserData = userData;

    await loadCropsClassifier();

    if (userData?.garageLat && userData?.garageLon && userData.garageLat !== 0) {
        currentMapCoords = { lat: parseFloat(userData.garageLat), lng: parseFloat(userData.garageLon) };
    }

    container.innerHTML = getMainFieldsHtml(new Date().toISOString().split('T')[0]);
    populateCropsDropdown();

    initOrRefreshMap(currentMapCoords, userData);
    setupNmaImportEvents(currentUser);
    setupFieldEvents(currentUser);
    setupSatelliteFilterEvents();

    if (currentUser) {
        listenToUserFields(currentUser);
    }
}

// 🌟 PASĖLIŲ PASIRINKIMAS: PAGAL NUTYLĖJIMĄ VISADA TUŠČIAS SU ĮSPĖJIMU!
function populateCropsDropdown() {
    const crops = getAllCrops();
    const editCropSel = document.getElementById('edit-field-crop');
    if (!editCropSel) return;

    const placeholder = `<option value="" disabled selected>⚠️ Pasirinkite pasėlį...</option>`;
    const options = crops.map(c => `
        <option value="${c.name?.lt || c.id}">${c.icon || '🌾'} ${c.name?.lt || c.id}</option>
    `).join('');

    editCropSel.innerHTML = placeholder + options;
}

export function refreshFieldsMap() {
    initOrRefreshMap(currentMapCoords, cachedUserData);
}

function setupSatelliteFilterEvents() {
    const dateInput = document.getElementById('sentinel-date-input');
    const cloudSelect = document.getElementById('sentinel-cloud-select');
    const refreshBtn = document.getElementById('btn-refresh-satellite');

    const handleUpdate = () => {
        const d = dateInput?.value;
        const cc = parseInt(cloudSelect?.value || '25');
        updateSentinelFilter(d, cc);
    };

    dateInput?.addEventListener('change', handleUpdate);
    cloudSelect?.addEventListener('change', handleUpdate);
    refreshBtn?.addEventListener('click', handleUpdate);
}

function setupFieldEvents(currentUser) {
    const helperBanner = document.getElementById('draw-helper-banner');
    const processingIndicator = document.getElementById('field-processing-indicator');
    const editModal = document.getElementById('field-edit-modal');
    const closeEditModalBtn = document.getElementById('btn-close-edit-modal');
    const secondaryActionBtn = document.getElementById('btn-secondary-field-action');

    if (closeEditModalBtn) {
        closeEditModalBtn.onclick = () => {
            editModal?.classList.add('hidden');
            if (isNewFieldMode) {
                isManualOnlyMode = false;
                stopDrawing();
                pendingNewFieldCoords = [];
            }
        };
    }

    // PLAUKIOJANTYS MYGTUKAI ŽEMĖLAPYJE
    setTimeout(() => {
        const fabAddBtn = document.getElementById('btn-map-fab-add');
        const fabSaveBtn = document.getElementById('btn-map-fab-save');
        const fabCancelBtn = document.getElementById('btn-map-fab-cancel');

        if (fabAddBtn) {
            fabAddBtn.onclick = (e) => {
                e.stopPropagation();
                if (!currentUser) {
                    showDialog("Reikalingas prisijungimas", "Prisijunkite prie ūkio paskyros.", "🔒");
                    return;
                }
                isManualOnlyMode = false;
                pendingNewFieldCoords = [];
                startDrawing();
                if (helperBanner) {
                    helperBanner.classList.remove('hidden');
                    helperBanner.innerHTML = `📍 <strong>Spustelėkite tašką ant lauko žemėlapyje...</strong>`;
                }
            };
        }

        if (fabSaveBtn) {
            fabSaveBtn.onclick = async (e) => {
                e.stopPropagation();
                const points = getDrawingPoints();
                if (points.length < 3) {
                    showDialog("Trūksta taškų", "Pažymėkite bent 3 taškus aplink lauko ribas.", "⚠️");
                    return;
                }

                const areaHa = calculatePolygonAreaHa(points);
                const cleanCoords = points.map(p => ({ lat: p.lat, lng: p.lng }));

                if (processingIndicator) processingIndicator.classList.remove('hidden');
                const reg = await getDistrictFromCoords(cleanCoords[0].lat, cleanCoords[0].lng);
                if (processingIndicator) processingIndicator.classList.add('hidden');
                
                stopDrawing();
                isManualOnlyMode = false;

                openUnifiedFieldPassportModal({
                    isNew: true,
                    name: `Naujas laukas (${areaHa} ha)`,
                    block: "",
                    areaHa: areaHa,
                    crop: "",
                    region: reg,
                    coords: cleanCoords,
                    ndvi: null,
                    score: null,
                    satDate: "Nenustatyta"
                });
            };
        }

        if (fabCancelBtn) {
            fabCancelBtn.onclick = (e) => {
                e.stopPropagation();
                isManualOnlyMode = false;
                stopDrawing();
                pendingNewFieldCoords = [];
                if (helperBanner) helperBanner.classList.add('hidden');
                if (processingIndicator) processingIndicator.classList.add('hidden');
            };
        }
    }, 200);

    // TAŠKO PASPAUDIMAS: NMA TINKLELIS PER GOOGLE CLOUD
    setFirstPointCallback(async (latLng) => {
        // 🌟 Jei vartotojas pasirinko „Brėšiu pats“, automatinės paieškos nebevykdome
        if (isManualOnlyMode) return;

        if (processingIndicator) processingIndicator.classList.remove('hidden');
        if (helperBanner) helperBanner.classList.add('hidden');

        try {
            const cloudUrl = `https://europe-west1-neighborpm-b9968.cloudfunctions.net/getNmaBlockInfo?lat=${latLng.lat}&lng=${latLng.lng}`;
            const res = await fetch(cloudUrl);

            if (!res.ok) {
                throw new Error(`Serverio atsakymas: ${res.status}`);
            }

            const data = await res.json();

            if (!data || !data.success || !data.coordinates || data.coordinates.length < 3) {
                if (processingIndicator) processingIndicator.classList.add('hidden');
                if (helperBanner) {
                    helperBanner.classList.remove('hidden');
                    helperBanner.innerHTML = `📍 NMA bloko nerasta. Statykite taškus ranka ir spauskite <strong>✓</strong>.`;
                }
                return;
            }

            const cleanCoords = data.coordinates;
            const blockNumber = data.blockNumber || "";
            const areaHa = data.areaHa || 0;

            drawExternalPolygon(cleanCoords);
            stopDrawing();

            const reg = await getDistrictFromCoords(cleanCoords[0].lat, cleanCoords[0].lng);

            // Užklausa į Google Earth Engine dėl šio lauko NDVI
            let realNdvi = null;
            let realScore = null;
            let realSatDate = "Laukiama palydovo...";

            try {
                const satResponse = await fetch("https://us-central1-neighborpm-b9968.cloudfunctions.net/calculate-field-ndvi-gee", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ coords: cleanCoords })
                });
                if (satResponse.ok) {
                    const satData = await satResponse.json();
                    if (satData && satData.success) {
                        realNdvi = satData.ndvi;
                        realScore = satData.score;
                        realSatDate = satData.satDate;
                    }
                }
            } catch (satErr) {
                console.warn("GEE užklausos klaida:", satErr);
            }

            if (processingIndicator) processingIndicator.classList.add('hidden');

            openUnifiedFieldPassportModal({
                isNew: true,
                name: blockNumber ? `Laukas ${blockNumber}` : "Naujas laukas",
                block: blockNumber,
                areaHa: areaHa,
                crop: "",
                region: reg,
                coords: cleanCoords,
                ndvi: realNdvi,
                score: realScore,
                satDate: realSatDate
            });

        } catch (err) {
            console.warn("NMA Cloud užklausos klaida:", err);
            if (processingIndicator) processingIndicator.classList.add('hidden');
            if (helperBanner) {
                helperBanner.classList.remove('hidden');
                helperBanner.innerHTML = `📍 NMA bloko nerasta. Statykite taškus ranka ir spauskite <strong>✓</strong>.`;
            }
        }
    });

    // 🌟 FORMOS IŠSAUGOJIMAS SU GRIEŽTA PASĖLIO VALIDACIJA
    document.getElementById('edit-field-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();

        const name = document.getElementById('edit-field-name').value.trim();
        const blockNumber = document.getElementById('edit-field-block').value.trim();
        const crop = document.getElementById('edit-field-crop').value;
        const inLeague = document.getElementById('edit-field-in-league')?.checked ?? true;
        const notes = document.getElementById('edit-field-notes').value.trim();

        if (!crop || crop === "") {
            showBottomToast("⚠️ Privaloma pasirinkti lauko pasėlį!", "warning");
            const selEl = document.getElementById('edit-field-crop');
            if (selEl) {
                selEl.focus();
                selEl.classList.add('ring-2', 'ring-red-500');
                setTimeout(() => selEl.classList.remove('ring-2', 'ring-red-500'), 2500);
            }
            return;
        }

        if (isNewFieldMode) {
            const fieldDocRef = db.collection("user_fields").doc();
            const fieldId = fieldDocRef.id;

            await fieldDocRef.set({
                id: fieldId,
                userId: currentUser.uid,
                name: name,
                fieldBlockNumber: blockNumber,
                areaHa: pendingNewAreaHa,
                crop: crop,
                region: pendingDetectedRegion,
                inLeague: inLeague,
                ndvi: pendingRealNdvi,
                score: pendingRealScore,
                satDate: pendingRealSatDate || "Nenustatyta",
                notes: notes,
                polygonCoordinates: pendingNewFieldCoords,
                createdAt: new Date()
            });

            if (inLeague && !crop.includes("Arimas") && pendingRealScore) {
                await db.collection("league_scores").doc(fieldId).set({
                    fieldId: fieldId,
                    userId: currentUser.uid,
                    fieldName: name,
                    crop: crop,
                    region: pendingDetectedRegion || "Lietuva",
                    areaHa: pendingNewAreaHa,
                    coords: pendingNewFieldCoords,
                    ndvi: pendingRealNdvi,
                    score: pendingRealScore,
                    satDate: pendingRealSatDate,
                    updatedAt: new Date()
                }, { merge: true });
            }

            editModal?.classList.add('hidden');
            isNewFieldMode = false;
            isManualOnlyMode = false;
            pendingNewFieldCoords = [];
            showBottomToast(`Laukas „${name}“ sėkmingai išsaugotas! 🌾`);
        } else {
            if (!selectedFieldId) return;

            const field = userFieldsList.find(f => f.id === selectedFieldId);
            let region = field?.region || pendingDetectedRegion || "Lietuva";

            await db.collection("user_fields").doc(selectedFieldId).update({
                name: name,
                fieldBlockNumber: blockNumber,
                crop: crop,
                inLeague: inLeague,
                region: region,
                notes: notes
            });

            if (inLeague && !crop.includes("Arimas")) {
                await db.collection("league_scores").doc(selectedFieldId).set({
                    fieldId: selectedFieldId,
                    userId: currentUser.uid,
                    fieldName: name,
                    crop: crop,
                    region: region,
                    areaHa: field.areaHa,
                    updatedAt: new Date()
                }, { merge: true });
            }

            editModal?.classList.add('hidden');
            showBottomToast(`Pakeitimai išsaugoti! 🌾`);
        }
    });

    // 🌟 ANTRINIS MYGTUKAS: „BRĖŠIU PATS“ ARBA „IŠTRINTI“
    if (secondaryActionBtn) {
        secondaryActionBtn.onclick = (e) => {
            e.preventDefault();

            if (isNewFieldMode) {
                // Uždaryti langą ir įjungti rankinį braižymą be NMA perėmimo
                editModal?.classList.add('hidden');
                isManualOnlyMode = true;
                pendingNewFieldCoords = [];
                stopDrawing();
                startDrawing();

                if (helperBanner) {
                    helperBanner.classList.remove('hidden');
                    helperBanner.innerHTML = `✏️ <strong>Rankinis braižymas:</strong> Dėkite taškus aplink lauko ribas. Baigę spauskite žalią <strong>✓</strong> mygtuką žemėlapyje.`;
                }
            } else {
                const targetId = selectedFieldId;
                const field = userFieldsList.find(f => f.id === targetId);
                if (!field || !targetId) return;

                showDialog("Trinti lauką?", `Ar tikrai norite pašalinti lauką „${field.name}“?`, "🗑️", async () => {
                    try {
                        editModal?.classList.add('hidden');
                        await db.collection("user_fields").doc(targetId).delete();
                        selectedFieldId = null;
                        showBottomToast(`Laukas „${field.name}“ pašalintas.`);
                    } catch (err) {
                        showBottomToast("Klaida trinant: " + err.message, "error");
                    }
                }, true);
            }
        };
    }
}

function openUnifiedFieldPassportModal({ isNew, name, block, areaHa, crop, region, coords, ndvi, score, satDate, notes }) {
    const editModal = document.getElementById('field-edit-modal');
    if (!editModal) return;

    isNewFieldMode = isNew;
    pendingNewFieldCoords = coords || [];
    pendingNewAreaHa = areaHa || 0;
    pendingDetectedRegion = region || null;
    pendingRealNdvi = ndvi;
    pendingRealScore = score;
    pendingRealSatDate = satDate;

    const titleEl = document.getElementById('edit-modal-title');
    const nameInp = document.getElementById('edit-field-name');
    const blockInp = document.getElementById('edit-field-block');
    const cropSel = document.getElementById('edit-field-crop');
    const satDateEl = document.getElementById('edit-field-sat-date');
    const ndviValEl = document.getElementById('edit-field-ndvi-val');
    const regionTxt = document.getElementById('edit-field-region-text');
    const notesInp = document.getElementById('edit-field-notes');
    const leagueCb = document.getElementById('edit-field-in-league');
    const saveBtn = document.getElementById('btn-save-field-action');
    const secondaryBtn = document.getElementById('btn-secondary-field-action');

    if (titleEl) titleEl.textContent = isNew ? `Naujas Laukas (${areaHa} ha)` : `Lauko Pasas: ${name} (${areaHa} ha)`;
    if (nameInp) nameInp.value = name || '';
    if (blockInp) blockInp.value = block || '';
    if (notesInp) notesInp.value = notes || '';
    if (leagueCb) leagueCb.checked = true;

    // 🌟 Naujam laukui pasėlis visada privalomas ir neparinktas iš anksto
    if (cropSel) {
        cropSel.value = crop || "";
        if (!crop) cropSel.selectedIndex = 0;
    }

    if (satDateEl) satDateEl.textContent = satDate || "Laukiama palydovo...";
    if (ndviValEl) ndviValEl.textContent = (ndvi !== null && ndvi !== undefined) ? ndvi.toFixed(2) : "--";

    if (regionTxt) {
        regionTxt.textContent = region ? `📍 Regionas: ${region}` : `📍 Regionas: Nustatomas...`;
    }

    if (isNew) {
        if (saveBtn) saveBtn.innerHTML = `💾 IŠSAUGOTI LAUKĄ`;
        if (secondaryBtn) {
            secondaryBtn.className = "px-5 h-12 font-bold rounded-xl text-xs uppercase tracking-wider border border-tractorBorder transition cursor-pointer flex items-center justify-center gap-1.5 shadow-sm";
            secondaryBtn.style.cssText = "background-color: var(--bg-card) !important; color: var(--text-main) !important; border: 1.5px solid var(--border-color) !important;";
            secondaryBtn.innerHTML = `<span>✏️</span> <span>Brėšiu pats</span>`;
        }
    } else {
        if (saveBtn) saveBtn.innerHTML = `💾 IŠSAUGOTI PAKEITIMUS`;
        if (secondaryBtn) {
            secondaryBtn.className = "px-5 h-12 font-bold rounded-xl text-xs uppercase tracking-wider border transition cursor-pointer flex items-center justify-center gap-1.5 shadow-sm";
            secondaryBtn.style.cssText = "background-color: #FEE2E2 !important; color: #DC2626 !important; border: 1.5px solid #FCA5A5 !important;";
            secondaryBtn.innerHTML = `<span>🗑️</span> <span>Ištrinti</span>`;
        }
    }

    editModal.classList.remove('hidden');
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
                const f = { ...doc.data(), id: doc.id };
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
        box.innerHTML = getEmptyListHtml();
        return;
    }

    box.innerHTML = userFieldsList.map((f, idx) => {
        const isSelected = f.id === selectedFieldId;
        const ndvi = getMockNdviScore(f);
        return getFieldRowHtml(f, idx, isSelected, ndvi);
    }).join('');
}

window.selectAndFocusField = async function(fieldId) {
    selectedFieldId = fieldId;
    const field = userFieldsList.find(f => f.id === fieldId);
    if (!field) return;

    highlightFieldPolygon(fieldId);
    renderFieldsTableRows();

    let reg = field.region;
    if (!reg && field.polygonCoordinates && field.polygonCoordinates.length > 0) {
        const p = field.polygonCoordinates[0];
        const lat = Array.isArray(p) ? p[0] : p.lat;
        const lng = Array.isArray(p) ? p[1] : p.lng;
        reg = await getDistrictFromCoords(lat, lng);
    }

    openUnifiedFieldPassportModal({
        isNew: false,
        name: field.name,
        block: field.fieldBlockNumber,
        areaHa: field.areaHa,
        crop: field.crop,
        region: reg,
        coords: field.polygonCoordinates,
        ndvi: field.ndvi,
        score: field.score,
        satDate: field.satDate,
        notes: field.notes
    });
};

export const initFieldsTab = initFieldsManager;