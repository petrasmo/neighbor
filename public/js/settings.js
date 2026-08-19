// js/settings.js
import { db, auth } from './firebase.js';
import { showDialog } from './ui.js';
import { isGuestMode, logoutUser, resendVerificationEmail } from './auth.js';
import { stopCreditsListeners } from './credits.js';

// === TIKRIEJI STRIPE PRODUKTŲ ID KODAI ===
/*const STRIPE_PRICES = {
    pkg100: "price_1U4IrNJQKOyEEeYoQns5aqh1",  
    pkg500: "price_1U4FhSJQKOyEEeYoXMc3l96j",
    weeklyPass: "price_1U4G3NJQKOyEEeYoQn98iJkq"
};*/

const STRIPE_PRICES = {
    pkg100: "price_1U5OAgJA9HINMz4WdUqK4alO",  
    pkg500: "price_1U5OAhJA9HINMz4WAyDj9OA1",
    weeklyPass: "price_1U5OAlJA9HINMz4WTCjjcr8k"
};


// Formspree kontaktų formos ID iš petrasmo.com
const FORMSPREE_URL = "https://formspree.io/f/mkodaqjq";

// Realusis pirkimas naudojant Stripe Checkout
async function buyProductReal(priceId, title, mode = 'payment') {
    const user = auth.currentUser;
    if (!user || isGuestMode()) {
        showDialog("Reikalingas prisijungimas", "Norėdami įsigyti kreditų paketą, prašome prisijungti prie savo paskyros.", "👤", () => {
            logoutUser();
        });
        return;
    }

    showDialog(
        "Apmokėti užsakymą?",
        `Ar norite įsigyti paslaugą „${title}“? Būsite saugiai nukreipti į Stripe mokėjimų langą atsiskaityti kortele arba banku.`,
        "🪙",
        async () => {
            showDialog("Ruošiama...", "Generuojama saugi apmokėjimo sesija...", "⏳");

            try {
                const sessionRef = await db.collection("users").doc(user.uid)
                    .collection("checkout_sessions").add({
                        price: priceId,
                        mode: mode, 
                        success_url: window.location.origin + "?payment=success",
                        cancel_url: window.location.origin + "?payment=cancel"
                    });

                sessionRef.onSnapshot((doc) => {
                    const data = doc.data();
                    if (data && data.url) {
                        window.location.assign(data.url);
                    } else if (data && data.error) {
                        console.error("Stripe klaida:", data.error.message);
                        showDialog("Klaida", "Nepavyko sukurti apmokėjimo sesijos. Bandykite dar kartą.", "🛑");
                    }
                });
            } catch (e) {
                console.error("Klaida inicijuojant Stripe pirkimą:", e);
                showDialog("Klaida", "Nepavyko prisijungti prie mokėjimo vartų.", "🛑");
            }
        },
        () => {}
    );
}

// Paskyros ištrynimo logika
function deleteAccountAction() {
    const user = auth.currentUser;
    if (!user) return;

    showDialog(
        "Ištrinti paskyrą?",
        "DĖMESIO! Šis veiksmas visiškai ištrins jūsų paskyrą, kreditus ir visą egzaminų istoriją iš sistemos. Ar tikrai norite tęsti?",
        "⚠️",
        async () => {
            try {
                const uid = user.uid;
                const deviceId = window.activeDeviceId || ("web_" + uid);

                stopCreditsListeners();

                await db.collection("users").doc(uid).delete().catch(() => {});
                await db.collection("user_credits").doc(deviceId).delete().catch(() => {});

                await user.delete();

                showDialog("Paskyra ištrinta", "Jūsų paskyra ir visi duomenys sėkmingai pašalinti.", "ℹ️", () => {
                    location.reload();
                });
            } catch (e) {
                console.error("Klaida šalinant paskyrą:", e);
                showDialog("Reikalingas prisijungimas", "Saugumo sumetimais, norint ištrinti paskyrą, turite atsijungti ir prisijungti iš naujo, kad atnaujintumėte sesiją.", "🛑");
            }
        },
        () => {}
    );
}

// PAGRINDINĖ VAIZDO GENERAVIMO FUNKCIJA
export function renderSettingsScreen() {
    const container = document.getElementById('view-tab-settings');
    if (!container) return;

    const isGuest = isGuestMode();
    const user = auth.currentUser;

    const photoUrl = user?.photoURL || "";
    const name = isGuest ? "Svečias" : (user?.displayName || "Medžiotojas");
    const email = isGuest ? "" : (user?.email || "");
    const isVerified = user?.emailVerified || false;
    const currentCredits = isGuest ? "0 🪙" : (window.userCreditsAmount !== undefined ? window.userCreditsAmount + " 🪙" : "... 🪙");

    container.innerHTML = `
        <div class="space-y-6 max-w-4xl mx-auto">
            
            <!-- 1. Profilio ir Balanso kortelė -->
            <div class="bg-forestSurface border border-forestBorder p-6 rounded-2xl flex flex-col md:flex-row justify-between items-center gap-6 shadow-lg">
                <div class="flex items-center gap-4">
                    ${photoUrl ? `
                        <img src="${photoUrl}" class="w-16 h-16 rounded-full border-2 border-forestPrimary object-cover shadow-md" alt="Profilio nuotrauka">
                    ` : `
                        <div class="w-16 h-16 rounded-full border-2 border-slate-700 bg-forestBackground flex items-center justify-center text-2xl shadow-md">👤</div>
                    `}
                    <div class="text-left space-y-1">
                        <h3 class="text-lg font-bold font-oswald text-white uppercase tracking-wider">${name}</h3>
                        
                        ${!isGuest ? `
                            <div class="flex flex-wrap items-center gap-2">
                                <span class="text-xs text-forestSecondary normal-case">${email}</span>
                                ${isVerified ? `
                                    <span class="text-[10px] font-bold text-green-400 bg-green-950/40 border border-green-500/40 px-2 py-0.5 rounded-full">
                                        ✓ Patvirtintas
                                    </span>
                                ` : `
                                    <button id="resend-verify-btn" class="text-[10px] font-bold text-yellow-400 hover:text-yellow-300 bg-yellow-950/40 border border-yellow-500/40 px-2 py-0.5 rounded-full flex items-center gap-1 hover:bg-yellow-900/40 transition" title="Paspauskite, kad gautumėte naują nuorodą">
                                        <span>⚠️ Nepatvirtintas</span>
                                        <span class="underline ml-0.5">(Atsiųsti laišką)</span>
                                    </button>
                                `}
                            </div>
                        ` : `
                            <span class="text-xs text-forestSecondary normal-case">Neprisijungęs svečio režimas</span>
                        `}
                    </div>
                </div>

                <div class="bg-forestBackground border border-forestBorder px-6 py-3.5 rounded-xl flex items-center gap-3 shrink-0 shadow-inner">
                    <div class="text-right">
                        <span class="text-[10px] text-forestSecondary uppercase font-bold tracking-wider block">Mano Balansas</span>
                        <span class="text-xl font-extrabold text-forestPrimary font-oswald pt-1">
                            <span id="user-credits-val">${currentCredits}</span>
                        </span>
                    </div>
                </div>
            </div>

            <!-- Svečio pranešimas -->
            ${isGuest ? `
                <div class="bg-forestSurface border border-forestPrimary/40 p-6 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 shadow-lg">
                    <div class="space-y-1 text-center sm:text-left">
                        <h4 class="text-sm font-bold text-white font-oswald uppercase">Norite spręsti testus ir kaupti taškus?</h4>
                        <p class="text-xs text-forestSecondary">Prisijunkite prie savo paskyros, kad galėtumėte pildytis kreditus ir matyti egzaminų istoriją.</p>
                    </div>
                    <button id="guest-login-cta-btn" class="px-6 h-11 bg-forestPrimary hover:bg-green-600 text-white font-bold rounded-xl text-xs uppercase tracking-wider transition shrink-0 shadow">
                        Prisijungti 🔑
                    </button>
                </div>
            ` : ''}

            <!-- 2. Parduotuvė -->
            <div class="bg-forestSurface border border-forestBorder p-6 rounded-2xl space-y-5 shadow-lg">
                <div class="border-b border-forestBorder pb-3">
                    <h3 class="text-md font-bold font-oswald text-white uppercase tracking-wider">Kreditų Parduotuvė</h3>
                    <p class="text-xs text-forestSecondary leading-relaxed mt-1">Saugiai pasipildykite savo sąskaitą. Apmokėjimą administruoja ir 100% bankinį saugumą užtikrina Stripe sistema.</p>
                </div>

                <div class="grid md:grid-cols-2 gap-4 pt-1">
                    <button class="buy-pkg-btn h-12 bg-forestBackground hover:bg-slate-800 border border-slate-800 hover:border-forestPrimary rounded-xl px-4 flex justify-between items-center transition focus:outline-none" data-price-id="${STRIPE_PRICES.pkg100}" data-title="100 kreditų paketas">
                        <span class="text-xs font-bold text-white">100 klausimų (kreditų) paketas</span>
                        <span class="text-xs font-extrabold text-forestPrimary font-oswald">1,19 EUR</span>
                    </button>

                    <button class="buy-pkg-btn h-12 bg-forestBackground hover:bg-slate-800 border border-slate-800 hover:border-forestPrimary rounded-xl px-4 flex justify-between items-center transition focus:outline-none" data-price-id="${STRIPE_PRICES.pkg500}" data-title="500 kreditų paketas">
                        <span class="text-xs font-bold text-white">500 klausimų (kreditų) paketas</span>
                        <span class="text-xs font-extrabold text-forestPrimary font-oswald">4,79 EUR</span>
                    </button>
                </div>

                <button id="buy-weekly-pass-btn" class="w-full h-14 bg-forestBackground hover:bg-slate-800 border-2 border-forestPrimary/40 hover:border-forestPrimary rounded-xl px-4 flex justify-between items-center transition focus:outline-none">
                    <div class="text-left">
                        <span class="text-xs font-bold text-white block font-sans">Savaitinė narystė be limitų 🎉</span>
                        <span class="text-[10px] text-forestSecondary font-sans">Neriboti testai 7 dienas kelyje</span>
                    </div>
                    <span class="text-xs font-extrabold text-forestPrimary font-oswald">11,99 EUR</span>
                </button>
            </div>

            <!-- 3. PAPRASTA KONTAKTŲ FORMA (BE TEMŲ SKIRSTYMO) -->
            <div class="bg-forestSurface border border-forestBorder p-6 rounded-2xl space-y-4 shadow-lg">
                <div class="border-b border-forestBorder pb-3">
                    <h3 class="text-md font-bold font-oswald text-white uppercase tracking-wider">Susisiekite su mumis</h3>
                    <p class="text-xs text-forestSecondary leading-relaxed mt-1">Turite klausimų, pastebėjote klaidą klausime ar kilo nesklandumų su apmokėjimu? Parašykite žinutę.</p>
                </div>

                <form id="support-contact-form" class="space-y-3">
                    <div class="space-y-1">
                        <label class="text-[10px] font-bold text-forestSecondary uppercase tracking-wider">Jūsų el. pašto adresas</label>
                        <input type="email" name="email" id="support-email" required value="${email}" placeholder="vardas@epastas.lt" 
                            class="w-full h-10 bg-forestBackground border border-forestBorder focus:border-forestPrimary rounded-xl px-3 text-xs text-white placeholder-slate-500 focus:outline-none transition">
                    </div>

                    <div class="space-y-1">
                        <label class="text-[10px] font-bold text-forestSecondary uppercase tracking-wider">Jūsų žinutė</label>
                        <textarea name="message" id="support-message" rows="3" required placeholder="Aprašykite savo klausimą ar pastebėtą klaidą..." 
                            class="w-full bg-forestBackground border border-forestBorder focus:border-forestPrimary rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none transition resize-none"></textarea>
                    </div>

                    <div class="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
                        <button type="submit" id="support-submit-btn" class="w-full sm:w-auto px-8 h-11 bg-buttonBrown hover:bg-buttonBrownHover text-white font-bold rounded-xl text-xs uppercase tracking-wider transition shadow flex items-center justify-center gap-2">
                            <span>Siųsti žinutę</span>
                            <span>✉️</span>
                        </button>
                        <span class="text-[11px] text-slate-500">Tiesioginis el. paštas: petrasmo@gmail.com</span>
                    </div>
                </form>
            </div>

            <!-- 4. Trynimo mygtukas -->
            ${!isGuest ? `
                <div class="flex justify-center pt-2">
                    <button id="delete-account-btn" class="text-[11px] font-bold text-red-400/60 hover:text-red-400 hover:underline transition focus:outline-none">
                        Ištrinti mano paskyrą negrįžtamai
                    </button>
                </div>
            ` : ''}

        </div>
    `;

    setupSettingsEvents();
}

function setupSettingsEvents() {
    document.getElementById('resend-verify-btn')?.addEventListener('click', () => {
        resendVerificationEmail();
    });

    document.getElementById('guest-login-cta-btn')?.addEventListener('click', () => {
        logoutUser();
    });

    document.getElementById('delete-account-btn')?.addEventListener('click', deleteAccountAction);

    document.querySelectorAll('.buy-pkg-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const priceId = btn.getAttribute('data-price-id');
            const title = btn.getAttribute('data-title');
            buyProductReal(priceId, title, 'payment');
        });
    });

    document.getElementById('buy-weekly-pass-btn')?.addEventListener('click', () => {
        buyProductReal(STRIPE_PRICES.weeklyPass, "Savaitinė narystė be limitų", 'payment');
    });

    // Formspree kontaktų formos pateikimas (AJAX)
    const contactForm = document.getElementById('support-contact-form');
    const submitBtn = document.getElementById('support-submit-btn');

    contactForm?.addEventListener('submit', async (e) => {
        e.preventDefault();

        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = "<span>Siunčiama...</span> <span>⏳</span>";
        }

        const formData = new FormData(contactForm);

        try {
            const response = await fetch(FORMSPREE_URL, {
                method: "POST",
                body: formData,
                headers: {
                    "Accept": "application/json"
                }
            });

            if (response.ok) {
                showDialog("Žinutė išsiųsta! ✉️", "Ačiū už jūsų pranešimą. Gavome jūsų užklausą ir atsakysime el. paštu.", "✅");
                const msgInput = document.getElementById('support-message');
                if (msgInput) msgInput.value = "";
            } else {
                showDialog("Klaida", "Nepavyko išsiųsti pranešimo. Pabandykite vėliau arba rašykite tiesiogiai petrasmo@gmail.com.", "🛑");
            }
        } catch (error) {
            console.error("Formspree klaida:", error);
            showDialog("Klaida", "Ryšio klaida siunčiant pranešimą.", "🛑");
        } finally {
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = "<span>Siųsti žinutę</span> <span>✉️</span>";
            }
        }
    });
}