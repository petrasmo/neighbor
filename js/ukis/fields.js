// js/fields.js
import { db } from '../core/firebase.js';
import { showDialog } from '../core/ui.js';
import { 
    initOrRefreshMap, drawFieldsOnMap, highlightFieldPolygon, 
    startDrawing, stopDrawing, getDrawingPoints, calculatePolygonAreaHa,
    getMockNdviScore, updateSentinelFilter
} from './fieldsMap.js';
import { 
    getTodayDateString, openFieldDetail, renderOperationsList, 
    resetOperationForm, getEditingOpIndex 
} from './fieldsJournal.js';
import { generateOfficialReport, exportReportToExcel } from './fieldsReport.js';

import { setupNmaImportEvents } from './fieldsImport.js';
import { setupVraEvents } from './fieldsVra.js';
import { getMainFieldsHtml, getEmptyListHtml, getFieldRowHtml } from './templates/fieldsTemplate.js';

let userFieldsList = [];
let unsubscribeFields = null;
let selectedFieldId = null;
let currentMapCoords = { lat: 56.1955, lng: 24.2805 };
let cachedUserData = null;

export const getSelectedFieldId = () => selectedFieldId;
export const getUserFieldsList = () => userFieldsList;

export function initFieldsTab(currentUser, userData) {
    const container = document.getElementById('view-tab-fields');
    if (!container) return;

    cachedUserData = userData;

    if (userData?.garageLat && userData?.garageLon && userData.garageLat !== 0) {
        currentMapCoords = { lat: parseFloat(userData.garageLat), lng: parseFloat(userData.garageLon) };
    }

    // 1. UŽKRAUNAM HTML IŠ ŠABLONO!
    container.innerHTML = getMainFieldsHtml(getTodayDateString());

    // 2. INICIJUOJAM ŽEMĖLAPĮ IR MODULIUS
    initOrRefreshMap(currentMapCoords, userData);
    setupNmaImportEvents(currentUser);
    setupVraEvents(() => userFieldsList, () => selectedFieldId);
    
    // 3. INICIJUOJAM MYGTUKŲ ĮVYKIUS
    setupFieldEvents(currentUser, userData);
    setupSatelliteFilterEvents();
    listenToUserFields(currentUser);
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

    const editModal = document.getElementById('field-edit-modal');
    const closeEditModalBtn = document.getElementById('btn-close-edit-modal');
    const btnEditField = document.getElementById('btn-edit-field-info');
    const btnDeleteField = document.getElementById('btn-delete-field-entirely');

    const reportsModal = document.getElementById('reports-choice-modal');
    const openReportsBtn = document.getElementById('btn-open-reports-modal');
    const closeReportsBtn = document.getElementById('btn-close-reports-modal');

    if (btnEditField) {
        btnEditField.onclick = () => {
            const field = userFieldsList.find(f => f.id === selectedFieldId);
            if (!field) return;

            document.getElementById('edit-field-name').value = field.name || '';
            document.getElementById('edit-field-block').value = field.fieldBlockNumber || '';
            document.getElementById('edit-field-crop').value = field.crop || 'Žieminiai kviečiai';
            document.getElementById('edit-field-notes').value = field.notes || '';

            editModal.classList.remove('hidden');
        };
    }

    if (closeEditModalBtn) closeEditModalBtn.onclick = () => editModal.classList.add('hidden');

    document.getElementById('edit-field-form').onsubmit = async (e) => {
        e.preventDefault();
        if (!selectedFieldId) return;

        const newName = document.getElementById('edit-field-name').value.trim();
        const newBlock = document.getElementById('edit-field-block').value.trim();
        const newCrop = document.getElementById('edit-field-crop').value;
        const newNotes = document.getElementById('edit-field-notes').value.trim();

        await db.collection("user_fields").doc(selectedFieldId).update({
            name: newName,
            fieldBlockNumber: newBlock,
            crop: newCrop,
            notes: newNotes
        });

        const field = userFieldsList.find(f => f.id === selectedFieldId);
        if (field) {
            field.name = newName;
            field.fieldBlockNumber = newBlock;
            field.crop = newCrop;
            field.notes = newNotes;
            openFieldDetail(field, userFieldsList);
        }

        editModal.classList.add('hidden');
        showDialog("Atnaujinta! 🌾", `Lauko „${newName}“ duomenys sėkmingai išsaugoti.`, "✅");
    };

    if (btnDeleteField) {
        btnDeleteField.onclick = () => {
            const field = userFieldsList.find(f => f.id === selectedFieldId);
            if (!field) return;

            showDialog("Trinti lauką?", `Ar tikrai norite negrįžtamai pašalinti lauką „${field.name}“ ir visą jo žurnalą?`, "🗑️", async () => {
                await db.collection("user_fields").doc(selectedFieldId).delete();
                document.getElementById('field-detail-section').classList.add('hidden');
                selectedFieldId = null;
                showDialog("Laukas pašalintas", "Laukas sėkmingai ištrintas iš jūsų ūkio.", "✅");
            }, true);
        };
    }

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
        const blockNumber = document.getElementById('field-block-input')?.value?.trim() || '';
        const areaHa = parseFloat(document.getElementById('field-area-input').value) || 0;
        const crop = document.getElementById('field-crop-select').value;
        const notes = document.getElementById('field-notes-input')?.value?.trim() || '';

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
            createdAt: new Date()
        });

        document.getElementById('save-field-form').reset();
        saveModal.classList.add('hidden');
        cancelBtn.click();
        showDialog("Laukas išsaugotas! 🌾", `Laukas „${name}“ (${areaHa} ha) sėkmingai pridėtas. Palydovinis NDVI indeksas paruoštas.`, "✅");
    };

    document.getElementById('add-operation-form').onsubmit = async (e) => {
        e.preventDefault();
        if (!selectedFieldId) return;

        const field = userFieldsList.find(f => f.id === selectedFieldId);
        if (!field) return;

        const opType = document.getElementById('op-type').value;
        const opDate = document.getElementById('op-date').value || getTodayDateString();
        const opProduct = document.getElementById('op-product').value.trim();
        const opRate = document.getElementById('op-rate').value.trim();
        const opCost = parseFloat(document.getElementById('op-cost').value) || 0;
        const opNotes = document.getElementById('op-notes').value.trim();

        const newOp = { type: opType, date: opDate, product: opProduct, rate: opRate, cost: opCost, notes: opNotes };

        const editingIdx = getEditingOpIndex();
        let updatedOperations = field.operations ? [...field.operations] : [];

        if (editingIdx !== null && editingIdx >= 0) {
            updatedOperations[editingIdx] = newOp;
        } else {
            updatedOperations.push(newOp);
        }

        await db.collection("user_fields").doc(selectedFieldId).update({ operations: updatedOperations });

        field.operations = updatedOperations;
        resetOperationForm();
        renderOperationsList(field, userFieldsList);

        showDialog("Išsaugota! 🚜", editingIdx !== null ? "Darbų įrašas atnaujintas." : "Operacija sėkmingai įtraukta į žurnalą.", "✅");
    };

    document.getElementById('btn-cancel-edit-op')?.addEventListener('click', () => {
        resetOperationForm();
    });
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

            if (selectedFieldId) {
                const activeField = userFieldsList.find(f => f.id === selectedFieldId);
                if (activeField) openFieldDetail(activeField, userFieldsList);
            }
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

window.selectAndFocusField = function(fieldId) {
    selectedFieldId = fieldId;
    const field = userFieldsList.find(f => f.id === fieldId);
    if (!field) return;

    openFieldDetail(field, userFieldsList);
    highlightFieldPolygon(fieldId);
    renderFieldsTableRows();
};