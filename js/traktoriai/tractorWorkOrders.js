// js/traktoriai/tractorWorkOrders.js
import { db } from '../core/firebase.js';
import { showBottomToast } from '../core/ui.js';
import {
    generateFertilizerVraGrid,
    applyFertilizerRatesToCells,
    generateLimingVraGrid,
    buildBinaryShapefileFromCells
} from '../ukis/vraGridEngine.js';

let unsubscribeOrders = null;

export function refreshWorkOrdersTractorDropdown(realMachines = []) {
    const sel = document.getElementById('order-tractor-select');
    if (!sel) return;

    let machineOptions = '';
    if (realMachines && realMachines.length > 0) {
        machineOptions = realMachines.map(m => {
            const isComb = (m.category || '').toLowerCase().includes('combine') || (m.name || '').toLowerCase().includes('s7');
            return `<option value="${m.name}|johndeere">${isComb ? '🌾' : '🚜'} ${m.name} (Belaidis JDLink™ Cloud)</option>`;
        }).join('');
    } else {
        machineOptions = `<option value="John Deere 8R 370|johndeere">🦌 John Deere 8R 370 (Belaidis JDLink™ Cloud)</option>`;
    }

    const usbOption = `<option value="Ūkio Traktorius (USB)|universal">📱 Kitas ūkio traktorius (Atsisiųsti Shapefile .ZIP į USB)</option>`;
    sel.innerHTML = machineOptions + usbOption;
}

export function renderTractorWorkOrdersSection() {
    const todayStr = new Date().toISOString().split('T')[0];

    return `
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-5">
            
            <!-- KAIRĖ PUSĖ: NAUJOS UŽDUOTIES KŪRIMAS IR SIUNTIMAS -->
            <div class="lg:col-span-5 bg-tractorSurface border-2 border-tractorBorder rounded-2xl p-5 shadow-xl space-y-4 h-fit">
                <div class="border-b border-tractorBorder/70 pb-3">
                    <span class="text-[10px] font-black uppercase tracking-widest text-amber-400 block">Multi-Brand Dispečerinė</span>
                    <h3 class="font-oswald text-xl font-bold uppercase tracking-wide flex items-center gap-2" style="color: var(--text-main);">
                        <span>📤</span> Sukurti ir Siųsti Darbo Užduotį
                    </h3>
                    <p class="text-xs text-slate-400 mt-0.5">
                        Priskirkite lauką ir užduotį (Arimą, Kūlimą, Purškimą, Sėją ar VRA žemėlapį) savo traktoriui arba kombainui.
                    </p>
                </div>

                <form id="form-create-tractor-order" class="space-y-3.5 text-xs">
                    
                    <div class="space-y-1">
                        <label class="font-bold uppercase text-slate-300 block">1. Kuriai technikai siunčiame? *</label>
                        <select id="order-tractor-select" class="w-full h-11 bg-tractorBg border border-tractorBorder focus:border-tractorPrimary rounded-xl px-3 font-bold outline-none cursor-pointer" style="color: var(--text-main);">
                            <option value="John Deere 8R 370|johndeere">🦌 John Deere 8R 370 (Belaidis JDLink™ Cloud)</option>
                            <option value="Ūkio Traktorius (USB)|universal">📱 Kitas ūkio traktorius (Atsisiųsti Shapefile .ZIP į USB)</option>
                        </select>
                    </div>

                    <div class="space-y-1">
                        <label class="font-bold uppercase text-slate-300 block">2. Darbo tipas *</label>
                        <select id="order-category-select" class="w-full h-11 bg-tractorBg border border-tractorBorder focus:border-tractorPrimary rounded-xl px-3 font-bold outline-none cursor-pointer" style="color: var(--text-main);">
                            <option value="vra_map">🗺️ Tikslusis VRA Tręšimas / Kalkinimas (Pagal žemėlapį .ZIP)</option>
                            <option value="tillage">🚜 Žemės dirbimas (Arimas / Skutimas / Kultivavimas)</option>
                            <option value="harvesting">🌾 Derliaus nuėmimas (Javų kūlimas kombainu)</option>
                            <option value="spraying">💦 Purškimas (Augalų apsauga – į NMA AAP žurnalą)</option>
                            <option value="fertilizing">🧪 Tręšimas vienoda norma (į NMA Trąšų žurnalą)</option>
                            <option value="seeding">🌱 Sėja (Sėklos ir pasėlio norma)</option>
                        </select>
                    </div>

                    <div id="box-order-vra-select" class="space-y-1 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30">
                        <label class="font-bold uppercase text-amber-400 block">3. Pasirinkite paruoštą VRA projektą *</label>
                        <select id="order-vra-plan-select" class="w-full h-10 bg-tractorBg border border-tractorBorder rounded-xl px-3 font-bold outline-none cursor-pointer mt-1" style="color: var(--text-main);">
                            <option value="">Kraunami VRA projektai...</option>
                        </select>
                        <span class="text-[11px] text-slate-400 block mt-1">
                            Sistema automatiškai sugeneruos Shapefile (.shp, .shx, .dbf, .prj) archyvą ir nusiųs į kabiną.
                        </span>
                    </div>

                    <div id="box-order-standard-fields" class="space-y-3 hidden">
                        <div class="space-y-1">
                            <label class="font-bold uppercase text-green-400 block">3. Pasirinkite Lauką *</label>
                            <select id="order-field-select" class="w-full h-11 bg-tractorBg border border-tractorBorder rounded-xl px-3 font-bold outline-none cursor-pointer" style="color: var(--text-main);">
                                <option value="">Kraunami laukai...</option>
                            </select>
                        </div>

                        <div class="grid grid-cols-2 gap-2.5">
                            <div class="space-y-1">
                                <label id="lbl-order-product" class="font-bold uppercase text-slate-300 block">Padargas / Produktas</label>
                                <input id="order-product-input" type="text" placeholder="Pvz.: Arimas plūgu / Kūlimas"
                                    class="w-full h-11 bg-tractorBg border border-tractorBorder rounded-xl px-3 font-bold outline-none" style="color: var(--text-main);">
                            </div>
                            <div class="space-y-1">
                                <label id="lbl-order-rate" class="font-bold uppercase text-slate-300 block">Gylis (cm) / Norma</label>
                                <input id="order-rate-input" type="number" step="0.1" value="22"
                                    class="w-full h-11 bg-tractorBg border border-tractorBorder rounded-xl px-3 font-mono font-bold outline-none" style="color: var(--text-main);">
                            </div>
                        </div>
                    </div>

                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <div class="space-y-1">
                            <label class="font-bold uppercase text-slate-300 block">Darbo data</label>
                            <input id="order-date-input" type="date" value="${todayStr}"
                                class="w-full h-10 bg-tractorBg border border-tractorBorder rounded-xl px-3 font-mono font-bold outline-none" style="color: var(--text-main);">
                        </div>
                        <div class="space-y-1">
                            <label class="font-bold uppercase text-slate-300 block">AutoTrac™ AB Kryptis</label>
                            <select id="order-ab-heading" class="w-full h-10 bg-tractorBg border border-tractorBorder rounded-xl px-2.5 font-bold outline-none cursor-pointer" style="color: var(--text-main);">
                                <option value="Pagal ilgiausią kraštinę (Auto)">🧭 Pagal ilgiausią kraštinę</option>
                                <option value="Šiaurė–Pietūs (0°)">⬆️ Šiaurė–Pietūs (0°)</option>
                                <option value="Rytai–Vakarai (90°)">➡️ Rytai–Vakarai (90°)</option>
                            </select>
                        </div>
                    </div>

                    <div class="space-y-1">
                        <label class="font-bold uppercase text-slate-300 block">Komentaras / Instrukcija operatoriaus ekranui</label>
                        <input id="order-notes-input" type="text" placeholder="Pvz.: Aparti 22 cm gyliu, saugoti melioracijos žiotis..."
                            class="w-full h-10 bg-tractorBg border border-tractorBorder rounded-xl px-3 outline-none" style="color: var(--text-main);">
                    </div>

                    <div class="pt-2 space-y-2">
                        <button type="submit" id="btn-submit-work-order" class="w-full h-12 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs uppercase tracking-wider shadow-lg transition cursor-pointer flex items-center justify-center gap-2">
                            <span>📡</span> <span>Siųsti Darbo Užduotį į Kabiną</span>
                        </button>
                    </div>
                </form>
            </div>

            <!-- DEŠINĖ PUSĖ: AKTYVIOS IR ATLIKTOS DARBO UŽDUOTYS -->
            <div class="lg:col-span-7 bg-tractorSurface border-2 border-tractorBorder rounded-2xl p-5 shadow-xl space-y-4">
                <div class="border-b border-tractorBorder/70 pb-3 flex flex-wrap items-center justify-between gap-2">
                    <div>
                        <span class="text-[10px] font-black uppercase tracking-widest text-green-500 block">Realaus laiko vykdymo kontrolė</span>
                        <h3 class="font-oswald text-xl font-bold uppercase tracking-wide flex items-center gap-2" style="color: var(--text-main);">
                            <span>📋</span> Technikos Darbo Užduočių Žurnalas
                        </h3>
                    </div>
                    <span class="text-[11px] text-slate-400">
                        Paspaudus <strong>„✅ Užbaigti“</strong> darbas automatiškai įrašomas į NMA ataskaitas!
                    </span>
                </div>

                <div id="tractor-work-orders-list" class="space-y-3 text-xs">
                    <div class="py-10 text-center text-slate-400">Kraunamos darbo užduotys...</div>
                </div>
            </div>

        </div>
    `;
}

export function bindWorkOrdersEvents(currentUser, userData, getFieldsFn, getDeereStateFn, onVraRateSent) {
    const catSel = document.getElementById('order-category-select');
    const vraBox = document.getElementById('box-order-vra-select');
    const stdBox = document.getElementById('box-order-standard-fields');
    const prodInp = document.getElementById('order-product-input');
    const rateInp = document.getElementById('order-rate-input');
    const lblProd = document.getElementById('lbl-order-product');
    const lblRate = document.getElementById('lbl-order-rate');

    const populateSelects = () => {
        const fields = getFieldsFn() || [];
        const vraSel = document.getElementById('order-vra-plan-select');
        const fieldSel = document.getElementById('order-field-select');

        if (fieldSel) {
            fieldSel.innerHTML = fields.length > 0
                ? fields.map(f => `<option value="${f.id}">🌾 ${f.name} (${Number(f.areaHa || 0).toFixed(2)} ha • ${f.crop || 'Pasėlis'})</option>`).join('')
                : `<option value="">Pirmiausia įbraižykite bent vieną lauką</option>`;
        }

        if (vraSel) {
            const opts = [];
            fields.forEach(f => {
                (f.vraPlans || []).forEach(p => {
                    opts.push(`<option value="vra|${f.id}|${p.id}">🧪 VRA Tręšimas: ${f.name} (${p.fertilizerType}, ${p.baseRate} kg/ha)</option>`);
                });
                (f.limingPlans || []).forEach(p => {
                    opts.push(`<option value="lime|${f.id}|${p.id}">🍋 VRA Kalkinimas: ${f.name} (Vid. pH ${p.avgPh})</option>`);
                });
            });
            vraSel.innerHTML = opts.length > 0
                ? opts.join('')
                : `<option value="">Nėra VRA projektų (pasirinkite kitą darbo tipą viršuje)</option>`;
        }
    };

    populateSelects();

    if (catSel) {
        catSel.onchange = () => {
            const val = catSel.value;
            if (val === 'vra_map') {
                vraBox?.classList.remove('hidden');
                stdBox?.classList.add('hidden');
            } else {
                vraBox?.classList.add('hidden');
                stdBox?.classList.remove('hidden');

                if (val === 'tillage') {
                    if (lblProd) lblProd.textContent = "Žemės dirbimo padargas";
                    if (prodInp) prodInp.value = "Arimas verčiamu plūgu";
                    if (lblRate) lblRate.textContent = "Darbinis gylis (cm)";
                    if (rateInp) rateInp.value = "22";
                } else if (val === 'harvesting') {
                    if (lblProd) lblProd.textContent = "Kuliamas pasėlis / Pjaunamoji";
                    if (prodInp) prodInp.value = "Žieminių javų kūlimas (10.7 m)";
                    if (lblRate) lblRate.textContent = "Prognozuojamas derlius (t/ha)";
                    if (rateInp) rateInp.value = "6.8";
                } else if (val === 'spraying') {
                    if (lblProd) lblProd.textContent = "Augalų apsaugos produktas";
                    if (prodInp) prodInp.value = "Herbicidas + Mikroelementai";
                    if (lblRate) lblRate.textContent = "Tirpalo norma (l/ha)";
                    if (rateInp) rateInp.value = "200";
                } else if (val === 'fertilizing') {
                    if (lblProd) lblProd.textContent = "Trąšų pavadinimas";
                    if (prodInp) prodInp.value = "Amonio salietra (N34)";
                    if (lblRate) lblRate.textContent = "Norma (kg/ha)";
                    if (rateInp) rateInp.value = "250";
                } else if (val === 'seeding') {
                    if (lblProd) lblProd.textContent = "Sėklos / Veislė";
                    if (prodInp) prodInp.value = "Sertifikuota sėkla";
                    if (lblRate) lblRate.textContent = "Sėjos norma (kg/ha)";
                    if (rateInp) rateInp.value = "210";
                }
            }
        };
    }

    document.getElementById('form-create-tractor-order')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!currentUser) return;

        const fields = getFieldsFn() || [];
        const deereState = getDeereStateFn() || {};
        const [tractorName, brandKey] = (document.getElementById('order-tractor-select')?.value || 'John Deere 8R 370|johndeere').split('|');
        const category = document.getElementById('order-category-select')?.value || 'vra_map';
        const workDate = document.getElementById('order-date-input')?.value || new Date().toISOString().split('T')[0];
        const abHeading = document.getElementById('order-ab-heading')?.value || '';
        const notes = document.getElementById('order-notes-input')?.value.trim() || '';

        let targetField = null;
        let taskTitle = "";
        let productName = "";
        let baseRate = 0;
        let unit = "kg/ha";
        let cloudStatus = "sent_to_cabin";
        let fileName = null;

        if (category === 'vra_map') {
            const selVal = document.getElementById('order-vra-plan-select')?.value;
            if (!selVal) {
                showBottomToast("Pasirinkite VRA projektą arba perjunkite darbo tipą!", "warning");
                return;
            }
            const [planType, fieldId, planId] = selVal.split('|');
            targetField = fields.find(f => f.id === fieldId);
            if (!targetField) return;

            showBottomToast(`Ruošiamas Shapefile .ZIP ir siunčiama užduotis į „${tractorName}“... 📡`, "info");

            await ensureZipLibrary();
            let cells = [];
            if (planType === 'vra') {
                const plan = (targetField.vraPlans || []).find(p => p.id === planId);
                productName = plan?.fertilizerType || "Amonio salietra";
                baseRate = plan?.baseRate || 200;
                taskTitle = `VRA Tręšimas (${productName})`;
                cells = await generateFertilizerVraGrid(targetField.polygonCoordinates, baseRate, workDate);
                if (plan?.savedZones) {
                    const zMap = {};
                    plan.savedZones.forEach(z => { zMap[z.id] = z.zoneIndex; });
                    cells.forEach(c => { if (zMap[c.id] !== undefined) c.zoneIndex = zMap[c.id]; });
                    cells = applyFertilizerRatesToCells(cells, baseRate);
                }
            } else {
                const plan = (targetField.limingPlans || []).find(p => p.id === planId);
                productName = "Kalkės (CaCO3)";
                baseRate = 3000;
                taskTitle = `VRA Kalkinimas (Vid. pH ${plan?.avgPh || '4.7'})`;
                cells = generateLimingVraGrid(targetField.polygonCoordinates, plan?.samples || []);
            }

            const shpPkg = buildBinaryShapefileFromCells(cells, productName, workDate);
            const zip = new JSZip();
            const cleanBaseName = `JurgisAgro_${planType.toUpperCase()}_${targetField.name.replace(/[^a-zA-Z0-9_-]/g, '_')}`;
            fileName = `${cleanBaseName}.zip`;

            const rxFolder = zip.folder("Rx");
            rxFolder.file(`${cleanBaseName}.shp`, shpPkg.shp);
            rxFolder.file(`${cleanBaseName}.shx`, shpPkg.shx);
            rxFolder.file(`${cleanBaseName}.dbf`, shpPkg.dbf);
            rxFolder.file(`${cleanBaseName}.prj`, shpPkg.prj);

            if (brandKey === 'johndeere' && deereState?.organization?.id && !deereState.needsOrgConnection) {
                const zipBase64 = await zip.generateAsync({ type: "base64" });
                const res = await fetch("https://us-central1-neighborpm-b9968.cloudfunctions.net/sendVraFileToJohnDeere", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        userId: currentUser.uid,
                        orgId: deereState.organization.id,
                        fileName: fileName,
                        zipBase64: zipBase64,
                        fieldName: targetField.name,
                        taskType: taskTitle,
                        baseRate: baseRate
                    })
                });
                const jdData = await res.json();
                if (jdData.success) cloudStatus = "uploaded_to_deere";
                if (typeof onVraRateSent === 'function') onVraRateSent(baseRate);
                showBottomToast(`🎉 VRA failas „${fileName}“ nusiųstas į John Deere Cloud!`);
                return;
            } else {
                const blob = await zip.generateAsync({ type: "blob" });
                const a = document.createElement("a");
                a.href = URL.createObjectURL(blob);
                a.download = fileName;
                a.click();
                cloudStatus = "usb_downloaded";
                showBottomToast(`💾 VRA failas „${fileName}“ parsiųstas į USB!`);
                return;
            }
        } else {
            const fId = document.getElementById('order-field-select')?.value;
            targetField = fields.find(f => f.id === fId) || fields[0];
            if (!targetField) {
                showBottomToast("Pasirinkite lauką!", "warning");
                return;
            }
            productName = document.getElementById('order-product-input')?.value.trim() || "Standartinis darbas";
            baseRate = parseFloat(document.getElementById('order-rate-input')?.value) || 0;

            const catNames = {
                tillage: "Žemės dirbimas",
                harvesting: "Derliaus kūlimas",
                spraying: "Purškimas (AAP)",
                fertilizing: "Tręšimas",
                seeding: "Sėja"
            };
            const unitMap = {
                tillage: "cm gylis",
                harvesting: "t/ha",
                spraying: "l/ha",
                fertilizing: "kg/ha",
                seeding: "kg/ha"
            };
            unit = unitMap[category] || "kg/ha";
            taskTitle = `${catNames[category] || 'Lauko darbas'}: ${productName}`;

            // Kadangi johndeere_tasks yra write: false naršyklei, standartines užduotis taip pat saugome į users/{uid} arba jei atnaujinsi firestore.rules – į johndeere_tasks
            try {
                const taskRef = db.collection("johndeere_tasks").doc();
                await taskRef.set({
                    id: taskRef.id,
                    userId: currentUser.uid,
                    tractorName: tractorName,
                    brandKey: brandKey,
                    category: category,
                    taskType: taskTitle,
                    productName: productName,
                    baseRate: baseRate,
                    unit: unit,
                    fieldId: targetField.id,
                    fieldName: targetField.name,
                    areaHa: Number(targetField.areaHa || 0),
                    crop: targetField.crop || "Nenurodyta",
                    fileName: null,
                    abHeading: abHeading,
                    notes: notes,
                    workDate: workDate,
                    status: cloudStatus,
                    loggedToNma: false,
                    sentAt: new Date()
                });
                showBottomToast(`✅ Darbo užduotis „${taskTitle}“ išsiųsta į „${tractorName}“!`);
            } catch (permErr) {
                showBottomToast("Pastaba: kad išsisaugotų ne-VRA užduotys, atnaujinkite firestore.rules 8 punktą (johndeere_tasks allow write).", "warning");
            }
        }
    });

    listenToAllWorkOrders(currentUser);
}

function listenToAllWorkOrders(currentUser) {
    if (!currentUser) return;
    if (unsubscribeOrders) unsubscribeOrders();

    unsubscribeOrders = db.collection("johndeere_tasks")
        .where("userId", "==", currentUser.uid)
        .onSnapshot(snap => {
            const listEl = document.getElementById('tractor-work-orders-list');
            const badgeEl = document.getElementById('badge-orders-count');

            const tasks = [];
            snap.forEach(d => tasks.push({ ...d.data(), id: d.id }));
            tasks.sort((a, b) => {
                const tA = a.sentAt?.toMillis ? a.sentAt.toMillis() : new Date(a.sentAt || 0).getTime();
                const tB = b.sentAt?.toMillis ? b.sentAt.toMillis() : new Date(b.sentAt || 0).getTime();
                return tB - tA;
            });

            if (badgeEl) badgeEl.textContent = tasks.length;
            if (!listEl) return;

            if (tasks.length === 0) {
                listEl.innerHTML = `<div class="text-center py-8 text-slate-400">Dar nėra sukurtų darbo užduočių traktoriams.</div>`;
                return;
            }

            listEl.innerHTML = tasks.map(t => {
                const isDone = t.loggedToNma === true;
                const tractorTitle = t.tractorName || "John Deere 8R 370";
                const statusBadge = isDone
                    ? `<span class="px-2.5 py-1 rounded-lg bg-green-500/20 text-green-400 border border-green-500/40 font-extrabold text-[11px]">✅ Atlikta ir įrašyta į NMA žurnalą</span>`
                    : `<span class="px-2.5 py-1 rounded-lg bg-sky-500/20 text-sky-400 border border-sky-500/40 font-extrabold text-[11px]">📡 ${t.status === 'uploaded_to_deere' ? 'Įkelta į John Deere Cloud' : 'Išsiųsta į kabiną'}</span>`;

                return `
                    <div class="p-4 bg-tractorBg rounded-2xl border ${isDone ? 'border-green-500/40' : 'border-tractorBorder'} space-y-2.5 shadow-md">
                        <div class="flex flex-wrap items-start justify-between gap-2">
                            <div>
                                <div class="flex items-center gap-2 flex-wrap">
                                    <span class="px-2 py-0.5 rounded bg-tractorSurface border border-tractorBorder font-bold text-[11px]" style="color: var(--text-main);">🚜 ${tractorTitle}</span>
                                    <strong class="text-sm font-bold" style="color: var(--text-main);">${t.taskType} ➔ ${t.fieldName}</strong>
                                </div>
                                <div class="text-[11px] text-slate-400 mt-1 flex flex-wrap items-center gap-2">
                                    <span>📅 Data: <strong>${t.workDate || 'Šiandien'}</strong></span>
                                    ${t.baseRate ? `<span>• Norma: <strong class="text-amber-400 font-mono">${t.baseRate} ${t.unit || 'kg/ha'}</strong></span>` : ''}
                                    ${t.fileName ? `<span>• Failas: <strong class="font-mono text-green-400">${t.fileName}</strong></span>` : ''}
                                    ${t.abHeading ? `<span>• ${t.abHeading}</span>` : ''}
                                </div>
                                ${t.notes ? `<p class="text-[11px] text-amber-300/90 italic mt-1">💬 Instrukcija kabinai: „${t.notes}“</p>` : ''}
                            </div>
                            ${statusBadge}
                        </div>
                    </div>
                `;
            }).join('');
        });
}

async function ensureZipLibrary() {
    if (window.JSZip) return;
    return new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
        s.onload = () => resolve();
        s.onerror = () => reject(new Error("Nepavyko užkrauti ZIP bibliotekos"));
        document.head.appendChild(s);
    });
}