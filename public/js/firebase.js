const firebaseConfig = {
  apiKey: "AIzaSyAZVU_0JeYxOZ99hLz9bsj8fD8wK05hC4c",
  authDomain: "huntertest-c1924.firebaseapp.com",
  projectId: "huntertest-c1924",
  storageBucket: "huntertest-c1924.firebasestorage.app",
  messagingSenderId: "302105416363",
  appId: "1:382105416363:web:77783e569d7b8a6ff11dee",
  measurementId: "G-7493016MD9"
};

firebase.initializeApp(firebaseConfig);

export const auth = firebase.auth();
export const db = firebase.firestore();