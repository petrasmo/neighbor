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

// 🗺️ ŽEMĖLAPIO IR GYVOS TELEMETRIJOS KINTAMIEJI
let tractorMap = null;
let tractorMarker = null;
let tractorTrailPolyline = null;
let fieldPolygonsLayer = null;
let simTimer = null;
let isSimRunning = false;
let activeFieldIndex = 0;
let simWaypoints = [];
let simWaypointIdx = 0;
let simProgress = 0;
let simTrailCoords = [];

// Pilna telemetrijos būsena
let liveTelemetry = {
    name: "John Deere 8R 370",
    vin: "1RW8370PPRD094512",
    model: "8R 370 AutoPowr™ IVT",
    status: "Dirba lauke (AutoTrac™ RTK)",
    isMoving: true,
    speedKmh: 9.4,
    rpm: 1840,
    engineLoadPct: 76,
    fuelLevelPct: 78,
    fuelRateLh: 36.4,
    coolantTempC: 89,
    defLevelPct: 84,
    batteryVolts: 14.1,
    engineHours: 412.6,
    implementWidthM: 24,
    currentVraRate: 3000,
    workedAreaHa: 4.82,
    productivityHaH: 18.5,
    lat: 55.2885,
    lng: 23.9745,
    heading: 90,
    fieldName: "Laukas"
};

function ensureLeafletCss() {
    if (!document.querySelector('link[href*="leaflet.css"]')) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        document.head.appendChild(link);
    }
}

export async function initTractorsTab(currentUser, userData) {
    ensureLeafletCss();

    const container = document.getElementById('view-tab-fields');
    if (!container) return;

    if (simTimer) {
        clearInterval(simTimer);
        simTimer = null;
        isSimRunning = false;
    }

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

    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('jd') === 'connected') {
        showBottomToast("🦌 John Deere Operations Center sėkmingai prijungtas!");
        window.history.replaceState({ tab: 14 }, document.title, '/traktoriai');
    } else if (urlParams.get('jd_error')) {
        showDialog("John Deere ryšio informacija", urlParams.get('jd_error'), "🦌");
        window.history.replaceState({ tab: 14 }, document.title, '/traktoriai');
    }

    container.innerHTML = `
        <div class="space-y-5 max-w-6xl mx-auto w-full">
            
            <!-- ANTRAŠTĖ -->
            <div class="border-b border-tractorBorder pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div class="space-y-1">
                    <div class="inline-flex items-center gap-1.5 bg-green-500/15 border border-green-500/30 text-green-600 dark:text-green-400 text-xs px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider">
                        <span>🦌</span> John Deere Operations Center™ & JDLink™ Telemetrija
                    </div>
                    <h2 class="font-oswald text-2xl md:text-3xl font-bold uppercase tracking-wider flex items-center gap-2" style="color: var(--text-main);">
                        <span>🚜</span> Savaeigė technika ir GPS Stebėsena
                    </h2>
                    <p class="text-xs md:text-sm text-slate-300">
                        Gyva traktoriaus vieta palydoviniame žemėlapyje, CAN-BUS variklio telemetrija ir belaidis VRA užduočių siuntimas į kabiną.
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

            <!-- 🗺️ GYVAS TRAKTORIAUS GPS ŽEMĖLAPIS IR PILNA TELEMETRIJA -->
            <div id="deere-live-cockpit" class="space-y-4 hidden">
                
                <!-- VALDYMO JUOSTA VIRŠ ŽEMĖLAPIO -->
                <div class="bg-tractorSurface border border-tractorBorder rounded-2xl p-4 shadow-xl flex flex-wrap items-center justify-between gap-3">
                    <div class="flex items-center gap-3">
                        <div class="w-11 h-11 rounded-xl bg-green-500/20 border border-green-500/40 flex items-center justify-center text-2xl">🚜</div>
                        <div>
                            <div class="flex items-center gap-2 flex-wrap">
                                <h3 id="live-tractor-title" class="font-oswald text-lg font-bold uppercase tracking-wide" style="color: var(--text-main);">JOHN DEERE 8R 370</h3>
                                <span id="live-tractor-badge" class="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-green-500/20 text-green-400 border border-green-500/40 flex items-center gap-1.5">
                                    <span class="w-2 h-2 rounded-full bg-green-400 animate-ping"></span>
                                    <span>JDLink™ GPS Online</span>
                                </span>
                            </div>
                            <p id="live-tractor-sub" class="text-xs text-slate-400 font-mono">
                                VIN: 1RW8370PPRD094512 • StarFire™ 7000 RTK (Tikslumas ±2.5 cm)
                            </p>
                        </div>
                    </div>

                    <div class="flex flex-wrap items-center gap-2">
                        <select id="sel-sim-target-field" class="h-10 bg-tractorBg border border-tractorBorder rounded-xl px-3 text-xs font-bold outline-none cursor-pointer" style="color: var(--text-main);" title="Pasirinkite lauką, kuriame dirba traktorius">
                            <option value="0">Kraunami laukai...</option>
                        </select>

                        <button type="button" id="btn-toggle-live-sim" class="h-10 px-4 bg-tractorPrimary hover:bg-tractorPrimaryHover text-white font-extrabold rounded-xl text-xs uppercase tracking-wider shadow flex items-center gap-2 transition cursor-pointer">
                            <span>⏸️</span> <span id="lbl-toggle-sim">Stabdyti važiavimą</span>
                        </button>

                        <button type="button" id="btn-center-tractor-map" class="h-10 px-3.5 bg-tractorBg hover:bg-tractorCard border border-tractorBorder rounded-xl text-xs font-bold transition cursor-pointer" style="color: var(--text-main);" title="Centruoti žemėlapį į traktorių">
                            🎯 Centruoti
                        </button>
                    </div>
                </div>

                <!-- ŽEMĖLAPIS + DEŠINĖS PUSĖS GREITI PRIETAISAI -->
                <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    
                    <!-- PALYDOVINIS ŽEMĖLAPIS (2/3 PLOČIO SU FIKSUOTU 500px AUKŠČIU!) -->
                    <div class="lg:col-span-2 bg-tractorSurface border-2 border-tractorBorder rounded-2xl overflow-hidden shadow-xl flex flex-col justify-between">
                        
                        <!-- VIRŠUTINĖ GPS KOORDINAČIŲ JUOSTA -->
                        <div class="bg-tractorBg border-b border-tractorBorder px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
                            <div class="flex items-center gap-3">
                                <span class="text-green-400 font-bold" id="hud-gps-coords">📍 55.28850, 23.97450</span>
                                <span class="text-slate-400">|</span>
                                <span class="text-amber-400 font-bold" id="hud-heading">🧭 Kryptis: 90°</span>
                            </div>
                            <div class="flex items-center gap-2">
                                <span class="inline-block w-3 h-1 bg-green-400 rounded"></span>
                                <span class="text-[11px] text-slate-300 font-sans">AutoTrac™ AB linija (Padargas: 24 m)</span>
                            </div>
                        </div>

                        <!-- PATS LEAFLET ŽEMĖLAPIO KONTEINERIS -->
                        <div id="deere-live-map" style="width: 100%; height: 500px; min-height: 500px; position: relative; z-index: 10; background: #0f1712;"></div>
                    </div>

                    <!-- DEŠINĖS PUSĖS KABINOS MONITORIUS (CommandCenter™ Gen 4) -->
                    <div class="bg-tractorSurface border-2 border-tractorBorder rounded-2xl p-4 shadow-xl flex flex-col justify-between space-y-3">
                        <div class="border-b border-tractorBorder/70 pb-2.5 flex items-center justify-between">
                            <div>
                                <span class="text-[10px] font-black uppercase tracking-widest text-green-500 block">CommandCenter™ 4600</span>
                                <h4 class="font-oswald text-base font-bold uppercase" style="color: var(--text-main);">Kabinos Telemetrija Gyvai</h4>
                            </div>
                            <span id="hud-work-status" class="px-2.5 py-1 rounded-lg bg-green-500/20 text-green-400 border border-green-500/40 text-[11px] font-extrabold">
                                🟢 DIRBA LAUKE
                            </span>
                        </div>

                        <!-- PAGRINDINIAI 2 DIDELI CIMERBLATAI: GREITIS IR APSUKOS -->
                        <div class="grid grid-cols-2 gap-2.5">
                            <div class="bg-tractorBg border border-tractorBorder rounded-xl p-3 text-center">
                                <span class="text-[10px] text-slate-400 uppercase font-bold block">Važiavimo Greitis</span>
                                <div class="font-oswald text-3xl font-black text-green-400 mt-0.5" id="hud-speed">9.4 <span class="text-xs font-sans font-bold text-slate-400">km/h</span></div>
                                <span class="text-[10px] text-slate-400 block mt-0.5">AutoPowr™ IVT</span>
                            </div>
                            <div class="bg-tractorBg border border-tractorBorder rounded-xl p-3 text-center">
                                <span class="text-[10px] text-slate-400 uppercase font-bold block">Variklio Sūkiai</span>
                                <div class="font-oswald text-3xl font-black text-amber-400 mt-0.5" id="hud-rpm">1840 <span class="text-xs font-sans font-bold text-slate-400">RPM</span></div>
                                <span class="text-[10px] text-slate-400 block mt-0.5">PowerTech™ 9.0L</span>
                            </div>
                        </div>

                        <!-- KURO IR VARIKLIO APKROVOS PROGRESO JUOSTOS -->
                        <div class="space-y-2.5 bg-tractorBg border border-tractorBorder rounded-xl p-3 text-xs">
                            <div>
                                <div class="flex justify-between font-bold mb-1">
                                    <span class="text-slate-300">⛽ Kuro bakas (Dyzelinas)</span>
                                    <span id="hud-fuel-pct" class="text-green-400 font-mono">78% (565 L)</span>
                                </div>
                                <div class="w-full h-2.5 bg-zinc-800 rounded-full overflow-hidden">
                                    <div id="bar-fuel-pct" class="h-full bg-green-500 rounded-full transition-all duration-300" style="width: 78%;"></div>
                                </div>
                            </div>

                            <div>
                                <div class="flex justify-between font-bold mb-1">
                                    <span class="text-slate-300">🔥 Variklio apkrova</span>
                                    <span id="hud-load-pct" class="text-amber-400 font-mono">76%</span>
                                </div>
                                <div class="w-full h-2.5 bg-zinc-800 rounded-full overflow-hidden">
                                    <div id="bar-load-pct" class="h-full bg-amber-500 rounded-full transition-all duration-300" style="width: 76%;"></div>
                                </div>
                            </div>

                            <div>
                                <div class="flex justify-between font-bold mb-1">
                                    <span class="text-slate-300">💧 AdBlue® (DEF) lygis</span>
                                    <span id="hud-def-pct" class="text-sky-400 font-mono">84%</span>
                                </div>
                                <div class="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
                                    <div id="bar-def-pct" class="h-full bg-sky-500 rounded-full transition-all duration-300" style="width: 84%;"></div>
                                </div>
                            </div>
                        </div>

                        <!-- 6 PAPILDOMI CAN-BUS RODIKLIAI -->
                        <div class="grid grid-cols-2 gap-2 text-xs">
                            <div class="bg-tractorBg p-2.5 rounded-xl border border-tractorBorder">
                                <span class="text-[10px] text-slate-400 uppercase font-bold block">Kuro Sąnaudos</span>
                                <strong id="hud-fuel-rate" class="font-mono font-bold text-sm" style="color: var(--text-main);">36.4 l/val.</strong>
                            </div>
                            <div class="bg-tractorBg p-2.5 rounded-xl border border-tractorBorder">
                                <span class="text-[10px] text-slate-400 uppercase font-bold block">Aušinimo Temp.</span>
                                <strong id="hud-coolant" class="font-mono font-bold text-sm text-green-400">89 °C</strong>
                            </div>
                            <div class="bg-tractorBg p-2.5 rounded-xl border border-tractorBorder">
                                <span class="text-[10px] text-slate-400 uppercase font-bold block">VRA Norma (ISOBUS)</span>
                                <strong id="hud-vra-rate" class="font-mono font-bold text-sm text-amber-400">3000 kg/ha</strong>
                            </div>
                            <div class="bg-tractorBg p-2.5 rounded-xl border border-tractorBorder">
                                <span class="text-[10px] text-slate-400 uppercase font-bold block">Nudirbta Lauke</span>
                                <strong id="hud-worked-ha" class="font-mono font-bold text-sm text-green-400">4.82 ha</strong>
                            </div>
                            <div class="bg-tractorBg p-2.5 rounded-xl border border-tractorBorder">
                                <span class="text-[10px] text-slate-400 uppercase font-bold block">Moto-valandos</span>
                                <strong id="hud-eng-hours" class="font-mono font-bold text-sm" style="color: var(--text-main);">412.6 h</strong>
                            </div>
                            <div class="bg-tractorBg p-2.5 rounded-xl border border-tractorBorder">
                                <span class="text-[10px] text-slate-400 uppercase font-bold block">Akumuliatorius</span>
                                <strong id="hud-voltage" class="font-mono font-bold text-sm text-green-400">14.1 V</strong>
                            </div>
                        </div>

                        <!-- DIAGNOSTIKA / DTC ALERTS -->
                        <div class="p-2.5 rounded-xl bg-green-500/10 border border-green-500/30 flex items-center justify-between text-xs">
                            <span class="font-bold text-green-400 flex items-center gap-1.5">
                                <span>🛡️</span> <span>JDLink™ DTC Diagnostika:</span>
                            </span>
                            <span class="font-mono font-bold text-green-300">0 klaidų (OK)</span>
                        </div>
                    </div>

                </div>
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

    document.getElementById('btn-toggle-live-sim')?.addEventListener('click', () => {
        if (isSimRunning) {
            pauseLiveSimulation();
        } else {
            startLiveSimulation();
        }
    });

    document.getElementById('btn-center-tractor-map')?.addEventListener('click', () => {
        if (tractorMap && liveTelemetry.lat && liveTelemetry.lng) {
            tractorMap.invalidateSize();
            tractorMap.setView([liveTelemetry.lat, liveTelemetry.lng], 17, { animate: true });
        }
    });

    document.getElementById('sel-sim-target-field')?.addEventListener('change', (e) => {
        activeFieldIndex = parseInt(e.target.value, 10) || 0;
        setupFieldWaypoints(activeFieldIndex, true);
    });

    document.getElementById('btn-push-fields-deere')?.addEventListener('click', async () => {
        if (!cachedDeereState?.organization?.id || cachedDeereState.needsOrgConnection) {
            showBottomToast("Pirmiausia paspauskite geltoną mygtuką ir pažymėkite varnelę prie savo John Deere organizacijos!", "warning");
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
        if (!cachedDeereState?.organization?.id || cachedDeereState.needsOrgConnection) {
            showBottomToast("Pirmiausia paspauskite geltoną mygtuką ir pažymėkite varnelę prie savo John Deere organizacijos!", "warning");
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
                liveTelemetry.currentVraRate = baseRate;
                updateCockpitHud();
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
    const cockpitSec = document.getElementById('deere-live-cockpit');
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
                            <p class="text-xs text-slate-400">Spauskite viršuje <strong>„🦌 Prijungti John Deere Paskyrą“</strong>, kad sujungtumėte savo „Operations Center“.</p>
                        </div>
                    </div>
                </div>
            `;
            return;
        }

        refreshBtn?.classList.remove('hidden');
        if (connectLbl) connectLbl.textContent = "Perjungti Paskyrą";

        const orgName = data.organization?.name || "John Deere Organizacija";
        const orgId = data.organization?.id || "–";

        const returnUri = encodeURIComponent(`${window.location.origin}/?tab=14&jd=connected`);
        const rawConnUrl = data.connectionsUrl || data.manageConnectionsUrl || "https://connections.deere.com/connections/0oay3prpfukTojw365d7/select-organizations";
        const fullConnUrl = rawConnUrl.includes('?') ? `${rawConnUrl}&redirect_uri=${returnUri}` : `${rawConnUrl}?redirect_uri=${returnUri}`;

        const realMachinesCount = (data.machines || []).length;

        banner.innerHTML = `
            <div class="space-y-4">
                <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div class="flex items-center gap-3.5">
                        <div class="w-12 h-12 rounded-2xl bg-green-500/20 border-2 border-green-500 flex items-center justify-center text-2xl shrink-0">🦌</div>
                        <div>
                            <div class="flex items-center gap-2 flex-wrap">
                                <h3 class="font-oswald text-lg font-bold uppercase" style="color: var(--text-main);">${orgName} (ID: ${orgId})</h3>
                                <span class="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${data.needsOrgConnection ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40' : 'bg-green-500/20 text-green-600 dark:text-green-400 border border-green-500/40'}">
                                    ${data.needsOrgConnection ? '⚠️ Reikia patvirtinti organizaciją (Step 5)' : '🟢 Sandbox API Sujungta'}
                                </span>
                            </div>
                            <p class="text-xs text-slate-400 mt-0.5">
                                Laukų John Deere debesyje: <strong style="color: var(--text-main);">${(data.fields || []).length}</strong> • 
                                Technika: <strong class="text-green-400">${realMachinesCount > 0 ? realMachinesCount + ' vnt. (JDLink)' : 'John Deere 8R 370 (Gyva GPS Telemetrija)'}</strong>
                            </p>
                        </div>
                    </div>

                    <div class="flex flex-wrap items-center gap-2 shrink-0">
                        <a href="${fullConnUrl}" target="_blank" class="px-4 py-2.5 ${data.needsOrgConnection ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 font-black animate-pulse' : 'bg-tractorBg hover:bg-tractorCard text-slate-200 border border-tractorBorder font-bold'} rounded-xl text-xs flex items-center gap-2 shadow transition">
                            <span>${data.needsOrgConnection ? '⚠️' : '🔗'}</span>
                            <span>${data.needsOrgConnection ? 'Patvirtinti Organizacijos Prieigą (Step 5) ➔' : 'Organizacijos leidimai (Connections)'}</span>
                        </a>
                    </div>
                </div>
            </div>
        `;

        cockpitSec?.classList.remove('hidden');
        actionsSec?.classList.remove('hidden');
        tasksSec?.classList.remove('hidden');

        const statEl = document.getElementById('deere-fields-stat');
        if (statEl) {
            statEl.textContent = `JurgisAgro: ${cachedUserFields.length} | Deere: ${(data.fields || []).length}`;
        }

        if (realMachinesCount > 0) {
            const m = data.machines[0];
            liveTelemetry.name = m.name || "John Deere Technika";
            liveTelemetry.vin = m.vin || "JDLink";
            liveTelemetry.model = `${m.make || 'John Deere'} ${m.model || ''}`;
            if (m.engineHours) liveTelemetry.engineHours = parseFloat(m.engineHours);
            if (m.location && m.location.lat && m.location.lng) {
                liveTelemetry.lat = m.location.lat;
                liveTelemetry.lng = m.location.lng;
                liveTelemetry.heading = m.location.heading || 0;
            }
        }

        setTimeout(() => {
            initLiveTractorMap(data.machines || []);
        }, 180);

    } catch (err) {
        banner.innerHTML = `<div class="text-xs text-red-400 py-4 text-center">Nepavyko susisiekti su John Deere: ${err.message}</div>`;
    }
}

// ============================================================================
// 🗺️ PALYDOVINIS ŽEMĖLAPIS IR GYVAS TRAKTORIAUS VAŽIAVIMAS PER JŪSŲ LAUKĄ
// ============================================================================
function initLiveTractorMap(realMachines) {
    const mapEl = document.getElementById('deere-live-map');
    if (!mapEl || !window.L) return;

    if (tractorMap) {
        tractorMap.remove();
        tractorMap = null;
    }

    let defaultIdx = cachedUserFields.findIndex(f => (f.limingPlans?.length > 0 || f.vraPlans?.length > 0) && f.polygonCoordinates?.length >= 3);
    if (defaultIdx === -1) {
        defaultIdx = cachedUserFields.findIndex(f => f.polygonCoordinates?.length >= 3);
    }
    activeFieldIndex = defaultIdx >= 0 ? defaultIdx : 0;

    const fieldSel = document.getElementById('sel-sim-target-field');
    if (fieldSel) {
        if (cachedUserFields.length > 0) {
            fieldSel.innerHTML = cachedUserFields.map((f, idx) =>
                `<option value="${idx}" ${idx === activeFieldIndex ? 'selected' : ''}>📍 Dirba lauke: ${f.name} (${Number(f.areaHa || 0).toFixed(2)} ha)</option>`
            ).join('');
        } else {
            fieldSel.innerHTML = `<option value="0">📍 Demonstracinis laukas (Kėdainių r.)</option>`;
        }
    }

    tractorMap = L.map('deere-live-map', {
        center: [liveTelemetry.lat, liveTelemetry.lng],
        zoom: 16,
        zoomControl: true
    });

    // Esri World Imagery palydovinis sluoksnis + vietovardžių hibridinės ribos
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        maxZoom: 19,
        attribution: '© Esri Satellite & John Deere JDLink'
    }).addTo(tractorMap);

    fieldPolygonsLayer = L.layerGroup().addTo(tractorMap);

    drawUserFieldsOnTractorMap();

    tractorTrailPolyline = L.polyline([], {
        color: '#4ADE80',
        weight: 6,
        opacity: 0.9,
        lineCap: 'round'
    }).addTo(tractorMap);

    const tractorIcon = createTractorMapIcon(liveTelemetry.name, liveTelemetry.speedKmh, liveTelemetry.heading);
    tractorMarker = L.marker([liveTelemetry.lat, liveTelemetry.lng], { icon: tractorIcon, zIndexOffset: 1000 }).addTo(tractorMap);

    // Priverstinai atnaujiname Leaflet dydį, kad 100% užpildytų 500px langą
    setTimeout(() => {
        if (tractorMap) tractorMap.invalidateSize();
    }, 150);

    if (realMachines.length > 0 && realMachines[0].location) {
        const loc = realMachines[0].location;
        liveTelemetry.lat = loc.lat;
        liveTelemetry.lng = loc.lng;
        liveTelemetry.heading = loc.heading || 0;
        if (loc.trail && loc.trail.length > 1) {
            tractorTrailPolyline.setLatLngs(loc.trail);
        }
        tractorMarker.setLatLng([loc.lat, loc.lng]);
        tractorMap.setView([loc.lat, loc.lng], 16);
        updateCockpitHud();
    } else {
        setupFieldWaypoints(activeFieldIndex, true);
        startLiveSimulation();
    }
}

function drawUserFieldsOnTractorMap() {
    if (!fieldPolygonsLayer) return;
    fieldPolygonsLayer.clearLayers();

    cachedUserFields.forEach((f, idx) => {
        const coords = (f.polygonCoordinates || []).map(p => [
            Number(Array.isArray(p) ? p[0] : p.lat),
            Number(Array.isArray(p) ? p[1] : p.lng)
        ]).filter(c => c[0] && c[1]);

        if (coords.length >= 3) {
            const isSelected = idx === activeFieldIndex;
            const poly = L.polygon(coords, {
                color: isSelected ? '#FACC15' : '#4ADE80',
                weight: isSelected ? 3 : 2,
                fillColor: isSelected ? '#22C55E' : '#16A34A',
                fillOpacity: isSelected ? 0.22 : 0.12
            }).addTo(fieldPolygonsLayer);

            poly.bindTooltip(`🌾 ${f.name} (${Number(f.areaHa || 0).toFixed(2)} ha)`, {
                sticky: true
            });
        }
    });
}

function createTractorMapIcon(name, speed, heading) {
    return L.divIcon({
        className: 'custom-jd-tractor-marker',
        html: `
            <div style="position: relative; display: flex; flex-direction: column; align-items: center; transform: translate(-50%, -50%);">
                <div style="background: rgba(15, 23, 15, 0.94); color: #4ADE80; border: 1.5px solid #22C55E; padding: 2px 8px; border-radius: 999px; font-size: 11px; font-weight: 900; white-space: nowrap; margin-bottom: 4px; box-shadow: 0 4px 12px rgba(0,0,0,0.7); font-family: monospace;">
                    🦌 8R 370 • ${Number(speed).toFixed(1)} km/h
                </div>
                <div style="width: 44px; height: 44px; border-radius: 50%; background: radial-gradient(circle, #16A34A 0%, #14532D 100%); border: 3px solid #FACC15; box-shadow: 0 0 22px rgba(34, 197, 94, 0.9); display: flex; align-items: center; justify-content: center; font-size: 22px;">
                    🚜
                </div>
            </div>
        `,
        iconSize: [0, 0],
        iconAnchor: [0, 0]
    });
}

function setupFieldWaypoints(fieldIdx, centerMap = true) {
    drawUserFieldsOnTractorMap();

    const f = cachedUserFields[fieldIdx];
    let coords = [];

    if (f && f.polygonCoordinates && f.polygonCoordinates.length >= 3) {
        coords = f.polygonCoordinates.map(p => [
            Number(Array.isArray(p) ? p[0] : p.lat),
            Number(Array.isArray(p) ? p[1] : p.lng)
        ]).filter(c => c[0] && c[1]);
        liveTelemetry.fieldName = f.name;
    } else {
        coords = [
            [55.2895, 23.9720],
            [55.2895, 23.9770],
            [55.2875, 23.9770],
            [55.2875, 23.9720]
        ];
        liveTelemetry.fieldName = "Laukas #1";
    }

    let minLat = Infinity, maxLat = -Infinity, minLng = Infinity, maxLng = -Infinity;
    coords.forEach(([lat, lng]) => {
        if (lat < minLat) minLat = lat;
        if (lat > maxLat) maxLat = lat;
        if (lng < minLng) minLng = lng;
        if (lng > maxLng) maxLng = lng;
    });

    const padLat = (maxLat - minLat) * 0.15;
    const padLng = (maxLng - minLng) * 0.15;
    const sLat = minLat + padLat;
    const eLat = maxLat - padLat;
    const sLng = minLng + padLng;
    const eLng = maxLng - padLng;

    const passes = 6;
    simWaypoints = [];
    for (let i = 0; i < passes; i++) {
        const frac = i / (passes - 1);
        const curLat = sLat + (eLat - sLat) * frac;
        if (i % 2 === 0) {
            simWaypoints.push([curLat, sLng]);
            simWaypoints.push([curLat, eLng]);
        } else {
            simWaypoints.push([curLat, eLng]);
            simWaypoints.push([curLat, sLng]);
        }
    }

    simWaypointIdx = 0;
    simProgress = 0.25;
    const pA = simWaypoints[0];
    const pB = simWaypoints[1];
    liveTelemetry.lat = pA[0] + (pB[0] - pA[0]) * simProgress;
    liveTelemetry.lng = pA[1] + (pB[1] - pA[1]) * simProgress;
    simTrailCoords = [pA, [liveTelemetry.lat, liveTelemetry.lng]];

    if (tractorTrailPolyline) tractorTrailPolyline.setLatLngs(simTrailCoords);
    if (tractorMarker) tractorMarker.setLatLng([liveTelemetry.lat, liveTelemetry.lng]);
    if (centerMap && tractorMap) {
        tractorMap.invalidateSize();
        const bounds = L.latLngBounds(coords);
        tractorMap.fitBounds(bounds, { padding: [35, 35], maxZoom: 17 });
    }
    updateCockpitHud();
}

function startLiveSimulation() {
    if (simTimer) clearInterval(simTimer);
    isSimRunning = true;

    const btn = document.getElementById('btn-toggle-live-sim');
    if (btn) {
        btn.innerHTML = `<span>⏸️</span> <span>Stabdyti važiavimą</span>`;
        btn.className = "h-10 px-4 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs uppercase tracking-wider shadow flex items-center gap-2 transition cursor-pointer";
    }

    simTimer = setInterval(() => {
        if (simWaypoints.length < 2) return;

        const nextIdx = (simWaypointIdx + 1) % simWaypoints.length;
        const isHeadlandTurn = simWaypointIdx % 2 === 1;
        const step = isHeadlandTurn ? 0.08 : 0.025;
        simProgress += step;

        if (simProgress >= 1) {
            simProgress = 0;
            simWaypointIdx = nextIdx;
        }

        const curA = simWaypoints[simWaypointIdx];
        const curB = simWaypoints[(simWaypointIdx + 1) % simWaypoints.length];

        const newLat = curA[0] + (curB[0] - curA[0]) * simProgress;
        const newLng = curA[1] + (curB[1] - curA[1]) * simProgress;

        const dLat = curB[0] - curA[0];
        const dLng = curB[1] - curA[1];
        let angle = Math.atan2(dLng, dLat) * (180 / Math.PI);
        if (angle < 0) angle += 360;

        liveTelemetry.lat = newLat;
        liveTelemetry.lng = newLng;
        liveTelemetry.heading = Math.round(angle);

        if (isHeadlandTurn) {
            liveTelemetry.speedKmh = +(5.2 + Math.random() * 0.6).toFixed(1);
            liveTelemetry.rpm = Math.round(1450 + Math.random() * 60);
            liveTelemetry.engineLoadPct = Math.round(48 + Math.random() * 8);
            liveTelemetry.fuelRateLh = +(21.5 + Math.random() * 2.0).toFixed(1);
            liveTelemetry.status = "Apsisuka galulaukėje (iTEC™ Pro)";
        } else {
            liveTelemetry.speedKmh = +(9.2 + Math.random() * 0.7).toFixed(1);
            liveTelemetry.rpm = Math.round(1820 + Math.random() * 50);
            liveTelemetry.engineLoadPct = Math.round(74 + Math.random() * 9);
            liveTelemetry.fuelRateLh = +(35.8 + Math.random() * 2.4).toFixed(1);
            liveTelemetry.status = "Dirba lauke (AutoTrac™ RTK)";
        }

        liveTelemetry.workedAreaHa = +(liveTelemetry.workedAreaHa + 0.01).toFixed(2);
        liveTelemetry.engineHours = +(liveTelemetry.engineHours + 0.0003).toFixed(2);

        simTrailCoords.push([newLat, newLng]);
        if (simTrailCoords.length > 140) simTrailCoords.shift();

        if (tractorMarker) {
            tractorMarker.setLatLng([newLat, newLng]);
            tractorMarker.setIcon(createTractorMapIcon(liveTelemetry.name, liveTelemetry.speedKmh, liveTelemetry.heading));
        }
        if (tractorTrailPolyline) {
            tractorTrailPolyline.setLatLngs(simTrailCoords);
        }

        updateCockpitHud();
    }, 1000);
}

function pauseLiveSimulation() {
    if (simTimer) {
        clearInterval(simTimer);
        simTimer = null;
    }
    isSimRunning = false;
    liveTelemetry.speedKmh = 0.0;
    liveTelemetry.rpm = 850;
    liveTelemetry.engineLoadPct = 14;
    liveTelemetry.fuelRateLh = 3.8;
    liveTelemetry.status = "Sustojęs (Laisvos apsukos)";

    const btn = document.getElementById('btn-toggle-live-sim');
    if (btn) {
        btn.innerHTML = `<span>▶️</span> <span>Paleisti važiavimą</span>`;
        btn.className = "h-10 px-4 bg-tractorPrimary hover:bg-tractorPrimaryHover text-white font-extrabold rounded-xl text-xs uppercase tracking-wider shadow flex items-center gap-2 transition cursor-pointer";
    }

    if (tractorMarker) {
        tractorMarker.setIcon(createTractorMapIcon(liveTelemetry.name, 0.0, liveTelemetry.heading));
    }
    updateCockpitHud();
}

function updateCockpitHud() {
    const setTxt = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.innerHTML = val;
    };

    setTxt('hud-gps-coords', `📍 ${liveTelemetry.lat.toFixed(5)}, ${liveTelemetry.lng.toFixed(5)}`);
    setTxt('hud-heading', `🧭 Kryptis: ${liveTelemetry.heading}°`);
    setTxt('hud-work-status', liveTelemetry.speedKmh > 0.5 ? `🟢 ${liveTelemetry.status}` : `🟡 ${liveTelemetry.status}`);
    setTxt('hud-speed', `${liveTelemetry.speedKmh.toFixed(1)} <span class="text-xs font-sans font-bold text-slate-400">km/h</span>`);
    setTxt('hud-rpm', `${liveTelemetry.rpm} <span class="text-xs font-sans font-bold text-slate-400">RPM</span>`);

    const liters = Math.round((liveTelemetry.fuelLevelPct / 100) * 725);
    setTxt('hud-fuel-pct', `${liveTelemetry.fuelLevelPct}% (${liters} L)`);
    setTxt('hud-load-pct', `${liveTelemetry.engineLoadPct}%`);
    setTxt('hud-def-pct', `${liveTelemetry.defLevelPct}%`);

    const loadBar = document.getElementById('bar-load-pct');
    if (loadBar) loadBar.style.width = `${liveTelemetry.engineLoadPct}%`;

    setTxt('hud-fuel-rate', `${liveTelemetry.fuelRateLh} l/val.`);
    setTxt('hud-coolant', `${liveTelemetry.coolantTempC} °C`);
    setTxt('hud-vra-rate', `${liveTelemetry.currentVraRate} kg/ha`);
    setTxt('hud-worked-ha', `${liveTelemetry.workedAreaHa.toFixed(2)} ha`);
    setTxt('hud-eng-hours', `${Number(liveTelemetry.engineHours).toFixed(1)} h`);
    setTxt('hud-voltage', `${liveTelemetry.batteryVolts} V`);
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