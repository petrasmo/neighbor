// js/skaiciuokles/fertilizerCalculator.js

const defaultFertPresets = {
    salietra: { name: "🧪 Amonio salietra (34.4% N)", n: 34.4, p: 0, k: 0, s: 0, price: 340, isLiquid: false },
    kas32: { name: "💧 KAS-32 (32% N skystos trąšos)", n: 32.0, p: 0, k: 0, s: 0, price: 290, isLiquid: true, density: 1.32 },
    karbamidas: { name: "🧪 Karbamidas (46% N)", n: 46.0, p: 0, k: 0, s: 0, price: 420, isLiquid: false },
    amonio_sulfatas: { name: "🧪 Amonio sulfatas (21% N + 24% S)", n: 21.0, p: 0, k: 0, s: 24.0, price: 280, isLiquid: false },
    npk_16_16_16: { name: "🌱 Kompleksinės NPK 16-16-16", n: 16.0, p: 16.0, k: 16.0, s: 0, price: 460, isLiquid: false },
    npk_8_19_29: { name: "🌱 Rudeninės NPK 8-19-29 (+3S)", n: 8.0, p: 19.0, k: 29.0, s: 3.0, price: 490, isLiquid: false },
    dap: { name: "🧪 Diamonio fosfatas DAP (18% N + 46% P2O5)", n: 18.0, p: 46.0, k: 0, s: 0, price: 620, isLiquid: false },
    kalio_chloridas: { name: "⚪ Kalio chloridas (60% K2O)", n: 0, p: 0, k: 60.0, s: 0, price: 410, isLiquid: false },
    custom: { name: "⚙️ Individuali formulė (Rankinis įvedimas)", n: 20.0, p: 10.0, k: 10.0, s: 0, price: 400, isLiquid: false }
};

export function renderFertilizerCalculator(container) {
    if (!container) return;

    let presetOptionsHtml = '';
    for (const [key, preset] of Object.entries(defaultFertPresets)) {
        presetOptionsHtml += `<option value="${key}">${preset.name}</option>`;
    }

    container.innerHTML = `
        <div class="space-y-4 max-w-6xl mx-auto w-full">
            
            <div class="bg-tractorSurface border border-tractorBorder rounded-2xl p-3.5 sm:p-5 md:p-6 space-y-3.5 shadow-xl">
                
                <!-- HEADERIS (KOMPAKTIŠKAS) -->
                <div class="border-b border-tractorBorder/70 pb-2.5 space-y-0.5">
                    <h2 class="font-oswald text-lg sm:text-xl md:text-2xl font-bold uppercase tracking-wider flex items-center gap-2" style="color: var(--text-main);">
                        <span>🧪</span> Trąšų N-P-K Veikliosios Medžiagos ir Kainos Skaičiuoklė
                    </h2>
                    <p class="text-[11px] sm:text-xs text-slate-300">
                        Fizinė tręšimo norma pagal gryno N, P ar K poreikį bei 1 kg gryno elemento savikaina.
                    </p>
                </div>

                <!-- 🌟 1 BLOKAS: TRĄŠOS IR POREIKIS (KOMPAKTIŠKAS TINKLELIS) -->
                <div class="grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-3">
                    
                    <div class="space-y-1 col-span-2 md:col-span-2">
                        <label class="text-[10px] sm:text-[11px] font-bold text-tractorPrimaryLight uppercase tracking-wider block truncate">Trąšų rūšis</label>
                        <select id="fert-preset-select" class="w-full h-11 bg-tractorBg border border-tractorBorder focus:border-tractorPrimary rounded-xl px-2.5 text-xs sm:text-sm font-bold outline-none cursor-pointer truncate" style="color: var(--text-main);">
                            ${presetOptionsHtml}
                        </select>
                    </div>

                    <div class="space-y-1">
                        <label class="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider block truncate" style="color: var(--text-main);">Grynas N / P / K (kg/ha)</label>
                        <input id="fert-target-active-kg" type="number" step="5" value="80" 
                            class="w-full h-11 bg-tractorBg border border-tractorBorder focus:border-tractorPrimary rounded-xl px-3 text-xs sm:text-sm font-bold font-mono outline-none" style="color: var(--text-main);">
                    </div>

                    <div class="space-y-1">
                        <label class="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider block truncate" style="color: var(--text-main);">Lauko plotas (ha)</label>
                        <input id="fert-area" type="number" step="1" value="40.0" 
                            class="w-full h-11 bg-tractorBg border border-tractorBorder focus:border-tractorPrimary rounded-xl px-3 text-xs sm:text-sm font-bold font-mono outline-none" style="color: var(--text-main);">
                    </div>

                </div>

                <!-- 🌟 2 BLOKAS: SUDĖTIS (N-P-K-S) IR KAINA -->
                <div class="bg-tractorBg/80 border border-tractorBorder p-3 sm:p-4 rounded-xl space-y-2.5">
                    <div class="flex justify-between items-center border-b border-tractorBorder/60 pb-1.5">
                        <span class="text-[10px] sm:text-xs font-bold uppercase tracking-wider" style="color: var(--text-main);">
                            Trąšų formulė (%) ir pirkimo kaina:
                        </span>
                        <span id="fert-liquid-badge" class="text-[9px] sm:text-[10px] bg-blue-950/40 text-blue-400 border border-blue-800/60 px-2 py-0.5 rounded-full font-bold hidden">
                            💧 Skystos (1.32 kg/l)
                        </span>
                    </div>

                    <!-- 4 SUDĖTIES STULPELIAI VIENOJE EILUTĖJE + KAINA -->
                    <div class="grid grid-cols-4 sm:grid-cols-5 gap-2 items-end">
                        <div class="space-y-1">
                            <label class="text-[9px] sm:text-[10px] font-bold text-green-500 uppercase block truncate text-center sm:text-left">Azotas (N)</label>
                            <input id="fert-n-perc" type="number" step="0.1" value="34.4" class="w-full h-10 bg-tractorSurface border border-tractorBorder focus:border-tractorPrimary rounded-lg px-1.5 text-center font-bold font-mono text-xs outline-none" style="color: var(--text-main);">
                        </div>

                        <div class="space-y-1">
                            <label class="text-[9px] sm:text-[10px] font-bold text-amber-500 uppercase block truncate text-center sm:text-left">Fosforas (P)</label>
                            <input id="fert-p-perc" type="number" step="0.1" value="0" class="w-full h-10 bg-tractorSurface border border-tractorBorder focus:border-tractorPrimary rounded-lg px-1.5 text-center font-bold font-mono text-xs outline-none" style="color: var(--text-main);">
                        </div>

                        <div class="space-y-1">
                            <label class="text-[9px] sm:text-[10px] font-bold text-blue-500 uppercase block truncate text-center sm:text-left">Kalis (K)</label>
                            <input id="fert-k-perc" type="number" step="0.1" value="0" class="w-full h-10 bg-tractorSurface border border-tractorBorder focus:border-tractorPrimary rounded-lg px-1.5 text-center font-bold font-mono text-xs outline-none" style="color: var(--text-main);">
                        </div>

                        <div class="space-y-1">
                            <label class="text-[9px] sm:text-[10px] font-bold text-yellow-400 uppercase block truncate text-center sm:text-left">Siera (S)</label>
                            <input id="fert-s-perc" type="number" step="0.1" value="0" class="w-full h-10 bg-tractorSurface border border-tractorBorder focus:border-tractorPrimary rounded-lg px-1.5 text-center font-bold font-mono text-xs outline-none" style="color: var(--text-main);">
                        </div>

                        <div class="space-y-1 col-span-4 sm:col-span-1">
                            <label class="text-[10px] sm:text-[11px] font-bold text-amber-500 uppercase block truncate">Kaina (€/t su PVM)</label>
                            <input id="fert-price-ton" type="number" step="10" value="340" class="w-full h-10 bg-tractorSurface border border-tractorBorder focus:border-amber-400 rounded-lg px-3 text-xs sm:text-sm text-amber-500 font-mono font-bold outline-none">
                        </div>
                    </div>
                </div>

            </div>

            <!-- 🌟 REZULTATŲ KORTELĖS: TELEFONE PO DVI Į EILUTĘ (2x2 TINKLELIS) -->
            <div class="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
                
                <div class="bg-tractorPrimary/20 border-2 border-tractorPrimary p-3.5 sm:p-4 rounded-2xl space-y-0.5 shadow-lg">
                    <span class="text-[10px] sm:text-[11px] uppercase font-black text-tractorPrimaryLight tracking-wider block truncate">Fizinė norma</span>
                    <div class="text-xl sm:text-2xl md:text-3xl font-black font-mono leading-tight" id="res-physical-rate" style="color: var(--text-main);">232.6 kg/ha</div>
                    <p class="text-[10px] sm:text-xs text-green-500 font-semibold truncate" id="res-liquid-rate-desc">~0.47 didmaišio/ha</p>
                </div>

                <div class="bg-tractorSurface border border-tractorBorder p-3.5 sm:p-4 rounded-2xl space-y-0.5 shadow">
                    <span class="text-[10px] sm:text-[11px] uppercase font-bold text-slate-400 tracking-wider block truncate">Trąšų kiekis</span>
                    <div class="text-xl sm:text-2xl font-bold font-mono leading-tight" id="res-total-fert-weight" style="color: var(--text-main);">9.30 t</div>
                    <p class="text-[10px] sm:text-xs text-slate-400 truncate" id="res-bigbags-count">Reikės 19 didmaišių</p>
                </div>

                <div class="bg-tractorSurface border border-tractorBorder p-3.5 sm:p-4 rounded-2xl space-y-0.5 shadow">
                    <span class="text-[10px] sm:text-[11px] uppercase font-bold text-slate-400 tracking-wider block truncate">Tręšimo išlaidos</span>
                    <div class="text-xl sm:text-2xl font-bold text-amber-500 font-mono leading-tight" id="res-total-fert-cost">3 162 €</div>
                    <p class="text-[10px] sm:text-xs text-slate-400 truncate" id="res-fert-cost-per-ha">Savikaina: 79.05 €/ha</p>
                </div>

                <div class="bg-tractorSurface border border-tractorBorder p-3.5 sm:p-4 rounded-2xl space-y-0.5 shadow">
                    <span class="text-[10px] sm:text-[11px] uppercase font-bold text-slate-400 tracking-wider block truncate">1 kg N savikaina</span>
                    <div class="text-xl sm:text-2xl font-bold text-green-500 font-mono leading-tight" id="res-cost-per-kg-active">0.99 €/kg N</div>
                    <p class="text-[10px] sm:text-xs text-slate-400 truncate">Efektyvumo rodiklis</p>
                </div>

            </div>

            <!-- KITŲ ELEMENTŲ IŠBERIMAS (KOMPAKTIŠKAS) -->
            <div id="res-npk-breakdown-box" class="bg-tractorSurface border border-tractorBorder rounded-2xl p-3.5 sm:p-4 shadow space-y-2 hidden">
                <h4 class="text-xs font-bold uppercase tracking-wider border-b border-tractorBorder/60 pb-1" style="color: var(--text-main);">
                    🌾 Kitos veikliosios medžiagos laukui:
                </h4>
                <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs" id="res-npk-breakdown-grid"></div>
            </div>

        </div>
    `;

    document.getElementById('fert-preset-select')?.addEventListener('change', (e) => {
        const preset = defaultFertPresets[e.target.value];
        if (preset) {
            document.getElementById('fert-n-perc').value = preset.n;
            document.getElementById('fert-p-perc').value = preset.p;
            document.getElementById('fert-k-perc').value = preset.k;
            document.getElementById('fert-s-perc').value = preset.s;
            document.getElementById('fert-price-ton').value = preset.price;

            const liquidBadge = document.getElementById('fert-liquid-badge');
            if (preset.isLiquid) liquidBadge?.classList.remove('hidden');
            else liquidBadge?.classList.add('hidden');

            calculateFertilizerNorm();
        }
    });

    ['fert-target-active-kg', 'fert-area', 'fert-n-perc', 'fert-p-perc', 'fert-k-perc', 'fert-s-perc', 'fert-price-ton'].forEach(id => {
        document.getElementById(id)?.addEventListener('input', calculateFertilizerNorm);
    });

    calculateFertilizerNorm();
}

// 100% IDENTIŠKAS SKAIČIAVIMO ALGORITMAS
function calculateFertilizerNorm() {
    const targetActiveKg = parseFloat(document.getElementById('fert-target-active-kg')?.value) || 0;
    const areaHa = parseFloat(document.getElementById('fert-area')?.value) || 0;
    const nPerc = parseFloat(document.getElementById('fert-n-perc')?.value) || 0;
    const pPerc = parseFloat(document.getElementById('fert-p-perc')?.value) || 0;
    const kPerc = parseFloat(document.getElementById('fert-k-perc')?.value) || 0;
    const sPerc = parseFloat(document.getElementById('fert-s-perc')?.value) || 0;
    const pricePerTon = parseFloat(document.getElementById('fert-price-ton')?.value) || 0;

    const presetKey = document.getElementById('fert-preset-select')?.value;
    const isLiquid = defaultFertPresets[presetKey]?.isLiquid || false;

    let mainActivePerc = nPerc > 0 ? nPerc : (pPerc > 0 ? pPerc : (kPerc > 0 ? kPerc : 100));

    const physicalRateKgHa = mainActivePerc > 0 ? (targetActiveKg / (mainActivePerc / 100)) : 0;
    const totalTons = (physicalRateKgHa * areaHa) / 1000;
    const bigBags500kg = Math.ceil((totalTons * 1000) / 500);

    const totalCost = totalTons * pricePerTon;
    const costPerHa = areaHa > 0 ? (totalCost / areaHa) : 0;
    const costPerKgActive = mainActivePerc > 0 ? (pricePerTon / 1000) / (mainActivePerc / 100) : 0;

    const elPhys = document.getElementById('res-physical-rate');
    const elLiq = document.getElementById('res-liquid-rate-desc');
    const elBags = document.getElementById('res-bigbags-count');
    const elWeight = document.getElementById('res-total-fert-weight');
    const elCost = document.getElementById('res-total-fert-cost');
    const elCostHa = document.getElementById('res-fert-cost-per-ha');
    const elCostKgN = document.getElementById('res-cost-per-kg-active');

    if (isLiquid) {
        const liquidLitersHa = physicalRateKgHa / 1.32;
        if (elPhys) elPhys.textContent = `${physicalRateKgHa.toFixed(1)} kg/ha`;
        if (elLiq) elLiq.textContent = `💧 Atitinka: ${liquidLitersHa.toFixed(1)} l/ha`;
        if (elBags) elBags.textContent = `Viso: ${Math.round(totalTons * 1000 / 1.32).toLocaleString('lt-LT')} l`;
    } else {
        if (elPhys) elPhys.textContent = `${physicalRateKgHa.toFixed(1)} kg/ha`;
        if (elLiq) elLiq.textContent = `~${(physicalRateKgHa / 500).toFixed(2)} didm./ha`;
        if (elBags) elBags.textContent = `Reikės ${bigBags500kg} didmaišių`;
    }

    if (elWeight) elWeight.textContent = `${totalTons.toFixed(2)} t`;
    if (elCost) elCost.textContent = `${totalCost.toLocaleString('lt-LT', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} €`;
    if (elCostHa) elCostHa.textContent = `Savikaina: ${costPerHa.toFixed(2)} €/ha`;
    if (elCostKgN) elCostKgN.textContent = `${costPerKgActive.toFixed(2)} €/kg ${nPerc > 0 ? 'N' : 'medž.'}`;

    const breakdownBox = document.getElementById('res-npk-breakdown-box');
    const breakdownGrid = document.getElementById('res-npk-breakdown-grid');

    if (pPerc > 0 || kPerc > 0 || sPerc > 0) {
        breakdownBox?.classList.remove('hidden');
        if (breakdownGrid) {
            breakdownGrid.innerHTML = `
                <div class="bg-tractorBg p-2 rounded-xl border border-tractorBorder"><span class="text-green-500 font-bold block text-[10px]">Grynas N</span><strong class="text-xs" style="color: var(--text-main);">${((physicalRateKgHa * (nPerc / 100)) * areaHa).toFixed(1)} kg</strong></div>
                <div class="bg-tractorBg p-2 rounded-xl border border-tractorBorder"><span class="text-amber-500 font-bold block text-[10px]">Fosforas P₂O₅</span><strong class="text-xs" style="color: var(--text-main);">${((physicalRateKgHa * (pPerc / 100)) * areaHa).toFixed(1)} kg</strong></div>
                <div class="bg-tractorBg p-2 rounded-xl border border-tractorBorder"><span class="text-blue-500 font-bold block text-[10px]">Kalis K₂O</span><strong class="text-xs" style="color: var(--text-main);">${((physicalRateKgHa * (kPerc / 100)) * areaHa).toFixed(1)} kg</strong></div>
                <div class="bg-tractorBg p-2 rounded-xl border border-tractorBorder"><span class="text-yellow-400 font-bold block text-[10px]">Siera S</span><strong class="text-xs" style="color: var(--text-main);">${((physicalRateKgHa * (sPerc / 100)) * areaHa).toFixed(1)} kg</strong></div>
            `;
        }
    } else {
        breakdownBox?.classList.add('hidden');
    }
}