// js/storageCalculator.js

export function renderStorageCalculator(container) {
    if (!container) return;

    container.innerHTML = `
        <div class="space-y-6">
            
            <!-- PAGRINDINĖ PARAMETRŲ FORMA -->
            <div class="bg-tractorSurface border border-tractorBorder rounded-2xl p-6 md:p-8 space-y-6 shadow-xl">
                <div class="border-b border-tractorBorder/70 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div class="space-y-1">
                        <div class="inline-flex items-center gap-1.5 bg-amber-500/15 border border-amber-500/30 text-amber-500 text-xs px-3 py-1 rounded-full font-bold uppercase tracking-wider">
                            <span>💰</span> Žiemos ekonomika ir pardavimo laikas
                        </div>
                        <h3 class="font-oswald text-xl md:text-2xl font-bold uppercase tracking-wider" style="color: var(--text-main);">
                            „Laikyti ar Parduoti?“ – Grūdų Sandėliavimo Savikaina
                        </h3>
                        <p class="text-xs md:text-sm text-slate-400">
                            Apskaičiuokite ventiliacijos elektrą, džiūvimą ir apyvartinių lėšų palūkanas, kad sužinotumėte, ar apsimoka laukti pavasario kainų šuolio.
                        </p>
                    </div>

                    <!-- SANDĖLIO TIPAS -->
                    <div class="flex items-center gap-1 bg-tractorBg p-1 rounded-xl border border-tractorBorder shrink-0">
                        <button type="button" id="btn-storage-own" class="px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer bg-tractorPrimary text-white shadow">
                            🏠 Nuosavas bokštas / angaras
                        </button>
                        <button type="button" id="btn-storage-elevator" class="px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer text-slate-400 hover:text-white">
                            🏢 Samdomas elevatorius
                        </button>
                    </div>
                </div>

                <!-- 1. KROVINIO IR KAINŲ BAZĖ -->
                <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                    <div class="space-y-1.5">
                        <label class="text-xs font-bold text-tractorPrimaryLight uppercase tracking-wider">Grūdų kiekis sandėlyje (t)</label>
                        <input id="store-weight" type="number" step="10" value="200" 
                            class="w-full h-12 bg-tractorBg border border-tractorBorder focus:border-tractorPrimary rounded-xl px-4 text-base font-bold font-mono outline-none" style="color: var(--text-main);">
                    </div>

                    <div class="space-y-1.5">
                        <label class="text-xs font-bold text-slate-300 uppercase tracking-wider">Dabartinė kaina šiandien (€/t)</label>
                        <input id="store-price-now" type="number" step="1" value="225" 
                            class="w-full h-12 bg-tractorBg border border-tractorBorder focus:border-tractorPrimary rounded-xl px-4 text-base font-bold font-mono outline-none text-green-500">
                    </div>

                    <div class="space-y-1.5">
                        <label class="text-xs font-bold text-slate-300 uppercase tracking-wider">Tikėtina kaina pavasarį (€/t)</label>
                        <input id="store-price-future" type="number" step="1" value="240" 
                            class="w-full h-12 bg-tractorBg border border-tractorBorder focus:border-tractorPrimary rounded-xl px-4 text-base font-bold font-mono outline-none text-amber-500">
                    </div>

                    <div class="space-y-1.5">
                        <label class="text-xs font-bold text-slate-300 uppercase tracking-wider">Planuojama laikyti (mėn.)</label>
                        <input id="store-months" type="number" min="1" max="12" value="4" 
                            class="w-full h-12 bg-tractorBg border border-tractorBorder focus:border-tractorPrimary rounded-xl px-4 text-base font-bold font-mono outline-none" style="color: var(--text-main);">
                    </div>
                </div>

                <!-- 2. PASLĖPTŲ SĄNAUDŲ PARAMETRAI -->
                <div class="bg-tractorBg/90 border border-tractorBorder p-5 rounded-2xl space-y-4">
                    <div class="flex justify-between items-center border-b border-tractorBorder/60 pb-2">
                        <span class="text-xs font-bold text-slate-300 uppercase tracking-wider">🌾 Paslėptos sandėliavimo išlaidos ir kapitalo kaina:</span>
                        <span class="text-[10px] text-slate-500">Galite tikslinti pagal savo ūkio sąlygas</span>
                    </div>

                    <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                        
                        <!-- Elektra (jei nuosavas) -->
                        <div id="box-param-electric" class="space-y-1">
                            <label class="text-slate-400 font-bold block">⚡ Ventiliavimo elektra (€/t/mėn.)</label>
                            <input id="store-cost-electric" type="number" step="0.05" value="0.45" 
                                class="w-full h-10 bg-tractorSurface border border-tractorBorder rounded-xl px-3 font-bold font-mono text-white outline-none">
                        </div>

                        <!-- Elevatoriaus tarifas (jei samdomas) -->
                        <div id="box-param-elevator" class="space-y-1 hidden">
                            <label class="text-slate-400 font-bold block">🏢 Elevatoriaus mokestis (€/t/mėn.)</label>
                            <input id="store-cost-elevator-rate" type="number" step="0.10" value="1.80" 
                                class="w-full h-10 bg-tractorSurface border border-tractorBorder rounded-xl px-3 font-bold font-mono text-amber-400 outline-none">
                        </div>

                        <!-- Svorio nusekimas -->
                        <div class="space-y-1">
                            <label class="text-slate-400 font-bold block">📉 Svorio netektis (% per mėn.)</label>
                            <input id="store-shrinkage-rate" type="number" step="0.05" value="0.15" 
                                class="w-full h-10 bg-tractorSurface border border-tractorBorder rounded-xl px-3 font-bold font-mono text-white outline-none">
                            <span class="text-[10px] text-slate-500 block">Džiūvimas, dulkės (~0.5–1% žiemą)</span>
                        </div>

                        <!-- Banko palūkanos -->
                        <div class="space-y-1">
                            <label class="text-slate-400 font-bold block">🏦 Apyvartinio kredito palūkanos (%)</label>
                            <input id="store-interest-rate" type="number" step="0.5" value="6.0" 
                                class="w-full h-10 bg-tractorSurface border border-tractorBorder rounded-xl px-3 font-bold font-mono text-white outline-none">
                            <span class="text-[10px] text-slate-500 block">„Įšaldytų“ pinigų kaina bankui</span>
                        </div>

                        <!-- Priežiūra / draudimas -->
                        <div class="space-y-1">
                            <label class="text-slate-400 font-bold block">🛡️ Sandėlio priežiūra (€/t/mėn.)</label>
                            <input id="store-cost-labor" type="number" step="0.05" value="0.20" 
                                class="w-full h-10 bg-tractorSurface border border-tractorBorder rounded-xl px-3 font-bold font-mono text-white outline-none">
                            <span class="text-[10px] text-slate-500 block">Draudimas, darbas, apsauga</span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- REZULTATŲ KORTELĖS IR VERDIKTAS -->
            <div id="storage-decision-card" class="rounded-2xl p-6 md:p-8 border-2 space-y-4 shadow-2xl transition-all"></div>

            <!-- 4 METRIKŲ SUVESTINĖ -->
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                <div class="bg-tractorSurface border border-tractorBorder p-5 rounded-2xl space-y-1">
                    <span class="text-slate-400 uppercase font-bold text-[10px] block">Saugojimo savikaina (1 t)</span>
                    <strong id="res-monthly-cost-per-ton" class="text-2xl font-black font-mono text-amber-400 block">0.00 €/t</strong>
                    <span id="res-total-cost-per-ton" class="text-[10px] text-slate-500 block">Viso periodui: 0.00 €/t</span>
                </div>

                <div class="bg-tractorSurface border border-tractorBorder p-5 rounded-2xl space-y-1">
                    <span class="text-slate-400 uppercase font-bold text-[10px] block">Nenuostolinga kaina</span>
                    <strong id="res-breakeven-price" class="text-2xl font-black font-mono text-white block">0.00 €/t</strong>
                    <span class="text-[10px] text-slate-500 block">Minimali kaina pavasarį</span>
                </div>

                <div class="bg-tractorSurface border border-tractorBorder p-5 rounded-2xl space-y-1">
                    <span class="text-slate-400 uppercase font-bold text-[10px] block">Svorio nuostolis</span>
                    <strong id="res-lost-weight" class="text-2xl font-black font-mono text-red-400 block">0.00 t</strong>
                    <span id="res-lost-weight-money" class="text-[10px] text-slate-500 block">Nuostolis pinigais: 0 €</span>
                </div>

                <div class="bg-tractorSurface border border-tractorBorder p-5 rounded-2xl space-y-1">
                    <span class="text-slate-400 uppercase font-bold text-[10px] block">Apyvartinių lėšų vertė</span>
                    <strong id="res-capital-value-now" class="text-2xl font-black font-mono text-green-400 block">0 €</strong>
                    <span id="res-capital-interest-cost" class="text-[10px] text-slate-500 block">Palūkanos: 0 €</span>
                </div>
            </div>

        </div>
    `;

    setupStorageEvents();
    calculateStorageDecision();
}

let storageTypeMode = 'own'; // 'own' arba 'elevator'

function setupStorageEvents() {
    const btnOwn = document.getElementById('btn-storage-own');
    const btnElevator = document.getElementById('btn-storage-elevator');
    const boxElectric = document.getElementById('box-param-electric');
    const boxElevator = document.getElementById('box-param-elevator');

    btnOwn.onclick = () => {
        storageTypeMode = 'own';
        btnOwn.className = "px-3.5 py-1.5 rounded-lg text-xs font-bold bg-tractorPrimary text-white shadow";
        btnElevator.className = "px-3.5 py-1.5 rounded-lg text-xs font-bold text-slate-400 hover:text-white";
        boxElectric.classList.remove('hidden');
        boxElevator.classList.add('hidden');
        calculateStorageDecision();
    };

    btnElevator.onclick = () => {
        storageTypeMode = 'elevator';
        btnElevator.className = "px-3.5 py-1.5 rounded-lg text-xs font-bold bg-tractorPrimary text-white shadow";
        btnOwn.className = "px-3.5 py-1.5 rounded-lg text-xs font-bold text-slate-400 hover:text-white";
        boxElevator.classList.remove('hidden');
        boxElectric.classList.add('hidden');
        calculateStorageDecision();
    };

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

    // 1. Kiek pinigų gautų šiandien
    const grossValueNow = weightTons * priceNow;

    // 2. Svorio nusekimas (džiūvimas)
    const totalShrinkagePercent = shrinkageMonthly * months;
    const lostTons = (weightTons * totalShrinkagePercent) / 100;
    const finalTons = Math.max(0, weightTons - lostTons);
    const lostWeightMoney = lostTons * priceFuture;

    // 3. Tiesioginės saugojimo išlaidos per mėnesį 1 tonai
    let directCostPerTonMonthly = (storageTypeMode === 'own') 
        ? (costElectric + costLabor) 
        : (costElevatorRate + costLabor * 0.5);
    const totalDirectStorageCost = weightTons * directCostPerTonMonthly * months;

    // 4. Apyvartinių lėšų / banko palūkanų kaina
    const monthlyInterestRate = (interestYearly / 100) / 12;
    const totalInterestCost = grossValueNow * monthlyInterestRate * months;

    // 5. Bendra saugojimo savikaina
    const totalHoldingCost = totalDirectStorageCost + totalInterestCost + lostWeightMoney;
    const holdingCostPerTonAll = weightTons > 0 ? (totalHoldingCost / weightTons) : 0;
    const holdingCostPerTonMonthly = months > 0 ? (holdingCostPerTonAll / months) : 0;

    // 6. Nenuostolingumo kaina pavasarį (Breakeven)
    const breakevenPrice = priceNow + holdingCostPerTonAll;

    // 7. Grynasis rezultatas parduodant pavasarį
    const futureGrossRevenue = finalTons * priceFuture;
    const netFutureValue = futureGrossRevenue - totalDirectStorageCost - totalInterestCost;
    const netProfitOrLoss = netFutureValue - grossValueNow;
    const profitPerTon = weightTons > 0 ? (netProfitOrLoss / weightTons) : 0;

    // Atvaizduojame metrikas
    document.getElementById('res-monthly-cost-per-ton').textContent = `${holdingCostPerTonMonthly.toFixed(2)} €/t/mėn.`;
    document.getElementById('res-total-cost-per-ton').textContent = `Viso per ${months} mėn.: ${holdingCostPerTonAll.toFixed(2)} €/t`;
    document.getElementById('res-breakeven-price').textContent = `${breakevenPrice.toFixed(2)} €/t`;
    document.getElementById('res-lost-weight').textContent = `${lostTons.toFixed(2)} t (${totalShrinkagePercent.toFixed(2)}%)`;
    document.getElementById('res-lost-weight-money').textContent = `Nuostolis: -${lostWeightMoney.toFixed(2)} €`;
    document.getElementById('res-capital-value-now').textContent = `${grossValueNow.toLocaleString('lt-LT', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} €`;
    document.getElementById('res-capital-interest-cost').textContent = `Banko palūkanos: -${totalInterestCost.toFixed(2)} €`;

    // 8. VERDIKTAS
    const decisionCard = document.getElementById('storage-decision-card');
    if (!decisionCard) return;

    if (netProfitOrLoss > 0) {
        // 🟢 APSIMOKA LAIKYTI
        decisionCard.className = "rounded-2xl p-6 md:p-8 border-2 border-green-500 bg-green-950/20 shadow-2xl space-y-3";
        decisionCard.innerHTML = `
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-green-500/40 pb-4">
                <div>
                    <span class="text-xs uppercase font-black tracking-wider text-green-400 block">Ekonominis verdiktas:</span>
                    <h3 class="font-oswald text-2xl md:text-3xl font-black text-white uppercase tracking-wide">
                        🟢 APSIMOKA LAIKYTI! (Tikėtinas papildomas pelnas)
                    </h3>
                </div>
                <div class="text-left sm:text-right">
                    <span class="text-[10px] text-slate-400 uppercase font-bold block">Grynasis pelnas atmetus visas sąnaudas</span>
                    <strong class="font-mono text-3xl md:text-4xl font-black text-green-400">+${netProfitOrLoss.toLocaleString('lt-LT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</strong>
                    <span class="text-xs font-bold text-green-300 block">(+${profitPerTon.toFixed(2)} € už kiekvieną toną)</span>
                </div>
            </div>
            <p class="text-xs md:text-sm text-slate-200 leading-relaxed">
                Pavasario kainų šuolis (+${(priceFuture - priceNow).toFixed(2)} €/t) pilnai atperka ventiliaciją, ${totalShrinkagePercent.toFixed(1)}% svorio nusekimą ir ${interestYearly}% banko palūkanas. Kiekvienas saugojimo mėnuo jums kainuoja <strong>${holdingCostPerTonMonthly.toFixed(2)} €/t</strong>. Minimali kaina pavasarį, kad nepatirtumėte nuostolio, yra <strong>${breakevenPrice.toFixed(2)} €/t</strong>.
            </p>
        `;
    } else {
        // 🔴 PARDUOKITE DABAR
        decisionCard.className = "rounded-2xl p-6 md:p-8 border-2 border-red-500 bg-red-950/30 shadow-2xl space-y-3";
        decisionCard.innerHTML = `
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-red-500/40 pb-4">
                <div>
                    <span class="text-xs uppercase font-black tracking-wider text-red-400 block">Ekonominis verdiktas:</span>
                    <h3 class="font-oswald text-2xl md:text-3xl font-black text-white uppercase tracking-wide">
                        🔴 PARDUOKITE DABAR! (Laikymas atneš nuostolį)
                    </h3>
                </div>
                <div class="text-left sm:text-right">
                    <span class="text-[10px] text-slate-400 uppercase font-bold block">Nuostolis lyginant su pardavimu šiandien</span>
                    <strong class="font-mono text-3xl md:text-4xl font-black text-red-400">${netProfitOrLoss.toLocaleString('lt-LT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</strong>
                    <span class="text-xs font-bold text-red-300 block">(${profitPerTon.toFixed(2)} €/t praradimas)</span>
                </div>
            </div>
            <p class="text-xs md:text-sm text-slate-200 leading-relaxed">
                Laikyti neapsimoka! Nors pavasarį kaina gali būti didesnė, ventiliacijos elektra, ${totalShrinkagePercent.toFixed(1)}% svorio praradimas ir apyvartinių lėšų palūkanos „suvalgo“ visą kainos skirtumą. Norint uždirbti laikant ${months} mėn., pavasario kaina privalo pakilti <strong>bent iki ${breakevenPrice.toFixed(2)} €/t</strong>.
            </p>
        `;
    }
}