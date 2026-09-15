// js/ukis/templates/productionTemplate.js

export function getProductionTemplateHtml(planningYear) {
    return `
        <div class="space-y-6">
            
            <!-- 🌟 3 TECHNOLOGINIAI LYGIAI (VIENO PASPAUDIMO PERJUNGIKLIS) -->
            <div class="bg-tractorSurface border border-tractorBorder rounded-2xl p-5 shadow-xl space-y-3">
                <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-tractorBorder/60 pb-3">
                    <div>
                        <span class="text-xs font-bold uppercase tracking-wider text-tractorPrimaryLight block">Technologinis ūkio intensyvumas:</span>
                        <h3 class="font-oswald text-lg font-bold text-white uppercase">Pasirinkite auginimo technologiją</h3>
                    </div>
                    
                    <div class="flex items-center gap-1.5 bg-tractorBg p-1.5 rounded-xl border border-tractorBorder">
                        <button type="button" class="btn-tech-level px-3.5 py-2 rounded-lg text-xs font-bold transition cursor-pointer text-slate-400 hover:text-white" data-level="economy">
                            🥉 Ekonominis
                        </button>
                        <button type="button" class="btn-tech-level px-3.5 py-2 rounded-lg text-xs font-bold transition cursor-pointer bg-tractorPrimary text-white shadow" data-level="optimal">
                            🥈 Optimalus (Rekomenduojamas)
                        </button>
                        <button type="button" class="btn-tech-level px-3.5 py-2 rounded-lg text-xs font-bold transition cursor-pointer text-slate-400 hover:text-white" data-level="intensive">
                            🥇 Intensyvus (Maksimalus)
                        </button>
                    </div>
                </div>

                <p id="tech-level-description" class="text-xs text-slate-300 leading-relaxed">
                    🥈 <strong>Optimali technologija:</strong> Sertifikuota beicuota sėkla, NPK rudenį/pavasarį, N1+N2 azotas, herbicidas, 2 fungicidai (T1, T2 vėliavai), augimo reguliatorius ir mikroelementai. Stabilus geras derlingumas.
                </p>
            </div>

            <!-- 4 PAGRINDINĖS METRIKŲ KORTELĖS -->
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div class="bg-tractorSurface border border-tractorBorder p-5 rounded-2xl space-y-1">
                    <span class="text-[11px] uppercase font-bold text-slate-400">Viso sėklos poreikis</span>
                    <div id="prod-total-seed-tons" class="text-2xl font-black font-mono text-green-500">0.0 t</div>
                    <span id="prod-total-seed-bags" class="text-[11px] text-slate-500 block">~0 didmaišių (po 500 kg)</span>
                </div>

                <div class="bg-tractorSurface border border-tractorBorder p-5 rounded-2xl space-y-1">
                    <span class="text-[11px] uppercase font-bold text-slate-400">Trąšų poreikis (NPK + Azotas)</span>
                    <div id="prod-total-fert-tons" class="text-2xl font-black font-mono text-amber-500">0.0 t</div>
                    <span id="prod-total-fert-cost" class="text-[11px] text-slate-500 block">Biudžetas: ~0 €</span>
                </div>

                <div class="bg-tractorSurface border border-tractorBorder p-5 rounded-2xl space-y-1">
                    <span class="text-[11px] uppercase font-bold text-slate-400">Gazolio poreikis sezonui</span>
                    <div id="prod-total-fuel-liters" class="text-2xl font-black font-mono text-blue-500">0 l</div>
                    <span id="prod-total-fuel-cost" class="text-[11px] text-slate-500 block">Biudžetas: ~0 €</span>
                </div>

                <div class="bg-tractorSurface border-2 border-tractorPrimary p-5 rounded-2xl space-y-1 shadow-xl">
                    <span class="text-[11px] uppercase font-extrabold text-tractorPrimaryLight">Planuojamas grynasis pelnas</span>
                    <div id="prod-total-net-profit" class="text-2xl font-black font-mono text-green-400">0 €</div>
                    <span id="prod-net-profit-ha" class="text-[11px] text-green-500 font-bold block">0 €/ha (pagal MATIF)</span>
                </div>
            </div>

            <!-- 📦 BENDRAS PIRKIMŲ KREPŠELIS TIEKĖJAMS -->
            <div class="bg-tractorSurface border border-tractorBorder rounded-2xl p-5 md:p-6 shadow-xl space-y-3">
                <h3 class="font-oswald text-base md:text-lg font-bold text-white uppercase tracking-wider border-b border-tractorBorder/70 pb-2.5">
                    📦 Bendras Ūkio Pirkimų Krepšelis Tiekėjams (${planningYear} m.)
                </h3>
                <div id="prod-summary-grid" class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs"></div>
            </div>

            <!-- 🌾 DETALI LAUKAS PO LAUKO APŽVALGA (ATSTATYTA!) -->
            <div class="bg-tractorSurface border border-tractorBorder rounded-2xl p-5 md:p-6 shadow-xl space-y-4">
                <div class="flex justify-between items-center border-b border-tractorBorder/70 pb-3">
                    <div>
                        <h3 class="font-oswald text-lg font-bold text-white uppercase tracking-wider">
                            🌾 Laukų Detalizacija (Resursai kiekvienam laukui atskirai)
                        </h3>
                        <p class="text-xs text-slate-400">Tikslus beicuotos sėklos, NPK, salietros, purškimų ir kuro poreikis.</p>
                    </div>
                </div>

                <div id="prod-fields-detailed-list" class="space-y-3"></div>
            </div>

        </div>
    `;
}