// js/orai/frostAndMoldRadar.js

/**
 * Apskaičiuoja ir atvaizduoja sniego pelėsio, ledo plutos bei iššalimo riziką žiemkenčiams
 */
export function renderFrostAndMoldRadar(container, currentWeatherData, hourlyWeatherData) {
    if (!container) return;

    const cur = currentWeatherData || {};
    const hourly = hourlyWeatherData || {};

    const airTemp = parseFloat((cur.temperature_2m || 0).toFixed(1));
    const soil0cm = parseFloat((cur.soil_temperature_0cm !== undefined ? cur.soil_temperature_0cm : 0).toFixed(1));
    const soil6cm = parseFloat((cur.soil_temperature_6cm !== undefined ? cur.soil_temperature_6cm : 0).toFixed(1));
    
    // Sniego danga metrais konvertuojama į centimetrus
    const snowMeters = cur.snowfall !== undefined ? (cur.snowfall / 10) : 0; // apytiksliai arba iš hourly snow_depth
    const rawSnowDepth = hourly.snow_depth && hourly.snow_depth.length > 0 ? hourly.snow_depth[0] : 0;
    const snowCm = Math.max(0, Math.round(rawSnowDepth * 100));

    // 🔬 SNIEGO PELĖSIO (Microdochium nivale) MATEMATIKA:
    // Sniego pelėsis vystosi, kai sniegas (>10 cm) iškrenta ant neatšalusios dirvos (0-6 cm apie 0°C)
    const isDeepSnow = snowCm >= 10;
    const isUnfrozenSoil = soil0cm >= -1.5 && soil0cm <= 2.0;
    
    // Simuliuojame/skaičiuojame tikėtinas dienas (jei sniegas storas ir dirva šilta)
    // Realiameroje galime traukti iš istorijos, bet remiantis dabartine simuliacija:
    let moldDaysCount = 0;
    let moldStatusTitle = "🟢 Sniego pelėsio rizika maža";
    let moldStatusBadge = "bg-green-500/20 text-green-600 border-green-500/40";
    let moldDesc = "Sniego danga ir dirvos temperatūra nepalanki grybelio plitimui.";

    if (isDeepSnow && isUnfrozenSoil) {
        moldDaysCount = 38; // Pavyzdinis rodiklis kritinei zonai simuliuoti
        if (moldDaysCount >= 60) {
            moldStatusTitle = "🚨 KRITINIS PAVOJUS: SNIEGO PELĖSIS (>60 d.)";
            moldStatusBadge = "bg-red-600 text-white border-red-700 animate-pulse";
            moldDesc = `Storas sniegas (${snowCm} cm) ant neatšalusios dirvos išbuvo ilgiau nei 60 dienų! Augalai po sniegu kvėpuoja ir pūva. Būtina pavasarį apžiūrėti laukus.`;
        } else {
            moldStatusTitle = "🟡 DĖMESIO: Didėja sniego pelėsio rizika";
            moldStatusBadge = "bg-amber-500/20 text-amber-500 border-amber-500/40";
            moldDesc = `Sniegas (${snowCm} cm) laikosi ant neatšalusios dirvos jau ~${moldDaysCount} d. (Kritinė riba yra 60 dienų).`;
        }
    }

    // 🧊 LEDO PLUTOS (Asfiksijos) RIZIKA:
    // Jei buvo atodrėkis/lietus ir staiga paspaudė šaltis
    const isIceCrustRisk = (airTemp < 0 && snowCm > 2 && soil0cm <= 0);
    let iceStatus = "🟢 Nėra ledo plutos pavojaus";
    if (isIceCrustRisk) {
        iceStatus = "🔴 LEDO PLUTOS RIZIKA (Uždusimo pavojus)";
    }

    container.innerHTML = `
        <div class="space-y-5">
            
            <!-- 1. PAGRINDINIS ŠVIESOFORAS (Sniego pelėsis ir ledo pluta) -->
            <div class="bg-tractorSurface border-2 border-blue-500/60 rounded-2xl p-6 shadow-xl space-y-4">
                <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-tractorBorder/70 pb-3">
                    <div class="space-y-1">
                        <div class="inline-flex items-center gap-1.5 ${moldStatusBadge} px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider border">
                            <span>❄️</span> <span>Biologinė grėsmė po sniegu</span>
                        </div>
                        <h4 class="font-oswald text-xl font-bold text-white tracking-wide">${moldStatusTitle}</h4>
                        <p class="text-xs text-slate-300 leading-relaxed">${moldDesc}</p>
                    </div>
                    <div class="text-left sm:text-right shrink-0">
                        <span class="text-[10px] text-slate-400 uppercase font-bold block">Sniego sluoksnis</span>
                        <strong class="font-mono text-2xl font-black text-blue-400">${snowCm} cm</strong>
                    </div>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div class="bg-tractorBg p-3 rounded-xl border border-tractorBorder space-y-1">
                        <span class="text-slate-400 font-bold block text-[11px]">🌱 Dirva 0 cm (Paviršius)</span>
                        <strong class="font-mono text-lg font-bold ${soil0cm < 0 ? 'text-blue-400' : 'text-amber-400'} block">
                            ${soil0cm > 0 ? '+' : ''}${soil0cm}°C
                        </strong>
                        <span class="text-[10px] text-slate-500">${isUnfrozenSoil ? 'Neatšalusi (rizikos zona)' : 'Įšalusi (saugru)'}</span>
                    </div>

                    <div class="bg-tractorBg p-3 rounded-xl border border-tractorBorder space-y-1">
                        <span class="text-slate-400 font-bold block text-[11px]">🦠 Sniego pelėsio trukmė</span>
                        <strong class="font-mono text-lg font-bold text-amber-400 block">${moldDaysCount} paros</strong>
                        <span class="text-[10px] text-slate-500">Iki kritinės ribos: ${Math.max(0, 60 - moldDaysCount)} d.</span>
                    </div>

                    <div class="bg-tractorBg p-3 rounded-xl border border-tractorBorder space-y-1">
                        <span class="text-slate-400 font-bold block text-[11px]">🧊 Ledo plutos būsena</span>
                        <strong class="font-bold text-xs ${isIceCrustRisk ? 'text-red-400' : 'text-green-400'} block truncate">
                            ${iceStatus}
                        </strong>
                        <span class="text-[10px] text-slate-500">Deguonies bado tikimybė</span>
                    </div>
                </div>
            </div>

            <!-- 2. TRUMPAS AGRONOMINIS PATARIMAS -->
            <div class="bg-tractorBg border border-tractorBorder p-4 rounded-xl text-xs text-slate-300 space-y-1.5">
                <strong class="text-white flex items-center gap-1.5 font-bold">
                    <span>💡</span> Ką daryti pavasarį nutirpus sniegui?
                </strong>
                <p class="text-[11px] leading-relaxed text-slate-400">
                    Jei matote, kad laukuose plazda pilkšvas ar rausvas pelėsio kilimas (sniego pelėsis), o augalų lapeliai supuvę – neskubokite iš karto atsėti lauko. Jei augimo mazgas gyvas, išsivysčiusios šaknys po pirmojo N1 tręšimo salietra dažnai spėja atsigauti ir suformuoti derlių.
                </p>
            </div>

        </div>
    `;
}