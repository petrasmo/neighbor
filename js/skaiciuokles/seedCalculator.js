// js/skaiciuokles/seedCalculator.js
import { createCustomSelect } from '../core/customSelect.js';

const defaultCropPresets = {
    wheat_winter: { name: "Žieminiai kviečiai", icon: "🌾", subtext: "Norma ~4.5 mln./ha", seedsMln: 4.5, mtg: 45.0, germination: 95, purity: 99, seedPrice: 420 },
    rapeseed_winter: { name: "Žieminiai rapsai", icon: "🌱", subtext: "Norma ~0.55 mln./ha", seedsMln: 0.55, mtg: 4.8, germination: 92, purity: 99, seedPrice: 1200 },
    barley_spring: { name: "Vasariniai miežiai", icon: "🌾", subtext: "Norma ~4.2 mln./ha", seedsMln: 4.2, mtg: 48.0, germination: 94, purity: 99, seedPrice: 390 },
    wheat_spring: { name: "Vasariniai kviečiai", icon: "🌾", subtext: "Norma ~5.0 mln./ha", seedsMln: 5.0, mtg: 42.0, germination: 95, purity: 99, seedPrice: 410 },
    peas: { name: "Žirniai", icon: "🫘", subtext: "Norma ~1.1 mln./ha", seedsMln: 1.1, mtg: 240.0, germination: 90, purity: 98, seedPrice: 550 },
    beans: { name: "Pupos", icon: "🫘", subtext: "Norma ~0.5 mln./ha", seedsMln: 0.5, mtg: 520.0, germination: 88, purity: 98, seedPrice: 580 },
    oats: { name: "Avižos", icon: "🌾", subtext: "Norma ~5.0 mln./ha", seedsMln: 5.0, mtg: 35.0, germination: 92, purity: 98, seedPrice: 360 }
};

export function renderSeedCalculator(container) {
    if (!container) return;

    const presetItems = Object.entries(defaultCropPresets).map(([key, p]) => ({
        id: key,
        name: p.name,
        icon: p.icon,
        subtext: p.subtext
    }));

    container.innerHTML = `
        <div class="space-y-4 max-w-6xl mx-auto w-full">
            
            <div class="bg-tractorSurface border border-tractorBorder rounded-2xl p-3.5 sm:p-5 md:p-6 space-y-3.5 shadow-xl">
                
                <!-- HEADERIS (KOMPAKTIŠKAS) -->
                <div class="border-b border-tractorBorder/70 pb-2.5 space-y-0.5">
                    <h2 class="font-oswald text-lg sm:text-xl md:text-2xl font-bold text-white uppercase tracking-wider flex items-center gap-2">
                        <span>🌱</span> Tiksli Sėjos Normos Skaičiuoklė
                    </h2>
                    <p class="text-[11px] sm:text-xs text-slate-300">
                        Tikslus kg/ha ir sėklos poreikis pagal kokybės sertifikato duomenis (MTG, daigumą).
                    </p>
                </div>

                <!-- 🌟 LAUKELIAI TELEFONE PO DU Į EILUTĘ (2x2 TINKLELIS) -->
                <div class="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-3">
                    
                    <div class="space-y-1">
                        <label class="text-[10px] sm:text-[11px] font-bold text-tractorPrimaryLight uppercase tracking-wider block truncate">Kultūra</label>
                        <div id="seed-crop-select-container"></div>
                    </div>

                    <div class="space-y-1">
                        <label class="text-[10px] sm:text-[11px] font-bold text-slate-200 uppercase tracking-wider block truncate">Plotas (ha)</label>
                        <input id="seed-area" type="number" step="0.5" value="25.0" 
                            class="w-full h-12 bg-tractorBg border border-tractorBorder focus:border-tractorPrimary rounded-xl px-3 text-xs sm:text-sm text-white font-bold font-mono outline-none">
                    </div>

                    <div class="space-y-1">
                        <label class="text-[10px] sm:text-[11px] font-bold text-slate-200 uppercase tracking-wider block truncate">Daigai (mln./ha)</label>
                        <input id="seed-target-density" type="number" step="0.05" value="4.5" 
                            class="w-full h-12 bg-tractorBg border border-tractorBorder focus:border-tractorPrimary rounded-xl px-3 text-xs sm:text-sm text-white font-bold font-mono outline-none">
                    </div>

                    <div class="space-y-1">
                        <label class="text-[10px] sm:text-[11px] font-bold text-slate-200 uppercase tracking-wider block truncate">MTG masė (g)</label>
                        <input id="seed-mtg" type="number" step="0.1" value="45.0" 
                            class="w-full h-12 bg-tractorBg border border-tractorBorder focus:border-tractorPrimary rounded-xl px-3 text-xs sm:text-sm text-white font-bold font-mono outline-none">
                    </div>

                    <div class="space-y-1">
                        <label class="text-[10px] sm:text-[11px] font-bold text-slate-200 uppercase tracking-wider block truncate">Daigumas (%)</label>
                        <input id="seed-germination" type="number" step="1" min="50" max="100" value="95" 
                            class="w-full h-12 bg-tractorBg border border-tractorBorder focus:border-tractorPrimary rounded-xl px-3 text-xs sm:text-sm text-white font-bold font-mono outline-none">
                    </div>

                    <div class="space-y-1">
                        <label class="text-[10px] sm:text-[11px] font-bold text-slate-200 uppercase tracking-wider block truncate">Švarumas (%)</label>
                        <input id="seed-purity" type="number" step="0.5" min="80" max="100" value="99" 
                            class="w-full h-12 bg-tractorBg border border-tractorBorder focus:border-tractorPrimary rounded-xl px-3 text-xs sm:text-sm text-white font-bold font-mono outline-none">
                    </div>

                    <div class="space-y-1 col-span-2 sm:col-span-2 md:col-span-2">
                        <div class="flex justify-between items-center text-[10px] sm:text-[11px]">
                            <label class="font-bold text-amber-300 uppercase tracking-wider">Sėklos kaina (€/t su PVM)</label>
                            <span class="text-slate-400 text-[10px] hidden sm:inline">(biudžeto skaičiavimui)</span>
                        </div>
                        <input id="seed-cost-per-ton" type="number" step="10" value="420" 
                            class="w-full h-12 bg-tractorBg border border-tractorBorder focus:border-tractorPrimary rounded-xl px-3 text-xs sm:text-sm text-amber-300 font-mono font-bold outline-none">
                    </div>

                </div>

            </div>

            <!-- 🌟 REZULTATŲ KORTELĖS: TELEFONE PO DVI Į EILUTĘ (2x2 TINKLELIS) -->
            <div class="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
                
                <div class="bg-tractorPrimary/20 border-2 border-tractorPrimary p-3.5 sm:p-4 rounded-2xl space-y-0.5 shadow-lg">
                    <span class="text-[10px] sm:text-[11px] uppercase font-black text-tractorPrimaryLight tracking-wider block truncate">Tiksli norma</span>
                    <div class="text-xl sm:text-2xl md:text-3xl font-black text-white font-mono leading-tight" id="res-seed-rate">215.3 kg/ha</div>
                    <p class="text-[10px] sm:text-xs text-green-300 font-semibold truncate" id="res-seed-rate-bags">~0.43 didmaišio/ha</p>
                </div>

                <div class="bg-tractorSurface border border-tractorBorder p-3.5 sm:p-4 rounded-2xl space-y-0.5 shadow">
                    <span class="text-[10px] sm:text-[11px] uppercase font-bold text-slate-400 tracking-wider block truncate">Sėklos kiekis</span>
                    <div class="text-xl sm:text-2xl font-bold text-white font-mono leading-tight" id="res-total-seed-weight">5.38 t</div>
                    <p class="text-[10px] sm:text-xs text-slate-300 truncate" id="res-total-bigbags">11 didmaišių (po 500kg)</p>
                </div>

                <div class="bg-tractorSurface border border-tractorBorder p-3.5 sm:p-4 rounded-2xl space-y-0.5 shadow">
                    <span class="text-[10px] sm:text-[11px] uppercase font-bold text-slate-400 tracking-wider block truncate">Lauko biudžetas</span>
                    <div class="text-xl sm:text-2xl font-bold text-amber-400 font-mono leading-tight" id="res-total-seed-cost">2 260 €</div>
                    <p class="text-[10px] sm:text-xs text-slate-300 truncate" id="res-cost-per-ha">Savikaina: 90.43 €/ha</p>
                </div>

                <div class="bg-tractorSurface border border-tractorBorder p-3.5 sm:p-4 rounded-2xl space-y-0.5 shadow">
                    <span class="text-[10px] sm:text-[11px] uppercase font-bold text-slate-400 tracking-wider block truncate">Ūkinis daigumas</span>
                    <div class="text-xl sm:text-2xl font-bold text-slate-100 font-mono leading-tight" id="res-real-germination">94.05 %</div>
                    <p class="text-[10px] sm:text-xs text-slate-400 truncate">Daigumas × Švarumas</p>
                </div>

            </div>

            <!-- KOMPAKTIŠKA FORMULĖ APAČIOJE -->
            <div class="bg-tractorBg border border-tractorBorder p-2.5 sm:p-3 rounded-xl text-[11px] text-slate-400 flex items-center justify-between">
                <span class="truncate">📐 Formulė: <code>(Daigai × MTG × 100) ÷ Ūkinis daigumas</code></span>
                <span class="text-green-400 font-bold shrink-0 ml-2">100% tikslumas</span>
            </div>

        </div>
    `;

    // Inicijuojame CustomSelect kultūrai
    createCustomSelect({
        containerId: 'seed-crop-select-container',
        placeholder: 'Kultūra...',
        items: presetItems,
        selectedId: 'wheat_winter',
        onSelect: (selected) => {
            if (selected) {
                const preset = defaultCropPresets[selected.id];
                if (preset) {
                    document.getElementById('seed-target-density').value = preset.seedsMln;
                    document.getElementById('seed-mtg').value = preset.mtg;
                    document.getElementById('seed-germination').value = preset.germination;
                    document.getElementById('seed-purity').value = preset.purity;
                    document.getElementById('seed-cost-per-ton').value = preset.seedPrice;
                    calculateSeedNorm();
                }
            }
        }
    });

    ['seed-target-density', 'seed-mtg', 'seed-germination', 'seed-purity', 'seed-area', 'seed-cost-per-ton'].forEach(id => {
        document.getElementById(id)?.addEventListener('input', calculateSeedNorm);
    });

    calculateSeedNorm();
}

// 100% IDENTIŠKAS SKAIČIAVIMO ALGORITMAS
function calculateSeedNorm() {
    const densityMln = parseFloat(document.getElementById('seed-target-density')?.value) || 0;
    const mtg = parseFloat(document.getElementById('seed-mtg')?.value) || 0;
    const germination = parseFloat(document.getElementById('seed-germination')?.value) || 100;
    const purity = parseFloat(document.getElementById('seed-purity')?.value) || 100;
    const areaHa = parseFloat(document.getElementById('seed-area')?.value) || 0;
    const pricePerTon = parseFloat(document.getElementById('seed-cost-per-ton')?.value) || 0;

    const realGermination = (germination * purity) / 100;

    let rateKgHa = 0;
    if (realGermination > 0) {
        rateKgHa = (densityMln * mtg * 100) / realGermination;
    }

    const totalTons = (rateKgHa * areaHa) / 1000;
    const bigBags500kg = Math.ceil((totalTons * 1000) / 500);

    const totalCost = totalTons * pricePerTon;
    const costPerHa = areaHa > 0 ? (totalCost / areaHa) : 0;

    const elRate = document.getElementById('res-seed-rate');
    const elRateBags = document.getElementById('res-seed-rate-bags');
    const elWeight = document.getElementById('res-total-seed-weight');
    const elBags = document.getElementById('res-total-bigbags');
    const elCost = document.getElementById('res-total-seed-cost');
    const elCostHa = document.getElementById('res-cost-per-ha');
    const elRealGerm = document.getElementById('res-real-germination');

    if (elRate) elRate.textContent = `${rateKgHa.toFixed(1)} kg/ha`;
    if (elRateBags) elRateBags.textContent = `~${(rateKgHa / 500).toFixed(2)} didm./ha`;
    if (elWeight) elWeight.textContent = `${totalTons.toFixed(2)} t`;
    if (elBags) elBags.textContent = `${bigBags500kg} didmaišių (po 500kg)`;
    if (elCost) elCost.textContent = `${totalCost.toLocaleString('lt-LT', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} €`;
    if (elCostHa) elCostHa.textContent = `Savikaina: ${costPerHa.toFixed(2)} €/ha`;
    if (elRealGerm) elRealGerm.textContent = `${realGermination.toFixed(2)} %`;
}