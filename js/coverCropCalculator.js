// js/coverCropCalculator.js

const availableSpecies = {
    mustard: { name: "Baltosios garstyčios", icon: "🌱", pureRate: 15, mtg: 5.5, family: "Kryžmažiedžiai", priceKg: 2.20 },
    radish: { name: "Aliejiniai ridikai", icon: "🌱", pureRate: 18, mtg: 11.0, family: "Kryžmažiedžiai", priceKg: 2.50 },
    oats: { name: "Sėjamosios avižos", icon: "🌾", pureRate: 160, mtg: 35.0, family: "Varpiniai", priceKg: 0.50 },
    vetch: { name: "Vasariniai vikiai", icon: "🌿", pureRate: 120, mtg: 55.0, family: "Pupiniai", priceKg: 1.40 },
    phacelia: { name: "Bitinės facelijos", icon: "🌸", pureRate: 10, mtg: 2.0, family: "Hidrofiliniai", priceKg: 4.80 },
    peas: { name: "Pašariniai žirniai / Peluškos", icon: "🫘", pureRate: 180, mtg: 200.0, family: "Pupiniai", priceKg: 0.70 },
    buckwheat: { name: "Grikiai", icon: "🌾", pureRate: 75, mtg: 28.0, family: "Rūgtiniai", priceKg: 0.90 },
    clover: { name: "Raudonieji dobilai", icon: "🍀", pureRate: 12, mtg: 1.8, family: "Pupiniai", priceKg: 3.50 }
};

let currentMix = [
    { id: 'mustard', share: 40 },
    { id: 'oats', share: 40 },
    { id: 'vetch', share: 20 }
];

export function renderCoverCropCalculator(container) {
    if (!container) return;

    container.innerHTML = `
        <div class="space-y-6">
            <div class="bg-tractorSurface border border-tractorBorder rounded-2xl p-6 md:p-8 space-y-6 shadow-xl">
                <div class="border-b border-tractorBorder/70 pb-4">
                    <h3 class="font-oswald text-xl md:text-2xl font-bold text-white uppercase tracking-wider flex items-center gap-2">
                        <span>🌱</span> Tarpinių Pasėlių (Posėlių) Mišinių Skaičiuoklė
                    </h3>
                    <p class="text-xs md:text-sm text-slate-300 mt-0.5">
                        Apskaičiuokite daugiakomponentinių mišinių sėklų normas (kg/ha), išlaidas bei NMA ekoschemų taisyklių atitiktį.
                    </p>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div class="space-y-1.5">
                        <label class="text-xs font-bold text-slate-200 uppercase tracking-wider">Sėjamas lauko plotas (ha)</label>
                        <input id="cover-field-area" type="number" step="0.5" value="30.0" 
                            class="w-full h-12 bg-tractorBg border border-tractorBorder focus:border-tractorPrimary rounded-xl px-4 text-sm text-white font-bold outline-none">
                    </div>
                    <div class="space-y-1.5">
                        <label class="text-xs font-bold text-tractorPrimaryLight uppercase tracking-wider">NMA Ekoschemos taisyklė</label>
                        <div class="h-12 bg-tractorBg border border-tractorBorder rounded-xl px-4 flex items-center justify-between text-xs">
                            <span class="text-slate-300">Reikalavimas:</span>
                            <span id="nma-compliance-badge" class="font-bold px-2.5 py-1 rounded-md text-[11px] bg-green-500/20 text-green-400 border border-green-500/40">✓ Atitinka (Bent 2 šeimos)</span>
                        </div>
                    </div>
                </div>

                <!-- MIŠINIO KOMPONENTAI -->
                <div class="space-y-3 pt-3 border-t border-tractorBorder/60">
                    <div class="flex justify-between items-center">
                        <span class="text-xs font-bold text-slate-200 uppercase tracking-wider">🌾 Mišinio sudėtis ir dalių proporcijos (%):</span>
                        <span id="total-share-indicator" class="text-xs font-bold font-mono px-2.5 py-1 rounded-md bg-green-500/20 text-green-400 border border-green-500/40">Viso: 100%</span>
                    </div>

                    <div id="cover-mix-rows" class="space-y-3"></div>

                    <button type="button" id="btn-add-cover-species" class="h-10 px-4 bg-tractorBg hover:bg-slate-800 border border-tractorBorder rounded-xl text-xs font-bold text-slate-200 flex items-center gap-2 transition cursor-pointer">
                        <span>➕</span> Pridėti dar vieną augalą
                    </button>
                </div>
            </div>

            <!-- REZULTATŲ KORTELĖS -->
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div class="bg-tractorPrimary/20 border-2 border-tractorPrimary p-5 rounded-2xl space-y-1 shadow-xl">
                    <span class="text-[11px] uppercase font-extrabold text-tractorPrimaryLight tracking-wider">Mišinio norma</span>
                    <div class="text-3xl font-black font-mono" id="res-cover-mix-rate" style="color: var(--text-main);">94.0 kg/ha</div>
                    <p class="text-xs text-green-400 font-semibold" id="res-cover-components-count">3 augalų mišinys</p>
                </div>

                <div class="bg-tractorSurface border border-tractorBorder p-5 rounded-2xl space-y-1">
                    <span class="text-[11px] uppercase font-bold text-slate-400 tracking-wider">Viso sėklos laukui</span>
                    <div class="text-2xl font-bold font-mono" id="res-cover-total-weight" style="color: var(--text-main);">2.82 t</div>
                    <p class="text-xs text-slate-400" id="res-cover-bags-desc">~6 didmaišiai (po 500 kg)</p>
                </div>

                <div class="bg-tractorSurface border border-tractorBorder p-5 rounded-2xl space-y-1">
                    <span class="text-[11px] uppercase font-bold text-slate-400 tracking-wider">Mišinio kaina laukui</span>
                    <div class="text-2xl font-bold text-amber-400 font-mono" id="res-cover-total-cost">2 145.00 €</div>
                    <p class="text-xs text-slate-400" id="res-cover-cost-ha">Savikaina: 71.50 €/ha</p>
                </div>

                <div class="bg-tractorSurface border border-tractorBorder p-5 rounded-2xl space-y-1">
                    <span class="text-[11px] uppercase font-bold text-slate-400 tracking-wider">Vidutinė sėklos kaina</span>
                    <div class="text-2xl font-bold text-green-400 font-mono" id="res-cover-avg-price">0.76 €/kg</div>
                    <p class="text-xs text-slate-400">Paruošto mišinio</p>
                </div>
            </div>

            <!-- DETALUS MAIŠYMO RECEPTAS -->
            <div class="bg-tractorSurface border border-tractorBorder rounded-2xl p-6 shadow-xl space-y-3">
                <h4 class="text-xs font-bold uppercase tracking-wider border-b border-tractorBorder/60 pb-2" style="color: var(--text-main);">
                    🥣 Tikslus svoris maišymui (<span id="res-cover-field-label">30 ha</span>):
                </h4>
                <div id="cover-recipe-grid" class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 text-xs"></div>
            </div>
        </div>
    `;

    function calculateCoverMix() {
        const areaHa = parseFloat(document.getElementById('cover-field-area')?.value) || 0;
        const fieldLabel = document.getElementById('res-cover-field-label');
        if (fieldLabel) fieldLabel.textContent = `${areaHa} ha`;

        let totalShare = 0;
        const families = new Set();
        currentMix.forEach(item => {
            totalShare += item.share;
            const spec = availableSpecies[item.id];
            if (spec) families.add(spec.family);
        });

        const shareInd = document.getElementById('total-share-indicator');
        if (shareInd) {
            shareInd.textContent = `Viso: ${totalShare}%`;
            shareInd.className = totalShare === 100 
                ? "text-xs font-bold font-mono px-2.5 py-1 rounded-md bg-green-500/20 text-green-400 border border-green-500/40"
                : "text-xs font-bold font-mono px-2.5 py-1 rounded-md bg-amber-500/20 text-amber-400 border border-amber-500/40";
        }

        const nmaBadge = document.getElementById('nma-compliance-badge');
        if (nmaBadge) {
            if (currentMix.length >= 2 && families.size >= 2) {
                nmaBadge.textContent = `✓ Atitinka NMA (${families.size} skirtingos šeimos)`;
                nmaBadge.className = "font-bold px-2.5 py-1 rounded-md text-[11px] bg-green-500/20 text-green-400 border border-green-500/40";
            } else {
                nmaBadge.textContent = `⚠️ Reikia bent 2 skirtingų šeimų augalų`;
                nmaBadge.className = "font-bold px-2.5 py-1 rounded-md text-[11px] bg-red-500/20 text-red-400 border border-red-500/40";
            }
        }

        let totalMixRateKgHa = 0;
        let totalCostHa = 0;
        const recipeItems = [];

        currentMix.forEach(item => {
            const spec = availableSpecies[item.id];
            if (!spec) return;

            const rateKgHa = (spec.pureRate * (item.share / 100));
            const componentTotalWeightKg = rateKgHa * areaHa;

            totalMixRateKgHa += rateKgHa;
            totalCostHa += rateKgHa * spec.priceKg;

            recipeItems.push(`
                <div class="bg-tractorBg p-4 rounded-xl border border-tractorBorder space-y-1.5">
                    <div class="flex items-center justify-between">
                        <span class="font-bold text-xs" style="color: var(--text-main);">${spec.icon} ${spec.name}</span>
                        <span class="text-[10px] text-green-400 font-bold bg-green-950/40 px-2 py-0.5 rounded border border-green-800/50">${item.share}%</span>
                    </div>
                    <div class="text-sm font-bold font-mono" style="color: var(--text-main);">${rateKgHa.toFixed(1)} kg/ha</div>
                    <div class="text-xs text-slate-400 pt-1 border-t border-tractorBorder/50">
                        Visam laukui: <strong class="text-amber-400 font-mono">${(componentTotalWeightKg / 1000).toFixed(2)} t</strong> (${componentTotalWeightKg.toFixed(0)} kg)
                    </div>
                </div>
            `);
        });

        const totalWeightTons = (totalMixRateKgHa * areaHa) / 1000;
        const totalCostAll = totalCostHa * areaHa;
        const avgPricePerKg = totalMixRateKgHa > 0 ? (totalCostHa / totalMixRateKgHa) : 0;
        const bigBagsCount = Math.ceil((totalWeightTons * 1000) / 500);

        document.getElementById('res-cover-mix-rate').textContent = `${totalMixRateKgHa.toFixed(1)} kg/ha`;
        document.getElementById('res-cover-components-count').textContent = `${currentMix.length} augalų mišinys`;
        document.getElementById('res-cover-total-weight').textContent = `${totalWeightTons.toFixed(2)} t`;
        document.getElementById('res-cover-bags-desc').textContent = `~${bigBagsCount} didmaišiai (po 500 kg)`;
        document.getElementById('res-cover-total-cost').textContent = `${totalCostAll.toLocaleString('lt-LT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
        document.getElementById('res-cover-cost-ha').textContent = `Savikaina: ${totalCostHa.toFixed(2)} €/ha`;
        document.getElementById('res-cover-avg-price').textContent = `${avgPricePerKg.toFixed(2)} €/kg`;
        
        const recipeGrid = document.getElementById('cover-recipe-grid');
        if (recipeGrid) recipeGrid.innerHTML = recipeItems.join('');
    }

    function renderMixRows() {
        const rowsContainer = document.getElementById('cover-mix-rows');
        if (!rowsContainer) return;

        rowsContainer.innerHTML = currentMix.map((item, idx) => {
            const spec = availableSpecies[item.id] || availableSpecies.mustard;

            let optionsHtml = '';
            for (const [key, s] of Object.entries(availableSpecies)) {
                optionsHtml += `<option value="${key}" ${key === item.id ? 'selected' : ''}>${s.icon} ${s.name} (${s.family})</option>`;
            }

            return `
                <div class="p-3.5 bg-tractorBg rounded-xl border border-tractorBorder grid grid-cols-1 sm:grid-cols-12 gap-3 items-center" data-idx="${idx}">
                    <div class="sm:col-span-5">
                        <label class="text-[10px] uppercase font-bold text-slate-400 block mb-1">Augalas #${idx + 1}</label>
                        <select class="mix-species-select w-full h-10 bg-tractorSurface border border-tractorBorder rounded-lg px-2.5 text-xs text-white outline-none cursor-pointer">
                            ${optionsHtml}
                        </select>
                    </div>

                    <div class="sm:col-span-3">
                        <label class="text-[10px] uppercase font-bold text-slate-400 block mb-1">Dalis mišinyje (%)</label>
                        <div class="flex items-center gap-1.5">
                            <input type="number" step="5" min="5" max="100" value="${item.share}" class="mix-share-input w-full h-10 bg-tractorSurface border border-tractorBorder rounded-lg px-2.5 text-xs text-white font-bold outline-none">
                            <span class="text-xs text-slate-400 font-bold">%</span>
                        </div>
                    </div>

                    <div class="sm:col-span-3">
                        <label class="text-[10px] uppercase font-bold text-slate-400 block mb-1">Kaina (€/kg)</label>
                        <input type="number" step="0.1" value="${spec.priceKg}" class="mix-price-input w-full h-10 bg-tractorSurface border border-tractorBorder rounded-lg px-2.5 text-xs text-amber-300 font-mono font-bold outline-none">
                    </div>

                    <div class="sm:col-span-1 flex justify-end pt-3 sm:pt-0">
                        ${currentMix.length > 2 ? `
                            <button type="button" class="btn-remove-species w-9 h-9 rounded-lg bg-red-950/40 hover:bg-red-900 border border-red-800/60 text-red-300 text-sm font-bold flex items-center justify-center cursor-pointer transition">
                                ✕
                            </button>
                        ` : '<span class="text-xs text-slate-500">Min. 2</span>'}
                    </div>
                </div>
            `;
        }).join('');

        rowsContainer.querySelectorAll('.mix-species-select').forEach((sel, idx) => {
            sel.onchange = (e) => {
                currentMix[idx].id = e.target.value;
                renderMixRows();
                calculateCoverMix();
            };
        });

        rowsContainer.querySelectorAll('.mix-share-input').forEach((inp, idx) => {
            inp.oninput = (e) => {
                currentMix[idx].share = parseFloat(e.target.value) || 0;
                calculateCoverMix();
            };
        });

        rowsContainer.querySelectorAll('.mix-price-input').forEach((inp, idx) => {
            inp.oninput = (e) => {
                const val = parseFloat(e.target.value) || 0;
                const specId = currentMix[idx].id;
                if (availableSpecies[specId]) availableSpecies[specId].priceKg = val;
                calculateCoverMix();
            };
        });

        rowsContainer.querySelectorAll('.btn-remove-species').forEach((btn, idx) => {
            btn.onclick = () => {
                currentMix.splice(idx, 1);
                renderMixRows();
                calculateCoverMix();
            };
        });
    }

    renderMixRows();

    document.getElementById('cover-field-area')?.addEventListener('input', calculateCoverMix);
    document.getElementById('btn-add-cover-species')?.addEventListener('click', () => {
        if (currentMix.length < 6) {
            const unusedKey = Object.keys(availableSpecies).find(k => !currentMix.some(m => m.id === k)) || 'phacelia';
            currentMix.push({ id: unusedKey, share: 10 });
            renderMixRows();
            calculateCoverMix();
        }
    });

    calculateCoverMix();
}