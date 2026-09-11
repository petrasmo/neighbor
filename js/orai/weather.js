// js/orai/weather.js
import { db } from '../core/firebase.js';
import { createCustomSelect } from '../core/customSelect.js';
import { openAuthModal } from '../core/auth.js';
import { switchTab } from '../core/ui.js';
import { refreshSettingsMap } from '../sistema/settings.js';

let currentWeatherCoords = { lat: 54.6872, lng: 25.2797, name: "Nustatoma vieta..." };
let userFieldsList = [];
let cachedCurrentWeather = null;
let cachedHourlyWeather = null;
let cachedCurrentHourIdx = 0;
let activeHourlyMode = 'spray'; // 'spray' arba 'frost'

function navigateToSettings() {
    if (typeof switchTab === 'function' && document.getElementById('view-tab-settings')) {
        switchTab(9); // Nustatymai pagal naują indeksą
        if (typeof refreshSettingsMap === 'function') refreshSettingsMap();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
        window.location.href = 'index.html?tab=9';
    }
}

export function initWeatherTab(currentUser, userData) {
    const container = document.getElementById('view-tab-weather');
    if (!container) return;

    const isLogged = !!currentUser;
    const hasGarage = !!(userData?.garageLat && userData?.garageLon && userData.garageLat !== 0);

    if (hasGarage) {
        currentWeatherCoords = {
            lat: parseFloat(userData.garageLat),
            lng: parseFloat(userData.garageLon),
            name: "Mano ūkio bazė (garažas)"
        };
        updateLocationLabel();
        fetchAgroWeatherData();
    } else {
        resolveAutoLocation();
    }

    container.innerHTML = `
        <div class="space-y-6 max-w-6xl mx-auto w-full">
            
            <!-- 1. VIENTISA VIRŠUTINĖ KORTELĖ (VIETA + REŽIMO PASIRINKIMAS) -->
            <div id="weather-top-unified-card" class="bg-tractorSurface border border-tractorBorder rounded-2xl p-6 md:p-7 shadow-xl space-y-5">
                
                <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-tractorBorder/70 pb-4">
                    <div>
                        <h2 class="font-oswald text-2xl md:text-3xl font-bold uppercase tracking-wider text-white flex items-center gap-2">
                            <span>🌦️</span> Agro-Orai, Purškimo ir Įšalo Radaras
                        </h2>
                        <p class="text-xs md:text-sm text-slate-300 mt-0.5" id="weather-loc-label">
                            📍 Orų radaras nustatytas: <strong class="text-green-400 font-bold">${currentWeatherCoords.name}</strong> (${currentWeatherCoords.lat.toFixed(4)}, ${currentWeatherCoords.lng.toFixed(4)})
                        </p>
                    </div>

                    <button id="btn-weather-gps" style="background-color: #2E7D32 !important; color: #FFFFFF !important;" class="h-11 px-4 text-xs font-bold rounded-xl flex items-center gap-2 shadow-lg transition cursor-pointer self-start md:self-auto shrink-0">
                        <span>📡</span> Nustatyti dabartinę GPS vietą
                    </button>
                </div>

                ${!isLogged || !hasGarage ? `
                    <div class="p-5 md:p-6 bg-tractorBg border border-tractorPrimary rounded-2xl shadow-xl space-y-4">
                        <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                            <div class="space-y-1">
                                <div class="flex items-center gap-2">
                                    <span class="text-2xl">${!isLogged ? '💡' : '🏠'}</span>
                                    <h4 class="text-sm md:text-base font-extrabold uppercase tracking-wider text-green-400">
                                        ${!isLogged ? 'Norite 100% tikslių prognozių savo ūkiui?' : 'Liko 1 žingsnis: Nurodykite ūkio bazės vietą!'}
                                    </h4>
                                </div>
                                <p class="text-xs md:text-sm text-slate-200 leading-relaxed">
                                    Prisijunkite ir pažymėkite ūkio bazę, kad orai būtų skaičiuojami tiesiai virš jūsų laukų.
                                </p>
                            </div>
                            <button type="button" id="btn-weather-farm-prompt" class="px-5 py-3 bg-tractorPrimary hover:bg-tractorPrimaryHover text-white font-black rounded-xl text-xs md:text-sm uppercase tracking-wider shrink-0 shadow-lg cursor-pointer transition">
                                ${!isLogged ? '🔑 Prisijungti' : '📍 Nurodyti vietą Nustatymuose ➔'}
                            </button>
                        </div>
                    </div>
                ` : ''}

                <!-- VIETA IR REŽIMAS VIENOJE AIŠKIOJE JUOSTOJE -->
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4 bg-tractorBg/80 p-4 rounded-xl border border-tractorBorder">
                    <div class="space-y-1">
                        <label class="text-xs font-bold text-tractorPrimaryLight uppercase tracking-wider block">
                            🌾 Pasirinkite lauką / vietą:
                        </label>
                        <div id="weather-field-select-box" class="w-full"></div>
                    </div>

                    <div class="space-y-1">
                        <label class="text-xs font-bold text-tractorPrimaryLight uppercase tracking-wider block">
                            🎯 Pasirinkite norimą režimą:
                        </label>
                        <div class="flex items-center gap-1.5 bg-tractorSurface p-1 rounded-xl border border-tractorBorder h-12">
                            <button type="button" id="btn-mode-spray" class="flex-1 h-full rounded-lg text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1.5 ${activeHourlyMode === 'spray' ? 'bg-tractorPrimary text-white shadow' : 'text-slate-400 hover:text-white'}">
                                <span>💦</span> <span>Purškimo langas</span>
                            </button>
                            <button type="button" id="btn-mode-frost" class="flex-1 h-full rounded-lg text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1.5 ${activeHourlyMode === 'frost' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'}">
                                <span>❄️</span> <span>Šalčio ir įšalo langas</span>
                            </button>
                        </div>
                    </div>
                </div>

                <!-- BŪSENOS KORTELĖ (PURŠKIMAS ARBA ĮŠALAS) -->
                <div id="live-spray-inner-box" class="pt-2">
                    <div class="text-center py-6 text-slate-500 text-sm">Kraunami orų duomenys...</div>
                </div>
            </div>

            <!-- VALANDINĖ PROGNOZĖ -->
            <div class="bg-tractorSurface border border-tractorBorder rounded-2xl p-6 md:p-7 shadow-xl space-y-4">
                <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-tractorBorder/70 pb-3">
                    <div>
                        <h3 class="font-oswald text-xl font-bold text-white uppercase tracking-wider flex items-center gap-2" id="hourly-forecast-heading">
                            <span>⏱️</span> Valandinė Prognozė (Artimiausios 48 val.)
                        </h3>
                        <p class="text-xs text-slate-300" id="hourly-forecast-subheading">
                            Valandinis modelis pagal pasirinktą režimą.
                        </p>
                    </div>
                </div>

                <div id="hourly-forecast-grid" class="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3 pt-1">
                    <div class="text-center py-8 text-slate-500 text-xs col-span-full">Kraunamas valandinis grafikas...</div>
                </div>
            </div>

            <!-- AGRONOMINĖS TAISYKLĖS -->
            <div class="grid grid-cols-1 md:grid-cols-3 gap-5" id="soil-and-agri-conditions"></div>

        </div>
    `;

    document.getElementById('btn-mode-spray')?.addEventListener('click', () => {
        activeHourlyMode = 'spray';
        updateModeUI();
    });
    document.getElementById('btn-mode-frost')?.addEventListener('click', () => {
        activeHourlyMode = 'frost';
        updateModeUI();
    });

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
            btn.textContent = "📡 Nustatoma...";
            navigator.geolocation.getCurrentPosition((pos) => {
                currentWeatherCoords = {
                    lat: pos.coords.latitude,
                    lng: pos.coords.longitude,
                    name: "Tiksli dabartinė GPS vieta"
                };
                btn.textContent = "✅ GPS nustatyta!";
                updateLocationLabel();
                fetchAgroWeatherData();
            }, () => {
                btn.textContent = "📡 Nustatyti GPS";
                alert("Nepavyko nustatyti GPS.");
            });
        }
    });

    loadFieldsToSelect(currentUser, userData);
}

function updateModeUI() {
    const btnSpray = document.getElementById('btn-mode-spray');
    const btnFrost = document.getElementById('btn-mode-frost');

    if (activeHourlyMode === 'spray') {
        if (btnSpray) btnSpray.className = "flex-1 h-full rounded-lg text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1.5 bg-tractorPrimary text-white shadow";
        if (btnFrost) btnFrost.className = "flex-1 h-full rounded-lg text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1.5 text-slate-400 hover:text-white";
    } else {
        if (btnFrost) btnFrost.className = "flex-1 h-full rounded-lg text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1.5 bg-blue-600 text-white shadow";
        if (btnSpray) btnSpray.className = "flex-1 h-full rounded-lg text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1.5 text-slate-400 hover:text-white";
    }

    if (cachedCurrentWeather && cachedHourlyWeather) {
        if (activeHourlyMode === 'frost') {
            renderWinterFrostRadar();
        } else {
            renderLiveSprayStatus(cachedCurrentWeather, cachedHourlyWeather, cachedCurrentHourIdx);
        }
        updateHourlyGrid();
    }
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
        lbl.innerHTML = `📍 Orų radaras nustatytas: <strong class="text-green-400 font-bold">${currentWeatherCoords.name}</strong> (${currentWeatherCoords.lat.toFixed(4)}, ${currentWeatherCoords.lng.toFixed(4)})`;
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
    const soil18cm = parseFloat((cachedCurrentWeather.soil_temperature_18cm !== undefined ? cachedCurrentWeather.soil_temperature_18cm : 0).toFixed(1));
    
    const rawSnowMeters = (cachedHourlyWeather.snow_depth && cachedHourlyWeather.snow_depth.length > cachedCurrentHourIdx) 
        ? cachedHourlyWeather.snow_depth[cachedCurrentHourIdx] 
        : 0;
    const snowCm = Math.max(0, Math.round((rawSnowMeters || 0) * 100));

    let frostDepthCmText = "0 cm (Dirva atitirpusi)";
    let frostColor = "text-green-500";

    if (soil0cm < 0 && soil6cm < 0 && soil18cm < 0) {
        frostDepthCmText = "> 20 cm (Gilus įšalas)";
        frostColor = "text-blue-500";
    } else if (soil0cm < 0 && soil6cm < 0) {
        frostDepthCmText = "~ 10 cm įšalas";
        frostColor = "text-blue-500";
    } else if (soil0cm < 0) {
        frostDepthCmText = "3 cm (Paviršinė pluta)";
        frostColor = "text-amber-500";
    }

    let winterkillStatus = "🟢 SAUGU (Pasėliams pavojaus nėra)";
    let winterkillBadgeClass = "bg-green-500/20 text-green-600 border-green-500/40";
    let winterkillDesc = "Temperatūra augimo mazgo gylyje (6 cm) yra teigiama arba saugi. Žieminiai kviečiai ir rapsai žiemoja stabiliai.";
    let borderColor = "border-tractorBorder";

    if (soil6cm <= -9.0) {
        winterkillStatus = "🚨 KRITINIS PAVOJUS: ŽIEMKENČIŲ IŠŠALIMAS!";
        winterkillBadgeClass = "bg-red-600 text-white border-red-700 animate-pulse";
        winterkillDesc = `Dirvos temperatūra mazgo gylyje nukrito iki ${soil6cm}°C! Rapsų augimo kūgelis žūsta prie -8°C, kviečiai prie -14°C.`;
        borderColor = "border-red-600 ring-2 ring-red-600";
    } else if (airTemp < -12.0 && snowCm < 3) {
        winterkillStatus = "🔴 PAVOJUS: PLIKŠALIS BE SNIEGO DANGOS!";
        winterkillBadgeClass = "bg-red-500/20 text-red-600 border-red-500/40";
        winterkillDesc = `Spaudžia stiprus šaltis (${airTemp}°C), o sniego danga nesiekia 3 cm. Nėra termoizoliacijos!`;
        borderColor = "border-red-600";
    }

    const isManureForbidden = (soil0cm < 0 || snowCm > 0);
    const manureStatusText = isManureForbidden ? "🔴 DRAUDŽIAMA (Dirva įšalusi / apsnigta)" : "🟢 Leidžiama (Dirva neįšalusi)";

    box.className = `bg-tractorBg border-2 ${borderColor} rounded-2xl p-5 md:p-6 shadow-lg space-y-4 transition-all`;
    box.innerHTML = `
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-tractorBorder/70 pb-3">
            <div class="space-y-1">
                <div class="inline-flex items-center gap-1.5 ${winterkillBadgeClass} px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider border">
                    <span>❄️</span> <span>Žiemkenčių peržiemojimo ir įšalo būklė</span>
                </div>
                <h3 class="font-oswald text-xl md:text-2xl font-bold tracking-wide" style="color: var(--text-main);">${winterkillStatus}</h3>
                <p class="text-xs md:text-sm text-slate-300 leading-relaxed">${winterkillDesc}</p>
            </div>
            <div class="text-left sm:text-right shrink-0">
                <span class="text-[11px] text-slate-400 uppercase font-bold block">Sniego danga</span>
                <span class="text-2xl font-black font-mono text-blue-400">${snowCm} cm</span>
            </div>
        </div>

        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div class="bg-tractorSurface p-3 rounded-xl border border-tractorBorder space-y-1">
                <span class="text-slate-400 font-bold block text-[11px]">🌱 Dirva 6 cm (Mazgas)</span>
                <strong class="font-mono text-xl font-black ${soil6cm < 0 ? 'text-blue-400' : 'text-green-500'} block">
                    ${soil6cm > 0 ? '+' : ''}${soil6cm}°C
                </strong>
            </div>
            <div class="bg-tractorSurface p-3 rounded-xl border border-tractorBorder space-y-1">
                <span class="text-slate-400 font-bold block text-[11px]">❄️ Sniego danga</span>
                <strong class="font-mono text-xl font-black text-blue-400 block">${snowCm} cm</strong>
            </div>
            <div class="bg-tractorSurface p-3 rounded-xl border border-tractorBorder space-y-1">
                <span class="text-slate-400 font-bold block text-[11px]">🧊 Įšalo gylis</span>
                <strong class="font-mono text-base font-black ${frostColor} block truncate">${frostDepthCmText}</strong>
            </div>
            <div class="bg-tractorSurface p-3 rounded-xl border border-tractorBorder space-y-1">
                <span class="text-slate-400 font-bold block text-[11px]">📜 Mėšlo skleidimas</span>
                <strong class="font-bold text-[11px] ${isManureForbidden ? 'text-red-400' : 'text-green-500'} block">
                    ${manureStatusText}
                </strong>
            </div>
        </div>
    `;
}

function updateHourlyGrid() {
    const grid = document.getElementById('hourly-forecast-grid');
    const heading = document.getElementById('hourly-forecast-heading');
    const subheading = document.getElementById('hourly-forecast-subheading');

    if (!grid || !cachedHourlyWeather || !cachedHourlyWeather.time) return;

    if (activeHourlyMode === 'frost') {
        heading.innerHTML = `<span>⏱️</span> Žiemkenčių Šalčio ir Įšalo Langas (Artimiausios 48 val.)`;
        subheading.textContent = `Valandinis modelis: tikslios valandos, kada naktį spaus naktinis šaltis ar žemės įšalas.`;
    } else {
        heading.innerHTML = `<span>⏱️</span> Purškimo Lango Prognozė (Artimiausios 48 val.)`;
        subheading.textContent = `Rekomenduojamos valandos purškimui pagal vėjo greitį 2 m aukštyje ir lietaus riziką.`;
    }

    const items = [];
    const maxItems = Math.min(cachedHourlyWeather.time.length, cachedCurrentHourIdx + 32);

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
            let frostBadge = "";
            let frostBadgeClass = "";

            if (soil6cm <= -9.0) {
                frostBadge = "🚨 Iššalimas";
                frostBadgeClass = "bg-red-700 text-white border-red-800 animate-pulse";
            } else if (tempC <= -12 && snowCm < 3) {
                frostBadge = "🔴 Plikšalis";
                frostBadgeClass = "bg-red-600 text-white border-red-700";
            } else if (tempC < 0 && snowCm < 2) {
                frostBadge = "🟡 Šalna";
                frostBadgeClass = "bg-amber-500/20 text-amber-500 border-amber-500/40";
            } else {
                frostBadge = "🟢 Saugu";
                frostBadgeClass = "bg-green-500/20 text-green-500 border-green-500/40";
            }

            items.push(`
                <div class="bg-tractorBg border ${isCurrentHour ? 'border-blue-500 ring-2 ring-blue-500' : 'border-tractorBorder'} rounded-xl p-3 text-center space-y-1.5 flex flex-col justify-between">
                    <div class="border-b border-tractorBorder/60 pb-1">
                        <span class="text-[10px] text-slate-500 uppercase block font-bold">${isCurrentHour ? 'DABAR' : dayName}</span>
                        <strong class="text-sm font-mono font-extrabold block" style="color: var(--text-main);">${String(hour).padStart(2, '0')}:00</strong>
                    </div>

                    <div class="text-[11px] font-black ${frostBadgeClass} py-1 px-1 rounded-lg border flex items-center justify-center">
                        ${frostBadge}
                    </div>

                    <div class="text-xs space-y-0.5 pt-1" style="color: var(--text-main);">
                        <div class="font-bold ${tempC < 0 ? 'text-blue-400 font-mono text-sm' : 'text-slate-100'}">🌡️ ${tempC > 0 ? '+' : ''}${tempC}°C</div>
                        <div class="text-[10px] ${soil6cm < 0 ? 'text-blue-300 font-bold' : 'text-slate-400'}">🌱 Mazgas: ${soil6cm}°C</div>
                        <div class="text-[10px] text-slate-400">❄️ Sniegas: ${snowCm} cm</div>
                    </div>
                </div>
            `);

        } else {
            const rainProb = cachedHourlyWeather.precipitation_probability?.[i] || 0;
            const rainMm = cachedHourlyWeather.rain ? cachedHourlyWeather.rain[i] : 0;
            const evalResult = evaluateSprayCondition(windSpeedMs, windGustsMs, tempC, rainProb, rainMm);

            items.push(`
                <div class="bg-tractorBg border ${isCurrentHour ? 'border-tractorPrimary ring-2 ring-tractorPrimary' : 'border-tractorBorder'} rounded-xl p-3 text-center space-y-1.5 flex flex-col justify-between">
                    <div class="border-b border-tractorBorder/60 pb-1">
                        <span class="text-[10px] text-slate-500 uppercase block font-bold">${isCurrentHour ? 'DABAR' : dayName}</span>
                        <strong class="text-sm font-mono font-extrabold block" style="color: var(--text-main);">${String(hour).padStart(2, '0')}:00</strong>
                    </div>

                    <div class="text-xs font-extrabold ${evalResult.badgeClass} py-1 px-1.5 rounded-lg border flex items-center justify-center gap-1">
                        <span>${evalResult.icon}</span> <span>${evalResult.text}</span>
                    </div>

                    <div class="text-xs space-y-0.5 pt-1" style="color: var(--text-main);">
                        <div>💨 <strong>${windSpeedMs} m/s</strong></div>
                        <div class="text-[10px] text-slate-500">gūs. ${windGustsMs} m/s</div>
                        <div>🌡️ <strong>${tempC}°C</strong></div>
                        <div class="${rainProb > 40 ? 'text-amber-500 font-bold' : 'text-slate-500'}">💧 ${rainProb}%</div>
                    </div>
                </div>
            `);
        }
    }

    grid.innerHTML = items.join('');
}

// 🌟 PATAISYTA: Dabar grąžina tikslias priežastis (reasons masyvą)
function evaluateSprayCondition(windSpeedMs, windGustsMs, tempC, rainProb, rainMm) {
    const redReasons = [];
    const yellowReasons = [];

    if (tempC < 5) redReasons.push(`Per šalta (+${tempC}°C).`);
    if (windSpeedMs > 4.5) redReasons.push(`Stiprus vėjas (${windSpeedMs} m/s).`);
    if (windGustsMs > 6.0) redReasons.push(`Pavojingi gūsiai (${windGustsMs} m/s).`);
    if (rainMm > 0.1) redReasons.push(`Lietus (${rainMm} mm).`);
    if (tempC > 25) redReasons.push(`Per karšta (+${tempC}°C).`);

    if (redReasons.length > 0) {
        return { status: 'red', icon: '🔴', text: 'Netinka', badgeClass: 'bg-red-500/20 text-red-600 border-red-500/40', reasons: redReasons };
    }

    if (rainProb > 40 && rainMm <= 0.1) yellowReasons.push(`Lietaus tikimybė (${rainProb}%).`);
    if (windSpeedMs > 3.0) yellowReasons.push(`Vėjas ant ribos (${windSpeedMs} m/s).`);
    if (tempC > 22) yellowReasons.push(`Garavimo rizika (+${tempC}°C).`);

    if (yellowReasons.length > 0) {
        return { status: 'yellow', icon: '🟡', text: 'Rizika', badgeClass: 'bg-amber-500/20 text-amber-600 border-amber-500/40', reasons: yellowReasons };
    }

    return { status: 'green', icon: '🟢', text: 'Tinka', badgeClass: 'bg-green-500/20 text-green-600 border-green-500/40', reasons: [] };
}

// 🌟 PATAISYTA: Atvaizduoja tikslias priežastis ekrane
function renderLiveSprayStatus(current, hourly, currentIdx) {
    const liveCard = document.getElementById('live-spray-inner-box');
    if (!liveCard || !current) return;

    const windSpeedMs = parseFloat((hourly.wind_speed_10m[currentIdx] / 3.6).toFixed(1));
    const windGustsMs = parseFloat((hourly.wind_gusts_10m[currentIdx] / 3.6).toFixed(1));
    const tempC = parseFloat(hourly.temperature_2m[currentIdx].toFixed(1));
    const humidity = hourly.relative_humidity_2m[currentIdx];
    const rainMm = hourly.rain ? hourly.rain[currentIdx] : (current.rain || 0);
    const currentRainProb = (hourly.precipitation_probability && hourly.precipitation_probability.length > currentIdx) 
        ? hourly.precipitation_probability[currentIdx] 
        : 0;

    const evaluation = evaluateSprayCondition(windSpeedMs, windGustsMs, tempC, currentRainProb, rainMm);

    let statusTitle = "🟢 ŠIUO METU PURKŠTI GALIMA (Optimalus langas)";
    let statusDesc = "Vėjo greitis ir gūsiai neviršija normų, šiuo metu nelyja, temperatūra tinkama.";
    let borderColor = "border-tractorPrimary";
    let bgColor = "bg-myPostBg";

    if (tempC < 5) {
        statusTitle = "❄️ ŽIEMOS RAMYBĖS LAIKOTARPIS / PURŠKIMAS NEVYKDOMAS";
        borderColor = "border-blue-500";
        bgColor = "bg-blue-950/20";
        statusDesc = `Esant žemai temperatūrai (+${tempC}°C < 5°C) augalų apsaugos produktai neveikia.`;
    } else if (evaluation.status === 'red') {
        statusTitle = "🔴 ŠIUO METU PURKŠTI DRAUDŽIAMA";
        borderColor = "border-red-600";
        bgColor = "bg-red-950/30";
        statusDesc = `Priežastys: <strong class="text-red-400">${evaluation.reasons.join(' ')}</strong>`;
    } else if (evaluation.status === 'yellow') {
        statusTitle = "🟡 ŠIUO METU SĄLYGOS RIZIKINGOS";
        borderColor = "border-amber-500";
        bgColor = "bg-amber-950/30";
        statusDesc = `Pastaba: <strong class="text-amber-400">${evaluation.reasons.join(' ')}</strong> Rekomenduojama naudoti antilašinius purkštukus.`;
    }

    liveCard.className = `${bgColor} border-2 ${borderColor} rounded-2xl p-5 md:p-6 shadow-lg space-y-4 transition-all`;
    liveCard.innerHTML = `
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-tractorBorder/70 pb-3">
            <div class="space-y-1 flex-1">
                <span class="text-xs uppercase font-black tracking-wider ${tempC < 5 ? 'text-blue-400' : (evaluation.status === 'green' ? 'text-green-600' : (evaluation.status === 'yellow' ? 'text-amber-600' : 'text-red-600'))}">
                    Agrometeorologinis verdiktas
                </span>
                <h3 class="font-oswald text-xl md:text-2xl font-bold tracking-wide" style="color: var(--text-main);">${statusTitle}</h3>
                <p class="text-xs md:text-sm font-medium leading-relaxed" style="color: var(--text-muted);">${statusDesc}</p>
            </div>
            <div class="text-right shrink-0">
                <span class="text-[11px] text-slate-500 block uppercase font-bold">Oro temperatūra</span>
                <span class="text-2xl md:text-3xl font-black font-mono" style="color: var(--text-main);">${tempC > 0 ? '+' : ''}${tempC}°C</span>
            </div>
        </div>

        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div class="bg-tractorSurface p-3 rounded-xl border border-tractorBorder space-y-1">
                <span class="text-slate-500 text-[11px] block font-bold">💨 Vėjas (2m)</span>
                <strong class="font-mono text-lg font-bold ${windSpeedMs > 4.5 ? 'text-red-500' : 'text-green-600'}">${windSpeedMs} m/s</strong>
                <span class="text-[10px] text-slate-500 block">Gūsiai: ${windGustsMs} m/s</span>
            </div>
            <div class="bg-tractorSurface p-3 rounded-xl border border-tractorBorder space-y-1">
                <span class="text-slate-500 text-[11px] block font-bold">💧 Krituliai</span>
                <strong class="font-mono text-lg font-bold" style="color: var(--text-main);">${rainMm} mm</strong>
                <span class="text-[10px] ${currentRainProb > 40 ? 'text-amber-500 font-bold' : 'text-green-600'} block">Lietus: ${currentRainProb}%</span>
            </div>
            <div class="bg-tractorSurface p-3 rounded-xl border border-tractorBorder space-y-1">
                <span class="text-slate-500 text-[11px] block font-bold">🌫️ Drėgmė</span>
                <strong class="font-mono text-lg font-bold" style="color: var(--text-main);">${humidity}%</strong>
            </div>
            <div class="bg-tractorSurface p-3 rounded-xl border border-tractorBorder space-y-1">
                <span class="text-slate-500 text-[11px] block font-bold">🌱 Dirva (0 cm)</span>
                <strong class="text-green-600 font-mono text-lg font-bold">${current.soil_temperature_0cm > 0 ? '+' : ''}${(current.soil_temperature_0cm || 0).toFixed(1)}°C</strong>
            </div>
        </div>
    `;
}

function renderSoilConditions(current, hourly) {
    const soilBox = document.getElementById('soil-and-agri-conditions');
    if (!soilBox) return;

    soilBox.innerHTML = `
        <div class="bg-tractorSurface border border-tractorBorder rounded-2xl p-5 shadow-xl space-y-1.5">
            <span class="text-xs uppercase font-bold text-tractorPrimaryLight tracking-wider block">🌾 Sėja ir vegetacija</span>
            <p class="text-xs leading-relaxed" style="color: var(--text-muted);">
                Pavasario sėjai dirva turi pasiekti bent <strong>+6°C</strong> (miežiams) ir <strong>+8°C</strong> (žirniams, kukurūzams).
            </p>
        </div>
        <div class="bg-tractorSurface border border-tractorBorder rounded-2xl p-5 shadow-xl space-y-1.5">
            <span class="text-xs uppercase font-bold text-amber-500 tracking-wider block">📜 Purškimo reglamentas</span>
            <p class="text-xs leading-relaxed" style="color: var(--text-muted);">
                Pagal LR ŽŪM reikalavimus, purkšti draudžiama, kai vėjas <strong>> 3.0 m/s</strong> (su standartiniais) arba <strong>> 4.5 m/s</strong> (su antilašiniais IDN purkštukais).
            </p>
        </div>
        <div class="bg-tractorSurface border border-tractorBorder rounded-2xl p-6 shadow-xl space-y-1.5">
            <span class="text-xs uppercase font-bold text-blue-500 tracking-wider block">❄️ Žiemkenčių apsauga</span>
            <p class="text-xs leading-relaxed" style="color: var(--text-muted);">
                Rapsai žūsta mazgo gylyje pasiekus <strong>-8°C</strong>, kviečiai – iki <strong>-14°C</strong>. Sniego danga (>5 cm) apsaugo net prie -25°C.
            </p>
        </div>
    `;
}