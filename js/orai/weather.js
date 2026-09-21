// js/orai/weather.js
import { db } from '../core/firebase.js';
import { createCustomSelect } from '../core/customSelect.js';
import { openAuthModal } from '../core/auth.js';
import { switchTab, showBottomToast } from '../core/ui.js';
import { refreshSettingsMap } from '../sistema/settings.js';
import { renderTSumRadar } from '../ukis/tsumRadar.js';
import { renderWinterProtectionRadar } from './winterProtectionRadar.js';

let currentWeatherCoords = { lat: 54.6872, lng: 25.2797, name: "Nustatoma vieta..." };
let userFieldsList = [];
let cachedCurrentWeather = null;
let cachedHourlyWeather = null;
let cachedCurrentHourIdx = 0;
let activeHourlyMode = 'spray'; // 'spray', 'frost', 'tsum' arba 'mold'
let cachedCurrentUser = null;
let cachedUserData = null;

function navigateToSettings() {
    if (typeof switchTab === 'function' && document.getElementById('view-tab-settings')) {
        switchTab(9); // Nustatymai
        if (typeof refreshSettingsMap === 'function') refreshSettingsMap();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
        window.location.href = 'index.html?tab=9';
    }
}

export async function initWeatherTab(currentUser, userData) {
    const container = document.getElementById('view-tab-weather');
    if (!container) return;

    cachedCurrentUser = currentUser;
    cachedUserData = userData;

    const isLogged = !!currentUser;
    const hasGarage = !!(userData?.garageLat && userData?.garageLon && userData.garageLat !== 0);

    if (hasGarage) {
        currentWeatherCoords = {
            lat: parseFloat(userData.garageLat),
            lng: parseFloat(userData.garageLon),
            name: "Mano ūkio bazė (garažas)"
        };
    }

    container.innerHTML = `
        <div class="space-y-3.5 max-w-6xl mx-auto w-full">
            
            <!-- VIRŠUTINĖ VALDYMO JUOSTA -->
            <div id="weather-top-unified-card" class="bg-tractorSurface border border-tractorBorder rounded-2xl p-4 sm:p-5 shadow-sm space-y-3">
                
                <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5 border-b border-tractorBorder/70 pb-2.5">
                    <div class="space-y-0.5">
                        <div class="flex items-center gap-2">
                            <span class="text-xl sm:text-2xl">🌦️</span>
                            <h2 class="font-oswald text-lg sm:text-xl font-bold uppercase tracking-wider text-white">
                                Agro-Meteorologinis Valdymo Centras
                            </h2>
                        </div>
                        <p class="text-xs text-slate-400" id="weather-loc-label">
                            📍 Radaras nustatytas: <strong class="text-green-400 font-bold">${currentWeatherCoords.name}</strong> (${currentWeatherCoords.lat.toFixed(4)}, ${currentWeatherCoords.lng.toFixed(4)})
                        </p>
                    </div>

                    <!-- GLOBALŪS FILTRAI: LAUKO PARINKIKLIS IR GPS (VIENOJE EILUTĖJE NET IR TELEFONE) -->
                    <div class="flex flex-nowrap items-center gap-2 w-full lg:w-auto">
                        <div id="weather-field-select-box" class="flex-1 sm:w-64 min-w-0"></div>
                        <button id="btn-weather-gps" style="background-color: #2E7D32 !important; color: #FFFFFF !important;" class="h-10 px-3 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 shadow transition cursor-pointer shrink-0 hover:opacity-90">
                            <span>📡</span> <span>GPS</span>
                        </button>
                    </div>
                </div>

                ${!isLogged || !hasGarage ? `
                    <div class="p-3 bg-tractorBg border border-tractorPrimary rounded-xl shadow-sm">
                        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div class="text-xs text-slate-200">
                                <strong class="text-green-400 block sm:inline">Norite 100% tikslių lauko prognozių?</strong>
                                <span> Pažymėkite ūkio bazę Nustatymuose, kad visi orų modeliai skaičiuotųsi tiesiai virš jūsų sklypų.</span>
                            </div>
                            <button type="button" id="btn-weather-farm-prompt" class="px-3 py-1 bg-tractorPrimary hover:bg-tractorPrimaryHover text-white font-black rounded-lg text-xs uppercase tracking-wider shrink-0 transition">
                                ${!isLogged ? '🔑 Prisijungti' : '📍 Nurodyti kiemą ➔'}
                            </button>
                        </div>
                    </div>
                ` : ''}

                <!-- 🌟 4 KPI METRIC TABAI (KOMPAKTIŠKA SEGMENTUOTA JUOSTA - VISI 4 TELPA Į 1 EILUTĘ) -->
                <div class="space-y-1.5">
                    <div class="flex items-center justify-between text-[11px] text-slate-400 px-0.5">
                        <span class="font-bold uppercase tracking-wider">Pasirinkite stebimą grėsmę (Radarą):</span>
                    </div>

                    <div class="grid grid-cols-4 gap-1 sm:gap-1.5 p-1 bg-tractorBg border border-tractorBorder rounded-xl" id="agro-dashboard-widgets">
                        
                        <!-- 1 TABAS: PURŠKIMAS -->
                        <div id="card-mode-spray" class="agro-dash-card relative py-2 px-1 sm:px-2 rounded-lg cursor-pointer select-none transition-all flex items-center justify-center gap-1 text-[11px] sm:text-xs font-bold leading-none truncate" data-mode="spray">
                            <span class="text-sm">💦</span> <span class="truncate">Purškimas</span>
                        </div>

                        <!-- 2 TABAS: ĮŠALAS -->
                        <div id="card-mode-frost" class="agro-dash-card relative py-2 px-1 sm:px-2 rounded-lg cursor-pointer select-none transition-all flex items-center justify-center gap-1 text-[11px] sm:text-xs font-bold leading-none truncate" data-mode="frost">
                            <span class="text-sm">❄️</span> <span class="truncate">Įšalas</span>
                        </div>

                        <!-- 3 TABAS: T-SUM -->
                        <div id="card-mode-tsum" class="agro-dash-card relative py-2 px-1 sm:px-2 rounded-lg cursor-pointer select-none transition-all flex items-center justify-center gap-1 text-[11px] sm:text-xs font-bold leading-none truncate" data-mode="tsum">
                            <span class="text-sm">🌱</span> <span class="truncate">T-Sum</span>
                        </div>

                        <!-- 4 TABAS: PELĖSIS IR PLUTA -->
                        <div id="card-mode-mold" class="agro-dash-card relative py-2 px-1 sm:px-2 rounded-lg cursor-pointer select-none transition-all flex items-center justify-center gap-1 text-[11px] sm:text-xs font-bold leading-none truncate" data-mode="mold">
                            <span class="text-sm">🧊</span> 
                            <span class="truncate">
                                <span class="sm:hidden">Pelėsis</span>
                                <span class="hidden sm:inline">Pelėsis & pluta</span>
                            </span>
                        </div>

                    </div>
                </div>

            </div>

            <!-- KOMPAKTIŠKA VERDIKTO JUOSTA -->
            <div id="live-spray-inner-box" class="transition-all">
                <div class="text-center py-4 text-slate-400 text-xs">Kraunami duomenys...</div>
            </div>

            <!-- 2. T-SUM VISŲ LAUKŲ RADARAS -->
            <div id="weather-tsum-container" class="hidden space-y-3"></div>

            <!-- 3. SNIEGO PELĖSIO IR LEDO PLUTOS RADARAS -->
            <div id="weather-mold-container" class="hidden space-y-3"></div>

            <!-- 🌟 4. VALANDINĖ PROGNOZĖ -->
            <div id="weather-hourly-card" class="bg-tractorSurface border border-tractorBorder rounded-2xl p-3.5 sm:p-4 shadow-sm space-y-2.5">
                <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-tractorBorder/70 pb-2">
                    <div class="flex items-center gap-2">
                        <span class="text-base sm:text-lg">⏱️</span>
                        <h3 class="font-oswald text-base sm:text-lg font-bold text-white uppercase tracking-wider" id="hourly-forecast-heading">
                            Prognozė (Artimiausios 48 val.)
                        </h3>
                    </div>
                    <span class="text-[11px] text-slate-400 font-medium" id="hourly-forecast-subheading"></span>
                </div>

                <div id="hourly-forecast-grid" class="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 2xl:grid-cols-12 gap-2 sm:gap-2.5 pt-1">
                    <div class="text-center py-6 text-slate-500 text-xs col-span-full">Kraunamas valandinis modelis...</div>
                </div>
            </div>

            <!-- 5. AGRONOMINĖS REKOMENDACIJOS -->
            <div class="grid grid-cols-1 md:grid-cols-3 gap-3" id="soil-and-agri-conditions"></div>

        </div>
    `;

    if (hasGarage) {
        updateLocationLabel();
        fetchAgroWeatherData();
    } else {
        resolveAutoLocation();
    }

    setupDashboardCardClicks();

    const btnPrompt = document.getElementById('btn-weather-farm-prompt');
    if (btnPrompt) {
        btnPrompt.onclick = () => {
            if (!isLogged) openAuthModal('login');
            else navigateToSettings();
        };
    }

    document.getElementById('btn-weather-gps')?.addEventListener('click', () => {
        if (navigator.geolocation) {
            const btn = document.getElementById('btn-weather-gps');
            btn.textContent = "📡...";
            navigator.geolocation.getCurrentPosition((pos) => {
                currentWeatherCoords = {
                    lat: pos.coords.latitude,
                    lng: pos.coords.longitude,
                    name: "Tiksli dabartinė GPS vieta"
                };
                btn.textContent = "✅ GPS";
                updateLocationLabel();
                fetchAgroWeatherData();
            }, () => {
                btn.textContent = "📡 GPS";
                showBottomToast("Nepavyko nustatyti GPS vietos.", "error"); // 👈 Pakeista į Toast
            });
        }
    });

    loadFieldsToSelect(currentUser, userData);
}

function setupDashboardCardClicks() {
    ['spray', 'frost', 'tsum', 'mold'].forEach(mode => {
        const card = document.getElementById(`card-mode-${mode}`);
        if (card) {
            card.onclick = () => {
                activeHourlyMode = mode;
                updateModeUI();
            };
        }
    });
}

function updateModeUI() {
    const modes = ['spray', 'frost', 'tsum', 'mold'];
    modes.forEach(mode => {
        const card = document.getElementById(`card-mode-${mode}`);
        if (!card) return;

        if (activeHourlyMode === mode) {
            // Segmented Pill - Aktyvus stilius
            card.className = "agro-dash-card relative py-2 px-1 sm:px-2 rounded-lg cursor-pointer select-none transition-all flex items-center justify-center gap-1 text-[11px] sm:text-xs font-bold leading-none truncate bg-tractorPrimary text-white shadow-sm ring-1 ring-tractorPrimary";
        } else {
            // Segmented Pill - Neaktyvus stilius
            card.className = "agro-dash-card relative py-2 px-1 sm:px-2 rounded-lg cursor-pointer select-none transition-all flex items-center justify-center gap-1 text-[11px] sm:text-xs font-semibold leading-none truncate text-slate-400 hover:text-white hover:bg-white/5";
        }
    });

    const sprayBox = document.getElementById('live-spray-inner-box');
    const tsumContainer = document.getElementById('weather-tsum-container');
    const moldContainer = document.getElementById('weather-mold-container');
    const hourlyCard = document.getElementById('weather-hourly-card');
    const agriConditions = document.getElementById('soil-and-agri-conditions');

    if (activeHourlyMode === 'tsum') {
        if (sprayBox) sprayBox.classList.add('hidden');
        if (hourlyCard) hourlyCard.classList.add('hidden');
        if (agriConditions) agriConditions.classList.add('hidden');
        if (moldContainer) moldContainer.classList.add('hidden');

        if (tsumContainer) {
            tsumContainer.classList.remove('hidden');
            renderTSumRadar(tsumContainer, cachedCurrentUser, cachedUserData);
        }
    } else if (activeHourlyMode === 'mold') {
        if (sprayBox) sprayBox.classList.add('hidden');
        if (hourlyCard) hourlyCard.classList.add('hidden');
        if (agriConditions) agriConditions.classList.add('hidden');
        if (tsumContainer) tsumContainer.classList.add('hidden');

        if (moldContainer) {
            moldContainer.classList.remove('hidden');
            renderWinterProtectionRadar(moldContainer, cachedCurrentUser, cachedUserData);
        }
    } else {
        if (tsumContainer) tsumContainer.classList.add('hidden');
        if (moldContainer) moldContainer.classList.add('hidden');
        if (sprayBox) sprayBox.classList.remove('hidden');
        if (hourlyCard) hourlyCard.classList.remove('hidden');
        if (agriConditions) agriConditions.classList.remove('hidden');

        if (cachedCurrentWeather && cachedHourlyWeather) {
            if (activeHourlyMode === 'frost') {
                renderWinterFrostRadar();
            } else {
                renderLiveSprayStatus(cachedCurrentWeather, cachedHourlyWeather, cachedCurrentHourIdx);
            }
            updateHourlyGrid();
        }
    }
}

function updateDashboardSummaryWidgets(current, hourly, currentIdx) {
    // Palikta dėl suderinamumo
}

async function resolveAutoLocation() {
    try {
        const res = await fetch("https://ipapi.co/json/", { timeout: 3000 });
        const data = await res.json();
        if (data && data.latitude && data.longitude) {
            currentWeatherCoords = {
                lat: data.latitude,
                lng: data.longitude,
                name: `Apytikslė vieta (${data.city || 'Lietuva'})`
            };
            updateLocationLabel();
            fetchAgroWeatherData();
            return;
        }
    } catch (e) {
        console.warn("IP lokacijos klaida:", e);
    }

    currentWeatherCoords = { lat: 54.6872, lng: 25.2797, name: "Vilnius (numatytoji)" };
    updateLocationLabel();
    fetchAgroWeatherData();
}

function updateLocationLabel() {
    const lbl = document.getElementById('weather-loc-label');
    if (lbl) {
        lbl.innerHTML = `📍 Radaras nustatytas: <strong class="text-green-400 font-bold">${currentWeatherCoords.name}</strong> (${currentWeatherCoords.lat.toFixed(4)}, ${currentWeatherCoords.lng.toFixed(4)})`;
    }
}

function loadFieldsToSelect(currentUser, userData) {
    const isLogged = !!currentUser;
    const hasGarage = !!(userData?.garageLat && userData?.garageLon && userData.garageLat !== 0);

    const selectItems = [];

    if (isLogged && hasGarage) {
        selectItems.push({ id: 'garage', name: '🏠 Mano ūkio bazė (garažas)', icon: '🏠', subtext: 'Iš Nustatymų' });
    } else {
        selectItems.push({
            id: 'setup_prompt',
            name: isLogged ? '🏠 Mano ūkio bazė (Nurodyti vietą)' : '🏠 Mano ūkio bazė (Prisijunkite)',
            icon: '🏠',
            subtext: isLogged ? 'Spauskite vietos pažymėjimui' : 'Prisijunkite ūkio parinkimui'
        });
    }

    const initSelect = () => {
        createCustomSelect({
            containerId: 'weather-field-select-box',
            placeholder: 'Pasirinkite lauką...',
            items: selectItems,
            selectedId: hasGarage ? 'garage' : 'setup_prompt',
            onSelect: (item) => {
                if (!item) return;

                if (item.id === 'setup_prompt') {
                    if (!isLogged) openAuthModal('login');
                    else navigateToSettings();
                    return;
                }

                if (item.id === 'garage') {
                    currentWeatherCoords = {
                        lat: parseFloat(userData.garageLat),
                        lng: parseFloat(userData.garageLon),
                        name: "Mano ūkio bazė (garažas)"
                    };
                } else {
                    const chosenField = userFieldsList.find(f => f.id === item.id);
                    if (chosenField && chosenField.polygonCoordinates && chosenField.polygonCoordinates.length > 0) {
                        const firstPt = chosenField.polygonCoordinates[0];
                        const lat = Array.isArray(firstPt) ? parseFloat(firstPt[0]) : parseFloat(firstPt.lat);
                        const lng = Array.isArray(firstPt) ? parseFloat(firstPt[1]) : parseFloat(firstPt.lng);

                        currentWeatherCoords = {
                            lat: lat,
                            lng: lng,
                            name: `Laukas „${chosenField.name}“ (${chosenField.areaHa} ha)`
                        };
                    }
                }
                updateLocationLabel();
                fetchAgroWeatherData();
            }
        });
    };

    if (isLogged) {
        db.collection("user_fields").where("userId", "==", currentUser.uid).get().then(snap => {
            userFieldsList = [];
            snap.forEach(doc => {
                const f = doc.data();
                userFieldsList.push(f);
                selectItems.push({
                    id: f.id,
                    name: f.name,
                    icon: '🌾',
                    subtext: `${f.areaHa} ha, ${f.crop}`
                });
            });
            initSelect();
        });
    } else {
        initSelect();
    }
}

async function fetchAgroWeatherData() {
    const { lat, lng } = currentWeatherCoords;
    const apiUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,relative_humidity_2m,precipitation,rain,snowfall,weather_code,wind_speed_10m,wind_gusts_10m,soil_temperature_0cm,soil_temperature_6cm,soil_temperature_18cm&hourly=temperature_2m,relative_humidity_2m,precipitation_probability,rain,snowfall,snow_depth,wind_speed_10m,wind_gusts_10m,soil_temperature_0cm,soil_temperature_6cm,soil_temperature_18cm&timezone=Europe%2FVilnius&forecast_days=3`;

    try {
        const response = await fetch(apiUrl);
        const data = await response.json();

        cachedCurrentWeather = data.current;
        cachedHourlyWeather = data.hourly;
        cachedCurrentHourIdx = findCurrentHourIndex(data.hourly);

        updateModeUI();
        renderSoilConditions(data.current, data.hourly);
    } catch (error) {
        console.error("Orų klaida:", error);
    }
}

function findCurrentHourIndex(hourly) {
    if (!hourly || !hourly.time) return 0;
    const now = new Date();

    for (let i = 0; i < hourly.time.length; i++) {
        const itemDate = new Date(hourly.time[i]);
        if (itemDate.getDate() === now.getDate() && itemDate.getHours() === now.getHours()) {
            return i;
        }
    }
    return 0;
}

function renderWinterFrostRadar() {
    const box = document.getElementById('live-spray-inner-box');
    if (!box || !cachedCurrentWeather) return;

    const airTemp = parseFloat(cachedCurrentWeather.temperature_2m.toFixed(1));
    const soil0cm = parseFloat((cachedCurrentWeather.soil_temperature_0cm !== undefined ? cachedCurrentWeather.soil_temperature_0cm : 0).toFixed(1));
    const soil6cm = parseFloat((cachedCurrentWeather.soil_temperature_6cm !== undefined ? cachedCurrentWeather.soil_temperature_6cm : 0).toFixed(1));
    
    const rawSnowMeters = (cachedHourlyWeather.snow_depth && cachedHourlyWeather.snow_depth.length > cachedCurrentHourIdx) 
        ? cachedHourlyWeather.snow_depth[cachedCurrentHourIdx] 
        : 0;
    const snowCm = Math.max(0, Math.round((rawSnowMeters || 0) * 100));

    let frostDepthCmText = "Atitirpusi";
    let statusTitle = "🟢 SAUGU (Pasėliams pavojaus nėra)";
    let borderColor = "border-green-500/40";
    let bgColor = "bg-green-500/10";

    if (soil6cm <= -9.0) {
        statusTitle = "🚨 KRITINIS IŠŠALIMAS (Mazgas ≤ -9°C)";
        borderColor = "border-red-600";
        bgColor = "bg-red-600/20";
        frostDepthCmText = "Gilus įšalas";
    } else if (airTemp < -12.0 && snowCm < 3) {
        statusTitle = "🔴 PAVOJUS: PLIKŠALIS BE SNIEGO!";
        borderColor = "border-red-500";
        bgColor = "bg-red-500/20";
        frostDepthCmText = "~10 cm";
    } else if (soil0cm < 0) {
        frostDepthCmText = "Paviršinis 3cm";
    }

    const isManureForbidden = (soil0cm < 0 || snowCm > 0);

    box.className = `${bgColor} border ${borderColor} rounded-xl p-2.5 sm:p-3 shadow-sm transition-all flex flex-col md:flex-row md:items-center justify-between gap-2 text-xs`;
    box.innerHTML = `
        <div class="flex items-center gap-2 flex-wrap">
            <strong class="font-bold text-sm" style="color: var(--text-main);">${statusTitle}</strong>
            <span class="text-slate-400 hidden sm:inline">•</span>
            <span class="text-[11px] text-slate-300">Temperatūra augimo mazge yra saugi žiemojimui.</span>
        </div>

        <div class="flex items-center gap-1.5 flex-wrap shrink-0">
            <span class="bg-tractorSurface px-2 py-0.5 rounded-md font-mono text-[11px] border border-tractorBorder">
                🌱 Mazgas: <strong class="${soil6cm < 0 ? 'text-blue-400' : 'text-green-500'}">${soil6cm > 0 ? '+' : ''}${soil6cm}°C</strong>
            </span>
            <span class="bg-tractorSurface px-2 py-0.5 rounded-md font-mono text-[11px] border border-tractorBorder">
                ❄️ Sniegas: <strong>${snowCm} cm</strong>
            </span>
            <span class="bg-tractorSurface px-2 py-0.5 rounded-md font-mono text-[11px] border border-tractorBorder">
                🧊 Įšalas: <strong>${frostDepthCmText}</strong>
            </span>
            <span class="bg-tractorSurface px-2 py-0.5 rounded-md text-[11px] font-bold border border-tractorBorder ${isManureForbidden ? 'text-red-400' : 'text-green-500'}">
                💩 Mėšlas: ${isManureForbidden ? 'Draudžiama' : 'Galima'}
            </span>
        </div>
    `;
}

function updateHourlyGrid() {
    const grid = document.getElementById('hourly-forecast-grid');
    const heading = document.getElementById('hourly-forecast-heading');
    const subheading = document.getElementById('hourly-forecast-subheading');

    if (!grid || !cachedHourlyWeather || !cachedHourlyWeather.time) return;

    if (activeHourlyMode === 'frost') {
        heading.textContent = "Žiemkenčių Šalčio ir Įšalo Langas (48 val.)";
        subheading.textContent = "Mobiliajame: 3 į eilutę • Kompiuteryje: iki 12";
    } else {
        heading.textContent = "Purškimo Lango Prognozė (Artimiausios 48 val.)";
        subheading.textContent = "Mobiliajame: 3 į eilutę • Kompiuteryje: iki 12";
    }

    const items = [];
    const maxItems = Math.min(cachedHourlyWeather.time.length, cachedCurrentHourIdx + 36);

    for (let i = cachedCurrentHourIdx; i < maxItems; i++) {
        const timeStr = cachedHourlyWeather.time[i];
        const dateObj = new Date(timeStr);
        const hour = dateObj.getHours();
        const dayName = dateObj.toLocaleDateString('lt-LT', { weekday: 'short' });
        const isCurrentHour = i === cachedCurrentHourIdx;

        const windSpeedMs = parseFloat((cachedHourlyWeather.wind_speed_10m[i] / 3.6).toFixed(1));
        const windGustsMs = parseFloat((cachedHourlyWeather.wind_gusts_10m[i] / 3.6).toFixed(1));
        const tempC = Math.round(cachedHourlyWeather.temperature_2m[i]);
        const soil6cm = parseFloat((cachedHourlyWeather.soil_temperature_6cm?.[i] || 12).toFixed(1));
        const rawSnow = (cachedHourlyWeather.snow_depth?.[i] || 0);
        const snowCm = Math.round(rawSnow * 100);

        if (activeHourlyMode === 'frost') {
            let frostBadge = "Saugu";
            let frostBadgeClass = "bg-green-500/20 text-green-600 dark:text-green-400 border border-green-500/40";

            if (soil6cm <= -9.0) {
                frostBadge = "Iššalimas";
                frostBadgeClass = "bg-red-700 text-white border-red-800 animate-pulse";
            } else if (tempC <= -12 && snowCm < 3) {
                frostBadge = "Plikšalis";
                frostBadgeClass = "bg-red-600 text-white border-red-700";
            } else if (tempC < 0 && snowCm < 2) {
                frostBadge = "Šalna";
                frostBadgeClass = "bg-amber-500/20 text-amber-500 border-amber-500/40";
            }

            items.push(`
                <div class="bg-tractorBg border ${isCurrentHour ? 'border-blue-500 ring-2 ring-blue-500' : 'border-tractorBorder'} rounded-xl p-2 sm:p-3 text-center space-y-1 sm:space-y-1.5 flex flex-col justify-between transition hover:border-slate-400 select-none">
                    
                    <div class="flex items-center justify-between border-b border-tractorBorder/60 pb-1 text-[10px] sm:text-xs font-bold leading-none">
                        <span class="text-slate-400 uppercase font-black truncate">${isCurrentHour ? 'DABAR' : dayName}</span>
                        <strong class="font-mono font-black" style="color: var(--text-main);">${String(hour).padStart(2, '0')}:00</strong>
                    </div>

                    <div class="text-[10px] sm:text-xs font-bold ${frostBadgeClass} py-0.5 sm:py-1 px-1 rounded-md border flex items-center justify-center leading-none truncate">
                        ${frostBadge}
                    </div>

                    <div class="font-black font-mono text-xs sm:text-sm whitespace-nowrap leading-tight ${tempC < 0 ? 'text-blue-400' : 'text-slate-800 dark:text-slate-100'}">
                        🌡️ ${tempC > 0 ? '+' : ''}${tempC}°C
                    </div>

                    <div class="space-y-0.5 sm:space-y-1 text-[9px] sm:text-xs font-mono pt-1 border-t border-tractorBorder/50 text-slate-300 leading-tight">
                        <div class="flex items-center justify-between">
                            <span class="text-slate-400">🌱 Mazgas:</span>
                            <strong class="${soil6cm < 0 ? 'text-blue-400 font-black' : 'text-green-600 dark:text-green-400 font-bold'}">${soil6cm > 0 ? '+' : ''}${soil6cm}°C</strong>
                        </div>
                        <div class="flex items-center justify-between">
                            <span class="text-slate-400">❄️ Sniegas:</span>
                            <strong class="text-slate-800 dark:text-white font-bold">${snowCm} cm</strong>
                        </div>
                    </div>

                </div>
            `);

        } else {
            const rainProb = cachedHourlyWeather.precipitation_probability?.[i] || 0;
            const rainMm = cachedHourlyWeather.rain ? cachedHourlyWeather.rain[i] : 0;
            const evalResult = evaluateSprayCondition(windSpeedMs, windGustsMs, tempC, rainProb, rainMm);

            items.push(`
                <div class="bg-tractorBg border ${isCurrentHour ? 'border-tractorPrimary ring-2 ring-tractorPrimary' : 'border-tractorBorder'} rounded-xl p-2 sm:p-3 text-center space-y-1 sm:space-y-1.5 flex flex-col justify-between transition hover:border-slate-400 select-none">
                    
                    <div class="flex items-center justify-between border-b border-tractorBorder/60 pb-1 text-[10px] sm:text-xs font-bold leading-none">
                        <span class="text-slate-400 uppercase font-black truncate">${isCurrentHour ? 'DABAR' : dayName}</span>
                        <strong class="font-mono font-black" style="color: var(--text-main);">${String(hour).padStart(2, '0')}:00</strong>
                    </div>

                    <div class="text-[10px] sm:text-xs font-bold ${evalResult.badgeClass} py-0.5 sm:py-1 px-1 rounded-md border flex items-center justify-center gap-1 leading-none truncate">
                        <span>${evalResult.icon}</span> <span>${evalResult.text}</span>
                    </div>

                    <div class="space-y-0.5 py-0.5 leading-tight">
                        <div class="text-xs sm:text-sm font-black font-mono whitespace-nowrap" style="color: var(--text-main);">
                            💨 ${windSpeedMs} m/s
                        </div>
                        <div class="text-[9px] sm:text-[11px] text-slate-400 font-mono whitespace-nowrap">
                            gūs. ${windGustsMs} m/s
                        </div>
                    </div>

                    <div class="flex items-center justify-between text-[10px] sm:text-xs font-mono font-bold pt-1 border-t border-tractorBorder/50 leading-none" style="color: var(--text-main);">
                        <span>🌡️ ${tempC > 0 ? '+' : ''}${tempC}°C</span>
                        <span class="${rainProb > 40 ? 'text-amber-500 font-black' : 'text-slate-400'}">💧 ${rainProb}%</span>
                    </div>

                </div>
            `);
        }
    }

    grid.innerHTML = items.join('');
}

function evaluateSprayCondition(windSpeedMs, windGustsMs, tempC, rainProb, rainMm) {
    const redReasons = [];
    const yellowReasons = [];

    if (tempC < 5) redReasons.push(`Per šalta (+${tempC}°C)`);
    if (windSpeedMs > 4.5) redReasons.push(`Stiprus vėjas (${windSpeedMs} m/s)`);
    if (windGustsMs > 6.0) redReasons.push(`Pavojingi gūsiai (${windGustsMs} m/s)`);
    if (rainMm > 0.1) redReasons.push(`Lietus (${rainMm} mm)`);
    if (tempC > 25) redReasons.push(`Per karšta (+${tempC}°C)`);

    if (redReasons.length > 0) {
        return { status: 'red', icon: '🔴', text: 'Netinka', badgeClass: 'bg-red-500/20 text-red-600 border-red-500/40', reasons: redReasons };
    }

    if (rainProb > 40 && rainMm <= 0.1) yellowReasons.push(`Lietus (${rainProb}%)`);
    if (windSpeedMs > 3.0) yellowReasons.push(`Vėjas ant ribos (${windSpeedMs} m/s)`);
    if (tempC > 22) yellowReasons.push(`Garavimas (+${tempC}°C)`);

    if (yellowReasons.length > 0) {
        return { status: 'yellow', icon: '🟡', text: 'Rizika', badgeClass: 'bg-amber-500/20 text-amber-600 border-amber-500/40', reasons: yellowReasons };
    }

    return { status: 'green', icon: '🟢', text: 'Tinka', badgeClass: 'bg-green-500/20 text-green-600 border-green-500/40', reasons: [] };
}

function renderLiveSprayStatus(current, hourly, currentIdx) {
    const liveCard = document.getElementById('live-spray-inner-box');
    if (!liveCard || !current) return;

    const windSpeedMs = parseFloat((hourly.wind_speed_10m[currentIdx] / 3.6).toFixed(1));
    const windGustsMs = parseFloat((hourly.wind_gusts_10m[currentIdx] / 3.6).toFixed(1));
    const tempC = parseFloat(hourly.temperature_2m[currentIdx].toFixed(1));
    const humidity = hourly.relative_humidity_2m[currentIdx];
    const rainMm = hourly.rain ? hourly.rain[currentIdx] : (current.rain || 0);
    const currentRainProb = (hourly.precipitation_probability && hourly.precipitation_probability.length > currentIdx) ? hourly.precipitation_probability[currentIdx] : 0;
    const soil0cm = (current.soil_temperature_0cm || 0).toFixed(1);

    const evaluation = evaluateSprayCondition(windSpeedMs, windGustsMs, tempC, currentRainProb, rainMm);

    let statusTitle = "🟢 ŠIUO METU PURKŠTI GALIMA";
    let shortReason = "Optimalus langas: vėjas ir temperatūra tinkami";
    let borderColor = "border-green-500/40";
    let bgColor = "bg-green-500/10";

    if (tempC < 5) {
        statusTitle = "❄️ PURŠKIMAS NEVYKDOMAS";
        shortReason = `Per šalta (+${tempC}°C < 5°C), preparatai neveikia`;
        borderColor = "border-blue-500/40";
        bgColor = "bg-blue-500/10";
    } else if (evaluation.status === 'red') {
        statusTitle = "🔴 ŠIUO METU PURKŠTI DRAUDŽIAMA";
        shortReason = evaluation.reasons.join(', ');
        borderColor = "border-red-500/40";
        bgColor = "bg-red-500/10";
    } else if (evaluation.status === 'yellow') {
        statusTitle = "🟡 SĄLYGOS RIZIKINGOS";
        shortReason = evaluation.reasons.join(', ');
        borderColor = "border-amber-500/40";
        bgColor = "bg-amber-500/10";
    }

    liveCard.className = `${bgColor} border ${borderColor} rounded-xl p-2.5 sm:p-3 shadow-sm transition-all flex flex-col md:flex-row md:items-center justify-between gap-2 text-xs`;
    liveCard.innerHTML = `
        <div class="flex items-center gap-2 flex-wrap">
            <strong class="font-bold text-sm" style="color: var(--text-main);">${statusTitle}</strong>
            <span class="text-slate-400 hidden sm:inline">•</span>
            <span class="text-[11px] text-slate-300 font-medium">${shortReason}</span>
        </div>

        <div class="flex items-center gap-1.5 flex-wrap shrink-0">
            <span class="bg-tractorSurface px-2 py-0.5 rounded-md font-mono text-[11px] border border-tractorBorder">
                💨 Vėjas: <strong class="${windSpeedMs > 4.5 ? 'text-red-500' : 'text-green-500'}">${windSpeedMs} m/s</strong> (gūs. ${windGustsMs})
            </span>
            <span class="bg-tractorSurface px-2 py-0.5 rounded-md font-mono text-[11px] border border-tractorBorder">
                💧 Lietus: <strong>${rainMm} mm</strong> (${currentRainProb}%)
            </span>
            <span class="bg-tractorSurface px-2 py-0.5 rounded-md font-mono text-[11px] border border-tractorBorder">
                🌡️ Oras: <strong>${tempC > 0 ? '+' : ''}${tempC}°C</strong>
            </span>
            <span class="bg-tractorSurface px-2 py-0.5 rounded-md font-mono text-[11px] border border-tractorBorder">
                🌫️ Drėgmė: <strong>${humidity}%</strong>
            </span>
            <span class="bg-tractorSurface px-2 py-0.5 rounded-md font-mono text-[11px] border border-tractorBorder">
                🌱 Dirva: <strong>${soil0cm > 0 ? '+' : ''}${soil0cm}°C</strong>
            </span>
        </div>
    `;
}

function renderSoilConditions(current, hourly) {
    const soilBox = document.getElementById('soil-and-agri-conditions');
    if (!soilBox) return;

    soilBox.innerHTML = `
        <div class="bg-tractorSurface border border-tractorBorder rounded-xl p-2.5 sm:p-3 shadow-sm space-y-1 text-xs">
            <span class="font-bold text-tractorPrimaryLight uppercase tracking-wider block text-[10px]">🌾 Sėja ir vegetacija</span>
            <p class="text-[11px] leading-relaxed" style="color: var(--text-muted);">
                Miežiams reikalinga bent <strong>+6°C</strong>, žirniams ir kukurūzams – bent <strong>+8°C</strong> dirvos temperatūra.
            </p>
        </div>
        <div class="bg-tractorSurface border border-tractorBorder rounded-xl p-2.5 sm:p-3 shadow-sm space-y-1 text-xs">
            <span class="font-bold text-amber-500 uppercase tracking-wider block text-[10px]">📜 Purškimo taisyklės</span>
            <p class="text-[11px] leading-relaxed" style="color: var(--text-muted);">
                Pagal LR ŽŪM reikalavimus, purkšti draudžiama esant vėjui <strong>> 3.0 m/s</strong> (su antilašiniais IDN – <strong>> 4.5 m/s</strong>).
            </p>
        </div>
        <div class="bg-tractorSurface border border-tractorBorder rounded-xl p-2.5 sm:p-3 shadow-sm space-y-1 text-xs">
            <span class="font-bold text-blue-500 uppercase tracking-wider block text-[10px]">❄️ Žiemkenčių apsauga</span>
            <p class="text-[11px] leading-relaxed" style="color: var(--text-muted);">
                Rapsai žūsta mazgo gylyje pasiekus <strong>-8°C</strong>, kviečiai – iki <strong>-14°C</strong>. Sniegas (>5 cm) pilnai apsaugo pasėlius.
            </p>
        </div>
    `;
}