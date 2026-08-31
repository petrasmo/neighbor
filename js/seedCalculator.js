// js/seedCalculator.js

// Standartinės agronominės normos pagal kultūras
const defaultCropPresets = {
    wheat_winter: { name: "🌾 Žieminiai kviečiai", seedsMln: 4.5, mtg: 45.0, germination: 95, purity: 99, seedPrice: 420 },
    rapeseed_winter: { name: "🌱 Žieminiai rapsai", seedsMln: 0.55, mtg: 4.8, germination: 92, purity: 99, seedPrice: 1200 },
    barley_spring: { name: "🌾 Vasariniai miežiai", seedsMln: 4.2, mtg: 48.0, germination: 94, purity: 99, seedPrice: 390 },
    wheat_spring: { name: "🌾 Vasariniai kviečiai", seedsMln: 5.0, mtg: 42.0, germination: 95, purity: 99, seedPrice: 410 },
    peas: { name: "🫘 Žirniai", seedsMln: 1.1, mtg: 240.0, germination: 90, purity: 98, seedPrice: 550 },
    beans: { name: "🫘 Pupos", seedsMln: 0.5, mtg: 520.0, germination: 88, purity: 98, seedPrice: 580 },
    oats: { name: "🌾 Avižos", seedsMln: 5.0, mtg: 35.0, germination: 92, purity: 98, seedPrice: 360 }
};

export function renderSeedCalculator(container) {
    if (!container) return;

    let presetOptionsHtml = '';
    for (const [key, preset] of Object.entries(defaultCropPresets)) {
        presetOptionsHtml += `<option value="${key}">${preset.name}</option>`;
    }

    container.innerHTML = `
        <div class="space-y-6">
            
            <!-- SKAIČIUOKLĖS FORMA -->
            <div class="bg-tractorSurface border border-tractorBorder rounded-2xl p-6 md:p-8 space-y-6 shadow-xl">
                <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-tractorBorder/70 pb-4">
                    <div>
                        <h3 class="font-oswald text-xl md:text-2xl font-bold text-white uppercase tracking-wider flex items-center gap-2">
                            <span>🌱</span> Tiksli Sėjos Normos ir Sėklos Poreikio Skaičiuoklė
                        </h3>
                        <p class="text-xs md:text-sm text-slate-300 mt-0.5">
                            Apskaičiuokite tikslią normą (kg/ha) pagal sėklos kokybės sertifikato duomenis (MTG, daigumą).
                        </p>
                    </div>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
                    
                    <div class="space-y-1.5">
                        <label class="text-xs font-bold text-tractorPrimaryLight uppercase tracking-wider">Pasirinkite kultūrą</label>
                        <select id="seed-preset-select" class="w-full h-12 bg-tractorBg border border-tractorPrimary/70 focus:border-tractorPrimary rounded-xl px-3 text-sm text-white font-bold outline-none cursor-pointer">
                            ${presetOptionsHtml}
                        </select>
                    </div>

                    <div class="space-y-1.5">
                        <label class="text-xs font-bold text-slate-200 uppercase tracking-wider">Norimas daigų skaičius (mln. vnt./ha)</label>
                        <input id="seed-target-density" type="number" step="0.05" value="4.5" 
                            class="w-full h-12 bg-tractorBg border border-tractorBorder focus:border-tractorPrimary rounded-xl px-4 text-sm text-white font-bold outline-none">
                    </div>

                    <div class="space-y-1.5">
                        <label class="text-xs font-bold text-slate-200 uppercase tracking-wider">1000 sėklų masė - MTG (gramais)</label>
                        <input id="seed-mtg" type="number" step="0.1" value="45.0" 
                            class="w-full h-12 bg-tractorBg border border-tractorBorder focus:border-tractorPrimary rounded-xl px-4 text-sm text-white font-bold outline-none">
                    </div>

                    <div class="space-y-1.5">
                        <label class="text-xs font-bold text-slate-200 uppercase tracking-wider">Sėklų daigumas (%)</label>
                        <input id="seed-germination" type="number" step="1" min="50" max="100" value="95" 
                            class="w-full h-12 bg-tractorBg border border-tractorBorder focus:border-tractorPrimary rounded-xl px-4 text-sm text-white font-bold outline-none">
                    </div>

                    <div class="space-y-1.5">
                        <label class="text-xs font-bold text-slate-200 uppercase tracking-wider">Sėklų švarumas (%)</label>
                        <input id="seed-purity" type="number" step="0.5" min="80" max="100" value="99" 
                            class="w-full h-12 bg-tractorBg border border-tractorBorder focus:border-tractorPrimary rounded-xl px-4 text-sm text-white font-bold outline-none">
                    </div>

                    <div class="space-y-1.5">
                        <label class="text-xs font-bold text-slate-200 uppercase tracking-wider">Sėjamas lauko plotas (ha)</label>
                        <input id="seed-area" type="number" step="0.5" value="25.0" 
                            class="w-full h-12 bg-tractorBg border border-tractorBorder focus:border-tractorPrimary rounded-xl px-4 text-sm text-white font-bold outline-none">
                    </div>

                </div>

                <!-- SĖKLOS KAINA (PASIRINKTINAI) -->
                <div class="pt-3 border-t border-tractorBorder/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div class="space-y-1">
                        <span class="text-xs font-bold text-slate-300 uppercase">Sėklos kaina (€/t su PVM):</span>
                        <p class="text-[11px] text-slate-400">Įveskite kainą, jei norite apskaičiuoti lauko sėklos biudžetą.</p>
                    </div>
                    <input id="seed-cost-per-ton" type="number" step="10" value="420" 
                        class="w-full sm:w-48 h-11 bg-tractorBg border border-tractorBorder focus:border-tractorPrimary rounded-xl px-4 text-sm text-amber-300 font-mono font-bold outline-none">
                </div>
            </div>

            <!-- REZULTATŲ KORTELĖS -->
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                
                <div class="bg-tractorPrimary/20 border-2 border-tractorPrimary p-5 rounded-2xl space-y-1 shadow-xl shadow-tractorPrimary/10">
                    <span class="text-[11px] uppercase font-extrabold text-tractorPrimaryLight tracking-wider">Tiksli sėjos norma</span>
                    <div class="text-3xl font-black text-white font-mono" id="res-seed-rate">215.3 kg/ha</div>
                    <p class="text-xs text-green-300 font-semibold" id="res-seed-rate-bags">~0.43 didmaišio/ha</p>
                </div>

                <div class="bg-tractorSurface border border-tractorBorder p-5 rounded-2xl space-y-1">
                    <span class="text-[11px] uppercase font-bold text-slate-400 tracking-wider">Viso sėklos poreikis</span>
                    <div class="text-2xl font-bold text-white font-mono" id="res-total-seed-weight">5.38 t</div>
                    <p class="text-xs text-slate-300" id="res-total-bigbags">Reikės 11 didmaišių (po 500kg)</p>
                </div>

                <div class="bg-tractorSurface border border-tractorBorder p-5 rounded-2xl space-y-1">
                    <span class="text-[11px] uppercase font-bold text-slate-400 tracking-wider">Sėklos išlaidos visam laukui</span>
                    <div class="text-2xl font-bold text-amber-400 font-mono" id="res-total-seed-cost">2 260.65 €</div>
                    <p class="text-xs text-slate-300" id="res-cost-per-ha">Savikaina: 90.43 €/ha</p>
                </div>

                <div class="bg-tractorSurface border border-tractorBorder p-5 rounded-2xl space-y-1">
                    <span class="text-[11px] uppercase font-bold text-slate-400 tracking-wider">Tikrasis ūkinis daigumas</span>
                    <div class="text-2xl font-bold text-slate-100 font-mono" id="res-real-germination">94.05 %</div>
                    <p class="text-xs text-slate-400">Daigumas × Švarumas</p>
                </div>

            </div>

            <!-- AGRONOMINĖ FORMULĖ IR PAAIŠKINIMAS -->
            <div class="bg-tractorBg border border-tractorBorder p-4 rounded-xl text-xs text-slate-400 flex items-center justify-between">
                <span>📐 Oficiali formulė: <code>Norma (kg/ha) = (Daigai mln./ha × MTG g) / (Daigumas % × Švarumas % / 100)</code></span>
                <span class="text-green-400 font-bold">100% tikslumas</span>
            </div>

        </div>
    `;

    // Preseto pasirinkimas
    document.getElementById('seed-preset-select').addEventListener('change', (e) => {
        const preset = defaultCropPresets[e.target.value];
        if (preset) {
            document.getElementById('seed-target-density').value = preset.seedsMln;
            document.getElementById('seed-mtg').value = preset.mtg;
            document.getElementById('seed-germination').value = preset.germination;
            document.getElementById('seed-purity').value = preset.purity;
            document.getElementById('seed-cost-per-ton').value = preset.seedPrice;
            calculateSeedNorm();
        }
    });

    // Įvesties listeneriai
    ['seed-target-density', 'seed-mtg', 'seed-germination', 'seed-purity', 'seed-area', 'seed-cost-per-ton'].forEach(id => {
        document.getElementById(id)?.addEventListener('input', calculateSeedNorm);
    });

    calculateSeedNorm();
}

function calculateSeedNorm() {
    const densityMln = parseFloat(document.getElementById('seed-target-density').value) || 0;
    const mtg = parseFloat(document.getElementById('seed-mtg').value) || 0;
    const germination = parseFloat(document.getElementById('seed-germination').value) || 100;
    const purity = parseFloat(document.getElementById('seed-purity').value) || 100;
    const areaHa = parseFloat(document.getElementById('seed-area').value) || 0;
    const pricePerTon = parseFloat(document.getElementById('seed-cost-per-ton').value) || 0;

    // Tikrasis ūkinis daigumas (ŪD %)
    const realGermination = (germination * purity) / 100;

    // Sėjos norma (kg/ha)
    let rateKgHa = 0;
    if (realGermination > 0) {
        rateKgHa = (densityMln * mtg * 100) / realGermination;
    }

    // Bendras svoris (t)
    const totalTons = (rateKgHa * areaHa) / 1000;
    const bigBags500kg = Math.ceil((totalTons * 1000) / 500);

    // Išlaidos (€)
    const totalCost = totalTons * pricePerTon;
    const costPerHa = areaHa > 0 ? (totalCost / areaHa) : 0;

    // Atvaizduojame rezultatus
    document.getElementById('res-seed-rate').textContent = `${rateKgHa.toFixed(1)} kg/ha`;
    document.getElementById('res-seed-rate-bags').textContent = `~${(rateKgHa / 500).toFixed(2)} didmaišio/ha`;
    document.getElementById('res-total-seed-weight').textContent = `${totalTons.toFixed(2)} t`;
    document.getElementById('res-total-bigbags').textContent = `Reikės ${bigBags500kg} didmaišių (po 500 kg)`;
    document.getElementById('res-total-seed-cost').textContent = `${totalCost.toLocaleString('lt-LT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
    document.getElementById('res-cost-per-ha').textContent = `Savikaina: ${costPerHa.toFixed(2)} €/ha`;
    document.getElementById('res-real-germination').textContent = `${realGermination.toFixed(2)} %`;
}