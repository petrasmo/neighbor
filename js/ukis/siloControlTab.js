// js/ukis/siloControlTab.js
import { showBottomToast } from '../core/ui.js';

let cachedHourlyWeather = null;
let hasTomorrowPrices = false;

const CROP_EMC_PARAMS = {
    wheat: { name: "🌾 Kviečiai", A: 512.4, B: 30.0, C: 0.25 },
    rapeseed: { name: "🌱 Rapsai", A: 398.2, B: 25.0, C: 0.38 },
    barley: { name: "🌾 Miežiai", A: 480.0, B: 28.0, C: 0.24 },
    peas: { name: "🫘 Žirniai / Pupos", A: 450.0, B: 25.0, C: 0.23 },
    corn: { name: "🌽 Kukurūzai", A: 540.0, B: 30.0, C: 0.24 }
};

function calculateEMC(cropKey, airTempC, rhPercent) {
    const params = CROP_EMC_PARAMS[cropKey] || CROP_EMC_PARAMS.wheat;
    const rh = Math.max(0.05, Math.min(0.98, rhPercent / 100));
    const T = airTempC;
    try {
        const term = -((T + params.B) / params.A) * Math.log(rh);
        if (term <= 0) return 14.0;
        const emc = -(1 / params.C) * Math.log(term);
        return parseFloat(Math.max(5.0, Math.min(26.0, emc)).toFixed(1));
    } catch (e) {
        return 14.0;
    }
}

export function renderSiloControlTabHtml(dev, liveTelemetry) {
    const cfg = dev.config || {};
    const isFanOn = liveTelemetry.fanOnOff === 'on';
    const powerW = Number(liveTelemetry.powerW ?? 0);
    const totalKwh = Number(liveTelemetry.totalKwh ?? 0);
    const voltageV = Number(liveTelemetry.voltageV ?? 230);
    const isManualProfile = cfg.modeProfile === 'manual';

    const now = new Date();
    const nowTs = now.getTime();
    const isManualApproved = cfg.manualApprovalActive === true && cfg.approvedUntilTimestamp && (nowTs <= cfg.approvedUntilTimestamp);
    const isFullAuto = cfg.autopilotEnabled === true;
    const isAnyScheduleRunning = isManualApproved || isFullAuto;

    let manualUntilStr = "";
    if (isManualApproved) {
        const dt = new Date(cfg.approvedUntilTimestamp);
        const mStr = String(dt.getMonth() + 1).padStart(2, '0');
        const dStr = String(dt.getDate()).padStart(2, '0');
        const timePart = dt.toLocaleTimeString('lt-LT', { hour: '2-digit', minute: '2-digit' });
        manualUntilStr = `IKI ${mStr}-${dStr} ${timePart}`;
    }

    const renderPowerBtn = (id, isOn, title) => `
        <button type="button" id="${id}" style="${isOn ? 'background-color: #2E7D32 !important; color: #FFFFFF !important; border: 2px solid #4CAF50 !important; box-shadow: 0 0 14px rgba(46, 125, 50, 0.6);' : 'background-color: var(--bg-surface) !important; color: #94A3B8 !important; border: 2px solid var(--border-color) !important;'}" class="w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200 cursor-pointer hover:scale-105 active:scale-95 shrink-0" title="${title}">
            <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M18.36 6.64a9 9 0 1 1-12.73 0"></path>
                <line x1="12" y1="2" x2="12" y2="12"></line>
            </svg>
        </button>
    `;

    return `
        <!-- 1. TIESIOGINIS VENTILIATORIAUS VALDYMAS IR TELEMETRIJA (2 KORTELĖS) -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-3">
            
            <!-- BOKŠTO TURBINOS / RELĖS VALDYMAS -->
            <div class="bg-tractorBg border-2 ${isFanOn ? 'border-green-500 ring-1 ring-green-500/30' : 'border-tractorBorder'} rounded-2xl p-3.5 space-y-3 shadow-sm flex flex-col justify-between">
                <div class="flex items-center justify-between gap-2 border-b border-tractorBorder/60 pb-2.5">
                    <div class="flex items-center gap-3 min-w-0">
                        ${renderPowerBtn('btn-silo-fan-toggle', isFanOn, isFanOn ? 'Išjungti bokšto ventiliatorių' : 'Įjungti bokšto ventiliatorių')}
                        <div class="min-w-0">
                            <h3 class="font-oswald text-base sm:text-lg font-bold uppercase leading-tight truncate" style="color: var(--text-main);">
                                🌪️ Bokšto Ventiliatorius (Shelly Relė)
                            </h3>
                            <span class="text-xs font-extrabold ${isFanOn ? 'text-green-600 dark:text-green-400' : 'text-slate-400'}">
                                ${isFanOn ? '🟢 SUKASI (Relė: ON)' : '⚪ IŠJUNGTA (Relė: OFF)'}
                            </span>
                        </div>
                    </div>
                    <span class="px-2.5 py-1 rounded-lg bg-tractorSurface border border-tractorBorder text-xs font-mono font-bold shrink-0" style="color: var(--text-main);">
                        ⚡ ${voltageV} V
                    </span>
                </div>

                <div class="grid grid-cols-2 gap-2.5 text-xs">
                    <div class="bg-tractorSurface p-2.5 rounded-xl border border-tractorBorder text-center">
                        <span class="text-[10px] text-slate-400 block font-bold uppercase">⚡ Dabartinė galia</span>
                        <strong class="font-mono text-lg font-black ${isFanOn ? 'text-green-500' : ''} block mt-0.5" style="${isFanOn ? '' : 'color: var(--text-main);'}">
                            ${powerW} W
                        </strong>
                    </div>
                    <div class="bg-tractorSurface p-2.5 rounded-xl border border-tractorBorder text-center">
                        <span class="text-[10px] text-slate-400 block font-bold uppercase">📊 Skaitiklis (Viso)</span>
                        <strong class="font-mono text-lg font-black text-amber-500 block mt-0.5">
                            ${totalKwh.toFixed(2)} kWh
                        </strong>
                    </div>
                </div>
            </div>

            <!-- GRŪDŲ BŪSENA IR GYVAS LAUKO EMC ŠVIESOFORAS -->
            <div class="bg-tractorBg border border-tractorBorder rounded-2xl p-3.5 space-y-2.5 shadow-sm flex flex-col justify-between">
                <div class="flex items-center justify-between border-b border-tractorBorder/60 pb-2">
                    <div class="flex items-center gap-2">
                        <span class="text-xl">🌾</span>
                        <div>
                            <h3 class="font-oswald text-base font-bold uppercase leading-tight" style="color: var(--text-main);">
                                Grūdai Bokšte ir Lauko EMC
                            </h3>
                            <span id="silo-live-emc-verdict" class="text-xs font-bold text-green-500">Skaičiuojama lauko pusiausvyra...</span>
                        </div>
                    </div>
                </div>

                <div class="grid grid-cols-3 gap-2 text-xs">
                    <div>
                        <label class="text-[10px] font-bold text-slate-400 uppercase block mb-1">Kultūra</label>
                        <select id="sel-silo-crop" class="w-full h-9 bg-tractorSurface border border-tractorBorder rounded-lg px-2 text-xs font-bold outline-none cursor-pointer" style="color: var(--text-main);">
                            ${Object.entries(CROP_EMC_PARAMS).map(([k, v]) => `
                                <option value="${k}" ${(cfg.cropKey || 'wheat') === k ? 'selected' : ''}>${v.name}</option>
                            `).join('')}
                        </select>
                    </div>
                    <div>
                        <label class="text-[10px] font-bold text-slate-400 uppercase block mb-1">Drėgmė (%)</label>
                        <input id="inp-silo-moisture" type="number" step="0.1" value="${cfg.grainMoisture ?? 14.5}"
                            class="w-full h-9 bg-tractorSurface border border-tractorBorder rounded-lg px-2.5 text-xs font-mono font-bold outline-none" style="color: var(--text-main);">
                    </div>
                    <div>
                        <label class="text-[10px] font-bold text-slate-400 uppercase block mb-1">Grūdų T (°C)</label>
                        <input id="inp-silo-temp" type="number" step="0.5" value="${cfg.grainTemp ?? 15.0}"
                            class="w-full h-9 bg-tractorSurface border border-tractorBorder rounded-lg px-2.5 text-xs font-mono font-bold text-amber-500 outline-none">
                    </div>
                </div>
            </div>

        </div>

        <!-- 2. AUTOPILOTO TAISYKLĖS IR NORD POOL KAINOS RIBA -->
        <div class="bg-tractorBg border ${isAnyScheduleRunning ? 'border-green-500/80 ring-1 ring-green-500/30' : 'border-tractorBorder'} p-3.5 sm:p-4 rounded-2xl space-y-3">
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-tractorBorder/60 pb-3">
                <div class="space-y-1">
                    <h3 class="font-oswald text-base sm:text-lg font-bold uppercase tracking-wider flex items-center gap-2" style="color: var(--text-main);">
                        <span>🤖</span> Bokšto Autopilotas (EMC + Nord Pool)
                        ${isAnyScheduleRunning ? `<span class="px-2 py-0.5 text-[10px] rounded-full bg-green-500/20 text-green-600 dark:text-green-400 border border-green-500/40 font-sans font-extrabold">AKTYVUS</span>` : ''}
                    </h3>
                    <p class="text-xs text-slate-400 leading-relaxed max-w-2xl">
                        Autopilotas įjungs bokšto ventiliatorių <strong>tik tada</strong>, kai lauko oras pagal Chung-Pfost EMC formulę nedrėkins grūdų <strong>IR</strong> Nord Pool kaina neviršys jūsų nustatytos ribos.
                    </p>
                </div>

                <button type="button" id="btn-silo-approve-schedule" 
                    style="${isAnyScheduleRunning ? 'background: linear-gradient(135deg, #15803d 0%, #166534 100%) !important; border: 2px solid #4ade80 !important; color: #FFFFFF !important;' : ''}"
                    class="h-11 px-5 bg-tractorPrimary hover:bg-tractorPrimaryHover text-white rounded-xl font-extrabold text-xs uppercase tracking-wider transition cursor-pointer shadow-lg flex items-center justify-center gap-2 shrink-0">
                    <span>${isAnyScheduleRunning ? '⚡' : '✅'}</span>
                    <span>${isFullAuto ? '24/7 AUTOPILOTAS AKTYVUS (STABDYTI)' : (isManualApproved ? `VYKDOMA (${manualUntilStr})` : 'Patvirtinti ir vykdyti grafiką')}</span>
                </button>
            </div>

            <div class="flex flex-wrap items-center justify-between gap-3 p-3 bg-tractorSurface rounded-xl border border-tractorBorder">
                <div class="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" id="chk-silo-full-auto" class="w-4 h-4 accent-tractorPrimary rounded cursor-pointer" ${cfg.autopilotEnabled ? 'checked' : ''}>
                    <div>
                        <label for="chk-silo-full-auto" class="font-bold text-xs block cursor-pointer" style="color: var(--text-main);">
                            ⚡ 24/7 Nuolatinis Bokšto Autopilotas
                        </label>
                        <span class="text-[11px] text-green-600 dark:text-green-400 font-medium">
                            Kas valandą automatiškai tikrina Open-Meteo RH%, EMC ir Nord Pool biržą.
                        </span>
                    </div>
                </div>

                <div class="flex flex-wrap items-center gap-1 bg-tractorBg p-1 rounded-xl border border-tractorBorder shrink-0">
                    <button type="button" class="btn-silo-profile px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${cfg.modeProfile !== 'drying' && !isManualProfile ? 'bg-tractorPrimary text-white shadow' : 'text-slate-400 hover:text-white'}" data-profile="cooling">
                        ❄️ Saugus Vėsinimas
                    </button>
                    <button type="button" class="btn-silo-profile px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${cfg.modeProfile === 'drying' ? 'bg-tractorPrimary text-white shadow' : 'text-slate-400 hover:text-white'}" data-profile="drying">
                        ☀️ Aktyvus Džiovinimas
                    </button>
                </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-1">
                <div class="bg-tractorSurface p-3 rounded-xl border border-tractorBorder space-y-1">
                    <div class="flex justify-between items-center">
                        <label class="font-bold text-slate-400 text-xs">💰 Maksimali leistina Nord Pool kaina:</label>
                        <strong id="lbl-silo-max-price" class="font-mono font-black text-sm text-green-600 dark:text-green-400">iki ${cfg.maxPriceCt ?? 18} ct/kWh</strong>
                    </div>
                    <input id="inp-silo-max-price" type="range" min="0" max="40" step="1" value="${cfg.maxPriceCt ?? 18}" class="w-full accent-tractorPrimary cursor-pointer h-1.5">
                </div>

                <div class="bg-tractorSurface p-3 rounded-xl border border-tractorBorder flex items-center justify-between gap-3">
                    <div class="text-[11px] text-slate-400">
                        Pakeitę grūdų drėgmę, temperatūrą arba kainos ribą, išsaugokite nustatymus:
                    </div>
                    <button type="button" id="btn-save-silo-config" class="h-9 px-4 bg-tractorPrimary hover:bg-tractorPrimaryHover text-white font-bold rounded-xl text-xs uppercase tracking-wider transition cursor-pointer shadow shrink-0">
                        💾 Išsaugoti svertus
                    </button>
                </div>
            </div>
        </div>

        <!-- 3. 24 VALANDŲ KOMBINUOTA NORD POOL + EMC LENTELĖ -->
        <div class="space-y-2 pt-1">
            <h3 class="font-oswald text-sm sm:text-base font-bold uppercase tracking-wider flex items-center gap-1.5" style="color: var(--text-main);">
                <span>📅</span> Bokšto Darbo Grafikas: Nord Pool Kaina + Lauko EMC (Šiandien ir Rytoj)
            </h3>
            <div id="silo-schedule-tables-box" class="grid grid-cols-1 lg:grid-cols-2 gap-3.5"></div>
        </div>
    `;
}

export async function bindSiloControlEvents(currentUser, dev, executeDirectCommand, onConfigSaved, cachedElecHours) {
    // 1. Tiesioginis ON / OFF paspaudimas
    document.getElementById('btn-silo-fan-toggle')?.addEventListener('click', () => {
        const nextState = dev.telemetry?.fanOnOff === 'on' ? 'off' : 'on';
        executeDirectCommand(
            { deviceDocId: dev.id, fanOnOff: nextState },
            nextState === 'on' ? "🌪️ Bokšto ventiliatorius ĮJUNGTAS (Shelly ON)!" : "🛑 Bokšto ventiliatorius IŠJUNGTAS (Shelly OFF)!"
        );
    });

    // 2. Kainos slankiklis
    const inpPrice = document.getElementById('inp-silo-max-price');
    const lblPrice = document.getElementById('lbl-silo-max-price');
    inpPrice?.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        if (lblPrice) lblPrice.textContent = `iki ${val} ct/kWh`;
        dev.config.maxPriceCt = val;
        renderSiloScheduleGrid(dev, cachedElecHours);
    });

    // 3. Grūdų parametrų keitimas
    ['sel-silo-crop', 'inp-silo-moisture', 'inp-silo-temp'].forEach(id => {
        document.getElementById(id)?.addEventListener('input', () => {
            dev.config.cropKey = document.getElementById('sel-silo-crop')?.value || 'wheat';
            dev.config.grainMoisture = parseFloat(document.getElementById('inp-silo-moisture')?.value) || 14.5;
            dev.config.grainTemp = parseFloat(document.getElementById('inp-silo-temp')?.value) || 15.0;
            renderSiloScheduleGrid(dev, cachedElecHours);
        });
    });

    // 4. Profilio perjungimas (Vėsinimas / Džiovinimas)
    document.querySelectorAll('.btn-silo-profile').forEach(btn => {
        btn.onclick = async () => {
            dev.config.modeProfile = btn.getAttribute('data-profile');
            await onConfigSaved(true, dev.config);
        };
    });

    // 5. 24/7 Autopilotas
    document.getElementById('chk-silo-full-auto')?.addEventListener('change', async (e) => {
        dev.config.autopilotEnabled = e.target.checked;
        if (e.target.checked) dev.config.wasRolledBack = false;
        await onConfigSaved(true, dev.config);
        showBottomToast(e.target.checked ? "🤖 24/7 Bokšto Autopilotas ĮJUNGTAS!" : "24/7 Autopilotas išjungtas.");
    });

    // 6. Patvirtinti grafiką
    document.getElementById('btn-silo-approve-schedule')?.addEventListener('click', async () => {
        const cfg = dev.config || {};
        const nowTs = Date.now();
        const isApproved = cfg.manualApprovalActive === true && cfg.approvedUntilTimestamp && (nowTs <= cfg.approvedUntilTimestamp);
        const isFullAuto = cfg.autopilotEnabled === true;

        if (isApproved || isFullAuto) {
            cfg.manualApprovalActive = false;
            cfg.autopilotEnabled = false;
            cfg.approvedUntilTimestamp = null;
            await onConfigSaved(true, cfg);
            showBottomToast("Bokšto grafikas sustabdytas. Ventiliatorius išjungiamas! 🛑");
        } else {
            const targetEnd = new Date();
            if (hasTomorrowPrices) targetEnd.setDate(targetEnd.getDate() + 1);
            targetEnd.setHours(23, 59, 59, 999);
            cfg.manualApprovalActive = true;
            cfg.approvedUntilTimestamp = targetEnd.getTime();
            cfg.wasRolledBack = false;
            await onConfigSaved(true, cfg);
            showBottomToast("Bokšto ventiliavimo grafikas patvirtintas ir vykdomas! 🌪️⚡");
        }
    });

    // 7. Išsaugoti svertus
    document.getElementById('btn-save-silo-config')?.addEventListener('click', async () => {
        await onConfigSaved(true, dev.config);
        showBottomToast("Bokšto svertai ir EMC ribos išsaugotos! 💾🌾");
    });

    // Nuskaitome 48 val. Open-Meteo orus bokšto koordinatėms
    const lat = dev.config?.lat || 55.2885;
    const lng = dev.config?.lng || 23.9745;
    try {
        const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&hourly=temperature_2m,relative_humidity_2m&timezone=Europe%2FVilnius&forecast_days=2`);
        const data = await res.json();
        cachedHourlyWeather = data.hourly || null;
    } catch (e) {}

    renderSiloScheduleGrid(dev, cachedElecHours);
}

export function renderSiloScheduleGrid(dev, cachedElecHours) {
    const tablesBox = document.getElementById('silo-schedule-tables-box');
    if (!tablesBox || !dev || cachedElecHours.length === 0) return;

    const cfg = dev.config || {};
    const cropKey = cfg.cropKey || 'wheat';
    const grainMoisture = Number(cfg.grainMoisture ?? 14.5);
    const grainTemp = Number(cfg.grainTemp ?? 15.0);
    const maxPriceCt = Number(cfg.maxPriceCt ?? 18.0);
    const modeProfile = cfg.modeProfile || 'cooling';

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
    hasTomorrowPrices = !!tomorrowStr;

    const getHourWeather = (dateStr, hourInt) => {
        if (!cachedHourlyWeather || !cachedHourlyWeather.time) return { t: 12, rh: 75 };
        const targetPrefix = `${dateStr}T${String(hourInt).padStart(2, '0')}`;
        const idx = cachedHourlyWeather.time.findIndex(t => t.startsWith(targetPrefix));
        if (idx !== -1) {
            return {
                t: cachedHourlyWeather.temperature_2m[idx] ?? 12,
                rh: cachedHourlyWeather.relative_humidity_2m[idx] ?? 75
            };
        }
        return { t: 12, rh: 75 };
    };

    // Atnaujiname viršutinį dabartinės valandos EMC verdiktą
    const curW = getHourWeather(todayStr, currentHourInt);
    const curEmc = calculateEMC(cropKey, curW.t, curW.rh);
    const verdictEl = document.getElementById('silo-live-emc-verdict');
    if (verdictEl) {
        verdictEl.innerHTML = `Lauke: <strong>${curW.t.toFixed(1)}°C (${curW.rh}% RH)</strong> • Oro EMC: <strong class="${curEmc <= grainMoisture ? 'text-green-500' : 'text-red-500'}">${curEmc}%</strong>`;
    }

    const buildDayTableHtml = (dateStr, titlePrefix) => {
        if (!dateStr) {
            return `
                <div class="bg-tractorBg border border-tractorBorder rounded-2xl p-8 text-center text-xs text-slate-400 my-auto">
                    ⏳ Rytojaus Nord Pool kainos pateikiamos po 14:00 val.
                </div>
            `;
        }

        const dayHours = cachedElecHours.filter(h => h.date === dateStr);

        const rowsHtml = dayHours.map(h => {
            const isCurrent = (dateStr === todayStr && h.hour === currentHourInt);
            const pCt = h.priceCtNoVat;
            const w = getHourWeather(dateStr, h.hour);
            const emc = calculateEMC(cropKey, w.t, w.rh);

            const isPriceOk = pCt <= maxPriceCt;
            const isNotWetting = emc <= grainMoisture + 0.3;
            const isCoolingOk = w.t <= grainTemp - 1.5;
            const isDryingOk = emc <= grainMoisture - 0.3 && w.t <= grainTemp + 4;

            const shouldRun = modeProfile === 'drying'
                ? (isPriceOk && isDryingOk)
                : (isPriceOk && isNotWetting && isCoolingOk);

            let statusHtml = "";
            if (shouldRun) {
                statusHtml = `
                    <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-green-500/20 text-green-700 dark:text-green-300 border border-green-500/40 font-extrabold text-[11px]">
                        <span>🌪️</span> <span>VENTILIUOS</span>
                    </span>
                `;
            } else if (!isNotWetting) {
                statusHtml = `
                    <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-red-500/15 text-red-600 dark:text-red-400 border border-red-500/30 font-semibold text-[11px]">
                        <span>💧</span> <span>Drėkins (EMC ${emc}%)</span>
                    </span>
                `;
            } else if (!isPriceOk) {
                statusHtml = `
                    <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 font-semibold text-[11px]">
                        <span>💰</span> <span>Brangi el.</span>
                    </span>
                `;
            } else {
                statusHtml = `
                    <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-tractorSurface text-slate-400 border border-tractorBorder font-semibold text-[11px]">
                        <span>💤</span> <span>Šilta (${w.t.toFixed(0)}°C)</span>
                    </span>
                `;
            }

            return `
                <tr class="border-b border-tractorBorder/50 ${isCurrent ? 'bg-tractorPrimary/20 border-l-4 border-l-tractorPrimary font-bold' : ''}">
                    <td class="py-1.5 px-3 font-mono text-xs font-bold" style="color: var(--text-main);">
                        ${h.hourLabel} ${isCurrent ? '<span class="px-1.5 py-0.5 rounded bg-tractorPrimary text-white text-[9px] uppercase">Dabar</span>' : ''}
                    </td>
                    <td class="py-1.5 px-2 font-mono text-xs font-black ${isPriceOk ? 'text-green-600 dark:text-green-400' : 'text-red-500'}">
                        ${pCt.toFixed(1)} ct
                    </td>
                    <td class="py-1.5 px-2 font-mono text-xs ${isNotWetting ? 'text-green-600 dark:text-green-400' : 'text-red-500'}">
                        ${emc}% <span class="text-[10px] text-slate-400">(${w.t.toFixed(0)}°C)</span>
                    </td>
                    <td class="py-1.5 px-3 text-right">
                        ${statusHtml}
                    </td>
                </tr>
            `;
        }).join('');

        return `
            <div class="bg-tractorBg border border-tractorBorder rounded-2xl overflow-hidden shadow-sm">
                <div class="bg-tractorSurface px-3.5 py-2 border-b border-tractorBorder flex justify-between items-center">
                    <strong class="font-oswald text-sm sm:text-base uppercase tracking-wider" style="color: var(--text-main);">
                        ${titlePrefix}
                    </strong>
                    <span class="font-mono text-xs font-bold" style="color: var(--text-main);">📅 ${dateStr}</span>
                </div>
                <table class="w-full text-left border-collapse">
                    <thead>
                        <tr class="border-b border-tractorBorder bg-tractorSurface/50 text-[10px] uppercase font-bold text-slate-400">
                            <th class="py-1.5 px-3">Valanda</th>
                            <th class="py-1.5 px-2">Elektra</th>
                            <th class="py-1.5 px-2">Lauko EMC</th>
                            <th class="py-1.5 px-3 text-right">Bokšto būsena</th>
                        </tr>
                    </thead>
                    <tbody>${rowsHtml}</tbody>
                </table>
            </div>
        `;
    };

    tablesBox.innerHTML = `
        ${buildDayTableHtml(todayStr, '📅 ŠIANDIEN')}
        ${buildDayTableHtml(tomorrowStr, '⏭️ RYTOJ')}
    `;
}