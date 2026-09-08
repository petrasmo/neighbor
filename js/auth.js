// js/auth.js
import { auth, db } from './firebase.js';
import { showDialog } from './ui.js';

// 🌟 Google prisijungimas (eksportuojamas visiems moduliams)
export function loginWithGoogle() {
    const provider = new firebase.auth.GoogleAuthProvider();
    auth.signInWithPopup(provider)
        .then(() => {
            closeAuthModal();
        })
        .catch((error) => {
            console.error("Google login klaida:", error);
            if (error.code !== 'auth/popup-closed-by-user') {
                showDialog("Klaida", "Nepavyko prisijungti su Google: " + getFriendlyErrorMessage(error.code), "🛑");
            }
        });
}

// 🚪 Atsijungimas
export function logoutUser() {
    auth.signOut().then(() => {
        location.reload();
    });
}

// 🪟 ATIDARYTI PRISIJUNGIMO / REGISTRACIJOS MODALĄ
export function openAuthModal(initialTab = 'login') {
    let modal = document.getElementById('unified-auth-modal');
    if (!modal) {
        createAuthModalDom();
        modal = document.getElementById('unified-auth-modal');
    }
    
    switchAuthTab(initialTab);
    clearAuthErrors();
    modal.classList.remove('hidden');
}

export function closeAuthModal() {
    const modal = document.getElementById('unified-auth-modal');
    if (modal) modal.classList.add('hidden');
}

// 🎨 Sukuriamas modalo DOM elementas
function createAuthModalDom() {
    const modalHtml = `
        <div id="unified-auth-modal" class="fixed inset-0 bg-black/80 flex items-center justify-center z-[130] hidden p-4 backdrop-blur-sm">
            <div class="bg-tractorSurface border border-tractorBorder p-6 md:p-8 rounded-2xl max-w-md w-full shadow-2xl relative space-y-5">
                
                <!-- UŽDARYTI -->
                <button type="button" id="btn-close-auth-modal" class="absolute top-5 right-5 text-slate-400 hover:text-white text-xl font-bold transition cursor-pointer">
                    ✕
                </button>

                <!-- HEADERIS IR TABS -->
                <div class="space-y-3 border-b border-tractorBorder/70 pb-4">
                    <div class="flex items-center gap-2">
                        <span class="text-2xl">🚜</span>
                        <h3 class="font-oswald text-2xl font-bold tracking-wider uppercase text-white">JurgisAgro</h3>
                    </div>
                    
                    <div class="flex bg-tractorBg p-1 rounded-xl border border-tractorBorder">
                        <button type="button" id="tab-btn-login" class="flex-1 py-2 text-xs font-bold rounded-lg transition text-white bg-tractorPrimary shadow">
                            Prisijungti
                        </button>
                        <button type="button" id="tab-btn-register" class="flex-1 py-2 text-xs font-bold rounded-lg transition text-slate-400 hover:text-white">
                            Registracija
                        </button>
                    </div>
                </div>

                <!-- 1. GOOGLE PRISIJUNGIMO MYGTUKAS -->
                <button type="button" id="btn-auth-google" class="w-full h-12 bg-white hover:bg-slate-100 text-slate-800 font-bold rounded-xl text-xs md:text-sm flex items-center justify-center gap-3 shadow transition cursor-pointer border border-slate-300">
                    <svg class="w-5 h-5" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                    </svg>
                    <span>Prisijungti su Google paskyra</span>
                </button>

                <div class="flex items-center gap-3">
                    <div class="flex-1 h-[1px] bg-tractorBorder/70"></div>
                    <span class="text-[10px] uppercase font-bold text-slate-500">arba su el. paštu</span>
                    <div class="flex-1 h-[1px] bg-tractorBorder/70"></div>
                </div>

                <!-- KLAIDŲ PRANEŠIMAS -->
                <div id="auth-error-msg" class="hidden p-3 bg-red-950/40 border border-red-800/60 rounded-xl text-xs text-red-400 font-medium"></div>

                <!-- 2. PRISIJUNGIMO FORMA -->
                <form id="form-email-login" class="space-y-3.5">
                    <div class="space-y-1">
                        <label class="text-[11px] font-bold text-slate-300 uppercase block">El. pašto adresas</label>
                        <input id="login-email-input" type="email" required placeholder="vardas@inbox.lt arba gmail.com" 
                            class="w-full h-11 bg-tractorBg border border-tractorBorder focus:border-tractorPrimary rounded-xl px-3.5 text-xs text-white outline-none font-medium">
                    </div>

                    <div class="space-y-1">
                        <div class="flex justify-between items-center">
                            <label class="text-[11px] font-bold text-slate-300 uppercase block">Slaptažodis</label>
                            <button type="button" id="btn-forgot-password-link" class="text-[11px] text-green-400 hover:underline">Pamiršote?</button>
                        </div>
                        <input id="login-password-input" type="password" required placeholder="••••••••" 
                            class="w-full h-11 bg-tractorBg border border-tractorBorder focus:border-tractorPrimary rounded-xl px-3.5 text-xs text-white outline-none">
                    </div>

                    <button type="submit" id="btn-submit-login" class="w-full h-11 bg-tractorPrimary hover:bg-tractorPrimaryHover text-white font-bold rounded-xl text-xs uppercase tracking-wider shadow-lg transition cursor-pointer">
                        Prisijungti prie ūkio
                    </button>
                </form>

                <!-- 3. REGISTRACIJOS FORMA -->
                <form id="form-email-register" class="space-y-3.5 hidden">
                    <div class="space-y-1">
                        <label class="text-[11px] font-bold text-slate-300 uppercase block">Vardas / Ūkio pavadinimas</label>
                        <input id="reg-name-input" type="text" required placeholder="Pvz.: Jonas Petraitis" 
                            class="w-full h-11 bg-tractorBg border border-tractorBorder focus:border-tractorPrimary rounded-xl px-3.5 text-xs text-white outline-none font-medium">
                    </div>

                    <div class="space-y-1">
                        <label class="text-[11px] font-bold text-slate-300 uppercase block">El. pašto adresas</label>
                        <input id="reg-email-input" type="email" required placeholder="vardas@inbox.lt" 
                            class="w-full h-11 bg-tractorBg border border-tractorBorder focus:border-tractorPrimary rounded-xl px-3.5 text-xs text-white outline-none font-medium">
                    </div>

                    <div class="space-y-1">
                        <label class="text-[11px] font-bold text-slate-300 uppercase block">Slaptažodis (bent 6 simboliai)</label>
                        <input id="reg-password-input" type="password" minlength="6" required placeholder="••••••••" 
                            class="w-full h-11 bg-tractorBg border border-tractorBorder focus:border-tractorPrimary rounded-xl px-3.5 text-xs text-white outline-none">
                    </div>

                    <button type="submit" id="btn-submit-register" class="w-full h-11 bg-tractorPrimary hover:bg-tractorPrimaryHover text-white font-bold rounded-xl text-xs uppercase tracking-wider shadow-lg transition cursor-pointer">
                        Sukurti nemokamą paskyrą
                    </button>
                </form>

                <!-- 4. SLAPTAŽODŽIO ATSTATYMO FORMA -->
                <form id="form-forgot-password" class="space-y-3.5 hidden">
                    <p class="text-xs text-slate-300 leading-relaxed">
                        Įveskite savo el. paštą – atsiųsime nuorodą naujam slaptažodžiui susikurti.
                    </p>
                    <div class="space-y-1">
                        <label class="text-[11px] font-bold text-slate-300 uppercase block">El. paštas</label>
                        <input id="forgot-email-input" type="email" required placeholder="vardas@inbox.lt" 
                            class="w-full h-11 bg-tractorBg border border-tractorBorder focus:border-tractorPrimary rounded-xl px-3.5 text-xs text-white outline-none font-medium">
                    </div>

                    <button type="submit" id="btn-submit-forgot" class="w-full h-11 bg-tractorPrimary hover:bg-tractorPrimaryHover text-white font-bold rounded-xl text-xs uppercase tracking-wider shadow-lg transition cursor-pointer">
                        Siųsti atstatymo nuorodą
                    </button>

                    <button type="button" id="btn-back-to-login" class="w-full text-center text-xs text-slate-400 hover:text-white pt-1 block">
                        ← Grįžti į prisijungimą
                    </button>
                </form>

            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHtml);

    document.getElementById('btn-close-auth-modal').onclick = closeAuthModal;
    document.getElementById('btn-auth-google').onclick = loginWithGoogle;

    const tabLogin = document.getElementById('tab-btn-login');
    const tabRegister = document.getElementById('tab-btn-register');

    tabLogin.onclick = () => switchAuthTab('login');
    tabRegister.onclick = () => switchAuthTab('register');

    document.getElementById('btn-forgot-password-link').onclick = () => switchAuthTab('forgot');
    document.getElementById('btn-back-to-login').onclick = () => switchAuthTab('login');

    // PRISIJUNGIMAS SU EL. PAŠTU
    document.getElementById('form-email-login').onsubmit = async (e) => {
        e.preventDefault();
        clearAuthErrors();
        const email = document.getElementById('login-email-input').value.trim();
        const password = document.getElementById('login-password-input').value;

        const btn = document.getElementById('btn-submit-login');
        btn.disabled = true;
        btn.textContent = "Jungiamasi...";

        try {
            await auth.signInWithEmailAndPassword(email, password);
            closeAuthModal();
        } catch (err) {
            console.error("Login error:", err);
            showAuthError(getFriendlyErrorMessage(err.code));
        } finally {
            btn.disabled = false;
            btn.textContent = "Prisijungti prie ūkio";
        }
    };

    // REGISTRACIJA SU EL. PAŠTU
    document.getElementById('form-email-register').onsubmit = async (e) => {
        e.preventDefault();
        clearAuthErrors();
        const name = document.getElementById('reg-name-input').value.trim();
        const email = document.getElementById('reg-email-input').value.trim();
        const password = document.getElementById('reg-password-input').value;

        const btn = document.getElementById('btn-submit-register');
        btn.disabled = true;
        btn.textContent = "Kuriama paskyra...";

        try {
            const userCred = await auth.createUserWithEmailAndPassword(email, password);
            
            // Sukuriame vartotojo profilį Firestore su TUŠČIA ūkio vieta
            await db.collection("users").doc(userCred.user.uid).set({
                userId: userCred.user.uid,
                name: name || "Ūkininkas",
                email: email,
                phone: "+370",
                ownedTech: [],
                garageLat: null,
                garageLon: null,
                notificationDistance: 50,
                isSetupComplete: false
            });

            closeAuthModal();
            showDialog("Sveiki atvykę! 🚜", `Ūkio paskyra sėkmingai sukurta.`, "🌾");
        } catch (err) {
            console.error("Register error:", err);
            showAuthError(getFriendlyErrorMessage(err.code));
        } finally {
            btn.disabled = false;
            btn.textContent = "Sukurti nemokamą paskyrą";
        }
    };

    // SLAPTAŽODŽIO ATSTATYMAS
    document.getElementById('form-forgot-password').onsubmit = async (e) => {
        e.preventDefault();
        clearAuthErrors();
        const email = document.getElementById('forgot-email-input').value.trim();

        const btn = document.getElementById('btn-submit-forgot');
        btn.disabled = true;
        btn.textContent = "Siunčiama...";

        try {
            await auth.sendPasswordResetEmail(email);
            showDialog("Laiškas išsiųstas! 📩", `Nuoroda išsiųsta į <strong>${email}</strong>. Patikrinkite pašto dėžutę.`, "✅");
            switchAuthTab('login');
        } catch (err) {
            console.error("Forgot error:", err);
            showAuthError(getFriendlyErrorMessage(err.code));
        } finally {
            btn.disabled = false;
            btn.textContent = "Siųsti atstatymo nuorodą";
        }
    };
}

function switchAuthTab(tab) {
    clearAuthErrors();
    const tabLogin = document.getElementById('tab-btn-login');
    const tabRegister = document.getElementById('tab-btn-register');
    const formLogin = document.getElementById('form-email-login');
    const formRegister = document.getElementById('form-email-register');
    const formForgot = document.getElementById('form-forgot-password');

    if (!tabLogin) return;

    if (tab === 'login') {
        tabLogin.className = "flex-1 py-2 text-xs font-bold rounded-lg transition text-white bg-tractorPrimary shadow";
        tabRegister.className = "flex-1 py-2 text-xs font-bold rounded-lg transition text-slate-400 hover:text-white";
        formLogin.classList.remove('hidden');
        formRegister.classList.add('hidden');
        formForgot.classList.add('hidden');
    } else if (tab === 'register') {
        tabRegister.className = "flex-1 py-2 text-xs font-bold rounded-lg transition text-white bg-tractorPrimary shadow";
        tabLogin.className = "flex-1 py-2 text-xs font-bold rounded-lg transition text-slate-400 hover:text-white";
        formRegister.classList.remove('hidden');
        formLogin.classList.add('hidden');
        formForgot.classList.add('hidden');
    } else if (tab === 'forgot') {
        formLogin.classList.add('hidden');
        formRegister.classList.add('hidden');
        formForgot.classList.remove('hidden');
    }
}

function showAuthError(msg) {
    const el = document.getElementById('auth-error-msg');
    if (el) {
        el.textContent = msg;
        el.classList.remove('hidden');
    }
}

function clearAuthErrors() {
    const el = document.getElementById('auth-error-msg');
    if (el) el.classList.add('hidden');
}

function getFriendlyErrorMessage(code) {
    switch (code) {
        case 'auth/user-not-found':
            return 'Vartotojas su šiuo el. pašto adresu nerastas.';
        case 'auth/wrong-password':
        case 'auth/invalid-credential':
            return 'Neteisingas el. paštas arba slaptažodis.';
        case 'auth/email-already-in-use':
            return 'Šis el. pašto adresas jau užregistruotas sistemoje.';
        case 'auth/invalid-email':
            return 'Neteisingas el. pašto adreso formatas.';
        case 'auth/weak-password':
            return 'Slaptažodis per trumpas. Reikia bent 6 simbolių.';
        case 'auth/too-many-requests':
            return 'Per daug bandymų. Bandykite dar kartą po kelių minučių.';
        default:
            return 'Įvyko klaida jungiantis. Patikrinkite duomenis.';
    }
}