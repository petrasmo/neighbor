// js/skaiciuokles/grain.js
import { db } from '../core/firebase.js';
import { calculateDist, calculateBuyerRanking } from './grainCalculator.js';
import { createCustomSelect } from '../core/customSelect.js';
import { openAuthModal } from '../core/auth.js';
import { showBottomToast, switchTab } from '../core/ui.js';
import { refreshSettingsMap } from '../sistema/settings.js';

let activeMarketData = [];
let unsubscribeGrain = null;
let userGarageCoords = null;
let currentCoords = null;
let userFieldsList = [];
let lastUpdatedTimeFormatted = null;
let lastCalculatedRankedList = [];

const state = {
    viewMode: 'ranked',
    crop: 'rapeseed',
    weight: 25.0,
    moisture: 17.5,
    impurities: 3.5,
    includeTransport: true,
    transportRatePerTonKm: 0.10
};

const cropItems = [
    { id: 'rapeseed', name: 'Rapsai', icon: '🌱', subtext: 'Žieminiai / Vasariniai' },
    { id: 'wheat2', name: 'Kviečiai (II klasė)', icon: '🌾', subtext: 'Maistiniai' },
    { id: 'wheatExtra', name: 'Kviečiai (Ekstra)', icon: '🌾', subtext: 'Aukščiausia kokybė' },
    { id: 'wheatFeed', name: 'Kviečiai (Pašariniai)', icon: '🌾', subtext: 'Pašarams' },
    { id: 'barley', name: 'Miežiai', icon: '🌾', subtext: 'Salykliniai / Pašariniai' },
    { id: 'peas', name: 'Žirniai / Pupos', icon: '🫘', subtext: 'Baltyminiai augalai' }
];

function navigateToSettings() {
    if (typeof switchTab === 'function' && document.getElementById('view-tab-settings')) {
        switchTab(9);
        if (typeof refreshSettingsMap === 'function') refreshSettingsMap();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
        window.location.href = 'index.html?tab=9';
    }
}

export function initGrainTab(currentUser, userData) {
    const container = document.getElementById('view-tab-grain') || document.getElementById('grain-calc-content');
    if (!container) return;

    const isLogged = !!currentUser;
    const hasGarage = !!(userData?.garageLat && userData?.garageLon && userData.garageLat !== 0);

    if (hasGarage) {
        userGarageCoords = { 
            lat: parseFloat(userData.garageLat), 
            lng: parseFloat(userData.garageLon),
            sourceText: "ūkio bazės (garažo)"
        };
        currentCoords = userGarageCoords;
    } else {
        userGarageCoords = null;
    }

    container.innerHTML = `
        <div class="space-y-4 max-w-6xl mx-auto w-full">
            
            <div class="bg-tractorSurface border border-tractorBorder rounded-2xl p-3.5 sm:p-5 md:p-6 space-y-3.5 shadow-xl">
                
                <!-- HEADERIS (MINIMALUS IR GLOTNUS) -->
                <div class="border-b border-tractorBorder/70 pb-2.5 space-y-0.5">
                    <h2 class="font-oswald text-lg sm:text-xl md:text-2xl font-bold uppercase tracking-wider text-white flex items-center gap-2">
                        <span>🌾</span> Grūdų Supirkimo Kainos ir Skaičiuoklė
                    </h2>
                    <p class="text-[11px] sm:text-xs text-slate-300" id="location-status-text">
                        📍 Nustatoma atstumų skaičiavimo vieta...
                    </p>
                </div>

                <!-- BANERIS NEPRISIJUNGUSIEMS ARBA BE ŪKIO BAZĖS -->
                ${!isLogged || !hasGarage ? `
                    <div class="p-3 bg-tractorBg border border-tractorPrimary rounded-xl shadow-sm">
                        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                            <div class="text-[11px] sm:text-xs text-slate-200">
                                <strong class="text-green-400 block sm:inline">Norite 100% tikslių skaičiavimų?</strong>
                                <span> Pažymėkite ūkio bazę Nustatymuose, kad visi atstumai skaičiuotųsi automatiškai.</span>
                            </div>
                            <button type="button" id="btn-grain-farm-prompt" class="px-3.5 py-1.5 bg-tractorPrimary hover:bg-tractorPrimaryHover text-white font-black rounded-lg text-xs uppercase tracking-wider shrink-0 transition cursor-pointer">
                                ${!isLogged ? '🔑 Prisijungti' : '📍 Nurodyti kiemą ➔'}
                            </button>
                        </div>
                    </div>
                ` : ''}

                <!-- 🌟 1 PUNKTAS: VIETA IR GPS MYGTUKAS VIENOJE EILUTĖJE -->
                <div class="space-y-1">
                    <label class="text-[10px] sm:text-[11px] font-bold text-tractorPrimaryLight uppercase tracking-wider block">
                        📍 Skaičiuoti atstumą nuo:
                    </label>
                    <div class="flex items-center gap-2">
                        <div id="grain-field-select-box" class="flex-1 min-w-0"></div>
                        <button type="button" id="btn-loc-gps" class="h-12 px-3.5 bg-tractorBg hover:bg-zinc-800 border border-tractorBorder hover:border-tractorPrimary rounded-xl text-xs font-bold text-slate-200 flex items-center justify-center gap-1.5 shadow transition cursor-pointer shrink-0" title="Nustatyti dabartinę GPS vietą">
                            <span>📡</span> <span class="font-bold">GPS</span>
                        </button>
                    </div>
                </div>

                <!-- 2x2 KROVINIO PARAMETRŲ TINKLELIS -->
                <div class="space-y-1">
                    <label class="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                        Krovinio duomenys:
                    </label>
                    <div class="grid grid-cols-2 md:grid-cols-4 gap-2.5">
                        <div class="space-y-1">
                            <label class="text-[10px] font-bold text-tractorPrimaryLight uppercase block truncate">Kultūra</label>
                            <div id="grain-crop-select-box"></div>
                        </div>

                        <div class="space-y-1">
                            <label class="text-[10px] font-bold text-slate-300 uppercase block truncate">Svoris (t)</label>
                            <input id="opt-weight" type="number" step="0.5" value="${state.weight}" 
                                class="w-full h-12 bg-tractorBg border border-tractorBorder focus:border-tractorPrimary rounded-xl px-3 text-xs sm:text-sm text-white font-bold outline-none font-mono">
                        </div>

                        <div class="space-y-1">
                            <label class="text-[10px] font-bold text-slate-300 uppercase block truncate">Drėgmė (%)</label>
                            <input id="opt-moisture" type="number" step="0.1" value="${state.moisture}" 
                                class="w-full h-12 bg-tractorBg border border-tractorBorder focus:border-tractorPrimary rounded-xl px-3 text-xs sm:text-sm text-white font-bold outline-none font-mono">
                        </div>

                        <div class="space-y-1">
                            <label class="text-[10px] font-bold text-slate-300 uppercase block truncate">Šiukšlės (%)</label>
                            <input id="opt-impurities" type="number" step="0.1" value="${state.impurities}" 
                                class="w-full h-12 bg-tractorBg border border-tractorBorder focus:border-tractorPrimary rounded-xl px-3 text-xs sm:text-sm text-white font-bold outline-none font-mono">
                        </div>
                    </div>
                </div>

                <!-- 🌟 3 PUNKTAS: TRANSPORTO VARNELĖ ŠALIA REŽIMŲ PERJUNGIKLIO -->
                <div class="flex flex-nowrap items-center justify-between gap-1.5 sm:gap-2 pt-2 border-t border-tractorBorder/60 text-xs">
					<!-- 2 REŽIMŲ MYGTUKAI -->
					<div class="flex bg-tractorBg p-1 rounded-xl border border-tractorBorder shrink-0">
						<button id="btn-mode-ranked" class="px-2.5 sm:px-3 py-1.5 text-[11px] sm:text-xs font-bold rounded-lg transition flex items-center gap-1 cursor-pointer ${state.viewMode === 'ranked' ? 'bg-tractorPrimary text-white shadow' : 'text-slate-300 hover:text-white'}">
							<span>🥇</span> <span>Apsimoka<span class="hidden sm:inline">&nbsp;vežti?</span></span>
						</button>
						<button id="btn-mode-table" class="px-2 sm:px-3 py-1.5 text-[11px] sm:text-xs font-bold rounded-lg transition flex items-center gap-1 cursor-pointer ${state.viewMode === 'table' ? 'bg-tractorPrimary text-white shadow' : 'text-slate-300 hover:text-white'}">
							<span>🏢</span> <span>Visi<span class="hidden sm:inline">&nbsp;elevatoriai</span></span>
						</button>
					</div>

					<!-- TRANSPORTO VARNELĖ (TAIP PAT TELPA Į TĄ PAČIĄ EILUTĘ) -->
					<label class="flex items-center gap-1.5 cursor-pointer text-[11px] sm:text-xs font-bold text-white select-none bg-tractorBg px-2.5 sm:px-3 py-1.5 rounded-xl border border-tractorBorder hover:border-tractorPrimary transition shrink-0">
						<input type="checkbox" id="opt-transport-toggle" class="accent-tractorPrimary w-3.5 h-3.5 sm:w-4 sm:h-4 cursor-pointer" ${state.includeTransport ? 'checked' : ''}>
						<span>Transportas<span class="hidden md:inline">&nbsp;(~0.10 €/t/km)</span></span>
					</label>
				</div>

            </div>

            <!-- REZULTATŲ SĄRAŠAS (1 REŽIMAS: PELNINGIAUSI) -->
            <div id="view-ranked-container" class="space-y-2.5 ${state.viewMode === 'ranked' ? '' : 'hidden'}">
                <div class="flex items-center justify-between px-1">
                    <h3 class="font-oswald text-base sm:text-lg font-bold uppercase tracking-wider text-white">
                        Pelningiausi elevatoriai (<span id="selected-crop-label" class="text-tractorPrimaryLight">🌱 Rapsai</span>)
                    </h3>
                    <span class="text-[10px] sm:text-[11px] text-slate-400">Spauskite kortelę išsamiai analizei</span>
                </div>
                <!-- 🌟 KOMPAKTIŠKŲ KORTELIŲ SĄRAŠAS -->
                <div id="ranked-buyers-list" class="space-y-2"></div>
            </div>

            <!-- REZULTATŲ SĄRAŠAS (2 REŽIMAS: PAGAL ATSTUMĄ) -->
            <div id="view-table-container" class="space-y-3 ${state.viewMode === 'table' ? '' : 'hidden'}">
                <div id="elevators-cards-grid" class="grid grid-cols-1 md:grid-cols-2 gap-3"></div>
            </div>

        </div>

        <!-- 🌟 2 PUNKTAS: TIKRAS PROJEKTO STANDARTO BOTTOM SHEET ELEVATORIAUS DETALĖMS -->
        <div id="grain-elevator-sheet" class="fixed inset-0 bg-black/80 z-[9999] hidden flex flex-col justify-end items-center p-0 backdrop-blur-sm transition-opacity duration-300">
            <div id="grain-elevator-panel" class="bg-tractorSurface border-t-2 border-x-2 border-b-0 border-tractorBorder rounded-t-3xl rounded-b-none p-5 sm:p-7 pb-10 max-w-xl w-full space-y-4 shadow-2xl relative max-h-[90vh] overflow-y-auto mb-0 transform translate-y-full transition-transform duration-300">
                
                <div class="flex justify-between items-center border-b border-tractorBorder/70 pb-3">
                    <div class="space-y-0.5 min-w-0 pr-2">
                        <div class="flex items-center gap-2">
                            <span id="sheet-buyer-rank-badge" class="bg-tractorPrimary text-white text-[10px] font-black px-2 py-0.5 rounded-full uppercase">1 VIETA</span>
                            <h3 id="sheet-buyer-name" class="font-oswald text-base sm:text-lg font-bold uppercase tracking-wider text-white truncate">
                                Elevatorius
                            </h3>
                        </div>
                        <p id="sheet-buyer-address" class="text-xs text-slate-400 truncate">Adresas</p>
                    </div>
                    <button type="button" id="btn-close-grain-sheet" class="text-slate-400 hover:text-white text-2xl font-bold cursor-pointer p-1 leading-none transition">&times;</button>
                </div>

                <div id="grain-sheet-content" class="space-y-3.5 pt-1"></div>

                <div class="pt-2">
                    <button type="button" id="btn-ack-grain-sheet" class="w-full h-11 bg-tractorPrimary hover:bg-tractorPrimaryHover text-white font-extrabold rounded-xl text-xs uppercase tracking-wider shadow transition cursor-pointer flex items-center justify-center">
                        Supratau 👍
                    </button>
                </div>

            </div>
        </div>
    `;

    const btnPrompt = document.getElementById('btn-grain-farm-prompt');
    if (btnPrompt) {
        btnPrompt.onclick = () => {
            if (!isLogged) openAuthModal('login');
            else navigateToSettings();
        };
    }

    createCustomSelect({
        containerId: 'grain-crop-select-box',
        placeholder: 'Kultūra...',
        items: cropItems,
        selectedId: state.crop,
        onSelect: (item) => {
            if (item) {
                state.crop = item.id;
                document.getElementById('selected-crop-label').textContent = `${item.icon} ${item.name}`;
                renderRankedBuyers();
            }
        }
    });

    loadUserFieldsSelect(currentUser, userData);

    document.getElementById('btn-loc-gps')?.addEventListener('click', () => {
        if (navigator.geolocation) {
            const btn = document.getElementById('btn-loc-gps');
            btn.innerHTML = "<span>📡</span> <span>...</span>";
            navigator.geolocation.getCurrentPosition((pos) => {
                currentCoords = {
                    lat: pos.coords.latitude,
                    lng: pos.coords.longitude,
                    sourceText: "tikslios GPS vietos"
                };
                btn.innerHTML = "<span>✅</span> <span>GPS</span>";
                updateLocationText();
                renderRankedBuyers();
                renderElevatorsCards();
                showBottomToast("Tiksli GPS vieta nustatyta! 📍");
            }, () => {
                btn.innerHTML = "<span>📡</span> <span>GPS</span>";
                showBottomToast("Nepavyko nustatyti GPS vietos.", "error");
            });
        }
    });

    const btnRanked = document.getElementById('btn-mode-ranked');
    const btnTable = document.getElementById('btn-mode-table');
    const rankedView = document.getElementById('view-ranked-container');
    const tableView = document.getElementById('view-table-container');

    btnRanked.onclick = () => {
        state.viewMode = 'ranked';
        btnRanked.className = "px-3 py-1.5 text-xs font-bold rounded-lg transition flex items-center gap-1.5 bg-tractorPrimary text-white shadow";
        btnTable.className = "px-3 py-1.5 text-xs font-bold rounded-lg transition flex items-center gap-1.5 text-slate-300 hover:text-white";
        rankedView.classList.remove('hidden');
        tableView.classList.add('hidden');
        renderRankedBuyers();
    };

    btnTable.onclick = () => {
        state.viewMode = 'table';
        btnTable.className = "px-3 py-1.5 text-xs font-bold rounded-lg transition flex items-center gap-1.5 bg-tractorPrimary text-white shadow";
        btnRanked.className = "px-3 py-1.5 text-xs font-bold rounded-lg transition flex items-center gap-1.5 text-slate-300 hover:text-white";
        tableView.classList.remove('hidden');
        rankedView.classList.add('hidden');
        renderElevatorsCards();
    };

    document.getElementById('opt-transport-toggle')?.addEventListener('change', (e) => {
        state.includeTransport = e.target.checked;
        renderRankedBuyers();
    });

    ['opt-weight', 'opt-moisture', 'opt-impurities'].forEach(id => {
        document.getElementById(id)?.addEventListener('input', (e) => {
            if (id === 'opt-weight') state.weight = parseFloat(e.target.value) || 0;
            if (id === 'opt-moisture') state.moisture = parseFloat(e.target.value) || 14;
            if (id === 'opt-impurities') state.impurities = parseFloat(e.target.value) || 2;
            renderRankedBuyers();
        });
    });

    setupGrainSheetEvents();
    resolveLocationChain();
    listenToGrainPrices();
}

function setupGrainSheetEvents() {
    const sheet = document.getElementById('grain-elevator-sheet');
    const panel = document.getElementById('grain-elevator-panel');
    const closeBtn = document.getElementById('btn-close-grain-sheet');
    const ackBtn = document.getElementById('btn-ack-grain-sheet');

    const closeSheet = () => {
        if (panel) panel.classList.add('translate-y-full');
        setTimeout(() => {
            if (sheet) sheet.classList.add('hidden');
        }, 250);
    };

    if (closeBtn) closeBtn.onclick = closeSheet;
    if (ackBtn) ackBtn.onclick = closeSheet;
    if (sheet) {
        sheet.onclick = (e) => {
            if (e.target === sheet) closeSheet();
        };
    }
}

function openElevatorBottomSheet(item, rankIndex) {
    const sheet = document.getElementById('grain-elevator-sheet');
    const panel = document.getElementById('grain-elevator-panel');
    const nameEl = document.getElementById('sheet-buyer-name');
    const rankEl = document.getElementById('sheet-buyer-rank-badge');
    const addressEl = document.getElementById('sheet-buyer-address');
    const contentEl = document.getElementById('grain-sheet-content');

    if (!sheet || !contentEl || !item) return;

    if (nameEl) nameEl.textContent = item.buyer;
    if (rankEl) {
        rankEl.textContent = rankIndex === 0 ? "🥇 1 VIETA" : `#${rankIndex + 1}`;
        rankEl.className = rankIndex === 0 
            ? "bg-tractorPrimary text-white text-[10px] font-black px-2 py-0.5 rounded-full uppercase"
            : "bg-tractorBg border border-tractorBorder text-slate-300 font-mono text-[10px] font-bold px-2 py-0.5 rounded";
    }
    if (addressEl) addressEl.textContent = `📍 ${item.address || ''} • 🚗 ~${item.distKm} km`;

    contentEl.innerHTML = `
        <!-- PAGRINDINIS FINANSINIS VERDIKTAS -->
        <div class="bg-myPostBg border-2 border-tractorPrimary rounded-2xl p-4 text-center space-y-1 shadow-lg">
            <span class="text-[10px] text-slate-300 uppercase font-black tracking-wider block">
                ${state.includeTransport ? 'GALUTINIS PELNAS Į KIŠENĘ (SU TRANSPORTO ĮVERTINIMU)' : 'GRYNASIS IŠMOKĖJIMAS'}
            </span>
            <div class="text-3xl font-black text-green-400 font-mono">
                ${item.finalPocketProfit.toLocaleString('lt-LT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
            </div>
            <div class="text-xs font-bold text-slate-200">
                Faktinė kaina ūkininkui: <strong class="text-green-400 text-sm font-black">${item.effectivePriceWithTransport.toFixed(2)} €/t</strong>
            </div>
        </div>

        <!-- DETALI ELEVATORIAUS PASLAUGŲ SUVESTINĖ -->
        <div class="bg-tractorBg rounded-xl p-3.5 border border-tractorBorder space-y-2 text-xs">
            <div class="flex justify-between items-center border-b border-tractorBorder/60 pb-1.5">
                <span class="text-slate-400">Bazinė supirkimo kaina:</span>
                <strong class="font-mono text-white">${item.basePrice.toFixed(2)} €/t</strong>
            </div>

            <div class="flex justify-between items-center border-b border-tractorBorder/60 pb-1.5">
                <span class="text-slate-400">Džiovinimas / Valymas:</span>
                <strong class="font-mono text-amber-400">${item.dryingCost} €/% • ${item.cleaningCost} €/%</strong>
            </div>

            <div class="flex justify-between items-center border-b border-tractorBorder/60 pb-1.5">
                <span class="text-slate-400">Svorio nuoskaitos:</span>
                <strong class="font-mono text-red-400">-${item.weightLossTons.toFixed(2)} t (-${item.totalElevatorFees.toFixed(2)} €)</strong>
            </div>

            ${state.includeTransport ? `
                <div class="flex justify-between items-center border-b border-tractorBorder/60 pb-1.5">
                    <span class="text-slate-400">Transporto kaštai (${item.distKm} km):</span>
                    <strong class="font-mono text-amber-300">-${item.transportCost.toFixed(2)} €</strong>
                </div>
            ` : ''}

            <div class="flex justify-between items-center pt-0.5 text-slate-300">
                <span>Išmokėjimas elevatoriuje (be transporto):</span>
                <strong class="font-mono text-white font-bold">${item.elevatorPayoutNoTransport.toLocaleString('lt-LT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</strong>
            </div>
        </div>

        <!-- VEIKSMŲ MYGTUKAI: SKAMBUTIS IR GOOGLE MAPS -->
        <div class="flex gap-2.5 pt-1">
            ${item.phone ? `
                <a href="tel:${item.phone}" class="flex-1 py-2.5 bg-tractorBg hover:bg-zinc-800 border border-tractorBorder rounded-xl text-xs font-bold text-white flex items-center justify-center gap-1.5 shadow transition">
                    <span>📞</span> <span>Skambinti (${item.phone})</span>
                </a>
            ` : ''}
            ${item.lat && item.lng ? `
                <a href="https://www.google.com/maps/dir/?api=1&destination=${item.lat},${item.lng}" target="_blank" class="flex-1 py-2.5 bg-tractorPrimary hover:bg-tractorPrimaryHover rounded-xl text-xs font-bold text-white flex items-center justify-center gap-1.5 shadow transition">
                    <span>🗺️</span> <span>Naviguoti (Maps)</span>
                </a>
            ` : ''}
        </div>
    `;

    sheet.classList.remove('hidden');
    setTimeout(() => {
        if (panel) panel.classList.remove('translate-y-full');
    }, 15);
}

function loadUserFieldsSelect(currentUser, userData) {
    const isLogged = !!currentUser;
    const hasGarage = !!(userData?.garageLat && userData?.garageLon && userData.garageLat !== 0);

    const items = [];

    if (isLogged && hasGarage) {
        items.push({ id: 'garage', name: '🏠 Mano ūkio bazė (garažas)', icon: '🏠', subtext: 'Iš Nustatymų' });
    } else {
        items.push({
            id: 'setup_prompt',
            name: isLogged ? '🏠 Mano ūkio bazė (Nurodyti vietą)' : '🏠 Mano ūkio bazė (Prisijunkite)',
            icon: '🏠',
            subtext: isLogged ? 'Spauskite vietos pažymėjimui' : 'Prisijunkite ūkio parinkimui'
        });
    }

    const initSelect = () => {
        createCustomSelect({
            containerId: 'grain-field-select-box',
            placeholder: 'Pasirinkite lauką...',
            items: items,
            selectedId: hasGarage ? 'garage' : 'setup_prompt',
            onSelect: (item) => {
                if (!item) return;

                if (item.id === 'setup_prompt') {
                    if (!isLogged) openAuthModal('login');
                    else navigateToSettings();
                    return;
                }

                if (item.id === 'garage') {
                    currentCoords = userGarageCoords || { lat: 56.0593, lng: 24.4036, sourceText: "ūkio bazės (garažo)" };
                } else {
                    const chosenField = userFieldsList.find(f => f.id === item.id);
                    if (chosenField && chosenField.polygonCoordinates && chosenField.polygonCoordinates.length > 0) {
                        const firstPt = chosenField.polygonCoordinates[0];
                        const lat = Array.isArray(firstPt) ? parseFloat(firstPt[0]) : parseFloat(firstPt.lat);
                        const lng = Array.isArray(firstPt) ? parseFloat(firstPt[1]) : parseFloat(firstPt.lng);

                        currentCoords = {
                            lat: lat,
                            lng: lng,
                            sourceText: `lauko „${chosenField.name}“`
                        };
                    }
                }
                updateLocationText();
                renderRankedBuyers();
                renderElevatorsCards();
            }
        });
    };

    if (isLogged) {
        db.collection("user_fields").where("userId", "==", currentUser.uid).get().then(snap => {
            userFieldsList = [];
            snap.forEach(doc => {
                const f = doc.data();
                userFieldsList.push(f);
                items.push({
                    id: f.id,
                    name: f.name,
                    icon: '🌾',
                    subtext: `${f.areaHa} ha • ${f.crop}`
                });
            });
            initSelect();
        });
    } else {
        initSelect();
    }
}

async function resolveLocationChain() {
    if (currentCoords) {
        updateLocationText();
        return;
    }

    try {
        const res = await fetch("https://ipapi.co/json/", { timeout: 3000 });
        const data = await res.json();
        if (data && data.latitude && data.longitude) {
            currentCoords = {
                lat: data.latitude,
                lng: data.longitude,
                sourceText: `IP vietos (${data.city || 'Lietuva'})`
            };
            updateLocationText();
            renderRankedBuyers();
            renderElevatorsCards();
            return;
        }
    } catch (e) {
        console.warn("IP klaida.");
    }

    currentCoords = {
        lat: 55.2885,
        lng: 23.9745,
        sourceText: "Lietuvos centro (Kėdainiai)"
    };
    updateLocationText();
    renderRankedBuyers();
    renderElevatorsCards();
}

function updateLocationText() {
    const el = document.getElementById('location-status-text');
    if (!el || !currentCoords) return;

    const timeString = lastUpdatedTimeFormatted 
        ? `<span class="block sm:inline sm:ml-2 text-green-400 font-bold">• 🕒 Kainos: ${lastUpdatedTimeFormatted} (kas 6 val.)</span>`
        : '';

    el.innerHTML = `📍 Atstumai nuo: <strong class="text-green-400">${currentCoords.sourceText}</strong>.${timeString}`;
}

function listenToGrainPrices() {
    if (unsubscribeGrain) unsubscribeGrain();

    unsubscribeGrain = db.collection("grain_prices").onSnapshot((snapshot) => {
        activeMarketData = [];
        let latestTimestamp = null;

        snapshot.forEach(doc => {
            const data = doc.data();
            activeMarketData.push(data);

            if (data.updatedAt) {
                const docDate = data.updatedAt.toDate ? data.updatedAt.toDate() : new Date(data.updatedAt);
                if (!latestTimestamp || docDate > latestTimestamp) {
                    latestTimestamp = docDate;
                }
            }
        });

        if (latestTimestamp) {
            lastUpdatedTimeFormatted = latestTimestamp.toLocaleString('lt-LT', {
                year: 'numeric', month: '2-digit', day: '2-digit',
                hour: '2-digit', minute: '2-digit'
            });
        }

        updateLocationText();
        renderRankedBuyers();
        renderElevatorsCards();
    });
}

// 🌟 2 PUNKTAS: KOMPAKTIŠKA KORTELĖ (PASPAUDUS IŠKYLA TIKRAS BOTTOM SHEET)
function renderRankedBuyers() {
    const listContainer = document.getElementById('ranked-buyers-list');
    if (!listContainer || activeMarketData.length === 0) return;

    lastCalculatedRankedList = calculateBuyerRanking(activeMarketData, state, currentCoords);

    if (lastCalculatedRankedList.length === 0) {
        listContainer.innerHTML = `<div class="bg-tractorSurface p-6 rounded-2xl text-center text-slate-300 text-sm">Šiuo metu nė vienas elevatorius nepriima pasirinktos kultūros.</div>`;
        return;
    }

    listContainer.innerHTML = lastCalculatedRankedList.map((item, index) => {
        const isBest = index === 0;

        return `
            <div class="ranked-buyer-mini-card p-3 sm:p-3.5 rounded-xl border transition cursor-pointer select-none flex items-center justify-between gap-3 ${
                isBest 
                ? 'bg-myPostBg border-tractorPrimary ring-1 ring-tractorPrimary shadow-md' 
                : 'bg-tractorSurface border-tractorBorder hover:border-slate-400'
            }" data-index="${index}">
                
                <div class="space-y-1 min-w-0 flex-1">
                    <div class="flex items-center gap-2 flex-wrap leading-tight">
                        ${isBest ? `
                            <span class="bg-tractorPrimary text-white text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                                🥇 1 VIETA
                            </span>
                        ` : `
                            <span class="text-slate-400 font-mono font-bold text-xs bg-tractorBg px-1.5 py-0.5 rounded border border-tractorBorder">#${index + 1}</span>
                        `}
                        <h4 class="font-bold text-sm sm:text-base text-white truncate">${item.buyer}</h4>
                    </div>

                    <div class="flex items-center gap-2 text-[11px] text-slate-300">
                        <span class="truncate">📍 ${item.address ? item.address.split(',')[0] : ''}</span>
                        <span>•</span>
                        <span class="text-green-400 font-bold shrink-0">🚗 ~${item.distKm} km</span>
                    </div>
                </div>

                <div class="text-right shrink-0">
                    <div class="text-base sm:text-xl font-black font-mono ${isBest ? 'text-green-400' : 'text-white'} leading-tight">
                        ${item.finalPocketProfit.toLocaleString('lt-LT', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} €
                    </div>
                    <span class="text-[10px] sm:text-xs font-bold ${isBest ? 'text-green-500' : 'text-slate-400'}">
                        ${item.effectivePriceWithTransport.toFixed(2)} €/t ➔
                    </span>
                </div>

            </div>
        `;
    }).join('');

    // Pririšame paspaudimą – atidaro Bottom Sheet
    listContainer.querySelectorAll('.ranked-buyer-mini-card').forEach(card => {
        card.onclick = () => {
            const idx = parseInt(card.getAttribute('data-index'));
            const item = lastCalculatedRankedList[idx];
            if (item) openElevatorBottomSheet(item, idx);
        };
    });
}

function renderElevatorsCards() {
    const grid = document.getElementById('elevators-cards-grid');
    if (!grid || activeMarketData.length === 0) return;

    const coords = currentCoords;
    const sortedByDistance = activeMarketData.map(item => {
        let distKm = 9999;
        if (coords && item.lat && item.lng) {
            distKm = Math.round(calculateDist(coords.lat, coords.lng, item.lat, item.lng));
        }
        return { ...item, distKm: distKm === 9999 ? null : distKm };
    }).sort((a, b) => {
        if (a.distKm === null) return 1;
        if (b.distKm === null) return -1;
        return a.distKm - b.distKm;
    });

    grid.innerHTML = sortedByDistance.map((item, idx) => `
        <div class="bg-tractorBg border border-tractorBorder hover:border-slate-500 rounded-2xl p-3.5 sm:p-4 space-y-2.5 flex flex-col justify-between transition">
            <div class="space-y-2">
                <div class="flex justify-between items-start gap-2">
                    <div>
                        <span class="text-xs text-slate-400 font-mono font-bold">#${idx + 1}</span>
                        <h4 class="font-bold text-white text-sm sm:text-base inline ml-1">${item.buyer}</h4>
                    </div>
                    ${item.distKm !== null ? `
                        <span class="text-[10px] bg-tractorPrimary/20 text-tractorPrimaryLight border border-tractorPrimary/40 px-2 py-0.5 rounded-lg font-bold shrink-0">
                            🚗 ~${item.distKm} km
                        </span>
                    ` : ''}
                </div>
                
                <p class="text-xs text-slate-200 font-medium">📍 ${item.address || item.location || ''}</p>
                <p class="text-[11px] text-slate-300">🕒 <strong class="text-white">Darbo laikas:</strong> ${item.workingHours || '07:00 - 22:00'}</p>
                
                <div class="bg-tractorSurface p-2.5 rounded-xl border border-tractorBorder/70 space-y-1.5 text-xs">
                    <div class="font-bold text-slate-300 uppercase border-b border-tractorBorder/60 pb-1 flex justify-between text-[10px]">
                        <span>Kultūra</span>
                        <span>Bazinė kaina (€/t)</span>
                    </div>
                    <div class="grid grid-cols-2 gap-x-2 gap-y-1 text-[11px]">
                        <div class="flex justify-between">
                            <span class="text-green-400 font-bold">🌱 Rapsai:</span>
                            <strong class="text-green-400 font-black">${item.prices?.rapeseed ? item.prices.rapeseed + ' €' : '-'}</strong>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-slate-200 font-medium">🌾 Kviečiai II:</span>
                            <strong class="text-white font-bold">${item.prices?.wheat2 ? item.prices.wheat2 + ' €' : '-'}</strong>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-slate-300">🌾 Ekstra:</span>
                            <strong class="text-slate-100 font-bold">${item.prices?.wheatExtra ? item.prices.wheatExtra + ' €' : '-'}</strong>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-slate-300">🌾 Pašaras:</span>
                            <strong class="text-slate-100 font-bold">${item.prices?.wheatFeed ? item.prices.wheatFeed + ' €' : '-'}</strong>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-slate-200 font-medium">🌾 Miežiai:</span>
                            <strong class="text-white font-bold">${item.prices?.barley ? item.prices.barley + ' €' : '-'}</strong>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-slate-200 font-medium">🫘 Žirniai:</span>
                            <strong class="text-white font-bold">${item.prices?.peas ? item.prices.peas + ' €' : '-'}</strong>
                        </div>
                    </div>
                </div>
            </div>

            <div class="flex gap-2 pt-1">
                ${item.phone ? `
                    <a href="tel:${item.phone}" class="flex-1 py-1.5 bg-tractorSurface hover:bg-zinc-800 border border-tractorBorder rounded-xl text-xs font-bold text-white text-center flex items-center justify-center gap-1 transition">
                        📞 Skambinti
                    </a>
                ` : ''}
                ${item.lat && item.lng ? `
                    <a href="https://www.google.com/maps/dir/?api=1&destination=${item.lat},${item.lng}" target="_blank" class="flex-1 py-1.5 bg-tractorPrimary hover:bg-tractorPrimaryHover rounded-xl text-xs font-bold text-white text-center flex items-center justify-center gap-1 shadow transition">
                        🗺️ Maršrutas
                    </a>
                ` : ''}
            </div>
        </div>
    `).join('');
}