// js/ukis/smartDevices.js
import { db } from '../core/firebase.js';
import { showBottomToast, showDialog } from '../core/ui.js';
import { openAuthModal } from '../core/auth.js';
import { renderDaikinControlTabHtml, bindDaikinControlEvents, renderDaikinScheduleGrid } from './daikinControlTab.js';
import { renderDaikinEnergyTabHtml, bindDaikinEnergyEvents } from './daikinEnergyTab.js';
import { renderSiloControlTabHtml, bindSiloControlEvents, renderSiloScheduleGrid } from './siloControlTab.js';

let cachedElecHours = [];
let unsubscribeElec = null;
let unsubscribeDevices = null;
let userDevicesList = [];
let selectedDevice = null;
let activeModalSubTab = 'control';
let lastAutoSyncTime = 0;
let cachedUserData = null;

export function initSmartDevicesTab(currentUser, userData) {
    cachedUserData = userData;
    const container = document.getElementById('view-tab-fields');
    if (!container) return;

    container.innerHTML = `
        <div class="space-y-5 w-full">
            
            <!-- ANTRAŠTĖ IR + PRIDĖTI ĮRENGINĮ -->
            <div class="border-b border-tractorBorder pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div class="space-y-1">
                    <div class="inline-flex items-center gap-1.5 bg-green-500/15 border border-green-500/30 text-green-600 dark:text-green-400 text-xs px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider">
                        <span>⚡</span> Ūkio IoT, EMC ir Nord Pool Automatika
                    </div>
                    <h2 class="font-oswald text-2xl md:text-3xl font-bold uppercase tracking-wider flex items-center gap-2" style="color: var(--text-main);">
                        <span>🏠</span> Išmanieji Įrenginiai ir Grūdų Bokštai
                    </h2>
                    <p class="text-xs md:text-sm text-slate-300">
                        Valdykite grūdų bokštų ventiliatorius (Shelly IoT) ir šilumos siurblius (Daikin) automatiškai pagal EMC oro drėgmę ir Nord Pool elektros kainas.
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
            <div class="bg-tractorSurface border-t-2 border-x-2 border-b-0 border-tractorBorder rounded-t-3xl rounded-b-none p-5 sm:p-7 pb-10 max-w-xl w-full space-y-4 shadow-2xl relative max-h-[92vh] overflow-y-auto">
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
                            <option value="silo_fan">🛢️ Grūdų bokšto ventiliatorius (Shelly 1PM Mini Gen3 / Cloud)</option>
                            <option value="heatpump">🔥 Šilumos siurblys (Daikin Altherma Cloud)</option>
                        </select>
                    </div>

                    <!-- A FORMA: SHELLY GRŪDŲ BOKŠTUI -->
                    <div id="box-add-shelly-fields" class="space-y-3 pt-1">
                        <div class="space-y-1">
                            <label class="text-[11px] font-bold text-slate-400 uppercase block">Bokšto pavadinimas ūkyje *</label>
                            <input id="inp-shelly-name" type="text" value="Grūdų bokštas #1 (Shelly Gen3)"
                                class="w-full h-11 bg-tractorBg border border-tractorBorder rounded-xl px-3.5 text-xs sm:text-sm font-bold outline-none" style="color: var(--text-main);">
                        </div>

                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            <div class="space-y-1">
                                <label class="text-[11px] font-bold text-amber-500 uppercase block">Shelly Device ID *</label>
                                <input id="inp-shelly-device-id" type="text" placeholder="Pvz.: e465b845..."
                                    class="w-full h-11 bg-tractorBg border border-tractorBorder rounded-xl px-3 text-xs font-mono font-bold outline-none" style="color: var(--text-main);">
                            </div>
                            <div class="space-y-1">
                                <label class="text-[11px] font-bold text-slate-400 uppercase block">Shelly Server URI *</label>
                                <input id="inp-shelly-server" type="text" value="https://shelly-103-eu.shelly.cloud"
                                    class="w-full h-11 bg-tractorBg border border-tractorBorder rounded-xl px-3 text-xs font-mono outline-none" style="color: var(--text-main);">
                            </div>
                        </div>

                        <div class="space-y-1">
                            <label class="text-[11px] font-bold text-green-500 uppercase block">Shelly Cloud Authorization Key *</label>
                            <input id="inp-shelly-auth-key" type="password" placeholder="Jūsų Shelly Cloud raktas iš programėlės..."
                                class="w-full h-11 bg-tractorBg border border-tractorBorder rounded-xl px-3.5 text-xs font-mono outline-none" style="color: var(--text-main);">
                        </div>

                        <div class="p-3 bg-tractorBg rounded-xl border border-tractorBorder text-[11px] text-slate-400 leading-relaxed">
                            💡 <strong>Kur rasti Shelly duomenis?</strong> Atsidarykite <em>Shelly Smart Control</em> programėlę:
                            1) <strong>Device ID:</strong> paspauskite ant savo <em>Shelly 1PM Mini Gen3</em> -> <em>Settings -> Device Information -> Device ID</em>.
                            2) <strong>Auth Key ir Serveris:</strong> paspauskite <em>User Settings -> Security -> Authorization cloud key -> Get key</em>.
                        </div>

                        <button type="button" id="btn-confirm-connect-shelly" class="w-full h-12 bg-tractorPrimary hover:bg-tractorPrimaryHover text-white font-extrabold rounded-xl text-xs sm:text-sm uppercase tracking-wider shadow-lg transition cursor-pointer flex items-center justify-center gap-2">
                            <span>🛢️</span> <span>Prijungti Grūdų Bokštą (Shelly) ➔</span>
                        </button>
                    </div>

                    <!-- B FORMA: DAIKIN ŠILUMOS SIURBLIUI -->
                    <div id="box-add-daikin-fields" class="space-y-3 pt-1 hidden">
                        <div class="space-y-1">
                            <label class="text-[11px] font-bold text-slate-400 uppercase block">Įrenginio pavadinimas *</label>
                            <input id="inp-add-device-name" type="text" value="Namo Daikin Altherma 3"
                                class="w-full h-11 bg-tractorBg border border-tractorBorder rounded-xl px-3.5 text-xs sm:text-sm font-bold outline-none" style="color: var(--text-main);">
                        </div>

                        <div class="p-3 bg-tractorBg rounded-xl border border-tractorBorder text-[11px] text-slate-400 leading-relaxed">
                            ℹ️ Paspaudus mygtuką, būsite nukreipti į oficialų <strong>Daikin Onecta</strong> saugumo puslapį.
                        </div>

                        <button type="button" id="btn-confirm-connect-daikin" class="w-full h-12 bg-tractorPrimary hover:bg-tractorPrimaryHover text-white font-extrabold rounded-xl text-xs sm:text-sm uppercase tracking-wider shadow-lg transition cursor-pointer flex items-center justify-center gap-2">
                            <span>🔗</span> <span>Prijungti per Daikin Cloud ➔</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>

        <!-- 2 BOTTOM SHEET: PILNAS VALDYMO PULTAS -->
        <div id="daikin-control-sheet" class="fixed inset-0 bg-black/80 z-[140] hidden flex flex-col justify-end items-center p-0 backdrop-blur-sm transition-all duration-300">
            <div id="daikin-control-sheet-panel" class="bg-tractorSurface border-t-2 border-x-2 border-b-0 border-tractorBorder rounded-t-3xl rounded-b-none w-full max-w-7xl max-h-[94vh] flex flex-col overflow-hidden shadow-2xl relative"></div>
        </div>
    `;

    setupSmartDevicesEvents(currentUser);
    listenToSmartDevices(currentUser);
    listenToNordPoolForDaikin();
}

function listenToSmartDevices(currentUser) {
    if (!currentUser) return;
    if (unsubscribeDevices) unsubscribeDevices();

    unsubscribeDevices = db.collection("user_smart_devices")
        .where("userId", "==", currentUser.uid)
        .onSnapshot(snap => {
            userDevicesList = [];
            snap.forEach(doc => userDevicesList.push(doc.data()));

            const countEl = document.getElementById('smart-devices-count');
            if (countEl) countEl.textContent = userDevicesList.length;

            const listEl = document.getElementById('smart-devices-list');
            if (listEl) {
                listEl.innerHTML = renderDevicesListHtml();
                bindListCardEvents(currentUser);
            }

            if (selectedDevice) {
                const refreshed = userDevicesList.find(d => d.id === selectedDevice.id);
                if (refreshed) {
                    selectedDevice = refreshed;
                    renderDeviceControlPanel(currentUser);
                }
            }
        });
}

function renderDevicesListHtml() {
    if (userDevicesList.length === 0) {
        return `
            <div class="py-10 text-center space-y-3 bg-tractorBg rounded-2xl border border-tractorBorder p-6">
                <span class="text-4xl block">🔌</span>
                <h4 class="font-bold text-base" style="color: var(--text-main);">Dar neturite prijungtų išmaniųjų įrenginių</h4>
                <p class="text-xs text-slate-400 max-w-md mx-auto">
                    Spauskite <strong>„➕ Pridėti išmanųjį įrenginį“</strong> viršuje ir prijunkite savo <strong>Grūdų bokšto ventiliatorių (Shelly)</strong> arba <strong>Daikin šilumos siurblį</strong>.
                </p>
            </div>
        `;
    }

    return userDevicesList.map(dev => {
        const tel = dev.telemetry || {};
        const cfg = dev.config || {};

        if (dev.type === 'silo_fan') {
            const isFanOn = tel.fanOnOff === 'on';
            const powerW = Number(tel.powerW ?? 0);
            const totalKwh = Number(tel.totalKwh ?? 0);

            return `
                <div class="card-open-device-sheet bg-tractorBg border-2 border-tractorBorder hover:border-tractorPrimary rounded-2xl p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 transition cursor-pointer shadow-md" data-dev-id="${dev.id}">
                    <div class="space-y-2 flex-1">
                        <div class="flex flex-wrap items-center gap-2.5">
                            <span class="text-2xl">🛢️</span>
                            <h4 class="font-oswald text-lg sm:text-xl font-bold uppercase tracking-wide" style="color: var(--text-main);">
                                ${dev.name || 'Grūdų bokštas'}
                            </h4>
                            <span class="text-xs bg-tractorSurface px-2.5 py-0.5 rounded-lg font-mono font-bold text-slate-400 border border-tractorBorder">
                                ${tel.modelInfo || 'Shelly 1PM Mini Gen3'}
                            </span>
                            <span class="px-2.5 py-0.5 rounded-full text-xs font-bold ${tel.isOnline ? 'bg-green-500/15 text-green-600 dark:text-green-400 border border-green-500/30' : 'bg-slate-700 text-slate-300'}">
                                ${tel.isOnline ? '🟢 Online' : '⚪ Offline'}
                            </span>
                        </div>

                        <div class="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs sm:text-sm pt-0.5">
                            <span>🌪️ Ventiliatorius: <strong class="${isFanOn ? 'text-green-600 dark:text-green-400' : 'text-slate-400'}">${isFanOn ? 'SUKASI (ON)' : 'IŠJUNGTAS (OFF)'} (${powerW} W)</strong></span>
                            <span>•</span>
                            <span>🌾 Grūdai: <strong style="color: var(--text-main);">${cfg.grainMoisture ?? 14.5}% (${cfg.grainTemp ?? 15}°C)</strong></span>
                            <span>•</span>
                            <span>⚡ Skaitiklis: <strong class="text-amber-500 font-mono">${totalKwh.toFixed(2)} kWh</strong></span>
                            <span>•</span>
                            <span>💰 Riba: <strong class="text-green-600 dark:text-green-400 font-mono">iki ${cfg.maxPriceCt ?? 18} ct/kWh</strong></span>
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
        }

        // DAIKIN KORTELĖ
        const isClimOn = tel.climateOnOff === 'on';
        const isDhwOn = tel.dhwOnOff === 'on';
        const waterTemp = tel.leavingWaterTemp !== null && tel.leavingWaterTemp !== undefined ? `${Number(tel.leavingWaterTemp).toFixed(1)} °C` : '-- °C';
        const outTemp = tel.outdoorTemp !== null && tel.outdoorTemp !== undefined ? `${tel.outdoorTemp > 0 ? '+' : ''}${Number(tel.outdoorTemp).toFixed(1)} °C` : '-- °C';
        const boilerTemp = tel.boilerTemp !== null && tel.boilerTemp !== undefined ? `${Number(tel.boilerTemp).toFixed(0)} °C` : '-- °C';

        return `
            <div class="card-open-device-sheet bg-tractorBg border-2 border-tractorBorder hover:border-tractorPrimary rounded-2xl p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 transition cursor-pointer shadow-md" data-dev-id="${dev.id}">
                <div class="space-y-2 flex-1">
                    <div class="flex flex-wrap items-center gap-2.5">
                        <span class="text-2xl">🔥</span>
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
                        <span>⚡ Autopilotas: <strong class="text-green-600 dark:text-green-400 font-mono">${cfg.allowedHoursPerDay || 4} val./parą</strong></span>
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
    const isSilo = dev.type === 'silo_fan';

    let updatedTimeStr = "";
    if (tel.updatedAt && tel.updatedAt.toDate) {
        updatedTimeStr = tel.updatedAt.toDate().toLocaleTimeString('lt-LT', { hour: '2-digit', minute: '2-digit' });
    }

    panel.innerHTML = `
        <div class="shrink-0 bg-tractorSurface border-b border-tractorBorder px-4 sm:px-6 py-3.5 flex flex-wrap items-center justify-between gap-3 z-20">
            <div class="flex flex-wrap items-center gap-2.5">
                <span class="text-2xl">${isSilo ? '🛢️' : '🔥'}</span>
                <div>
                    <h3 class="font-oswald text-lg sm:text-xl font-bold uppercase tracking-wider leading-tight" style="color: var(--text-main);">
                        ${dev.name} (${tel.modelInfo || (isSilo ? 'Shelly Gen3' : 'EHBH08EF9W')})
                    </h3>
                    <span class="text-xs text-green-600 dark:text-green-400 font-bold">
                        🟢 ${isSilo ? 'Shelly Cloud Ryšys Aktyvus' : 'Daikin Cloud Ryšys Aktyvus'} ${updatedTimeStr ? `<span class="text-slate-400 font-normal ml-1">(Atnaujinta ${updatedTimeStr})</span>` : ''}
                    </span>
                </div>
            </div>

            <div class="flex items-center gap-2">
                ${!isSilo ? `
                <div class="flex items-center gap-1 bg-tractorBg p-1 rounded-xl border border-tractorBorder">
                    <button type="button" id="btn-subtab-control" class="px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${activeModalSubTab === 'control' ? 'bg-tractorPrimary text-white shadow' : 'text-slate-400 hover:text-white'}">
                        🎛️ Katilo Valdymas
                    </button>
                    <button type="button" id="btn-subtab-energy" class="px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${activeModalSubTab === 'energy' ? 'bg-tractorPrimary text-white shadow' : 'text-slate-400 hover:text-white'}">
                        📊 Sąnaudos (kWh ir €)
                    </button>
                </div>
                ` : ''}

                <button type="button" id="btn-sheet-refresh-now" class="h-9 px-3 bg-tractorBg hover:bg-tractorCard border border-tractorBorder rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1" style="color: var(--text-main);" title="Nuskaityti dabar">
                    <span>🔄</span>
                </button>
                <button type="button" id="btn-sheet-close-control" class="w-9 h-9 rounded-xl bg-tractorBg hover:bg-tractorCard border border-tractorBorder text-slate-400 hover:text-white text-xl font-bold cursor-pointer flex items-center justify-center leading-none">&times;</button>
            </div>
        </div>

        <div id="subtab-content-container" class="flex-1 overflow-y-auto px-4 sm:px-6 py-4 pb-10 space-y-3.5">
            ${isSilo
                ? renderSiloControlTabHtml(dev, tel)
                : (activeModalSubTab === 'control'
                    ? renderDaikinControlTabHtml(dev, tel, currentUser)
                    : renderDaikinEnergyTabHtml(dev, cachedElecHours))
            }
        </div>
    `;

    document.getElementById('btn-sheet-close-control')?.addEventListener('click', () => {
        document.getElementById('daikin-control-sheet')?.classList.add('hidden');
    });

    document.getElementById('btn-sheet-refresh-now')?.addEventListener('click', async () => {
        if (!currentUser) return;
        showBottomToast("Nuskaitoma įrenginio būsena... 🔄", "info");
        try {
            const url = isSilo
                ? `https://us-central1-neighborpm-b9968.cloudfunctions.net/refreshShellyStatus?userId=${currentUser.uid}&deviceDocId=${dev.id}`
                : `https://us-central1-neighborpm-b9968.cloudfunctions.net/refreshDaikinStatus?userId=${currentUser.uid}`;
            const res = await fetch(url);
            const data = await res.json();
            if (data && data.success) {
                showBottomToast("Įrenginio telemetrija atnaujinta! ⚡");
            }
        } catch (e) {
            showBottomToast("Nepavyko susisiekti su įrenginiu", "error");
        }
    });

    if (isSilo) {
        bindSiloControlEvents(
            currentUser,
            dev,
            async (cmdPayload, successMsg) => {
                await executeSiloCommand(currentUser, cmdPayload, successMsg);
            },
            async (shouldSaveToDb, updatedConfig = null) => {
                if (shouldSaveToDb && updatedConfig) {
                    await db.collection("user_smart_devices").doc(dev.id).update({ config: updatedConfig });
                }
                renderSiloScheduleGrid(dev, cachedElecHours);
            },
            cachedElecHours
        );
    } else {
        document.getElementById('btn-subtab-control')?.addEventListener('click', () => {
            activeModalSubTab = 'control';
            renderDeviceControlPanel(currentUser);
        });

        document.getElementById('btn-subtab-energy')?.addEventListener('click', () => {
            activeModalSubTab = 'energy';
            renderDeviceControlPanel(currentUser);
        });

        if (activeModalSubTab === 'control') {
            bindDaikinControlEvents(
                currentUser,
                dev,
                async (cmdPayload, successMsg) => {
                    await executeDirectCommand(currentUser, cmdPayload, successMsg);
                },
                async (shouldSaveToDb, updatedConfig = null) => {
                    if (shouldSaveToDb && updatedConfig) {
                        await db.collection("user_smart_devices").doc(dev.id).update({ config: updatedConfig });
                    }
                    renderDaikinScheduleGrid(dev, cachedElecHours);
                }
            );
            renderDaikinScheduleGrid(dev, cachedElecHours);
        } else {
            bindDaikinEnergyEvents(dev, cachedElecHours);
        }
    }
}

async function executeSiloCommand(currentUser, cmdPayload, successMsg) {
    if (!currentUser || !selectedDevice) return;
    showBottomToast("Siunčiama komanda į Shelly relę (~2 sek.)... 📡", "info");
    try {
        const res = await fetch("https://us-central1-neighborpm-b9968.cloudfunctions.net/controlShellySilo", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                userId: currentUser.uid,
                ...cmdPayload
            })
        });
        const data = await res.json();
        if (data && data.success) {
            selectedDevice.telemetry = { ...selectedDevice.telemetry, ...data.telemetry };
            renderDeviceControlPanel(currentUser);
            showBottomToast(successMsg || "Komanda įvykdyta! ✅");
        } else {
            showBottomToast("Shelly atsakymas: " + (data.error || "Nepavyko"), "error");
        }
    } catch (err) {
        showBottomToast("Klaida: " + err.message, "error");
    }
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
    const typeSelect = document.getElementById('sel-add-device-type');
    const boxShelly = document.getElementById('box-add-shelly-fields');
    const boxDaikin = document.getElementById('box-add-daikin-fields');
    const confirmConnectDaikinBtn = document.getElementById('btn-confirm-connect-daikin');
    const confirmConnectShellyBtn = document.getElementById('btn-confirm-connect-shelly');

    if (openAddBtn && addModal) openAddBtn.onclick = () => addModal.classList.remove('hidden');
    if (closeAddBtn && addModal) closeAddBtn.onclick = () => addModal.classList.add('hidden');
    if (addModal) addModal.onclick = (e) => { if (e.target === addModal) addModal.classList.add('hidden'); };

    if (typeSelect) {
        typeSelect.onchange = (e) => {
            if (e.target.value === 'silo_fan') {
                boxShelly?.classList.remove('hidden');
                boxDaikin?.classList.add('hidden');
            } else {
                boxShelly?.classList.add('hidden');
                boxDaikin?.classList.remove('hidden');
            }
        };
    }

    if (confirmConnectShellyBtn) {
        confirmConnectShellyBtn.onclick = async () => {
            if (!currentUser) {
                openAuthModal('login');
                return;
            }
            const name = document.getElementById('inp-shelly-name')?.value.trim() || "Grūdų bokštas #1";
            const shellyDeviceId = document.getElementById('inp-shelly-device-id')?.value.trim();
            const serverUri = document.getElementById('inp-shelly-server')?.value.trim();
            const authKey = document.getElementById('inp-shelly-auth-key')?.value.trim();

            if (!shellyDeviceId || !authKey) {
                showBottomToast("Įveskite Shelly Device ID ir Cloud Auth Key!", "warning");
                return;
            }

            confirmConnectShellyBtn.innerHTML = "<span>⏳</span> <span>Jungiama prie Shelly Cloud...</span>";
            try {
                const res = await fetch("https://us-central1-neighborpm-b9968.cloudfunctions.net/connectShellySilo", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        userId: currentUser.uid,
                        name,
                        shellyDeviceId,
                        serverUri,
                        authKey,
                        lat: cachedUserData?.garageLat || 55.2885,
                        lng: cachedUserData?.garageLon || 23.9745
                    })
                });
                const data = await res.json();
                if (data && data.success) {
                    addModal?.classList.add('hidden');
                    showBottomToast("🛢️ Grūdų bokštas (Shelly) sėkmingai prijungtas!");
                } else {
                    showBottomToast("Klaida: " + (data.error || "Nepavyko prijungti"), "error");
                }
            } catch (err) {
                showBottomToast("Ryšio klaida: " + err.message, "error");
            } finally {
                confirmConnectShellyBtn.innerHTML = "<span>🛢️</span> <span>Prijungti Grūdų Bokštą (Shelly) ➔</span>";
            }
        };
    }

    if (confirmConnectDaikinBtn) {
        confirmConnectDaikinBtn.onclick = async () => {
            if (!currentUser) {
                openAuthModal('login');
                return;
            }
            confirmConnectDaikinBtn.innerHTML = "<span>⏳</span> <span>Nukreipiama į Daikin...</span>";
            try {
                const res = await fetch(`https://us-central1-neighborpm-b9968.cloudfunctions.net/getDaikinAuthUrl?userId=${currentUser.uid}`);
                const data = await res.json();
                if (data && data.url) {
                    const cleanUrl = data.url.replace(/&?max_age=0/g, '').replace(/&?prompt=login/g, '');
                    const separator = cleanUrl.includes('?') ? '&' : '?';
                    window.location.href = `${cleanUrl}${separator}prompt=login`;
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
            if (selectedDevice) {
                if (selectedDevice.type === 'silo_fan') {
                    renderSiloScheduleGrid(selectedDevice, cachedElecHours);
                } else if (activeModalSubTab === 'control') {
                    renderDaikinScheduleGrid(selectedDevice, cachedElecHours);
                }
            }
        }
    });
}