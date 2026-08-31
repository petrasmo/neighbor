// js/grainPage.js
import { auth, db } from './firebase.js';
import { loginWithGoogle, logoutUser } from './auth.js';
import { initGrainTab } from './grain.js';
import { renderSeedCalculator } from './seedCalculator.js';
import { renderSprayerCalculator } from './sprayerCalculator.js';
import { renderFertilizerCalculator } from './fertilizerCalculator.js'; // 👈 PRIDĖTA

document.addEventListener('DOMContentLoaded', () => {
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

    // 🧪 Trąšų NPK skaičiuoklė
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
        const slot = document.getElementById('auth-btn-slot');
        if (user) {
            currentUser = user;
            const doc = await db.collection("users").doc(user.uid).get();
            if (doc.exists) userData = doc.data();

            if (slot) {
                slot.innerHTML = `
                    <div class="flex items-center gap-2">
                        <span class="text-xs text-slate-300 hidden sm:inline font-semibold">${user.displayName || user.email}</span>
                        <button id="btn-logout-grain" class="px-3.5 py-1.5 bg-tractorBg border border-tractorBorder hover:border-red-500 text-xs font-bold text-slate-300 rounded-xl transition">
                            Atsijungti
                        </button>
                    </div>
                `;
                document.getElementById('btn-logout-grain')?.addEventListener('click', logoutUser);
            }
        } else {
            if (slot) {
                slot.innerHTML = `
                    <button id="btn-login-grain" class="px-4 py-2 bg-tractorPrimary hover:bg-tractorPrimaryHover text-white text-xs font-bold rounded-xl shadow transition">
                        Prisijungti su Google
                    </button>
                `;
                document.getElementById('btn-login-grain')?.addEventListener('click', loginWithGoogle);
            }
        }
    });
});