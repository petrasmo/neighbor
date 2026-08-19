// public/js/huntingGrounds.js
import { db, auth } from './firebase.js';
import { isGuestMode, logoutUser } from './auth.js';
import { showDialog } from './ui.js';

let mapInstance = null;
let markersLayer = null;
let currentSpots = [];
let activeFilter = "Visi";
let selectedLatLng = null;

const SPOT_TYPES = {
    stand: { label: "Bokštelis", icon: "🗼", color: "#4CAF50" },
    feeder: { label: "Šėrykla / Jaukykla", icon: "🌾", color: "#FFA726" },
    salt: { label: "Druskos lapykla", icon: "🧂", color: "#42A5F5" },
    camera: { label: "Miško kamera", icon: "📷", color: "#AB47BC" },
    sighting: { label: "Matytas žvėris", icon: "🦌", color: "#EF5350" },
    obstacle: { label: "Kliūtis / Pelkė", icon: "⚠️", color: "#FF7043" }
};

export async function renderHuntingGroundsScreen(container, onBack) {
    const user = auth.currentUser;
    const isGuest = isGuestMode() || !user;

    // Jei svečias – prašome prisijungti
    if (isGuest) {
        container.innerHTML = `
            <div class="space-y-6 max-w-4xl mx-auto py-4">
                <div class="flex items-center gap-3 border-b border-forestBorder pb-3">
                    <button id="grounds-back-btn" class="w-9 h-9 rounded-xl bg-forestSurface border border-forestBorder hover:border-forestPrimary flex items-center justify-center text-white text-sm transition focus:outline-none">
                        ←
                    </button>
                    <div>
                        <h2 class="text-xl font-bold font-oswald text-white uppercase tracking-wider">Mano medžioklės plotai</h2>
                        <p class="text-xs text-forestSecondary">Bokštelių, šėryklų ir kamerų valdymas</p>
                    </div>
                </div>

                <div class="bg-forestSurface border border-forestBorder p-8 rounded-2xl text-center space-y-4 shadow-xl">
                    <span class="text-5xl block">🗺️</span>
                    <h3 class="text-xl font-bold font-oswald text-white uppercase">Privatus medžioklės žemėlapis</h3>
                    <p class="text-xs text-forestSecondary max-w-md mx-auto leading-relaxed">
                        Kad galėtumėte privačiai ir saugiai žymėtis savo bokštelius, šėryklas bei miško kameras palydoviniame žemėlapyje, prašome prisijungti prie savo paskyros.
                    </p>
                    <div class="pt-2">
                        <button id="grounds-login-btn" class="px-6 h-11 bg-forestPrimary hover:bg-green-600 text-white font-bold rounded-xl text-xs uppercase tracking-wider transition shadow">
                            Prisijungti prie paskyros 🔑
                        </button>
                    </div>
                </div>
            </div>
        `;
        document.getElementById('grounds-back-btn')?.addEventListener('click', onBack);
        document.getElementById('grounds-login-btn')?.addEventListener('click', () => logoutUser());
        return;
    }

    renderMapLayout(container, onBack, user);
}

function renderMapLayout(container, onBack, user) {
    container.innerHTML = `
        <div class="space-y-4 max-w-5xl mx-auto py-2">
            
            <!-- Viršutinė juosta -->
            <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-forestBorder pb-3">
                <div class="flex items-center gap-3">
                    <button id="grounds-back-btn" class="w-9 h-9 rounded-xl bg-forestSurface border border-forestBorder hover:border-forestPrimary flex items-center justify-center text-white text-sm transition focus:outline-none shrink-0">
                        ←
                    </button>
                    <div>
                        <h2 class="text-lg md:text-xl font-bold font-oswald text-white uppercase tracking-wider">Mano medžioklės plotai</h2>
                        <p id="spots-count-label" class="text-[11px] text-forestPrimary font-bold">Kraunami taškai...</p>
                    </div>
                </div>

                <!-- Mygtukai: GPS vieta ir Pridėti -->
                <div class="flex items-center gap-2 w-full sm:w-auto">
                    <button id="locate-me-btn" class="flex-1 sm:flex-initial h-10 px-3.5 bg-forestSurface border border-forestBorder hover:border-forestPrimary text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer">
                        <span>📍</span> <span>Kur aš esu (GPS)</span>
                    </button>
                    <button id="manual-add-btn" class="flex-1 sm:flex-initial h-10 px-4 bg-forestPrimary hover:bg-green-600 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition shadow cursor-pointer">
                        <span>+</span> <span>Pridėti tašką</span>
                    </button>
                </div>
            </div>

            <!-- Filtrai -->
            <div class="flex gap-2 overflow-x-auto pb-1 scrollbar-none select-none">
                <button class="spot-filter-btn px-3 py-1.5 rounded-xl text-xs font-bold transition border bg-forestPrimary text-white border-forestPrimary" data-type="Visi">Visi</button>
                <button class="spot-filter-btn px-3 py-1.5 rounded-xl text-xs font-bold transition border bg-forestSurface text-forestSecondary border-forestBorder" data-type="stand">🗼 Bokšteliai</button>
                <button class="spot-filter-btn px-3 py-1.5 rounded-xl text-xs font-bold transition border bg-forestSurface text-forestSecondary border-forestBorder" data-type="feeder">🌾 Šėryklos</button>
                <button class="spot-filter-btn px-3 py-1.5 rounded-xl text-xs font-bold transition border bg-forestSurface text-forestSecondary border-forestBorder" data-type="camera">📷 Kameros</button>
                <button class="spot-filter-btn px-3 py-1.5 rounded-xl text-xs font-bold transition border bg-forestSurface text-forestSecondary border-forestBorder" data-type="salt">🧂 Druskos</button>
                <button class="spot-filter-btn px-3 py-1.5 rounded-xl text-xs font-bold transition border bg-forestSurface text-forestSecondary border-forestBorder" data-type="sighting">🦌 Žvėrys</button>
                <button class="spot-filter-btn px-3 py-1.5 rounded-xl text-xs font-bold transition border bg-forestSurface text-forestSecondary border-forestBorder" data-type="obstacle">⚠️ Kliūtys</button>
            </div>

            <!-- ŽEMĖLAPIO KONTEINERIS -->
            <div class="relative w-full h-[62vh] min-h-[420px] rounded-2xl overflow-hidden border border-forestBorder shadow-2xl">
                <div id="hunting-map" class="w-full h-full z-10"></div>
                
                <div class="absolute bottom-3 left-3 z-[400] bg-forestSurface/90 backdrop-blur border border-forestBorder px-3 py-1.5 rounded-xl text-[11px] text-white shadow-lg pointer-events-none hidden sm:block">
                    💡 Spustelėkite žemėlapyje, kad pažymėtumėte naują vietą
                </div>
            </div>

        </div>

        <!-- MODALINIS LANGAS: NAUJO TAŠKO PRIDĖJIMAS -->
        <div id="spot-modal" class="fixed inset-0 bg-black/80 flex items-center justify-center z-[1000] hidden p-4">
            <div class="bg-forestSurface border border-forestBorder p-6 rounded-2xl max-w-md w-full space-y-4 shadow-2xl">
                <div class="flex justify-between items-center border-b border-forestBorder pb-3">
                    <h3 class="font-oswald text-lg font-bold text-white uppercase" id="modal-title">Pridėti vietą</h3>
                    <button id="close-modal-btn" class="text-forestSecondary hover:text-white text-lg font-bold">✕</button>
                </div>

                <form id="spot-form" class="space-y-3.5">
                    <input type="hidden" id="spot-id-input">
                    
                    <div class="space-y-1">
                        <label class="text-[10px] font-bold text-forestSecondary uppercase tracking-wider">Objekto tipas</label>
                        <select id="spot-type-select" class="w-full h-10 bg-forestBackground border border-forestBorder rounded-xl px-3 text-xs text-white focus:outline-none focus:border-forestPrimary">
                            <option value="stand">🗼 Bokštelis</option>
                            <option value="feeder">🌾 Šėrykla / Jaukykla</option>
                            <option value="salt">🧂 Druskos lapykla</option>
                            <option value="camera">📷 Miško kamera</option>
                            <option value="sighting">🦌 Matytas žvėris / Laimikis</option>
                            <option value="obstacle">⚠️ Kliūtis / Pelkė / Draudžiama zona</option>
                        </select>
                    </div>

                    <div class="space-y-1">
                        <label class="text-[10px] font-bold text-forestSecondary uppercase tracking-wider">Pavadinimas / Numeris</label>
                        <input type="text" id="spot-title-input" required placeholder="Pvz., Bokštelis prie Ąžuolo Nr. 4"
                            class="w-full h-10 bg-forestBackground border border-forestBorder focus:border-forestPrimary rounded-xl px-3 text-xs text-white placeholder-slate-500 focus:outline-none">
                    </div>

                    <div class="space-y-1">
                        <label class="text-[10px] font-bold text-forestSecondary uppercase tracking-wider">Pastabos ir detalės</label>
                        <textarea id="spot-notes-input" rows="2" placeholder="Pvz., 2 vietų, geras matomumas link miško..."
                            class="w-full bg-forestBackground border border-forestBorder focus:border-forestPrimary rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none resize-none"></textarea>
                    </div>

                    <div class="grid grid-cols-2 gap-2 text-[11px] text-slate-400 bg-forestBackground p-2 rounded-xl border border-forestBorder">
                        <div>Platuma (Lat): <span id="display-lat" class="text-white font-mono font-bold">0.00</span></div>
                        <div>Ilguma (Lng): <span id="display-lng" class="text-white font-mono font-bold">0.00</span></div>
                    </div>

                    <div class="flex gap-3 pt-2">
                        <button type="button" id="cancel-spot-btn" class="flex-1 h-11 bg-forestBackground border border-forestBorder text-white rounded-xl font-bold text-xs hover:bg-slate-800 transition cursor-pointer">
                            Atšaukti
                        </button>
                        <button type="submit" class="flex-1 h-11 bg-forestPrimary hover:bg-green-600 text-white rounded-xl font-bold text-xs transition shadow cursor-pointer">
                            Išsaugoti tašką
                        </button>
                    </div>
                </form>
            </div>
        </div>
    `;

    document.getElementById('grounds-back-btn')?.addEventListener('click', onBack);

    setTimeout(() => {
        initLeafletMap(user);
    }, 100);
}

function initLeafletMap(user) {
    if (typeof L === 'undefined') {
        console.error("Leaflet biblioteka dar neįkelta.");
        return;
    }

    if (mapInstance) {
        mapInstance.remove();
        mapInstance = null;
    }

    mapInstance = L.map('hunting-map', {
        center: [55.1694, 23.8813],
        zoom: 7,
        zoomControl: true
    });

    const satelliteLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Esri Satellite',
        maxZoom: 19
    }).addTo(mapInstance);

    const streetLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: 'OpenStreetMap',
        maxZoom: 19
    });

    L.control.layers({
        "🛰️ Palydovas": satelliteLayer,
        "🗺️ Žemėlapis": streetLayer
    }, null, { position: 'topright' }).addTo(mapInstance);

    markersLayer = L.layerGroup().addTo(mapInstance);

    mapInstance.on('click', (e) => {
        openSpotModal(e.latlng.lat, e.latlng.lng);
    });

    document.getElementById('locate-me-btn')?.addEventListener('click', () => {
        if ("geolocation" in navigator) {
            navigator.geolocation.getCurrentPosition((pos) => {
                const lat = pos.coords.latitude;
                const lng = pos.coords.longitude;
                mapInstance.setView([lat, lng], 16);
                
                L.circleMarker([lat, lng], {
                    radius: 8,
                    color: '#2ea043',
                    fillColor: '#3fb950',
                    fillOpacity: 0.8
                }).addTo(mapInstance).bindPopup("Jūs esate čia").openPopup();

            }, (err) => {
                showDialog("GPS klaida", "Nepavyko nustatyti jūsų buvimo vietos.", "⚠️");
            }, { enableHighAccuracy: true });
        }
    });

    document.getElementById('manual-add-btn')?.addEventListener('click', () => {
        const center = mapInstance.getCenter();
        openSpotModal(center.lat, center.lng);
    });

    setupModalEvents(user);
    setupFilterEvents();
    listenToUserSpots(user.uid);
}

function listenToUserSpots(uid) {
    db.collection("users").doc(uid).collection("hunting_spots")
        .onSnapshot((snapshot) => {
            currentSpots = [];
            snapshot.forEach(doc => {
                currentSpots.push({ id: doc.id, ...doc.data() });
            });
            renderMarkersOnMap();
        }, (error) => {
            console.error("Klaida nuskaitant taškus:", error);
        });
}

function renderMarkersOnMap() {
    if (!markersLayer || !mapInstance) return;
    markersLayer.clearLayers();

    const countLabel = document.getElementById('spots-count-label');
    const filtered = currentSpots.filter(s => activeFilter === "Visi" || s.type === activeFilter);
    
    if (countLabel) countLabel.innerText = `Išsaugota vietų: ${currentSpots.length} (Rodoma: ${filtered.length})`;

    filtered.forEach(spot => {
        const typeInfo = SPOT_TYPES[spot.type] || SPOT_TYPES.stand;

        const customIcon = L.divIcon({
            className: 'custom-spot-marker',
            html: `
                <div style="background-color: ${typeInfo.color}; width: 34px; height: 34px; border-radius: 50%; border: 2px solid white; display: flex; align-items: center; justify-content: center; font-size: 16px; box-shadow: 0 4px 10px rgba(0,0,0,0.6);">
                    ${typeInfo.icon}
                </div>
            `,
            iconSize: [34, 34],
            iconAnchor: [17, 17],
            popupAnchor: [0, -18]
        });

        const marker = L.marker([spot.latitude, spot.longitude], { icon: customIcon });

        // VIENINGAS POPUP TURINYS SU ORŲ MYGTUKU
        const popupContent = `
            <div style="min-width: 190px; padding: 4px; font-family: sans-serif;">
                <div style="font-weight: bold; font-size: 14px; margin-bottom: 2px; color: #111;">
                    ${typeInfo.icon} ${spot.title}
                </div>
                <div style="font-size: 11px; color: #666; margin-bottom: 6px;">
                    ${typeInfo.label}
                </div>
                ${spot.notes ? `<div style="font-size: 12px; color: #333; margin-bottom: 8px; background: #f4f4f4; padding: 5px; border-radius: 6px;">${spot.notes}</div>` : ''}
                
                <div style="display: flex; flex-direction: column; gap: 4px; margin-top: 6px;">
                    <a href="/orai.html?spot=${spot.id}" 
                        style="text-align: center; background: #2e7d32; color: white; text-decoration: none; padding: 6px; font-size: 11px; font-weight: bold; border-radius: 6px;">
                        💨 Bokštelio orai ir vėjas
                    </a>

                    <div style="display: flex; gap: 4px;">
                        <a href="https://www.google.com/maps/search/?api=1&query=${spot.latitude},${spot.longitude}" target="_blank" 
                            style="flex: 1; text-align: center; background: #4CAF50; color: white; text-decoration: none; padding: 5px 8px; font-size: 11px; font-weight: bold; border-radius: 6px;">
                            🧭 Naviguoti
                        </a>
                        <button onclick="window.deleteHuntingSpot('${spot.id}')" 
                            style="background: #e53935; color: white; border: none; padding: 5px 8px; font-size: 11px; font-weight: bold; border-radius: 6px; cursor: pointer;">
                            🗑️
                        </button>
                    </div>
                </div>
            </div>
        `;

        marker.bindPopup(popupContent);
        markersLayer.addLayer(marker);
    });

    window.deleteHuntingSpot = (spotId) => {
        const user = auth.currentUser;
        if (!user) return;

        showDialog("Ištrinti vietą?", "Ar tikrai norite pašalinti šį pažymėtą tašką?", "🗑️", () => {
            db.collection("users").doc(user.uid).collection("hunting_spots").doc(spotId).delete()
                .then(() => console.log("Taškas ištrintas"))
                .catch(e => console.error("Klaida:", e));
        }, () => {});
    };
}

function openSpotModal(lat, lng) {
    selectedLatLng = { lat, lng };
    document.getElementById('display-lat').innerText = lat.toFixed(5);
    document.getElementById('display-lng').innerText = lng.toFixed(5);
    document.getElementById('spot-title-input').value = "";
    document.getElementById('spot-notes-input').value = "";
    document.getElementById('spot-modal').classList.remove('hidden');
}

function setupModalEvents(user) {
    const modal = document.getElementById('spot-modal');
    const closeBtn = document.getElementById('close-modal-btn');
    const cancelBtn = document.getElementById('cancel-spot-btn');
    const form = document.getElementById('spot-form');

    const closeModal = () => modal.classList.add('hidden');
    closeBtn?.addEventListener('click', closeModal);
    cancelBtn?.addEventListener('click', closeModal);

    form?.addEventListener('submit', (e) => {
        e.preventDefault();
        if (!selectedLatLng || !user) return;

        const type = document.getElementById('spot-type-select').value;
        const title = document.getElementById('spot-title-input').value.trim();
        const notes = document.getElementById('spot-notes-input').value.trim();

        const newSpot = {
            type,
            title,
            notes,
            latitude: selectedLatLng.lat,
            longitude: selectedLatLng.lng,
            createdAt: Date.now()
        };

        db.collection("users").doc(user.uid).collection("hunting_spots").add(newSpot)
            .then(() => {
                closeModal();
            })
            .catch(err => {
                console.error("Klaida saugant tašką:", err);
                showDialog("Klaida", "Nepavyko išsaugoti taško.", "🛑");
            });
    });
}

function setupFilterEvents() {
    document.querySelectorAll('.spot-filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            activeFilter = btn.getAttribute('data-type');
            
            document.querySelectorAll('.spot-filter-btn').forEach(b => {
                b.className = "spot-filter-btn px-3 py-1.5 rounded-xl text-xs font-bold transition border bg-forestSurface text-forestSecondary border-forestBorder";
            });
            btn.className = "spot-filter-btn px-3 py-1.5 rounded-xl text-xs font-bold transition border bg-forestPrimary text-white border-forestPrimary";
            
            renderMarkersOnMap();
        });
    });
}