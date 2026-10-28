// js/ukis/smartDevices.js
import { db, auth } from '../core/firebase.js';
import { showBottomToast, showDialog } from '../core/ui.js';
import { openAuthModal } from '../core/auth.js';

let cachedElecHours = [];
let unsubscribeElec = null;
let unsubscribeDevices = null;

let userDevicesList = [];
let selectedDevice = null;

export function initSmartDevicesTab(currentUser, userData) {
    const container = document.getElementById('view-tab-fields');
    if (!container) return;

    container.innerHTML = `
        <div class="space-y-5 w-full">
            
            <!-- ANTRAŠTĖ IR + PRIDĖTI ĮRENGINĮ -->
            <div class="border-b border-tractorBorder pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div class="space-y-1">
                    <div class="inline-flex items-center gap-1.5 bg-green-500/15 border border-green-500/30 text-green-600 dark:text-green-400 text-xs px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider">
                        <span>⚡</span> Ūkio IoT ir Nord Pool Automatika
                    </div>
                    <h2 class="font-oswald text-2xl md:text-3xl font-bold uppercase tracking-wider flex items-center gap-2" style="color: var(--text-main);">
                        <span>🏠</span> Išmanieji Įrenginiai
                    </h2>
                    <p class="text-xs md:text-sm text-slate-300">
                        Valdykite ūkio ir namų šilumos siurblius bei būsimus grūdų bokštų ventiliatorius automatiškai pagal pigiausias Nord Pool elektros valandas.
                    </p>
                </div>

                <button type="button" id="btn-open-add-device-modal" class="h-11 px-5 bg-tractorPrimary hover:bg-tractorPrimaryHover text-white font-extrabold text-xs md:text-sm rounded-xl flex items-center justify-center gap-2 shadow-lg transition cursor-pointer whitespace-nowrap shrink-0 self-start sm:self-auto">
                    <span>➕</span> <span>Pridėti išmanųjį įrenginį</span>
                </button>
            </div>

            <!-- PRIJUNGTŲ ĮRENGINIŲ SĄRAŠAS -->
            <div class="bg-tractorSurface border border-tractorBorder rounded-2xl p-4 sm:p-6 shadow-xl space-y-4">
                <div class="flex items-center justify-between border-b border-tractorBorder/70 pb-3">
                    <h3 class="font-oswald text-lg md:text-xl font-bold uppercase tracking-wider flex items-center gap-2" style="color: var(--text-main);">
                        <span>🔌</span> <span>Mano Prijungti Įrenginiai</span>
                        <span id="smart-devices-count" class="bg-tractorPrimary/20 text-green-700 dark:text-green-400 px-2.5 py-0.5 rounded-full text-xs font-mono font-bold">0</span>
                    </h3>
                    <span class="text-xs text-slate-400">Spauskite ant įrenginio valdymo pultui atverti</span>
                </div>

                <div id="smart-devices-list" class="space-y-3">
                    <div class="text-center py-8 text-slate-500 text-xs">Kraunami išmanieji įrenginiai...</div>
                </div>
            </div>

        </div>

        <!-- 1 BOTTOM SHEET: ➕ PRIDĖTI NAUJĄ IŠMANŲJĮ ĮRENGINĮ -->
        <div id="add-smart-device-modal" class="fixed inset-0 bg-black/80 z-[130] hidden flex flex-col justify-end items-center p-0 backdrop-blur-sm transition-all duration-300">
            <div class="bg-tractorSurface border-t-2 border-x-2 border-b-0 border-tractorBorder rounded-t-3xl rounded-b-none p-5 sm:p-7 pb-10 max-w-xl w-full space-y-4 shadow-2xl relative">
                <div class="flex justify-between items-center border-b border-tractorBorder/70 pb-3">
                    <div class="flex items-center gap-2">
                        <span class="text-xl">➕</span>
                        <h3 class="font-oswald text-lg sm:text-xl font-bold uppercase tracking-wider" style="color: var(--text-main);">
                            Pridėti Išmanųjį Įrenginį
                        </h3>
                    </div>
                    <button type="button" id="btn-close-add-device-modal" class="text-slate-400 hover:text-white text-2xl font-bold cursor-pointer p-1 leading-none">&times;</button>
                </div>

                <div class="space-y-3.5 text-xs">
                    <div class="space-y-1">
                        <label class="text-[11px] font-bold text-tractorPrimaryLight uppercase block">1. Pasirinkite įrenginio tipą *</label>
                        <select id="sel-add-device-type" class="w-full h-11 bg-tractorBg border border-tractorBorder rounded-xl px-3 text-xs sm:text-sm font-bold outline-none cursor-pointer" style="color: var(--text-main);">
                            <option value="heatpump">🔥 Šilumos siurblys (Oras–Vanduo)</option>
                            <option value="silo_fan" disabled>🛢️ Grūdų bokšto ventiliatorius (Jau greitai)</option>
                            <option value="solar" disabled>☀️ Saulės elektrinės valdiklis (Jau greitai)</option>
                        </select>
                    </div>

                    <div class="space-y-1">
                        <label class="text-[11px] font-bold text-slate-400 uppercase block">2. Gamintojas ir sistema *</label>
                        <select id="sel-add-device-brand" class="w-full h-11 bg-tractorBg border border-tractorBorder rounded-xl px-3 text-xs sm:text-sm font-bold outline-none cursor-pointer" style="color: var(--text-main);">
                            <option value="daikin">🏠 Daikin Altherma (Onecta Cloud API)</option>
                        </select>
                    </div>

                    <div class="space-y-1">
                        <label class="text-[11px] font-bold text-slate-400 uppercase block">3. Įrenginio pavadinimas ūkyje *</label>
                        <input id="inp-add-device-name" type="text" value="Namo Daikin Altherma 3" placeholder="Pvz.: Namo šilumos siurblys"
                            class="w-full h-11 bg-tractorBg border border-tractorBorder rounded-xl px-3.5 text-xs sm:text-sm font-bold outline-none" style="color: var(--text-main);">
                    </div>

                    <div class="p-3 bg-tractorBg rounded-xl border border-tractorBorder text-[11px] text-slate-400 leading-relaxed">
                        ℹ️ Paspaudus mygtuką žemiau, būsite nukreipti į oficialų <strong>Daikin Onecta</strong> saugumo puslapį, kuriame vienu paspaudimu suteiksite JurgisAgro teisę nuskaityti daviklius ir valdyti šildymą pagal Nord Pool kainas.
                    </div>
                </div>

                <div class="pt-2">
                    <button type="button" id="btn-confirm-connect-daikin" class="w-full h-12 bg-tractorPrimary hover:bg-tractorPrimaryHover text-white font-extrabold rounded-xl text-xs sm:text-sm uppercase tracking-wider shadow-lg transition cursor-pointer flex items-center justify-center gap-2">
                        <span>🔗</span> <span>Prijungti per Daikin Cloud ➔</span>
                    </button>
                </div>
            </div>
        </div>

        <!-- 2 BOTTOM SHEET: PILNAS DAIKIN VALDYMO PULTAS IR GRAFIKAS -->
        <div id="daikin-control-sheet" class="fixed inset-0 bg-black/80 z-[140] hidden flex flex-col justify-end items-center p-0 backdrop-blur-sm transition-all duration-300">
            <div id="daikin-control-sheet-panel" class="bg-tractorSurface border-t-2 border-x-2 border-b-0 border-tractorBorder rounded-t-3xl rounded-b-none p-3.5 sm:p-5 md:p-6 pb-10 w-full max-w-7xl max-h-[94vh] overflow-y-auto space-y-3.5 shadow-2xl relative"></div>
        </div>
    `;

    setupSmartDevicesEvents(currentUser, userData);
    listenToSmartDevices(currentUser);
    listenToNordPoolForDaikin();
}

function listenToSmartDevices(currentUser) {
    const user = currentUser || auth.currentUser;
    if (!user) return;
    if (unsubscribeDevices) unsubscribeDevices();

    unsubscribeDevices = db.collection("user_smart_devices")
        .where("userId", "==", user.uid)
        .onSnapshot(snap => {
            userDevicesList = [];
            snap.forEach(doc => {
                userDevicesList.push({ ...doc.data(), id: doc.id });
            });

            const countEl = document.getElementById('smart-devices-count');
            if (countEl) countEl.textContent = userDevicesList.length;

            const listEl = document.getElementById('smart-devices-list');
            if (listEl) {
                listEl.innerHTML = renderDevicesListHtml();
                bindListCardEvents(user);
            }

            if (selectedDevice) {
                const refreshed = userDevicesList.find(d => d.id === selectedDevice.id);
                if (refreshed) {
                    selectedDevice = refreshed;
                    renderDeviceControlPanel(user);
                }
            }
        }, err => {
            console.warn("Klaida nuskaitant įrenginius:", err);
        });
}

function renderDevicesListHtml() {
    if (userDevicesList.length === 0) {
        return `
            <div class="py-10 text-center space-y-3 bg-tractorBg rounded-2xl border border-tractorBorder p-6">
                <span class="text-4xl block">🔌</span>
                <h4 class="font-bold text-base" style="color: var(--text-main);">Dar neturite prijungtų išmaniųjų įrenginių</h4>
                <p class="text-xs text-slate-400 max-w-md mx-auto">
                    Spauskite <strong>„➕ Pridėti išmanųjį įrenginį“</strong> viršuje ir prijunkite savo Daikin Altherma šilumos siurblį automatiniam valdymui pagal Nord Pool biržos kainas.
                </p>
            </div>
        `;
    }

    return userDevicesList.map(dev => {
        const tel = dev.telemetry || {};
        const cfg = dev.config || {};
        const isClimOn = tel.climateOnOff === 'on';
        const isDhwOn = tel.dhwOnOff === 'on';
        const waterTemp = tel.leavingWaterTemp !== null && tel.leavingWaterTemp !== undefined ? `${Number(tel.leavingWaterTemp).toFixed(1)} °C` : '-- °C';
        const outTemp = tel.outdoorTemp !== null && tel.outdoorTemp !== undefined ? `${tel.outdoorTemp > 0 ? '+' : ''}${Number(tel.outdoorTemp).toFixed(1)} °C` : '-- °C';
        const boilerTemp = tel.boilerTemp !== null && tel.boilerTemp !== undefined ? `${Number(tel.boilerTemp).toFixed(0)} °C` : '-- °C';

        let autoBadge = `<span class="text-slate-400">⚪ Autopilotas išjungtas</span>`;
        if (cfg.autopilotEnabled) {
            autoBadge = `<strong class="text-green-500 font-bold">⚡ 24/7 Pilna automatika</strong>`;
        } else if (cfg.manualApprovalActive && cfg.approvedUntilTimestamp && Date.now() <= cfg.approvedUntilTimestamp) {
            autoBadge = `<strong class="text-green-500 font-bold">✅ Grafikas patvirtintas (Aktyvus)</strong>`;
        }

        return `
            <div class="card-open-device-sheet bg-tractorBg border-2 border-tractorBorder hover:border-tractorPrimary rounded-2xl p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 transition cursor-pointer shadow-md" data-dev-id="${dev.id}">
                <div class="space-y-2 flex-1">
                    <div class="flex flex-wrap items-center gap-2.5">
                        <span class="text-2xl">${dev.type === 'heatpump' ? '🔥' : '🛢️'}</span>
                        <h4 class="font-oswald text-lg sm:text-xl font-bold uppercase tracking-wide" style="color: var(--text-main);">
                            ${dev.name || 'Išmanusis įrenginys'}
                        </h4>
                        <span class="text-xs bg-tractorSurface px-2.5 py-0.5 rounded-lg font-mono font-bold text-slate-400 border border-tractorBorder">
                            ${tel.modelInfo || 'Altherma 3'}
                        </span>
                        <span class="px-2.5 py-0.5 rounded-full text-xs font-bold ${tel.isOnline ? 'bg-green-500/15 text-green-600 dark:text-green-400 border border-green-500/30' : 'bg-slate-700 text-slate-300'}">
                            ${tel.isOnline ? '🟢 Online' : '⚪ Offline'}
                        </span>
                    </div>

                    <div class="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs sm:text-sm pt-0.5">
                        <span>🏠 Grindys: <strong class="${isClimOn ? 'text-green-600 dark:text-green-400' : 'text-slate-400'}">${isClimOn ? 'Įjungta' : 'Išjungta'} (${waterTemp})</strong></span>
                        <span>•</span>
                        <span>🌤️ Lauke: <strong class="text-blue-500 font-mono">${outTemp}</strong></span>
                        <span>•</span>
                        <span>🛢️ Boileris: <strong class="${isDhwOn ? 'text-green-600 dark:text-green-400' : 'text-amber-500'} font-mono">${boilerTemp} (${isDhwOn ? 'On' : 'Off'})</strong></span>
                        <span>•</span>
                        <span>${autoBadge} (${cfg.allowedHoursPerDay || 4} val./parą)</span>
                    </div>
                </div>

                <div class="flex items-center gap-2 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-tractorBorder/60">
                    <button type="button" class="btn-open-panel-action h-10 px-4 bg-tractorPrimary hover:bg-tractorPrimaryHover text-white font-extrabold rounded-xl text-xs uppercase tracking-wider flex items-center gap-1.5 shadow transition cursor-pointer">
                        <span>⚙️</span> <span>Valdymo pultas ➔</span>
                    </button>
                    <button type="button" class="btn-delete-device-action h-10 px-3 bg-red-950/20 hover:bg-red-950/40 border border-red-800/40 text-red-500 rounded-xl text-xs font-bold transition cursor-pointer flex items-center justify-center" data-dev-id="${dev.id}" title="Pašalinti įrenginį">
                        <span>🗑️</span>
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

function bindListCardEvents(currentUser) {
    const controlSheet = document.getElementById('daikin-control-sheet');

    document.querySelectorAll('.card-open-device-sheet').forEach(card => {
        card.onclick = (e) => {
            if (e.target.closest('.btn-delete-device-action')) return;
            const devId = card.getAttribute('data-dev-id');
            selectedDevice = userDevicesList.find(d => d.id === devId);
            if (selectedDevice) {
                renderDeviceControlPanel(currentUser);
                controlSheet?.classList.remove('hidden');
            }
        };
    });

    document.querySelectorAll('.btn-delete-device-action').forEach(btn => {
        btn.onclick = (e) => {
            e.stopPropagation();
            const devId = btn.getAttribute('data-dev-id');
            showDialog(
                "Pašalinti įrenginį?",
                "Ar tikrai norite pašalinti šį įrenginį iš JurgisAgro išmaniųjų įrenginių sąrašo?",
                "🗑️",
                async () => {
                    await db.collection("user_smart_devices").doc(devId).delete();
                    showBottomToast("Įrenginys sėkmingai pašalintas.");
                },
                true
            );
        };
    });
}

function renderDeviceControlPanel(currentUser) {
    const panel = document.getElementById('daikin-control-sheet-panel');
    if (!panel || !selectedDevice) return;

    const dev = selectedDevice;
    const tel = dev.telemetry || {};
    const cfg = dev.config || {};
    const baseline = dev.baselineSettings || { climateOnOff: "off", offset: -10, dhwOnOff: "off" };

    const isClimOn = tel.climateOnOff === 'on';
    const isDhwOn = tel.dhwOnOff === 'on';
    const isPowerfulOn = tel.dhwPowerful === 'on';
    const curOffset = Number(tel.currentOffset ?? -10);

    const outTempText = tel.outdoorTemp !== null && tel.outdoorTemp !== undefined ? `${tel.outdoorTemp > 0 ? '+' : ''}${Number(tel.outdoorTemp).toFixed(1)} °C` : '-- °C';
    const waterTempText = tel.leavingWaterTemp !== null && tel.leavingWaterTemp !== undefined ? `${Number(tel.leavingWaterTemp).toFixed(1)} °C` : '-- °C';
    const boilerTempText = tel.boilerTemp !== null && tel.boilerTemp !== undefined ? `${Number(tel.boilerTemp).toFixed(0)} °C` : '-- °C';

    // 🌟 PATIKRINAME AR VARTOTOJAS YRA ADMINISTRATORIUS (petrasmo@gmail.com)
    const isAdmin = currentUser?.email === "petrasmo@gmail.com";
    const nowTs = Date.now();
    const isManualActive = cfg.manualApprovalActive === true && cfg.approvedUntilTimestamp && nowTs <= cfg.approvedUntilTimestamp;

    const renderPowerBtn = (id, isOn, title) => `
        <button type="button" id="${id}" style="${isOn ? 'background-color: #2E7D32 !important; color: #FFFFFF !important; border: 2px solid #4CAF50 !important; box-shadow: 0 0 12px rgba(46, 125, 50, 0.5);' : 'background-color: var(--bg-surface) !important; color: #94A3B8 !important; border: 2px solid var(--border-color) !important;'}" class="w-11 h-11 rounded-full flex items-center justify-center transition-all duration-200 cursor-pointer hover:scale-105 active:scale-95 shrink-0" title="${title}">
            <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M18.36 6.64a9 9 0 1 1-12.73 0"></path>
                <line x1="12" y1="2" x2="12" y2="12"></line>
            </svg>
        </button>
    `;

    panel.innerHTML = `
        <div class="flex flex-wrap items-center justify-between gap-2 border-b border-tractorBorder/70 pb-2.5 sticky top-0 bg-tractorSurface z-10 pt-1">
            <div class="flex flex-wrap items-center gap-2">
                <span class="text-xl">🔥</span>
                <h3 class="font-oswald text-lg sm:text-xl font-bold uppercase tracking-wider" style="color: var(--text-main);">
                    ${dev.name} (${tel.modelInfo || 'EHBH08EF9W'})
                </h3>
                <span class="px-2.5 py-0.5 rounded-lg text-xs font-bold border bg-green-500/15 text-green-600 dark:text-green-400 border-green-500/40">
                    🟢 Online
                </span>
            </div>

            <div class="flex items-center gap-2">
                <button type="button" id="btn-sheet-refresh-now" class="h-9 px-3 bg-tractorBg hover:bg-tractorCard border border-tractorBorder rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1" style="color: var(--text-main);">
                    <span>🔄</span> <span>Nuskaityti dabar</span>
                </button>
                <button type="button" id="btn-sheet-close-control" class="w-9 h-9 rounded-xl bg-tractorBg hover:bg-tractorCard border border-tractorBorder text-slate-400 hover:text-white text-xl font-bold cursor-pointer flex items-center justify-center leading-none">&times;</button>
            </div>
        </div>

        <!-- 1. TIESIOGINIS ONECTA VALDYMAS -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-3 pt-2">
            <!-- KLIMATO KONTROLĖ -->
            <div class="bg-tractorBg border ${isClimOn ? 'border-green-500/80 ring-1 ring-green-500/30' : 'border-tractorBorder'} rounded-2xl p-3.5 space-y-2.5 shadow-sm flex flex-col justify-between">
                <div class="flex items-center justify-between gap-2 border-b border-tractorBorder/60 pb-2">
                    <div class="flex items-center gap-2.5 min-w-0">
                        ${renderPowerBtn('btn-sheet-climate-toggle', isClimOn, isClimOn ? 'Išjungti šildymą' : 'Įjungti šildymą')}
                        <div class="min-w-0">
                            <h3 class="font-oswald text-base font-bold uppercase leading-tight truncate" style="color: var(--text-main);">Klimato Kontrolė (Grindys)</h3>
                            <span class="text-xs font-bold ${isClimOn ? 'text-green-600 dark:text-green-400' : 'text-slate-400'}">
                                ${isClimOn ? '🟢 Įjungta (Onecta: On)' : '⚪ Išjungta (Onecta: Off)'}
                            </span>
                        </div>
                    </div>
                    <span class="px-2.5 py-1 rounded-lg bg-tractorSurface border border-tractorBorder text-xs font-bold shrink-0" style="color: var(--text-main);">☀️ Šildymas</span>
                </div>

                <div class="grid grid-cols-2 gap-2 text-xs">
                    <div class="bg-tractorSurface p-2.5 rounded-xl border border-tractorBorder text-center">
                        <span class="text-[10px] sm:text-[11px] text-slate-400 block font-bold uppercase">💧 Į grindis</span>
                        <strong class="font-mono text-base sm:text-lg font-black block mt-0.5" style="color: var(--text-main);">${waterTempText}</strong>
                    </div>
                    <div class="bg-tractorSurface p-2.5 rounded-xl border border-tractorBorder text-center">
                        <span class="text-[10px] sm:text-[11px] text-slate-400 block font-bold uppercase">🌤️ Lauke</span>
                        <strong class="font-mono text-base sm:text-lg font-black text-blue-500 block mt-0.5">${outTempText}</strong>
                    </div>
                </div>

                <div class="bg-tractorSurface px-3 py-2.5 rounded-xl border border-tractorBorder flex items-center justify-between gap-3 text-xs">
                    <div class="flex-1 space-y-1">
                        <div class="flex justify-between items-center">
                            <span class="font-bold text-slate-400 text-xs">Šildymo kreivės poslinkis:</span>
                            <strong id="lbl-sheet-offset" class="text-amber-500 font-mono text-base font-black">${curOffset > 0 ? '+' : ''}${curOffset} °C</strong>
                        </div>
                        <input id="inp-sheet-offset" type="range" min="-10" max="10" step="1" value="${curOffset}" class="w-full accent-tractorPrimary cursor-pointer h-2">
                    </div>
                    <button type="button" id="btn-sheet-send-offset" class="h-9 px-4 bg-tractorPrimary text-white rounded-xl font-bold text-xs cursor-pointer shadow shrink-0">Pakeisti</button>
                </div>
            </div>

            <!-- BOILERIS -->
            <div class="bg-tractorBg border ${isDhwOn ? 'border-green-500/80 ring-1 ring-green-500/30' : 'border-tractorBorder'} rounded-2xl p-3.5 space-y-2.5 shadow-sm flex flex-col justify-between">
                <div class="flex items-center justify-between gap-2 border-b border-tractorBorder/60 pb-2">
                    <div class="flex items-center gap-2.5 min-w-0">
                        ${renderPowerBtn('btn-sheet-dhw-toggle', isDhwOn, isDhwOn ? 'Išjungti boilerį' : 'Įjungti boilerį')}
                        <div class="min-w-0">
                            <h3 class="font-oswald text-base font-bold uppercase leading-tight truncate" style="color: var(--text-main);">Karšto Vandens Bakas (Boileris)</h3>
                            <span class="text-xs font-bold ${isDhwOn ? 'text-green-600 dark:text-green-400' : 'text-slate-400'}">
                                ${isDhwOn ? '🟢 Įjungtas (Onecta: On)' : '⚪ Išjungtas (Onecta: Off)'}
                            </span>
                        </div>
                    </div>
                    <span class="px-2.5 py-1 rounded-lg bg-tractorSurface border border-tractorBorder text-xs font-bold shrink-0" style="color: var(--text-main);">🛢️ DHW Bakas</span>
                </div>

                <div class="grid grid-cols-2 gap-2 text-xs">
                    <div class="bg-tractorSurface p-2.5 rounded-xl border border-tractorBorder text-center">
                        <span class="text-[10px] sm:text-[11px] text-slate-400 block font-bold uppercase">🌡️ Vanduo bake dabar</span>
                        <strong class="font-mono text-base sm:text-lg font-black text-amber-500 block mt-0.5">${boilerTempText}</strong>
                    </div>
                    <div class="bg-tractorSurface p-2.5 rounded-xl border border-tractorBorder text-center">
                        <span class="text-[10px] sm:text-[11px] text-slate-400 block font-bold uppercase">🎯 Palaikymo režimas</span>
                        <strong class="font-mono text-xs sm:text-sm font-bold block mt-1" style="color: var(--text-main);">Pagal grafiką (${tel.dhwTargetTemp || 30} °C)</strong>
                    </div>
                </div>

                <div class="bg-tractorSurface px-3 py-2.5 rounded-xl border border-tractorBorder flex items-center justify-between gap-3 text-xs">
                    <div class="flex items-center gap-2">
                        <span class="text-lg">💪</span>
                        <div>
                            <strong class="font-bold block text-xs sm:text-sm" style="color: var(--text-main);">Galingas režimas (Greitas užkaitinimas)</strong>
                            <span class="text-[11px] ${isPowerfulOn ? 'text-green-600 dark:text-green-400 font-bold' : 'text-slate-400'}">
                                ${isPowerfulOn ? '🟢 Aktyvus – maksimaliai šildo boilerį!' : 'Išjungtas – greitas vandens paruošimas'}
                            </span>
                        </div>
                    </div>
                    ${renderPowerBtn('btn-sheet-powerful-toggle', isPowerfulOn, isPowerfulOn ? 'Išjungti galingą režimą' : 'Įjungti galingą režimą')}
                </div>
            </div>
        </div>

        <!-- 2. AUTOMATINIO NORD POOL VALDYMO SVERTAI IR PATVIRTINIMAS -->
        <div class="bg-tractorBg border border-tractorBorder p-3.5 sm:p-4 rounded-2xl space-y-3.5 mt-3">
            
            <!-- VIRŠUS: ŽMOGAUS PATVIRTINIMO MYGTUKAS IR PILNA AUTOMATIKA -->
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-tractorBorder/60 pb-3">
                <div class="space-y-1">
                    <div class="flex items-center gap-2">
                        <span class="text-lg">⚡</span>
                        <h3 class="font-oswald text-base sm:text-lg font-bold uppercase tracking-wider" style="color: var(--text-main);">
                            Grafiko Vykdymas ir Saugumas
                        </h3>
                    </div>
                    <p class="text-xs text-slate-400">
                        Pagal nutylėjimą katilas vykdo grafiką tik žmogui patvirtinus. Pasibaigus grafikui – katilas <strong>automatiškai atstatomas į pradines reikšmes (Poslinkis: ${baseline.offset}°C, Šildymas: ${baseline.climateOnOff})</strong>.
                    </p>
                </div>

                <!-- 🌟 MYGTUKAI: PATVIRTINTI / ATŠAUKTI -->
                <div class="flex items-center gap-2 shrink-0">
                    ${isManualActive ? `
                        <button type="button" id="btn-cancel-approval" style="background-color: #DC2626 !important; color: #FFFFFF !important;" class="h-11 px-4 font-bold text-xs rounded-xl shadow transition cursor-pointer flex items-center gap-1.5 hover:opacity-90">
                            <span>🛑</span> <span>Atšaukti grafiką (Atstatyti į bazę)</span>
                        </button>
                    ` : `
                        <button type="button" id="btn-approve-schedule-manually" class="h-11 px-5 bg-tractorPrimary hover:bg-tractorPrimaryHover text-white font-extrabold text-xs sm:text-sm rounded-xl shadow-lg transition cursor-pointer flex items-center gap-2">
                            <span>✅</span> <span>Patvirtinti grafiką (Vykdyti)</span>
                        </button>
                    `}
                </div>
            </div>

            <!-- PILNA AUTOMATIKA VARNELĖ (TIK ADMINUI!) -->
            <div class="bg-tractorSurface p-3 rounded-xl border border-tractorBorder flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs">
                <div class="flex items-center gap-2.5">
                    <input type="checkbox" id="chk-full-auto-toggle" class="w-4 h-4 accent-tractorPrimary cursor-pointer" ${cfg.autopilotEnabled ? 'checked' : ''} ${isAdmin ? '' : 'disabled'}>
                    <div>
                        <strong class="font-bold block" style="color: var(--text-main);">⚡ Pilna automatika (24/7 Autopilotas be žmogaus patvirtinimo)</strong>
                        <span class="text-[11px] text-slate-400">
                            ${isAdmin ? '👑 Jūs esate administratorius – galite įjungti nuolatinį 24/7 valdymą be rankinio patvirtinimo.' : '🔒 Funkcija užrakinta (Tik administratoriui). Naudokite rankinį patvirtinimą „Patvirtinti grafiką“ viršuje.'}
                        </span>
                    </div>
                </div>

                <div class="flex items-center gap-1 bg-tractorBg p-1 rounded-xl border border-tractorBorder shrink-0">
                    <button type="button" class="btn-sheet-profile px-3 py-1 rounded-lg text-xs font-bold ${cfg.modeProfile === 'unoccupied' ? 'bg-tractorPrimary text-white shadow' : 'text-slate-400'}" data-profile="unoccupied">❄️ Negyvenamas namas</button>
                    <button type="button" class="btn-sheet-profile px-3 py-1 rounded-lg text-xs font-bold ${cfg.modeProfile === 'comfort' ? 'bg-tractorPrimary text-white shadow' : 'text-slate-400'}" data-profile="comfort">🏠 Gyvenamas</button>
                </div>
            </div>

            <!-- SVERTAI -->
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pt-1">
                <div class="bg-tractorSurface p-3 rounded-xl border border-tractorBorder space-y-1">
                    <div class="flex justify-between items-center">
                        <label class="font-bold text-slate-400 text-xs">⏱️ Šildymo val. / parą:</label>
                        <strong id="lbl-sheet-hours" class="font-mono font-black text-sm text-green-600 dark:text-green-400">${cfg.allowedHoursPerDay || 4} val.</strong>
                    </div>
                    <input id="inp-sheet-hours" type="range" min="0" max="24" step="1" value="${cfg.allowedHoursPerDay || 4}" class="w-full accent-tractorPrimary cursor-pointer h-2">
                </div>

                <div class="bg-tractorSurface p-3 rounded-xl border border-tractorBorder space-y-1">
                    <div class="flex justify-between items-center">
                        <label class="font-bold text-slate-400 text-xs">🔥 Poslinkis pigią val.:</label>
                        <strong id="lbl-sheet-cheap-offset" class="font-mono font-black text-sm" style="color: var(--text-main);">${(cfg.cheapHourOffset || -5) > 0 ? '+' : ''}${cfg.cheapHourOffset || -5} °C</strong>
                    </div>
                    <input id="inp-sheet-cheap-offset" type="range" min="-10" max="10" step="1" value="${cfg.cheapHourOffset || -5}" class="w-full accent-tractorPrimary cursor-pointer h-2">
                </div>

                <div class="bg-tractorSurface p-3 rounded-xl border border-tractorBorder flex flex-col justify-between space-y-1.5">
                    <select id="sel-sheet-action" class="w-full h-8 bg-tractorBg border border-tractorBorder rounded-lg px-2 text-xs font-bold outline-none cursor-pointer" style="color: var(--text-main);">
                        <option value="standby" ${cfg.normalHourAction === 'standby' ? 'selected' : ''}>💤 Brangiomis: Išjungti (0 kW)</option>
                        <option value="offset_minus_10" ${cfg.normalHourAction === 'offset_minus_10' ? 'selected' : ''}>📉 Brangiomis: Poslinkis -10 °C</option>
                        <option value="offset_minus_5" ${cfg.normalHourAction === 'offset_minus_5' ? 'selected' : ''}>📉 Brangiomis: Poslinkis -5 °C</option>
                    </select>
                    <button type="button" id="btn-save-device-config" class="w-full h-8 bg-tractorPrimary hover:bg-tractorPrimaryHover text-white font-bold rounded-lg text-xs uppercase tracking-wider transition cursor-pointer shadow">
                        💾 Išsaugoti svertus
                    </button>
                </div>
            </div>
        </div>

        <!-- 3. GRAFIKO LENTELĖS (ŠIANDIEN IR RYTOJ) -->
        <div class="space-y-2.5 pt-2">
            <div class="flex flex-wrap items-center justify-between gap-2 border-b border-tractorBorder/60 pb-1.5">
                <h3 class="font-oswald text-sm sm:text-base font-bold uppercase tracking-wider flex items-center gap-1.5" style="color: var(--text-main);">
                    <span>📅</span> Suplanuotas Katilo Darbo Grafikas (Šiandien ir Rytoj)
                </h3>
                <span id="daikin-plan-summary" class="text-xs sm:text-sm font-mono font-bold text-green-600 dark:text-green-400">Skaičiuojamas planas...</span>
            </div>
            <div id="daikin-schedule-tables-box" class="grid grid-cols-1 lg:grid-cols-2 gap-4"></div>
        </div>
    `;

    bindSheetActionButtons(currentUser);
    renderDaikinScheduleGrid();
}

function bindSheetActionButtons(currentUser) {
    const dev = selectedDevice;
    if (!dev) return;

    const controlSheet = document.getElementById('daikin-control-sheet');
    document.getElementById('btn-sheet-close-control')?.addEventListener('click', () => {
        controlSheet?.classList.add('hidden');
    });

    document.getElementById('btn-sheet-climate-toggle')?.addEventListener('click', () => {
        const nextState = dev.telemetry?.climateOnOff === 'on' ? 'off' : 'on';
        executeDirectCommand(currentUser, { climateOnOff: nextState }, nextState === 'on' ? "Grindų šildymas ĮJUNGTAS! 🔥" : "Grindų šildymas IŠJUNGTAS! 💤");
    });

    const offsetSlider = document.getElementById('inp-sheet-offset');
    const offsetLbl = document.getElementById('lbl-sheet-offset');
    if (offsetSlider && offsetLbl) {
        offsetSlider.oninput = (e) => {
            const v = parseInt(e.target.value, 10) || 0;
            offsetLbl.textContent = `${v > 0 ? '+' + v : v} °C`;
        };
    }

    document.getElementById('btn-sheet-send-offset')?.addEventListener('click', () => {
        const val = parseInt(document.getElementById('inp-sheet-offset')?.value || '0', 10);
        executeDirectCommand(currentUser, { offset: val }, `Šildymo poslinkis pakeistas į ${val > 0 ? '+' + val : val} °C! ⚙️`);
    });

    document.getElementById('btn-sheet-dhw-toggle')?.addEventListener('click', () => {
        const nextState = dev.telemetry?.dhwOnOff === 'on' ? 'off' : 'on';
        executeDirectCommand(currentUser, { dhwOnOff: nextState }, nextState === 'on' ? "Karšto vandens bakas (Boileris) ĮJUNGTAS! 🛢️🔥" : "Karšto vandens bakas IŠJUNGTAS! 🛢️💤");
    });

    document.getElementById('btn-sheet-powerful-toggle')?.addEventListener('click', () => {
        const nextState = dev.telemetry?.dhwPowerful === 'on' ? 'off' : 'on';
        if (nextState === 'on' && dev.telemetry?.dhwOnOff !== 'on') {
            executeDirectCommand(currentUser, { dhwOnOff: 'on', dhwPowerful: 'on' }, "Boileris ir 💪 GALINGAS REŽIMAS įjungti!");
        } else {
            executeDirectCommand(currentUser, { dhwPowerful: nextState }, nextState === 'on' ? "💪 Galingas režimas ĮJUNGTAS!" : "💪 Galingas režimas išjungtas.");
        }
    });

    document.getElementById('btn-sheet-refresh-now')?.addEventListener('click', async () => {
        if (!currentUser) return;
        showBottomToast("Nuskaitomi katilo duomenys... 🔄", "info");
        try {
            const res = await fetch(`https://us-central1-neighborpm-b9968.cloudfunctions.net/refreshDaikinStatus?userId=${currentUser.uid}`);
            const data = await res.json();
            if (data && data.success) {
                showBottomToast("Katilo ir boilerio duomenys atnaujinti! 🌡️");
            }
        } catch (e) {
            showBottomToast("Nepavyko susisiekti su katilu", "error");
        }
    });

    // 🌟 1. MYGTUKAS: RANKINIS GRAFIKO PATVIRTINIMAS (GALIOJA IKI RENGINIŲ PABAIGOS)
    document.getElementById('btn-approve-schedule-manually')?.addEventListener('click', async () => {
        if (!currentUser || !dev) return;

        // Galioja iki šiandienos (arba rytojaus, jei rodomas) 23:59:59 val.
        const endOfDay = new Date();
        endOfDay.setHours(23, 59, 59, 999);
        const approvalTs = endOfDay.getTime();

        await db.collection("user_smart_devices").doc(dev.id).update({
            "config.manualApprovalActive": true,
            "config.approvedUntilTimestamp": approvalTs,
            "config.wasRolledBack": false
        });

        if (dev.config) {
            dev.config.manualApprovalActive = true;
            dev.config.approvedUntilTimestamp = approvalTs;
        }

        renderDeviceControlPanel(currentUser);
        showBottomToast("Grafikas patvirtintas rankiniu būdu! Katilas vykdys šį grafiką. ✅⚡");
    });

    // 🌟 2. MYGTUKAS: GRAFIKO ATŠAUKIMAS IR GREITASIS ROLLBACK Į BAZĘ
    document.getElementById('btn-cancel-approval')?.addEventListener('click', async () => {
        if (!currentUser || !dev) return;

        const baseline = dev.baselineSettings || { climateOnOff: "off", offset: -10, dhwOnOff: "off" };

        showBottomToast("Atšaukiama... Katilas atstatomas į pirminę būseną ↩️", "info");

        await db.collection("user_smart_devices").doc(dev.id).update({
            "config.manualApprovalActive": false,
            "config.autopilotEnabled": false,
            "config.approvedUntilTimestamp": null
        });

        // Iš karto siunčiame atstatymo komandą į katilą!
        await executeDirectCommand(
            currentUser,
            {
                climateOnOff: baseline.climateOnOff,
                offset: baseline.offset,
                dhwOnOff: baseline.dhwOnOff
            },
            `Grafikas atšauktas! Katilas saugiai grąžintas į pradinę būseną (Poslinkis: ${baseline.offset}°C, Šildymas: ${baseline.climateOnOff}). 🛡️`
        );

        if (dev.config) {
            dev.config.manualApprovalActive = false;
            dev.config.autopilotEnabled = false;
        }

        renderDeviceControlPanel(currentUser);
    });

    // 🌟 3. PILNA AUTOMATIKA (TIK ADMINUI petrasmo@gmail.com)
    document.getElementById('chk-full-auto-toggle')?.addEventListener('change', async (e) => {
        if (!currentUser || !dev) return;
        const val = e.target.checked;

        await db.collection("user_smart_devices").doc(dev.id).update({
            "config.autopilotEnabled": val,
            "config.wasRolledBack": false
        });

        if (dev.config) dev.config.autopilotEnabled = val;
        renderDeviceControlPanel(currentUser);
        showBottomToast(val ? "⚡ Pilna 24/7 automatika ĮJUNGTA (Admin)!" : "Pilna automatika išjungta.");
    });

    const inpHours = document.getElementById('inp-sheet-hours');
    const lblHours = document.getElementById('lbl-sheet-hours');
    const inpCheapOffset = document.getElementById('inp-sheet-cheap-offset');
    const lblCheapOffset = document.getElementById('lbl-sheet-cheap-offset');

    inpHours?.addEventListener('input', (e) => {
        if (lblHours) lblHours.textContent = `${e.target.value} val.`;
        if (dev.config) dev.config.allowedHoursPerDay = parseInt(e.target.value, 10);
        renderDaikinScheduleGrid();
    });

    inpCheapOffset?.addEventListener('input', (e) => {
        const v = parseInt(e.target.value, 10);
        if (lblCheapOffset) lblCheapOffset.textContent = `${v > 0 ? '+' : ''}${v} °C`;
        if (dev.config) dev.config.cheapHourOffset = v;
        renderDaikinScheduleGrid();
    });

    document.querySelectorAll('.btn-sheet-profile').forEach(btn => {
        btn.onclick = () => {
            const prof = btn.getAttribute('data-profile');
            if (prof === 'unoccupied') {
                dev.config.allowedHoursPerDay = 3;
                dev.config.cheapHourOffset = -8;
                dev.config.normalHourAction = 'standby';
            } else {
                dev.config.allowedHoursPerDay = 16;
                dev.config.cheapHourOffset = 1;
                dev.config.normalHourAction = 'offset_minus_5';
            }
            dev.config.modeProfile = prof;
            renderDeviceControlPanel(currentUser);
        };
    });

    document.getElementById('btn-save-device-config')?.addEventListener('click', async () => {
        const hours = parseInt(inpHours?.value || '4', 10);
        const cheapOffset = parseInt(inpCheapOffset?.value || '-5', 10);
        const action = document.getElementById('sel-sheet-action')?.value || 'standby';

        const updatedConfig = {
            ...dev.config,
            allowedHoursPerDay: hours,
            cheapHourOffset: cheapOffset,
            normalHourAction: action
        };

        await db.collection("user_smart_devices").doc(dev.id).update({
            config: updatedConfig
        });
        dev.config = updatedConfig;
        showBottomToast("Svertai sėkmingai išsaugoti! 💾⚡");
    });
}

async function executeDirectCommand(currentUser, cmdPayload, successMsg) {
    if (!currentUser || !selectedDevice) return;
    showBottomToast("Siunčiama komanda į Daikin katilą (~5 sek.)... 📡", "info");
    try {
        const res = await fetch("https://us-central1-neighborpm-b9968.cloudfunctions.net/controlDaikinPump", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                userId: currentUser.uid,
                deviceId: selectedDevice.telemetry?.deviceId,
                ...cmdPayload
            })
        });
        const data = await res.json();
        if (data && data.success) {
            selectedDevice.telemetry = { ...selectedDevice.telemetry, ...data.telemetry };
            renderDeviceControlPanel(currentUser);
            showBottomToast(successMsg || "Komanda sėkmingai įvykdyta! ✅");
        } else {
            showBottomToast("Daikin atsakymas: " + (data.error || "Nepavyko"), "error");
        }
    } catch (err) {
        showBottomToast("Klaida siunčiant komandą: " + err.message, "error");
    }
}

function setupSmartDevicesEvents(currentUser) {
    const addModal = document.getElementById('add-smart-device-modal');
    const openAddBtn = document.getElementById('btn-open-add-device-modal');
    const closeAddBtn = document.getElementById('btn-close-add-device-modal');
    const confirmConnectBtn = document.getElementById('btn-confirm-connect-daikin');

    if (openAddBtn && addModal) openAddBtn.onclick = () => addModal.classList.remove('hidden');
    if (closeAddBtn && addModal) closeAddBtn.onclick = () => addModal.classList.add('hidden');
    if (addModal) addModal.onclick = (e) => { if (e.target === addModal) addModal.classList.add('hidden'); };

    if (confirmConnectBtn) {
        confirmConnectBtn.onclick = async () => {
            if (!currentUser) {
                openAuthModal('login');
                return;
            }
            confirmConnectBtn.innerHTML = "<span>⏳</span> <span>Nukreipiama į Daikin...</span>";
            try {
                const res = await fetch(`https://us-central1-neighborpm-b9968.cloudfunctions.net/getDaikinAuthUrl?userId=${currentUser.uid}`);
                const data = await res.json();
                if (data && data.url) {
                    window.location.href = data.url;
                }
            } catch (err) {
                showBottomToast("Klaida: " + err.message, "error");
            }
        };
    }
}

function listenToNordPoolForDaikin() {
    if (unsubscribeElec) unsubscribeElec();

    unsubscribeElec = db.collection("electricity_prices").doc("market_data").onSnapshot(doc => {
        if (doc.exists) {
            cachedElecHours = doc.data().hours || [];
            renderDaikinScheduleGrid();
        }
    });
}

function formatCleanCt(val) {
    if (Math.abs(val) < 0.005) return "0";
    if (Math.abs(val) < 0.1) return parseFloat(val.toFixed(2)).toString().replace('.', ',');
    return parseFloat(val.toFixed(1)).toString().replace('.', ',');
}

function renderDaikinScheduleGrid() {
    const tablesBox = document.getElementById('daikin-schedule-tables-box');
    const summaryEl = document.getElementById('daikin-plan-summary');
    if (!tablesBox || cachedElecHours.length === 0 || !selectedDevice) return;

    const dev = selectedDevice;
    const cfg = dev.config || {};
    const allowedCount = Math.min(24, Math.max(0, cfg.allowedHoursPerDay || 4));
    const cheapOffset = cfg.cheapHourOffset ?? -5;

    const now = new Date();
    let todayStr = now.toLocaleDateString('lt-LT', { timeZone: 'Europe/Vilnius', year: 'numeric', month: '2-digit', day: '2-digit' });
    const currentHourInt = parseInt(now.toLocaleTimeString('en-GB', { timeZone: 'Europe/Vilnius', hour: '2-digit', hour12: false }), 10);

    const dateCounts = {};
    cachedElecHours.forEach(h => { dateCounts[h.date] = (dateCounts[h.date] || 0) + 1; });
    const fullDates = Object.keys(dateCounts).filter(d => dateCounts[d] >= 20).sort();

    if (fullDates.length === 0) return;
    if (!fullDates.includes(todayStr)) todayStr = fullDates[0];

    const todayIdx = fullDates.indexOf(todayStr);
    const tomorrowStr = fullDates[todayIdx + 1] || null;

    const buildDayTableHtml = (dateStr, titlePrefix) => {
        if (!dateStr) {
            return `
                <div class="bg-tractorBg border border-tractorBorder rounded-2xl overflow-hidden flex flex-col">
                    <div class="bg-tractorSurface px-4 py-3 border-b border-tractorBorder flex justify-between items-center">
                        <strong class="font-oswald text-base sm:text-lg uppercase tracking-wider" style="color: var(--text-main);">⏭️ RYTOJ</strong>
                        <span class="text-xs text-slate-400">Nuo 14:00–15:00 val.</span>
                    </div>
                    <div class="p-8 text-center text-xs sm:text-sm text-slate-400 my-auto space-y-1.5">
                        <span class="text-3xl block">⏳</span>
                        <strong class="block text-base" style="color: var(--text-main);">Rytojaus kainos dar nepaskelbtos</strong>
                        <span>Nord Pool birža kitos paros valandines kainas pateikia po 14:00 val.</span>
                    </div>
                </div>
            `;
        }

        const dayHours = cachedElecHours.filter(h => h.date === dateStr);
        const sortedDay = [...dayHours].sort((a, b) => a.priceCtNoVat - b.priceCtNoVat);
        const cheapSet = new Set(sortedDay.slice(0, allowedCount).map(h => h.hour));

        const rowsHtml = dayHours.map(h => {
            const isCurrent = (dateStr === todayStr && h.hour === currentHourInt);
            const isSelectedToHeat = cheapSet.has(h.hour);
            const pCt = h.priceCtNoVat;

            let actionBadge = "";
            if (isSelectedToHeat) {
                actionBadge = `
                    <span class="inline-flex items-center gap-1 px-2.5 sm:px-3 py-1 rounded-lg bg-green-500/20 text-green-700 dark:text-green-400 border border-green-500/40 font-extrabold text-xs sm:text-sm">
                        <span>🔥</span> <span>ŠILDYS (${cheapOffset > 0 ? '+' : ''}${cheapOffset}°C)</span>
                    </span>
                `;
            } else {
                let offLabel = 'IŠJUNGTA (0 kW)';
                let offIcon = '💤';
                if (cfg.normalHourAction === 'offset_minus_10') { offLabel = 'MIEGA (-10°C)'; offIcon = '📉'; }
                else if (cfg.normalHourAction === 'offset_minus_5') { offLabel = 'MIEGA (-5°C)'; offIcon = '📉'; }

                actionBadge = `
                    <span class="inline-flex items-center gap-1 px-2.5 sm:px-3 py-1 rounded-lg bg-slate-500/10 text-slate-500 dark:text-slate-400 border border-slate-500/30 font-bold text-xs sm:text-sm">
                        <span>${offIcon}</span> <span>${offLabel}</span>
                    </span>
                `;
            }

            const rowHighlight = isCurrent ? "bg-tractorPrimary/15 border-l-4 border-l-tractorPrimary font-bold" : "";

            return `
                <tr class="border-b border-tractorBorder/60 hover:bg-tractorSurface/70 transition ${rowHighlight}">
                    <td class="py-2 sm:py-2.5 px-3 sm:px-4 whitespace-nowrap">
                        <div class="flex items-center gap-1.5">
                            <span class="font-mono text-base sm:text-lg font-black" style="color: var(--text-main);">${h.hourLabel}</span>
                            ${isCurrent ? `<span class="px-1.5 py-0.5 rounded bg-tractorPrimary text-white text-[10px] font-black uppercase leading-none">Dabar</span>` : ''}
                        </div>
                    </td>
                    <td class="py-2 sm:py-2.5 px-2 sm:px-4 whitespace-nowrap">
                        <span class="font-mono text-base sm:text-lg font-black" style="color: var(--text-main);">${formatCleanCt(pCt)}</span>
                        <span class="text-xs sm:text-sm font-bold text-green-600 dark:text-green-400 ml-0.5">ct/kWh</span>
                    </td>
                    <td class="py-2 sm:py-2.5 px-3 sm:px-4 text-right whitespace-nowrap">
                        ${actionBadge}
                    </td>
                </tr>
            `;
        }).join('');

        return `
            <div class="bg-tractorBg border border-tractorBorder rounded-2xl overflow-hidden shadow-sm">
                <div class="bg-tractorSurface px-4 py-3 border-b border-tractorBorder flex justify-between items-center">
                    <strong class="font-oswald text-base sm:text-lg uppercase tracking-wider" style="color: var(--text-main);">
                        ${titlePrefix} (${dateStr.slice(8)} d.)
                    </strong>
                    <span class="text-xs sm:text-sm text-slate-400 font-mono font-bold">${dateStr}</span>
                </div>
                <table class="w-full text-left border-collapse">
                    <thead>
                        <tr class="border-b border-tractorBorder bg-tractorSurface/50 text-xs uppercase font-bold text-slate-400">
                            <th class="py-2 px-3 sm:px-4">Valanda</th>
                            <th class="py-2 px-2 sm:px-4">Nord Pool kaina</th>
                            <th class="py-2 px-3 sm:px-4 text-right">Katilo būsena</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rowsHtml}
                    </tbody>
                </table>
            </div>
        `;
    };

    tablesBox.innerHTML = `
        ${buildDayTableHtml(todayStr, '📅 ŠIANDIEN')}
        ${buildDayTableHtml(tomorrowStr, '⏭️ RYTOJ')}
    `;
}