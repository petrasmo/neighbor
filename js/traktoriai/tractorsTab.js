// js/traktoriai/tractorsTab.js
import { db } from '../core/firebase.js';
import { showBottomToast, showDialog } from '../core/ui.js';
import {
    generateFertilizerVraGrid,
    applyFertilizerRatesToCells,
    generateLimingVraGrid,
    buildBinaryShapefileFromCells
} from '../ukis/vraGridEngine.js';

let cachedDeereState = null;
let cachedUserFields = [];
let unsubscribeTasks = null;

export async function initTractorsTab(currentUser, userData) {
    const container = document.getElementById('view-tab-fields');
    if (!container) return;
    const isAdmin = currentUser && (userData?.role === 'admin' || currentUser.email === 'petrasmo@gmail.com');
    if (!isAdmin) {
        container.innerHTML = `
            <div class="bg-tractorSurface border-2 border-red-500/40 rounded-3xl p-8 text-center space-y-3 max-w-xl mx-auto mt-6">
                <span class="text-4xl block">🔒</span>
                <h3 class="font-oswald text-xl font-bold uppercase" style="color: var(--text-main);">Prieiga tik administratoriams</h3>
                <p class="text-xs text-slate-400">Ši skiltis šiuo metu yra uždaroje testavimo stadijoje.</p>
            </div>
        `;
        return;
    }

    // Patikriname, ar ką tik grįžo iš John Deere prisijungimo su klaida arba sėkme
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('jd') === 'connected') {
        showBottomToast("🦌 John Deere Operations Center sėkmingai prijungtas!");
        window.history.replaceState({}, document.title, window.location.pathname);
    } else if (urlParams.get('jd_error')) {
        showDialog("John Deere ryšio informacija", urlParams.get('jd_error'), "🦌");
        window.history.replaceState({}, document.title, window.location.pathname);
    }

    container.innerHTML = `
        <div class="space-y-5 max-w-6xl mx-auto w-full">
            
            <!-- ANTRAŠTĖ -->
            <div class="border-b border-tractorBorder pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div class="space-y-1">
                    <div class="inline-flex items-center gap-1.5 bg-green-500/15 border border-green-500/30 text-green-600 dark:text-green-400 text-xs px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider">
                        <span>🦌</span> John Deere Operations Center™ (Sandbox / Developer)
                    </div>
                    <h2 class="font-oswald text-2xl md:text-3xl font-bold uppercase tracking-wider flex items-center gap-2" style="color: var(--text-main);">
                        <span>🚜</span> Savaeigė technika
                    </h2>
                    <p class="text-xs md:text-sm text-slate-300">
                        Prijunkite savo John Deere organizaciją, sinchronizuokite laukus ir siųskite VRA žemėlapius tiesiai į traktoriaus kabiną be USB!
                    </p>
                </div>

                <div class="flex flex-wrap items-center gap-2 shrink-0">
                    <button type="button" id="btn-refresh-deere" class="h-11 px-3.5 bg-tractorBg hover:bg-tractorSurface border border-tractorBorder rounded-xl text-xs font-bold transition cursor-pointer hidden" style="color: var(--text-main);" title="Atnaujinti duomenis iš John Deere">
                        🔄 Atnaujinti
                    </button>
                    <button type="button" id="btn-connect-deere-oauth" class="h-11 px-5 bg-tractorPrimary hover:bg-tractorPrimaryHover text-white font-extrabold text-xs md:text-sm rounded-xl flex items-center justify-center gap-2 shadow-lg transition cursor-pointer">
                        <span>🦌</span> <span id="lbl-connect-deere-btn">Prijungti John Deere Paskyrą</span>
                    </button>
                </div>
            </div>

            <!-- RYŠIO STATUSO KORTELĖ -->
            <div id="deere-status-banner" class="bg-tractorSurface border border-tractorBorder rounded-2xl p-5 shadow-xl">
                <div class="py-6 text-center text-xs text-slate-400 animate-pulse">Tikrinamas John Deere Cloud ryšys...</div>
            </div>

            <!-- TECHNIKOS PARKAS IŠ JOHN DEERE -->
            <div id="deere-fleet-section" class="space-y-3 hidden">
                <div class="flex items-center justify-between px-1">
                    <h3 class="font-oswald text-lg font-bold uppercase tracking-wider" style="color: var(--text-main);">
                        🚜 Technika iš John Deere Organizacijos
                    </h3>
                    <span id="deere-machines-count" class="text-xs font-mono font-bold text-green-500">0 vnt.</span>
                </div>
                <div id="deere-machines-grid" class="grid grid-cols-1 md:grid-cols-2 gap-4"></div>
            </div>

            <!-- 2 VEIKSMO BLOKAI: LAUKŲ SINCHRONIZAVIMAS IR BELAIDIS VRA SIUNTIMAS -->
            <div id="deere-actions-section" class="grid grid-cols-1 lg:grid-cols-2 gap-4 hidden">
                
                <!-- 1. LAUKŲ RIBŲ SIUNTIMAS -->
                <div class="bg-tractorSurface border border-tractorBorder rounded-2xl p-5 shadow-xl space-y-3 flex flex-col justify-between">
                    <div class="space-y-1.5">
                        <div class="flex items-center justify-between">
                            <h4 class="font-oswald text-lg font-bold uppercase tracking-wider flex items-center gap-2" style="color: var(--text-main);">
                                <span>🗺️</span> 1. Laukų Ribų Sinchronizavimas
                            </h4>
                            <span id="deere-fields-stat" class="text-xs font-mono font-bold text-amber-500">...</span>
                        </div>
                        <p class="text-xs text-slate-400 leading-relaxed">
                            Nusiųskite savo JurgisAgro įbraižytus NMA laukus ir GPS ribas tiesiai į John Deere Operations Center žemėlapį.
                        </p>
                    </div>

                    <button type="button" id="btn-push-fields-deere" class="w-full h-11 bg-tractorBg hover:bg-tractorPrimary hover:text-white border border-tractorBorder hover:border-tractorPrimary font-extrabold rounded-xl text-xs uppercase tracking-wider transition cursor-pointer flex items-center justify-center gap-2" style="color: var(--text-main);">
                        <span>📡</span> <span>Nusiųsti JurgisAgro laukus į John Deere</span>
                    </button>
                </div>

                <!-- 2. BELAIDIS VRA SIUNTIMAS -->
                <div class="bg-tractorSurface border border-tractorBorder rounded-2xl p-5 shadow-xl space-y-3 flex flex-col justify-between">
                    <div class="space-y-2">
                        <h4 class="font-oswald text-lg font-bold uppercase tracking-wider flex items-center gap-2" style="color: var(--text-main);">
                            <span>📤</span> 2. Siųsti VRA Užduotį į Traktorių
                        </h4>
                        <p class="text-xs text-slate-400">
                            Pasirinkite išsaugotą tręšimo ar kalkinimo projektą – sistema sukurs Shapefile .ZIP ir įkels tiesiai į John Deere Files API!
                        </p>

                        <select id="sel-deere-vra-plan" class="w-full h-10 bg-tractorBg border border-tractorBorder rounded-xl px-3 text-xs font-bold outline-none cursor-pointer" style="color: var(--text-main);">
                            <option value="">Kraunami jūsų VRA projektai...</option>
                        </select>
                    </div>

                    <button type="button" id="btn-send-vra-deere" class="w-full h-11 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs uppercase tracking-wider shadow transition cursor-pointer flex items-center justify-center gap-2">
                        <span>📡</span> <span>Siųsti belaidžiu būdu į John Deere</span>
                    </button>
                </div>

            </div>

            <!-- IŠSIŲSTŲ UŽDUOČIŲ ŽURNALAS -->
            <div id="deere-tasks-history-section" class="bg-tractorSurface border border-tractorBorder rounded-2xl p-5 shadow-xl space-y-3 hidden">
                <h4 class="font-oswald text-base font-bold uppercase tracking-wider border-b border-tractorBorder/70 pb-2" style="color: var(--text-main);">
                    📋 Išsiųstų Užduočių Žurnalas (John Deere Files API)
                </h4>
                <div id="deere-tasks-list" class="space-y-2 text-xs"></div>
            </div>

        </div>
    `;

    bindTractorsEvents(currentUser);
    await loadUserFieldsAndPlans(currentUser);
    await fetchDeereStatus(currentUser);
    listenToDeereTasks(currentUser);
}

function bindTractorsEvents(currentUser) {
    document.getElementById('btn-connect-deere-oauth')?.addEventListener('click', async () => {
        if (!currentUser) return;
        const btn = document.getElementById('btn-connect-deere-oauth');
        if (btn) btn.textContent = "⏳ Nukreipiama į John Deere...";

        try {
            const origin = window.location.origin;
            const res = await fetch(`https://us-central1-neighborpm-b9968.cloudfunctions.net/getJohnDeereAuthUrl?userId=${currentUser.uid}&origin=${encodeURIComponent(origin)}`);
            const data = await res.json();
            if (data && data.url) {
                window.location.href = data.url;
            }
        } catch (err) {
            showBottomToast("Klaida: " + err.message, "error");
        }
    });

    document.getElementById('btn-refresh-deere')?.addEventListener('click', async () => {
        showBottomToast("Sinchronizuojama su John Deere Cloud... 🔄", "info");
        await fetchDeereStatus(currentUser);
    });

    document.getElementById('btn-push-fields-deere')?.addEventListener('click', async () => {
        if (!cachedDeereState?.organization?.id) {
            showBottomToast("Pirmiausia prijunkite John Deere organizaciją!", "warning");
            return;
        }
        if (cachedUserFields.length === 0) {
            showBottomToast("JurgisAgro sistemoje neturite įbraižytų laukų!", "warning");
            return;
        }

        showBottomToast(`Siunčiama ${cachedUserFields.length} laukų į John Deere... 📡`, "info");
        try {
            const res = await fetch("https://us-central1-neighborpm-b9968.cloudfunctions.net/syncFieldsToJohnDeere", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    userId: currentUser.uid,
                    orgId: cachedDeereState.organization.id,
                    fields: cachedUserFields
                })
            });
            const data = await res.json();
            if (data.success) {
                showBottomToast(`✅ Sukurta laukų John Deere: ${data.createdCount} (Praleista dublikatų: ${data.skippedCount})`);
                await fetchDeereStatus(currentUser);
            } else {
                showBottomToast("Klaida: " + data.error, "error");
            }
        } catch (err) {
            showBottomToast("Ryšio klaida: " + err.message, "error");
        }
    });

    document.getElementById('btn-send-vra-deere')?.addEventListener('click', async () => {
        if (!cachedDeereState?.organization?.id) {
            showBottomToast("Pirmiausia prijunkite John Deere organizaciją!", "warning");
            return;
        }
        const selVal = document.getElementById('sel-deere-vra-plan')?.value;
        if (!selVal) {
            showBottomToast("Pasirinkite VRA tręšimo arba kalkinimo projektą!", "warning");
            return;
        }

        const [planType, fieldId, planId] = selVal.split('|');
        const field = cachedUserFields.find(f => f.id === fieldId);
        if (!field) return;

        showBottomToast("Generuojamas Shapefile .ZIP ir siunčiama į John Deere kabiną... 📡", "info");

        try {
            await ensureZipLibrary();

            let cells = [];
            let prodName = "Trasos";
            let dateStr = new Date().toISOString().split('T')[0];
            let baseRate = 200;

            if (planType === 'vra') {
                const plan = (field.vraPlans || []).find(p => p.id === planId);
                if (!plan) return;
                prodName = plan.fertilizerType || "Trasos";
                dateStr = plan.createdAtDate || dateStr;
                baseRate = plan.baseRate || 200;
                cells = await generateFertilizerVraGrid(field.polygonCoordinates, baseRate, dateStr);
                if (plan.savedZones) {
                    const zMap = {};
                    plan.savedZones.forEach(z => { zMap[z.id] = z.zoneIndex; });
                    cells.forEach(c => { if (zMap[c.id] !== undefined) c.zoneIndex = zMap[c.id]; });
                    cells = applyFertilizerRatesToCells(cells, baseRate);
                }
            } else {
                const plan = (field.limingPlans || []).find(p => p.id === planId);
                if (!plan) return;
                prodName = "Kalkes";
                dateStr = plan.createdAtDate || dateStr;
                baseRate = 3000;
                cells = generateLimingVraGrid(field.polygonCoordinates, plan.samples || []);
            }

            const shpPkg = buildBinaryShapefileFromCells(cells, prodName, dateStr);
            const zip = new JSZip();
            const cleanBaseName = `JurgisAgro_${planType.toUpperCase()}_${field.name.replace(/[^a-zA-Z0-9_-]/g, '_')}`;

            const rxFolder = zip.folder("Rx");
            rxFolder.file(`${cleanBaseName}.shp`, shpPkg.shp);
            rxFolder.file(`${cleanBaseName}.shx`, shpPkg.shx);
            rxFolder.file(`${cleanBaseName}.dbf`, shpPkg.dbf);
            rxFolder.file(`${cleanBaseName}.prj`, shpPkg.prj);

            const zipBase64 = await zip.generateAsync({ type: "base64" });

            const res = await fetch("https://us-central1-neighborpm-b9968.cloudfunctions.net/sendVraFileToJohnDeere", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    userId: currentUser.uid,
                    orgId: cachedDeereState.organization.id,
                    fileName: `${cleanBaseName}.zip`,
                    zipBase64: zipBase64,
                    fieldName: field.name,
                    taskType: planType === 'vra' ? `VRA Tręšimas (${prodName})` : `VRA Kalkinimas`,
                    baseRate: baseRate
                })
            });

            const data = await res.json();
            if (data.success) {
                showBottomToast(`🎉 VRA failas „${cleanBaseName}.zip“ sėkmingai nusiųstas į John Deere!`);
            } else {
                showBottomToast("John Deere Files API klaida: " + data.error, "error");
            }
        } catch (err) {
            showBottomToast("Siuntimo klaida: " + err.message, "error");
        }
    });
}

async function fetchDeereStatus(currentUser) {
    const banner = document.getElementById('deere-status-banner');
    const fleetSec = document.getElementById('deere-fleet-section');
    const actionsSec = document.getElementById('deere-actions-section');
    const tasksSec = document.getElementById('deere-tasks-history-section');
    const refreshBtn = document.getElementById('btn-refresh-deere');
    const connectLbl = document.getElementById('lbl-connect-deere-btn');

    if (!banner || !currentUser) return;

    try {
        const res = await fetch(`https://us-central1-neighborpm-b9968.cloudfunctions.net/getJohnDeereData?userId=${currentUser.uid}`);
        const data = await res.json();
        cachedDeereState = data;

        if (!data.isConnected) {
            banner.innerHTML = `
                <div class="flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div class="flex items-center gap-3">
                        <span class="text-4xl">🦌</span>
                        <div>
                            <h3 class="font-oswald text-lg font-bold uppercase" style="color: var(--text-main);">John Deere Paskyra Dar Neprijungta</h3>
                            <p class="text-xs text-slate-400">Spauskite viršuje <strong>„🦌 Prijungti John Deere Paskyrą“</strong>, kad sujungtumėte savo „Operations Center“ ir „John Deere 8R 370“.</p>
                        </div>
                    </div>
                </div>
            `;
            return;
        }

        refreshBtn?.classList.remove('hidden');
        if (connectLbl) connectLbl.textContent = "Perjungti Paskyrą";

        const orgName = data.organization?.name || "John Deere Organizacija";

        banner.innerHTML = `
            <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div class="flex items-center gap-3.5">
                    <div class="w-12 h-12 rounded-2xl bg-green-500/20 border-2 border-green-500 flex items-center justify-center text-2xl shrink-0">🦌</div>
                    <div>
                        <div class="flex items-center gap-2 flex-wrap">
                            <h3 class="font-oswald text-lg font-bold uppercase" style="color: var(--text-main);">${orgName}</h3>
                            <span class="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-green-500/20 text-green-600 dark:text-green-400 border border-green-500/40">
                                🟢 Sandbox API Aktyvus
                            </span>
                        </div>
                        <p class="text-xs text-slate-400 mt-0.5">
                            Laukų John Deere debesyje: <strong style="color: var(--text-main);">${(data.fields || []).length}</strong> • Technikos: <strong style="color: var(--text-main);">${(data.machines || []).length}</strong>
                        </p>
                    </div>
                </div>

                ${data.connectionsUrl ? `
                    <a href="${data.connectionsUrl}" target="_blank" class="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs flex items-center gap-2 shadow transition shrink-0">
                        <span>⚠️</span> <span>Patvirtinti Organizacijos Prieigą John Deere ➔</span>
                    </a>
                ` : ''}
            </div>
        `;

        fleetSec?.classList.remove('hidden');
        actionsSec?.classList.remove('hidden');
        tasksSec?.classList.remove('hidden');

        renderMachinesGrid(data.machines || []);
        const statEl = document.getElementById('deere-fields-stat');
        if (statEl) {
            statEl.textContent = `JurgisAgro: ${cachedUserFields.length} | Deere: ${(data.fields || []).length}`;
        }
    } catch (err) {
        banner.innerHTML = `<div class="text-xs text-red-400 py-4 text-center">Nepavyko susisiekti su John Deere: ${err.message}</div>`;
    }
}

function renderMachinesGrid(machines) {
    const grid = document.getElementById('deere-machines-grid');
    const countEl = document.getElementById('deere-machines-count');
    if (countEl) countEl.textContent = `${machines.length} vnt.`;
    if (!grid) return;

    if (machines.length === 0) {
        grid.innerHTML = `
            <div class="col-span-full bg-tractorBg border border-tractorBorder rounded-2xl p-6 text-center text-xs text-slate-400">
                Šioje John Deere organizacijoje kol kas nerasta priskirtos technikos (patikrinkite viršuje mygtuką „Patvirtinti Organizacijos Prieigą“, jei jis rodomas).
            </div>
        `;
        return;
    }

    grid.innerHTML = machines.map(m => `
        <div class="bg-tractorBg border-2 border-tractorBorder hover:border-tractorPrimary rounded-2xl p-5 space-y-3 shadow-md transition">
            <div class="flex items-start justify-between gap-2 border-b border-tractorBorder/70 pb-3">
                <div class="flex items-center gap-3">
                    <span class="text-3xl">${m.category?.toLowerCase().includes('combine') ? '🌾' : '🚜'}</span>
                    <div>
                        <h4 class="font-oswald text-lg font-bold uppercase" style="color: var(--text-main);">${m.name}</h4>
                        <span class="text-xs font-mono text-slate-400 block">${m.make} ${m.model}</span>
                    </div>
                </div>
                <span class="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-green-500/20 text-green-500 border border-green-500/40">
                    🟢 JDLink Online
                </span>
            </div>
            <div class="grid grid-cols-2 gap-2 text-xs">
                <div class="bg-tractorSurface p-2.5 rounded-xl border border-tractorBorder">
                    <span class="text-[10px] text-slate-400 uppercase font-bold block">VIN / Serijos Nr.</span>
                    <strong class="font-mono font-bold" style="color: var(--text-main);">${m.vin}</strong>
                </div>
                <div class="bg-tractorSurface p-2.5 rounded-xl border border-tractorBorder">
                    <span class="text-[10px] text-slate-400 uppercase font-bold block">Moto-valandos</span>
                    <strong class="font-mono font-bold text-green-500">${m.engineHours ? m.engineHours + ' h' : 'Simuliatorius / –'}</strong>
                </div>
            </div>
        </div>
    `).join('');
}

async function loadUserFieldsAndPlans(currentUser) {
    if (!currentUser) return;
    const snap = await db.collection("user_fields").where("userId", "==", currentUser.uid).get();
    cachedUserFields = [];
    const options = [];

    snap.forEach(doc => {
        const f = doc.data();
        cachedUserFields.push(f);

        (f.vraPlans || []).forEach(p => {
            options.push(`<option value="vra|${f.id}|${p.id}">🧪 Tręšimas: ${f.name} (${p.fertilizerType}, ${p.baseRate} kg/ha)</option>`);
        });
        (f.limingPlans || []).forEach(p => {
            options.push(`<option value="lime|${f.id}|${p.id}">🍋 Kalkinimas: ${f.name} (Vid. pH ${p.avgPh})</option>`);
        });
    });

    const sel = document.getElementById('sel-deere-vra-plan');
    if (sel) {
        if (options.length === 0) {
            sel.innerHTML = `<option value="">Pirmiausia sukurkite bent vieną VRA Tręšimo arba Kalkinimo projektą</option>`;
        } else {
            sel.innerHTML = options.join('');
        }
    }
}

function listenToDeereTasks(currentUser) {
    if (!currentUser) return;
    if (unsubscribeTasks) unsubscribeTasks();

    unsubscribeTasks = db.collection("johndeere_tasks")
        .where("userId", "==", currentUser.uid)
        .onSnapshot(snap => {
            const listEl = document.getElementById('deere-tasks-list');
            if (!listEl) return;

            if (snap.empty) {
                listEl.innerHTML = `<div class="text-center py-4 text-slate-400">Dar neišsiųsta nė viena VRA užduotis į John Deere.</div>`;
                return;
            }

            const tasks = [];
            snap.forEach(d => tasks.push(d.data()));
            tasks.sort((a, b) => (b.sentAt?.toMillis?.() || 0) - (a.sentAt?.toMillis?.() || 0));

            listEl.innerHTML = tasks.map(t => `
                <div class="p-3 bg-tractorBg rounded-xl border border-tractorBorder flex flex-wrap items-center justify-between gap-2">
                    <div>
                        <strong style="color: var(--text-main);">${t.taskType} ➔ ${t.fieldName}</strong>
                        <span class="block text-[11px] text-slate-400 font-mono">Failas: ${t.fileName}</span>
                    </div>
                    <span class="px-2.5 py-1 rounded-lg bg-green-500/20 text-green-600 dark:text-green-400 border border-green-500/40 font-bold">
                        ✓ Įkelta į John Deere Files
                    </span>
                </div>
            `).join('');
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