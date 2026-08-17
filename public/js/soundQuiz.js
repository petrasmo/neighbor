// js/soundQuiz.js

let quizQuestions = [];
let currentIndex = 0;
let userAnswers = {}; // { questionId: selectedIndex }
let isAnsweredMap = {}; // { questionId: boolean }
let isLockedDuringError = false; // Užrakina paspaudimus 2 sekundėms per klaidą

let currentAudio = null;
let isPlaying = false;

// Audio kontekstas sėkmės garsui sugeneruoti (100% veikia visose naršyklėse)
function playSuccessSound() {
    try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        
        osc.type = "sine";
        osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
        osc.frequency.setValueAtTime(880, audioCtx.currentTime + 0.1); // A5
        
        gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.35);
        
        osc.start();
        osc.stop(audioCtx.currentTime + 0.35);
    } catch (e) {
        console.log("AudioContext nepasiekiamas:", e);
    }
}

// Vibracija mobiliajame telefone
function triggerVibration() {
    if (navigator.vibrate) {
        try {
            navigator.vibrate(150);
        } catch (e) {}
    }
}

export async function renderSoundQuizScreen(container, onBack) {
    if (quizQuestions.length === 0) {
        try {
            const res = await fetch('/assets/garsai_lt.json');
            const data = await res.json();
            // Sumaišome klausimus atsitiktine tvarka
            quizQuestions = data.sort(() => 0.5 - Math.random());
        } catch (e) {
            console.error("Klaida nuskaitant garsų failą:", e);
        }
    }

    renderQuizView(container, onBack);
}

function stopAudio() {
    if (currentAudio) {
        currentAudio.pause();
        currentAudio.currentTime = 0;
        currentAudio = null;
    }
    isPlaying = false;
}

function toggleAudio(audioName) {
    if (isPlaying) {
        stopAudio();
        updatePlayerUI();
        return;
    }

    stopAudio();
    const audioPath = audioName.startsWith('http') ? audioName : `/assets/audio/${audioName}`;
    currentAudio = new Audio(audioPath);

    currentAudio.onerror = () => {
        if (!audioPath.includes('/assets/' + audioName)) {
            currentAudio = new Audio(`/assets/${audioName}`);
            currentAudio.play().catch(e => console.warn("Audio paleidimo klaida:", e));
            setupAudioEvents();
        }
    };

    setupAudioEvents();
    currentAudio.play().then(() => {
        isPlaying = true;
        updatePlayerUI();
    }).catch(e => {
        console.warn("Garso paleidimo klaida:", e);
        isPlaying = false;
        updatePlayerUI();
    });
}

function setupAudioEvents() {
    if (!currentAudio) return;
    currentAudio.onended = () => {
        isPlaying = false;
        updatePlayerUI();
    };
    currentAudio.onpause = () => {
        isPlaying = false;
        updatePlayerUI();
    };
}

function updatePlayerUI() {
    const playBtn = document.getElementById('sound-play-btn');
    const eq = document.getElementById('sound-equalizer');
    if (playBtn) {
        playBtn.innerText = isPlaying ? "⏹" : "▶";
        playBtn.className = isPlaying 
            ? "w-14 h-14 rounded-full bg-red-800 hover:bg-red-700 text-white flex items-center justify-center text-xl transition shadow-lg shrink-0 cursor-pointer"
            : "w-14 h-14 rounded-full bg-forestPrimary hover:bg-green-600 text-white flex items-center justify-center text-xl transition shadow-lg shrink-0 cursor-pointer";
    }
    if (eq) {
        eq.querySelectorAll('.eq-bar').forEach(bar => {
            if (isPlaying) {
                bar.classList.add('animate-pulse');
                bar.style.height = `${Math.floor(Math.random() * 20) + 10}px`;
            } else {
                bar.classList.remove('animate-pulse');
                bar.style.height = '6px';
            }
        });
    }
}

function renderQuizView(container, onBack) {
    if (quizQuestions.length === 0) {
        container.innerHTML = `
            <div class="bg-forestSurface border border-forestBorder p-8 rounded-2xl text-center space-y-3">
                <span class="text-3xl block">🔊</span>
                <p class="text-white font-bold">Garsų klausimų nerasta</p>
            </div>
        `;
        return;
    }

    const q = quizQuestions[currentIndex];
    const qId = q.id;
    const selectedAnswerIndex = userAnswers[qId];
    const isAnswered = isAnsweredMap[qId] || false;
    const isCorrectSelected = isAnswered && selectedAnswerIndex !== undefined && q.correctOptionIndices.includes(selectedAnswerIndex);
    const isLastQuestion = currentIndex === quizQuestions.length - 1;

    const optionsHtml = q.options.map((option, index) => {
        const isSelected = selectedAnswerIndex === index;
        const isCorrectIndex = q.correctOptionIndices.includes(index);

        let containerColor = "bg-forestSurface border-forestBorder text-forestSecondary hover:border-forestPrimary";

        if (isAnswered && isSelected) {
            if (isCorrectIndex) {
                containerColor = "bg-green-950/40 border-green-500 text-green-400 font-bold";
            } else {
                containerColor = "bg-red-950/40 border-red-500 text-red-400 font-bold animate-shake";
            }
        } else if (isAnswered && isCorrectSelected) {
            containerColor = "bg-forestSurface/40 border-forestBorder/40 text-slate-500 opacity-60";
        }

        return `
            <button class="quiz-option-btn w-full p-4 rounded-xl border-2 text-left text-xs md:text-sm transition duration-200 ${containerColor}" 
                data-idx="${index}" ${isLockedDuringError || isCorrectSelected ? 'disabled' : ''}>
                ${option}
            </button>
        `;
    }).join('');

    container.innerHTML = `
        <div class="space-y-4 max-w-4xl mx-auto py-2">
            
            <!-- Viršutinė juosta -->
            <div class="flex items-center justify-between border-b border-forestBorder pb-3">
                <div class="flex items-center gap-3">
                    <button id="quiz-back-btn" class="w-9 h-9 rounded-xl bg-forestSurface border border-forestBorder hover:border-forestPrimary flex items-center justify-center text-white text-sm transition focus:outline-none">
                        ←
                    </button>
                    <div>
                        <h2 class="text-lg md:text-xl font-bold font-oswald text-white uppercase tracking-wider">Garsų atpažinimas</h2>
                        <p class="text-[11px] text-forestPrimary font-bold">${q.topicText || 'Laukinė fauna'}</p>
                    </div>
                </div>
                <span class="text-xs font-bold font-oswald text-forestSecondary bg-forestSurface border border-forestBorder px-3 py-1.5 rounded-xl">
                    Klausimas ${currentIndex + 1} iš ${quizQuestions.length}
                </span>
            </div>

            <!-- Grotuvo kortelė -->
            <div class="bg-forestSurface border border-forestBorder p-5 md:p-6 rounded-2xl flex items-center justify-between gap-4 shadow-lg">
                <div class="flex items-center gap-4">
                    <button id="sound-play-btn" class="w-14 h-14 rounded-full bg-forestPrimary hover:bg-green-600 text-white flex items-center justify-center text-xl transition shadow-lg shrink-0 cursor-pointer">
                        ${isPlaying ? "⏹" : "▶"}
                    </button>
                    <div>
                        <h4 class="text-sm md:text-base font-bold text-white">Išklausykite įrašą</h4>
                        <p class="text-xs text-forestSecondary">Trukmė: ~${q.audioDurationSeconds || 8} sek.</p>
                    </div>
                </div>

                <!-- Judantis ekvalaizeris -->
                <div id="sound-equalizer" class="flex items-end gap-1 h-8 px-2">
                    <div class="eq-bar w-1.5 bg-forestPrimary rounded-full transition-all duration-150 h-2"></div>
                    <div class="eq-bar w-1.5 bg-forestPrimary rounded-full transition-all duration-150 h-4"></div>
                    <div class="eq-bar w-1.5 bg-forestPrimary rounded-full transition-all duration-150 h-3"></div>
                    <div class="eq-bar w-1.5 bg-forestPrimary rounded-full transition-all duration-150 h-5"></div>
                    <div class="eq-bar w-1.5 bg-forestPrimary rounded-full transition-all duration-150 h-2"></div>
                </div>
            </div>

            <!-- Klausimo tekstas -->
            <div class="bg-forestSurface border border-forestBorder p-5 rounded-2xl space-y-4 shadow-lg text-center">
                <h3 class="text-base md:text-lg font-bold text-white font-oswald tracking-wide">
                    ${q.text}
                </h3>

                <!-- Variantai -->
                <div class="space-y-2.5 pt-2">
                    ${optionsHtml}
                </div>
            </div>

            <!-- Paaiškinimas pasirodo TIK sėkmingai atspėjus teisingą atsakymą -->
            ${isCorrectSelected ? `
                <div class="bg-forestSurface border border-forestBorder rounded-2xl p-5 space-y-3 animate-fadeIn">
                    <h4 class="text-xs font-bold text-forestPrimary uppercase tracking-wider">💡 Paaiškinimas</h4>
                    <p class="text-xs md:text-sm text-forestSecondary leading-relaxed">${q.explanation || 'Paaiškinimo nėra.'}</p>
                    
                    <div class="pt-2">
                        <button id="quiz-next-btn" class="w-full h-12 bg-buttonBrown hover:bg-buttonBrownHover text-white font-bold rounded-xl text-xs uppercase tracking-wider transition shadow-md">
                            ${isLastQuestion ? 'Uždaryti praktikos sesiją' : 'Kitas klausimas →'}
                        </button>
                    </div>
                </div>
            ` : ''}

        </div>
    `;

    document.getElementById('quiz-back-btn')?.addEventListener('click', () => {
        stopAudio();
        onBack();
    });

    document.getElementById('sound-play-btn')?.addEventListener('click', () => {
        toggleAudio(q.audioName);
    });

    // ATSAKYMO PASIRINKIMO LOGIKA PAGAL VIEWMODEL
    document.querySelectorAll('.quiz-option-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            if (isLockedDuringError || isCorrectSelected) return;

            const selectedIdx = parseInt(btn.getAttribute('data-idx'));
            const isCorrect = q.correctOptionIndices.includes(selectedIdx);

            userAnswers[qId] = selectedIdx;
            isAnsweredMap[qId] = true;

            if (isCorrect) {
                playSuccessSound();
                renderQuizView(container, onBack);
            } else {
                triggerVibration();
                isLockedDuringError = true;
                renderQuizView(container, onBack);

                // Po 2 sekundžių (delay(2000)) atstatome pasirinkimą, kad vartotojas galėtų bandyti toliau
                setTimeout(() => {
                    delete userAnswers[qId];
                    delete isAnsweredMap[qId];
                    isLockedDuringError = false;
                    renderQuizView(container, onBack);
                }, 2000);
            }
        });
    });

    document.getElementById('quiz-next-btn')?.addEventListener('click', () => {
        stopAudio();
        if (isLastQuestion) {
            currentIndex = 0;
            userAnswers = {};
            isAnsweredMap = {};
            onBack();
        } else {
            currentIndex++;
            renderQuizView(container, onBack);
        }
    });
}