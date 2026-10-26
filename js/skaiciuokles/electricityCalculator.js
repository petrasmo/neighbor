// js/skaiciuokles/electricityCalculator.js
import { db } from '../core/firebase.js';

let cachedElecData = null;
let unsubscribeElec = null;
let includeVat = false; // Pagal nutylėjimą Be PVM

export function renderElectricityCalculator(container) {
    if (!container) return;

    container.innerHTML = `
        <div class="space-y-4 max-w-6xl mx-auto w-full">
            
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
                    <div class="bg-tractorPrimary/20 border-2 border-tractorPrimary p-3.5 sm:p-4 rounded-2xl space-y-0.5 shadow-lg">
                        <span class="text-[10px] sm:text-[11px] uppercase font-black text-tractorPrimaryLight tracking-wider block truncate">Kaina dabar</span>
                        <div class="text-xl sm:text-2xl md:text-3xl font-black font-mono leading-tight" id="elec-now-val" style="color: var(--text-main);">-- ct / kWh</div>
                        <p class="text-[10px] sm:text-xs font-bold text-green-500 truncate" id="elec-now-sub">Skaičiuojama...</p>
                    </div>

                    <div class="bg-tractorBg border border-tractorBorder p-3.5 sm:p-4 rounded-2xl space-y-0.5">
                        <span class="text-[10px] sm:text-[11px] uppercase font-bold text-slate-400 tracking-wider block truncate">🟢 Pigiausia valanda</span>
                        <div class="text-xl sm:text-2xl font-bold font-mono text-green-500 leading-tight" id="elec-min-val">-- ct / kWh</div>
                        <p class="text-[10px] sm:text-xs text-slate-400 truncate" id="elec-min-hour">Laikas: --:--</p>
                    </div>

                    <div class="bg-tractorBg border border-tractorBorder p-3.5 sm:p-4 rounded-2xl space-y-0.5">
                        <span class="text-[10px] sm:text-[11px] uppercase font-bold text-slate-400 tracking-wider block truncate">📊 Vidutinė kaina</span>
                        <div class="text-xl sm:text-2xl font-bold font-mono text-amber-500 leading-tight" id="elec-avg-val">-- ct / kWh</div>
                        <p class="text-[10px] sm:text-xs text-slate-400 truncate" id="elec-avg-sub">Paros vidurkis</p>
                    </div>

                    <div class="bg-tractorBg border border-tractorBorder p-3.5 sm:p-4 rounded-2xl space-y-0.5">
                        <span class="text-[10px] sm:text-[11px] uppercase font-bold text-slate-400 tracking-wider block truncate">🔴 Brangiausia valanda</span>
                        <div class="text-xl sm:text-2xl font-bold font-mono text-red-500 leading-tight" id="elec-max-val">-- ct / kWh</div>
                        <p class="text-[10px] sm:text-xs text-slate-400 truncate" id="elec-max-hour">Laikas: --:--</p>
                    </div>
                </div>

                <!-- VALANDŲ TINKLELIS (VIENAS BENDRAS SĄRAŠAS) -->
                <div class="space-y-3 pt-1">
                    <div class="flex flex-wrap items-center justify-between gap-2 border-b border-tractorBorder/60 pb-2">
                        <h3 class="font-oswald text-base sm:text-lg font-bold uppercase tracking-wider flex items-center gap-1.5" style="color: var(--text-main);">
                            <span>⏱️</span> Elektros Kainos Pavalandžiui (ct / kWh)
                        </h3>
                        <span class="text-[11px] text-slate-400 font-medium">
                            🟢 Pigu (&lt;5 ct) • 🟡 Vidutinė (5–12 ct) • 🔴 Brangu (&gt;12 ct)
                        </span>
                    </div>

                    <div id="elec-hourly-grid" class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5 sm:gap-3">
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

// Grąžina kainą centais už 1 kWh (pvz. 0.7 arba 3.0)
function getPriceCt(hourObj) {
    const eurMwh = hourObj.priceMWh || 0;
    const ctNoVat = eurMwh / 10; // 10 €/MWh = 1 ct/kWh
    return includeVat ? (ctNoVat * 1.21) : ctNoVat;
}

// 🌟 Švarus lietuviškas centų formatavimas: "3 ct", "0,5 ct", "0,05 ct", "0 ct"
function formatCleanCt(val) {
    if (Math.abs(val) < 0.005) return "0";
    
    // Jei mažiau nei 0,1 ct (pvz., 0.05 ct), rodome 2 skaičius po kablelio
    if (Math.abs(val) < 0.1) {
        return parseFloat(val.toFixed(2)).toString().replace('.', ',');
    }
    
    // Standartiškai rodome iki 1 skaičiaus po kablelio (pvz. "3" arba "0,7" arba "12,4")
    return parseFloat(val.toFixed(1)).toString().replace('.', ',');
}

function renderElectricityUI() {
    const grid = document.getElementById('elec-hourly-grid');
    if (!grid || !cachedElecData || !cachedElecData.hours) return;

    const now = new Date();
    let todayStr = now.toLocaleDateString('lt-LT', { timeZone: 'Europe/Vilnius', year: 'numeric', month: '2-digit', day: '2-digit' });
    const currentHourInt = parseInt(now.toLocaleTimeString('en-GB', { timeZone: 'Europe/Vilnius', hour: '2-digit', hour12: false }), 10);

    const allHours = cachedElecData.hours || [];
    const availableDates = [...new Set(allHours.map(h => h.date))].sort();
    if (availableDates.length > 0 && !availableDates.includes(todayStr)) {
        todayStr = availableDates[0];
    }

    const todayStartIdx = allHours.findIndex(h => h.date === todayStr);
    const rawVisible = allHours.slice(todayStartIdx >= 0 ? todayStartIdx : 0);
    const dateCounts = {};
    rawVisible.forEach(h => { dateCounts[h.date] = (dateCounts[h.date] || 0) + 1; });
    const visibleHours = rawVisible.filter(h => dateCounts[h.date] >= 20);

    if (visibleHours.length === 0) {
        grid.innerHTML = `<div class="col-span-full py-8 text-center text-slate-500 text-xs">Šiuo metu duomenų nėra.</div>`;
        return;
    }

    const pricesCt = visibleHours.map(h => getPriceCt(h));
    const minCt = Math.min(...pricesCt);
    const maxCt = Math.max(...pricesCt);
    const avgCt = pricesCt.reduce((a, b) => a + b, 0) / pricesCt.length;

    const minHourObj = visibleHours.find(h => getPriceCt(h) === minCt) || visibleHours[0];
    const maxHourObj = visibleHours.find(h => getPriceCt(h) === maxCt) || visibleHours[0];
    const nowHourObj = visibleHours.find(h => h.date === todayStr && h.hour === currentHourInt) || visibleHours[0];

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

    grid.innerHTML = visibleHours.map((h, idx) => {
        const pCt = getPriceCt(h);
        const isCurrent = (h.date === todayStr && h.hour === currentHourInt);
        const isToday = (h.date === todayStr);

        const topLeftLabel = isCurrent ? "DABAR" : (isToday ? `${h.date.slice(8)} d.` : `Rytoj`);

        // Ribos centais: < 5 ct = Pigu, 5–12 ct = Vidutinė, > 12 ct = Brangu
        let badgeText = "🟢 Pigu";
        let badgeStyle = "background-color: rgba(34, 197, 94, 0.15); color: #16A34A; border: 1px solid rgba(34, 197, 94, 0.4);";

        if (pCt <= 0) {
            badgeText = "💎 0 ct";
            badgeStyle = "background-color: rgba(59, 130, 246, 0.2); color: #3B82F6; border: 1px solid rgba(59, 130, 246, 0.5);";
        } else if (pCt >= 12) {
            badgeText = "🔴 Brangu";
            badgeStyle = "background-color: rgba(239, 68, 68, 0.15); color: #DC2626; border: 1px solid rgba(239, 68, 68, 0.4);";
        } else if (pCt >= 5) {
            badgeText = "🟡 Vidutinė";
            badgeStyle = "background-color: rgba(245, 158, 11, 0.15); color: #D97706; border: 1px solid rgba(245, 158, 11, 0.4);";
        }

        return `
            <div class="elec-hour-card bg-tractorBg border ${isCurrent ? 'border-tractorPrimary ring-2 ring-tractorPrimary shadow-md' : 'border-tractorBorder'} rounded-xl p-3 text-center space-y-2 flex flex-col justify-between transition cursor-pointer hover:border-tractorPrimary select-none" data-idx="${idx}">
                
                <!-- VIRŠUS: DIENA IR VALANDA -->
                <div class="flex items-center justify-between border-b border-tractorBorder/60 pb-1.5 text-xs font-bold leading-none gap-2">
                    <span class="${isCurrent ? 'text-green-600 dark:text-green-400 font-black' : 'text-slate-400 font-bold'} uppercase text-[11px]">${topLeftLabel}</span>
                    <strong class="font-mono font-black text-xs" style="color: var(--text-main);">${h.hourLabel}</strong>
                </div>

                <!-- STATUSO ŽENKLIUKAS -->
                <div class="text-xs font-bold py-1 px-2 rounded-md flex items-center justify-center leading-none" style="${badgeStyle}">
                    ${badgeText}
                </div>

                <!-- AIŠKI KAINA: pvz. "3 ct / kWh" arba "0,7 ct / kWh" -->
                <div class="pt-0.5">
                    <div class="font-mono font-black text-lg sm:text-xl leading-tight" style="color: var(--text-main);">
                        ${formatCleanCt(pCt)} ct
                    </div>
                    <div class="text-[11px] font-bold text-green-600 dark:text-green-400">
                        / kWh
                    </div>
                </div>

            </div>
        `;
    }).join('');

    grid.querySelectorAll('.elec-hour-card').forEach(card => {
        card.onclick = () => {
            const idx = parseInt(card.getAttribute('data-idx'), 10);
            const hObj = visibleHours[idx];
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