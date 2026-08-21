// js/home.js
import { startExam, startSafetyExam, startMistakesExam } from './exam.js';
import { showDialog } from './ui.js';
import { isGuestMode, logoutUser } from './auth.js';
import { getStoredMistakeIds } from './mistakes.js';

export async function renderHomeScreen() {
    const container = document.getElementById('view-tab-home');
    if (!container) return;
    
    try {
        const response = await fetch('/assets/lt_temos.json');
        if (!response.ok) throw new Error("Nepavyko gauti temos failo.");
        
        const topics = await response.json();
        const filteredTopics = topics.filter(t => t.id.toString() !== "400");

        const isGuest = isGuestMode();
        const currentCredits = isGuest ? "0 🪙" : (window.userCreditsAmount !== undefined ? window.userCreditsAmount + " 🪙" : "... 🪙");
        
        // Gauname klaidų skaičių
        const mistakeIds = await getStoredMistakeIds();
        const mistakeCount = mistakeIds.length;

        let topicsHtml = "";
        filteredTopics.forEach(topic => {
            topicsHtml += `
                <label class="flex items-center gap-3 bg-forestBackground p-2.5 md:p-3 rounded-xl border border-forestBorder cursor-pointer hover:border-forestPrimary transition">
                    <input type="checkbox" class="topic-checkbox w-4.5 h-4.5 accent-forestPrimary" value="${topic.id}" checked>
                    <span class="text-xs md:text-sm font-bold text-white">${topic.nameLt}</span>
                </label>
            `;
        });

        const mistakesCardHtml = mistakeCount > 0 ? `
            <div class="bg-gradient-to-r from-[#2A1818] to-forestSurface border-2 border-red-800/80 p-4 sm:p-5 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3.5 shadow-lg animate-fadeIn">
                <div class="flex items-center gap-3.5">
                    <div class="w-12 h-12 rounded-xl bg-red-950/80 border border-red-700/60 flex items-center justify-center text-2xl shrink-0">
                        🎯
                    </div>
                    <div class="space-y-0.5">
                        <span class="text-[10px] font-bold text-red-400 uppercase tracking-wider">Klaidų kartojimas</span>
                        <h4 class="text-sm sm:text-base font-bold text-white font-oswald uppercase">Mano Klaidų Bankas (${mistakeCount} kl.)</h4>
                        <p class="text-[11px] text-forestSecondary">Klausimai, kuriuose anksčiau suklydote. Kartokite ir taisykite klaidas nemokamai!</p>
                    </div>
                </div>
                <button id="start-mistakes-btn" class="w-full sm:w-auto h-10 px-5 bg-red-800 hover:bg-red-700 text-white font-bold rounded-xl text-xs uppercase tracking-wider transition shrink-0 shadow flex items-center justify-center gap-1.5 cursor-pointer">
                    <span>Spręsti klaidas (${mistakeCount})</span> <span>➔</span>
                </button>
            </div>
        ` : `
            <div class="bg-forestSurface/60 border border-forestBorder p-3.5 rounded-xl flex items-center justify-between gap-3 text-xs">
                <span class="text-forestSecondary flex items-center gap-2">
                    <span>🎯</span> <span>Klaidų bankas: <strong>0 klaidų</strong> (Viskas išspręsta be klaidų!)</span>
                </span>
                <span class="text-forestPrimary font-bold text-[11px]">🏆 100% Švaru</span>
            </div>
        `;

        container.innerHTML = `
            <div class="space-y-5 max-w-4xl mx-auto pb-16">
                
                <!-- VIRŠUTINIS BLOKAS: BALANSAS -->
                <div class="border-b border-forestBorder pb-3 flex justify-between items-center gap-2">
                    <div>
                        <h2 class="text-lg md:text-2xl font-bold font-oswald text-white uppercase tracking-wider">Teorijos Egzaminas</h2>
                        <p class="text-forestSecondary text-xs">Ruoškitės bilietui, taisykite klaidas arba laikykite 3 metų saugumo patikrinimą.</p>
                    </div>
                    <div class="bg-forestSurface border border-forestBorder px-3 py-1.5 rounded-xl flex items-center gap-1.5 shrink-0 shadow-inner">
                        <span class="text-[9px] text-forestSecondary uppercase font-bold tracking-wider hidden sm:inline">Balansas:</span>
                        <span id="home-credits-val" class="text-xs md:text-sm font-extrabold text-forestPrimary font-oswald">${currentCredits}</span>
                    </div>
                </div>

                <!-- 🌟 1. MANO KLAIDŲ BANKAS (DINAMIŠKAS BLOKAS) -->
                ${mistakesCardHtml}

                <!-- 🌟 2. 3 METŲ PERIODINIS SAUGUMO PATIKRINIMAS (NEMOKAMAS!) -->
                <div class="bg-gradient-to-r from-[#1B2B1E] to-forestSurface border-2 border-green-500/70 p-5 rounded-2xl space-y-4 shadow-xl relative overflow-hidden">
                    <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div class="flex items-center gap-4">
                            <div class="w-14 h-14 rounded-2xl bg-green-950/80 border border-green-500/50 flex items-center justify-center text-3xl shrink-0 shadow-md">
                                🛡️
                            </div>
                            <div class="space-y-1">
                                <div class="flex items-center gap-2">
                                    <span class="bg-green-950 text-green-400 border border-green-500/50 text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider inline-block">
                                        NEMOKAMAI • 0 🪙
                                    </span>
                                    <span class="text-[10px] text-forestSecondary">Privaloma kas 3 metus</span>
                                </div>
                                <h3 class="text-base sm:text-lg font-bold font-oswald text-white uppercase tracking-wide">
                                    3 Metų Saugumo Patikrinimo Simuliatorius
                                </h3>
                                <p class="text-xs text-forestSecondary leading-relaxed">
                                    Oficialus formatas: <strong>9 saugumo klausimai + 1 šaudymo schema</strong> • Laikas: <strong>10 min.</strong> • Reikalavimas: <strong>90% (9/10)</strong>.
                                </p>
                            </div>
                        </div>

                        <button id="start-safety-hero-btn" class="w-full sm:w-auto h-11 px-6 bg-forestPrimary hover:bg-green-600 text-white font-bold rounded-xl text-xs uppercase tracking-wider transition shrink-0 flex items-center justify-center gap-2 shadow-lg cursor-pointer">
                            <span>Laikyti testą (Nemokamai)</span> <span>➔</span>
                        </button>
                    </div>
                </div>

                <!-- 3. STANDARTINIS TESTŲ GENERATORIUS PAGAL TEMAS -->
                <div class="space-y-4">
                    
                    <div class="flex items-center gap-2">
                        <div class="h-px bg-forestBorder flex-1"></div>
                        <span class="text-xs uppercase font-bold text-forestSecondary tracking-wider">Arba spręskite teorijos testus</span>
                        <div class="h-px bg-forestBorder flex-1"></div>
                    </div>

                    <!-- Egzamino temos -->
                    <div class="bg-forestSurface border border-forestBorder p-4 md:p-6 rounded-2xl space-y-4 shadow-lg">
                        <div class="flex justify-between items-center border-b border-forestBorder pb-3">
                            <h3 class="text-sm md:text-base font-bold font-oswald text-white uppercase tracking-wider">Pasirinkite temas</h3>
                            <label class="flex items-center gap-2 cursor-pointer text-xs text-forestPrimary font-bold">
                                <input type="checkbox" id="select-all-topics" class="w-4 h-4 accent-forestPrimary" checked>
                                Pažymėti visas
                            </label>
                        </div>
                        <div class="grid md:grid-cols-2 gap-2.5 md:gap-3">
                            ${topicsHtml}
                        </div>
                    </div>

                    <!-- Klausimų skaičius -->
                    <div class="bg-forestSurface border border-forestBorder p-4 md:p-6 rounded-2xl space-y-3 shadow-lg">
                        <h3 class="text-sm md:text-base font-bold font-oswald text-white uppercase tracking-wider">Klausimų Skaičius</h3>
                        <div class="flex gap-3 md:gap-4">
                            ${[20, 50, 100].map(count => `
                                <button class="question-count-btn flex-1 h-11 rounded-xl font-bold text-xs transition border cursor-pointer ${count === 50 ? 'bg-forestPrimary text-white border-forestPrimary' : 'bg-forestBackground text-forestSecondary border-forestBorder hover:border-forestPrimary'}" data-count="${count}">
                                    ${count}
                                </button>
                            `).join('')}
                        </div>
                    </div>

                    <!-- Pradėti standartinį egzaminą mygtukas -->
                    <div class="pt-2">
                        <button id="start-exam-btn" class="w-full h-12 bg-buttonBrown hover:bg-buttonBrownHover text-white font-bold rounded-xl transition duration-300 uppercase tracking-wider text-xs shadow-lg flex items-center justify-center cursor-pointer">
                            ${isGuest ? 'Pradėti egzaminą (Reikalingas prisijungimas)' : 'Pradėti teorijos egzaminą (Sunaudos kreditus)'}
                        </button>
                    </div>

                </div>

            </div>
        `;

        setupHomeEvents(filteredTopics);

    } catch (e) {
        console.error("Klaida užkraunant temas:", e);
        container.innerHTML = `
            <div class="bg-red-950/20 border border-red-900/50 p-6 rounded-2xl text-center">
                <p class="text-red-400 font-bold">Nepavyko užkrauti egzamino temų iš debesies 🛑</p>
            </div>
        `;
    }
}

function setupHomeEvents(topics) {
    const selectAllCheckbox = document.getElementById('select-all-topics');
    const checkboxes = document.querySelectorAll('.topic-checkbox');
    const countButtons = document.querySelectorAll('.question-count-btn');
    let selectedCount = 50;

    selectAllCheckbox?.addEventListener('change', (e) => {
        checkboxes.forEach(cb => cb.checked = e.target.checked);
    });

    countButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            countButtons.forEach(b => {
                b.classList.remove('bg-forestPrimary', 'text-white', 'border-forestPrimary');
                b.classList.add('bg-forestBackground', 'text-forestSecondary', 'border-forestBorder');
            });
            btn.classList.add('bg-forestPrimary', 'text-white', 'border-forestPrimary');
            btn.classList.remove('bg-forestBackground', 'text-forestSecondary', 'border-forestBorder');
            selectedCount = parseInt(btn.getAttribute('data-count'));
        });
    });

    // Paleidžia KLAIDŲ BANKO testą (NEMOKAMAI)
    document.getElementById('start-mistakes-btn')?.addEventListener('click', () => {
        startMistakesExam();
    });

    // Paleidžia 3 metų saugumo patikrinimą (NEMOKAMAI)
    document.getElementById('start-safety-hero-btn')?.addEventListener('click', () => {
        if (isGuestMode()) {
            showDialog(
                "Reikalingas prisijungimas 🛡️", 
                "Norėdami laikyti nemokamą 3 metų saugumo patikrinimo testą, prašome prisijungti prie savo paskyros.", 
                "👤", 
                () => logoutUser(),
                () => {}
            );
            return;
        }

        startSafetyExam();
    });

    // Paleidžia standartinį teorijos egzaminą
    document.getElementById('start-exam-btn')?.addEventListener('click', () => {
        if (isGuestMode()) {
            showDialog(
                "Reikalingas prisijungimas", 
                "Norėdami spręsti bandomuosius egzaminus ir kaupti rezultatus debesyje, prašome prisijungti prie savo paskyros.", 
                "👤", 
                () => logoutUser(),
                () => {}
            );
            return;
        }

        const selectedTopicIds = Array.from(checkboxes)
            .filter(cb => cb.checked)
            .map(cb => cb.value);

        if (selectedTopicIds.length === 0) {
            showDialog("Dėmesio", "Prašome pasirinkti bent vieną temą!", "⚠️");
            return;
        }

        startExam(selectedTopicIds, selectedCount);
    });
}