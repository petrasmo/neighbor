// js/grainPage.js
import { auth, db } from './firebase.js';
import { loginWithGoogle, logoutUser } from './auth.js';
import { initGrainTab } from './grain.js';

document.addEventListener('DOMContentLoaded', () => {
    let currentUser = null;
    let userData = null;

    // Pradinis paleidimas (veikia iškart be prisijungimo!)
    initGrainTab(null, null);

    auth.onAuthStateChanged(async (user) => {
        const slot = document.getElementById('auth-btn-slot');
        if (user) {
            currentUser = user;
            const doc = await db.collection("users").doc(user.uid).get();
            if (doc.exists) userData = doc.data();

            if (slot) {
                slot.innerHTML = `
                    <div class="flex items-center gap-2">
                        <span class="text-xs text-slate-300 hidden sm:inline">${user.displayName || user.email}</span>
                        <button id="btn-logout-grain" class="px-3 py-1.5 bg-tractorBg border border-tractorBorder hover:border-red-500 text-xs font-bold text-slate-300 rounded-xl transition">
                            Atsijungti
                        </button>
                    </div>
                `;
                document.getElementById('btn-logout-grain')?.addEventListener('click', logoutUser);
            }
            initGrainTab(currentUser, userData);
        } else {
            if (slot) {
                slot.innerHTML = `
                    <button id="btn-login-grain" class="px-4 py-2 bg-tractorPrimary hover:bg-tractorPrimaryHover text-white text-xs font-bold rounded-xl shadow transition">
                        Prisijungti su Google
                    </button>
                `;
                document.getElementById('btn-login-grain')?.addEventListener('click', loginWithGoogle);
            }
            initGrainTab(null, null);
        }
    });
});