// js/core/notifications.js
import { db } from './firebase.js';
import { showBottomToast } from './ui.js';

const VAPID_KEY = "BOKA1QIdgti8zx9LUJhDhOq77CA1QVRMS8gHTPLaJvbeLZL-GbSqpYZ_QNj-qm4MYYywXpYNBUTf-oZ5oVg6f5I";

export async function autoRegisterFcmToken(currentUser, userData, isUserAction = false) {
    if (!currentUser) return;

    const isEnabledInPrefs = userData?.notificationPreferences?.enabled === true;

    // ?? Jei tai automatinis patikrinimas (uþëjus á portalà), bet praneðimai NËRA ájungti nustatymuose – TYLIME!
    if (!isUserAction && !isEnabledInPrefs) {
        return;
    }

    if (!('Notification' in window) || !('serviceWorker' in navigator)) {
        return;
    }

    try {
        let permission = Notification.permission;

        // Klausiame leidimo TIK JEI:
        // 1. Vartotojas pats paspaudë varnelæ (isUserAction === true)
        // ARBA
        // 2. Jo nustatymuose praneðimai jau buvo ájungti anksèiau (isEnabledInPrefs === true)
        if (permission === 'default') {
            if (isUserAction || isEnabledInPrefs) {
                permission = await Notification.requestPermission();
            } else {
                return;
            }
        }

        if (permission !== 'granted') {
            if (isUserAction && permission === 'denied') {
                showBottomToast("Praneðimai uþblokuoti narðyklës nustatymuose.", "warning");
            }
            return;
        }

        const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
        await navigator.serviceWorker.ready;

        const messaging = firebase.messaging();
        const currentDeviceToken = await messaging.getToken({ 
            vapidKey: VAPID_KEY,
            serviceWorkerRegistration: registration
        });

        if (currentDeviceToken) {
            const existingTokens = userData?.fcmTokens || [];
            if (!existingTokens.includes(currentDeviceToken)) {
                await db.collection("users").doc(currentUser.uid).update({
                    fcmToken: currentDeviceToken,
                    fcmTokens: firebase.firestore.FieldValue.arrayUnion(currentDeviceToken)
                });
            }
        }

        messaging.onMessage((payload) => {
            const title = payload.notification?.title || payload.data?.title || "Praneðimas";
            const body = payload.notification?.body || payload.data?.body || "";
            showBottomToast(`${title}: ${body}`, "info");
        });

    } catch (err) {
        console.warn("FCM klaida:", err);
    }
}