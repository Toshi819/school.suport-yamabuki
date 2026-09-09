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

  if (!window.firebase) {
    throw new Error("Firebase SDK is not loaded. Include firebase-app-compat, firebase-auth-compat, and firebase-firestore-compat scripts.");
  }

  if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
  }

  const app = firebase.app();
  const auth = firebase.auth();
  const db = firebase.firestore();

  window.studyhubFirebase = { app, auth, db };
})();