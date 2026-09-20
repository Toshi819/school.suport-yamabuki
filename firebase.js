(function () {
  const firebaseConfig = {
    apiKey: "AIzaSyD2uBPIxR1kK6GCCe7nVMJYbuqMOaBOJlU",
    authDomain: "yamabuki-56345.firebaseapp.com",
    projectId: "yamabuki-56345",
    storageBucket: "yamabuki-56345.firebasestorage.app",
    messagingSenderId: "624370846183",
    appId: "1:624370846183:web:f3265610473c234bfb1542",
    measurementId: "G-5Y62H21GTE"
  };

  const hasFirebaseSdk = !!window.firebase;

  if (!hasFirebaseSdk) {
    window.studyhubFirebase = {
      app: null,
      auth: null,
      db: null,
      isFallback: true,
    };
    window.STUDYHUB_USE_FIREBASE = false;
    return;
  }

  try {
    if (!firebase.apps.length) {
      firebase.initializeApp(firebaseConfig);
    }

    const app = firebase.app();
    const auth = firebase.auth();
    const db = firebase.firestore();

    window.studyhubFirebase = { app, auth, db, isFallback: false };
    window.STUDYHUB_USE_FIREBASE = false;
  } catch (error) {
    console.error("Firebase initialization failed:", error);
    window.studyhubFirebase = {
      app: null,
      auth: null,
      db: null,
      isFallback: true,
    };
    window.STUDYHUB_USE_FIREBASE = false;
  }
})();