// js/results.js
import { db, auth } from './firebase.js';
import { loadPastTestForReview } from './exam.js';
import { isGuestMode, logoutUser } from './auth.js';

let resultsListener = null;
let cachedTopics = null;
let activePastTests = [];
let currentSubTab = 0; // 0 - Istorija, 1 - Progresas

async function getTopics() {
    if (cachedTopics) return cachedTopics;
    try {
        const response = await fetch('/assets/lt_temos.json');
        if (!response.ok) throw new Error("Nepavyko gauti temos failo.");
        cachedTopics = await response.json();
        return cachedTopics;
    } catch (e) {
        console.error("Klaida siunčiantis temas:", e);
        return [];
    }
}

function getProgressColor(percent) {
    if (percent < 50) return "#E57373";
    if (percent < 80) return "#FFD54F";
    return "#81C784";
}

export function renderResultsScreen() {
    const container = document.getElementById('view-tab-results');
    if (!container) return;
    currentSubTab = 0;

    const isGuest = isGuestMode();

    if (isGuest) {
        container.innerHTML = `
            <div class="space-y-6 max-w-4xl mx-auto">
                <div class="space-y-1 border-b border-forestBorder pb-4">
                    <h2 class="text-2xl font-bold font-oswald text-white uppercase tracking-wider">Mano Rezultatai</h2>
                    <p class="text-forestSecondary text-xs">Egzaminų istorija ir temų analitika.</p>
                </div>

                <div class="bg-forestSurface border border-forestBorder p-8 rounded-2xl text-center space-y-4 shadow-lg">
                    <span class="text-4xl block">📊</span>
                    <h3 class="text-lg font-bold font-oswald text-white uppercase">Reikalingas prisijungimas</h3>
                    <p class="text-xs text-forestSecondary max-w-md mx-auto leading-relaxed">
                        Svečio režime egzaminų rezultatai nėra saugomi debesyje. Prisijunkite prie savo paskyros, kad galėtumėte stebėti savo pažangą ir analizuoti klaidas.
                    </p>
                    <div class="pt-2">
                        <button id="results-login-btn" class="px-6 h-11 bg-forestPrimary hover:bg-green-600 text-white font-bold rounded-xl text-xs uppercase tracking-wider transition shadow">
                            Prisijungti prie paskyros 🔑
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.getElementById('results-login-btn')?.addEventListener('click', () => {
            logoutUser();
        });
        return;
    }
    
    container.innerHTML = `
        <div class="space-y-6 max-w-4xl mx-auto">
            <div class="space-y-1 border-b border-forestBorder pb-4">
                <h2 class="text-2xl font-bold font-oswald text-white uppercase tracking-wider">Mano Rezultatai</h2>
                <p class="text-forestSecondary text-xs">Čia galite peržiūrėti savo bandomųjų egzaminų istoriją bei analizuoti temų progresą.</p>
            </div>

            <div class="flex gap-8 border-b border-forestBorder w-full">
                <button id="tab-history-btn" class="pb-3 border-b-2 border-forestPrimary text-forestPrimary font-bold text-sm transition focus:outline-none">
                    Istorija
                </button>
                <button id="tab-progress-btn" class="pb-3 border-b-2 border-transparent text-slate-400 hover:text-white font-medium text-sm transition focus:outline-none">
                    Progresas
                </button>
            </div>
            
            <div id="results-content-container" class="space-y-4">
                <p class="text-forestSecondary text-sm">Kraunama rezultatų istorija...</p>
            </div>
        </div>
    `;

    setupSubTabEvents();

    const user = auth.currentUser;
    if (user) {
        listenToResults(user.uid);
    }
}

function setupSubTabEvents() {
    const historyBtn = document.getElementById('tab-history-btn');
    const progressBtn = document.getElementById('tab-progress-btn');

    if (historyBtn && progressBtn) {
        historyBtn.addEventListener('click', () => {
            if (currentSubTab === 0) return;
            currentSubTab = 0;
            
            historyBtn.classList.add('border-forestPrimary', 'text-forestPrimary', 'font-bold');
            historyBtn.classList.remove('border-transparent', 'text-slate-400', 'font-medium', 'hover:text-white');
            
            progressBtn.classList.add('border-transparent', 'text-slate-400', 'font-medium', 'hover:text-white');
            progressBtn.classList.remove('border-forestPrimary', 'text-forestPrimary', 'font-bold');

            renderActiveSubTab();
        });

        progressBtn.addEventListener('click', () => {
            if (currentSubTab === 1) return;
            currentSubTab = 1;
            
            progressBtn.classList.add('border-forestPrimary', 'text-forestPrimary', 'font-bold');
            progressBtn.classList.remove('border-transparent', 'text-slate-400', 'font-medium', 'hover:text-white');
            
            historyBtn.classList.add('border-transparent', 'text-slate-400', 'font-medium', 'hover:text-white');
            historyBtn.classList.remove('border-forestPrimary', 'text-forestPrimary', 'font-bold');

            renderActiveSubTab();
        });
    }
}

function listenToResults(uid) {
    if (resultsListener) resultsListener();

    resultsListener = db.collection("users").doc(uid).collection("results")
        .orderBy("dateStartTime", "desc")
        .onSnapshot((snapshot) => {
            activePastTests = [];
            snapshot.forEach(doc => {
                activePastTests.push(doc.data());
            });

            renderActiveSubTab();
        }, (error) => {
            console.error("Klaida nuskaitant rezultatus:", error);
        });
}

function renderActiveSubTab() {
    const contentContainer = document.getElementById('results-content-container');
    if (!contentContainer) return;

    if (activePastTests.length === 0) {
        contentContainer.innerHTML = `
            <div class="bg-forestSurface border border-forestBorder p-8 rounded-2xl text-center space-y-3">
                <span class="text-4xl block">📊</span>
                <h4 class="text-md font-bold text-white font-oswald uppercase">Istorija tuščia</h4>
                <p class="text-xs text-forestSecondary max-w-xs mx-auto">Jūs dar nesate išsprendęs nei vieno bandomojo egzamino svetainėje.</p>
            </div>
        `;
        return;
    }

    if (currentSubTab === 0) {
        renderHistoryList(contentContainer);
    } else {
        renderProgressList(contentContainer);
    }
}

function renderHistoryList(container) {
    let html = "";

    activePastTests.forEach(test => {
        const colorClass = test.isPassed ? "text-[#81C784]" : "text-[#E57373]";
        const icon = test.isPassed ? "🏆" : "❌";

        html += `
            <div class="bg-forestSurface border border-forestBorder p-5 rounded-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 transition hover:border-forestPrimary/40">
                <div class="flex items-center gap-4">
                    <span class="text-3xl">${icon}</span>
                    <div class="space-y-1">
                        <span class="text-[9px] text-forestSecondary uppercase font-bold tracking-wider">${test.dateString}</span>
                        <h4 class="text-lg font-extrabold font-oswald text-white uppercase tracking-tight">
                            Rezultatas: <span class="${colorClass}">${test.percentage}%</span>
                        </h4>
                        <p class="text-xs text-forestSecondary">
                            Teisingi atsakymai: <strong class="text-white">${test.score} iš ${test.totalQuestions}</strong> • Laikas: <strong class="text-white">${test.durationString}</strong>
                        </p>
                    </div>
                </div>
                <button class="review-past-btn h-10 px-5 bg-forestBackground border border-forestBorder hover:border-forestPrimary text-forestSecondary hover:text-white rounded-xl font-bold text-xs transition focus:outline-none" data-id="${test.dateStartTime}">
                    Peržiūrėti klaidas
                </button>
            </div>
        `;
    });

    container.innerHTML = html;

    document.querySelectorAll('.review-past-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const startTime = parseInt(btn.getAttribute('data-id'));
            const selectedTest = activePastTests.find(t => t.dateStartTime === startTime);
            if (selectedTest) {
                loadPastTestForReview(selectedTest);
            }
        });
    });
}

async function renderProgressList(container) {
    container.innerHTML = `
        <div class="flex flex-col items-center justify-center py-10 space-y-4">
            <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-forestPrimary"></div>
            <p class="text-forestSecondary text-xs">Skaičiuojama temų analitika...</p>
        </div>
    `;

    const topics = await getTopics();
    const filteredTopics = topics.filter(t => t.id.toString() !== "400");

    const totalMap = {};
    const correctMap = {};

    activePastTests.forEach(test => {
        if (!test.questions) return; 

        test.questions.forEach(q => {
            if (!q.topicIds) return;

            q.topicIds.forEach(tId => {
                let idStr = tId.toString().replace(".0", "").trim();
                if (idStr === "400") return;

                if (idStr.includes("-")) {
                    idStr = idStr.split("-")[0];
                }

                totalMap[idStr] = (totalMap[idStr] || 0) + 1;

                const userSelection = test.userAnswers[q.id];
                const correctSelection = q.correctOptionIndices;

                if (userSelection !== undefined && correctSelection) {
                    const isCorrect = userSelection === correctSelection[0];
                    if (isCorrect) {
                        correctMap[idStr] = (correctMap[idStr] || 0) + 1;
                    }
                }
            });
        });
    });

    const analyticsData = filteredTopics.map(topic => {
        const topicIdStr = topic.id.toString().replace(".0", "").trim();
        const total = totalMap[topicIdStr] || 0;
        const correct = correctMap[topicIdStr] || 0;
        const percent = total > 0 ? Math.round((correct / total) * 100) : 0;

        return {
            topicId: topic.id,
            nameLt: topic.nameLt,
            total: total,
            correct: correct,
            percent: percent
        };
    }).filter(item => item.total > 0) 
      .sort((a, b) => b.percent - a.percent); 

    if (analyticsData.length === 0) {
        container.innerHTML = `
            <div class="bg-forestSurface border border-forestBorder p-8 rounded-2xl text-center space-y-3">
                <span class="text-4xl block">📊</span>
                <h4 class="text-md font-bold text-white font-oswald uppercase">Nėra duomenų peržiūrai</h4>
                <p class="text-xs text-forestSecondary max-w-xs mx-auto">Išspręskite bent vieną naują egzaminą, kad sukauptume temų progreso statistiką.</p>
            </div>
        `;
        return;
    }

    let html = '<div class="space-y-4">';
    analyticsData.forEach(topic => {
        const color = getProgressColor(topic.percent);

        html += `
            <div class="bg-forestSurface border border-forestBorder p-5 rounded-xl space-y-3">
                <div class="flex justify-between items-center">
                    <span class="text-sm font-bold text-white">${topic.nameLt}</span>
                    <span class="text-sm font-extrabold font-oswald" style="color: ${color}">${topic.percent}%</span>
                </div>
                
                <div class="w-full bg-forestBackground h-2.5 rounded-full overflow-hidden border border-forestBorder">
                    <div class="h-full rounded-full transition-all duration-500" style="width: ${topic.percent}%; background-color: ${color}"></div>
                </div>

                <div class="text-[11px] text-forestSecondary">
                    Teisingi atsakymai: <strong class="text-white">${topic.correct} iš ${topic.total}</strong> klausimų
                </div>
            </div>
        `;
    });
    html += '</div>';

    container.innerHTML = html;
}