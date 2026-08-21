import { db } from './firebase.js';
import { showDialog, switchTab } from './ui.js';

let examQuestions = [];
let userAnswers = {}; 
let currentQuestionIndex = 0;
let examStartTime = 0;
let timerInterval = null;
let isReviewMode = false;
let examDurationString = ""; 

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
}

export function clearActiveTestState() {
    localStorage.removeItem('active_exam_questions');
    localStorage.removeItem('active_exam_start_time');
    localStorage.removeItem('active_exam_user_answers');
    localStorage.removeItem('active_exam_current_index');
}

export function checkAndRestoreActiveTest() {
    const savedQuestions = localStorage.getItem('active_exam_questions');
    if (savedQuestions) {
        try {
            examQuestions = JSON.parse(savedQuestions);
            examStartTime = parseInt(localStorage.getItem('active_exam_start_time') || "0");
            userAnswers = JSON.parse(localStorage.getItem('active_exam_user_answers') || "{}");
            currentQuestionIndex = parseInt(localStorage.getItem('active_exam_current_index') || "0");
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
    currentQuestionIndex = 0;
    isReviewMode = true;
    
    switchTab(0);
    renderActiveTest();
}

export async function startExam(selectedTopicIds, selectedCount) {
    const deviceId = window.activeDeviceId;
    if (!deviceId) {
        showDialog("Klaida", "Nepavyko nustatyti įrenginio ID. Prisijunkite iš naujo.", "🛑");
        return;
    }

    const container = document.getElementById('view-tab-home');
    container.innerHTML = `
        <div class="flex flex-col items-center justify-center py-20 space-y-4">
            <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-forestPrimary"></div>
            <p class="text-forestSecondary text-sm">Tikrinama narystė ir ruošiamas egzaminas...</p>
        </div>
    `;

    try {
        examDurationString = ""; 
        
        const creditDoc = await db.collection("user_credits").doc(deviceId).get();
        if (!creditDoc.exists) {
            showDialog("Klaida", "Nerastas jūsų kreditų profilis.", "🛑", () => {
                location.reload();
            });
            return;
        }

        const data = creditDoc.data();
        const weeklyAccessUntil = data.weeklyAccessUntil || 0;
        const currentMillis = Date.now();
        const hasWeeklyAccess = weeklyAccessUntil >= currentMillis;

        if (!hasWeeklyAccess) {
            const currentAmount = data.amount || 0;
            if (currentAmount < selectedCount) {
                showDialog("Nepakanka kreditų", `Egzaminui reikia ${selectedCount} kreditų, o jūsų balansas yra ${currentAmount} 🪙.`, "🪙", () => {
                    location.reload();
                });
                return;
            }

            await db.collection("user_credits").doc(deviceId).update({
                amount: currentAmount - selectedCount
            });
            console.log(`Sėkmingai nuskaičiuota ${selectedCount} kreditų.`);
        } else {
            console.log("Nemokamas priėjimas: Galioja savaitinė narystė be limitų! 🎉");
        }

        const response = await fetch('/assets/lt_klausimai_lt.json');
        const allQuestions = await response.json();

        examQuestions = generateExamQuestions(allQuestions, selectedTopicIds, selectedCount);
        
        userAnswers = {};
        currentQuestionIndex = 0;
        examStartTime = Date.now();
        isReviewMode = false;
        
        saveActiveTestState(); 
        startTimer();
        renderActiveTest();

    } catch (e) {
        console.error("Klaida pradedant egzaminą:", e);
        showDialog("Sistemos klaida", "Įvyko nenumatyta klaida pradedant egzaminą. Kreditai nebuvo nuskaičiuoti.", "🛑", () => {
            location.reload();
        });
    }
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
        const optionsWithIndex = q.options.map((text, idx) => ({
            originalIndex: idx,
            text: text
        }));
        q.shuffledOptions = optionsWithIndex.sort(() => 0.5 - Math.random());
    });

    return selectedQuestions;
}

function getFormattedElapsedTime() {
    if (isReviewMode && examDurationString) {
        return examDurationString; 
    }
    if (examStartTime === 0) return "00:00";
    const durationMillis = Date.now() - examStartTime;
    const minutes = Math.floor((durationMillis / 1000) / 60);
    const seconds = Math.floor((durationMillis / 1000) % 60);
    return String(minutes).padStart(2, '0') + ":" + String(seconds).padStart(2, '0');
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
            <button class="badge-btn w-10 h-10 rounded-xl border font-bold text-xs text-white transition flex items-center justify-center flex-shrink-0 ${badgeBg}" data-index="${idx}">
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

    // Dinamiškai paruošiame apatinius mygtukus
    let bottomButtonsHtml = "";

    if (isReviewMode) {
        bottomButtonsHtml = `
            <button id="prev-question-btn" class="flex-1 h-11 bg-forestSurface border border-slate-800 text-white rounded-xl font-bold text-xs hover:bg-slate-800 transition ${currentQuestionIndex === 0 ? 'opacity-50 pointer-events-none' : ''}">
                Atgal
            </button>
            ${isLastQuestion ? `
                <button id="close-review-btn" class="flex-1 h-11 bg-forestPrimary hover:bg-green-600 text-white rounded-xl font-bold text-xs transition">
                    Uždaryti peržiūrą
                </button>
            ` : `
                <button id="next-question-btn" class="flex-1 h-11 bg-forestPrimary hover:bg-green-600 text-white rounded-xl font-bold text-xs transition">
                    Kitas klausimas
                </button>
            `}
        `;
    } else {
        if (allAnswered && !isLastQuestion) {
            bottomButtonsHtml = `
                <button id="prev-question-btn" class="h-11 px-4 bg-forestSurface border border-slate-800 text-white rounded-xl font-bold text-xs hover:bg-slate-800 transition ${currentQuestionIndex === 0 ? 'opacity-50 pointer-events-none' : ''}">
                    Atgal
                </button>
                <button id="next-question-btn" class="h-11 px-4 bg-forestSurface border border-slate-800 text-white rounded-xl font-bold text-xs hover:bg-slate-800 transition">
                    Kitas
                </button>
                <button id="finish-exam-btn" class="flex-1 h-11 bg-red-800 hover:bg-red-700 text-white rounded-xl font-bold text-xs transition shadow-lg">
                    Baigti egzaminą (${answeredCount}/${totalCount}) ✓
                </button>
            `;
        } else if (isLastQuestion) {
            bottomButtonsHtml = `
                <button id="prev-question-btn" class="flex-1 h-11 bg-forestSurface border border-slate-800 text-white rounded-xl font-bold text-xs hover:bg-slate-800 transition ${currentQuestionIndex === 0 ? 'opacity-50 pointer-events-none' : ''}">
                    Atgal
                </button>
                <button id="finish-exam-btn" class="flex-1 h-11 bg-red-800 hover:bg-red-700 text-white rounded-xl font-bold text-xs transition">
                    Baigti egzaminą
                </button>
            `;
        } else {
            bottomButtonsHtml = `
                <button id="prev-question-btn" class="flex-1 h-11 bg-forestSurface border border-slate-800 text-white rounded-xl font-bold text-xs hover:bg-slate-800 transition ${currentQuestionIndex === 0 ? 'opacity-50 pointer-events-none' : ''}">
                    Atgal
                </button>
                <button id="next-question-btn" class="flex-1 h-11 bg-forestPrimary hover:bg-green-600 text-white rounded-xl font-bold text-xs transition">
                    Kitas klausimas
                </button>
            `;
        }
    }

    container.innerHTML = `
        <div class="space-y-4 max-w-4xl mx-auto">
            
            <div class="flex justify-between items-center border-b border-forestBorder pb-3 w-full">
                <div class="flex items-center gap-2">
                    <span class="text-xs text-forestSecondary uppercase font-bold tracking-wider">Bandomasis egzaminas</span>
                    <span class="text-xs text-slate-500">•</span>
                    <span id="exam-timer" class="text-xs font-bold text-forestPrimary font-oswald bg-forestPrimary/10 px-2.5 py-1 rounded-full">${getFormattedElapsedTime()}</span>
                </div>
                <button id="abort-exam-btn" class="text-forestSecondary hover:text-red-400 text-base font-bold transition duration-200 w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-800/40 focus:outline-none" title="${isReviewMode ? 'Išeiti iš peržiūros' : 'Nutraukti egzaminą'}">
                    ✕
                </button>
            </div>

            <div class="flex items-center w-full gap-2 bg-forestSurface/30 p-2 rounded-xl border border-forestBorder">
                <button id="scroll-left-btn" class="w-10 h-10 rounded-xl bg-forestSurface border border-forestBorder hover:border-forestPrimary text-forestSecondary hover:text-white transition flex items-center justify-center font-bold text-xs flex-shrink-0 select-none focus:outline-none">
                    ◀
                </button>

                <div id="progress-scroll-container" class="flex-1 flex flex-row overflow-x-auto gap-2 pb-1 scrollbar-none">
                    ${progressBadgesHtml}
                </div>

                <button id="scroll-right-btn" class="w-10 h-10 rounded-xl bg-forestSurface border border-forestBorder hover:border-forestPrimary text-forestSecondary hover:text-white transition flex items-center justify-center font-bold text-xs flex-shrink-0 select-none focus:outline-none">
                    ▶
                </button>
            </div>

            <div class="bg-forestSurface border border-forestBorder p-6 space-y-6">
                ${currentQuestion.imageName && currentQuestion.imageName.trim() !== "" ? `
                    <div class="flex justify-center max-w-md mx-auto mb-4 rounded-xl overflow-hidden border border-slate-800 shadow-inner">
                        <img src="/assets/img/${currentQuestion.imageName}.png" 
                             class="w-full h-auto max-h-64 object-contain" 
                             onerror="this.src='/assets/img/${currentQuestion.imageName}.jpg'; this.onerror=null;" 
                             alt="Klausimo iliustracija">
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
                    <h4 class="text-xs font-bold text-forestPrimary uppercase tracking-wider">Paaiškinimas</h4>
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

// --- AKTYVAUS TESTO VALDYMO ĮVYKIAI ---
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
    const scrollLeftBtn = document.getElementById('scroll-left-btn');
    const scrollRightBtn = document.getElementById('scroll-right-btn');

    if (scrollLeftBtn && scrollContainer) {
        scrollLeftBtn.addEventListener('click', () => {
            scrollContainer.scrollBy({ left: -150, behavior: 'smooth' });
        });
    }

    if (scrollRightBtn && scrollContainer) {
        scrollRightBtn.addEventListener('click', () => {
            scrollContainer.scrollBy({ left: 150, behavior: 'smooth' });
        });
    }

    const abortBtn = document.getElementById('abort-exam-btn');
    if (abortBtn) {
        abortBtn.addEventListener('click', () => {
            if (isReviewMode) {
                location.reload(); 
            } else {
                showDialog(
                    "Nutraukti testą?", 
                    "Ar tikrai norite nutraukti šį bandomąjį egzaminą? Sunaudoti kreditai nebus grąžinti.", 
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
    }

    const prevBtn = document.getElementById('prev-question-btn');
    if (prevBtn) {
        prevBtn.addEventListener('click', () => {
            if (currentQuestionIndex > 0) {
                currentQuestionIndex--;
                saveActiveTestState(); 
                renderActiveTest();
            }
        });
    }

    const nextBtn = document.getElementById('next-question-btn');
    if (nextBtn) {
        nextBtn.addEventListener('click', () => {
            if (currentQuestionIndex < examQuestions.length - 1) {
                currentQuestionIndex++;
                saveActiveTestState(); 
                renderActiveTest();
            }
        });
    }

    const finishBtn = document.getElementById('finish-exam-btn');
    if (finishBtn) {
        finishBtn.addEventListener('click', () => {
            const answeredCount = Object.keys(userAnswers).length;
            const totalCount = examQuestions.length;
            
            if (answeredCount < totalCount) {
                showDialog(
                    "Egzamino pabaiga", 
                    `Dėmesio! Jūs neatsakėte į visus klausimus (atsakyta tik ${answeredCount} iš ${totalCount}). Ar tikrai norite baigti egzaminą?`, 
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
    }

    const closeReviewBtn = document.getElementById('close-review-btn');
    if (closeReviewBtn) {
        closeReviewBtn.addEventListener('click', () => {
            location.reload(); 
        });
    }
}

function startTimer() {
    if (timerInterval) clearInterval(timerInterval);
    
    timerInterval = setInterval(() => {
        const durationMillis = Date.now() - examStartTime;
        const minutes = Math.floor((durationMillis / 1000) / 60);
        const seconds = Math.floor((durationMillis / 1000) % 60);
        
        const timerElement = document.getElementById('exam-timer');
        if (timerElement) {
            timerElement.innerText = String(minutes).padStart(2, '0') + ":" + String(seconds).padStart(2, '0');
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
    const isPassed = percent >= 80;

    const durationMillis = Date.now() - examStartTime;
    const minutes = Math.floor((durationMillis / 1000) / 60);
    const seconds = Math.floor((durationMillis / 1000) % 60);
    const timeString = String(minutes).padStart(2, '0') + ":" + String(seconds).padStart(2, '0');

    const user = firebase.auth().currentUser;
    if (user) {
        const resultObject = {
            dateStartTime: examStartTime,
            dateString: new Date().toLocaleString("lt-LT", { timeZone: "Europe/Vilnius" }),
            score: score,
            totalQuestions: examQuestions.length,
            percentage: percent,
            isPassed: isPassed,
            durationString: timeString,
            userAnswers: userAnswers,
            questions: examQuestions 
        };

        db.collection("users").doc(user.uid).collection("results").add(resultObject)
            .then(() => {
                console.log("Rezultatai sėkmingai sinchronizuoti su Firestore debesiu! ☁️");
            })
            .catch(e => {
                console.error("Klaida įrašant rezultatus į duomenų bazę:", e);
            });
    }

    container.innerHTML = `
        <div class="max-w-md mx-auto bg-forestSurface border border-slate-800 p-8 rounded-2xl text-center space-y-6 shadow-xl">
            <span class="text-5xl">${isPassed ? '🏆' : '❌'}</span>
            
            <div class="space-y-2">
                <h2 class="text-2xl font-bold font-oswald uppercase tracking-wider ${isPassed ? 'text-green-500' : 'text-red-500'}">
                    ${isPassed ? 'Egzaminas išlaikytas!' : 'Egzaminas neišlaikytas'}
                </h2>
                <p class="text-xs text-slate-400">Reikalaujama surinkti bent 80% teisingų atsakymų</p>
            </div>

            <div class="bg-forestBackground border border-slate-850 p-6 rounded-xl space-y-3 text-left">
                <div class="flex justify-between text-sm">
                    <span class="text-slate-400">Teisingi atsakymai:</span>
                    <strong class="text-white">${score} iš ${examQuestions.length}</strong>
                </div>
                <div class="flex justify-between text-sm">
                    <span class="text-slate-400">Procentinis balas:</span>
                    <strong class="${isPassed ? 'text-green-500' : 'text-red-500'}">${percent}%</strong>
                </div>
                <div class="flex justify-between text-sm">
                    <span class="text-slate-400">Sugaištas laikas:</span>
                    <strong class="text-white">${timeString}</strong>
                </div>
            </div>

            <div class="space-y-3 pt-4">
                <button id="review-exam-btn" class="w-full h-12 bg-forestPrimary hover:bg-green-600 text-white font-bold rounded-xl transition">
                    Peržiūrėti klaidas
                </button>
                <button id="go-home-btn" class="w-full h-12 bg-forestBackground border border-slate-800 hover:bg-slate-800 text-white font-bold rounded-xl transition">
                    Grįžti į pradžią
                </button>
            </div>
        </div>
    `;

    document.getElementById('review-exam-btn').addEventListener('click', () => {
        isReviewMode = true;
        currentQuestionIndex = 0;
        renderActiveTest(); 
    });

    document.getElementById('go-home-btn').addEventListener('click', () => {
        location.reload(); 
    });
}