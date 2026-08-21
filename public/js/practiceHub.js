// js/practiceHub.js

export function renderPracticeHub(container, onNavigate) {
    container.innerHTML = `
        <div class="space-y-6 max-w-4xl mx-auto py-4">
            
            <div class="space-y-1 border-b border-forestBorder pb-4">
                <h2 class="text-2xl font-bold font-oswald text-white uppercase tracking-wider">Medžiotojo Įrankiai</h2>
                <p class="text-forestSecondary text-xs">Priemonės medžioklei, plotų valdymui, šūvio analizei ir saugumo patikrinimui.</p>
            </div>

            <div class="grid md:grid-cols-2 gap-4 pt-2">
                
                <!-- 1 KORTELĖ: 3 METŲ PERIODINIS SAUGUMO PATIKRINIMAS (NEMOKAMAS) -->
                <div id="btn-hub-safety" class="bg-gradient-to-r from-[#1B2B1E] to-forestSurface border-2 border-green-500/70 hover:border-green-400 p-5 rounded-2xl cursor-pointer transition duration-300 group shadow-lg flex flex-col justify-between md:col-span-2">
                    <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div class="flex items-center gap-4">
                            <div class="w-14 h-14 rounded-2xl bg-green-950/80 border border-green-500/50 flex items-center justify-center text-3xl group-hover:scale-105 transition shrink-0 shadow-md">
                                🛡️
                            </div>
                            <div class="space-y-1">
                                <div class="flex items-center gap-2">
                                    <span class="bg-green-950 text-green-400 border border-green-500/50 text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider inline-block">
                                        NEMOKAMAI • 0 🪙
                                    </span>
                                    <span class="text-[10px] text-forestSecondary">Privaloma kas 3 metus</span>
                                </div>
                                <h3 class="text-lg font-bold font-oswald text-white uppercase tracking-wide group-hover:text-green-400 transition">
                                    3 Metų Saugumo Patikrinimo Simuliatorius
                                </h3>
                                <p class="text-xs text-forestSecondary leading-relaxed">
                                    9 saugumo klausimai + 1 šaudymo schema • 10 min. laiko limitas • 90% išlaikymo kartelė.
                                </p>
                            </div>
                        </div>
                        <button class="h-10 px-5 bg-forestPrimary hover:bg-green-600 text-white font-bold rounded-xl text-xs uppercase tracking-wider transition shrink-0 flex items-center gap-1.5 shadow">
                            <span>Laikyti testą</span> <span>→</span>
                        </button>
                    </div>
                </div>

                <!-- 2 KORTELĖ: Kraujo pėdsako analizatorius -->
                <div id="btn-hub-pedsakai" class="bg-forestSurface border-2 border-red-800/60 hover:border-red-600 p-5 rounded-2xl cursor-pointer transition duration-300 group shadow-lg flex flex-col justify-between md:col-span-2">
                    <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div class="flex items-center gap-4">
                            <div class="w-14 h-14 rounded-2xl bg-red-950/40 border border-red-900 flex items-center justify-center text-3xl group-hover:scale-105 transition shrink-0">
                                🩸
                            </div>
                            <div class="space-y-1">
                                <span class="bg-red-950/60 text-red-400 text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider border border-red-800/50">Taktika po šūvio</span>
                                <h3 class="text-lg font-bold font-oswald text-white uppercase tracking-wide group-hover:text-red-400 transition">
                                    Kraujo pėdsako analizatorius (Anschuss)
                                </h3>
                                <p class="text-xs text-forestSecondary leading-relaxed">
                                    Pagal kraujo spalvą, pūsleles ir elgesį nustatykite pataikymo vietą, ramybės laiką bei gaukite taktinį paieškos planą.
                                </p>
                            </div>
                        </div>
                        <button class="h-10 px-5 bg-red-800 hover:bg-red-700 text-white font-bold rounded-xl text-xs uppercase tracking-wider transition shrink-0 flex items-center gap-1.5 shadow">
                            <span>Analizuoti pėdsaką</span> <span>→</span>
                        </button>
                    </div>
                </div>

                <!-- 3 KORTELĖ: Mano medžioklės plotai -->
                <div id="btn-hub-plotai" class="bg-forestSurface border border-forestBorder hover:border-forestPrimary p-5 rounded-2xl cursor-pointer transition duration-300 group shadow-lg flex flex-col justify-between">
                    <div class="space-y-3">
                        <div class="w-12 h-12 rounded-xl bg-forestBackground border border-forestBorder flex items-center justify-center text-2xl group-hover:scale-105 transition shrink-0">
                            🗺️
                        </div>
                        <div class="space-y-1">
                            <h3 class="text-base font-bold font-oswald text-white uppercase tracking-wide group-hover:text-forestPrimary transition">
                                Medžioklės plotai ir bokšteliai
                            </h3>
                            <p class="text-[11px] text-forestSecondary leading-relaxed">
                                Palydovinis žemėlapis: bokštelių, šėryklų bei miško kamerų valdymas su GPS koordinatėmis.
                            </p>
                        </div>
                    </div>
                    <div class="pt-4 flex justify-between items-center text-[11px] font-bold text-forestPrimary">
                        <span>Atidaryti žemėlapį</span>
                        <span class="text-base group-hover:translate-x-1 transition">→</span>
                    </div>
                </div>

                <!-- 4 KORTELĖ: Medžiotojo orai ir vėjas bokšteliui -->
                <div id="btn-hub-orai" class="bg-forestSurface border border-forestBorder hover:border-forestPrimary p-5 rounded-2xl cursor-pointer transition duration-300 group shadow-lg flex flex-col justify-between">
                    <div class="space-y-3">
                        <div class="w-12 h-12 rounded-xl bg-forestBackground border border-forestBorder flex items-center justify-center text-2xl group-hover:scale-105 transition shrink-0">
                            💨
                        </div>
                        <div class="space-y-1">
                            <h3 class="text-base font-bold font-oswald text-white uppercase tracking-wide group-hover:text-forestPrimary transition">
                                Orai ir vėjas bokšteliui
                            </h3>
                            <p class="text-[11px] text-forestSecondary leading-relaxed">
                                Vėjo kompasas, kvapo sklidimo kryptis, Mėnulio fazės bei saulėlydžio laikai.
                            </p>
                        </div>
                    </div>
                    <div class="pt-4 flex justify-between items-center text-[11px] font-bold text-forestPrimary">
                        <span>Tikrinti vėją</span>
                        <span class="text-base group-hover:translate-x-1 transition">→</span>
                    </div>
                </div>

                <!-- 5 KORTELĖ: Trofėjų skaičiuoklė -->
                <div id="btn-hub-trofejai" class="bg-forestSurface border border-forestBorder hover:border-forestPrimary p-5 rounded-2xl cursor-pointer transition duration-300 group shadow-lg flex flex-col justify-between">
                    <div class="space-y-3">
                        <div class="w-12 h-12 rounded-xl bg-forestBackground border border-forestBorder flex items-center justify-center text-2xl group-hover:scale-105 transition shrink-0">
                            🏆
                        </div>
                        <div class="space-y-1">
                            <h3 class="text-base font-bold font-oswald text-white uppercase tracking-wide group-hover:text-forestPrimary transition">
                                Trofėjų skaičiuoklė (CIC)
                            </h3>
                            <p class="text-[11px] text-forestSecondary leading-relaxed">
                                Stirnino, elnio, briedžio ragų, šerno ilčių bei kaukolių medalių skaičiavimas realiu laiku.
                            </p>
                        </div>
                    </div>
                    <div class="pt-4 flex justify-between items-center text-[11px] font-bold text-forestPrimary">
                        <span>Skaičiuoti balus</span>
                        <span class="text-base group-hover:translate-x-1 transition">→</span>
                    </div>
                </div>

                <!-- 6 KORTELĖ: Medžioklės terminai -->
                <div id="btn-hub-terminai" class="bg-forestSurface border border-forestBorder hover:border-forestPrimary p-5 rounded-2xl cursor-pointer transition duration-300 group shadow-lg flex flex-col justify-between">
                    <div class="space-y-3">
                        <div class="w-12 h-12 rounded-xl bg-forestBackground border border-forestBorder flex items-center justify-center text-2xl group-hover:scale-105 transition shrink-0">
                            🦌
                        </div>
                        <div class="space-y-1">
                            <h3 class="text-base font-bold font-oswald text-white uppercase tracking-wide group-hover:text-forestPrimary transition">
                                Ką dabar galima medžioti?
                            </h3>
                            <p class="text-[11px] text-forestSecondary leading-relaxed">
                                Interaktyvus medžioklės ir žūklės terminų kalendorius bei dienų skaitiklis.
                            </p>
                        </div>
                    </div>
                    <div class="pt-4 flex justify-between items-center text-[11px] font-bold text-forestPrimary">
                        <span>Tikrinti terminus</span>
                        <span class="text-base group-hover:translate-x-1 transition">→</span>
                    </div>
                </div>

                <!-- 7 KORTELĖ: Medžiotojų žodynas -->
                <div id="btn-hub-zodynas" class="bg-forestSurface border border-forestBorder hover:border-forestPrimary p-5 rounded-2xl cursor-pointer transition duration-300 group shadow-lg flex flex-col justify-between">
                    <div class="space-y-3">
                        <div class="w-12 h-12 rounded-xl bg-forestBackground border border-forestBorder flex items-center justify-center text-2xl group-hover:scale-105 transition shrink-0">
                            📖
                        </div>
                        <div class="space-y-1">
                            <h3 class="text-base font-bold font-oswald text-white uppercase tracking-wide group-hover:text-forestPrimary transition">
                                Medžiotojų žodynas
                            </h3>
                            <p class="text-[11px] text-forestSecondary leading-relaxed">
                                Žvėrių elgsenos, anatomijos terminai bei tradicinis medžiotojų žargonas.
                            </p>
                        </div>
                    </div>
                    <div class="pt-4 flex justify-between items-center text-[11px] font-bold text-forestPrimary">
                        <span>Naršyti žodyną</span>
                        <span class="text-base group-hover:translate-x-1 transition">→</span>
                    </div>
                </div>

                <!-- 8 KORTELĖ: Gyvūnų garsai -->
                <div id="btn-hub-garsai" class="bg-forestSurface border border-forestBorder hover:border-forestPrimary p-5 rounded-2xl cursor-pointer transition duration-300 group shadow-lg flex flex-col justify-between">
                    <div class="space-y-3">
                        <div class="w-12 h-12 rounded-xl bg-forestBackground border border-forestBorder flex items-center justify-center text-2xl group-hover:scale-105 transition shrink-0">
                            🔊
                        </div>
                        <div class="space-y-1">
                            <h3 class="text-base font-bold font-oswald text-white uppercase tracking-wide group-hover:text-forestPrimary transition">
                                Garsų atpažinimas
                            </h3>
                            <p class="text-[11px] text-forestSecondary leading-relaxed">
                                Klausykite įrašų gamtoje, atpažinkite žvėrių rujos balsus bei pavojaus signalus.
                            </p>
                        </div>
                    </div>
                    <div class="pt-4 flex justify-between items-center text-[11px] font-bold text-forestPrimary">
                        <span>Pradėti testą</span>
                        <span class="text-base group-hover:translate-x-1 transition">→</span>
                    </div>
                </div>

            </div>

        </div>
    `;

    document.getElementById('btn-hub-safety')?.addEventListener('click', () => onNavigate('safety'));
    document.getElementById('btn-hub-pedsakai')?.addEventListener('click', () => onNavigate('pedsakai'));
    document.getElementById('btn-hub-plotai')?.addEventListener('click', () => onNavigate('plotai'));
    document.getElementById('btn-hub-orai')?.addEventListener('click', () => onNavigate('orai'));
    document.getElementById('btn-hub-trofejai')?.addEventListener('click', () => onNavigate('trofejai'));
    document.getElementById('btn-hub-terminai')?.addEventListener('click', () => onNavigate('terminai'));
    document.getElementById('btn-hub-zodynas')?.addEventListener('click', () => onNavigate('zodynas'));
    document.getElementById('btn-hub-garsai')?.addEventListener('click', () => onNavigate('garsai'));
}