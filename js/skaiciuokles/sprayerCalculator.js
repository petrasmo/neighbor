// js/skaiciuokles/sprayerCalculator.js

export function renderSprayerCalculator(container) {
    if (!container) return;

    container.innerHTML = `
        <div class="space-y-4 max-w-6xl mx-auto w-full">
            
            <!-- SKAIČIUOKLĖS FORMA -->
            <div class="bg-tractorSurface border border-tractorBorder rounded-2xl p-3.5 sm:p-5 md:p-6 space-y-3.5 shadow-xl">
                
                <!-- HEADERIS (KOMPAKTIŠKAS) -->
                <div class="border-b border-tractorBorder/70 pb-2.5 space-y-0.5">
                    <h2 class="font-oswald text-lg sm:text-xl md:text-2xl font-bold text-white uppercase tracking-wider flex items-center gap-2">
                        <span>💦</span> Purkštuvo Bako ir Chemikalų Maišymas
                    </h2>
                    <p class="text-[11px] sm:text-xs text-slate-300">
                        Tikslus bakų skaičius ir preparatų normos pilnam bei paskutiniam nepilnam bakui.
                    </p>
                </div>

                <!-- 1. PURKŠTUVO IR LAUKO DUOMENYS (2+1 TINKLELIS TELEFONE) -->
                <div class="grid grid-cols-3 gap-1.5 sm:gap-3">
					<div class="space-y-1">
						<label class="text-[9px] sm:text-[11px] font-bold text-tractorPrimaryLight uppercase tracking-wider block truncate text-center sm:text-left">
							Bakas (l)
						</label>
						<input id="spray-tank-capacity" type="number" step="100" value="3000" 
							class="w-full h-10 sm:h-11 bg-tractorBg border border-tractorBorder focus:border-tractorPrimary rounded-xl px-1.5 sm:px-3 text-center sm:text-left text-xs sm:text-sm text-white font-bold font-mono outline-none">
					</div>

					<div class="space-y-1">
						<label class="text-[9px] sm:text-[11px] font-bold text-slate-200 uppercase tracking-wider block truncate text-center sm:text-left">
							Vanduo (l/ha)
						</label>
						<input id="spray-water-rate" type="number" step="10" value="200" 
							class="w-full h-10 sm:h-11 bg-tractorBg border border-tractorBorder focus:border-tractorPrimary rounded-xl px-1.5 sm:px-3 text-center sm:text-left text-xs sm:text-sm text-white font-bold font-mono outline-none">
					</div>

					<div class="space-y-1">
						<label class="text-[9px] sm:text-[11px] font-bold text-slate-200 uppercase tracking-wider block truncate text-center sm:text-left">
							Plotas (ha)
						</label>
						<input id="spray-field-area" type="number" step="0.5" value="38.0" 
							class="w-full h-10 sm:h-11 bg-tractorBg border border-tractorBorder focus:border-tractorPrimary rounded-xl px-1.5 sm:px-3 text-center sm:text-left text-xs sm:text-sm text-white font-bold font-mono outline-none">
					</div>
				</div>

                <!-- 2. CHEMIKALŲ / PREPARATŲ NORMOS (VIENOJE EILUTĖJE TELEFONE) -->
                <div class="space-y-2.5 pt-2 border-t border-tractorBorder/60">
                    <span class="text-[10px] sm:text-[11px] font-bold text-slate-300 uppercase tracking-wider block">
                        🧪 Naudojami preparatai ir normos (l/ha arba kg/ha):
                    </span>

                    <div class="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
                        
                        <!-- 1 PREPARATAS -->
                        <div class="p-2.5 sm:p-3 bg-tractorBg rounded-xl border border-tractorBorder space-y-1.5">
                            <label class="text-[10px] font-bold text-green-600 dark:text-green-400 uppercase block truncate">1 Preparatas (pvz. Herbicidas)</label>
                            <div class="flex items-center gap-1.5">
                                <input id="spray-chem-name-1" type="text" value="Herbicidas" placeholder="Pavadinimas" class="flex-1 h-9 bg-tractorSurface border border-tractorBorder rounded-lg px-2 text-xs text-white outline-none min-w-0">
                                <div class="flex items-center gap-1 shrink-0 w-24">
                                    <input id="spray-chem-rate-1" type="number" step="0.1" value="1.2" class="w-full h-9 bg-tractorSurface border border-tractorBorder focus:border-tractorPrimary rounded-lg px-1.5 text-center text-xs font-bold font-mono text-white outline-none">
                                    <span class="text-[10px] text-slate-400 font-bold">l/ha</span>
                                </div>
                            </div>
                        </div>

                        <!-- 2 PREPARATAS -->
                        <div class="p-2.5 sm:p-3 bg-tractorBg rounded-xl border border-tractorBorder space-y-1.5">
                            <label class="text-[10px] font-bold text-amber-500 uppercase block truncate">2 Preparatas (pvz. Fungicidas)</label>
                            <div class="flex items-center gap-1.5">
                                <input id="spray-chem-name-2" type="text" value="Fungicidas" placeholder="Pavadinimas" class="flex-1 h-9 bg-tractorSurface border border-tractorBorder rounded-lg px-2 text-xs text-white outline-none min-w-0">
                                <div class="flex items-center gap-1 shrink-0 w-24">
                                    <input id="spray-chem-rate-2" type="number" step="0.1" value="0.5" class="w-full h-9 bg-tractorSurface border border-tractorBorder focus:border-tractorPrimary rounded-lg px-1.5 text-center text-xs font-bold font-mono text-white outline-none">
                                    <span class="text-[10px] text-slate-400 font-bold">l/ha</span>
                                </div>
                            </div>
                        </div>

                        <!-- 3 PREPARATAS -->
                        <div class="p-2.5 sm:p-3 bg-tractorBg rounded-xl border border-tractorBorder space-y-1.5">
                            <label class="text-[10px] font-bold text-blue-500 uppercase block truncate">3 Preparatas (Lipnumas / Trąšos)</label>
                            <div class="flex items-center gap-1.5">
                                <input id="spray-chem-name-3" type="text" value="Paviršiaus aktyvioji m." placeholder="Pavadinimas" class="flex-1 h-9 bg-tractorSurface border border-tractorBorder rounded-lg px-2 text-xs text-white outline-none min-w-0">
                                <div class="flex items-center gap-1 shrink-0 w-24">
                                    <input id="spray-chem-rate-3" type="number" step="0.05" value="0.1" class="w-full h-9 bg-tractorSurface border border-tractorBorder focus:border-tractorPrimary rounded-lg px-1.5 text-center text-xs font-bold font-mono text-white outline-none">
                                    <span class="text-[10px] text-slate-400 font-bold">l/ha</span>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>

            </div>

            <!-- REZULTATŲ KORTELĖS -->
            <div class="grid grid-cols-1 md:grid-cols-3 gap-2.5 sm:gap-3">
                
                <!-- 1 KORTELĖ: BAKŲ SKAIČIUS -->
                <div class="bg-tractorPrimary/20 border-2 border-tractorPrimary p-4 sm:p-5 rounded-2xl space-y-1 shadow-lg">
                    <span class="text-[10px] sm:text-[11px] uppercase font-black text-tractorPrimaryLight tracking-wider block">Reikalingi bakai</span>
                    <div class="text-xl sm:text-2xl md:text-3xl font-black font-mono leading-tight" id="res-tanks-summary" style="color: var(--text-main);">2 pilni + 1 nepilnas</div>
                    <p class="text-[10px] sm:text-xs font-bold text-green-600 dark:text-green-400" id="res-tank-details">1 pilnas bakas apipurškia 15.00 ha</p>
                </div>

                <!-- 2 KORTELĖ: DOZAVIMAS PILNAM BAKUI -->
                <div class="bg-tractorSurface border border-tractorBorder p-3.5 sm:p-4 rounded-2xl space-y-1.5 shadow">
                    <span class="text-[10px] sm:text-[11px] uppercase font-bold text-amber-500 tracking-wider block border-b border-tractorBorder/50 pb-1">
                        Pilti į PILNĄ baką (${document.getElementById('spray-tank-capacity')?.value || 3000} l)
                    </span>
                    <div class="text-xs space-y-1 pt-0.5" id="res-full-tank-recipe"></div>
                </div>

                <!-- 3 KORTELĖ: DOZAVIMAS PASKUTINIAM NEPILNAM BAKUI -->
                <div class="bg-tractorSurface border border-tractorBorder p-3.5 sm:p-4 rounded-2xl space-y-1.5 shadow">
                    <span class="text-[10px] sm:text-[11px] uppercase font-bold text-blue-500 tracking-wider block border-b border-tractorBorder/50 pb-1" id="res-last-tank-header">
                        Paskutinis NEPILNAS bakas
                    </span>
                    <div class="text-xs space-y-1 pt-0.5" id="res-partial-tank-recipe"></div>
                </div>

            </div>

            <!-- BENDRAS MEDŽIAGŲ POREIKIS LAUKUI -->
            <div class="bg-tractorSurface border border-tractorBorder rounded-2xl p-3.5 sm:p-4 shadow space-y-2">
                <h4 class="text-xs font-bold uppercase tracking-wider border-b border-tractorBorder/60 pb-1.5" style="color: var(--text-main);">
                    📦 Bendras poreikis visam laukui (<span id="res-field-area-label">38 ha</span>):
                </h4>
                <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs" id="res-total-materials-grid"></div>
            </div>

        </div>
    `;

    ['spray-tank-capacity', 'spray-water-rate', 'spray-field-area', 'spray-chem-rate-1', 'spray-chem-rate-2', 'spray-chem-rate-3', 'spray-chem-name-1', 'spray-chem-name-2', 'spray-chem-name-3'].forEach(id => {
        document.getElementById(id)?.addEventListener('input', calculateSprayerMix);
    });

    calculateSprayerMix();
}

// 100% IDENTIŠKAS SKAIČIAVIMO ALGORITMAS
function calculateSprayerMix() {
    const tankCap = parseFloat(document.getElementById('spray-tank-capacity')?.value) || 1000;
    const waterRate = parseFloat(document.getElementById('spray-water-rate')?.value) || 200;
    const fieldArea = parseFloat(document.getElementById('spray-field-area')?.value) || 0;

    const chem1Name = document.getElementById('spray-chem-name-1')?.value.trim() || "1 Preparatas";
    const chem1Rate = parseFloat(document.getElementById('spray-chem-rate-1')?.value) || 0;

    const chem2Name = document.getElementById('spray-chem-name-2')?.value.trim() || "2 Preparatas";
    const chem2Rate = parseFloat(document.getElementById('spray-chem-rate-2')?.value) || 0;

    const chem3Name = document.getElementById('spray-chem-name-3')?.value.trim() || "3 Preparatas";
    const chem3Rate = parseFloat(document.getElementById('spray-chem-rate-3')?.value) || 0;

    const haPerFullTank = waterRate > 0 ? (tankCap / waterRate) : 0;
    const totalWaterLiters = fieldArea * waterRate;

    const fullTanksCount = Math.floor(totalWaterLiters / tankCap);
    const remainingLiters = totalWaterLiters % tankCap;
    const remainingHa = waterRate > 0 ? (remainingLiters / waterRate) : 0;

    const summaryText = remainingLiters > 0 
        ? `${fullTanksCount} pilni + 1 nepilnas (${Math.round(remainingLiters)} l)`
        : `${fullTanksCount} pilni bakai`;

    const elSum = document.getElementById('res-tanks-summary');
    const elDet = document.getElementById('res-tank-details');
    const elArea = document.getElementById('res-field-area-label');

    if (elSum) elSum.textContent = summaryText;
    if (elDet) elDet.textContent = `1 pilnas bakas apipurškia ${haPerFullTank.toFixed(2)} ha`;
    if (elArea) elArea.textContent = `${fieldArea} ha`;

    // Dozavimas PILNAM bakui
    let fullTankRecipeHtml = '';
    if (chem1Rate > 0) fullTankRecipeHtml += `<div class="flex justify-between border-b border-tractorBorder/30 pb-0.5 text-slate-300"><span>${chem1Name}:</span> <strong class="font-bold font-mono text-green-600 dark:text-green-400">${(chem1Rate * haPerFullTank).toFixed(2)} l (kg)</strong></div>`;
    if (chem2Rate > 0) fullTankRecipeHtml += `<div class="flex justify-between border-b border-tractorBorder/30 pb-0.5 text-slate-300"><span>${chem2Name}:</span> <strong class="font-bold font-mono text-amber-500">${(chem2Rate * haPerFullTank).toFixed(2)} l (kg)</strong></div>`;
    if (chem3Rate > 0) fullTankRecipeHtml += `<div class="flex justify-between text-slate-300"><span>${chem3Name}:</span> <strong class="font-bold font-mono text-blue-500">${(chem3Rate * haPerFullTank).toFixed(2)} l (kg)</strong></div>`;
    if (!fullTankRecipeHtml) fullTankRecipeHtml = `<span class="text-slate-400">Nenurodytos normos</span>`;
    
    const elFull = document.getElementById('res-full-tank-recipe');
    if (elFull) elFull.innerHTML = fullTankRecipeHtml;

    // Dozavimas NEPILNAM bakui
    const elLastH = document.getElementById('res-last-tank-header');
    if (elLastH) {
        elLastH.textContent = remainingLiters > 0 
            ? `Paskutinis bakas (${Math.round(remainingLiters)} l / ${remainingHa.toFixed(2)} ha)`
            : `Paskutinio bako nereikia`;
    }

    let partialTankRecipeHtml = '';
    if (remainingLiters > 0) {
        if (chem1Rate > 0) partialTankRecipeHtml += `<div class="flex justify-between border-b border-tractorBorder/30 pb-0.5 text-slate-300"><span>${chem1Name}:</span> <strong class="font-bold font-mono text-green-600 dark:text-green-400">${(chem1Rate * remainingHa).toFixed(2)} l (kg)</strong></div>`;
        if (chem2Rate > 0) partialTankRecipeHtml += `<div class="flex justify-between border-b border-tractorBorder/30 pb-0.5 text-slate-300"><span>${chem2Name}:</span> <strong class="font-bold font-mono text-amber-500">${(chem2Rate * remainingHa).toFixed(2)} l (kg)</strong></div>`;
        if (chem3Rate > 0) partialTankRecipeHtml += `<div class="flex justify-between text-slate-300"><span>${chem3Name}:</span> <strong class="font-bold font-mono text-blue-500">${(chem3Rate * remainingHa).toFixed(2)} l (kg)</strong></div>`;
    } else {
        partialTankRecipeHtml = `<span class="text-green-600 dark:text-green-400 font-bold">Laukas pilnai padengiamas pilnais bakais!</span>`;
    }

    const elPart = document.getElementById('res-partial-tank-recipe');
    if (elPart) elPart.innerHTML = partialTankRecipeHtml;

    // Bendra suvestinė visam laukui
    const elMatGrid = document.getElementById('res-total-materials-grid');
    if (elMatGrid) {
        elMatGrid.innerHTML = `
            <div class="bg-tractorBg p-2.5 rounded-xl border border-tractorBorder space-y-0.5">
                <span class="text-slate-400 font-semibold block text-[10px]">Vanduo</span>
                <strong class="font-bold font-mono text-sm sm:text-base block" style="color: var(--text-main);">${totalWaterLiters.toLocaleString('lt-LT')} l</strong>
            </div>
            <div class="bg-tractorBg p-2.5 rounded-xl border border-tractorBorder space-y-0.5">
                <span class="text-green-600 dark:text-green-400 font-bold block text-[10px] truncate">${chem1Name}</span>
                <strong class="font-bold font-mono text-sm sm:text-base block" style="color: var(--text-main);">${(chem1Rate * fieldArea).toFixed(2)} l (kg)</strong>
            </div>
            <div class="bg-tractorBg p-2.5 rounded-xl border border-tractorBorder space-y-0.5">
                <span class="text-amber-500 font-bold block text-[10px] truncate">${chem2Name}</span>
                <strong class="font-bold font-mono text-sm sm:text-base block" style="color: var(--text-main);">${(chem2Rate * fieldArea).toFixed(2)} l (kg)</strong>
            </div>
            <div class="bg-tractorBg p-2.5 rounded-xl border border-tractorBorder space-y-0.5">
                <span class="text-blue-500 font-bold block text-[10px] truncate">${chem3Name}</span>
                <strong class="font-bold font-mono text-sm sm:text-base block" style="color: var(--text-main);">${(chem3Rate * fieldArea).toFixed(2)} l (kg)</strong>
            </div>
        `;
    }
}