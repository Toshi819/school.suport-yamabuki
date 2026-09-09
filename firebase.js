(function () {
  const firebaseConfig = {
    apiKey: "AIzaSyADn6N0xVVY6qvypY3OSi1hRz2xZaaFQaw",
    authDomain: "school-9238e.firebaseapp.com",
    projectId: "school-9238e",
    storageBucket: "school-9238e.firebasestorage.app",
    messagingSenderId: "724294214772",
    appId: "1:724294214772:web:afcc9a2e6cf567afb05d21",
    measurementId: "G-774W58XF9E"
  };

  const hasFirebaseSdk = !!window.firebase;

  if (!hasFirebaseSdk) {
    window.studyhubFirebase = {
      app: null,
      auth: null,
      db: null,
      isFallback: true,
    };
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
  } catch (error) {
    console.error("Firebase initialization failed:", error);
    window.studyhubFirebase = {
      app: null,
      auth: null,
      db: null,
      isFallback: true,
    };
  }
})();