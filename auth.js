import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import { doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";
import { auth, db } from "./firebase.js";

export { auth, db };

export function toEmail(username) {
  return `${String(username).trim()}@schoolapp.local`;
}

export async function getNextUserId() {
  const counterRef = doc(db, "counters", "userCounter");
  const counterSnap = await getDoc(counterRef);
  const current = Number(counterSnap.exists() ? counterSnap.data().count || 0 : 0);
  const nextNumber = current + 1;

  await setDoc(counterRef, { count: nextNumber }, { merge: true });
  return `SH-${String(nextNumber).padStart(6, "0")}`;
}

export async function ensureUserProfile(user, extra = {}) {
  const userRef = doc(db, "users", user.uid);
  const userSnap = await getDoc(userRef);

  if (!userSnap.exists()) {
    const nextUserId = await getNextUserId();
    const profile = {
      uid: user.uid,
      userId: nextUserId,
      username: user.displayName || extra.username || "ユーザー",
      email: user.email || extra.email || "",
      role: "student",
      provider: user.providerData?.[0]?.providerId || extra.provider || "password",
      createdAt: new Date(),
      lastLogin: new Date(),
      ...extra,
    };

    await setDoc(userRef, profile, { merge: true });
    return profile;
  }

  const profile = {
    ...userSnap.data(),
    username: user.displayName || extra.username || userSnap.data().username || "ユーザー",
    email: user.email || extra.email || userSnap.data().email || "",
    provider: user.providerData?.[0]?.providerId || extra.provider || userSnap.data().provider || "password",
    lastLogin: new Date(),
    ...extra,
  };

  await setDoc(userRef, profile, { merge: true });
  return profile;
}

export async function registerWithEmail(username, password) {
  const email = toEmail(username);
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  const profile = await ensureUserProfile(userCredential.user, {
    username,
    email,
    provider: "password",
  });
  return { user: userCredential.user, profile };
}

export async function loginWithEmail(username, password) {
  const email = toEmail(username);
  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  const profile = await ensureUserProfile(userCredential.user, {
    username,
    email,
    provider: "password",
  });
  return { user: userCredential.user, profile };
}

export async function loginWithGoogle() {
  const provider = new GoogleAuthProvider();
  const result = await signInWithPopup(auth, provider);
  const profile = await ensureUserProfile(result.user, {
    username: result.user.displayName || "ユーザー",
    email: result.user.email || "",
    provider: "google.com",
  });
  return { user: result.user, profile };
}

export async function logoutUser() {
  await signOut(auth);
}

export function observeAuth(callback) {
  return onAuthStateChanged(auth, callback);
}
