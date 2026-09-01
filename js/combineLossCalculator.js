// js/combineLossCalculator.js

const combineCropPresets = {
    wheat: { name: "Kviečiai", icon: "🌾", grainWeightMg: 45.0, grainsPerGram: 22.2, defaultPrice: 210, defaultYield: 6.5 },
    rapeseed: { name: "Rapsai", icon: "🌱", grainWeightMg: 4.8, grainsPerGram: 208.3, defaultPrice: 460, defaultYield: 3.5 },
    barley: { name: "Miežiai", icon: "🌾", grainWeightMg: 48.0, grainsPerGram: 20.8, defaultPrice: 190, defaultYield: 5.8 },
    peas: { name: "Žirniai", icon: "🫘", grainWeightMg: 220.0, grainsPerGram: 4.5, defaultPrice: 270, defaultYield: 3.8 },
    oats: { name: "Avižos", icon: "🌾", grainWeightMg: 35.0, grainsPerGram: 28.5, defaultPrice: 170, defaultYield: 4.5 }
};

export function renderCombineLossCalculator(container) {
    if (!container) return;

    let optionsHtml = '';
    for (const [key, crop] of Object.entries(combineCropPresets)) {
        optionsHtml += `<option value="${key}">${crop.icon} ${crop.name}</option>`;
    }

    container.innerHTML = `
        <div class="space-y-6">
            <div class="bg-tractorSurface border border-tractorBorder rounded-2xl p-6 md:p-8 space-y-6 shadow-xl">
                <div class="border-b border-tractorBorder/70 pb-4">
                    <h3 class="font-oswald text-xl md:text-2xl font-bold text-white uppercase tracking-wider flex items-center gap-2">
                        <span>🚜</span> Kombaino Grūdų Nuostolių Skaičiuoklė (Prie kombaino)
                    </h3>
                    <p class="text-xs md:text-sm text-slate-300 mt-0.5">
                        Suskaičiuokite rastus grūdus kontroliniame padėkle už kombaino ir sužinokite praradimus kg/ha, % bei eurais.
                    </p>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-3 gap-5">
                    <div class="space-y-1.5">
                        <label class="text-xs font-bold text-tractorPrimaryLight uppercase tracking-wider">Kuliama kultūra</label>
                        <select id="combine-crop-select" class="w-full h-12 bg-tractorBg border border-tractorBorder focus:border-tractorPrimary rounded-xl px-3 text-xs md:text-sm text-white font-bold outline-none cursor-pointer">
                            ${optionsHtml}
                        </select>
                    </div>

                    <div class="space-y-1.5">
                        <label class="text-xs font-bold text-slate-200 uppercase tracking-wider">Pjaunamosios (Hederio) plotis (m)</label>
                        <input id="combine-header-width" type="number" step="0.5" value="7.5" 
                            class="w-full h-12 bg-tractorBg border border-tractorBorder focus:border-tractorPrimary rounded-xl px-4 text-sm text-white font-bold outline-none">
                    </div>

                    <div class="space-y-1.5">
                        <label class="text-xs font-bold text-slate-200 uppercase tracking-wider">Kūlimo plotas (ha)</label>
                        <input id="combine-field-area" type="number" step="1" value="45.0" 
                            class="w-full h-12 bg-tractorBg border border-tractorBorder focus:border-tractorPrimary rounded-xl px-4 text-sm text-white font-bold outline-none">
                    </div>
                </div>

                <!-- KONTROLINIS MATAVIMAS -->
                <div class="bg-tractorBg/90 border border-tractorBorder p-5 rounded-2xl space-y-4">
                    <span class="text-xs font-bold text-slate-300 uppercase tracking-wider block border-b border-tractorBorder/60 pb-2">
                        📐 Kontrolinio matavimo duomenys:
                    </span>

                    <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div class="space-y-1.5">
                            <label class="text-xs font-bold text-slate-300 uppercase">Padėklo / Matavimo plotas</label>
                            <select id="combine-tray-size" class="w-full h-11 bg-tractorSurface border border-tractorBorder rounded-xl px-3 text-xs text-white outline-none cursor-pointer">
                                <option value="0.1">0.1 m² (Standartinis padėklas ~33x30 cm)</option>
                                <option value="0.25">0.25 m² (50x50 cm)</option>
                                <option value="0.5">0.5 m²</option>
                                <option value="1.0">1.0 m² (Kvadratinis metras)</option>
                            </select>
                        </div>

                        <div class="space-y-1.5">
                            <label class="text-xs font-bold text-green-400 uppercase">Suskaičiuoti grūdai padėkle (vnt.) *</label>
                            <input id="combine-grains-count" type="number" step="1" value="28" 
                                class="w-full h-11 bg-tractorSurface border-2 border-tractorPrimary rounded-xl px-3.5 text-base text-white font-bold font-mono outline-none">
                        </div>

                        <div class="space-y-1.5">
                            <label class="text-xs font-bold text-amber-300 uppercase">Grūdų kaina (€/t su PVM)</label>
                            <input id="combine-grain-price" type="number" step="5" value="210" 
                                class="w-full h-11 bg-tractorSurface border border-tractorBorder rounded-xl px-3.5 text-xs text-amber-300 font-bold font-mono outline-none">
                        </div>
                    </div>
                </div>
            </div>

            <!-- REZULTATAI -->
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div class="bg-tractorPrimary/20 border-2 border-tractorPrimary p-5 rounded-2xl space-y-1 shadow-xl">
                    <span class="text-[11px] uppercase font-extrabold text-tractorPrimaryLight tracking-wider">Faktiniai nuostoliai</span>
                    <div class="text-3xl font-black font-mono" id="res-loss-kg-ha" style="color: var(--text-main);">126.0 kg/ha</div>
                    <p class="text-xs font-bold text-green-400" id="res-loss-status-badge">🟢 Nuostoliai normos ribose (<1.5%)</p>
                </div>

                <div class="bg-tractorSurface border border-tractorBorder p-5 rounded-2xl space-y-1">
                    <span class="text-[11px] uppercase font-bold text-slate-400 tracking-wider">Nuostoliai procentais</span>
                    <div class="text-2xl font-bold font-mono" id="res-loss-percentage" style="color: var(--text-main);">1.94 %</div>
                    <p class="text-xs text-slate-400" id="res-loss-yield-ref">Prie 6.5 t/ha derliaus</p>
                </div>

                <div class="bg-tractorSurface border border-tractorBorder p-5 rounded-2xl space-y-1">
                    <span class="text-[11px] uppercase font-bold text-slate-400 tracking-wider">Finansinis praradimas laukui</span>
                    <div class="text-2xl font-bold text-red-400 font-mono" id="res-loss-total-cost">1 190.70 €</div>
                    <p class="text-xs text-slate-400" id="res-loss-cost-ha">Prarandama: 26.46 €/ha</p>
                </div>

                <div class="bg-tractorSurface border border-tractorBorder p-5 rounded-2xl space-y-1">
                    <span class="text-[11px] uppercase font-bold text-slate-400 tracking-wider">Prarastas bendras svoris</span>
                    <div class="text-2xl font-bold text-amber-400 font-mono" id="res-loss-total-weight">5.67 t</div>
                    <p class="text-xs text-slate-400">Pabirę ant žemės</p>
                </div>
            </div>

            <!-- REGULIAVIMO PATARIMAI -->
            <div id="combine-recommendation-box" class="p-5 rounded-2xl border space-y-2"></div>
        </div>
    `;

    document.getElementById('combine-crop-select')?.addEventListener('change', (e) => {
        const crop = combineCropPresets[e.target.value];
        if (crop) {
            document.getElementById('combine-grain-price').value = crop.defaultPrice;
            calculateCombineLoss();
        }
    });

    ['combine-header-width', 'combine-field-area', 'combine-tray-size', 'combine-grains-count', 'combine-grain-price'].forEach(id => {
        document.getElementById(id)?.addEventListener('input', calculateCombineLoss);
    });

    calculateCombineLoss();
}

function calculateCombineLoss() {
    const cropKey = document.getElementById('combine-crop-select')?.value || 'wheat';
    const crop = combineCropPresets[cropKey] || combineCropPresets.wheat;

    const headerWidth = parseFloat(document.getElementById('combine-header-width')?.value) || 7.5;
    const fieldArea = parseFloat(document.getElementById('combine-field-area')?.value) || 0;
    const traySize = parseFloat(document.getElementById('combine-tray-size')?.value) || 0.1;
    const grainsCount = parseFloat(document.getElementById('combine-grains-count')?.value) || 0;
    const pricePerTon = parseFloat(document.getElementById('combine-grain-price')?.value) || 200;

    const grainsPerM2 = traySize > 0 ? (grainsCount / traySize) : 0;
    const lossKgHa = (grainsPerM2 * (crop.grainWeightMg / 1000) * 10);

    const assumedYieldKgHa = crop.defaultYield * 1000;
    const lossPerc = assumedYieldKgHa > 0 ? (lossKgHa / assumedYieldKgHa) * 100 : 0;

    const totalLossTons = (lossKgHa * fieldArea) / 1000;
    const totalLossCost = totalLossTons * pricePerTon;
    const lossCostPerHa = fieldArea > 0 ? (totalLossCost / fieldArea) : 0;

    document.getElementById('res-loss-kg-ha').textContent = `${lossKgHa.toFixed(1)} kg/ha`;
    document.getElementById('res-loss-percentage').textContent = `${lossPerc.toFixed(2)} %`;
    document.getElementById('res-loss-yield-ref').textContent = `Prie ~${crop.defaultYield} t/ha derliaus`;
    document.getElementById('res-loss-total-cost').textContent = `${totalLossCost.toLocaleString('lt-LT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
    document.getElementById('res-loss-cost-ha').textContent = `Prarandama: ${lossCostPerHa.toFixed(2)} €/ha`;
    document.getElementById('res-loss-total-weight').textContent = `${totalLossTons.toFixed(2)} t`;

    const statusBadge = document.getElementById('res-loss-status-badge');
    const recBox = document.getElementById('combine-recommendation-box');

    if (lossPerc <= 1.0) {
        statusBadge.textContent = `🟢 Labai geri nustatymai (<1.0% nuostolių)`;
        statusBadge.className = "text-xs font-bold text-green-400";
        recBox.className = "p-5 rounded-2xl border border-green-500/40 bg-green-950/20 space-y-1.5";
        recBox.innerHTML = `
            <div class="font-bold text-green-400 text-sm flex items-center gap-2">
                <span>✅</span> Puikus kombaino sureguliavimas!
            </div>
            <p class="text-xs text-slate-300">Nuostoliai neviršija agronominių normų. Galite išlaikyti esamą važiavimo greitį ir būgno apsukas.</p>
        `;
    } else if (lossPerc <= 2.0) {
        statusBadge.textContent = `🟡 Vidutiniai nuostoliai (1.0% – 2.0%)`;
        statusBadge.className = "text-xs font-bold text-amber-400";
        recBox.className = "p-5 rounded-2xl border border-amber-500/40 bg-amber-950/20 space-y-1.5";
        recBox.innerHTML = `
            <div class="font-bold text-amber-400 text-sm flex items-center gap-2">
                <span>⚠️</span> Rekomenduojama patikrinti nustatymus
            </div>
            <p class="text-xs text-slate-300">Nuostoliai yra ant leistinos ribos. Patikrinkite sietų atidarymą, vėjo stiprumą bei sumažinkite darbinį greitį 0.5–1.0 km/val.</p>
        `;
    } else {
        statusBadge.textContent = `🔴 Dideli nuostoliai (>2.0% nuostolių!)`;
        statusBadge.className = "text-xs font-bold text-red-400";
        recBox.className = "p-5 rounded-2xl border border-red-500/40 bg-red-950/30 space-y-1.5";
        recBox.innerHTML = `
            <div class="font-bold text-red-400 text-sm flex items-center gap-2">
                <span>🚨</span> DĖMESIO: Kombainas meta per daug grūdų!
            </div>
            <p class="text-xs text-slate-300">Prarandate <strong>${lossCostPerHa.toFixed(2)} € iš kiekvieno hektaro</strong>. Skubiai: 1) Sumažinkite ventiliatoriaus vėją; 2) Patikrinkite viršutinį ir apatinį sietus; 3) Patikrinkite, ar neperkrautas rotorius/kratikliai.</p>
        `;
    }
}