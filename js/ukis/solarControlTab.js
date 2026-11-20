// js/ukis/solarControlTab.js
import { showBottomToast } from '../core/ui.js';

let cachedSolarWeather = null;

export function renderSolarControlTabHtml(dev, liveTelemetry) {
    const cfg = dev.config || {};
    const inverterKw = Number(cfg.inverterKw ?? 15.0);
    const panelsKwp = Number(cfg.panelsKwp ?? 7.0);
    const curPowerW = Number(liveTelemetry.currentPowerW ?? 0);
    const curPowerKw = (curPowerW / 1000).toFixed(2);
    const todayKwh = Number(liveTelemetry.todayKwh ?? 0).toFixed(2);
    const totalKwh = Number(liveTelemetry.totalKwh ?? 0).toFixed(1);
    const isGenerating = curPowerW > 20;

    return `
        <!-- 1. GYVA GROWATT TELEMETRIJA (3 METRIKŲ KORTELĖS) -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
            
            <!-- DABARTINĖ SAULĖS GENERACIJA -->
            <div class="bg-tractorBg border-2 ${isGenerating ? 'border-amber-500 ring-1 ring-amber-500/30' : 'border-tractorBorder'} rounded-2xl p-4 space-y-2 shadow-sm flex flex-col justify-between">
                <div class="flex items-center justify-between">
                    <span class="text-xs font-extrabold uppercase tracking-wider text-amber-500">☀️ Gamyba šią sekundę</span>
                    <span class="px-2 py-0.5 rounded-full text-[10px] font-bold ${isGenerating ? 'bg-green-500/20 text-green-500' : 'bg-tractorSurface text-slate-400'}">
                        ${isGenerating ? '🟢 Gamina' : '🌙 Ramybės būsena'}
                    </span>
                </div>
                <div>
                    <strong class="font-mono text-2xl sm:text-3xl font-black text-amber-500 block">${curPowerKw} kW</strong>
                    <span class="text-xs font-mono text-slate-400">(${curPowerW} W • Iš ${panelsKwp} kWp modulių)</span>
                </div>
            </div>

            <!-- ŠIANDIEN PAGAMINTA -->
            <div class="bg-tractorBg border border-tractorBorder rounded-2xl p-4 space-y-2 shadow-sm flex flex-col justify-between">
                <div class="flex items-center justify-between">
                    <span class="text-xs font-bold uppercase tracking-wider text-slate-400">📅 Šiandien pagaminta</span>
                    <span class="text-base">⚡</span>
                </div>
                <div>
                    <strong class="font-mono text-2xl sm:text-3xl font-black text-green-500 block">${todayKwh} kWh</strong>
                    <span id="solar-today-saved-eur" class="text-xs font-bold text-green-600 dark:text-green-400">Skaičiuojama vertė...</span>
                </div>
            </div>

            <!-- VISO PER GYVAVIMĄ + INVERTERIO GALIA -->
            <div class="bg-tractorBg border border-tractorBorder rounded-2xl p-4 space-y-2 shadow-sm flex flex-col justify-between">
                <div class="flex items-center justify-between">
                    <span class="text-xs font-bold uppercase tracking-wider text-slate-400">🏆 Viso pagaminta</span>
                    <span class="text-xs font-mono bg-tractorSurface px-2 py-0.5 rounded border border-tractorBorder" style="color: var(--text-main);">Inverteris: ${inverterKw} kW</span>
                </div>
                <div>
                    <strong class="font-mono text-2xl sm:text-3xl font-black block" style="color: var(--text-main);">${(totalKwh / 1000).toFixed(2)} MWh</strong>
                    <span class="text-xs font-mono text-slate-400">(${totalKwh} kWh viso)</span>
                </div>
            </div>

        </div>

        <!-- 2. SAULĖS ELEKTRINĖS PARAMETRAI IR AGREGATŲ SINCHRONIZACIJA -->
        <div class="bg-tractorBg border border-tractorBorder p-4 rounded-2xl space-y-3">
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-tractorBorder/60 pb-2.5">
                <div>
                    <h3 class="font-oswald text-base sm:text-lg font-bold uppercase tracking-wider flex items-center gap-2" style="color: var(--text-main);">
                        <span>⚙️</span> Elektrinės Parametrai ir Ūkio Agregatų Maitinimas
                    </h3>
                    <p class="text-xs text-slate-400">
                        Pagal jūsų saulės modulių galią (${panelsKwp} kWp) ir Open-Meteo saulės radiaciją prognozuojame 48 val. gamybą.
                    </p>
                </div>
                <button type="button" id="btn-save-solar-config" class="h-9 px-4 bg-tractorPrimary hover:bg-tractorPrimaryHover text-white font-bold rounded-xl text-xs uppercase tracking-wider transition cursor-pointer shadow shrink-0">
                    💾 Išsaugoti parametrus
                </button>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div class="bg-tractorSurface p-3 rounded-xl border border-tractorBorder space-y-1">
                    <label class="text-[10px] font-bold text-amber-500 uppercase block">☀️ Saulės modulių galia (kWp)</label>
                    <input id="inp-solar-panels-kwp" type="number" step="0.5" value="${panelsKwp}"
                        class="w-full h-9 bg-tractorBg border border-tractorBorder rounded-lg px-3 font-mono font-bold text-sm outline-none" style="color: var(--text-main);">
                </div>

                <div class="bg-tractorSurface p-3 rounded-xl border border-tractorBorder space-y-1">
                    <label class="text-[10px] font-bold text-slate-400 uppercase block">🔌 Growatt Inverterio galia (kW)</label>
                    <input id="inp-solar-inverter-kw" type="number" step="0.5" value="${inverterKw}"
                        class="w-full h-9 bg-tractorBg border border-tractorBorder rounded-lg px-3 font-mono font-bold text-sm outline-none" style="color: var(--text-main);">
                </div>

                <div class="bg-tractorSurface p-3 rounded-xl border border-tractorBorder space-y-1">
                    <div class="flex justify-between items-center">
                        <label class="text-[10px] font-bold text-green-500 uppercase">⚡ Pertekliaus riba agregatams</label>
                        <strong id="lbl-solar-threshold" class="font-mono font-bold text-green-500">&ge; ${cfg.surplusThresholdKw ?? 1.5} kW</strong>
                    </div>
                    <input id="inp-solar-threshold" type="range" min="0.5" max="7.0" step="0.5" value="${cfg.surplusThresholdKw ?? 1.5}" class="w-full accent-tractorPrimary cursor-pointer mt-2">
                </div>
            </div>
        </div>

        <!-- 3. 48 VALANDŲ SAULĖS GAMYBOS PROGNOZĖ + NORD POOL LENTELĖ -->
        <div class="space-y-2 pt-1">
            <div class="flex flex-wrap items-center justify-between gap-2">
                <h3 class="font-oswald text-sm sm:text-base font-bold uppercase tracking-wider flex items-center gap-1.5" style="color: var(--text-main);">
                    <span>📅</span> 48 val. Saulės Gamybos Prognozė (Pagal ${panelsKwp} kWp) ir Nord Pool Kaina
                </h3>
                <span id="solar-forecast-summary" class="text-xs font-mono font-bold text-amber-500">Skaičiuojama saulės radiacija...</span>
            </div>
            <div id="solar-schedule-tables-box" class="grid grid-cols-1 lg:grid-cols-2 gap-3.5"></div>
        </div>
    `;
}

export async function bindSolarControlEvents(currentUser, dev, onConfigSaved, cachedElecHours) {
    const inpPanels = document.getElementById('inp-solar-panels-kwp');
    const inpInv = document.getElementById('inp-solar-inverter-kw');
    const inpThresh = document.getElementById('inp-solar-threshold');
    const lblThresh = document.getElementById('lbl-solar-threshold');

    inpThresh?.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        if (lblThresh) lblThresh.textContent = `≥ ${val.toFixed(1)} kW`;
        dev.config.surplusThresholdKw = val;
        renderSolarScheduleGrid(dev, cachedElecHours);
    });

    [inpPanels, inpInv].forEach(el => {
        el?.addEventListener('input', () => {
            dev.config.panelsKwp = parseFloat(inpPanels?.value) || 7.0;
            dev.config.inverterKw = parseFloat(inpInv?.value) || 15.0;
            renderSolarScheduleGrid(dev, cachedElecHours);
        });
    });

    document.getElementById('btn-save-solar-config')?.addEventListener('click', async () => {
        dev.config.panelsKwp = parseFloat(inpPanels?.value) || 7.0;
        dev.config.inverterKw = parseFloat(inpInv?.value) || 15.0;
        dev.config.surplusThresholdKw = parseFloat(inpThresh?.value) || 1.5;
        await onConfigSaved(true, dev.config);
        showBottomToast("Saulės elektrinės parametrai išsaugoti! ☀️💾");
    });

    // Nuskaitome 48 val. Open-Meteo saulės radiaciją (shortwave_radiation W/m²)
    const lat = dev.config?.lat || 55.2885;
    const lng = dev.config?.lng || 23.9745;
    try {
        const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&hourly=shortwave_radiation,cloud_cover&timezone=Europe%2FVilnius&forecast_days=2`);
        const data = await res.json();
        cachedSolarWeather = data.hourly || null;
    } catch (e) {}

    renderSolarScheduleGrid(dev, cachedElecHours);
}

export function renderSolarScheduleGrid(dev, cachedElecHours) {
    const tablesBox = document.getElementById('solar-schedule-tables-box');
    if (!tablesBox || !dev || cachedElecHours.length === 0) return;

    const cfg = dev.config || {};
    const panelsKwp = Number(cfg.panelsKwp ?? 7.0);
    const inverterKw = Number(cfg.inverterKw ?? 15.0);
    const thresholdKw = Number(cfg.surplusThresholdKw ?? 1.5);

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

    // Paskaičiuojame, kiek € sutaupė šiandien pagaminta saulės elektra
    const todayHours = cachedElecHours.filter(h => h.date === todayStr);
    const avgTodayCt = todayHours.length > 0
        ? todayHours.reduce((a, b) => a + b.priceCtNoVat, 0) / todayHours.length
        : 12.0;
    const savedEurToday = ((Number(dev.telemetry?.todayKwh || 0) * avgTodayCt) / 100).toFixed(2);
    const savedEl = document.getElementById('solar-today-saved-eur');
    if (savedEl) {
        savedEl.textContent = `Vertė pagal Nord Pool: ~${savedEurToday} €`;
    }

    const getHourSolarKw = (dateStr, hourInt) => {
        if (!cachedSolarWeather || !cachedSolarWeather.time) return { kw: 0, rad: 0, clouds: 50 };
        const targetPrefix = `${dateStr}T${String(hourInt).padStart(2, '0')}`;
        const idx = cachedSolarWeather.time.findIndex(t => t.startsWith(targetPrefix));
        if (idx !== -1) {
            const rad = cachedSolarWeather.shortwave_radiation?.[idx] ?? 0;
            const clouds = cachedSolarWeather.cloud_cover?.[idx] ?? 0;
            // Fotovoltinė formulė: kWp * (W/m² / 1000) * 0.85
            const rawKw = panelsKwp * (rad / 1000) * 0.85;
            const cappedKw = Math.min(inverterKw, Math.max(0, rawKw));
            return { kw: parseFloat(cappedKw.toFixed(2)), rad: Math.round(rad), clouds };
        }
        return { kw: 0, rad: 0, clouds: 50 };
    };

    let todayProjectedKwh = 0;
    todayHours.forEach(h => { todayProjectedKwh += getHourSolarKw(todayStr, h.hour).kw; });
    const sumEl = document.getElementById('solar-forecast-summary');
    if (sumEl) {
        sumEl.textContent = `☀️ Prognozuojama šiandienos gamyba: ~${todayProjectedKwh.toFixed(1)} kWh`;
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
            const sol = getHourSolarKw(dateStr, h.hour);
            const isSurplus = sol.kw >= thresholdKw;

            let badgeHtml = "";
            if (isSurplus) {
                badgeHtml = `
                    <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-600 dark:text-amber-300 border border-amber-500/40 font-extrabold text-[11px]">
                        <span>☀️</span> <span>GAMINA (+${sol.kw.toFixed(1)} kW) -> Jungti agregatus!</span>
                    </span>
                `;
            } else if (sol.kw > 0.1) {
                badgeHtml = `
                    <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-green-500/15 text-green-600 dark:text-green-400 border border-green-500/30 font-semibold text-[11px]">
                        <span>🌤️</span> <span>Silpna saulė (+${sol.kw.toFixed(1)} kW)</span>
                    </span>
                `;
            } else {
                badgeHtml = `
                    <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-tractorSurface text-slate-400 border border-tractorBorder font-normal text-[11px]">
                        <span>🌙</span> <span>0 kW</span>
                    </span>
                `;
            }

            return `
                <tr class="border-b border-tractorBorder/50 ${isCurrent ? 'bg-tractorPrimary/20 border-l-4 border-l-tractorPrimary font-bold' : ''}">
                    <td class="py-1.5 px-3 font-mono text-xs font-bold" style="color: var(--text-main);">
                        ${h.hourLabel} ${isCurrent ? '<span class="px-1.5 py-0.5 rounded bg-tractorPrimary text-white text-[9px] uppercase">Dabar</span>' : ''}
                    </td>
                    <td class="py-1.5 px-2 font-mono text-xs font-bold" style="color: var(--text-main);">
                        ${pCt.toFixed(1)} ct
                    </td>
                    <td class="py-1.5 px-2 font-mono text-xs font-black ${sol.kw >= thresholdKw ? 'text-amber-500' : 'text-slate-400'}">
                        ${sol.kw.toFixed(2)} kW <span class="text-[10px] font-normal">(${sol.rad} W/m²)</span>
                    </td>
                    <td class="py-1.5 px-3 text-right">
                        ${badgeHtml}
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
                            <th class="py-1.5 px-2">Nord Pool</th>
                            <th class="py-1.5 px-2">Prognozė (${panelsKwp} kWp)</th>
                            <th class="py-1.5 px-3 text-right">Saulės energija</th>
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