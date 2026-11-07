// js/skaiciuokles/electricityCalculator.js
import { db } from '../core/firebase.js';

let cachedElecData = null;
let unsubscribeElec = null;
let includeVat = false; // Pagal nutylėjimą Be PVM

export function renderElectricityCalculator(container) {
    if (!container) return;

    container.innerHTML = `
        <div class="space-y-4 w-full">
            
            <div class="bg-tractorSurface border border-tractorBorder rounded-2xl p-3.5 sm:p-5 md:p-6 space-y-4 shadow-xl">
                
                <!-- HEADERIS -->
                <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-tractorBorder/70 pb-3">
                    <div class="space-y-1">
                        <div class="inline-flex items-center gap-2 bg-green-500/10 border border-green-500/30 text-green-600 dark:text-green-400 text-xs px-3 py-1 rounded-full font-bold uppercase tracking-wider">
                            <span class="w-2 h-2 rounded-full bg-green-500 animate-ping"></span>
                            <span>Gyva birža • Nord Pool (LT zona)</span>
                        </div>
                        <h2 class="font-oswald text-lg sm:text-xl md:text-2xl font-bold uppercase tracking-wider flex items-center gap-2" style="color: var(--text-main);">
                            <span>⚡</span> Elektros Kaina Nord Pool Biržoje
                        </h2>
                    </div>

                    <div class="flex flex-wrap items-center gap-2">
                        <span id="elec-sync-time" class="text-[11px] text-slate-400 mr-1">Kraunama...</span>
                        <div class="flex items-center gap-0.5 bg-tractorBg p-1 rounded-xl border border-tractorBorder">
                            <button type="button" id="btn-elec-vat-no" class="px-3 py-1 rounded-lg text-[11px] sm:text-xs font-bold transition cursor-pointer ${!includeVat ? 'bg-tractorPrimary text-white shadow' : 'text-slate-400 hover:text-white'}">Be PVM</button>
                            <button type="button" id="btn-elec-vat-yes" class="px-3 py-1 rounded-lg text-[11px] sm:text-xs font-bold transition cursor-pointer ${includeVat ? 'bg-tractorPrimary text-white shadow' : 'text-slate-400 hover:text-white'}">Su PVM</button>
                        </div>
                    </div>
                </div>

                <!-- 4 METRIKŲ KORTELĖS (DABAR, PIGIAUSIA, VIDURKIS, BRANGIAUSIA) -->
                <div class="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
                    <div class="bg-tractorPrimary/20 border-2 border-tractorPrimary p-3 sm:p-3.5 rounded-2xl space-y-0.5 shadow-lg">
                        <span class="text-[10px] sm:text-[11px] uppercase font-black text-tractorPrimaryLight tracking-wider block truncate">Kaina dabar</span>
                        <div class="text-xl sm:text-2xl font-black font-mono leading-tight" id="elec-now-val" style="color: var(--text-main);">-- ct / kWh</div>
                        <p class="text-[10px] sm:text-xs font-bold text-green-500 truncate" id="elec-now-sub">Skaičiuojama...</p>
                    </div>

                    <div class="bg-tractorBg border border-tractorBorder p-3 sm:p-3.5 rounded-2xl space-y-0.5">
                        <span class="text-[10px] sm:text-[11px] uppercase font-bold text-slate-400 tracking-wider block truncate">🟢 Pigiausia valanda</span>
                        <div class="text-xl sm:text-2xl font-bold font-mono text-green-500 leading-tight" id="elec-min-val">-- ct / kWh</div>
                        <p class="text-[10px] sm:text-xs text-slate-400 truncate" id="elec-min-hour">Laikas: --:--</p>
                    </div>

                    <div class="bg-tractorBg border border-tractorBorder p-3 sm:p-3.5 rounded-2xl space-y-0.5">
                        <span class="text-[10px] sm:text-[11px] uppercase font-bold text-slate-400 tracking-wider block truncate">📊 Vidutinė kaina</span>
                        <div class="text-xl sm:text-2xl font-bold font-mono text-amber-500 leading-tight" id="elec-avg-val">-- ct / kWh</div>
                        <p class="text-[10px] sm:text-xs text-slate-400 truncate" id="elec-avg-sub">Paros vidurkis</p>
                    </div>

                    <div class="bg-tractorBg border border-tractorBorder p-3 sm:p-3.5 rounded-2xl space-y-0.5">
                        <span class="text-[10px] sm:text-[11px] uppercase font-bold text-slate-400 tracking-wider block truncate">🔴 Brangiausia valanda</span>
                        <div class="text-xl sm:text-2xl font-bold font-mono text-red-500 leading-tight" id="elec-max-val">-- ct / kWh</div>
                        <p class="text-[10px] sm:text-xs text-slate-400 truncate" id="elec-max-hour">Laikas: --:--</p>
                    </div>
                </div>

                <!-- 🌟 2 STULPELIŲ KOMPAKTIŠKOS LENTELĖS (ŠIANDIEN IR RYTOJ) -->
                <div class="space-y-2.5 pt-1">
                    <div class="flex flex-wrap items-center justify-between gap-2 border-b border-tractorBorder/60 pb-2">
                        <h3 class="font-oswald text-sm sm:text-base font-bold uppercase tracking-wider flex items-center gap-1.5" style="color: var(--text-main);">
                            <span>📅</span> Elektros Kainos Pavalandžiui (Šiandien ir Rytoj)
                        </h3>
                        <div class="flex items-center gap-3 text-[11px] font-bold">
                            <span class="flex items-center gap-1"><span class="w-2.5 h-2.5 rounded-full bg-green-500"></span> Pigiausios val.</span>
                            <span class="flex items-center gap-1"><span class="w-2.5 h-2.5 rounded-full bg-amber-500"></span> Vidutinės</span>
                            <span class="flex items-center gap-1"><span class="w-2.5 h-2.5 rounded-full bg-red-500"></span> Brangiausios</span>
                        </div>
                    </div>

                    <div id="elec-hourly-grid" class="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <div class="col-span-full py-8 text-center text-slate-500 text-xs">Kraunamos Nord Pool valandinės kainos...</div>
                    </div>
                </div>

            </div>

        </div>

        <!-- BOTTOM SHEET VALANDOS DETALĖMS -->
        <div id="elec-hour-sheet" class="fixed inset-0 bg-black/80 z-[9999] hidden flex flex-col justify-end items-center p-0 backdrop-blur-sm transition-opacity duration-300">
            <div id="elec-sheet-panel" class="bg-tractorSurface border-t-2 border-x-2 border-b-0 border-tractorBorder rounded-t-3xl rounded-b-none p-5 sm:p-7 pb-10 max-w-xl w-full space-y-4 shadow-2xl relative transform translate-y-full transition-transform duration-300">
                <div class="flex justify-between items-center border-b border-tractorBorder/70 pb-3">
                    <div class="flex items-center gap-2">
                        <span class="text-xl">⚡</span>
                        <h3 id="elec-sheet-title" class="font-oswald text-base sm:text-lg font-bold uppercase tracking-wider" style="color: var(--text-main);">
                            Valandos Elektros Kaina
                        </h3>
                    </div>
                    <button type="button" id="btn-close-elec-sheet" class="text-slate-400 hover:text-white text-2xl font-bold cursor-pointer p-1 leading-none">&times;</button>
                </div>

                <div id="elec-sheet-body" class="space-y-3 text-xs"></div>

                <div class="pt-2">
                    <button type="button" id="btn-ack-elec-sheet" class="w-full h-11 bg-tractorPrimary hover:bg-tractorPrimaryHover text-white font-extrabold rounded-xl text-xs uppercase tracking-wider shadow transition cursor-pointer flex items-center justify-center">
                        Supratau 👍
                    </button>
                </div>
            </div>
        </div>
    `;

    setupElectricityEvents();
    listenToElectricityFirebase();
}

function setupElectricityEvents() {
    const btnVatYes = document.getElementById('btn-elec-vat-yes');
    const btnVatNo = document.getElementById('btn-elec-vat-no');

    if (btnVatYes && btnVatNo) {
        btnVatNo.onclick = () => {
            includeVat = false;
            btnVatNo.className = "px-3 py-1 rounded-lg text-[11px] sm:text-xs font-bold transition cursor-pointer bg-tractorPrimary text-white shadow";
            btnVatYes.className = "px-3 py-1 rounded-lg text-[11px] sm:text-xs font-bold transition cursor-pointer text-slate-400 hover:text-white";
            renderElectricityUI();
        };
        btnVatYes.onclick = () => {
            includeVat = true;
            btnVatYes.className = "px-3 py-1 rounded-lg text-[11px] sm:text-xs font-bold transition cursor-pointer bg-tractorPrimary text-white shadow";
            btnVatNo.className = "px-3 py-1 rounded-lg text-[11px] sm:text-xs font-bold transition cursor-pointer text-slate-400 hover:text-white";
            renderElectricityUI();
        };
    }

    const sheet = document.getElementById('elec-hour-sheet');
    const panel = document.getElementById('elec-sheet-panel');
    const closeSheet = () => {
        panel?.classList.add('translate-y-full');
        setTimeout(() => sheet?.classList.add('hidden'), 250);
    };
    document.getElementById('btn-close-elec-sheet')?.addEventListener('click', closeSheet);
    document.getElementById('btn-ack-elec-sheet')?.addEventListener('click', closeSheet);
    if (sheet) sheet.onclick = (e) => { if (e.target === sheet) closeSheet(); };

    document.querySelectorAll('.btn-theme-toggle').forEach(b => {
        b.addEventListener('click', () => setTimeout(renderElectricityUI, 20));
    });
}

function listenToElectricityFirebase() {
    if (unsubscribeElec) unsubscribeElec();

    unsubscribeElec = db.collection("electricity_prices").doc("market_data").onSnapshot(doc => {
        if (doc.exists) {
            cachedElecData = doc.data();
            const timeEl = document.getElementById('elec-sync-time');
            if (cachedElecData.updatedAt && timeEl) {
                const dt = cachedElecData.updatedAt.toDate ? cachedElecData.updatedAt.toDate() : new Date();
                timeEl.innerHTML = `🕒 Atnaujinta: <strong>${dt.toLocaleTimeString('lt-LT', { hour: '2-digit', minute: '2-digit' })}</strong>`;
            }
            renderElectricityUI();
        }
    });
}

function getPriceCt(hourObj) {
    const eurMwh = hourObj.priceMWh || 0;
    const ctNoVat = eurMwh / 10;
    return includeVat ? (ctNoVat * 1.21) : ctNoVat;
}

function formatCleanCt(val) {
    if (Math.abs(val) < 0.005) return "0";
    if (Math.abs(val) < 0.1) {
        return parseFloat(val.toFixed(2)).toString().replace('.', ',');
    }
    return parseFloat(val.toFixed(1)).toString().replace('.', ',');
}

function renderElectricityUI() {
    const grid = document.getElementById('elec-hourly-grid');
    if (!grid || !cachedElecData || !cachedElecData.hours) return;

    const isLight = document.documentElement.classList.contains('light-theme');

    const now = new Date();
    let todayStr = now.toLocaleDateString('lt-LT', { timeZone: 'Europe/Vilnius', year: 'numeric', month: '2-digit', day: '2-digit' });
    const currentHourInt = parseInt(now.toLocaleTimeString('en-GB', { timeZone: 'Europe/Vilnius', hour: '2-digit', hour12: false }), 10);

    const allHours = cachedElecData.hours || [];
    const dateCounts = {};
    allHours.forEach(h => { dateCounts[h.date] = (dateCounts[h.date] || 0) + 1; });
    const fullDates = Object.keys(dateCounts).filter(d => dateCounts[d] >= 20).sort();

    if (fullDates.length === 0) {
        grid.innerHTML = `<div class="col-span-full py-8 text-center text-slate-500 text-xs">Šiuo metu duomenų nėra.</div>`;
        return;
    }

    if (!fullDates.includes(todayStr)) {
        todayStr = fullDates[0];
    }

    const todayIdx = fullDates.indexOf(todayStr);
    const tomorrowStr = fullDates[todayIdx + 1] || null;

    const todayHours = allHours.filter(h => h.date === todayStr);
    const tomorrowHours = tomorrowStr ? allHours.filter(h => h.date === tomorrowStr) : [];
    const visibleHours = [...todayHours, ...tomorrowHours];

    // Viršutinės 4 KPI kortelės skaičiuojamos pagal ŠIANDIENOS ir RYTOJAUS matomas valandas
    const pricesCt = visibleHours.map(h => getPriceCt(h));
    const minCt = Math.min(...pricesCt);
    const maxCt = Math.max(...pricesCt);
    const avgCt = pricesCt.reduce((a, b) => a + b, 0) / pricesCt.length;

    const minHourObj = visibleHours.find(h => getPriceCt(h) === minCt) || visibleHours[0];
    const maxHourObj = visibleHours.find(h => getPriceCt(h) === maxCt) || visibleHours[0];
    const nowHourObj = todayHours.find(h => h.hour === currentHourInt) || todayHours[0];

    const nowCt = getPriceCt(nowHourObj);

    const elNowVal = document.getElementById('elec-now-val');
    const elNowSub = document.getElementById('elec-now-sub');
    const elMinVal = document.getElementById('elec-min-val');
    const elMinHour = document.getElementById('elec-min-hour');
    const elAvgVal = document.getElementById('elec-avg-val');
    const elAvgSub = document.getElementById('elec-avg-sub');
    const elMaxVal = document.getElementById('elec-max-val');
    const elMaxHour = document.getElementById('elec-max-hour');

    if (elNowVal) elNowVal.textContent = `${formatCleanCt(nowCt)} ct / kWh`;
    if (elNowSub) elNowSub.textContent = `Šią valandą (${nowHourObj.hourLabel})`;

    if (elMinVal) elMinVal.textContent = `${formatCleanCt(minCt)} ct / kWh`;
    if (elMinHour) elMinHour.textContent = `Laikas: ${minHourObj.hourLabel} (${minHourObj.date.slice(5)})`;

    if (elAvgVal) elAvgVal.textContent = `${formatCleanCt(avgCt)} ct / kWh`;
    if (elAvgSub) elAvgSub.textContent = `${includeVat ? 'Su 21% PVM' : 'Lietuvos laiku • Be PVM'}`;

    if (elMaxVal) elMaxVal.textContent = `${formatCleanCt(maxCt)} ct / kWh`;
    if (elMaxHour) elMaxHour.textContent = `Laikas: ${maxHourObj.hourLabel} (${maxHourObj.date.slice(5)})`;

    // Pagalbinė funkcija vienos dienos lentelės generavimui
    const buildDayTableHtml = (dateStr, dayHours, titlePrefix) => {
        if (!dateStr || dayHours.length === 0) {
            return `
                <div class="bg-tractorBg border border-tractorBorder rounded-2xl overflow-hidden flex flex-col">
                    <div class="bg-tractorSurface px-3.5 py-2.5 border-b border-tractorBorder flex justify-between items-center">
                        <strong class="font-oswald text-sm sm:text-base uppercase tracking-wider" style="color: var(--text-main);">⏭️ RYTOJ</strong>
                        <span class="text-xs text-slate-400">Nuo 14:00–15:00 val.</span>
                    </div>
                    <div class="p-8 text-center text-xs text-slate-400 my-auto space-y-1.5">
                        <span class="text-3xl block">⏳</span>
                        <strong class="block text-sm" style="color: var(--text-main);">Rytojaus kainos dar nepaskelbtos</strong>
                        <span>Nord Pool birža kitos paros valandines kainas pateikia po 14:00 val. Lietuvos laiku.</span>
                    </div>
                </div>
            `;
        }

        // Surūšiuojame tos dienos valandas, kad nustatytume 8 pigiausias ir 8 brangiausias
        const sortedDay = [...dayHours].sort((a, b) => getPriceCt(a) - getPriceCt(b));
        const cheapestTierSet = new Set(sortedDay.slice(0, 8).map(h => h.hour));
        const expensiveTierSet = new Set(sortedDay.slice(-8).map(h => h.hour));

        const dayPrices = dayHours.map(h => getPriceCt(h));
        const dMin = Math.min(...dayPrices);
        const dMax = Math.max(...dayPrices);
        const dAvg = dayPrices.reduce((a, b) => a + b, 0) / dayPrices.length;

        const rowsHtml = dayHours.map(h => {
            const pCt = getPriceCt(h);
            const isCurrent = (dateStr === todayStr && h.hour === currentHourInt);

            let priceDot = `<span class="w-2 h-2 rounded-full bg-amber-500 inline-block shrink-0"></span>`;
            let priceColorClass = `text-amber-600 dark:text-amber-400`;
            let rowBgClass = `hover:bg-tractorSurface/70`;

            let statusBadge = `
                <span style="${isLight ? 'background-color: rgba(245, 158, 11, 0.18); color: #92400E; border: 1px solid rgba(245, 158, 11, 0.5);' : ''}" 
                      class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-amber-500/15 text-amber-400 border border-amber-500/30 font-bold text-xs">
                    <span>🟡</span> <span>Vidutinė</span>
                </span>
            `;

            if (pCt <= 0) {
                priceDot = `<span class="w-2 h-2 rounded-full bg-blue-500 inline-block shrink-0"></span>`;
                priceColorClass = `text-blue-600 dark:text-blue-400`;
                rowBgClass = `bg-blue-500/[0.06] hover:bg-blue-500/[0.12]`;
                statusBadge = `
                    <span style="${isLight ? 'background-color: rgba(59, 130, 246, 0.18); color: #1E40AF; border: 1px solid rgba(59, 130, 246, 0.5);' : ''}" 
                          class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-blue-500/20 text-blue-300 border border-blue-500/40 font-extrabold text-xs">
                        <span>💎</span> <span>Nemokama / 0 ct</span>
                    </span>
                `;
            } else if (cheapestTierSet.has(h.hour)) {
                priceDot = `<span class="w-2 h-2 rounded-full bg-green-500 inline-block shrink-0"></span>`;
                priceColorClass = `text-green-600 dark:text-green-400`;
                rowBgClass = `bg-green-500/[0.06] hover:bg-green-500/[0.12]`;
                statusBadge = `
                    <span style="${isLight ? 'background-color: rgba(34, 197, 94, 0.20); color: #14532D; border: 1px solid rgba(34, 197, 94, 0.55);' : ''}" 
                          class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-green-500/20 text-green-300 border border-green-500/40 font-extrabold text-xs">
                        <span>🟢</span> <span>Pigu (Palanki)</span>
                    </span>
                `;
            } else if (expensiveTierSet.has(h.hour)) {
                priceDot = `<span class="w-2 h-2 rounded-full bg-red-500 inline-block shrink-0"></span>`;
                priceColorClass = `text-red-600 dark:text-red-400`;
                rowBgClass = `bg-red-500/[0.04] hover:bg-red-500/[0.09]`;
                statusBadge = `
                    <span style="${isLight ? 'background-color: rgba(239, 68, 68, 0.18); color: #991B1B; border: 1px solid rgba(239, 68, 68, 0.5);' : ''}" 
                          class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-red-500/15 text-red-400 border border-red-500/30 font-bold text-xs">
                        <span>🔴</span> <span>Brangu</span>
                    </span>
                `;
            }

            if (isCurrent) {
                rowBgClass = `bg-tractorPrimary/20 border-l-4 border-l-tractorPrimary font-bold`;
            }

            return `
                <tr class="elec-hour-row border-b border-tractorBorder/50 transition cursor-pointer ${rowBgClass}" data-date="${h.date}" data-hour="${h.hour}">
                    <td class="py-1.5 px-3 whitespace-nowrap">
                        <div class="flex items-center gap-1.5">
                            <span class="font-mono text-xs sm:text-sm font-bold" style="color: var(--text-main);">${h.hourLabel}</span>
                            ${isCurrent ? `<span class="px-1.5 py-0.5 rounded bg-tractorPrimary text-white text-[9px] font-black uppercase leading-none">Dabar</span>` : ''}
                        </div>
                    </td>
                    <td class="py-1.5 px-2 whitespace-nowrap">
                        <div class="flex items-center gap-1.5">
                            ${priceDot}
                            <span class="font-mono text-xs sm:text-sm font-black ${priceColorClass}">${formatCleanCt(pCt)}</span>
                            <span class="text-[11px] font-semibold ${priceColorClass}">ct/kWh</span>
                        </div>
                    </td>
                    <td class="py-1.5 px-3 text-right whitespace-nowrap">
                        ${statusBadge}
                    </td>
                </tr>
            `;
        }).join('');

        return `
            <div class="bg-tractorBg border border-tractorBorder rounded-2xl overflow-hidden shadow-sm flex flex-col justify-between">
                <div>
                    <div class="bg-tractorSurface px-3.5 py-2.5 border-b border-tractorBorder flex justify-between items-center">
                        <strong class="font-oswald text-sm sm:text-base uppercase tracking-wider" style="color: var(--text-main);">
                            ${titlePrefix} (${dateStr.slice(8)} d.)
                        </strong>
                        <span class="text-sm sm:text-base font-mono font-black px-2.5 py-0.5 rounded-lg bg-tractorBg border border-tractorBorder" style="color: var(--text-main);">
                            📅 ${dateStr}
                        </span>
                    </div>
                    <table class="w-full text-left border-collapse">
                        <thead>
                            <tr class="border-b border-tractorBorder bg-tractorSurface/50 text-[10px] uppercase font-bold text-slate-400">
                                <th class="py-1.5 px-3">Valanda</th>
                                <th class="py-1.5 px-2">Nord Pool kaina</th>
                                <th class="py-1.5 px-3 text-right">Būsena</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${rowsHtml}
                        </tbody>
                    </table>
                </div>

                <!-- DIENOS STATISTIKOS APATINĖ EILUTĖ -->
                <div class="bg-tractorSurface px-3.5 py-3 border-t-2 border-tractorBorder flex flex-wrap items-center justify-between gap-2 font-mono">
                    <span class="font-oswald text-sm sm:text-base uppercase font-extrabold tracking-wider" style="color: var(--text-main);">📊 PAROS SUVESTINĖ:</span>
                    <div class="flex items-center gap-3 sm:gap-4 text-xs sm:text-sm">
                        <span style="color: ${isLight ? '#15803D' : '#4ADE80'};" class="font-black">Min: ${formatCleanCt(dMin)} ct</span>
                        <span style="color: ${isLight ? '#D97706' : '#FBBF24'};" class="font-black">Vid: ${formatCleanCt(dAvg)} ct</span>
                        <span style="color: ${isLight ? '#DC2626' : '#F87171'};" class="font-black">Max: ${formatCleanCt(dMax)} ct</span>
                    </div>
                </div>
                
            </div>
        `;
    };

    grid.innerHTML = `
        ${buildDayTableHtml(todayStr, todayHours, '📅 ŠIANDIEN')}
        ${buildDayTableHtml(tomorrowStr, tomorrowHours, '⏭️ RYTOJ')}
    `;

    grid.querySelectorAll('.elec-hour-row').forEach(row => {
        row.onclick = () => {
            const dt = row.getAttribute('data-date');
            const hr = parseInt(row.getAttribute('data-hour'), 10);
            const hObj = visibleHours.find(h => h.date === dt && h.hour === hr);
            if (hObj) openHourBottomSheet(hObj);
        };
    });
}

function openHourBottomSheet(hObj) {
    const sheet = document.getElementById('elec-hour-sheet');
    const panel = document.getElementById('elec-sheet-panel');
    const titleEl = document.getElementById('elec-sheet-title');
    const bodyEl = document.getElementById('elec-sheet-body');
    if (!sheet || !bodyEl) return;

    const pCt = getPriceCt(hObj);
    const ctNoVat = (hObj.priceMWh || 0) / 10;
    const ctWithVat = ctNoVat * 1.21;

    if (titleEl) {
        titleEl.textContent = `⚡ ${hObj.date} | ${hObj.hourLabel} – ${String((hObj.hour + 1) % 24).padStart(2, '0')}:00 val.`;
    }

    bodyEl.innerHTML = `
        <div class="bg-myPostBg border-2 border-tractorPrimary rounded-2xl p-5 text-center space-y-1">
            <span class="text-xs uppercase font-black tracking-wider text-tractorPrimaryLight block">
                1 Kilovatvalandės (kWh) kaina (${includeVat ? 'su PVM' : 'be PVM'})
            </span>
            <div class="text-3xl sm:text-4xl font-black font-mono text-green-400">
                ${formatCleanCt(pCt)} ct / kWh
            </div>
        </div>

        <div class="bg-tractorBg rounded-xl p-4 border border-tractorBorder space-y-2.5 text-xs">
            <div class="flex justify-between items-center border-b border-tractorBorder/60 pb-2">
                <span class="text-slate-400">Kaina be PVM:</span>
                <strong class="font-mono text-sm" style="color: var(--text-main);">${formatCleanCt(ctNoVat)} ct / kWh</strong>
            </div>
            <div class="flex justify-between items-center border-b border-tractorBorder/60 pb-2">
                <span class="text-slate-400">Kaina su PVM (21%):</span>
                <strong class="font-mono text-sm" style="color: var(--text-main);">${formatCleanCt(ctWithVat)} ct / kWh</strong>
            </div>
            <div class="flex justify-between items-center">
                <span class="text-slate-400">Oficiali Nord Pool didmenos kaina:</span>
                <strong class="font-mono text-amber-500">${hObj.priceMWh.toFixed(2)} €/MWh</strong>
            </div>
        </div>
    `;

    sheet.classList.remove('hidden');
    setTimeout(() => panel?.classList.remove('translate-y-full'), 15);
}