// js/bloodTrail.js
import { db, auth } from './firebase.js';
import { isGuestMode, logoutUser } from './auth.js';
import { showDialog } from './ui.js';

let selectedReaction = null;
let selectedBlood = null;
let selectedSigns = new Set();
let timerInterval = null;
let timerSecondsRemaining = 0;

// Ekspertinė medžioklės žinių bazė
const ANIMAL_REACTIONS = [
    { id: "heart_jump", title: "Šuolis į viršų ir spūstis užpakaliu", hint: "Žvėris staigiai pašoko, spyrė užpakalinėmis kojomis ir dideliu greičiu nėrė į tankmę.", icon: "⚡" },
    { id: "hunched_walk", title: "Susikūprinimas (išlenkta nugara)", hint: "Po šūvio žvėris susigūžė, išlenkė nugarą ir lėtai, sunkiai pasitraukė.", icon: "🐾" },
    { id: "instant_drop_getup", title: "Krito vietoje, bet pašoko ir nubėgo", hint: "Po šūvio iškart krito lyg pakirstas, spardėsi, bet po 5–15 sek. pašoko ir dingo.", icon: "💥" },
    { id: "low_dash", title: "Žemas bėgimas nuleista galva", hint: "Bėga žemai prigludęs prie žemės, tarsi nieko nematydamas prieš save.", icon: "🏃" },
    { id: "limping_leg", title: "Šlubavimas / vilktina koja", hint: "Viena koja (priekinė arba užpakalinė) tabaluoja, žvėris sunkiai šlubuoja.", icon: "🦵" }
];

const BLOOD_TYPES = [
    { id: "lung_frothy", title: "Šviesus, rožinis, putotas (su pūslelėmis)", desc: "Kraujas trykšta smulkiais lašeliais ant žolių ir krūmų abiejose pusėse.", color: "bg-red-400 text-black" },
    { id: "liver_dark", title: "Tamsus, vyšninis / juodas, tirštas", desc: "Kraujas tamsus, su kepenų audinių gabalėliais, laša stambiais lašais.", color: "bg-[#4A1515] text-red-200" },
    { id: "heart_artery", title: "Ryškiai raudonas, gausus čiurkšlėmis", desc: "Didelės kraujo dėmės jau pirmame metre, stiprus kraujavimas.", color: "bg-red-600 text-white" },
    { id: "stomach_chyme", title: "Rusvas / žalsvas su maisto dalelėmis", desc: "Kraujo mažai, jaučiamas specifinis aštrus skrandžio/virškinimo kvapas.", color: "bg-[#3D381E] text-yellow-200" },
    { id: "muscle_light", title: "Paviršinis, šviesus, mažėjantis", desc: "Keli lašai šūvio vietoje, toliau pėdsake kraujo greitai mažėja.", color: "bg-red-800 text-white" },
    { id: "no_blood", title: "Kraujo šūvio vietoje beveik nėra", desc: "Rasta tik nukirstų plaukų arba pėdsakų žymės.", color: "bg-forestBackground text-slate-400" }
];

const ADDITIONAL_SIGNS = [
    { id: "bone_splinter", title: "Vamzdelinio kaulo nuolaužos (koja)", icon: "🦴" },
    { id: "rib_bone", title: "Plokščio kaulo fragmentas (šonkaulis)", icon: "🩻" },
    { id: "belly_hair", title: "Ilgi balti plaukai (papilvė / kirkšnis)", icon: "✂️" },
    { id: "dorsal_hair", title: "Tamsūs, stori šeriai (nugaros gūbrys)", icon: "🐗" },
    { id: "meat_bits", title: "Kepenų ar mėsos audinių skaidulos", icon: "🥩" }
];

export function renderBloodTrailScreen(container, onBack) {
    container.innerHTML = `
        <div class="space-y-6 max-w-4xl mx-auto py-2">
            
            <!-- Antraštė -->
            <div class="flex items-center justify-between border-b border-forestBorder pb-3">
                <div class="flex items-center gap-3">
                    <button id="trail-back-btn" class="w-9 h-9 rounded-xl bg-forestSurface border border-forestBorder hover:border-forestPrimary flex items-center justify-center text-white text-sm transition focus:outline-none cursor-pointer">
                        ←
                    </button>
                    <div>
                        <h2 class="text-lg md:text-xl font-bold font-oswald text-white uppercase tracking-wider">Kraujo pėdsako analizatorius</h2>
                        <p class="text-[11px] text-forestPrimary font-bold">Šūvio vietos diagnostika ir paieškos taktika</p>
                    </div>
                </div>
                <button id="save-gps-hit-btn" class="h-9 px-3 bg-forestPrimary hover:bg-green-600 rounded-xl text-xs font-bold text-white flex items-center gap-1.5 transition shadow cursor-pointer">
                    <span>📍</span> <span>Išsaugoti vietą (GPS)</span>
                </button>
            </div>

            <!-- 1 ŽINGSNIS: ŽVĖRIES REAKCIJA -->
            <div class="bg-forestSurface border border-forestBorder p-5 rounded-2xl space-y-3.5 shadow-lg">
                <div class="border-b border-forestBorder pb-2 flex justify-between items-center">
                    <h3 class="text-xs font-bold font-oswald text-white uppercase tracking-wider flex items-center gap-2">
                        <span>1️⃣</span> <span>Žvėries elgesys šūvio metu:</span>
                    </h3>
                    <span class="text-[10px] text-forestSecondary">Pasirinkite vieną</span>
                </div>
                <div class="grid sm:grid-cols-2 gap-2.5">
                    ${ANIMAL_REACTIONS.map(r => `
                        <button class="reaction-btn text-left p-3 rounded-xl border transition flex items-start gap-3 select-none cursor-pointer ${selectedReaction === r.id ? 'bg-forestPrimary/20 border-forestPrimary text-white' : 'bg-forestBackground border-forestBorder text-forestSecondary hover:border-slate-500'}" data-id="${r.id}">
                            <span class="text-2xl shrink-0 mt-0.5">${r.icon}</span>
                            <div class="space-y-0.5">
                                <h4 class="text-xs font-bold text-white">${r.title}</h4>
                                <p class="text-[10px] text-forestSecondary leading-tight">${r.hint}</p>
                            </div>
                        </button>
                    `).join('')}
                </div>
            </div>

            <!-- 2 ŽINGSNIS: KRAUJO POŽYMIAI -->
            <div class="bg-forestSurface border border-forestBorder p-5 rounded-2xl space-y-3.5 shadow-lg">
                <div class="border-b border-forestBorder pb-2 flex justify-between items-center">
                    <h3 class="text-xs font-bold font-oswald text-white uppercase tracking-wider flex items-center gap-2">
                        <span>2️⃣</span> <span>Rasto kraujo (dažų) pobūdis šūvio vietoje:</span>
                    </h3>
                    <span class="text-[10px] text-forestSecondary">Pasirinkite vieną</span>
                </div>
                <div class="grid sm:grid-cols-2 gap-2.5">
                    ${BLOOD_TYPES.map(b => `
                        <button class="blood-btn text-left p-3.5 rounded-xl border transition flex flex-col justify-between select-none cursor-pointer ${selectedBlood === b.id ? 'bg-forestPrimary/25 border-forestPrimary text-white ring-2 ring-forestPrimary' : 'bg-forestBackground border-forestBorder text-forestSecondary hover:border-slate-500'}" data-id="${b.id}">
                            <div class="space-y-1">
                                <div class="flex items-center gap-2">
                                    <span class="w-3.5 h-3.5 rounded-full ${b.color} border shrink-0"></span>
                                    <h4 class="text-xs font-bold text-white">${b.title}</h4>
                                </div>
                                <p class="text-[10px] text-forestSecondary leading-tight">${b.desc}</p>
                            </div>
                        </button>
                    `).join('')}
                </div>
            </div>

            <!-- 3 ŽINGSNIS: PAPILDOMI RADINIAI (PLAUŠAI, KAULAI) -->
            <div class="bg-forestSurface border border-forestBorder p-5 rounded-2xl space-y-3.5 shadow-lg">
                <div class="border-b border-forestBorder pb-2 flex justify-between items-center">
                    <h3 class="text-xs font-bold font-oswald text-white uppercase tracking-wider flex items-center gap-2">
                        <span>3️⃣</span> <span>Papildomi radiniai šūvio vietoje (nebūtina):</span>
                    </h3>
                    <span class="text-[10px] text-forestSecondary">Galima kelis</span>
                </div>
                <div class="flex flex-wrap gap-2">
                    ${ADDITIONAL_SIGNS.map(s => {
                        const isChecked = selectedSigns.has(s.id);
                        return `
                            <button class="sign-btn px-3 py-2 rounded-xl text-xs font-bold border transition flex items-center gap-2 cursor-pointer ${isChecked ? 'bg-forestPrimary text-white border-forestPrimary' : 'bg-forestBackground text-forestSecondary border-forestBorder hover:border-slate-500'}" data-id="${s.id}">
                                <span>${s.icon}</span> <span>${s.title}</span>
                            </button>
                        `;
                    }).join('')}
                </div>
            </div>

            <!-- REZULTATŲ IR TAKTIKOS SKYDELIS -->
            <div id="trail-diagnostic-result" class="space-y-4"></div>

        </div>
    `;

    document.getElementById('trail-back-btn')?.addEventListener('click', () => {
        clearInterval(timerInterval);
        onBack();
    });

    document.getElementById('save-gps-hit-btn')?.addEventListener('click', saveHitGPS);

    setupTrailEventListeners(container, onBack);
    updateDiagnosticResult();
}

function setupTrailEventListeners(container, onBack) {
    document.querySelectorAll('.reaction-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const id = btn.getAttribute('data-id');
            selectedReaction = (selectedReaction === id) ? null : id;
            renderBloodTrailScreen(container, onBack);
        });
    });

    document.querySelectorAll('.blood-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const id = btn.getAttribute('data-id');
            selectedBlood = (selectedBlood === id) ? null : id;
            renderBloodTrailScreen(container, onBack);
        });
    });

    document.querySelectorAll('.sign-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const id = btn.getAttribute('data-id');
            if (selectedSigns.has(id)) {
                selectedSigns.delete(id);
            } else {
                selectedSigns.add(id);
            }
            renderBloodTrailScreen(container, onBack);
        });
    });
}

// DIAGNOSTIKOS IR ANALIZĖS VARIKLIS
function calculateDiagnosis() {
    if (!selectedBlood && !selectedReaction && selectedSigns.size === 0) {
        return null;
    }

    // 1. PLAUČIAI (Lungs)
    if (selectedBlood === "lung_frothy" || (selectedReaction === "low_dash" && selectedBlood !== "stomach_chyme")) {
        return {
            target: "Plaučiai (Double Lung) 🫁",
            certainty: "95% Mirtinas šūvis",
            colorClass: "border-green-500 bg-green-950/30 text-green-400",
            badge: "TIKRA SĖKMĖ",
            waitTimeMinutes: 15,
            waitText: "15–20 minučių",
            distanceEstimate: "Nueis apie 30–80 metrų",
            summary: "Kraujas su oro pūslelėmis rodo plaučių arba trachėjos pažeidimą. Žvėris patiria greitą deguonies trūkumą ir vidinį nukraujavimą.",
            rules: [
                "Palaukite 15 minučių bokštelyje, kad žvėris ramiai užgestų be streso.",
                "Šūvio vietą aiškiai pažymėkite.",
                "Eikite pėdsaku su prožektoriumi – kraujavimas turėtų būti gausus iš abiejų pusių.",
                "Prieikite prie gulinčio žvėries iš nugaros pusės su paruoštu ginklu."
            ]
        };
    }

    // 2. KEPENYS (Liver)
    if (selectedBlood === "liver_dark" || selectedReaction === "hunched_walk") {
        return {
            target: "Kepenys (Liver hit) 🛑",
            certainty: "100% Mirtinas, bet LĖTAS šūvis",
            colorClass: "border-red-600 bg-red-950/40 text-red-400",
            badge: "KRITINIS LAUKIMAS!",
            waitTimeMinutes: 180, // 3 val.
            waitText: "BENT 2–4 VALANDAS!",
            distanceEstimate: "Atsigula už 100–250 metrų",
            summary: "Tamsus, vyšninis kraujas ir susikūprinimas rodo pataikymą į kepenis. Žvėris mirtinai nukraujuos, tačiau procesas trunka kelias valandas.",
            rules: [
                "⚠️ JOKIU BŪDU NEPRADĖKITE EITI DABAR! Tai dažniausia laimikio praradimo klaida.",
                "Pajutęs silpnumą žvėris atsigula į pirmąją tankmę. Jei eisite dabar – jį išbaidysite ir jis nubėgs 3 km!",
                "Tyliai nusileiskite iš bokštelio ir palikite plotus ramybėje 3 valandoms (arba iki ryto).",
                "Po 3 valandų žvėrį rasite užgesusį jo pirmajame guolyje."
            ]
        };
    }

    // 3. VIRŠKINIMO TRAKTAS / PILVAS (Stomach / Guts)
    if (selectedBlood === "stomach_chyme" || selectedSigns.has("belly_hair")) {
        return {
            target: "Pilvas / Žarnynas (Gut shot) 🤢",
            certainty: "Mirtinas, reikalaujantis šuns",
            colorClass: "border-yellow-600 bg-yellow-950/40 text-yellow-400",
            badge: "BŪTINAS ŠUO",
            waitTimeMinutes: 360, // 6 val.
            waitText: "6–8 valandas (geriausia iš ryto)",
            distanceEstimate: "Gali nueiti 300–800 metrų",
            summary: "Rasta žalsva masė, specifinis kvapas arba ilgi pilvo plaukai rodo, kad kulka kliudė virškinamąjį traktą.",
            rules: [
                "Nepersekiokite žvėries naktį be šuns.",
                "Pažymėkite šūvio vietą ir paskutinį pėdsaką.",
                "Susisiekite su pėdsekio šuns vedliu ir pradėkite paiešką iš ryto (praėjus 6–8 val.).",
                "Šernas su tokiu sužeidimu gali būti pavojingas, todėl prie tankmių artėkite itin atsargiai."
            ]
        };
    }

    // 4. ŠIRDIS / STAMBI ARTERIJA
    if (selectedBlood === "heart_artery" || selectedReaction === "heart_jump") {
        return {
            target: "Širdis / Aorta 💥",
            certainty: "Akimirksniu mirtinas",
            colorClass: "border-green-500 bg-green-950/30 text-green-400",
            badge: "GREITA PABAIGA",
            waitTimeMinutes: 10,
            waitText: "10–15 minučių",
            distanceEstimate: "Nukris per 20–50 metrų",
            summary: "Šuolis aukštyn ir gausus šviesus kraujas rodo tiesioginį širdies ar pagrindinės arterijos pažeidimą.",
            rules: [
                "Žvėris bėga aklu mirštančiojo sprintu ir greitai griūva.",
                "Palaukite 10 min. ir ramiai eikite tiesiai link tos vietos, kur dingo žvėris."
            ]
        };
    }

    // 5. KOJOS KAULAS / RAUMUO
    if (selectedSigns.has("bone_splinter") || selectedReaction === "limping_leg" || selectedBlood === "muscle_light") {
        return {
            target: "Koja / Raumeninis sužeidimas 🦴",
            certainty: "Pavojus neatsieti laimikio",
            colorClass: "border-orange-600 bg-orange-950/40 text-orange-400",
            badge: "REIKALINGAS PĖDSEKYS",
            waitTimeMinutes: 45,
            waitText: "30–60 minučių",
            distanceEstimate: "Gali nužingsniuoti didelį atstumą",
            summary: "Vamzdelinio kaulo nuolaužos ir mažėjantis kraujavimas rodo kojos lūžį arba negilų raumeninį sužeidimą.",
            rules: [
                "Žvėris išlaiko gyvybingumą ir gali nueiti didelius atstumus.",
                "Būtina pasitelkti gerą pėdsekį šunį, kuris sustabdytų žvėrį.",
                "Šauliai turi būti pasirengę greitam pakartotiniam šūviui."
            ]
        };
    }

    // 6. STUBURO ATAUGOS
    if (selectedReaction === "instant_drop_getup") {
        return {
            target: "Stuburo ataugų šokas ⚡",
            certainty: "Žvėris gali atsigauti!",
            colorClass: "border-yellow-500 bg-yellow-950/40 text-yellow-300",
            badge: "SKUBUS SEKIMAS",
            waitTimeMinutes: 5,
            waitText: "Nedelsiant (iki 5 min.)",
            distanceEstimate: "Gali visiškai pasveikti ir pabėgti",
            summary: "Kulka praėjo per arti stuburo viršaus, sukeldama laikiną nervinį paralyžių, bet nepažeisdama gyvybinių organų.",
            rules: [
                "Jei žvėris atsistojo ir nubėgo – jis nebėra paralyžiuotas.",
                "Kraujo bus labai mažai.",
                "Reikalinga skubi paieška su šunimi, kol pėdsakas šviežias."
            ]
        };
    }

    return {
        target: "Neaiškus sužeidimas 🔍",
        certainty: "Reikalingas atsargumas",
        colorClass: "border-forestBorder bg-forestSurface text-white",
        badge: "ANALIZUOJAMA",
        waitTimeMinutes: 30,
        waitText: "Bent 30–45 minutes",
        distanceEstimate: "Priklauso nuo pėdsako",
        summary: "Pagal pažymėtus požymius rekomenduojama neskubėti ir atidžiai ištirti šūvio vietą.",
        rules: [
            "Apžiūrėkite šūvio vietą 10 metrų spinduliu.",
            "Ieškokite nukirstų plaukų, kaulų ar kraujo lašų ant žolės stiebų.",
            "Jei kyla abejonių – visada palaukite ilgiau."
        ]
    };
}

function updateDiagnosticResult() {
    const container = document.getElementById('trail-diagnostic-result');
    if (!container) return;

    const diag = calculateDiagnosis();

    if (!diag) {
        container.innerHTML = `
            <div class="bg-forestSurface border border-forestBorder p-6 rounded-2xl text-center space-y-2">
                <span class="text-3xl block">🎯</span>
                <h4 class="text-sm font-bold text-white font-oswald uppercase">Pasirinkite požymius viršuje</h4>
                <p class="text-xs text-forestSecondary max-w-sm mx-auto">Pažymėkite bent vieną žvėries elgesio arba rasto kraujo požymį, kad sistema sugeneruotų taktinį planą.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = `
        <div class="bg-forestSurface border ${diag.colorClass.split(' ')[0]} p-6 rounded-2xl space-y-5 shadow-2xl animate-fadeIn">
            
            <!-- Rezultato viršus -->
            <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-forestBorder/80 pb-4">
                <div>
                    <span class="text-[10px] uppercase font-bold tracking-widest text-forestSecondary block">Diagnozė:</span>
                    <h3 class="text-xl font-extrabold font-oswald text-white uppercase">${diag.target}</h3>
                    <p class="text-xs text-forestSecondary font-medium">${diag.summary}</p>
                </div>
                <div class="px-3.5 py-1.5 rounded-xl border text-xs font-extrabold font-oswald tracking-wider shrink-0 ${diag.colorClass}">
                    ${diag.badge}
                </div>
            </div>

            <!-- 2 Kortelės: Laukimo laikas ir atstumas -->
            <div class="grid grid-cols-2 gap-3">
                <div class="bg-forestBackground p-4 rounded-xl border border-forestBorder space-y-1">
                    <span class="text-[10px] text-forestSecondary font-bold uppercase tracking-wider block">⏱️ Kiek laukti prieš paiešką:</span>
                    <strong class="text-base sm:text-lg font-black text-white font-oswald block">${diag.waitText}</strong>
                </div>
                <div class="bg-forestBackground p-4 rounded-xl border border-forestBorder space-y-1">
                    <span class="text-[10px] text-forestSecondary font-bold uppercase tracking-wider block">📏 Tikėtinas atstumas:</span>
                    <strong class="text-base sm:text-lg font-black text-forestPrimary font-oswald block">${diag.distanceEstimate}</strong>
                </div>
            </div>

            <!-- Integruotas ramybės laikmatis (Countdown Timer) -->
            <div class="bg-forestBackground border border-forestBorder p-4 rounded-xl space-y-3">
                <div class="flex justify-between items-center">
                    <span class="text-xs font-bold text-white flex items-center gap-1.5">
                        <span>⏳</span> <span>Ramybės laikmatis miške:</span>
                    </span>
                    <span id="timer-display-digits" class="text-lg font-black font-oswald text-yellow-400">00:00:00</span>
                </div>
                
                <div class="flex gap-2">
                    <button id="start-wait-timer-btn" class="flex-1 h-10 bg-buttonBrown hover:bg-buttonBrownHover text-white font-bold rounded-xl text-xs uppercase tracking-wider transition shadow cursor-pointer">
                        Pradėti laukimą (${diag.waitTimeMinutes} min.) ▶
                    </button>
                    <button id="reset-wait-timer-btn" class="h-10 px-4 bg-forestSurface border border-forestBorder text-forestSecondary hover:text-white font-bold rounded-xl text-xs transition hidden cursor-pointer">
                        Atstatyti ↺
                    </button>
                </div>
            </div>

            <!-- Taktinis veiksmų protokolas -->
            <div class="space-y-2.5 pt-1">
                <h4 class="text-xs font-bold text-white uppercase font-oswald tracking-wider flex items-center gap-1.5">
                    <span>📋</span> <span>Taktinis veiksmų planas medžiotojui:</span>
                </h4>
                <ul class="space-y-2 text-xs text-forestSecondary">
                    ${diag.rules.map(r => `
                        <li class="flex items-start gap-2 bg-forestBackground/60 p-2.5 rounded-xl border border-forestBorder/60">
                            <span class="text-forestPrimary font-bold">✓</span>
                            <span class="leading-relaxed text-slate-300">${r}</span>
                        </li>
                    `).join('')}
                </ul>
            </div>

        </div>
    `;

    document.getElementById('start-wait-timer-btn')?.addEventListener('click', () => {
        startWaitTimer(diag.waitTimeMinutes * 60);
    });

    document.getElementById('reset-wait-timer-btn')?.addEventListener('click', () => {
        clearInterval(timerInterval);
        timerInterval = null;
        const display = document.getElementById('timer-display-digits');
        if (display) display.innerText = "00:00:00";
        document.getElementById('reset-wait-timer-btn')?.classList.add('hidden');
        const startBtn = document.getElementById('start-wait-timer-btn');
        if (startBtn) startBtn.innerText = `Pradėti laukimą (${diag.waitTimeMinutes} min.) ▶`;
    });
}

function startWaitTimer(totalSeconds) {
    clearInterval(timerInterval);
    timerSecondsRemaining = totalSeconds;

    const display = document.getElementById('timer-display-digits');
    const startBtn = document.getElementById('start-wait-timer-btn');
    const resetBtn = document.getElementById('reset-wait-timer-btn');

    if (resetBtn) resetBtn.classList.remove('hidden');
    if (startBtn) startBtn.innerText = "Laukiama... ⏳";

    const updateDisplay = () => {
        const hours = Math.floor(timerSecondsRemaining / 3600);
        const mins = Math.floor((timerSecondsRemaining % 3600) / 60);
        const secs = timerSecondsRemaining % 60;
        if (display) {
            display.innerText = `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
        }
    };

    updateDisplay();

    timerInterval = setInterval(() => {
        if (timerSecondsRemaining > 0) {
            timerSecondsRemaining--;
            updateDisplay();
        } else {
            clearInterval(timerInterval);
            timerInterval = null;
            if (display) display.innerText = "LAIKAS PRADĖTI PAIEŠKĄ! 🎯";
            if (navigator.vibrate) navigator.vibrate([200, 100, 200, 100, 500]);
            alert("Ramybės laikas baigėsi! Galite pradėti sužeisto žvėries paiešką.");
        }
    }, 1000);
}

// ŠŪVIO VIETOS IŠSAUGOJIMAS Į FIRESTORE (TIK PRISIJUNGUSIEMS)
async function saveHitGPS() {
    const user = auth.currentUser;
    const isGuest = isGuestMode() || !user;

    // Jei svečias – prašome prisijungti
    if (isGuest) {
        showDialog(
            "Reikalingas prisijungimas 📍",
            "Norėdami išsaugoti šūvio vietą ir pėdsako koordinates savo privačiame medžioklės žemėlapyje, prašome prisijungti prie savo paskyros.",
            "👤",
            () => logoutUser(),
            () => {}
        );
        return;
    }

    if (!("geolocation" in navigator)) {
        showDialog("GPS klaida", "Jūsų įrenginys nepalaiko GPS vietos nustatymo.", "⚠️");
        return;
    }

    showDialog("Ieškoma GPS...", "Nustatomos tikslios jūsų buvimo vietos koordinatės miške...", "⏳");

    navigator.geolocation.getCurrentPosition(async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const diag = calculateDiagnosis();
        const timeStr = new Date().toLocaleTimeString('lt-LT', { hour: '2-digit', minute: '2-digit' });

        const spotData = {
            type: "sighting",
            title: `🩸 Šūvio vieta (${timeStr})`,
            notes: diag ? `Diagnozė: ${diag.target}. ${diag.summary}` : "Pažymėta šūvio vieta kraujo pėdsako paieškai.",
            latitude: lat,
            longitude: lng,
            createdAt: Date.now()
        };

        try {
            await db.collection("users").doc(user.uid).collection("hunting_spots").add(spotData);
            showDialog(
                "Šūvio vieta išsaugota! 📍",
                `Koordinatės (${lat.toFixed(5)}, ${lng.toFixed(5)}) sėkmingai įrašytos į jūsų privatų žemėlapį „Mano medžioklės plotai“.`,
                "✅"
            );
        } catch (e) {
            console.error("Klaida saugant tašką:", e);
            showDialog("Klaida", "Nepavyko išsaugoti taško duomenų bazėje.", "🛑");
        }
    }, (err) => {
        showDialog("GPS klaida", "Nepavyko nustatyti GPS vietos. Įsitikinkite, kad telefone įjungta vietos nustatymo funkcija.", "🛑");
    }, { enableHighAccuracy: true });
}