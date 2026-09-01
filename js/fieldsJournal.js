// js/fieldsJournal.js
import { db } from './firebase.js';
import { showDialog } from './ui.js';

let editingOpIndex = null;

export function getTodayDateString() {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
}

export function getEditingOpIndex() {
    return editingOpIndex;
}

export function resetOperationForm() {
    editingOpIndex = null;
    const form = document.getElementById('add-operation-form');
    if (form) form.reset();
    
    const dateInput = document.getElementById('op-date');
    if (dateInput) dateInput.value = getTodayDateString();

    const submitBtn = document.getElementById('btn-submit-operation');
    if (submitBtn) {
        submitBtn.innerHTML = `<span>📝</span> Įrašyti darbą į lauko žurnalą`;
        submitBtn.classList.remove('bg-amber-600');
        submitBtn.classList.add('bg-tractorPrimary');
    }
    document.getElementById('btn-cancel-edit-op')?.classList.add('hidden');
}

export function openFieldDetail(field, userFieldsList) {
    const detailSection = document.getElementById('field-detail-section');
    if (!detailSection || !field) return;

    detailSection.classList.remove('hidden');
    document.getElementById('detail-field-title').textContent = field.name;
    document.getElementById('detail-field-meta').innerHTML = `
        <span>Plotas: <strong class="text-green-400 font-bold">${field.areaHa} ha</strong></span> • 
        <span>Pasėlis: <strong class="text-white">${field.crop}</strong></span>
        ${field.fieldBlockNumber ? ` • <span>Bloko Nr.: <strong>${field.fieldBlockNumber}</strong></span>` : ''}
        ${field.notes ? ` • <span class="italic text-slate-400">${field.notes}</span>` : ''}
    `;
    
    const dateInput = document.getElementById('op-date');
    if (dateInput) dateInput.value = getTodayDateString();
    resetOperationForm();

    renderOperationsList(field, userFieldsList);
    detailSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
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
        if (op.type === "Kūlimas" && op.rate) {
            const parsed = parseFloat(op.rate);
            if (!isNaN(parsed)) totalYieldTons += parsed;
        }
    });

    document.getElementById('detail-stat-cost').textContent = `${totalCost.toFixed(2)} €`;
    document.getElementById('detail-stat-cost-ha').textContent = `${(totalCost / areaHa).toFixed(2)} €/ha`;
    document.getElementById('detail-stat-yield').textContent = `${totalYieldTons.toFixed(2)} t`;
    document.getElementById('detail-stat-yield-ha').textContent = `${(totalYieldTons / areaHa).toFixed(2)} t/ha`;
    document.getElementById('detail-stat-ops').textContent = ops.length;

    if (ops.length === 0) {
        histBox.innerHTML = `<p class="text-xs md:text-sm text-slate-400 py-4 text-center">Darbų žurnalas tuščias. Užregistruokite darbą viršuje!</p>`;
        return;
    }

    histBox.innerHTML = ops.map((op, realIdx) => {
        const rateText = op.rate || op.details || "Nenurodyta";
        const dateText = op.date || getTodayDateString();

        return `
            <div class="bg-tractorSurface p-4 rounded-xl border border-tractorBorder/80 space-y-2 text-xs md:text-sm hover:border-slate-500 transition">
                <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <span class="font-bold text-white text-sm md:text-base flex items-center gap-2">
                        ${getOpIcon(op.type)} ${op.type} ${op.product ? `– <span class="text-tractorPrimaryLight font-bold">${op.product}</span>` : ''}
                    </span>
                    
                    <div class="flex items-center gap-2 self-start sm:self-auto">
                        <span class="text-xs text-slate-200 font-mono font-bold bg-tractorBg px-3 py-1 rounded-lg border border-tractorBorder">${dateText}</span>
                        
                        <button type="button" class="btn-edit-op px-2.5 py-1 bg-tractorBg hover:bg-zinc-700 text-slate-200 hover:text-white border border-tractorBorder rounded-lg text-xs font-bold transition cursor-pointer" data-idx="${realIdx}" title="Redaguoti šį įrašą">
                            ✏️
                        </button>
                        
                        <button type="button" class="btn-delete-op px-2.5 py-1 bg-red-950/40 hover:bg-red-900 text-red-300 border border-red-800/60 rounded-lg text-xs font-bold transition cursor-pointer" data-idx="${realIdx}" title="Ištrinti šį įrašą">
                            🗑️
                        </button>
                    </div>
                </div>

                <div class="flex flex-wrap justify-between items-center text-slate-300 pt-1">
                    <span>Norma / Kiekis: <strong class="text-white font-bold">${rateText}</strong></span>
                    ${op.cost > 0 ? `<span class="text-amber-400 font-mono font-bold text-xs bg-amber-950/30 px-2.5 py-1 rounded-lg border border-amber-800/40">Išlaidos: -${parseFloat(op.cost).toFixed(2)} €</span>` : ''}
                </div>
                ${op.notes ? `<p class="text-xs text-slate-300 italic bg-tractorBg/60 p-2.5 rounded-lg border border-tractorBorder/40">💬 ${op.notes}</p>` : ''}
            </div>
        `;
    }).reverse().join('');

    histBox.querySelectorAll('.btn-delete-op').forEach(btn => {
        btn.onclick = (e) => {
            e.stopPropagation();
            const opIdx = parseInt(btn.getAttribute('data-idx'));
            showDialog("Trinti įrašą?", "Ar tikrai norite pašalinti šį darbą iš lauko žurnalo?", "🗑️", async () => {
                const updatedOps = (field.operations || []).filter((_, idx) => idx !== opIdx);
                await db.collection("user_fields").doc(field.id).update({ operations: updatedOps });
                field.operations = updatedOps;
                renderOperationsList(field, userFieldsList);
            }, true);
        };
    });

    histBox.querySelectorAll('.btn-edit-op').forEach(btn => {
        btn.onclick = (e) => {
            e.stopPropagation();
            const opIdx = parseInt(btn.getAttribute('data-idx'));
            const op = field.operations[opIdx];
            if (!op) return;

            editingOpIndex = opIdx;

            document.getElementById('op-type').value = op.type || "Sėja";
            document.getElementById('op-date').value = op.date || getTodayDateString();
            document.getElementById('op-product').value = op.product || "";
            document.getElementById('op-rate').value = op.rate || op.details || "";
            document.getElementById('op-cost').value = op.cost || "";
            document.getElementById('op-notes').value = op.notes || "";

            const submitBtn = document.getElementById('btn-submit-operation');
            if (submitBtn) {
                submitBtn.innerHTML = `<span>💾</span> Atnaujinti įrašą žurnale`;
                submitBtn.classList.remove('bg-tractorPrimary');
                submitBtn.classList.add('bg-amber-600');
            }

            document.getElementById('btn-cancel-edit-op')?.classList.remove('hidden');
            document.getElementById('add-operation-form').scrollIntoView({ behavior: 'smooth', block: 'center' });
        };
    });
}

function getOpIcon(type) {
    switch (type) {
        case 'Sėja': return '🌱';
        case 'Tręšimas': return '🧪';
        case 'Purškimas': return '💦';
        case 'Kūlimas': return '🚜';
        case 'Žemės dirbimas': return '🚜';
        case 'Kalkinimas': return '⚪';
        default: return '📝';
    }
}