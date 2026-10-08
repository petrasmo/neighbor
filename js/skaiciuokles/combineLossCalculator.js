// js/skaiciuokles/combineLossCalculator.js

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
        <div class="space-y-4 max-w-6xl mx-auto w-full">
            
            <div class="bg-tractorSurface border border-tractorBorder rounded-2xl p-3.5 sm:p-5 md:p-6 space-y-3.5 shadow-xl">
                
                <!-- HEADERIS (KOMPAKTIŠKAS) -->
                <div class="border-b border-tractorBorder/70 pb-2.5 space-y-0.5">
                    <h2 class="font-oswald text-lg sm:text-xl md:text-2xl font-bold text-white uppercase tracking-wider flex items-center gap-2">
                        <span>🚜</span> Kombaino Grūdų Nuostolių Skaičiuoklė
                    </h2>
                    <p class="text-[11px] sm:text-xs text-slate-300">
                        Apskaičiuokite praradimus (kg/ha, % ir €) pagal rastus grūdus padėkle už kombaino.
                    </p>
                </div>

                <!-- 🌟 LAUKELIAI TELEFONE PO DU Į EILUTĘ (2x2 TINKLELIS) -->
                <div class="space-y-3">
                    
                    <!-- 1 BLOKAS: KOMBAINO IR LAUKO DUOMENYS -->
                    <div class="grid grid-cols-2 md:grid-cols-3 gap-2.5 sm:gap-3">
                        <div class="space-y-1">
                            <label class="text-[10px] sm:text-[11px] font-bold text-tractorPrimaryLight uppercase tracking-wider block truncate">Kuliama kultūra</label>
                            <select id="combine-crop-select" class="w-full h-11 bg-tractorBg border border-tractorBorder focus:border-tractorPrimary rounded-xl px-2.5 text-xs sm:text-sm text-white font-bold outline-none cursor-pointer truncate">
                                ${optionsHtml}
                            </select>
                        </div>

                        <div class="space-y-1">
                            <label class="text-[10px] sm:text-[11px] font-bold text-slate-200 uppercase tracking-wider block truncate">Hederio plotis (m)</label>
                            <input id="combine-header-width" type="number" step="0.5" value="7.5" 
                                class="w-full h-11 bg-tractorBg border border-tractorBorder focus:border-tractorPrimary rounded-xl px-3 text-xs sm:text-sm text-white font-bold font-mono outline-none">
                        </div>

                        <div class="space-y-1 col-span-2 sm:col-span-1">
                            <label class="text-[10px] sm:text-[11px] font-bold text-slate-200 uppercase tracking-wider block truncate">Kūlimo plotas (ha)</label>
                            <input id="combine-field-area" type="number" step="1" value="45.0" 
                                class="w-full h-11 bg-tractorBg border border-tractorBorder focus:border-tractorPrimary rounded-xl px-3 text-xs sm:text-sm text-white font-bold font-mono outline-none">
                        </div>
                    </div>

                    <!-- 2 BLOKAS: KONTROLINIS MATAVIMAS (ŠVARIAI INTEGRUOTAS) -->
                    <div class="bg-tractorBg/80 border border-tractorBorder p-3 sm:p-4 rounded-xl space-y-2">
                        <span class="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-400 block border-b border-tractorBorder/60 pb-1">
                            📐 Matavimas už kombaino:
                        </span>

                        <div class="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-3">
                            <div class="space-y-1 col-span-2 sm:col-span-1">
                                <label class="text-[10px] sm:text-[11px] font-bold text-slate-300 uppercase block truncate">Padėklo plotas</label>
                                <select id="combine-tray-size" class="w-full h-11 bg-tractorSurface border border-tractorBorder rounded-xl px-2.5 text-xs text-white outline-none cursor-pointer truncate">
                                    <option value="0.1">0.1 m² (~33x30 cm)</option>
                                    <option value="0.25">0.25 m² (50x50 cm)</option>
                                    <option value="0.5">0.5 m²</option>
                                    <option value="1.0">1.0 m² (1 m²)</option>
                                </select>
                            </div>

                            <div class="space-y-1">
                                <label class="text-[10px] sm:text-[11px] font-bold text-green-400 uppercase block truncate">Grūdai padėkle (vnt.) *</label>
                                <input id="combine-grains-count" type="number" step="1" value="28" 
                                    class="w-full h-11 bg-tractorSurface border-2 border-tractorPrimary rounded-xl px-3 text-base text-white font-black font-mono outline-none">
                            </div>

                            <div class="space-y-1">
                                <label class="text-[10px] sm:text-[11px] font-bold text-amber-300 uppercase block truncate">Kaina (€/t su PVM)</label>
                                <input id="combine-grain-price" type="number" step="5" value="210" 
                                    class="w-full h-11 bg-tractorSurface border border-tractorBorder rounded-xl px-3 text-xs sm:text-sm text-amber-300 font-bold font-mono outline-none">
                            </div>
                        </div>
                    </div>

                </div>

            </div>

            <!-- 🌟 REZULTATŲ KORTELĖS: TELEFONE PO DVI Į EILUTĘ (2x2 TINKLELIS) -->
            <div class="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
                
                <div class="bg-tractorPrimary/20 border-2 border-tractorPrimary p-3.5 sm:p-4 rounded-2xl space-y-0.5 shadow-lg">
                    <span class="text-[10px] sm:text-[11px] uppercase font-black text-tractorPrimaryLight tracking-wider block truncate">Nuostoliai</span>
                    <div class="text-xl sm:text-2xl md:text-3xl font-black font-mono leading-tight" id="res-loss-kg-ha" style="color: var(--text-main);">126.0 kg/ha</div>
                    <p class="text-[10px] sm:text-xs font-bold text-green-400 truncate" id="res-loss-status-badge">🟢 Normos ribose</p>
                </div>

                <div class="bg-tractorSurface border border-tractorBorder p-3.5 sm:p-4 rounded-2xl space-y-0.5 shadow">
                    <span class="text-[10px] sm:text-[11px] uppercase font-bold text-slate-400 tracking-wider block truncate">Nuostoliai (%)</span>
                    <div class="text-xl sm:text-2xl font-bold font-mono leading-tight" id="res-loss-percentage" style="color: var(--text-main);">1.94 %</div>
                    <p class="text-[10px] sm:text-xs text-slate-400 truncate" id="res-loss-yield-ref">Prie 6.5 t/ha derliaus</p>
                </div>

                <div class="bg-tractorSurface border border-tractorBorder p-3.5 sm:p-4 rounded-2xl space-y-0.5 shadow">
                    <span class="text-[10px] sm:text-[11px] uppercase font-bold text-slate-400 tracking-wider block truncate">Praradimas laukui</span>
                    <div class="text-xl sm:text-2xl font-bold text-red-400 font-mono leading-tight" id="res-loss-total-cost">1 190 €</div>
                    <p class="text-[10px] sm:text-xs text-slate-400 truncate" id="res-loss-cost-ha">Prarandama: 26.46 €/ha</p>
                </div>

                <div class="bg-tractorSurface border border-tractorBorder p-3.5 sm:p-4 rounded-2xl space-y-0.5 shadow">
                    <span class="text-[10px] sm:text-[11px] uppercase font-bold text-slate-400 tracking-wider block truncate">Prarastas svoris</span>
                    <div class="text-xl sm:text-2xl font-bold text-amber-400 font-mono leading-tight" id="res-loss-total-weight">5.67 t</div>
                    <p class="text-[10px] sm:text-xs text-slate-400 truncate">Pabirę ant žemės</p>
                </div>

            </div>

            <!-- REGULIAVIMO PATARIMAS APAČIOJE (KOMPAKTIŠKAS) -->
            <div id="combine-recommendation-box" class="p-3 sm:p-4 rounded-xl border space-y-1 text-xs"></div>

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

// 100% IDENTIŠKAS SKAIČIAVIMO ALGORITMAS
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

    const elLossKg = document.getElementById('res-loss-kg-ha');
    const elLossPerc = document.getElementById('res-loss-percentage');
    const elYieldRef = document.getElementById('res-loss-yield-ref');
    const elTotalCost = document.getElementById('res-loss-total-cost');
    const elCostHa = document.getElementById('res-loss-cost-ha');
    const elTotalWeight = document.getElementById('res-loss-total-weight');

    if (elLossKg) elLossKg.textContent = `${lossKgHa.toFixed(1)} kg/ha`;
    if (elLossPerc) elLossPerc.textContent = `${lossPerc.toFixed(2)} %`;
    if (elYieldRef) elYieldRef.textContent = `Prie ~${crop.defaultYield} t/ha derliaus`;
    if (elTotalCost) elTotalCost.textContent = `${totalLossCost.toLocaleString('lt-LT', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} €`;
    if (elCostHa) elCostHa.textContent = `Prarandama: ${lossCostPerHa.toFixed(2)} €/ha`;
    if (elTotalWeight) elTotalWeight.textContent = `${totalLossTons.toFixed(2)} t`;

    const statusBadge = document.getElementById('res-loss-status-badge');
    const recBox = document.getElementById('combine-recommendation-box');
    if (!statusBadge || !recBox) return;

    if (lossPerc <= 1.0) {
        statusBadge.textContent = `🟢 Normos ribose (<1.0%)`;
        statusBadge.className = "text-[10px] sm:text-xs font-bold text-green-400";
        recBox.className = "p-3 sm:p-4 rounded-xl border border-green-500/40 bg-green-950/20 space-y-1";
        recBox.innerHTML = `
            <div class="font-bold text-green-400 text-xs sm:text-sm flex items-center gap-1.5">
                <span>✅</span> Puikus kombaino sureguliavimas!
            </div>
            <p class="text-[11px] sm:text-xs text-slate-300">Nuostoliai neviršija agronominių normų. Galite išlaikyti esamą važiavimo greitį ir būgno apsukas.</p>
        `;
    } else if (lossPerc <= 2.0) {
        statusBadge.textContent = `🟡 Vidutiniai (1.0% – 2.0%)`;
        statusBadge.className = "text-[10px] sm:text-xs font-bold text-amber-400";
        recBox.className = "p-3 sm:p-4 rounded-xl border border-amber-500/40 bg-amber-950/20 space-y-1";
        recBox.innerHTML = `
            <div class="font-bold text-amber-400 text-xs sm:text-sm flex items-center gap-1.5">
                <span>⚠️</span> Rekomenduojama patikrinti nustatymus
            </div>
            <p class="text-[11px] sm:text-xs text-slate-300">Nuostoliai yra ant leistinos ribos. Patikrinkite sietų atidarymą, vėjo stiprumą bei sumažinkite darbinį greitį 0.5–1.0 km/val.</p>
        `;
    } else {
        statusBadge.textContent = `🔴 Dideli nuostoliai (>2.0%!)`;
        statusBadge.className = "text-[10px] sm:text-xs font-bold text-red-400";
        recBox.className = "p-3 sm:p-4 rounded-xl border border-red-500/40 bg-red-950/30 space-y-1";
        recBox.innerHTML = `
            <div class="font-bold text-red-400 text-xs sm:text-sm flex items-center gap-1.5">
                <span>🚨</span> DĖMESIO: Kombainas meta per daug grūdų!
            </div>
            <p class="text-[11px] sm:text-xs text-slate-300">Prarandate <strong>${lossCostPerHa.toFixed(2)} €/ha</strong>. 1) Sumažinkite ventiliatoriaus vėją; 2) Patikrinkite sietus; 3) Patikrinkite, ar neperkrautas rotorius/kratikliai.</p>
        `;
    }
}