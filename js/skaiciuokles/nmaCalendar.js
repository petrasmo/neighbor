// js/skaiciuokles/nmaCalendar.js
import { db } from '../core/firebase.js';

let liveRegulations = null;
let unsubscribeRegs = null;

// Numatytosios taisyklės pagal LR ŽŪM ir AM galiojančius įsakymus
function getDefaultRegulations() {
    const currentYear = new Date().getFullYear();
    const isEarlyYear = new Date().getMonth() < 7; // Iki rugpjūčio priskiriame pavasario sezonui
    const baseYear = isEarlyYear ? currentYear - 1 : currentYear;

    return {
        // Mėšlo ir srutų draudimo sezonas
        manureBanStart: `${baseYear}-11-15`,
        manureBanEnd: `${baseYear + 1}-03-20`,
        // Tarpinių pasėlių (posėlių) išlaikymo terminai
        coverCropWinterEnd: `${baseYear + 1}-01-15`,
        coverCropSpringEnd: `${baseYear + 1}-03-15`,
        // Deklaravimo ir kuro terminai
        dieselQuotaDeadline: `${baseYear + 1}-06-30`,
        declarationDeadline: `${baseYear + 1}-06-20`,
        // Pūdymų ir šienavimo terminai
        fallowMaintenanceDeadline: `${baseYear + 1}-08-15`,
        catchCropSowingDeadline: `${baseYear + 1}-09-01`
    };
}

export function renderNmaCalendar(container) {
    if (!container) return;

    container.innerHTML = `
        <div class="space-y-4 max-w-6xl mx-auto w-full">
            
            <!-- HEADERIS IR ŠVIESOFORAI -->
            <div class="bg-tractorSurface border border-tractorBorder rounded-2xl p-4 sm:p-6 md:p-7 space-y-4 shadow-xl">
                <div class="border-b border-tractorBorder/70 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                    <div class="space-y-0.5">
                        <div class="inline-flex items-center gap-1.5 bg-green-500/15 border border-green-500/30 text-green-600 dark:text-green-400 text-xs px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider">
                            <span>📜</span> Oficialūs LR ŽŪM ir NMA terminai
                        </div>
                        <h3 class="font-oswald text-lg sm:text-xl md:text-2xl font-bold uppercase tracking-wider" style="color: var(--text-main);">
                            NMA Teisinių Terminų ir Draudimų Šviesoforas
                        </h3>
                    </div>

                    <span class="text-xs text-slate-400 bg-tractorBg px-3 py-1 rounded-xl border border-tractorBorder font-mono self-start sm:self-auto">
                        Šiandien: <strong class="font-bold" id="nma-today-date" style="color: var(--text-main);">...</strong>
                    </span>
                </div>

                <!-- 🌟 GYVI ŠVIESOFORO BLOKAI -->
                <div class="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1" id="nma-traffic-lights-grid">
                    <div class="text-center py-6 text-slate-500 text-xs col-span-full">Tikrinamos galiojančios taisyklės...</div>
                </div>
            </div>

            <!-- VISŲ METŲ NMA & GAAB KALENDORIUS (KOMPAKTIŠKAS) -->
            <div class="bg-tractorSurface border border-tractorBorder rounded-2xl p-4 sm:p-5 md:p-6 space-y-3.5 shadow-xl">
                <div class="flex justify-between items-center border-b border-tractorBorder/70 pb-2.5">
                    <h4 class="font-oswald text-base sm:text-lg font-bold uppercase tracking-wider flex items-center gap-2" style="color: var(--text-main);">
                        <span>🗓️</span> Svarbiausi Ūkio Teisiniai Terminai (${new Date().getFullYear()} m.)
                    </h4>
                    <span class="text-[11px] text-slate-400">Pagal GAAB reikalavimus</span>
                </div>

                <!-- SĄRAŠAS -->
                <div class="space-y-2" id="nma-calendar-events-list"></div>
            </div>

            <!-- TEISINĖ ATMINTINĖ (3 BLOKELIAI) -->
            <div class="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                <div class="bg-tractorBg border border-tractorBorder p-3.5 rounded-xl space-y-1">
                    <strong class="text-amber-500 flex items-center gap-1 font-bold">
                        <span>💧</span> Paviršinio vandens apsauga (Paupiai)
                    </strong>
                    <p class="text-slate-400 leading-relaxed text-[11px]">
                        Palei melioracijos griovius ir upelius privaloma bent <strong>3 m</strong> (prie ežerų – <strong>5–10 m</strong>) apsaugos juosta be trąšų ir purškimo.
                    </p>
                </div>

                <div class="bg-tractorBg border border-tractorBorder p-3.5 rounded-xl space-y-1">
                    <strong class="text-green-600 dark:text-green-400 flex items-center gap-1 font-bold">
                        <span>🌱</span> Tarpinių pasėlių nauda
                    </strong>
                    <p class="text-slate-400 leading-relaxed text-[11px]">
                        Išlaikius posėlius iki <strong>sausio 15 d.</strong>, išsaugomos ekoschemų išmokos (~137 €/ha). Po sausio 15 d. leidžiamas žemės dirbimas.
                    </p>
                </div>

                <div class="bg-tractorBg border border-tractorBorder p-3.5 rounded-xl space-y-1">
                    <strong class="text-red-500 flex items-center gap-1 font-bold">
                        <span>⚠️</span> Įšalas ir sniegas – viršenybė
                    </strong>
                    <p class="text-slate-400 leading-relaxed text-[11px]">
                        Net jei kalendorinis draudimas baigėsi, ant <strong>įšalusios ar apsnigtos</strong> dirvos tręšti organinėmis trąšomis teisiškai griežtai draudžiama!
                    </p>
                </div>
            </div>

        </div>
    `;

    document.getElementById('nma-today-date').textContent = new Date().toLocaleDateString('lt-LT', {
        year: 'numeric', month: 'long', day: 'numeric'
    });

    listenToRegulations();
}

function listenToRegulations() {
    if (unsubscribeRegs) unsubscribeRegs();

    unsubscribeRegs = db.collection("nma_regulations").doc("current_season").onSnapshot(doc => {
        if (doc.exists) {
            liveRegulations = { ...getDefaultRegulations(), ...doc.data() };
        } else {
            liveRegulations = getDefaultRegulations();
        }
        evaluateAndRenderStatus();
    }, () => {
        liveRegulations = getDefaultRegulations();
        evaluateAndRenderStatus();
    });
}

function evaluateAndRenderStatus() {
    const grid = document.getElementById('nma-traffic-lights-grid');
    const list = document.getElementById('nma-calendar-events-list');
    if (!grid || !liveRegulations) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 1. MĖŠLO IR SRUTŲ DRAUDIMO VERTINIMAS
    const banStart = new Date(liveRegulations.manureBanStart);
    const banEnd = new Date(liveRegulations.manureBanEnd);
    const isWithinCalendarBan = (today >= banStart && today <= banEnd);
    
    let daysUntilBanEnd = 0;
    if (today < banEnd) {
        daysUntilBanEnd = Math.ceil((banEnd - today) / (1000 * 60 * 60 * 24));
    }

    let manureStatusTitle = "";
    let manureStatusClass = "";
    let manureBorderColor = "";
    let manureDesc = "";

    if (isWithinCalendarBan) {
        manureStatusTitle = `🔴 DRAUDŽIAMA SKLEISTI MĖŠLĄ IR SRUTAS`;
        manureStatusClass = `bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30`;
        manureBorderColor = `border-red-500 bg-red-950/15`;
        manureDesc = `Galioja oficialus žiemos ramybės draudimas. Iki pavasarinio tręšimo starto (${liveRegulations.manureBanEnd}) liko <strong>${daysUntilBanEnd} d.</strong>`;
    } else {
        manureStatusTitle = `🟢 TRĘŠIMAS LEIDŽIAMAS (Pagal kalendorių)`;
        manureStatusClass = `bg-green-500/15 text-green-600 dark:text-green-400 border-green-500/30`;
        manureBorderColor = `border-green-500 bg-green-950/15`;
        manureDesc = `Kalendorinis žiemos draudimas nebegalioja. <strong>Svarbu:</strong> tręšti leidžiama tik jei lauko dirva nėra įšalusi, įmirkusi ar apsnigta!`;
    }

    // 2. TARPINIŲ PASĖLIŲ (POSĖLIŲ) IŠLAIKYMAS
    const winterCoverEnd = new Date(liveRegulations.coverCropWinterEnd);
    const springCoverEnd = new Date(liveRegulations.coverCropSpringEnd);

    let coverStatusTitle = "";
    let coverStatusClass = "";
    let coverBorderColor = "";
    let coverDesc = "";

    if (today < winterCoverEnd) {
        const daysToWinterCover = Math.ceil((winterCoverEnd - today) / (1000 * 60 * 60 * 24));
        coverStatusTitle = `🔴 PRIVALOMA IŠLAIKYTI TARPINIUS PASĖLIUS`;
        coverStatusClass = `bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30`;
        coverBorderColor = `border-amber-500 bg-amber-950/15`;
        coverDesc = `Iki minimalaus išlaikymo termino (${liveRegulations.coverCropWinterEnd}) liko <strong>${daysToWinterCover} d.</strong> Šiuo metu jų naikinti ar įterpti negalima.`;
    } else if (today >= winterCoverEnd && today < springCoverEnd) {
        coverStatusTitle = `🟡 LEIDŽIAMAS ĮDIRBIMAS (Sausio 15 d. pasiekta)`;
        coverStatusClass = `bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30`;
        coverBorderColor = `border-blue-500 bg-blue-950/15`;
        coverDesc = `Sausio 15 d. minimalus terminas įvykdytas. Jei pasirinkote pavasarinį išlaikymo variantą, išlaikykite iki kovo 15 d.`;
    } else {
        coverStatusTitle = `🟢 POSĖLIŲ TERMINAS ĮVYKDYTAS`;
        coverStatusClass = `bg-green-500/15 text-green-600 dark:text-green-400 border-green-500/30`;
        coverBorderColor = `border-green-500 bg-green-950/15`;
        coverDesc = `Visi privalomi tarpinių pasėlių terminai pasibaigę. Laukus galima laisvai dirbti pavasario sėjai.`;
    }

    grid.innerHTML = `
        <!-- 1 KORTELĖ: MĖŠLAS IR SRUTOS -->
        <div class="p-4 sm:p-5 rounded-xl border-2 ${manureBorderColor} space-y-2 shadow-sm">
            <div class="flex justify-between items-start">
                <span class="text-[10px] uppercase font-extrabold px-2.5 py-0.5 rounded-full border ${manureStatusClass}">
                    Mėšlo ir srutų skleidimas
                </span>
                <span class="text-xl">💩</span>
            </div>
            <h4 class="font-oswald text-base sm:text-lg font-bold tracking-wide" style="color: var(--text-main);">${manureStatusTitle}</h4>
            <p class="text-xs leading-relaxed text-slate-300" style="color: var(--text-muted);">${manureDesc}</p>
            <div class="text-[11px] pt-1.5 border-t border-tractorBorder/40 flex justify-between text-slate-400">
                <span>Draudimo periodas:</span>
                <strong class="font-mono font-bold" style="color: var(--text-main);">${liveRegulations.manureBanStart} — ${liveRegulations.manureBanEnd}</strong>
            </div>
        </div>

        <!-- 2 KORTELĖ: TARPINIAI PASĖLIAI -->
        <div class="p-4 sm:p-5 rounded-xl border-2 ${coverBorderColor} space-y-2 shadow-sm">
            <div class="flex justify-between items-start">
                <span class="text-[10px] uppercase font-extrabold px-2.5 py-0.5 rounded-full border ${coverStatusClass}">
                    Tarpiniai pasėliai per žiemą
                </span>
                <span class="text-xl">🌿</span>
            </div>
            <h4 class="font-oswald text-base sm:text-lg font-bold tracking-wide" style="color: var(--text-main);">${coverStatusTitle}</h4>
            <p class="text-xs leading-relaxed text-slate-300" style="color: var(--text-muted);">${coverDesc}</p>
            <div class="text-[11px] pt-1.5 border-t border-tractorBorder/40 flex justify-between text-slate-400">
                <span>Ekoschemos terminai:</span>
                <strong class="font-mono font-bold" style="color: var(--text-main);">Sausio 15 d. / Kovo 15 d.</strong>
            </div>
        </div>
    `;

    // 3. SĄRAŠAS: VISI TERMINAI (ŠVARŪS, ŠVIESŪS IR AIŠKŪS MYGTUKAI)
    const events = [
        { date: liveRegulations.coverCropWinterEnd, name: "Minimalaus tarpinių pasėlių išlaikymo pabaiga", cat: "Ekoschemos", icon: "🌱" },
        { date: liveRegulations.manureBanEnd, name: "Mėšlo ir srutų skleidimo draudimo pabaiga", cat: "Aplinkosauga", icon: "🚜" },
        { date: liveRegulations.declarationDeadline, name: "Pasėlių deklaravimo pabaiga (be vėlavimo)", cat: "NMA Deklaravimas", icon: "📝" },
        { date: liveRegulations.dieselQuotaDeadline, name: "VMI gazolio metinės kvotos pabaiga", cat: "VMI Kuras", icon: "⛽" },
        { date: liveRegulations.fallowMaintenanceDeadline, name: "Juodojo pūdymo apsėjimo terminas", cat: "Gamyba", icon: "🌾" },
        { date: liveRegulations.catchCropSowingDeadline, name: "Tarpinių pasėlių per žiemą sėjos pabaiga", cat: "Ekoschemos", icon: "🌱" },
        { date: liveRegulations.manureBanStart, name: "Rudens mėšlo ir srutų skleidimo draudimo pradžia", cat: "Aplinkosauga", icon: "🛑" }
    ].sort((a, b) => new Date(a.date) - new Date(b.date));

    list.innerHTML = events.map(ev => {
        const evDate = new Date(ev.date);
        const isPast = today > evDate;
        const diffDays = Math.ceil((evDate - today) / (1000 * 60 * 60 * 24));

        // 🌟 IŠTAISYTA: Jokio juodo fono! Švarus, aiškiai įskaitomas dizainas:
        let dateBadgeClass = "bg-green-100 dark:bg-green-950/40 text-green-700 dark:text-green-400 border border-green-300 dark:border-green-800/60";
        let statusBadgeText = `Liko ${diffDays} d.`;
        let statusBadgeClass = "text-green-600 dark:text-green-400 font-bold";

        if (isPast) {
            dateBadgeClass = "bg-slate-200 dark:bg-zinc-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-zinc-700 font-bold";
            statusBadgeText = "Įvykęs ✓";
            statusBadgeClass = "text-slate-500 font-medium";
        } else if (diffDays <= 30) {
            dateBadgeClass = "bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-800/60";
            statusBadgeClass = "text-amber-600 dark:text-amber-400 font-black animate-pulse";
        }

        return `
            <div class="p-2.5 sm:p-3 bg-tractorBg rounded-xl border border-tractorBorder flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs transition hover:border-slate-400">
                <div class="flex items-center gap-2.5 min-w-0">
                    <span class="text-base sm:text-lg bg-tractorSurface p-1.5 rounded-lg border border-tractorBorder shrink-0">${ev.icon}</span>
                    <div class="min-w-0">
                        <strong class="text-xs sm:text-sm block font-bold truncate" style="color: var(--text-main);">${ev.name}</strong>
                        <span class="text-[10px] sm:text-[11px] text-slate-400">${ev.cat}</span>
                    </div>
                </div>

                <div class="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                    <span class="font-mono text-[11px] sm:text-xs px-2.5 py-1 rounded-lg ${dateBadgeClass}">
                        ${ev.date}
                    </span>
                    <span class="text-[11px] sm:text-xs px-2 py-0.5 rounded-md ${statusBadgeClass}">
                        ${statusBadgeText}
                    </span>
                </div>
            </div>
        `;
    }).join('');
}