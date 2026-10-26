// js/main.js
import { auth, db } from './core/firebase.js';
import { openAuthModal, logoutUser } from './core/auth.js';
import { switchTab, showDialog, showBottomToast } from './core/ui.js';
import { initThemeToggle } from './core/theme.js';
import { renderGlobalSidebar } from './core/sidebar.js';

import { initFeedTab } from './bendruomene/feed.js';
import { initFieldsManager, initFieldsTab, refreshFieldsMap } from './ukis/fieldsManager.js';
import { initReportsTab } from './ukis/reportsTab.js';
import { initWeatherTab } from './orai/weather.js';
import { initGarageTab } from './bendruomene/garage.js';
import { initSettingsTab, refreshSettingsMap } from './sistema/settings.js';

// Skaičiuoklių moduliai
import { initGrainTab } from './skaiciuokles/grain.js';
import { renderMatifSection } from './skaiciuokles/matif.js';
import { renderDieselCalculator } from './skaiciuokles/dieselCalculator.js';
import { renderSeedCalculator } from './skaiciuokles/seedCalculator.js';
import { renderCoverCropCalculator } from './skaiciuokles/coverCropCalculator.js';
import { renderCombineLossCalculator } from './skaiciuokles/combineLossCalculator.js';
import { renderSprayerCalculator } from './skaiciuokles/sprayerCalculator.js';
import { renderFertilizerCalculator } from './skaiciuokles/fertilizerCalculator.js';
import { renderStorageCalculator } from './skaiciuokles/storageCalculator.js';
import { renderNmaCalendar } from './skaiciuokles/nmaCalendar.js';
import { renderElectricityCalculator } from './skaiciuokles/electricityCalculator.js';
import { initVraFertilizerTab } from './ukis/vraFertilizer.js';
import { initLimingSoilTab } from './ukis/limingSoil.js';
import { initOperationsJournalTab } from './ukis/operationsJournal.js';
import { initCropPlannerTab } from './ukis/cropPlanner.js';
import { renderTSumRadar } from './ukis/tsumRadar.js';
import { autoRegisterFcmToken } from './core/notifications.js';
import { renderFertilizerBarometer } from './skaiciuokles/fertilizerBarometer.js';
import { initCropLeagueTab } from './bendruomene/cropLeague.js';
import { initEventsTab } from './bendruomene/events.js';

let currentUser = null;
let userData = null;
let cachedFieldsList = [];
const classifierMap = {};

let returnToCalculatorsHub = null;

function formatCleanCtHub(val) {
    if (Math.abs(val) < 0.005) return "0";
    if (Math.abs(val) < 0.1) {
        return parseFloat(val.toFixed(2)).toString().replace('.', ',');
    }
    return parseFloat(val.toFixed(1)).toString().replace('.', ',');
}

document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const requestedTab = parseInt(urlParams.get('tab')) || 0;

    renderGlobalSidebar('index', requestedTab);
    initThemeToggle();

    // 🌟 UŽKRAUNAME GYVAS KAINAS IR LAIKĄ Į PRADINIO EKRANO KORTELES
    loadHubLivePriceTickers();

    document.querySelectorAll('.login-trigger-btn').forEach(btn => btn.addEventListener('click', () => openAuthModal('login')));

    document.querySelectorAll('.nav-tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const tabIdx = parseInt(btn.getAttribute('data-tab'));

            if (!currentUser && ((tabIdx >= 2 && tabIdx <= 6) || tabIdx === 10 || tabIdx === 8 || tabIdx === 9)) {
                showDialog(
                    "Reikalingas prisijungimas",
                    "Norėdami valdyti savo laukus, sėjomainą, tręšimą, ataskaitas ar nustatymus, prisijunkite prie savo ūkio paskyros.",
                    "🔒",
                    () => openAuthModal('login'),
                    true
                );
                return;
            }

            switchTab(tabIdx);

            if (tabIdx === 0 && typeof returnToCalculatorsHub === 'function') {
                returnToCalculatorsHub();
            } else if (tabIdx === 1) {
                initWeatherTab(currentUser, userData);
            } else if (tabIdx === 2) {
                initFieldsManager(currentUser, userData);
                setTimeout(() => refreshFieldsMap(), 150);
            } else if (tabIdx === 10) {
                initCropPlannerTab(currentUser, userData);
            } else if (tabIdx === 3) {
                initVraFertilizerTab(currentUser, userData);
            } else if (tabIdx === 4) {
                initLimingSoilTab(currentUser, userData);
            } else if (tabIdx === 5) {
                initOperationsJournalTab(currentUser, userData);
            } else if (tabIdx === 6) {
                initReportsTab(cachedFieldsList, userData);
            } else if (tabIdx === 7) {
                initFeedTab(currentUser, userData, classifierMap);
            } else if (tabIdx === 8) {
                initGarageTab(currentUser, userData);
            } else if (tabIdx === 9) {
                refreshSettingsMap();
            } else if (tabIdx === 11) {
                initCropLeagueTab(currentUser, userData);
            } else if (tabIdx === 12) {
                initEventsTab(currentUser, userData);
            }
        });
    });

    setupCalculatorsHub();

    const openHelp = () => {
        showDialog(
            "Kaip išnaudoti visą JurgisAgro naudą? 🚜",
            `
            <div class="space-y-4 text-left">
                <div class="p-3.5 bg-tractorPrimary/15 border border-tractorPrimary/40 rounded-xl space-y-1.5">
                    <div class="flex items-center gap-2">
                        <span class="text-base">💡</span>
                        <strong class="text-xs md:text-sm text-green-700 dark:text-tractorPrimaryLight uppercase tracking-wider font-extrabold">
                            Svarbiausias žingsnis: Prisijunkite ir pažymėkite ūkio bazę!
                        </strong>
                    </div>
                    <p class="text-xs leading-relaxed text-slate-700 dark:text-slate-200">
                        Prisijungę prie paskyros ir pažymėję ūkio bazę bei laukus, <b>visos sistemos skaičiuoklės pradeda veikti automatiškai pagal jūsų tikslią vietą ir plotus.</b>
                    </p>
                </div>
            </div>
            `,
            "📖"
        );
    };

    document.getElementById('help-btn-desktop')?.addEventListener('click', openHelp);
    document.getElementById('help-btn-mobile')?.addEventListener('click', openHelp);

    db.collection("tech_classifier").get().then(classSnap => {
        classSnap.forEach(d => {
            const items = d.data().items || [];
            items.forEach(it => { classifierMap[it.id] = it.lt || it.en; });
        });
        initFeedTab(currentUser, userData, classifierMap);
    });

    auth.onAuthStateChanged(async (user) => {
        const preloader = document.getElementById('app-preloader');
        const sidebarAuthBox = document.getElementById('auth-sidebar-box');
        const mobileAuthSlot = document.getElementById('auth-status-mobile');

        try {
            if (user) {
                currentUser = user;
                try {
                    const userDoc = await db.collection("users").doc(user.uid).get();
                    if (userDoc.exists) {
                        userData = userDoc.data();
                    } else {
                        userData = {
                            userId: user.uid,
                            name: user.displayName || user.email.split('@')[0] || "Ūkininkas",
                            email: user.email || "",
                            phone: "+370",
                            ownedTech: [],
                            garageLat: null,
                            garageLon: null,
                            notificationDistance: 50,
                            isSetupComplete: false
                        };
                        await db.collection("users").doc(user.uid).set(userData);
                    }
                } catch (dbErr) {
                    console.warn("Offline arba tinklo klaida nuskaitant vartotoją:", dbErr);
                    userData = { userId: user.uid, name: user.displayName || "Ūkininkas", email: user.email || "", isSetupComplete: true };
                }
				
                autoRegisterFcmToken(currentUser, userData);
				
                if (sidebarAuthBox) {
                    sidebarAuthBox.innerHTML = `
                        <p class="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Prisijungta kaip:</p>
                        <p class="text-xs truncate font-bold mt-0.5" style="color: var(--text-main);">${user.email || user.displayName || 'Ūkininkas'}</p>
                        <button id="btn-logout-main" class="w-full py-2 mt-2 bg-tractorBg hover:bg-red-500/10 text-red-500 dark:text-red-400 border border-tractorBorder hover:border-red-400 rounded-xl text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1.5">
                            <span>🚪</span> <span>Atsijungti</span>
                        </button>
                    `;
                    document.getElementById('btn-logout-main')?.addEventListener('click', logoutUser);
                }

                if (mobileAuthSlot) {
                    mobileAuthSlot.innerHTML = `
                        <button id="btn-logout-mobile" class="px-3 py-1 bg-tractorBg border border-tractorBorder text-xs font-bold text-red-500 rounded-lg">Atsijungti</button>
                    `;
                    document.getElementById('btn-logout-mobile')?.addEventListener('click', logoutUser);
                }

                db.collection("user_fields").where("userId", "==", user.uid).onSnapshot(snap => {
                    cachedFieldsList = [];
                    snap.forEach(d => cachedFieldsList.push(d.data()));
                }, err => console.warn("Laukų klausymosi klaida:", err));

                initFeedTab(currentUser, userData, classifierMap);
                initFieldsManager(currentUser, userData);
                initGarageTab(currentUser, userData);
                initSettingsTab(currentUser, userData);
                initWeatherTab(currentUser, userData);
                initVraFertilizerTab(currentUser, userData);

                const hasValidGarage = userData && userData.isSetupComplete && userData.garageLat && userData.garageLon && userData.garageLat !== 0;

                if (!hasValidGarage) {
                    setTimeout(() => {
                        switchTab(9);
                        refreshSettingsMap();
                        showDialog(
                            "Sveiki atvykę į JurgisAgro! 🚜",
                            "Nurodykite savo <strong>ūkio bazės (garažo) vietą</strong> žemėlapyje žemiau ir paspauskite „Išsaugoti nustatymus“, kad visos skaičiuoklės veiktų tiksliai jūsų kiemui.",
                            "📍"
                        );
                    }, 200);
                } else {
                    switchTab(requestedTab);
                    if (requestedTab === 2) refreshFieldsMap();
                    if (requestedTab === 10) initCropPlannerTab(currentUser, userData);
                    if (requestedTab === 11) initCropLeagueTab(currentUser, userData);
                    if (requestedTab === 12) initEventsTab(currentUser, userData);
                    if (requestedTab === 3) initVraFertilizerTab(currentUser, userData);
                    if (requestedTab === 4) initLimingSoilTab(currentUser, userData);
                    if (requestedTab === 5) initOperationsJournalTab(currentUser, userData);
                    if (requestedTab === 1) initWeatherTab(currentUser, userData);
                    if (requestedTab === 6) initReportsTab(cachedFieldsList, userData);
                }

            } else {
                currentUser = null;
                userData = null;
                cachedFieldsList = [];

                if (sidebarAuthBox) {
                    sidebarAuthBox.innerHTML = `
                        <p class="text-[11px] text-slate-400">Esate neprisijungęs</p>
                        <button class="login-trigger-btn w-full py-2 bg-tractorPrimary hover:bg-tractorPrimaryHover text-white text-xs font-bold rounded-lg shadow transition cursor-pointer">
                            Prisijungti prie ūkio
                        </button>
                    `;
                    sidebarAuthBox.querySelector('.login-trigger-btn')?.addEventListener('click', () => openAuthModal('login'));
                }

                if (mobileAuthSlot) {
                    mobileAuthSlot.innerHTML = `
                        <button class="login-trigger-btn px-3 py-1 bg-tractorPrimary text-white rounded-lg text-xs font-bold">Prisijungti</button>
                    `;
                    mobileAuthSlot.querySelector('.login-trigger-btn')?.addEventListener('click', () => openAuthModal('login'));
                }

                initFeedTab(null, null, classifierMap);
                initWeatherTab(null, null);

                switchTab(requestedTab);
                if (requestedTab === 11) initCropLeagueTab(null, null);
                if (requestedTab === 12) initEventsTab(null, null);
            }
        } catch (globalErr) {
            console.error("Auth klaida:", globalErr);
        } finally {
            if (preloader) {
                preloader.classList.add('opacity-0');
                setTimeout(() => preloader.remove(), 300);
            }
        }
    });
});

// 🌟 100% DINAMINĖS KAINOS TIK IŠ FIRESTORE
function loadHubLivePriceTickers() {
    // 1. Nord Pool Elektra (1 vietoje)
    db.collection("electricity_prices").doc("market_data").onSnapshot(doc => {
        if (!doc.exists) return;
        const d = doc.data();
        const allHours = d.hours || [];
        const el = document.getElementById('hub-live-electricity');
        if (!el || allHours.length === 0) return;

        const now = new Date();
        let todayStr = now.toLocaleDateString('lt-LT', { timeZone: 'Europe/Vilnius', year: 'numeric', month: '2-digit', day: '2-digit' });
        const curH = parseInt(now.toLocaleTimeString('en-GB', { timeZone: 'Europe/Vilnius', hour: '2-digit', hour12: false }), 10);

        // Atrenkame tik pilnas paras (bent 20 valandų)
        const dateCounts = {};
        allHours.forEach(h => { dateCounts[h.date] = (dateCounts[h.date] || 0) + 1; });
        const fullDates = Object.keys(dateCounts).filter(dt => dateCounts[dt] >= 20).sort();

        if (fullDates.length > 0 && !fullDates.includes(todayStr)) {
            todayStr = fullDates[0];
        }

        const todayHours = allHours.filter(h => h.date === todayStr);
        if (todayHours.length === 0) return;

        const nowObj = todayHours.find(h => h.hour === curH) || todayHours[0];
        let minObj = todayHours[0];
        todayHours.forEach(h => {
            if (h.priceCtNoVat < minObj.priceCtNoVat) minObj = h;
        });

        const nowCt = formatCleanCtHub(nowObj.priceCtNoVat);
        const minCt = formatCleanCtHub(minObj.priceCtNoVat);

        let timeStr = "";
        if (d.updatedAt && d.updatedAt.toDate) {
            const dt = d.updatedAt.toDate();
            timeStr = dt.toLocaleString('lt-LT', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
        }

        el.innerHTML = `
            <div class="flex items-center justify-between font-mono font-bold text-white">
                <span>⚡ Dabar: ${nowCt} ct / kWh</span>
                <span class="text-green-600 dark:text-green-400">Min (${minObj.hourLabel}): ${minCt} ct / kWh</span>
            </div>
            <div class="text-[10px] text-green-600 dark:text-green-400 font-semibold flex items-center gap-1.5">
                <span class="w-1.5 h-1.5 rounded-full bg-green-500 animate-ping"></span>
                <span>🕒 Atnaujinta: ${timeStr} (be PVM)</span>
            </div>
        `;
    }, () => {});

    // 2. MATIF birža
    db.collection("matif_prices").doc("market_data").onSnapshot(doc => {
        if (!doc.exists) return;
        const d = doc.data();
        const w = d.crops?.wheat;
        const r = d.crops?.rapeseed;
        const el = document.getElementById('hub-live-matif');
        if (!el || !w || !r || w.currentPrice === undefined || r.currentPrice === undefined) return;

        let timeStr = "";
        if (d.updatedAt && d.updatedAt.toDate) {
            const dt = d.updatedAt.toDate();
            timeStr = dt.toLocaleString('lt-LT', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
        }

        el.innerHTML = `
            <div class="flex items-center justify-between font-mono font-bold text-white">
                <span>🌾 ${Number(w.currentPrice).toFixed(2)} € <span class="${w.isPositive ? 'text-green-500' : 'text-red-500'} text-[10px]">(${w.change || ''})</span></span>
                <span>🌱 ${Number(r.currentPrice).toFixed(2)} € <span class="${r.isPositive ? 'text-green-500' : 'text-red-500'} text-[10px]">(${r.change || ''})</span></span>
            </div>
            <div class="text-[10px] text-green-600 dark:text-green-400 font-semibold flex items-center gap-1.5">
                <span class="w-1.5 h-1.5 rounded-full bg-green-500 animate-ping"></span>
                <span>🕒 Atnaujinta: ${timeStr}</span>
            </div>
        `;
    }, () => {});

    // 3. Elevatoriai (Grūdai)
    db.collection("grain_prices").onSnapshot(snap => {
        if (snap.empty) return;
        let maxWheat = 0;
        let maxRape = 0;
        let latestDate = null;

        snap.forEach(doc => {
            const p = doc.data();
            const w = p.prices?.wheatExtra || p.prices?.wheat2 || 0;
            const r = p.prices?.rapeseed || 0;
            if (w > maxWheat) maxWheat = w;
            if (r > maxRape) maxRape = r;
            if (p.updatedAt && p.updatedAt.toDate) {
                const dt = p.updatedAt.toDate();
                if (!latestDate || dt > latestDate) latestDate = dt;
            }
        });

        const el = document.getElementById('hub-live-grain');
        if (!el || maxWheat === 0) return;

        const timeStr = latestDate 
            ? latestDate.toLocaleString('lt-LT', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
            : "";

        el.innerHTML = `
            <div class="flex items-center justify-between font-mono font-bold text-white">
                <span>🌾 Kviečiai iki ${maxWheat} €/t</span>
                <span>🌱 Rapsai iki ${maxRape} €/t</span>
            </div>
            <div class="text-[10px] text-green-600 dark:text-green-400 font-semibold flex items-center gap-1.5">
                <span class="w-1.5 h-1.5 rounded-full bg-green-500 animate-ping"></span>
                <span>🕒 Atnaujinta: ${timeStr} (${snap.size} elev.)</span>
            </div>
        `;
    }, () => {});

    // 4. Gazolas (Dyzelinas)
    db.collection("diesel_prices").onSnapshot(snap => {
        if (snap.empty) return;
        let minDiesel = Infinity;
        let latestDate = null;

        snap.forEach(doc => {
            const d = doc.data();
            if (d.basePriceNoVat !== undefined) {
                const disc = d.discounts?.tier20k || 0;
                const best = d.basePriceNoVat + disc;
                if (best < minDiesel) minDiesel = best;
            }
            if (d.updatedAt && d.updatedAt.toDate) {
                const dt = d.updatedAt.toDate();
                if (!latestDate || dt > latestDate) latestDate = dt;
            }
        });

        const el = document.getElementById('hub-live-diesel');
        if (!el || minDiesel === Infinity) return;

        const timeStr = latestDate 
            ? latestDate.toLocaleString('lt-LT', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
            : "";

        el.innerHTML = `
            <div class="flex items-center justify-between font-mono font-bold text-white">
                <span>⛽ Didmena nuo ${minDiesel.toFixed(3)} €/l</span>
                <span class="text-[10px] font-sans text-slate-400">(be PVM)</span>
            </div>
            <div class="text-[10px] text-amber-600 dark:text-amber-400 font-semibold flex items-center gap-1.5">
                <span class="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping"></span>
                <span>🕒 Atnaujinta: ${timeStr} (${snap.size} bazės)</span>
            </div>
        `;
    }, () => {});

    // 5. Trąšų barometras
    db.collection("fertilizer_market").doc("barometer_data").onSnapshot(doc => {
        if (!doc.exists) return;
        const d = doc.data();
        const sal = d.indicators?.estimatedSalietra;
        const gas = d.gasTTF?.priceMWh;
        const el = document.getElementById('hub-live-baro');
        if (!el || sal === undefined || gas === undefined) return;

        let timeStr = "";
        if (d.updatedAt && d.updatedAt.toDate) {
            const dt = d.updatedAt.toDate();
            timeStr = dt.toLocaleString('lt-LT', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
        }

        el.innerHTML = `
            <div class="flex items-center justify-between font-mono font-bold text-white">
                <span>🧪 Salietra ~${sal} €/t</span>
                <span>⚡ TTF: ${gas} €/MWh</span>
            </div>
            <div class="text-[10px] text-green-600 dark:text-green-400 font-semibold flex items-center gap-1.5">
                <span class="w-1.5 h-1.5 rounded-full bg-green-500 animate-ping"></span>
                <span>🕒 Atnaujinta: ${timeStr}</span>
            </div>
        `;
    }, () => {});
}

function setupCalculatorsHub() {
    const hubView = document.getElementById('view-calculators-hub');
    const electricityView = document.getElementById('view-tab-electricity-embed');
    const grainView = document.getElementById('view-tab-grain-embed');
    const matifView = document.getElementById('view-tab-matif-embed');
    const dieselView = document.getElementById('view-tab-diesel-embed');
    const seedView = document.getElementById('view-tab-seed-embed');
    const coverView = document.getElementById('view-tab-cover-embed');
    const combineView = document.getElementById('view-tab-combine-embed');
    const sprayView = document.getElementById('view-tab-spray-embed');
    const fertView = document.getElementById('view-tab-fert-embed');
    const barometerView = document.getElementById('view-tab-barometer-embed');
    const storageView = document.getElementById('view-tab-storage-embed');
    const nmaView = document.getElementById('view-tab-nma-embed');

    const openElectricityBtn = document.getElementById('btn-open-electricity-calc');
    const openGrainBtn = document.getElementById('btn-open-grain-calc');
    const openMatifBtn = document.getElementById('btn-open-matif-calc');
    const openDieselBtn = document.getElementById('btn-open-diesel-calc');
    const openSeedBtn = document.getElementById('btn-open-seed-calc');
    const openCoverBtn = document.getElementById('btn-open-cover-calc');
    const openCombineBtn = document.getElementById('btn-open-combine-calc');
    const openSprayBtn = document.getElementById('btn-open-spray-calc');
    const openFertBtn = document.getElementById('btn-open-fert-calc');
    const openStorageBtn = document.getElementById('btn-open-storage-calc');
    const openNmaBtn = document.getElementById('btn-open-nma-calc');
    const openBarometerBtn = document.getElementById('btn-open-barometer-calc');

    const hideAll = () => {
        hubView?.classList.add('hidden');
        electricityView?.classList.add('hidden');
        grainView?.classList.add('hidden');
        matifView?.classList.add('hidden');
        dieselView?.classList.add('hidden');
        seedView?.classList.add('hidden');
        coverView?.classList.add('hidden');
        combineView?.classList.add('hidden');
        sprayView?.classList.add('hidden');
        fertView?.classList.add('hidden');
        storageView?.classList.add('hidden');
        nmaView?.classList.add('hidden');
        barometerView?.classList.add('hidden');
    };

    const returnToHub = () => {
        hideAll();
        hubView?.classList.remove('hidden');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    returnToCalculatorsHub = returnToHub;

    if (openElectricityBtn) openElectricityBtn.onclick = () => {
        hideAll();
        electricityView?.classList.remove('hidden');
        renderElectricityCalculator(document.getElementById('electricity-calc-content'));
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    if (openGrainBtn) openGrainBtn.onclick = () => {
        hideAll();
        grainView?.classList.remove('hidden');
        initGrainTab(currentUser, userData);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    if (openMatifBtn) openMatifBtn.onclick = () => {
        hideAll();
        matifView?.classList.remove('hidden');
        renderMatifSection(document.getElementById('matif-calc-content'));
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    if (openDieselBtn) openDieselBtn.onclick = () => {
        hideAll();
        dieselView?.classList.remove('hidden');
        renderDieselCalculator(document.getElementById('diesel-calc-content'), currentUser, userData);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    if (openSeedBtn) openSeedBtn.onclick = () => {
        hideAll();
        seedView?.classList.remove('hidden');
        renderSeedCalculator(document.getElementById('seed-calc-content'));
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    if (openCoverBtn) openCoverBtn.onclick = () => {
        hideAll();
        coverView?.classList.remove('hidden');
        renderCoverCropCalculator(document.getElementById('cover-calc-content'));
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    if (openCombineBtn) openCombineBtn.onclick = () => {
        hideAll();
        combineView?.classList.remove('hidden');
        renderCombineLossCalculator(document.getElementById('combine-calc-content'));
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    if (openSprayBtn) openSprayBtn.onclick = () => {
        hideAll();
        sprayView?.classList.remove('hidden');
        renderSprayerCalculator(document.getElementById('spray-calc-content'));
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    if (openFertBtn) openFertBtn.onclick = () => {
        hideAll();
        fertView?.classList.remove('hidden');
        renderFertilizerCalculator(document.getElementById('fert-calc-content'));
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    if (openStorageBtn) openStorageBtn.onclick = () => {
        hideAll();
        storageView?.classList.remove('hidden');
        renderStorageCalculator(document.getElementById('storage-calc-content'), currentUser, userData);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    if (openNmaBtn) openNmaBtn.onclick = () => {
        hideAll();
        nmaView?.classList.remove('hidden');
        renderNmaCalendar(document.getElementById('nma-calc-content'));
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    if (openBarometerBtn) openBarometerBtn.onclick = () => {
        hideAll();
        barometerView?.classList.remove('hidden');
        renderFertilizerBarometer(document.getElementById('barometer-calc-content'));
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };
}