// js/feed.js
import { db } from './firebase.js';
import { showDialog } from './ui.js';
import { loginWithGoogle } from './auth.js';
import { calculateDist } from './grainCalculator.js';

let unsubscribePosts = null;

export function initFeedTab(currentUser, userData, classifierMap) {
    const container = document.getElementById('view-tab-feed');
    if (!container) return;

    let optionsHtml = '';
    const sortedTech = Object.entries(classifierMap || {}).sort((a, b) => a[1].localeCompare(b[1]));
    for (const [id, name] of sortedTech) {
        optionsHtml += `<option value="${id}">${name}</option>`;
    }

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

                <!-- SLIDE-DOWN FORMA (PAGAL NUTYLĖJIMĄ PASLĖPTA) -->
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
                                <label class="text-xs font-bold text-tractorPrimaryLight uppercase tracking-wider">Ieškoma technika *</label>
                                <select id="sos-tech-select" required class="w-full h-12 bg-tractorSurface border border-tractorBorder focus:border-tractorPrimary rounded-xl px-4 text-xs md:text-sm text-white font-semibold outline-none cursor-pointer">
                                    <option value="">-- Pasirinkite ieškomą mašiną --</option>
                                    ${optionsHtml}
                                </select>
                            </div>

                            <div class="space-y-1.5">
                                <label class="text-xs font-bold text-slate-300 uppercase tracking-wider">Kur reikia pagalbos?</label>
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
                        </div>

                        <div class="space-y-1.5">
                            <label class="text-xs font-bold text-slate-300 uppercase tracking-wider">Situacijos aprašymas *</label>
                            <textarea id="sos-message-input" rows="3" required placeholder="Pvz.: Skubiai reikia kombaino nukulti 15 ha miežių prieš lietų. Tel. atsiliepiu visą parą..." 
                                class="w-full bg-tractorSurface border border-tractorBorder focus:border-tractorPrimary rounded-xl p-4 text-xs md:text-sm text-white placeholder-slate-500 outline-none"></textarea>
                        </div>

                        <div class="flex items-center gap-3 pt-2">
                            <button type="button" id="btn-cancel-sos" class="px-6 h-12 bg-tractorSurface hover:bg-zinc-800 border border-tractorBorder text-slate-300 font-bold rounded-xl text-xs md:text-sm uppercase tracking-wider transition">
                                Atšaukti
                            </button>
                            <button type="submit" id="btn-submit-sos" class="flex-1 h-12 bg-tractorPrimary hover:bg-tractorPrimaryHover text-white font-bold rounded-xl text-xs md:text-sm uppercase tracking-wider shadow-lg shadow-tractorPrimary/20 flex items-center justify-center gap-2 cursor-pointer transition">
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

    // 🔒 SLIDE-DOWN TOGGLE SU AUTH APSAUGA
    const toggleBtn = document.getElementById('btn-toggle-sos-form');
    const cancelBtn = document.getElementById('btn-cancel-sos');
    const formContainer = document.getElementById('sos-form-slide-container');
    const btnIcon = document.getElementById('sos-btn-icon');
    const btnText = document.getElementById('sos-btn-text');

    const toggleForm = () => {
        // JEI NEPRISIJUNGĘS – NELEIDŽIAME ATIDARYTI FORMOS IR METAME LOGIN DIALOGĄ!
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
        radiusInput.oninput = (e) => { radiusLabel.textContent = `${e.target.value} km`; };
    }

    // FORMOS PATEIKIMAS
    const form = document.getElementById('create-post-form');
    if (form) {
        form.onsubmit = async (e) => {
            e.preventDefault();

            if (!currentUser) {
                showDialog("Reikalingas prisijungimas", "Prisijunkite su Google paskyra.", "🔒", loginWithGoogle, true);
                return;
            }

            const submitBtn = document.getElementById('btn-submit-sos');
            submitBtn.disabled = true;
            submitBtn.innerHTML = `<span>⏳</span> Siunčiama...`;

            try {
                const techId = document.getElementById('sos-tech-select').value;
                const techName = (classifierMap && classifierMap[techId]) ? classifierMap[techId] : 'Technika';
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
                    phone: userData?.phone || "",
                    requiredMachineId: techId,
                    requiredMachineName: techName,
                    message: msg,
                    fulfilled: false,
                    location: new firebase.firestore.GeoPoint(postLat, postLon),
                    timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                    radius: radius
                });

                form.reset();
                toggleForm();

                showDialog("SOS Išsiųstas! 🚨", "Jūsų pagalbos skelbimas sėkmingai paskelbtas kaimynams.", "✅");

            } catch (err) {
                console.error("Klaida siunčiant SOS:", err);
                showDialog("Klaida", "Nepavyko išsiųsti SOS: " + err.message, "🛑");
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

            let renderedCount = 0;

            snapshot.forEach((doc) => {
                const post = doc.data();
                const isMyPost = currentUserId && post.userId === currentUserId;

                let distKm = null;
                let isWithinDist = false;

                if (post.location && garageLat && garageLon) {
                    distKm = Math.round(calculateDist(garageLat, garageLon, post.location.latitude, post.location.longitude));
                    isWithinDist = distKm <= notifDist;
                }

                const matchesTech = owned.includes(post.requiredMachineId);

                // Jei neprisijungęs – rodo visus skelbimus viešai. Jei prisijungęs – filtruoja pagal techniką ir atstumą
                const shouldShow = !currentUser || isMyPost || (matchesTech && isWithinDist) || (!garageLat);

                if (shouldShow) {
                    renderedCount++;
                    const machineTitle = (classifierMap && classifierMap[post.requiredMachineId]) 
                        ? classifierMap[post.requiredMachineId] 
                        : (post.requiredMachineName || "Technika");
                    const cleanMessage = (post.message || '').replace("(lokacija garaze)", "").trim();
                    const dateStr = post.timestamp ? new Date(post.timestamp.toDate()).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '';

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
                                    <h3 class="text-xl md:text-2xl font-bold text-white tracking-wide">${machineTitle}</h3>
                                    ${distKm !== null ? `<p class="text-xs md:text-sm font-bold text-green-400 mt-0.5">📍 ~${distKm} km nuo jūsų garažo</p>` : ''}
                                </div>
                                <div class="flex items-center gap-3">
                                    ${!isMyPost && post.phone ? `
                                        <a href="tel:${post.phone}" class="h-10 px-5 bg-tractorPrimary hover:bg-tractorPrimaryHover rounded-xl flex items-center gap-2 text-white text-xs md:text-sm font-bold shadow-lg shadow-tractorPrimary/20 transition">
                                            <span>📞</span> Skambinti ūkininkui
                                        </a>
                                    ` : ''}
                                    ${isMyPost ? `
                                        <button data-delete-id="${post.id}" class="btn-delete-post h-10 px-4 bg-red-900/30 hover:bg-red-800 text-red-300 rounded-xl flex items-center gap-1.5 text-xs font-bold border border-red-800/60 transition">
                                            <span>🗑️</span> Ištrinti skelbimą
                                        </button>
                                    ` : ''}
                                </div>
                            </div>

                            <div class="bg-tractorBg/90 p-4 md:p-5 rounded-xl border border-tractorBorder/60">
                                <p class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Situacija / Aprašymas:</p>
                                <p class="text-sm md:text-base text-slate-100 leading-relaxed">${cleanMessage}</p>
                            </div>

                            <div class="flex justify-between items-center text-xs md:text-sm text-slate-400 pt-1">
                                <span>Ūkininkas: <strong class="text-white font-semibold">${post.userName || 'Ūkininkas'}</strong> ${post.phone ? `(${post.phone})` : ''}</span>
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
                    showDialog("Šalinimas", "Ar tikrai norite pašalinti savo SOS skelbimą?", "🗑️", () => {
                        db.collection("posts").doc(id).delete();
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