// js/ukis/operationsJournal.js
import { db } from '../core/firebase.js';
import { showBottomToast } from '../core/ui.js';
import { createCustomSelect } from '../core/customSelect.js';
import { getOperationsTemplateHtml } from './templates/operationsTemplate.js';

let userFieldsList = [];
let selectedField = null;
let fieldSelectInstance = null;
let editingOpIndex = null;
let editingFieldId = null;

let activeFilterFieldId = 'all';
let activeFilterType = 'all';

export function initOperationsJournalTab(currentUser, userData) {
    const container = document.getElementById('view-tab-fields');
    if (!container) return;

    editingOpIndex = null;
    editingFieldId = null;
    activeFilterFieldId = 'all';
    activeFilterType = 'all';

    const todayStr = new Date().toISOString().split('T')[0];
    container.innerHTML = getOperationsTemplateHtml(todayStr);

    setupOperationsEvents(currentUser);
    loadUserFields(currentUser);
    loadOperationsList(currentUser);
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

        // Lauko parinkiklis modale
        fieldSelectInstance = createCustomSelect({
            containerId: 'op-modal-field-box',
            placeholder: 'Pasirinkite lauką...',
            items: items,
            selectedId: selectedField ? selectedField.id : '',
            onSelect: (item) => {
                if (!item) return;
                selectedField = userFieldsList.find(f => f.id === item.id);
            }
        });

        // Lauko filtras virš sąrašo
        createCustomSelect({
            containerId: 'op-filter-field-box',
            placeholder: 'Filtruoti pagal lauką...',
            items: filterItems,
            selectedId: 'all',
            onSelect: (item) => {
                activeFilterFieldId = item ? item.id : 'all';
                loadOperationsList(currentUser);
            }
        });
    });
}

function setupOperationsEvents(currentUser) {
    const modal = document.getElementById('op-creator-modal');
    const openBtn = document.getElementById('btn-open-new-op-modal');
    const closeBtn = document.getElementById('btn-close-op-creator');
    const form = document.getElementById('op-modal-form');
    const typeFilter = document.getElementById('op-filter-type-select');

    if (openBtn) {
        openBtn.onclick = () => {
            editingOpIndex = null;
            editingFieldId = null;
            form.reset();
            document.getElementById('op-modal-date').value = new Date().toISOString().split('T')[0];
            document.getElementById('op-modal-title').textContent = "Registruoti atliktą darbą";
            document.getElementById('op-save-btn-text').textContent = "Įrašyti darbą į žurnalą";
            modal.classList.remove('hidden');
        };
    }

    if (closeBtn) closeBtn.onclick = () => modal.classList.add('hidden');

    typeFilter?.addEventListener('change', (e) => {
        activeFilterType = e.target.value;
        loadOperationsList(currentUser);
    });

    if (form) {
        form.onsubmit = async (e) => {
            e.preventDefault();
            if (!currentUser || !selectedField) {
                showBottomToast("Pasirinkite lauką!", "error");
                return;
            }

            const opType = document.getElementById('op-modal-type-select').value;
            const opDate = document.getElementById('op-modal-date').value;
            const opProduct = document.getElementById('op-modal-product').value.trim();
            const opRate = document.getElementById('op-modal-rate').value.trim();
            const opCost = parseFloat(document.getElementById('op-modal-cost').value) || 0;
            const opNotes = document.getElementById('op-modal-notes').value.trim();

            const newOp = {
                type: opType,
                date: opDate,
                product: opProduct,
                rate: opRate,
                cost: opCost,
                notes: opNotes
            };

            try {
                const targetFieldId = editingFieldId || selectedField.id;
                const field = userFieldsList.find(f => f.id === targetFieldId);
                if (!field) return;

                let operations = field.operations ? [...field.operations] : [];

                if (editingOpIndex !== null && editingOpIndex >= 0) {
                    // KOREGAVIMAS
                    operations[editingOpIndex] = newOp;
                    showBottomToast("Žurnalo įrašas atnaujintas! 📝");
                } else {
                    // NAUJAS ĮRAŠAS
                    operations.unshift(newOp);
                    showBottomToast("Darbas sėkmingai įrašytas į žurnalą! 📝");
                }

                await db.collection("user_fields").doc(targetFieldId).update({ operations });
                field.operations = operations;

                modal.classList.add('hidden');
                editingOpIndex = null;
                editingFieldId = null;
                loadOperationsList(currentUser);
            } catch (err) {
                showBottomToast("Klaida saugant: " + err.message, "error");
            }
        };
    }
}

function loadOperationsList(currentUser) {
    if (!currentUser) return;

    db.collection("user_fields")
        .where("userId", "==", currentUser.uid)
        .onSnapshot(snapshot => {
            const listEl = document.getElementById('ops-saved-list');
            const countEl = document.getElementById('ops-count-badge');
            if (!listEl) return;

            let allOps = [];

            snapshot.forEach(doc => {
                const f = doc.data();
                if (f.operations && Array.isArray(f.operations)) {
                    f.operations.forEach((op, idx) => {
                        allOps.push({
                            ...op,
                            fieldDocId: f.id,
                            fieldName: f.name,
                            crop: f.crop,
                            originalIdx: idx
                        });
                    });
                }
            });

            // 🔍 TAIKOME FILTRUS (LAUKAS IR TIPAS)
            if (activeFilterFieldId !== 'all') {
                allOps = allOps.filter(o => o.fieldDocId === activeFilterFieldId);
            }
            if (activeFilterType !== 'all') {
                allOps = allOps.filter(o => o.type === activeFilterType);
            }

            // Rūšiuojame pagal datą (naujausi viršuje)
            allOps.sort((a, b) => new Date(b.date || '2026-01-01') - new Date(a.date || '2026-01-01'));

            if (countEl) countEl.textContent = allOps.length;

            if (allOps.length > 0) {
                listEl.innerHTML = allOps.map(op => {
                    const icon = getOpIcon(op.type);
                    return `
                        <!-- 🌟 KOMPAKTIŠKA, VIETĄ TAUPANTI DARBO ŽURNALO EILUTĖ -->
                        <div class="bg-tractorBg border border-tractorBorder hover:border-tractorPrimary rounded-xl p-3.5 md:p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 transition shadow-sm">
                            
                            <div class="space-y-1">
                                <div class="flex flex-wrap items-center gap-2">
                                    <span class="text-base">${icon}</span>
                                    <strong class="text-base font-bold" style="color: var(--text-main);">${op.type}</strong>
                                    <span class="text-slate-400">•</span>
                                    <h4 class="font-bold text-sm md:text-base text-green-600 dark:text-green-400">${op.fieldName}</h4>
                                    <span class="text-xs bg-tractorSurface px-2 py-0.5 rounded text-slate-400 border border-tractorBorder">(${op.crop})</span>
                                </div>

                                <div class="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs md:text-sm">
                                    ${op.product ? `<span>Produktas: <strong class="text-amber-600 dark:text-amber-400">${op.product}</strong></span> <span>•</span>` : ''}
                                    ${op.rate ? `<span>Norma: <strong class="font-mono font-bold" style="color: var(--text-main);">${op.rate}</strong></span> <span>•</span>` : ''}
                                    ${op.cost ? `<span>Išlaidos: <strong class="font-mono font-bold text-amber-500">${op.cost.toFixed(2)} €</strong></span> <span>•</span>` : ''}
                                    <span>Data: <strong class="font-mono font-bold text-slate-700 dark:text-slate-300">📅 ${op.date}</strong></span>
                                </div>
                                ${op.notes ? `<p class="text-[11px] text-slate-400 italic">${op.notes}</p>` : ''}
                            </div>

                            <!-- DEŠINĖ: KOREGUOTI IR IŠTRINTI -->
                            <div class="flex items-center gap-2 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-tractorBorder/60">
                                <button type="button" class="btn-edit-op h-9 px-3 bg-tractorSurface hover:bg-zinc-800 text-slate-700 dark:text-slate-200 border border-tractorBorder rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1" data-field-id="${op.fieldDocId}" data-idx="${op.originalIdx}">
                                    <span>✏️</span> <span>Koreguoti</span>
                                </button>
                                <button type="button" class="btn-delete-op h-9 px-2.5 bg-red-950/20 hover:bg-red-950/40 border border-red-800/40 text-red-600 dark:text-red-300 rounded-lg text-xs font-bold transition cursor-pointer flex items-center justify-center" data-field-id="${op.fieldDocId}" data-idx="${op.originalIdx}" title="Ištrinti">
                                    <span>🗑️</span>
                                </button>
                            </div>

                        </div>
                    `;
                }).join('');

                // KOREGUOTI PASPAUDIMAS
                listEl.querySelectorAll('.btn-edit-op').forEach(btn => {
                    btn.onclick = () => {
                        const fieldId = btn.getAttribute('data-field-id');
                        const idx = parseInt(btn.getAttribute('data-idx'));

                        const field = userFieldsList.find(f => f.id === fieldId);
                        const op = field?.operations?.[idx];
                        if (!field || !op) return;

                        editingOpIndex = idx;
                        editingFieldId = fieldId;
                        selectedField = field;

                        if (fieldSelectInstance) fieldSelectInstance.setValue(field.id);
                        document.getElementById('op-modal-type-select').value = op.type;
                        document.getElementById('op-modal-date').value = op.date;
                        document.getElementById('op-modal-product').value = op.product || '';
                        document.getElementById('op-modal-rate').value = op.rate || '';
                        document.getElementById('op-modal-cost').value = op.cost || '';
                        document.getElementById('op-modal-notes').value = op.notes || '';

                        document.getElementById('op-modal-title').textContent = `✏️ Koreguoti darbą: ${field.name}`;
                        document.getElementById('op-save-btn-text').textContent = "Išsaugoti pakeitimus";

                        document.getElementById('op-creator-modal').classList.remove('hidden');
                    };
                });

                // IŠTRINTI PASPAUDIMAS
                listEl.querySelectorAll('.btn-delete-op').forEach(btn => {
                    btn.onclick = async () => {
                        const fieldId = btn.getAttribute('data-field-id');
                        const idx = parseInt(btn.getAttribute('data-idx'));

                        const field = userFieldsList.find(f => f.id === fieldId);
                        if (field && field.operations) {
                            const updated = field.operations.filter((_, i) => i !== idx);
                            await db.collection("user_fields").doc(fieldId).update({ operations: updated });
                            field.operations = updated;
                            showBottomToast("Įrašas pašalintas iš žurnalo.");
                        }
                    };
                });
            } else {
                listEl.innerHTML = `<div class="text-center py-8 text-slate-500 text-xs">Žurnale nėra įrašų pagal pasirinktus filtrus.</div>`;
            }
        });
}

function getOpIcon(type) {
    const icons = {
        'Sėja': '🌱',
        'Tręšimas': '🧪',
        'Purškimas': '💦',
        'Kūlimas': '🚜',
        'Žemės dirbimas': '🚜',
        'Kalkinimas': '🍋'
    };
    return icons[type] || '📝';
}