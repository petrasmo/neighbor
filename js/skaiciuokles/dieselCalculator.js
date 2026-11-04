// js/skaiciuokles/dieselCalculator.js
import { db } from '../core/firebase.js';
import { calculateDist } from './grainCalculator.js';
import { createCustomSelect } from '../core/customSelect.js';
import { openAuthModal } from '../core/auth.js';
import { switchTab } from '../core/ui.js';
import { refreshSettingsMap } from '../sistema/settings.js';
import { FARM_PRICES } from '../ukis/cropPlanner.js';

let activeDieselSuppliers = [];
let officialBenchmark = null; // 🌟 JOKIŲ STATINIŲ KAINŲ! Užkraunama dinamiškai iš ORLEN / LEA
let unsubscribeDiesel = null;
let currentDieselCoords = { lat: 54.8985, lng: 23.9036, name: "Apytikslė vieta (Lietuva)" };
let userGarageCoords = null;
let userFieldsList = [];
let lastDieselUpdatedFormatted = null;
let lastRankedDieselList = [];

const dieselState = {
    volumeLiters: 5000,
    isTonsMode: false,
    includeVat: false,
    activeQuickVol: 5000
};

function navigateToSettings() {
    if (typeof switchTab === 'function' && document.getElementById('view-tab-settings')) {
        switchTab(9);
        if (typeof refreshSettingsMap === 'function') refreshSettingsMap();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
        window.location.href = 'index.html?tab=9';
    }
}

export function renderDieselCalculator(container, currentUser, userData) {
    if (!container) return;

    const isLogged = !!currentUser;
    const hasGarage = !!(userData?.garageLat && userData?.garageLon && userData.garageLat !== 0);

    if (hasGarage) {
        userGarageCoords = {
            lat: parseFloat(userData.garageLat),
            lng: parseFloat(userData.garageLon),
            name: "Mano ūkio bazė (garažas)"
        };
        currentDieselCoords = userGarageCoords;
    } else {
        userGarageCoords = null;
        currentDieselCoords = { lat: 54.8985, lng: 23.9036, name: "Apytikslė vieta (Lietuva)" };
    }

    container.innerHTML = `
        <div class="space-y-4 max-w-6xl mx-auto w-full">
            
            <div class="bg-tractorSurface border border-tractorBorder rounded-2xl p-3.5 sm:p-5 md:p-6 space-y-4 shadow-xl">
                
                <!-- HEADERIS IR PVM PERJUNGIKLIS -->
                <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-tractorBorder/70 pb-3">
                    <div class="space-y-0.5">
                        <div class="inline-flex items-center gap-1.5 bg-green-500/15 border border-green-500/30 text-green-600 dark:text-green-400 text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider">
                            <span class="w-1.5 h-1.5 rounded-full bg-green-500 animate-ping"></span>
                            <span id="diesel-source-badge">Kraunama ORLEN didmenos bazė...</span>
                        </div>
                        <h2 class="font-oswald text-lg sm:text-xl md:text-2xl font-bold text-white uppercase tracking-wider flex items-center gap-2 pt-0.5">
                            <span>⛽</span> Žymėto Dyzelino (Gazolio) Skaičiuoklė ir Bazės
                        </h2>
                        <p class="text-[11px] sm:text-xs text-slate-300" id="diesel-loc-label">
                            📍 Pristatymo taškas: <strong class="text-green-400 font-bold">${currentDieselCoords.name}</strong>
                        </p>
                    </div>

                    <div class="flex items-center gap-2 self-start sm:self-auto">
                        <div class="flex items-center gap-0.5 bg-tractorBg p-0.5 rounded-xl border border-tractorBorder">
                            <button type="button" id="btn-vat-no" class="px-3 py-1.5 rounded-lg text-[11px] sm:text-xs font-bold transition cursor-pointer ${!dieselState.includeVat ? 'bg-tractorPrimary text-white shadow' : 'text-slate-300 hover:text-white'}">Be PVM</button>
                            <button type="button" id="btn-vat-yes" class="px-3 py-1.5 rounded-lg text-[11px] sm:text-xs font-bold transition cursor-pointer ${dieselState.includeVat ? 'bg-tractorPrimary text-white shadow' : 'text-slate-300 hover:text-white'}">Su PVM</button>
                        </div>
                    </div>
                </div>

                <!-- BANERIS NEPRISIJUNGUSIEMS ARBA BE ŪKIO BAZĖS -->
                ${!isLogged || !hasGarage ? `
                    <div class="p-3 bg-tractorBg border border-tractorPrimary rounded-xl shadow-sm">
                        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                            <div class="text-[11px] sm:text-xs text-slate-200">
                                <strong class="text-green-400 block sm:inline">Norite matyti arčiausiai jūsų kiemo esančias kuro bazes?</strong>
                                <span> Nurodykite savo ūkio vietą Nustatymuose, kad sistema tiksliai apskaičiuotų atstumą iki kiekvieno terminalo.</span>
                            </div>
                            <button type="button" id="btn-login-diesel-prompt" class="px-3.5 py-1.5 bg-tractorPrimary hover:bg-tractorPrimaryHover text-white font-black rounded-lg text-xs uppercase tracking-wider shrink-0 transition cursor-pointer">
                                ${!isLogged ? '🔑 Prisijungti' : '📍 Nurodyti kiemą ➔'}
                            </button>
                        </div>
                    </div>
                ` : ''}

                <!-- 🌟 OFICIALIOS BAZINĖS KAINOS IR ORIENTACINĖS SUMOS SUVESTINĖ -->
                <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                    
                    <!-- 1 KORTELĖ: OFICIALI ORLEN BAZINĖ KAINA -->
                    <div class="bg-tractorBg border border-tractorBorder p-4 rounded-2xl flex flex-col justify-between space-y-2">
                        <div class="flex justify-between items-start">
                            <span class="text-[10px] sm:text-[11px] uppercase font-bold text-slate-400 tracking-wider">
                                Oficiali didmeninė bazinė kaina
                            </span>
                            <span id="benchmark-source-tag" class="text-[10px] font-mono bg-tractorSurface px-2 py-0.5 rounded border border-tractorBorder text-slate-300">
                                ORLEN Lietuva
                            </span>
                        </div>
                        <div class="flex items-baseline gap-2.5">
                            <strong id="benchmark-main-price" class="text-2xl sm:text-3xl font-black font-mono text-white animate-pulse">Kraunama...</strong>
                            <span id="benchmark-sub-price" class="text-xs font-mono text-slate-400"></span>
                        </div>
                        <p class="text-[11px] text-slate-400">
                            Įskaičiuotas lengvatinis žemės ūkio akcizas (<strong id="benchmark-excise-label">0.060 €/l</strong>).
                        </p>
                    </div>

                    <!-- 2 KORTELĖ: ORIENTACINĖ UŽSAKYMO SUMA -->
                    <div class="bg-tractorPrimary/15 border-2 border-tractorPrimary p-4 rounded-2xl flex flex-col justify-between space-y-2 shadow-lg">
                        <div class="flex justify-between items-start">
                            <span id="order-calc-title" class="text-[10px] sm:text-[11px] uppercase font-black text-tractorPrimaryLight tracking-wider">
                                Orientacinė užsakymo suma (${dieselState.volumeLiters.toLocaleString('lt-LT')} l)
                            </span>
                            <span id="order-vat-badge" class="text-[10px] font-bold bg-tractorPrimary text-white px-2 py-0.5 rounded-full uppercase">
                                ${dieselState.includeVat ? 'Su PVM' : 'Be PVM'}
                            </span>
                        </div>
                        <div class="flex items-baseline gap-2.5">
                            <strong id="order-total-sum" class="text-2xl sm:text-3xl font-black font-mono text-green-400 animate-pulse">Skaičiuojama...</strong>
                            <span id="order-sub-sum" class="text-xs font-mono text-slate-300"></span>
                        </div>
                        <p class="text-[11px] text-slate-300">
                            Galutinė kaina priklauso nuo pasirinktos kuro bazės nuolaidos tūriui ir atvežimo atstumo.
                        </p>
                    </div>

                </div>

                <!-- KIEKIO IR VIETOS ĮVEDIMAS -->
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3 pt-1">
                    <div class="space-y-1">
                        <div class="flex justify-between items-center text-[10px] sm:text-[11px]">
                            <label class="font-bold text-tractorPrimaryLight uppercase tracking-wider">Norimas pirkti kiekis į ūkio talpą</label>
                            <div class="flex items-center gap-1.5">
                                <button type="button" id="btn-unit-liters" class="${!dieselState.isTonsMode ? 'text-green-400 font-bold underline' : 'text-slate-400 hover:text-white'}">Litrai (l)</button>
                                <span class="text-slate-500">|</span>
                                <button type="button" id="btn-unit-tons" class="${dieselState.isTonsMode ? 'text-green-400 font-bold underline' : 'text-slate-400 hover:text-white'}">Tonos (t)</button>
                            </div>
                        </div>
                        <div class="relative">
                            <input id="diesel-volume-input" type="number" step="500" value="${dieselState.volumeLiters}" 
                                class="w-full h-12 bg-tractorBg border border-tractorBorder focus:border-tractorPrimary rounded-xl pl-3 pr-24 text-sm sm:text-base text-white font-mono font-bold outline-none">
                            <span id="diesel-unit-label" class="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] sm:text-xs font-bold text-slate-400 pointer-events-none">litrų (~4.2 t)</span>
                        </div>
                    </div>

                    <div class="space-y-1">
                        <label class="text-[10px] sm:text-[11px] font-bold text-slate-300 uppercase tracking-wider block">Jūsų ūkio talpos vieta (atstumo skaičiavimui)</label>
                        <div id="diesel-location-select-box"></div>
                    </div>
                </div>

                <!-- GREITIEJI TŪRIO MYGTUKAI -->
                <div class="flex flex-wrap items-center gap-1.5 pt-2 border-t border-tractorBorder/50">
                    <span class="text-[10px] sm:text-[11px] font-bold text-slate-400 mr-1">Populiarūs tūriai:</span>
                    <button type="button" class="btn-quick-vol px-2.5 py-1 rounded-lg text-[10px] sm:text-xs font-bold transition cursor-pointer border" data-vol="2000">2 000 l</button>
                    <button type="button" class="btn-quick-vol px-2.5 py-1 rounded-lg text-[10px] sm:text-xs font-bold transition cursor-pointer border" data-vol="5000">5 000 l</button>
                    <button type="button" class="btn-quick-vol px-2.5 py-1 rounded-lg text-[10px] sm:text-xs font-bold transition cursor-pointer border" data-vol="10000">10 000 l</button>
                    <button type="button" class="btn-quick-vol px-2.5 py-1 rounded-lg text-[10px] sm:text-xs font-bold transition cursor-pointer border" data-vol="24000">24 000 l (Pilna cisterna)</button>
                </div>

            </div>

            <!-- ARTIMIAUSIŲ KURO BAZIŲ SĄRAŠAS -->
            <div id="diesel-results-container" class="space-y-2.5">
                <div class="text-center py-6 text-slate-500 text-xs">Kraunamos kuro bazės...</div>
            </div>

        </div>

        <!-- BOTTOM SHEET: TIEKĖJO KONTAKTAI IR UŽSAKYMO ATMINTINĖ -->
        <div id="diesel-supplier-sheet" class="fixed inset-0 bg-black/80 z-[9999] hidden flex flex-col justify-end items-center p-0 backdrop-blur-sm transition-opacity duration-300">
            <div id="diesel-supplier-panel" class="bg-tractorSurface border-t-2 border-x-2 border-b-0 border-tractorBorder rounded-t-3xl rounded-b-none p-5 sm:p-7 pb-10 max-w-xl w-full space-y-4 shadow-2xl relative max-h-[90vh] overflow-y-auto mb-0 transform translate-y-full transition-transform duration-300">
                
                <div class="flex justify-between items-center border-b border-tractorBorder/70 pb-3">
                    <div class="space-y-0.5 min-w-0 pr-2">
                        <div class="flex items-center gap-2">
                            <span id="sheet-diesel-rank" class="bg-tractorPrimary text-white text-[10px] font-black px-2 py-0.5 rounded-full uppercase">ARTIMIAUSIA BAZĖ</span>
                            <h3 id="sheet-diesel-name" class="font-oswald text-base sm:text-lg font-bold uppercase tracking-wider text-white truncate">Tiekėjas</h3>
                        </div>
                        <p id="sheet-diesel-address" class="text-xs text-slate-400 truncate">Bazė</p>
                    </div>
                    <button type="button" id="btn-close-diesel-sheet" class="text-slate-400 hover:text-white text-2xl font-bold cursor-pointer p-1 leading-none transition">&times;</button>
                </div>

                <div id="diesel-sheet-body" class="space-y-3.5 pt-1"></div>

                <div class="pt-2">
                    <button type="button" id="btn-ack-diesel-sheet" class="w-full h-11 bg-tractorBg hover:bg-zinc-800 border border-tractorBorder text-slate-200 font-bold rounded-xl text-xs uppercase tracking-wider transition cursor-pointer flex items-center justify-center">
                        Uždaryti langą
                    </button>
                </div>

            </div>
        </div>
    `;

    setupLocationSelect(currentUser, userData);
    setupEvents(currentUser, userData);
    setupDieselSheetEvents();
    updateQuickVolButtons();
    listenToDieselFirebase();
}

function setupEvents(currentUser) {
    const input = document.getElementById('diesel-volume-input');
    const unitLabel = document.getElementById('diesel-unit-label');
    const btnLiters = document.getElementById('btn-unit-liters');
    const btnTons = document.getElementById('btn-unit-tons');
    const btnVatNo = document.getElementById('btn-vat-no');
    const btnVatYes = document.getElementById('btn-vat-yes');
    const btnLoginPrompt = document.getElementById('btn-login-diesel-prompt');

    if (btnLoginPrompt) {
        btnLoginPrompt.onclick = () => {
            if (!currentUser) openAuthModal('login');
            else navigateToSettings();
        };
    }

    const updateVolumeFromInput = () => {
        const val = parseFloat(input.value) || 0;
        if (dieselState.isTonsMode) {
            dieselState.volumeLiters = Math.round(val * 1190);
            unitLabel.textContent = `tonų (~${dieselState.volumeLiters.toLocaleString('lt-LT')} l)`;
        } else {
            dieselState.volumeLiters = val;
            unitLabel.textContent = `litrų (~${(val / 1190).toFixed(1)} t)`;
        }

        dieselState.activeQuickVol = dieselState.volumeLiters;
        updateQuickVolButtons();
        updateCalculatorSummary();
        renderNearestSuppliers();
    };

    input?.addEventListener('input', updateVolumeFromInput);

    btnLiters.onclick = () => {
        dieselState.isTonsMode = false;
        btnLiters.className = "text-green-400 font-bold underline";
        btnTons.className = "text-slate-400 hover:text-white";
        input.value = dieselState.volumeLiters;
        updateVolumeFromInput();
    };

    btnTons.onclick = () => {
        dieselState.isTonsMode = true;
        btnTons.className = "text-green-400 font-bold underline";
        btnLiters.className = "text-slate-400 hover:text-white";
        input.value = (dieselState.volumeLiters / 1190).toFixed(1);
        updateVolumeFromInput();
    };

    btnVatNo.onclick = () => {
        dieselState.includeVat = false;
        btnVatNo.className = "px-3 py-1.5 rounded-lg text-[11px] sm:text-xs font-bold bg-tractorPrimary text-white shadow cursor-pointer";
        btnVatYes.className = "px-3 py-1.5 rounded-lg text-[11px] sm:text-xs font-bold text-slate-300 hover:text-white cursor-pointer";
        updateCalculatorSummary();
        renderNearestSuppliers();
    };

    btnVatYes.onclick = () => {
        dieselState.includeVat = true;
        btnVatYes.className = "px-3 py-1.5 rounded-lg text-[11px] sm:text-xs font-bold bg-tractorPrimary text-white shadow cursor-pointer";
        btnVatNo.className = "px-3 py-1.5 rounded-lg text-[11px] sm:text-xs font-bold text-slate-300 hover:text-white cursor-pointer";
        updateCalculatorSummary();
        renderNearestSuppliers();
    };

    document.querySelectorAll('.btn-quick-vol').forEach(btn => {
        btn.onclick = () => {
            const vol = parseFloat(btn.getAttribute('data-vol'));
            dieselState.isTonsMode = false;
            dieselState.volumeLiters = vol;
            dieselState.activeQuickVol = vol;

            btnLiters.className = "text-green-400 font-bold underline";
            btnTons.className = "text-slate-400 hover:text-white";
            input.value = vol;
            unitLabel.textContent = `litrų (~${(vol / 1190).toFixed(1)} t)`;

            updateQuickVolButtons();
            updateCalculatorSummary();
            renderNearestSuppliers();
        };
    });
}

function updateQuickVolButtons() {
    document.querySelectorAll('.btn-quick-vol').forEach(btn => {
        const vol = parseFloat(btn.getAttribute('data-vol'));
        if (vol === dieselState.activeQuickVol) {
            btn.className = "btn-quick-vol px-2.5 py-1 rounded-lg text-[10px] sm:text-xs font-bold transition cursor-pointer bg-tractorPrimary text-white border-tractorPrimary shadow-sm";
        } else {
            btn.className = "btn-quick-vol px-2.5 py-1 rounded-lg text-[10px] sm:text-xs font-bold transition cursor-pointer bg-tractorBg border-tractorBorder text-slate-300 hover:text-white";
        }
    });
}

function setupLocationSelect(currentUser, userData) {
    const isLogged = !!currentUser;
    const hasGarage = !!(userData?.garageLat && userData?.garageLon && userData.garageLat !== 0);

    const items = [];

    if (isLogged && hasGarage) {
        items.push({ id: 'garage', name: '🏠 Mano ūkio bazė (garažas)', icon: '🏠', subtext: 'Iš Nustatymų žemėlapio' });
    } else {
        items.push({
            id: 'login_prompt',
            name: isLogged ? '🏠 Mano ūkio bazė (Nurodyti vietą)' : '🏠 Mano ūkio bazė (Prisijunkite)',
            icon: '🏠',
            subtext: isLogged ? 'Spauskite vietos pažymėjimui' : 'Spauskite prisijungimui'
        });
    }

    items.push({ id: 'gps', name: '📡 Dabartinė vieta (GPS)', icon: '📡', subtext: 'Pagal telefono / kompiuterio vietą' });

    if (isLogged) {
        db.collection("user_fields").where("userId", "==", currentUser.uid).get().then(snap => {
            userFieldsList = [];
            snap.forEach(doc => {
                const f = doc.data();
                userFieldsList.push(f);
                items.push({
                    id: f.id,
                    name: `🌾 Laukas „${f.name}“`,
                    icon: '🌾',
                    subtext: `${f.areaHa} ha • ${f.crop}`
                });
            });

            initLocationCustomSelect(items, currentUser, userData);
        });
    } else {
        initLocationCustomSelect(items, currentUser, userData);
    }
}

function initLocationCustomSelect(items, currentUser, userData) {
    const isLogged = !!currentUser;
    const hasGarage = !!(userData?.garageLat && userData?.garageLon && userData.garageLat !== 0);
    const defaultId = isLogged && hasGarage ? 'garage' : 'gps';

    createCustomSelect({
        containerId: 'diesel-location-select-box',
        placeholder: 'Pristatymo vieta...',
        items: items,
        selectedId: defaultId,
        onSelect: (item) => {
            if (!item) return;

            if (item.id === 'login_prompt') {
                if (!isLogged) openAuthModal('login');
                else navigateToSettings();
                return;
            }

            if (item.id === 'garage') {
                currentDieselCoords = userGarageCoords || { lat: 54.8985, lng: 23.9036, name: "Mano ūkio bazė (garažas)" };
                updateLocationDisplay();
                renderNearestSuppliers();
            } else if (item.id === 'gps') {
                if (navigator.geolocation) {
                    const lbl = document.getElementById('diesel-loc-label');
                    if (lbl) lbl.innerHTML = `📍 Nustatoma GPS vieta...`;
                    
                    navigator.geolocation.getCurrentPosition((pos) => {
                        currentDieselCoords = {
                            lat: pos.coords.latitude,
                            lng: pos.coords.longitude,
                            name: "Dabartinė GPS vieta"
                        };
                        updateLocationDisplay();
                        renderNearestSuppliers();
                    }, () => {
                        currentDieselCoords = { lat: 54.8985, lng: 23.9036, name: "Apytikslė vieta (Lietuva)" };
                        updateLocationDisplay();
                        renderNearestSuppliers();
                    });
                }
            } else {
                const chosenField = userFieldsList.find(f => f.id === item.id);
                if (chosenField && chosenField.polygonCoordinates && chosenField.polygonCoordinates.length > 0) {
                    const firstPt = chosenField.polygonCoordinates[0];
                    const lat = Array.isArray(firstPt) ? parseFloat(firstPt[0]) : parseFloat(firstPt.lat);
                    const lng = Array.isArray(firstPt) ? parseFloat(firstPt[1]) : parseFloat(firstPt.lng);

                    currentDieselCoords = {
                        lat: lat,
                        lng: lng,
                        name: `Laukas „${chosenField.name}“`
                    };
                    updateLocationDisplay();
                    renderNearestSuppliers();
                }
            }
        }
    });
}

function updateLocationDisplay() {
    const lbl = document.getElementById('diesel-loc-label');
    if (!lbl) return;

    const timeText = lastDieselUpdatedFormatted 
        ? `<span class="block sm:inline sm:ml-2 text-green-400 font-bold">• 🕒 Duomenys atnaujinti: ${lastDieselUpdatedFormatted}</span>`
        : '';

    lbl.innerHTML = `📍 Pristatymo taškas: <strong class="text-green-400 font-bold">${currentDieselCoords.name}</strong>${timeText}`;
}

function listenToDieselFirebase() {
    if (unsubscribeDiesel) unsubscribeDiesel();

    unsubscribeDiesel = db.collection("diesel_prices").onSnapshot((snapshot) => {
        activeDieselSuppliers = [];
        let latestTime = null;

        snapshot.forEach(doc => {
            const data = doc.data();

            // 🌟 DINAMIŠKAI PASIIMAME REALIĄ BAZINĘ KAINĄ IŠ FIRESTORE
            if (doc.id === "market_benchmark" || data.isBenchmark) {
                officialBenchmark = {
                    officialBasePriceNoVat: Number(data.officialBasePriceNoVat) || 1.582,
                    officialBasePriceVat: Number(data.officialBasePriceVat) || parseFloat(((Number(data.officialBasePriceNoVat) || 1.582) * 1.21).toFixed(3)),
                    exciseDutyPerLiter: Number(data.exciseDutyPerLiter) || 0.060,
                    source: data.source || "AB ORLEN Lietuva (Oficiali didmenos bazė)"
                };

                // Dinamiškai atnaujiname ūkio gamybos planavimo kuro kainą
                if (FARM_PRICES) {
                    FARM_PRICES.diesel = officialBenchmark.officialBasePriceNoVat;
                }
            } else {
                activeDieselSuppliers.push(data);
            }

            if (data.updatedAt) {
                const docDate = data.updatedAt.toDate ? data.updatedAt.toDate() : new Date(data.updatedAt);
                if (!latestTime || docDate > latestTime) {
                    latestTime = docDate;
                }
            }
        });

        if (latestTime) {
            lastDieselUpdatedFormatted = latestTime.toLocaleString('lt-LT', {
                year: 'numeric', month: '2-digit', day: '2-digit',
                hour: '2-digit', minute: '2-digit'
            });
        }

        updateLocationDisplay();
        updateCalculatorSummary();
        renderNearestSuppliers();
    });
}

function updateCalculatorSummary() {
    if (!officialBenchmark) return;

    const volume = dieselState.volumeLiters;
    const baseNoVat = officialBenchmark.officialBasePriceNoVat;
    const baseVat = officialBenchmark.officialBasePriceVat;

    const sumNoVat = Math.round(volume * baseNoVat);
    const sumVat = Math.round(volume * baseVat);

    const elBenchMain = document.getElementById('benchmark-main-price');
    const elBenchSub = document.getElementById('benchmark-sub-price');
    const elBenchTag = document.getElementById('benchmark-source-tag');
    const elBenchExcise = document.getElementById('benchmark-excise-label');
    const elSourceBadge = document.getElementById('diesel-source-badge');
    const elOrderTitle = document.getElementById('order-calc-title');
    const elOrderBadge = document.getElementById('order-vat-badge');
    const elOrderTotal = document.getElementById('order-total-sum');
    const elOrderSub = document.getElementById('order-sub-sum');

    if (elBenchTag && officialBenchmark.source) {
        elBenchTag.textContent = officialBenchmark.source.includes('ORLEN') ? 'ORLEN Lietuva' : 'Biržos indeksas';
    }
    if (elSourceBadge && officialBenchmark.source) {
        elSourceBadge.textContent = `Gyva didmena • ${officialBenchmark.source}`;
    }
    if (elBenchExcise) {
        elBenchExcise.textContent = `${officialBenchmark.exciseDutyPerLiter.toFixed(3)} €/l`;
    }

    if (dieselState.includeVat) {
        if (elBenchMain) {
            elBenchMain.classList.remove('animate-pulse');
            elBenchMain.textContent = `${baseVat.toFixed(3)} €/l`;
        }
        if (elBenchSub) elBenchSub.textContent = `(${baseNoVat.toFixed(3)} €/l be PVM)`;
        if (elOrderBadge) elOrderBadge.textContent = "Su PVM";
        if (elOrderTotal) {
            elOrderTotal.classList.remove('animate-pulse');
            elOrderTotal.textContent = `~${sumVat.toLocaleString('lt-LT')} €`;
        }
        if (elOrderSub) elOrderSub.textContent = `(~${sumNoVat.toLocaleString('lt-LT')} € be PVM)`;
    } else {
        if (elBenchMain) {
            elBenchMain.classList.remove('animate-pulse');
            elBenchMain.textContent = `${baseNoVat.toFixed(3)} €/l`;
        }
        if (elBenchSub) elBenchSub.textContent = `(${baseVat.toFixed(3)} €/l su PVM)`;
        if (elOrderBadge) elOrderBadge.textContent = "Be PVM";
        if (elOrderTotal) {
            elOrderTotal.classList.remove('animate-pulse');
            elOrderTotal.textContent = `~${sumNoVat.toLocaleString('lt-LT')} €`;
        }
        if (elOrderSub) elOrderSub.textContent = `(~${sumVat.toLocaleString('lt-LT')} € su PVM)`;
    }

    if (elOrderTitle) {
        elOrderTitle.textContent = `Orientacinė užsakymo suma (${volume.toLocaleString('lt-LT')} l)`;
    }
}

function setupDieselSheetEvents() {
    const sheet = document.getElementById('diesel-supplier-sheet');
    const panel = document.getElementById('diesel-supplier-panel');
    const closeBtn = document.getElementById('btn-close-diesel-sheet');
    const ackBtn = document.getElementById('btn-ack-diesel-sheet');

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

function openDieselBottomSheet(item, rankIndex) {
    if (!officialBenchmark) return;

    const sheet = document.getElementById('diesel-supplier-sheet');
    const panel = document.getElementById('diesel-supplier-panel');
    const nameEl = document.getElementById('sheet-diesel-name');
    const rankEl = document.getElementById('sheet-diesel-rank');
    const addressEl = document.getElementById('sheet-diesel-address');
    const bodyEl = document.getElementById('diesel-sheet-body');

    if (!sheet || !bodyEl || !item) return;

    const volume = dieselState.volumeLiters;
    const baseNoVat = officialBenchmark.officialBasePriceNoVat;
    const baseVat = officialBenchmark.officialBasePriceVat;
    const activeBasePrice = dieselState.includeVat ? baseVat : baseNoVat;
    const activeSum = Math.round(volume * activeBasePrice);
    const vatLabel = dieselState.includeVat ? "su PVM" : "be PVM";

    if (nameEl) nameEl.textContent = item.name;
    if (rankEl) {
        rankEl.textContent = rankIndex === 0 ? "📍 ARTIMIAUSIA BAZĖ" : `#${rankIndex + 1} PAGAL ATSTUMĄ`;
        rankEl.className = rankIndex === 0 
            ? "bg-tractorPrimary text-white text-[10px] font-black px-2 py-0.5 rounded-full uppercase"
            : "bg-tractorBg border border-tractorBorder text-slate-300 font-mono text-[10px] font-bold px-2 py-0.5 rounded";
    }
    if (addressEl) addressEl.textContent = `📍 Adresas: ${item.depotAddress} (${item.region})`;

    bodyEl.innerHTML = `
        <div class="bg-myPostBg border-2 border-tractorPrimary rounded-2xl p-4 text-center space-y-1 shadow-lg">
            <span class="text-[10px] text-slate-300 uppercase font-black tracking-wider block">
                ORIENTACINĖ UŽSAKYMO VERTĖ PAGAL BAZĘ (${vatLabel})
            </span>
            <div class="text-3xl font-black text-green-400 font-mono">
                ~${activeSum.toLocaleString('lt-LT')} €
            </div>
            <div class="text-xs font-bold text-slate-200">
                Didmenos bazė: <strong class="text-green-400 text-sm font-black">${activeBasePrice.toFixed(3)} €/l</strong>
            </div>
        </div>

        <div class="bg-tractorBg rounded-xl p-3.5 border border-tractorBorder space-y-2 text-xs">
            <div class="flex justify-between items-center border-b border-tractorBorder/60 pb-1.5">
                <span class="text-slate-400">Atstumas nuo kuro bazės iki jūsų:</span>
                <strong class="font-mono text-green-400 font-bold">🚗 ~${item.distKm} km</strong>
            </div>

            <div class="flex justify-between items-center border-b border-tractorBorder/60 pb-1.5">
                <span class="text-slate-400">Planuojamas užsakyti kiekis:</span>
                <strong class="font-mono text-white font-bold">${volume.toLocaleString('lt-LT')} litrų</strong>
            </div>

            <div class="flex justify-between items-center pt-0.5">
                <span class="text-slate-400">Minimalus pristatymo kiekis:</span>
                <strong class="font-mono ${volume >= (item.minOrderLiters || 2000) ? 'text-slate-200' : 'text-amber-400'}">
                    nuo ${(item.minOrderLiters || 2000).toLocaleString('lt-LT')} l
                </strong>
            </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
            ${item.phone ? `
                <a href="tel:${item.phone}" class="h-12 bg-tractorPrimary hover:bg-tractorPrimaryHover rounded-xl text-xs sm:text-sm font-bold text-white flex items-center justify-center gap-2 shadow-lg transition">
                    <span>📞</span> <span>Skambinti (${item.phone})</span>
                </a>
            ` : ''}
            <a href="https://www.google.com/maps/dir/?api=1&destination=${item.lat},${item.lng}" target="_blank" class="h-12 bg-tractorBg hover:bg-zinc-800 border border-tractorBorder rounded-xl text-xs sm:text-sm font-bold text-white flex items-center justify-center gap-2 transition">
                <span>🧭</span> <span>Rodyti žemėlapyje</span>
            </a>
        </div>
    `;

    sheet.classList.remove('hidden');
    setTimeout(() => {
        if (panel) panel.classList.remove('translate-y-full');
    }, 15);
}

function renderNearestSuppliers() {
    const container = document.getElementById('diesel-results-container');
    if (!container || activeDieselSuppliers.length === 0) return;

    lastRankedDieselList = activeDieselSuppliers.map(s => {
        const distKm = Math.round(calculateDist(currentDieselCoords.lat, currentDieselCoords.lng, s.lat, s.lng));
        return {
            ...s,
            distKm
        };
    }).sort((a, b) => a.distKm - b.distKm);

    container.innerHTML = `
        <div class="flex items-center justify-between px-1">
            <h4 class="font-oswald text-base sm:text-lg font-bold uppercase tracking-wider text-white">
                📍 Artimiausios kuro bazės ir didmenininkai (${lastRankedDieselList.length}):
            </h4>
            <span class="text-[10px] sm:text-xs text-slate-400">Surikiuota pagal atstumą nuo jūsų</span>
        </div>

        <div class="space-y-2">
            ${lastRankedDieselList.map((item, idx) => {
                const isNearest = idx === 0;
                const isClose = item.distKm <= 40;

                return `
                    <div class="diesel-supplier-mini-card p-3 sm:p-4 rounded-xl border transition cursor-pointer select-none flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                        isNearest 
                        ? 'bg-myPostBg border-tractorPrimary ring-1 ring-tractorPrimary shadow-md' 
                        : 'bg-tractorSurface border-tractorBorder hover:border-slate-400'
                    }" data-index="${idx}">
                        
                        <div class="space-y-1 min-w-0 flex-1">
                            <div class="flex items-center gap-2 flex-wrap leading-tight">
                                ${isNearest ? `
                                    <span class="bg-tractorPrimary text-white text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                                        📍 ARTIMIAUSIA BAZĖ
                                    </span>
                                ` : `
                                    <span class="text-slate-400 font-mono font-bold text-xs bg-tractorBg px-1.5 py-0.5 rounded border border-tractorBorder">#${idx + 1}</span>
                                `}
                                <h4 class="font-bold text-sm sm:text-base text-white truncate">${item.name}</h4>
                            </div>

                            <div class="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-slate-300">
                                <span>📍 ${item.depotAddress}</span>
                                <span>•</span>
                                <span class="${isClose ? 'text-green-400' : 'text-amber-400'} font-bold">🚗 ~${item.distKm} km nuo jūsų</span>
                                <span class="text-slate-400 text-[11px]">• Min. užsakymas: ${(item.minOrderLiters || 2000).toLocaleString('lt-LT')} l</span>
                            </div>
                        </div>

                        <div class="flex items-center gap-2 shrink-0 self-end sm:self-center">
                            ${item.phone ? `
                                <a href="tel:${item.phone}" onclick="event.stopPropagation()" class="h-10 px-3.5 bg-tractorPrimary hover:bg-tractorPrimaryHover text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow transition">
                                    <span>📞</span> <span>${item.phone}</span>
                                </a>
                            ` : ''}
                            <button type="button" class="h-10 px-3 bg-tractorBg hover:bg-zinc-800 border border-tractorBorder text-slate-200 font-bold rounded-xl text-xs transition cursor-pointer">
                                Sąmata ➔
                            </button>
                        </div>

                    </div>
                `;
            }).join('')}
        </div>
    `;

    container.querySelectorAll('.diesel-supplier-mini-card').forEach(card => {
        card.onclick = () => {
            const idx = parseInt(card.getAttribute('data-index'));
            const item = lastRankedDieselList[idx];
            if (item) openDieselBottomSheet(item, idx);
        };
    });
}