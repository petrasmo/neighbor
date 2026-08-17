import { db } from './firebase.js';
import { updateCreditsUI } from './ui.js';

let userListener = null;
let creditsListener = null;

export function stopCreditsListeners() {
    if (userListener) userListener();
    if (creditsListener) creditsListener();
}

export function startCreditsListener(user) {
    stopCreditsListeners();
    const uid = user.uid;
    
    // PRIDĖTA: Išsaugome įrenginio ID globaliai
    window.activeDeviceId = "web_" + uid; 

    userListener = db.collection("users").doc(uid).onSnapshot(async (doc) => {
        const tempWebDeviceId = "web_" + uid;

        if (!doc.exists) {
            const newUserProfile = {
                uid: uid,
                email: user.email || "",
                name: user.displayName || "Medžiotojas",
                deviceId: tempWebDeviceId,
                isSetupComplete: true,
                lastUpdated: new Date()
            };

            const startingCredits = {
                amount: 50,
                weeklyAccessUntil: 0
            };

            try {
                await db.collection("users").doc(uid).set(newUserProfile);
                await db.collection("user_credits").doc(tempWebDeviceId).set(startingCredits);
                console.log("Sėkmingai sukurtas naujas vartotojas debesyje.");
            } catch (e) {
                console.error("Klaida registruojant naują vartotoją:", e);
                updateCreditsUI("Klaida 🛑");
            }
        } else {
            const userData = doc.data();
            const currentDeviceId = userData.deviceId;
			if (currentDeviceId) {
                window.activeDeviceId = currentDeviceId; // Visada užtikriname, kad egzaminų variklis naudos naujausią ID!
            }
			const tempWebDeviceId = "web_" + uid;
            if (currentDeviceId && currentDeviceId !== tempWebDeviceId) {
                try {
                    const oldCreditsDoc = await db.collection("user_credits").doc(tempWebDeviceId).get();
                    if (oldCreditsDoc.exists) {
                        const oldData = oldCreditsDoc.data();
                        const oldAmount = oldData.amount || 0;

                        if (oldAmount > 0) {
                            const newCreditsDoc = await db.collection("user_credits").doc(currentDeviceId).get();
                            let newAmount = oldAmount;
                            if (newCreditsDoc.exists) {
                                newAmount += (newCreditsDoc.data().amount || 0);
                            }

                            await db.collection("user_credits").doc(currentDeviceId).set({
                                amount: newAmount,
                                weeklyAccessUntil: oldData.weeklyAccessUntil || 0
                            }, { merge: true });

                            await db.collection("user_credits").doc(tempWebDeviceId).delete();
                            console.log(`Kreditai (${oldAmount}) sėkmingai migruoti į telefono ID: ${currentDeviceId}`);
                        }
                    }
                } catch (e) {
                    console.error("Klaida vykdant kreditų migraciją:", e);
                }
            }

            if (currentDeviceId) {
                listenToDeviceCredits(currentDeviceId);
            } else {
                updateCreditsUI("Nėra įrenginio ID 🛑");
            }
        }
    }, (error) => {
        console.error("Klaida nuskaitant vartotojo profilį:", error);
        updateCreditsUI("Klaida 🛑");
    });
}

function listenToDeviceCredits(deviceId) {
    creditsListener = db.collection("user_credits").doc(deviceId).onSnapshot((doc) => {
        if (doc.exists) {
            const data = doc.data();
            const amount = data.amount !== undefined ? data.amount : 0;
            
            // PRIDĖTA: Išsaugome kreditų skaičių bendroje atmintyje ekrano atnaujinimui
            window.userCreditsAmount = amount; 
            
            updateCreditsUI(amount);
        } else {
            window.userCreditsAmount = 0;
            updateCreditsUI("0");
        }
    }, (error) => {
        console.error("Klaida nuskaitant kreditus:", error);
        updateCreditsUI("Klaida 🛑");
    });
}