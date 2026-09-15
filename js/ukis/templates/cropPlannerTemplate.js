// js/ukis/templates/cropPlannerTemplate.js

export function getCropPlannerHtml(planningYear) {
    const yearPrev2 = planningYear - 2;
    const yearPrev1 = planningYear - 1;

    return `
        <div class="space-y-6 max-w-6xl mx-auto w-full">
            
            <!-- ANTRAŠTĖ IR PAGRINDINIAI TABAI -->
            <div class="border-b border-tractorBorder pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div class="space-y-1">
                    <div class="flex items-center gap-2">
                        <span class="inline-flex items-center gap-1 bg-green-500/15 border border-green-500/30 text-green-600 dark:text-green-400 text-xs px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider">
                            🌾 ${planningYear} m. Derliaus Sezonas
                        </span>
                    </div>
                    <h2 class="font-oswald text-2xl md:text-3xl font-bold uppercase tracking-wider text-white flex items-center gap-2">
                        <span>🚜</span> Ūkio Gamybos ir Sėjomainos Planavimas
                    </h2>
                    <p class="text-xs md:text-sm text-slate-300">
                        Tikslus sėklų, didmaišių, trąšų ir kuro poreikis kiekvienam laukui bei GAAB 7 reikalavimai <strong>${planningYear} m.</strong>
                    </p>
                </div>

                <!-- TABŲ PERJUNGIKLIS -->
                <div class="flex items-center gap-1.5 bg-tractorSurface p-1.5 rounded-2xl border border-tractorBorder shrink-0 shadow-lg">
                    <button type="button" id="tab-btn-production" class="px-4 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer bg-tractorPrimary text-white shadow">
                        🚜 Gamybos planas ir resursai
                    </button>
                    <button type="button" id="tab-btn-gaab" class="px-4 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer text-slate-400 hover:text-white">
                        📜 Sėjomaina ir GAAB 7
                    </button>
                </div>
            </div>

            <!-- ========================================== -->
            <!-- 1 TABAS: GAMYBOS PLANAS IR RESURSAI -->
            <!-- ========================================== -->
            <div id="view-planner-production" class="space-y-6">
                
                <!-- HERO BLOKAS -->
                <div class="bg-gradient-to-r from-tractorSurface via-tractorSurface to-tractorBg border-2 border-tractorPrimary/70 rounded-2xl p-5 md:p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-5">
                    <div class="space-y-1.5">
                        <div class="inline-flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wider text-tractorPrimaryLight">
                            <span>⚡</span> Išmanusis ūkio skaičiavimas
                        </div>
                        <h3 class="font-oswald text-xl md:text-2xl font-bold text-white tracking-wide">
                            Suplanuokite kultūras, technologijas ir purškimus
                        </h3>
                        <p class="text-xs md:text-sm text-slate-300 max-w-2xl leading-relaxed">
                            Nurodykite norimas kultūras procentais bei jų purškimų skaičių. Sistema automatiškai parinks laukus, apskaičiuos sėklos maišus, trąšas ir kurą.
                        </p>
                    </div>

                    <div class="flex flex-wrap sm:flex-nowrap items-center gap-3 shrink-0">
                        <button type="button" id="btn-open-smart-allocator" class="h-12 px-6 bg-tractorPrimary hover:bg-tractorPrimaryHover text-white font-black text-xs md:text-sm rounded-xl flex items-center justify-center gap-2 shadow-xl transition cursor-pointer hover:scale-[1.02] active:scale-[0.98]">
                            <span class="text-lg">⚡</span> <span>Suplanuoti ūkį (Pagal %)</span>
                        </button>
                        <button type="button" id="btn-save-crop-plan" class="h-12 px-5 bg-tractorBg hover:bg-zinc-800 text-slate-200 border border-tractorBorder hover:border-tractorPrimary font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition cursor-pointer">
                            <span>💾</span> <span>Išsaugoti</span>
                        </button>
                    </div>
                </div>

                <!-- 🌟 DOKUMENTŲ IR NMA DEKLARAVIMO EKSPORTO JUOSTA -->
                <div class="bg-tractorSurface border border-tractorBorder rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-md">
                    <div class="flex items-center gap-2">
                        <span class="text-xl">🖨️</span>
                        <div>
                            <strong class="text-white text-xs md:text-sm block">Ataskaitos ir deklaravimo failai</strong>
                            <span class="text-[11px] text-slate-400">Atsisiųskite paruoštus dokumentus arba NMA GIS failą</span>
                        </div>
                    </div>

                    <div class="flex flex-wrap items-center gap-2.5">
                        <button type="button" id="btn-export-plan-pdf" style="background-color: #DC2626 !important; color: #FFFFFF !important;" class="h-10 px-4 font-bold text-xs rounded-xl flex items-center gap-1.5 shadow transition cursor-pointer hover:opacity-90">
                            <span>🖨️</span> <span>PDF / Spausdinti</span>
                        </button>
                        <button type="button" id="btn-export-plan-xls" style="background-color: #16A34A !important; color: #FFFFFF !important;" class="h-10 px-4 font-bold text-xs rounded-xl flex items-center gap-1.5 shadow transition cursor-pointer hover:opacity-90">
                            <span>📊</span> <span>Excel (.XLS)</span>
                        </button>
                        <button type="button" id="btn-export-nma-geojson" style="background-color: #0284C7 !important; color: #FFFFFF !important;" class="h-10 px-4 font-bold text-xs rounded-xl flex items-center gap-1.5 shadow transition cursor-pointer hover:opacity-90">
                            <span>📁</span> <span>NMA Deklaravimo failas (.GeoJSON)</span>
                        </button>
                    </div>
                </div>

                <!-- 4 METRIKŲ KORTELĖS -->
                <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div class="bg-tractorSurface border border-tractorBorder p-5 rounded-2xl space-y-1 shadow-md">
                        <span class="text-[11px] uppercase font-bold text-slate-400">Viso sėklos poreikis</span>
                        <div id="basket-total-seed-tons" class="text-2xl font-black font-mono text-green-500">0.0 t</div>
                        <span id="basket-total-seed-bags" class="text-[11px] text-slate-400 block font-medium">~0 didmaišių (po 500 kg)</span>
                    </div>

                    <div class="bg-tractorSurface border border-tractorBorder p-5 rounded-2xl space-y-1 shadow-md">
                        <span class="text-[11px] uppercase font-bold text-slate-400">Trąšos (NPK + Azotas)</span>
                        <div id="basket-total-fert-tons" class="text-2xl font-black font-mono text-amber-400">0.0 t</div>
                        <span id="basket-total-fert-cost" class="text-[11px] text-slate-400 block font-medium">Biudžetas: ~0 €</span>
                    </div>

                    <div class="bg-tractorSurface border border-tractorBorder p-5 rounded-2xl space-y-1 shadow-md">
                        <span class="text-[11px] uppercase font-bold text-slate-400">Kuro poreikis (Gazolas)</span>
                        <div id="basket-total-fuel-liters" class="text-2xl font-black font-mono text-blue-400">0 l</div>
                        <span id="basket-total-fuel-cost" class="text-[11px] text-slate-400 block font-medium">Biudžetas: ~0 €</span>
                    </div>

                    <div class="bg-tractorSurface border-2 border-tractorPrimary p-5 rounded-2xl space-y-1 shadow-xl">
                        <span class="text-[11px] uppercase font-extrabold text-tractorPrimaryLight">Planuojamas grynasis pelnas</span>
                        <div id="basket-total-net-profit" class="text-2xl font-black font-mono text-green-400">0 €</div>
                        <span id="basket-net-profit-ha" class="text-[11px] text-green-500 font-bold block">0 €/ha (pagal MATIF)</span>
                    </div>
                </div>

                <!-- DETALI LAUKŲ SUVESTINĖ -->
                <div class="bg-tractorSurface border border-tractorBorder rounded-2xl p-5 md:p-7 shadow-xl space-y-4">
                    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-tractorBorder/70 pb-3">
                        <div>
                            <h3 class="font-oswald text-xl font-bold uppercase tracking-wider text-white flex items-center gap-2">
                                <span>📋</span> Detalus Važiavimo į Laukus Planas
                            </h3>
                            <p class="text-xs text-slate-400">
                                Kiek sėklos, trąšų ir kuro pasiimti į konkretų lauką. Pasėlį galite bet kada pakeisti vietoje.
                            </p>
                        </div>
                        <span class="text-xs text-slate-400 font-mono" id="fields-overview-counter">Viso laukų: 0</span>
                    </div>

                    <div id="detailed-fields-production-list" class="space-y-4 pt-1">
                        <div class="text-center py-8 text-slate-500 text-xs">Kraunami ūkio laukai...</div>
                    </div>
                </div>

            </div>

            <!-- ========================================== -->
            <!-- 2 TABAS: SĖJOMAINA IR GAAB 7 ŠVIESOFORAS -->
            <!-- ========================================== -->
            <div id="view-planner-gaab" class="space-y-6 hidden">
                
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div id="card-gaab-diversification" class="bg-tractorSurface border-2 border-tractorBorder p-5 rounded-2xl space-y-2 transition-all shadow-md">
                        <div class="flex justify-between items-start">
                            <span class="text-[11px] font-bold uppercase tracking-wider text-slate-400">Metinė kaita (min. 35%)</span>
                            <span class="text-xl">🔄</span>
                        </div>
                        <div class="flex items-baseline gap-2">
                            <span id="gaab-change-percent" class="text-3xl font-black font-mono" style="color: var(--text-main);">0.0%</span>
                            <span class="text-xs text-slate-400">ariamos žemės</span>
                        </div>
                        <p id="gaab-change-status" class="text-xs font-bold text-slate-400">Skaičiuojama...</p>
                    </div>

                    <div id="card-gaab-monoculture" class="bg-tractorSurface border-2 border-tractorBorder p-5 rounded-2xl space-y-2 transition-all shadow-md">
                        <div class="flex justify-between items-start">
                            <span class="text-[11px] font-bold uppercase tracking-wider text-slate-400">Monokultūros draudimas</span>
                            <span class="text-xl">🛑</span>
                        </div>
                        <div class="text-3xl font-black font-mono" id="gaab-monoculture-count" style="color: var(--text-main);">0</div>
                        <p id="gaab-monoculture-status" class="text-xs font-bold text-green-500">🟢 0 laukų viršija 3 metus</p>
                    </div>

                    <div id="card-gaab-data-completeness" class="bg-tractorSurface border-2 border-tractorBorder p-5 rounded-2xl space-y-3 transition-all shadow-md flex flex-col justify-between">
                        <div>
                            <div class="flex justify-between items-start">
                                <span class="text-[11px] font-bold uppercase tracking-wider text-slate-400">Istoriniai duomenys</span>
                                <span class="text-xl">📜</span>
                            </div>
                            <p id="gaab-data-status" class="text-xs font-bold text-slate-300 mt-2">Tikrinama...</p>
                        </div>
                        
                        <button type="button" id="btn-edit-history-all" class="w-full py-2 bg-tractorBg hover:bg-zinc-800 text-slate-200 border border-tractorBorder hover:border-tractorPrimary rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-sm">
                            <span>✏️</span> <span>Redaguoti sėjos istoriją</span>
                        </button>
                    </div>
                </div>

                <div class="bg-tractorSurface border border-tractorBorder rounded-2xl p-5 md:p-7 shadow-xl space-y-4">
                    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-tractorBorder/70 pb-4">
                        <div>
                            <h3 class="font-oswald text-xl font-bold uppercase tracking-wider text-white flex items-center gap-2">
                                <span>📋</span> Sėjomainos Matrica (${planningYear} m.)
                            </h3>
                            <p class="text-xs text-slate-400">Oficiali forma NMA patikroms su 3 metų pasėlių kaita.</p>
                        </div>

                        <button type="button" id="btn-save-crop-plan-gaab" class="h-10 px-5 bg-tractorPrimary hover:bg-tractorPrimaryHover text-white font-extrabold text-xs rounded-xl flex items-center gap-2 shadow transition cursor-pointer shrink-0">
                            <span>💾</span> Išsaugoti planą
                        </button>
                    </div>

                    <div class="overflow-x-auto">
                        <table class="w-full text-left text-xs">
                            <thead>
                                <tr class="border-b border-tractorBorder/80 text-slate-400 uppercase font-bold text-[11px]">
                                    <th class="py-3 px-2">Laukas</th>
                                    <th class="py-3 px-2">Plotas</th>
                                    <th class="py-3 px-2">${yearPrev2} m. (Užpernai)</th>
                                    <th class="py-3 px-2">${yearPrev1} m. (Pernai)</th>
                                    <th class="py-3 px-2 text-tractorPrimaryLight">🎯 ${planningYear} m. PLANUOJAMAS PASĖLIS</th>
                                    <th class="py-3 px-2 text-right">NMA ir Agronominė būsena</th>
                                </tr>
                            </thead>
                            <tbody id="crop-planner-table-body" class="divide-y divide-tractorBorder/40">
                                <tr>
                                    <td colspan="6" class="py-8 text-center text-slate-500">Kraunami laukai...</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

            </div>

            <!-- BOTTOM SHEET: AUTOMATINIS PASKIRSTYMAS -->
            <div id="smart-allocator-modal" class="fixed inset-0 bg-black/80 z-[130] hidden flex flex-col justify-end backdrop-blur-sm transition-all duration-300">
                <div class="bg-tractorCard border-t-2 border-tractorBorder p-5 md:p-8 rounded-t-3xl rounded-b-none w-full max-w-4xl mx-auto space-y-5 shadow-2xl relative max-h-[90vh] overflow-y-auto mb-0">
                    <div class="flex justify-between items-center border-b border-tractorBorder/70 pb-3">
                        <div class="space-y-0.5">
                            <h3 class="font-oswald text-xl md:text-2xl font-bold uppercase tracking-wider text-white flex items-center gap-2">
                                <span>⚡</span> Suplanuoti ūkio pasėlius ir technologijas
                            </h3>
                            <p class="text-xs text-slate-300">
                                Nurodykite kultūrų dalį (%) ir numatomų purškimų skaičių (kartais).
                            </p>
                        </div>
                        <button id="btn-close-allocator-modal" class="text-slate-400 hover:text-white text-2xl font-bold cursor-pointer p-1">&times;</button>
                    </div>

                    <div class="flex justify-between items-center text-xs">
                        <span class="font-bold text-slate-300 uppercase">Ūkio kultūrų proporcijos:</span>
                        <span id="allocator-sum-indicator" class="font-mono font-bold px-3 py-1 rounded-lg">Viso: 100%</span>
                    </div>

                    <div id="allocator-mix-rows" class="space-y-3 max-h-[50vh] overflow-y-auto pr-1"></div>

                    <button type="button" id="btn-add-allocator-row" class="h-10 px-4 bg-tractorBg hover:bg-zinc-800 border border-tractorBorder rounded-xl text-xs font-bold text-slate-200 flex items-center gap-2 transition cursor-pointer">
                        <span>➕</span> Pridėti dar vieną kultūrą
                    </button>

                    <div id="allocator-sum-error" class="hidden p-3 bg-red-950/40 border border-red-800 rounded-xl text-xs text-red-400 font-bold">
                        ⚠️ Procentų suma privalo sudaryti lygiai 100%!
                    </div>

                    <div class="pt-2 border-t border-tractorBorder/60">
                        <button type="button" id="btn-run-smart-allocation" class="w-full h-12 bg-tractorPrimary hover:bg-tractorPrimaryHover text-white font-bold rounded-xl text-xs md:text-sm uppercase tracking-wider shadow-lg transition cursor-pointer flex items-center justify-center gap-2">
                            <span>🚀</span> Paskirstyti laukus ir apskaičiuoti resursus
                        </button>
                    </div>
                </div>
            </div>

            <!-- BOTTOM SHEET: ISTORIJOS REDAGAVIMAS -->
            <div id="crop-history-modal" class="fixed inset-0 bg-black/80 z-[130] hidden flex flex-col justify-end backdrop-blur-sm transition-all duration-300">
                <div class="bg-tractorCard border-t-2 border-tractorBorder p-6 md:p-8 rounded-t-3xl rounded-b-none w-full max-w-4xl mx-auto space-y-5 shadow-2xl relative max-h-[85vh] overflow-y-auto mb-0">
                    <div class="flex justify-between items-center border-b border-tractorBorder/70 pb-3">
                        <div>
                            <h3 class="font-oswald text-xl font-bold uppercase tracking-wider text-white">Sėjos Istorijos Redagavimas (${yearPrev2}–${yearPrev1} m.)</h3>
                            <p class="text-xs text-slate-400">Nurodykite, kas augo laukuose ${yearPrev2} ir ${yearPrev1} metais.</p>
                        </div>
                        <button id="btn-close-history-modal" class="text-slate-400 hover:text-white text-2xl font-bold cursor-pointer">&times;</button>
                    </div>

                    <div id="crop-history-inputs-list" class="space-y-3 max-h-[50vh] overflow-y-auto pr-1"></div>

                    <div class="pt-2 border-t border-tractorBorder/60">
                        <button type="button" id="btn-save-all-history" class="w-full h-12 bg-tractorPrimary hover:bg-tractorPrimaryHover text-white font-bold rounded-xl text-xs uppercase tracking-wider shadow transition cursor-pointer">
                            💾 Išsaugoti istoriją ir atnaujinti šviesoforą
                        </button>
                    </div>
                </div>
            </div>

        </div>
    `;
}