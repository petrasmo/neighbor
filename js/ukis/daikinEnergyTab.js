// js/ukis/daikinEnergyTab.js

let activePeriod = 'day'; // 'day', 'week', 'year'
let selectedYear = new Date().getFullYear();

const historyFilesCache = {};
let isFetchingHistory = false;

const WEEKDAYS_LT = ['SEK', 'PIR', 'ANT', 'TRE', 'KET', 'PEN', 'ŠEŠ'];
const MONTHS_LT = ['Sausis', 'Vasaris', 'Kovas', 'Balandis', 'Gegužė', 'Birželis', 'Liepa', 'Rugpjūtis', 'Rugsėjis', 'Spalis', 'Lapkritis', 'Gruodis'];

function formatDateIso(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

async function ensureYearHistoryLoaded(year, onLoadedCallback) {
    if (historyFilesCache[year]) return;
    if (isFetchingHistory) return;

    isFetchingHistory = true;
    try {
        const res = await fetch(`https://us-central1-neighborpm-b9968.cloudfunctions.net/getElectricityHistoryFile?year=${year}`);
        const data = await res.json();
        if (data && data.days) {
            historyFilesCache[year] = data.days;
            if (typeof onLoadedCallback === 'function') onLoadedCallback();
        }
    } catch (err) {
        console.warn(`Nepavyko užkrauti ${year}.json failo:`, err);
    } finally {
        isFetchingHistory = false;
    }
}

export function renderDaikinEnergyTabHtml(dev, cachedElecHours) {
    const curYear = new Date().getFullYear();

    return `
        <div class="space-y-3.5 pt-1 text-xs">
            
            <!-- PERIODŲ IR METŲ PERJUNGIKLIS -->
            <div class="flex flex-wrap items-center justify-between gap-3 bg-tractorBg border border-tractorBorder p-2.5 rounded-2xl">
                <div class="flex flex-wrap items-center gap-1.5 bg-tractorSurface p-1 rounded-xl border border-tractorBorder">
                    <button type="button" class="btn-energy-period px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${activePeriod === 'day' ? 'bg-tractorPrimary text-white shadow' : 'text-slate-400 hover:text-white'}" data-period="day">
                        📅 Diena (Vakar ir Šiandien)
                    </button>
                    <button type="button" class="btn-energy-period px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${activePeriod === 'week' ? 'bg-tractorPrimary text-white shadow' : 'text-slate-400 hover:text-white'}" data-period="week">
                        📆 2 Savaitės (Nuo Pirmadienio)
                    </button>
                    <button type="button" class="btn-energy-period px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${activePeriod === 'year' ? 'bg-tractorPrimary text-white shadow' : 'text-slate-400 hover:text-white'}" data-period="year">
                        📊 Metai (12 mėn.)
                    </button>
                </div>

                <!-- METŲ PASIRINKIMO SELECTOR -->
                <div id="year-toggle-box" class="${activePeriod === 'year' ? 'flex' : 'hidden'} items-center gap-2 bg-tractorSurface px-2.5 py-1 rounded-xl border border-tractorBorder">
                    <span class="text-slate-400 font-bold text-xs">Metai:</span>
                    <select id="sel-energy-year" class="bg-tractorBg border border-tractorBorder rounded-lg px-2.5 py-1 text-xs font-bold outline-none cursor-pointer" style="color: var(--text-main);">
                        <option value="${curYear}" ${selectedYear === curYear ? 'selected' : ''}>📅 ${curYear} m. (Šie metai)</option>
                        <option value="${curYear - 1}" ${selectedYear === curYear - 1 ? 'selected' : ''}>⏮️ ${curYear - 1} m. (Praėję)</option>
                        <option value="${curYear - 2}" ${selectedYear === curYear - 2 ? 'selected' : ''}>⏮️ ${curYear - 2} m.</option>
                    </select>
                </div>

                <div class="flex items-center gap-4 text-xs font-bold">
                    <span class="flex items-center gap-1.5"><span class="w-3 h-3 rounded bg-green-500"></span> <span style="color: var(--text-main);">Grindų šildymas</span></span>
                    <span class="flex items-center gap-1.5"><span class="w-3 h-3 rounded bg-amber-500"></span> <span style="color: var(--text-main);">Karštas vanduo (Boileris)</span></span>
                </div>
            </div>

            <!-- 3 METRIKŲ KORTELĖS VIRŠUJE -->
            <div id="energy-kpi-cards" class="grid grid-cols-1 sm:grid-cols-3 gap-3"></div>

            <!-- LENTELIŲ / GRAFIKŲ TURINYS -->
            <div id="energy-columns-wrapper" class="space-y-3"></div>

            <!-- 🌟 BENDRA SUVESTINĖ APAČIOJE (VISADA MATOMA VISOSE ATASKAITOSE!) -->
            <div id="energy-bottom-grand-total"></div>

        </div>
    `;
}

export function bindDaikinEnergyEvents(dev, cachedElecHours) {
    document.querySelectorAll('.btn-energy-period').forEach(btn => {
        btn.onclick = () => {
            activePeriod = btn.getAttribute('data-period');
            document.querySelectorAll('.btn-energy-period').forEach(b => {
                b.className = "btn-energy-period px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer text-slate-400 hover:text-white";
            });
            btn.className = "btn-energy-period px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer bg-tractorPrimary text-white shadow";

            const yearBox = document.getElementById('year-toggle-box');
            if (yearBox) {
                if (activePeriod === 'year') yearBox.classList.remove('hidden');
                else yearBox.classList.add('hidden');
            }

            renderEnergyData(dev, cachedElecHours);
        };
    });

    const yearSelect = document.getElementById('sel-energy-year');
    if (yearSelect) {
        yearSelect.onchange = async (e) => {
            selectedYear = parseInt(e.target.value, 10);
            await ensureYearHistoryLoaded(selectedYear, () => renderEnergyData(dev, cachedElecHours));
            renderEnergyData(dev, cachedElecHours);
        };
    }

    const curY = new Date().getFullYear();
    ensureYearHistoryLoaded(curY, () => renderEnergyData(dev, cachedElecHours));
    ensureYearHistoryLoaded(curY - 1, () => renderEnergyData(dev, cachedElecHours));

    renderEnergyData(dev, cachedElecHours);
}

function renderEnergyData(dev, cachedElecHours) {
    const kpiBox = document.getElementById('energy-kpi-cards');
    const colsWrapper = document.getElementById('energy-columns-wrapper');
    const bottomTotalBox = document.getElementById('energy-bottom-grand-total');
    if (!kpiBox || !colsWrapper || !dev) return;

    const tel = dev.telemetry || {};
    const cons = tel.consumption || null;

    const arrayKey = activePeriod === 'year' ? 'm' : (activePeriod === 'week' ? 'w' : 'd');
    const rawClim = cons?.climate?.[arrayKey] || [];
    const rawDhw = cons?.dhw?.[arrayKey] || [];

    if (rawClim.length === 0 && rawDhw.length === 0) {
        kpiBox.innerHTML = `
            <div class="col-span-3 bg-tractorBg border border-tractorBorder p-6 rounded-2xl text-center space-y-2">
                <div class="w-8 h-8 rounded-full border-2 border-tractorBorder border-t-tractorPrimary animate-spin mx-auto"></div>
                <strong class="text-sm block" style="color: var(--text-main);">Sinchronizuojama elektros sąnaudų istorija iš Daikin Cloud...</strong>
            </div>
        `;
        colsWrapper.innerHTML = `<div class="text-center py-6 text-slate-400 text-xs">Duomenys atnaujinami automatiškai...</div>`;
        if (bottomTotalBox) bottomTotalBox.innerHTML = '';
        return;
    }

    let climArr = [...rawClim];
    let dhwArr = [...rawDhw];
    const maxItems = Math.max(climArr.length, dhwArr.length);

    // Taip pat pasiimame 2 valandų 'd' masyvus tiksliam Vakar ir Šiandien eurų skaičiavimui
    const dClimArr = cons?.climate?.d || [];
    const dDhwArr = cons?.dhw?.d || [];

    const now = new Date();
    const yestDate = new Date(now);
    yestDate.setDate(yestDate.getDate() - 1);

    const allElecHours = cachedElecHours || [];

    /**
     * Grąžina 24 valandų kainų masyvą [ct0, ct1, ..., ct23] konkrečiai dienai
     */
    const getDay24Prices = (d) => {
        const y = d.getFullYear();
        const isoDate = formatDateIso(d);

        // 1. Pirma ieškome greitajame Firestore (ypač aktualu Šiandienai ir Vakarui)
        const fromLive = new Array(24).fill(null);
        let liveCount = 0;
        allElecHours.forEach(h => {
            if (!h || !h.date) return;
            const cleanDate = h.date.replace(/\./g, '-').trim();
            if (cleanDate === isoDate && h.hour >= 0 && h.hour < 24) {
                fromLive[h.hour] = h.priceCtNoVat;
                liveCount++;
            }
        });
        if (liveCount >= 20) return fromLive;

        // 2. Jei gyvame nėra – imame iš JSON failo kešo
        if (historyFilesCache[y] && Array.isArray(historyFilesCache[y][isoDate])) {
            const fileArr = historyFilesCache[y][isoDate];
            // Jei turėjome dalį gyvų valandų – apjungiame
            for (let hr = 0; hr < 24; hr++) {
                if (fromLive[hr] === null && fileArr[hr] !== undefined) {
                    fromLive[hr] = fileArr[hr];
                }
            }
            const valid = fromLive.filter(v => v !== null && v !== undefined);
            if (valid.length > 0) return fromLive;
        }

        return liveCount > 0 ? fromLive : [];
    };

    /**
     * 🌟 Pagalbinė funkcija: Apskaičiuoja TIKSLIĄ Vakar (startIdx=0) arba Šiandien (startIdx=12)
     * sumą eurais pagal 2 valandų intervalų vidurkius!
     */
    const calcExact2HourDayCost = (targetDate, startIdx) => {
        const prices24 = getDay24Prices(targetDate);
        if (prices24.length === 0) return { hasPrice: false, costEur: 0, kwh: 0 };

        let dayEur = 0;
        let dayKwh = 0;
        let foundIntervals = 0;

        for (let k = 0; k < 12; k++) {
            const idx = startIdx + k;
            const kwh = Number(dClimArr[idx] || 0) + Number(dDhwArr[idx] || 0);
            dayKwh += kwh;

            const hOffset = k * 2;
            const p1 = prices24[hOffset];
            const p2 = prices24[hOffset + 1];

            if (p1 !== null && p1 !== undefined && p2 !== null && p2 !== undefined) {
                const avg2hCt = (p1 + p2) / 2;
                dayEur += kwh * (avg2hCt / 100);
                foundIntervals++;
            } else if (p1 !== null && p1 !== undefined) {
                dayEur += kwh * (p1 / 100);
                foundIntervals++;
            }
        }

        return {
            hasPrice: foundIntervals > 0,
            costEur: dayEur,
            kwh: dayKwh
        };
    };

    let totalClimKwh = 0;
    let totalDhwKwh = 0;
    let totalCostEur = 0;
    let pricedCount = 0;

    /**
     * 🌟 LENTELĖS GENERATORIUS SU APATINIU SUMINIU FOOTERIU („IŠ VISO:“) KIEKVIENAM STULPELIUI!
     */
    const buildColumnTableHtml = (title, rows, fullMaxVal) => {
        let colSumClim = 0;
        let colSumDhw = 0;
        let colSumEur = 0;
        let colHasPrice = false;

        const rowsHtml = rows.map(r => {
            colSumClim += r.cKwh;
            colSumDhw += r.dKwh;
            if (r.hasPrice) {
                colSumEur += (r.rawCostEur || 0);
                colHasPrice = true;
            }

            const climPct = Math.min(100, (r.cKwh / fullMaxVal) * 100);
            const dhwPct = Math.min(100, (r.dKwh / fullMaxVal) * 100);
            const costColor = r.hasPrice ? "text-green-600 dark:text-green-400 font-bold" : "text-slate-400 font-normal";

            return `
                <div class="flex items-center gap-3 py-1.5 px-3 sm:px-4 border-b border-tractorBorder/40 hover:bg-tractorSurface/50 transition text-xs">
                    <span class="w-24 sm:w-28 font-mono font-bold text-slate-400 shrink-0 truncate">${r.label}</span>
                    
                    <div class="flex-1 flex items-center bg-tractorSurface h-4 rounded-md overflow-hidden border border-tractorBorder/70">
                        ${r.cKwh > 0 ? `<div style="width: ${climPct}%;" class="h-full bg-green-500 transition-all duration-300" title="Grindys: ${r.cKwh.toFixed(1)} kWh"></div>` : ''}
                        ${r.dKwh > 0 ? `<div style="width: ${dhwPct}%;" class="h-full bg-amber-500 transition-all duration-300" title="Boileris: ${r.dKwh.toFixed(1)} kWh"></div>` : ''}
                    </div>

                    <div class="min-w-[130px] sm:min-w-[155px] text-right shrink-0 font-mono whitespace-nowrap pl-2">
                        <strong class="text-xs sm:text-sm font-black" style="color: var(--text-main);">${r.sumKwh.toFixed(1)} kWh</strong>
                        <span class="${costColor} text-xs ml-1.5">${r.costText}</span>
                    </div>
                </div>
            `;
        }).join('');

        const colTotalKwh = colSumClim + colSumDhw;

        // 🌟 APATINĖ SUMINĖ EILUTĖ STULPELYJE
        const footerHtml = `
            <div class="bg-tractorSurface px-3 sm:px-4 py-2.5 border-t-2 border-tractorBorder flex items-center justify-between text-xs font-mono">
                <div class="flex items-center gap-2">
                    <span class="font-oswald uppercase font-bold tracking-wider text-xs sm:text-sm" style="color: var(--text-main);">⚡ IŠ VISO:</span>
                    <span class="text-[11px] text-slate-400 hidden sm:inline">(🏠 ${colSumClim.toFixed(1)} + 🛢️ ${colSumDhw.toFixed(1)} kWh)</span>
                </div>
                <div class="text-right whitespace-nowrap">
                    <strong class="text-sm sm:text-base font-black" style="color: var(--text-main);">${colTotalKwh.toFixed(1)} kWh</strong>
                    <strong class="text-sm sm:text-base font-black text-green-600 dark:text-green-400 ml-2">
                        ${colHasPrice ? `(${colSumEur.toFixed(2)} €)` : '(-)'}
                    </strong>
                </div>
            </div>
        `;

        return `
            <div class="bg-tractorBg border border-tractorBorder rounded-2xl overflow-hidden shadow-sm flex flex-col justify-between">
                <div>
                    <div class="bg-tractorSurface px-4 py-2.5 border-b border-tractorBorder flex justify-between items-center">
                        <strong class="font-oswald text-sm sm:text-base uppercase tracking-wider" style="color: var(--text-main);">
                            ${title}
                        </strong>
                        <span class="text-[10px] text-slate-400 font-mono">2 val. Nord Pool vidurkis</span>
                    </div>
                    <div class="divide-y divide-tractorBorder/30">
                        ${rowsHtml.length > 0 ? rowsHtml : '<div class="py-6 text-center text-slate-400 text-xs">Nėra duomenų šiam laikotarpiui</div>'}
                    </div>
                </div>
                ${footerHtml}
            </div>
        `;
    };

    // =========================================================================
    // 1. REŽIMAS: DIENA (VAKAR IR ŠIANDIEN KAS 2 VAL.)
    // =========================================================================
    if (activePeriod === 'day') {
        const todayStr = formatDateIso(now);
        const yestStr = formatDateIso(yestDate);

        const col1Title = `📅 VAKAR (${yestStr})`;
        const col2Title = `📅 ŠIANDIEN (${todayStr})`;

        const hourLabels = [
            "00–02 val.", "02–04 val.", "04–06 val.", "06–08 val.", "08–10 val.", "10–12 val.",
            "12–14 val.", "14–16 val.", "16–18 val.", "18–20 val.", "20–22 val.", "22–24 val."
        ];

        const yest24 = getDay24Prices(yestDate);
        const today24 = getDay24Prices(now);

        const col1Rows = [];
        const col2Rows = [];

        for (let i = 0; i < 24; i++) {
            const cKwh = Number(climArr[i] || 0);
            const dKwh = Number(dhwArr[i] || 0);
            const sumKwh = cKwh + dKwh;
            totalClimKwh += cKwh;
            totalDhwKwh += dKwh;

            const isYesterday = (i < 12);
            const hourOffset = isYesterday ? (i * 2) : ((i - 12) * 2);
            const target24 = isYesterday ? yest24 : today24;

            // Imame dviejų valandų (pvz. 16:00 ir 17:00) Nord Pool kainų vidurkį
            const p1 = target24[hourOffset];
            const p2 = target24[hourOffset + 1];

            let costText = "(-)";
            let rawCostEur = 0;
            let hasPrice = false;

            if (p1 !== null && p1 !== undefined && p2 !== null && p2 !== undefined) {
                const avgPriceCt = (p1 + p2) / 2;
                rawCostEur = sumKwh * (avgPriceCt / 100);
                totalCostEur += rawCostEur;
                pricedCount++;
                hasPrice = true;
                costText = `(${rawCostEur.toFixed(2)} €)`;
            } else if (p1 !== null && p1 !== undefined) {
                rawCostEur = sumKwh * (p1 / 100);
                totalCostEur += rawCostEur;
                pricedCount++;
                hasPrice = true;
                costText = `(${rawCostEur.toFixed(2)} €)`;
            }

            const rowItem = {
                label: hourLabels[i % 12],
                cKwh,
                dKwh,
                sumKwh,
                rawCostEur,
                costText,
                hasPrice
            };

            if (isYesterday) col1Rows.push(rowItem);
            else col2Rows.push(rowItem);
        }

        renderKpiCards(kpiBox, totalClimKwh, totalDhwKwh, totalCostEur, pricedCount, 'VAKAR + ŠIANDIEN');
        renderBottomGrandTotal(bottomTotalBox, "Bendra Vakar ir Šiandien suvestinė", totalClimKwh, totalDhwKwh, totalCostEur, pricedCount);

        const maxVal = Math.max(...[...col1Rows, ...col2Rows].map(r => r.sumKwh), 0.5);

        colsWrapper.innerHTML = `
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
                ${buildColumnTableHtml(col1Title, col1Rows, maxVal)}
                ${buildColumnTableHtml(col2Title, col2Rows, maxVal)}
            </div>
        `;
    }

    // =========================================================================
    // 2. REŽIMAS: 2 SAVAITĖS (ŠI SAVAITĖ KAIRĖJE, PRAĖJUSI DEŠINĖJE)
    // =========================================================================
    else if (activePeriod === 'week') {
        const curDayOfWeek = now.getDay() === 0 ? 7 : now.getDay();

        const thisMonday = new Date(now);
        thisMonday.setDate(now.getDate() - (curDayOfWeek - 1));
        thisMonday.setHours(0, 0, 0, 0);

        const prevMonday = new Date(thisMonday);
        prevMonday.setDate(prevMonday.getDate() - 7);

        const prevSunday = new Date(thisMonday);
        prevSunday.setDate(prevSunday.getDate() - 1);
        prevSunday.setHours(23, 59, 59, 999);

        const thisWeekTitle = `📆 ŠI SAVAITĖ (Nuo ${formatDateIso(thisMonday).slice(5)} PIR iki Šiandien)`;
        const prevWeekTitle = `⏮️ PRAĖJUSI SAVAITĖ (${formatDateIso(prevMonday).slice(5)} PIR – ${formatDateIso(prevSunday).slice(5)} SEK)`;

        const thisWeekRows = [];
        const prevWeekRows = [];

        for (let i = 0; i < maxItems; i++) {
            const daysAgo = (maxItems - 2) - i;
            if (daysAgo < 0) continue;

            const itemDate = new Date(now);
            itemDate.setDate(itemDate.getDate() - daysAgo);
            itemDate.setHours(0, 0, 0, 0);

            // Tikriname, ar ši diena patenka į Šią arba Praėjusią savaitę
            const isThisWeek = itemDate >= thisMonday;
            const isPrevWeek = itemDate >= prevMonday && itemDate <= prevSunday;
            if (!isThisWeek && !isPrevWeek) continue;

            const cKwh = Number(climArr[i] || 0);
            const dKwh = Number(dhwArr[i] || 0);
            const sumKwh = cKwh + dKwh;
            totalClimKwh += cKwh;
            totalDhwKwh += dKwh;

            const dateIso = formatDateIso(itemDate);
            const dayOfWeekName = WEEKDAYS_LT[itemDate.getDay()];
            const shortDate = dateIso.slice(5);

            let dayLabel = `${shortDate} (${dayOfWeekName})`;
            if (daysAgo === 0) dayLabel = `Šiandien (${dayOfWeekName})`;
            else if (daysAgo === 1) dayLabel = `Vakar (${dayOfWeekName})`;

            let costText = "(-)";
            let rawCostEur = 0;
            let hasPrice = false;

            // 🌟 JEI TAI ŠIANDIENA ARBA VAKAR – IMAME TIKSLIĄ 2 VALANDŲ SUMĄ (KAD SUTAPTŲ CENTAS Į CENTĄ SU DIENOS GRAFIKU!)
            if (daysAgo === 0 && dClimArr.length >= 24) {
                const exact = calcExact2HourDayCost(now, 12);
                if (exact.hasPrice) {
                    rawCostEur = exact.costEur;
                    totalCostEur += rawCostEur;
                    pricedCount++;
                    hasPrice = true;
                    costText = `(${rawCostEur.toFixed(2)} €)`;
                }
            } else if (daysAgo === 1 && dClimArr.length >= 12) {
                const exact = calcExact2HourDayCost(yestDate, 0);
                if (exact.hasPrice) {
                    rawCostEur = exact.costEur;
                    totalCostEur += rawCostEur;
                    pricedCount++;
                    hasPrice = true;
                    costText = `(${rawCostEur.toFixed(2)} €)`;
                }
            } else {
                // Ankstesnėms savaitės dienoms Daikin saugo tik paros kWh, todėl imame tos paros Nord Pool kainą
                const day24 = getDay24Prices(itemDate).filter(v => v !== null && v !== undefined);
                if (day24.length > 0) {
                    const avgDayPriceCt = day24.reduce((a, b) => a + b, 0) / day24.length;
                    rawCostEur = sumKwh * (avgDayPriceCt / 100);
                    totalCostEur += rawCostEur;
                    pricedCount++;
                    hasPrice = true;
                    costText = `(~${rawCostEur.toFixed(2)} €)`;
                }
            }

            const rowItem = {
                date: itemDate,
                label: dayLabel,
                cKwh,
                dKwh,
                sumKwh,
                rawCostEur,
                costText,
                hasPrice
            };

            if (isThisWeek) thisWeekRows.push(rowItem);
            else if (isPrevWeek) prevWeekRows.push(rowItem);
        }

        renderKpiCards(kpiBox, totalClimKwh, totalDhwKwh, totalCostEur, pricedCount, '2 SAVAITĖS');
        renderBottomGrandTotal(bottomTotalBox, "Bendra 2 savaičių suvestinė", totalClimKwh, totalDhwKwh, totalCostEur, pricedCount);

        const maxVal = Math.max(...[...thisWeekRows, ...prevWeekRows].map(r => r.sumKwh), 0.5);

        colsWrapper.innerHTML = `
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
                ${buildColumnTableHtml(thisWeekTitle, thisWeekRows, maxVal)}
                ${buildColumnTableHtml(prevWeekTitle, prevWeekRows, maxVal)}
            </div>
        `;
    }

    // =========================================================================
    // 3. REŽIMAS: METAI (12 MĖNESIŲ SU DETALIA APATINE SUVESTINE)
    // =========================================================================
    else if (activePeriod === 'year') {
        const curYear = now.getFullYear();

        let yearClim = [];
        let yearDhw = [];
        let isDataAvailable = true;

        if (selectedYear === curYear) {
            yearClim = climArr.length >= 24 ? climArr.slice(12, 24) : climArr;
            yearDhw = dhwArr.length >= 24 ? dhwArr.slice(12, 24) : dhwArr;
        } else if (selectedYear === curYear - 1) {
            yearClim = climArr.length >= 24 ? climArr.slice(0, 12) : [];
            yearDhw = dhwArr.length >= 24 ? dhwArr.slice(0, 12) : [];
        } else {
            isDataAvailable = false;
        }

        if (!isDataAvailable) {
            colsWrapper.innerHTML = `
                <div class="bg-tractorBg border border-tractorBorder p-8 rounded-2xl text-center space-y-2">
                    <span class="text-3xl block">⏳</span>
                    <strong class="text-sm block" style="color: var(--text-main);">${selectedYear} m. duomenys nepasiekiami</strong>
                    <p class="text-xs text-slate-400 max-w-md mx-auto">
                        Oficiali <strong>Daikin Onecta Cloud API</strong> sistema saugo tik paskutinių 24 mėnesių (2 metų) sąnaudų istoriją (${curYear - 1} m. ir ${curYear} m.).
                    </p>
                </div>
            `;
            renderKpiCards(kpiBox, 0, 0, 0, 0, `${selectedYear} M.`);
            if (bottomTotalBox) bottomTotalBox.innerHTML = '';
            return;
        }

        const yearDaysMap = historyFilesCache[selectedYear] || {};
        const yearRows = [];

        for (let i = 0; i < 12; i++) {
            const cKwh = Number(yearClim[i] || 0);
            const dKwh = Number(yearDhw[i] || 0);
            const sumKwh = cKwh + dKwh;
            totalClimKwh += cKwh;
            totalDhwKwh += dKwh;

            let costText = "(-)";
            let rawCostEur = 0;
            let hasPrice = false;

            // 🌟 Jei tai EINAMASIS MĖNUO ir kWh sutampa su Vakar + Šiandien 2val. suma –
            // imame tikslią 2 valandų sumą, kad nesiskirtų nuo Dienos ataskaitos!
            const isCurrentMonth = (selectedYear === curYear && i === now.getMonth());
            const yestExact = calcExact2HourDayCost(yestDate, 0);
            const todayExact = calcExact2HourDayCost(now, 12);
            const recent2DaysKwh = (yestDate.getMonth() === i ? yestExact.kwh : 0) + todayExact.kwh;

            if (isCurrentMonth && sumKwh > 0 && Math.abs(sumKwh - recent2DaysKwh) < 0.5) {
                rawCostEur = (yestDate.getMonth() === i ? yestExact.costEur : 0) + todayExact.costEur;
                totalCostEur += rawCostEur;
                pricedCount++;
                hasPrice = true;
                costText = `(${rawCostEur.toFixed(2)} €)`;
            } else {
                // Praėjusiems mėnesiams Daikin pateikia tik bendrą mėnesio kWh sumą,
                // todėl skaičiuojame pagal to mėnesio Nord Pool biržos kainas iš JSON failo
                const monthPrefix = `${selectedYear}-${String(i + 1).padStart(2, '0')}`;
                const monthPrices = [];

                Object.keys(yearDaysMap).forEach(dateKey => {
                    if (dateKey.startsWith(monthPrefix) && Array.isArray(yearDaysMap[dateKey])) {
                        yearDaysMap[dateKey].forEach(p => {
                            if (p !== null && p !== undefined) monthPrices.push(p);
                        });
                    }
                });

                if (monthPrices.length > 0) {
                    const avgMonthCt = monthPrices.reduce((a, b) => a + b, 0) / monthPrices.length;
                    rawCostEur = sumKwh * (avgMonthCt / 100);
                    totalCostEur += rawCostEur;
                    pricedCount++;
                    hasPrice = true;
                    costText = `(~${rawCostEur.toFixed(2)} €)`;
                }
            }

            yearRows.push({
                label: MONTHS_LT[i],
                cKwh,
                dKwh,
                sumKwh,
                rawCostEur,
                costText,
                hasPrice
            });
        }

        renderKpiCards(kpiBox, totalClimKwh, totalDhwKwh, totalCostEur, pricedCount, `${selectedYear} M.`);
        renderBottomGrandTotal(bottomTotalBox, `Bendra ${selectedYear} m. suvestinė (12 mėnesių)`, totalClimKwh, totalDhwKwh, totalCostEur, pricedCount);

        const maxVal = Math.max(...yearRows.map(r => r.sumKwh), 0.5);

        colsWrapper.innerHTML = `
            <div class="w-full">
                ${buildColumnTableHtml(`📅 ${selectedYear} m. elektros sąnaudos pagal mėnesius`, yearRows, maxVal)}
            </div>
        `;
    }
}

function renderKpiCards(kpiBox, totalClimKwh, totalDhwKwh, totalCostEur, pricedCount, periodLabel) {
    const totalKwhAll = totalClimKwh + totalDhwKwh;
    kpiBox.innerHTML = `
        <div class="bg-tractorBg border border-tractorBorder p-3 rounded-2xl space-y-1">
            <span class="text-[10px] uppercase font-bold text-slate-400 block">🏠 Grindų šildymui</span>
            <strong class="text-xl sm:text-2xl font-black font-mono text-green-500 block">${totalClimKwh.toFixed(1)} kWh</strong>
            <span class="text-[11px] text-slate-400">Šildymo ciklas</span>
        </div>

        <div class="bg-tractorBg border border-tractorBorder p-3 rounded-2xl space-y-1">
            <span class="text-[10px] uppercase font-bold text-slate-400 block">🛢️ Karštam vandeniui (Boileriui)</span>
            <strong class="text-xl sm:text-2xl font-black font-mono text-amber-500 block">${totalDhwKwh.toFixed(1)} kWh</strong>
            <span class="text-[11px] text-slate-400">DHW ruošimas</span>
        </div>

        <div class="bg-tractorPrimary/15 border-2 border-tractorPrimary p-3 rounded-2xl space-y-1">
            <span class="text-[10px] uppercase font-black text-tractorPrimaryLight block">
                ⚡ Bendra suma (${periodLabel})
            </span>
            <strong class="text-xl sm:text-2xl font-black font-mono block" style="color: var(--text-main);">${totalKwhAll.toFixed(1)} kWh</strong>
            <span class="text-xs font-bold text-green-600 dark:text-green-400 font-mono">
                ${pricedCount > 0 ? `Nord Pool suma: ${totalCostEur.toFixed(2)} € (be PVM)` : 'Nord Pool suma: –'}
            </span>
        </div>
    `;
}

/**
 * 🌟 DIDELĖ BENDRA APATINĖ SUVESTINĖS JUOSTA VISOMS ATASKAITOMS
 */
function renderBottomGrandTotal(container, title, totalClimKwh, totalDhwKwh, totalCostEur, pricedCount) {
    if (!container) return;
    const totalKwh = totalClimKwh + totalDhwKwh;
    const avgCtPerKwh = totalKwh > 0 && pricedCount > 0 ? ((totalCostEur / totalKwh) * 100).toFixed(1) : null;
    const totalWithVat = totalCostEur * 1.21;

    container.innerHTML = `
        <div class="bg-tractorPrimary/15 border-2 border-tractorPrimary rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md">
            <div class="space-y-0.5">
                <span class="text-[10px] uppercase font-black tracking-wider text-tractorPrimaryLight block">📊 GALUTINĖ ATASKAITOS SUVESTINĖ</span>
                <h4 class="font-oswald text-base sm:text-lg font-bold uppercase tracking-wide" style="color: var(--text-main);">
                    ${title}
                </h4>
                <div class="text-xs text-slate-400 font-mono">
                    🏠 Grindys: <strong>${totalClimKwh.toFixed(1)} kWh</strong> • 🛢️ Boileris: <strong>${totalDhwKwh.toFixed(1)} kWh</strong>
                    ${avgCtPerKwh ? ` • ⚡ Vid. kaina: <strong>${avgCtPerKwh} ct/kWh</strong>` : ''}
                </div>
            </div>

            <div class="flex items-center gap-4 sm:text-right border-t sm:border-t-0 border-tractorBorder/60 pt-2 sm:pt-0 font-mono">
                <div>
                    <span class="text-[10px] uppercase font-bold text-slate-400 block">Iš viso sunaudota</span>
                    <strong class="text-lg sm:text-xl font-black" style="color: var(--text-main);">${totalKwh.toFixed(1)} kWh</strong>
                </div>
                <div class="h-8 w-[1px] bg-tractorBorder"></div>
                <div>
                    <span class="text-[10px] uppercase font-bold text-slate-400 block">Suma pagal Nord Pool</span>
                    <strong class="text-lg sm:text-xl font-black text-green-600 dark:text-green-400">
                        ${pricedCount > 0 ? `${totalCostEur.toFixed(2)} €` : '–'}
                    </strong>
                    ${pricedCount > 0 ? `<span class="block text-[10px] text-slate-400">(su PVM: ${totalWithVat.toFixed(2)} €)</span>` : ''}
                </div>
            </div>
        </div>
    `;
}