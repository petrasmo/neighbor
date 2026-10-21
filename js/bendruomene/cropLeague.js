// js/bendruomene/cropLeague.js
import { getDistrictFromCoords } from '../core/geoDistricts.js';
import { db } from '../core/firebase.js';

let activeScope = 'district'; // 'district' arba 'national'
let currentDistrict = 'Vilniaus r.';
let activeCrop = 'wheat'; // 'wheat', 'rape', 'peas'
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

// 🌟 PROTINGAS VARTOTOJO RAJONO NUSTATYMAS
async function resolveUserDistrict(userData, currentUser) {
    // 1. Jei profilyje jau yra rajono tekstas – suderiname su sąrašu
    if (userData?.garageRegion) {
        const matched = matchDistrictWithList(userData.garageRegion);
        if (matched) return matched;
    }

    // 2. Jei rajono teksto nėra, bet yra bazės GPS koordinatės – nustatome pagal GPS!
    if (userData?.garageLat && userData?.garageLon && userData.garageLat !== 0) {
        try {
            const detected = await getDistrictFromCoords(userData.garageLat, userData.garageLon);
            if (detected) {
                const matched = matchDistrictWithList(detected);
                if (matched) {
                    // Išsaugome į Firestore fone, kad kitą kartą nereikėtų skaičiuoti
                    if (currentUser?.uid) {
                        db.collection("users").doc(currentUser.uid).update({ garageRegion: matched }).catch(() => {});
                        userData.garageRegion = matched;
                    }
                    return matched;
                }
            }
        } catch (e) {
            console.warn("Nepavyko nustatyti rajono pagal koordinates:", e);
        }
    }

    return 'Vilniaus r.';
}

function matchDistrictWithList(rawName) {
    if (!rawName) return null;
    const clean = rawName
        .toLowerCase()
        .replace(" miesto", "")
        .replace(" m.", "")
        .replace(" rajono", "")
        .replace(" savivaldybė", "")
        .replace(" r.", "")
        .replace(" sav.", "")
        .trim();
    
    return ALL_LITHUANIAN_DISTRICTS.find(d => {
        const cleanD = d.toLowerCase().replace(" r.", "").replace(" sav.", "").trim();
        return cleanD === clean || d.toLowerCase().includes(clean) || clean.includes(cleanD);
    }) || null;
}

function ensureLeagueStylesInjected() {
    if (document.getElementById('crop-league-custom-styles')) return;

    const styleEl = document.createElement('style');
    styleEl.id = 'crop-league-custom-styles';
    styleEl.innerHTML = `
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
            0%, 100% { transform: scale(1); }
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
            0%, 100% { transform: scale(1); }
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
    `;
    document.head.appendChild(styleEl);
}

export async function initCropLeagueTab(currentUser, userData) {
    cachedCurrentUser = currentUser;
    cachedUserData = userData;

    // 🌟 AUTOMATINIS ŪKIO BAZĖS RAJONO PARINKIMAS
    currentDistrict = await resolveUserDistrict(userData, currentUser);

    const container = document.getElementById('view-tab-league');
    if (!container) return;

    ensureLeagueStylesInjected();
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
        <div class="space-y-4 w-full">
            
            <!-- ANTRAŠTĖ -->
            <div class="border-b border-tractorBorder pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div class="space-y-1">
                    <div class="inline-flex items-center gap-1.5 bg-amber-500/15 border border-amber-500/30 text-amber-500 text-xs px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider">
                        ${seasonBadgeHtml}
                    </div>
                    <h2 class="font-oswald text-xl sm:text-2xl md:text-3xl font-bold uppercase tracking-wider text-white flex items-center gap-2">
                        <span>🏆</span> Lietuvos Pasėlių Lyga
                    </h2>
                    <p class="text-xs text-slate-300">
                        Sveikiausi sklypai pagal palydovo duomenis. Kaimynų laukai rodomi saugiai (XXXXXX-X426), jūsų – pilnu pavadinimu.
                    </p>
                </div>

                <button type="button" id="btn-open-league-rules" class="h-10 px-3.5 bg-tractorBg hover:bg-tractorSurface border border-tractorBorder hover:border-tractorPrimary text-slate-300 hover:text-white rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-2 shadow-sm shrink-0 self-start sm:self-auto">
                    <span>⚖️</span> <span>Kaip skaičiuojamas balas?</span>
                </button>
            </div>

            <!-- VALDYMO JUOSTA -->
            <div class="bg-tractorSurface border border-tractorBorder rounded-2xl p-3 sm:p-4 shadow-sm space-y-3">
                
                <div class="flex flex-nowrap items-center justify-between gap-2">
                    <div class="flex items-center gap-1 bg-tractorBg p-1 rounded-xl border border-tractorBorder shrink-0">
                        <button type="button" id="btn-scope-district" class="px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${activeScope === 'district' ? 'bg-tractorPrimary text-white shadow' : 'text-slate-400 hover:text-white'}">
                            <span>📍</span> <span>Derbis<span class="hidden md:inline">&nbsp;rajoninis</span></span>
                        </button>
                        <button type="button" id="btn-scope-national" class="px-2 sm:px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${activeScope === 'national' ? 'bg-tractorPrimary text-white shadow' : 'text-slate-400 hover:text-white'}">
                            <span>🇱🇹</span> <span>Visi<span class="hidden sm:inline">&nbsp;(TOP 10)</span></span>
                        </button>
                    </div>

                    <div id="district-selector-box" class="flex items-center gap-1.5 min-w-0 ${activeScope === 'district' ? '' : 'hidden'}">
                        <span class="hidden sm:inline text-xs font-bold text-slate-400 shrink-0">Rajonas:</span>
                        <select id="league-district-select" class="h-9 sm:h-10 bg-tractorBg border border-tractorBorder focus:border-tractorPrimary rounded-xl px-2 sm:px-3 text-xs font-bold text-white outline-none cursor-pointer w-32 sm:w-48 truncate">
                            ${districtOptionsHtml}
                        </select>
                    </div>
                </div>

                <!-- KULTŪRŲ PERJUNGIKLIS -->
                <div class="pt-2 border-t border-tractorBorder/60 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                    <button type="button" class="btn-crop-tab flex-1 min-w-[110px] py-2 px-3 rounded-xl text-xs font-bold transition cursor-pointer flex items-center justify-center gap-2 ${activeCrop === 'wheat' ? 'bg-tractorPrimary text-white shadow-md' : 'bg-tractorBg border border-tractorBorder text-slate-400 hover:text-white'}" data-crop="wheat">
                        <span>🌾</span> <span>Kviečiai</span>
                    </button>
                    <button type="button" class="btn-crop-tab flex-1 min-w-[110px] py-2 px-3 rounded-xl text-xs font-bold transition cursor-pointer flex items-center justify-center gap-2 ${activeCrop === 'rape' ? 'bg-tractorPrimary text-white shadow-md' : 'bg-tractorBg border border-tractorBorder text-slate-400 hover:text-white'}" data-crop="rape">
                        <span>🌱</span> <span>Rapsai</span>
                    </button>
                    ${!isAutumn ? `
                    <button type="button" class="btn-crop-tab flex-1 min-w-[110px] py-2 px-3 rounded-xl text-xs font-bold transition cursor-pointer flex items-center justify-center gap-2 ${activeCrop === 'peas' ? 'bg-tractorPrimary text-white shadow-md' : 'bg-tractorBg border border-tractorBorder text-slate-400 hover:text-white'}" data-crop="peas">
                        <span>🫘</span> <span>Pupos / Žirniai</span>
                    </button>
                    ` : ''}
                </div>

            </div>

            <!-- PAGRINDINIS LYDERIŲ BLOKAS -->
            <div class="bg-tractorSurface border border-tractorBorder rounded-2xl p-3.5 sm:p-5 md:p-6 shadow-xl space-y-3.5">
                <div class="border-b border-tractorBorder/70 pb-2.5 flex items-center justify-between">
                    <div class="flex items-center gap-2">
                        <span class="text-xl sm:text-2xl" id="active-crop-header-icon">🌾</span>
                        <div>
                            <h3 class="font-oswald text-base sm:text-xl font-bold uppercase tracking-wider text-white" id="active-crop-header-title">
                                TOP 10 Kviečių Laukai
                            </h3>
                            <span class="text-xs text-slate-400" id="active-crop-header-sub">
                                Žieminiai kviečiai
                            </span>
                        </div>
                    </div>
                </div>

                <div id="league-active-crop-container" class="space-y-3">
                    ${getLoadingHtml()}
                </div>
            </div>

        </div>

        <!-- BOTTOM SHEET: KAIP SKAIČIUOJAMAS BALAS -->
        <div id="league-rules-modal" class="fixed inset-0 bg-black/80 z-[9999] hidden flex flex-col justify-end items-center p-0 backdrop-blur-sm transition-opacity duration-300">
            <div id="league-rules-panel" class="bg-tractorSurface border-t-2 border-x-2 border-b-0 border-tractorBorder rounded-t-3xl rounded-b-none p-5 sm:p-7 pb-10 max-w-2xl w-full space-y-4 shadow-2xl relative max-h-[90vh] overflow-y-auto mb-0 transform translate-y-full transition-transform duration-300">
                
                <div class="flex justify-between items-center border-b border-tractorBorder/70 pb-3">
                    <div class="flex items-center gap-2">
                        <span class="text-xl">⚖️</span>
                        <h3 class="font-oswald text-base sm:text-lg font-bold uppercase tracking-wider text-white">
                            Kaip Skaičiuojamas Lygos Balas?
                        </h3>
                    </div>
                    <button type="button" id="btn-close-league-rules" class="text-slate-400 hover:text-white text-2xl font-bold cursor-pointer p-1 leading-none transition">&times;</button>
                </div>

                <div class="space-y-4 pt-1 text-xs">
                    
                    <div class="p-3.5 bg-tractorBg rounded-2xl border border-tractorBorder space-y-2">
                        <div class="flex items-center gap-2 text-tractorPrimaryLight font-bold uppercase text-xs">
                            <span>🌿</span> <span>„Aukso vidurio“ taisyklė (Kodėl didesnis NDVI nereiškia 100 balų?)</span>
                        </div>
                        <p class="text-slate-300 leading-relaxed text-xs">
                            Agronomijoje <strong>peraugęs pasėlis žiemą yra pavojus</strong>. Jei laukas rudenį per daug suveši, rapsų augimo kūgelis ištįsta į viršų ir nušąla, o kviečiai po sniegu uždūsta nuo <strong>sniego pelėsio</strong>. Todėl laimi ne džiunglių tankumas, o optimaliai žiemojimui pasiruošęs pasėlis!
                        </p>
                    </div>

                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div class="p-3 bg-tractorBg rounded-xl border border-green-500/40 space-y-1.5">
                            <div class="flex justify-between items-center">
                                <strong class="text-green-400 font-bold text-xs flex items-center gap-1">
                                    <span>🌾</span> Žieminiai Kviečiai
                                </strong>
                                <span class="font-mono font-black text-xs text-green-400 bg-green-500/20 px-2 py-0.5 rounded">Idealu: 0.60 NDVI</span>
                            </div>
                            <p class="text-xs text-slate-300 leading-normal">
                                • <strong>NDVI = 0.60:</strong> Maksimalus 100.00 balų įvertinimas.<br>
                                • <strong>Viršijus 0.60:</strong> Balas <strong>mažėja</strong> (dėl peraugimo ir sniego pelėsio grėsmės).<br>
                                • <strong>Žemiau 0.60:</strong> Balas mažėja (dėl per reto sudygimo).
                            </p>
                        </div>

                        <div class="p-3 bg-tractorBg rounded-xl border border-amber-500/40 space-y-1.5">
                            <div class="flex justify-between items-center">
                                <strong class="text-amber-400 font-bold text-xs flex items-center gap-1">
                                    <span>🌱</span> Žieminiai Rapsai
                                </strong>
                                <span class="font-mono font-black text-xs text-amber-400 bg-amber-500/20 px-2 py-0.5 rounded">Idealu: 0.80 NDVI</span>
                            </div>
                            <p class="text-xs text-slate-300 leading-normal">
                                • <strong>NDVI = 0.80:</strong> Maksimalus 100.00 balų įvertinimas.<br>
                                • <strong>Viršijus 0.80:</strong> Balas <strong>mažėja</strong> (dėl ištįsusio augimo kūgelio rizikos).<br>
                                • <strong>Žemiau 0.80:</strong> Balas mažėja (dėl neišsivysčiusios lapų rozetės).
                            </p>
                        </div>
                    </div>

                    <div class="p-3 bg-tractorBg rounded-xl border border-tractorBorder space-y-1 text-xs">
                        <span class="text-slate-400 block font-bold">📐 Tiksli baudos formulė:</span>
                        <div class="font-mono font-bold text-white bg-tractorSurface p-2 rounded-lg border border-tractorBorder/70">
                            Balas = 100 - (|Esamas NDVI - Idealus NDVI| × 150)
                        </div>
                        <span class="text-slate-400 block text-xs pt-0.5">
                            👉 Už kiekvieną <strong>0.01</strong> nuokrypį (į viršų ar į apačią) atimama po <strong>1.5 balo</strong>.
                        </span>
                    </div>

                    <div class="p-3.5 bg-myPostBg border-2 border-tractorPrimary rounded-2xl space-y-1.5">
                        <strong class="text-green-400 flex items-center gap-1.5 font-bold text-xs">
                            <span>👑</span> Lygiosios: Laimi didesnis laukas!
                        </strong>
                        <p class="text-slate-200 text-xs leading-relaxed">
                            Jei du ar daugiau laukų surenka <strong>visiškai vienodą balą</strong> (pvz., abu turi 99.70), aukštesnę vietą automatiškai užima <strong>didesnis laukas (ha)</strong>. Išlaikyti tolygiai idealų pasėlį 50 ha lauke yra žymiai didesnis agronominis pasiekimas nei 3 ha sklypelyje.
                        </p>
                    </div>

                </div>

                <div class="pt-2">
                    <button type="button" id="btn-ack-league-rules" class="w-full h-11 bg-tractorPrimary hover:bg-tractorPrimaryHover text-white font-extrabold rounded-xl text-xs uppercase tracking-wider shadow transition cursor-pointer flex items-center justify-center">
                        Supratau 👍
                    </button>
                </div>

            </div>
        </div>
    `;

    setupLeagueEvents();
    setupRulesModalEvents();
}

function getLoadingHtml() {
    return `
        <div class="py-12 flex flex-col items-center justify-center space-y-3">
            <span class="text-3xl animate-bounce">🚜</span>
            <p class="text-xs font-bold text-slate-400 uppercase tracking-wider animate-pulse">Kraunamas derbis...</p>
        </div>
    `;
}

function setupRulesModalEvents() {
    const modal = document.getElementById('league-rules-modal');
    const panel = document.getElementById('league-rules-panel');
    const openBtn = document.getElementById('btn-open-league-rules');
    const closeBtn = document.getElementById('btn-close-league-rules');
    const ackBtn = document.getElementById('btn-ack-league-rules');

    const openModal = () => {
        modal?.classList.remove('hidden');
        setTimeout(() => panel?.classList.remove('translate-y-full'), 15);
    };

    const closeModal = () => {
        panel?.classList.add('translate-y-full');
        setTimeout(() => modal?.classList.add('hidden'), 250);
    };

    if (openBtn) openBtn.onclick = openModal;
    if (closeBtn) closeBtn.onclick = closeModal;
    if (ackBtn) ackBtn.onclick = closeModal;
    if (modal) {
        modal.onclick = (e) => {
            if (e.target === modal) closeModal();
        };
    }
}

function setupLeagueEvents() {
    const btnDistrict = document.getElementById('btn-scope-district');
    const btnNational = document.getElementById('btn-scope-national');
    const districtBox = document.getElementById('district-selector-box');
    const districtSelect = document.getElementById('league-district-select');

    if (btnDistrict && btnNational) {
        btnDistrict.onclick = () => {
            activeScope = 'district';
            btnDistrict.className = "px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer bg-tractorPrimary text-white shadow";
            btnNational.className = "px-2 sm:px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer text-slate-400 hover:text-white";
            districtBox?.classList.remove('hidden');
            fetchLeaderboard();
        };

        btnNational.onclick = () => {
            activeScope = 'national';
            btnNational.className = "px-2 sm:px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer bg-tractorPrimary text-white shadow";
            btnDistrict.className = "px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer text-slate-400 hover:text-white";
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

    document.querySelectorAll('.btn-crop-tab').forEach(btn => {
        btn.onclick = () => {
            const crop = btn.getAttribute('data-crop');
            if (activeCrop === crop) return;
            activeCrop = crop;

            document.querySelectorAll('.btn-crop-tab').forEach(b => {
                b.className = "btn-crop-tab flex-1 min-w-[110px] py-2 px-3 rounded-xl text-xs font-bold transition cursor-pointer flex items-center justify-center gap-2 bg-tractorBg border border-tractorBorder text-slate-400 hover:text-white";
            });
            btn.className = "btn-crop-tab flex-1 min-w-[110px] py-2 px-3 rounded-xl text-xs font-bold transition cursor-pointer flex items-center justify-center gap-2 bg-tractorPrimary text-white shadow-md";

            renderActiveCategory();
        };
    });
}

async function fetchLeaderboard() {
    const myUid = cachedCurrentUser ? cachedCurrentUser.uid : '';
    const cacheKey = `${activeScope}_${activeScope === 'district' ? currentDistrict : 'national'}`;

    if (districtCache[cacheKey]) {
        cachedLeagueData = districtCache[cacheKey];
        renderActiveCategory();
        return;
    }

    showLoadingIndicator();

    const url = `https://us-central1-neighborpm-b9968.cloudfunctions.net/getLeagueLeaderboard?scope=${activeScope}&district=${encodeURIComponent(currentDistrict)}&userId=${myUid}`;

    try {
        const res = await fetch(url);
        cachedLeagueData = await res.json();
        districtCache[cacheKey] = cachedLeagueData;
        renderActiveCategory();
    } catch (err) {
        console.error("Lygos krovimo klaida:", err);
    }
}

function showLoadingIndicator() {
    const el = document.getElementById('league-active-crop-container');
    if (el) el.innerHTML = getLoadingHtml();
}

function renderActiveCategory() {
    if (!cachedLeagueData) return;

    const iconEl = document.getElementById('active-crop-header-icon');
    const titleEl = document.getElementById('active-crop-header-title');
    const subEl = document.getElementById('active-crop-header-sub');
    const scopeLabel = activeScope === 'district' ? currentDistrict : 'Lietuvos TOP 10';

    if (activeCrop === 'wheat') {
        if (iconEl) iconEl.textContent = '🌾';
        if (titleEl) titleEl.textContent = `TOP 10 Kviečių Laukai (${scopeLabel})`;
        if (subEl) subEl.textContent = isAutumnSeason() ? 'Žieminiai kviečiai (Idealu: 0.60 NDVI)' : 'Žieminiai ir vasariniai kviečiai';
        renderCategoryData(cachedLeagueData.wheat);
    } else if (activeCrop === 'rape') {
        if (iconEl) iconEl.textContent = '🌱';
        if (titleEl) titleEl.textContent = `TOP 10 Rapsų Laukai (${scopeLabel})`;
        if (subEl) subEl.textContent = isAutumnSeason() ? 'Žieminiai rapsai (Idealu: 0.80 NDVI)' : 'Žieminiai ir vasariniai rapsai';
        renderCategoryData(cachedLeagueData.rape);
    } else if (activeCrop === 'peas') {
        if (iconEl) iconEl.textContent = '🫘';
        if (titleEl) titleEl.textContent = `TOP 10 Pupų ir Žirnių Laukai (${scopeLabel})`;
        if (subEl) subEl.textContent = 'Baltyminiai augalai (pupos, žirniai)';
        renderCategoryData(cachedLeagueData.peas);
    }
}

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

function renderCategoryData(catData) {
    const box = document.getElementById('league-active-crop-container');
    if (!box || !catData) return;

    const list = catData.top10 || [];

    if (list.length === 0) {
        box.innerHTML = `
            <div class="py-12 text-center text-slate-500 text-xs font-medium">
                ${activeScope === 'district' ? `Šiame rajone dar nėra dalyvaujančių šios kultūros sklypų.` : `Laukų nerasta.`}
            </div>
        `;
        return;
    }

    const top3 = list.slice(0, 3);
    const rest = list.slice(3);

    // 1. TOP 3 PJEDESTALAS
    let podiumHtml = '';
    if (top3.length > 0) {
        const p1 = top3[0];
        const p2 = top3[1] || null;
        const p3 = top3[2] || null;

        const renderPodiumCard = (f, rank, isCenter = false, animDelayMs = 200) => {
            if (!f) {
                return `<div class="bg-tractorBg/40 border border-tractorBorder/40 rounded-xl p-2 opacity-30 flex items-center justify-center text-xs text-slate-500">Laisva</div>`;
            }

            const isGold = rank === 1;
            const isSilver = rank === 2;

            const medalEmoji = isGold 
                ? `<span class="text-3xl sm:text-4xl animate-medal-gold">🥇</span>` 
                : (isSilver 
                    ? `<span class="text-2xl sm:text-3xl animate-medal-silver">🥈</span>` 
                    : `<span class="text-2xl sm:text-3xl animate-medal-bronze">🥉</span>`);

            const borderCol = isGold 
                ? "border-amber-500/80 gold-glow bg-amber-500/10 dark:bg-amber-500/15" 
                : (isSilver 
                    ? "border-slate-400/80 bg-slate-200/50 dark:bg-slate-400/10" 
                    : "border-amber-700/80 bg-amber-800/10 dark:bg-amber-900/15");

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
            const myBadge = f.isMine ? `<span class="bg-tractorPrimary text-white text-xs px-2 py-0.5 rounded-full font-black uppercase" style="color: #FFFFFF !important;">Jūs</span>` : '';
            const scorePercent = Math.min(100, Math.max(10, Math.round(f.score)));

            return `
                <div class="animate-league-item relative p-3.5 sm:p-4 rounded-2xl border-2 ${borderCol} flex flex-col justify-between text-center transition-all ${isCenter ? 'sm:-translate-y-3 sm:pb-5' : ''}" style="animation-delay: ${animDelayMs}ms;">
                    <div class="space-y-1.5">
                        
                        <div class="flex items-center justify-center pt-0.5">
                            ${medalEmoji}
                        </div>

                        <div class="flex items-center justify-center gap-1">
                            <span class="inline-block px-3 py-0.5 rounded-full text-xs font-black uppercase tracking-wider font-oswald shadow-sm" style="${rankBadgeStyle}">
                                #${rank} VIETA
                            </span>
                            ${myBadge}
                        </div>

                        <div class="font-extrabold text-sm sm:text-base truncate pt-1 tracking-wide" title="${displayName}" style="color: var(--text-main);">
                            ${displayName}
                        </div>

                        <div class="text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 text-slate-800 dark:text-slate-200 font-mono pt-0.5">
                            <span class="font-bold">${f.areaHa} ha</span>
                            <span class="text-slate-400 font-normal">•</span>
                            <span class="text-slate-700 dark:text-slate-300">🛰️ ${f.satDate || '10-03'}</span>
                        </div>
                    </div>

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

        podiumHtml = `
            <div class="grid grid-cols-3 gap-2 sm:gap-4 items-end pt-2 pb-3">
                ${renderPodiumCard(p2, 2, false, 200)}
                ${renderPodiumCard(p1, 1, true, 400)}
                ${renderPodiumCard(p3, 3, false, 600)}
            </div>
        `;
    }

    // 2. LIKUSIŲ (#4–#10) KORTELIŲ KŪRIMAS
    let rowsHtml = rest.map((f, i) => {
        const animDelay = 750 + (i * 130);
        const displayName = f.isMine ? f.name : maskFieldId(f.fieldId);
        const myBadge = f.isMine ? `<span class="ml-1 bg-tractorPrimary text-white text-xs px-2 py-0.5 rounded-full font-black uppercase" style="color: #FFFFFF !important;">Jūs</span>` : '';
        const scorePercent = Math.min(100, Math.max(10, Math.round(f.score)));

        let scoreBg = "#15803D";
        if (f.score < 50) scoreBg = "#DC2626";
        else if (f.score < 75) scoreBg = "#D97706";

        return `
            <div class="animate-league-item p-3 sm:p-3.5 rounded-xl border transition-all cursor-pointer select-none flex items-center justify-between gap-3 ${
                f.isMine 
                ? 'bg-tractorPrimary/15 border-2 border-tractorPrimary ring-1 ring-tractorPrimary shadow-md' 
                : 'bg-tractorBg border-tractorBorder hover:border-slate-500 hover:bg-tractorSurface'
            }" style="animation-delay: ${animDelay}ms;">
                
                <div class="flex items-center gap-3 min-w-0 flex-1">
                    <span class="font-mono font-black text-sm sm:text-base w-8 text-center shrink-0 text-slate-700 dark:text-slate-300">#${f.rank}</span>
                    <div class="min-w-0 flex-1 space-y-1">
                        <div class="flex items-center gap-2 flex-wrap">
                            <span class="font-extrabold text-sm sm:text-base truncate tracking-wide" style="color: var(--text-main);">${displayName}</span>
                            ${myBadge}
                        </div>
                        
                        <div class="flex items-center gap-2 text-xs sm:text-sm font-mono font-semibold text-slate-800 dark:text-slate-200">
                            <span class="font-bold">${f.areaHa} ha</span>
                            <span class="text-slate-400 font-normal">•</span>
                            <span class="text-slate-700 dark:text-slate-300">🛰️ ${f.satDate || '10-03'}</span>
                        </div>
                    </div>
                </div>

                <div class="flex items-center gap-3 sm:gap-4 shrink-0">
                    <div class="hidden sm:flex flex-col items-end w-24 space-y-1">
                        <span class="text-[10px] uppercase font-bold tracking-wider text-slate-500 dark:text-slate-400">Biomasė</span>
                        <div class="w-full bg-tractorSurface h-1.5 rounded-full overflow-hidden border border-tractorBorder/70">
                            <div class="h-full rounded-full" style="width: ${scorePercent}%; background-color: ${scoreBg};"></div>
                        </div>
                    </div>

                    <span class="font-mono font-black text-sm sm:text-base px-3 py-1.5 rounded-xl shadow min-w-[62px] text-center" 
                          style="background-color: ${scoreBg} !important; color: #FFFFFF !important; text-shadow: 0 1px 2px rgba(0,0,0,0.5);">
                        ${f.score.toFixed(2)}
                    </span>
                </div>

            </div>
        `;
    }).join('');

    // 3. PRISEGTAS JŪSŲ LAUKAS
    let myPinnedRowHtml = '';
    const myRanks = catData.myPersonalRanks || (catData.myPersonalRank ? [catData.myPersonalRank] : []);

    if (myRanks.length > 0) {
        const thirdPlaceScore = top3[2] ? top3[2].score : (top3[0] ? top3[0].score : 80);
        const pinnedDelay = 750 + (rest.length * 130) + 150;

        myPinnedRowHtml = `
            <div class="py-1 text-center text-slate-400 text-sm font-mono tracking-widest font-bold">
                • • •
            </div>
        ` + myRanks.map(m => {
            const gap = (thirdPlaceScore - m.score).toFixed(2);
            const scorePercent = Math.min(100, Math.max(10, Math.round(m.score)));
            const scoreBg = m.score >= 75 ? "#15803D" : (m.score < 50 ? "#DC2626" : "#D97706");

            return `
                <div class="animate-league-item p-3.5 sm:p-4 rounded-2xl border-2 border-tractorPrimary bg-tractorPrimary/20 shadow-xl flex items-center justify-between gap-3 text-xs" style="animation-delay: ${pinnedDelay}ms;">
                    <div class="flex items-center gap-3 min-w-0 flex-1">
                        <span class="font-mono font-black text-base text-green-700 dark:text-tractorPrimaryLight w-8 text-center shrink-0">#${m.rank}</span>
                        <div class="min-w-0 flex-1 space-y-1">
                            <div class="flex items-center gap-2">
                                <strong class="font-bold text-sm sm:text-base truncate" style="color: var(--text-main);">${m.name}</strong>
                                <span class="bg-tractorPrimary text-white text-xs px-2 py-0.5 rounded-full font-black uppercase tracking-wider" style="color: #FFFFFF !important;">Jūs</span>
                            </div>
                            <div class="flex items-center gap-2 text-xs sm:text-sm font-mono font-bold text-slate-800 dark:text-slate-200">
                                <span>${m.areaHa} ha</span>
                                <span class="text-slate-400 font-normal">•</span>
                                <span class="text-slate-700 dark:text-slate-300">🛰️ ${m.satDate || '10-03'}</span>
                                ${gap > 0 ? `<span class="text-amber-600 dark:text-amber-400 font-extrabold">(Iki TOP 3: -${gap} balo)</span>` : ''}
                            </div>
                        </div>
                    </div>

                    <div class="flex items-center gap-3 sm:gap-4 shrink-0">
                        <div class="hidden sm:flex flex-col items-end w-24 space-y-1">
                            <span class="text-[10px] uppercase font-bold text-green-700 dark:text-tractorPrimaryLight">Biomasė</span>
                            <div class="w-full bg-tractorBg h-1.5 rounded-full overflow-hidden border border-tractorBorder">
                                <div class="h-full rounded-full" style="width: ${scorePercent}%; background-color: ${scoreBg};"></div>
                            </div>
                        </div>

                        <span class="font-mono font-black text-sm sm:text-base px-3 py-1.5 rounded-xl shadow-md min-w-[62px] text-center" 
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