// js/ukis/fieldsManager.js
import { db } from '../core/firebase.js';
import { showDialog } from '../core/ui.js';
import { 
    initOrRefreshMap, drawFieldsOnMap, highlightFieldPolygon, 
    startDrawing, stopDrawing, getDrawingPoints, calculatePolygonAreaHa,
    getMockNdviScore, updateSentinelFilter
} from './fieldsMap.js';
import { setupNmaImportEvents } from './fieldsImport.js';
import { getMainFieldsHtml, getEmptyListHtml, getFieldRowHtml } from './templates/fieldsTemplate.js';

let userFieldsList = [];
let unsubscribeFields = null;
let selectedFieldId = null;
let currentMapCoords = { lat: 56.1955, lng: 24.2805 };
let cachedUserData = null;

export function getSelectedFieldId() { return selectedFieldId; }
export function getUserFieldsList() { return userFieldsList; }

export function initFieldsManager(currentUser, userData) {
    const container = document.getElementById('view-tab-fields');
    if (!container) return;

    cachedUserData = userData;

    if (userData?.garageLat && userData?.garageLon && userData.garageLat !== 0) {
        currentMapCoords = { lat: parseFloat(userData.garageLat), lng: parseFloat(userData.garageLon) };
    }

    container.innerHTML = getMainFieldsHtml(new Date().toISOString().split('T')[0]);

    initOrRefreshMap(currentMapCoords, userData);
    setupNmaImportEvents(currentUser);
    setupFieldEvents(currentUser);
    setupSatelliteFilterEvents();

    if (currentUser) {
        listenToUserFields(currentUser);
    }
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
    const drawBtn = document.getElementById('btn-start-draw');
    const saveToolbarBtn = document.getElementById('btn-save-draw-toolbar');
    const cancelBtn = document.getElementById('btn-cancel-draw');
    const helperBanner = document.getElementById('draw-helper-banner');
    
    const saveModal = document.getElementById('field-save-modal');
    const closeSaveModalBtn = document.getElementById('btn-close-save-modal');

    const editModal = document.getElementById('field-edit-modal');
    const closeEditModalBtn = document.getElementById('btn-close-edit-modal');
    const btnEditField = document.getElementById('btn-edit-field-info');
    const btnDeleteField = document.getElementById('btn-delete-field-entirely');

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

        editModal.classList.add('hidden');
        showDialog("Atnaujinta! 🌾", `Lauko „${newName}“ duomenys išsaugoti.`, "✅");
    };

    if (btnDeleteField) {
        btnDeleteField.onclick = () => {
            const field = userFieldsList.find(f => f.id === selectedFieldId);
            if (!field) return;

            showDialog("Trinti lauką?", `Ar tikrai norite pašalinti lauką „${field.name}“?`, "🗑️", async () => {
                await db.collection("user_fields").doc(selectedFieldId).delete();
                document.getElementById('field-detail-section').classList.add('hidden');
                selectedFieldId = null;
                showDialog("Pašalinta", "Laukas sėkmingai ištrintas.", "✅");
            }, true);
        };
    }

    // Braižymo mygtuko paspaudimas
    drawBtn.onclick = () => {
        if (!currentUser) {
            showDialog("Reikalingas prisijungimas", "Prisijunkite, kad galėtumėte braižyti laukus.", "🔒");
            return;
        }
        startDrawing();
        drawBtn.classList.add('hidden');
        saveToolbarBtn.classList.remove('hidden');
        cancelBtn.classList.remove('hidden');
        helperBanner.classList.remove('hidden');
    };

    // Atšaukti braižymą
    cancelBtn.onclick = () => {
        stopDrawing();
        drawBtn.classList.remove('hidden');
        saveToolbarBtn.classList.add('hidden');
        cancelBtn.classList.add('hidden');
        helperBanner.classList.add('hidden');
    };

    // Baigti ir išsaugoti (viršutinis mygtukas)
    saveToolbarBtn.onclick = () => {
        const points = getDrawingPoints();
        if (points.length < 3) {
            showDialog("Trūksta taškų", "Pažymėkite bent 3 taškus žemėlapyje.", "⚠️");
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
            name,
            fieldBlockNumber: blockNumber,
            areaHa,
            crop,
            notes,
            polygonCoordinates: cleanCoords,
            createdAt: new Date()
        });

        document.getElementById('save-field-form').reset();
        saveModal.classList.add('hidden');
        cancelBtn.click(); // Sėkmingai išsaugota -> grįžtam į pradinę būseną
        showDialog("Laukas išsaugotas! 🌾", `Laukas „${name}“ (${areaHa} ha) pridėtas.`, "✅");
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

    const detailSection = document.getElementById('field-detail-section');
    if (detailSection) detailSection.classList.remove('hidden');

    document.getElementById('detail-field-title').textContent = field.name;
    document.getElementById('detail-field-meta').innerHTML = `Plotas: <strong class="text-green-400 font-bold">${field.areaHa} ha</strong> • Pasėlis: <strong class="text-white">${field.crop}</strong>`;

    highlightFieldPolygon(fieldId);
    renderFieldsTableRows();
};
export const initFieldsTab = initFieldsManager;