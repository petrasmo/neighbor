// js/settings.js
import { db, auth } from './firebase.js';
import { showDialog } from './ui.js';

let mapInstance = null;
let markerInstance = null;
let currentCoords = { lat: 54.8985, lon: 23.9036 };

export function initSettingsTab(currentUser, userData) {
    currentCoords.lat = userData?.garageLat || 54.8985;
    currentCoords.lon = userData?.garageLon || 23.9036;

    const container = document.getElementById('view-tab-settings');
    container.innerHTML = `
        <div class="bg-tractorSurface border border-tractorBorder p-6 md:p-8 rounded-2xl space-y-6 shadow-xl">
            <div class="border-b border-tractorBorder/70 pb-4">
                <h2 class="font-oswald text-2xl font-bold uppercase tracking-wider text-white">Paskyros nustatymai</h2>
                <p class="text-xs text-slate-400 mt-1">Nurodykite savo ūkio kontaktus ir tikslią bazės vietą žemėlapyje.</p>
            </div>
            
            <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div class="space-y-1.5">
                    <label class="text-[11px] font-bold text-slate-300 uppercase tracking-wider">Vardas / Ūkio pavadinimas</label>
                    <input id="set-name-input" type="text" value="${userData?.name || ''}" 
                        class="w-full h-11 bg-tractorBg border border-tractorBorder focus:border-tractorPrimary rounded-xl px-4 text-xs text-white outline-none transition">
                </div>

                <div class="space-y-1.5">
                    <label class="text-[11px] font-bold text-slate-300 uppercase tracking-wider">Telefono numeris</label>
                    <input id="set-phone-input" type="text" value="${userData?.phone || '+370'}" 
                        class="w-full h-11 bg-tractorBg border border-tractorBorder focus:border-tractorPrimary rounded-xl px-4 text-xs text-white outline-none transition">
                </div>
            </div>

            <div class="space-y-2 bg-tractorBg/60 p-4 rounded-xl border border-tractorBorder/60">
                <div class="flex justify-between items-center text-xs">
                    <span class="text-[11px] font-bold text-slate-300 uppercase tracking-wider">Pranešimų gavimo spindulys</span>
                    <span id="set-dist-label" class="font-bold text-tractorPrimaryLight bg-tractorPrimary/20 px-3 py-1 rounded-lg border border-tractorPrimary/40">
                        ${userData?.notificationDistance || 20} km
                    </span>
                </div>
                <input id="set-dist-input" type="range" min="5" max="100" value="${userData?.notificationDistance || 20}" 
                    class="w-full accent-tractorPrimary cursor-pointer">
                <p class="text-[11px] text-slate-500">Gausite SOS pranešimus iš kaimynų, kurie yra šiuo atstumu nuo jūsų garažo.</p>
            </div>

            <div class="space-y-2">
                <div class="flex justify-between items-center">
                    <label class="text-[11px] font-bold text-slate-300 uppercase tracking-wider">Garažo / Ūkio vieta žemėlapyje</label>
                    <span id="coords-text" class="text-[10px] text-slate-400 font-mono">
                        ${currentCoords.lat.toFixed(4)}, ${currentCoords.lon.toFixed(4)}
                    </span>
                </div>
                <div id="settings-map" class="h-64 w-full rounded-xl border border-tractorBorder z-0 relative shadow-inner overflow-hidden"></div>
                <p class="text-[11px] text-slate-500">Spauskite bet kur ant žemėlapio arba vilkite mėlyną žymeklį į savo technikos vietą.</p>
            </div>

            <button id="save-settings-btn" class="w-full h-12 bg-tractorPrimary hover:bg-tractorPrimaryHover text-white font-bold rounded-xl text-xs uppercase tracking-wider shadow-lg shadow-tractorPrimary/20 flex items-center justify-center gap-2 cursor-pointer transition">
                <span>💾</span> Išsaugoti nustatymus
            </button>

            <div class="border-t border-tractorBorder/70 pt-4 mt-6">
                <button id="delete-account-btn" class="w-full h-10 border border-red-900/50 hover:bg-red-950/40 text-red-400 font-bold rounded-xl text-xs transition flex items-center justify-center gap-2">
                    <span>⚠️</span> Ištrinti paskyrą ir visus duomenis
                </button>
            </div>
        </div>
    `;

    document.getElementById('set-dist-input').oninput = (e) => {
        document.getElementById('set-dist-label').textContent = `${e.target.value} km`;
    };

    document.getElementById('save-settings-btn').onclick = async () => {
        const name = document.getElementById('set-name-input').value.trim();
        const phone = document.getElementById('set-phone-input').value.trim();
        const dist = parseInt(document.getElementById('set-dist-input').value);

        await db.collection("users").doc(currentUser.uid).update({
            name: name,
            phone: phone,
            notificationDistance: dist,
            garageLat: currentCoords.lat,
            garageLon: currentCoords.lon,
            isSetupComplete: true
        });

        if (userData) {
            userData.name = name;
            userData.phone = phone;
            userData.notificationDistance = dist;
            userData.garageLat = currentCoords.lat;
            userData.garageLon = currentCoords.lon;
        }

        showDialog("Pavyko! ✅", "Nustatymai sėkmingai išsaugoti.", "🌾");
    };

    document.getElementById('delete-account-btn').onclick = () => {
        showDialog("Dėmesio", "Ar tikrai norite pašalinti paskyrą ir visus savo duomenis negrįžtamai?", "⚠️", async () => {
            await db.collection("users").doc(currentUser.uid).delete();
            await auth.currentUser.delete();
            location.reload();
        }, true);
    };
}

// Funkcija, kurią iškviečiame persijungus į nustatymų tabą
export function refreshSettingsMap() {
    const mapEl = document.getElementById('settings-map');
    if (!mapEl) return;

    if (!mapInstance) {
        mapInstance = L.map('settings-map', {
            zoomControl: true
        }).setView([currentCoords.lat, currentCoords.lon], 12);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '© OpenStreetMap'
        }).addTo(mapInstance);

        markerInstance = L.marker([currentCoords.lat, currentCoords.lon], { 
            draggable: true 
        }).addTo(mapInstance);

        markerInstance.on('dragend', (e) => {
            const pos = e.target.getLatLng();
            currentCoords.lat = pos.lat;
            currentCoords.lon = pos.lng;
            updateCoordsDisplay();
        });

        mapInstance.on('click', (e) => {
            markerInstance.setLatLng(e.latlng);
            currentCoords.lat = e.latlng.lat;
            currentCoords.lon = e.latlng.lng;
            updateCoordsDisplay();
        });
    }

    // Priverstinis perskaičiavimas, kad pilkai nerodytų
    setTimeout(() => {
        if (mapInstance) {
            mapInstance.invalidateSize();
            mapInstance.setView([currentCoords.lat, currentCoords.lon]);
        }
    }, 150);
}

function updateCoordsDisplay() {
    const el = document.getElementById('coords-text');
    if (el) {
        el.textContent = `${currentCoords.lat.toFixed(4)}, ${currentCoords.lon.toFixed(4)}`;
    }
}