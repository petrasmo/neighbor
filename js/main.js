// js/main.js
import { auth, db } from './core/firebase.js';
import { openAuthModal, logoutUser } from './core/auth.js';
import { switchTab, showDialog, showBottomToast, getRequestedTabFromUrl, updateSeoMetaTags, getActiveCalcSlugFromUrl } from './core/ui.js';
import { initThemeToggle } from './core/theme.js';
import { initLanguageEngine } from './core/i18n.js';
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
import { initSmartDevicesTab } from './ukis/smartDevices.js';
import { renderTSumRadar } from './ukis/tsumRadar.js';
import { autoRegisterFcmToken } from './core/notifications.js';
import { renderFertilizerBarometer } from './skaiciuokles/fertilizerBarometer.js';
import { initCropLeagueTab } from './bendruomene/cropLeague.js';
import { initEventsTab } from './bendruomene/events.js';
import { initTractorsTab } from './traktoriai/tractorsTab.js';

let currentUser = null;
let userData = null;
let cachedFieldsList = [];
const classifierMap = {};

let returnToCalculatorsHub = null;

// 🌟 SKAIČIUOKLIŲ ŽODINIAI ADRESAI (SLUGS) IR PILNAS SEO (SU CANONICAL!)
const CALC_SEO_MAP = {
    'nordpool-kainos': {
        title: "Nord Pool Elektros Kainos Pavalandžiui Lietuvoje | JurgisAgro",
        desc: "Gyvos Nord Pool elektros biržos kainos šiandien ir rytoj pavalandžiui. Sužinokite pigiausias valandas technikai ir šilumos siurbliams."
    },
    'matif-birza': {
        title: "Euronext MATIF Paryžiaus Grūdų ir Rapsų Birža Gyvai | JurgisAgro",
        desc: "Tiesioginės Euronext MATIF kviečių, rapsų ir kukurūzų biržos kainos, ateities sandoriai ir grafikai realiu laiku."
    },
    'grain-supirkimas': {
        title: "Lietuvos Elevatorių Grūdų Supirkimo Kainos ir Logistika | JurgisAgro",
        desc: "Kur labiausiai apsimoka vežti derlių: elevatorių kainų palyginimas, džiovinimo nuoskaitos ir transporto kaštai nuo jūsų ūkio."
    },
    'dyzelinas-gazolas': {
        title: "Žymėto Dyzelino (Gazolio) Užsakymas ir 53 Kuro Bazės | JurgisAgro",
        desc: "Didmeninė žymėto dyzelino kaina ūkininkams iš 53 Lietuvos kuro bazių pagal oficialią ORLEN Lietuva bazę su pristatymu į ūkį."
    },
    'grudu-sandelis': {
        title: "Grūdų Sandėlis, Ventiliavimas (EMC) ir Ekonomika | JurgisAgro",
        desc: "Parduoti ar laikyti? Grūdų saugojimo savikainos skaičiuoklė bei protingas ventiliavimas pagal ASABE Chung-Pfost formulę."
    },
    'nma-terminai': {
        title: "NMA Terminai, Draudimai ir GAAB Reikalavimai | JurgisAgro",
        desc: "Oficialūs NMA terminai: mėšlo ir srutų skleidimo draudimai, posėlių išlaikymo datos ir sankcijų prevencija ūkininkams."
    },
    'sejos-norma': {
        title: "Tiksli Sėjos Normos (MTG) Skaičiuoklė Ūkiui | JurgisAgro",
        desc: "Apskaičiuokite tikslų kg/ha sėklų poreikį pagal 1000 grūdų masę (MTG), daigumą ir švarumą. Didmaišių kiekis ir kaina."
    },
    'tarpiniai-paseliai': {
        title: "Tarpinių Pasėlių (Posėlių) Mišinių Skaičiuoklė | JurgisAgro",
        desc: "Sudarykite NMA ekoschemas atitinkančius 2–5 augalų posėlių mišinius, normos kg/ha ir sėklų receptas."
    },
    'kombaino-nuostoliai': {
        title: "Kombaino Kūlimo Nuostolių Skaičiuoklė | JurgisAgro",
        desc: "Kombaino kontrolės įrankis: pagal rastų grūdų skaičių padėkle sužinokite kūlimo nuostolius kg/ha, procentais ir eurais."
    },
    'purkstuvas': {
        title: "Purkštuvo Bako Tirpalo Maišymo Skaičiuoklė | JurgisAgro",
        desc: "Tikslios chemijos ir trąšų dozės pilnam ir nepilnam purkštuvo bakui. Apsaugokite pasėlius nuo perdozavimo."
    },
    'trasu-skaiciuokle': {
        title: "Trąšų N-P-K ir Azoto Savikainos Skaičiuoklė | JurgisAgro",
        desc: "Fizinė salietros, KAS-32 ir NPK trąšų norma kg/ha pagal gryną maisto medžiagų poreikį bei 1 kg azoto savikaina."
    },
    'trasu-barometras': {
        title: "Trąšų Rinkos Radaras ir Kainų Barometras | JurgisAgro",
        desc: "Olandijos TTF gamtinių dujų birža, EUR/USD kursas ir karbamido indeksai: sužinokite, kada palankiausia pirkti trąšas."
    }
};

function formatCleanCtHub(val) {
    if (Math.abs(val) < 0.005) return "0";
    if (Math.abs(val) < 0.1) {
        return parseFloat(val.toFixed(2)).toString().replace('.', ',');
    }
    return parseFloat(val.toFixed(1)).toString().replace('.', ',');
}

document.addEventListener('DOMContentLoaded', () => {
    let requestedTab = getRequestedTabFromUrl();

   
    renderGlobalSidebar('index', requestedTab);
    initThemeToggle();
    initLanguageEngine();
    setTimeout(() => loadHubLivePriceTickers(), 1800);

    document.querySelectorAll('.login-trigger-btn').forEach(btn => btn.addEventListener('click', () => openAuthModal('login')));

    document.querySelectorAll('.nav-tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const tabIdx = parseInt(btn.getAttribute('data-tab'));
            const isAdmin = currentUser && (userData?.role === 'admin' || currentUser.email === 'petrasmo@gmail.com');

            if (tabIdx === 14 && !isAdmin) {
                showDialog(
                    "Prieiga ribojama",
                    "Skiltis „Savaeigė technika“ šiuo metu yra testuojama ir pasiekiama tik administratoriams.",
                    "🔒"
                );
                return;
            }

            if (!currentUser && ((tabIdx >= 2 && tabIdx <= 6) || tabIdx === 10 || tabIdx === 13 || tabIdx === 14 || tabIdx === 8 || tabIdx === 9)) {
                showDialog(
                    "Reikalingas prisijungimas",
                    "Norėdami valdyti išmaniuosius įrenginius, laukus, sėjomainą, tręšimą, ataskaitas ar nustatymus, prisijunkite prie savo ūkio paskyros.",
                    "🔒",
                    () => openAuthModal('login'),
                    true
                );
                return;
            }

            switchTab(tabIdx, false);

            if (tabIdx === 0 && typeof returnToCalculatorsHub === 'function') {
                returnToCalculatorsHub(true);
            } else if (tabIdx === 1) {
                initWeatherTab(currentUser, userData);
            } else if (tabIdx === 13) {
                initSmartDevicesTab(currentUser, userData);
            } else if (tabIdx === 14) {
                initTractorsTab(currentUser, userData); 
            }else if (tabIdx === 2) {
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

    window.copyJurgisEmail = async () => {
        const email = "info@jurgisagro.com";
        try {
            await navigator.clipboard.writeText(email);
            showBottomToast("El. paštas info@jurgisagro.com nukopijuotas! 📋");
        } catch (err) {
            const tmp = document.createElement("input");
            tmp.value = email;
            document.body.appendChild(tmp);
            tmp.select();
            document.execCommand("copy");
            tmp.remove();
            showBottomToast("El. paštas info@jurgisagro.com nukopijuotas! 📋");
        }
    };

    window.openJurgisContactModal = () => {
        showDialog(
            "Kontaktai ir Bendradarbiavimas",
            `
            <div class="space-y-4 text-left">
                <p class="text-xs leading-relaxed text-slate-500 dark:text-slate-300 text-center">
                    Turite klausimų dėl portalo veikimo, pasiūlymų ūkininkams ar bendradarbiavimo idėjų? Susisiekite su mumis!
                </p>

                <div class="p-4 bg-tractorBg border border-tractorBorder rounded-2xl space-y-3">
                    <div class="flex items-center gap-3">
                        <div class="w-10 h-10 rounded-xl bg-tractorPrimary/15 border border-tractorPrimary/30 flex items-center justify-center text-lg shrink-0">
                            👩‍🌾
                        </div>
                        <div>
                            <span class="text-[10px] uppercase tracking-wider font-bold text-slate-400 block">Kontaktinis asmuo</span>
                            <strong class="text-sm font-extrabold block" style="color: var(--text-main);">Deimantė Misiūnienė</strong>
                        </div>
                    </div>

                    <div class="flex items-center gap-3 pt-2 border-t border-tractorBorder/60">
                        <div class="w-10 h-10 rounded-xl bg-tractorPrimary/15 border border-tractorPrimary/30 flex items-center justify-center text-lg shrink-0">
                            ✉️
                        </div>
                        <div class="min-w-0 flex-1">
                            <span class="text-[10px] uppercase tracking-wider font-bold text-slate-400 block">El. paštas</span>
                            <a href="mailto:info@jurgisagro.com" class="text-sm font-bold text-green-600 dark:text-green-400 hover:underline break-all">info@jurgisagro.com</a>
                        </div>
                    </div>

                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
                        <a href="mailto:info@jurgisagro.com?subject=JurgisAgro%20u%C5%BEklausa" class="h-10 px-3 bg-tractorPrimary hover:bg-tractorPrimaryHover text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition no-underline">
                            <span>✉️</span> <span>Parašyti laišką</span>
                        </a>
                        <button type="button" onclick="window.copyJurgisEmail && window.copyJurgisEmail()" class="h-10 px-3 bg-tractorSurface hover:bg-tractorCard border border-tractorBorder font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition cursor-pointer" style="color: var(--text-main);">
                            <span>📋</span> <span>Kopijuoti el. paštą</span>
                        </button>
                    </div>
                </div>

                <div class="pt-1 text-center space-y-2">
                    <span class="text-[10px] uppercase tracking-wider font-bold text-slate-400 block">Sekite JurgisAgro naujienas</span>
                    <div class="flex items-center justify-center gap-2 flex-wrap">
                        <a href="https://www.facebook.com/people/JurgisAgro/61594036239247/" target="_blank" rel="noopener noreferrer" class="px-3 py-1.5 bg-tractorBg hover:border-tractorPrimary border border-tractorBorder rounded-xl text-xs font-bold transition no-underline" style="color: var(--text-main);">
                            📘 Facebook
                        </a>
                        <a href="https://www.youtube.com/@jurgisagro" target="_blank" rel="noopener noreferrer" class="px-3 py-1.5 bg-tractorBg hover:border-tractorPrimary border border-tractorBorder rounded-xl text-xs font-bold transition no-underline" style="color: var(--text-main);">
                            ▶️ YouTube
                        </a>
                        <a href="https://www.tiktok.com/@jurgisagro" target="_blank" rel="noopener noreferrer" class="px-3 py-1.5 bg-tractorBg hover:border-tractorPrimary border border-tractorBorder rounded-xl text-xs font-bold transition no-underline" style="color: var(--text-main);">
                            🎵 TikTok
                        </a>
                    </div>
                </div>
            </div>
            `,
            "✉️"
        );
    };

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

                <div class="p-3.5 bg-tractorBg border border-tractorBorder rounded-xl space-y-2">
                    <div class="flex items-center justify-between gap-2 flex-wrap">
                        <div>
                            <span class="text-[10px] uppercase tracking-wider font-bold text-slate-400 block">Reikia pagalbos ar turite pasiūlymų?</span>
                            <strong class="text-xs font-bold block mt-0.5" style="color: var(--text-main);">Deimantė Misiūnienė</strong>
                            <a href="mailto:info@jurgisagro.com" class="text-xs font-bold text-green-600 dark:text-green-400 hover:underline">info@jurgisagro.com</a>
                        </div>
                        <button type="button" onclick="window.copyJurgisEmail && window.copyJurgisEmail()" class="px-3 py-1.5 bg-tractorSurface hover:bg-tractorCard border border-tractorBorder rounded-lg text-[11px] font-bold transition cursor-pointer" style="color: var(--text-main);">
                            📋 Kopijuoti
                        </button>
                    </div>
                </div>
            </div>
            `,
            "📖"
        );
    };

    document.getElementById('help-btn-desktop')?.addEventListener('click', openHelp);
    document.getElementById('help-btn-mobile')?.addEventListener('click', openHelp);

    setTimeout(() => {
        db.collection("tech_classifier").get().then(classSnap => {
            classSnap.forEach(d => {
                const items = d.data().items || [];
                items.forEach(it => { classifierMap[it.id] = it.lt || it.en; });
            });
            if (getRequestedTabFromUrl() === 7) {
                initFeedTab(currentUser, userData, classifierMap);
            }
        }).catch(() => {});
    }, 2500);

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

                db.collection("user_fields").where("userId", "==", user.uid).get().then(snap => {
                    cachedFieldsList = [];
                    snap.forEach(d => cachedFieldsList.push(d.data()));
                }).catch(() => {});

                initFeedTab(currentUser, userData, classifierMap);
                initGarageTab(currentUser, userData);
                initSettingsTab(currentUser, userData);
                initWeatherTab(currentUser, userData);

                const isAdmin = (userData?.role === 'admin') || (user.email === 'petrasmo@gmail.com');
                
                document.querySelectorAll('.admin-only-nav').forEach(el => {
                    if (isAdmin) el.classList.remove('hidden');
                    else el.classList.add('hidden');
                });



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
                    if (requestedTab === 14 && !isAdmin) {
                        requestedTab = 0;
                    }
                    switchTab(requestedTab, true);
                    if (requestedTab === 13) initSmartDevicesTab(currentUser, userData);
                    else if (requestedTab === 2) { initFieldsManager(currentUser, userData); refreshFieldsMap(); }
                    else if (requestedTab === 10) initCropPlannerTab(currentUser, userData);
                    else if (requestedTab === 11) initCropLeagueTab(currentUser, userData);
                    else if (requestedTab === 12) initEventsTab(currentUser, userData);
                    else if (requestedTab === 3) initVraFertilizerTab(currentUser, userData);
                    else if (requestedTab === 4) initLimingSoilTab(currentUser, userData);
                    else if (requestedTab === 5) initOperationsJournalTab(currentUser, userData);
                    else if (requestedTab === 1) initWeatherTab(currentUser, userData);
                    else if (requestedTab === 6) initReportsTab(cachedFieldsList, userData);
                    else if (requestedTab === 14) initTractorsTab(currentUser, userData);
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

                if (requestedTab === 13 || requestedTab === 14) requestedTab = 0;
                switchTab(requestedTab, true);
                if (requestedTab === 1) initWeatherTab(null, null);
                else if (requestedTab === 7) initFeedTab(null, null, classifierMap);
                else if (requestedTab === 11) initCropLeagueTab(null, null);
                else if (requestedTab === 12) initEventsTab(null, null);
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

function loadHubLivePriceTickers() {
    // 1. Nord Pool Elektra (1 vietoje)
    db.collection("electricity_prices").doc("market_data").get().then(doc => {
        if (!doc.exists) return;
        const d = doc.data();
        const allHours = d.hours || [];
        const el = document.getElementById('hub-live-electricity');
        if (!el || allHours.length === 0) return;

        const now = new Date();
        let todayStr = now.toLocaleDateString('lt-LT', { timeZone: 'Europe/Vilnius', year: 'numeric', month: '2-digit', day: '2-digit' });
        const curH = parseInt(now.toLocaleTimeString('en-GB', { timeZone: 'Europe/Vilnius', hour: '2-digit', hour12: false }), 10);

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
    }).catch(() => {});

    // 2. MATIF birža
    db.collection("matif_prices").doc("market_data").get().then(doc => {
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
    }).catch(() => {});

    // 3. Elevatoriai (Grūdai)
    db.collection("grain_prices").get().then(snap => {
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
    }).catch(() => {});

    // 4. Gazolas (Dyzelinas) – Gyva ORLEN Lietuva didmena
    db.collection("diesel_prices").doc("market_benchmark").get().then(doc => {
        const el = document.getElementById('hub-live-diesel');
        if (!el || !doc.exists) return;

        const d = doc.data();
        const price = Number(d.officialBasePriceNoVat) || 0;
        if (price === 0) return;

        let timeStr = "";
        if (d.updatedAt && d.updatedAt.toDate) {
            const dt = d.updatedAt.toDate();
            timeStr = dt.toLocaleString('lt-LT', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
        } else if (d.priceDate) {
            timeStr = d.priceDate;
        }

        el.innerHTML = `
            <div class="flex items-center justify-between font-mono font-bold text-white">
                <span>⛽ ORLEN didmena: ${price.toFixed(3)} €/l</span>
                <span class="text-[10px] font-sans text-slate-400">(be PVM)</span>
            </div>
            <div class="text-[10px] text-amber-600 dark:text-amber-400 font-semibold flex items-center gap-1.5">
                <span class="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping"></span>
                <span>🕒 Atnaujinta: ${timeStr} • 53 kuro bazės</span>
            </div>
        `;
    }).catch(() => {});

    // 5. Trąšų barometras
    db.collection("fertilizer_market").doc("barometer_data").get().then(doc => {
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
    }).catch(() => {});
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
        document.getElementById('seo-knowledge-block')?.classList.add('hidden');
    };

    const activateCalcView = (calcSlug, viewElement, renderFn) => {
        hideAll();
        viewElement?.classList.remove('hidden');

        const seo = CALC_SEO_MAP[calcSlug];
        if (seo) {
            document.title = seo.title;
            const descMeta = document.querySelector('meta[name="description"]');
            if (descMeta) descMeta.setAttribute('content', seo.desc);
            const canonLink = document.querySelector('link[rel="canonical"]');
            if (canonLink) canonLink.setAttribute('href', `https://jurgisagro.com/${calcSlug}`);
        }

        if (window.location.pathname !== `/${calcSlug}`) {
            window.history.pushState({ calc: calcSlug }, seo?.title || '', `/${calcSlug}`);
        }

        if (typeof renderFn === 'function') renderFn();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const returnToHub = (updateUrl = true) => {
        hideAll();
        document.getElementById('seo-knowledge-block')?.classList.remove('hidden');
        hubView?.classList.remove('hidden');
        document.title = "JurgisAgro – Lietuvos Ūkininkų Platforma, Portalas, Grūdų Kainos ir Agro-Orai";
        const descMeta = document.querySelector('meta[name="description"]');
        if (descMeta) descMeta.setAttribute('content', "Nemokama Lietuvos ūkininkų platforma ir išmanusis portalas: gyvos grūdų supirkimo kainos, MATIF birža, gazolio kuras, agro-orai purškimui ir Pasėlių Lyga.");
        const canonLink = document.querySelector('link[rel="canonical"]');
        if (canonLink) canonLink.setAttribute('href', "https://jurgisagro.com/");

        if (updateUrl && window.location.search !== '') {
            window.history.pushState({ tab: 0 }, document.title, window.location.pathname);
        }
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    returnToCalculatorsHub = returnToHub;

    if (openElectricityBtn) openElectricityBtn.onclick = () => {
        activateCalcView('nordpool-kainos', electricityView, () => {
            renderElectricityCalculator(document.getElementById('electricity-calc-content'));
        });
    };

    if (openGrainBtn) openGrainBtn.onclick = () => {
        activateCalcView('grain-supirkimas', grainView, () => {
            initGrainTab(currentUser, userData);
        });
    };

    if (openMatifBtn) openMatifBtn.onclick = () => {
        activateCalcView('matif-birza', matifView, () => {
            renderMatifSection(document.getElementById('matif-calc-content'));
        });
    };

    if (openDieselBtn) openDieselBtn.onclick = () => {
        activateCalcView('dyzelinas-gazolas', dieselView, () => {
            renderDieselCalculator(document.getElementById('diesel-calc-content'), currentUser, userData);
        });
    };

    if (openSeedBtn) openSeedBtn.onclick = () => {
        activateCalcView('sejos-norma', seedView, () => {
            renderSeedCalculator(document.getElementById('seed-calc-content'));
        });
    };

    if (openCoverBtn) openCoverBtn.onclick = () => {
        activateCalcView('tarpiniai-paseliai', coverView, () => {
            renderCoverCropCalculator(document.getElementById('cover-calc-content'));
        });
    };

    if (openCombineBtn) openCombineBtn.onclick = () => {
        activateCalcView('kombaino-nuostoliai', combineView, () => {
            renderCombineLossCalculator(document.getElementById('combine-calc-content'));
        });
    };

    if (openSprayBtn) openSprayBtn.onclick = () => {
        activateCalcView('purkstuvas', sprayView, () => {
            renderSprayerCalculator(document.getElementById('spray-calc-content'));
        });
    };

    if (openFertBtn) openFertBtn.onclick = () => {
        activateCalcView('trasu-skaiciuokle', fertView, () => {
            renderFertilizerCalculator(document.getElementById('fert-calc-content'));
        });
    };

    if (openStorageBtn) openStorageBtn.onclick = () => {
        activateCalcView('grudu-sandelis', storageView, () => {
            renderStorageCalculator(document.getElementById('storage-calc-content'), currentUser, userData);
        });
    };

    if (openNmaBtn) openNmaBtn.onclick = () => {
        activateCalcView('nma-terminai', nmaView, () => {
            renderNmaCalendar(document.getElementById('nma-calc-content'));
        });
    };

    if (openBarometerBtn) openBarometerBtn.onclick = () => {
        activateCalcView('trasu-barometras', barometerView, () => {
            renderFertilizerBarometer(document.getElementById('barometer-calc-content'));
        });
    };

    const openCalcBySlug = (slug) => {
        if (slug === 'nordpool-kainos') openElectricityBtn?.click();
        else if (slug === 'matif-birza') openMatifBtn?.click();
        else if (slug === 'dyzelinas-gazolas') openDieselBtn?.click();
        else if (slug === 'grain-supirkimas') openGrainBtn?.click();
        else if (slug === 'grudu-sandelis') openStorageBtn?.click();
        else if (slug === 'nma-terminai') openNmaBtn?.click();
        else if (slug === 'sejos-norma') openSeedBtn?.click();
        else if (slug === 'tarpiniai-paseliai') openCoverBtn?.click();
        else if (slug === 'kombaino-nuostoliai') openCombineBtn?.click();
        else if (slug === 'purkstuvas') openSprayBtn?.click();
        else if (slug === 'trasu-skaiciuokle') openFertBtn?.click();
        else if (slug === 'trasu-barometras') openBarometerBtn?.click();
    };

    const initialCalcSlug = getActiveCalcSlugFromUrl();
    if (initialCalcSlug) {
        openCalcBySlug(initialCalcSlug);
    }

    window.addEventListener('popstate', () => {
        const calcSlug = getActiveCalcSlugFromUrl();
        if (calcSlug) {
            switchTab(0, true);
            openCalcBySlug(calcSlug);
        } else {
            const tabIdx = getRequestedTabFromUrl();
            switchTab(tabIdx, false);
            if (tabIdx === 0) returnToHub(false);
        }
    });
}