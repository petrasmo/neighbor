// js/bendruomene/cropLeague.js

let activeScope = 'district'; // 'district' arba 'national'
let currentDistrict = 'Vilniaus r.';
let cachedCurrentUser = null;
let cachedUserData = null;
let cachedLeagueData = null;

// PROTINGAS KĖŠAS (Išsaugo jau aplankytus rajonus, kad vėliau pakrautų akimirksniu)
const districtCache = {};

// Nustatome sezoną: Rugpjūtis - Kovas = Ruduo/Žiema (tik Kviečiai ir Rapsai), Balandis - Liepa = Vasara (+Žirniai/Pupos)
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

            <!-- LENTELĖS -->
            <div class="space-y-4">
                
                <!-- 1. KVIEČIAI -->
                <div id="card-wrap-wheat" class="bg-tractorSurface border border-tractorBorder rounded-2xl p-4 sm:p-5 md:p-6 shadow-xl space-y-3">
                    <div class="border-b border-tractorBorder/70 pb-2.5">
                        <div class="flex items-center gap-2">
                            <span class="text-xl sm:text-2xl">🌾</span>
                            <div>
                                <h3 class="font-oswald text-base sm:text-xl font-bold uppercase tracking-wider text-white">TOP 10 Kviečių Laukai</h3>
                                <span class="text-[10px] sm:text-[11px] text-slate-400">${isAutumn ? 'Žieminiai kviečiai' : 'Žieminiai ir vasariniai kviečiai'}</span>
                            </div>
                        </div>
                    </div>
                    <div id="table-container-wheat" class="overflow-x-auto">
                        <div class="py-12 flex flex-col items-center justify-center space-y-3">
                            <span class="text-4xl animate-bounce">🚜</span>
                            <p class="text-xs font-bold text-slate-400 uppercase tracking-wider animate-pulse">Kraunamas derbis...</p>
                        </div>
                    </div>
                </div>

                <!-- 2. RAPSAI -->
                <div id="card-wrap-rape" class="bg-tractorSurface border border-tractorBorder rounded-2xl p-4 sm:p-5 md:p-6 shadow-xl space-y-3">
                    <div class="border-b border-tractorBorder/70 pb-2.5">
                        <div class="flex items-center gap-2">
                            <span class="text-xl sm:text-2xl">🌱</span>
                            <div>
                                <h3 class="font-oswald text-base sm:text-xl font-bold uppercase tracking-wider text-white">TOP 10 Rapsų Laukai</h3>
                                <span class="text-[10px] sm:text-[11px] text-slate-400">${isAutumn ? 'Žieminiai rapsai' : 'Žieminiai ir vasariniai rapsai'}</span>
                            </div>
                        </div>
                    </div>
                    <div id="table-container-rape" class="overflow-x-auto">
                        <div class="py-12 flex flex-col items-center justify-center space-y-3">
                            <span class="text-4xl animate-bounce">🚜</span>
                            <p class="text-xs font-bold text-slate-400 uppercase tracking-wider animate-pulse">Kraunamas derbis...</p>
                        </div>
                    </div>
                </div>

                <!-- 3. ANKŠTINIAI -->
                ${!isAutumn ? `
                    <div id="card-wrap-peas" class="bg-tractorSurface border border-tractorBorder rounded-2xl p-4 sm:p-5 md:p-6 shadow-xl space-y-3">
                        <div class="border-b border-tractorBorder/70 pb-2.5">
                            <div class="flex items-center gap-2">
                                <span class="text-xl sm:text-2xl">🫘</span>
                                <div>
                                    <h3 class="font-oswald text-base sm:text-xl font-bold uppercase tracking-wider text-white">TOP 10 Pupų ir Žirnių Laukai</h3>
                                    <span class="text-[10px] sm:text-[11px] text-slate-400">Baltyminiai augalai (pupos, žirniai)</span>
                                </div>
                            </div>
                        </div>
                        <div id="table-container-peas" class="overflow-x-auto">
                            <div class="py-12 flex flex-col items-center justify-center space-y-3">
                                <span class="text-4xl animate-bounce">🚜</span>
                                <p class="text-xs font-bold text-slate-400 uppercase tracking-wider animate-pulse">Kraunamas derbis...</p>
                            </div>
                        </div>
                    </div>
                ` : ''}

            </div>

        </div>
    `;

    setupLeagueEvents();
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
    const spinnerHtml = `
        <div class="py-12 flex flex-col items-center justify-center space-y-3">
            <span class="text-4xl animate-bounce">🚜</span>
            <p class="text-xs font-bold text-slate-400 uppercase tracking-wider animate-pulse">Kraunamas ${activeScope === 'district' ? currentDistrict : 'Lietuvos'} derbis...</p>
        </div>
    `;
    const w = document.getElementById('table-container-wheat');
    const r = document.getElementById('table-container-rape');
    const p = document.getElementById('table-container-peas');
    if (w) w.innerHTML = spinnerHtml;
    if (r) r.innerHTML = spinnerHtml;
    if (p) p.innerHTML = spinnerHtml;
}

function renderAllCategories() {
    if (!cachedLeagueData) return;
    renderCategory('table-container-wheat', cachedLeagueData.wheat);
    renderCategory('table-container-rape', cachedLeagueData.rape);
    
    if (!isAutumnSeason() && document.getElementById('table-container-peas')) {
        renderCategory('table-container-peas', cachedLeagueData.peas);
    }
}

function renderCategory(containerId, catData) {
    const box = document.getElementById(containerId);
    if (!box || !catData) return;

    if (catData.top10.length === 0) {
        box.innerHTML = `
            <div class="py-8 text-center text-slate-500 text-xs font-medium">
                ${activeScope === 'district' ? `Šiame rajone dar nėra dalyvaujančių sklypų.` : `Laukų nerasta.`}
            </div>
        `;
        return;
    }

    let rowsHtml = catData.top10.map(f => {
        let rankBadge = `#${f.rank}`;
        if (f.rank === 1) rankBadge = `<span class="text-amber-400 font-black text-sm flex items-center gap-1">🥇 1</span>`;
        else if (f.rank === 2) rankBadge = `<span class="text-slate-300 font-black text-sm flex items-center gap-1">🥈 2</span>`;
        else if (f.rank === 3) rankBadge = `<span class="text-amber-600 font-black text-sm flex items-center gap-1">🥉 3</span>`;

        let scoreBg = "#15803D";
        if (f.score < 50) scoreBg = "#DC2626";
        else if (f.score < 75) scoreBg = "#D97706";

        let rawId = f.fieldId || "XXXXXX-XXXX";
        let maskedDisplayId = rawId;

        if (rawId.includes("-")) {
            const parts = rawId.split("-");
            if (parts.length === 2) {
                const p1 = "X".repeat(parts[0].length);
                const p2 = "X".repeat(Math.max(0, parts[1].length - 4)) + parts[1].slice(-4);
                maskedDisplayId = `${p1}-${p2}`;
            }
        } else if (rawId.length > 4) {
            const last4 = rawId.slice(-4);
            maskedDisplayId = "X".repeat(rawId.length - 4) + last4;
        }

        let fieldNameHtml = `<span class="font-mono text-slate-400 font-bold tracking-wider">${maskedDisplayId}</span>`;
        if (f.isMine) {
            fieldNameHtml = `
                <span class="font-bold text-white">${f.name}</span>
                <span class="ml-1 bg-tractorPrimary text-white text-[9px] px-1.5 py-0.2 rounded-full font-black uppercase tracking-wider shadow-sm">Jūs</span>
            `;
        }

        return `
            <tr class="${f.isMine ? 'bg-tractorPrimary/10 border-l-4 border-tractorPrimary' : 'hover:bg-tractorBg/40'} border-b border-tractorBorder/40 transition text-xs">
                <td class="py-2.5 px-2 font-mono font-bold">${rankBadge}</td>
                <td class="py-2.5 px-2">
                    ${fieldNameHtml}
                </td>
                <td class="py-2.5 px-2 font-mono font-semibold text-slate-300">${f.areaHa} ha</td>
                <td class="py-2.5 px-2 font-mono font-medium text-slate-400 whitespace-nowrap">🛰️ ${f.satDate || '10-03'}</td>
                <td class="py-2.5 px-2 text-right">
                    <span class="font-mono font-black text-xs px-2 py-0.5 rounded-lg shadow-sm inline-block" style="background-color: ${scoreBg}; color: #FFFFFF !important;">
                        ${f.score.toFixed(2)}
                    </span>
                </td>
            </tr>
        `;
    }).join('');

    let myPinnedRowHtml = '';
    const myRanks = catData.myPersonalRanks || (catData.myPersonalRank ? [catData.myPersonalRank] : []);

    if (myRanks.length > 0) {
        myPinnedRowHtml = `
            <tr class="border-b border-tractorBorder/60">
                <td colspan="5" class="py-1 text-center text-slate-500 text-xs font-mono tracking-widest">...</td>
            </tr>
        ` + myRanks.map(m => {
            let scoreBg = m.score >= 75 ? "#15803D" : (m.score < 50 ? "#DC2626" : "#D97706");
            return `
                <tr class="bg-tractorPrimary/15 border-2 border-tractorPrimary rounded-xl text-xs font-bold shadow-md">
                    <td class="py-2.5 px-2 font-mono font-black text-tractorPrimaryLight">#${m.rank}</td>
                    <td class="py-2.5 px-2 text-white font-bold">
                        <span>${m.name}</span>
                        <span class="ml-1 bg-tractorPrimary text-white text-[9px] px-1.5 py-0.2 rounded-full font-black uppercase tracking-wider">Jūs</span>
                    </td>
                    <td class="py-2.5 px-2 font-mono text-tractorPrimaryLight font-bold">${m.areaHa} ha</td>
                    <td class="py-2.5 px-2 font-mono text-tractorPrimaryLight text-xs">🛰️ ${m.satDate || '10-03'}</td>
                    <td class="py-2.5 px-2 text-right">
                        <span class="font-mono font-black text-xs px-2 py-0.5 rounded-lg shadow-md inline-block" style="background-color: ${scoreBg}; color: #FFFFFF !important;">
                            ${m.score.toFixed(2)}
                        </span>
                    </td>
                </tr>
            `;
        }).join('');
    }

    box.innerHTML = `
        <table class="w-full text-left text-xs">
            <thead>
                <tr class="border-b-2 border-tractorBorder/80 text-slate-400 uppercase font-black text-[10px] sm:text-[11px] tracking-wider">
                    <th class="py-2 px-2">Vieta</th>
                    <th class="py-2 px-2">Laukas</th>
                    <th class="py-2 px-2">Plotas</th>
                    <th class="py-2 px-2">Kadras</th>
                    <th class="py-2 px-2 text-right">Balas</th>
                </tr>
            </thead>
            <tbody>
                ${rowsHtml}
                ${myPinnedRowHtml}
            </tbody>
        </table>
    `;
}