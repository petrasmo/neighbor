// js/bendruomene/events.js
import { db } from '../core/firebase.js';
import { calculateDist } from '../skaiciuokles/grainCalculator.js';
import { getDistrictFromCoords } from '../core/geoDistricts.js';

let activeScope = 'district'; // 'district', 'all', 'online'
let currentDistrict = 'Pasvalio r.';
let activeCategory = 'all';
let cachedEvents = [];
let cachedCurrentUser = null;
let cachedUserData = null;
let userGarageCoords = null;
let unsubscribeEvents = null;

// 🌟 DATRAUKINĖJIMO (INFINITE SCROLL) PARAMETRAI
let visibleLimit = 20;
const PAGE_SIZE = 20;
let scrollObserver = null;

const ALL_LITHUANIAN_DISTRICTS = [
    "Akmenės r.", "Alytaus r.", "Anykščių r.", "Biržų r.", "Druskininkų sav.",
    "Elektrėnų sav.", "Ignalinos r.", "Jonavos r.", "Joniškio r.", "Jurbarko r.",
    "Kaišiadorių r.", "Kalvarijos sav.", "Kauno r.", "Kazlų Rūdos sav.", "Kelmės r.",
    "Kėdainių r.", "Klaipėdos r.", "Kretingos r.", "Kupiškio r.", "Lazdijų r.",
    "Marijampolės sav.", "Mažeikių r.", "Molėtų r.", "Pagėgių sav.", "Pakruojo r.",
    "Panevėžio r.", "Pasvalio r.", "Plungės r.", "Prienų r.", "Radviliškio r.",
    "Raseinių r.", "Rietavo sav.", "Rokiškio r.", "Skuodo r.", "Šakių r.",
    "Šalčininkų r.", "Šilalės r.", "Šilutės r.", "Širvintų r.", "Šiaulių r.",
    "Švenčionių r.", "Tauragės r.", "Telšių r.", "Trakų r.", "Ukmergės r.",
    "Utenos r.", "Varėnos r.", "Vilkaviškio r.", "Vilniaus r.", "Zarasų r."
].sort((a, b) => a.localeCompare(b, 'lt'));

const CATEGORIES = [
    { id: "all", name: "Visi renginiai", icon: "✨" },
    { id: "Kaimo šventės ir mugės", name: "Kaimo šventės ir mugės", icon: "🎉" },
    { id: "Mokymai ir seminarai", name: "Mokymai ir seminarai", icon: "🎓" },
    { id: "Parodos ir lauko dienos", name: "Parodos ir lauko dienos", icon: "🚜" },
    { id: "NMA, parama ir deklaravimas", name: "NMA ir parama", icon: "📜" },
    { id: "Kita", name: "Kiti renginiai", icon: "⚪" }
];

async function resolveUserDistrict(userData) {
    if (userData?.garageRegion) {
        const clean = userData.garageRegion.toLowerCase().replace(" r.", "").replace(" sav.", "").trim();
        const found = ALL_LITHUANIAN_DISTRICTS.find(d => d.toLowerCase().includes(clean));
        if (found) return found;
    }
    if (userData?.garageLat && userData?.garageLon && userData.garageLat !== 0) {
        try {
            const detected = await getDistrictFromCoords(userData.garageLat, userData.garageLon);
            if (detected) {
                const clean = detected.toLowerCase().replace(" r.", "").replace(" sav.", "").trim();
                const found = ALL_LITHUANIAN_DISTRICTS.find(d => d.toLowerCase().includes(clean));
                if (found) return found;
            }
        } catch (e) {}
    }
    return 'Pasvalio r.';
}

export async function initEventsTab(currentUser, userData) {
    cachedCurrentUser = currentUser;
    cachedUserData = userData;

    if (userData?.garageLat && userData?.garageLon && userData.garageLat !== 0) {
        userGarageCoords = {
            lat: parseFloat(userData.garageLat),
            lng: parseFloat(userData.garageLon)
        };
    } else {
        userGarageCoords = null;
    }

    currentDistrict = await resolveUserDistrict(userData);
    visibleLimit = PAGE_SIZE;

    const container = document.getElementById('view-tab-events');
    if (!container) return;

    renderEventsLayout(container);
    listenToEvents();
}

function renderEventsLayout(container) {
    const districtOptionsHtml = ALL_LITHUANIAN_DISTRICTS.map(d => `
        <option value="${d}" ${currentDistrict === d ? 'selected' : ''}>${d}</option>
    `).join('');

    const categoryPillsHtml = CATEGORIES.map(c => `
        <button type="button" class="btn-event-cat px-3 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 shrink-0 ${
            activeCategory === c.id 
            ? 'bg-tractorPrimary text-white shadow-md' 
            : 'bg-tractorBg border border-tractorBorder text-slate-300 hover:text-white'
        }" data-cat="${c.id}">
            <span>${c.icon}</span> <span>${c.name}</span>
        </button>
    `).join('');

    container.innerHTML = `
        <div class="space-y-4 w-full">
            
            <!-- ANTRAŠTĖ -->
            <div class="border-b border-tractorBorder pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div class="space-y-1">
                    <div class="inline-flex items-center gap-1.5 bg-green-500/15 border border-green-500/30 text-green-600 dark:text-green-400 text-xs px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider">
                        <span>📅</span> Gyvas Lietuvos Agro-Kalendorius
                    </div>
                    <h2 class="font-oswald text-xl sm:text-2xl md:text-3xl font-bold uppercase tracking-wider text-white flex items-center gap-2">
                        <span>🎉</span> Agro-Renginiai ir Kaimo Šventės
                    </h2>
                    <p class="text-xs text-slate-300">
                        Artimiausių 3 mėnesių seminarai, kaimo bendruomenių sueigos, mugės, LŽŪKT kursai ir parodos.
                    </p>
                </div>
            </div>

            <!-- VALDYMO JUOSTA -->
            <div class="bg-tractorSurface border border-tractorBorder rounded-2xl p-3 sm:p-4 shadow-sm space-y-3">
                
                <!-- 1 EILUTĖ: APIMTIS IR RAJONAS -->
                <div class="flex flex-nowrap items-center justify-between gap-2">
                    <div class="flex items-center gap-1 bg-tractorBg p-1 rounded-xl border border-tractorBorder shrink-0">
                        <button type="button" id="btn-events-scope-district" class="px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${activeScope === 'district' ? 'bg-tractorPrimary text-white shadow' : 'text-slate-400 hover:text-white'}">
                            <span>📍</span> <span>Mano rajonas</span>
                        </button>
                        <button type="button" id="btn-events-scope-all" class="px-2 sm:px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${activeScope === 'all' ? 'bg-tractorPrimary text-white shadow' : 'text-slate-400 hover:text-white'}">
                            <span>🇱🇹</span> <span>Visa Lietuva</span>
                        </button>
                        <button type="button" id="btn-events-scope-online" class="px-2 sm:px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${activeScope === 'online' ? 'bg-tractorPrimary text-white shadow' : 'text-slate-400 hover:text-white'}">
                            <span>💻</span> <span>Internetu</span>
                        </button>
                    </div>

                    <div id="events-district-box" class="flex items-center gap-1.5 min-w-0 ${activeScope === 'district' ? '' : 'hidden'}">
                        <span class="hidden sm:inline text-xs font-bold text-slate-400 shrink-0">Rajonas:</span>
                        <select id="events-district-select" class="h-9 sm:h-10 bg-tractorBg border border-tractorBorder focus:border-tractorPrimary rounded-xl px-2 sm:px-3 text-xs font-bold text-white outline-none cursor-pointer w-32 sm:w-48 truncate">
                            ${districtOptionsHtml}
                        </select>
                    </div>
                </div>

                <!-- 2 EILUTĖ: KATEGORIJŲ PILLS -->
                <div class="pt-2 border-t border-tractorBorder/60 flex items-center gap-1.5 overflow-x-auto no-scrollbar" id="events-categories-bar">
                    ${categoryPillsHtml}
                </div>

            </div>

            <!-- RENGINIŲ SĄRAŠAS -->
            <div id="events-list-container" class="space-y-3">
                <div class="py-12 flex flex-col items-center justify-center space-y-3">
                    <span class="text-3xl animate-bounce">🚜</span>
                    <p class="text-xs font-bold text-slate-400 uppercase tracking-wider animate-pulse">Kraunami agro-renginiai...</p>
                </div>
            </div>

            <!-- 🌟 INFINITE SCROLL KROVIKLIS / MYGTUKAS -->
            <div id="events-load-more-box" class="pt-2 pb-8 flex justify-center hidden">
                <button type="button" id="btn-events-load-more" class="px-6 py-2.5 bg-tractorSurface hover:bg-zinc-800 border border-tractorBorder rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-2 shadow-sm text-slate-200">
                    <span>🔄</span> <span>Rodyti dar 20 renginių...</span>
                </button>
            </div>

        </div>

        <!-- BOTTOM SHEET RENGINIO INFORMACIJAI -->
        <div id="event-detail-modal" class="fixed inset-0 bg-black/80 z-[9999] hidden flex flex-col justify-end items-center p-0 backdrop-blur-sm transition-opacity duration-300">
            <div id="event-detail-panel" class="bg-tractorSurface border-t-2 border-x-2 border-b-0 border-tractorBorder rounded-t-3xl rounded-b-none p-5 sm:p-7 pb-10 max-w-2xl w-full space-y-4 shadow-2xl relative max-h-[90vh] overflow-y-auto mb-0 transform translate-y-full transition-transform duration-300">
                <div class="flex justify-between items-center border-b border-tractorBorder/70 pb-3">
                    <div class="flex items-center gap-2">
                        <span id="sheet-event-icon" class="text-xl">📅</span>
                        <h3 id="sheet-event-title" class="font-oswald text-base sm:text-lg font-bold uppercase tracking-wider text-white">
                            Renginio informacija
                        </h3>
                    </div>
                    <button type="button" id="btn-close-event-sheet" class="text-slate-400 hover:text-white text-2xl font-bold cursor-pointer p-1 leading-none transition">&times;</button>
                </div>

                <div id="event-sheet-body" class="space-y-4 pt-1 text-xs"></div>

                <div class="pt-2">
                    <button type="button" id="btn-ack-event-sheet" class="w-full h-11 bg-tractorPrimary hover:bg-tractorPrimaryHover text-white font-extrabold rounded-xl text-xs uppercase tracking-wider shadow transition cursor-pointer flex items-center justify-center">
                        Supratau 👍
                    </button>
                </div>
            </div>
        </div>
    `;

    setupEventsTabListeners();
    setupSheetCloseListeners();
}

function setupEventsTabListeners() {
    const btnDistrict = document.getElementById('btn-events-scope-district');
    const btnAll = document.getElementById('btn-events-scope-all');
    const btnOnline = document.getElementById('btn-events-scope-online');
    const districtBox = document.getElementById('events-district-box');
    const districtSelect = document.getElementById('events-district-select');
    const loadMoreBtn = document.getElementById('btn-events-load-more');

    const updateScopeButtons = () => {
        [btnDistrict, btnAll, btnOnline].forEach(b => {
            b.className = "px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer text-slate-400 hover:text-white";
        });
        if (activeScope === 'district') {
            btnDistrict.className = "px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer bg-tractorPrimary text-white shadow";
            districtBox?.classList.remove('hidden');
        } else if (activeScope === 'all') {
            btnAll.className = "px-2 sm:px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer bg-tractorPrimary text-white shadow";
            districtBox?.classList.add('hidden');
        } else if (activeScope === 'online') {
            btnOnline.className = "px-2 sm:px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer bg-tractorPrimary text-white shadow";
            districtBox?.classList.add('hidden');
        }
        visibleLimit = PAGE_SIZE; // Nustatome iš naujo į 20
        renderFilteredEvents();
    };

    if (btnDistrict) btnDistrict.onclick = () => { activeScope = 'district'; updateScopeButtons(); };
    if (btnAll) btnAll.onclick = () => { activeScope = 'all'; updateScopeButtons(); };
    if (btnOnline) btnOnline.onclick = () => { activeScope = 'online'; updateScopeButtons(); };

    if (districtSelect) {
        districtSelect.onchange = (e) => {
            currentDistrict = e.target.value;
            visibleLimit = PAGE_SIZE;
            renderFilteredEvents();
        };
    }

    document.querySelectorAll('.btn-event-cat').forEach(btn => {
        btn.onclick = () => {
            activeCategory = btn.getAttribute('data-cat');
            document.querySelectorAll('.btn-event-cat').forEach(b => {
                b.className = "btn-event-cat px-3 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 shrink-0 bg-tractorBg border border-tractorBorder text-slate-300 hover:text-white";
            });
            btn.className = "btn-event-cat px-3 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 shrink-0 bg-tractorPrimary text-white shadow-md";
            visibleLimit = PAGE_SIZE;
            renderFilteredEvents();
        };
    });

    if (loadMoreBtn) {
        loadMoreBtn.onclick = () => {
            visibleLimit += PAGE_SIZE;
            renderFilteredEvents();
        };
    }
}

function setupSheetCloseListeners() {
    const sheet = document.getElementById('event-detail-modal');
    const panel = document.getElementById('event-detail-panel');
    const closeBtn = document.getElementById('btn-close-event-sheet');
    const ackBtn = document.getElementById('btn-ack-event-sheet');

    const closeSheet = () => {
        panel?.classList.add('translate-y-full');
        setTimeout(() => sheet?.classList.add('hidden'), 250);
    };

    if (closeBtn) closeBtn.onclick = closeSheet;
    if (ackBtn) ackBtn.onclick = closeSheet;
    if (sheet) sheet.onclick = (e) => { if (e.target === sheet) closeSheet(); };
}

function listenToEvents() {
    if (unsubscribeEvents) unsubscribeEvents();

    const nowTs = Math.floor(Date.now() / 1000) - 86400;

    unsubscribeEvents = db.collection("agro_events")
        .where("dateTimestamp", ">=", nowTs)
        .orderBy("dateTimestamp", "asc")
        .onSnapshot(snap => {
            cachedEvents = [];
            snap.forEach(doc => {
                cachedEvents.push(doc.data());
            });
            renderFilteredEvents();
        }, err => {
            console.error("Klaida nuskaitant renginius:", err);
            const container = document.getElementById('events-list-container');
            if (container) {
                container.innerHTML = `<div class="py-8 text-center text-red-400 text-xs">Nepavyko užkrauti renginių: ${err.message}</div>`;
            }
        });
}

function renderFilteredEvents() {
    const container = document.getElementById('events-list-container');
    const loadMoreBox = document.getElementById('events-load-more-box');
    if (!container) return;

    let list = [...cachedEvents];

    // 1. Apimties filtras
    if (activeScope === 'district') {
        const cleanTarget = currentDistrict.toLowerCase().replace(" r.", "").replace(" sav.", "").trim();
        list = list.filter(ev => {
            if (ev.isOnline) return true;
            const distClean = (ev.district || "").toLowerCase().replace(" r.", "").replace(" sav.", "").trim();
            return distClean === cleanTarget || distClean.includes(cleanTarget);
        });
    } else if (activeScope === 'online') {
        list = list.filter(ev => ev.isOnline || (ev.district || "").toLowerCase() === "internetu");
    }

    // 2. Kategorijos filtras
    if (activeCategory !== 'all') {
        list = list.filter(ev => ev.category === activeCategory);
    }

    if (list.length === 0) {
        container.innerHTML = `
            <div class="bg-tractorSurface border border-tractorBorder rounded-2xl p-10 text-center space-y-2">
                <span class="text-4xl block">🌾</span>
                <h4 class="font-bold text-white text-sm sm:text-base">Pagal pasirinktus filtrus renginių nerasta</h4>
                <p class="text-xs text-slate-400">Pabandykite pasirinkti „Visa Lietuva“ arba kitą kategoriją.</p>
            </div>
        `;
        if (loadMoreBox) loadMoreBox.classList.add('hidden');
        return;
    }

    // Rikiuojame pagal datą
    list.sort((a, b) => (a.dateTimestamp || 0) - (b.dateTimestamp || 0));

    // 🌟 DATRAUKINĖJIMAS: Paimame tik tiek, kiek leidžia visibleLimit (po 20)
    const displayedEvents = list.slice(0, visibleLimit);

    container.innerHTML = displayedEvents.map((ev, idx) => {
        // Formatuojame datą
        let monthStr = "MĖN";
        let dayStr = "01";
        let timeStr = "";

        if (ev.dateISO) {
            const parts = ev.dateISO.split(" ");
            const dateParts = parts[0].split("-");
            if (dateParts.length === 3) {
                const months = ["SAU", "VAS", "KOV", "BAL", "GEG", "BIR", "LIE", "RGP", "RGS", "SPA", "LAP", "GRU"];
                const mIdx = parseInt(dateParts[1], 10) - 1;
                monthStr = months[mIdx] || dateParts[1];
                dayStr = dateParts[2];
            }
            if (parts.length > 1) {
                timeStr = parts[1].slice(0, 5); // Paimame tik HH:MM
            }
        }

        // Atstumas nuo ūkio bazės
        let distKmText = "";
        if (userGarageCoords && ev.latitude && ev.longitude && !ev.isOnline) {
            const dist = Math.round(calculateDist(userGarageCoords.lat, userGarageCoords.lng, ev.latitude, ev.longitude));
            distKmText = `• <strong class="text-green-500 font-bold">🚗 ~${dist} km nuo kiemo</strong>`;
        }

        // Kategorijos ženkliukai
        let catBadgeStyle = "background-color: #FEF3C7; color: #B45309; border: 1px solid #FCD34D;";
        let catIcon = "🎉";
        if (ev.category === "Mokymai ir seminarai") {
            catBadgeStyle = "background-color: #DCFCE7; color: #15803D; border: 1px solid #86EFAC;";
            catIcon = "🎓";
        } else if (ev.category === "NMA, parama ir deklaravimas") {
            catBadgeStyle = "background-color: #DBEAFE; color: #1D4ED8; border: 1px solid #93C5FD;";
            catIcon = "📜";
        } else if (ev.category === "Parodos ir lauko dienos") {
            catBadgeStyle = "background-color: #FFEDD5; color: #C2410C; border: 1px solid #FDBA74;";
            catIcon = "🚜";
        }

        return `
            <div class="event-card bg-tractorSurface border border-tractorBorder hover:border-tractorPrimary rounded-2xl p-3 sm:p-4 transition shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3 cursor-pointer" data-idx="${idx}">
                
                <div class="flex items-start gap-3 min-w-0 flex-1">
                    
                    <!-- 🌟 NAUJAS, PARYŠKINTAS IR GRAŽUS KALENDORIAUS LAPELIS (BILIETĖLIS) -->
                    <div class="bg-tractorBg border-2 border-tractorBorder/80 rounded-2xl overflow-hidden w-16 sm:w-18 text-center shrink-0 shadow-sm flex flex-col justify-between select-none">
                        <!-- Mėnesio kepurėlė -->
                        <div class="bg-tractorPrimary/20 border-b border-tractorBorder/70 py-1 text-[11px] font-black uppercase tracking-wider text-green-700 dark:text-tractorPrimaryLight leading-none">
                            ${monthStr}
                        </div>
                        <!-- Diena -->
                        <div class="py-1">
                            <span class="font-black text-2xl sm:text-3xl block leading-none font-sans" style="color: var(--text-main);">${dayStr}</span>
                        </div>
                        <!-- Valanda (PARYŠKINTA IR AIŠKI) -->
                        <div class="bg-tractorSurface/90 border-t border-tractorBorder/70 py-1 text-xs font-bold leading-none" style="color: var(--text-main);">
                            ${timeStr ? `<span>${timeStr}</span>` : '<span class="text-[10px] text-slate-400">Dieną</span>'}
                        </div>
                    </div>

                    <!-- TURINYS -->
                    <div class="space-y-1 min-w-0 flex-1">
                        <div class="flex flex-wrap items-center gap-1.5">
                            <span class="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider" style="${catBadgeStyle}">
                                ${catIcon} ${ev.category}
                            </span>
                            ${ev.isOnline ? `<span class="bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-800 text-[10px] px-2 py-0.5 rounded-full font-bold">💻 Internetu</span>` : ''}
                            <span class="text-[10px] font-bold px-2 py-0.5 rounded-full ${ev.isFree ? 'bg-green-100 dark:bg-green-950/40 text-green-700 dark:text-green-300' : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'}">
                                ${ev.isFree ? '🟢 Nemokamas' : 'Su registracija'}
                            </span>
                        </div>

                        <h4 class="font-extrabold text-sm sm:text-base leading-snug truncate" style="color: var(--text-main);" title="${ev.title}">
                            ${ev.title}
                        </h4>

                        <div class="text-xs text-slate-600 dark:text-slate-400 font-medium flex flex-wrap items-center gap-x-2 gap-y-0.5">
                            <span>📍 ${ev.location} (${ev.district})</span>
                            ${distKmText}
                            ${ev.organizer ? `<span class="hidden sm:inline">• 🏢 ${ev.organizer}</span>` : ''}
                        </div>
                    </div>
                </div>

                <!-- VEIKSMŲ MYGTUKAI -->
                <div class="flex items-center gap-1.5 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-tractorBorder/60 self-end md:self-center">
                    ${ev.phone ? `
                        <a href="tel:${ev.phone}" class="btn-event-action h-9 px-3 bg-tractorBg hover:bg-tractorSurface border border-tractorBorder text-slate-800 dark:text-white rounded-xl text-xs font-bold transition flex items-center gap-1" title="Skambinti organizatoriui" onclick="event.stopPropagation()">
                            <span>📞</span> <span class="hidden sm:inline">Skambinti</span>
                        </a>
                    ` : ''}
                    ${!ev.isOnline && ev.latitude && ev.longitude ? `
                        <a href="https://www.google.com/maps/dir/?api=1&destination=${ev.latitude},${ev.longitude}" target="_blank" class="btn-event-action h-9 px-3 bg-tractorBg hover:bg-tractorSurface border border-tractorBorder text-slate-800 dark:text-white rounded-xl text-xs font-bold transition flex items-center gap-1" title="Naviguoti į vietą" onclick="event.stopPropagation()">
                            <span>🧭</span> <span class="hidden sm:inline">Naviguoti</span>
                        </a>
                    ` : ''}
                    ${ev.sourceUrl ? `
                        <a href="${ev.sourceUrl}" target="_blank" class="btn-event-action h-9 px-3.5 bg-tractorPrimary hover:bg-tractorPrimaryHover text-white rounded-xl text-xs font-bold transition flex items-center gap-1 shadow-sm" onclick="event.stopPropagation()">
                            <span>🔗</span> <span>Plačiau</span>
                        </a>
                    ` : ''}
                </div>

            </div>
        `;
    }).join('');

    // 🌟 KONTROLIUOJAME INFINITE SCROLL / LOAD MORE
    if (loadMoreBox) {
        if (list.length > visibleLimit) {
            loadMoreBox.classList.remove('hidden');
            setupInfiniteScrollObserver(list.length);
        } else {
            loadMoreBox.classList.add('hidden');
        }
    }

    // Paspaudimas ant kortelės atidaro Bottom Sheet
    container.querySelectorAll('.event-card').forEach(card => {
        card.onclick = () => {
            const idx = parseInt(card.getAttribute('data-idx'));
            const ev = displayedEvents[idx];
            if (ev) openEventBottomSheet(ev);
        };
    });
}

// 🌟 AUTOMATINIS DATRAUKINĖJIMAS SLENKANT ŽEMYN (IntersectionObserver)
function setupInfiniteScrollObserver(totalCount) {
    if (scrollObserver) scrollObserver.disconnect();

    const triggerEl = document.getElementById('events-load-more-box');
    if (!triggerEl) return;

    scrollObserver = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && visibleLimit < totalCount) {
            visibleLimit += PAGE_SIZE;
            renderFilteredEvents();
        }
    }, { threshold: 0.1 });

    scrollObserver.observe(triggerEl);
}

function openEventBottomSheet(ev) {
    const sheet = document.getElementById('event-detail-modal');
    const panel = document.getElementById('event-detail-panel');
    const titleEl = document.getElementById('sheet-event-title');
    const bodyEl = document.getElementById('event-sheet-body');

    if (!sheet || !bodyEl || !ev) return;

    if (titleEl) titleEl.textContent = ev.title;

    let distText = "";
    if (userGarageCoords && ev.latitude && ev.longitude && !ev.isOnline) {
        const dist = Math.round(calculateDist(userGarageCoords.lat, userGarageCoords.lng, ev.latitude, ev.longitude));
        distText = `• 🚗 ~${dist} km nuo jūsų kiemo`;
    }

    bodyEl.innerHTML = `
        <div class="bg-tractorBg p-4 rounded-2xl border border-tractorBorder space-y-2.5">
            <div class="flex flex-wrap items-center justify-between gap-2 border-b border-tractorBorder/60 pb-2">
                <span class="font-bold text-xs text-tractorPrimaryLight">📅 ${ev.dateReadable || ev.dateISO}</span>
                <span class="font-bold text-xs ${ev.isFree ? 'text-green-500' : 'text-amber-500'}">
                    ${ev.isFree ? '🟢 Nemokamas' : 'Su registracija'}
                </span>
            </div>

            <div class="space-y-1 text-xs">
                <div><span class="text-slate-400">Vieta:</span> <strong class="text-white">${ev.location} (${ev.district})</strong> ${distText}</div>
                ${ev.organizer ? `<div><span class="text-slate-400">Organizatorius:</span> <strong class="text-white">${ev.organizer}</strong></div>` : ''}
                ${ev.phone ? `<div><span class="text-slate-400">Telefonas:</span> <a href="tel:${ev.phone}" class="text-green-400 font-bold hover:underline">${ev.phone}</a></div>` : ''}
                <div><span class="text-slate-400">Kategorija:</span> <strong class="text-amber-400">${ev.category}</strong></div>
            </div>
        </div>

        ${ev.description ? `
            <div class="space-y-1">
                <span class="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">Apie renginį:</span>
                <p class="text-xs leading-relaxed text-slate-200 bg-tractorBg p-3.5 rounded-xl border border-tractorBorder">${ev.description}</p>
            </div>
        ` : ''}

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
            ${ev.sourceUrl ? `
                <a href="${ev.sourceUrl}" target="_blank" class="h-11 bg-tractorPrimary hover:bg-tractorPrimaryHover text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow transition">
                    <span>🔗</span> <span>Atidaryti registracijos puslapį</span>
                </a>
            ` : ''}
            ${!ev.isOnline && ev.latitude && ev.longitude ? `
                <a href="https://www.google.com/maps/dir/?api=1&destination=${ev.latitude},${ev.longitude}" target="_blank" class="h-11 bg-tractorBg hover:bg-zinc-800 border border-tractorBorder text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition">
                    <span>🧭</span> <span>Naviguoti (Google Maps)</span>
                </a>
            ` : ''}
        </div>
    `;

    sheet.classList.remove('hidden');
    setTimeout(() => panel?.classList.remove('translate-y-full'), 15);
}