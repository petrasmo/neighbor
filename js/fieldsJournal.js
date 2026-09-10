// js/fieldsJournal.js
import { db } from './firebase.js';
import { showDialog } from './ui.js';
import { getMockNdviScore } from './fieldsMap.js';
import { initSoilTab } from './fieldsSoil.js';

let editingOpIndex = null;

export function getTodayDateString() {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
}

export function getEditingOpIndex() { return editingOpIndex; }

export function resetOperationForm() {
    editingOpIndex = null;
    const form = document.getElementById('add-operation-form');
    if (form) form.reset();
    const dateInput = document.getElementById('op-date');
    if (dateInput) dateInput.value = getTodayDateString();
    document.getElementById('btn-cancel-edit-op')?.classList.add('hidden');
    const submitBtn = document.getElementById('btn-submit-operation');
    if (submitBtn) {
        submitBtn.innerHTML = `<span>📝</span> Įrašyti darbą į lauko žurnalą`;
        submitBtn.classList.remove('bg-amber-600');
        submitBtn.classList.add('bg-tractorPrimary');
    }
}

export function openFieldDetail(field, userFieldsList, initialTab = null) {
    const detailSection = document.getElementById('field-detail-section');
    if (!detailSection || !field) return;

    detailSection.classList.remove('hidden');

    // Nustatome, koks skirtukas buvo aktyvus prieš persikraunant
    const currentActiveTab = initialTab || (document.getElementById('content-soil')?.classList.contains('hidden') === false ? 'soil' : 'journal');

    // Tabų struktūra
    detailSection.innerHTML = `
        <div class="flex bg-tractorBg p-1 rounded-xl border border-tractorBorder mb-6">
            <button id="tab-btn-journal" class="flex-1 py-2.5 text-xs font-bold rounded-lg transition ${
                currentActiveTab === 'journal' ? 'bg-tractorPrimary text-white shadow' : 'text-slate-400 hover:text-white'
            }">🌾 Pasėliai ir Žurnalas</button>
            <button id="tab-btn-soil" class="flex-1 py-2.5 text-xs font-bold rounded-lg transition ${
                currentActiveTab === 'soil' ? 'bg-amber-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }">🍋 Kalkinimas ir Dirvožemis</button>
        </div>
        
        <div id="content-journal" class="${currentActiveTab === 'journal' ? '' : 'hidden'} space-y-6">
            <div class="border-b border-tractorBorder/80 pb-5">
                <h3 id="detail-field-title" class="font-oswald text-2xl md:text-3xl font-bold text-white tracking-wide">${field.name}</h3>
                <p id="detail-field-meta" class="text-sm text-slate-300 mt-1">
                    Plotas: <strong class="text-green-400 font-bold">${field.areaHa} ha</strong> • Pasėlis: <strong class="text-white">${field.crop}</strong>
                </p>
            </div>
            <div id="field-ndvi-live-box"></div>
            <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div class="bg-tractorBg border border-tractorBorder p-3.5 rounded-xl text-center">
                    <span class="text-[10px] uppercase font-bold text-slate-400 block">Visos Išlaidos</span>
                    <strong class="text-amber-400 text-base md:text-lg font-mono font-bold" id="detail-stat-cost">0.00 €</strong>
                </div>
                <div class="bg-tractorBg border border-tractorBorder p-3.5 rounded-xl text-center">
                    <span class="text-[10px] uppercase font-bold text-slate-400 block">Gautas Derlius</span>
                    <strong class="text-green-400 text-base md:text-lg font-mono font-bold" id="detail-stat-yield">0.00 t</strong>
                </div>
                <div class="bg-tractorBg border border-tractorBorder p-3.5 rounded-xl text-center col-span-2 sm:col-span-1">
                    <span class="text-[10px] uppercase font-bold text-slate-400 block">Darbų skaičius</span>
                    <strong class="text-white text-base md:text-lg font-mono font-bold" id="detail-stat-ops">0</strong>
                </div>
            </div>
            <div class="bg-tractorBg/90 border border-tractorBorder p-5 md:p-6 rounded-2xl space-y-4">
                <h4 class="text-sm font-bold text-white uppercase tracking-wider">Registruoti darbą</h4>
                <form id="add-operation-form" class="space-y-4">
                    <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <select id="op-type" class="w-full h-11 bg-tractorSurface border border-tractorBorder rounded-xl px-3 text-xs text-white">
                            <option value="Sėja">🌱 Sėja</option><option value="Tręšimas">🧪 Tręšimas</option>
                            <option value="Purškimas">💦 Purškimas</option><option value="Kūlimas">🚜 Kūlimas</option>
                        </select>
                        <input id="op-date" type="text" required class="w-full h-11 bg-tractorSurface border border-tractorBorder rounded-xl px-3 text-xs text-white font-mono">
                        <input id="op-product" type="text" placeholder="Produktas" class="w-full h-11 bg-tractorSurface border border-tractorBorder rounded-xl px-3 text-xs text-white">
                    </div>
                    <button type="submit" id="btn-submit-operation" class="w-full h-11 bg-tractorPrimary text-white font-bold rounded-xl text-xs uppercase">Įrašyti darbą</button>
                </form>
            </div>
            <div id="detail-operations-list" class="space-y-2.5"></div>
        </div>
        <div id="content-soil" class="${currentActiveTab === 'soil' ? '' : 'hidden'} space-y-6"></div>
    `;

    // Tabų perjungimo logika
    document.getElementById('tab-btn-journal').onclick = () => {
        document.getElementById('content-journal').classList.remove('hidden');
        document.getElementById('content-soil').classList.add('hidden');
        document.getElementById('tab-btn-journal').className = "flex-1 py-2.5 text-xs font-bold rounded-lg bg-tractorPrimary text-white shadow";
        document.getElementById('tab-btn-soil').className = "flex-1 py-2.5 text-xs font-bold rounded-lg text-slate-400 hover:text-white";
    };

    document.getElementById('tab-btn-soil').onclick = () => {
        document.getElementById('content-journal').classList.add('hidden');
        document.getElementById('content-soil').classList.remove('hidden');
        document.getElementById('tab-btn-soil').className = "flex-1 py-2.5 text-xs font-bold rounded-lg bg-amber-600 text-white shadow";
        document.getElementById('tab-btn-journal').className = "flex-1 py-2.5 text-xs font-bold rounded-lg text-slate-400 hover:text-white";
        initSoilTab(document.getElementById('content-soil'), field);
    };

    renderOperationsList(field, userFieldsList);

    // Jei išsaugant buvo atvertas dirvožemis – vėl inicializuojame jį tame pačiame lange
    if (currentActiveTab === 'soil') {
        initSoilTab(document.getElementById('content-soil'), field);
    } else {
        detailSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

export function renderOperationsList(field, userFieldsList) {
    const histBox = document.getElementById('detail-operations-list');
    if (!histBox || !field) return;

    const ops = field.operations || [];
    const areaHa = parseFloat(field.areaHa) || 1;

    let totalCost = 0;
    let totalYieldTons = 0;

    ops.forEach(op => {
        if (op.cost) totalCost += parseFloat(op.cost);
        if (op.type === "Kūlimas" && op.rate) totalYieldTons += parseFloat(op.rate) || 0;
    });

    document.getElementById('detail-stat-cost').textContent = `${totalCost.toFixed(2)} €`;
    document.getElementById('detail-stat-yield').textContent = `${totalYieldTons.toFixed(2)} t`;
    document.getElementById('detail-stat-ops').textContent = ops.length;

    histBox.innerHTML = ops.map((op, realIdx) => `
        <div class="bg-tractorSurface p-4 rounded-xl border border-tractorBorder/80 text-xs">
            <div class="flex justify-between">
                <span class="font-bold text-white">${getOpIcon(op.type)} ${op.type}</span>
                <span class="font-mono text-slate-400">${op.date}</span>
            </div>
        </div>
    `).reverse().join('');
}

function getOpIcon(type) {
    const icons = { 'Sėja': '🌱', 'Tręšimas': '🧪', 'Purškimas': '💦', 'Kūlimas': '🚜' };
    return icons[type] || '📝';
}