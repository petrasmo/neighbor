// js/core/auth.js
import { auth, db } from './firebase.js';
import { showDialog, showBottomToast } from './ui.js';

export function loginWithGoogle() {
    const provider = new firebase.auth.GoogleAuthProvider();
    auth.signInWithPopup(provider)
        .then(() => {
            closeAuthModal();
            showBottomToast("Sėkmingai prisijungta su Google! 🚜");
        })
        .catch((error) => {
            console.error("Google login klaida:", error);
            if (error.code !== 'auth/popup-closed-by-user') {
                showBottomToast("Nepavyko prisijungti su Google: " + getFriendlyErrorMessage(error.code), "error");
            }
        });
}

export function logoutUser() {
    auth.signOut().then(() => {
        location.reload();
    });
}

/**
 * 🌟 OFICIALIOS NAUDOJIMO SĄLYGOS IR PRIVATUMO POLITIKA (BDAR / GDPR)
 */
export function openLegalModal(type = 'privacy') {
    if (type === 'terms') {
        showDialog(
            "📜 JurgisAgro Naudojimo Sąlygos ir Atsakomybės Ribojimas",
            `
            <div class="text-left space-y-3 text-xs leading-relaxed max-h-[65vh] overflow-y-auto pr-1">
                <p><strong>1. Bendrosios nuostatos</strong><br>
                Šios naudojimo sąlygos reglamentuoja naudojimąsi „JurgisAgro“ (<strong>jurgisagro.com</strong>) informaciniu portalu, skaičiuoklėmis ir išmaniųjų įrenginių valdymo įrankiais. Naudodamiesi sistema, patvirtinate, kad susipažinote su šiomis sąlygomis ir su jomis sutinkate.</p>

                <p><strong>2. Informacinis pobūdis ir Rinkos kainos</strong><br>
                Visi portale skelbiami duomenys (grūdų supirkimo kainos, Euronext MATIF biržos kotiruotės, ORLEN Lietuva didmeninės kuro kainos, Nord Pool elektros biržos įkainiai, agro-orų prognozės, NMA terminai ir VRA tręšimo/kalkinimo rekomendacijos) yra <strong>informacinio ir rekomendacinio pobūdžio</strong>. Prieš priimdami finansinius, ūkinius ar agronominius sprendimus, vartotojai privalo savarankiškai įsivertinti galutinę informaciją tiesiogiai su paslaugų tiekėjais ar institucijomis.</p>

                <p><strong>3. Išmaniųjų įrenginių (Daikin Onecta ir kt.) automatika</strong><br>
                Prijungdamas savo šilumos siurblį ar kitą išmanųjį įrenginį prie „JurgisAgro“ sistemos, vartotojas tai daro savo laisva valia ir pilna atsakomybe. „JurgisAgro“ veikia kaip automatizuotas komandų perdavimo įrankis per oficialų gamintojo (Daikin Europe N.V.) Cloud API. Kūrėjai neatsako už trečiųjų šalių ryšio sutrikimus, elektros tinklo gedimus, Daikin debesijos nepasiekiamumą ar netinkamai vartotojo pasirinktus šildymo parametrus (pvz., per žemą patalpų temperatūrą).</p>

                <p><strong>4. Paskyros saugumas</strong><br>
                Vartotojas atsako už savo prisijungimo duomenų saugumą ir įsipareigoja nenaudoti platformos neteisėtiems veiksmams ar klaidinančios informacijos (pvz., SOS pagalbos skelbimuose) platinimui.</p>

                <p><strong>5. Kontaktai</strong><br>
                Visais klausimais dėl platformos veikimo galite kreiptis el. paštu: <strong>petrasmo@gmail.com</strong>.</p>
            </div>
            `,
            "📜"
        );
    } else {
        showDialog(
            "🛡️ JurgisAgro Privatumo Politika (BDAR / GDPR)",
            `
            <div class="text-left space-y-3 text-xs leading-relaxed max-h-[65vh] overflow-y-auto pr-1">
                <p><strong>1. Duomenų valdytojas ir tikslas</strong><br>
                „JurgisAgro“ (<strong>jurgisagro.com</strong>) gerbia jūsų privatumą ir tvarko asmens duomenis griežtai laikydamasi Europos Sąjungos Bendrojo duomenų apsaugos reglamento (BDAR / GDPR) reikalavimų.</p>

                <p><strong>2. Kokius duomenis renkame?</strong><br>
                • <strong>Paskyros duomenys:</strong> Prisijungiant per „Google“ arba el. paštu, saugomas jūsų el. pašto adresas, vardas ir unikalus vartotojo identifikatorius (UID).<br>
                • <strong>Ūkio ir geografijos duomenys:</strong> Jūsų savanoriškai pažymėtos ūkio bazės (garažo) koordinatės, įbraižytų laukų ribos ir darbų žurnalai. Šie duomenys yra <strong>100% privatūs</strong> ir matomi tik jums.<br>
                • <strong>Išmaniųjų įrenginių (Daikin) duomenys:</strong> Prijungus Daikin Onecta paskyrą, saugomi šifruoti OAuth2 prieigos raktai (tokens) ir įrenginio telemetrija (temperatūros, kWh sąnaudos) tik tam, kad sistema galėtų vykdyti jūsų pasirinktą šildymo grafiką.</p>

                <p><strong>3. Kur ir kaip saugomi duomenys?</strong><br>
                Visi duomenys saugomi sertifikuotuose ir šifruotuose <strong>„Google Cloud / Firebase“</strong> serveriuose. Mes <strong>niekada neparduodame, neperduodame ir neatskleidžiame</strong> jūsų asmens ar ūkio laukų duomenų jokioms trečiosioms šalims.</p>

                <p><strong>4. Slapukai (Cookies) ir Analitika</strong><br>
                Svetainėje naudojami būtini techniniai slapukai prisijungimo sesijai palaikyti bei „Google Analytics (GA4)“ anoniminei lankomumo statistikai rinkti.</p>

                <p><strong>5. Jūsų teisės (Teisė būti pamirštam)</strong><br>
                Jūs turite teisę bet kuriuo metu peržiūrėti, redaguoti arba visiškai ištrinti savo paskyrą, ūkio laukus ar atjungti išmaniuosius įrenginius tiesiogiai sistemos nustatymuose arba parašę el. paštu <strong>petrasmo@gmail.com</strong>.</p>
            </div>
            `,
            "🛡️"
        );
    }
}

// Padarome pasiekiamą globaliai iš bet kurios HTML vietos (pvz. footerio)
window.openJurgisLegalModal = openLegalModal;

export function openAuthModal(initialTab = 'login') {
    let modal = document.getElementById('unified-auth-modal');
    if (!modal) {
        createAuthModalDom();
        modal = document.getElementById('unified-auth-modal');
    }
    
    switchAuthTab(initialTab);
    clearAuthErrors();
    modal.classList.remove('hidden');

    const panel = document.getElementById('auth-sheet-panel');
    setTimeout(() => {
        if (panel) panel.classList.remove('translate-y-full');
    }, 15);
}

export function closeAuthModal() {
    const modal = document.getElementById('unified-auth-modal');
    const panel = document.getElementById('auth-sheet-panel');
    if (panel) panel.classList.add('translate-y-full');
    setTimeout(() => {
        if (modal) modal.classList.add('hidden');
    }, 250);
}

function createAuthModalDom() {
    const modalHtml = `
        <div id="unified-auth-modal" class="fixed inset-0 bg-black/80 flex flex-col justify-end items-center z-[250] hidden p-0 backdrop-blur-sm transition-opacity duration-300">
            <div id="auth-sheet-panel" class="bg-tractorSurface border-t-2 border-x-2 border-b-0 border-tractorBorder rounded-t-3xl rounded-b-none p-6 md:p-8 max-w-lg w-full shadow-2xl relative space-y-4 max-h-[92vh] overflow-y-auto transform translate-y-full transition-transform duration-300">
                <button type="button" id="btn-close-auth-modal" class="absolute top-5 right-5 text-slate-400 hover:text-white text-xl font-bold transition cursor-pointer">
                    ✕
                </button>
                <div class="space-y-3 border-b border-tractorBorder/70 pb-3">
                    <div class="flex items-center gap-2">
                        <span class="text-2xl">🚜</span>
                        <h3 class="font-oswald text-2xl font-bold tracking-wider uppercase text-white">JurgisAgro Paskyra</h3>
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

                <!-- GOOGLE OFICIALUS PRISIJUNGIMAS -->
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
                    <span class="text-[10px] uppercase font-bold text-slate-500">arba su JurgisAgro el. paštu</span>
                    <div class="flex-1 h-[1px] bg-tractorBorder/70"></div>
                </div>

                <div id="auth-error-msg" class="hidden p-3 bg-red-950/40 border border-red-800/60 rounded-xl text-xs text-red-400 font-medium"></div>

                <!-- 1. PRISIJUNGIMO FORMA -->
                <form id="form-email-login" class="space-y-3.5" autocomplete="on">
                    <div class="space-y-1">
                        <label class="text-[11px] font-bold text-slate-300 uppercase block">El. pašto adresas</label>
                        <input id="login-email-input" name="email" type="email" autocomplete="username" required placeholder="vardas@inbox.lt" 
                            class="w-full h-11 bg-tractorBg border border-tractorBorder focus:border-tractorPrimary rounded-xl px-3.5 text-xs text-white outline-none font-medium">
                    </div>
                    <div class="space-y-1">
                        <div class="flex justify-between items-center">
                            <label class="text-[11px] font-bold text-slate-300 uppercase block">JurgisAgro slaptažodis</label>
                            <button type="button" id="btn-forgot-password-link" class="text-[11px] text-green-400 hover:underline">Pamiršote?</button>
                        </div>
                        <input id="login-password-input" name="password" type="password" autocomplete="current-password" required placeholder="••••••••" 
                            class="w-full h-11 bg-tractorBg border border-tractorBorder focus:border-tractorPrimary rounded-xl px-3.5 text-xs text-white outline-none">
                    </div>
                    <button type="submit" id="btn-submit-login" class="w-full h-11 bg-tractorPrimary hover:bg-tractorPrimaryHover text-white font-bold rounded-xl text-xs uppercase tracking-wider shadow-lg transition cursor-pointer">
                        Prisijungti prie ūkio
                    </button>
                </form>

                <!-- 2. REGISTRACIJOS FORMA -->
                <form id="form-email-register" class="space-y-3.5 hidden" autocomplete="on">
                    <div class="space-y-1">
                        <label class="text-[11px] font-bold text-slate-300 uppercase block">Vardas / Ūkio pavadinimas</label>
                        <input id="reg-name-input" name="name" type="text" autocomplete="name" required placeholder="Pvz.: Jonas Petraitis" 
                            class="w-full h-11 bg-tractorBg border border-tractorBorder focus:border-tractorPrimary rounded-xl px-3.5 text-xs text-white outline-none font-medium">
                    </div>
                    <div class="space-y-1">
                        <label class="text-[11px] font-bold text-slate-300 uppercase block">El. pašto adresas</label>
                        <input id="reg-email-input" name="email" type="email" autocomplete="email" required placeholder="vardas@inbox.lt" 
                            class="w-full h-11 bg-tractorBg border border-tractorBorder focus:border-tractorPrimary rounded-xl px-3.5 text-xs text-white outline-none font-medium">
                    </div>
                    <div class="space-y-1">
                        <label class="text-[11px] font-bold text-slate-300 uppercase block">Naujas slaptažodis (bent 6 simboliai)</label>
                        <input id="reg-password-input" name="new-password" type="password" autocomplete="new-password" minlength="6" required placeholder="••••••••" 
                            class="w-full h-11 bg-tractorBg border border-tractorBorder focus:border-tractorPrimary rounded-xl px-3.5 text-xs text-white outline-none">
                    </div>
                    <button type="submit" id="btn-submit-register" class="w-full h-11 bg-tractorPrimary hover:bg-tractorPrimaryHover text-white font-bold rounded-xl text-xs uppercase tracking-wider shadow-lg transition cursor-pointer">
                        Sukurti nemokamą paskyrą
                    </button>
                </form>

                <!-- 3. SLAPTAŽODŽIO ATSTATYMAS -->
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

                <!-- 🛡️ AKTYVIOS SAUGUMO IR PRIVATUMO NUORODOS -->
                <div class="pt-2 border-t border-tractorBorder/50 text-center text-[10px] text-slate-400 leading-normal">
                    <span>Prisijungdami sutinkate su JurgisAgro </span>
                    <button type="button" id="btn-auth-open-terms" class="text-green-400 hover:underline font-bold cursor-pointer bg-transparent border-0 p-0 inline">Naudojimo sąlygomis</button>
                    <span> ir </span>
                    <button type="button" id="btn-auth-open-privacy" class="text-green-400 hover:underline font-bold cursor-pointer bg-transparent border-0 p-0 inline">Privatumo politika</button>.
                    <div class="text-slate-500 mt-0.5">Duomenys saugomi šifruotame Google Firebase serveryje.</div>
                </div>

            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHtml);

    const modal = document.getElementById('unified-auth-modal');
    modal.onclick = (e) => {
        if (e.target === modal) closeAuthModal();
    };

    document.getElementById('btn-close-auth-modal').onclick = closeAuthModal;
    document.getElementById('btn-auth-google').onclick = loginWithGoogle;

    document.getElementById('btn-auth-open-terms')?.addEventListener('click', () => openLegalModal('terms'));
    document.getElementById('btn-auth-open-privacy')?.addEventListener('click', () => openLegalModal('privacy'));

    const tabLogin = document.getElementById('tab-btn-login');
    const tabRegister = document.getElementById('tab-btn-register');

    tabLogin.onclick = () => switchAuthTab('login');
    tabRegister.onclick = () => switchAuthTab('register');

    document.getElementById('btn-forgot-password-link').onclick = () => switchAuthTab('forgot');
    document.getElementById('btn-back-to-login').onclick = () => switchAuthTab('login');

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
            showBottomToast("Sėkmingai prisijungta prie ūkio! 🚜");
        } catch (err) {
            console.error("Login error:", err);
            showAuthError(getFriendlyErrorMessage(err.code));
        } finally {
            btn.disabled = false;
            btn.textContent = "Prisijungti prie ūkio";
        }
    };

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
            showBottomToast("Sveiki atvykę! Ūkio paskyra sukurta 🚜");
        } catch (err) {
            console.error("Register error:", err);
            showAuthError(getFriendlyErrorMessage(err.code));
        } finally {
            btn.disabled = false;
            btn.textContent = "Sukurti nemokamą paskyrą";
        }
    };

    document.getElementById('form-forgot-password').onsubmit = async (e) => {
        e.preventDefault();
        clearAuthErrors();
        const email = document.getElementById('forgot-email-input').value.trim();

        const btn = document.getElementById('btn-submit-forgot');
        btn.disabled = true;
        btn.textContent = "Siunčiama...";

        try {
            await auth.sendPasswordResetEmail(email);
            showBottomToast(`Nuoroda išsiųsta į ${email}. Patikrinkite paštą!`);
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
        case 'auth/unauthorized-domain':
            return 'Šis domenas neįtrauktas į Firebase Authorized Domains (naudokite localhost).';
        case 'auth/popup-blocked':
            return 'Naršyklė užblokavo prisijungimo langą. Leiskite iššokančius langus.';
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