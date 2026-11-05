// js/core/ui.js

export const TAB_SLUGS = {
    0: '',
    1: 'orai',
    2: 'laukai',
    3: 'tresimas-vra',
    4: 'kalkinimas-vra',
    5: 'zurnalas',
    6: 'ataskaitos',
    7: 'sos-pagalba',
    8: 'technika',
    9: 'nustatymai',
    10: 'sejomaina',
    11: 'paseliu-lyga',
    12: 'renginiai',
    13: 'ismanieji-irenginiai'
};

export const SLUG_TO_TAB = Object.entries(TAB_SLUGS).reduce((acc, [idx, slug]) => {
    if (slug) acc[slug] = parseInt(idx, 10);
    return acc;
}, {});

// Skaičiuoklių slugų sąrašas, kad switchTab(0) jų netyčia neištrintų!
export const CALC_SLUGS_SET = new Set([
    'nordpool-kainos',
    'matif-birza',
    'grain-supirkimas',
    'dyzelinas-gazolas',
    'grudu-sandelis',
    'nma-terminai',
    'sejos-norma',
    'tarpiniai-paseliai',
    'kombaino-nuostoliai',
    'purkstuvas',
    'trasu-skaiciuokle',
    'trasu-barometras'
]);

export function getActiveCalcSlugFromUrl() {
    const params = new URLSearchParams(window.location.search);
    for (const slug of CALC_SLUGS_SET) {
        if (params.has(slug)) return slug;
    }
    return null;
}

export function switchTab(tabIndex, preserveCalcSlug = false) {
    const allViews = [
        document.getElementById('view-tab-calculators'), // 0
        document.getElementById('view-tab-weather'),     // 1
        document.getElementById('view-tab-fields'),      // 2, 3, 4, 5, 13
        document.getElementById('view-tab-reports'),     // 6
        document.getElementById('view-tab-feed'),        // 7 (SOS)
        document.getElementById('view-tab-garage'),      // 8 (Technika)
        document.getElementById('view-tab-settings'),    // 9 (Nustatymai)
        document.getElementById('view-tab-cropplanner'), // 10 Sėjomaina
        document.getElementById('view-tab-league'),      // 11 Lyga
        document.getElementById('view-tab-events')       // 12 Renginiai
    ];

    let targetView = document.getElementById('view-tab-calculators');
    if (tabIndex === 1) targetView = document.getElementById('view-tab-weather');
    else if ((tabIndex >= 2 && tabIndex <= 5) || tabIndex === 13) targetView = document.getElementById('view-tab-fields');
    else if (tabIndex === 6) targetView = document.getElementById('view-tab-reports');
    else if (tabIndex === 7) targetView = document.getElementById('view-tab-feed');
    else if (tabIndex === 8) targetView = document.getElementById('view-tab-garage');
    else if (tabIndex === 9) targetView = document.getElementById('view-tab-settings');
    else if (tabIndex === 10) targetView = document.getElementById('view-tab-cropplanner');
    else if (tabIndex === 11) targetView = document.getElementById('view-tab-league');
    else if (tabIndex === 12) targetView = document.getElementById('view-tab-events');

    allViews.forEach(el => {
        if (!el) return;
        if (el === targetView) {
            el.classList.remove('hidden');
        } else {
            el.classList.add('hidden');
        }
    });

    // 1. Šoninis meniu (desktop)
    document.querySelectorAll('.nav-tab-btn').forEach(btn => {
        const btnTab = parseInt(btn.getAttribute('data-tab'));
        if (btnTab === tabIndex) {
            btn.classList.add('bg-tractorPrimary', 'text-white');
            btn.classList.remove('text-slate-300', 'hover:text-white', 'hover:bg-tractorCard');
        } else {
            btn.classList.remove('bg-tractorPrimary', 'text-white');
            btn.classList.add('text-slate-300', 'hover:text-white', 'hover:bg-tractorCard');
        }
    });

    // 2. Mobili apatinė juosta
    const isUkis = (tabIndex >= 2 && tabIndex <= 6) || tabIndex === 10 || tabIndex === 13;
    const isBendruomene = tabIndex === 7 || tabIndex === 8 || tabIndex === 11 || tabIndex === 12;

    setMobileBtnActive('btn-mobile-skaiciuokles-menu', tabIndex === 0);
    setMobileBtnActive('btn-mobile-weather-nav', tabIndex === 1);
    setMobileBtnActive('btn-mobile-ukis-menu', isUkis);
    setMobileBtnActive('btn-mobile-bendruomene-menu', isBendruomene);
    setMobileBtnActive('btn-mobile-settings-nav', tabIndex === 9);

    // 🌟 Jei esame Tab 0 ir atidaryta konkreti skaičiuoklė – neliečiame jos SEO ir URL!
    if (tabIndex === 0 && preserveCalcSlug && getActiveCalcSlugFromUrl()) {
        return;
    }

    const seoMap = {
        0: {
            title: "JurgisAgro – Ūkininkų Portalas, Grūdų Kainos ir MATIF Birža",
            desc: "Lietuvos ūkininkų portalas ir programa: gyvos grūdų supirkimo kainos, MATIF birža, gazolio kuras, agro-orai purškimui ir Pasėlių Lyga.",
            url: "https://jurgisagro.com/"
        },
        1: {
            title: "Agro-Orai Purškimui, Įšalo Gylis ir Žiemkenčių Radaras | JurgisAgro",
            desc: "Tikslūs agro-orai ūkininkams: 48 val. purškimo langas, vėjo greitis, dirvos temperatūra, įšalas, T-Sum 200 ir sniego pelėsio rizika.",
            url: "https://jurgisagro.com/?orai"
        },
        2: {
            title: "Mano Ūkio Laukai, NMA Žemėlapis ir Sentinel-2 NDVI Palydovas | JurgisAgro",
            desc: "Interaktyvus ūkio laukų žemėlapis su automatinėmis NMA KŽS ribomis ir Copernicus Sentinel-2 NDVI pasėlių būklės stebėsena.",
            url: "https://jurgisagro.com/?laukai"
        },
        3: {
            title: "VRA Kintamos Normos Tręšimo Žemėlapiai Traktoriui (Shapefile) | JurgisAgro",
            desc: "Tikslusis kintamos normos (VRA) tręšimas pagal palydovinį NDVI indeksą su Shapefile (.ZIP) eksportu į traktoriaus terminalą.",
            url: "https://jurgisagro.com/?tresimas-vra"
        },
        4: {
            title: "VRA Dirvos Kalkinimas ir Dirvožemio pH Tyrimų Tinklelis | JurgisAgro",
            desc: "Dirvožemio ėminių tinklelio generavimas, pH žemėlapiai ir kintamos normos kalkinimo užduotys barstytuvui.",
            url: "https://jurgisagro.com/?kalkinimas-vra"
        },
        5: {
            title: "Ūkio Lauko Darbų, Purškimų ir Tręšimų Žurnalas | JurgisAgro",
            desc: "Skaitmeninis ūkio operacijų registravimas: sėja, purškimas, tręšimas, žemės dirbimas ir derliaus apskaita.",
            url: "https://jurgisagro.com/?zurnalas"
        },
        6: {
            title: "NMA Purškimo (AAP) ir Trąšų Apskaitos Žurnalai (PDF / Excel) | JurgisAgro",
            desc: "Oficialių NMA ir VAT patikroms privalomų Augalų apsaugos produktų bei trąšų naudojimo žurnalų generavimas vienu paspaudimu.",
            url: "https://jurgisagro.com/?ataskaitos"
        },
        7: {
            title: "SOS Pagalba Ūkininkams Laukuose ir Technikos Paieška | JurgisAgro",
            desc: "Skubi ūkininkų savitarpio pagalba sugedus traktoriui, kombainui ar įstrigus laukuose jūsų rajone.",
            url: "https://jurgisagro.com/?sos-pagalba"
        },
        8: {
            title: "Ūkio Technikos Parkas ir Garažas | JurgisAgro",
            desc: "Valdykite savo ūkio traktorių, kombainų ir padargų parką bei raskite pagalbą kaimynystėje.",
            url: "https://jurgisagro.com/?technika"
        },
        9: {
            title: "Ūkio Bazės Vietos ir Pranešimų Nustatymai | JurgisAgro",
            desc: "Pažymėkite savo ūkio bazės vietą žemėlapyje, kad visos skaičiuoklės ir orų radarai veiktų tiksliai jūsų kiemui.",
            url: "https://jurgisagro.com/?nustatymai"
        },
        10: {
            title: "Sėjomainos Planavimas (GAAB 7) ir Ūkio Gamybos Planas | JurgisAgro",
            desc: "Automatinis 3 metų pasėlių kaitos (GAAB 7) tikrinimas, sėklų, trąšų ir kuro poreikio planavimas bei NMA GeoJSON eksportas.",
            url: "https://jurgisagro.com/?sejomaina"
        },
        11: {
            title: "Lietuvos Pasėlių Lyga (TOP 10) – Sentinel-2 NDVI Reitingas | JurgisAgro",
            desc: "Kurio ūkininko kviečiai ir rapsai stipriausi jūsų rajone ir Lietuvoje? Palydovinis Sentinel-2 ir Google Earth Engine pasėlių reitingas.",
            url: "https://jurgisagro.com/?paseliu-lyga"
        },
        12: {
            title: "Žemės Ūkio Renginiai, LŽŪKT Mokymai ir Kaimo Šventės | JurgisAgro",
            desc: "Gyvas Lietuvos agro-renginių kalendorius: kaimo šventės, mugės, LŽŪKT kursai, purškimo pažymėjimai, NMA seminarai ir parodos.",
            url: "https://jurgisagro.com/?renginiai"
        },
        13: {
            title: "Išmanieji Ūkio Įrenginiai ir Nord Pool Šilumos Siurblio Valdymas | JurgisAgro",
            desc: "Automatinis Daikin Altherma šilumos siurblių ir ūkio įrenginių valdymas pagal pigiausias Nord Pool elektros biržos valandas.",
            url: "https://jurgisagro.com/?ismanieji-irenginiai"
        }
    };

    const calcSlugs = [
        'nordpool-kainos', 'matif-birza', 'grain-supirkimas', 'dyzelinas-gazolas',
        'grudu-sandelis', 'nma-terminai', 'sejos-norma', 'tarpiniai-paseliai',
        'kombaino-nuostoliai', 'purkstuvas', 'trasu-skaiciuokle', 'trasu-barometras'
    ];
    const currentSearchClean = window.location.search.replace('?', '');
    if (tabIndex === 0 && calcSlugs.includes(currentSearchClean)) {
        return;
    }

    const activeSeo = seoMap[tabIndex] || seoMap[0];
    document.title = activeSeo.title;
    const descMeta = document.querySelector('meta[name="description"]');
    if (descMeta) descMeta.setAttribute('content', activeSeo.desc);
    const canonLink = document.querySelector('link[rel="canonical"]');
    if (canonLink) canonLink.setAttribute('href', activeSeo.url);

    const slug = TAB_SLUGS[tabIndex];
    const targetUrl = slug ? `?${slug}` : window.location.pathname;
    
    if (window.location.search !== (slug ? `?${slug}` : '')) {
        window.history.pushState({ tab: tabIndex }, activeSeo.title, targetUrl);
    }
}

export function updateSeoMetaTags(title, desc, canonicalUrl) {
    document.title = title;
    const descMeta = document.querySelector('meta[name="description"]');
    if (descMeta) descMeta.setAttribute('content', desc);
    const canonLink = document.querySelector('link[rel="canonical"]');
    if (canonLink) canonLink.setAttribute('href', canonicalUrl);
    const ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) ogTitle.setAttribute('content', title);
    const ogDesc = document.querySelector('meta[property="og:description"]');
    if (ogDesc) ogDesc.setAttribute('content', desc);
    const ogUrl = document.querySelector('meta[property="og:url"]');
    if (ogUrl) ogUrl.setAttribute('content', canonicalUrl);
}

function setMobileBtnActive(id, isActive) {
    const btn = document.getElementById(id);
    if (!btn) return;
    if (isActive) {
        btn.classList.add('bg-tractorPrimary', 'text-white', 'shadow');
        btn.classList.remove('text-slate-300', 'hover:text-white');
    } else {
        btn.classList.remove('bg-tractorPrimary', 'text-white', 'shadow');
        btn.classList.add('text-slate-300', 'hover:text-white');
    }
}

export function getRequestedTabFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    
    if (urlParams.has('tab')) {
        return parseInt(urlParams.get('tab'), 10) || 0;
    }
    
    for (const [slug, tabIdx] of Object.entries(SLUG_TO_TAB)) {
        if (urlParams.has(slug)) {
            return tabIdx;
        }
    }

    if (urlParams.get('daikin') === 'connected') {
        return 13;
    }

    return 0;
}

export function showBottomToast(message, type = 'success') {
    let toastContainer = document.getElementById('global-bottom-toast');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.id = 'global-bottom-toast';
        toastContainer.className = 'fixed bottom-20 md:bottom-10 left-1/2 -translate-x-1/2 z-[300] pointer-events-none transition-all duration-300 opacity-0 transform translate-y-4 w-[92%] sm:w-auto max-w-md flex justify-center hidden';
        document.body.appendChild(toastContainer);
    }

    let bgStyle = 'background: linear-gradient(135deg, #15803d 0%, #166534 100%); border: 1px solid rgba(255, 255, 255, 0.25);';
    let icon = '✓';

    if (type === 'error') {
        bgStyle = 'background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%); border: 1px solid rgba(255, 255, 255, 0.25);';
        icon = '✕';
    } else if (type === 'warning') {
        bgStyle = 'background: linear-gradient(135deg, #d97706 0%, #b45309 100%); border: 1px solid rgba(255, 255, 255, 0.25);';
        icon = '!';
    } else if (type === 'info') {
        bgStyle = 'background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); border: 1px solid rgba(255, 255, 255, 0.25);';
        icon = 'ℹ';
    }

    const formattedMessage = message.replace(/🚜/g, `
        <span style="display: inline-flex; align-items: center; justify-content: center; background: #FFFFFF; border-radius: 6px; padding: 2px 5px; box-shadow: 0 2px 4px rgba(0,0,0,0.3); vertical-align: middle; margin-left: 6px; shrink: 0;">
            <span style="font-size: 15px; line-height: 1;">🚜</span>
        </span>
    `);

    toastContainer.innerHTML = `
        <div style="${bgStyle} color: #FFFFFF !important; box-shadow: 0 10px 25px -3px rgba(0, 0, 0, 0.45);" 
             class="w-full sm:w-auto px-4 py-2.5 rounded-2xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2.5 pointer-events-none tracking-wide text-center">
            <span style="background: rgba(255, 255, 255, 0.2); color: #FFFFFF !important;" class="w-5 h-5 rounded-full flex items-center justify-center text-xs font-black shrink-0">${icon}</span>
            <span style="color: #FFFFFF !important; display: inline-flex; align-items: center; white-space: normal;">${formattedMessage}</span>
        </div>
    `;

    toastContainer.classList.remove('hidden');
    setTimeout(() => {
        toastContainer.classList.remove('opacity-0', 'translate-y-4');
    }, 15);

    setTimeout(() => {
        toastContainer.classList.add('opacity-0', 'translate-y-4');
        setTimeout(() => {
            toastContainer.classList.add('hidden');
        }, 300);
    }, 3200);
}

export function showDialog(title, message, icon = "⚠️", onConfirm = null, showCancel = false) {
    let dialog = document.getElementById('custom-dialog');
    if (!dialog) return;

    if (dialog.parentElement !== document.body) {
        document.body.appendChild(dialog);
    }

    const titleEl = document.getElementById('dialog-title');
    const msgEl = document.getElementById('dialog-message');
    const iconEl = document.getElementById('dialog-icon');
    const confirmBtn = document.getElementById('dialog-confirm-btn');
    const cancelBtn = document.getElementById('dialog-cancel-btn');
    const panel = dialog.firstElementChild;

    dialog.className = 'fixed inset-0 bg-black/75 z-[9999] flex flex-col justify-end items-center p-0 backdrop-blur-sm transition-opacity duration-300 pointer-events-auto';
    
    if (panel) {
        panel.className = 'bg-tractorSurface border-t-2 border-x-2 border-b-0 border-tractorBorder rounded-t-3xl rounded-b-none p-6 md:p-8 pb-12 max-w-2xl w-full text-center space-y-5 shadow-2xl transition-transform duration-300 transform translate-y-full pointer-events-auto relative z-10';
    }

    titleEl.textContent = title;
    msgEl.innerHTML = message;
    iconEl.textContent = icon;

    const closeSheet = (e) => {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        if (panel) panel.classList.add('translate-y-full');
        dialog.classList.add('opacity-0');
        setTimeout(() => {
            dialog.classList.add('hidden');
            dialog.classList.remove('opacity-0');
        }, 250);
    };

    if (showCancel) {
        cancelBtn.classList.remove('hidden');
        cancelBtn.textContent = "Atšaukti";
        cancelBtn.className = "flex-1 h-12 bg-tractorBg hover:bg-zinc-800 border border-tractorBorder rounded-xl font-bold text-xs uppercase tracking-wider transition cursor-pointer text-slate-300 hover:text-white pointer-events-auto relative z-20";
        cancelBtn.onclick = closeSheet;

        confirmBtn.textContent = "Patvirtinti";
    } else {
        cancelBtn.classList.add('hidden');
        confirmBtn.textContent = "Supratau";
    }

    confirmBtn.setAttribute('type', 'button');
    confirmBtn.className = "flex-1 h-12 bg-tractorPrimary hover:bg-tractorPrimaryHover text-white font-bold rounded-xl text-xs uppercase tracking-wider shadow transition cursor-pointer pointer-events-auto relative z-20";
    confirmBtn.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        closeSheet();
        if (onConfirm) onConfirm();
    };

    dialog.onclick = (e) => {
        if (e.target === dialog) closeSheet(e);
    };

    dialog.classList.remove('hidden');
    setTimeout(() => {
        if (panel) panel.classList.remove('translate-y-full');
    }, 15);
}