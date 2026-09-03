// js/main.js
import { auth, db } from './firebase.js';
import { loginWithGoogle, logoutUser } from './auth.js';
import { switchTab, showDialog } from './ui.js';
import { initThemeToggle } from './theme.js';
import { renderGlobalSidebar } from './sidebar.js';
import { initFeedTab } from './feed.js';
import { initFieldsTab, refreshFieldsMap } from './fields.js';
import { initReportsTab } from './reportsTab.js';
import { initWeatherTab } from './weather.js';
import { initGarageTab } from './garage.js';
import { initSettingsTab, refreshSettingsMap } from './settings.js';

// Skaičiuoklių moduliai
import { initGrainTab } from './grain.js';
import { renderMatifSection } from './matif.js';
import { renderDieselCalculator } from './dieselCalculator.js';
import { renderSeedCalculator } from './seedCalculator.js';
import { renderCoverCropCalculator } from './coverCropCalculator.js';
import { renderCombineLossCalculator } from './combineLossCalculator.js';
import { renderSprayerCalculator } from './sprayerCalculator.js';
import { renderFertilizerCalculator } from './fertilizerCalculator.js';

let currentUser = null;
let userData = null;
let cachedFieldsList = [];
const classifierMap = {};

document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const requestedTab = parseInt(urlParams.get('tab')) || 0;

    renderGlobalSidebar('index', requestedTab);
    initThemeToggle();

    document.querySelectorAll('.login-trigger-btn').forEach(btn => btn.addEventListener('click', loginWithGoogle));

    document.querySelectorAll('.nav-tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const tabIdx = parseInt(btn.getAttribute('data-tab'));

            if (!currentUser && (tabIdx === 2 || tabIdx === 3 || tabIdx === 4 || tabIdx === 6)) {
                showDialog(
                    "Reikalingas prisijungimas",
                    "Norėdami valdyti savo laukus, ataskaitas ar nustatymus, prisijunkite su savo „Google“ paskyra.",
                    "🔒",
                    loginWithGoogle,
                    true
                );
                return;
            }

            switchTab(tabIdx);

            if (tabIdx === 0) {
                // Skaičiuoklės
            } else if (tabIdx === 1) {
                initWeatherTab(currentUser, userData);
            } else if (tabIdx === 2) {
                refreshFieldsMap();
            } else if (tabIdx === 3) {
                initReportsTab(cachedFieldsList, userData);
            } else if (tabIdx === 6) {
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
                            Svarbiausias žingsnis: Prisijunkite ir pažymėkite laukus!
                        </strong>
                    </div>
                    <p class="text-xs leading-relaxed text-slate-700 dark:text-slate-200">
                        Prisijungę su „Google“ ir palydoviniame žemėlapyje apibrėžę savo laukus bei ūkio bazę, <b>visos sistemos skaičiuoklės pradeda veikti automatiškai pagal jūsų tikslią vietą ir sklypų plotus.</b>
                    </p>
                </div>

                <div class="space-y-2.5 text-xs md:text-sm">
                    <div class="p-2.5 bg-tractorBg rounded-xl border border-tractorBorder space-y-1">
                        <div class="font-bold flex items-center gap-1.5" style="color: var(--text-main);">
                            <span>🌾</span> <span>1. Grūdų, MATIF ir Gazolio analizė</span>
                        </div>
                        <p class="text-slate-600 dark:text-slate-300 text-xs">
                            Palyginkite visų Lietuvos elevatorių pelningumą, stebėkite MATIF biržą ir sužinokite, kas pigiausiai atveš žymėtą dyzeliną į jūsų kiemą.
                        </p>
                    </div>

                    <div class="p-2.5 bg-tractorBg rounded-xl border border-tractorBorder space-y-1">
                        <div class="font-bold flex items-center gap-1.5" style="color: var(--text-main);">
                            <span>🌦️</span> <span>2. Agro-Orai ir Purškimo šviesoforas</span>
                        </div>
                        <p class="text-slate-600 dark:text-slate-300 text-xs">
                            Orų prognozė, vėjo greitis 2m aukštyje ir lietaus rizika tikrinami konkrečioms jūsų pasirinkto sklypo GPS koordinatėms.
                        </p>
                    </div>

                    <div class="p-2.5 bg-tractorBg rounded-xl border border-tractorBorder space-y-1">
                        <div class="font-bold flex items-center gap-1.5" style="color: var(--text-main);">
                            <span>🗺️</span> <span>3. Mano Laukai ir Darbų žurnalas</span>
                        </div>
                        <p class="text-slate-600 dark:text-slate-300 text-xs">
                            Apveskite laukus palydove, registruokite sėją, purškimą, trąšas ir derlių. Programa skaičiuoja kiekvieno lauko pajamas, išlaidas ir savikainą.
                        </p>
                    </div>

                    <div class="p-2.5 bg-tractorBg rounded-xl border border-tractorBorder space-y-1">
                        <div class="font-bold flex items-center gap-1.5" style="color: var(--text-main);">
                            <span>📄</span> <span>4. Oficialios NMA / ŽŪM ataskaitos</span>
                        </div>
                        <p class="text-slate-600 dark:text-slate-300 text-xs">
                            Pagal jūsų įvestus darbus vienu paspaudimu sugeneruojami oficialios formos Augalų apsaugos ir Trąšų apskaitos žurnalai PDF arba Excel formatu.
                        </p>
                    </div>
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
                    name: user.displayName || "Ūkininkas",
                    email: user.email || "",
                    phone: "+370",
                    ownedTech: [],
                    garageLat: 54.8985,
                    garageLon: 23.9036,
                    notificationDistance: 50,
                    isSetupComplete: false
                };
                await db.collection("users").doc(user.uid).set(userData);
            }

            if (sidebarAuthBox) {
                sidebarAuthBox.innerHTML = `
                    <p class="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Prisijungta kaip:</p>
                    <p class="text-xs truncate font-bold mt-0.5" style="color: var(--text-main);">${user.email}</p>
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
            initFieldsTab(currentUser, userData);
            initGarageTab(currentUser, userData);
            initSettingsTab(currentUser, userData);
            initWeatherTab(currentUser, userData);

            switchTab(requestedTab);
            if (requestedTab === 2) refreshFieldsMap();
            if (requestedTab === 1) initWeatherTab(currentUser, userData);
            if (requestedTab === 3) initReportsTab(cachedFieldsList, userData);
        } else {
            currentUser = null;
            userData = null;
            cachedFieldsList = [];

            if (sidebarAuthBox) {
                sidebarAuthBox.innerHTML = `
                    <p class="text-[11px] text-slate-400">Esate neprisijungęs</p>
                    <button class="login-trigger-btn w-full py-2 bg-tractorPrimary hover:bg-tractorPrimaryHover text-white text-xs font-bold rounded-lg shadow transition cursor-pointer">
                        Prisijungti su Google
                    </button>
                `;
                sidebarAuthBox.querySelector('.login-trigger-btn')?.addEventListener('click', loginWithGoogle);
            }

            if (mobileAuthSlot) {
                mobileAuthSlot.innerHTML = `
                    <button class="login-trigger-btn px-3 py-1 bg-tractorPrimary text-white rounded-lg text-xs font-bold">Prisijungti</button>
                `;
                mobileAuthSlot.querySelector('.login-trigger-btn')?.addEventListener('click', loginWithGoogle);
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

    const openGrainBtn = document.getElementById('btn-open-grain-calc');
    const openMatifBtn = document.getElementById('btn-open-matif-calc');
    const openDieselBtn = document.getElementById('btn-open-diesel-calc');
    const openSeedBtn = document.getElementById('btn-open-seed-calc');
    const openCoverBtn = document.getElementById('btn-open-cover-calc');
    const openCombineBtn = document.getElementById('btn-open-combine-calc');
    const openSprayBtn = document.getElementById('btn-open-spray-calc');
    const openFertBtn = document.getElementById('btn-open-fert-calc');

    const backFromGrainBtn = document.getElementById('btn-back-from-grain');
    const backFromMatifBtn = document.getElementById('btn-back-from-matif');
    const backFromDieselBtn = document.getElementById('btn-back-from-diesel');
    const backFromSeedBtn = document.getElementById('btn-back-from-seed');
    const backFromCoverBtn = document.getElementById('btn-back-from-cover');
    const backFromCombineBtn = document.getElementById('btn-back-from-combine');
    const backFromSprayBtn = document.getElementById('btn-back-from-spray');
    const backFromFertBtn = document.getElementById('btn-back-from-fert');

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
}