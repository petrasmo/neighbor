// js/practiceHub.js

export function renderPracticeHub(container, onNavigate) {
    container.innerHTML = `
        <div class="space-y-6 max-w-4xl mx-auto py-4">
            
            <div class="space-y-1 border-b border-forestBorder pb-4">
                <h2 class="text-2xl font-bold font-oswald text-white uppercase tracking-wider">Praktiniai Įrankiai</h2>
                <p class="text-forestSecondary text-xs">Priemonės žinioms gilinti, egzaminams ir laimikių vertinimui.</p>
            </div>

            <div class="grid md:grid-cols-2 gap-4 pt-2">
                
                <!-- 1 KORTELĖ: Trofėjų skaičiuoklė -->
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

                <!-- 2 KORTELĖ: Medžioklės terminai -->
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
                                Interaktyvus medžioklės ir žūklės terminų kalendorius, leistini būdai ir dienų skaitiklis.
                            </p>
                        </div>
                    </div>
                    <div class="pt-4 flex justify-between items-center text-[11px] font-bold text-forestPrimary">
                        <span>Tikrinti terminus</span>
                        <span class="text-base group-hover:translate-x-1 transition">→</span>
                    </div>
                </div>

                <!-- 3 KORTELĖ: Medžiotojų žodynas -->
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

                <!-- 4 KORTELĖ: Gyvūnų garsai -->
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

    document.getElementById('btn-hub-trofejai')?.addEventListener('click', () => onNavigate('trofejai'));
    document.getElementById('btn-hub-terminai')?.addEventListener('click', () => onNavigate('terminai'));
    document.getElementById('btn-hub-zodynas')?.addEventListener('click', () => onNavigate('zodynas'));
    document.getElementById('btn-hub-garsai')?.addEventListener('click', () => onNavigate('garsai'));
}