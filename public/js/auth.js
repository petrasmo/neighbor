// js/auth.js
import { auth } from './firebase.js';
import { showDialog } from './ui.js';

// Svečio režimo būsenos valdymas
export function isGuestMode() {
    return localStorage.getItem('hunter_guest_mode') === 'true';
}

export function enableGuestMode() {
    localStorage.setItem('hunter_guest_mode', 'true');
}

export function disableGuestMode() {
    localStorage.removeItem('hunter_guest_mode');
}

// 1. Google prisijungimas (Google el. paštai visada automatiškai patvirtinti)
export function loginWithGoogle() {
    disableGuestMode();
    const provider = new firebase.auth.GoogleAuthProvider();
    auth.signInWithPopup(provider)
        .then((result) => {
            console.log("Sėkmingai prisijungta su Google:", result.user.email);
        })
        .catch((error) => {
            console.error("Google prisijungimo klaida:", error);
            if (error.code !== 'auth/popup-closed-by-user') {
                showDialog("Klaida", "Nepavyko prisijungti su Google paskyra.", "🛑");
            }
        });
}

// 2. Registracija su el. paštu + AUTOMATINIS PATVIRTINIMO LAIŠKAS
export async function registerWithEmail(email, password, displayName = "") {
    disableGuestMode();
    try {
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        const user = userCredential.user;

        if (displayName && user) {
            await user.updateProfile({
                displayName: displayName
            });
        }

        // Fone išsiunčiame patvirtinimo laišką
        if (user) {
            try {
                await user.sendEmailVerification();
                showDialog(
                    "Paskyra sukurta! 🎉",
                    `Sveikiname prisijungus! Į jūsų el. paštą (${email}) išsiuntėme patvirtinimo nuorodą. Savo paštą galite patvirtinti bet kuriuo patogiu metu.`,
                    "📧"
                );
            } catch (verErr) {
                console.warn("Nepavyko išsiųsti patvirtinimo laiško fone:", verErr);
            }
        }

        console.log("Sėkmingai užregistruotas naujas vartotojas:", email);
    } catch (error) {
        console.error("Registracijos klaida:", error);
        showAuthError(error);
    }
}

// 3. Pakartotinis patvirtinimo laiško išsiuntimas
export async function resendVerificationEmail() {
    const user = auth.currentUser;
    if (!user) return;

    try {
        await user.sendEmailVerification();
        showDialog(
            "Laiškas išsiųstas", 
            `Patvirtinimo nuoroda pakartotinai išsiųsta adresu: ${user.email}. Patikrinkite savo pašto dėžutę (ir „Spam“ aplanką).`, 
            "📧"
        );
    } catch (error) {
        console.error("Klaida siunčiant patvirtinimo laišką:", error);
        showDialog("Dėmesio", "Laiškas jau neseniai buvo išsiųstas. Pabandykite po kelių minučių.", "⏳");
    }
}

// 4. Prisijungimas su el. paštu ir slaptažodžiu
export async function loginWithEmail(email, password) {
    disableGuestMode();
    try {
        const userCredential = await auth.signInWithEmailAndPassword(email, password);
        console.log("Sėkmingai prisijungta:", userCredential.user.email);
    } catch (error) {
        console.error("Prisijungimo klaida:", error);
        showAuthError(error);
    }
}

// 5. Slaptažodžio atstatymas
export async function resetPassword(email) {
    if (!email) {
        showDialog("Dėmesio", "Įveskite savo el. pašto adresą slaptažodžio atstatymui.", "⚠️");
        return;
    }

    try {
        await auth.sendPasswordResetEmail(email);
        showDialog("Laiškas išsiųstas", `Slaptažodžio atstatymo nuoroda išsiųsta į ${email}. Patikrinkite savo pašto dėžutę.`, "📧");
    } catch (error) {
        console.error("Slaptažodžio atstatymo klaida:", error);
        showAuthError(error);
    }
}

// 6. Atsijungimas
export function logoutUser() {
    disableGuestMode();
    auth.signOut().then(() => {
        location.reload();
    });
}

// Pagalbinė funkcija: Lietuviški klaidų pranešimai
function showAuthError(error) {
    let message = "Įvyko nenumatyta autentifikavimo klaida.";
    
    switch (error.code) {
        case 'auth/email-already-in-use':
            message = "Šis el. pašto adresas jau yra užregistruotas sistemoje.";
            break;
        case 'auth/invalid-email':
            message = "Neteisingas el. pašto adreso formatas.";
            break;
        case 'auth/user-not-found':
        case 'auth/wrong-password':
        case 'auth/invalid-credential':
            message = "Neteisingas el. paštas arba slaptažodis.";
            break;
        case 'auth/weak-password':
            message = "Slaptažodis per silpnas. Jis turi būti bent 6 simbolių ilgio.";
            break;
        case 'auth/too-many-requests':
            message = "Per daug nesėkmingų bandymų. Pabandykite vėliau arba atkurkite slaptažodį.";
            break;
    }

    showDialog("Klaida", message, "🛑");
}