// js/bendruomene/cropLeague.js

let activeScope = 'district'; // 'district' arba 'national'
let currentDistrict = 'Vilniaus r.';
let cachedCurrentUser = null;
let cachedUserData = null;
let cachedLeagueData = null;

// PROTINGAS KĖŠAS (Išsaugo jau aplankytus rajonus, kad vėliau pakrautų akimirksniu)
const districtCache = {};

function isAutumnSeason() {
    const m = new Date().getMonth();
    return m >= 7 || m <= 2;
}

const ALL_LITHUANIAN_DISTRICTS = [
    "Akmenės r.", "Alytaus r.", "Anykščių r.", "Biržų r.", "Elektrėnų sav.",
    "Ignalinos r.", "Jonavos r.", "Joniškio r.", "Jurbarko r.", "Kaišiadorių r.",
    "Kalvarijos sav.", "Kauno r.", "Kazlų Rūdos sav.", "Kelmės r.", "Kėdainių r.",
    "Klaipėdos r.", "Kretingos r.", "Kupiškio r.", "Lazdijų r.", "Marijampolės sav.",
    "Mažeikių r.", "Molėtų r.", "Pagėgių sav.", "Pakruojo r.", "Panevėžio r.",
    "Pasvalio r.", "Plungės r.", "Prienų r.", "Radviliškio r.", "Raseinių r.",
    "Rietavo sav.", "Rokiškio r.", "Skuodo r.", "Šakių r.", "Šalčininkų r.",
    "Šilalės r.", "Šilutės r.", "Širvintų r.", "Šiaulių r.", "Švenčionių r.",
    "Tauragės r.", "Telšių r.", "Trakų r.", "Ukmergės r.", "Utenos r.",
    "Varėnos r.", "Vilkaviškio r.", "Vilniaus r.", "Zarasų r."
].sort((a, b) => a.localeCompare(b, 'lt'));

export function initCropLeagueTab(currentUser, userData) {
    cachedCurrentUser = currentUser;
    cachedUserData = userData;

    currentDistrict = userData?.garageRegion || 'Vilniaus r.';

    const container = document.getElementById('view-tab-league');
    if (!container) return;

    renderLeagueLayout(container);
    fetchLeaderboard();
}

function renderLeagueLayout(container) {
    const isAutumn = isAutumnSeason();
    const districtOptionsHtml = ALL_LITHUANIAN_DISTRICTS.map(d => `
        <option value="${d}" ${currentDistrict === d ? 'selected' : ''}>${d}</option>
    `).join('');

    const seasonBadgeHtml = isAutumn
        ? `<span>🍁</span> Rudens Sezonas: Žiemkenčių Sudygimas ir Biomasė`
        : `<span>☀️</span> Vasaros Sezonas: Brandus Derlius ir Baltyminiai Augalai`;

    container.innerHTML = `
        <style>
            @keyframes leagueRevealFromBottom {
                0% {
                    opacity: 0;
                    transform: translateY(22px);
                }
                100% {
                    opacity: 1;
                    transform: translateY(0);
                }
            }
            .animate-league-item {
                opacity: 0;
                animation: leagueRevealFromBottom 0.65s cubic-bezier(0.16, 1, 0.3, 1) forwards;
            }

            /* 🌟 DIDELIŲ MEDALIŲ PULSAVIMO ANIMACIJOS */
            @keyframes medalGoldPulse {
                0%, 100% {
                    transform: scale(1);
                    filter: drop-shadow(0 2px 8px rgba(234, 179, 8, 0.5));
                }
                50% {
                    transform: scale(1.18) rotate(4deg);
                    filter: drop-shadow(0 6px 18px rgba(234, 179, 8, 0.9));
                }
            }
            .animate-medal-gold {
                display: inline-block;
                animation: medalGoldPulse 2.4s ease-in-out infinite;
            }

            @keyframes medalSilverPulse {
                0%, 100% {
                    transform: scale(1);
                }
                50% {
                    transform: scale(1.12);
                    filter: drop-shadow(0 4px 10px rgba(148, 163, 184, 0.6));
                }
            }
            .animate-medal-silver {
                display: inline-block;
                animation: medalSilverPulse 3s ease-in-out infinite;
            }

            @keyframes medalBronzePulse {
                0%, 100% {
                    transform: scale(1);
                }
                50% {
                    transform: scale(1.12);
                    filter: drop-shadow(0 4px 10px rgba(217, 119, 6, 0.6));
                }
            }
            .animate-medal-bronze {
                display: inline-block;
                animation: medalBronzePulse 3.4s ease-in-out infinite;
            }

            .gold-glow {
                box-shadow: 0 0 25px rgba(234, 179, 8, 0.22);
            }
        </style>

        <div class="space-y-4 max-w-6xl mx-auto w-full">
            
            <div class="border-b border-tractorBorder pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div class="space-y-1">
                    <div class="inline-flex items-center gap-1.5 bg-amber-500/15 border border-amber-500/30 text-amber-500 text-xs px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider">
                        ${seasonBadgeHtml}
                    </div>
                    <h2 class="font-oswald text-xl sm:text-2xl md:text-3xl font-bold uppercase tracking-wider text-white flex items-center gap-2">
                        <span>🏆</span> Lietuvos Pasėlių Lyga
                    </h2>
                    <p class="text-[11px] sm:text-xs text-slate-300">
                        Sveikiausi sklypai pagal palydovo duomenis. Kaimynų laukai rodomi saugiai (XXXXXX-X426), jūsų – pilnu pavadinimu.
                    </p>
                </div>
            </div>

            <!-- VALDYMO IR RAJONO JUOSTA -->
            <div class="bg-tractorSurface border border-tractorBorder rounded-2xl p-2.5 sm:p-4 shadow-sm flex flex-nowrap items-center justify-between gap-1.5 sm:gap-3">
                
                <!-- REŽIMŲ PERJUNGIKLIS -->
                <div class="flex items-center gap-0.5 sm:gap-1 bg-tractorBg p-1 rounded-xl border border-tractorBorder shrink-0">
                    <button type="button" id="btn-scope-district" class="px-2.5 sm:px-3 py-1.5 rounded-lg text-[11px] sm:text-xs font-bold transition cursor-pointer ${activeScope === 'district' ? 'bg-tractorPrimary text-white shadow' : 'text-slate-400 hover:text-white'}">
                        <span>📍</span> <span>Derbis<span class="hidden md:inline">&nbsp;rajoninis</span></span>
                    </button>
                    <button type="button" id="btn-scope-national" class="px-2 sm:px-3 py-1.5 rounded-lg text-[11px] sm:text-xs font-bold transition cursor-pointer ${activeScope === 'national' ? 'bg-tractorPrimary text-white shadow' : 'text-slate-400 hover:text-white'}">
                        <span>🇱🇹</span> <span>Visi<span class="hidden sm:inline">&nbsp;(TOP 10)</span></span>
                    </button>
                </div>

                <!-- RAJONO PARINKIKLIS -->
                <div id="district-selector-box" class="flex items-center gap-1.5 min-w-0 ${activeScope === 'district' ? '' : 'hidden'}">
                    <span class="hidden sm:inline text-xs font-bold text-slate-400 shrink-0">Rajonas:</span>
                    <select id="league-district-select" class="h-9 sm:h-10 bg-tractorBg border border-tractorBorder focus:border-tractorPrimary rounded-xl px-2 sm:px-3 text-[11px] sm:text-xs font-bold text-white outline-none cursor-pointer w-28 sm:w-44 truncate">
                        ${districtOptionsHtml}
                    </select>
                </div>

            </div>

            <!-- KATEGORIJŲ BLOKAI -->
            <div class="space-y-4">
                
                <!-- 1. KVIEČIAI -->
                <div id="card-wrap-wheat" class="bg-tractorSurface border border-tractorBorder rounded-2xl p-3.5 sm:p-5 md:p-6 shadow-xl space-y-3.5">
                    <div class="border-b border-tractorBorder/70 pb-2.5 flex items-center justify-between">
                        <div class="flex items-center gap-2">
                            <span class="text-xl sm:text-2xl">🌾</span>
                            <div>
                                <h3 class="font-oswald text-base sm:text-xl font-bold uppercase tracking-wider text-white">TOP 10 Kviečių Laukai</h3>
                                <span class="text-[10px] sm:text-[11px] text-slate-400">${isAutumn ? 'Žieminiai kviečiai' : 'Žieminiai ir vasariniai kviečiai'}</span>
                            </div>
                        </div>
                    </div>
                    <div id="table-container-wheat" class="space-y-3">
                        ${getLoadingHtml()}
                    </div>
                </div>

                <!-- 2. RAPSAI -->
                <div id="card-wrap-rape" class="bg-tractorSurface border border-tractorBorder rounded-2xl p-3.5 sm:p-5 md:p-6 shadow-xl space-y-3.5">
                    <div class="border-b border-tractorBorder/70 pb-2.5 flex items-center justify-between">
                        <div class="flex items-center gap-2">
                            <span class="text-xl sm:text-2xl">🌱</span>
                            <div>
                                <h3 class="font-oswald text-base sm:text-xl font-bold uppercase tracking-wider text-white">TOP 10 Rapsų Laukai</h3>
                                <span class="text-[10px] sm:text-[11px] text-slate-400">${isAutumn ? 'Žieminiai rapsai' : 'Žieminiai ir vasariniai rapsai'}</span>
                            </div>
                        </div>
                    </div>
                    <div id="table-container-rape" class="space-y-3">
                        ${getLoadingHtml()}
                    </div>
                </div>

                <!-- 3. ANKŠTINIAI -->
                ${!isAutumn ? `
                    <div id="card-wrap-peas" class="bg-tractorSurface border border-tractorBorder rounded-2xl p-3.5 sm:p-5 md:p-6 shadow-xl space-y-3.5">
                        <div class="border-b border-tractorBorder/70 pb-2.5 flex items-center justify-between">
                            <div class="flex items-center gap-2">
                                <span class="text-xl sm:text-2xl">🫘</span>
                                <div>
                                    <h3 class="font-oswald text-base sm:text-xl font-bold uppercase tracking-wider text-white">TOP 10 Pupų ir Žirnių Laukai</h3>
                                    <span class="text-[10px] sm:text-[11px] text-slate-400">Baltyminiai augalai (pupos, žirniai)</span>
                                </div>
                            </div>
                        </div>
                        <div id="table-container-peas" class="space-y-3">
                            ${getLoadingHtml()}
                        </div>
                    </div>
                ` : ''}

            </div>

        </div>
    `;

    setupLeagueEvents();
}

function getLoadingHtml() {
    return `
        <div class="py-10 flex flex-col items-center justify-center space-y-3">
            <span class="text-3xl animate-bounce">🚜</span>
            <p class="text-xs font-bold text-slate-400 uppercase tracking-wider animate-pulse">Kraunamas derbis...</p>
        </div>
    `;
}

function setupLeagueEvents() {
    const btnDistrict = document.getElementById('btn-scope-district');
    const btnNational = document.getElementById('btn-scope-national');
    const districtBox = document.getElementById('district-selector-box');
    const districtSelect = document.getElementById('league-district-select');

    if (btnDistrict && btnNational) {
        btnDistrict.onclick = () => {
            activeScope = 'district';
            btnDistrict.className = "px-2.5 sm:px-3 py-1.5 rounded-lg text-[11px] sm:text-xs font-bold transition cursor-pointer bg-tractorPrimary text-white shadow";
            btnNational.className = "px-2 sm:px-3 py-1.5 rounded-lg text-[11px] sm:text-xs font-bold transition cursor-pointer text-slate-400 hover:text-white";
            districtBox?.classList.remove('hidden');
            fetchLeaderboard();
        };

        btnNational.onclick = () => {
            activeScope = 'national';
            btnNational.className = "px-2 sm:px-3 py-1.5 rounded-lg text-[11px] sm:text-xs font-bold transition cursor-pointer bg-tractorPrimary text-white shadow";
            btnDistrict.className = "px-2.5 sm:px-3 py-1.5 rounded-lg text-[11px] sm:text-xs font-bold transition cursor-pointer text-slate-400 hover:text-white";
            districtBox?.classList.add('hidden');
            fetchLeaderboard();
        };
    }

    if (districtSelect) {
        districtSelect.onchange = (e) => {
            currentDistrict = e.target.value;
            fetchLeaderboard();
        };
    }
}

async function fetchLeaderboard() {
    const myUid = cachedCurrentUser ? cachedCurrentUser.uid : '';
    const cacheKey = `${activeScope}_${activeScope === 'district' ? currentDistrict : 'national'}`;

    if (districtCache[cacheKey]) {
        cachedLeagueData = districtCache[cacheKey];
        renderAllCategories();
        return;
    }

    showLoadingIndicator();

    const url = `https://us-central1-neighborpm-b9968.cloudfunctions.net/getLeagueLeaderboard?scope=${activeScope}&district=${encodeURIComponent(currentDistrict)}&userId=${myUid}`;

    try {
        const res = await fetch(url);
        cachedLeagueData = await res.json();
        districtCache[cacheKey] = cachedLeagueData;
        renderAllCategories();
    } catch (err) {
        console.error("Lygos krovimo klaida:", err);
    }
}

function showLoadingIndicator() {
    ['table-container-wheat', 'table-container-rape', 'table-container-peas'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.innerHTML = getLoadingHtml();
    });
}

function renderAllCategories() {
    if (!cachedLeagueData) return;
    renderCategory('table-container-wheat', cachedLeagueData.wheat);
    renderCategory('table-container-rape', cachedLeagueData.rape);
    
    if (!isAutumnSeason() && document.getElementById('table-container-peas')) {
        renderCategory('table-container-peas', cachedLeagueData.peas);
    }
}

// Pagalbinė ID maskavimo funkcija
function maskFieldId(rawId) {
    if (!rawId) return "XXXXXX-XXXX";
    if (rawId.includes("-")) {
        const parts = rawId.split("-");
        if (parts.length === 2) {
            const p1 = "X".repeat(parts[0].length);
            const p2 = "X".repeat(Math.max(0, parts[1].length - 4)) + parts[1].slice(-4);
            return `${p1}-${p2}`;
        }
    }
    if (rawId.length > 4) {
        return "X".repeat(rawId.length - 4) + rawId.slice(-4);
    }
    return rawId;
}

function renderCategory(containerId, catData) {
    const box = document.getElementById(containerId);
    if (!box || !catData) return;

    const list = catData.top10 || [];

    if (list.length === 0) {
        box.innerHTML = `
            <div class="py-8 text-center text-slate-500 text-xs font-medium">
                ${activeScope === 'district' ? `Šiame rajone dar nėra dalyvaujančių sklypų.` : `Laukų nerasta.`}
            </div>
        `;
        return;
    }

    const top3 = list.slice(0, 3);
    const rest = list.slice(3);

    // 1. TOP 3 PJEDESTALAS SU DIDELIAIS IR PULSUOJANČIAIS MEDALIAIS
    let podiumHtml = '';
    if (top3.length > 0) {
        const p1 = top3[0];
        const p2 = top3[1] || null;
        const p3 = top3[2] || null;

        const renderPodiumCard = (f, rank, isCenter = false, animDelayMs = 200) => {
            if (!f) {
                return `<div class="bg-tractorBg/40 border border-tractorBorder/40 rounded-xl p-2 opacity-30 flex items-center justify-center text-[10px] text-slate-500">Laisva</div>`;
            }

            const isGold = rank === 1;
            const isSilver = rank === 2;
            
            // 🌟 Dideli medaliai su pulsavimo animacijomis
            const medalEmoji = isGold 
                ? `<span class="text-3xl sm:text-4xl animate-medal-gold">🥇</span>` 
                : (isSilver 
                    ? `<span class="text-2xl sm:text-3xl animate-medal-silver">🥈</span>` 
                    : `<span class="text-2xl sm:text-3xl animate-medal-bronze">🥉</span>`);

            // Apvadas ir fonas
            const borderCol = isGold 
                ? "border-amber-500/80 gold-glow bg-amber-500/10 dark:bg-amber-500/15" 
                : (isSilver 
                    ? "border-slate-400/80 bg-slate-200/50 dark:bg-slate-400/10" 
                    : "border-amber-700/80 bg-amber-800/10 dark:bg-amber-900/15");

            // 🌟 100% KONTRASTAS ŠVIESIAI IR TAMSIAI TEMAI
            const rankBadgeStyle = isGold
                ? "background-color: #FEF3C7; color: #B45309; border: 1px solid #FCD34D;"
                : (isSilver
                    ? "background-color: #F1F5F9; color: #334155; border: 1px solid #CBD5E1;"
                    : "background-color: #FFEDD5; color: #C2410C; border: 1px solid #FDBA74;");

            const scoreTextColor = isGold
                ? "color: #D97706;"
                : (isSilver
                    ? "color: #475569;"
                    : "color: #C2410C;");

            const barColor = isGold ? "#EAB308" : (isSilver ? "#64748B" : "#D97706");

            const displayName = f.isMine ? f.name : maskFieldId(f.fieldId);
            const myBadge = f.isMine ? `<span class="bg-tractorPrimary text-white text-[9px] px-2 py-0.5 rounded-full font-black uppercase" style="color: #FFFFFF !important;">Jūs</span>` : '';
            const scorePercent = Math.min(100, Math.max(10, Math.round(f.score)));

            return `
                <div class="animate-league-item relative p-3 sm:p-4 rounded-2xl border-2 ${borderCol} flex flex-col justify-between text-center transition-all ${isCenter ? 'sm:-translate-y-3 sm:pb-5' : ''}" style="animation-delay: ${animDelayMs}ms;">
                    <div class="space-y-1.5">
                        
                        <!-- Didelis pulsuojantis medalis -->
                        <div class="flex items-center justify-center pt-0.5">
                            ${medalEmoji}
                        </div>

                        <!-- Vietos ženkliukas -->
                        <div class="flex items-center justify-center gap-1">
                            <span class="inline-block px-2.5 py-0.5 rounded-full text-[10px] sm:text-xs font-black uppercase tracking-wider font-oswald shadow-sm" style="${rankBadgeStyle}">
                                #${rank} VIETA
                            </span>
                            ${myBadge}
                        </div>

                        <!-- Pavadinimas (100% ryškus) -->
                        <div class="font-extrabold text-xs sm:text-sm truncate pt-0.5" title="${displayName}" style="color: var(--text-main);">
                            ${displayName}
                        </div>

                        <div class="text-[10px] sm:text-[11px] font-mono" style="color: var(--text-muted);">
                            ${f.areaHa} ha • 🛰️ ${f.satDate || '10-03'}
                        </div>
                    </div>

                    <!-- Balas ir progreso stulpelis -->
                    <div class="pt-2 mt-2 border-t border-tractorBorder/60 space-y-1">
                        <div class="font-mono text-xl sm:text-2xl font-black leading-tight" style="${scoreTextColor}">
                            ${f.score.toFixed(2)}
                        </div>
                        <div class="w-full bg-tractorBg h-2 rounded-full overflow-hidden border border-tractorBorder/50">
                            <div class="h-full rounded-full transition-all duration-700" style="width: ${scorePercent}%; background-color: ${barColor};"></div>
                        </div>
                    </div>
                </div>
            `;
        };

        // Podiumas išvažiuoja po vieną: #2 (200ms) -> #1 (400ms) -> #3 (600ms)
        podiumHtml = `
            <div class="grid grid-cols-3 gap-2 sm:gap-4 items-end pt-2 pb-3">
                ${renderPodiumCard(p2, 2, false, 200)}
                ${renderPodiumCard(p1, 1, true, 400)}
                ${renderPodiumCard(p3, 3, false, 600)}
            </div>
        `;
    }

    // 2. LIKUSIŲ (#4–#10) KORTELIŲ KŪRIMAS (kas 130 ms)
    let rowsHtml = rest.map((f, i) => {
        const animDelay = 750 + (i * 130);
        const displayName = f.isMine ? f.name : maskFieldId(f.fieldId);
        const myBadge = f.isMine ? `<span class="ml-1 bg-tractorPrimary text-white text-[9px] px-1.5 py-0.2 rounded-full font-black uppercase" style="color: #FFFFFF !important;">Jūs</span>` : '';
        const scorePercent = Math.min(100, Math.max(10, Math.round(f.score)));

        let scoreBg = "#15803D"; // Sodri žalia
        if (f.score < 50) scoreBg = "#DC2626"; // Raudona
        else if (f.score < 75) scoreBg = "#D97706"; // Gintarinė

        return `
            <div class="animate-league-item p-2.5 sm:p-3 rounded-xl border transition-all cursor-pointer select-none flex items-center justify-between gap-2.5 ${
                f.isMine 
                ? 'bg-tractorPrimary/15 border-2 border-tractorPrimary ring-1 ring-tractorPrimary shadow-md' 
                : 'bg-tractorBg border-tractorBorder hover:border-slate-500 hover:bg-tractorSurface'
            }" style="animation-delay: ${animDelay}ms;">
                
                <!-- Kairė: Vieta ir Lauko info -->
                <div class="flex items-center gap-2.5 min-w-0 flex-1">
                    <span class="font-mono font-black text-xs sm:text-sm w-7 text-center shrink-0" style="color: var(--text-muted);">#${f.rank}</span>
                    <div class="min-w-0 flex-1 space-y-0.5">
                        <div class="flex items-center gap-1.5 flex-wrap">
                            <span class="font-extrabold text-xs sm:text-sm truncate" style="color: var(--text-main);">${displayName}</span>
                            ${myBadge}
                        </div>
                        <div class="flex items-center gap-2 text-[10px] sm:text-[11px] font-mono" style="color: var(--text-muted);">
                            <span>${f.areaHa} ha</span>
                            <span>•</span>
                            <span>🛰️ ${f.satDate || '10-03'}</span>
                        </div>
                    </div>
                </div>

                <!-- Dešinė: Biomasės stulpelis ir balas -->
                <div class="flex items-center gap-2.5 sm:gap-3.5 shrink-0">
                    <div class="hidden sm:flex flex-col items-end w-24 space-y-1">
                        <span class="text-[9px] uppercase font-bold tracking-wider" style="color: var(--text-muted);">Biomasė</span>
                        <div class="w-full bg-tractorSurface h-1.5 rounded-full overflow-hidden border border-tractorBorder/70">
                            <div class="h-full rounded-full" style="width: ${scorePercent}%; background-color: ${scoreBg};"></div>
                        </div>
                    </div>

                    <!-- 🌟 100% BALTAS TEKSTAS (SU !IMPORTANT IR ŠEŠĖLIU) -->
                    <span class="font-mono font-black text-xs sm:text-sm px-3 py-1.5 rounded-xl shadow min-w-[58px] text-center" 
                          style="background-color: ${scoreBg} !important; color: #FFFFFF !important; text-shadow: 0 1px 2px rgba(0,0,0,0.5);">
                        ${f.score.toFixed(2)}
                    </span>
                </div>

            </div>
        `;
    }).join('');

    // 3. PRISEGTAS JŪSŲ LAUKAS (jei esate žemiau TOP 10)
    let myPinnedRowHtml = '';
    const myRanks = catData.myPersonalRanks || (catData.myPersonalRank ? [catData.myPersonalRank] : []);

    if (myRanks.length > 0) {
        const thirdPlaceScore = top3[2] ? top3[2].score : (top3[0] ? top3[0].score : 80);
        const pinnedDelay = 750 + (rest.length * 130) + 150;

        myPinnedRowHtml = `
            <div class="py-1 text-center text-slate-400 text-xs font-mono tracking-widest font-bold">
                • • •
            </div>
        ` + myRanks.map(m => {
            const gap = (thirdPlaceScore - m.score).toFixed(2);
            const scorePercent = Math.min(100, Math.max(10, Math.round(m.score)));
            const scoreBg = m.score >= 75 ? "#15803D" : (m.score < 50 ? "#DC2626" : "#D97706");

            return `
                <div class="animate-league-item p-3 sm:p-3.5 rounded-2xl border-2 border-tractorPrimary bg-tractorPrimary/20 shadow-xl flex items-center justify-between gap-3 text-xs" style="animation-delay: ${pinnedDelay}ms;">
                    <div class="flex items-center gap-2.5 min-w-0 flex-1">
                        <span class="font-mono font-black text-sm text-green-600 dark:text-tractorPrimaryLight w-7 text-center shrink-0">#${m.rank}</span>
                        <div class="min-w-0 flex-1 space-y-0.5">
                            <div class="flex items-center gap-1.5">
                                <strong class="font-bold text-sm truncate" style="color: var(--text-main);">${m.name}</strong>
                                <span class="bg-tractorPrimary text-white text-[9px] px-1.5 py-0.2 rounded-full font-black uppercase tracking-wider" style="color: #FFFFFF !important;">Jūs</span>
                            </div>
                            <div class="flex items-center gap-2 text-[10px] text-green-700 dark:text-tractorPrimaryLight font-mono font-bold">
                                <span>${m.areaHa} ha</span>
                                <span>•</span>
                                <span>🛰️ ${m.satDate || '10-03'}</span>
                                ${gap > 0 ? `<span class="text-amber-500 font-extrabold">(Iki TOP 3: -${gap} balo)</span>` : ''}
                            </div>
                        </div>
                    </div>

                    <div class="flex items-center gap-2 sm:gap-3 shrink-0">
                        <div class="hidden sm:flex flex-col items-end w-24 space-y-1">
                            <span class="text-[9px] uppercase font-bold text-green-700 dark:text-tractorPrimaryLight">Biomasė</span>
                            <div class="w-full bg-tractorBg h-1.5 rounded-full overflow-hidden border border-tractorBorder">
                                <div class="h-full rounded-full" style="width: ${scorePercent}%; background-color: ${scoreBg};"></div>
                            </div>
                        </div>

                        <span class="font-mono font-black text-xs sm:text-sm px-3 py-1.5 rounded-xl shadow-md min-w-[58px] text-center" 
                              style="background-color: ${scoreBg} !important; color: #FFFFFF !important; text-shadow: 0 1px 2px rgba(0,0,0,0.5);">
                            ${m.score.toFixed(2)}
                        </span>
                    </div>
                </div>
            `;
        }).join('');
    }

    box.innerHTML = `
        <div class="space-y-3">
            ${podiumHtml}
            <div class="space-y-2">
                ${rowsHtml}
                ${myPinnedRowHtml}
            </div>
        </div>
    `;
}