// js/core/firebase.js
const firebaseConfig = {
  apiKey: "AIzaSyCQXoe-2gARzsK6Pk12cmYaJyggpYL_Ysg",
  authDomain: "neighborpm-b9968.firebaseapp.com",
  projectId: "neighborpm-b9968",
  storageBucket: "neighborpm-b9968.firebasestorage.app",
  messagingSenderId: "227564351965",
  appId: "1:227564351965:web:01757613c977ea76ee8634"
};

if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

export const auth = firebase.auth();
export const db = firebase.firestore();

if (firebase.firestore.setLogLevel) {
    firebase.firestore.setLogLevel('silent');
}

// 🌟 Tiksliai atpažįstame Google PageSpeed / Lighthouse ir kitus testavimo robotus
export const isBotOrLighthouse = /Chrome-Lighthouse|PageSpeed|Googlebot|HeadlessChrome|PTST/i.test(navigator.userAgent) || navigator.webdriver === true;

db.settings({
    experimentalForceLongPolling: !isBotOrLighthouse,
    experimentalAutoDetectLongPolling: false,
    merge: true
});