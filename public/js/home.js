// js/home.js
import { startExam } from './exam.js';
import { showDialog } from './ui.js';
import { isGuestMode, logoutUser } from './auth.js';

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

        let topicsHtml = "";
        filteredTopics.forEach(topic => {
            topicsHtml += `
                <label class="flex items-center gap-3 bg-forestBackground p-2.5 md:p-3 rounded-xl border border-forestBorder cursor-pointer hover:border-forestPrimary transition">
                    <input type="checkbox" class="topic-checkbox w-4.5 h-4.5 accent-forestPrimary" value="${topic.id}" checked>
                    <span class="text-xs md:text-sm font-bold text-white">${topic.nameLt}</span>
                </label>
            `;
        });

        container.innerHTML = `
            <div class="space-y-4 max-w-4xl mx-auto pb-16">
                
                <!-- ŠVARUS RESPONSYVUS ANTRAŠTĖS BLOKAS -->
                <div class="border-b border-forestBorder pb-3 space-y-1.5">
                    <div class="flex justify-between items-center gap-2">
                        <h2 class="text-lg md:text-2xl font-bold font-oswald text-white uppercase tracking-wider">Teorijos Egzaminas</h2>
                        <div class="bg-forestSurface border border-forestBorder px-3 py-1.5 rounded-xl flex items-center gap-1.5 shrink-0 shadow-inner">
                            <span class="text-[9px] text-forestSecondary uppercase font-bold tracking-wider hidden sm:inline">Balansas:</span>
                            <span id="home-credits-val" class="text-xs md:text-sm font-extrabold text-forestPrimary font-oswald">${currentCredits}</span>
                        </div>
                    </div>
                    <p class="text-forestSecondary text-xs leading-normal">Pasirinkite temas, klausimų skaičių ir pradėkite testą.</p>
                </div>

                <!-- Egzamino temos -->
                <div class="bg-forestSurface border border-forestBorder p-4 md:p-6 rounded-2xl space-y-4">
                    <div class="flex justify-between items-center border-b border-forestBorder pb-3">
                        <h3 class="text-sm md:text-base font-bold font-oswald text-white uppercase tracking-wider">Egzamino Temos</h3>
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
                <div class="bg-forestSurface border border-forestBorder p-4 md:p-6 rounded-2xl space-y-3">
                    <h3 class="text-sm md:text-base font-bold font-oswald text-white uppercase tracking-wider">Klausimų Skaičius</h3>
                    <div class="flex gap-3 md:gap-4">
                        ${[20, 50, 100].map(count => `
                            <button class="question-count-btn flex-1 h-11 rounded-xl font-bold text-xs transition border ${count === 50 ? 'bg-forestPrimary text-white border-forestPrimary' : 'bg-forestBackground text-forestSecondary border-forestBorder hover:border-forestPrimary'}" data-count="${count}">
                                ${count}
                            </button>
                        `).join('')}
                    </div>
                </div>

                <!-- Pradėti mygtukas su saugiu atstumu apačioje -->
                <div class="pt-2 pb-8">
                    <button id="start-exam-btn" class="w-full h-12 bg-buttonBrown hover:bg-buttonBrownHover text-white font-bold rounded-xl transition duration-300 uppercase tracking-wider text-xs shadow-lg flex items-center justify-center">
                        ${isGuest ? 'Pradėti egzaminą (Reikalingas prisijungimas)' : 'Pradėti egzaminą (Sunaudos kreditus)'}
                    </button>
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

    if (selectAllCheckbox) {
        selectAllCheckbox.addEventListener('change', (e) => {
            checkboxes.forEach(cb => {
                cb.checked = e.target.checked;
            });
        });
    }

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

    document.getElementById('start-exam-btn')?.addEventListener('click', () => {
        if (isGuestMode()) {
            showDialog(
                "Reikalingas prisijungimas", 
                "Norėdami spręsti bandomuosius egzaminus ir kaupti rezultatus debesyje, prašome prisijungti prie savo paskyros.", 
                "👤", 
                () => {
                    logoutUser();
                },
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