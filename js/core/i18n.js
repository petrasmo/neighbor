// js/core/i18n.js

const STORAGE_KEY = 'jurgis_lang';
const CACHE_KEY_PREFIX = 'jurgis_i18n_cache_v1_';

function detectInitialLanguage() {
    const urlParams = new URLSearchParams(window.location.search);
    const paramLang = urlParams.get('lang');
    if (paramLang && ['lt', 'en', 'lv', 'et'].includes(paramLang)) {
        localStorage.setItem(STORAGE_KEY, paramLang);
        return paramLang;
    }
    if (window.location.pathname === '/en' || window.location.pathname.startsWith('/en/')) {
        localStorage.setItem(STORAGE_KEY, 'en');
        return 'en';
    }
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return saved;
    return 'lt';
}

let currentLang = detectInitialLanguage();

let observer = null;
let pendingNodes = new Map();
let batchTimer = null;

// Saugo originalų lietuvišką tekstą kiekvienam DOM elementui, kad grįžimas į LT būtų 100% akimirksninis
const originalTextMap = new WeakMap();
const originalPlaceholderMap = new WeakMap();
const originalTitleMap = new WeakMap();

// 🎯 TIKSLUSIS AGRO-ŽODYNAS (Svarbiausi terminai, kad niekada nebūtų išversti pažodžiui)
const EXACT_DICTIONARY = {
    "Ūkininkų portalas": { en: "Farmers Portal", lv: "Lauksaimnieku portāls", et: "Põllumeeste portaal" },
    "Visos skaičiuoklės (Centras)": { en: "All Calculators (Hub)", lv: "Visi kalkulatori (Centrs)", et: "Kõik kalkulaatorid (Keskus)" },
    "Skaičiuoklės": { en: "Calculators", lv: "Kalkulatori", et: "Kalkulaatorid" },
    "Agro-Orai ir Įšalas": { en: "Agro-Weather & Frost", lv: "Agro-laikapstākļi un sals", et: "Agro-ilm ja külmumine" },
    "Orai": { en: "Weather", lv: "Laikapstākļi", et: "Ilm" },
    "🚜 Ūkis ir Laukai": { en: "🚜 Farm & Fields", lv: "🚜 Saimniecība un lauki", et: "🚜 Talu ja põllud" },
    "Laukai / Ūkis": { en: "Fields / Farm", lv: "Lauki / Saimniecība", et: "Põllud / Talu" },
    "Išmanieji Įrenginiai": { en: "Smart IoT Devices", lv: "Viedās ierīces", et: "Nutiseadmed" },
    "Mano Laukai (Žemėlapis)": { en: "My Fields (GIS Map)", lv: "Mani lauki (Karte)", et: "Minu põllud (Kaart)" },
    "Sėjomainos Planavimas (GAAB 7)": { en: "Crop Rotation (GAEC 7)", lv: "Augu maiņa (LLV 7)", et: "Viljavaheldus (HPK 7)" },
    "Tręšimas (VRA Traktoriui)": { en: "VRA Fertilization (Shapefile)", lv: "VRA mēslošana (Traktoram)", et: "VRA väetamine (Traktorile)" },
    "Kalkinimas (VRA traktoriui)": { en: "VRA Liming & Soil pH", lv: "VRA kaļķošana un pH", et: "VRA lupjamine ja pH" },
    "Kitos operacijos ir Žurnalas": { en: "Operations & Field Log", lv: "Lauka darbu žurnāls", et: "Põllutööde päevik" },
    "NMA Žurnalai ir Ataskaitos": { en: "Official Logs & Reports", lv: "Oficiālie žurnāli un atskaites", et: "Ametlikud aruanded" },
    "🤝 Bendruomenė ir Parkas": { en: "🤝 Community & Fleet", lv: "🤝 Kopiena un tehnika", et: "🤝 Kogukond ja tehnika" },
    "Bendruomenė": { en: "Community", lv: "Kopiena", et: "Kogukond" },
    "Pasėlių Lyga (TOP 10)": { en: "Crop League (TOP 10)", lv: "Sējumu līga (TOP 10)", et: "Põllukultuuride liiga (TOP 10)" },
    "Agro-Renginiai ir Šventės": { en: "Agro-Events & Fairs", lv: "Agro-pasākumi un svētki", et: "Agro-üritused ja laadad" },
    "SOS Pagalba kaimynams": { en: "SOS Field Assistance", lv: "SOS palīdzība uz lauka", et: "SOS põlluabi" },
    "Turima technika (Garažas)": { en: "My Machinery (Garage)", lv: "Mana tehnika (Garāža)", et: "Minu tehnika (Garaaž)" },
    "Nustatymai": { en: "Settings", lv: "Iestatījumi", et: "Seaded" },
    "Esate neprisijungęs": { en: "Not logged in", lv: "Neesat pieslēdzies", et: "Pole sisse logitud" },
    "Prisijungta kaip:": { en: "Logged in as:", lv: "Pieslēdzies kā:", et: "Sisse logitud:" },
    "Prisijungti prie ūkio": { en: "Log in to Farm", lv: "Pieslēgties saimniecībai", et: "Logi tallu sisse" },
    "Prisijungti su Google": { en: "Sign in with Google", lv: "Pieslēgties ar Google", et: "Logi sisse Google'iga" },
    "Prisijungti": { en: "Log in", lv: "Pieslēgties", et: "Logi sisse" },
    "Atsijungti": { en: "Log out", lv: "Iziet", et: "Logi välja" },
    "Atidaryti biržą": { en: "Open Exchange", lv: "Atvērt biržu", et: "Ava börs" },
    "Atidaryti": { en: "Open Tool", lv: "Atvērt", et: "Ava" },
    "Skaičiuoti kurą": { en: "Calculate Fuel", lv: "Aprēķināt degvielu", et: "Arvuta kütust" },
    "Atidaryti sandėlį": { en: "Open Granary", lv: "Atvērt noliktavu", et: "Ava hoidla" },
    "Tikrinti terminus": { en: "Check Deadlines", lv: "Pārbaudīt termiņus", et: "Kontrolli tähtaegu" },
    "Atidaryti radarą": { en: "Open Radar", lv: "Atvērt radaru", et: "Ava radar" },
    "Be PVM": { en: "Excl. VAT", lv: "Bez PVN", et: "Ilma KM-ta" },
    "Su PVM": { en: "Incl. VAT", lv: "Ar PVN", et: "Koos KM-ga" },
    "Žieminiai kviečiai": { en: "Winter Wheat", lv: "Ziemas kvieši", et: "Taliküps / Talinisu" },
    "Žieminiai rapsai": { en: "Winter Rapeseed", lv: "Ziemas rapsis", et: "Taliraps" },
    "Vasariniai miežiai": { en: "Spring Barley", lv: "Vasaras mieži", et: "Suvioder" },
    "Vasariniai kviečiai": { en: "Spring Wheat", lv: "Vasaras kvieši", et: "Suvinisu" },
    "Žirniai / Pupos": { en: "Peas / Beans", lv: "Zirņi / Pupas", et: "Herned / Oad" },
    "Kukurūzai": { en: "Corn (Maize)", lv: "Kukurūza", et: "Mais" },
    "Rapsai": { en: "Rapeseed", lv: "Rapsis", et: "Raps" },
    "Kviečiai": { en: "Wheat", lv: "Kvieši", et: "Nisu" },
    "Miežiai": { en: "Barley", lv: "Mieži", et: "Oder" },
    "Pigu (Palanki)": { en: "Cheap (Favorable)", lv: "Lēti (Izdevīgi)", et: "Odav (Soodne)" },
    "Vidutinė": { en: "Medium", lv: "Vidēja", et: "Keskmine" },
    "Brangu": { en: "Expensive", lv: "Dārgi", et: "Kallis" }
};

function loadLangCache(lang) {
    try {
        const raw = localStorage.getItem(CACHE_KEY_PREFIX + lang);
        return raw ? JSON.parse(raw) : {};
    } catch (e) {
        return {};
    }
}

function saveLangCache(lang, cacheObj) {
    try {
        localStorage.setItem(CACHE_KEY_PREFIX + lang, JSON.stringify(cacheObj));
    } catch (e) {}
}

const memoryCache = {
    en: loadLangCache('en'),
    lv: loadLangCache('lv'),
    et: loadLangCache('et')
};

function shouldSkipText(str) {
    if (!str) return true;
    const clean = str.trim();
    if (clean.length < 2) return true;
    // Praleidžiame grynus skaičius, datas, kainas, kodus
    if (/^[0-9.,:+\-–—€$%/\s()°CchaktlMWhkW#•📡🕒📅⚡🌾🌱🚜⛽🧪🍋🏠🛢️🟢🟡🔴⚪🥇🥈🥉]+$/i.test(clean)) return true;
    if (clean === 'JURGISAGRO' || clean === 'JurgisAgro') return true;
    return false;
}

export function getCurrentLang() {
    return currentLang;
}

export function initLanguageEngine() {
    updateLangSelectUI(currentLang);

    document.querySelectorAll('.lang-switcher-select').forEach(sel => {
        sel.value = currentLang;
        sel.onchange = (e) => {
            setLanguage(e.target.value);
        };
    });

    // ⚡ Jei kalba yra numatytoji lietuvių ('lt') – NEapkrauname naršyklės jokiu MutationObserver!
    if (currentLang !== 'lt') {
        ensureDomObserverStarted();
        translateEntirePage(currentLang);
    }
}

function ensureDomObserverStarted() {
    if (observer) return;
    observer = new MutationObserver((mutations) => {
        if (currentLang === 'lt') return;
        for (const m of mutations) {
            if (m.type === 'childList') {
                m.addedNodes.forEach(node => {
                    if (node.nodeType === 1) {
                        scanAndQueueElement(node, currentLang);
                    } else if (node.nodeType === 3) {
                        queueTextNode(node, currentLang);
                    }
                });
            }
        }
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
}

export function setLanguage(lang) {
    currentLang = lang;
    localStorage.setItem(STORAGE_KEY, lang);
    updateLangSelectUI(lang);

    if (lang === 'lt') {
        if (observer) {
            observer.disconnect();
            observer = null;
        }
        restoreOriginalLithuanian(document.body);
    } else {
        ensureDomObserverStarted();
        translateEntirePage(lang);
    }
}

function updateLangSelectUI(lang) {
    document.querySelectorAll('.lang-switcher-select').forEach(sel => {
        if (sel.value !== lang) sel.value = lang;
    });
}

function restoreOriginalLithuanian(root) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null, false);
    let node;
    while ((node = walker.nextNode())) {
        if (originalTextMap.has(node)) {
            node.nodeValue = originalTextMap.get(node);
        }
    }

    root.querySelectorAll?.('[placeholder], [title]').forEach(el => {
        if (originalPlaceholderMap.has(el)) {
            el.setAttribute('placeholder', originalPlaceholderMap.get(el));
        }
        if (originalTitleMap.has(el)) {
            el.setAttribute('title', originalTitleMap.get(el));
        }
    });
}

function translateEntirePage(lang) {
    scanAndQueueElement(document.body, lang);
}

function scanAndQueueElement(rootEl, lang) {
    if (!rootEl) return;

    // 1. Tekstiniai mazgai
    const walker = document.createTreeWalker(rootEl, NodeFilter.SHOW_TEXT, {
        acceptNode: (node) => {
            const parent = node.parentElement;
            if (!parent) return NodeFilter.FILTER_REJECT;
            const tag = parent.tagName;
            if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'NOSCRIPT' || tag === 'CODE') {
                return NodeFilter.FILTER_REJECT;
            }
            if (parent.closest?.('.lang-switcher-select')) {
                return NodeFilter.FILTER_REJECT;
            }
            return NodeFilter.FILTER_ACCEPT;
        }
    }, false);

    let textNode;
    while ((textNode = walker.nextNode())) {
        queueTextNode(textNode, lang);
    }

    // 2. Placeholderiai
    if (rootEl.querySelectorAll) {
        rootEl.querySelectorAll('[placeholder]').forEach(el => {
            if (!originalPlaceholderMap.has(el)) {
                originalPlaceholderMap.set(el, el.getAttribute('placeholder'));
            }
            const orig = originalPlaceholderMap.get(el);
            if (!shouldSkipText(orig)) {
                applyOrQueueTranslation(orig, lang, (translated) => {
                    el.setAttribute('placeholder', translated);
                });
            }
        });
    }
}

function queueTextNode(node, lang) {
    if (!originalTextMap.has(node)) {
        const currentVal = node.nodeValue;
        if (shouldSkipText(currentVal)) return;
        originalTextMap.set(node, currentVal);
    }

    const origFull = originalTextMap.get(node);
    const trimmed = origFull.trim();
    if (shouldSkipText(trimmed)) return;

    const leadingSpace = origFull.match(/^\s*/)?.[0] || '';
    const trailingSpace = origFull.match(/\s*$/)?.[0] || '';

    // 1. Tikriname tikslųjį agro-žodyną
    if (EXACT_DICTIONARY[trimmed] && EXACT_DICTIONARY[trimmed][lang]) {
        const targetVal = leadingSpace + EXACT_DICTIONARY[trimmed][lang] + trailingSpace;
        if (node.nodeValue !== targetVal) node.nodeValue = targetVal;
        return;
    }

    // 2. Tikriname atminties talpyklą (cache)
    if (memoryCache[lang] && memoryCache[lang][trimmed]) {
        const targetVal = leadingSpace + memoryCache[lang][trimmed] + trailingSpace;
        if (node.nodeValue !== targetVal) node.nodeValue = targetVal;
        return;
    }

    // 3. Dedame į greitą grupinę (batch) užklausą
    applyOrQueueTranslation(trimmed, lang, (translated) => {
        const targetVal = leadingSpace + translated + trailingSpace;
        if (node.nodeValue !== targetVal) {
            node.nodeValue = targetVal;
        }
    });
}

function applyOrQueueTranslation(text, lang, callback) {
    if (EXACT_DICTIONARY[text]?.[lang]) {
        callback(EXACT_DICTIONARY[text][lang]);
        return;
    }
    if (memoryCache[lang]?.[text]) {
        callback(memoryCache[lang][text]);
        return;
    }

    if (!pendingNodes.has(text)) {
        pendingNodes.set(text, []);
    }
    pendingNodes.get(text).push(callback);

    if (batchTimer) clearTimeout(batchTimer);
    batchTimer = setTimeout(() => {
        flushTranslationQueue(lang);
    }, 45);
}

async function flushTranslationQueue(lang) {
    if (pendingNodes.size === 0) return;

    const entries = Array.from(pendingNodes.entries());
    pendingNodes.clear();

    // Siunčiame grupėmis po 25 frazes vienu ypu (sujungtas per ' ||| '), kad išverstų per 0.15 sek.!
    const CHUNK_SIZE = 25;
    for (let i = 0; i < entries.length; i += CHUNK_SIZE) {
        const chunk = entries.slice(i, i + CHUNK_SIZE);
        const textsToTranslate = chunk.map(item => item[0]);
        const joinedText = textsToTranslate.join('\n');

        try {
            const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=lt&tl=${lang}&dt=t&q=${encodeURIComponent(joinedText)}`;
            const res = await fetch(url);
            const data = await res.json();

            if (data && Array.isArray(data[0])) {
                const fullTranslated = data[0].map(part => part[0]).join('');
                const splitLines = fullTranslated.split('\n');

                chunk.forEach(([origText, callbacks], idx) => {
                    const transLine = (splitLines[idx] || origText).trim();
                    if (!memoryCache[lang]) memoryCache[lang] = {};
                    memoryCache[lang][origText] = transLine;
                    callbacks.forEach(cb => cb(transLine));
                });

                saveLangCache(lang, memoryCache[lang]);
            }
        } catch (err) {
            console.warn("Vertimo klaida:", err);
        }
    }
}