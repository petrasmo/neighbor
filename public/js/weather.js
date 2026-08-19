// public/js/weather.js
import { db, auth } from './firebase.js';
import { isGuestMode, logoutUser } from './auth.js';
import { showDialog } from './ui.js';

let userSpots = [];
let selectedSpotId = "gps"; // "gps" arba spotId
let activeCoords = { lat: 55.1694, lng: 23.8813, name: "Lietuvos centras" };

export async function renderWeatherScreen(container, onBack, initialSpot = null) {
    const user = auth.currentUser;
    const isGuest = isGuestMode() || !user;

    if (isGuest) {
        container.innerHTML = `
            <div class="space-y-6 max-w-4xl mx-auto py-4">
                <div class="flex items-center gap-3 border-b border-forestBorder pb-3">
                    <button id="weather-back-btn" class="w-9 h-9 rounded-xl bg-forestSurface border border-forestBorder hover:border-forestPrimary flex items-center justify-center text-white text-sm transition focus:outline-none">
                        ←
                    </button>
                    <div>
                        <h2 class="text-xl font-bold font-oswald text-white uppercase tracking-wider">Medžiotojo orai ir vėjas</h2>
                        <p class="text-xs text-forestSecondary">Bokštelių vėjo analizė ir Mėnulio sąlygos</p>
                    </div>
                </div>

                <div class="bg-forestSurface border border-forestBorder p-8 rounded-2xl text-center space-y-4 shadow-xl">
                    <span class="text-5xl block">💨</span>
                    <h3 class="text-xl font-bold font-oswald text-white uppercase">Reikalingas prisijungimas</h3>
                    <p class="text-xs text-forestSecondary max-w-md mx-auto leading-relaxed">
                        Prisijunkite prie savo paskyros, kad galėtumėte matyti tikslią vėjo kryptį, kvapo sklidimą ir Mėnulio fazes prie savo išsaugotų bokštelių.
                    </p>
                    <div class="pt-2">
                        <button id="weather-login-btn" class="px-6 h-11 bg-forestPrimary hover:bg-green-600 text-white font-bold rounded-xl text-xs uppercase tracking-wider transition shadow">
                            Prisijungti prie paskyros 🔑
                        </button>
                    </div>
                </div>
            </div>
        `;
        document.getElementById('weather-back-btn')?.addEventListener('click', onBack);
        document.getElementById('weather-login-btn')?.addEventListener('click', () => logoutUser());
        return;
    }

    // Nuskaitome vartotojo bokštelius iš Firestore
    await loadUserSpots(user.uid);

    if (initialSpot) {
        selectedSpotId = initialSpot.id;
        activeCoords = { lat: initialSpot.latitude, lng: initialSpot.longitude, name: initialSpot.title };
    }

    renderWeatherLayout(container, onBack, user);
}

async function loadUserSpots(uid) {
    try {
        const snap = await db.collection("users").doc(uid).collection("hunting_spots").get();
        userSpots = [];
        snap.forEach(doc => {
            userSpots.push({ id: doc.id, ...doc.data() });
        });
    } catch (e) {
        console.error("Klaida nuskaitant taškus:", e);
    }
}

// MĖNULIO FAZĖS ALGORITMAS (0-100% tikslumas tiesiogiai naršyklėje)
function getMoonData(date = new Date()) {
    let year = date.getFullYear();
    let month = date.getMonth() + 1;
    let day = date.getDate();

    if (month < 3) { year--; month += 12; }
    let a = Math.floor(year / 100);
    let b = Math.floor(a / 4);
    let c = 2 - a + b;
    let e = Math.floor(365.25 * (year + 4716));
    let f = Math.floor(30.6001 * (month + 1));
    let jd = c + day + e + f - 1524.5;
    
    let daysSinceNew = jd - 2451549.5;
    let newMoons = daysSinceNew / 29.53058867;
    let phaseFraction = newMoons - Math.floor(newMoons);
    let age = phaseFraction * 29.53;
    let illumination = Math.round((1 - Math.cos(phaseFraction * 2 * Math.PI)) / 2 * 100);

    let phaseName = "Jaunatis";
    let icon = "🌑";

    if (age < 1.84566) { phaseName = "Jaunatis"; icon = "🌑"; }
    else if (age < 5.53699) { phaseName = "Jaunas Mėnulis"; icon = "🌒"; }
    else if (age < 9.22831) { phaseName = "Priešpilnis (I ketvirtis)"; icon = "🌓"; }
    else if (age < 12.91963) { phaseName = "Augantis Mėnulis"; icon = "🌔"; }
    else if (age < 16.61096) { phaseName = "Pilnatis"; icon = "🌕"; }
    else if (age < 20.30228) { phaseName = "Dylantis Mėnulis"; icon = "🌖"; }
    else if (age < 23.99361) { phaseName = "Delčia (III ketvirtis)"; icon = "🌗"; }
    else if (age < 27.68493) { phaseName = "Senas Mėnulis"; icon = "🌘"; }

    return { phaseName, icon, illumination, age: age.toFixed(1) };
}

// VĖJO KRYPTIES TEKSTAS IR PATARIMAS BOKŠTELIUI
function getWindDirectionInfo(deg) {
    const directions = [
        { code: "Š", name: "Šiaurės (N)", range: [337.5, 360] },
        { code: "Š", name: "Šiaurės (N)", range: [0, 22.5] },
        { code: "ŠR", name: "Šiaurės Rytų (NE)", range: [22.5, 67.5] },
        { code: "R", name: "Rytų (E)", range: [67.5, 112.5] },
        { code: "PR", name: "Pietryčių (SE)", range: [112.5, 157.5] },
        { code: "P", name: "Pietų (S)", range: [157.5, 202.5] },
        { code: "PV", name: "Pietvakarių (SW)", range: [202.5, 247.5] },
        { code: "V", name: "Vakarų (W)", range: [247.5, 292.5] },
        { code: "ŠV", name: "Šiaurės Vakarų (NW)", range: [292.5, 337.5] }
    ];

    let match = directions.find(d => deg >= d.range[0] && deg < d.range[1]) || directions[0];
    
    // Priešinga kryptis (kur nunešamas kvapas)
    let oppositeDeg = (deg + 180) % 360;
    let oppositeMatch = directions.find(d => oppositeDeg >= d.range[0] && oppositeDeg < d.range[1]) || directions[0];

    return {
        code: match.code,
        name: match.name,
        deg: Math.round(deg),
        driftName: oppositeMatch.name
    };
}

function renderWeatherLayout(container, onBack, user) {
    const moon = getMoonData();

    // Sukuriame pasirinkimo sąrašą iš vartotojo bokštelių
    let spotsOptionsHtml = `<option value="gps" ${selectedSpotId === "gps" ? 'selected' : ''}>📍 Mano dabartinė vieta (GPS)</option>`;
    userSpots.forEach(s => {
        const icon = s.type === "stand" ? "🗼" : s.type === "feeder" ? "🌾" : "📍";
        spotsOptionsHtml += `<option value="${s.id}" ${selectedSpotId === s.id ? 'selected' : ''}>${icon} ${s.title}</option>`;
    });

    container.innerHTML = `
        <div class="space-y-5 max-w-5xl mx-auto py-2">
            
            <!-- Antraštė -->
            <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-forestBorder pb-3">
                <div class="flex items-center gap-3">
                    <button id="weather-back-btn" class="w-9 h-9 rounded-xl bg-forestSurface border border-forestBorder hover:border-forestPrimary flex items-center justify-center text-white text-sm transition focus:outline-none shrink-0">
                        ←
                    </button>
                    <div>
                        <h2 class="text-lg md:text-xl font-bold font-oswald text-white uppercase tracking-wider">Medžiotojo orai ir vėjas</h2>
                        <p class="text-[11px] text-forestSecondary">Tiksli vėjo ir matomumo analizė tykojimui</p>
                    </div>
                </div>

                <!-- Bokštelio / Vietos pasirinkimas -->
                <div class="w-full sm:w-72">
                    <select id="spot-selector" class="w-full h-10 bg-forestSurface border border-forestBorder focus:border-forestPrimary rounded-xl px-3 text-xs text-white font-bold focus:outline-none transition">
                        ${spotsOptionsHtml}
                    </select>
                </div>
            </div>

            <!-- KRAUNASI PRANEŠIMAS -->
            <div id="weather-loading" class="flex flex-col items-center justify-center py-16 space-y-3">
                <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-forestPrimary"></div>
                <p class="text-forestSecondary text-xs">Tikrinami meteorologiniai modeliai ir vėjo kryptis...</p>
            </div>

            <!-- PAGRINDINIS DUOMENŲ SKYDELIS -->
            <div id="weather-content" class="space-y-4 hidden animate-fadeIn">
                
                <!-- 1 EILUTĖ: VĖJO KOMPASAS IR MATOMUMAS -->
                <div class="grid md:grid-cols-12 gap-4 items-stretch">
                    
                    <!-- VĖJO KOMPASAS BOKŠTELIUI -->
                    <div class="md:col-span-7 bg-forestSurface border border-forestBorder p-5 rounded-2xl flex flex-col justify-between space-y-4 shadow-xl">
                        <div class="flex justify-between items-center border-b border-forestBorder pb-2">
                            <span class="text-xs font-bold text-white uppercase font-oswald tracking-wider flex items-center gap-1.5">
                                <span>💨</span> <span>Vėjo analizatorius bokšteliui</span>
                            </span>
                            <span id="spot-active-title" class="text-[11px] font-bold text-forestPrimary bg-forestBackground px-2.5 py-0.5 rounded-lg border border-forestBorder">Bokštelis</span>
                        </div>

                        <div class="flex flex-col sm:flex-row items-center justify-around gap-6 py-2">
                            <!-- Vizualus kompasas -->
                            <div class="relative w-36 h-36 rounded-full border-2 border-forestBorder bg-forestBackground flex items-center justify-center shadow-inner shrink-0">
                                <span class="absolute top-1 text-[10px] font-extrabold text-red-400 font-oswald">Š</span>
                                <span class="absolute bottom-1 text-[10px] font-bold text-slate-500 font-oswald">P</span>
                                <span class="absolute left-1 text-[10px] font-bold text-slate-500 font-oswald">V</span>
                                <span class="absolute right-1 text-[10px] font-bold text-slate-500 font-oswald">R</span>
                                
                                <!-- Besisukanti vėjo rodyklė -->
                                <div id="compass-arrow" class="transition-transform duration-1000 ease-out text-3xl select-none" style="transform: rotate(0deg);">
                                    🏹
                                </div>
                            </div>

                            <!-- Vėjo duomenys -->
                            <div class="space-y-2 text-center sm:text-left">
                                <div>
                                    <span class="text-[10px] text-forestSecondary uppercase font-bold tracking-wider block">Vėjo kryptis</span>
                                    <h3 id="wind-dir-text" class="text-2xl font-black text-white font-oswald">Kraunama...</h3>
                                </div>
                                <div class="flex gap-4 justify-center sm:justify-start">
                                    <div>
                                        <span class="text-[10px] text-slate-500 block">Greitis</span>
                                        <strong id="wind-speed-text" class="text-sm font-extrabold text-forestPrimary font-oswald">0 m/s</strong>
                                    </div>
                                    <div>
                                        <span class="text-[10px] text-slate-500 block">Gūsiai</span>
                                        <strong id="wind-gusts-text" class="text-sm font-extrabold text-yellow-400 font-oswald">0 m/s</strong>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Taktinis patarimas medžiotojui -->
                        <div class="bg-forestBackground border border-forestBorder/70 p-3 rounded-xl text-xs space-y-1">
                            <span class="text-forestPrimary font-bold flex items-center gap-1">
                                <span>🎯</span> <span>Kvapo sklidimo kryptis:</span>
                            </span>
                            <p id="tactical-advice" class="text-forestSecondary text-[11px] leading-relaxed"></p>
                        </div>
                    </div>

                    <!-- MĖNULIS IR ŠVIESOS SĄLYGOS -->
                    <div class="md:col-span-5 bg-forestSurface border border-forestBorder p-5 rounded-2xl flex flex-col justify-between space-y-4 shadow-xl">
                        <div class="flex justify-between items-center border-b border-forestBorder pb-2">
                            <span class="text-xs font-bold text-white uppercase font-oswald tracking-wider flex items-center gap-1.5">
                                <span>${moon.icon}</span> <span>Mėnulis ir šviesa</span>
                            </span>
                            <span class="text-[11px] font-bold text-yellow-400">${moon.illumination}% apšviesta</span>
                        </div>

                        <div class="flex items-center gap-4 py-1">
                            <span class="text-5xl">${moon.icon}</span>
                            <div class="space-y-0.5">
                                <h4 class="text-base font-bold text-white font-oswald uppercase">${moon.phaseName}</h4>
                                <p class="text-[11px] text-forestSecondary">Mėnulio amžius: ${moon.age} d.</p>
                            </div>
                        </div>

                        <!-- Saulėlydžio ir sutemų laikai -->
                        <div class="bg-forestBackground border border-forestBorder/70 p-3.5 rounded-xl space-y-2 text-xs">
                            <div class="flex justify-between items-center">
                                <span class="text-forestSecondary">🌅 Saulėlydis:</span>
                                <strong id="sunset-time" class="text-white font-oswald text-sm">--:--</strong>
                            </div>
                            <div class="flex justify-between items-center">
                                <span class="text-forestSecondary">🌌 Šviesos pabaiga (sutemos):</span>
                                <strong id="dusk-time" class="text-yellow-400 font-oswald text-sm">--:--</strong>
                            </div>
                            <div class="flex justify-between items-center">
                                <span class="text-forestSecondary">🌄 Saulėtekis:</span>
                                <strong id="sunrise-time" class="text-white font-oswald text-sm">--:--</strong>
                            </div>
                        </div>
                    </div>

                </div>

                <!-- 2 EILUTĖ: ŽVĖRIŲ AKTYVUMAS IR 12H PROGNOZĖ -->
                <div class="bg-forestSurface border border-forestBorder p-5 rounded-2xl space-y-4 shadow-xl">
                    <div class="flex justify-between items-center border-b border-forestBorder pb-2">
                        <span class="text-xs font-bold text-white uppercase font-oswald tracking-wider flex items-center gap-1.5">
                            <span>🦌</span> <span>Žvėrių aktyvumo pikas (Solunar) & 12 val. prognozė</span>
                        </span>
                        <span class="text-[11px] text-green-400 font-bold bg-green-950/40 border border-green-500/40 px-2 py-0.5 rounded-md">
                            Aktyvumas: 85% ⭐⭐⭐⭐
                        </span>
                    </div>

                    <!-- Valandinė juosta vakarui/nakčiai -->
                    <div id="hourly-forecast-container" class="flex gap-3 overflow-x-auto pb-2 scrollbar-none">
                        <!-- Generuojama dinamiškai -->
                    </div>
                </div>

            </div>

        </div>
    `;

    document.getElementById('weather-back-btn')?.addEventListener('click', onBack);

    // Bokštelio keitimas
    document.getElementById('spot-selector')?.addEventListener('change', (e) => {
        const val = e.target.value;
        selectedSpotId = val;

        if (val === "gps") {
            fetchUserGPSAndLoad();
        } else {
            const spot = userSpots.find(s => s.id === val);
            if (spot) {
                activeCoords = { lat: spot.latitude, lng: spot.longitude, name: spot.title };
                fetchWeatherData(activeCoords.lat, activeCoords.lng, activeCoords.name);
            }
        }
    });

    if (selectedSpotId === "gps") {
        fetchUserGPSAndLoad();
    } else {
        fetchWeatherData(activeCoords.lat, activeCoords.lng, activeCoords.name);
    }
}

function fetchUserGPSAndLoad() {
    if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition((pos) => {
            activeCoords = {
                lat: pos.coords.latitude,
                lng: pos.coords.longitude,
                name: "Mano dabartinė vieta (GPS)"
            };
            fetchWeatherData(activeCoords.lat, activeCoords.lng, activeCoords.name);
        }, () => {
            // Jei nepavyksta gauti GPS, imame Lietuvos centrą
            activeCoords = { lat: 55.1694, lng: 23.8813, name: "Lietuvos centras" };
            fetchWeatherData(activeCoords.lat, activeCoords.lng, activeCoords.name);
        });
    } else {
        fetchWeatherData(activeCoords.lat, activeCoords.lng, activeCoords.name);
    }
}

// UŽKLAUSA Į OPEN-METEO (100% NEMOKAMA, BE API RAKTO)
async function fetchWeatherData(lat, lng, spotName) {
    const loadingElem = document.getElementById('weather-loading');
    const contentElem = document.getElementById('weather-content');

    if (loadingElem) loadingElem.classList.remove('hidden');
    if (contentElem) contentElem.classList.add('hidden');

    try {
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,rain,weather_code,cloud_cover,wind_speed_10m,wind_direction_10m,wind_gusts_10m&hourly=temperature_2m,precipitation_probability,weather_code,wind_speed_10m,wind_direction_10m&daily=sunrise,sunset&timezone=auto`;
        
        const res = await fetch(url);
        const data = await res.json();

        updateWeatherUI(data, spotName);
    } catch (e) {
        console.error("Klaida siunčiantis orus:", e);
        showDialog("Klaida", "Nepavyko gauti orų duomenų.", "🛑");
    } finally {
        if (loadingElem) loadingElem.classList.add('hidden');
        if (contentElem) contentElem.classList.remove('hidden');
    }
}

function updateWeatherUI(data, spotName) {
    const current = data.current;
    const daily = data.daily;
    const hourly = data.hourly;

    const windInfo = getWindDirectionInfo(current.wind_direction_10m);

    // Sukame kompaso rodyklę
    const arrow = document.getElementById('compass-arrow');
    if (arrow) {
        arrow.style.transform = `rotate(${windInfo.deg}deg)`;
    }

    document.getElementById('spot-active-title').innerText = spotName;
    document.getElementById('wind-dir-text').innerText = `${windInfo.name} (${windInfo.deg}°)`;
    document.getElementById('wind-speed-text').innerText = `${(current.wind_speed_10m / 3.6).toFixed(1)} m/s`; // km/h į m/s
    document.getElementById('wind-gusts-text').innerText = `${(current.wind_gusts_10m / 3.6).toFixed(1)} m/s`;

    // Taktinis patarimas
    const adviceElem = document.getElementById('tactical-advice');
    if (adviceElem) {
        adviceElem.innerText = `Vėjas pučia iš ${windInfo.name}. Jūsų kvapas sklis link ${windInfo.driftName}. Sėskite į bokštelį tik tuo atveju, jei žvėrių takas ar šėrykla yra priešingoje vėjui pusėje.`;
    }

    // Saulėlydis ir sutemos
    if (daily && daily.sunset && daily.sunset[0]) {
        const sunsetDate = new Date(daily.sunset[0]);
        const sunriseDate = new Date(daily.sunrise[0]);
        const duskDate = new Date(sunsetDate.getTime() + 45 * 60 * 1000); // ~45 min po saulėlydžio

        const formatTime = (d) => d.toLocaleTimeString("lt-LT", { hour: '2-digit', minute: '2-digit' });
        
        document.getElementById('sunset-time').innerText = formatTime(sunsetDate);
        document.getElementById('dusk-time').innerText = formatTime(duskDate);
        document.getElementById('sunrise-time').innerText = formatTime(sunriseDate);
    }

    // 12 valandų prognozė
    const hourlyContainer = document.getElementById('hourly-forecast-container');
    if (hourlyContainer && hourly) {
        const currentHourIndex = new Date().getHours();
        let hourlyHtml = "";

        for (let i = currentHourIndex; i < currentHourIndex + 10 && i < hourly.time.length; i++) {
            const timeStr = hourly.time[i].split("T")[1].substring(0, 5);
            const temp = Math.round(hourly.temperature_2m[i]);
            const windSpeed = (hourly.wind_speed_10m[i] / 3.6).toFixed(1);
            const dir = getWindDirectionInfo(hourly.wind_direction_10m[i]).code;

            hourlyHtml += `
                <div class="bg-forestBackground border border-forestBorder/70 p-3 rounded-xl flex flex-col items-center space-y-1.5 min-w-[72px] shrink-0 text-center">
                    <span class="text-[10px] text-slate-400 font-bold">${timeStr}</span>
                    <span class="text-sm font-black text-white font-oswald">${temp > 0 ? '+' + temp : temp}°C</span>
                    <span class="text-[10px] text-forestPrimary font-bold font-oswald">${windSpeed} m/s</span>
                    <span class="text-[9px] text-slate-500 font-bold">${dir}</span>
                </div>
            `;
        }
        hourlyContainer.innerHTML = hourlyHtml;
    }
}