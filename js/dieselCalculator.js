// js/dieselCalculator.js
import { db } from './firebase.js';
import { calculateDist } from './grainCalculator.js';
import { createCustomSelect } from './customSelect.js';
import { loginWithGoogle } from './auth.js';
import { switchTab } from './ui.js';
import { refreshSettingsMap } from './settings.js';

let activeDieselSuppliers = [];
let unsubscribeDiesel = null;
let currentDieselCoords = { lat: 54.8985, lng: 23.9036, name: "Apytikslė vieta (Lietuva)" };
let userGarageCoords = null;
let userFieldsList = [];
let lastDieselUpdatedFormatted = null;

const dieselState = {
    volumeLiters: 5000,
    isTonsMode: false,
    includeVat: false,
    includeTransport: true,
    activeQuickVol: 5000
};

function navigateToSettings() {
    if (typeof switchTab === 'function' && document.getElementById('view-tab-settings')) {
        switchTab(6);
        if (typeof refreshSettingsMap === 'function') refreshSettingsMap();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
        window.location.href = 'index.html?tab=6';
    }
}

export function renderDieselCalculator(container, currentUser, userData) {
    if (!container) return;

    const isLogged = !!currentUser;
    const hasGarage = !!(userData?.garageLat && userData?.garageLon);

    if (hasGarage) {
        userGarageCoords = {
            lat: userData.garageLat,
            lng: userData.garageLon,
            name: "Mano ūkio bazė (garažas)"
        };
        currentDieselCoords = userGarageCoords;
    } else {
        userGarageCoords = null;
        currentDieselCoords = { lat: 54.8985, lng: 23.9036, name: "Apytikslė vieta (Lietuva)" };
    }

    container.innerHTML = `
        <div class="space-y-6">
            
            <!-- PAGRINDINĖ PARAMETRŲ FORMA -->
            <div class="bg-tractorSurface border border-tractorBorder rounded-2xl p-6 md:p-8 space-y-6 shadow-xl">
                
                <!-- VIRŠUTINĖ EILUTĖ -->
                <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-tractorBorder/70 pb-5">
                    <div class="space-y-1">
                        <h3 class="font-oswald text-xl md:text-2xl font-bold text-white uppercase tracking-wider flex items-center gap-2">
                            <span>⛽</span> Žymėto Dyzelino (Gazolio) Užsakymo ir Tiekėjų Skaičiuoklė
                        </h3>
                        <p class="text-xs md:text-sm text-slate-300" id="diesel-loc-label">
                            📍 Pristatymo vieta: <strong class="text-green-400 font-bold">${currentDieselCoords.name}</strong>
                        </p>
                    </div>

                    <!-- VALDYMO MYGTUKAI IR VARNELĖ -->
                    <div class="flex flex-wrap items-center gap-3">
                        
                        <!-- 🚚 VARNELĖ: ATVEŽIMO ĮSKAIČIAVIMAS -->
                        <label class="flex items-center gap-2.5 cursor-pointer text-xs md:text-sm font-bold select-none bg-tractorBg px-3.5 py-2 rounded-xl border border-tractorBorder hover:border-tractorPrimary transition">
                            <input type="checkbox" id="diesel-opt-transport" class="accent-tractorPrimary w-4 h-4 cursor-pointer" ${dieselState.includeTransport ? 'checked' : ''}>
                            <span style="color: var(--text-main);">Įskaičiuoti atvežimą į ūkį</span>
                        </label>

                        <!-- PVM PERJUNGIKLIS -->
                        <div class="flex items-center gap-1 bg-tractorBg p-1 rounded-xl border border-tractorBorder">
                            <button type="button" id="btn-vat-no" class="px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${!dieselState.includeVat ? 'bg-tractorPrimary text-white shadow' : 'text-slate-300 hover:text-white'}">Be PVM</button>
                            <button type="button" id="btn-vat-yes" class="px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${dieselState.includeVat ? 'bg-tractorPrimary text-white shadow' : 'text-slate-300 hover:text-white'}">Su PVM (21%)</button>
                        </div>
                    </div>
                </div>

                <!-- 🌟 INTERAKTYVUS BANERIS NEPRISIJUNGUSIEMS ARBA BE ŪKIO BAZĖS -->
                ${!isLogged || !hasGarage ? `
                    <div class="p-5 md:p-6 bg-tractorBg border border-tractorPrimary rounded-2xl shadow-xl space-y-4">
                        <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                            <div class="space-y-1">
                                <div class="flex items-center gap-2">
                                    <span class="text-2xl">${!isLogged ? '💡' : '🏠'}</span>
                                    <h4 class="text-sm md:text-base font-extrabold uppercase tracking-wider text-green-400">
                                        ${!isLogged 
                                            ? 'Norite 100% tikslių skaičiavimų ir kainų savo ūkiui?' 
                                            : 'Liko 1 žingsnis: Nurodykite savo ūkio bazės (garažo) vietą!'}
                                    </h4>
                                </div>
                                <p class="text-xs md:text-sm text-slate-200 leading-relaxed">
                                    ${!isLogged
                                        ? 'Prisijunkite prie sistemos ir pažymėkite savo ūkio bazės (garažo) vietą – tai atrakins tikslius kuro atvežimo skaičiavimus tiesiai į jūsų kiemą:'
                                        : 'Jūs esate prisijungęs, tačiau dar nepažymėjote savo ūkio bazės (garažo) vietos žemėlapyje. Vienas taškas žemėlapyje automatiškai atrakins visą sistemos naudą:'}
                                </p>
                            </div>
                            <button type="button" id="btn-login-diesel-prompt" class="px-5 py-3 bg-tractorPrimary hover:bg-tractorPrimaryHover text-white font-black rounded-xl text-xs md:text-sm uppercase tracking-wider shrink-0 shadow-lg cursor-pointer transition">
                                ${!isLogged ? '🔑 Prisijungti su Google' : '📍 Nurodyti ūkio vietą Nustatymuose ➔'}
                            </button>
                        </div>

                        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-tractorBorder/60 text-xs">
                            <div class="bg-tractorSurface p-3 rounded-xl border border-tractorBorder/70 space-y-1">
                                <strong class="text-amber-400 flex items-center gap-1"><span>⛽</span> Gazolio atvežimas</strong>
                                <p class="text-[11px] text-slate-300">Tiksli autocisternos kaina tiesiai į jūsų kiemą iš 36 bazių.</p>
                            </div>
                            <div class="bg-tractorSurface p-3 rounded-xl border border-tractorBorder/70 space-y-1">
                                <strong class="text-green-400 flex items-center gap-1"><span>🌾</span> Grūdų logistika</strong>
                                <p class="text-[11px] text-slate-300">Transporto kaina iki elevatoriaus ir grynasis pelnas už toną.</p>
                            </div>
                            <div class="bg-tractorSurface p-3 rounded-xl border border-tractorBorder/70 space-y-1">
                                <strong class="text-blue-400 flex items-center gap-1"><span>🌦️</span> Agro-orai ir purškimas</strong>
                                <p class="text-[11px] text-slate-300">Vėjo greitis 2m aukštyje ir lietaus langas jūsų sklypams.</p>
                            </div>
                        </div>
                    </div>
                ` : ''}

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    
                    <!-- KURO KIEKIS -->
                    <div class="space-y-1.5">
                        <div class="flex justify-between items-center">
                            <label class="text-xs font-bold text-tractorPrimaryLight uppercase tracking-wider">Užsakomas kuro kiekis</label>
                            <div class="flex items-center gap-2 text-xs">
                                <button type="button" id="btn-unit-liters" class="${!dieselState.isTonsMode ? 'text-green-400 font-bold underline' : 'text-slate-300 hover:text-white'}">Litrai (l)</button>
                                <span class="text-slate-500">|</span>
                                <button type="button" id="btn-unit-tons" class="${dieselState.isTonsMode ? 'text-green-400 font-bold underline' : 'text-slate-300 hover:text-white'}">Tonos (t)</button>
                            </div>
                        </div>
                        <div class="relative">
                            <input id="diesel-volume-input" type="number" step="500" value="${dieselState.volumeLiters}" 
                                class="w-full h-12 bg-tractorBg border border-tractorBorder focus:border-tractorPrimary rounded-xl px-4 text-base text-white font-mono font-bold outline-none">
                            <span id="diesel-unit-label" class="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">litrų (~4.2 t)</span>
                        </div>
                    </div>

                    <!-- PRISTATYMO VIETA -->
                    <div class="space-y-1.5">
                        <label class="text-xs font-bold text-slate-200 uppercase tracking-wider">Pristatymo adresas</label>
                        <div id="diesel-location-select-box"></div>
                    </div>

                </div>

                <!-- POPULIARŪS TŪRIAI -->
                <div class="flex flex-wrap items-center gap-2 pt-1 border-t border-tractorBorder/50">
                    <span class="text-xs font-bold text-slate-400">Populiarūs tūriai:</span>
                    <button type="button" class="btn-quick-vol px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer border" data-vol="2500">2 500 l</button>
                    <button type="button" class="btn-quick-vol px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer border" data-vol="5000">5 000 l</button>
                    <button type="button" class="btn-quick-vol px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer border" data-vol="10000">10 000 l (Sekcija)</button>
                    <button type="button" class="btn-quick-vol px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer border" data-vol="24000">24 000 l (Cisterna)</button>
                </div>
            </div>

            <!-- REZULTATŲ SUVESTINĖ -->
            <div id="diesel-results-container" class="space-y-4">
                <div class="text-center py-8 text-slate-500 text-xs">Kraunamos kuro bazės ir skaičiuojami atstumai...</div>
            </div>

        </div>
    `;

    setupLocationSelect(currentUser, userData);
    setupEvents(currentUser, userData);
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
            if (!currentUser) {
                loginWithGoogle();
            } else {
                navigateToSettings();
            }
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
        btnTons.className = "text-slate-300 hover:text-white";
        input.value = dieselState.volumeLiters;
        updateVolumeFromInput();
    };

    btnTons.onclick = () => {
        dieselState.isTonsMode = true;
        btnTons.className = "text-green-400 font-bold underline";
        btnLiters.className = "text-slate-300 hover:text-white";
        input.value = (dieselState.volumeLiters / 1190).toFixed(1);
        updateVolumeFromInput();
    };

    btnVatNo.onclick = () => {
        dieselState.includeVat = false;
        btnVatNo.className = "px-3 py-1.5 rounded-lg text-xs font-bold bg-tractorPrimary text-white shadow";
        btnVatYes.className = "px-3 py-1.5 rounded-lg text-xs font-bold text-slate-300 hover:text-white";
        renderRankedSuppliers();
    };

    btnVatYes.onclick = () => {
        dieselState.includeVat = true;
        btnVatYes.className = "px-3 py-1.5 rounded-lg text-xs font-bold bg-tractorPrimary text-white shadow";
        btnVatNo.className = "px-3 py-1.5 rounded-lg text-xs font-bold text-slate-300 hover:text-white";
        renderRankedSuppliers();
    };

    document.querySelectorAll('.btn-quick-vol').forEach(btn => {
        btn.onclick = () => {
            const vol = parseFloat(btn.getAttribute('data-vol'));
            dieselState.isTonsMode = false;
            dieselState.volumeLiters = vol;
            dieselState.activeQuickVol = vol;

            btnLiters.className = "text-green-400 font-bold underline";
            btnTons.className = "text-slate-300 hover:text-white";
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
            btn.className = "btn-quick-vol px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer bg-tractorPrimary text-white border-tractorPrimary shadow-md";
        } else {
            btn.className = "btn-quick-vol px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer bg-tractorBg border-tractorBorder text-slate-300 hover:text-white hover:border-slate-400";
        }
    });
}

function setupLocationSelect(currentUser, userData) {
    const isLogged = !!currentUser;
    const hasGarage = !!(userData?.garageLat && userData?.garageLon);

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
    const hasGarage = !!(userData?.garageLat && userData?.garageLon);
    const defaultId = isLogged && hasGarage ? 'garage' : (hasGarage ? 'garage' : 'gps');

    createCustomSelect({
        containerId: 'diesel-location-select-box',
        placeholder: 'Pasirinkite pristatymo vietą...',
        items: items,
        selectedId: defaultId,
        onSelect: (item) => {
            if (!item) return;

            if (item.id === 'login_prompt') {
                if (!isLogged) {
                    loginWithGoogle();
                } else {
                    navigateToSettings();
                }
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
                        alert("Nepavyko nustatyti GPS. Naudojama apytikslė vieta.");
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
                        name: `Laukas „${chosenField.name}“ (${chosenField.areaHa} ha)`
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
        ? `<span class="block sm:inline sm:ml-2 text-green-400 font-bold">• 🕒 Kainos atnaujintos: ${lastDieselUpdatedFormatted} (kas 6 val.)</span>`
        : '';

    lbl.innerHTML = `📍 Pristatymo vieta: <strong class="text-green-400 font-bold">${currentDieselCoords.name}</strong> (${currentDieselCoords.lat.toFixed(4)}, ${currentDieselCoords.lng.toFixed(4)})${timeText}`;
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

function renderRankedSuppliers() {
    const container = document.getElementById('diesel-results-container');
    if (!container || activeDieselSuppliers.length === 0) return;

    const volume = dieselState.volumeLiters;
    const vatMultiplier = dieselState.includeVat ? 1.21 : 1.0;
    const vatLabel = dieselState.includeVat ? "su PVM" : "be PVM";
    const includeTransport = dieselState.includeTransport;

    const ranked = activeDieselSuppliers.map(s => {
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

    const titlePrefix = includeTransport ? "Pigiausi tiekėjai su atvežimu į kiemą" : "Kuro kainos terminaluose be atvežimo";

    container.innerHTML = `
        <div class="flex items-center justify-between px-1">
            <h4 class="font-oswald text-xl font-bold uppercase tracking-wider text-white">
                ${titlePrefix} (${volume.toLocaleString('lt-LT')} l • ${vatLabel}):
            </h4>
            <span class="text-xs text-slate-400">Rikiuojama pagal mažiausią galutinę sumą</span>
        </div>

        <div class="space-y-4">
            ${ranked.map((item, idx) => {
                const isBest = idx === 0;
                return `
                    <div class="p-6 rounded-2xl border transition ${
                        isBest 
                        ? 'bg-myPostBg border-tractorPrimary shadow-2xl shadow-tractorPrimary/15 ring-1 ring-tractorPrimary' 
                        : 'bg-tractorSurface border-tractorBorder hover:border-slate-500'
                    }">
                        <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
                            <div class="space-y-2 flex-1">
                                <div class="flex flex-wrap items-center gap-2.5">
                                    ${isBest ? `
                                        <span class="bg-tractorPrimary text-white text-xs font-black px-3 py-1 rounded-full uppercase tracking-wider shadow">
                                            🥇 1 VIETA – ${includeTransport ? 'PIGIAUSIA SU ATVEŽIMU' : 'GERIAUSIA KAINA'}
                                        </span>
                                    ` : `
                                        <span class="text-slate-400 font-mono font-bold text-sm bg-tractorBg px-2 py-0.5 rounded-lg border border-tractorBorder">#${idx + 1}</span>
                                    `}
                                    <h4 class="text-lg md:text-xl font-bold text-white tracking-wide">${item.name}</h4>
                                </div>

                                <p class="text-sm text-slate-300 font-medium flex items-center gap-1.5">
                                    <span class="text-red-400">📍</span> Bazė: ${item.depotAddress} (${item.region})
                                </p>

                                <div class="flex flex-wrap gap-2 text-xs pt-0.5">
                                    <span class="bg-tractorBg px-3 py-1 rounded-lg text-green-400 font-bold border border-tractorBorder">
                                        🚗 ~${item.distKm} km nuo pasirinktos vietos
                                    </span>
                                    ${includeTransport ? `
                                        <span class="bg-tractorBg px-3 py-1 rounded-lg text-amber-300 font-bold border border-tractorBorder">
                                            🚛 Pristatymas: +${item.transportCost.toFixed(2)} €
                                        </span>
                                    ` : `
                                        <span class="bg-tractorBg px-3 py-1 rounded-lg text-slate-300 font-bold border border-tractorBorder">
                                            🏢 Kaina bazėje (savivežis)
                                        </span>
                                    `}
                                    ${item.discountPerL > 0 ? `
                                        <span class="bg-tractorBg px-3 py-1 rounded-lg text-blue-400 font-bold border border-tractorBorder">
                                            🎁 Tūrio nuolaida: -${item.discountPerL.toFixed(3)} €/l
                                        </span>
                                    ` : ''}
                                </div>
                            </div>

                            <div class="flex flex-col lg:items-end justify-between gap-4 border-t lg:border-t-0 border-tractorBorder/80 pt-4 lg:pt-0 shrink-0">
                                <div class="text-left lg:text-right space-y-1">
                                    <div class="text-xs text-slate-300 uppercase font-extrabold tracking-wider">
                                        ${includeTransport ? 'GALUTINĖ KAINA KIEME' : 'SUMA TERMINALE'} (${vatLabel})
                                    </div>
                                    <div class="text-3xl md:text-4xl font-black ${isBest ? 'text-green-400' : 'text-white'} font-mono">
                                        ${item.totalDeliveredCost.toLocaleString('lt-LT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                                    </div>
                                    <div class="text-xs font-bold text-slate-300">
                                        ${includeTransport ? 'Savikaina su atvežimu' : 'Kaina už litrą'}: <strong class="${isBest ? 'text-green-400' : 'text-white'} text-sm font-black">${item.pricePerLiterFinal.toFixed(3)} €/l</strong>
                                    </div>
                                </div>

                                <div class="flex items-center gap-3 w-full lg:w-auto">
                                    ${item.phone ? `
                                        <a href="tel:${item.phone}" class="flex-1 lg:flex-none px-4 py-2.5 bg-tractorPrimary hover:bg-tractorPrimaryHover rounded-xl text-xs font-bold text-white flex items-center justify-center gap-1.5 shadow-lg shadow-tractorPrimary/20 transition cursor-pointer">
                                            📞 Užsakyti / Skambinti (${item.phone})
                                        </a>
                                    ` : ''}
                                </div>
                            </div>
                        </div>
                    </div>
                `;
            }).join('')}
        </div>
    `;
}