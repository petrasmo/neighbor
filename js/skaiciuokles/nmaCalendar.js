// js/nmaCalendar.js
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
        <div class="space-y-6">
            
            <!-- HEADERIS -->
            <div class="bg-tractorSurface border border-tractorBorder rounded-2xl p-6 md:p-8 space-y-4 shadow-xl">
                <div class="border-b border-tractorBorder/70 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div class="space-y-1">
                        <div class="inline-flex items-center gap-1.5 bg-green-500/15 border border-green-500/30 text-green-500 text-xs px-3 py-1 rounded-full font-bold uppercase tracking-wider">
                            <span>📜</span> Oficialūs LR ŽŪM ir NMA terminai
                        </div>
                        <h3 class="font-oswald text-xl md:text-2xl font-bold uppercase tracking-wider text-white">
                            NMA Teisinių Terminų ir Draudimų Šviesoforas
                        </h3>
                        <p class="text-xs md:text-sm text-slate-300">
                            Gyvas aplinkosaugos draudimų laikmatis ir sankcijų prevencija: mėšlo skleidimas, tarpinių pasėlių įterpimas bei deklaravimo datos.
                        </p>
                    </div>

                    <span class="text-xs text-slate-400 bg-tractorBg px-3 py-1.5 rounded-xl border border-tractorBorder font-mono">
                        Šiandien: <strong class="text-white font-bold" id="nma-today-date">...</strong>
                    </span>
                </div>

                <!-- 🌟 GYVI ŠVIESOFORO BLOKAI -->
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2" id="nma-traffic-lights-grid">
                    <div class="text-center py-6 text-slate-500 text-xs col-span-full">Tikrinamos galiojančios taisyklės ir orų sąlygos...</div>
                </div>
            </div>

            <!-- VISŲ METŲ NMA & GAAB KALENDORIUS -->
            <div class="bg-tractorSurface border border-tractorBorder rounded-2xl p-6 md:p-8 space-y-4 shadow-xl">
                <div class="flex justify-between items-center border-b border-tractorBorder/70 pb-3">
                    <h4 class="font-oswald text-lg font-bold text-white uppercase tracking-wider flex items-center gap-2">
                        <span>🗓️</span> Svarbiausi Ūkio Teisiniai Terminai (${new Date().getFullYear()} m.)
                    </h4>
                    <span class="text-xs text-slate-400">Pagal LR ŽŪM GAAB reikalavimus</span>
                </div>

                <div class="space-y-3" id="nma-calendar-events-list"></div>
            </div>

            <!-- TEISINĖ ATMINTINĖ / APSAUGA NUO BAUDŲ -->
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                <div class="bg-tractorBg border border-tractorBorder p-4 rounded-xl space-y-1.5">
                    <strong class="text-amber-400 flex items-center gap-1 font-bold">
                        <span>💧</span> Paviršinio vandens apsauga (Paupiai)
                    </strong>
                    <p class="text-slate-300 leading-relaxed text-[11px]">
                        Palei melioracijos griovius ir upelius privaloma išlaikyti bent <strong>3 m</strong> (prie vandens telkinių – <strong>5–10 m</strong>) apsaugos juostą, kurioje draudžiama tręšti ir purkšti.
                    </p>
                </div>

                <div class="bg-tractorBg border border-tractorBorder p-4 rounded-xl space-y-1.5">
                    <strong class="text-green-400 flex items-center gap-1 font-bold">
                        <span>🌱</span> Tarpinių pasėlių nauda
                    </strong>
                    <p class="text-slate-300 leading-relaxed text-[11px]">
                        Išlaikius posėlius bent iki <strong>sausio 15 d.</strong>, išsaugomos ekoschemų išmokos (~137 €/ha). Po sausio 15 d. galima seklus žemės dirbimas.
                    </p>
                </div>

                <div class="bg-tractorBg border border-tractorBorder p-4 rounded-xl space-y-1.5">
                    <strong class="text-red-400 flex items-center gap-1 font-bold">
                        <span>⚠️</span> Įšalas ir sniegas – viršenybė
                    </strong>
                    <p class="text-slate-300 leading-relaxed text-[11px]">
                        Net jei kalendorinis draudimas pasibaigęs, ant <strong>įšalusios, įmirkusios ar apsnigtos</strong> dirvos tręšti organinėmis trąšomis teisiškai griežtai draudžiama!
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
    // Tikriname, ar Firebase nėra atnaujintų ŽŪM ministro datų
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
    const todayStr = today.toISOString().split("T")[0];

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
        manureStatusClass = `bg-red-500/20 text-red-400 border-red-500/40`;
        manureBorderColor = `border-red-600 bg-red-950/20`;
        manureDesc = `Galioja oficialus žiemos ramybės draudimas. Iki pavasarinio tręšimo starto (${liveRegulations.manureBanEnd}) liko <strong>${daysUntilBanEnd} d.</strong>`;
    } else {
        manureStatusTitle = `🟢 TRĘŠIMAS LEIDŽIAMAS (Pagal kalendorių)`;
        manureStatusClass = `bg-green-500/20 text-green-400 border-green-500/40`;
        manureBorderColor = `border-green-600 bg-green-950/20`;
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
        coverStatusClass = `bg-amber-500/20 text-amber-400 border-amber-500/40`;
        coverBorderColor = `border-amber-600 bg-amber-950/20`;
        coverDesc = `Iki minimalaus išlaikymo termino (${liveRegulations.coverCropWinterEnd}) liko <strong>${daysToWinterCover} d.</strong> Šiuo metu jų naikinti ar įterpti negalima.`;
    } else if (today >= winterCoverEnd && today < springCoverEnd) {
        coverStatusTitle = `🟡 LEIDŽIAMAS ĮDIRBIMAS (Sausio 15 d. terminas pasiektas)`;
        coverStatusClass = `bg-blue-500/20 text-blue-400 border-blue-500/40`;
        coverBorderColor = `border-blue-600 bg-blue-950/20`;
        coverDesc = `Sausio 15 d. minimalus terminas įvykdytas. Jei pasirinkote pavasarinį išlaikymo variantą, išlaikykite iki kovo 15 d.`;
    } else {
        coverStatusTitle = `🟢 POSĖLIŲ TERMINAS ĮVYKDYTAS`;
        coverStatusClass = `bg-green-500/20 text-green-400 border-green-500/40`;
        coverBorderColor = `border-green-600 bg-green-950/20`;
        coverDesc = `Visi privalomi tarpinių pasėlių terminai pasibaigę. Laukus galima laisvai dirbti pavasario sėjai.`;
    }

    grid.innerHTML = `
        <!-- 1 KORTELĖ: MĖŠLAS IR SRUTOS -->
        <div class="p-6 rounded-2xl border-2 ${manureBorderColor} space-y-3 shadow-lg">
            <div class="flex justify-between items-start">
                <span class="text-xs uppercase font-extrabold px-3 py-1 rounded-full border ${manureStatusClass}">
                    Mėšlo ir srutų skleidimas
                </span>
                <span class="text-2xl">💩</span>
            </div>
            <h4 class="font-oswald text-xl font-bold text-white tracking-wide">${manureStatusTitle}</h4>
            <p class="text-xs text-slate-200 leading-relaxed">${manureDesc}</p>
            <div class="text-[11px] text-slate-400 pt-2 border-t border-tractorBorder/40 flex justify-between">
                <span>Draudimo periodas:</span>
                <strong class="text-white font-mono">${liveRegulations.manureBanStart} — ${liveRegulations.manureBanEnd}</strong>
            </div>
        </div>

        <!-- 2 KORTELĖ: TARPINIAI PASĖLIAI -->
        <div class="p-6 rounded-2xl border-2 ${coverBorderColor} space-y-3 shadow-lg">
            <div class="flex justify-between items-start">
                <span class="text-xs uppercase font-extrabold px-3 py-1 rounded-full border ${coverStatusClass}">
                    Tarpiniai pasėliai per žiemą
                </span>
                <span class="text-2xl">🌿</span>
            </div>
            <h4 class="font-oswald text-xl font-bold text-white tracking-wide">${coverStatusTitle}</h4>
            <p class="text-xs text-slate-200 leading-relaxed">${coverDesc}</p>
            <div class="text-[11px] text-slate-400 pt-2 border-t border-tractorBorder/40 flex justify-between">
                <span>Ekoschemos terminai:</span>
                <strong class="text-white font-mono">Sausio 15 d. / Kovo 15 d.</strong>
            </div>
        </div>
    `;

    // 3. SĄRAŠAS: VISI SVARBIAUSI METŲ ĮVYKIAI
    const events = [
        { date: liveRegulations.coverCropWinterEnd, name: "Sausio 15 d. – Minimalaus tarpinių pasėlių išlaikymo termino pabaiga", cat: "Ekoschemos", icon: "🌱" },
        { date: liveRegulations.manureBanEnd, name: "Kovo 20 d. – Oficialaus pavasarinio mėšlo ir srutų skleidimo draudimo pabaiga", cat: "Aplinkosauga", icon: "🚜" },
        { date: liveRegulations.declarationDeadline, name: "Birželio 20 d. – Pasėlių ir žemės ūkio naudmenų deklaravimo pabaiga (be vėlavimo)", cat: "NMA Deklaravimas", icon: "📝" },
        { date: liveRegulations.dieselQuotaDeadline, name: "Birželio 30 d. – VMI žymėto dyzelino (gazolio) metinės kvotos išnaudojimo terminas", cat: "VMI Kuras", icon: "⛽" },
        { date: liveRegulations.fallowMaintenanceDeadline, name: "Rugpjūčio 15 d. – Juodojo pūdymo apsėjimo arba žaliojo pūdymo įterpimo terminas", cat: "Gamyba", icon: "🌾" },
        { date: liveRegulations.catchCropSowingDeadline, name: "Rugsėjo 1 d. – Tarpinių pasėlių per žiemą sėjos pabaigos terminas", cat: "Ekoschemos", icon: "🌱" },
        { date: liveRegulations.manureBanStart, name: "Lapkričio 15 d. – Rudens mėšlo ir srutų skleidimo laukuose draudimo pradžia", cat: "Aplinkosauga", icon: "🛑" }
    ].sort((a, b) => new Date(a.date) - new Date(b.date));

    list.innerHTML = events.map(ev => {
        const evDate = new Date(ev.date);
        const isPast = today > evDate;
        const diffDays = Math.ceil((evDate - today) / (1000 * 60 * 60 * 24));

        return `
            <div class="p-3.5 bg-tractorBg rounded-xl border border-tractorBorder flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div class="flex items-center gap-3">
                    <span class="text-xl bg-tractorSurface p-2 rounded-lg border border-tractorBorder">${ev.icon}</span>
                    <div>
                        <strong class="text-white text-sm block font-bold">${ev.name}</strong>
                        <span class="text-[11px] text-slate-400">Kategorija: ${ev.cat}</span>
                    </div>
                </div>

                <div class="flex items-center gap-3 self-end sm:self-auto shrink-0">
                    <span class="font-mono text-xs font-bold px-2.5 py-1 rounded-lg ${isPast ? 'bg-zinc-800 text-slate-500' : 'bg-tractorPrimary/20 text-green-400 border border-tractorPrimary/40'}">
                        ${ev.date}
                    </span>
                    <span class="text-[11px] font-bold ${isPast ? 'text-slate-500' : (diffDays <= 30 ? 'text-amber-400 font-extrabold' : 'text-slate-300')}">
                        ${isPast ? 'Įvykęs ✓' : `Liko ${diffDays} d.`}
                    </span>
                </div>
            </div>
        `;
    }).join('');
}