// js/grain.js
import { db } from './firebase.js';
import { calculateDist, calculateBuyerRanking } from './grainCalculator.js';

let activeMarketData = [];
let unsubscribeGrain = null;
let userGarageCoords = null;
let currentBrowserCoords = null;

const state = {
    viewMode: 'ranked',
    crop: 'rapeseed',
    weight: 25.0,
    moisture: 17.5,
    impurities: 3.5,
    includeTransport: true,
    transportRatePerTonKm: 0.10,
    locationSource: 'auto'
};

const cropNames = {
    rapeseed: '🌱 Rapsai',
    wheat2: '🌾 Kviečiai (II klasė)',
    wheatExtra: '🌾 Kviečiai (Ekstra)',
    wheatFeed: '🌾 Kviečiai (Pašariniai)',
    barley: '🌾 Miežiai',
    peas: '🫘 Žirniai / Pupos'
};

// 👈 BŪTINAS EXPORT
export function initGrainTab(currentUser, userData) {
    const container = document.getElementById('view-tab-grain');
    if (!container) return;

    if (userData?.garageLat && userData?.garageLon) {
        userGarageCoords = { lat: userData.garageLat, lng: userData.garageLon };
    } else {
        userGarageCoords = null;
    }

    container.innerHTML = `
        <div class="space-y-6 max-w-6xl mx-auto">
            
            <!-- HEADERIS IR LOKACIJOS VALDYMAS -->
            <div class="bg-tractorSurface border border-tractorBorder rounded-2xl p-6 md:p-8 space-y-5 shadow-xl">
                <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-tractorBorder/70 pb-4">
                    <div>
                        <h2 class="font-oswald text-2xl md:text-3xl font-bold uppercase tracking-wider text-white flex items-center gap-2">
                            <span>🌾</span> Grūdų Supirkimo Kainos ir Skaičiuoklė
                        </h2>
                        <p class="text-xs md:text-sm text-slate-300 mt-1" id="location-status-text">
                            ${userGarageCoords ? '📍 Atstumai skaičiuojami nuo jūsų Nustatymuose išsaugotos ūkio vietos.' : '📍 Atstumai skaičiuojami pagal jūsų dabartinę vietą.'}
                        </p>
                    </div>

                    <!-- LOKACIJOS PARINKIMO MYGTUKAI -->
                    <div class="flex flex-wrap gap-2">
                        ${userGarageCoords ? `
                            <button id="btn-loc-garage" class="px-3.5 py-2 bg-tractorPrimary text-white text-xs font-bold rounded-xl border border-tractorPrimary flex items-center gap-1.5 transition">
                                🏠 Ūkio vieta
                            </button>
                        ` : ''}
                        <button id="btn-loc-gps" class="px-3.5 py-2 bg-tractorBg hover:bg-zinc-800 text-slate-200 text-xs font-bold rounded-xl border border-tractorBorder flex items-center gap-1.5 transition">
                            📡 Nustatyti dabartinę GPS vietą
                        </button>
                    </div>
                </div>

                <!-- KROVINIO FORMA -->
                <div class="space-y-4">
                    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <h3 class="font-oswald text-lg font-bold text-white uppercase tracking-wider">
                            Jūsų krovinio parametrai
                        </h3>
                        <label class="flex items-center gap-2.5 cursor-pointer text-xs md:text-sm font-bold text-white select-none bg-tractorBg px-4 py-2 rounded-xl border border-tractorBorder hover:border-tractorPrimary transition">
                            <input type="checkbox" id="opt-transport-toggle" class="accent-tractorPrimary w-4 h-4 cursor-pointer" ${state.includeTransport ? 'checked' : ''}>
                            <span>Įskaičiuoti samdomą transportą (~0.10 €/t/km)</span>
                        </label>
                    </div>

                    <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                        <div class="space-y-1.5">
                            <label class="text-xs font-bold text-tractorPrimaryLight uppercase tracking-wider">Kultūra</label>
                            <select id="opt-crop" class="w-full h-12 bg-tractorBg border border-tractorPrimary/70 focus:border-tractorPrimary rounded-xl px-3 text-sm text-white font-bold outline-none cursor-pointer">
                                <option value="rapeseed" ${state.crop === 'rapeseed' ? 'selected' : ''}>🌱 Rapsai</option>
                                <option value="wheat2" ${state.crop === 'wheat2' ? 'selected' : ''}>🌾 Kviečiai (II klasė)</option>
                                <option value="wheatExtra" ${state.crop === 'wheatExtra' ? 'selected' : ''}>🌾 Kviečiai (Ekstra)</option>
                                <option value="wheatFeed" ${state.crop === 'wheatFeed' ? 'selected' : ''}>🌾 Kviečiai (Pašariniai)</option>
                                <option value="barley" ${state.crop === 'barley' ? 'selected' : ''}>🌾 Miežiai</option>
                                <option value="peas" ${state.crop === 'peas' ? 'selected' : ''}>🫘 Žirniai / Pupos</option>
                            </select>
                        </div>

                        <div class="space-y-1.5">
                            <label class="text-xs font-bold text-slate-200 uppercase tracking-wider">Krovinio svoris (t)</label>
                            <input id="opt-weight" type="number" step="0.5" value="${state.weight}" 
                                class="w-full h-12 bg-tractorBg border border-tractorBorder focus:border-tractorPrimary rounded-xl px-4 text-sm text-white font-bold outline-none">
                        </div>

                        <div class="space-y-1.5">
                            <label class="text-xs font-bold text-slate-200 uppercase tracking-wider">Faktinė drėgmė (%)</label>
                            <input id="opt-moisture" type="number" step="0.1" value="${state.moisture}" 
                                class="w-full h-12 bg-tractorBg border border-tractorBorder focus:border-tractorPrimary rounded-xl px-4 text-sm text-white font-bold outline-none">
                        </div>

                        <div class="space-y-1.5">
                            <label class="text-xs font-bold text-slate-200 uppercase tracking-wider">Šiukšlingumas (%)</label>
                            <input id="opt-impurities" type="number" step="0.1" value="${state.impurities}" 
                                class="w-full h-12 bg-tractorBg border border-tractorBorder focus:border-tractorPrimary rounded-xl px-4 text-sm text-white font-bold outline-none">
                        </div>
                    </div>
                </div>
            </div>

            <!-- REŽIMŲ PERJUNGĖJAS -->
            <div class="flex bg-tractorSurface p-1.5 rounded-xl border border-tractorBorder w-fit">
                <button id="btn-mode-ranked" class="px-5 py-2.5 text-xs font-bold rounded-lg transition flex items-center gap-2 ${state.viewMode === 'ranked' ? 'bg-tractorPrimary text-white shadow' : 'text-slate-300 hover:text-white'}">
                    <span>🥇</span> Kur vežti apsimoka?
                </button>
                <button id="btn-mode-table" class="px-5 py-2.5 text-xs font-bold rounded-lg transition flex items-center gap-2 ${state.viewMode === 'table' ? 'bg-tractorPrimary text-white shadow' : 'text-slate-300 hover:text-white'}">
                    <span>🏢</span> Visi elevatoriai pagal atstumą
                </button>
            </div>

            <!-- 1 REŽIMAS: SKAIČIUOKLĖ IR REITINGAS -->
            <div id="view-ranked-container" class="space-y-4 ${state.viewMode === 'ranked' ? '' : 'hidden'}">
                <div class="flex items-center justify-between px-2">
                    <h3 class="font-oswald text-xl font-bold uppercase tracking-wider text-white">
                        Pelningiausi elevatoriai jūsų kroviniui (<span id="selected-crop-label" class="text-tractorPrimaryLight">${cropNames[state.crop]}</span>)
                    </h3>
                    <span class="text-xs font-medium text-slate-300">Rikiuojama pagal grynąjį pelną</span>
                </div>
                <div id="ranked-buyers-list" class="space-y-4"></div>
            </div>

            <!-- 2 REŽIMAS: VISI ELEVATORIAI -->
            <div id="view-table-container" class="space-y-4 ${state.viewMode === 'table' ? '' : 'hidden'}">
                <div id="elevators-cards-grid" class="grid grid-cols-1 md:grid-cols-2 gap-4"></div>
            </div>

        </div>
    `;

    document.getElementById('btn-loc-gps')?.addEventListener('click', () => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition((pos) => {
                currentBrowserCoords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
                state.locationSource = 'current';
                document.getElementById('location-status-text').textContent = "📍 Atstumai skaičiuojami pagal jūsų dabartinę GPS vietą.";
                renderRankedBuyers();
                renderElevatorsCards();
            }, () => {
                alert("Nepavyko nustatyti GPS vietos.");
            });
        }
    });

    document.getElementById('btn-loc-garage')?.addEventListener('click', () => {
        state.locationSource = 'garage';
        document.getElementById('location-status-text').textContent = "📍 Atstumai skaičiuojami nuo jūsų Nustatymuose išsaugotos ūkio vietos.";
        renderRankedBuyers();
        renderElevatorsCards();
    });

    const btnRanked = document.getElementById('btn-mode-ranked');
    const btnTable = document.getElementById('btn-mode-table');
    const rankedView = document.getElementById('view-ranked-container');
    const tableView = document.getElementById('view-table-container');

    btnRanked.onclick = () => {
        state.viewMode = 'ranked';
        btnRanked.className = "px-5 py-2.5 text-xs font-bold rounded-lg transition flex items-center gap-2 bg-tractorPrimary text-white shadow";
        btnTable.className = "px-5 py-2.5 text-xs font-bold rounded-lg transition flex items-center gap-2 text-slate-300 hover:text-white";
        rankedView.classList.remove('hidden');
        tableView.classList.add('hidden');
        renderRankedBuyers();
    };

    btnTable.onclick = () => {
        state.viewMode = 'table';
        btnTable.className = "px-5 py-2.5 text-xs font-bold rounded-lg transition flex items-center gap-2 bg-tractorPrimary text-white shadow";
        btnRanked.className = "px-5 py-2.5 text-xs font-bold rounded-lg transition flex items-center gap-2 text-slate-300 hover:text-white";
        tableView.classList.remove('hidden');
        rankedView.classList.add('hidden');
        renderElevatorsCards();
    };

    document.getElementById('opt-crop').addEventListener('change', (e) => {
        state.crop = e.target.value;
        document.getElementById('selected-crop-label').textContent = cropNames[state.crop];
        renderRankedBuyers();
    });

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

    listenToGrainPrices();
}

function getActiveCoords() {
    if (state.locationSource === 'current' && currentBrowserCoords) return currentBrowserCoords;
    if (userGarageCoords) return userGarageCoords;
    return currentBrowserCoords;
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

        const statusEl = document.getElementById('location-status-text');
        if (statusEl && latestTimestamp) {
            const formattedTime = latestTimestamp.toLocaleString('lt-LT', {
                year: 'numeric', month: '2-digit', day: '2-digit',
                hour: '2-digit', minute: '2-digit'
            });
            const locText = userGarageCoords 
                ? '📍 Atstumai skaičiuojami nuo jūsų ūkio vietos.' 
                : '📍 Atstumai skaičiuojami pagal jūsų dabartinę vietą.';

            statusEl.innerHTML = `${locText} <span class="block sm:inline sm:ml-2 text-green-400 font-bold">• 🕒 Atnaujinta: ${formattedTime} (kas 6 val.)</span>`;
        }

        renderRankedBuyers();
        renderElevatorsCards();
    });
}

function renderRankedBuyers() {
    const listContainer = document.getElementById('ranked-buyers-list');
    if (!listContainer || activeMarketData.length === 0) return;

    const coords = getActiveCoords();
    const calculatedList = calculateBuyerRanking(activeMarketData, state, coords);

    if (calculatedList.length === 0) {
        listContainer.innerHTML = `<div class="bg-tractorSurface p-8 rounded-2xl text-center text-slate-300 text-sm">Šiuo metu nė vienas elevatorius nepriima pasirinktos kultūros.</div>`;
        return;
    }

    listContainer.innerHTML = calculatedList.map((item, index) => {
        const isBest = index === 0;

        return `
            <div class="p-6 rounded-2xl border transition ${
                isBest 
                ? 'bg-myPostBg border-tractorPrimary shadow-2xl shadow-tractorPrimary/15 ring-1 ring-tractorPrimary' 
                : 'bg-tractorSurface border-tractorBorder hover:border-slate-500'
            }">
                <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
                    <div class="space-y-2.5 flex-1">
                        <div class="flex flex-wrap items-center gap-2.5">
                            ${isBest ? `
                                <span class="bg-tractorPrimary text-white text-xs font-black px-3 py-1 rounded-full uppercase tracking-wider flex items-center gap-1.5 shadow">
                                    🥇 1 VIETA – PELNINGIAUSIA
                                </span>
                            ` : `
                                <span class="text-slate-400 font-mono font-bold text-sm bg-tractorBg px-2 py-0.5 rounded-lg border border-tractorBorder">#${index + 1}</span>
                            `}
                            <h4 class="text-lg md:text-xl font-bold text-white tracking-wide">${item.buyer}</h4>
                        </div>
                        
                        <p class="text-sm text-slate-200 font-medium flex items-center gap-1.5">
                            <span class="text-red-400">📍</span> ${item.address || item.location || ''}
                        </p>
                        
                        <div class="flex flex-wrap gap-2 text-xs pt-0.5">
                            ${item.distKm > 0 ? `
                                <span class="bg-tractorBg px-3 py-1 rounded-lg text-green-400 font-bold border border-tractorBorder flex items-center gap-1">
                                    🚗 ~${item.distKm} km nuo jūsų vietos
                                </span>
                            ` : ''}
                            ${item.transportCost > 0 ? `
                                <span class="bg-tractorBg px-3 py-1 rounded-lg text-amber-300 font-bold border border-tractorBorder">
                                    ⛽ Transportas: -${item.transportCost.toFixed(2)} €
                                </span>
                            ` : ''}
                            <span class="bg-tractorBg px-3 py-1 rounded-lg text-slate-200 font-medium border border-tractorBorder">
                                🕒 ${item.workingHours || '07:00 - 22:00'}
                            </span>
                        </div>

                        <div class="text-xs md:text-sm text-slate-300 pt-1 flex flex-wrap gap-x-3 gap-y-1">
                            <span>Bazinė kaina: <strong class="text-white font-bold">${item.basePrice} €/t</strong></span>
                            <span>•</span>
                            <span>Džiovinimas: <strong class="text-amber-300 font-bold">${item.dryingCost} €/%</strong></span>
                            <span>•</span>
                            <span>Nuoskaitos: <strong class="text-red-300 font-bold">-${item.weightLossTons.toFixed(2)} t (-${item.totalElevatorFees.toFixed(2)} €)</strong></span>
                        </div>
                    </div>

                    <div class="flex flex-col lg:items-end justify-between gap-4 border-t lg:border-t-0 border-tractorBorder/80 pt-4 lg:pt-0 shrink-0">
                        <div class="text-left lg:text-right space-y-1.5">
                            <div>
                                <div class="text-xs text-slate-300 uppercase font-extrabold tracking-wider">
                                    ${state.includeTransport ? 'PELNAS Į KIŠENĘ (SU TRANSPORTO ĮVERTINIMU)' : 'GRYNASIS IŠMOKĖJIMAS'}
                                </div>
                                <div class="text-3xl md:text-4xl font-black ${isBest ? 'text-green-400' : 'text-white'} font-mono tracking-tight">
                                    ${item.finalPocketProfit.toLocaleString('lt-LT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                                </div>
                                <div class="text-xs font-bold text-slate-300 mt-0.5">
                                    Faktinė kaina: <strong class="${isBest ? 'text-green-400' : 'text-white'} text-sm font-black">${item.effectivePriceWithTransport.toFixed(2)} €/t</strong>
                                </div>
                            </div>

                            ${state.includeTransport && item.transportCost > 0 ? `
                                <div class="mt-2 bg-tractorBg/90 border border-tractorBorder p-2.5 rounded-xl text-xs md:text-sm text-slate-200">
                                    <span class="text-slate-400">Išmokėjimas elevatoriuje (be transporto):</span><br>
                                    <strong class="text-white font-mono text-base font-bold">${item.elevatorPayoutNoTransport.toLocaleString('lt-LT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</strong>
                                    <span class="text-xs font-semibold text-slate-300">(${item.effectivePriceNoTransport.toFixed(2)} €/t)</span>
                                </div>
                            ` : ''}
                        </div>

                        <div class="flex items-center gap-3 w-full lg:w-auto">
                            ${item.phone ? `
                                <a href="tel:${item.phone}" class="flex-1 lg:flex-none px-4 py-2.5 bg-tractorBg hover:bg-zinc-800 border border-tractorBorder rounded-xl text-xs font-bold text-white flex items-center justify-center gap-1.5 transition">
                                    📞 Skambinti
                                </a>
                            ` : ''}
                            ${item.lat && item.lng ? `
                                <a href="https://www.google.com/maps/dir/?api=1&destination=${item.lat},${item.lng}" target="_blank" class="flex-1 lg:flex-none px-4 py-2.5 bg-tractorPrimary hover:bg-tractorPrimaryHover rounded-xl text-xs font-bold text-white flex items-center justify-center gap-1.5 shadow-lg shadow-tractorPrimary/20 transition">
                                    🗺️ Naviguoti
                                </a>
                            ` : ''}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function renderElevatorsCards() {
    const grid = document.getElementById('elevators-cards-grid');
    if (!grid || activeMarketData.length === 0) return;

    const coords = getActiveCoords();
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
        <div class="bg-tractorBg border border-tractorBorder hover:border-slate-500 rounded-2xl p-6 space-y-4 flex flex-col justify-between transition">
            <div class="space-y-3">
                <div class="flex justify-between items-start gap-2">
                    <div>
                        <span class="text-xs text-slate-400 font-mono font-bold">#${idx + 1}</span>
                        <h4 class="font-bold text-white text-base inline ml-1">${item.buyer}</h4>
                    </div>
                    ${item.distKm !== null ? `
                        <span class="text-xs bg-tractorPrimary/20 text-tractorPrimaryLight border border-tractorPrimary/40 px-3 py-1 rounded-lg font-bold shrink-0">
                            🚗 ~${item.distKm} km
                        </span>
                    ` : ''}
                </div>
                
                <p class="text-xs md:text-sm text-slate-200 font-medium">📍 ${item.address || item.location || ''}</p>
                <p class="text-xs text-slate-300">🕒 <strong class="text-white">Darbo laikas:</strong> ${item.workingHours || '07:00 - 22:00'}</p>
                
                <div class="bg-tractorSurface p-4 rounded-xl border border-tractorBorder/70 space-y-2.5">
                    <div class="text-xs font-bold text-slate-300 uppercase border-b border-tractorBorder/60 pb-1.5 flex justify-between">
                        <span>Kultūra</span>
                        <span>Bazinė kaina (€/t)</span>
                    </div>
                    <div class="grid grid-cols-2 gap-x-4 gap-y-2 text-xs md:text-sm">
                        <div class="flex justify-between">
                            <span class="text-green-400 font-bold">🌱 Rapsai:</span>
                            <strong class="text-green-400 font-black">${item.prices?.rapeseed ? item.prices.rapeseed + ' €' : '-'}</strong>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-slate-200 font-medium">🌾 Kviečiai II:</span>
                            <strong class="text-white font-bold">${item.prices?.wheat2 ? item.prices.wheat2 + ' €' : '-'}</strong>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-slate-300">🌾 Kviečiai Ekstra:</span>
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
                            <span class="text-slate-200 font-medium">🫘 Žirniai/Pupos:</span>
                            <strong class="text-white font-bold">${item.prices?.peas ? item.prices.peas + ' €' : '-'}</strong>
                        </div>
                    </div>
                    
                    <div class="border-t border-tractorBorder/60 pt-2 flex justify-between text-xs font-semibold text-amber-300">
                        <span>Džiovinimas: <strong>${item.dryingCost} €/%</strong></span>
                        <span class="text-slate-300">Valymas: <strong>${item.cleaningCost} €/%</strong></span>
                    </div>
                </div>
            </div>

            <div class="flex gap-3 pt-2">
                ${item.phone ? `
                    <a href="tel:${item.phone}" class="flex-1 py-2.5 bg-tractorSurface hover:bg-zinc-800 border border-tractorBorder rounded-xl text-xs font-bold text-white text-center flex items-center justify-center gap-1.5 transition">
                        📞 Dispečeris
                    </a>
                ` : ''}
                ${item.lat && item.lng ? `
                    <a href="https://www.google.com/maps/dir/?api=1&destination=${item.lat},${item.lng}" target="_blank" class="flex-1 py-2.5 bg-tractorPrimary hover:bg-tractorPrimaryHover rounded-xl text-xs font-bold text-white text-center flex items-center justify-center gap-1.5 shadow-md transition">
                        🗺️ Maršrutas (${item.distKm !== null ? item.distKm + ' km' : 'Maps'})
                    </a>
                ` : ''}
            </div>
        </div>
    `).join('');
}