// js/exam.js
import { db } from './firebase.js';
import { showDialog, switchTab } from './ui.js';
import { getStoredMistakeIds, updateMistakesAfterExam } from './mistakes.js';

let examQuestions = [];
let userAnswers = {}; 
let currentQuestionIndex = 0;
let examStartTime = 0;
let timerInterval = null;
let isReviewMode = false;
let isSafetyExam = false; 
let isMistakesExam = false; // Žyma klaidų kartojimo režimui
let examDurationString = ""; 
const SAFETY_EXAM_TIME_LIMIT_SECONDS = 600; // 10 minučių

const ltWeights = {
    406: 0.32,
    394: 0.18,
    391: 0.16,
    409: 0.14,
    410: 0.10,
    387: 0.06,
    407: 0.04
};

function saveActiveTestState() {
    if (isReviewMode || examQuestions.length === 0) return;
    localStorage.setItem('active_exam_questions', JSON.stringify(examQuestions));
    localStorage.setItem('active_exam_start_time', examStartTime.toString());
    localStorage.setItem('active_exam_user_answers', JSON.stringify(userAnswers));
    localStorage.setItem('active_exam_current_index', currentQuestionIndex.toString());
    localStorage.setItem('active_exam_is_safety', isSafetyExam ? "true" : "false");
    localStorage.setItem('active_exam_is_mistakes', isMistakesExam ? "true" : "false");
}

export function clearActiveTestState() {
    localStorage.removeItem('active_exam_questions');
    localStorage.removeItem('active_exam_start_time');
    localStorage.removeItem('active_exam_user_answers');
    localStorage.removeItem('active_exam_current_index');
    localStorage.removeItem('active_exam_is_safety');
    localStorage.removeItem('active_exam_is_mistakes');
}

export function checkAndRestoreActiveTest() {
    const savedQuestions = localStorage.getItem('active_exam_questions');
    if (savedQuestions) {
        try {
            examQuestions = JSON.parse(savedQuestions);
            examStartTime = parseInt(localStorage.getItem('active_exam_start_time') || "0");
            userAnswers = JSON.parse(localStorage.getItem('active_exam_user_answers') || "{}");
            currentQuestionIndex = parseInt(localStorage.getItem('active_exam_current_index') || "0");
            isSafetyExam = localStorage.getItem('active_exam_is_safety') === "true";
            isMistakesExam = localStorage.getItem('active_exam_is_mistakes') === "true";
            isReviewMode = false;
            
            startTimer();
            renderActiveTest();
            return true; 
        } catch (e) {
            console.error("Klaida atstatant testą:", e);
            clearActiveTestState();
        }
    }
    return false; 
}

export function loadPastTestForReview(pastTest) {
    if (!pastTest.questions || pastTest.questions.length === 0) {
        showDialog("Informacija", "Šis senas bandomojo egzamino rezultatas neturi išsaugotų klausimų peržiūrai fone.", "ℹ️");
        return;
    }

    examQuestions = pastTest.questions;
    userAnswers = pastTest.userAnswers;
    examDurationString = pastTest.durationString;
    isSafetyExam = pastTest.isSafetyExam || false;
    isMistakesExam = pastTest.isMistakesExam || false;
    currentQuestionIndex = 0;
    isReviewMode = true;
    
    switchTab(0);
    renderActiveTest();
}

// 1. STANDARTINIS TEORIJOS EGZAMINAS
export async function startExam(selectedTopicIds, selectedCount) {
    await initExamSession(selectedCount, (allQuestions) => {
        isSafetyExam = false;
        isMistakesExam = false;
        return generateExamQuestions(allQuestions, selectedTopicIds, selectedCount);
    });
}

// 2. 3 METŲ PERIODINIS SAUGUMO PATIKRINIMAS (NEMOKAMAI - 0 KREDITŲ)
export async function startSafetyExam() {
    await initExamSession(0, (allQuestions) => {
        isSafetyExam = true;
        isMistakesExam = false;
        return generateSafetyExamQuestions(allQuestions);
    });
}

// 3. 🎯 KLAIDŲ BANKO KARTOJIMO TESTAS (NEMOKAMAI - 0 KREDITŲ)
export async function startMistakesExam() {
    const mistakeIds = await getStoredMistakeIds();
    
    if (!mistakeIds || mistakeIds.length === 0) {
        showDialog("Klaidų bankas tuščias! 🏆", "Jūs šiuo metu neturite padarytų klaidų. Spręskite bandomuosius testus, o jei suklysite – klausimai atsiras čia.", "✅");
        return;
    }

    await initExamSession(0, (allQuestions) => {
        isSafetyExam = false;
        isMistakesExam = true;
        
        const mistakeQuestions = allQuestions.filter(q => mistakeIds.includes(q.id));
        
        mistakeQuestions.forEach(q => {
            const optionsWithIndex = q.options.map((text, idx) => ({ originalIndex: idx, text: text }));
            q.shuffledOptions = optionsWithIndex.sort(() => 0.5 - Math.random());
        });

        return mistakeQuestions.sort(() => 0.5 - Math.random());
    });
}

// BENDRA SESIJOS INICIALIZAVIMO FUNKCIJA
async function initExamSession(requiredCredits, generatorFn) {
    const deviceId = window.activeDeviceId;
    if (!deviceId) {
        showDialog("Klaida", "Nepavyko nustatyti įrenginio ID. Prisijunkite iš naujo.", "🛑");
        return;
    }

    const container = document.getElementById('view-tab-home');
    container.innerHTML = `
        <div class="flex flex-col items-center justify-center py-20 space-y-4">
            <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-forestPrimary"></div>
            <p class="text-forestSecondary text-sm">Ruošiamas testas...</p>
        </div>
    `;

    try {
        examDurationString = ""; 

        if (requiredCredits > 0) {
            const creditDoc = await db.collection("user_credits").doc(deviceId).get();
            if (!creditDoc.exists) {
                showDialog("Klaida", "Nerastas jūsų kreditų profilis.", "🛑", () => location.reload());
                return;
            }

            const data = creditDoc.data();
            const weeklyAccessUntil = data.weeklyAccessUntil || 0;
            const hasWeeklyAccess = weeklyAccessUntil >= Date.now();

            if (!hasWeeklyAccess) {
                const currentAmount = data.amount || 0;
                if (currentAmount < requiredCredits) {
                    showDialog("Nepakanka kreditų", `Šiam testui reikia ${requiredCredits} kreditų, o jūsų balansas yra ${currentAmount} 🪙.`, "🪙", () => location.reload());
                    return;
                }

                await db.collection("user_credits").doc(deviceId).update({
                    amount: currentAmount - requiredCredits
                });
            }
        }

        const response = await fetch('/assets/lt_klausimai_lt.json');
        const allQuestions = await response.json();

        examQuestions = generatorFn(allQuestions);
        
        userAnswers = {};
        currentQuestionIndex = 0;
        examStartTime = Date.now();
        isReviewMode = false;
        
        saveActiveTestState(); 
        startTimer();
        renderActiveTest();

    } catch (e) {
        console.error("Klaida pradedant egzaminą:", e);
        showDialog("Sistemos klaida", "Įvyko klaida ruošiant egzaminą.", "🛑", () => location.reload());
    }
}

function generateSafetyExamQuestions(allQuestions) {
    const safetyQuestions = allQuestions.filter(q => 
        q.topicIds && q.topicIds.map(id => id.toString().replace(".0", "")).includes("410")
    );
    const schemaQuestions = safetyQuestions.filter(q => q.imageName && q.imageName.trim() !== "");
    const theoryQuestions = safetyQuestions.filter(q => !q.imageName || q.imageName.trim() === "");

    const pickedSchema = schemaQuestions.sort(() => 0.5 - Math.random()).slice(0, 1);
    const pickedTheory = theoryQuestions.sort(() => 0.5 - Math.random()).slice(0, 9);

    const finalQuestions = [...pickedTheory, ...pickedSchema].sort(() => 0.5 - Math.random());

    finalQuestions.forEach(q => {
        const optionsWithIndex = q.options.map((text, idx) => ({ originalIndex: idx, text: text }));
        q.shuffledOptions = optionsWithIndex.sort(() => 0.5 - Math.random());
    });

    return finalQuestions;
}

function generateExamQuestions(allQuestions, selectedTopicIds, count) {
    const isAllTopicsSelected = selectedTopicIds.length >= 7;
    let selectedQuestions = [];

    if (isAllTopicsSelected) {
        Object.entries(ltWeights).forEach(([topicId, weight]) => {
            const neededCount = Math.round(count * weight);
            const topicQuestions = allQuestions.filter(q => 
                q.topicIds && q.topicIds.map(id => id.toString().replace(".0", "")).includes(topicId.toString())
            );
            const shuffled = topicQuestions.sort(() => 0.5 - Math.random()).slice(0, neededCount);
            selectedQuestions.push(...shuffled);
        });
        selectedQuestions = selectedQuestions.sort(() => 0.5 - Math.random()).slice(0, count);
    } else {
        const filtered = allQuestions.filter(q => 
            q.topicIds && q.topicIds.some(id => selectedTopicIds.includes(id.toString().replace(".0", "")))
        );
        selectedQuestions = filtered.sort(() => 0.5 - Math.random()).slice(0, count);
    }

    selectedQuestions.forEach(q => {
        const optionsWithIndex = q.options.map((text, idx) => ({ originalIndex: idx, text: text }));
        q.shuffledOptions = optionsWithIndex.sort(() => 0.5 - Math.random());
    });

    return selectedQuestions;
}

function getFormattedElapsedTime() {
    if (isReviewMode && examDurationString) return examDurationString;
    if (examStartTime === 0) return isSafetyExam ? "10:00" : "00:00";
    
    const elapsedSeconds = Math.floor((Date.now() - examStartTime) / 1000);

    if (isSafetyExam) {
        const remainingSeconds = Math.max(0, SAFETY_EXAM_TIME_LIMIT_SECONDS - elapsedSeconds);
        const minutes = Math.floor(remainingSeconds / 60);
        const seconds = remainingSeconds % 60;
        return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    } else {
        const minutes = Math.floor(elapsedSeconds / 60);
        const seconds = elapsedSeconds % 60;
        return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }
}

function renderActiveTest() {
    const container = document.getElementById('view-tab-home');
    const currentQuestion = examQuestions[currentQuestionIndex];

    const oldScrollContainer = document.getElementById('progress-scroll-container');
    const savedScrollLeft = oldScrollContainer ? oldScrollContainer.scrollLeft : 0;

    const answeredCount = Object.keys(userAnswers).length;
    const totalCount = examQuestions.length;
    const allAnswered = answeredCount === totalCount && totalCount > 0;
    const isLastQuestion = currentQuestionIndex === totalCount - 1;

    const progressBadgesHtml = examQuestions.map((q, idx) => {
        const isCurrent = idx === currentQuestionIndex;
        const isAnswered = userAnswers[q.id] !== undefined;

        let badgeBg = "bg-slate-800 border-forestBorder/80";
        if (isReviewMode) {
            const isCorrect = userAnswers[q.id] === q.correctOptionIndices[0];
            const borderStyle = isCurrent ? "border-white" : (isCorrect ? "border-green-500" : "border-red-500");
            badgeBg = isCorrect ? `bg-[#224229] ${borderStyle}` : `bg-[#4A2020] ${borderStyle}`;
        } else if (isCurrent) {
            badgeBg = "bg-forestPrimary border-white";
        } else if (isAnswered) {
            badgeBg = "bg-forestPrimary/50 border-forestPrimary";
        }

        return `
            <button class="badge-btn w-10 h-10 rounded-xl border font-bold text-xs text-white transition flex items-center justify-center flex-shrink-0 cursor-pointer ${badgeBg}" data-index="${idx}">
                ${idx + 1}
            </button>
        `;
    }).join('');

    const optionsHtml = currentQuestion.shuffledOptions.map((optObj) => {
        const originalIdx = optObj.originalIndex;
        const isSelected = userAnswers[currentQuestion.id] === originalIdx;
        const isCorrectIndex = currentQuestion.correctOptionIndices.includes(originalIdx);

        let optionBg = "bg-forestSurface border-forestBorder hover:border-forestPrimary";
        let optionTextClass = "text-forestSecondary";

        if (isReviewMode) {
            if (isCorrectIndex) {
                optionBg = "bg-[#162A1B] border-[#4E8C5E]/70";
                optionTextClass = "text-[#81C784] font-bold";
            } else if (isSelected) {
                optionBg = "bg-[#2B1616] border-[#A35252]/70";
                optionTextClass = "text-[#E57373] font-bold";
            } else {
                optionBg = "bg-forestSurface border-forestBorder"; 
                optionTextClass = "text-forestSecondary"; 
            }
        } else if (isSelected) {
            optionBg = "bg-forestPrimary/20 border-forestPrimary";
            optionTextClass = "text-forestPrimary font-bold";
        }

        return `
            <div class="option-card flex items-center justify-between p-4 rounded-xl border-2 cursor-pointer transition ${optionBg}" data-original-index="${originalIdx}">
                <span class="text-sm ${optionTextClass}">${optObj.text}</span>
            </div>
        `;
    }).join('');

    let bottomButtonsHtml = "";

    if (isReviewMode) {
        bottomButtonsHtml = `
            <button id="prev-question-btn" class="flex-1 h-11 bg-forestSurface border border-slate-800 text-white rounded-xl font-bold text-xs hover:bg-slate-800 transition cursor-pointer ${currentQuestionIndex === 0 ? 'opacity-50 pointer-events-none' : ''}">
                Atgal
            </button>
            ${isLastQuestion ? `
                <button id="close-review-btn" class="flex-1 h-11 bg-forestPrimary hover:bg-green-600 text-white rounded-xl font-bold text-xs transition cursor-pointer">
                    Uždaryti peržiūrą
                </button>
            ` : `
                <button id="next-question-btn" class="flex-1 h-11 bg-forestPrimary hover:bg-green-600 text-white rounded-xl font-bold text-xs transition cursor-pointer">
                    Kitas klausimas
                </button>
            `}
        `;
    } else {
        if (allAnswered && !isLastQuestion) {
            bottomButtonsHtml = `
                <button id="prev-question-btn" class="h-11 px-4 bg-forestSurface border border-slate-800 text-white rounded-xl font-bold text-xs hover:bg-slate-800 transition cursor-pointer ${currentQuestionIndex === 0 ? 'opacity-50 pointer-events-none' : ''}">
                    Atgal
                </button>
                <button id="next-question-btn" class="h-11 px-4 bg-forestSurface border border-slate-800 text-white rounded-xl font-bold text-xs hover:bg-slate-800 transition cursor-pointer">
                    Kitas
                </button>
                <button id="finish-exam-btn" class="flex-1 h-11 bg-red-800 hover:bg-red-700 text-white rounded-xl font-bold text-xs transition shadow-lg cursor-pointer">
                    Baigti egzaminą (${answeredCount}/${totalCount}) ✓
                </button>
            `;
        } else if (isLastQuestion) {
            bottomButtonsHtml = `
                <button id="prev-question-btn" class="flex-1 h-11 bg-forestSurface border border-slate-800 text-white rounded-xl font-bold text-xs hover:bg-slate-800 transition cursor-pointer ${currentQuestionIndex === 0 ? 'opacity-50 pointer-events-none' : ''}">
                    Atgal
                </button>
                <button id="finish-exam-btn" class="flex-1 h-11 bg-red-800 hover:bg-red-700 text-white rounded-xl font-bold text-xs transition cursor-pointer">
                    Baigti egzaminą
                </button>
            `;
        } else {
            bottomButtonsHtml = `
                <button id="prev-question-btn" class="flex-1 h-11 bg-forestSurface border border-slate-800 text-white rounded-xl font-bold text-xs hover:bg-slate-800 transition cursor-pointer ${currentQuestionIndex === 0 ? 'opacity-50 pointer-events-none' : ''}">
                    Atgal
                </button>
                <button id="next-question-btn" class="flex-1 h-11 bg-forestPrimary hover:bg-green-600 text-white rounded-xl font-bold text-xs transition cursor-pointer">
                    Kitas klausimas
                </button>
            `;
        }
    }

    let testTitleBadge = `<span class="text-xs text-forestSecondary uppercase font-bold tracking-wider">Bandomasis egzaminas</span>`;
    if (isSafetyExam) {
        testTitleBadge = `<span class="text-xs font-bold text-green-400 uppercase tracking-wider bg-green-950/50 border border-green-500/50 px-2.5 py-0.5 rounded-lg">🛡️ Saugumo Patikrinimas</span>`;
    } else if (isMistakesExam) {
        testTitleBadge = `<span class="text-xs font-bold text-yellow-400 uppercase tracking-wider bg-yellow-950/50 border border-yellow-500/50 px-2.5 py-0.5 rounded-lg">🎯 Klaidų Banko Kartojimas</span>`;
    }

    container.innerHTML = `
        <div class="space-y-4 max-w-4xl mx-auto">
            
            <div class="flex justify-between items-center border-b border-forestBorder pb-3 w-full">
                <div class="flex items-center gap-2">
                    ${testTitleBadge}
                    <span class="text-xs text-slate-500">•</span>
                    <span id="exam-timer" class="text-xs font-bold font-oswald ${isSafetyExam ? 'text-yellow-400 bg-yellow-950/40 border border-yellow-500/30' : 'text-forestPrimary bg-forestPrimary/10'} px-2.5 py-1 rounded-full">
                        ${getFormattedElapsedTime()}
                    </span>
                </div>
                <button id="abort-exam-btn" class="text-forestSecondary hover:text-red-400 text-base font-bold transition duration-200 w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-800/40 focus:outline-none cursor-pointer" title="${isReviewMode ? 'Išeiti' : 'Nutraukti'}">
                    ✕
                </button>
            </div>

            <div class="flex items-center w-full gap-2 bg-forestSurface/30 p-2 rounded-xl border border-forestBorder">
                <button id="scroll-left-btn" class="w-10 h-10 rounded-xl bg-forestSurface border border-forestBorder hover:border-forestPrimary text-forestSecondary hover:text-white transition flex items-center justify-center font-bold text-xs flex-shrink-0 select-none focus:outline-none cursor-pointer">
                    ◀
                </button>

                <div id="progress-scroll-container" class="flex-1 flex flex-row overflow-x-auto gap-2 pb-1 scrollbar-none">
                    ${progressBadgesHtml}
                </div>

                <button id="scroll-right-btn" class="w-10 h-10 rounded-xl bg-forestSurface border border-forestBorder hover:border-forestPrimary text-forestSecondary hover:text-white transition flex items-center justify-center font-bold text-xs flex-shrink-0 select-none focus:outline-none cursor-pointer">
                    ▶
                </button>
            </div>

            <div class="bg-forestSurface border border-forestBorder p-6 space-y-6 rounded-2xl shadow-xl">
                ${currentQuestion.imageName && currentQuestion.imageName.trim() !== "" ? `
                    <div class="flex flex-col items-center justify-center max-w-lg mx-auto mb-4 rounded-xl overflow-hidden border border-slate-700 bg-forestBackground p-2 shadow-inner">
                        <img src="/assets/img/${currentQuestion.imageName}.png" 
                             class="w-full h-auto max-h-72 object-contain" 
                             onerror="this.src='/assets/img/${currentQuestion.imageName}.jpg'; this.onerror=null;" 
                             alt="Šaudymo situacijos schema">
                        <span class="text-[10px] text-slate-400 mt-1 font-bold">🔍 Šaudymo situacijos schema</span>
                    </div>
                ` : ''}

                <h3 class="text-md md:text-lg font-bold text-white leading-relaxed text-center font-oswald">
                    ${currentQuestion.text}
                </h3>

                <div class="space-y-3 pt-2">
                    ${optionsHtml}
                </div>
            </div>

            ${isReviewMode ? `
                <div class="bg-forestSurface border border-forestBorder rounded-xl p-5 space-y-2">
                    <h4 class="text-xs font-bold text-forestPrimary uppercase tracking-wider">💡 Paaiškinimas</h4>
                    <p class="text-xs text-forestSecondary leading-relaxed">${currentQuestion.explanation || 'Paaiškinimo šiam klausimui nėra.'}</p>
                </div>
            ` : ''}

            <div class="flex justify-between gap-3 pt-2">
                ${bottomButtonsHtml}
            </div>
        </div>
    `;

    const newScrollContainer = document.getElementById('progress-scroll-container');
    if (newScrollContainer) {
        newScrollContainer.scrollLeft = savedScrollLeft; 
    }

    setupActiveTestEvents();
    
    setTimeout(() => {
        const activeBadge = document.querySelector('.badge-btn.border-white');
        if (activeBadge) {
            activeBadge.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
        }
    }, 50);
}

function setupActiveTestEvents() {
    document.querySelectorAll('.badge-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            currentQuestionIndex = parseInt(btn.getAttribute('data-index'));
            saveActiveTestState(); 
            renderActiveTest();
        });
    });

    document.querySelectorAll('.option-card').forEach(card => {
        card.addEventListener('click', () => {
            if (isReviewMode) return;
            const originalIndex = parseInt(card.getAttribute('data-original-index'));
            userAnswers[examQuestions[currentQuestionIndex].id] = originalIndex;
            saveActiveTestState(); 
            renderActiveTest(); 
        });
    });

    const scrollContainer = document.getElementById('progress-scroll-container');
    document.getElementById('scroll-left-btn')?.addEventListener('click', () => {
        scrollContainer?.scrollBy({ left: -150, behavior: 'smooth' });
    });
    document.getElementById('scroll-right-btn')?.addEventListener('click', () => {
        scrollContainer?.scrollBy({ left: 150, behavior: 'smooth' });
    });

    document.getElementById('abort-exam-btn')?.addEventListener('click', () => {
        if (isReviewMode) {
            location.reload(); 
        } else {
            showDialog(
                "Nutraukti testą?", 
                "Ar tikrai norite nutraukti šį testą?", 
                "⚠️", 
                () => {
                    clearInterval(timerInterval);
                    clearActiveTestState(); 
                    location.reload();
                },
                () => {}
            );
        }
    });

    document.getElementById('prev-question-btn')?.addEventListener('click', () => {
        if (currentQuestionIndex > 0) {
            currentQuestionIndex--;
            saveActiveTestState(); 
            renderActiveTest();
        }
    });

    document.getElementById('next-question-btn')?.addEventListener('click', () => {
        if (currentQuestionIndex < examQuestions.length - 1) {
            currentQuestionIndex++;
            saveActiveTestState(); 
            renderActiveTest();
        }
    });

    document.getElementById('finish-exam-btn')?.addEventListener('click', () => {
        const answeredCount = Object.keys(userAnswers).length;
        const totalCount = examQuestions.length;
        
        if (answeredCount < totalCount) {
            showDialog(
                "Egzamino pabaiga", 
                `Dėmesio! Atsakėte tik į ${answeredCount} iš ${totalCount} klausimų. Ar tikrai norite baigti?`, 
                "⚠️", 
                () => {
                    clearInterval(timerInterval);
                    clearActiveTestState(); 
                    renderResults();
                },
                () => {}
            );
        } else {
            clearInterval(timerInterval);
            clearActiveTestState(); 
            renderResults();
        }
    });

    document.getElementById('close-review-btn')?.addEventListener('click', () => {
        location.reload(); 
    });
}

function startTimer() {
    if (timerInterval) clearInterval(timerInterval);
    
    timerInterval = setInterval(() => {
        const elapsedSeconds = Math.floor((Date.now() - examStartTime) / 1000);

        if (isSafetyExam && elapsedSeconds >= SAFETY_EXAM_TIME_LIMIT_SECONDS) {
            clearInterval(timerInterval);
            clearActiveTestState();
            showDialog("Laikas baigėsi! ⏱️", "10 minučių laiko limitas saugumo patikrinimui baigėsi. Skaičiuojami rezultatai...", "⏳", () => {
                renderResults();
            });
            return;
        }
        
        const timerElement = document.getElementById('exam-timer');
        if (timerElement) {
            timerElement.innerText = getFormattedElapsedTime();
        }
    }, 1000);
}

function renderResults() {
    const container = document.getElementById('view-tab-home');

    let score = 0;
    examQuestions.forEach(q => {
        if (userAnswers[q.id] === q.correctOptionIndices[0]) {
            score++;
        }
    });

    const percent = Math.round((score / examQuestions.length) * 100);
    const isPassed = isSafetyExam ? (score >= 9) : (percent >= 80);

    const durationSeconds = Math.floor((Date.now() - examStartTime) / 1000);
    const minutes = Math.floor(durationSeconds / 60);
    const seconds = durationSeconds % 60;
    const timeString = String(minutes).padStart(2, '0') + ":" + String(seconds).padStart(2, '0');

    // 🌟 AUTOMATIŠKAI ATNAUJINAME KLAIDŲ BANKĄ (KLAIDAS PRIDEDAME, IŠTAISYTAS IŠTRINAME!)
    updateMistakesAfterExam(examQuestions, userAnswers);

    const user = firebase.auth().currentUser;
    if (user) {
        const resultObject = {
            dateStartTime: examStartTime,
            dateString: new Date().toLocaleString("lt-LT", { timeZone: "Europe/Vilnius" }),
            score: score,
            totalQuestions: examQuestions.length,
            percentage: percent,
            isPassed: isPassed,
            isSafetyExam: isSafetyExam,
            isMistakesExam: isMistakesExam,
            durationString: timeString,
            userAnswers: userAnswers,
            questions: examQuestions 
        };

        db.collection("users").doc(user.uid).collection("results").add(resultObject).catch(() => {});
    }

    let titleText = isPassed ? "Egzaminas išlaikytas! 🏆" : "Egzaminas neišlaikytas ❌";
    if (isSafetyExam) {
        titleText = isPassed ? "Saugumo patikrinimas išlaikytas! 🛡️" : "Saugumo patikrinimas neišlaikytas ❌";
    } else if (isMistakesExam) {
        titleText = isPassed ? "Klaidos sėkmingai ištaisytos! 🎯" : "Dar liko klaidų pasikartojimui 🔄";
    }

    let requirementText = isSafetyExam
        ? "Oficialus reikalavimas: bent 90% (bent 9 iš 10 teisingų)"
        : "Reikalaujama surinkti bent 80% teisingų atsakymų";

    container.innerHTML = `
        <div class="max-w-md mx-auto bg-forestSurface border border-slate-800 p-8 rounded-2xl text-center space-y-6 shadow-xl animate-fadeIn">
            <span class="text-5xl">${isPassed ? (isSafetyExam ? '🛡️' : isMistakesExam ? '🎯' : '🏆') : '❌'}</span>
            
            <div class="space-y-2">
                <h2 class="text-2xl font-bold font-oswald uppercase tracking-wider ${isPassed ? 'text-green-500' : 'text-red-500'}">
                    ${titleText}
                </h2>
                <p class="text-xs text-slate-400">${requirementText}</p>
            </div>

            <div class="bg-forestBackground border border-slate-850 p-6 rounded-xl space-y-3 text-left">
                <div class="flex justify-between text-sm">
                    <span class="text-slate-400">Teisingi atsakymai:</span>
                    <strong class="text-white">${score} iš ${examQuestions.length}</strong>
                </div>
                <div class="flex justify-between text-sm">
                    <span class="text-slate-400">Procentinis balas:</span>
                    <strong class="${isPassed ? 'text-green-500' : 'text-red-500'} font-oswald text-base">${percent}%</strong>
                </div>
                <div class="flex justify-between text-sm">
                    <span class="text-slate-400">Sugaištas laikas:</span>
                    <strong class="text-white">${timeString}</strong>
                </div>
            </div>

            <div class="space-y-3 pt-4">
                <button id="review-exam-btn" class="w-full h-12 bg-forestPrimary hover:bg-green-600 text-white font-bold rounded-xl transition cursor-pointer">
                    Peržiūrėti klaidas
                </button>
                <button id="go-home-btn" class="w-full h-12 bg-forestBackground border border-slate-800 hover:bg-slate-800 text-white font-bold rounded-xl transition cursor-pointer">
                    Grįžti į pradžią
                </button>
            </div>
        </div>
    `;

    document.getElementById('review-exam-btn')?.addEventListener('click', () => {
        isReviewMode = true;
        currentQuestionIndex = 0;
        renderActiveTest(); 
    });

    document.getElementById('go-home-btn')?.addEventListener('click', () => {
        location.reload(); 
    });
}