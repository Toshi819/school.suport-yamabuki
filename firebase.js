import { getApp, getApps, initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  initializeFirestore,
  limit,
  orderBy,
  query,
  setDoc,
  where,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

(function () {
  const firebaseConfig = {
    apiKey: "AIzaSyBjHkhDO-lPnoIxN8Of5pWeqEQUiwiMtCQ",
    authDomain: "yanabuki-48bf8.firebaseapp.com",
    projectId: "yanabuki-48bf8",
    storageBucket: "yanabuki-48bf8.firebasestorage.app",
    messagingSenderId: "785983451132",
    appId: "1:785983451132:web:71b084521e2036bb244c79",
    measurementId: "G-MHNX46L24G",
  };

  try {
    const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
    const authInstance = getAuth(app);
    const firestore = initializeFirestore(app, {
      experimentalForceLongPolling: true,
    });

    const wrapSnapshot = (snapshot) => ({
      exists: typeof snapshot.exists === "function" ? snapshot.exists() : false,
      size: snapshot.size,
      empty: snapshot.empty,
      data: () => (typeof snapshot.data === "function" ? snapshot.data() : undefined),
      docs: snapshot.docs?.map(wrapSnapshot) || [],
      forEach: (callback) => snapshot.forEach((item) => callback(wrapSnapshot(item))),
    });

    const wrapDocument = (reference) => ({
      get: async () => wrapSnapshot(await getDoc(reference)),
      set: (data, options) => setDoc(reference, data, options),
      delete: () => deleteDoc(reference),
    });

    const wrapQuery = (queryReference) => ({
      get: async () => wrapSnapshot(await getDocs(queryReference)),
      limit: (count) => wrapQuery(query(queryReference, limit(count))),
      orderBy: (field, direction) => wrapQuery(query(queryReference, orderBy(field, direction))),
      where: (field, operator, value) => wrapQuery(query(queryReference, where(field, operator, value))),
    });

    const db = {
      collection: (name) => {
        const reference = collection(firestore, name);
        return {
          doc: (id) => wrapDocument(doc(reference, id)),
          get: async () => wrapSnapshot(await getDocs(reference)),
          limit: (count) => wrapQuery(query(reference, limit(count))),
          orderBy: (field, direction) => wrapQuery(query(reference, orderBy(field, direction))),
          where: (field, operator, value) => wrapQuery(query(reference, where(field, operator, value))),
        };
      },
    };

    const auth = {
      get currentUser() {
        return authInstance.currentUser;
      },
      createUserWithEmailAndPassword: (email, password) => createUserWithEmailAndPassword(authInstance, email, password),
      signInWithEmailAndPassword: (email, password) => signInWithEmailAndPassword(authInstance, email, password),
      signInWithPopup: (provider) => signInWithPopup(authInstance, provider),
      onAuthStateChanged: (callback) => onAuthStateChanged(authInstance, callback),
      signOut: () => signOut(authInstance),
    };

    window.studyhubFirebase = {
      app,
      auth,
      db,
      authInstance,
      firestore,
      GoogleAuthProvider,
      isFallback: false,
    };
    window.STUDYHUB_USE_FIREBASE = true;
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