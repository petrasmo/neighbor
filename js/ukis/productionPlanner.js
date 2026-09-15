// js/ukis/productionPlanner.js
import { CROPS_CATALOG } from './cropPlanner.js';

let activeTechLevel = 'optimal'; // 'economy', 'optimal', 'intensive'

// Technologijų koeficientai pagal intensyvumą
const TECH_PROFILES = {
    economy: {
        name: "🥉 Ekonominis lygis",
        desc: "🥉 <strong>Ekonominė technologija:</strong> Minimalios išlaidos, bazinis beicas, 1 kartas NPK, 1–2 salietros normos, 1 herbicidas nuo piktžolių, 1 pigesnis fungicidas. Planuojamas derlius ~20% mažesnis.",
        fertMultiplier: 0.75,
        yieldMultiplier: 0.80,
        fuelLitersHa: 90,
        chemsCostHa: 65
    },
    optimal: {
        name: "🥈 Optimalus lygis",
        desc: "🥈 <strong>Optimali technologija:</strong> Sertifikuota beicuota sėkla, NPK rudenį/pavasarį, N1+N2 azotas, herbicidas, 2 fungicidai (T1, T2 vėliavai), augimo reguliatorius ir mikroelementai. Stabilus geras derlingumas.",
        fertMultiplier: 1.0,
        yieldMultiplier: 1.0,
        fuelLitersHa: 100,
        chemsCostHa: 120
    },
    intensive: {
        name: "🥇 Intensyvus lygis",
        desc: "🥇 <strong>Intensyvi technologija:</strong> Aukščiausios kokybės beicas, maksimalus NPK, N1+N2+N3 azotas kokybei, herbicidas, 3 fungicidai (T1, T2, T3 fuzariozei), 2 augimo reguliatoriai, insekticidas ir mikroelementų paketai. Siekiamas rekordinis derlius.",
        fertMultiplier: 1.25,
        yieldMultiplier: 1.20,
        fuelLitersHa: 115,
        chemsCostHa: 185
    }
};

export function renderProductionPlanner(container, userFieldsList, planningYear) {
    if (!container) return;

    setupTechLevelEvents(container, userFieldsList, planningYear);
    calculateAndRenderProduction(container, userFieldsList, planningYear);
}

function setupTechLevelEvents(container, userFieldsList, planningYear) {
    container.querySelectorAll('.btn-tech-level').forEach(btn => {
        btn.onclick = () => {
            activeTechLevel = btn.getAttribute('data-level');
            container.querySelectorAll('.btn-tech-level').forEach(b => {
                b.className = "btn-tech-level px-3.5 py-2 rounded-lg text-xs font-bold transition cursor-pointer text-slate-400 hover:text-white";
            });
            btn.className = "btn-tech-level px-3.5 py-2 rounded-lg text-xs font-bold transition cursor-pointer bg-tractorPrimary text-white shadow";
            
            const descEl = container.querySelector('#tech-level-description');
            if (descEl) descEl.innerHTML = TECH_PROFILES[activeTechLevel].desc;

            calculateAndRenderProduction(container, userFieldsList, planningYear);
        };
    });
}

function calculateAndRenderProduction(container, userFieldsList, planningYear) {
    const profile = TECH_PROFILES[activeTechLevel];

    let totalSeedTons = 0;
    let totalNpkTons = 0;
    let totalNitrogenTons = 0;
    let totalFuelLiters = 0;
    let totalRevenue = 0;
    let totalExpenses = 0;

    const fieldsDetailsHtml = userFieldsList.map(f => {
        const area = parseFloat(f.areaHa || 0);
        const plannedCrop = f.cropHistory?.[String(planningYear)] || f.crop || "Žieminiai kviečiai";
        const meta = CROPS_CATALOG[plannedCrop] || CROPS_CATALOG["Žieminiai kviečiai"];

        // 1. Sėkla
        const seedKg = Math.round(area * meta.seedRateKg);
        const seedTons = (seedKg / 1000).toFixed(2);
        const seedBags = Math.ceil(seedKg / 500);
        const seedCost = (seedTons * meta.seedPriceTon);

        // 2. Trąšos pagal pasirinktą lygį
        const npkRate = Math.round(250 * profile.fertMultiplier);
        const npkTons = ((area * npkRate) / 1000).toFixed(1);
        const npkCost = npkTons * 460;

        const salietraRate = Math.round((meta.fertN / 0.344) * profile.fertMultiplier);
        const salietraTons = ((area * salietraRate) / 1000).toFixed(1);
        const salietraCost = salietraTons * 340;

        // 3. Kuras
        const fieldFuelLiters = Math.round(area * profile.fuelLitersHa);
        const fuelCost = fieldFuelLiters * 0.85;

        // 4. Augalų apsauga (herbicidai, fungicidai)
        const chemsCost = area * profile.chemsCostHa;

        // 5. Derlius ir pajamos pagal MATIF
        const expectedYieldHa = (meta.yieldTonHa * profile.yieldMultiplier).toFixed(1);
        const totalFieldYield = (area * expectedYieldHa).toFixed(1);
        const fieldRevenue = totalFieldYield * meta.matifPrice;

        const fieldTotalCost = seedCost + npkCost + salietraCost + fuelCost + chemsCost;
        const fieldProfit = fieldRevenue - fieldTotalCost;
        const profitPerHa = area > 0 ? (fieldProfit / area).toFixed(0) : 0;

        totalSeedTons += parseFloat(seedTons);
        totalNpkTons += parseFloat(npkTons);
        totalNitrogenTons += parseFloat(salietraTons);
        totalFuelLiters += fieldFuelLiters;
        totalRevenue += fieldRevenue;
        totalExpenses += fieldTotalCost;

        // Formuojame purškimų aprašymą pagal lygį
        let sprayPlanText = "1x Herbicidas + 1x Fungicidas";
        if (activeTechLevel === 'optimal') sprayPlanText = "1x Herbicidas + 1x Reguliatorius + 2x Fungicidai (T1, T2) + Mikroelementai";
        else if (activeTechLevel === 'intensive') sprayPlanText = "1x Herbicidas + 2x Reguliatoriai + 3x Fungicidai (T1, T2, T3) + Insekticidas";

        return `
            <!-- 🌟 DETALI LAUKO KORTELĖ -->
            <div class="bg-tractorBg border border-tractorBorder rounded-xl p-4 space-y-3">
                <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-tractorBorder/60 pb-2.5">
                    <div>
                        <h4 class="font-bold text-base text-white flex items-center gap-2">
                            <span>🌾</span> <span>${f.name}</span>
                            <span class="text-xs bg-tractorSurface px-2.5 py-0.5 rounded font-bold text-green-400 border border-tractorBorder">${f.areaHa} ha</span>
                            <span class="text-xs font-normal text-slate-300">• Pasėlis: <strong class="text-white">${plannedCrop}</strong></span>
                        </h4>
                    </div>
                    <div class="text-left sm:text-right">
                        <span class="text-[10px] text-slate-400 block uppercase font-bold">Planuojamas derlius:</span>
                        <strong class="font-mono text-sm text-green-400">${expectedYieldHa} t/ha (${totalFieldYield} t)</strong>
                    </div>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                    <!-- SĖKLA -->
                    <div class="bg-tractorSurface p-3 rounded-xl border border-tractorBorder space-y-0.5">
                        <span class="text-slate-400 text-[11px] block font-semibold">🌱 Beicuota sėkla:</span>
                        <strong class="font-mono text-white text-sm font-bold block">${seedTons} t</strong>
                        <span class="text-[10px] text-slate-400">${seedBags} didmaišiai (${meta.seedRateKg} kg/ha)</span>
                    </div>

                    <!-- TRĄŠOS -->
                    <div class="bg-tractorSurface p-3 rounded-xl border border-tractorBorder space-y-0.5">
                        <span class="text-slate-400 text-[11px] block font-semibold">🧪 Trąšos (NPK + Salietra):</span>
                        <strong class="font-mono text-amber-400 text-sm font-bold block">${npkTons} t NPK + ${salietraTons} t N</strong>
                        <span class="text-[10px] text-slate-400">Salietra: ~${salietraRate} kg/ha</span>
                    </div>

                    <!-- PURŠKIMAI -->
                    <div class="bg-tractorSurface p-3 rounded-xl border border-tractorBorder space-y-0.5">
                        <span class="text-slate-400 text-[11px] block font-semibold">💦 Purškimo schema:</span>
                        <strong class="text-slate-200 text-xs font-semibold block leading-tight">${sprayPlanText}</strong>
                        <span class="text-[10px] text-slate-400">Kaštai: ~${chemsCost.toFixed(0)} €</span>
                    </div>

                    <!-- FINANSAI -->
                    <div class="bg-tractorSurface p-3 rounded-xl border border-tractorBorder space-y-0.5 text-left sm:text-right">
                        <span class="text-slate-400 text-[11px] block font-semibold">Grynasis pelnas laukui:</span>
                        <strong class="font-mono text-base font-black ${fieldProfit >= 0 ? 'text-green-400' : 'text-red-400'} block">
                            +${Math.round(fieldProfit).toLocaleString('lt-LT')} €
                        </strong>
                        <span class="text-[10px] text-slate-300">Savikaina: ${(fieldTotalCost / area).toFixed(0)} €/ha</span>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    // Metrikos viršuje
    const totalArea = userFieldsList.reduce((acc, f) => acc + parseFloat(f.areaHa || 0), 0);
    const totalBigBags = Math.ceil((totalSeedTons * 1000) / 500);
    const totalFertCombined = (totalNpkTons + totalNitrogenTons).toFixed(1);
    const netProfit = totalRevenue - totalExpenses;
    const profitHa = totalArea > 0 ? (netProfit / totalArea).toFixed(0) : 0;

    container.querySelector('#prod-total-seed-tons').textContent = `${totalSeedTons.toFixed(1)} t`;
    container.querySelector('#prod-total-seed-bags').textContent = `~${totalBigBags} didmaišių (po 500 kg)`;
    container.querySelector('#prod-total-fert-tons').textContent = `${totalFertCombined} t`;
    container.querySelector('#prod-total-fert-cost').textContent = `Biudžetas: ~${Math.round(totalNpkTons * 460 + totalNitrogenTons * 340).toLocaleString('lt-LT')} €`;
    container.querySelector('#prod-total-fuel-liters').textContent = `${totalFuelLiters.toLocaleString('lt-LT')} l`;
    container.querySelector('#prod-total-fuel-cost').textContent = `Biudžetas: ~${Math.round(totalFuelLiters * 0.85).toLocaleString('lt-LT')} €`;
    container.querySelector('#prod-total-net-profit').textContent = `+${Math.round(netProfit).toLocaleString('lt-LT')} €`;
    container.querySelector('#prod-net-profit-ha').textContent = `+${profitHa} €/ha (pagal MATIF)`;

    // Suvestinė tiekėjams
    const summaryGrid = container.querySelector('#prod-summary-grid');
    if (summaryGrid) {
        summaryGrid.innerHTML = `
            <div class="bg-tractorBg p-3 rounded-xl border border-tractorBorder text-center">
                <span class="text-slate-400 block text-[10px] uppercase font-bold">Sėklos didmaišiai</span>
                <strong class="text-white font-mono text-base font-bold">${totalBigBags} vnt.</strong>
            </div>
            <div class="bg-tractorBg p-3 rounded-xl border border-tractorBorder text-center">
                <span class="text-slate-400 block text-[10px] uppercase font-bold">NPK Kompleksinės</span>
                <strong class="text-amber-400 font-mono text-base font-bold">${totalNpkTons.toFixed(1)} t</strong>
            </div>
            <div class="bg-tractorBg p-3 rounded-xl border border-tractorBorder text-center">
                <span class="text-slate-400 block text-[10px] uppercase font-bold">Amonio salietra</span>
                <strong class="text-amber-400 font-mono text-base font-bold">${totalNitrogenTons.toFixed(1)} t</strong>
            </div>
            <div class="bg-tractorBg p-3 rounded-xl border border-tractorBorder text-center">
                <span class="text-slate-400 block text-[10px] uppercase font-bold">Gazolas (Kuras)</span>
                <strong class="text-blue-400 font-mono text-base font-bold">${totalFuelLiters.toLocaleString('lt-LT')} l</strong>
            </div>
            <div class="bg-tractorBg p-3 rounded-xl border border-tractorBorder text-center">
                <span class="text-slate-400 block text-[10px] uppercase font-bold">Bendra apyvarta</span>
                <strong class="text-green-400 font-mono text-base font-bold">${Math.round(totalRevenue).toLocaleString('lt-LT')} €</strong>
            </div>
            <div class="bg-tractorBg p-3 rounded-xl border border-tractorBorder text-center">
                <span class="text-slate-400 block text-[10px] uppercase font-bold">Grynasis pelnas</span>
                <strong class="text-green-500 font-mono text-base font-bold">+${Math.round(netProfit).toLocaleString('lt-LT')} €</strong>
            </div>
        `;
    }

    // Įterpiame laukų detalizaciją
    const listContainer = container.querySelector('#prod-fields-detailed-list');
    if (listContainer) listContainer.innerHTML = fieldsDetailsHtml;
}