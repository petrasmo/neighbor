// js/skaiciuokles/storageCalculator.js
import { db, auth } from '../core/firebase.js';

let activeTab = 'econ'; // 'econ' arba 'vent'
let storageTypeMode = 'own'; // 'own' arba 'elevator'
let cachedWeatherData = null;
let cachedUserData = null;

// ASABE Chung-Pfost termodinaminiai koeficientai grūdų EMC skaičiavimui
const CROP_EMC_PARAMS = {
    wheat: { name: "Kviečiai (Milling Wheat)", icon: "🌾", A: 512.4, B: 30.0, C: 0.25, safeMoisture: 14.0 },
    rapeseed: { name: "Rapsai (Rapeseed)", icon: "🌱", A: 398.2, B: 25.0, C: 0.38, safeMoisture: 9.0 },
    barley: { name: "Miežiai (Barley)", icon: "🌾", A: 480.0, B: 28.0, C: 0.24, safeMoisture: 14.0 },
    peas: { name: "Žirniai / Pupos", icon: "🫘", A: 450.0, B: 25.0, C: 0.23, safeMoisture: 15.0 },
    corn: { name: "Kukurūzai (Corn)", icon: "🌽", A: 540.0, B: 30.0, C: 0.24, safeMoisture: 14.5 }
};

export async function renderStorageCalculator(container, currentUser, userData) {
    if (!container) return;

    // 🌟 Paimame šviežius vartotojo duomenis tiesiai iš bazės (kaip Agro-Oruose)
    let activeUserData = userData;
    const realAuthUser = currentUser || auth.currentUser;

    if (realAuthUser) {
        try {
            const userDoc = await db.collection("users").doc(realAuthUser.uid).get();
            if (userDoc.exists) {
                activeUserData = userDoc.data();
            }
        } catch (err) {
            console.warn("Klaida skaitant vartotojo duomenis:", err);
        }
    }
    cachedUserData = activeUserData;

    const hasGarage = !!(activeUserData?.garageLat && activeUserData?.garageLon && activeUserData.garageLat !== 0);
    const locText = hasGarage 
        ? `🏠 Mano ūkio bazė (garažas) (${parseFloat(activeUserData.garageLat).toFixed(4)}, ${parseFloat(activeUserData.garageLon).toFixed(4)})`
        : `📍 Apytikslė vieta (Lietuva)`;

    container.innerHTML = `
        <div class="space-y-6">
            
            <!-- PAGRINDINIS LANGAS -->
            <div class="bg-tractorSurface border border-tractorBorder rounded-2xl p-6 md:p-8 space-y-6 shadow-xl">
                
                <!-- HEADERIS IR TABŲ PERJUNGIKLIS -->
                <div class="border-b border-tractorBorder/70 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div class="space-y-1">
                        <div class="inline-flex items-center gap-1.5 bg-amber-500/15 border border-amber-500/30 text-amber-500 text-xs px-3 py-1 rounded-full font-bold uppercase tracking-wider">
                            <span>🌾</span> Sandėliavimo ir Bokštų Valdymo Centras
                        </div>
                        <h3 class="font-oswald text-xl md:text-2xl font-bold uppercase tracking-wider text-white" id="storage-main-title">
                            Grūdų Sandėliavimas: Ekonomika ir Protingas Ventiliavimas
                        </h3>
                    </div>

                    <!-- 2 TABAI VIRŠUJE -->
                    <div class="flex items-center gap-1.5 bg-tractorBg p-1.5 rounded-2xl border border-tractorBorder shrink-0">
                        <button type="button" id="tab-storage-econ" class="px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${activeTab === 'econ' ? 'bg-tractorPrimary text-white shadow' : 'text-slate-400 hover:text-white'}">
                            💰 Ekonomika: Laikyti ar Parduoti?
                        </button>
                        <button type="button" id="tab-storage-vent" class="px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${activeTab === 'vent' ? 'bg-tractorPrimary text-white shadow' : 'text-slate-400 hover:text-white'}">
                            🌬️ Ventiliavimo asistentas (EMC)
                        </button>
                    </div>
                </div>

                <!-- 1 TABAS: EKONOMIKA („LAIKYTI AR PARDUOTI?“) -->
                <div id="view-storage-econ" class="space-y-6 ${activeTab === 'econ' ? '' : 'hidden'}">
                    
                    <div class="flex justify-between items-center bg-tractorBg p-3 rounded-xl border border-tractorBorder">
                        <span class="text-xs text-slate-300 font-semibold" style="color: var(--text-main);">Pasirinkite saugojimo tipą:</span>
                        <div class="flex items-center gap-1 bg-tractorSurface p-1 rounded-lg border border-tractorBorder">
                            <button type="button" id="btn-storage-own" class="px-3 py-1 rounded-md text-xs font-bold transition cursor-pointer ${storageTypeMode === 'own' ? 'bg-tractorPrimary text-white' : 'text-slate-400 hover:text-white'}">
                                🏠 Nuosavas bokštas / angaras
                            </button>
                            <button type="button" id="btn-storage-elevator" class="px-3 py-1 rounded-md text-xs font-bold transition cursor-pointer ${storageTypeMode === 'elevator' ? 'bg-tractorPrimary text-white' : 'text-slate-400 hover:text-white'}">
                                🏢 Samdomas elevatorius
                            </button>
                        </div>
                    </div>

                    <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                        <div class="space-y-1.5">
                            <label class="text-xs font-bold text-tractorPrimaryLight uppercase tracking-wider">Grūdų kiekis (t)</label>
                            <input id="store-weight" type="number" step="10" value="200" 
                                class="w-full h-12 bg-tractorBg border border-tractorBorder focus:border-tractorPrimary rounded-xl px-4 text-base font-bold font-mono outline-none" style="color: var(--text-main);">
                        </div>

                        <div class="space-y-1.5">
                            <label class="text-xs font-bold text-slate-300 uppercase tracking-wider" style="color: var(--text-main);">Kaina šiandien (€/t)</label>
                            <input id="store-price-now" type="number" step="1" value="225" 
                                class="w-full h-12 bg-tractorBg border border-tractorBorder focus:border-tractorPrimary rounded-xl px-4 text-base font-bold font-mono text-green-500 outline-none">
                        </div>

                        <div class="space-y-1.5">
                            <label class="text-xs font-bold text-slate-300 uppercase tracking-wider" style="color: var(--text-main);">Tikėtina kaina pavasarį (€/t)</label>
                            <input id="store-price-future" type="number" step="1" value="240" 
                                class="w-full h-12 bg-tractorBg border border-tractorBorder focus:border-tractorPrimary rounded-xl px-4 text-base font-bold font-mono text-amber-500 outline-none">
                        </div>

                        <div class="space-y-1.5">
                            <label class="text-xs font-bold text-slate-300 uppercase tracking-wider" style="color: var(--text-main);">Planuojama laikyti (mėn.)</label>
                            <input id="store-months" type="number" min="1" max="12" value="4" 
                                class="w-full h-12 bg-tractorBg border border-tractorBorder focus:border-tractorPrimary rounded-xl px-4 text-base font-bold font-mono outline-none" style="color: var(--text-main);">
                        </div>
                    </div>

                    <div class="bg-tractorBg/90 border border-tractorBorder p-5 rounded-2xl space-y-4">
                        <span class="text-xs font-bold uppercase tracking-wider block border-b border-tractorBorder/60 pb-2" style="color: var(--text-main);">
                            🌾 Paslėptos sąnaudos ir kapitalo kaina:
                        </span>

                        <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                            <div id="box-param-electric" class="space-y-1 ${storageTypeMode === 'own' ? '' : 'hidden'}">
                                <label class="text-slate-400 font-bold block" style="color: var(--text-muted);">⚡ Ventiliavimo elektra (€/t/mėn.)</label>
                                <input id="store-cost-electric" type="number" step="0.05" value="0.45" class="w-full h-10 bg-tractorSurface border border-tractorBorder rounded-xl px-3 font-bold font-mono outline-none" style="color: var(--text-main);">
                            </div>

                            <div id="box-param-elevator" class="space-y-1 ${storageTypeMode === 'elevator' ? '' : 'hidden'}">
                                <label class="text-slate-400 font-bold block" style="color: var(--text-muted);">🏢 Elevatoriaus mokestis (€/t/mėn.)</label>
                                <input id="store-cost-elevator-rate" type="number" step="0.10" value="1.80" class="w-full h-10 bg-tractorSurface border border-tractorBorder rounded-xl px-3 font-bold font-mono text-amber-500 outline-none">
                            </div>

                            <div class="space-y-1">
                                <label class="text-slate-400 font-bold block" style="color: var(--text-muted);">📉 Svorio netektis (% per mėn.)</label>
                                <input id="store-shrinkage-rate" type="number" step="0.05" value="0.15" class="w-full h-10 bg-tractorSurface border border-tractorBorder rounded-xl px-3 font-bold font-mono outline-none" style="color: var(--text-main);">
                            </div>

                            <div class="space-y-1">
                                <label class="text-slate-400 font-bold block" style="color: var(--text-muted);">🏦 Kredito palūkanos (%)</label>
                                <input id="store-interest-rate" type="number" step="0.5" value="6.0" class="w-full h-10 bg-tractorSurface border border-tractorBorder rounded-xl px-3 font-bold font-mono outline-none" style="color: var(--text-main);">
                            </div>

                            <div class="space-y-1">
                                <label class="text-slate-400 font-bold block" style="color: var(--text-muted);">🛡️ Priežiūra (€/t/mėn.)</label>
                                <input id="store-cost-labor" type="number" step="0.05" value="0.20" class="w-full h-10 bg-tractorSurface border border-tractorBorder rounded-xl px-3 font-bold font-mono outline-none" style="color: var(--text-main);">
                            </div>
                        </div>
                    </div>

                    <div id="storage-decision-card" class="rounded-2xl p-6 md:p-8 border-2 space-y-4 shadow-2xl transition-all"></div>

                    <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                        <div class="bg-tractorBg border border-tractorBorder p-4 rounded-xl space-y-1">
                            <span class="text-slate-400 uppercase font-bold text-[10px] block" style="color: var(--text-muted);">Saugojimo savikaina (1 t)</span>
                            <strong id="res-monthly-cost-per-ton" class="text-xl font-black font-mono text-amber-500 block">0.00 €/t</strong>
                            <span id="res-total-cost-per-ton" class="text-[10px] text-slate-500 block">Viso periodui: 0.00 €/t</span>
                        </div>

                        <div class="bg-tractorBg border border-tractorBorder p-4 rounded-xl space-y-1">
                            <span class="text-slate-400 uppercase font-bold text-[10px] block" style="color: var(--text-muted);">Nenuostolinga kaina</span>
                            <strong id="res-breakeven-price" class="text-xl font-black font-mono block" style="color: var(--text-main);">0.00 €/t</strong>
                            <span class="text-[10px] text-slate-500 block">Minimali pavasarį</span>
                        </div>

                        <div class="bg-tractorBg border border-tractorBorder p-4 rounded-xl space-y-1">
                            <span class="text-slate-400 uppercase font-bold text-[10px] block" style="color: var(--text-muted);">Svorio nuostolis</span>
                            <strong id="res-lost-weight" class="text-xl font-black font-mono text-red-500 block">0.00 t</strong>
                            <span id="res-lost-weight-money" class="text-[10px] text-slate-500 block">Nuostolis: 0 €</span>
                        </div>

                        <div class="bg-tractorBg border border-tractorBorder p-4 rounded-xl space-y-1">
                            <span class="text-slate-400 uppercase font-bold text-[10px] block" style="color: var(--text-muted);">Apyvartinių lėšų vertė</span>
                            <strong id="res-capital-value-now" class="text-xl font-black font-mono text-green-500 block">0 €</strong>
                            <span id="res-capital-interest-cost" class="text-[10px] text-slate-500 block">Palūkanos: 0 €</span>
                        </div>
                    </div>
                </div>

                <!-- 2 TABAS: PROTINGAS VENTILIAVIMAS (EMC BALANSAS) -->
                <div id="view-storage-vent" class="space-y-6 ${activeTab === 'vent' ? '' : 'hidden'}">
                    
                    <div class="bg-gradient-to-r from-tractorBg to-tractorSurface border border-tractorBorder rounded-2xl p-5 space-y-2">
                        <div class="flex items-center gap-2">
                            <span class="text-2xl">🌬️</span>
                            <h4 class="font-bold text-base" style="color: var(--text-main);">Kaip veikia EMC ventiliavimo taisyklė?</h4>
                        </div>
                        <p class="text-xs leading-relaxed" style="color: var(--text-muted);">
                            Grūdai veikia kaip kempinė: jei pučiamo lauko oro santykinė drėgmė per didelė (naktį kyla rūkas virš 85–90%), ventiliatorius <strong>įpučia drėgmę į bokštą</strong> vietoj to, kad vėsintų. Sistema lygina jūsų grūdų drėgmę su termodinamine pusiausvyra (EMC) ir nurodo saugias valandas.
                        </p>
                    </div>

                    <!-- 🌟 AIŠKI ŪKIO VIETOS INDIKACIJA -->
                    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-tractorBg p-3.5 rounded-xl border border-tractorBorder text-xs">
                        <div class="flex items-center gap-2">
                            <span class="text-base">📍</span>
                            <span style="color: var(--text-main);">
                                Lauko orai ir santykinė drėgmė (RH) imami: <strong class="text-green-600 dark:text-green-400 font-bold" id="vent-location-name">${locText}</strong>
                            </span>
                        </div>
                        <span class="text-[11px] font-semibold" style="color: var(--text-muted);">
                            ${hasGarage ? '✓ Naudojama jūsų ūkio vieta iš Nustatymų' : '⚠️ Garažas nenurodytas (Nustatymuose pažymėkite ūkio bazę)'}
                        </span>
                    </div>

                    <!-- ĮVEDIMO PARAMETRAI -->
                    <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div class="space-y-1.5">
                            <label class="text-xs font-bold text-tractorPrimaryLight uppercase tracking-wider">Laikoma kultūra</label>
                            <select id="vent-crop-select" class="w-full h-12 bg-tractorBg border border-tractorBorder focus:border-tractorPrimary rounded-xl px-3 text-xs font-bold outline-none cursor-pointer" style="color: var(--text-main);">
                                ${Object.entries(CROP_EMC_PARAMS).map(([k, c]) => `
                                    <option value="${k}">${c.icon} ${c.name}</option>
                                `).join('')}
                            </select>
                        </div>

                        <div class="space-y-1.5">
                            <label class="text-xs font-bold uppercase tracking-wider" style="color: var(--text-main);">Faktinė grūdų drėgmė kaupe (%)</label>
                            <input id="vent-grain-moisture" type="number" step="0.1" value="14.2" 
                                class="w-full h-12 bg-tractorBg border border-tractorBorder focus:border-tractorPrimary rounded-xl px-4 text-base font-bold font-mono outline-none" style="color: var(--text-main);">
                        </div>

                        <div class="space-y-1.5">
                            <label class="text-xs font-bold uppercase tracking-wider" style="color: var(--text-main);">Grūdų temperatūra bokšte (°C)</label>
                            <input id="vent-grain-temp" type="number" step="1" value="14" 
                                class="w-full h-12 bg-tractorBg border border-tractorBorder focus:border-tractorPrimary rounded-xl px-4 text-base font-bold font-mono text-amber-500 outline-none">
                        </div>
                    </div>

                    <!-- GYVAS VERDIKTAS ŠIĄ VALANDĄ -->
                    <div id="vent-live-verdict-card" class="p-6 rounded-2xl border-2 space-y-3 shadow-xl transition-all">
                        <div class="text-center py-4 text-slate-400 text-xs">Skaičiuojamos lauko oro sąlygos iš Open-Meteo...</div>
                    </div>

                    <!-- 48 VALANDŲ PROGNOZĖS GRAFIKAS -->
                    <div class="bg-tractorBg border border-tractorBorder rounded-2xl p-5 md:p-6 space-y-4 shadow-lg">
                        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-tractorBorder/70 pb-3">
                            <div>
                                <h4 class="font-oswald text-lg font-bold uppercase tracking-wider flex items-center gap-2" style="color: var(--text-main);">
                                    <span>⏱️</span> Saugios Ventiliavimo Valandos (Artimiausios 48 val.)
                                </h4>
                                <p class="text-xs" style="color: var(--text-muted);">Žalia = vėsina be drėkinimo • Raudona = ventiliatorius įpūs drėgmę (išjungti!)</p>
                            </div>
                            <span class="text-xs font-mono font-bold" id="vent-safe-hours-counter" style="color: #15803D;">...</span>
                        </div>

                        <div id="vent-hourly-grid" class="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
                            <div class="col-span-full py-8 text-center text-slate-500 text-xs">Kraunamas valandinis modelis...</div>
                        </div>
                    </div>

                </div>

            </div>

        </div>
    `;

    setupTabEvents();
    setupEconEvents();
    calculateStorageDecision();

    setupVentEvents(activeUserData);
}

function setupTabEvents() {
    const btnEcon = document.getElementById('tab-storage-econ');
    const btnVent = document.getElementById('tab-storage-vent');
    const viewEcon = document.getElementById('view-storage-econ');
    const viewVent = document.getElementById('view-storage-vent');

    if (btnEcon && btnVent) {
        btnEcon.onclick = () => {
            activeTab = 'econ';
            btnEcon.className = "px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer bg-tractorPrimary text-white shadow";
            btnVent.className = "px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer text-slate-400 hover:text-white";
            viewEcon.classList.remove('hidden');
            viewVent.classList.add('hidden');
        };

        btnVent.onclick = () => {
            activeTab = 'vent';
            btnVent.className = "px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer bg-tractorPrimary text-white shadow";
            btnEcon.className = "px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer text-slate-400 hover:text-white";
            viewVent.classList.remove('hidden');
            viewEcon.classList.add('hidden');
            calculateVentilationDecision();
        };
    }
}

// =========================================================================
// 1 DALIS: EKONOMIKA
// =========================================================================

function setupEconEvents() {
    const btnOwn = document.getElementById('btn-storage-own');
    const btnElevator = document.getElementById('btn-storage-elevator');
    const boxElectric = document.getElementById('box-param-electric');
    const boxElevator = document.getElementById('box-param-elevator');

    if (btnOwn && btnElevator) {
        btnOwn.onclick = () => {
            storageTypeMode = 'own';
            btnOwn.className = "px-3 py-1 rounded-md text-xs font-bold bg-tractorPrimary text-white";
            btnElevator.className = "px-3 py-1 rounded-md text-xs font-bold text-slate-400 hover:text-white";
            boxElectric?.classList.remove('hidden');
            boxElevator?.classList.add('hidden');
            calculateStorageDecision();
        };

        btnElevator.onclick = () => {
            storageTypeMode = 'elevator';
            btnElevator.className = "px-3 py-1 rounded-md text-xs font-bold bg-tractorPrimary text-white";
            btnOwn.className = "px-3 py-1 rounded-md text-xs font-bold text-slate-400 hover:text-white";
            boxElevator?.classList.remove('hidden');
            boxElectric?.classList.add('hidden');
            calculateStorageDecision();
        };
    }

    const inputs = [
        'store-weight', 'store-price-now', 'store-price-future', 'store-months',
        'store-cost-electric', 'store-cost-elevator-rate', 'store-shrinkage-rate',
        'store-interest-rate', 'store-cost-labor'
    ];

    inputs.forEach(id => {
        document.getElementById(id)?.addEventListener('input', calculateStorageDecision);
    });
}

function calculateStorageDecision() {
    const weightTons = parseFloat(document.getElementById('store-weight')?.value) || 0;
    const priceNow = parseFloat(document.getElementById('store-price-now')?.value) || 0;
    const priceFuture = parseFloat(document.getElementById('store-price-future')?.value) || 0;
    const months = parseFloat(document.getElementById('store-months')?.value) || 1;

    const costElectric = parseFloat(document.getElementById('store-cost-electric')?.value) || 0;
    const costElevatorRate = parseFloat(document.getElementById('store-cost-elevator-rate')?.value) || 0;
    const shrinkageMonthly = parseFloat(document.getElementById('store-shrinkage-rate')?.value) || 0;
    const interestYearly = parseFloat(document.getElementById('store-interest-rate')?.value) || 0;
    const costLabor = parseFloat(document.getElementById('store-cost-labor')?.value) || 0;

    const grossValueNow = weightTons * priceNow;
    const totalShrinkagePercent = shrinkageMonthly * months;
    const lostTons = (weightTons * totalShrinkagePercent) / 100;
    const finalTons = Math.max(0, weightTons - lostTons);
    const lostWeightMoney = lostTons * priceFuture;

    let directCostPerTonMonthly = (storageTypeMode === 'own') 
        ? (costElectric + costLabor) 
        : (costElevatorRate + costLabor * 0.5);
    const totalDirectStorageCost = weightTons * directCostPerTonMonthly * months;

    const monthlyInterestRate = (interestYearly / 100) / 12;
    const totalInterestCost = grossValueNow * monthlyInterestRate * months;

    const totalHoldingCost = totalDirectStorageCost + totalInterestCost + lostWeightMoney;
    const holdingCostPerTonAll = weightTons > 0 ? (totalHoldingCost / weightTons) : 0;
    const holdingCostPerTonMonthly = months > 0 ? (holdingCostPerTonAll / months) : 0;
    const breakevenPrice = priceNow + holdingCostPerTonAll;

    const futureGrossRevenue = finalTons * priceFuture;
    const netFutureValue = futureGrossRevenue - totalDirectStorageCost - totalInterestCost;
    const netProfitOrLoss = netFutureValue - grossValueNow;
    const profitPerTon = weightTons > 0 ? (netProfitOrLoss / weightTons) : 0;

    const elMonthCost = document.getElementById('res-monthly-cost-per-ton');
    if (elMonthCost) elMonthCost.textContent = `${holdingCostPerTonMonthly.toFixed(2)} €/t/mėn.`;
    
    const elTotCost = document.getElementById('res-total-cost-per-ton');
    if (elTotCost) elTotCost.textContent = `Viso per ${months} mėn.: ${holdingCostPerTonAll.toFixed(2)} €/t`;

    const elBe = document.getElementById('res-breakeven-price');
    if (elBe) elBe.textContent = `${breakevenPrice.toFixed(2)} €/t`;

    const elLost = document.getElementById('res-lost-weight');
    if (elLost) elLost.textContent = `${lostTons.toFixed(2)} t (${totalShrinkagePercent.toFixed(2)}%)`;

    const elLostM = document.getElementById('res-lost-weight-money');
    if (elLostM) elLostM.textContent = `Nuostolis: -${lostWeightMoney.toFixed(2)} €`;

    const elCap = document.getElementById('res-capital-value-now');
    if (elCap) elCap.textContent = `${grossValueNow.toLocaleString('lt-LT', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} €`;

    const elInt = document.getElementById('res-capital-interest-cost');
    if (elInt) elInt.textContent = `Banko palūkanos: -${totalInterestCost.toFixed(2)} €`;

    const decisionCard = document.getElementById('storage-decision-card');
    if (!decisionCard) return;

    if (netProfitOrLoss > 0) {
        decisionCard.className = "rounded-2xl p-6 md:p-8 border-2 border-green-500 bg-green-950/20 shadow-2xl space-y-3";
        decisionCard.innerHTML = `
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-green-500/40 pb-4">
                <div>
                    <span class="text-xs uppercase font-black tracking-wider text-green-500 block">Ekonominis verdiktas:</span>
                    <h3 class="font-oswald text-2xl md:text-3xl font-black uppercase tracking-wide" style="color: var(--text-main);">
                        🟢 APSIMOKA LAIKYTI! (Tikėtinas papildomas pelnas)
                    </h3>
                </div>
                <div class="text-left sm:text-right">
                    <span class="text-[10px] text-slate-400 uppercase font-bold block" style="color: var(--text-muted);">Grynasis pelnas atmetus visas sąnaudas</span>
                    <strong class="font-mono text-3xl md:text-4xl font-black text-green-500">+${netProfitOrLoss.toLocaleString('lt-LT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</strong>
                    <span class="text-xs font-bold text-green-600 block">(+${profitPerTon.toFixed(2)} € už kiekvieną toną)</span>
                </div>
            </div>
            <p class="text-xs md:text-sm leading-relaxed" style="color: var(--text-main);">
                Pavasario kainų šuolis (+${(priceFuture - priceNow).toFixed(2)} €/t) pilnai atperka ventiliaciją, ${totalShrinkagePercent.toFixed(1)}% svorio nusekimą ir ${interestYearly}% banko palūkanas. Nenuostolinga kaina pavasarį yra <strong>${breakevenPrice.toFixed(2)} €/t</strong>.
            </p>
        `;
    } else {
        decisionCard.className = "rounded-2xl p-6 md:p-8 border-2 border-red-500 bg-red-950/30 shadow-2xl space-y-3";
        decisionCard.innerHTML = `
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-red-500/40 pb-4">
                <div>
                    <span class="text-xs uppercase font-black tracking-wider text-red-500 block">Ekonominis verdiktas:</span>
                    <h3 class="font-oswald text-2xl md:text-3xl font-black uppercase tracking-wide" style="color: var(--text-main);">
                        🔴 PARDUOKITE DABAR! (Laikymas atneš nuostolį)
                    </h3>
                </div>
                <div class="text-left sm:text-right">
                    <span class="text-[10px] text-slate-400 uppercase font-bold block" style="color: var(--text-muted);">Nuostolis lyginant su pardavimu šiandien</span>
                    <strong class="font-mono text-3xl md:text-4xl font-black text-red-500">${netProfitOrLoss.toLocaleString('lt-LT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</strong>
                    <span class="text-xs font-bold text-red-600 block">(${profitPerTon.toFixed(2)} €/t praradimas)</span>
                </div>
            </div>
            <p class="text-xs md:text-sm leading-relaxed" style="color: var(--text-main);">
                Laikyti neapsimoka! Elektra, svorio praradimas ir apyvartinių lėšų palūkanos „suvalgo“ kainos skirtumą. Norint uždirbti laikant ${months} mėn., kaina privalo pakilti <strong>bent iki ${breakevenPrice.toFixed(2)} €/t</strong>.
            </p>
        `;
    }
}

// =========================================================================
// 2 DALIS: PROTINGAS VENTILIAVIMAS (EMC BALANSAS)
// =========================================================================

function setupVentEvents(userData) {
    const cropSel = document.getElementById('vent-crop-select');
    const moistInp = document.getElementById('vent-grain-moisture');
    const tempInp = document.getElementById('vent-grain-temp');

    cropSel?.addEventListener('change', () => {
        const cropKey = cropSel.value;
        const preset = CROP_EMC_PARAMS[cropKey];
        if (preset && moistInp) moistInp.value = preset.safeMoisture;
        calculateVentilationDecision();
    });

    moistInp?.addEventListener('input', calculateVentilationDecision);
    tempInp?.addEventListener('input', calculateVentilationDecision);

    fetchHourlyWeatherForVentilation(userData);
}

async function fetchHourlyWeatherForVentilation(userData) {
    let lat = 55.2885, lng = 23.9745;
    
    // 🌟 100% TIKSLUMAS (Lygiai kaip Agro-Oruose): Tikriname šviežius duomenis iš bazės pagal realaus vartotojo UID
    const activeData = userData || cachedUserData;
    const realAuthUser = auth.currentUser;

    if (activeData?.garageLat && activeData?.garageLon && activeData.garageLat !== 0) {
        lat = parseFloat(activeData.garageLat);
        lng = parseFloat(activeData.garageLon);
    } else if (realAuthUser) {
        try {
            const userDoc = await db.collection("users").doc(realAuthUser.uid).get();
            if (userDoc.exists) {
                const d = userDoc.data();
                if (d.garageLat && d.garageLon) {
                    lat = parseFloat(d.garageLat);
                    lng = parseFloat(d.garageLon);
                }
            }
        } catch (e) {}
    }

    try {
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,relative_humidity_2m&hourly=temperature_2m,relative_humidity_2m,dew_point_2m&timezone=Europe%2FVilnius&forecast_days=3`;
        const res = await fetch(url);
        cachedWeatherData = await res.json();
        calculateVentilationDecision();
    } catch (e) {
        console.error("Ventiliacijos orų klaida:", e);
    }
}

/**
 * Apskaičiuoja grūdų pusiausvyrinę drėgmę (EMC) pagal ASABE Chung-Pfost formulę
 */
function calculateEMC(cropKey, airTempC, rhPercent) {
    const params = CROP_EMC_PARAMS[cropKey] || CROP_EMC_PARAMS.wheat;
    const rh = Math.max(0.05, Math.min(0.98, rhPercent / 100));
    const T = airTempC;

    try {
        const term = -((T + params.B) / params.A) * Math.log(rh);
        if (term <= 0) return 14.0;
        const emc = - (1 / params.C) * Math.log(term);
        return Math.max(5.0, Math.min(26.0, emc));
    } catch (e) {
        return 14.0;
    }
}

function calculateVentilationDecision() {
    const card = document.getElementById('vent-live-verdict-card');
    const grid = document.getElementById('vent-hourly-grid');
    const safeCounter = document.getElementById('vent-safe-hours-counter');

    if (!card || !grid || !cachedWeatherData || !cachedWeatherData.hourly) return;

    const cropKey = document.getElementById('vent-crop-select')?.value || 'wheat';
    const grainMoisture = parseFloat(document.getElementById('vent-grain-moisture')?.value) || 14.0;
    const grainTemp = parseFloat(document.getElementById('vent-grain-temp')?.value) || 12.0;

    const curTemp = cachedWeatherData.current?.temperature_2m || 10;
    const curRh = cachedWeatherData.current?.relative_humidity_2m || 75;
    const curEmc = calculateEMC(cropKey, curTemp, curRh);

    const isWetting = curEmc > (grainMoisture + 0.4);
    const isWarming = curTemp > grainTemp;
    const isSafeToCool = curTemp <= (grainTemp - 2) && curEmc <= (grainMoisture + 0.3);
    const isDrying = curEmc < (grainMoisture - 0.4);

    let verdictTitle = "";
    let verdictDesc = "";
    let borderClass = "";
    let bgClass = "";

    if (isWetting) {
        verdictTitle = "🔴 VENTILIUOTI GRIEŽTAI DRAUDŽIAMA (Grūdai sudrėks!)";
        verdictDesc = `Lauko oro drėgmė (${curRh}%) yra per didelė. Pučiamas oras atiduos vandenį grūdams (EMC: ${curEmc.toFixed(1)}% > ${grainMoisture}%). Išjunkite variklį!`;
        borderClass = "border-red-500";
        bgClass = "bg-red-500/10";
    } else if (isWarming) {
        verdictTitle = "🟡 NEEFEKTYVU: LAUKO ORAS ŠILTESNIS UŽ BOKŠTĄ";
        verdictDesc = `Lauke (+${curTemp.toFixed(1)}°C) yra šilčiau nei grūduose (+${grainTemp}°C). Ventiliavimas tik sušildys grūdus ir padidins kaitimo riziką.`;
        borderClass = "border-amber-500";
        bgClass = "bg-amber-500/10";
    } else if (isSafeToCool) {
        verdictTitle = "🟢 ŠIUO METU VENTILIUOTI GALIMA (Optimalus vėsinimas)";
        verdictDesc = `Puikus laikas! Lauko oras (+${curTemp.toFixed(1)}°C) saugiai vėsina grūdus be drėkinimo rizikos (Oro EMC: ${curEmc.toFixed(1)}%).`;
        borderClass = "border-green-500";
        bgClass = "bg-green-500/10";
    } else {
        verdictTitle = "🟢 SĄLYGOS SAUGIOS (Bazinė palaikymo ventiliacija)";
        verdictDesc = `Lauko oras subalansuotas su grūdų mase. Drėgmės pritraukimo pavojaus nėra.`;
        borderClass = "border-green-600";
        bgClass = "bg-tractorSurface";
    }

    card.className = `p-6 rounded-2xl border-2 ${borderClass} ${bgClass} space-y-3 shadow-xl transition-all`;
    card.innerHTML = `
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-tractorBorder/70 pb-3">
            <div class="space-y-1">
                <span class="text-[10px] uppercase font-bold text-tractorPrimaryLight tracking-wider block">Faktinis šios valandos verdiktas</span>
                <h4 class="font-oswald text-xl font-bold tracking-wide" style="color: var(--text-main);">${verdictTitle}</h4>
                <p class="text-xs leading-relaxed" style="color: var(--text-muted);">${verdictDesc}</p>
            </div>
            <div class="text-left sm:text-right shrink-0">
                <span class="text-[10px] uppercase font-bold block" style="color: var(--text-muted);">Oro pusiausvyra (EMC)</span>
                <strong class="font-mono text-2xl font-black ${isWetting ? 'text-red-500' : 'text-green-500'}">${curEmc.toFixed(1)}%</strong>
                <span class="text-[10px] block" style="color: var(--text-muted);">(Bokšte: ${grainMoisture}%)</span>
            </div>
        </div>

        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-1">
            <div class="bg-tractorBg p-2.5 rounded-xl border border-tractorBorder">
                <span class="block text-[10px]" style="color: var(--text-muted);">Lauko temperatūra</span>
                <strong class="font-mono font-bold" style="color: var(--text-main);">${curTemp > 0 ? '+' : ''}${curTemp.toFixed(1)}°C</strong>
            </div>
            <div class="bg-tractorBg p-2.5 rounded-xl border border-tractorBorder">
                <span class="block text-[10px]" style="color: var(--text-muted);">Santykinė drėgmė</span>
                <strong class="font-mono ${curRh > 85 ? 'text-amber-500' : 'text-green-500'} font-bold">${curRh}%</strong>
            </div>
            <div class="bg-tractorBg p-2.5 rounded-xl border border-tractorBorder">
                <span class="block text-[10px]" style="color: var(--text-muted);">Grūdų temperatūra</span>
                <strong class="font-mono font-bold" style="color: var(--text-main);">+${grainTemp}°C</strong>
            </div>
            <div class="bg-tractorBg p-2.5 rounded-xl border border-tractorBorder">
                <span class="block text-[10px]" style="color: var(--text-muted);">Poveikis grūdams</span>
                <strong class="font-bold ${isWetting ? 'text-red-500' : (isSafeToCool ? 'text-green-500' : '')}" style="${!isWetting && !isSafeToCool ? 'color: var(--text-main);' : ''}">
                    ${isWetting ? '💧 Drėkina (+)' : (isDrying ? '☀️ Džiovina (-)' : '❄️ Vėsina')}
                </strong>
            </div>
        </div>
    `;

    // 48 VALANDŲ PROGNOZĖ
    const hourly = cachedWeatherData.hourly;
    const now = new Date();
    let currentHourIdx = 0;

    for (let i = 0; i < hourly.time.length; i++) {
        const d = new Date(hourly.time[i]);
        if (d.getDate() === now.getDate() && d.getHours() === now.getHours()) {
            currentHourIdx = i;
            break;
        }
    }

    const items = [];
    let safeHoursCount = 0;
    const maxIdx = Math.min(hourly.time.length, currentHourIdx + 36);

    for (let i = currentHourIdx; i < maxIdx; i++) {
        const timeStr = hourly.time[i];
        const dateObj = new Date(timeStr);
        const hour = dateObj.getHours();
        const dayName = dateObj.toLocaleDateString('lt-LT', { weekday: 'short' });
        const isNow = i === currentHourIdx;

        const tAir = hourly.temperature_2m[i];
        const rhAir = hourly.relative_humidity_2m[i];
        const emcVal = calculateEMC(cropKey, tAir, rhAir);

        const hWetting = emcVal > (grainMoisture + 0.4);
        const hWarming = tAir > grainTemp;
        const hSafe = !hWetting && !hWarming && tAir <= (grainTemp - 1.5);

        if (hSafe) safeHoursCount++;

        let badge = "";
        let badgeStyle = "";
        if (hWetting) {
            badge = "🔴 Drėkins";
            badgeStyle = "background-color: rgba(239, 68, 68, 0.15); color: #DC2626; border: 1px solid rgba(239, 68, 68, 0.4);";
        } else if (hWarming) {
            badge = "🟡 Šildys";
            badgeStyle = "background-color: rgba(245, 158, 11, 0.15); color: #B45309; border: 1px solid rgba(245, 158, 11, 0.4);";
        } else if (hSafe) {
            badge = "🟢 Vėsina";
            badgeStyle = "background-color: rgba(34, 197, 94, 0.15); color: #15803D; border: 1px solid rgba(34, 197, 94, 0.4);";
        } else {
            badge = "⚪ Saugu";
            badgeStyle = "background-color: rgba(148, 163, 184, 0.15); color: var(--text-main); border: 1px solid rgba(148, 163, 184, 0.4);";
        }

        items.push(`
            <div class="bg-tractorSurface border ${isNow ? 'border-tractorPrimary ring-2 ring-tractorPrimary' : 'border-tractorBorder'} rounded-xl p-2.5 text-center space-y-1.5 flex flex-col justify-between text-xs">
                <div class="border-b border-tractorBorder/60 pb-1">
                    <span class="text-[9px] uppercase block font-bold" style="color: var(--text-muted);">${isNow ? 'DABAR' : dayName}</span>
                    <strong class="text-xs font-mono font-bold block" style="color: var(--text-main);">${String(hour).padStart(2, '0')}:00</strong>
                </div>

                <div class="text-[10px] font-extrabold py-0.5 px-1 rounded" style="${badgeStyle}">
                    ${badge}
                </div>

                <div class="text-[10px] space-y-0.5 pt-0.5">
                    <div class="font-mono font-bold text-xs" style="color: var(--text-main);">${tAir > 0 ? '+' : ''}${Math.round(tAir)}°C</div>
                    <div style="color: var(--text-muted);">RH: ${Math.round(rhAir)}%</div>
                    <div class="text-[10px] font-mono font-bold" style="color: #15803D;">EMC: ${emcVal.toFixed(1)}%</div>
                </div>
            </div>
        `);
    }

    grid.innerHTML = items.join('');
    if (safeCounter) safeCounter.textContent = `Saugių valandų: ${safeHoursCount} iš 36 val.`;
}