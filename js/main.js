// js/main.js
import { auth, db } from './core/firebase.js';
import { openAuthModal, logoutUser } from './core/auth.js';
import { switchTab, showDialog } from './core/ui.js';
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
import { initVraFertilizerTab } from './ukis/vraFertilizer.js';
import { initLimingSoilTab } from './ukis/limingSoil.js';
import { initOperationsJournalTab } from './ukis/operationsJournal.js';

let currentUser = null;
let userData = null;
let cachedFieldsList = [];
const classifierMap = {};

document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const requestedTab = parseInt(urlParams.get('tab')) || 0;

    renderGlobalSidebar('index', requestedTab);
    initThemeToggle();

    document.querySelectorAll('.login-trigger-btn').forEach(btn => btn.addEventListener('click', () => openAuthModal('login')));

    // Navigacija su naujais 10 tab indeksų
    document.querySelectorAll('.nav-tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const tabIdx = parseInt(btn.getAttribute('data-tab'));

            if (!currentUser && (tabIdx >= 2 && tabIdx <= 6 || tabIdx === 8 || tabIdx === 9)) {
                showDialog(
                    "Reikalingas prisijungimas",
                    "Norėdami valdyti savo laukus, tręšimą, ataskaitas ar nustatymus, prisijunkite prie savo ūkio paskyros.",
                    "🔒",
                    () => openAuthModal('login'),
                    true
                );
                return;
            }

            switchTab(tabIdx);

            if (tabIdx === 1) {
                initWeatherTab(currentUser, userData);
            } else if (tabIdx === 2) {
                initFieldsManager(currentUser, userData);
                setTimeout(() => refreshFieldsMap(), 150);
            } else if (tabIdx === 3) {
                initVraFertilizerTab(currentUser, userData); // 👈 VRA Tręšimo centras
            } else if (tabIdx === 4) {
                initLimingSoilTab(currentUser, userData); // 👈 🍋 VRA Kalkinimo centras!
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

        if (user) {
            currentUser = user;
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
            });

            initFeedTab(currentUser, userData, classifierMap);
            initFieldsManager(currentUser, userData);
            initGarageTab(currentUser, userData);
            initSettingsTab(currentUser, userData);
            initWeatherTab(currentUser, userData);
            initVraFertilizerTab(currentUser, userData);

            const hasValidGarage = userData && userData.isSetupComplete && userData.garageLat && userData.garageLon && userData.garageLat !== 0;

            if (!hasValidGarage) {
                setTimeout(() => {
                    switchTab(9); // Nustatymai
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
                if (requestedTab === 3) initVraFertilizerTab(currentUser, userData);
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
        }

        if (preloader) {
            preloader.classList.add('opacity-0');
            setTimeout(() => preloader.remove(), 300);
        }
    });
});

function setupCalculatorsHub() {
    const hubView = document.getElementById('view-calculators-hub');
    const grainView = document.getElementById('view-tab-grain-embed');
    const matifView = document.getElementById('view-tab-matif-embed');
    const dieselView = document.getElementById('view-tab-diesel-embed');
    const seedView = document.getElementById('view-tab-seed-embed');
    const coverView = document.getElementById('view-tab-cover-embed');
    const combineView = document.getElementById('view-tab-combine-embed');
    const sprayView = document.getElementById('view-tab-spray-embed');
    const fertView = document.getElementById('view-tab-fert-embed');
    const storageView = document.getElementById('view-tab-storage-embed');
    const nmaView = document.getElementById('view-tab-nma-embed');

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

    const backFromGrainBtn = document.getElementById('btn-back-from-grain');
    const backFromMatifBtn = document.getElementById('btn-back-from-matif');
    const backFromDieselBtn = document.getElementById('btn-back-from-diesel');
    const backFromSeedBtn = document.getElementById('btn-back-from-seed');
    const backFromCoverBtn = document.getElementById('btn-back-from-cover');
    const backFromCombineBtn = document.getElementById('btn-back-from-combine');
    const backFromSprayBtn = document.getElementById('btn-back-from-spray');
    const backFromFertBtn = document.getElementById('btn-back-from-fert');
    const backFromStorageBtn = document.getElementById('btn-back-from-storage');
    const backFromNmaBtn = document.getElementById('btn-back-from-nma');

    const hideAll = () => {
        hubView?.classList.add('hidden');
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
        renderStorageCalculator(document.getElementById('storage-calc-content'));
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    if (openNmaBtn) openNmaBtn.onclick = () => {
        hideAll();
        nmaView?.classList.remove('hidden');
        renderNmaCalendar(document.getElementById('nma-calc-content'));
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const returnToHub = () => {
        hideAll();
        hubView?.classList.remove('hidden');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    if (backFromGrainBtn) backFromGrainBtn.onclick = returnToHub;
    if (backFromMatifBtn) backFromMatifBtn.onclick = returnToHub;
    if (backFromDieselBtn) backFromDieselBtn.onclick = returnToHub;
    if (backFromSeedBtn) backFromSeedBtn.onclick = returnToHub;
    if (backFromCoverBtn) backFromCoverBtn.onclick = returnToHub;
    if (backFromCombineBtn) backFromCombineBtn.onclick = returnToHub;
    if (backFromSprayBtn) backFromSprayBtn.onclick = returnToHub;
    if (backFromFertBtn) backFromFertBtn.onclick = returnToHub;
    if (backFromStorageBtn) backFromStorageBtn.onclick = returnToHub;
    if (backFromNmaBtn) backFromNmaBtn.onclick = returnToHub;
}