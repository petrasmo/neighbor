// public/js/trophy.js

let trophyConfigs = [];
let selectedTrophyId = "stirninas";
let currentValues = {};

export async function renderTrophyScreen(container, onBack) {
    if (trophyConfigs.length === 0) {
        try {
            const res = await fetch('/assets/trofeju_formules.json');
            trophyConfigs = await res.json();
        } catch (e) {
            console.error("Klaida nuskaitant trofėjų formules:", e);
        }
    }

    renderTrophyLayout(container, onBack);
}

function calculateScore(trophyId, vals) {
    let score = 0;
    let details = [];

    if (trophyId === "stirninas") {
        const lLeft = parseFloat(vals.length_left || 0);
        const lRight = parseFloat(vals.length_right || 0);
        const avgLen = (lLeft + lRight) / 2;
        const ptsLen = avgLen * 0.5;
        details.push({ label: "Stiebų ilgis", score: ptsLen.toFixed(2) });

        let rawWeight = parseFloat(vals.weight_raw || 0);
        const skullType = vals.skull_type || "full";
        let deduct = 90;
        if (skullType === "cut") deduct = 65;
        if (skullType === "none") deduct = 0;
        const netWeight = Math.max(0, rawWeight - deduct);
        const ptsWeight = netWeight * 0.1;
        details.push({ label: `Neto masė (${netWeight} g)`, score: ptsWeight.toFixed(2) });

        const span = parseFloat(vals.span || 0);
        const spanRatio = avgLen > 0 ? (span / avgLen) * 100 : 0;
        let ptsSpan = 0;
        if (spanRatio >= 30 && spanRatio < 35) ptsSpan = 1;
        else if (spanRatio >= 35 && spanRatio < 40) ptsSpan = 2;
        else if (spanRatio >= 40 && spanRatio < 45) ptsSpan = 3;
        else if (spanRatio >= 45 && spanRatio <= 75) ptsSpan = 4;
        details.push({ label: "Skleistuva", score: ptsSpan.toFixed(2) });

        const color = parseFloat(vals.beauty_color || 0);
        const pearls = parseFloat(vals.beauty_pearls || 0);
        const coronets = parseFloat(vals.beauty_coronets || 0);
        const tips = parseFloat(vals.beauty_tips || 0);
        const ptsBeauty = color + pearls + coronets + tips;
        details.push({ label: "Grožio balai", score: ptsBeauty.toFixed(2) });

        const penalties = parseFloat(vals.penalties || 0);
        if (penalties > 0) {
            details.push({ label: "Baudos taškai", score: `-${penalties.toFixed(2)}` });
        }

        score = ptsLen + ptsWeight + ptsSpan + ptsBeauty - penalties;

    } else if (trophyId === "elnias") {
        const len = parseFloat(vals.avg_length || 0) * 0.5;
        const brow = parseFloat(vals.avg_brow || 0) * 0.25;
        const trez = parseFloat(vals.avg_trez || 0) * 0.25;
        const coronets = parseFloat(vals.avg_coronets || 0) * 1.0;
        const cLower = parseFloat(vals.avg_circ_lower || 0) * 1.0;
        const cUpper = parseFloat(vals.avg_circ_upper || 0) * 1.0;
        const weight = Math.max(0, (parseFloat(vals.weight_kg || 0) - 0.7)) * 2.0;
        const tines = parseFloat(vals.tine_count || 0) * 1.0;
        const beauty = parseFloat(vals.beauty_points || 0);
        const penalties = parseFloat(vals.penalties || 0);

        details.push({ label: "Stiebų ilgis", score: len.toFixed(2) });
        details.push({ label: "Atšakų ilgiai", score: (brow + trez).toFixed(2) });
        details.push({ label: "Apimtys ir rožės", score: (coronets + cLower + cUpper).toFixed(2) });
        details.push({ label: "Ragų masė", score: weight.toFixed(2) });
        details.push({ label: `Atšakos (${vals.tine_count} vnt.)`, score: tines.toFixed(2) });
        details.push({ label: "Karūna ir grožis", score: beauty.toFixed(2) });

        score = len + brow + trez + coronets + cLower + cUpper + weight + tines + beauty - penalties;

    } else if (trophyId === "sernas") {
        const lLeft = parseFloat(vals.lower_len_left || 0);
        const lRight = parseFloat(vals.lower_len_right || 0);
        const ptsLen = ((lLeft + lRight) / 2) * 1.0;

        const wLeft = parseFloat(vals.lower_width_left || 0);
        const wRight = parseFloat(vals.lower_width_right || 0);
        const ptsWidth = (wLeft + wRight) * 1.5;

        const uLeft = parseFloat(vals.upper_circ_left || 0);
        const uRight = parseFloat(vals.upper_circ_right || 0);
        const ptsUpper = (uLeft + uRight) * 1.0;

        const beauty = parseFloat(vals.beauty_points || 0);
        const penalties = parseFloat(vals.penalties || 0);

        details.push({ label: "Apatinių ilčių ilgis", score: ptsLen.toFixed(2) });
        details.push({ label: "Apatinių ilčių plotis", score: ptsWidth.toFixed(2) });
        details.push({ label: "Viršutinių ilčių apimtis", score: ptsUpper.toFixed(2) });
        details.push({ label: "Grožio balai", score: beauty.toFixed(2) });

        score = ptsLen + ptsWidth + ptsUpper + beauty - penalties;

    } else if (trophyId === "briedis") {
        const len = parseFloat(vals.avg_length || 0) * 0.5;
        const width = parseFloat(vals.palm_width || 0) * 1.0;
        const span = parseFloat(vals.span_cm || 0) * 0.5;
        const tines = parseFloat(vals.tine_count || 0) * 1.0;
        const weight = parseFloat(vals.weight_kg || 0) * 1.5;
        const beauty = parseFloat(vals.beauty_points || 0);

        details.push({ label: "Stiebų ilgis", score: len.toFixed(2) });
        details.push({ label: "Menčių plotis / skleistuva", score: (width + span).toFixed(2) });
        details.push({ label: "Atšakų skaičius", score: tines.toFixed(2) });
        details.push({ label: "Masė", score: weight.toFixed(2) });
        details.push({ label: "Grožio balai", score: beauty.toFixed(2) });

        score = len + width + span + tines + weight + beauty;

    } else if (trophyId === "kaukole") {
        const len = parseFloat(vals.skull_length || 0);
        const width = parseFloat(vals.skull_width || 0);
        score = len + width;
        details.push({ label: "Kaukolės ilgis", score: len.toFixed(2) });
        details.push({ label: "Kaukolės plotis", score: width.toFixed(2) });
    }

    return { total: Math.max(0, score), details };
}

function getMedalStatus(trophyConfig, totalScore, vals) {
    let medals = trophyConfig.medals;
    if (trophyConfig.id === "kaukole" && vals.animal_type === "badger") {
        medals = { bronze: 22.0, silver: 22.5, gold: 23.0 };
    }

    if (totalScore >= medals.gold) {
        return {
            medal: "AUKSO MEDALIS",
            icon: "🥇",
            colorClass: "text-yellow-400 border-yellow-500/60 bg-yellow-950/30",
            msg: `Sveikiname! Trofėjus viršija aukso medalio ribą (${medals.gold} balų).`
        };
    } else if (totalScore >= medals.silver) {
        const diff = (medals.gold - totalScore).toFixed(2);
        return {
            medal: "SIDABRO MEDALIS",
            icon: "🥈",
            colorClass: "text-slate-200 border-slate-400/60 bg-slate-800/40",
            msg: `Iki aukso medalio trūksta tik ${diff} balo!`
        };
    } else if (totalScore >= medals.bronze) {
        const diff = (medals.silver - totalScore).toFixed(2);
        return {
            medal: "BRONZOS MEDALIS",
            icon: "🥉",
            colorClass: "text-amber-600 border-amber-700/60 bg-amber-950/30",
            msg: `Iki sidabro medalio trūksta ${diff} balo.`
        };
    } else {
        const diff = (medals.bronze - totalScore).toFixed(2);
        return {
            medal: "MEDALIO NETRAUKIA",
            icon: "⚪",
            colorClass: "text-slate-400 border-forestBorder bg-forestBackground",
            msg: `Iki bronzos medalio trūksta ${diff} balo.`
        };
    }
}

function renderTrophyLayout(container, onBack) {
    const trophy = trophyConfigs.find(t => t.id === selectedTrophyId) || trophyConfigs[0];

    // Nustatome numatytąsias reikšmes
    currentValues = {};
    trophy.fields.forEach(f => {
        currentValues[f.id] = f.default !== undefined ? f.default : "";
    });

    const selectorButtonsHtml = trophyConfigs.map(t => {
        const isSelected = t.id === selectedTrophyId;
        const activeClass = isSelected 
            ? "bg-forestPrimary text-white border-forestPrimary shadow-md scale-[1.02]" 
            : "bg-forestSurface text-forestSecondary border-forestBorder hover:border-forestPrimary";
        return `
            <button class="trophy-select-btn px-4 py-2.5 rounded-2xl border font-bold text-xs transition flex items-center gap-2 shrink-0 ${activeClass}" data-id="${t.id}">
                <span class="text-base">${t.icon}</span> <span>${t.name}</span>
            </button>
        `;
    }).join('');

    const formFieldsHtml = trophy.fields.map(f => {
        const hintHtml = f.hint ? `<p class="text-[11px] text-slate-400">${f.hint}</p>` : "";
        
        if (f.type === "select") {
            const optionsHtml = f.options.map(opt => `<option value="${opt.value}" ${opt.value === f.default ? 'selected' : ''}>${opt.label}</option>`).join('');
            return `
                <div class="space-y-1.5 bg-forestBackground/80 p-3.5 rounded-xl border border-forestBorder">
                    <label class="text-xs font-bold text-white block">${f.label}</label>
                    <select class="trophy-input-field w-full h-10 bg-forestSurface border border-forestBorder rounded-xl px-3 text-xs text-white focus:outline-none focus:border-forestPrimary" data-id="${f.id}">
                        ${optionsHtml}
                    </select>
                </div>
            `;
        }

        if (f.type === "range") {
            return `
                <div class="space-y-1.5 bg-forestBackground/80 p-3.5 rounded-xl border border-forestBorder">
                    <div class="flex justify-between items-center">
                        <label class="text-xs font-bold text-white">${f.label}</label>
                        <span id="val-display-${f.id}" class="text-xs font-bold text-forestPrimary font-oswald">${f.default} balai</span>
                    </div>
                    <input type="range" class="trophy-input-field w-full accent-forestPrimary cursor-pointer" data-id="${f.id}" 
                        min="${f.min}" max="${f.max}" step="${f.step}" value="${f.default}">
                    ${hintHtml}
                </div>
            `;
        }

        return `
            <div class="space-y-1.5 bg-forestBackground/80 p-3.5 rounded-xl border border-forestBorder">
                <div class="flex justify-between items-center">
                    <label class="text-xs font-bold text-white">${f.label}</label>
                </div>
                <input type="number" class="trophy-input-field w-full h-10 bg-forestSurface border border-forestBorder rounded-xl px-3 text-xs text-white focus:outline-none focus:border-forestPrimary" data-id="${f.id}" 
                    step="${f.step}" value="${f.default}">
                ${hintHtml}
            </div>
        `;
    }).join('');

    container.innerHTML = `
        <div class="space-y-5 max-w-4xl mx-auto py-2">
            
            <!-- Antraštė -->
            <div class="flex items-center gap-3 border-b border-forestBorder pb-3">
                <button id="trophy-back-btn" class="w-9 h-9 rounded-xl bg-forestSurface border border-forestBorder hover:border-forestPrimary flex items-center justify-center text-white text-sm transition focus:outline-none">
                    ←
                </button>
                <div>
                    <h2 class="text-lg md:text-xl font-bold font-oswald text-white uppercase tracking-wider">Trofėjų skaičiuoklė (CIC)</h2>
                    <p class="text-[11px] text-forestSecondary">${trophy.description}</p>
                </div>
            </div>

            <!-- Trofėjaus pasirinkimo mygtukai -->
            <div class="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                ${selectorButtonsHtml}
            </div>

            <!-- Pagrindinis tinklelis: Forma kairėje, Rezultatas dešinėje -->
            <div class="grid md:grid-cols-12 gap-5 items-start">
                
                <!-- Įvesties forma -->
                <div class="md:col-span-7 bg-forestSurface border border-forestBorder p-4 md:p-5 rounded-2xl space-y-3.5 shadow-lg">
                    <h3 class="text-sm font-bold text-white uppercase font-oswald tracking-wide border-b border-forestBorder pb-2">
                        📐 Matavimo duomenys
                    </h3>
                    <div class="space-y-3">
                        ${formFieldsHtml}
                    </div>
                </div>

                <!-- Rezultato skydelis -->
                <div class="md:col-span-5 space-y-4 sticky top-4">
                    <div id="trophy-result-card" class="bg-forestSurface border p-6 rounded-2xl text-center space-y-4 shadow-xl transition-all duration-300">
                        <span id="medal-icon" class="text-5xl block animate-bounce">🥇</span>
                        
                        <div class="space-y-1">
                            <span class="text-[10px] text-forestSecondary uppercase font-bold tracking-widest block">Apskaičiuotas įvertis</span>
                            <h3 id="total-score-val" class="text-4xl font-extrabold text-white font-oswald">
                                0.00 <span class="text-sm text-forestPrimary font-sans font-normal">CIC balų</span>
                            </h3>
                            <div id="medal-badge" class="inline-block px-3 py-1 rounded-full text-xs font-bold font-oswald tracking-wider border">
                                SKAIČIUOJAMA
                            </div>
                        </div>

                        <p id="medal-msg" class="text-xs text-forestSecondary leading-relaxed pt-1"></p>

                        <!-- Išklotinė -->
                        <div id="score-breakdown" class="bg-forestBackground border border-forestBorder/70 p-3.5 rounded-xl text-left space-y-1.5 text-xs">
                        </div>
                    </div>
                </div>

            </div>

        </div>
    `;

    document.getElementById('trophy-back-btn')?.addEventListener('click', onBack);

    // Trofėjaus pasirinkimo mygtukai
    document.querySelectorAll('.trophy-select-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            selectedTrophyId = btn.getAttribute('data-id');
            renderTrophyLayout(container, onBack);
        });
    });

    // Realaus laiko įvesties stebėjimas
    document.querySelectorAll('.trophy-input-field').forEach(input => {
        input.addEventListener('input', (e) => {
            const fieldId = input.getAttribute('data-id');
            currentValues[fieldId] = input.value;

            const rangeDisplay = document.getElementById(`val-display-${fieldId}`);
            if (rangeDisplay) {
                rangeDisplay.innerText = `${input.value} balai`;
            }

            updateLiveResults();
        });
    });

    updateLiveResults();
}

function updateLiveResults() {
    const trophy = trophyConfigs.find(t => t.id === selectedTrophyId);
    if (!trophy) return;

    const res = calculateScore(selectedTrophyId, currentValues);
    const medalInfo = getMedalStatus(trophy, res.total, currentValues);

    const scoreValElem = document.getElementById('total-score-val');
    const medalIconElem = document.getElementById('medal-icon');
    const medalBadgeElem = document.getElementById('medal-badge');
    const medalMsgElem = document.getElementById('medal-msg');
    const breakdownElem = document.getElementById('score-breakdown');
    const resultCardElem = document.getElementById('trophy-result-card');

    if (scoreValElem) scoreValElem.innerHTML = `${res.total.toFixed(2)} <span class="text-sm text-forestPrimary font-sans font-normal">CIC balų</span>`;
    if (medalIconElem) medalIconElem.innerText = medalInfo.icon;
    if (medalBadgeElem) {
        medalBadgeElem.innerText = medalInfo.medal;
        medalBadgeElem.className = `inline-block px-3.5 py-1 rounded-full text-xs font-bold font-oswald tracking-wider border ${medalInfo.colorClass}`;
    }
    if (medalMsgElem) medalMsgElem.innerText = medalInfo.msg;
    if (resultCardElem) resultCardElem.className = `bg-forestSurface border p-6 rounded-2xl text-center space-y-4 shadow-xl transition-all duration-300 ${medalInfo.colorClass.split(' ')[1]}`;

    if (breakdownElem) {
        breakdownElem.innerHTML = res.details.map(d => `
            <div class="flex justify-between items-center text-[11px]">
                <span class="text-forestSecondary">${d.label}:</span>
                <strong class="text-white">${d.score}</strong>
            </div>
        `).join('');
    }
}