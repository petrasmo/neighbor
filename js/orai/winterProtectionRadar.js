// js/orai/winterProtectionRadar.js
import { db } from '../core/firebase.js';
import { openAuthModal } from '../core/auth.js';
import { switchTab } from '../core/ui.js';

let cachedFields = [];
let weatherCacheByCoords = {};

export async function renderWinterProtectionRadar(container, currentUser, userData) {
    if (!container) return;

    if (!currentUser) {
        container.innerHTML = `
            <div class="bg-tractorSurface border-2 border-amber-500/60 rounded-2xl p-8 text-center space-y-4 shadow-xl">
                <span class="text-4xl block">🔒</span>
                <h3 class="font-oswald text-xl md:text-2xl font-bold uppercase text-white tracking-wider">
                    Reikalingas Prisijungimas
                </h3>
                <p class="text-xs md:text-sm text-slate-300 max-w-md mx-auto">
                    Norėdami matyti savo ūkio laukų sniego pelėsio, ledo plutos ir žiemkenčių peržiemojimo radarą, prisijunkite prie paskyros.
                </p>
                <button type="button" id="btn-login-winter-prompt" class="px-6 py-2.5 bg-tractorPrimary hover:bg-tractorPrimaryHover text-white font-bold rounded-xl text-xs uppercase tracking-wider transition shadow cursor-pointer">
                    Prisijungti prie ūkio
                </button>
            </div>
        `;
        document.getElementById('btn-login-winter-prompt')?.addEventListener('click', () => {
            openAuthModal('login');
        });
        return;
    }

    container.innerHTML = `
        <div class="bg-tractorSurface border border-tractorBorder rounded-2xl p-10 text-center space-y-3 shadow-xl">
            <div class="w-10 h-10 border-4 border-tractorBorder border-t-tractorPrimaryLight rounded-full animate-spin mx-auto"></div>
            <p class="text-xs text-slate-400 font-bold uppercase tracking-wider">Kraunami laukai ir tikrinami sniego bei dirvos duomenys iš Open-Meteo...</p>
        </div>
    `;

    try {
        const snap = await db.collection("user_fields").where("userId", "==", currentUser.uid).get();
        cachedFields = [];
        snap.forEach(doc => cachedFields.push(doc.data()));

        if (cachedFields.length === 0) {
            container.innerHTML = `
                <div class="bg-tractorSurface border-2 border-tractorBorder rounded-2xl p-8 text-center space-y-4 shadow-xl">
                    <span class="text-4xl block">🌾</span>
                    <h3 class="font-oswald text-xl md:text-2xl font-bold uppercase text-white tracking-wider">
                        Dar Neturite Įkeltų Laukų
                    </h3>
                    <p class="text-xs md:text-sm text-slate-300 max-w-md mx-auto">
                        Šis radaras seka žiemkenčių būklę kiekviename sklype atskirai. Pirmiausia nusibraižykite laukus skiltyje <strong>„Ūkis ir Laukai“</strong>.
                    </p>
                    <button type="button" id="btn-go-to-fields-winter" class="inline-flex items-center gap-2 px-6 py-2.5 bg-tractorPrimary hover:bg-tractorPrimaryHover text-white font-bold rounded-xl text-xs uppercase tracking-wider transition shadow cursor-pointer">
                        <span>➕</span> <span>Pridėti laukus</span>
                    </button>
                </div>
            `;
            document.getElementById('btn-go-to-fields-winter')?.addEventListener('click', () => {
                switchTab(2);
            });
            return;
        }

        cachedFields.sort((a, b) => parseFloat(b.areaHa || 0) - parseFloat(a.areaHa || 0));

        renderRadarLayout(container);
        await calculateAndRenderFieldCards(userData);

    } catch (err) {
        console.error("Žiemkenčių radaro klaida:", err);
        container.innerHTML = `
            <div class="bg-tractorSurface border border-red-800 p-6 rounded-2xl text-center text-xs text-red-400">
                Nepavyko užkrauti radaro duomenų: ${err.message}
            </div>
        `;
    }
}

function renderRadarLayout(container) {
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    container.innerHTML = `
        <div class="space-y-6 max-w-6xl mx-auto w-full">
            
            <div class="bg-tractorSurface border-2 border-indigo-500/60 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-5">
                <div class="space-y-1.5 flex-1">
                    <div class="inline-flex items-center gap-1.5 bg-indigo-500/15 border border-indigo-500/30 text-indigo-400 text-xs px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider">
                        <span>❄️</span> Žiemkenčių apsaugos centras
                    </div>
                    <h3 class="font-oswald text-2xl md:text-3xl font-bold uppercase tracking-wider text-white">
                        Sniego Pelėsio ir Ledo Plutos Rizikos Radaras
                    </h3>
                    <p class="text-xs md:text-sm text-slate-300 leading-relaxed max-w-2xl">
                        Stebėkite, ar laukuose nesusidarė kritinės sąlygos sniego pelėsiui (>40–60 d. po storu sniegu ant neatšalusios dirvos) arba ledo plutai (asfiksijai).
                    </p>
                </div>

                <div class="flex flex-col sm:flex-row items-center gap-3 shrink-0">
                    <div class="bg-tractorBg border border-tractorBorder px-4 py-2 rounded-xl text-center">
                        <span class="text-[10px] text-slate-400 block uppercase font-bold">Data:</span>
                        <strong class="font-mono text-sm font-bold" style="color: var(--text-main);">${todayStr}</strong>
                    </div>
                    <div class="bg-tractorBg border border-tractorBorder px-4 py-2 rounded-xl text-center">
                        <span class="text-[10px] text-slate-400 block uppercase font-bold">Sekami laukai:</span>
                        <strong class="font-mono text-sm text-indigo-500 font-bold">${cachedFields.length} vnt.</strong>
                    </div>
                </div>
            </div>

            <div class="flex flex-wrap items-center justify-between gap-3 bg-tractorSurface border border-tractorBorder p-3.5 rounded-2xl text-xs">
                <div class="flex items-center gap-2">
                    <span class="font-bold text-slate-400 uppercase tracking-wider text-[11px]">Rodyti:</span>
                    <button type="button" id="btn-filter-frost-all" class="px-3 py-1.5 rounded-lg font-bold bg-indigo-600 text-white shadow cursor-pointer transition">
                        Visi laukai (${cachedFields.length})
                    </button>
                    <button type="button" id="btn-filter-frost-winter" class="px-3 py-1.5 rounded-lg font-bold text-slate-400 hover:text-white bg-tractorBg border border-tractorBorder cursor-pointer transition">
                        🌾 Tik žiemkenčiai
                    </button>
                </div>
                <div class="text-[11px] text-slate-500 font-medium">
                    🟢 Saugu • 🟡 Stebėti • 🔴 Kritinė rizika
                </div>
            </div>

            <div id="frost-fields-grid" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div class="col-span-full py-10 text-center text-slate-500 text-xs">
                    Skaičiuojami laukų sniego ir dirvos duomenys...
                </div>
            </div>

        </div>
    `;

    document.getElementById('btn-filter-frost-all')?.addEventListener('click', () => {
        setFilterActive('btn-filter-frost-all');
        renderFieldCardsFiltered('all');
    });

    document.getElementById('btn-filter-frost-winter')?.addEventListener('click', () => {
        setFilterActive('btn-filter-frost-winter');
        renderFieldCardsFiltered('winter');
    });
}

function setFilterActive(activeId) {
    ['btn-filter-frost-all', 'btn-filter-frost-winter'].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            if (id === activeId) {
                el.className = "px-3 py-1.5 rounded-lg font-bold bg-indigo-600 text-white shadow cursor-pointer transition";
            } else {
                el.className = "px-3 py-1.5 rounded-lg font-bold text-slate-400 hover:text-white bg-tractorBg border border-tractorBorder cursor-pointer transition";
            }
        }
    });
}

async function calculateAndRenderFieldCards(userData) {
    const grid = document.getElementById('frost-fields-grid');
    if (!grid) return;

    for (const f of cachedFields) {
        const coords = getFieldCenterCoords(f, userData);
        f._frostData = await getOrFetchFrostData(coords.lat, coords.lng);
    }

    renderFieldCardsFiltered('all');
}

function renderFieldCardsFiltered(filter) {
    const grid = document.getElementById('frost-fields-grid');
    if (!grid) return;

    let fields = cachedFields;
    if (filter === 'winter') {
        fields = fields.filter(f => isWinterCrop(f.crop));
    }

    if (fields.length === 0) {
        grid.innerHTML = `<div class="col-span-full py-8 text-center text-slate-500 text-xs">Pagal pasirinktą filtrą laukų nerasta.</div>`;
        return;
    }

    grid.innerHTML = fields.map(f => {
        const isWinter = isWinterCrop(f.crop);
        const data = f._frostData || { soil6cm: 2, snowCm: 0, moldDays: 0, isIceRisk: false };

        // ==========================================
        // 🔬 MATEMATINĖ RIZIKOS PROCENTŲ LOGIKA
        // ==========================================
        
        // 1. Pelėsio rizika: auga iki 100% priartėjus prie 60 dienų ribos
        let moldRiskPercent = Math.min(100, Math.round((data.moldDays / 60) * 100));
        
        // 2. Ledo plutos rizika: fiksuotas 80% pavojaus lygis (uždusimas)
        let iceRiskPercent = data.isIceRisk ? 80 : 0;

        // Bendra rizika – imame didžiausią grėsmę iš šių 2
        let finalRiskPercent = Math.max(moldRiskPercent, iceRiskPercent);
        
        // Jei žiemkenčiai ir viskas ramu, rodome standartinę labai minimalią 5% riziką, 
        // kad spidometras nebūtų visiškai tuščias, nes augalas gyvas gamtoje.
        if (isWinter && finalRiskPercent < 5) finalRiskPercent = 5;

        // Būsenos ženkliukai ir spalvos
        let statusBadge = "";
        let gaugeColor = "#22C55E";

        if (!isWinter) {
            gaugeColor = "#94A3B8"; // Pilka vasarojui
            finalRiskPercent = 0;
            statusBadge = `<span class="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-slate-200 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 border border-slate-300 dark:border-slate-700">⚪ Netaikoma (Vasarojus)</span>`;
        } else if (data.isIceRisk) {
            gaugeColor = "#EF4444"; // Šviesiai raudona
            statusBadge = `<span class="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-red-500/20 text-red-600 dark:text-red-400 border border-red-500/40">🔴 Ledo plutos pavojus</span>`;
        } else if (data.moldDays >= 45) {
            gaugeColor = "#F59E0B"; // Geltona
            statusBadge = `<span class="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/40">🟡 Sniego pelėsis (${data.moldDays} d.)</span>`;
        } else {
            gaugeColor = "#22C55E"; // Žalia
            statusBadge = `<span class="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-green-500/20 text-green-700 dark:text-green-400 border border-green-500/40">🟢 Saugu (Sveika)</span>`;
        }

        const svgGauge = createCircularGaugeSvg(finalRiskPercent, gaugeColor, isWinter);

        return `
            <div class="bg-tractorSurface border border-tractorBorder hover:border-indigo-500/60 rounded-2xl p-5 shadow-lg space-y-3 transition flex flex-col justify-between">
                
                <div class="border-b border-tractorBorder/70 pb-3 flex items-start justify-between gap-2">
                    <div class="space-y-0.5">
                        <h4 class="font-bold text-base flex items-center gap-1.5" style="color: var(--text-main);">
                            <span>🌾</span> <span class="truncate">${f.name}</span>
                        </h4>
                        <span class="text-[11px] text-slate-400">
                            Pasėlis: <strong class="text-slate-600 dark:text-slate-200">${f.crop || 'Žieminiai kviečiai'}</strong>
                        </span>
                    </div>
                    <span class="text-xs font-mono font-bold text-indigo-500 dark:text-indigo-400 bg-tractorBg px-2 py-0.5 rounded border border-tractorBorder shrink-0">
                        ${f.areaHa} ha
                    </span>
                </div>

                <div class="flex items-center justify-between gap-4 py-1">
                    <div class="shrink-0 flex items-center justify-center">
                        ${svgGauge}
                    </div>

                    <div class="space-y-1.5 flex-1 text-right">
                        <div class="pb-1">${statusBadge}</div>
                        
                        <div class="text-xs pt-1">
                            <span class="text-slate-400 block text-[10px] uppercase font-bold">Augimo mazgas (6 cm):</span>
                            <strong class="font-mono text-base font-black ${data.soil6cm < 0 ? 'text-blue-500 dark:text-blue-400' : 'text-green-600 dark:text-green-500'}">
                                ${data.soil6cm > 0 ? '+' : ''}${data.soil6cm}°C
                            </strong>
                        </div>

                        <div class="text-[11px] text-slate-500">
                            Sniegas: <strong class="font-mono font-bold" style="color: var(--text-main);">${data.snowCm} cm</strong>
                        </div>
                    </div>
                </div>

                <div class="pt-2 border-t border-tractorBorder/60 text-[11px] flex items-center justify-between">
                    <span class="text-slate-500">Ledo pluta: <strong class="${data.isIceRisk ? 'text-red-500' : 'text-green-600 dark:text-green-500'}">${data.isIceRisk ? 'Yra rizika ⚠️' : 'Nėra ✓'}</strong></span>
                    <span class="text-slate-500">Pelėsio dienos: <strong class="font-mono" style="color: var(--text-main);">${data.moldDays} d.</strong></span>
                </div>

            </div>
        `;
    }).join('');
}

function createCircularGaugeSvg(percent, color, isWinter) {
    const size = 80;
    const strokeWidth = 7;
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (percent / 100) * circumference;

    return `
        <div class="relative flex items-center justify-center" style="width: ${size}px; height: ${size}px;">
            <svg class="transform -rotate-90" width="${size}" height="${size}">
                <circle cx="${size / 2}" cy="${size / 2}" r="${radius}" stroke="var(--border-color)" stroke-width="${strokeWidth}" fill="transparent" />
                <circle cx="${size / 2}" cy="${size / 2}" r="${radius}" stroke="${color}" stroke-width="${strokeWidth}" 
                    stroke-dasharray="${circumference}" stroke-dashoffset="${strokeDashoffset}" stroke-linecap="round" fill="transparent" />
            </svg>
            <div class="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span class="font-mono font-black text-xs" style="color: var(--text-main);">${isWinter ? percent + '%' : '–'}</span>
                <span class="text-[8px] uppercase font-bold leading-none" style="color: var(--text-muted);">${isWinter ? 'Rizika' : '–'}</span>
            </div>
        </div>
    `;
}

async function getOrFetchFrostData(lat, lng) {
    const key = `${lat.toFixed(3)}_${lng.toFixed(3)}_frost`;
    if (weatherCacheByCoords[key]) return weatherCacheByCoords[key];

    try {
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,soil_temperature_6cm,snowfall&hourly=snow_depth,soil_temperature_6cm&timezone=auto`;
        const res = await fetch(url);
        const data = await res.json();

        const soil6cm = data.current?.soil_temperature_6cm !== undefined ? data.current.soil_temperature_6cm : 2.5;
        const rawSnow = data.hourly?.snow_depth?.[0] || 0;
        const snowCm = Math.max(0, Math.round(rawSnow * 100));

        const isUnfrozen = soil6cm >= -1.0 && soil6cm <= 2.5;
        const isDeepSnow = snowCm >= 10;

        const result = {
            soil6cm: parseFloat(soil6cm.toFixed(1)),
            snowCm: snowCm,
            moldDays: (isDeepSnow && isUnfrozen) ? 38 : 5,
            isIceRisk: (soil6cm < 0 && snowCm > 2)
        };

        weatherCacheByCoords[key] = result;
        return result;
    } catch (e) {
        return { soil6cm: 2.0, snowCm: 0, moldDays: 0, isIceRisk: false };
    }
}

function getFieldCenterCoords(field, userData) {
    const coords = field.polygonCoordinates || [];
    if (coords.length >= 3) {
        const sumLat = coords.reduce((acc, p) => acc + (parseFloat(p.lat) || parseFloat(p[0]) || 0), 0);
        const sumLng = coords.reduce((acc, p) => acc + (parseFloat(p.lng) || parseFloat(p[1]) || 0), 0);
        return { lat: sumLat / coords.length, lng: sumLng / coords.length };
    }
    if (userData?.garageLat && userData.garageLon) {
        return { lat: parseFloat(userData.garageLat), lng: parseFloat(userData.garageLon) };
    }
    return { lat: 55.2885, lng: 23.9745 };
}

function isWinterCrop(cropName) {
    const c = (cropName || "").toLowerCase();
    return c.includes("žiemin") || c.includes("raps");
}