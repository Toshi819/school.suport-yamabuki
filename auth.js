(function () {
  const { auth, db } = window.studyhubFirebase || {};

  if (!auth || !db) {
    throw new Error("StudyHub Firebase is not initialized.");
  }

  function toEmail(username) {
    return `${String(username).trim()}@schoolapp.local`;
  }

  async function getNextUserId() {
    const counterRef = db.collection("counters").doc("userCounter");
    const counterSnap = await counterRef.get();
    const current = Number(counterSnap.exists ? counterSnap.data().count || 0 : 0);
    const nextNumber = current + 1;

    await counterRef.set({ count: nextNumber }, { merge: true });
    return `SH-${String(nextNumber).padStart(6, "0")}`;
  }

  async function ensureUserProfile(user, extra = {}) {
    const userRef = db.collection("users").doc(user.uid);
    const userSnap = await userRef.get();

    if (!userSnap.exists) {
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

      await userRef.set(profile, { merge: true });
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

    await userRef.set(profile, { merge: true });
    return profile;
  }

  async function registerWithEmail(username, password) {
    const email = toEmail(username);
    const userCredential = await auth.createUserWithEmailAndPassword(email, password);
    const profile = await ensureUserProfile(userCredential.user, {
      username,
      email,
      provider: "password",
    });
    return { user: userCredential.user, profile };
  }

  async function loginWithEmail(username, password) {
    const email = toEmail(username);
    const userCredential = await auth.signInWithEmailAndPassword(email, password);
    const profile = await ensureUserProfile(userCredential.user, {
      username,
      email,
      provider: "password",
    });
    return { user: userCredential.user, profile };
  }

  async function loginWithGoogle() {
    const provider = new firebase.auth.GoogleAuthProvider();
    const result = await auth.signInWithPopup(provider);
    const profile = await ensureUserProfile(result.user, {
      username: result.user.displayName || "ユーザー",
      email: result.user.email || "",
      provider: "google.com",
    });
    return { user: result.user, profile };
  }

  async function logoutUser() {
    await auth.signOut();
  }

  function observeAuth(callback) {
    return auth.onAuthStateChanged(callback);
  }

  window.studyhubAuth = {
    auth,
    db,
    toEmail,
    getNextUserId,
    ensureUserProfile,
    registerWithEmail,
    loginWithEmail,
    loginWithGoogle,
    logoutUser,
    observeAuth,
  };
})();
