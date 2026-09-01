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
import { renderSeedCalculator } from './seedCalculator.js';
import { renderSprayerCalculator } from './sprayerCalculator.js';
import { renderFertilizerCalculator } from './fertilizerCalculator.js';

let currentUser = null;
let userData = null;
let cachedFieldsList = [];
const classifierMap = {};

document.addEventListener('DOMContentLoaded', () => {
    // Patikriname ar URL yra parametras ?tab=X (Pagal nutylėjimą: 0 - Skaičiuoklės)
    const urlParams = new URLSearchParams(window.location.search);
    const requestedTab = parseInt(urlParams.get('tab')) || 0;

    renderGlobalSidebar('index', requestedTab);
    initThemeToggle();

    document.querySelectorAll('.login-trigger-btn').forEach(btn => btn.addEventListener('click', loginWithGoogle));

    // Navigacija
    document.querySelectorAll('.nav-tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const tabIdx = parseInt(btn.getAttribute('data-tab'));

            // Apsauga neprisijungusiems (Laukai: 2, Ataskaitos: 3, Technika: 4, Nustatymai: 6)
            // Skaičiuoklės (0), Orai (1) ir Skelbimai (5) yra ATVIRI VISIEMS!
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
                // Skaičiuoklių centras
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

    // Inicijuojame Skaičiuoklių Hubo mygtukus
    setupCalculatorsHub();

    const openHelp = () => {
        showDialog(
            "Kaip naudotis JurgisAgro.com 🚜",
            `<b>1. Skaičiuoklės:</b> Grūdų kainos, sėjos normos, purkštuvai ir trąšos vienoje vietoje.<br><br>
             <b>2. Agro-Orai:</b> Gyvas purškimo lango šviesoforas ir vėjo greitis.<br><br>
             <b>3. Mano Laukai:</b> Palydovinis žemėlapis, laukai ir darbų registravimas.<br><br>
             <b>4. Ataskaitos:</b> NMA žurnalai PDF ir Excel formatu.<br><br>
             <b>5. SOS Skelbimai:</b> Skubios technikos pagalbos paieška tarp kaimynų.`,
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
                    <p class="text-[10px] text-slate-500 uppercase font-bold">Prisijungta kaip:</p>
                    <p class="text-xs text-white truncate font-medium">${user.email}</p>
                    <button id="btn-logout-main" class="w-full py-1.5 mt-2 bg-tractorBg hover:bg-red-950/40 text-slate-300 hover:text-red-400 border border-tractorBorder rounded-lg text-xs font-bold transition cursor-pointer">
                        🚪 Atsijungti
                    </button>
                `;
                document.getElementById('btn-logout-main')?.addEventListener('click', logoutUser);
            }

            if (mobileAuthSlot) {
                mobileAuthSlot.innerHTML = `
                    <button id="btn-logout-mobile" class="px-3 py-1 bg-tractorBg border border-tractorBorder text-xs font-bold text-slate-300 rounded-lg">Atsijungti</button>
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
    const seedView = document.getElementById('view-tab-seed-embed');
    const sprayView = document.getElementById('view-tab-spray-embed');
    const fertView = document.getElementById('view-tab-fert-embed');

    const openGrainBtn = document.getElementById('btn-open-grain-calc');
    const openSeedBtn = document.getElementById('btn-open-seed-calc');
    const openSprayBtn = document.getElementById('btn-open-spray-calc');
    const openFertBtn = document.getElementById('btn-open-fert-calc');

    const backFromGrainBtn = document.getElementById('btn-back-from-grain');
    const backFromSeedBtn = document.getElementById('btn-back-from-seed');
    const backFromSprayBtn = document.getElementById('btn-back-from-spray');
    const backFromFertBtn = document.getElementById('btn-back-from-fert');

    const hideAll = () => {
        hubView?.classList.add('hidden');
        grainView?.classList.add('hidden');
        seedView?.classList.add('hidden');
        sprayView?.classList.add('hidden');
        fertView?.classList.add('hidden');
    };

    if (openGrainBtn) openGrainBtn.onclick = () => {
        hideAll();
        grainView?.classList.remove('hidden');
        initGrainTab(currentUser, userData);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    if (openSeedBtn) openSeedBtn.onclick = () => {
        hideAll();
        seedView?.classList.remove('hidden');
        renderSeedCalculator(document.getElementById('seed-calc-content'));
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
    if (backFromSeedBtn) backFromSeedBtn.onclick = returnToHub;
    if (backFromSprayBtn) backFromSprayBtn.onclick = returnToHub;
    if (backFromFertBtn) backFromFertBtn.onclick = returnToHub;
}