// js/weather.js
import { db } from './firebase.js';
import { createCustomSelect } from './customSelect.js';

let currentWeatherCoords = { lat: 56.0593, lng: 24.4036, name: "Pasvalio r." };
let userFieldsList = [];

export function initWeatherTab(currentUser, userData) {
    const container = document.getElementById('view-tab-weather');
    if (!container) return;

    if (userData?.garageLat && userData?.garageLon) {
        currentWeatherCoords = {
            lat: userData.garageLat,
            lng: userData.garageLon,
            name: "Apytiksliai pagal jūsų ūkio / garažo vietą"
        };
    }

    container.innerHTML = `
        <div class="space-y-6 max-w-6xl mx-auto w-full">
            
            <!-- 1. VIENTISA VIRŠUTINĖ AGRO-ORŲ KORTELĖ (SUJUNGTA, BE TARPŲ) -->
            <div id="weather-top-unified-card" class="bg-tractorSurface border border-tractorBorder rounded-2xl p-6 md:p-7 shadow-xl space-y-5">
                
                <!-- VIRŠUTINĖ EILUTĖ: ANTRAŠTĖ IR GPS -->
                <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-tractorBorder/70 pb-4">
                    <div>
                        <h2 class="font-oswald text-2xl md:text-3xl font-bold uppercase tracking-wider text-white flex items-center gap-2">
                            <span>🌦️</span> Agro-Orai ir Purškimo Langas
                        </h2>
                        <p class="text-xs md:text-sm text-slate-300 mt-0.5" id="weather-loc-label">
                            📍 Orų radaras nustatytas: <strong class="text-green-400 font-bold">${currentWeatherCoords.name}</strong> (${currentWeatherCoords.lat.toFixed(4)}, ${currentWeatherCoords.lng.toFixed(4)})
                        </p>
                    </div>

                    <button id="btn-weather-gps" style="background-color: #2E7D32 !important; color: #FFFFFF !important;" class="h-11 px-4 text-xs font-bold rounded-xl flex items-center gap-2 shadow-lg transition cursor-pointer self-start md:self-auto shrink-0">
                        <span>📡</span> Nustatyti dabartinę GPS vietą
                    </button>
                </div>

                <!-- LAUKO PASIRINKIMAS -->
                <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-tractorBg/80 p-3.5 rounded-xl border border-tractorBorder">
                    <div class="space-y-0.5">
                        <label class="text-xs font-bold text-tractorPrimaryLight uppercase tracking-wider block">
                            🌾 Pasirinkite lauką orų prognozei:
                        </label>
                        <p class="text-[11px] text-slate-400">Jei jūsų laukai nutolę, pasirinkite konkretų sklypą tiksliam modeliui.</p>
                    </div>

                    <div id="weather-field-select-box" class="w-full sm:w-80"></div>
                </div>

                <!-- ŠVIESOFORO IR VERDIKTO BLOKAS (INTEGRUOTAS Į TĄ PATĮ LANGĄ) -->
                <div id="live-spray-inner-box" class="pt-2">
                    <div class="text-center py-6 text-slate-500 text-sm">Jungiamasi prie meteorologinių palydovų...</div>
                </div>
            </div>

            <!-- 2. 48 VALANDŲ PURŠKIMO LANGO GRAFIKAS -->
            <div class="bg-tractorSurface border border-tractorBorder rounded-2xl p-6 md:p-7 shadow-xl space-y-4">
                <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-tractorBorder/70 pb-3">
                    <div>
                        <h3 class="font-oswald text-xl font-bold text-white uppercase tracking-wider flex items-center gap-2">
                            <span>⏱️</span> Purškimo Lango Prognozė (Artimiausios 48 val.)
                        </h3>
                        <p class="text-xs text-slate-300">Rekomenduojamos valandos purškimui pagal vėjo greitį 2 m aukštyje, gūsius ir lietaus riziką.</p>
                    </div>
                </div>

                <div id="hourly-forecast-grid" class="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3 pt-1">
                    <div class="text-center py-8 text-slate-500 text-xs col-span-full">Kraunamas valandinis grafikas...</div>
                </div>
            </div>

            <!-- 3. DIRVOŽEMIO IR SĖJOS SĄLYGOS -->
            <div class="grid grid-cols-1 md:grid-cols-3 gap-5" id="soil-and-agri-conditions"></div>

        </div>
    `;

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
    fetchAgroWeatherData();
}

function updateLocationLabel() {
    const lbl = document.getElementById('weather-loc-label');
    if (lbl) {
        lbl.innerHTML = `📍 Orų radaras nustatytas: <strong class="text-green-400 font-bold">${currentWeatherCoords.name}</strong> (${currentWeatherCoords.lat.toFixed(4)}, ${currentWeatherCoords.lng.toFixed(4)})`;
    }
}

function loadFieldsToSelect(currentUser, userData) {
    if (!currentUser) {
        createCustomSelect({
            containerId: 'weather-field-select-box',
            placeholder: 'Pasirinkite...',
            items: [{ id: 'garage', name: '🏠 Apytikslė vieta', subtext: 'Prisijunkite laukų parinkimui' }],
            selectedId: 'garage'
        });
        return;
    }

    db.collection("user_fields").where("userId", "==", currentUser.uid).get().then(snap => {
        userFieldsList = [];
        const selectItems = [
            { id: 'garage', name: 'Mano ūkio / garažo vieta', icon: '🏠', subtext: 'Iš Nustatymų' }
        ];

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

        createCustomSelect({
            containerId: 'weather-field-select-box',
            placeholder: 'Pasirinkite lauką...',
            items: selectItems,
            selectedId: 'garage',
            onSelect: (item) => {
                if (!item || item.id === 'garage') {
                    currentWeatherCoords = {
                        lat: userData?.garageLat || 56.0593,
                        lng: userData?.garageLon || 24.4036,
                        name: "Apytiksliai pagal jūsų ūkio / garažo vietą"
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
    });
}

async function fetchAgroWeatherData() {
    const { lat, lng } = currentWeatherCoords;
    const apiUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,relative_humidity_2m,precipitation,rain,weather_code,wind_speed_10m,wind_gusts_10m,soil_temperature_0cm&hourly=temperature_2m,relative_humidity_2m,precipitation_probability,rain,wind_speed_10m,wind_gusts_10m,soil_temperature_6cm&timezone=Europe%2FVilnius&forecast_days=3`;

    try {
        const response = await fetch(apiUrl);
        const data = await response.json();

        const currentIdx = findCurrentHourIndex(data.hourly);

        renderLiveSprayStatus(data.current, data.hourly, currentIdx);
        renderHourlyForecast(data.hourly, currentIdx);
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
        if (itemDate >= now || (itemDate.getDate() === now.getDate() && itemDate.getHours() === now.getHours())) {
            return i;
        }
    }
    return 0;
}

function evaluateSprayCondition(windSpeedMs, windGustsMs, tempC, rainProb, rainMm) {
    const redReasons = [];
    const yellowReasons = [];

    if (windSpeedMs > 4.5) redReasons.push(`Per stiprus vėjas (${windSpeedMs} m/s > 4.5 m/s).`);
    if (windGustsMs > 6.0) redReasons.push(`Pavojingi vėjo gūsiai (${windGustsMs} m/s > 6.0 m/s).`);
    if (rainMm > 0) redReasons.push(`Šiuo metu krenta lietus.`);
    if (rainProb > 40) redReasons.push(`Didelė lietaus tikimybė (${rainProb}%).`);
    if (tempC > 25) redReasons.push(`Per karšta (+${tempC}°C > 25°C).`);
    if (tempC < 8) redReasons.push(`Per šalta (+${tempC}°C < 8°C).`);

    if (redReasons.length > 0) {
        return {
            status: 'red',
            icon: '🔴',
            text: 'Netinka',
            badgeClass: 'bg-red-500/20 text-red-600 border-red-500/40',
            reasons: redReasons
        };
    }

    if (windSpeedMs > 3.0) yellowReasons.push(`Vėjas (${windSpeedMs} m/s) ant ribos.`);
    if (windGustsMs > 4.5) yellowReasons.push(`Vėjo gūsiai (${windGustsMs} m/s).`);
    if (tempC > 22) yellowReasons.push(`Šilta (+${tempC}°C).`);
    if (rainProb > 20) yellowReasons.push(`Lietaus tikimybė (${rainProb}%).`);

    if (yellowReasons.length > 0) {
        return {
            status: 'yellow',
            icon: '🟡',
            text: 'Rizika',
            badgeClass: 'bg-amber-500/20 text-amber-600 border-amber-500/40',
            reasons: yellowReasons
        };
    }

    return {
        status: 'green',
        icon: '🟢',
        text: 'Tinka',
        badgeClass: 'bg-green-500/20 text-green-600 border-green-500/40',
        warnings: []
    };
}

// 🚦 INTEGRUOTAS ŠVIESOFORAS
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

    const futureHours = (hourly.precipitation_probability || []).slice(currentIdx + 1, currentIdx + 6);
    const futureRainRelIndex = futureHours.findIndex(p => p > 40);

    const evaluation = evaluateSprayCondition(windSpeedMs, windGustsMs, tempC, currentRainProb, rainMm);

    let statusTitle = "🟢 ŠIUO METU PURKŠTI GALIMA (Optimalus langas)";
    let statusDesc = "Vėjo greitis ir gūsiai neviršija normų, šiuo metu nelyja, temperatūra tinkama.";
    let borderColor = "border-tractorPrimary";
    let bgColor = "bg-myPostBg";

    if (evaluation.status === 'red') {
        statusTitle = "🔴 ŠIUO METU PURKŠTI DRAUDŽIAMA ARBA NEREKOMENDUOJAMA";
        borderColor = "border-red-600";
        bgColor = "bg-red-950/30";
        statusDesc = `Priežastys: ${evaluation.reasons.join(' ')}`;
    } else if (evaluation.status === 'yellow') {
        statusTitle = "🟡 ŠIUO METU SĄLYGOS RIZIKINGOS";
        borderColor = "border-amber-500";
        bgColor = "bg-amber-950/30";
        statusDesc = `Pastaba: ${evaluation.reasons.join(' ')} Rekomenduojama naudoti antilašinius purkštukus.`;
    }

    if (evaluation.status === 'green' && futureRainRelIndex !== -1) {
        const hoursLater = futureRainRelIndex + 1;
        const rainProbFuture = futureHours[futureRainRelIndex];
        statusDesc += ` <span class="text-amber-600 font-extrabold block mt-2 bg-amber-500/10 p-2.5 rounded-lg border border-amber-500/30">⚠️ Dėmesio: po ${hoursLater} val. prognozuojamas lietus (${rainProbFuture}% tikimybė). Purkškite greitai įsigeriančius preparatus!</span>`;
    }

    liveCard.innerHTML = `
        <div class="${bgColor} border-2 ${borderColor} rounded-2xl p-6 md:p-7 shadow-lg space-y-5 transition-all">
            <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-tractorBorder/70 pb-4">
                <div class="space-y-1 flex-1">
                    <span class="text-xs uppercase font-black tracking-wider ${evaluation.status === 'green' ? 'text-green-600' : (evaluation.status === 'yellow' ? 'text-amber-600' : 'text-red-600')}">
                        Agrometeorologinis verdiktas (Šiuo metu)
                    </span>
                    <h3 class="font-oswald text-2xl md:text-3xl font-bold tracking-wide" style="color: var(--text-main);">${statusTitle}</h3>
                    <p class="text-xs md:text-sm font-medium leading-relaxed" style="color: var(--text-muted);">${statusDesc}</p>
                </div>
                <div class="text-right shrink-0">
                    <span class="text-[11px] text-slate-500 block uppercase font-bold">Oro temperatūra</span>
                    <span class="text-3xl md:text-4xl font-black font-mono" style="color: var(--text-main);">${tempC > 0 ? '+' : ''}${tempC}°C</span>
                </div>
            </div>

            <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs md:text-sm">
                <div class="bg-tractorBg p-3.5 rounded-xl border border-tractorBorder space-y-1">
                    <span class="text-slate-500 text-xs block font-bold">💨 Vėjas (2m aukštyje)</span>
                    <strong class="font-mono text-xl font-bold ${windSpeedMs > 4.5 ? 'text-red-500' : 'text-green-600'}">${windSpeedMs} m/s</strong>
                    <span class="text-[11px] text-slate-500 block font-medium">Gūsiai: <strong class="${windGustsMs > 6 ? 'text-red-500' : 'text-slate-700'}">${windGustsMs} m/s</strong></span>
                </div>

                <div class="bg-tractorBg p-3.5 rounded-xl border border-tractorBorder space-y-1">
                    <span class="text-slate-500 text-xs block font-bold">💧 Krituliai šiuo metu</span>
                    <strong class="font-mono text-xl font-bold" style="color: var(--text-main);">${rainMm} mm</strong>
                    <span class="text-[11px] ${currentRainProb > 30 ? 'text-red-500 font-bold' : 'text-green-600 font-bold'} block">
                        Lietaus tikimybė: ${currentRainProb}%
                    </span>
                </div>

                <div class="bg-tractorBg p-3.5 rounded-xl border border-tractorBorder space-y-1">
                    <span class="text-slate-500 text-xs block font-bold">🌫️ Santykinė oro drėgmė</span>
                    <strong class="font-mono text-xl font-bold ${humidity < 50 ? 'text-amber-500' : 'text-green-600'}">${humidity}%</strong>
                    <span class="text-[11px] text-slate-500 block font-medium">${humidity > 50 ? 'Optimali drėgmė' : 'Sausa (garavimo rizika)'}</span>
                </div>

                <div class="bg-tractorBg p-3.5 rounded-xl border border-tractorBorder space-y-1">
                    <span class="text-slate-500 text-xs block font-bold">🌱 Dirvos temp. (paviršius)</span>
                    <strong class="text-green-600 font-mono text-xl font-bold">+${(current.soil_temperature_0cm || 12).toFixed(1)}°C</strong>
                    <span class="text-[11px] text-slate-500 block font-medium">Dirvos būklė</span>
                </div>
            </div>
        </div>
    `;
}

function renderHourlyForecast(hourly, currentIdx) {
    const grid = document.getElementById('hourly-forecast-grid');
    if (!grid || !hourly || !hourly.time) return;

    const items = [];
    const maxItems = Math.min(hourly.time.length, currentIdx + 32);

    for (let i = currentIdx; i < maxItems; i++) {
        const timeStr = hourly.time[i];
        const dateObj = new Date(timeStr);
        const hour = dateObj.getHours();
        const dayName = dateObj.toLocaleDateString('lt-LT', { weekday: 'short' });
        const isCurrentHour = i === currentIdx;

        const windSpeedMs = parseFloat((hourly.wind_speed_10m[i] / 3.6).toFixed(1));
        const windGustsMs = parseFloat((hourly.wind_gusts_10m[i] / 3.6).toFixed(1));
        const tempC = Math.round(hourly.temperature_2m[i]);
        const rainProb = hourly.precipitation_probability[i] || 0;
        const rainMm = hourly.rain ? hourly.rain[i] : 0;

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
                    <div class="${rainProb > 30 ? 'text-blue-500 font-bold' : 'text-slate-500'}">💧 ${rainProb}%</div>
                </div>
            </div>
        `);
    }

    grid.innerHTML = items.join('');
}

function renderSoilConditions(current, hourly) {
    const soilBox = document.getElementById('soil-and-agri-conditions');
    if (!soilBox) return;

    const soilTemp6cm = hourly.soil_temperature_6cm ? hourly.soil_temperature_6cm[0].toFixed(1) : "12.5";

    let sowingStatus = "🟢 Sąlygos sėjai puikios (dirva pakankamai įšilusi)";
    if (soilTemp6cm < 6) sowingStatus = "🔴 Dirva per šalta sėjai (<6°C)";
    else if (soilTemp6cm < 9) sowingStatus = "🟡 Vėsi dirva (tinka tik žiemkenčiams)";

    soilBox.innerHTML = `
        <div class="bg-tractorSurface border border-tractorBorder rounded-2xl p-6 shadow-xl space-y-2">
            <span class="text-xs uppercase font-bold text-tractorPrimaryLight tracking-wider block">🌾 Sėjos parengtis</span>
            <div class="text-2xl font-bold font-mono" style="color: var(--text-main);">+${soilTemp6cm}°C</div>
            <p class="text-xs text-slate-400">Dirvos temperatūra sėklos gylyje (6 cm).</p>
            <div class="text-xs text-green-600 font-bold pt-2 border-t border-tractorBorder/50">${sowingStatus}</div>
        </div>

        <div class="bg-tractorSurface border border-tractorBorder rounded-2xl p-6 shadow-xl space-y-2">
            <span class="text-xs uppercase font-bold text-amber-500 tracking-wider block">📜 Teisinis purškimo reglamentas</span>
            <p class="text-xs leading-relaxed" style="color: var(--text-muted);">
                Pagal LR ŽŪM reikalavimus, purkšti AAP draudžiama, kai vėjo greitis <strong>> 3.0 m/s</strong> (su standartiniais plyšiniais purkštukais) arba <strong>> 4.5 m/s</strong> (su antilašiniais IDN purkštukais).
            </p>
        </div>

        <div class="bg-tractorSurface border border-tractorBorder rounded-2xl p-6 shadow-xl space-y-2">
            <span class="text-xs uppercase font-bold text-blue-500 tracking-wider block">💦 Garavimo indeksas (Delta T)</span>
            <p class="text-xs leading-relaxed" style="color: var(--text-muted);">
                Esant karštam orui (>23°C) ir mažam oro drėgnumui (<50%), lašeliai išgaruoja ore nepasiekę piktžolių lapų. Purkškite anksti ryte arba po 19:00 val.
            </p>
        </div>
    `;
}