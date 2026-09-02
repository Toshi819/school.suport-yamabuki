// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyADn6N0xVVY6qvypY3OSi1hRz2xZaaFQaw",
  authDomain: "school-9238e.firebaseapp.com",
  projectId: "school-9238e",
  storageBucket: "school-9238e.firebasestorage.app",
  messagingSenderId: "724294214772",
  appId: "1:724294214772:web:afcc9a2e6cf567afb05d21",
  measurementId: "G-774W58XF9E"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
export const auth = getAuth(app);
export const db = getFirestore(app);