// js/fieldsJournal.js
import { db } from './firebase.js';
import { showDialog } from './ui.js';

export function getTodayDateString() {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
}

export function openFieldDetail(field) {
    const detailSection = document.getElementById('field-detail-section');
    if (!detailSection) return;

    detailSection.classList.remove('hidden');
    document.getElementById('detail-field-title').textContent = field.name;
    document.getElementById('detail-field-meta').textContent = `Plotas: ${field.areaHa} ha | Pasėlis: ${field.crop} | ${field.notes || ''}`;
    document.getElementById('op-date').value = getTodayDateString();

    renderOperationsList(field);
    detailSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

export function renderOperationsList(field) {
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
        histBox.innerHTML = `<p class="text-xs md:text-sm text-slate-500 py-4 text-center">Darbų žurnalas tuščias. Užregistruokite pirmąjį darbą viršuje!</p>`;
        return;
    }

    histBox.innerHTML = ops.slice().reverse().map(op => {
        const rateText = op.rate || op.details || "Nenurodyta";
        const dateText = op.date || getTodayDateString();

        return `
            <div class="bg-tractorSurface p-4 rounded-xl border border-tractorBorder/80 space-y-2 text-xs md:text-sm">
                <div class="flex justify-between items-center">
                    <span class="font-bold text-white text-sm md:text-base flex items-center gap-2">
                        ${getOpIcon(op.type)} ${op.type} ${op.product ? `– <span class="text-tractorPrimaryLight font-bold">${op.product}</span>` : ''}
                    </span>
                    <span class="text-xs text-slate-200 font-mono font-bold bg-tractorBg px-3 py-1 rounded-lg border border-tractorBorder">${dateText}</span>
                </div>
                <div class="flex flex-wrap justify-between items-center text-slate-300 pt-1">
                    <span>Norma / Kiekis: <strong class="text-white font-bold">${rateText}</strong></span>
                    ${op.cost > 0 ? `<span class="text-amber-400 font-mono font-bold text-xs bg-amber-950/30 px-2.5 py-1 rounded-lg border border-amber-800/40">Išlaidos: -${parseFloat(op.cost).toFixed(2)} €</span>` : ''}
                </div>
                ${op.notes ? `<p class="text-xs text-slate-300 italic bg-tractorBg/60 p-2.5 rounded-lg border border-tractorBorder/40">💬 ${op.notes}</p>` : ''}
            </div>
        `;
    }).join('');
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