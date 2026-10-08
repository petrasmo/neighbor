// js/skaiciuokles/dieselCalculator.js
import { db } from '../core/firebase.js';
import { calculateDist } from './grainCalculator.js';
import { createCustomSelect } from '../core/customSelect.js';
import { openAuthModal } from '../core/auth.js';
import { switchTab } from '../core/ui.js';
import { refreshSettingsMap } from '../sistema/settings.js';

let activeDieselSuppliers = [];
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
    includeTransport: true,
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
            
            <div class="bg-tractorSurface border border-tractorBorder rounded-2xl p-3.5 sm:p-5 md:p-6 space-y-3.5 shadow-xl">
                
                <!-- HEADERIS IR KONTROLIAI (KOMPAKTIŠKA) -->
                <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-tractorBorder/70 pb-3">
                    <div class="space-y-0.5">
                        <h2 class="font-oswald text-lg sm:text-xl md:text-2xl font-bold text-white uppercase tracking-wider flex items-center gap-2">
                            <span>⛽</span> Žymėto Dyzelino (Gazolio) Užsakymas
                        </h2>
                        <p class="text-[11px] sm:text-xs text-slate-300" id="diesel-loc-label">
                            📍 Pristatymas: <strong class="text-green-400 font-bold">${currentDieselCoords.name}</strong>
                        </p>
                    </div>

                    <div class="flex flex-wrap items-center gap-2">
                        <label class="flex items-center gap-1.5 cursor-pointer text-[11px] sm:text-xs font-bold select-none bg-tractorBg px-2.5 py-1.5 rounded-xl border border-tractorBorder hover:border-tractorPrimary transition">
                            <input type="checkbox" id="diesel-opt-transport" class="accent-tractorPrimary w-3.5 h-3.5 sm:w-4 sm:h-4 cursor-pointer" ${dieselState.includeTransport ? 'checked' : ''}>
                            <span style="color: var(--text-main);">Atvežimas į kiemą</span>
                        </label>

                        <div class="flex items-center gap-0.5 bg-tractorBg p-0.5 rounded-xl border border-tractorBorder">
                            <button type="button" id="btn-vat-no" class="px-2.5 py-1 rounded-lg text-[11px] sm:text-xs font-bold transition cursor-pointer ${!dieselState.includeVat ? 'bg-tractorPrimary text-white shadow' : 'text-slate-300 hover:text-white'}">Be PVM</button>
                            <button type="button" id="btn-vat-yes" class="px-2.5 py-1 rounded-lg text-[11px] sm:text-xs font-bold transition cursor-pointer ${dieselState.includeVat ? 'bg-tractorPrimary text-white shadow' : 'text-slate-300 hover:text-white'}">Su PVM</button>
                        </div>
                    </div>
                </div>

                <!-- BANERIS NEPRISIJUNGUSIEMS ARBA BE ŪKIO BAZĖS -->
                ${!isLogged || !hasGarage ? `
                    <div class="p-3 bg-tractorBg border border-tractorPrimary rounded-xl shadow-sm">
                        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                            <div class="text-[11px] sm:text-xs text-slate-200">
                                <strong class="text-green-400 block sm:inline">Norite tikslių kuro atvežimo kainų?</strong>
                                <span> Nurodykite savo ūkio bazę Nustatymuose, kad sistema automatiškai skaičiuotų autocisternos atstumą iki jūsų kiemo.</span>
                            </div>
                            <button type="button" id="btn-login-diesel-prompt" class="px-3.5 py-1.5 bg-tractorPrimary hover:bg-tractorPrimaryHover text-white font-black rounded-lg text-xs uppercase tracking-wider shrink-0 transition cursor-pointer">
                                ${!isLogged ? '🔑 Prisijungti' : '📍 Nurodyti kiemą ➔'}
                            </button>
                        </div>
                    </div>
                ` : ''}

                <!-- KIEKIS IR ADRESAS (2 STULPELIAI) -->
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
                    <div class="space-y-1">
                        <div class="flex justify-between items-center text-[10px] sm:text-[11px]">
                            <label class="font-bold text-tractorPrimaryLight uppercase tracking-wider">Užsakomas kiekis</label>
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
                        <label class="text-[10px] sm:text-[11px] font-bold text-slate-300 uppercase tracking-wider block">Pristatymo vieta</label>
                        <div id="diesel-location-select-box"></div>
                    </div>
                </div>

                <!-- POPULIARŪS TŪRIAI (VIENA EILUTĖ) -->
                <div class="flex flex-wrap items-center gap-1.5 pt-1 border-t border-tractorBorder/50">
                    <span class="text-[10px] sm:text-[11px] font-bold text-slate-400 mr-1">Tūriai:</span>
                    <button type="button" class="btn-quick-vol px-2.5 py-1 rounded-lg text-[10px] sm:text-xs font-bold transition cursor-pointer border" data-vol="2500">2 500 l</button>
                    <button type="button" class="btn-quick-vol px-2.5 py-1 rounded-lg text-[10px] sm:text-xs font-bold transition cursor-pointer border" data-vol="5000">5 000 l</button>
                    <button type="button" class="btn-quick-vol px-2.5 py-1 rounded-lg text-[10px] sm:text-xs font-bold transition cursor-pointer border" data-vol="10000">10 000 l</button>
                    <button type="button" class="btn-quick-vol px-2.5 py-1 rounded-lg text-[10px] sm:text-xs font-bold transition cursor-pointer border" data-vol="24000">24 000 l (Cisterna)</button>
                </div>

            </div>

            <!-- TIEKĖJŲ REZULTATAI (KOMPAKTIŠKAS SĄRAŠAS) -->
            <div id="diesel-results-container" class="space-y-2.5">
                <div class="text-center py-6 text-slate-500 text-xs">Kraunamos kuro bazės ir skaičiuojamos kainos...</div>
            </div>

        </div>

        <!-- 🌟 PROJEKTO STANDARTO BOTTOM SHEET: IŠKYLA PASPAUDUS ANT TIEKĖJO -->
        <div id="diesel-supplier-sheet" class="fixed inset-0 bg-black/80 z-[9999] hidden flex flex-col justify-end items-center p-0 backdrop-blur-sm transition-opacity duration-300">
            <div id="diesel-supplier-panel" class="bg-tractorSurface border-t-2 border-x-2 border-b-0 border-tractorBorder rounded-t-3xl rounded-b-none p-5 sm:p-7 pb-10 max-w-xl w-full space-y-4 shadow-2xl relative max-h-[90vh] overflow-y-auto mb-0 transform translate-y-full transition-transform duration-300">
                
                <div class="flex justify-between items-center border-b border-tractorBorder/70 pb-3">
                    <div class="space-y-0.5 min-w-0 pr-2">
                        <div class="flex items-center gap-2">
                            <span id="sheet-diesel-rank" class="bg-tractorPrimary text-white text-[10px] font-black px-2 py-0.5 rounded-full uppercase">1 VIETA</span>
                            <h3 id="sheet-diesel-name" class="font-oswald text-base sm:text-lg font-bold uppercase tracking-wider text-white truncate">Tiekėjas</h3>
                        </div>
                        <p id="sheet-diesel-address" class="text-xs text-slate-400 truncate">Bazė</p>
                    </div>
                    <button type="button" id="btn-close-diesel-sheet" class="text-slate-400 hover:text-white text-2xl font-bold cursor-pointer p-1 leading-none transition">&times;</button>
                </div>

                <div id="diesel-sheet-body" class="space-y-3.5 pt-1"></div>

                <div class="pt-2">
                    <button type="button" id="btn-ack-diesel-sheet" class="w-full h-11 bg-tractorPrimary hover:bg-tractorPrimaryHover text-white font-extrabold rounded-xl text-xs uppercase tracking-wider shadow transition cursor-pointer flex items-center justify-center">
                        Supratau 👍
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

function setupEvents(currentUser, userData) {
    const input = document.getElementById('diesel-volume-input');
    const unitLabel = document.getElementById('diesel-unit-label');
    const btnLiters = document.getElementById('btn-unit-liters');
    const btnTons = document.getElementById('btn-unit-tons');
    const btnVatNo = document.getElementById('btn-vat-no');
    const btnVatYes = document.getElementById('btn-vat-yes');
    const transportCb = document.getElementById('diesel-opt-transport');
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
        renderRankedSuppliers();
    };

    input?.addEventListener('input', updateVolumeFromInput);

    transportCb?.addEventListener('change', (e) => {
        dieselState.includeTransport = e.target.checked;
        renderRankedSuppliers();
    });

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
        btnVatNo.className = "px-2.5 py-1 rounded-lg text-[11px] sm:text-xs font-bold bg-tractorPrimary text-white shadow";
        btnVatYes.className = "px-2.5 py-1 rounded-lg text-[11px] sm:text-xs font-bold text-slate-300 hover:text-white";
        renderRankedSuppliers();
    };

    btnVatYes.onclick = () => {
        dieselState.includeVat = true;
        btnVatYes.className = "px-2.5 py-1 rounded-lg text-[11px] sm:text-xs font-bold bg-tractorPrimary text-white shadow";
        btnVatNo.className = "px-2.5 py-1 rounded-lg text-[11px] sm:text-xs font-bold text-slate-300 hover:text-white";
        renderRankedSuppliers();
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
            renderRankedSuppliers();
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
    const defaultId = isLogged && hasGarage ? 'garage' : (hasGarage ? 'garage' : 'gps');

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
                renderRankedSuppliers();
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
                        renderRankedSuppliers();
                    }, () => {
                        currentDieselCoords = { lat: 54.8985, lng: 23.9036, name: "Apytikslė vieta (Lietuva)" };
                        updateLocationDisplay();
                        renderRankedSuppliers();
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
                    renderRankedSuppliers();
                }
            }
        }
    });
}

function updateLocationDisplay() {
    const lbl = document.getElementById('diesel-loc-label');
    if (!lbl) return;

    const timeText = lastDieselUpdatedFormatted 
        ? `<span class="block sm:inline sm:ml-2 text-green-400 font-bold">• 🕒 Kainos: ${lastDieselUpdatedFormatted} (kas 6 val.)</span>`
        : '';

    lbl.innerHTML = `📍 Pristatymas: <strong class="text-green-400 font-bold">${currentDieselCoords.name}</strong>${timeText}`;
}

function listenToDieselFirebase() {
    if (unsubscribeDiesel) unsubscribeDiesel();

    unsubscribeDiesel = db.collection("diesel_prices").onSnapshot((snapshot) => {
        activeDieselSuppliers = [];
        let latestTime = null;

        snapshot.forEach(doc => {
            const data = doc.data();
            activeDieselSuppliers.push(data);

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
        renderRankedSuppliers();
    });
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

// 🌟 IŠKVIENČIAMAS BOTTOM SHEET TIEKĖJUI
function openDieselBottomSheet(item, rankIndex) {
    const sheet = document.getElementById('diesel-supplier-sheet');
    const panel = document.getElementById('diesel-supplier-panel');
    const nameEl = document.getElementById('sheet-diesel-name');
    const rankEl = document.getElementById('sheet-diesel-rank');
    const addressEl = document.getElementById('sheet-diesel-address');
    const bodyEl = document.getElementById('diesel-sheet-body');

    if (!sheet || !bodyEl || !item) return;

    const vatLabel = dieselState.includeVat ? "su PVM" : "be PVM";
    const includeTransport = dieselState.includeTransport;

    if (nameEl) nameEl.textContent = item.name;
    if (rankEl) {
        rankEl.textContent = rankIndex === 0 ? "🥇 1 VIETA" : `#${rankIndex + 1}`;
        rankEl.className = rankIndex === 0 
            ? "bg-tractorPrimary text-white text-[10px] font-black px-2 py-0.5 rounded-full uppercase"
            : "bg-tractorBg border border-tractorBorder text-slate-300 font-mono text-[10px] font-bold px-2 py-0.5 rounded";
    }
    if (addressEl) addressEl.textContent = `📍 Bazė: ${item.depotAddress} (${item.region}) • 🚗 ~${item.distKm} km`;

    bodyEl.innerHTML = `
        <!-- PAGRINDINIS FINANSINIS VERDIKTAS -->
        <div class="bg-myPostBg border-2 border-tractorPrimary rounded-2xl p-4 text-center space-y-1 shadow-lg">
            <span class="text-[10px] text-slate-300 uppercase font-black tracking-wider block">
                ${includeTransport ? 'GALUTINĖ KAINA KIEME' : 'SUMA TERMINALE'} (${vatLabel})
            </span>
            <div class="text-3xl font-black text-green-400 font-mono">
                ${item.totalDeliveredCost.toLocaleString('lt-LT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
            </div>
            <div class="text-xs font-bold text-slate-200">
                Savikaina su atvežimu: <strong class="text-green-400 text-sm font-black">${item.pricePerLiterFinal.toFixed(3)} €/l</strong>
            </div>
        </div>

        <!-- DETALI ĮKAINIŲ SUVESTINĖ -->
        <div class="bg-tractorBg rounded-xl p-3.5 border border-tractorBorder space-y-2 text-xs">
            <div class="flex justify-between items-center border-b border-tractorBorder/60 pb-1.5">
                <span class="text-slate-400">Bazinė kaina terminale:</span>
                <strong class="font-mono text-white">${item.effectiveBasePrice.toFixed(3)} €/l</strong>
            </div>

            ${item.discountPerL > 0 ? `
                <div class="flex justify-between items-center border-b border-tractorBorder/60 pb-1.5">
                    <span class="text-slate-400">Tūrio nuolaida:</span>
                    <strong class="font-mono text-blue-400">-${item.discountPerL.toFixed(3)} €/l</strong>
                </div>
            ` : ''}

            <div class="flex justify-between items-center border-b border-tractorBorder/60 pb-1.5">
                <span class="text-slate-400">Autocisternos atvežimas (${item.distKm} km):</span>
                <strong class="font-mono ${includeTransport ? 'text-amber-400' : 'text-slate-400'}">
                    ${includeTransport ? '+' + item.transportCost.toFixed(2) + ' €' : 'Savivežis (0 €)'}
                </strong>
            </div>

            <div class="flex justify-between items-center pt-0.5 text-slate-300">
                <span>Užsakomas kiekis:</span>
                <strong class="font-mono text-white font-bold">${dieselState.volumeLiters.toLocaleString('lt-LT')} litrų</strong>
            </div>
        </div>

        <!-- SKAMBUČIO MYGTUKAS -->
        ${item.phone ? `
            <div class="pt-1">
                <a href="tel:${item.phone}" class="w-full h-12 bg-tractorPrimary hover:bg-tractorPrimaryHover rounded-xl text-xs sm:text-sm font-bold text-white flex items-center justify-center gap-2 shadow-lg transition">
                    <span>📞</span> <span>Užsakyti / Skambinti tiekėjui (${item.phone})</span>
                </a>
            </div>
        ` : ''}
    `;

    sheet.classList.remove('hidden');
    setTimeout(() => {
        if (panel) panel.classList.remove('translate-y-full');
    }, 15);
}

// 🌟 KOMPAKTIŠKŲ KORTELIŲ SĄRAŠAS
function renderRankedSuppliers() {
    const container = document.getElementById('diesel-results-container');
    if (!container || activeDieselSuppliers.length === 0) return;

    const volume = dieselState.volumeLiters;
    const vatMultiplier = dieselState.includeVat ? 1.21 : 1.0;
    const vatLabel = dieselState.includeVat ? "su PVM" : "be PVM";
    const includeTransport = dieselState.includeTransport;

    lastRankedDieselList = activeDieselSuppliers.map(s => {
        const distKm = Math.round(calculateDist(currentDieselCoords.lat, currentDieselCoords.lng, s.lat, s.lng));

        let discountPerL = 0;
        if (volume >= 20000) discountPerL = s.discounts?.tier20k || -0.035;
        else if (volume >= 10000) discountPerL = s.discounts?.tier10k || -0.025;
        else if (volume >= 5000) discountPerL = s.discounts?.tier5k || -0.015;

        const effectiveBasePriceNoVat = Math.max(0.70, (s.basePriceNoVat || 0.85) + discountPerL);
        const fuelCostNoVat = effectiveBasePriceNoVat * volume;

        let transportCostNoVat = 0;
        if (includeTransport) {
            const transportRate = s.transportRatePerLKm || 0.0014;
            transportCostNoVat = Math.max(80, distKm * transportRate * volume);
        }

        const totalDeliveredNoVat = fuelCostNoVat + transportCostNoVat;
        const totalDeliveredFinal = totalDeliveredNoVat * vatMultiplier;
        const pricePerLiterFinal = totalDeliveredFinal / volume;

        return {
            ...s,
            distKm,
            effectiveBasePrice: effectiveBasePriceNoVat * vatMultiplier,
            discountPerL: Math.abs(discountPerL) * vatMultiplier,
            transportCost: transportCostNoVat * vatMultiplier,
            totalDeliveredCost: totalDeliveredFinal,
            pricePerLiterFinal
        };
    }).sort((a, b) => a.totalDeliveredCost - b.totalDeliveredCost);

    const titlePrefix = includeTransport ? "Pigiausi tiekėjai su atvežimu" : "Kainos terminaluose";

    container.innerHTML = `
        <div class="flex items-center justify-between px-1">
            <h4 class="font-oswald text-base sm:text-lg font-bold uppercase tracking-wider text-white">
                ${titlePrefix} (${volume.toLocaleString('lt-LT')} l • ${vatLabel}):
            </h4>
            <span class="text-[10px] sm:text-xs text-slate-400">Spauskite kortelę užsakymui</span>
        </div>

        <div class="space-y-2">
            ${lastRankedDieselList.map((item, idx) => {
                const isBest = idx === 0;
                return `
                    <div class="diesel-supplier-mini-card p-3 sm:p-3.5 rounded-xl border transition cursor-pointer select-none flex items-center justify-between gap-3 ${
                        isBest 
                        ? 'bg-myPostBg border-tractorPrimary ring-1 ring-tractorPrimary shadow-md' 
                        : 'bg-tractorSurface border-tractorBorder hover:border-slate-400'
                    }" data-index="${idx}">
                        
                        <div class="space-y-1 min-w-0 flex-1">
                            <div class="flex items-center gap-2 flex-wrap leading-tight">
                                ${isBest ? `
                                    <span class="bg-tractorPrimary text-white text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                                        🥇 1 VIETA
                                    </span>
                                ` : `
                                    <span class="text-slate-400 font-mono font-bold text-xs bg-tractorBg px-1.5 py-0.5 rounded border border-tractorBorder">#${idx + 1}</span>
                                `}
                                <h4 class="font-bold text-sm sm:text-base text-white truncate">${item.name}</h4>
                            </div>

                            <div class="flex items-center gap-2 text-[11px] text-slate-300">
                                <span class="truncate">📍 ${item.depotAddress ? item.depotAddress.split(',')[0] : item.region}</span>
                                <span>•</span>
                                <span class="text-green-400 font-bold shrink-0">🚗 ~${item.distKm} km</span>
                            </div>
                        </div>

                        <div class="text-right shrink-0">
                            <div class="text-base sm:text-xl font-black font-mono ${isBest ? 'text-green-400' : 'text-white'} leading-tight">
                                ${item.totalDeliveredCost.toLocaleString('lt-LT', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} €
                            </div>
                            <span class="text-[10px] sm:text-xs font-bold ${isBest ? 'text-green-500' : 'text-slate-400'}">
                                ${item.pricePerLiterFinal.toFixed(3)} €/l ➔
                            </span>
                        </div>

                    </div>
                `;
            }).join('')}
        </div>
    `;

    // Pririšame paspaudimą – atidaro Bottom Sheet
    container.querySelectorAll('.diesel-supplier-mini-card').forEach(card => {
        card.onclick = () => {
            const idx = parseInt(card.getAttribute('data-index'));
            const item = lastRankedDieselList[idx];
            if (item) openDieselBottomSheet(item, idx);
        };
    });
}