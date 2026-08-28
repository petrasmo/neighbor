// js/auth.js
import { auth, db } from './firebase.js';
import { showDialog } from './ui.js';

export function loginWithGoogle() {
    const provider = new firebase.auth.GoogleAuthProvider();
    auth.signInWithPopup(provider).catch((error) => {
        console.error("Google login klaida:", error);
        if (error.code !== 'auth/popup-closed-by-user') {
            showDialog("Klaida", "Nepavyko prisijungti su Google.", "🛑");
        }
    });
}

export function logoutUser() {
    auth.signOut().then(() => {
        location.reload();
    });
}