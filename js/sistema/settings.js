// js/sistema/settings.js
import { db, auth } from '../core/firebase.js';
import { showDialog, showBottomToast } from '../core/ui.js';
import { autoRegisterFcmToken } from '../core/notifications.js';

let mapInstance = null;
let markerInstance = null;
let siloMarkersLayer = null;
let currentCoords = { lat: 54.8985, lon: 23.9036 };
let userSilos = [];
let isAddingSiloMode = false;
let pendingSiloCoords = null;
let editingSiloId = null;
let cachedCurrentUser = null;
let cachedUserData = null;

// Saugosime ūkio laukų statistiką
let hasAnyField = false;
let hasWinterField = false;
let hasGarageBase = false; // 🌟 Nauja apsauga krušai

export function initSettingsTab(currentUser, userData) {
    cachedCurrentUser = currentUser;
    cachedUserData = userData;
    
    hasGarageBase = !!(userData?.garageLat && userData?.garageLon && userData.garageLat !== 0);
    
    currentCoords.lat = hasGarageBase ? parseFloat(userData.garageLat) : 54.8985;
    currentCoords.lon = hasGarageBase ? parseFloat(userData.garageLon) : 23.9036;
    userSilos = userData?.silos ? [...userData.silos] : [];
    isAddingSiloMode = false;
    editingSiloId = null;
    hasAnyField = false;
    hasWinterField = false;

    const notifPrefs = userData?.notificationPreferences || {
        enabled: false,
        satPass: false,
        matifPrice: false,
        dieselDrop: false,
        nmaDeadlines: false,
        winterDanger: false,
        tSumStart: false,
        hailWarning: false
    };

    const container = document.getElementById('view-tab-settings');
    container.innerHTML = `
        <div class="space-y-6 max-w-5xl mx-auto w-full">
            <div class="bg-tractorSurface border border-tractorBorder p-6 md:p-8 rounded-2xl space-y-6 shadow-xl">
                <div class="border-b border-tractorBorder/70 pb-4">
                    <h2 class="font-oswald text-2xl font-bold uppercase tracking-wider" style="color: var(--text-main);">Paskyros nustatymai</h2>
                    <p class="text-xs mt-1" style="color: var(--text-muted);">Nurodykite savo ūkio kontaktus, pagrindinę bazę ir pranešimų temas.</p>
                </div>
                
                <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div class="space-y-1.5">
                        <label class="text-[11px] font-bold uppercase tracking-wider" style="color: var(--text-muted);">Vardas / Ūkio pavadinimas</label>
                        <input id="set-name-input" type="text" value="${userData?.name || ''}" 
                            class="w-full h-11 bg-tractorBg border border-tractorBorder focus:border-tractorPrimary rounded-xl px-4 text-xs outline-none transition" style="color: var(--text-main);">
                    </div>

                    <div class="space-y-1.5">
                        <label class="text-[11px] font-bold uppercase tracking-wider" style="color: var(--text-muted);">Telefono numeris</label>
                        <input id="set-phone-input" type="text" value="${userData?.phone || '+370'}" 
                            class="w-full h-11 bg-tractorBg border border-tractorBorder focus:border-tractorPrimary rounded-xl px-4 text-xs outline-none transition" style="color: var(--text-main);">
                    </div>
                </div>

                <div class="space-y-2 bg-tractorBg/60 p-4 rounded-xl border border-tractorBorder/60">
                    <div class="flex justify-between items-center text-xs">
                        <span class="text-[11px] font-bold uppercase tracking-wider" style="color: var(--text-muted);">SOS Pagalbos spindulys kaimynams</span>
                        <span id="set-dist-label" class="font-bold text-tractorPrimaryLight bg-tractorPrimary/20 px-3 py-1 rounded-lg border border-tractorPrimary/40">
                            ${userData?.notificationDistance || 20} km
                        </span>
                    </div>
                    <input id="set-dist-input" type="range" min="5" max="100" value="${userData?.notificationDistance || 20}" 
                        class="w-full accent-tractorPrimary cursor-pointer">
                    <p class="text-[11px]" style="color: var(--text-muted);">Gausite SOS pagalbos pranešimus iš kaimynų, kurie yra šiuo atstumu nuo jūsų garažo.</p>
                </div>

                <!-- PRANEŠIMŲ JUOSTA -->
                <div class="bg-tractorBg/60 p-4 md:p-5 rounded-xl border border-tractorBorder/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div class="space-y-0.5">
                        <div class="flex items-center gap-2">
                            <span class="text-base">🔔</span>
                            <span class="text-xs font-bold text-tractorPrimaryLight uppercase tracking-wider">Išmanieji pranešimai (Push)</span>
                        </div>
                        <p class="text-[11px]" style="color: var(--text-muted);">Gaukite skubius įspėjimus tiesiai į telefono arba kompiuterio ekraną.</p>
                    </div>
                    
                    <div class="flex items-center gap-3 shrink-0">
                        <label class="flex items-center gap-2 cursor-pointer select-none">
                            <input type="checkbox" id="set-notif-enabled" class="w-4 h-4 accent-tractorPrimary cursor-pointer" ${notifPrefs.enabled ? 'checked' : ''}>
                            <span class="text-xs font-bold" style="color: var(--text-main);">Gauti pranešimus</span>
                        </label>
                        <button type="button" id="btn-open-notif-topics-modal" class="px-3.5 py-2 bg-tractorSurface border border-tractorBorder hover:border-tractorPrimary text-xs font-bold rounded-xl transition cursor-pointer flex items-center gap-1.5 shadow-sm" style="color: var(--text-main);">
                            <span>⚙️</span> <span>Pasirinkti temas ➔</span>
                        </button>
                    </div>
                </div>

                <div class="space-y-2">
                    <div class="flex justify-between items-center">
                        <label class="text-[11px] font-bold text-tractorPrimaryLight uppercase tracking-wider">📍 Ūkio bazė (garažas) ir grūdų bokštai žemėlapyje *</label>
                        <span id="coords-text" class="text-[10px] text-green-400 font-mono font-bold">
                            Garažas: ${hasGarageBase ? `${currentCoords.lat.toFixed(4)}, ${currentCoords.lon.toFixed(4)}` : 'Nenustatytas'}
                        </span>
                    </div>
                    
                    <div id="settings-map" class="h-80 w-full rounded-xl border border-tractorBorder z-0 relative shadow-inner overflow-hidden"></div>
                    <p class="text-[11px]" style="color: var(--text-muted);">Vilkite garažo žymeklį (🏠) arba žemėlapio kampe spauskite <strong>„🛢️ Pridėti bokštą“</strong> ir spustelėkite žemėlapyje.</p>
                </div>

                <button id="save-settings-btn" class="w-full h-12 bg-tractorPrimary hover:bg-tractorPrimaryHover text-white font-bold rounded-xl text-xs uppercase tracking-wider shadow-lg shadow-tractorPrimary/20 flex items-center justify-center gap-2 cursor-pointer transition relative z-20 pointer-events-auto">
                    Išsaugoti nustatymus
                </button>

                <div class="border-t border-tractorBorder/70 pt-4 mt-6">
                    <button id="delete-account-btn" class="w-full h-10 border border-red-900/50 hover:bg-red-950/40 text-red-400 font-bold rounded-xl text-xs transition flex items-center justify-center gap-2">
                        Ištrinti paskyrą ir visus duomenis
                    </button>
                </div>
            </div>
        </div>
    `;

    document.getElementById('set-dist-input').oninput = (e) => {
        document.getElementById('set-dist-label').textContent = `${e.target.value} km`;
    };

    const notifToggle = document.getElementById('set-notif-enabled');
    if (notifToggle) {
        notifToggle.onchange = (e) => {
            if (e.target.checked) {
                // 🌟 Perduodame true: vartotojas pats paspaudė, klausiame leidimo!
                autoRegisterFcmToken(currentUser, userData, true);
            }
        };
    }

    document.getElementById('save-settings-btn').onclick = async (e) => {
        e.preventDefault();
        const name = document.getElementById('set-name-input').value.trim();
        const phone = document.getElementById('set-phone-input').value.trim();
        const dist = parseInt(document.getElementById('set-dist-input').value);
        const notifEnabled = document.getElementById('set-notif-enabled')?.checked ?? false;

        const currentPrefs = cachedUserData?.notificationPreferences || {};
        currentPrefs.enabled = notifEnabled;

        await db.collection("users").doc(currentUser.uid).update({
            name: name,
            phone: phone,
            notificationDistance: dist,
            garageLat: currentCoords.lat,
            garageLon: currentCoords.lon,
            silos: userSilos,
            notificationPreferences: currentPrefs,
            isSetupComplete: true
        });

        hasGarageBase = true; // Jau išsaugota

        if (userData) {
            userData.name = name;
            userData.phone = phone;
            userData.notificationDistance = dist;
            userData.garageLat = currentCoords.lat;
            userData.garageLon = currentCoords.lon;
            userData.silos = userSilos;
            userData.notificationPreferences = currentPrefs;
            userData.isSetupComplete = true;
        }

        showBottomToast("Ūkio nustatymai išsaugoti! 🚜");
    };

    document.getElementById('delete-account-btn').onclick = () => {
        showDialog("Dėmesio", "Ar tikrai norite pašalinti paskyrą ir visus savo duomenis negrįžtamai?", "⚠️", async () => {
            await db.collection("users").doc(currentUser.uid).delete();
            await auth.currentUser.delete();
            location.reload();
        }, true);
    };

    db.collection("user_fields").where("userId", "==", currentUser.uid).get().then(snap => {
        snap.forEach(doc => {
            hasAnyField = true;
            const crop = (doc.data().crop || "").toLowerCase();
            if (crop.includes("žiemin") || crop.includes("raps")) {
                hasWinterField = true;
            }
        });
        ensureModalsInBody(notifPrefs);
    });

    setTimeout(() => {
        refreshSettingsMap();
    }, 150);
}

// ==========================================
// 🌟 MODALAI TIESIAI DOCUMENT.BODY
// ==========================================
function ensureModalsInBody(notifPrefs) {
    if (!document.getElementById('silo-name-modal')) {
        const siloModalHtml = `
            <div id="silo-name-modal" class="fixed inset-0 bg-black/80 z-[9999] hidden flex flex-col justify-end items-center p-0 backdrop-blur-sm transition-all duration-300">
                <div class="bg-tractorSurface border-t-2 border-x-2 border-b-0 border-tractorBorder rounded-t-3xl rounded-b-none p-6 md:p-8 pb-12 max-w-xl w-full space-y-4 shadow-2xl relative">
                    <div class="flex justify-between items-center border-b border-tractorBorder pb-3">
                        <div class="flex items-center gap-2">
                            <span class="text-xl">🛢️</span>
                            <h3 id="silo-modal-title" class="font-oswald text-xl font-bold uppercase tracking-wider" style="color: var(--text-main);">Grūdų bokšto valdymas</h3>
                        </div>
                        <button type="button" id="btn-close-silo-modal" class="text-2xl font-bold cursor-pointer" style="color: var(--text-muted);">&times;</button>
                    </div>

                    <form id="silo-form" class="space-y-4 pt-1">
                        <div class="space-y-1">
                            <label class="text-xs font-bold uppercase" style="color: var(--text-muted);">Bokšto pavadinimas *</label>
                            <input id="silo-name-input" type="text" required autocomplete="off" placeholder="Pvz.: Pietinis bokštas" 
                                class="w-full h-11 bg-tractorBg border border-tractorBorder focus:border-tractorPrimary rounded-xl px-3.5 text-xs outline-none" style="color: var(--text-main);">
                        </div>
                        
                        <div class="flex gap-3 pt-2">
                            <button type="submit" id="btn-confirm-silo-save" class="flex-1 h-12 bg-tractorPrimary hover:bg-tractorPrimaryHover text-white font-extrabold rounded-xl text-xs md:text-sm uppercase tracking-wider shadow transition cursor-pointer flex items-center justify-center relative z-20 pointer-events-auto">
                                Išsaugoti
                            </button>
                            <button type="button" id="btn-delete-silo-modal" class="hidden px-6 h-12 bg-red-950/40 hover:bg-red-900 text-red-400 border border-red-800/60 font-bold rounded-xl text-xs md:text-sm uppercase tracking-wider transition cursor-pointer flex items-center justify-center relative z-20 pointer-events-auto">
                                Ištrinti
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', siloModalHtml);
        setupSiloModalEvents();
    }

    if (!document.getElementById('notif-topics-modal')) {
        const anyFieldClass = hasAnyField ? '' : 'opacity-40';
        const winterFieldClass = hasWinterField ? '' : 'opacity-40';
        const garageClass = hasGarageBase ? '' : 'opacity-40'; // 🌟 Krušai reikia garažo!

        const notifModalHtml = `
            <div id="notif-topics-modal" class="fixed inset-0 bg-black/80 z-[9999] hidden flex flex-col justify-end items-center p-0 backdrop-blur-sm transition-all duration-300">
                <div class="bg-tractorSurface border-t-2 border-x-2 border-b-0 border-tractorBorder rounded-t-3xl rounded-b-none p-6 md:p-8 pb-12 max-h-[85vh] overflow-y-auto max-w-2xl w-full space-y-4 shadow-2xl relative">
                    <div class="flex justify-between items-center border-b border-tractorBorder pb-3">
                        <div class="flex items-center gap-2">
                            <span class="text-xl">🔔</span>
                            <h3 class="font-oswald text-xl font-bold uppercase tracking-wider" style="color: var(--text-main);">Pranešimų temos</h3>
                        </div>
                        <button type="button" id="btn-close-notif-topics-modal" class="text-2xl font-bold cursor-pointer" style="color: var(--text-muted);">&times;</button>
                    </div>

                    <div class="space-y-3 pt-1">
                        <p class="text-xs" style="color: var(--text-muted);">Pažymėkite, apie kokius įvykius norite gauti skubius pranešimus:</p>

                        <div class="topic-row flex items-start gap-3 p-3.5 bg-tractorBg rounded-xl border border-tractorBorder cursor-pointer transition select-none" data-type="matif">
                            <input type="checkbox" id="modal-notif-matif" class="w-4 h-4 mt-0.5 accent-tractorPrimary cursor-pointer pointer-events-none">
                            <div>
                                <strong class="text-xs block" style="color: var(--text-main);">📈 MATIF biržos šuoliai (virš ±2%)</strong>
                                <span class="text-[11px] block mt-0.5" style="color: var(--text-muted);">Pranešti, kai kviečių, rapsų ar kukurūzų biržos kaina per dieną pakyla arba nukrenta daugiau nei 2%.</span>
                            </div>
                        </div>

                        <div class="topic-row flex items-start gap-3 p-3.5 bg-tractorBg rounded-xl border border-tractorBorder cursor-pointer transition select-none" data-type="diesel">
                            <input type="checkbox" id="modal-notif-diesel" class="w-4 h-4 mt-0.5 accent-tractorPrimary cursor-pointer pointer-events-none">
                            <div>
                                <strong class="text-xs block" style="color: var(--text-main);">⛽ Gazolio kainos šuoliai (virš ±2%)</strong>
                                <span class="text-[11px] block mt-0.5" style="color: var(--text-muted);">Pranešti, kai didmeninė žymėto dyzelino kaina Lietuvoje per dieną staigiai atpinga arba pabrangsta daugiau nei 2%.</span>
                            </div>
                        </div>

                        <div class="topic-row flex items-start gap-3 p-3.5 bg-tractorBg rounded-xl border border-tractorBorder cursor-pointer transition select-none" data-type="nma">
                            <input type="checkbox" id="modal-notif-nma" class="w-4 h-4 mt-0.5 accent-tractorPrimary cursor-pointer pointer-events-none">
                            <div>
                                <strong class="text-xs block" style="color: var(--text-main);">📜 NMA terminų priminiklis</strong>
                                <span class="text-[11px] block mt-0.5" style="color: var(--text-muted);">Likus 5 dienoms priminti apie artėjančius draudimus (mėšlo skleidimo, posėlių suarimo).</span>
                            </div>
                        </div>

                        <!-- 🌟 KRUŠAI REIKIA ŪKIO BAZĖS -->
                        <div class="topic-row flex items-start gap-3 p-3.5 bg-tractorBg rounded-xl border border-tractorBorder cursor-pointer transition select-none ${garageClass}" data-req="garageBase" data-type="hail">
                            <input type="checkbox" id="modal-notif-hail" class="w-4 h-4 mt-0.5 accent-tractorPrimary cursor-pointer pointer-events-none">
                            <div>
                                <strong class="text-xs block" style="color: var(--text-main);">🧊 Krušos pavojus ūkio bazėje arba laukuose</strong>
                                <span class="text-[11px] block mt-0.5" style="color: var(--text-muted);">Skubus įspėjimas, jei orų modelis prognozuoja krušą jūsų kieme ar sklypuose. Apsaugokite techniką!</span>
                            </div>
                        </div>

                        <div class="topic-row flex items-start gap-3 p-3.5 bg-tractorBg rounded-xl border border-tractorBorder cursor-pointer transition select-none ${anyFieldClass}" data-req="anyField" data-type="sat">
                            <input type="checkbox" id="modal-notif-sat" class="w-4 h-4 mt-0.5 accent-tractorPrimary cursor-pointer pointer-events-none">
                            <div>
                                <strong class="text-xs block" style="color: var(--text-main);">🛰️ Naujas palydovo Sentinel-2 kadras</strong>
                                <span class="text-[11px] block mt-0.5" style="color: var(--text-muted);">Pranešti, kai virš jūsų laukų atnaujinama NDVI biomasės analizė.</span>
                            </div>
                        </div>

                        <div class="topic-row flex items-start gap-3 p-3.5 bg-tractorBg rounded-xl border border-tractorBorder cursor-pointer transition select-none ${winterFieldClass}" data-req="winterField" data-type="winter">
                            <input type="checkbox" id="modal-notif-winter" class="w-4 h-4 mt-0.5 accent-tractorPrimary cursor-pointer pointer-events-none">
                            <div>
                                <strong class="text-xs block" style="color: var(--text-main);">❄️ Žiemkenčių pavojaus signalai</strong>
                                <span class="text-[11px] block mt-0.5" style="color: var(--text-muted);">Įspėti apie plikšalį, sniego pelėsį ar ledo plutą jūsų laukuose.</span>
                            </div>
                        </div>

                        <div class="topic-row flex items-start gap-3 p-3.5 bg-tractorBg rounded-xl border border-tractorBorder cursor-pointer transition select-none ${winterFieldClass}" data-req="winterField" data-type="tsum">
                            <input type="checkbox" id="modal-notif-tsum" class="w-4 h-4 mt-0.5 accent-tractorPrimary cursor-pointer pointer-events-none">
                            <div>
                                <strong class="text-xs block" style="color: var(--text-main);">🌱 Pavasario vegetacijos startas (T-Sum)</strong>
                                <span class="text-[11px] block mt-0.5" style="color: var(--text-muted);">Pranešti, kai šilumos suma pasiekia normą pavasariniam N1 tręšimui.</span>
                            </div>
                        </div>

                        <div class="pt-2">
                            <button type="button" id="btn-save-notif-topics" class="w-full h-12 bg-tractorPrimary hover:bg-tractorPrimaryHover text-white font-extrabold rounded-xl text-xs uppercase tracking-wider shadow transition cursor-pointer flex items-center justify-center relative z-20 pointer-events-auto">
                                Išsaugoti temas
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', notifModalHtml);
        setupNotifTopicsModalEvents();
    }
}

function setupNotifTopicsModalEvents() {
    const openBtn = document.getElementById('btn-open-notif-topics-modal');
    const modal = document.getElementById('notif-topics-modal');
    const closeBtn = document.getElementById('btn-close-notif-topics-modal');
    const saveBtn = document.getElementById('btn-save-notif-topics');

    if (openBtn && modal) {
        openBtn.onclick = () => {
            const prefs = cachedUserData?.notificationPreferences || {};
            document.getElementById('modal-notif-matif').checked = !!prefs.matifPrice;
            document.getElementById('modal-notif-diesel').checked = !!prefs.dieselDrop;
            document.getElementById('modal-notif-nma').checked = !!prefs.nmaDeadlines;
            document.getElementById('modal-notif-sat').checked = !!prefs.satPass;
            document.getElementById('modal-notif-hail').checked = !!prefs.hailWarning;
            document.getElementById('modal-notif-winter').checked = !!prefs.winterDanger;
            document.getElementById('modal-notif-tsum').checked = !!prefs.tSumStart;
            modal.classList.remove('hidden');
        };
    }

    if (closeBtn && modal) closeBtn.onclick = () => modal.classList.add('hidden');
    if (modal) modal.onclick = (e) => { if (e.target === modal) modal.classList.add('hidden'); };

    document.querySelectorAll('.topic-row').forEach(row => {
        row.onclick = () => {
            const req = row.getAttribute('data-req');
            
            if (req === 'anyField' && !hasAnyField) {
                showBottomToast("Pirmiausia „Mano Laukai“ skiltyje pridėkite bent vieną savo lauką.", "warning");
                return;
            }
            if (req === 'winterField' && !hasWinterField) {
                showBottomToast("Norėdami gauti šiuos pranešimus, pridėkite bent vieną žiemkenčių lauką.", "warning");
                return;
            }
            if (req === 'garageBase' && !hasGarageBase) {
                showBottomToast("Pirmiausia išsaugokite savo Ūkio bazę (garažą) nustatymų žemėlapyje!", "warning");
                return;
            }

            const cb = row.querySelector('input[type="checkbox"]');
            cb.checked = !cb.checked;
        };
    });

    if (saveBtn) {
        saveBtn.onclick = async (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (!cachedCurrentUser) return;

            const isEnabled = document.getElementById('set-notif-enabled')?.checked ?? false;

            const updatedPrefs = {
                enabled: isEnabled,
                matifPrice: document.getElementById('modal-notif-matif').checked,
                dieselDrop: document.getElementById('modal-notif-diesel').checked,
                nmaDeadlines: document.getElementById('modal-notif-nma').checked,
                satPass: document.getElementById('modal-notif-sat').checked,
                hailWarning: document.getElementById('modal-notif-hail').checked,
                winterDanger: document.getElementById('modal-notif-winter').checked,
                tSumStart: document.getElementById('modal-notif-tsum').checked
            };

            await db.collection("users").doc(cachedCurrentUser.uid).update({
                notificationPreferences: updatedPrefs
            });

            if (cachedUserData) cachedUserData.notificationPreferences = updatedPrefs;

            modal.classList.add('hidden');
            showBottomToast("Pranešimų temos sėkmingai išsaugotos! 🔔");
        };
    }
}

async function autoSaveSilosToFirebase() {
    if (!cachedCurrentUser) return;
    try {
        await db.collection("users").doc(cachedCurrentUser.uid).update({
            silos: userSilos
        });
    } catch (err) {
        console.error("Klaida automatiškai saugant bokštus:", err);
    }
}

export function refreshSettingsMap() {
    const mapEl = document.getElementById('settings-map');
    if (!mapEl) return;

    if (!mapInstance) {
        mapInstance = L.map('settings-map', { zoomControl: true }).setView([currentCoords.lat, currentCoords.lon], 13);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '© OpenStreetMap'
        }).addTo(mapInstance);

        const garageIcon = L.divIcon({
            className: 'custom-garage-icon',
            html: `<div style="background: #121412; border: 2.5px solid #FFD700; border-radius: 50%; width: 38px; height: 38px; display: flex; align-items: center; justify-content: center; font-size: 20px; box-shadow: 0 4px 15px rgba(0,0,0,0.8);">🏠</div>`,
            iconSize: [38, 38],
            iconAnchor: [19, 19]
        });

        markerInstance = L.marker([currentCoords.lat, currentCoords.lon], { draggable: true, icon: garageIcon }).addTo(mapInstance);
        markerInstance.bindTooltip("Ūkio bazė / Garažas", { permanent: false, direction: 'top' });

        markerInstance.on('dragend', (e) => {
            const pos = e.target.getLatLng();
            currentCoords.lat = pos.lat;
            currentCoords.lon = pos.lng;
            updateCoordsDisplay();
        });

        siloMarkersLayer = L.layerGroup().addTo(mapInstance);
        addMapAddSiloControl();

        mapInstance.on('click', (e) => {
            if (isAddingSiloMode) {
                pendingSiloCoords = { lat: e.latlng.lat, lng: e.latlng.lng };
                openSiloModal(null);
                isAddingSiloMode = false;
                if (mapInstance) mapInstance.getContainer().style.cursor = '';
            }
        });
    }

    setTimeout(() => {
        if (mapInstance) {
            mapInstance.invalidateSize();
            mapInstance.setView([currentCoords.lat, currentCoords.lon]);
            renderSiloMarkersOnMap();
        }
    }, 200);
}

function addMapAddSiloControl() {
    if (window._settingsSiloControlAdded) return;
    window._settingsSiloControlAdded = true;

    const AddSiloControl = L.Control.extend({
        options: { position: 'topright' },
        onAdd: function () {
            const container = L.DomUtil.create('div', 'leaflet-bar leaflet-control');
            container.innerHTML = `
                <button type="button" id="map-btn-add-silo" style="background: rgba(15,18,15,0.95); color: #4ADE80; border: 2px solid #2E7D32; padding: 6px 11px; border-radius: 8px; font-weight: 800; font-size: 11px; cursor: pointer; box-shadow: 0 4px 12px rgba(0,0,0,0.8); display: flex; align-items: center; gap: 5px;">
                    <span>🛢️</span> <span>Pridėti bokštą</span>
                </button>
            `;
            L.DomEvent.disableClickPropagation(container);
            setTimeout(() => {
                const btn = document.getElementById('map-btn-add-silo');
                if (btn) {
                    btn.onclick = () => {
                        isAddingSiloMode = true;
                        if (mapInstance) mapInstance.getContainer().style.cursor = 'crosshair';
                        showBottomToast("Spustelėkite ant žemėlapio, kur norite pastatyti grūdų bokštą! 🛢️", "info");
                    };
                }
            }, 100);
            return container;
        }
    });
    mapInstance.addControl(new AddSiloControl());
}

function renderSiloMarkersOnMap() {
    if (!siloMarkersLayer) return;
    siloMarkersLayer.clearLayers();

    userSilos.forEach(silo => {
        const siloIcon = L.divIcon({
            className: 'custom-silo-icon',
            html: `<div style="background: #181C18; border: 2px solid #38BDF8; border-radius: 50%; width: 34px; height: 34px; display: flex; align-items: center; justify-content: center; font-size: 17px; box-shadow: 0 3px 10px rgba(0,0,0,0.6); cursor: pointer;">🛢️</div>`,
            iconSize: [34, 34],
            iconAnchor: [17, 17]
        });

        const m = L.marker([silo.lat, silo.lng], { icon: siloIcon }).addTo(siloMarkersLayer);
        m.bindTooltip(`<b>🛢️ ${silo.name}</b> (Spauskite redagavimui)`, { permanent: false, direction: 'top' });

        m.on('click', () => {
            ensureModalsInBody();
            openSiloModal(silo);
        });
    });
}

function openSiloModal(silo = null) {
    ensureModalsInBody();
    const modal = document.getElementById('silo-name-modal');
    const input = document.getElementById('silo-name-input');
    const titleEl = document.getElementById('silo-modal-title');
    const deleteBtn = document.getElementById('btn-delete-silo-modal');

    if (!modal) return;

    if (silo) {
        editingSiloId = silo.id;
        input.value = silo.name || '';
        if (titleEl) titleEl.textContent = `✏️ Redaguoti bokštą: ${silo.name}`;
        if (deleteBtn) deleteBtn.classList.remove('hidden');
    } else {
        editingSiloId = null;
        input.value = '';
        if (titleEl) titleEl.textContent = `🛢️ Naujas grūdų bokštas`;
        if (deleteBtn) deleteBtn.classList.add('hidden');
    }

    modal.classList.remove('hidden');
    setTimeout(() => {
        input.focus();
    }, 50);
}

function closeSiloModal() {
    const modal = document.getElementById('silo-name-modal');
    if (modal) modal.classList.add('hidden');
}

function setupSiloModalEvents() {
    const modal = document.getElementById('silo-name-modal');
    const closeBtn = document.getElementById('btn-close-silo-modal');
    const deleteBtn = document.getElementById('btn-delete-silo-modal');
    const form = document.getElementById('silo-form');
    const input = document.getElementById('silo-name-input');

    if (closeBtn) closeBtn.onclick = closeSiloModal;
    if (modal) modal.onclick = (e) => { if (e.target === modal) closeSiloModal(); };

    if (form) {
        form.onsubmit = async (e) => {
            e.preventDefault();
            e.stopPropagation();
            const name = input.value.trim();
            if (!name) return;

            if (editingSiloId) {
                userSilos = userSilos.map(s => s.id === editingSiloId ? { ...s, name } : s);
            } else if (pendingSiloCoords) {
                userSilos.push({
                    id: 'silo_' + Date.now(),
                    name: name,
                    lat: pendingSiloCoords.lat,
                    lng: pendingSiloCoords.lng
                });
                pendingSiloCoords = null;
            }

            renderSiloMarkersOnMap();
            await autoSaveSilosToFirebase();
            closeSiloModal();
        };
    }

    if (deleteBtn) {
        deleteBtn.onclick = async (e) => {
            e.preventDefault();
            e.stopPropagation();

            if (editingSiloId) {
                userSilos = userSilos.filter(s => s.id !== editingSiloId);
                renderSiloMarkersOnMap();
                await autoSaveSilosToFirebase();
                closeSiloModal();
            }
        };
    }
}

function updateCoordsDisplay() {
    const el = document.getElementById('coords-text');
    if (el) {
        el.textContent = `Garažas: ${currentCoords.lat.toFixed(4)}, ${currentCoords.lon.toFixed(4)}`;
    }
}