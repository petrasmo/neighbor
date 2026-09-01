// js/grainPage.js
import { auth, db } from './firebase.js';
import { loginWithGoogle, logoutUser } from './auth.js';
import { initThemeToggle } from './theme.js';
import { renderGlobalSidebar } from './sidebar.js'; // 👈 BENDRO MENIU GENERAVIMAS
import { initGrainTab } from './grain.js';
import { renderSeedCalculator } from './seedCalculator.js';
import { renderSprayerCalculator } from './sprayerCalculator.js';
import { renderFertilizerCalculator } from './fertilizerCalculator.js';

document.addEventListener('DOMContentLoaded', () => {
    // 1. Sugeneruojame šoninį meniu (grudai puslapis)
    renderGlobalSidebar('grudai');
    initThemeToggle();

    let currentUser = null;
    let userData = null;

    const hubView = document.getElementById('view-calculators-hub');
    const grainView = document.getElementById('view-tab-grain');
    const seedView = document.getElementById('view-tab-seed');
    const sprayView = document.getElementById('view-tab-spray');
    const fertView = document.getElementById('view-tab-fert');

    const openGrainBtn = document.getElementById('btn-open-grain-calc');
    const openSeedBtn = document.getElementById('btn-open-seed-calc');
    const openSprayBtn = document.getElementById('btn-open-spray-calc');
    const openFertBtn = document.getElementById('btn-open-fert-calc');

    const backFromGrainBtn = document.getElementById('btn-back-from-grain');
    const backFromSeedBtn = document.getElementById('btn-back-from-seed');
    const backFromSprayBtn = document.getElementById('btn-back-from-spray');
    const backFromFertBtn = document.getElementById('btn-back-from-fert');

    const hideAllViews = () => {
        hubView.classList.add('hidden');
        grainView.classList.add('hidden');
        seedView.classList.add('hidden');
        sprayView.classList.add('hidden');
        fertView.classList.add('hidden');
    };

    openGrainBtn.onclick = () => {
        hideAllViews();
        grainView.classList.remove('hidden');
        initGrainTab(currentUser, userData);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    openSeedBtn.onclick = () => {
        hideAllViews();
        seedView.classList.remove('hidden');
        renderSeedCalculator(document.getElementById('seed-calc-content'));
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    openSprayBtn.onclick = () => {
        hideAllViews();
        sprayView.classList.remove('hidden');
        renderSprayerCalculator(document.getElementById('spray-calc-content'));
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    openFertBtn.onclick = () => {
        hideAllViews();
        fertView.classList.remove('hidden');
        renderFertilizerCalculator(document.getElementById('fert-calc-content'));
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const returnToHub = () => {
        hideAllViews();
        hubView.classList.remove('hidden');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    backFromGrainBtn.onclick = returnToHub;
    backFromSeedBtn.onclick = returnToHub;
    backFromSprayBtn.onclick = returnToHub;
    backFromFertBtn.onclick = returnToHub;

    auth.onAuthStateChanged(async (user) => {
        const sidebarAuthBox = document.getElementById('auth-sidebar-box');
        const mobileAuthSlot = document.getElementById('auth-status-mobile');

        if (user) {
            currentUser = user;
            const doc = await db.collection("users").doc(user.uid).get();
            if (doc.exists) userData = doc.data();

            if (sidebarAuthBox) {
                sidebarAuthBox.innerHTML = `
                    <p class="text-[10px] text-slate-500 uppercase font-bold">Prisijungta kaip:</p>
                    <p class="text-xs text-white truncate font-medium">${user.email}</p>
                    <button id="btn-logout-grain-side" class="w-full py-1.5 mt-2 bg-tractorBg hover:bg-red-950/40 text-slate-300 hover:text-red-400 border border-tractorBorder rounded-lg text-xs font-bold transition cursor-pointer">
                        🚪 Atsijungti
                    </button>
                `;
                document.getElementById('btn-logout-grain-side')?.addEventListener('click', logoutUser);
            }

            if (mobileAuthSlot) {
                mobileAuthSlot.innerHTML = `
                    <button id="btn-logout-grain-mob" class="px-3 py-1 bg-tractorBg border border-tractorBorder text-xs font-bold text-slate-300 rounded-lg">Atsijungti</button>
                `;
                document.getElementById('btn-logout-grain-mob')?.addEventListener('click', logoutUser);
            }
        } else {
            if (sidebarAuthBox) {
                sidebarAuthBox.innerHTML = `
                    <p class="text-[11px] text-slate-400">Esate neprisijungęs</p>
                    <button class="login-trigger-btn w-full py-2 bg-tractorPrimary hover:bg-tractorPrimaryHover text-white text-xs font-bold rounded-lg shadow transition cursor-pointer">
                        Prisijungti su Google
                    </button>
                `;
                sidebarAuthBox.querySelector('.login-trigger-btn')?.addEventListener('click', loginWithGoogle);
            }

            if (mobileAuthSlot) {
                mobileAuthSlot.innerHTML = `
                    <button class="login-trigger-btn px-3 py-1 bg-tractorPrimary text-white rounded-lg text-xs font-bold">Prisijungti</button>
                `;
                mobileAuthSlot.querySelector('.login-trigger-btn')?.addEventListener('click', loginWithGoogle);
            }
        }
    });
});