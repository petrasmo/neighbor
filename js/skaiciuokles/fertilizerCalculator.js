// js/fertilizerCalculator.js

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
        <div class="space-y-6">
            
            <!-- SKAIČIUOKLĖS FORMA -->
            <div class="bg-tractorSurface border border-tractorBorder rounded-2xl p-6 md:p-8 space-y-6 shadow-xl">
                <div class="border-b border-tractorBorder/70 pb-4">
                    <h3 class="font-oswald text-xl md:text-2xl font-bold text-white uppercase tracking-wider flex items-center gap-2">
                        <span>🧪</span> Trąšų N-P-K Veikliosios Medžiagos ir Kainos Skaičiuoklė
                    </h3>
                    <p class="text-xs md:text-sm text-slate-300 mt-0.5">
                        Apskaičiuokite fizinę tręšimo normą pagal gryno Azoto (N), Fosforo (P) ar Kalio (K) poreikį bei palyginkite 1 kg gryno elemento kainą.
                    </p>
                </div>

                <!-- 1. TRĄŠOS IR NORMOS PARINKIMAS -->
                <div class="grid grid-cols-1 sm:grid-cols-3 gap-5">
                    <div class="space-y-1.5">
                        <label class="text-xs font-bold text-tractorPrimaryLight uppercase tracking-wider">Pasirinkite trąšų rūšį</label>
                        <select id="fert-preset-select" class="w-full h-12 bg-tractorBg border border-tractorPrimary/70 focus:border-tractorPrimary rounded-xl px-3 text-xs md:text-sm text-white font-bold outline-none cursor-pointer">
                            ${presetOptionsHtml}
                        </select>
                    </div>

                    <div class="space-y-1.5">
                        <label class="text-xs font-bold text-slate-200 uppercase tracking-wider">Reikalingas grynas N (arba P/K) (kg/ha)</label>
                        <input id="fert-target-active-kg" type="number" step="5" value="80" 
                            class="w-full h-12 bg-tractorBg border border-tractorBorder focus:border-tractorPrimary rounded-xl px-4 text-sm text-white font-bold outline-none">
                    </div>

                    <div class="space-y-1.5">
                        <label class="text-xs font-bold text-slate-200 uppercase tracking-wider">Tręšiamas lauko plotas (ha)</label>
                        <input id="fert-area" type="number" step="1" value="40.0" 
                            class="w-full h-12 bg-tractorBg border border-tractorBorder focus:border-tractorPrimary rounded-xl px-4 text-sm text-white font-bold outline-none">
                    </div>
                </div>

                <!-- 2. VEIKLIŲJŲ MEDŽIAGŲ SUDĖTIS % IR KAINA -->
                <div class="bg-tractorBg/90 border border-tractorBorder p-5 rounded-2xl space-y-4">
                    <div class="flex justify-between items-center border-b border-tractorBorder/60 pb-2">
                        <span class="text-xs font-bold text-slate-300 uppercase tracking-wider">Trąšų sudėtis (%) ir pirkimo kaina:</span>
                        <span id="fert-liquid-badge" class="text-[10px] bg-blue-950/40 text-blue-400 border border-blue-800/60 px-2 py-0.5 rounded-full font-bold hidden">
                            💧 Skystos trąšos (Tankis: 1.32 kg/l)
                        </span>
                    </div>

                    <div class="grid grid-cols-2 sm:grid-cols-5 gap-3">
                        <div class="space-y-1">
                            <label class="text-[11px] font-bold text-green-400 uppercase block">Azotas (N %)</label>
                            <input id="fert-n-perc" type="number" step="0.1" value="34.4" class="w-full h-10 bg-tractorSurface border border-tractorBorder focus:border-tractorPrimary rounded-xl px-3 text-xs text-white font-bold outline-none">
                        </div>
                        <div class="space-y-1">
                            <label class="text-[11px] font-bold text-amber-400 uppercase block">Fosforas (P₂O₅ %)</label>
                            <input id="fert-p-perc" type="number" step="0.1" value="0" class="w-full h-10 bg-tractorSurface border border-tractorBorder focus:border-tractorPrimary rounded-xl px-3 text-xs text-white font-bold outline-none">
                        </div>
                        <div class="space-y-1">
                            <label class="text-[11px] font-bold text-blue-400 uppercase block">Kalis (K₂O %)</label>
                            <input id="fert-k-perc" type="number" step="0.1" value="0" class="w-full h-10 bg-tractorSurface border border-tractorBorder focus:border-tractorPrimary rounded-xl px-3 text-xs text-white font-bold outline-none">
                        </div>
                        <div class="space-y-1">
                            <label class="text-[11px] font-bold text-yellow-300 uppercase block">Siera (S %)</label>
                            <input id="fert-s-perc" type="number" step="0.1" value="0" class="w-full h-10 bg-tractorSurface border border-tractorBorder focus:border-tractorPrimary rounded-xl px-3 text-xs text-white font-bold outline-none">
                        </div>
                        <div class="space-y-1 col-span-2 sm:col-span-1">
                            <label class="text-[11px] font-bold text-amber-300 uppercase block">Kaina (€/t su PVM)</label>
                            <input id="fert-price-ton" type="number" step="10" value="340" class="w-full h-10 bg-tractorSurface border border-tractorBorder focus:border-amber-400 rounded-xl px-3 text-xs text-amber-300 font-mono font-bold outline-none">
                        </div>
                    </div>
                </div>

            </div>

            <!-- REZULTATŲ KORTELĖS -->
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                
                <!-- 1 KORTELĖ: FIZINĖ NORMA -->
                <div class="bg-tractorPrimary/20 border-2 border-tractorPrimary p-5 rounded-2xl space-y-1 shadow-xl shadow-tractorPrimary/10">
                    <span class="text-[11px] uppercase font-extrabold text-tractorPrimaryLight tracking-wider">Fizinė tręšimo norma</span>
                    <div class="text-3xl font-black text-white font-mono" id="res-physical-rate">232.6 kg/ha</div>
                    <p class="text-xs text-green-300 font-semibold" id="res-liquid-rate-desc">~0.47 didmaišio/ha</p>
                </div>

                <!-- 2 KORTELĖ: VISAS KIEKIS LAUKUI -->
                <div class="bg-tractorSurface border border-tractorBorder p-5 rounded-2xl space-y-1">
                    <span class="text-[11px] uppercase font-bold text-slate-400 tracking-wider">Viso trąšų poreikis</span>
                    <div class="text-2xl font-bold text-white font-mono" id="res-total-fert-weight">9.30 t</div>
                    <p class="text-xs text-slate-300" id="res-bigbags-count">Reikės 19 didmaišių (po 500kg)</p>
                </div>

                <!-- 3 KORTELĖ: BIUDŽETAS -->
                <div class="bg-tractorSurface border border-tractorBorder p-5 rounded-2xl space-y-1">
                    <span class="text-[11px] uppercase font-bold text-slate-400 tracking-wider">Tręšimo išlaidos</span>
                    <div class="text-2xl font-bold text-amber-400 font-mono" id="res-total-fert-cost">3 162.00 €</div>
                    <p class="text-xs text-slate-300" id="res-fert-cost-per-ha">Savikaina: 79.05 €/ha</p>
                </div>

                <!-- 4 KORTELĖ: 1 KG GRYNO AZOTO KAINA (EKONOMIKA) -->
                <div class="bg-tractorSurface border border-tractorBorder p-5 rounded-2xl space-y-1">
                    <span class="text-[11px] uppercase font-bold text-slate-400 tracking-wider">1 kg gryno N savikaina</span>
                    <div class="text-2xl font-bold text-green-400 font-mono" id="res-cost-per-kg-active">0.99 €/kg N</div>
                    <p class="text-xs text-slate-400">Efektyvumo rodiklis</p>
                </div>

            </div>

            <!-- KITŲ ELEMENTŲ IŠBERIMAS (JEI KOMPLEKSINĖS TRĄŠOS) -->
            <div id="res-npk-breakdown-box" class="bg-tractorSurface border border-tractorBorder rounded-2xl p-5 shadow-xl space-y-2.5 hidden">
                <h4 class="text-xs font-bold text-white uppercase tracking-wider border-b border-tractorBorder/60 pb-2">
                    🌾 Kartu į dirvą atiduodamos kitos veikliosios medžiagos (viso laukui):
                </h4>
                <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs" id="res-npk-breakdown-grid"></div>
            </div>

        </div>
    `;

    // Preseto parinkimas
    document.getElementById('fert-preset-select').addEventListener('change', (e) => {
        const preset = defaultFertPresets[e.target.value];
        if (preset) {
            document.getElementById('fert-n-perc').value = preset.n;
            document.getElementById('fert-p-perc').value = preset.p;
            document.getElementById('fert-k-perc').value = preset.k;
            document.getElementById('fert-s-perc').value = preset.s;
            document.getElementById('fert-price-ton').value = preset.price;

            const liquidBadge = document.getElementById('fert-liquid-badge');
            if (preset.isLiquid) {
                liquidBadge.classList.remove('hidden');
            } else {
                liquidBadge.classList.add('hidden');
            }

            calculateFertilizerNorm();
        }
    });

    // Listeneriai
    ['fert-target-active-kg', 'fert-area', 'fert-n-perc', 'fert-p-perc', 'fert-k-perc', 'fert-s-perc', 'fert-price-ton'].forEach(id => {
        document.getElementById(id)?.addEventListener('input', calculateFertilizerNorm);
    });

    calculateFertilizerNorm();
}

function calculateFertilizerNorm() {
    const targetActiveKg = parseFloat(document.getElementById('fert-target-active-kg').value) || 0;
    const areaHa = parseFloat(document.getElementById('fert-area').value) || 0;
    const nPerc = parseFloat(document.getElementById('fert-n-perc').value) || 0;
    const pPerc = parseFloat(document.getElementById('fert-p-perc').value) || 0;
    const kPerc = parseFloat(document.getElementById('fert-k-perc').value) || 0;
    const sPerc = parseFloat(document.getElementById('fert-s-perc').value) || 0;
    const pricePerTon = parseFloat(document.getElementById('fert-price-ton').value) || 0;

    const presetKey = document.getElementById('fert-preset-select').value;
    const isLiquid = defaultFertPresets[presetKey]?.isLiquid || false;

    // Pagrindinis skaičiuojamas elementas (dažniausiai N, jei N=0 imamas P arba K)
    let mainActivePerc = nPerc > 0 ? nPerc : (pPerc > 0 ? pPerc : (kPerc > 0 ? kPerc : 100));

    // 1. Fizinė norma (kg/ha)
    const physicalRateKgHa = mainActivePerc > 0 ? (targetActiveKg / (mainActivePerc / 100)) : 0;

    // 2. Viso svoris (t)
    const totalTons = (physicalRateKgHa * areaHa) / 1000;
    const bigBags500kg = Math.ceil((totalTons * 1000) / 500);

    // 3. Biudžetas (€)
    const totalCost = totalTons * pricePerTon;
    const costPerHa = areaHa > 0 ? (totalCost / areaHa) : 0;

    // 4. 1 kg grynos veikliosios medžiagos kaina (€/kg)
    const costPerKgActive = mainActivePerc > 0 ? (pricePerTon / 1000) / (mainActivePerc / 100) : 0;

    // Skystų trąšų (KAS-32) litrai
    let liquidLitersHa = 0;
    if (isLiquid) {
        liquidLitersHa = physicalRateKgHa / 1.32; // KAS-32 tankis ~1.32 kg/l
        document.getElementById('res-physical-rate').textContent = `${physicalRateKgHa.toFixed(1)} kg/ha`;
        document.getElementById('res-liquid-rate-desc').textContent = `💧 Atitinka: ${liquidLitersHa.toFixed(1)} l/ha (skystos trąšos)`;
        document.getElementById('res-bigbags-count').textContent = `Viso skysčio: ${Math.round(totalTons * 1000 / 1.32).toLocaleString('lt-LT')} litrų`;
    } else {
        document.getElementById('res-physical-rate').textContent = `${physicalRateKgHa.toFixed(1)} kg/ha`;
        document.getElementById('res-liquid-rate-desc').textContent = `~${(physicalRateKgHa / 500).toFixed(2)} didmaišio/ha`;
        document.getElementById('res-bigbags-count').textContent = `Reikės ${bigBags500kg} didmaišių (po 500 kg)`;
    }

    document.getElementById('res-total-fert-weight').textContent = `${totalTons.toFixed(2)} t`;
    document.getElementById('res-total-fert-cost').textContent = `${totalCost.toLocaleString('lt-LT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
    document.getElementById('res-fert-cost-per-ha').textContent = `Savikaina: ${costPerHa.toFixed(2)} €/ha`;
    document.getElementById('res-cost-per-kg-active').textContent = `${costPerKgActive.toFixed(2)} €/kg ${nPerc > 0 ? 'N' : 'medž.'}`;

    // Kiti NPK elementai
    const breakdownBox = document.getElementById('res-npk-breakdown-box');
    const breakdownGrid = document.getElementById('res-npk-breakdown-grid');

    if (pPerc > 0 || kPerc > 0 || sPerc > 0) {
        breakdownBox.classList.remove('hidden');
        breakdownGrid.innerHTML = `
            <div class="bg-tractorBg p-3 rounded-xl border border-tractorBorder">
                <span class="text-green-400 font-bold block">Grynas N</span>
                <strong class="text-white text-sm">${((physicalRateKgHa * (nPerc / 100)) * areaHa).toFixed(1)} kg</strong>
            </div>
            <div class="bg-tractorBg p-3 rounded-xl border border-tractorBorder">
                <span class="text-amber-400 font-bold block">Fosforas P₂O₅</span>
                <strong class="text-white text-sm">${((physicalRateKgHa * (pPerc / 100)) * areaHa).toFixed(1)} kg</strong>
            </div>
            <div class="bg-tractorBg p-3 rounded-xl border border-tractorBorder">
                <span class="text-blue-400 font-bold block">Kalis K₂O</span>
                <strong class="text-white text-sm">${((physicalRateKgHa * (kPerc / 100)) * areaHa).toFixed(1)} kg</strong>
            </div>
            <div class="bg-tractorBg p-3 rounded-xl border border-tractorBorder">
                <span class="text-yellow-300 font-bold block">Siera S</span>
                <strong class="text-white text-sm">${((physicalRateKgHa * (sPerc / 100)) * areaHa).toFixed(1)} kg</strong>
            </div>
        `;
    } else {
        breakdownBox.classList.add('hidden');
    }
}