// js/main.js
import { auth } from './firebase.js';
import { 
    loginWithGoogle, 
    loginWithEmail, 
    registerWithEmail, 
    resetPassword, 
    logoutUser, 
    isGuestMode, 
    enableGuestMode 
} from './auth.js';
import { startCreditsListener, stopCreditsListeners } from './credits.js';
import { renderHomeScreen } from './home.js';
import { renderPracticeScreen } from './practice.js';
import { renderResultsScreen } from './results.js';
import { renderSettingsScreen } from './settings.js';
import { loginGoogleBtn, showLoggedInUI, showLoggedOutUI, tabButtons, switchTab, updateCreditsUI } from './ui.js';
import { checkAndRestoreActiveTest } from './exam.js';

let isRegisterMode = false;

document.addEventListener('DOMContentLoaded', () => {
    // 1. Google prisijungimas
    loginGoogleBtn?.addEventListener('click', loginWithGoogle);
    
    // 2. Atsijungimo / prisijungimo mygtukai
    document.querySelectorAll('.logout-action-btn').forEach(btn => {
        btn.addEventListener('click', logoutUser);
    });

    // 3. Navigacijos skirtukai
    tabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const tabIndex = parseInt(btn.getAttribute('data-tab'));
            switchTab(tabIndex);
        });
    });

    // 4. Formos perjungimas: Prisijungti / Registruotis
    const tabLogin = document.getElementById('tab-auth-login');
    const tabRegister = document.getElementById('tab-auth-register');
    const nameField = document.getElementById('auth-name-field');
    const forgotContainer = document.getElementById('auth-forgot-container');
    const submitBtn = document.getElementById('auth-submit-btn');

    tabLogin?.addEventListener('click', () => {
        isRegisterMode = false;
        tabLogin.className = "flex-1 py-1.5 text-xs font-bold rounded-md transition bg-forestPrimary text-white shadow";
        tabRegister.className = "flex-1 py-1.5 text-xs font-bold rounded-lg transition text-forestSecondary hover:text-white";
        nameField?.classList.add('hidden');
        forgotContainer?.classList.remove('hidden');
        if (submitBtn) submitBtn.innerText = "Prisijungti";
    });

    tabRegister?.addEventListener('click', () => {
        isRegisterMode = true;
        tabRegister.className = "flex-1 py-1.5 text-xs font-bold rounded-md transition bg-forestPrimary text-white shadow";
        tabLogin.className = "flex-1 py-1.5 text-xs font-bold rounded-lg transition text-forestSecondary hover:text-white";
        nameField?.classList.remove('hidden');
        forgotContainer?.classList.add('hidden');
        if (submitBtn) submitBtn.innerText = "Sukurti paskyrą";
    });

    // 5. El. pašto formos pateikimas
    document.getElementById('email-auth-form')?.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = document.getElementById('auth-email-input').value.trim();
        const password = document.getElementById('auth-password-input').value;
        const name = document.getElementById('auth-name-input')?.value.trim() || "";

        if (isRegisterMode) {
            registerWithEmail(email, password, name);
        } else {
            loginWithEmail(email, password);
        }
    });

    // 6. Slaptažodžio atstatymas
    document.getElementById('auth-forgot-btn')?.addEventListener('click', () => {
        const email = document.getElementById('auth-email-input').value.trim();
        resetPassword(email);
    });

    // 7. Svečio režimo mygtukai
    document.getElementById('guest-enter-btn')?.addEventListener('click', () => {
        enableGuestMode();
        initDashboardAsGuest();
    });

    document.getElementById('nav-guest-btn')?.addEventListener('click', () => {
        enableGuestMode();
        initDashboardAsGuest();
    });
});

// Paleidžia ekranus Svečio režimu
async function initDashboardAsGuest() {
    stopCreditsListeners();
    window.userCreditsAmount = "Svečias";
    
    await renderHomeScreen();
    renderPracticeScreen();
    renderResultsScreen();
    renderSettingsScreen();

    showLoggedInUI("Svečias 👤", true);
    updateCreditsUI("Svečias 👤");
    switchTab(0);
}

// BŪSENOS STEBĖTOJAS
auth.onAuthStateChanged(async (user) => {
    if (user) {
        // Registruotas vartotojas
        await renderHomeScreen();
        renderPracticeScreen();
        renderResultsScreen();
        renderSettingsScreen();

        showLoggedInUI(user.email || "Medžiotojas", false);
        startCreditsListener(user);
        
        switchTab(0);
        checkAndRestoreActiveTest();
    } else if (isGuestMode()) {
        // Svečias
        initDashboardAsGuest();
    } else {
        // Neprisijungęs
        showLoggedOutUI();
        stopCreditsListeners();
    }
});