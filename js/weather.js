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
            
            <!-- HEADERIS IR LOKACIJOS / LAUKO PARINKIMAS -->
            <div class="bg-tractorSurface border border-tractorBorder rounded-2xl p-6 md:p-8 space-y-4 shadow-xl">
                <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-tractorBorder/70 pb-4">
                    <div>
                        <h2 class="font-oswald text-2xl md:text-3xl font-bold uppercase tracking-wider text-white flex items-center gap-2">
                            <span>🌦️</span> Agro-Orai ir Purškimo Langas
                        </h2>
                        <p class="text-xs md:text-sm text-slate-300 mt-1" id="weather-loc-label">
                            📍 Orų radaras nustatytas: <strong class="text-green-400">${currentWeatherCoords.name}</strong> (${currentWeatherCoords.lat.toFixed(4)}, ${currentWeatherCoords.lng.toFixed(4)})
                        </p>
                    </div>

                    <button id="btn-weather-gps" class="h-11 px-4 bg-tractorBg hover:bg-zinc-800 text-slate-200 border border-tractorBorder hover:border-tractorPrimary text-xs font-bold rounded-xl flex items-center gap-2 shadow transition cursor-pointer self-start md:self-auto shrink-0">
                        <span>📡</span> Nustatyti dabartinę GPS vietą
                    </button>
                </div>

                <!-- LAUKO PARINKIMAS SU CUSTOM SELECT -->
                <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1">
                    <div class="space-y-1">
                        <label class="text-xs font-bold text-tractorPrimaryLight uppercase tracking-wider block">
                            🌾 Pasirinkite lauką orų prognozei:
                        </label>
                        <p class="text-[11px] text-slate-400">Jei jūsų laukai nutolę, pasirinkite konkretų sklypą tiksliam orų modeliui.</p>
                    </div>

                    <div id="weather-field-select-box" class="w-full sm:w-80"></div>
                </div>
            </div>

            <!-- 1. GYVAS PURŠKIMO ŠVIESOFORAS -->
            <div id="live-spray-card" class="bg-tractorSurface border border-tractorBorder rounded-2xl p-6 md:p-8 shadow-xl space-y-6">
                <div class="text-center py-8 text-slate-500 text-sm">Jungiamasi prie meteorologinių palydovų...</div>
            </div>

            <!-- 2. 48 VALANDŲ PURŠKIMO LANGO GRAFIKAS -->
            <div class="bg-tractorSurface border border-tractorBorder rounded-2xl p-6 md:p-8 space-y-4 shadow-xl">
                <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-tractorBorder/70 pb-3">
                    <div>
                        <h3 class="font-oswald text-xl font-bold text-white uppercase tracking-wider flex items-center gap-2">
                            <span>⏱️</span> Purškimo Lango Prognozė (Artimiausios 48 val.)
                        </h3>
                        <p class="text-xs text-slate-300">Rekomenduojamos valandos purškimui pagal vėjo greitį 2 m aukštyje, gūsius ir lietaus riziką.</p>
                    </div>
                </div>

                <div id="hourly-forecast-grid" class="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3 pt-2">
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
        lbl.innerHTML = `📍 Orų radaras nustatytas: <strong class="text-green-400">${currentWeatherCoords.name}</strong> (${currentWeatherCoords.lat.toFixed(4)}, ${currentWeatherCoords.lng.toFixed(4)})`;
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

        renderLiveSprayStatus(data.current, data.hourly);
        renderHourlyForecast(data.hourly);
        renderSoilConditions(data.current, data.hourly);
    } catch (error) {
        console.error("Orų klaida:", error);
    }
}

// 🚦 VIENINGA FORMULĖ: Įvertina vidutinį vėją, gūsius, lietų ir karštį
function evaluateSprayCondition(windSpeedMs, windGustsMs, tempC, rainProb, rainMm) {
    const warnings = [];

    if (windSpeedMs > 4.5) warnings.push(`Per stiprus vėjas (${windSpeedMs} m/s).`);
    if (windGustsMs > 6.0) warnings.push(`Pavojingi vėjo gūsiai (${windGustsMs} m/s).`);
    if (rainMm > 0) warnings.push(`Krenta lietus.`);
    if (rainProb > 30) warnings.push(`Didelė lietaus tikimybė (${rainProb}%).`);
    if (tempC > 25) warnings.push(`Per karšta (+${tempC}°C).`);
    if (tempC < 8) warnings.push(`Per šalta (+${tempC}°C).`);

    // 🔴 RAUDONA (Netinka)
    if (windSpeedMs > 4.5 || windGustsMs > 6.0 || rainMm > 0 || rainProb > 30 || tempC > 25 || tempC < 8) {
        return {
            status: 'red',
            icon: '🔴',
            text: 'Netinka',
            badgeClass: 'bg-red-500/20 text-red-400 border-red-500/40',
            warnings: warnings
        };
    }

    // 🟡 GELTONA (Rizika)
    if (windSpeedMs > 3.0 || windGustsMs > 4.5 || tempC > 22 || rainProb > 15) {
        return {
            status: 'yellow',
            icon: '🟡',
            text: 'Rizika',
            badgeClass: 'bg-amber-500/20 text-amber-400 border-amber-500/40',
            warnings: [`Vėjas (${windSpeedMs} m/s) ant ribos.`]
        };
    }

    // 🟢 ŽALIA (Tinka)
    return {
        status: 'green',
        icon: '🟢',
        text: 'Tinka',
        badgeClass: 'bg-green-500/20 text-green-400 border-green-500/40',
        warnings: []
    };
}

function renderLiveSprayStatus(current, hourly) {
    const liveCard = document.getElementById('live-spray-card');
    if (!liveCard || !current) return;

    const windSpeedMs = parseFloat((current.wind_speed_10m / 3.6).toFixed(1));
    const windGustsMs = parseFloat((current.wind_gusts_10m / 3.6).toFixed(1));
    const tempC = parseFloat(current.temperature_2m.toFixed(1));
    const humidity = current.relative_humidity_2m;
    const rainMm = current.rain || current.precipitation || 0;

    // Paimame artimiausių valandų lietaus tikimybę
    const rainProb = (hourly.precipitation_probability && hourly.precipitation_probability.length > 0) 
        ? hourly.precipitation_probability[0] 
        : 0;

    const evaluation = evaluateSprayCondition(windSpeedMs, windGustsMs, tempC, rainProb, rainMm);

    let statusTitle = "🟢 ŠIUO METU PURKŠTI GALIMA (Optimalios sąlygos)";
    let statusDesc = "Vėjo greitis neviršija leistinų normų, artimiausiu metu lietaus nenumatoma, temperatūra tinkama.";
    let borderColor = "border-tractorPrimary";
    let bgColor = "bg-myPostBg";

    if (evaluation.status === 'red') {
        statusTitle = "🔴 PURKŠTI DRAUDŽIAMA ARBA NEREKOMENDUOJAMA";
        borderColor = "border-red-600";
        bgColor = "bg-red-950/30";
        statusDesc = `Priežastys: ${evaluation.warnings.join(' ')}`;
    } else if (evaluation.status === 'yellow') {
        statusTitle = "🟡 RIZIKINGOS PURŠKIMO SĄLYGOS";
        borderColor = "border-amber-500";
        bgColor = "bg-amber-950/30";
        statusDesc = `Pastaba: Vėjas (${windSpeedMs} m/s) ant ribos. Rekomenduojama naudoti antilašinius purkštukus.`;
    }

    liveCard.className = `${bgColor} border-2 ${borderColor} rounded-2xl p-6 md:p-8 shadow-2xl space-y-6 transition-all`;
    liveCard.innerHTML = `
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-tractorBorder/70 pb-5">
            <div class="space-y-1.5 flex-1">
                <span class="text-xs uppercase font-extrabold tracking-wider ${evaluation.status === 'green' ? 'text-green-400' : (evaluation.status === 'yellow' ? 'text-amber-400' : 'text-red-400')}">
                    Agrometeorologinis verdiktas
                </span>
                <h3 class="font-oswald text-2xl md:text-3xl font-bold text-white tracking-wide">${statusTitle}</h3>
                <p class="text-xs md:text-sm text-slate-200 leading-relaxed">${statusDesc}</p>
            </div>
            <div class="text-right shrink-0">
                <span class="text-[10px] text-slate-400 block uppercase font-bold">Oro temperatūra</span>
                <span class="text-3xl md:text-4xl font-black text-white font-mono">${tempC > 0 ? '+' : ''}${tempC}°C</span>
            </div>
        </div>

        <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs md:text-sm">
            <div class="bg-tractorBg/80 p-4 rounded-xl border border-tractorBorder space-y-1">
                <span class="text-slate-400 text-xs block">💨 Vėjas (2m aukštyje)</span>
                <strong class="font-mono text-lg font-bold ${windSpeedMs > 4.5 ? 'text-red-400' : 'text-green-400'}">${windSpeedMs} m/s</strong>
                <span class="text-[11px] text-slate-300 block">Gūsiai: <strong class="${windGustsMs > 6 ? 'text-red-400' : 'text-white'}">${windGustsMs} m/s</strong></span>
            </div>

            <div class="bg-tractorBg/80 p-4 rounded-xl border border-tractorBorder space-y-1">
                <span class="text-slate-400 text-xs block">💧 Krituliai šiuo metu</span>
                <strong class="text-white font-mono text-lg font-bold">${rainMm} mm</strong>
                <span class="text-[11px] ${rainProb > 30 ? 'text-red-400 font-bold' : 'text-green-400'} block">
                    Lietaus tikimybė: ${rainProb}%
                </span>
            </div>

            <div class="bg-tractorBg/80 p-4 rounded-xl border border-tractorBorder space-y-1">
                <span class="text-slate-400 text-xs block">🌫️ Santykinė oro drėgmė</span>
                <strong class="text-white font-mono text-lg font-bold ${humidity < 50 ? 'text-amber-400' : 'text-green-400'}">${humidity}%</strong>
                <span class="text-[11px] text-slate-300 block">${humidity > 50 ? 'Optimali drėgmė' : 'Sausa (garavimo rizika)'}</span>
            </div>

            <div class="bg-tractorBg/80 p-4 rounded-xl border border-tractorBorder space-y-1">
                <span class="text-slate-400 text-xs block">🌱 Dirvos temp. (paviršius)</span>
                <strong class="text-green-400 font-mono text-lg font-bold">+${(current.soil_temperature_0cm || 12).toFixed(1)}°C</strong>
                <span class="text-[11px] text-slate-300 block">Dirvos būklė</span>
            </div>
        </div>
    `;
}

// ⏱️ VALANDŲ GRAFIKAS SU TA PAČIA FORMULE
function renderHourlyForecast(hourly) {
    const grid = document.getElementById('hourly-forecast-grid');
    if (!grid || !hourly || !hourly.time) return;

    const now = new Date();
    let startIndex = 0;

    for (let i = 0; i < hourly.time.length; i++) {
        const itemDate = new Date(hourly.time[i]);
        if (itemDate >= now || (itemDate.getDate() === now.getDate() && itemDate.getHours() === now.getHours())) {
            startIndex = i;
            break;
        }
    }

    const items = [];
    const maxItems = Math.min(hourly.time.length, startIndex + 32);

    for (let i = startIndex; i < maxItems; i++) {
        const timeStr = hourly.time[i];
        const dateObj = new Date(timeStr);
        const hour = dateObj.getHours();
        const dayName = dateObj.toLocaleDateString('lt-LT', { weekday: 'short' });
        const isCurrentHour = i === startIndex;

        const windSpeedMs = parseFloat((hourly.wind_speed_10m[i] / 3.6).toFixed(1));
        const windGustsMs = parseFloat((hourly.wind_gusts_10m[i] / 3.6).toFixed(1));
        const tempC = Math.round(hourly.temperature_2m[i]);
        const rainProb = hourly.precipitation_probability[i] || 0;
        const rainMm = hourly.rain ? hourly.rain[i] : 0;

        // 🌟 TAIKOME TĄ PAČIĄ FORMULĘ
        const evalResult = evaluateSprayCondition(windSpeedMs, windGustsMs, tempC, rainProb, rainMm);

        items.push(`
            <div class="bg-tractorBg border ${isCurrentHour ? 'border-tractorPrimary ring-2 ring-tractorPrimary' : 'border-tractorBorder'} rounded-xl p-3 text-center space-y-1.5 flex flex-col justify-between">
                <div class="border-b border-tractorBorder/60 pb-1">
                    <span class="text-[10px] text-slate-400 uppercase block font-bold">${isCurrentHour ? 'DABAR' : dayName}</span>
                    <strong class="text-white text-xs font-mono">${String(hour).padStart(2, '0')}:00</strong>
                </div>

                <div class="text-xs font-bold ${evalResult.badgeClass} py-1 px-1.5 rounded-lg border flex items-center justify-center gap-1">
                    <span>${evalResult.icon}</span> <span>${evalResult.text}</span>
                </div>

                <div class="text-[11px] text-slate-300 space-y-0.5 pt-1">
                    <div>💨 <strong>${windSpeedMs} m/s</strong></div>
                    <div class="text-[10px] text-slate-400">gūs. ${windGustsMs} m/s</div>
                    <div>🌡️ <strong>${tempC}°C</strong></div>
                    <div class="${rainProb > 30 ? 'text-blue-400 font-bold' : 'text-slate-400'}">💧 ${rainProb}%</div>
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
            <div class="text-2xl font-bold text-white font-mono">+${soilTemp6cm}°C</div>
            <p class="text-xs text-slate-300">Dirvos temperatūra sėklos gylyje (6 cm).</p>
            <div class="text-xs text-green-400 font-bold pt-2 border-t border-tractorBorder/50">${sowingStatus}</div>
        </div>

        <div class="bg-tractorSurface border border-tractorBorder rounded-2xl p-6 shadow-xl space-y-2">
            <span class="text-xs uppercase font-bold text-amber-400 tracking-wider block">📜 Teisinis purškimo reglamentas</span>
            <p class="text-xs text-slate-200 leading-relaxed">
                Pagal LR ŽŪM reikalavimus, purkšti AAP draudžiama, kai vėjo greitis <strong>> 3.0 m/s</strong> (su standartiniais plyšiniais purkštukais) arba <strong>> 4.5 m/s</strong> (su antilašiniais IDN purkštukais).
            </p>
        </div>

        <div class="bg-tractorSurface border border-tractorBorder rounded-2xl p-6 shadow-xl space-y-2">
            <span class="text-xs uppercase font-bold text-blue-400 tracking-wider block">💦 Garavimo indeksas (Delta T)</span>
            <p class="text-xs text-slate-200 leading-relaxed">
                Esant karštam orui (>23°C) ir mažam oro drėgnumui (<50%), lašeliai išgaruoja ore nepasiekę piktžolių lapų. Purkškite anksti ryte arba po 19:00 val.
            </p>
        </div>
    `;
}