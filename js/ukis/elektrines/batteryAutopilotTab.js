// js/ukis/elektrines/batteryAutopilotTab.js
import { showBottomToast } from '../../core/ui.js';
import { getSolarBrandMeta } from './solarBrandsConfig.js';

export function getDefaultBatteryConfig(existing = {}) {
    return {
        autopilotEnabled: existing.autopilotEnabled ?? false,
        batteryCapacityKwh: Number(existing.batteryCapacityKwh ?? 14.04),
        chargeMode: existing.chargeMode || 'cheapest_hours', // 'cheapest_hours' | 'price_limit'
        cheapHoursCount: Number(existing.cheapHoursCount ?? 4),
        maxChargePriceCt: Number(existing.maxChargePriceCt ?? 6.0),
        chargeTargetSoc: Number(existing.chargeTargetSoc ?? 90),
        minSocBackup: Number(existing.minSocBackup ?? 20),
        chargePowerKw: Number(existing.chargePowerKw ?? 6.0),
        peakMode: existing.peakMode || 'self_use', // 'self_use' | 'force_discharge'
        dischargeMinPriceCt: Number(existing.dischargeMinPriceCt ?? 25.0),
        dischargePowerKw: Number(existing.dischargePowerKw ?? 6.0)
    };
}

export function renderBatteryAutopilotTabHtml(dev, tel) {
    const brandMeta = getSolarBrandMeta(dev.brand);
    const bCfg = getDefaultBatteryConfig(dev.config?.battery || {});

    const socPct = tel.batterySocPct !== null && tel.batterySocPct !== undefined ? Number(tel.batterySocPct) : null;
    const batKw = Number(tel.batteryPowerKw ?? 0); // >0 kraunasi, <0 iškrauna
    const batTemp = tel.batteryTempC !== null && tel.batteryTempC !== undefined ? `${Number(tel.batteryTempC).toFixed(1)} °C` : '-- °C';
    const pvKw = Number(tel.currentPowerKw ?? 0);
    const loadKw = Number(tel.loadPowerKw ?? 0);
    const gridImportKw = Number(tel.gridImportKw ?? 0);
    const gridExportKw = Number(tel.gridExportKw ?? 0);
    const mppt = tel.mpptKw || {};
    const usableKwhNow = socPct !== null ? ((socPct / 100) * bCfg.batteryCapacityKwh).toFixed(1) : '--';

    const batStatusText = batKw > 0.05
        ? `⬆️ Kraunasi (+${batKw.toFixed(2)} kW)`
        : (batKw < -0.05 ? `⬇️ Iškrauna (${Math.abs(batKw).toFixed(2)} kW)` : '⏸️ Budėjimas');
    const batStatusClass = batKw > 0.05
        ? 'text-green-500'
        : (batKw < -0.05 ? 'text-amber-500' : 'text-slate-400');

    return `
        <!-- 1. GYVI ENERGIJOS SRAUTAI (BATERIJA / 3 MPPT / NAMAI / ESO) -->
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
            
            <div class="bg-tractorBg border-2 ${socPct !== null && socPct <= bCfg.minSocBackup ? 'border-red-500/60' : 'border-green-500/60'} rounded-2xl p-3.5 sm:p-4 space-y-2 shadow-sm">
                <div class="flex items-center justify-between gap-1">
                    <span class="text-[11px] font-extrabold uppercase tracking-wider text-green-500">🔋 Baterija (${bCfg.batteryCapacityKwh} kWh)</span>
                    <span class="text-[10px] font-mono text-slate-400">🌡️ ${batTemp}</span>
                </div>
                <div class="flex items-end justify-between gap-2">
                    <div>
                        <strong class="font-mono text-2xl font-black text-green-500 block">${socPct !== null ? `${socPct}%` : '--%'}</strong>
                        <span class="text-[11px] font-mono text-slate-400">~${usableKwhNow} kWh viduje</span>
                    </div>
                    <span class="text-[11px] font-bold ${batStatusClass} text-right">${batStatusText}</span>
                </div>
                ${socPct !== null ? `
                    <div class="w-full h-2 bg-tractorSurface rounded-full overflow-hidden border border-tractorBorder">
                        <div class="h-full ${socPct >= 25 ? 'bg-green-500' : 'bg-red-500'} transition-all" style="width: ${Math.min(100, Math.max(0, socPct))}%;"></div>
                    </div>
                ` : ''}
            </div>

            <div class="bg-tractorBg border border-tractorBorder rounded-2xl p-3.5 sm:p-4 space-y-1.5 shadow-sm flex flex-col justify-between">
                <div class="flex items-center justify-between">
                    <span class="text-[11px] font-bold uppercase tracking-wider text-amber-500">☀️ Saulė (3 MPPT)</span>
                    <span class="text-xs">🔆</span>
                </div>
                <div>
                    <strong class="font-mono text-2xl font-black text-amber-500 block">${pvKw.toFixed(2)} kW</strong>
                    <span class="text-[10px] font-mono text-slate-400 block">
                        PV1: ${Number(mppt.pv1 ?? 0).toFixed(2)} • PV2: ${Number(mppt.pv2 ?? 0).toFixed(2)} • PV3: ${Number(mppt.pv3 ?? 0).toFixed(2)} kW
                    </span>
                </div>
            </div>

            <div class="bg-tractorBg border border-tractorBorder rounded-2xl p-3.5 sm:p-4 space-y-1.5 shadow-sm flex flex-col justify-between">
                <div class="flex items-center justify-between">
                    <span class="text-[11px] font-bold uppercase tracking-wider text-sky-400">🏠 Namų / Ūkio apkrova</span>
                    <span class="text-xs">⚡</span>
                </div>
                <div>
                    <strong class="font-mono text-2xl font-black block" style="color: var(--text-main);">${loadKw.toFixed(2)} kW</strong>
                    <span class="text-[11px] text-slate-400">Momentinis suvartojimas</span>
                </div>
            </div>

            <div class="bg-tractorBg border border-tractorBorder rounded-2xl p-3.5 sm:p-4 space-y-1.5 shadow-sm flex flex-col justify-between">
                <div class="flex items-center justify-between">
                    <span class="text-[11px] font-bold uppercase tracking-wider text-slate-400">🔌 ESO Tinklas</span>
                    <span class="text-[10px] font-bold ${gridExportKw > 0.05 ? 'text-green-500' : (gridImportKw > 0.05 ? 'text-amber-500' : 'text-slate-400')}">
                        ${gridExportKw > 0.05 ? '↗️ Atiduoda' : (gridImportKw > 0.05 ? '↙️ Perka' : '⚖️ Balansas')}
                    </span>
                </div>
                <div>
                    <strong class="font-mono text-2xl font-black block ${gridExportKw > 0.05 ? 'text-green-500' : (gridImportKw > 0.05 ? 'text-amber-500' : 'text-slate-400')}">
                        ${gridExportKw > 0.05 ? `+${gridExportKw.toFixed(2)} kW` : (gridImportKw > 0.05 ? `-${gridImportKw.toFixed(2)} kW` : '0.00 kW')}
                    </strong>
                    <span class="text-[10px] font-mono text-slate-400">Perka: ${gridImportKw.toFixed(2)} • Atiduoda: ${gridExportKw.toFixed(2)} kW</span>
                </div>
            </div>

        </div>

        <!-- 2. GREITAS RANKINIS VALDYMAS (TIESIOGINĖS KOMANDOS Į ${brandMeta.name}) -->
        <div class="bg-tractorBg border border-tractorBorder rounded-2xl p-4 space-y-3">
            <div class="flex flex-wrap items-center justify-between gap-2">
                <div>
                    <h4 class="font-oswald text-sm sm:text-base font-bold uppercase tracking-wider" style="color: var(--text-main);">
                        🎛️ Greitas Rankinis Valdymas (${brandMeta.name} Cloud)
                    </h4>
                    <span class="text-[11px] text-slate-400">
                        ${tel.lastBatteryDecision ? `Paskutinis veiksmas: <strong class="text-green-500">${tel.lastBatteryDecision}</strong>` : 'Siųskite tiesioginę komandą į hibridinį inverterį.'}
                    </span>
                </div>
                <div class="flex flex-wrap gap-2">
                    <button type="button" id="btn-bat-force-charge-now" class="h-9 px-3.5 bg-sky-600 hover:bg-sky-500 text-white font-bold rounded-xl text-xs transition cursor-pointer flex items-center gap-1.5 shadow">
                        <span>⚡</span> <span>Krauti iš tinklo (1 val.)</span>
                    </button>
                    <button type="button" id="btn-bat-self-use-now" class="h-9 px-3.5 bg-tractorPrimary hover:bg-tractorPrimaryHover text-white font-bold rounded-xl text-xs transition cursor-pointer flex items-center gap-1.5 shadow">
                        <span>🏠</span> <span>Savas vartojimas (Auto)</span>
                    </button>
                    <button type="button" id="btn-bat-force-discharge-now" class="h-9 px-3.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold rounded-xl text-xs transition cursor-pointer flex items-center gap-1.5 shadow">
                        <span>💰</span> <span>Iškrauti į tinklą (1 val.)</span>
                    </button>
                </div>
            </div>
        </div>

        <!-- 3. NORD POOL BATERIJOS AUTOPILOTO NUSTATYMAI -->
        <div class="bg-tractorBg border-2 ${bCfg.autopilotEnabled ? 'border-green-500' : 'border-tractorBorder'} rounded-2xl p-4 sm:p-5 space-y-4">
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-tractorBorder/60 pb-3">
                <div>
                    <h3 class="font-oswald text-base sm:text-lg font-bold uppercase tracking-wider flex items-center gap-2" style="color: var(--text-main);">
                        <span>🤖</span> Nord Pool Baterijos Autopilotas
                    </h3>
                    <p class="text-xs text-slate-400">
                        Kasdien automatiškai įrašo optimalų įkrovimo grafiką į ${brandMeta.name} inverterio vidinę atmintį pagal Nord Pool LT biržos kainas.
                    </p>
                </div>

                <label class="flex items-center gap-2.5 bg-tractorSurface px-3.5 py-2 rounded-xl border border-tractorBorder cursor-pointer select-none shrink-0">
                    <input type="checkbox" id="chk-bat-autopilot" class="w-4 h-4 accent-tractorPrimary cursor-pointer" ${bCfg.autopilotEnabled ? 'checked' : ''}>
                    <span class="text-xs font-extrabold uppercase tracking-wider ${bCfg.autopilotEnabled ? 'text-green-500' : ''}" style="${bCfg.autopilotEnabled ? '' : 'color: var(--text-main);'}">
                        ${bCfg.autopilotEnabled ? '🟢 Autopilotas ĮJUNGTAS' : '⚪ Autopilotas IŠJUNGTAS'}
                    </span>
                </label>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                
                <!-- ĮKROVIMO STRATEGIJA -->
                <div class="bg-tractorSurface p-3.5 rounded-xl border border-tractorBorder space-y-2.5">
                    <label class="text-[10px] font-bold text-sky-400 uppercase block">⚡ 1. Kada krauti iš ESO tinklo?</label>
                    <select id="sel-bat-charge-mode" class="w-full h-9 bg-tractorBg border border-tractorBorder rounded-lg px-2.5 text-xs font-bold outline-none cursor-pointer" style="color: var(--text-main);">
                        <option value="cheapest_hours" ${bCfg.chargeMode === 'cheapest_hours' ? 'selected' : ''}>📉 N pigiausių paros valandų</option>
                        <option value="price_limit" ${bCfg.chargeMode === 'price_limit' ? 'selected' : ''}>💶 Kai kaina ≤ pasirinktos ribos</option>
                    </select>

                    <div id="box-bat-cheap-hours" class="${bCfg.chargeMode === 'cheapest_hours' ? '' : 'hidden'} space-y-1">
                        <div class="flex justify-between">
                            <span class="text-slate-400">Pigiausių valandų per parą:</span>
                            <strong id="lbl-bat-cheap-hours" class="font-mono text-sky-400">${bCfg.cheapHoursCount} val.</strong>
                        </div>
                        <input id="inp-bat-cheap-hours" type="range" min="1" max="10" step="1" value="${bCfg.cheapHoursCount}" class="w-full accent-tractorPrimary cursor-pointer">
                    </div>

                    <div id="box-bat-price-limit" class="${bCfg.chargeMode === 'price_limit' ? '' : 'hidden'} space-y-1">
                        <label class="text-slate-400 block">Maks. kaina įkrovimui (ct/kWh be PVM):</label>
                        <input id="inp-bat-max-price" type="number" step="0.5" value="${bCfg.maxChargePriceCt}" class="w-full h-9 bg-tractorBg border border-tractorBorder rounded-lg px-2.5 font-mono font-bold outline-none" style="color: var(--text-main);">
                    </div>
                </div>

                <!-- BATERIJOS RIBOS IR REZERVAS -->
                <div class="bg-tractorSurface p-3.5 rounded-xl border border-tractorBorder space-y-2.5">
                    <label class="text-[10px] font-bold text-green-500 uppercase block">🔋 2. Baterijos ribos (SoC % ir Rezervas)</label>
                    
                    <div class="space-y-1">
                        <div class="flex justify-between">
                            <span class="text-slate-400">Įkrauti iš tinklo iki (paliekant vietos saulei):</span>
                            <strong id="lbl-bat-target-soc" class="font-mono text-green-500">${bCfg.chargeTargetSoc}%</strong>
                        </div>
                        <input id="inp-bat-target-soc" type="range" min="50" max="100" step="5" value="${bCfg.chargeTargetSoc}" class="w-full accent-tractorPrimary cursor-pointer">
                    </div>

                    <div class="space-y-1">
                        <div class="flex justify-between">
                            <span class="text-slate-400">Avarinis rezervas (TOATS / dingus elektrai):</span>
                            <strong id="lbl-bat-min-soc" class="font-mono text-amber-500">${bCfg.minSocBackup}%</strong>
                        </div>
                        <input id="inp-bat-min-soc" type="range" min="10" max="50" step="5" value="${bCfg.minSocBackup}" class="w-full accent-tractorPrimary cursor-pointer">
                    </div>
                </div>

                <!-- BRANGIŲ VALANDŲ REŽIMAS IR GALIA -->
                <div class="bg-tractorSurface p-3.5 rounded-xl border border-tractorBorder space-y-2.5">
                    <label class="text-[10px] font-bold text-amber-500 uppercase block">💰 3. Brangios valandos ir Galia</label>
                    <select id="sel-bat-peak-mode" class="w-full h-9 bg-tractorBg border border-tractorBorder rounded-lg px-2.5 text-xs font-bold outline-none cursor-pointer" style="color: var(--text-main);">
                        <option value="self_use" ${bCfg.peakMode === 'self_use' ? 'selected' : ''}>🏠 Maitinti namus / ūkį (Self-Use)</option>
                        <option value="force_discharge" ${bCfg.peakMode === 'force_discharge' ? 'selected' : ''}>💰 Parduoti brangiai į ESO (Force Discharge)</option>
                    </select>

                    <div id="box-bat-discharge-price" class="${bCfg.peakMode === 'force_discharge' ? '' : 'hidden'} space-y-1">
                        <label class="text-slate-400 block">Parduoti į tinklą kai kaina ≥ (ct/kWh):</label>
                        <input id="inp-bat-discharge-price" type="number" step="1" value="${bCfg.dischargeMinPriceCt}" class="w-full h-8 bg-tractorBg border border-tractorBorder rounded-lg px-2.5 font-mono font-bold outline-none" style="color: var(--text-main);">
                    </div>

                    <div class="grid grid-cols-2 gap-2">
                        <div>
                            <span class="text-[10px] text-slate-400 block">Talpa (kWh)</span>
                            <input id="inp-bat-capacity" type="number" step="0.01" value="${bCfg.batteryCapacityKwh}" class="w-full h-8 bg-tractorBg border border-tractorBorder rounded-lg px-2 font-mono font-bold outline-none" style="color: var(--text-main);">
                        </div>
                        <div>
                            <span class="text-[10px] text-slate-400 block">Įkrov. galia (kW)</span>
                            <input id="inp-bat-charge-kw" type="number" step="0.5" min="1" max="12" value="${bCfg.chargePowerKw}" class="w-full h-8 bg-tractorBg border border-tractorBorder rounded-lg px-2 font-mono font-bold outline-none" style="color: var(--text-main);">
                        </div>
                    </div>
                </div>

            </div>

            <div class="flex justify-end pt-1">
                <button type="button" id="btn-save-battery-autopilot" class="h-10 px-5 bg-tractorPrimary hover:bg-tractorPrimaryHover text-white font-extrabold rounded-xl text-xs uppercase tracking-wider shadow-lg transition cursor-pointer flex items-center gap-2">
                    <span>💾</span> <span>Išsaugoti ir Pritaikyti Grafiką Inverteriui</span>
                </button>
            </div>
        </div>

        <!-- 4. 48 VAL. NORD POOL BATERIJOS VEIKSMŲ PLANAS -->
        <div class="space-y-2 pt-1">
            <div class="flex flex-wrap items-center justify-between gap-2">
                <h3 class="font-oswald text-sm sm:text-base font-bold uppercase tracking-wider flex items-center gap-1.5" style="color: var(--text-main);">
                    <span>📅</span> 48 val. Nord Pool Baterijos Planas (Įkrovimas / Savas vartojimas)
                </h3>
                <span id="bat-plan-summary" class="text-xs font-mono font-bold text-green-500"></span>
            </div>
            <div id="battery-schedule-tables-box" class="grid grid-cols-1 lg:grid-cols-2 gap-3.5"></div>
        </div>
    `;
}

export function bindBatteryAutopilotEvents(currentUser, dev, onSaveConfig, onSendBatteryCommand, cachedElecHours) {
    const readFormConfig = () => ({
        autopilotEnabled: document.getElementById('chk-bat-autopilot')?.checked ?? false,
        batteryCapacityKwh: parseFloat(document.getElementById('inp-bat-capacity')?.value) || 14.04,
        chargeMode: document.getElementById('sel-bat-charge-mode')?.value || 'cheapest_hours',
        cheapHoursCount: parseInt(document.getElementById('inp-bat-cheap-hours')?.value || '4', 10),
        maxChargePriceCt: parseFloat(document.getElementById('inp-bat-max-price')?.value) || 6.0,
        chargeTargetSoc: parseInt(document.getElementById('inp-bat-target-soc')?.value || '90', 10),
        minSocBackup: parseInt(document.getElementById('inp-bat-min-soc')?.value || '20', 10),
        chargePowerKw: parseFloat(document.getElementById('inp-bat-charge-kw')?.value) || 6.0,
        peakMode: document.getElementById('sel-bat-peak-mode')?.value || 'self_use',
        dischargeMinPriceCt: parseFloat(document.getElementById('inp-bat-discharge-price')?.value) || 25.0,
        dischargePowerKw: parseFloat(document.getElementById('inp-bat-charge-kw')?.value) || 6.0
    });

    const refreshPreview = () => {
        if (!dev.config) dev.config = {};
        dev.config.battery = readFormConfig();
        renderBatteryScheduleGrid(dev, cachedElecHours);
    };

    document.getElementById('sel-bat-charge-mode')?.addEventListener('change', (e) => {
        const isCheap = e.target.value === 'cheapest_hours';
        document.getElementById('box-bat-cheap-hours')?.classList.toggle('hidden', !isCheap);
        document.getElementById('box-bat-price-limit')?.classList.toggle('hidden', isCheap);
        refreshPreview();
    });

    document.getElementById('sel-bat-peak-mode')?.addEventListener('change', (e) => {
        const isDis = e.target.value === 'force_discharge';
        document.getElementById('box-bat-discharge-price')?.classList.toggle('hidden', !isDis);
        refreshPreview();
    });

    document.getElementById('inp-bat-cheap-hours')?.addEventListener('input', (e) => {
        const el = document.getElementById('lbl-bat-cheap-hours');
        if (el) el.textContent = `${e.target.value} val.`;
        refreshPreview();
    });

    document.getElementById('inp-bat-target-soc')?.addEventListener('input', (e) => {
        const el = document.getElementById('lbl-bat-target-soc');
        if (el) el.textContent = `${e.target.value}%`;
        refreshPreview();
    });

    document.getElementById('inp-bat-min-soc')?.addEventListener('input', (e) => {
        const el = document.getElementById('lbl-bat-min-soc');
        if (el) el.textContent = `${e.target.value}%`;
        refreshPreview();
    });

    ['chk-bat-autopilot', 'inp-bat-max-price', 'inp-bat-discharge-price', 'inp-bat-capacity', 'inp-bat-charge-kw'].forEach(id => {
        document.getElementById(id)?.addEventListener('change', refreshPreview);
    });

    document.getElementById('btn-save-battery-autopilot')?.addEventListener('click', async () => {
        if (!dev.config) dev.config = {};
        dev.config.battery = readFormConfig();
        await onSaveConfig(true, dev.config);
        showBottomToast("Baterijos Nord Pool nustatymai išsaugoti! Siunčiamas grafikas... 🔋⚡", "info");
        await onSendBatteryCommand({
            deviceDocId: dev.id,
            action: dev.config.battery.autopilotEnabled ? 'apply_nordpool_schedule' : 'self_use'
        }, dev.config.battery.autopilotEnabled ? "Nord Pool baterijos grafikas pritaikytas inverteriui! 🔋✅" : "Autopilotas išjungtas – įjungtas Savas vartojimas (Self-Use) 🏠");
    });

    document.getElementById('btn-bat-force-charge-now')?.addEventListener('click', async () => {
        await onSendBatteryCommand({ deviceDocId: dev.id, action: 'force_charge_now' }, "⚡ Baterija pradėta krauti iš tinklo (1 val.)!");
    });

    document.getElementById('btn-bat-self-use-now')?.addEventListener('click', async () => {
        await onSendBatteryCommand({ deviceDocId: dev.id, action: 'self_use' }, "🏠 Įjungtas Savas vartojimas (Self-Use)!");
    });

    document.getElementById('btn-bat-force-discharge-now')?.addEventListener('click', async () => {
        await onSendBatteryCommand({ deviceDocId: dev.id, action: 'force_discharge_now' }, "💰 Įjungtas iškrovimas į tinklą (1 val.)!");
    });

    renderBatteryScheduleGrid(dev, cachedElecHours);
}

export function renderBatteryScheduleGrid(dev, cachedElecHours) {
    const tablesBox = document.getElementById('battery-schedule-tables-box');
    if (!tablesBox || !dev || !cachedElecHours || cachedElecHours.length === 0) return;

    const bCfg = getDefaultBatteryConfig(dev.config?.battery || {});
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

    const classifyDayHours = (dayHours) => {
        const chargeSet = new Set();
        if (bCfg.chargeMode === 'cheapest_hours') {
            [...dayHours]
                .sort((a, b) => a.priceCtNoVat - b.priceCtNoVat)
                .slice(0, bCfg.cheapHoursCount)
                .forEach(h => chargeSet.add(h.hour));
        } else {
            dayHours.forEach(h => {
                if (h.priceCtNoVat <= bCfg.maxChargePriceCt) chargeSet.add(h.hour);
            });
        }

        const dischargeSet = new Set();
        if (bCfg.peakMode === 'force_discharge') {
            dayHours.forEach(h => {
                if (!chargeSet.has(h.hour) && h.priceCtNoVat >= bCfg.dischargeMinPriceCt) {
                    dischargeSet.add(h.hour);
                }
            });
        }

        return { chargeSet, dischargeSet };
    };

    const todayHours = cachedElecHours.filter(h => h.date === todayStr);
    const todayPlan = classifyDayHours(todayHours);
    const chargeHoursToday = todayHours.filter(h => todayPlan.chargeSet.has(h.hour));
    const avgChargeCt = chargeHoursToday.length > 0
        ? (chargeHoursToday.reduce((a, b) => a + b.priceCtNoVat, 0) / chargeHoursToday.length).toFixed(1)
        : '--';

    const sumEl = document.getElementById('bat-plan-summary');
    if (sumEl) {
        sumEl.textContent = `⚡ Šiandien kraus ${chargeHoursToday.length} val. (vid. ${avgChargeCt} ct/kWh) • Rezervas: ${bCfg.minSocBackup}%`;
    }

    const buildTable = (dateStr, title) => {
        if (!dateStr) {
            return `
                <div class="bg-tractorBg border border-tractorBorder rounded-2xl p-8 text-center text-xs text-slate-400 my-auto">
                    ⏳ Rytojaus Nord Pool kainos pateikiamos po 14:00 val.
                </div>
            `;
        }

        const dayHours = cachedElecHours.filter(h => h.date === dateStr);
        const { chargeSet, dischargeSet } = classifyDayHours(dayHours);

        const rows = dayHours.map(h => {
            const isCurrent = dateStr === todayStr && h.hour === currentHourInt;
            const isCharge = chargeSet.has(h.hour);
            const isDischarge = dischargeSet.has(h.hour);

            let badge = `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-tractorSurface text-slate-400 border border-tractorBorder text-[11px]">🏠 Savas vartojimas (iki ${bCfg.minSocBackup}%)</span>`;
            if (isCharge) {
                badge = `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-sky-500/20 text-sky-400 border border-sky-500/40 font-extrabold text-[11px]">⚡ KRAUS IŠ TINKLO (iki ${bCfg.chargeTargetSoc}%)</span>`;
            } else if (isDischarge) {
                badge = `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-400 border border-amber-500/40 font-extrabold text-[11px]">💰 PARDUOS Į ESO (iki ${bCfg.minSocBackup}%)</span>`;
            }

            return `
                <tr class="border-b border-tractorBorder/50 ${isCurrent ? 'bg-tractorPrimary/20 border-l-4 border-l-tractorPrimary font-bold' : ''}">
                    <td class="py-1.5 px-3 font-mono text-xs font-bold" style="color: var(--text-main);">
                        ${h.hourLabel} ${isCurrent ? '<span class="px-1.5 py-0.5 rounded bg-tractorPrimary text-white text-[9px] uppercase">Dabar</span>' : ''}
                    </td>
                    <td class="py-1.5 px-2 font-mono text-xs font-bold ${isCharge ? 'text-sky-400' : (isDischarge ? 'text-amber-400' : '')}" style="${!isCharge && !isDischarge ? 'color: var(--text-main);' : ''}">
                        ${h.priceCtNoVat.toFixed(1)} ct
                    </td>
                    <td class="py-1.5 px-3 text-right">${badge}</td>
                </tr>
            `;
        }).join('');

        return `
            <div class="bg-tractorBg border border-tractorBorder rounded-2xl overflow-hidden shadow-sm">
                <div class="bg-tractorSurface px-3.5 py-2 border-b border-tractorBorder flex justify-between items-center">
                    <strong class="font-oswald text-sm sm:text-base uppercase tracking-wider" style="color: var(--text-main);">${title}</strong>
                    <span class="font-mono text-xs font-bold" style="color: var(--text-main);">📅 ${dateStr}</span>
                </div>
                <table class="w-full text-left border-collapse">
                    <thead>
                        <tr class="border-b border-tractorBorder bg-tractorSurface/50 text-[10px] uppercase font-bold text-slate-400">
                            <th class="py-1.5 px-3">Valanda</th>
                            <th class="py-1.5 px-2">Nord Pool</th>
                            <th class="py-1.5 px-3 text-right">Baterijos veiksmas</th>
                        </tr>
                    </thead>
                    <tbody>${rows}</tbody>
                </table>
            </div>
        `;
    };

    tablesBox.innerHTML = `
        ${buildTable(todayStr, '📅 ŠIANDIEN')}
        ${buildTable(tomorrowStr, '⏭️ RYTOJ')}
    `;
}