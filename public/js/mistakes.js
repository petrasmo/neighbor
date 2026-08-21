// js/mistakes.js
import { db, auth } from './firebase.js';
import { isGuestMode } from './auth.js';

const LOCAL_STORAGE_KEY = 'hunter_mistake_question_ids';

// 1. GAUNA VISŲ KLAIDINGŲ KLAUSIMŲ ID SĄRAŠĄ
export async function getStoredMistakeIds() {
    const user = auth.currentUser;

    if (!user || isGuestMode()) {
        try {
            const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
            return raw ? JSON.parse(raw) : [];
        } catch (e) {
            return [];
        }
    }

    try {
        const doc = await db.collection("users").doc(user.uid).collection("user_data").doc("mistakes").get();
        if (doc.exists && doc.data().questionIds) {
            return doc.data().questionIds;
        }
        return [];
    } catch (e) {
        console.error("Klaida nuskaitant klaidų banką:", e);
        try {
            const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
            return raw ? JSON.parse(raw) : [];
        } catch (err) {
            return [];
        }
    }
}

// 2. ATNAUJINA KLAIDAS PO EGZAMINO (KLAIDAS PRIDEDA, O TEISINGAI ATSAKYTUS IŠTRINA)
export async function updateMistakesAfterExam(questions, userAnswers) {
    if (!questions || questions.length === 0) return;

    let currentMistakes = new Set(await getStoredMistakeIds());

    questions.forEach(q => {
        const selectedIdx = userAnswers[q.id];
        const isCorrect = selectedIdx !== undefined && q.correctOptionIndices.includes(selectedIdx);

        if (isCorrect) {
            // Jei atsakė teisingai – išbraukiame iš klaidų sąrašo!
            currentMistakes.delete(q.id);
        } else if (selectedIdx !== undefined) {
            // Jei atsakė klaidingai – pridedame į klaidų banką!
            currentMistakes.add(q.id);
        }
    });

    const updatedArray = Array.from(currentMistakes);
    const user = auth.currentUser;

    // Išsaugome lokaliai
    try {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updatedArray));
    } catch (e) {}

    // Išsaugome Firestore debesyje
    if (user && !isGuestMode()) {
        try {
            await db.collection("users").doc(user.uid).collection("user_data").doc("mistakes").set({
                questionIds: updatedArray,
                lastUpdated: Date.now()
            }, { merge: true });
        } catch (e) {
            console.error("Klaida saugant klaidas debesyje:", e);
        }
    }
}

// 3. IŠVALO VISĄ KLAIDŲ BANKĄ
export async function clearAllMistakes() {
    localStorage.removeItem(LOCAL_STORAGE_KEY);
    const user = auth.currentUser;
    if (user && !isGuestMode()) {
        try {
            await db.collection("users").doc(user.uid).collection("user_data").doc("mistakes").delete();
        } catch (e) {}
    }
}