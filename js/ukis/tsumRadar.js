// js/ukis/tsumRadar.js
import { db } from '../core/firebase.js';
import { openAuthModal } from '../core/auth.js';
import { switchTab, showBottomToast } from '../core/ui.js';

let cachedFields = [];
let weatherCacheByCoords = {};

/**
 * Tikrina, ar šiuo metu yra pavasario vegetacijos starto sezonas (Sausis - Balandis)
 */
function isSpringSeason() {
    const month = new Date().getMonth(); // 0 = Sausis, 3 = Balandis
    return month >= 0 && month <= 3;
}

/**
 * Suskaičiuoja, kiek dienų liko iki ateinančio sausio 1 dienos
 */
function getDaysUntilJan1() {
    const now = new Date();
    const currentYear = now.getFullYear();
    const nextJan1 = new Date(currentYear + 1, 0, 1);
    return Math.max(1, Math.ceil((nextJan1 - now) / (1000 * 60 * 60 * 24)));
}

/**
 * Pagrindinė T-Sum radaro paleidimo funkcija
 */
export async function renderTSumRadar(container, currentUser, userData) {
    if (!container) return;

    // 1. TIKRINAME AR PRISIJUNGĘS
    if (!currentUser) {
        container.innerHTML = `
            <div class="bg-tractorSurface border-2 border-amber-500/60 rounded-2xl p-8 text-center space-y-4 shadow-xl">
                <span class="text-4xl block">🔒</span>
                <h3 class="font-oswald text-xl md:text-2xl font-bold uppercase text-white tracking-wider">
                    Reikalingas Prisijungimas
                </h3>
                <p class="text-xs md:text-sm text-slate-300 max-w-md mx-auto">
                    Norėdami matyti savo ūkio laukų pavasario vegetacijos starto radarą („T-Sum 200 / 250“), prisijunkite prie savo paskyros.
                </p>
                <button type="button" id="btn-tsum-login-prompt" class="px-6 py-2.5 bg-tractorPrimary hover:bg-tractorPrimaryHover text-white font-bold rounded-xl text-xs uppercase tracking-wider transition shadow cursor-pointer">
                    Prisijungti prie ūkio
                </button>
            </div>
        `;
        document.getElementById('btn-tsum-login-prompt')?.addEventListener('click', () => {
            openAuthModal('login');
        });
        return;
    }

    // Krovimosi būsena
    container.innerHTML = `
        <div class="bg-tractorSurface border border-tractorBorder rounded-2xl p-10 text-center space-y-3 shadow-xl">
            <div class="w-10 h-10 border-4 border-tractorBorder border-t-tractorPrimaryLight rounded-full animate-spin mx-auto"></div>
            <p class="text-xs text-slate-400 font-bold uppercase tracking-wider">Kraunami laukai ir tikrinamas vegetacijos sezonas...</p>
        </div>
    `;

    try {
        // 2. KRAUNAME LAUKUS
        const snap = await db.collection("user_fields").where("userId", "==", currentUser.uid).get();
        cachedFields = [];
        snap.forEach(doc => cachedFields.push(doc.data()));

        // 3. TIKRINAME AR TURI LAUKŲ
        if (cachedFields.length === 0) {
            container.innerHTML = `
                <div class="bg-tractorSurface border-2 border-tractorBorder rounded-2xl p-8 text-center space-y-4 shadow-xl">
                    <span class="text-4xl block">🌾</span>
                    <h3 class="font-oswald text-xl md:text-2xl font-bold uppercase text-white tracking-wider">
                        Dar Neturite Įkeltų Laukų
                    </h3>
                    <p class="text-xs md:text-sm text-slate-300 max-w-md mx-auto">
                        Vegetacijos radaras seka konkrečių jūsų laukų mikroklimatą. Pirmiausia nusibraižykite arba importuokite savo laukus skiltyje <strong>„Ūkis ir Laukai“</strong>.
                    </p>
                    <button type="button" id="btn-tsum-add-fields" class="inline-flex items-center gap-2 px-6 py-2.5 bg-tractorPrimary hover:bg-tractorPrimaryHover text-white font-bold rounded-xl text-xs uppercase tracking-wider transition shadow cursor-pointer">
                        <span>➕</span> <span>Pridėti laukus</span>
                    </button>
                </div>
            `;
            document.getElementById('btn-tsum-add-fields')?.addEventListener('click', () => {
                switchTab(2);
            });
            return;
        }

        // Rūšiuojame laukus pagal plotą
        cachedFields.sort((a, b) => parseFloat(b.areaHa || 0) - parseFloat(a.areaHa || 0));

        // 4. SEZONO TIKRINIMAS: Jei dabar ne pavasaris (gegužė–gruodis) -> ramybės būsena
        if (!isSpringSeason()) {
            renderOffSeasonView(container);
            return;
        }

        // 5. JEI PAVASARIS: Paleidžiame gyvą radarą
        renderTSumRadarHtml(container);
        await calculateAndRenderFieldCards(userData);

    } catch (err) {
        console.error("T-Sum klaida:", err);
        showBottomToast("Nepavyko užkrauti T-Sum radaro duomenų", "error");
        container.innerHTML = `
            <div class="bg-tractorSurface border border-red-800 p-6 rounded-2xl text-center text-xs text-red-400">
                Nepavyko užkrauti T-Sum radaro duomenų: ${err.message}
            </div>
        `;
    }
}

/**
 * 🍂 BUDĖJIMO BŪSENA: Rodoma nesezono metu (nuo gegužės 1 d. iki gruodžio 31 d.)
 */
function renderOffSeasonView(container) {
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const daysUntilNextStart = getDaysUntilJan1();
    const nextYear = today.getFullYear() + 1;

    container.innerHTML = `
        <div class="space-y-6 max-w-5xl mx-auto w-full">
            
            <div class="bg-tractorSurface border-2 border-tractorBorder rounded-3xl p-7 md:p-10 shadow-2xl text-center space-y-6 relative overflow-hidden">
                <div class="space-y-2 max-w-2xl mx-auto">
                    <span class="text-5xl block animate-bounce">🍂</span>
                    <div class="inline-flex items-center gap-1.5 bg-amber-500/15 border border-amber-500/30 text-amber-500 text-xs px-3 py-1 rounded-full font-bold uppercase tracking-wider">
                        <span>💤</span> Radaras budi • Pavasario tręšimas neaktualus
                    </div>
                    <h3 class="font-oswald text-2xl md:text-3xl font-bold uppercase tracking-wider text-white">
                        Pavasario Vegetacijos Starto Radaras Budi
                    </h3>
                    <p class="text-xs md:text-sm text-slate-300 leading-relaxed">
                        Mokslinė <strong>„T-Sum 200 / 250“</strong> taisyklė taikoma griežtai <strong>nuo sausio 1 d. iki balandžio pabaigos</strong> pirmojo N1 salietros tręšimo langui nustatyti. 
                        Šiuo metu pavasarinis tręšimas neaktualus, o radaras automatiškai prabus ir pradės skaičiuoti laukų temperatūras <strong>${nextYear} m. sausio 1 d.</strong>
                    </p>
                </div>

                <!-- LAIKMATIS IKI SAUSIO 1 D. -->
                <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-xl mx-auto text-center pt-2">
                    <div class="bg-tractorBg p-4 rounded-2xl border border-tractorBorder space-y-0.5">
                        <span class="text-[10px] uppercase font-bold text-slate-400">Šiandienos data</span>
                        <strong class="font-mono text-base text-white block">${todayStr}</strong>
                    </div>
                    <div class="bg-tractorBg p-4 rounded-2xl border-2 border-tractorPrimary space-y-0.5">
                        <span class="text-[10px] uppercase font-bold text-tractorPrimaryLight">Iki naujo starto</span>
                        <strong class="font-mono text-2xl font-black text-green-400 block">${daysUntilNextStart} d.</strong>
                    </div>
                    <div class="bg-tractorBg p-4 rounded-2xl border border-tractorBorder space-y-0.5">
                        <span class="text-[10px] uppercase font-bold text-slate-400">Naujas skaičiavimas</span>
                        <strong class="font-mono text-base text-amber-400 block">${nextYear}-01-01</strong>
                    </div>
                </div>

                <div class="text-[11px] text-slate-500 max-w-md mx-auto pt-2 border-t border-tractorBorder/50">
                    Sekami visi <strong>${cachedFields.length} ūkio laukai</strong>. Pavasarį kiekvienam laukui bus atvaizduotas atskiras spidometras.
                </div>
            </div>

        </div>
    `;
}

/**
 * 🌾 GYVAS RADARO VAIZDAS (Aktyvus sausio 1 d. – balandžio 30 d.)
 */
function renderTSumRadarHtml(container) {
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    container.innerHTML = `
        <div class="space-y-6 max-w-6xl mx-auto w-full">
            
            <!-- ANTRAŠTĖ IR PAAIŠKINIMAS -->
            <div class="bg-tractorSurface border-2 border-tractorPrimary/60 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-5">
                <div class="space-y-1.5 flex-1">
                    <div class="inline-flex items-center gap-1.5 bg-green-500/15 border border-green-500/30 text-green-600 dark:text-green-400 text-xs px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider">
                        <span>🌡️</span> Agronominis „T-Sum“ Radaras
                    </div>
                    <h3 class="font-oswald text-2xl md:text-3xl font-bold uppercase tracking-wider text-white">
                        Pavasario Vegetacijos Startas ir N1 Tręšimas
                    </h3>
                    <p class="text-xs md:text-sm text-slate-300 leading-relaxed max-w-2xl">
                        Sekite, kada jūsų žiemkenčių šaknys nubunda ir pradeda siurbti azotą. Skaičiuojama teigiamų paros temperatūrų suma nuo sausio 1 d. 
                        <strong>Kviečiams: 200 °C</strong>, <strong>Rapsams: 250 °C</strong>.
                    </p>
                </div>

                <div class="flex flex-col sm:flex-row items-center gap-3 shrink-0">
                    <div class="bg-tractorBg border border-tractorBorder px-4 py-2 rounded-xl text-center">
                        <span class="text-[10px] text-slate-400 block uppercase font-bold">Data:</span>
                        <strong class="font-mono text-sm text-white font-bold">${todayStr}</strong>
                    </div>
                    <div class="bg-tractorBg border border-tractorBorder px-4 py-2 rounded-xl text-center">
                        <span class="text-[10px] text-slate-400 block uppercase font-bold">Sekami laukai:</span>
                        <strong class="font-mono text-sm text-green-400 font-bold">${cachedFields.length} vnt.</strong>
                    </div>
                </div>
            </div>

            <!-- FILTRAI -->
            <div class="flex flex-wrap items-center justify-between gap-3 bg-tractorSurface border border-tractorBorder p-3.5 rounded-2xl text-xs">
                <div class="flex items-center gap-2">
                    <span class="font-bold text-slate-300 uppercase tracking-wider text-[11px]">Rodyti:</span>
                    <button type="button" id="btn-filter-tsum-all" class="px-3 py-1.5 rounded-lg font-bold bg-tractorPrimary text-white shadow cursor-pointer transition">
                        Visi laukai (${cachedFields.length})
                    </button>
                    <button type="button" id="btn-filter-tsum-winter" class="px-3 py-1.5 rounded-lg font-bold text-slate-400 hover:text-white bg-tractorBg border border-tractorBorder cursor-pointer transition">
                        🌾 Tik žiemkenčiai
                    </button>
                </div>
                <div class="text-[11px] text-slate-400">
                    🟢 Žalia = pasiruošęs N1 • 🟡 Geltona = bunda • ⚪ Balta = pavasario sėja
                </div>
            </div>

            <!-- VISŲ LAUKŲ SPIDOMETRAI -->
            <div id="tsum-fields-grid" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div class="col-span-full py-10 text-center text-slate-500 text-xs">
                    Skaičiuojamos laukų temperatūros iš Open-Meteo...
                </div>
            </div>

        </div>
    `;

    document.getElementById('btn-filter-tsum-all')?.addEventListener('click', () => {
        setFilterActive('btn-filter-tsum-all');
        renderFieldCardsFiltered('all');
    });

    document.getElementById('btn-filter-tsum-winter')?.addEventListener('click', () => {
        setFilterActive('btn-filter-tsum-winter');
        renderFieldCardsFiltered('winter');
    });
}

function setFilterActive(activeId) {
    ['btn-filter-tsum-all', 'btn-filter-tsum-winter'].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            if (id === activeId) {
                el.className = "px-3 py-1.5 rounded-lg font-bold bg-tractorPrimary text-white shadow cursor-pointer transition";
            } else {
                el.className = "px-3 py-1.5 rounded-lg font-bold text-slate-400 hover:text-white bg-tractorBg border border-tractorBorder cursor-pointer transition";
            }
        }
    });
}

async function calculateAndRenderFieldCards(userData) {
    const grid = document.getElementById('tsum-fields-grid');
    if (!grid) return;

    for (let i = 0; i < cachedFields.length; i++) {
        const f = cachedFields[i];
        const coords = getFieldCenterCoords(f, userData);
        f._weatherData = await getOrFetchWeatherData(coords.lat, coords.lng);
    }

    renderFieldCardsFiltered('all');
}

function renderFieldCardsFiltered(filter) {
    const grid = document.getElementById('tsum-fields-grid');
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
        const targetTemp = isWinterRape(f.crop) ? 250 : 200;
        const weather = f._weatherData || { currentSum: 0, projectedDate: null };

        const currentSum = Math.round(weather.currentSum);
        const percent = Math.min(100, Math.round((currentSum / targetTemp) * 100));
        const diff = Math.max(0, targetTemp - currentSum);

        let statusBadge = '';
        let gaugeColor = '#3B82F6';

        if (!isWinter) {
            gaugeColor = '#64748B';
            statusBadge = `
                <span class="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
                    ⚪ Laukiama pavasario sėjos
                </span>
            `;
        } else if (currentSum >= targetTemp) {
            gaugeColor = '#22C55E';
            statusBadge = `
                <span class="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-green-500/20 text-green-400 border border-green-500/40 animate-pulse">
                    🟢 STARTAS PASIEKTAS! (N1)
                </span>
            `;
        } else if (percent >= 60) {
            gaugeColor = '#F59E0B';
            const dateText = weather.projectedDate ? `Kovo ${formatDay(weather.projectedDate)} d.` : '~7-10 d.';
            statusBadge = `
                <span class="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/40">
                    🟡 Bunda • Startas: ${dateText}
                </span>
            `;
        } else {
            gaugeColor = '#3B82F6';
            statusBadge = `
                <span class="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-blue-500/20 text-blue-400 border border-blue-500/40">
                    🔵 Miega (trūksta ${diff} °C)
                </span>
            `;
        }

        const svgGauge = createCircularGaugeSvg(currentSum, targetTemp, percent, gaugeColor, isWinter);

        return `
            <div class="bg-tractorSurface border border-tractorBorder hover:border-tractorPrimary/60 rounded-2xl p-5 shadow-lg space-y-3 transition flex flex-col justify-between">
                
                <div class="border-b border-tractorBorder/70 pb-3 flex items-start justify-between gap-2">
                    <div>
                        <h4 class="font-bold text-base text-white flex items-center gap-1.5">
                            <span>🌾</span> <span>${f.name}</span>
                        </h4>
                        <span class="text-xs text-slate-400">
                            Pasėlis: <strong class="text-slate-200">${f.crop || 'Žieminiai kviečiai'}</strong>
                        </span>
                    </div>
                    <span class="text-xs font-mono font-bold text-green-400 bg-tractorBg px-2 py-0.5 rounded border border-tractorBorder">
                        ${f.areaHa} ha
                    </span>
                </div>

                <div class="flex items-center justify-between gap-4 py-1">
                    <div class="shrink-0 flex items-center justify-center">
                        ${svgGauge}
                    </div>

                    <div class="space-y-1.5 flex-1 text-right">
                        <div>${statusBadge}</div>
                        
                        <div class="text-xs text-slate-300 pt-1">
                            <span class="text-slate-400 block text-[10px] uppercase font-bold">Sukaupta šiluma:</span>
                            <strong class="font-mono text-base text-white font-black">${currentSum} °C</strong> 
                            <span class="text-slate-500 font-mono text-[11px]">/ ${targetTemp} °C</span>
                        </div>

                        ${isWinter && diff > 0 ? `
                            <p class="text-[10px] text-slate-400">
                                Iki starto trūksta: <strong class="text-amber-400 font-bold">${diff} °C</strong>
                            </p>
                        ` : ''}
                    </div>
                </div>

                <div class="pt-2 border-t border-tractorBorder/60 text-[11px] text-slate-400 flex items-center justify-between">
                    <span>${isWinterRape(f.crop) ? 'Taisyklė: T-Sum 250 (Rapsas)' : isWinter ? 'Taisyklė: T-Sum 200 (Varpiniai)' : 'Pavasario kultūra'}</span>
                    <span class="text-green-500 font-bold">${isWinter && currentSum >= targetTemp ? 'Barstyti galima ✓' : isWinter ? 'Laukti starto' : '-'}</span>
                </div>

            </div>
        `;
    }).join('');
}

function createCircularGaugeSvg(current, target, percent, color, isWinter) {
    const size = 80;
    const strokeWidth = 7;
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (percent / 100) * circumference;

    return `
        <div class="relative flex items-center justify-center" style="width: ${size}px; height: ${size}px;">
            <svg class="transform -rotate-90" width="${size}" height="${size}">
                <circle cx="${size / 2}" cy="${size / 2}" r="${radius}" stroke="#2E382E" stroke-width="${strokeWidth}" fill="transparent" />
                <circle cx="${size / 2}" cy="${size / 2}" r="${radius}" stroke="${color}" stroke-width="${strokeWidth}" 
                    stroke-dasharray="${circumference}" stroke-dashoffset="${strokeDashoffset}" stroke-linecap="round" fill="transparent" />
            </svg>
            <div class="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span class="font-mono font-black text-xs text-white">${isWinter ? percent + '%' : '–'}</span>
                <span class="text-[8px] text-slate-400 uppercase font-bold leading-none">${isWinter ? 'T-Sum' : 'Sėja'}</span>
            </div>
        </div>
    `;
}

async function getOrFetchWeatherData(lat, lng) {
    const key = `${lat.toFixed(3)}_${lng.toFixed(3)}`;
    if (weatherCacheByCoords[key]) return weatherCacheByCoords[key];

    try {
        const today = new Date();
        const year = today.getFullYear();
        const jan1 = new Date(year, 0, 1);
        const diffDays = Math.ceil((today - jan1) / (1000 * 60 * 60 * 24));
        const pastDays = Math.min(diffDays, 92);

        const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&daily=temperature_2m_mean&past_days=${pastDays}&forecast_days=14&timezone=auto`;
        const res = await fetch(url);
        const data = await res.json();

        if (!data || !data.daily) {
            return { currentSum: 0, projectedDate: null };
        }

        const times = data.daily.time || [];
        const temps = data.daily.temperature_2m_mean || [];
        const todayStr = today.toISOString().split('T')[0];

        let sumNow = 0;
        let runningSum = 0;
        let projDate200 = null;

        for (let i = 0; i < times.length; i++) {
            const d = times[i];
            const t = temps[i];
            if (t > 0) {
                runningSum += t;
            }
            if (d <= todayStr) {
                sumNow = runningSum;
            }
            if (!projDate200 && runningSum >= 200) {
                projDate200 = d;
            }
        }

        const result = { currentSum: sumNow, projectedDate: projDate200 };
        weatherCacheByCoords[key] = result;
        return result;

    } catch (e) {
        console.error("Open-Meteo klaida:", e);
        return { currentSum: 0, projectedDate: null };
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

function isWinterRape(cropName) {
    const c = (cropName || "").toLowerCase();
    return c.includes("raps");
}

function formatDay(dateStr) {
    if (!dateStr) return '';
    return String(parseInt(dateStr.split('-')[2]));
}