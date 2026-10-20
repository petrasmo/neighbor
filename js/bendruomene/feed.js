// js/bendruomene/feed.js
import { db } from '../core/firebase.js';
import { showDialog, showBottomToast } from '../core/ui.js';
import { loginWithGoogle } from '../core/auth.js';
import { calculateDist } from '../skaiciuokles/grainCalculator.js';
import { createCustomSelect } from '../core/customSelect.js';

let unsubscribePosts = null;
let selectedTechObj = null;
let cachedTechUsers = [];
let currentSourceCoords = { lat: null, lon: null };

export function initFeedTab(currentUser, userData, classifierMap) {
    const container = document.getElementById('view-tab-feed');
    if (!container) return;

    const techItems = Object.entries(classifierMap || {})
        .map(([id, name]) => ({ id, name, icon: '🚜' }))
        .sort((a, b) => a.name.localeCompare(b.name));

    container.innerHTML = `
        <div class="space-y-6 max-w-5xl mx-auto w-full">
            
            <!-- 1. RYŠKUS VEIKSMO BANERIS SU SLIDE-DOWN FORMA -->
            <div class="bg-tractorSurface border border-tractorBorder rounded-2xl p-6 md:p-8 shadow-xl space-y-4 w-full">
                
                <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div class="space-y-1.5">
                        <div class="inline-flex items-center gap-1.5 bg-red-950/40 border border-red-800/60 text-red-400 text-xs px-3 py-1 rounded-full font-bold uppercase tracking-wider">
                            <span>🚨</span> Skubi pagalba laukuose
                        </div>
                        <h2 class="font-oswald text-2xl md:text-3xl font-bold uppercase tracking-wider text-white">
                            Reikia technikos ar sugedo traktorius?
                        </h2>
                        <p class="text-xs md:text-sm text-slate-300">
                            Išsiųskite skubų SOS pranešimą – jį akimirksniu pamatys aplinkiniai ūkininkai jūsų nustatytu spinduliu.
                        </p>
                    </div>

                    <button id="btn-toggle-sos-form" class="h-12 px-6 bg-tractorPrimary hover:bg-tractorPrimaryHover text-white font-extrabold rounded-xl text-xs md:text-sm uppercase tracking-wider shadow-lg shadow-tractorPrimary/20 flex items-center justify-center gap-2 cursor-pointer transition shrink-0">
                        <span id="sos-btn-icon" class="text-base">➕</span> 
                        <span id="sos-btn-text">SKELBTI SOS PAGALBĄ</span>
                    </button>
                </div>

                <!-- SLIDE-DOWN FORMA -->
                <div id="sos-form-slide-container" class="hidden pt-5 border-t border-tractorBorder/70 transition-all duration-300">
                    <form id="create-post-form" class="space-y-4 bg-tractorBg/90 p-5 md:p-7 rounded-2xl border border-tractorBorder">
                        <div class="flex items-center justify-between border-b border-tractorBorder/60 pb-3">
                            <h3 class="font-oswald text-xl font-bold text-white uppercase tracking-wider">
                                Naujas SOS pagalbos skelbimas
                            </h3>
                            <span class="text-xs text-slate-400">Užpildykite prašymą</span>
                        </div>

                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div class="space-y-1.5">
                                <label class="text-xs font-bold text-tractorPrimaryLight uppercase tracking-wider block">
                                    Ieškoma technika *
                                </label>
                                <div id="sos-tech-select-box"></div>
                            </div>

                            <div class="space-y-1.5">
                                <label class="text-xs font-bold text-slate-300 uppercase tracking-wider block">Kur reikia pagalbos?</label>
                                <select id="sos-location-source" class="w-full h-12 bg-tractorSurface border border-tractorBorder focus:border-tractorPrimary rounded-xl px-4 text-xs md:text-sm text-white font-semibold outline-none cursor-pointer">
                                    <option value="garage">Mano Garažo / Ūkio vieta (iš nustatymų)</option>
                                    <option value="current">Dabartinė kompiuterio / telefono vieta (GPS)</option>
                                </select>
                            </div>
                        </div>

                        <div class="space-y-2 bg-tractorSurface p-4 rounded-xl border border-tractorBorder/60">
                            <div class="flex justify-between items-center text-xs md:text-sm">
                                <span class="font-bold text-slate-200 uppercase tracking-wider">Pranešimo sklaidos spindulys</span>
                                <span id="sos-radius-label" class="font-bold text-tractorPrimaryLight bg-tractorPrimary/20 px-3 py-1 rounded-lg border border-tractorPrimary/40">20 km</span>
                            </div>
                            <input id="sos-radius-input" type="range" min="5" max="100" value="20" class="w-full accent-tractorPrimary cursor-pointer">
                            <div id="sos-potential-recipients" class="text-xs md:text-sm text-slate-200 pt-2 border-t border-tractorBorder/60 flex items-center gap-2 font-medium">
                                <span>ℹ️</span> <span>Pasirinkite ieškomą techniką, kad matytumėte potencialių gavėjų skaičių.</span>
                            </div>
                        </div>

                        <div class="space-y-1.5">
                            <label class="text-xs font-bold text-slate-300 uppercase tracking-wider block">Situacijos aprašymas *</label>
                            <textarea id="sos-message-input" rows="3" required placeholder="Pvz.: Skubiai reikia kombaino nukulti 15 ha miežių prieš lietų. Tel. atsiliepiu visą parą..." 
                                class="w-full bg-tractorSurface border border-tractorBorder focus:border-tractorPrimary rounded-xl p-4 text-xs md:text-sm text-white placeholder-slate-500 outline-none"></textarea>
                        </div>

                        <div class="flex items-center gap-3 pt-2">
                            <button type="button" id="btn-cancel-sos" class="px-6 h-12 bg-tractorSurface hover:bg-zinc-800 border border-tractorBorder text-slate-300 font-bold rounded-xl text-xs md:text-sm uppercase tracking-wider transition">
                                Atšaukti
                            </button>
                            <button type="submit" id="btn-submit-sos" class="flex-1 h-12 bg-tractorPrimary hover:bg-tractorPrimaryHover text-white font-extrabold rounded-xl text-xs md:text-sm uppercase tracking-wider shadow-lg shadow-tractorPrimary/20 flex items-center justify-center gap-2 cursor-pointer transition">
                                <span>🚨</span> SIŲSTI SOS PRANEŠIMĄ KAIMYNAMS
                            </button>
                        </div>
                    </form>
                </div>

            </div>

            <!-- 2. AKTYVIŲ SKELBIMŲ SĄRAŠAS -->
            <div class="space-y-4 w-full">
                <div class="flex items-center justify-between border-b border-tractorBorder/70 pb-3 px-1">
                    <h3 class="font-oswald text-xl md:text-2xl font-bold uppercase tracking-wider text-white flex items-center gap-2">
                        <span>📢</span> Aktyvūs pagalbos prašymai
                    </h3>
                    <span class="text-xs font-medium text-slate-400">Atnaujinama gyvai</span>
                </div>
                
                <div id="posts-list-container" class="space-y-4 w-full">
                    <div class="text-center py-8 text-slate-500 text-xs">Kraunami skelbimai...</div>
                </div>
            </div>

        </div>
    `;

    const resolveSourceCoordinates = async () => {
        const locSource = document.getElementById('sos-location-source')?.value || 'garage';
        let lat = parseFloat(userData?.garageLat) || 54.8985;
        let lon = parseFloat(userData?.garageLon) || 23.9036;

        if (locSource === 'current' && navigator.geolocation) {
            try {
                const pos = await new Promise((resolve, reject) => {
                    navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
                });
                lat = pos.coords.latitude;
                lon = pos.coords.longitude;
            } catch (geoErr) {
                console.warn("GPS klaida:", geoErr);
            }
        }
        currentSourceCoords = { lat, lon };
        return currentSourceCoords;
    };

    const updateRecipientsCountUI = () => {
        const infoEl = document.getElementById('sos-potential-recipients');
        const radiusInput = document.getElementById('sos-radius-input');
        if (!infoEl || !radiusInput) return;

        if (!selectedTechObj) {
            infoEl.innerHTML = `<span>ℹ️</span> <span class="text-slate-300">Pasirinkite ieškomą techniką, kad matytumėte potencialių gavėjų skaičių.</span>`;
            return;
        }

        const selectedRadius = parseFloat(radiusInput.value) || 20;
        const { lat, lon } = currentSourceCoords;

        let count = 0;
        cachedTechUsers.forEach(u => {
            if (currentUser && u.userId === currentUser.uid) return;
            const uLat = parseFloat(u.garageLat);
            const uLon = parseFloat(u.garageLon);
            if (!uLat || !uLon) return;

            const distKm = calculateDist(lat, lon, uLat, uLon);
            const neighborMaxDist = parseFloat(u.notificationDistance) || 50;

            if (distKm <= selectedRadius && distKm <= neighborMaxDist) {
                count++;
            }
        });

        if (count > 0) {
            infoEl.innerHTML = `<span>📡</span> <span class="text-green-400 font-bold text-sm">Šį SOS pranešimą gaus potencialūs kaimynai: ${count}</span>`;
        } else {
            infoEl.innerHTML = `<span>⚠️</span> <span class="text-amber-400 font-semibold">Šiuo spinduliu (${selectedRadius} km) kaimynų su šia technika nerasta. Pabandykite padidinti spindulį.</span>`;
        }
    };

    const fetchPotentialUsersForTech = async () => {
        const infoEl = document.getElementById('sos-potential-recipients');
        if (!selectedTechObj || !currentUser) return;

        if (infoEl) {
            infoEl.innerHTML = `<span>⏳</span> <span class="text-slate-300">Tikrinamas potencialių gavėjų skaičius...</span>`;
        }

        try {
            const { lat } = await resolveSourceCoordinates();
            const minLat = lat - 0.9;
            const maxLat = lat + 0.9;

            const snap = await db.collection("users")
                .where("ownedTech", "array-contains", selectedTechObj.id)
                .where("garageLat", ">=", minLat)
                .where("garageLat", "<=", maxLat)
                .get();

            cachedTechUsers = [];
            snap.forEach(doc => {
                const d = doc.data();
                d.userId = d.userId || doc.id;
                cachedTechUsers.push(d);
            });

            updateRecipientsCountUI();
        } catch (err) {
            console.error("Klaida tikrinant potencialius gavėjus:", err);
            if (infoEl) {
                infoEl.innerHTML = `<span>⚠️</span> <span class="text-red-400">Nepavyko patikrinti gavėjų skaičiaus (patikrinkite Firestore indeksą konsolėje).</span>`;
            }
        }
    };

    createCustomSelect({
        containerId: 'sos-tech-select-box',
        placeholder: '🔍 Ieškoti mašinos...',
        items: techItems,
        selectedId: '',
        onSelect: (item) => {
            selectedTechObj = item;
            fetchPotentialUsersForTech();
        }
    });

    const toggleBtn = document.getElementById('btn-toggle-sos-form');
    const cancelBtn = document.getElementById('btn-cancel-sos');
    const formContainer = document.getElementById('sos-form-slide-container');
    const btnIcon = document.getElementById('sos-btn-icon');
    const btnText = document.getElementById('sos-btn-text');

    const toggleForm = () => {
        if (!currentUser) {
            showDialog(
                "Reikalingas prisijungimas",
                "Norėdami paskelbti skubų SOS pagalbos prašymą kaimynams, prisijunkite su savo „Google“ paskyra.",
                "🔒",
                loginWithGoogle,
                true
            );
            return;
        }

        const isHidden = formContainer.classList.contains('hidden');
        if (isHidden) {
            const cleanPhone = (userData?.phone || "").trim();
            if (cleanPhone.length < 9) {
                showDialog(
                    "Trūksta telefono numerio",
                    "Norėdami skelbti SOS pagalbos prašymą, pirmiausia nurodykite savo tikslų telefono numerį (bent 9 simboliai) skiltyje „Nustatymai“.",
                    "📞"
                );
                return;
            }

            formContainer.classList.remove('hidden');
            btnIcon.textContent = '✖';
            btnText.textContent = 'UŽDARYTI FORMĄ';
            toggleBtn.classList.replace('bg-tractorPrimary', 'bg-zinc-800');
        } else {
            formContainer.classList.add('hidden');
            btnIcon.textContent = '➕';
            btnText.textContent = 'SKELBTI SOS PAGALBĄ';
            toggleBtn.classList.replace('bg-zinc-800', 'bg-tractorPrimary');
        }
    };

    toggleBtn.onclick = toggleForm;
    cancelBtn.onclick = toggleForm;

    const radiusInput = document.getElementById('sos-radius-input');
    const radiusLabel = document.getElementById('sos-radius-label');
    if (radiusInput && radiusLabel) {
        radiusInput.oninput = (e) => {
            radiusLabel.textContent = `${e.target.value} km`;
            updateRecipientsCountUI();
        };
    }

    const locSelect = document.getElementById('sos-location-source');
    if (locSelect) {
        locSelect.onchange = () => {
            if (selectedTechObj) {
                fetchPotentialUsersForTech();
            }
        };
    }

    const form = document.getElementById('create-post-form');
    if (form) {
        form.onsubmit = async (e) => {
            e.preventDefault();

            if (!currentUser) {
                showDialog("Reikalingas prisijungimas", "Prisijunkite su Google paskyra.", "🔒", loginWithGoogle, true);
                return;
            }

            const cleanPhone = (userData?.phone || "").trim();
            if (cleanPhone.length < 9) {
                showBottomToast("Nurodykite savo telefono numerį nustatymuose (bent 9 simboliai)!", "warning");
                return;
            }

            if (!selectedTechObj) {
                showBottomToast("Pasirinkite konkrečią ieškomą mašiną!", "warning");
                return;
            }

            const submitBtn = document.getElementById('btn-submit-sos');
            submitBtn.disabled = true;
            submitBtn.innerHTML = `<span>⏳</span> Siunčiama...`;

            try {
                const msg = document.getElementById('sos-message-input').value.trim();
                const radius = parseFloat(document.getElementById('sos-radius-input').value);
                const locSource = document.getElementById('sos-location-source').value;

                let postLat = userData?.garageLat || 54.8985;
                let postLon = userData?.garageLon || 23.9036;

                if (locSource === 'current' && navigator.geolocation) {
                    try {
                        const pos = await new Promise((resolve, reject) => {
                            navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
                        });
                        postLat = pos.coords.latitude;
                        postLon = pos.coords.longitude;
                    } catch (geoErr) {
                        console.warn("GPS klaida:", geoErr);
                    }
                }

                const postRef = db.collection("posts").doc();
                await postRef.set({
                    id: postRef.id,
                    userId: currentUser.uid,
                    userName: userData?.name || "Ūkininkas",
                    phone: cleanPhone,
                    email: userData?.email || currentUser.email || "",
                    requiredMachineId: selectedTechObj.id,
                    requiredMachineName: selectedTechObj.name,
                    message: msg,
                    fulfilled: false,
                    location: new firebase.firestore.GeoPoint(postLat, postLon),
                    timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                    radius: radius
                });

                form.reset();
                selectedTechObj = null;
                cachedTechUsers = [];
                updateRecipientsCountUI();
                toggleForm();

                showBottomToast("SOS pagalbos skelbimas sėkmingai išsiųstas kaimynams! 🚨");

            } catch (err) {
                console.error("Klaida siunčiant SOS:", err);
                showBottomToast("Nepavyko išsiųsti SOS: " + err.message, "error");
            } finally {
                submitBtn.disabled = false;
                submitBtn.innerHTML = `<span>🚨</span> SIŲSTI SOS PRANEŠIMĄ KAIMYNAMS`;
            }
        };
    }

    listenToFeedPosts(currentUser, userData, classifierMap);
}

function listenToFeedPosts(currentUser, userData, classifierMap) {
    if (unsubscribePosts) unsubscribePosts();

    unsubscribePosts = db.collection("posts")
        .orderBy("timestamp", "desc")
        .onSnapshot((snapshot) => {
            const listEl = document.getElementById('posts-list-container');
            if (!listEl) return;
            listEl.innerHTML = '';

            const garageLat = userData?.garageLat || 0;
            const garageLon = userData?.garageLon || 0;
            const notifDist = userData?.notificationDistance || 50;
            const owned = userData?.ownedTech || [];
            const currentUserId = currentUser ? currentUser.uid : null;
            
            // 🌟 Patikriname, ar prisijungęs vartotojas yra administratorius
            const isAdmin = userData?.role === 'admin';

            let renderedCount = 0;

            snapshot.forEach((doc) => {
                const post = doc.data();
                const isMyPost = currentUserId && post.userId === currentUserId;

                let distKm = null;
                let isWithinDist = false;

                if (post.location && garageLat && garageLon) {
                    distKm = Math.round(calculateDist(garageLat, garageLon, post.location.latitude, post.location.longitude));
                    const postRadius = parseFloat(post.radius) || 100;
                    isWithinDist = (distKm <= notifDist) && (distKm <= postRadius);
                }

                const matchesTech = owned.includes(post.requiredMachineId);
                
                // 🌟 Jeigu tai administratorius, rodomi absoliučiai visi skelbimai be jokių apribojimų!
                const shouldShow = isAdmin || !currentUser || isMyPost || (matchesTech && isWithinDist) || (!garageLat);

                if (shouldShow) {
                    renderedCount++;
                    const machineTitle = (classifierMap && classifierMap[post.requiredMachineId]) 
                        ? classifierMap[post.requiredMachineId] 
                        : (post.requiredMachineName || "Technika");
                    const cleanMessage = (post.message || '').replace("(lokacija garaze)", "").trim();
                    const dateStr = post.timestamp ? new Date(post.timestamp.toDate()).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '';

                    // 🌟 Administratorius mato trynimo mygtuką prie bet kurio skelbimo
                    const canDelete = isMyPost || isAdmin;

                    const card = document.createElement('div');
                    card.className = `p-6 md:p-7 rounded-2xl border transition w-full ${
                        isMyPost 
                        ? 'bg-myPostBg border-tractorPrimary shadow-xl shadow-tractorPrimary/10 ring-1 ring-tractorPrimary' 
                        : 'bg-tractorSurface border-tractorBorder shadow-md hover:border-slate-500'
                    }`;

                    card.innerHTML = `
                        <div class="space-y-4">
                            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-tractorBorder/70 pb-4">
                                <div>
                                    ${isMyPost ? `<span class="text-xs font-black uppercase text-tractorPrimaryLight tracking-widest block mb-1">Mano skelbimas</span>` : ''}
                                    ${isAdmin && !isMyPost ? `<span class="text-xs font-black uppercase text-amber-400 tracking-widest block mb-1">🛡️ Admin peržiūra</span>` : ''}
                                    <h3 class="text-xl md:text-2xl font-bold text-white tracking-wide">${machineTitle}</h3>
                                    ${distKm !== null ? `<p class="text-xs md:text-sm font-bold text-green-400 mt-0.5">📍 ~${distKm} km nuo jūsų garažo</p>` : ''}
                                </div>
                                <div class="flex flex-wrap items-center gap-2">
                                    ${!isMyPost && post.phone ? `
                                        <a href="tel:${post.phone}" class="h-10 px-5 bg-tractorPrimary hover:bg-tractorPrimaryHover rounded-xl flex items-center gap-2 text-white text-xs md:text-sm font-bold shadow-lg shadow-tractorPrimary/20 transition">
                                            <span>📞</span> Skambinti ūkininkui
                                        </a>
                                    ` : ''}
                                    ${!isMyPost && post.email ? `
                                        <a href="mailto:${post.email}" class="h-10 px-4 bg-tractorBg hover:bg-zinc-800 border border-tractorBorder rounded-xl flex items-center gap-2 text-slate-200 text-xs md:text-sm font-bold transition">
                                            <span>✉️</span> El. paštas
                                        </a>
                                    ` : ''}
                                    ${canDelete ? `
                                    <button data-delete-id="${post.id}" class="btn-delete-post h-10 px-4 bg-slate-800 hover:bg-red-700 border border-tractorBorder rounded-xl flex items-center gap-1.5 text-xs font-bold shadow-sm transition cursor-pointer" style="color: #ffffff !important;">
    <span>🗑️</span> <span style="color: #ffffff !important;">Ištrinti skelbimą</span>
</button>
                                    ` : ''}
                                </div>
                            </div>

                            <div class="bg-tractorBg/90 p-4 md:p-5 rounded-xl border border-tractorBorder/60">
                                <p class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Situacija / Aprašymas:</p>
                                <p class="text-sm md:text-base text-slate-100 leading-relaxed">${cleanMessage}</p>
                            </div>

                            <div class="flex flex-wrap justify-between items-center gap-2 text-xs md:text-sm text-slate-400 pt-1">
                                <div class="flex flex-wrap items-center gap-x-3 gap-y-1">
                                    <span>Ūkininkas: <strong class="text-white font-semibold">${post.userName || 'Ūkininkas'}</strong></span>
                                    ${post.phone ? `<span class="text-slate-300">📞 ${post.phone}</span>` : ''}
                                    ${post.email ? `<span class="text-slate-300">✉️ ${post.email}</span>` : ''}
                                </div>
                                <span class="bg-tractorBg px-3 py-1 rounded-lg border border-tractorBorder text-slate-300 font-medium">🕒 ${dateStr}</span>
                            </div>
                        </div>
                    `;
                    listEl.appendChild(card);
                }
            });

            document.querySelectorAll('.btn-delete-post').forEach(btn => {
                btn.onclick = () => {
                    const id = btn.getAttribute('data-delete-id');
                    showDialog("Šalinimas", "Ar tikrai norite pašalinti šį SOS skelbimą?", "🗑️", async () => {
                        try {
                            await db.collection("posts").doc(id).delete();
                            showBottomToast("SOS skelbimas sėkmingai pašalintas.", "info");
                        } catch (err) {
                            console.error("Klaida trinant skelbimą:", err);
                            showBottomToast("Nepavyko pašalinti skelbimo.", "error");
                        }
                    }, true);
                };
            });

            if (renderedCount === 0) {
                listEl.innerHTML = `
                    <div class="bg-tractorSurface border border-tractorBorder p-12 rounded-2xl text-center space-y-3 w-full">
                        <span class="text-5xl block">🌾</span>
                        <h4 class="font-bold text-white text-lg">Šiuo metu pagalbos prašymų nėra</h4>
                        <p class="text-sm text-slate-400 max-w-md mx-auto">Kai aplinkiniams ūkininkams prireiks jūsų turimos technikos, skelbimai atsiras čia.</p>
                    </div>
                `;
            }
        });
}