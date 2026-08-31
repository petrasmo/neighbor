// js/main.js
import { auth, db } from './firebase.js';
import { loginWithGoogle, logoutUser } from './auth.js';
import { switchTab, showDialog } from './ui.js';
import { initThemeToggle } from './theme.js'; // 👈 PRIDĖTA
import { initFeedTab } from './feed.js';
import { initFieldsTab, refreshFieldsMap } from './fields.js';
import { initReportsTab } from './reportsTab.js';
import { initWeatherTab } from './weather.js';
import { initGarageTab } from './garage.js';
import { initSettingsTab, refreshSettingsMap } from './settings.js';

let currentUser = null;
let userData = null;
let cachedFieldsList = [];
const classifierMap = {};

document.addEventListener('DOMContentLoaded', () => {
    // 🎨 Inicijuojame temų perjungimą
    initThemeToggle();

    document.querySelectorAll('.login-trigger-btn').forEach(btn => btn.addEventListener('click', loginWithGoogle));

    document.querySelectorAll('.nav-tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const tabIdx = parseInt(btn.getAttribute('data-tab'));

            if (!currentUser && (tabIdx === 1 || tabIdx === 2 || tabIdx === 3 || tabIdx === 4)) {
                showDialog(
                    "Reikalingas prisijungimas",
                    "Norėdami valdyti laukus, ataskaitas ar techniką, prisijunkite su savo „Google“ paskyra.",
                    "🔒",
                    loginWithGoogle,
                    true
                );
                return;
            }

            switchTab(tabIdx);

            if (tabIdx === 1) {
                refreshFieldsMap();
            } else if (tabIdx === 4) {
                initReportsTab(cachedFieldsList, userData);
            } else if (tabIdx === 5) {
                initWeatherTab(currentUser, userData);
            } else if (tabIdx === 3) {
                refreshSettingsMap();
            }
        });
    });

    const openHelp = () => {
        showDialog(
            "Kaip naudotis Neighbor P.M. 🚜",
            `<b>1. SOS Skelbimai:</b> Skubios pagalbos paieška laukuose.<br><br>
             <b>2. Agro-Orai:</b> Gyvas purškimo lango šviesoforas ir vėjo greitis.<br><br>
             <b>3. Mano Laukai:</b> Palydovinis žemėlapis, laukai ir darbų registravimas.<br><br>
             <b>4. Ataskaitos:</b> NMA žurnalai PDF ir Excel formatu.<br><br>
             <b>5. Skaičiuoklės:</b> Grūdų kainos, sėjos norma, purkštuvai ir trąšos.`,
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
                    <button id="btn-logout-main" class="w-full py-1.5 mt-2 bg-tractorBg hover:bg-red-950/40 text-slate-300 hover:text-red-400 border border-tractorBorder rounded-lg text-xs font-bold transition">
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
        } else {
            currentUser = null;
            userData = null;
            cachedFieldsList = [];

            if (sidebarAuthBox) {
                sidebarAuthBox.innerHTML = `
                    <p class="text-[11px] text-slate-400">Esate neprisijungęs</p>
                    <button class="login-trigger-btn w-full py-2 bg-tractorPrimary hover:bg-tractorPrimaryHover text-white text-xs font-bold rounded-lg shadow transition">
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
        }

        if (preloader) {
            preloader.classList.add('opacity-0');
            setTimeout(() => preloader.remove(), 300);
        }
    });
});