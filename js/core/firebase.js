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

// ?? PATAISYMAS: Priverstinis Long-Polling apeina visus tinklo blokus ir ERR_CONNECTION_TIMED_OUT
db.settings({
    experimentalForceLongPolling: true
});