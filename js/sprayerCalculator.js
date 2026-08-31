// js/sprayerCalculator.js

export function renderSprayerCalculator(container) {
    if (!container) return;

    container.innerHTML = `
        <div class="space-y-6">
            
            <!-- SKAIČIUOKLĖS FORMA -->
            <div class="bg-tractorSurface border border-tractorBorder rounded-2xl p-6 md:p-8 space-y-6 shadow-xl">
                <div class="border-b border-tractorBorder/70 pb-4">
                    <h3 class="font-oswald text-xl md:text-2xl font-bold text-white uppercase tracking-wider flex items-center gap-2">
                        <span>💦</span> Purkštuvo Bako ir Chemikalų Maišymo Skaičiuoklė
                    </h3>
                    <p class="text-xs md:text-sm text-slate-300 mt-0.5">
                        Apskaičiuokite tikslų bakų skaičių bei preparatų dozes pilnam ir paskutiniam nepilnam bakui.
                    </p>
                </div>

                <!-- 1. PURKŠTUVO IR LAUKO DUOMENYS -->
                <div class="grid grid-cols-1 sm:grid-cols-3 gap-5">
                    <div class="space-y-1.5">
                        <label class="text-xs font-bold text-tractorPrimaryLight uppercase tracking-wider">Purkštuvo bako talpa (litrais)</label>
                        <input id="spray-tank-capacity" type="number" step="100" value="3000" 
                            class="w-full h-12 bg-tractorBg border border-tractorBorder focus:border-tractorPrimary rounded-xl px-4 text-sm text-white font-bold outline-none">
                    </div>

                    <div class="space-y-1.5">
                        <label class="text-xs font-bold text-slate-200 uppercase tracking-wider">Išpurškimo norma (vandens l/ha)</label>
                        <input id="spray-water-rate" type="number" step="10" value="200" 
                            class="w-full h-12 bg-tractorBg border border-tractorBorder focus:border-tractorPrimary rounded-xl px-4 text-sm text-white font-bold outline-none">
                    </div>

                    <div class="space-y-1.5">
                        <label class="text-xs font-bold text-slate-200 uppercase tracking-wider">Purškiamo lauko plotas (ha)</label>
                        <input id="spray-field-area" type="number" step="0.5" value="38.0" 
                            class="w-full h-12 bg-tractorBg border border-tractorBorder focus:border-tractorPrimary rounded-xl px-4 text-sm text-white font-bold outline-none">
                    </div>
                </div>

                <!-- 2. CHEMIKALŲ / PREPARATŲ NORMOS (IKI 3 PRODUKTŲ MIŠINYJE) -->
                <div class="space-y-3 pt-3 border-t border-tractorBorder/60">
                    <span class="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                        🧪 Naudojami preparatai ir normos (l/ha arba kg/ha):
                    </span>

                    <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div class="space-y-1 bg-tractorBg p-3.5 rounded-xl border border-tractorBorder">
                            <label class="text-[11px] font-bold text-green-400 uppercase block">1 Preparatas (pvz. Herbicidas)</label>
                            <input id="spray-chem-name-1" type="text" value="Herbicidas" class="w-full h-9 bg-tractorSurface border border-tractorBorder rounded-lg px-2.5 text-xs text-white outline-none mb-1.5">
                            <div class="flex items-center gap-2">
                                <span class="text-xs text-slate-400">Norma:</span>
                                <input id="spray-chem-rate-1" type="number" step="0.1" value="1.2" class="w-full h-9 bg-tractorSurface border border-tractorBorder focus:border-tractorPrimary rounded-lg px-2.5 text-xs text-white font-bold outline-none">
                                <span class="text-xs text-slate-400">l/ha</span>
                            </div>
                        </div>

                        <div class="space-y-1 bg-tractorBg p-3.5 rounded-xl border border-tractorBorder">
                            <label class="text-[11px] font-bold text-amber-400 uppercase block">2 Preparatas (pvz. Fungicidas)</label>
                            <input id="spray-chem-name-2" type="text" value="Fungicidas" class="w-full h-9 bg-tractorSurface border border-tractorBorder rounded-lg px-2.5 text-xs text-white outline-none mb-1.5">
                            <div class="flex items-center gap-2">
                                <span class="text-xs text-slate-400">Norma:</span>
                                <input id="spray-chem-rate-2" type="number" step="0.1" value="0.5" class="w-full h-9 bg-tractorSurface border border-tractorBorder focus:border-tractorPrimary rounded-lg px-2.5 text-xs text-white font-bold outline-none">
                                <span class="text-xs text-slate-400">l/ha</span>
                            </div>
                        </div>

                        <div class="space-y-1 bg-tractorBg p-3.5 rounded-xl border border-tractorBorder">
                            <label class="text-[11px] font-bold text-blue-400 uppercase block">3 Preparatas (Lipnumas / Trąšos)</label>
                            <input id="spray-chem-name-3" type="text" value="Paviršiaus aktyvioji m." class="w-full h-9 bg-tractorSurface border border-tractorBorder rounded-lg px-2.5 text-xs text-white outline-none mb-1.5">
                            <div class="flex items-center gap-2">
                                <span class="text-xs text-slate-400">Norma:</span>
                                <input id="spray-chem-rate-3" type="number" step="0.05" value="0.1" class="w-full h-9 bg-tractorSurface border border-tractorBorder focus:border-tractorPrimary rounded-lg px-2.5 text-xs text-white font-bold outline-none">
                                <span class="text-xs text-slate-400">l/ha</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- REZULTATŲ KORTELĖS (INSTRUKCIJA TRAKTORININKUI) -->
            <div class="grid grid-cols-1 md:grid-cols-3 gap-5">
                
                <!-- 1 KORTELĖ: BAKŲ SKAIČIUS -->
                <div class="bg-tractorPrimary/20 border-2 border-tractorPrimary p-6 rounded-2xl space-y-2 shadow-xl shadow-tractorPrimary/10">
                    <span class="text-xs uppercase font-extrabold text-tractorPrimaryLight tracking-wider">Reikalingi bakai</span>
                    <div class="text-3xl font-black text-white font-mono" id="res-tanks-summary">2 pilni + 1 nepilnas</div>
                    <p class="text-xs text-green-300 font-semibold" id="res-tank-details">1 pilnas bakas apipurškia 15.0 ha</p>
                </div>

                <!-- 2 KORTELĖ: DOZAVIMAS PILNAM BAKUI -->
                <div class="bg-tractorSurface border border-tractorBorder p-6 rounded-2xl space-y-2 shadow-xl">
                    <span class="text-xs uppercase font-bold text-amber-400 tracking-wider">Pilti į PILNĄ baką (${document.getElementById('spray-tank-capacity')?.value || 3000} l)</span>
                    <div class="text-xs space-y-1.5 pt-1" id="res-full-tank-recipe">
                        <!-- Generuojamas receptas -->
                    </div>
                </div>

                <!-- 3 KORTELĖ: DOZAVIMAS PASKUTINIAM NEPILNAM BAKUI -->
                <div class="bg-tractorSurface border border-tractorBorder p-6 rounded-2xl space-y-2 shadow-xl">
                    <span class="text-xs uppercase font-bold text-blue-400 tracking-wider" id="res-last-tank-header">Paskutinis NEPILNAS bakas</span>
                    <div class="text-xs space-y-1.5 pt-1" id="res-partial-tank-recipe">
                        <!-- Generuojamas receptas -->
                    </div>
                </div>

            </div>

            <!-- BENDRAS MEDŽIAGŲ POREIKIS LAUKUI -->
            <div class="bg-tractorSurface border border-tractorBorder rounded-2xl p-6 shadow-xl space-y-3">
                <h4 class="text-xs font-bold text-white uppercase tracking-wider border-b border-tractorBorder/60 pb-2">
                    📦 Bendras chemikalų ir vandens poreikis visam laukui (<span id="res-field-area-label">38 ha</span>):
                </h4>
                <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs" id="res-total-materials-grid">
                    <!-- Suvestinė -->
                </div>
            </div>

        </div>
    `;

    // Listeneriai
    ['spray-tank-capacity', 'spray-water-rate', 'spray-field-area', 'spray-chem-rate-1', 'spray-chem-rate-2', 'spray-chem-rate-3', 'spray-chem-name-1', 'spray-chem-name-2', 'spray-chem-name-3'].forEach(id => {
        document.getElementById(id)?.addEventListener('input', calculateSprayerMix);
    });

    calculateSprayerMix();
}

function calculateSprayerMix() {
    const tankCap = parseFloat(document.getElementById('spray-tank-capacity').value) || 1000;
    const waterRate = parseFloat(document.getElementById('spray-water-rate').value) || 200;
    const fieldArea = parseFloat(document.getElementById('spray-field-area').value) || 0;

    const chem1Name = document.getElementById('spray-chem-name-1').value.trim() || "1 Preparatas";
    const chem1Rate = parseFloat(document.getElementById('spray-chem-rate-1').value) || 0;

    const chem2Name = document.getElementById('spray-chem-name-2').value.trim() || "2 Preparatas";
    const chem2Rate = parseFloat(document.getElementById('spray-chem-rate-2').value) || 0;

    const chem3Name = document.getElementById('spray-chem-name-3').value.trim() || "3 Preparatas";
    const chem3Rate = parseFloat(document.getElementById('spray-chem-rate-3').value) || 0;

    // 1. Kiek ha apipurškia 1 pilnas bakas
    const haPerFullTank = waterRate > 0 ? (tankCap / waterRate) : 0;

    // 2. Kiek iš viso litrų vandens reikia laukui
    const totalWaterLiters = fieldArea * waterRate;

    // 3. Bakų skaičius
    const fullTanksCount = Math.floor(totalWaterLiters / tankCap);
    const remainingLiters = totalWaterLiters % tankCap;
    const remainingHa = waterRate > 0 ? (remainingLiters / waterRate) : 0;

    // Bakų santraukos tekstas
    const summaryText = remainingLiters > 0 
        ? `${fullTanksCount} pilni + 1 nepilnas (${Math.round(remainingLiters)} l)`
        : `${fullTanksCount} pilni bakai`;

    document.getElementById('res-tanks-summary').textContent = summaryText;
    document.getElementById('res-tank-details').textContent = `1 pilnas bakas apipurškia ${haPerFullTank.toFixed(2)} ha`;
    document.getElementById('res-field-area-label').textContent = `${fieldArea} ha`;

    // 4. Dozavimas PILNAM bakui
    let fullTankRecipeHtml = '';
    if (chem1Rate > 0) fullTankRecipeHtml += `<div class="flex justify-between border-b border-tractorBorder/40 pb-1 text-slate-200"><span>${chem1Name}:</span> <strong class="text-green-400 font-bold font-mono">${(chem1Rate * haPerFullTank).toFixed(2)} l (kg)</strong></div>`;
    if (chem2Rate > 0) fullTankRecipeHtml += `<div class="flex justify-between border-b border-tractorBorder/40 pb-1 text-slate-200"><span>${chem2Name}:</span> <strong class="text-amber-400 font-bold font-mono">${(chem2Rate * haPerFullTank).toFixed(2)} l (kg)</strong></div>`;
    if (chem3Rate > 0) fullTankRecipeHtml += `<div class="flex justify-between text-slate-200"><span>${chem3Name}:</span> <strong class="text-blue-400 font-bold font-mono">${(chem3Rate * haPerFullTank).toFixed(2)} l (kg)</strong></div>`;
    if (!fullTankRecipeHtml) fullTankRecipeHtml = `<span class="text-slate-500">Nenurodytos normos</span>`;
    document.getElementById('res-full-tank-recipe').innerHTML = fullTankRecipeHtml;

    // 5. Dozavimas NEPILNAM bakui
    document.getElementById('res-last-tank-header').textContent = remainingLiters > 0 
        ? `Paskutinis bakas (${Math.round(remainingLiters)} l / ${remainingHa.toFixed(2)} ha)`
        : `Paskutinio bako nereikia`;

    let partialTankRecipeHtml = '';
    if (remainingLiters > 0) {
        if (chem1Rate > 0) partialTankRecipeHtml += `<div class="flex justify-between border-b border-tractorBorder/40 pb-1 text-slate-200"><span>${chem1Name}:</span> <strong class="text-green-400 font-bold font-mono">${(chem1Rate * remainingHa).toFixed(2)} l (kg)</strong></div>`;
        if (chem2Rate > 0) partialTankRecipeHtml += `<div class="flex justify-between border-b border-tractorBorder/40 pb-1 text-slate-200"><span>${chem2Name}:</span> <strong class="text-amber-400 font-bold font-mono">${(chem2Rate * remainingHa).toFixed(2)} l (kg)</strong></div>`;
        if (chem3Rate > 0) partialTankRecipeHtml += `<div class="flex justify-between text-slate-200"><span>${chem3Name}:</span> <strong class="text-blue-400 font-bold font-mono">${(chem3Rate * remainingHa).toFixed(2)} l (kg)</strong></div>`;
    } else {
        partialTankRecipeHtml = `<span class="text-green-400 font-bold">Laukas pilnai padengiamas pilnais bakais!</span>`;
    }
    document.getElementById('res-partial-tank-recipe').innerHTML = partialTankRecipeHtml;

    // 6. Bendra suvestinė visam laukui
    document.getElementById('res-total-materials-grid').innerHTML = `
        <div class="bg-tractorBg p-3 rounded-xl border border-tractorBorder">
            <span class="text-slate-400 block">Vanduo</span>
            <strong class="text-white font-bold font-mono text-sm">${totalWaterLiters.toLocaleString('lt-LT')} l</strong>
        </div>
        <div class="bg-tractorBg p-3 rounded-xl border border-tractorBorder">
            <span class="text-green-400 block">${chem1Name}</span>
            <strong class="text-white font-bold font-mono text-sm">${(chem1Rate * fieldArea).toFixed(2)} l (kg)</strong>
        </div>
        <div class="bg-tractorBg p-3 rounded-xl border border-tractorBorder">
            <span class="text-amber-400 block">${chem2Name}</span>
            <strong class="text-white font-bold font-mono text-sm">${(chem2Rate * fieldArea).toFixed(2)} l (kg)</strong>
        </div>
        <div class="bg-tractorBg p-3 rounded-xl border border-tractorBorder">
            <span class="text-blue-400 block">${chem3Name}</span>
            <strong class="text-white font-bold font-mono text-sm">${(chem3Rate * fieldArea).toFixed(2)} l (kg)</strong>
        </div>
    `;
}