// js/ukis/cropPlanner.js
import { db } from '../core/firebase.js';
import { showBottomToast } from '../core/ui.js';
import { getCropPlannerHtml } from './templates/cropPlannerTemplate.js';

let userFieldsList = [];
let cachedUserData = null;

// KULTŪRŲ PROPORCIJOS IR JŲ PURŠKIMŲ DAŽNIS
let currentAllocatorMix = [
    { id: 'Žieminiai kviečiai', share: 50, herb: 1, reg: 1, fung: 2 },
    { id: 'Žieminiai rapsai', share: 40, herb: 1, reg: 2, fung: 3 },
    { id: 'Pupos', share: 10, herb: 1, reg: 0, fung: 1 }
];

// 🌍 GYVŲ KAINŲ KINTAMIEJI (Naudojama skaičiavimams. Vėliau užrašysime iš MATIF / Kuro API)
export let FARM_PRICES = {
    diesel: 0.85,          // Kuro kaina (€/l)
    matifWheat: 225,       // Kviečių kaina (€/t)
    matifRape: 480,        // Rapsų kaina (€/t)
    matifCorn: 200,        // Kukurūzų kaina (€/t)
    
    npkTon: 460,           // NPK trąšų kaina (€/t)
    salietraTon: 340,      // Amonio salietros kaina (€/t)
    herbHa: 25,            // 1x Herbicido kaina (€/ha)
    regHa: 30,             // 1x Reguliatoriaus kaina (€/ha)
    fungHa: 45             // 1x Fungicido kaina (€/ha)
};

// Funkcija, parenkanti teisingą kainą pagal kultūrą
function getLiveCropPrice(cropName, defaultPrice) {
    if (cropName.includes("kvieč")) return FARM_PRICES.matifWheat;
    if (cropName.includes("raps")) return FARM_PRICES.matifRape;
    if (cropName.includes("Kukurūz")) return FARM_PRICES.matifCorn;
    return defaultPrice; 
}

// OFICIALŪS NMA / ŽŪMIS PASĖLIŲ KLASIFIKATORIAUS KODAI
export const NMA_CROP_CODES = {
    "Žieminiai kviečiai": "ŽKV",
    "Žieminiai rapsai": "ŽRP",
    "Žieminiai miežiai": "ŽMŽ",
    "Žieminiai rugiai": "ŽRG",
    "Žieminiai kvietrugiai": "ŽKT",
    "Vasariniai kviečiai": "VKV",
    "Vasariniai rapsai": "VRP",
    "Vasariniai miežiai": "VMŽ",
    "Sėjamosios avižos": "AVŽ",
    "Pašariniai žirniai": "ŽIR",
    "Pupos": "PUP",
    "Kukurūzai grūdams": "KUK",
    "Grikiai": "GRK",
    "Cukriniai runkeliai": "CRN",
    "Juodasis pūdymas": "PŪD",
    "Žaliasis pūdymas": "ŽPŪ"
};

function getAgriculturalPlanningYear() {
    const now = new Date();
    return now.getMonth() >= 7 ? now.getFullYear() + 1 : now.getFullYear();
}

let planningYear = getAgriculturalPlanningYear();
let yearPrev1 = planningYear - 1; // Pernai
let yearPrev2 = planningYear - 2; // Užpernai

export const CROPS_CATALOG = {
    "Žieminiai kviečiai": { category: "Varpiniai", seedRateKg: 220, seedPriceTon: 420, fertN: 170, yieldTonHa: 6.5, matifPrice: 225 },
    "Žieminiai rapsai": { category: "Kryžmažiedžiai", seedRateKg: 4.5, seedPriceTon: 1200, fertN: 190, yieldTonHa: 3.5, matifPrice: 510 },
    "Žieminiai miežiai": { category: "Varpiniai", seedRateKg: 190, seedPriceTon: 390, fertN: 130, yieldTonHa: 5.8, matifPrice: 190 },
    "Žieminiai rugiai": { category: "Varpiniai", seedRateKg: 180, seedPriceTon: 360, fertN: 120, yieldTonHa: 4.8, matifPrice: 170 },
    "Žieminiai kvietrugiai": { category: "Varpiniai", seedRateKg: 200, seedPriceTon: 370, fertN: 130, yieldTonHa: 5.2, matifPrice: 180 },

    "Vasariniai kviečiai": { category: "Varpiniai", seedRateKg: 230, seedPriceTon: 410, fertN: 140, yieldTonHa: 5.2, matifPrice: 220 },
    "Vasariniai rapsai": { category: "Kryžmažiedžiai", seedRateKg: 5.5, seedPriceTon: 1100, fertN: 150, yieldTonHa: 2.6, matifPrice: 490 },
    "Vasariniai miežiai": { category: "Varpiniai", seedRateKg: 200, seedPriceTon: 390, fertN: 110, yieldTonHa: 5.5, matifPrice: 185 },
    "Sėjamosios avižos": { category: "Varpiniai", seedRateKg: 170, seedPriceTon: 350, fertN: 90, yieldTonHa: 4.5, matifPrice: 175 },
    "Pašariniai žirniai": { category: "Pupiniai (Azotas)", seedRateKg: 260, seedPriceTon: 550, fertN: 20, yieldTonHa: 3.8, matifPrice: 270 },
    "Pupos": { category: "Pupiniai (Azotas)", seedRateKg: 280, seedPriceTon: 580, fertN: 20, yieldTonHa: 4.2, matifPrice: 280 },
    "Kukurūzai grūdams": { category: "Varpiniai", seedRateKg: 25, seedPriceTon: 2400, fertN: 160, yieldTonHa: 8.5, matifPrice: 200 },
    "Grikiai": { category: "Kita", seedRateKg: 85, seedPriceTon: 600, fertN: 50, yieldTonHa: 1.8, matifPrice: 380 },
    "Cukriniai runkeliai": { category: "Šakniavaisiai", seedRateKg: 25, seedPriceTon: 1800, fertN: 140, yieldTonHa: 65.0, matifPrice: 38 },

    "Juodasis pūdymas": { category: "Pūdymas", seedRateKg: 0, seedPriceTon: 0, fertN: 0, yieldTonHa: 0, matifPrice: 0 },
    "Žaliasis pūdymas": { category: "Pūdymas (Ekoschema)", seedRateKg: 30, seedPriceTon: 350, fertN: 0, yieldTonHa: 0, matifPrice: 0 }
};

export function initCropPlannerTab(currentUser, userData) {
    const container = document.getElementById('view-tab-cropplanner');
    if (!container) return;

    cachedUserData = userData;
    planningYear = getAgriculturalPlanningYear();
    yearPrev1 = planningYear - 1;
    yearPrev2 = planningYear - 2;

    container.innerHTML = getCropPlannerHtml(planningYear);

    setupPlannerTabs();
    setupPlannerEvents(currentUser);
    loadUserFieldsForPlanner(currentUser);
}

function setupPlannerTabs() {
    const btnProd = document.getElementById('tab-btn-production');
    const btnGaab = document.getElementById('tab-btn-gaab');
    const viewProd = document.getElementById('view-planner-production');
    const viewGaab = document.getElementById('view-planner-gaab');

    if (btnProd && btnGaab) {
        btnProd.onclick = () => {
            btnProd.className = "px-4 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer bg-tractorPrimary text-white shadow";
            btnGaab.className = "px-4 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer text-slate-400 hover:text-white";
            viewProd.classList.remove('hidden');
            viewGaab.classList.add('hidden');
        };

        btnGaab.onclick = () => {
            btnGaab.className = "px-4 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer bg-tractorPrimary text-white shadow";
            btnProd.className = "px-4 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer text-slate-400 hover:text-white";
            viewGaab.classList.remove('hidden');
            viewProd.classList.add('hidden');
            renderPlannerMatrix();
            evaluateGaab7Rules();
        };
    }
}

function loadUserFieldsForPlanner(currentUser) {
    if (!currentUser) return;

    db.collection("user_fields").where("userId", "==", currentUser.uid).onSnapshot(snap => {
        userFieldsList = [];
        snap.forEach(doc => {
            const f = doc.data();
            if (!f.cropHistory) f.cropHistory = {};
            if (!f.cropHistory[String(yearPrev1)]) f.cropHistory[String(yearPrev1)] = f.crop || "Žieminiai kviečiai";
            if (!f.cropHistory[String(planningYear)]) f.cropHistory[String(planningYear)] = f.crop || "Žieminiai kviečiai";
            userFieldsList.push(f);
        });

        // Surūšiuojame laukus pagal plotą (didžiausi viršuje)
        userFieldsList.sort((a, b) => parseFloat(b.areaHa || 0) - parseFloat(a.areaHa || 0));

        renderDetailedFieldCards();
        renderPlannerMatrix();
        evaluateGaab7Rules();
        recalculateResourceBasket();
    });
}

function renderDetailedFieldCards() {
    const container = document.getElementById('detailed-fields-production-list');
    const counterEl = document.getElementById('fields-overview-counter');
    if (!container) return;

    if (counterEl) counterEl.textContent = `Viso laukų: ${userFieldsList.length}`;

    if (userFieldsList.length === 0) {
        container.innerHTML = `
            <div class="text-center py-10 text-slate-500 text-xs">
                Dar neturite sukurtų laukų. Pirmiausia pridėkite laukus skiltyje „Mano Laukai“.
            </div>
        `;
        return;
    }

    container.innerHTML = userFieldsList.map(f => {
        const area = parseFloat(f.areaHa || 0);
        const plannedCrop = f.cropHistory?.[String(planningYear)] || f.crop || "Žieminiai kviečiai";
        const meta = CROPS_CATALOG[plannedCrop] || CROPS_CATALOG["Žieminiai kviečiai"];
        const mixItem = currentAllocatorMix.find(m => m.id === plannedCrop) || { herb: 1, reg: 1, fung: 2 };

        // Skaičiavimai
        const seedKg = Math.round(area * meta.seedRateKg);
        const seedTons = (seedKg / 1000).toFixed(2);
        const seedBags = Math.ceil(seedKg / 500);

        const npkRateKg = 250;
        const npkTons = ((area * npkRateKg) / 1000).toFixed(1);

        const salietraRateKg = Math.round(meta.fertN / 0.344);
        const salietraTons = ((area * salietraRateKg) / 1000).toFixed(1);

        const fuelLiters = Math.round(area * 100);
        const sprayText = `${mixItem.herb}x Herb. • ${mixItem.reg}x Reg. • ${mixItem.fung}x Fung.`;

        // Finansų skaičiavimas su gyvomis kainomis (FARM_PRICES)
        const yieldTons = (area * meta.yieldTonHa).toFixed(1);
        const livePrice = getLiveCropPrice(plannedCrop, meta.matifPrice);
        const revenue = yieldTons * livePrice;
        
        const expSeed = (seedKg / 1000) * meta.seedPriceTon;
        const expFert = parseFloat(salietraTons) * FARM_PRICES.salietraTon + parseFloat(npkTons) * FARM_PRICES.npkTon;
        const expFuel = fuelLiters * FARM_PRICES.diesel;
        const expChems = area * (mixItem.herb * FARM_PRICES.herbHa + mixItem.reg * FARM_PRICES.regHa + mixItem.fung * FARM_PRICES.fungHa);
        
        const totalExp = expSeed + expFert + expFuel + expChems;
        const profit = Math.round(revenue - totalExp);

        return `
            <div class="bg-tractorBg border border-tractorBorder hover:border-tractorPrimary/60 rounded-2xl p-4 md:p-5 space-y-4 transition shadow-sm">
                <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-tractorBorder/70 pb-3">
                    <div class="space-y-0.5">
                        <div class="flex items-center gap-2">
                            <span class="text-xl">🌾</span>
                            <h4 class="font-bold text-base md:text-lg text-white">${f.name}</h4>
                            <span class="text-xs bg-tractorSurface px-2.5 py-0.5 rounded-lg font-mono font-bold text-green-400 border border-tractorBorder">
                                ${f.areaHa} ha
                            </span>
                            ${f.fieldBlockNumber ? `<span class="text-xs text-slate-400">(${f.fieldBlockNumber})</span>` : ''}
                        </div>
                        <span class="text-[11px] text-slate-400">Planuojamas derlius: <strong class="text-slate-200 font-mono">${meta.yieldTonHa} t/ha (${yieldTons} t)</strong></span>
                    </div>

                    <div class="flex items-center gap-2">
                        <span class="text-xs text-slate-400 font-medium">Pasėlis:</span>
                        <select class="field-direct-crop-select h-9 bg-tractorSurface border border-tractorBorder focus:border-tractorPrimary rounded-xl px-2.5 text-xs font-bold text-white outline-none cursor-pointer" data-field-id="${f.id}">
                            ${Object.keys(CROPS_CATALOG).map(c => `
                                <option value="${c}" ${c === plannedCrop ? 'selected' : ''}>${c}</option>
                            `).join('')}
                        </select>
                    </div>
                </div>

                <div class="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                    <div class="bg-tractorSurface p-3 rounded-xl border border-tractorBorder space-y-1">
                        <span class="text-slate-400 block text-[11px] font-semibold flex items-center gap-1">
                            <span>🌱</span> <span>Beicuota sėkla</span>
                        </span>
                        <strong class="font-mono text-white text-base block font-black">${seedTons} t</strong>
                        <span class="text-[10px] text-slate-400 font-medium block">~${seedBags} didmaišiai (${meta.seedRateKg} kg/ha)</span>
                    </div>

                    <div class="bg-tractorSurface p-3 rounded-xl border border-tractorBorder space-y-1">
                        <span class="text-slate-400 block text-[11px] font-semibold flex items-center gap-1">
                            <span>🧪</span> <span>Trąšos</span>
                        </span>
                        <strong class="font-mono text-amber-400 text-sm block font-bold">
                            ${salietraTons} t N + ${npkTons} t NPK
                        </strong>
                        <span class="text-[10px] text-slate-400 font-medium block">Salietra: ~${salietraRateKg} kg/ha</span>
                    </div>

                    <div class="bg-tractorSurface p-3 rounded-xl border border-tractorBorder space-y-1">
                        <span class="text-slate-400 block text-[11px] font-semibold flex items-center gap-1">
                            <span>💦</span> <span>Apsaugos planas</span>
                        </span>
                        <strong class="text-slate-200 text-xs block font-bold leading-tight">${sprayText}</strong>
                        <span class="text-[10px] text-slate-400 font-medium block">Chemija: ~${expChems.toFixed(0)} €</span>
                    </div>

                    <div class="bg-tractorSurface p-3 rounded-xl border border-tractorBorder space-y-1">
                        <span class="text-slate-400 block text-[11px] font-semibold flex items-center gap-1">
                            <span>⛽</span> <span>Kuras ir Finansai</span>
                        </span>
                        <strong class="font-mono text-blue-400 text-sm block font-bold">~${fuelLiters.toLocaleString('lt-LT')} l kuro</strong>
                        <span class="text-[10px] font-bold ${profit >= 0 ? 'text-green-400' : 'text-red-400'} block">
                            Grynasis: +${profit.toLocaleString('lt-LT')} €
                        </span>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    // AUTO-SAVE: Lauko pasėlio pakeitimo įvykiai
    container.querySelectorAll('.field-direct-crop-select').forEach(sel => {
        sel.onchange = async (e) => {
            const fId = sel.getAttribute('data-field-id');
            const newCrop = e.target.value;
            const field = userFieldsList.find(f => f.id === fId);
            
            if (field) {
                field.cropHistory[String(planningYear)] = newCrop;
                
                renderDetailedFieldCards();
                recalculateResourceBasket();
                evaluateGaab7Rules();

                try {
                    await db.collection("user_fields").doc(fId).update({
                        cropHistory: field.cropHistory
                    });
                    showBottomToast(`Išsaugota: „${field.name}“ pasėlis pakeistas į ${newCrop} 💾`);
                } catch (err) {
                    console.error("Klaida saugant pasėlį:", err);
                    showBottomToast("Nepavyko išsaugoti pakeitimo internete!", "error");
                }
            }
        };
    });
}

function recalculateResourceBasket() {
    let totalSeedTons = 0;
    let totalFertN = 0;
    let totalNpkTons = 0;
    let totalRevenue = 0;
    let totalExpenses = 0;

    userFieldsList.forEach(f => {
        const area = parseFloat(f.areaHa || 0);
        const planned = f.cropHistory?.[String(planningYear)] || f.crop || "Žieminiai kviečiai";
        const meta = CROPS_CATALOG[planned] || CROPS_CATALOG["Žieminiai kviečiai"];
        const mixItem = currentAllocatorMix.find(m => m.id === planned) || { herb: 1, reg: 1, fung: 2 };

        const seedTons = (area * meta.seedRateKg) / 1000;
        totalSeedTons += seedTons;
        totalFertN += (area * meta.fertN);
        totalNpkTons += (area * 250) / 1000;

        const yieldTons = area * meta.yieldTonHa;
        const livePrice = getLiveCropPrice(planned, meta.matifPrice);
        const revenue = yieldTons * livePrice;
        
        const expSeed = seedTons * meta.seedPriceTon;
        const expFert = (area * meta.fertN / 0.344) / 1000 * FARM_PRICES.salietraTon + ((area * 250) / 1000) * FARM_PRICES.npkTon;
        const expFuel = area * 100 * FARM_PRICES.diesel;
        const expChems = area * (mixItem.herb * FARM_PRICES.herbHa + mixItem.reg * FARM_PRICES.regHa + mixItem.fung * FARM_PRICES.fungHa);

        totalRevenue += revenue;
        totalExpenses += (expSeed + expFert + expFuel + expChems);
    });

    const totalArea = userFieldsList.reduce((acc, f) => acc + parseFloat(f.areaHa || 0), 0);
    const totalBigBags = Math.ceil((totalSeedTons * 1000) / 500);
    const totalSalietraTons = (totalFertN / 0.344 / 1000);
    const totalFertCombined = (totalSalietraTons + totalNpkTons).toFixed(1);
    const totalFuelLiters = Math.round(totalArea * 100);
    const netProfit = totalRevenue - totalExpenses;
    const profitHa = totalArea > 0 ? (netProfit / totalArea).toFixed(0) : 0;

    const elSeedTons = document.getElementById('basket-total-seed-tons');
    const elSeedBags = document.getElementById('basket-total-seed-bags');
    const elFertTons = document.getElementById('basket-total-fert-tons');
    const elFertCost = document.getElementById('basket-total-fert-cost');
    const elFuelLiters = document.getElementById('basket-total-fuel-liters');
    const elFuelCost = document.getElementById('basket-total-fuel-cost');
    const elNetProfit = document.getElementById('basket-total-net-profit');
    const elProfitHa = document.getElementById('basket-net-profit-ha');

    if (elSeedTons) elSeedTons.textContent = `${totalSeedTons.toFixed(1)} t`;
    if (elSeedBags) elSeedBags.textContent = `~${totalBigBags} didmaišių (po 500 kg)`;
    if (elFertTons) elFertTons.textContent = `${totalFertCombined} t`;
    if (elFertCost) elFertCost.textContent = `Salietra: ~${totalSalietraTons.toFixed(1)}t • NPK: ~${totalNpkTons.toFixed(1)}t`;
    if (elFuelLiters) elFuelLiters.textContent = `${totalFuelLiters.toLocaleString('lt-LT')} l`;
    if (elFuelCost) elFuelCost.textContent = `Biudžetas: ~${Math.round(totalFuelLiters * FARM_PRICES.diesel).toLocaleString('lt-LT')} €`;
    if (elNetProfit) elNetProfit.textContent = `+${Math.round(netProfit).toLocaleString('lt-LT')} €`;
    if (elProfitHa) elProfitHa.textContent = `+${profitHa} €/ha`;
}

function renderPlannerMatrix() {
    const tbody = document.getElementById('crop-planner-table-body');
    if (!tbody) return;

    if (userFieldsList.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="py-8 text-center text-slate-500">Dar neturite sukurtų laukų.</td></tr>`;
        return;
    }

    tbody.innerHTML = userFieldsList.map(f => {
        const cPrev2 = f.cropHistory[String(yearPrev2)] || "Nenurodyta";
        const cPrev1 = f.cropHistory[String(yearPrev1)] || "Nenurodyta";
        const planCurrent = f.cropHistory[String(planningYear)] || f.crop || "Žieminiai kviečiai";

        const isChanged = (cPrev1 !== "Nenurodyta" && planCurrent !== cPrev1);
        const isMonoculture3Yr = (cPrev2 === cPrev1 && cPrev1 === planCurrent && cPrev2 !== "Nenurodyta");

        let nmaBadge = `<span class="px-2 py-0.5 rounded text-[11px] font-bold bg-green-500/20 text-green-600 dark:text-green-400">🟢 Pakeistas (NMA leistina)</span>`;
        if (isMonoculture3Yr) {
            nmaBadge = `<span class="px-2 py-0.5 rounded text-[11px] font-bold bg-red-600 text-white animate-pulse">🔴 3 m. iš eilės!</span>`;
        } else if (!isChanged && cPrev1 !== "Nenurodyta") {
            nmaBadge = `<span class="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-500/20 text-amber-500">🟡 Tas pats (2 m.)</span>`;
        }

        return `
            <tr class="hover:bg-tractorBg/40 transition">
                <td class="py-3 px-2 font-bold text-white text-sm">${f.name}</td>
                <td class="py-3 px-2 font-mono font-bold text-green-400">${f.areaHa} ha</td>
                <td class="py-3 px-2 text-slate-300 font-semibold">${cPrev2}</td>
                <td class="py-3 px-2 text-slate-300 font-semibold">${cPrev1}</td>
                <td class="py-2 px-2">
                    <select class="matrix-plan-crop-select h-9 bg-tractorBg border border-tractorBorder focus:border-tractorPrimary rounded-lg px-2 text-xs font-bold text-white outline-none cursor-pointer w-full max-w-[220px]" data-field-id="${f.id}">
                        ${Object.keys(CROPS_CATALOG).map(c => `
                            <option value="${c}" ${c === planCurrent ? 'selected' : ''}>${c}</option>
                        `).join('')}
                    </select>
                </td>
                <td class="py-3 px-2 text-right">
                    <div>${nmaBadge}</div>
                </td>
            </tr>
        `;
    }).join('');

    // AUTO-SAVE: Sėjomainos matricos dropdown
    tbody.querySelectorAll('.matrix-plan-crop-select').forEach(sel => {
        sel.onchange = async (e) => {
            const fId = sel.getAttribute('data-field-id');
            const newCrop = e.target.value;
            const field = userFieldsList.find(f => f.id === fId);
            
            if (field) {
                field.cropHistory[String(planningYear)] = newCrop;
                
                evaluateGaab7Rules();
                renderPlannerMatrix();
                renderDetailedFieldCards();
                recalculateResourceBasket();

                try {
                    await db.collection("user_fields").doc(fId).update({
                        cropHistory: field.cropHistory
                    });
                    showBottomToast(`Išsaugota: „${field.name}“ pasėlis pakeistas į ${newCrop} 💾`);
                } catch (err) {
                    showBottomToast("Nepavyko išsaugoti pakeitimo!", "error");
                }
            }
        };
    });
}

function evaluateGaab7Rules() {
    const totalArea = userFieldsList.reduce((acc, f) => acc + parseFloat(f.areaHa || 0), 0);
    let changedArea = 0;
    let monocultureViolations = 0;
    let missingHistoryCount = 0;

    userFieldsList.forEach(f => {
        const cPrev2 = f.cropHistory?.[String(yearPrev2)];
        const cPrev1 = f.cropHistory?.[String(yearPrev1)];
        const planCurrent = f.cropHistory?.[String(planningYear)] || f.crop;

        if (!cPrev2 || cPrev2 === "Nenurodyta") missingHistoryCount++;

        if (cPrev1 && cPrev1 !== "Nenurodyta" && planCurrent !== cPrev1) {
            changedArea += parseFloat(f.areaHa || 0);
        }

        if (cPrev2 && cPrev1 && cPrev2 === cPrev1 && cPrev1 === planCurrent) {
            monocultureViolations++;
        }
    });

    const changePercent = totalArea > 0 ? ((changedArea / totalArea) * 100).toFixed(1) : "0.0";

    const pctEl = document.getElementById('gaab-change-percent');
    const statusEl = document.getElementById('gaab-change-status');
    const cardDiv = document.getElementById('card-gaab-diversification');

    if (pctEl) pctEl.textContent = `${changePercent}%`;

    if (parseFloat(changePercent) >= 35.0) {
        if (statusEl) statusEl.innerHTML = `🟢 GAAB 7 įvykdytas (Kaita &ge; 35%)`;
        if (statusEl) statusEl.className = "text-xs font-bold text-green-500";
        if (cardDiv) cardDiv.className = "bg-tractorSurface border-2 border-green-500/80 p-5 rounded-2xl space-y-2 shadow-lg";
    } else {
        const neededHa = ((totalArea * 0.35) - changedArea).toFixed(1);
        if (statusEl) statusEl.innerHTML = `🔴 Trūksta dar ${neededHa} ha iki 35% normos!`;
        if (statusEl) statusEl.className = "text-xs font-bold text-red-500";
        if (cardDiv) cardDiv.className = "bg-tractorSurface border-2 border-red-500/80 p-5 rounded-2xl space-y-2 shadow-lg";
    }

    const monoCountEl = document.getElementById('gaab-monoculture-count');
    const monoStatusEl = document.getElementById('gaab-monoculture-status');
    const monoCard = document.getElementById('card-gaab-monoculture');

    if (monoCountEl) monoCountEl.textContent = monocultureViolations;

    if (monocultureViolations === 0) {
        if (monoStatusEl) monoStatusEl.innerHTML = `🟢 0 laukų viršija leistiną ribą`;
        if (monoStatusEl) monoStatusEl.className = "text-xs font-bold text-green-500";
        if (monoCard) monoCard.className = "bg-tractorSurface border-2 border-tractorBorder p-5 rounded-2xl space-y-2";
    } else {
        if (monoStatusEl) monoStatusEl.innerHTML = `🔴 ${monocultureViolations} laukai 3 m. iš eilės ta pati kultūra!`;
        if (monoStatusEl) monoStatusEl.className = "text-xs font-bold text-red-500";
        if (monoCard) monoCard.className = "bg-tractorSurface border-2 border-red-500 p-5 rounded-2xl space-y-2";
    }

    const dataStatusEl = document.getElementById('gaab-data-status');
    const dataCard = document.getElementById('card-gaab-data-completeness');

    if (missingHistoryCount > 0) {
        if (dataStatusEl) dataStatusEl.innerHTML = `🟡 RIZIKA: ${missingHistoryCount} laukams trūksta ${yearPrev2} m. duomenų`;
        if (dataStatusEl) dataStatusEl.className = "text-xs font-bold text-amber-500";
        if (dataCard) dataCard.className = "bg-tractorSurface border-2 border-amber-500 p-5 rounded-2xl space-y-3 flex flex-col justify-between";
    } else {
        if (dataStatusEl) dataStatusEl.innerHTML = `🟢 Visi istorijos metai suvesti`;
        if (dataStatusEl) dataStatusEl.className = "text-xs font-bold text-green-500";
        if (dataCard) dataCard.className = "bg-tractorSurface border-2 border-tractorBorder p-5 rounded-2xl space-y-3 flex flex-col justify-between";
    }
}

function setupPlannerEvents(currentUser) {
    const saveBtn = document.getElementById('btn-save-crop-plan');
    const saveBtnGaab = document.getElementById('btn-save-crop-plan-gaab');
    const editHistoryAllBtn = document.getElementById('btn-edit-history-all');
    const modal = document.getElementById('crop-history-modal');
    const closeBtn = document.getElementById('btn-close-history-modal');
    const saveAllHistoryBtn = document.getElementById('btn-save-all-history');

    const openAllocatorBtn = document.getElementById('btn-open-smart-allocator');
    const allocatorModal = document.getElementById('smart-allocator-modal');
    const closeAllocatorBtn = document.getElementById('btn-close-allocator-modal');
    const runAllocatorBtn = document.getElementById('btn-run-smart-allocation');

    // Eksporto mygtukai
    const btnPdf = document.getElementById('btn-export-plan-pdf');
    const btnXls = document.getElementById('btn-export-plan-xls');
    const btnGeoJson = document.getElementById('btn-export-nma-geojson');

    if (btnPdf) btnPdf.onclick = () => printProductionPlanPdf();
    if (btnXls) btnXls.onclick = () => exportProductionPlanToExcel();
    if (btnGeoJson) btnGeoJson.onclick = () => exportNmaDeclarationGeoJson();

    const handleSavePlan = async () => {
        showBottomToast("Išsaugoma sėjomainos vizija...");
        const batch = db.batch();
        userFieldsList.forEach(f => {
            const ref = db.collection("user_fields").doc(f.id);
            batch.update(ref, { cropHistory: f.cropHistory });
        });
        await batch.commit();
        showBottomToast(`${planningYear} m. sėjomainos planas sėkmingai išsaugotas! 🌾`);
    };

    if (saveBtn) saveBtn.onclick = handleSavePlan;
    if (saveBtnGaab) saveBtnGaab.onclick = handleSavePlan;

    const openHistoryModal = () => {
        if (modal) modal.classList.remove('hidden');
        renderHistoryModalInputs();
    };

    if (editHistoryAllBtn) editHistoryAllBtn.onclick = openHistoryModal;
    if (closeBtn && modal) closeBtn.onclick = () => modal.classList.add('hidden');

    if (openAllocatorBtn && allocatorModal) {
        openAllocatorBtn.onclick = () => {
            allocatorModal.classList.remove('hidden');
            renderAllocatorMixRows();
        };
    }
    if (closeAllocatorBtn && allocatorModal) {
        closeAllocatorBtn.onclick = () => allocatorModal.classList.add('hidden');
    }

    const addAllocRowBtn = document.getElementById('btn-add-allocator-row');
    if (addAllocRowBtn) {
        addAllocRowBtn.onclick = () => {
            if (currentAllocatorMix.length < 8) {
                const unusedCrop = Object.keys(CROPS_CATALOG).find(c => !currentAllocatorMix.some(m => m.id === c)) || 'Žieminiai miežiai';
                currentAllocatorMix.push({ id: unusedCrop, share: 10, herb: 1, reg: 1, fung: 2 });
                renderAllocatorMixRows();
            }
        };
    }

    if (runAllocatorBtn) {
        runAllocatorBtn.onclick = async () => { 
            let total = currentAllocatorMix.reduce((acc, m) => acc + m.share, 0);
            if (total !== 100) {
                showBottomToast("Procentų suma privalo sudaryti lygiai 100%!", "error");
                return;
            }

            runSmartAllocationAlgorithm();
            allocatorModal.classList.add('hidden');
            
            renderDetailedFieldCards();
            recalculateResourceBasket();
            evaluateGaab7Rules();
            renderPlannerMatrix();
            
            showBottomToast("Skaičiuojama ir saugoma...");

            try {
                const batch = db.batch();
                userFieldsList.forEach(f => {
                    const ref = db.collection("user_fields").doc(f.id);
                    batch.update(ref, { cropHistory: f.cropHistory });
                });
                await batch.commit();
                showBottomToast("Ūkis sėkmingai suplanuotas ir automatiškai išsaugotas! 🚀");
            } catch (err) {
                showBottomToast("Nepavyko išsaugoti grupinio planavimo!", "error");
            }
        };
    }

    if (saveAllHistoryBtn) {
        saveAllHistoryBtn.onclick = async () => {
            showBottomToast("Išsaugomi istoriniai duomenys...");
            const batch = db.batch();

            modal.querySelectorAll('.history-field-row').forEach(row => {
                const fId = row.getAttribute('data-field-id');
                const selPrev2 = row.querySelector('.hist-year-prev2-select').value;
                const selPrev1 = row.querySelector('.hist-year-prev1-select').value;
                const field = userFieldsList.find(f => f.id === fId);
                if (field) {
                    field.cropHistory[String(yearPrev2)] = selPrev2;
                    field.cropHistory[String(yearPrev1)] = selPrev1;
                    const ref = db.collection("user_fields").doc(fId);
                    batch.update(ref, { cropHistory: field.cropHistory });
                }
            });

            await batch.commit();
            modal.classList.add('hidden');
            showBottomToast("Istorija užfiksuota! Šviesoforas atnaujintas. 🟢");
            evaluateGaab7Rules();
            renderPlannerMatrix();
            renderDetailedFieldCards();
        };
    }
}

function renderAllocatorMixRows() {
    const rowsContainer = document.getElementById('allocator-mix-rows');
    if (!rowsContainer) return;

    rowsContainer.innerHTML = currentAllocatorMix.map((item, idx) => {
        let optionsHtml = '';
        for (const cropName of Object.keys(CROPS_CATALOG)) {
            optionsHtml += `<option value="${cropName}" ${cropName === item.id ? 'selected' : ''}>${cropName}</option>`;
        }

        return `
            <div class="p-3.5 bg-tractorBg rounded-xl border border-tractorBorder space-y-3" data-idx="${idx}">
                <div class="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-center">
                    <div class="sm:col-span-7">
                        <label class="text-[10px] uppercase font-bold text-slate-400 block mb-1">Kultūra #${idx + 1}</label>
                        <select class="alloc-crop-select w-full h-9 bg-tractorSurface border border-tractorBorder rounded-lg px-2 text-xs font-bold text-white outline-none cursor-pointer">
                            ${optionsHtml}
                        </select>
                    </div>

                    <div class="sm:col-span-4">
                        <label class="text-[10px] uppercase font-bold text-slate-400 block mb-1">Dalis ūkyje (%)</label>
                        <div class="flex items-center gap-1">
                            <input type="number" step="5" min="0" max="100" value="${item.share}" class="alloc-share-input w-full h-9 bg-tractorSurface border border-tractorBorder rounded-lg px-2 text-xs font-bold font-mono text-white outline-none">
                            <span class="text-xs text-slate-400 font-bold">%</span>
                        </div>
                    </div>

                    <div class="sm:col-span-1 flex justify-end pt-4 sm:pt-0">
                        ${currentAllocatorMix.length > 1 ? `
                            <button type="button" class="btn-remove-alloc-row w-8 h-8 rounded-lg bg-red-950/20 hover:bg-red-950/40 border border-red-800/40 text-red-400 text-xs font-bold flex items-center justify-center cursor-pointer transition">
                                ✕
                            </button>
                        ` : ''}
                    </div>
                </div>

                <div class="grid grid-cols-3 gap-2 pt-2 border-t border-tractorBorder/60 text-[11px]">
                    <div>
                        <span class="text-slate-400 block">Herbicidas (kartai):</span>
                        <input type="number" min="0" max="4" value="${item.herb}" class="alloc-herb-input w-full h-7 bg-tractorSurface border border-tractorBorder rounded px-1.5 text-center font-mono font-bold text-white outline-none">
                    </div>
                    <div>
                        <span class="text-slate-400 block">Reguliatorius (kartai):</span>
                        <input type="number" min="0" max="4" value="${item.reg}" class="alloc-reg-input w-full h-7 bg-tractorSurface border border-tractorBorder rounded px-1.5 text-center font-mono font-bold text-white outline-none">
                    </div>
                    <div>
                        <span class="text-slate-400 block">Fungicidai (kartai):</span>
                        <input type="number" min="0" max="4" value="${item.fung}" class="alloc-fung-input w-full h-7 bg-tractorSurface border border-tractorBorder rounded px-1.5 text-center font-mono font-bold text-white outline-none">
                    </div>
                </div>
            </div>
        `;
    }).join('');

    rowsContainer.querySelectorAll('.alloc-crop-select').forEach((sel, idx) => {
        sel.onchange = (e) => {
            currentAllocatorMix[idx].id = e.target.value;
            validateAllocatorSum();
        };
    });

    rowsContainer.querySelectorAll('.alloc-share-input').forEach((inp, idx) => {
        inp.oninput = (e) => {
            currentAllocatorMix[idx].share = parseFloat(e.target.value) || 0;
            validateAllocatorSum();
        };
    });

    rowsContainer.querySelectorAll('.alloc-herb-input').forEach((inp, idx) => {
        inp.oninput = (e) => { currentAllocatorMix[idx].herb = parseInt(e.target.value) || 0; };
    });

    rowsContainer.querySelectorAll('.alloc-reg-input').forEach((inp, idx) => {
        inp.oninput = (e) => { currentAllocatorMix[idx].reg = parseInt(e.target.value) || 0; };
    });

    rowsContainer.querySelectorAll('.alloc-fung-input').forEach((inp, idx) => {
        inp.oninput = (e) => { currentAllocatorMix[idx].fung = parseInt(e.target.value) || 0; };
    });

    rowsContainer.querySelectorAll('.btn-remove-alloc-row').forEach((btn, idx) => {
        btn.onclick = () => {
            currentAllocatorMix.splice(idx, 1);
            renderAllocatorMixRows();
            validateAllocatorSum();
        };
    });

    validateAllocatorSum();
}

function validateAllocatorSum() {
    let sum = 0;
    currentAllocatorMix.forEach(m => sum += m.share);

    const ind = document.getElementById('allocator-sum-indicator');
    const err = document.getElementById('allocator-sum-error');
    const runBtn = document.getElementById('btn-run-smart-allocation');

    if (ind) ind.textContent = `Viso: ${sum}%`;

    if (sum !== 100) {
        if (ind) ind.className = "font-mono font-bold px-3 py-1 rounded-lg bg-red-500/20 text-red-400 border border-red-500/40";
        if (err) err.classList.remove('hidden');
        if (runBtn) { runBtn.disabled = true; runBtn.style.opacity = '0.5'; }
    } else {
        if (ind) ind.className = "font-mono font-bold px-3 py-1 rounded-lg bg-green-500/20 text-green-400 border border-green-500/40";
        if (err) err.classList.add('hidden');
        if (runBtn) { runBtn.disabled = false; runBtn.style.opacity = '1'; }
    }
}

function runSmartAllocationAlgorithm() {
    const totalArea = userFieldsList.reduce((acc, f) => acc + parseFloat(f.areaHa || 0), 0);
    const sortedFields = [...userFieldsList].sort((a, b) => parseFloat(b.areaHa || 0) - parseFloat(a.areaHa || 0));

    const targetAreas = {};
    currentAllocatorMix.forEach(item => {
        if (item.share > 0) targetAreas[item.id] = totalArea * (item.share / 100);
    });

    const assignedAreas = {};
    Object.keys(targetAreas).forEach(c => assignedAreas[c] = 0);

    sortedFields.forEach(f => {
        const area = parseFloat(f.areaHa || 0);
        const cPrev2 = f.cropHistory[String(yearPrev2)];
        const cPrev1 = f.cropHistory[String(yearPrev1)];

        let bestCrop = Object.keys(targetAreas)[0];
        let maxScore = -Infinity;

        for (const crop of Object.keys(targetAreas)) {
            const deficit = targetAreas[crop] - assignedAreas[crop];
            let score = deficit;

            if (cPrev2 === cPrev1 && cPrev1 === crop) {
                score -= 5000;
            } else if (cPrev1 === crop) {
                score -= 500;
            } else {
                score += 100;
            }

            if (score > maxScore) {
                maxScore = score;
                bestCrop = crop;
            }
        }

        f.cropHistory[String(planningYear)] = bestCrop;
        assignedAreas[bestCrop] += area;
    });
}

function renderHistoryModalInputs() {
    const listEl = document.getElementById('crop-history-inputs-list');
    if (!listEl) return;

    listEl.innerHTML = userFieldsList.map(f => {
        const cPrev2 = f.cropHistory?.[String(yearPrev2)] || "Žieminiai kviečiai";
        const cPrev1 = f.cropHistory?.[String(yearPrev1)] || f.crop || "Žieminiai kviečiai";

        return `
            <div class="history-field-row bg-tractorBg p-3.5 rounded-xl border border-tractorBorder flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs" data-field-id="${f.id}">
                <div>
                    <strong class="text-white text-sm block font-bold">${f.name}</strong>
                    <span class="text-green-400 font-mono font-bold text-[11px]">${f.areaHa} ha</span>
                </div>
                
                <div class="flex flex-wrap items-center gap-2">
                    <div class="space-y-0.5">
                        <span class="text-slate-400 text-[10px] block">${yearPrev2} m. (Užpernai):</span>
                        <select class="hist-year-prev2-select h-8 bg-tractorSurface border border-tractorBorder rounded-lg px-2 text-xs font-bold text-white outline-none cursor-pointer">
                            ${Object.keys(CROPS_CATALOG).map(c => `
                                <option value="${c}" ${c === cPrev2 ? 'selected' : ''}>${c}</option>
                            `).join('')}
                        </select>
                    </div>

                    <div class="space-y-0.5">
                        <span class="text-slate-400 text-[10px] block">${yearPrev1} m. (Pernai):</span>
                        <select class="hist-year-prev1-select h-8 bg-tractorSurface border border-tractorBorder rounded-lg px-2 text-xs font-bold text-white outline-none cursor-pointer">
                            ${Object.keys(CROPS_CATALOG).map(c => `
                                <option value="${c}" ${c === cPrev1 ? 'selected' : ''}>${c}</option>
                            `).join('')}
                        </select>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// =========================================================================
// 🖨️ 1. OFICIALI PDF / A4 SPAUSDINIMO ATASKAITA (GAMYBOS IR RESURSŲ PLANAS)
// =========================================================================
export function printProductionPlanPdf() {
    if (!userFieldsList || userFieldsList.length === 0) {
        showBottomToast("Nėra suvestų laukų spausdinimui!", "warning");
        return;
    }

    const farmName = cachedUserData?.name || "Ūkininko ūkis";
    const farmerPhone = cachedUserData?.phone || "";
    const todayStr = new Date().toISOString().split('T')[0];

    let grandTotalArea = 0;
    let grandTotalSeedTons = 0;
    let grandTotalSeedBags = 0;
    let grandTotalSalietra = 0;
    let grandTotalNpk = 0;
    let grandTotalFuel = 0;
    let grandTotalYield = 0;
    let grandTotalProfit = 0;

    const rowsHtml = userFieldsList.map((f, idx) => {
        const area = parseFloat(f.areaHa || 0);
        const plannedCrop = f.cropHistory?.[String(planningYear)] || f.crop || "Žieminiai kviečiai";
        const meta = CROPS_CATALOG[plannedCrop] || CROPS_CATALOG["Žieminiai kviečiai"];
        const mixItem = currentAllocatorMix.find(m => m.id === plannedCrop) || { herb: 1, reg: 1, fung: 2 };

        const seedKg = Math.round(area * meta.seedRateKg);
        const seedTons = (seedKg / 1000);
        const seedBags = Math.ceil(seedKg / 500);

        const npkTons = (area * 250) / 1000;
        const salietraTons = (area * meta.fertN / 0.344) / 1000;
        const fuelLiters = Math.round(area * 100);
        const yieldTons = area * meta.yieldTonHa;

        const livePrice = getLiveCropPrice(plannedCrop, meta.matifPrice);
        const revenue = yieldTons * livePrice;
        
        const expSeed = seedTons * meta.seedPriceTon;
        const expFert = salietraTons * FARM_PRICES.salietraTon + npkTons * FARM_PRICES.npkTon;
        const expFuel = fuelLiters * FARM_PRICES.diesel;
        const expChems = area * (mixItem.herb * FARM_PRICES.herbHa + mixItem.reg * FARM_PRICES.regHa + mixItem.fung * FARM_PRICES.fungHa);
        const profit = revenue - (expSeed + expFert + expFuel + expChems);

        grandTotalArea += area;
        grandTotalSeedTons += seedTons;
        grandTotalSeedBags += seedBags;
        grandTotalSalietra += salietraTons;
        grandTotalNpk += npkTons;
        grandTotalFuel += fuelLiters;
        grandTotalYield += yieldTons;
        grandTotalProfit += profit;

        return `
            <tr>
                <td style="border: 1px solid #000; padding: 6px; text-align: center;">${idx + 1}</td>
                <td style="border: 1px solid #000; padding: 6px; font-weight: bold;">${f.name} ${f.fieldBlockNumber ? `(${f.fieldBlockNumber})` : ''}</td>
                <td style="border: 1px solid #000; padding: 6px; text-align: center;">${area.toFixed(2)}</td>
                <td style="border: 1px solid #000; padding: 6px; font-weight: bold;">${plannedCrop}</td>
                <td style="border: 1px solid #000; padding: 6px; text-align: center;">${seedTons.toFixed(2)} t (${seedBags} didm.)</td>
                <td style="border: 1px solid #000; padding: 6px; text-align: center;">${npkTons.toFixed(1)} t</td>
                <td style="border: 1px solid #000; padding: 6px; text-align: center;">${salietraTons.toFixed(1)} t</td>
                <td style="border: 1px solid #000; padding: 6px; text-align: center;">${fuelLiters} l</td>
                <td style="border: 1px solid #000; padding: 6px; text-align: center;">${mixItem.herb}xH • ${mixItem.reg}xR • ${mixItem.fung}xF</td>
                <td style="border: 1px solid #000; padding: 6px; text-align: center;">${yieldTons.toFixed(1)} t</td>
                <td style="border: 1px solid #000; padding: 6px; text-align: right; font-weight: bold;">+${Math.round(profit).toLocaleString('lt-LT')} €</td>
            </tr>
        `;
    }).join('');

    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>${planningYear} m. Ūkio Gamybos ir Sėjos Planas</title>
            <style>
                body { font-family: 'Times New Roman', Times, serif; font-size: 11px; margin: 15mm; color: #000; }
                h2 { text-align: center; font-size: 16px; margin-bottom: 4px; text-transform: uppercase; }
                .subtitle { text-align: center; font-size: 12px; margin-bottom: 15px; color: #444; }
                .meta-box { margin-bottom: 12px; font-size: 11px; line-height: 1.4; display: flex; justify-content: space-between; border-bottom: 1px solid #000; padding-bottom: 8px; }
                table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 10px; }
                th { background-color: #f2f2f2; border: 1px solid #000; padding: 5px; }
                .footer-sign { margin-top: 35px; display: flex; justify-content: space-between; font-size: 11px; }
                @media print {
                    body { margin: 10mm; }
                    .no-print { display: none; }
                }
            </style>
        </head>
        <body>
            <div class="no-print" style="margin-bottom: 15px; text-align: right;">
                <button onclick="window.print()" style="padding: 9px 18px; background: #2E7D32; color: #fff; border: none; border-radius: 6px; font-weight: bold; cursor: pointer;">
                    🖨️ Spausdinti / Išsaugoti PDF
                </button>
            </div>
            <h2>${planningYear} M. ŪKIO GAMYBOS IR RESURSŲ PASKIRSTYMO PLANAS</h2>
            <div class="subtitle">Oficiali laukų sėjos, tręšimo, augalų apsaugos ir kuro poreikio suvestinė</div>
            <div class="meta-box">
                <div><strong>Ūkis / Valdytojas:</strong> ${farmName}<br><strong>Telefonas:</strong> ${farmerPhone}</div>
                <div><strong>Data:</strong> ${todayStr}<br><strong>Bendras plotas:</strong> ${grandTotalArea.toFixed(2)} ha</div>
            </div>
            <table>
                <thead>
                    <tr>
                        <th>Nr.</th>
                        <th>Laukas (Bloko Nr.)</th>
                        <th>Plotas (ha)</th>
                        <th>Numatytas pasėlis</th>
                        <th>Sėkla (t / didm.)</th>
                        <th>NPK (t)</th>
                        <th>Salietra (t)</th>
                        <th>Kuras (l)</th>
                        <th>Apsauga (purškimai)</th>
                        <th>Derlius (t)</th>
                        <th>Pelnas (€)</th>
                    </tr>
                </thead>
                <tbody>
                    ${rowsHtml}
                    <tr style="font-weight: bold; background: #f0f0f0;">
                        <td colspan="2" style="border: 1px solid #000; padding: 6px; text-align: right;">BENDRAI:</td>
                        <td style="border: 1px solid #000; padding: 6px; text-align: center;">${grandTotalArea.toFixed(2)} ha</td>
                        <td style="border: 1px solid #000; padding: 6px;">-</td>
                        <td style="border: 1px solid #000; padding: 6px; text-align: center;">${grandTotalSeedTons.toFixed(1)} t (~${grandTotalSeedBags} didm.)</td>
                        <td style="border: 1px solid #000; padding: 6px; text-align: center;">${grandTotalNpk.toFixed(1)} t</td>
                        <td style="border: 1px solid #000; padding: 6px; text-align: center;">${grandTotalSalietra.toFixed(1)} t</td>
                        <td style="border: 1px solid #000; padding: 6px; text-align: center;">${grandTotalFuel} l</td>
                        <td style="border: 1px solid #000; padding: 6px;">-</td>
                        <td style="border: 1px solid #000; padding: 6px; text-align: center;">${grandTotalYield.toFixed(1)} t</td>
                        <td style="border: 1px solid #000; padding: 6px; text-align: right;">+${Math.round(grandTotalProfit).toLocaleString('lt-LT')} €</td>
                    </tr>
                </tbody>
            </table>
            <div class="footer-sign">
                <div>Planą sudarė: _______________________</div>
                <div>Ūkio valdytojas (parašas): _______________________</div>
            </div>
        </body>
        </html>
    `);
    printWindow.document.close();
}

// =========================================================================
// 📊 2. TIKRASIS EXCEL (.XLS) EKSPORTAS SU PILNA LAUKŲ IR RESURSŲ DETALIZACIJA
// =========================================================================
export function exportProductionPlanToExcel() {
    if (!userFieldsList || userFieldsList.length === 0) {
        showBottomToast("Nėra duomenų eksportui!", "warning");
        return;
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const filename = `Gamybos_Planas_${planningYear}_${todayStr}.xls`;

    const headers = [
        "Eil. Nr.", "Lauko pavadinimas", "Bloko Nr.", "Plotas (ha)", "Planuojamas pasėlis", "NMA Pasėlio Kodas",
        "Sėklos poreikis (t)", "Sėklos didmaišiai (vnt.)", "NPK Kompleksinės (t)", "Amonio salietra (t)",
        "Gazolas (l)", "Herbicidas (kartai)", "Reguliatorius (kartai)", "Fungicidai (kartai)",
        "Planuojamas derlius (t)", "Grynasis pelnas (EUR)"
    ];

    let grandTotalArea = 0;
    let grandTotalSeedTons = 0;
    let grandTotalSeedBags = 0;
    let grandTotalSalietra = 0;
    let grandTotalNpk = 0;
    let grandTotalFuel = 0;
    let grandTotalYield = 0;
    let grandTotalProfit = 0;

    const rowsHtml = userFieldsList.map((f, idx) => {
        const area = parseFloat(f.areaHa || 0);
        const plannedCrop = f.cropHistory?.[String(planningYear)] || f.crop || "Žieminiai kviečiai";
        const meta = CROPS_CATALOG[plannedCrop] || CROPS_CATALOG["Žieminiai kviečiai"];
        const mixItem = currentAllocatorMix.find(m => m.id === plannedCrop) || { herb: 1, reg: 1, fung: 2 };
        const nmaCode = NMA_CROP_CODES[plannedCrop] || "-";

        const seedKg = Math.round(area * meta.seedRateKg);
        const seedTons = (seedKg / 1000);
        const seedBags = Math.ceil(seedKg / 500);

        const npkTons = (area * 250) / 1000;
        const salietraTons = (area * meta.fertN / 0.344) / 1000;
        const fuelLiters = Math.round(area * 100);
        const yieldTons = area * meta.yieldTonHa;

        const livePrice = getLiveCropPrice(plannedCrop, meta.matifPrice);
        const revenue = yieldTons * livePrice;
        
        const expSeed = seedTons * meta.seedPriceTon;
        const expFert = salietraTons * FARM_PRICES.salietraTon + npkTons * FARM_PRICES.npkTon;
        const expFuel = fuelLiters * FARM_PRICES.diesel;
        const expChems = area * (mixItem.herb * FARM_PRICES.herbHa + mixItem.reg * FARM_PRICES.regHa + mixItem.fung * FARM_PRICES.fungHa);
        const profit = Math.round(revenue - (expSeed + expFert + expFuel + expChems));

        grandTotalArea += area;
        grandTotalSeedTons += seedTons;
        grandTotalSeedBags += seedBags;
        grandTotalSalietra += salietraTons;
        grandTotalNpk += npkTons;
        grandTotalFuel += fuelLiters;
        grandTotalYield += yieldTons;
        grandTotalProfit += profit;

        return `
            <tr>
                <td>${idx + 1}</td>
                <td>${f.name}</td>
                <td>${f.fieldBlockNumber || ''}</td>
                <td>${area.toFixed(2)}</td>
                <td>${plannedCrop}</td>
                <td>${nmaCode}</td>
                <td>${seedTons.toFixed(2)}</td>
                <td>${seedBags}</td>
                <td>${npkTons.toFixed(1)}</td>
                <td>${salietraTons.toFixed(1)}</td>
                <td>${fuelLiters}</td>
                <td>${mixItem.herb}</td>
                <td>${mixItem.reg}</td>
                <td>${mixItem.fung}</td>
                <td>${yieldTons.toFixed(1)}</td>
                <td>${profit}</td>
            </tr>
        `;
    }).join('');

    const excelTemplate = `
        <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
        <head>
            <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
            <style>
                th { background-color: #2E7D32; color: #FFFFFF; font-weight: bold; border: 0.5pt solid #000000; }
                td { border: 0.5pt solid #D0D0D0; }
            </style>
        </head>
        <body>
            <h3>${planningYear} m. Ūkio Gamybos ir Sėjomainos Planas</h3>
            <p>Ūkis: ${cachedUserData?.name || 'Ūkininko ūkis'} | Data: ${todayStr}</p>
            <table border="1">
                <thead>
                    <tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr>
                </thead>
                <tbody>
                    ${rowsHtml}
                    <tr style="font-weight: bold; background-color: #EEEEEE;">
                        <td colspan="3" align="right">VISO:</td>
                        <td>${grandTotalArea.toFixed(2)}</td>
                        <td>-</td>
                        <td>-</td>
                        <td>${grandTotalSeedTons.toFixed(2)}</td>
                        <td>${grandTotalSeedBags}</td>
                        <td>${grandTotalNpk.toFixed(1)}</td>
                        <td>${grandTotalSalietra.toFixed(1)}</td>
                        <td>${grandTotalFuel}</td>
                        <td colspan="3">-</td>
                        <td>${grandTotalYield.toFixed(1)}</td>
                        <td>${grandTotalProfit}</td>
                    </tr>
                </tbody>
            </table>
        </body>
        </html>
    `;

    const blob = new Blob([excelTemplate], { type: 'application/vnd.ms-excel;charset=utf-8' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showBottomToast("Excel failas paruoštas ir atsiųstas! 📊");
}

// =========================================================================
// 📁 3. NMA PASĖLIŲ DEKLARAVIMO GIS FAILAS (.GeoJSON)
// =========================================================================
export function exportNmaDeclarationGeoJson() {
    if (!userFieldsList || userFieldsList.length === 0) {
        showBottomToast("Nėra laukų suformuoti deklaravimo failui!", "error");
        return;
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const filename = `NMA_Deklaracija_${planningYear}_${todayStr}.geojson`;

    const features = [];

    userFieldsList.forEach((f, idx) => {
        const rawCoords = f.polygonCoordinates || [];
        if (rawCoords.length < 3) return;

        const ring = rawCoords.map(p => {
            if (Array.isArray(p)) return [parseFloat(p[1]), parseFloat(p[0])];
            return [parseFloat(p.lng), parseFloat(p.lat)];
        });

        ring.push(ring[0]);

        const plannedCrop = f.cropHistory?.[String(planningYear)] || f.crop || "Žieminiai kviečiai";
        const nmaCode = NMA_CROP_CODES[plannedCrop] || "ŽKV";

        features.push({
            type: "Feature",
            id: f.id || String(idx + 1),
            properties: {
                PAVADINIMAS: f.name || `Laukas #${idx + 1}`,
                BLOKO_NR: f.fieldBlockNumber || "",
                PASELIS: plannedCrop,
                NMA_KODAS: nmaCode,
                PLOTAS_HA: parseFloat(f.areaHa || 0),
                DEKLARAVIMO_METAI: planningYear,
                SUDARYMO_DATA: todayStr
            },
            geometry: {
                type: "Polygon",
                coordinates: [ring]
            }
        });
    });

    if (features.length === 0) {
        showBottomToast("Nė vienas laukas neturi suvestų koordinačių!", "error");
        return;
    }

    const geoJsonData = {
        type: "FeatureCollection",
        name: `NMA_Deklaracija_${planningYear}`,
        crs: {
            type: "name",
            properties: {
                name: "urn:ogc:def:crs:OGC:1.3:CRS84"
            }
        },
        features: features
    };

    const blob = new Blob([JSON.stringify(geoJsonData, null, 2)], { type: 'application/geo+json;charset=utf-8' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showBottomToast("NMA Deklaravimo GeoJSON failas sėkmingai paruoštas! 📁");
}