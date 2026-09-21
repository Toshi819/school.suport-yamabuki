(function () {
  const firebaseState = window.studyhubFirebase || {
    app: null,
    auth: null,
    db: null,
    isFallback: true,
  };

  const { auth, db } = firebaseState;

  const STORAGE_KEYS = {
    users: "studyhub_users_v1",
    currentUser: "studyhub_current_user_v1",
    classes: "studyhub_classes_v1",
    subjects: "studyhub_subjects_v1",
  };

  function readStorage(key, fallback = null) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (error) {
      console.warn("Local storage read failed:", error);
      return fallback;
    }
  }

  function writeStorage(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      console.warn("Local storage write failed:", error);
      return false;
    }
  }

  function cloneDateValue(value) {
    if (!value) return new Date();
    if (value instanceof Date) return value;
    if (typeof value === "string") return new Date(value);
    return new Date(value.seconds ? value.seconds * 1000 : value);
  }

  function toEmail(username) {
    return `${String(username).trim()}@schoolapp.local`;
  }

  const useRemoteBackend = !!(db && auth && typeof navigator !== "undefined" && navigator.onLine !== false);

  function getCurrentUser() {
    return readStorage(STORAGE_KEYS.currentUser, null);
  }

  function setCurrentUser(user) {
    if (!user) {
      writeStorage(STORAGE_KEYS.currentUser, null);
      return null;
    }
    writeStorage(STORAGE_KEYS.currentUser, user);
    return user;
  }

  function getLocalUsers() {
    return readStorage(STORAGE_KEYS.users, {});
  }

  function getLocalSubjects() {
    return readStorage(STORAGE_KEYS.subjects, {});
  }

  function getLocalClasses() {
    return readStorage(STORAGE_KEYS.classes, {});
  }

  function persistLocalSubjects(subjects) {
    writeStorage(STORAGE_KEYS.subjects, subjects);
  }

  function persistLocalClasses(classes) {
    writeStorage(STORAGE_KEYS.classes, classes);
  }

  function getLocalClassesForCurrentUser(uid) {
    const all = getLocalClasses();
    return Object.entries(all)
      .filter(([, value]) => value && value.ownerUid === uid)
      .map(([id, value]) => ({ id, ...value }));
  }

  function upsertLocalClass(id, payload) {
    const all = getLocalClasses();
    all[id] = {
      ...all[id],
      ...payload,
    };
    persistLocalClasses(all);
    return all[id];
  }

  function deleteLocalClass(id) {
    const all = getLocalClasses();
    delete all[id];
    persistLocalClasses(all);
  }

  function upsertLocalSubject(name, payload) {
    const subjects = getLocalSubjects();
    subjects[name] = {
      ...subjects[name],
      ...payload,
      name,
    };
    persistLocalSubjects(subjects);
    return subjects[name];
  }

  async function getNextUserId() {
    if (useRemoteBackend) {
      const counterRef = db.collection("counters").doc("userCounter");
      const counterSnap = await counterRef.get();
      const current = Number(counterSnap.exists ? counterSnap.data().count || 0 : 0);
      const nextNumber = current + 1;
      await counterRef.set({ count: nextNumber }, { merge: true });
      return `SH-${String(nextNumber).padStart(6, "0")}`;
    }

    const users = getLocalUsers();
    const count = Object.keys(users).length + 1;
    return `SH-${String(count).padStart(6, "0")}`;
  }

  async function ensureUserProfile(user, extra = {}) {
    if (useRemoteBackend) {
      try {
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
      } catch (error) {
        console.warn("Firebase profile sync failed, using local storage fallback.", error);
      }
    }

    const userRecord = {
      uid: user.uid,
      userId: user.userId || `SH-${String(Object.keys(getLocalUsers()).length + 1).padStart(6, "0")}`,
      username: user.username || user.displayName || extra.username || "ユーザー",
      email: user.email || extra.email || "",
      role: "student",
      provider: user.provider || extra.provider || "password",
      createdAt: cloneDateValue(user.createdAt || new Date()),
      lastLogin: new Date(),
      ...extra,
    };

    const users = getLocalUsers();
    users[user.uid] = userRecord;
    writeStorage(STORAGE_KEYS.users, users);
    return userRecord;
  }

  async function registerWithEmail(username, password) {
    const safeUsername = String(username || "").trim();
    const email = toEmail(safeUsername);

    if (!safeUsername || !password) {
      throw new Error("ユーザー名とパスワードを入力してください");
    }

    const users = getLocalUsers();
    const existingUser = Object.values(users).find((entry) => entry.username === safeUsername || entry.email === email);
    if (existingUser) {
      throw new Error("このユーザー名はすでに登録されています");
    }

    const uid = `local_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const user = {
      uid,
      email,
      username: safeUsername,
      displayName: safeUsername,
      provider: "password",
      providerData: [{ providerId: "password" }],
      createdAt: new Date(),
      userId: `SH-${String(Object.keys(users).length + 1).padStart(6, "0")}`,
      password,
    };

    try {
      if (useRemoteBackend && auth && typeof auth.createUserWithEmailAndPassword === "function") {
        const firebaseUser = await auth.createUserWithEmailAndPassword(email, password);
        const userData = firebaseUser.user;
        const firebaseProfile = await ensureUserProfile(userData, {
          username: safeUsername,
          email,
          provider: "password",
          password,
        });
        setCurrentUser({ ...userData, ...firebaseProfile });
        return { user: userData, profile: firebaseProfile };
      }
    } catch (error) {
      console.warn("Firebase registration failed; using local storage fallback.", error);
    }

    const profile = await ensureUserProfile(user, {
      username: safeUsername,
      email,
      provider: "password",
      password,
    });
    users[user.uid] = { ...user, ...profile };
    writeStorage(STORAGE_KEYS.users, users);
    setCurrentUser({ ...user, ...profile });
    return { user, profile };
  }

  async function loginWithEmail(username, password) {
    const safeUsername = String(username || "").trim();
    const email = toEmail(safeUsername);

    if (useRemoteBackend) {
      try {
        const userCredential = await auth.signInWithEmailAndPassword(email, password);
        const profile = await ensureUserProfile(userCredential.user, {
          username: safeUsername,
          email,
          provider: "password",
          password,
        });
        return { user: userCredential.user, profile };
      } catch (error) {
        console.warn("Firebase email login failed, falling back to local storage.", error);
      }
    }

    const users = getLocalUsers();
    const candidate = Object.values(users).find((entry) => entry.username === safeUsername && entry.email === email);
    if (!candidate || candidate.password !== password) {
      throw new Error("ユーザー名とパスワードを確認してください");
    }

    const user = {
      uid: candidate.uid,
      email: candidate.email,
      username: candidate.username,
      displayName: candidate.username,
      provider: "password",
      providerData: [{ providerId: "password" }],
      createdAt: candidate.createdAt || new Date(),
    };

    setCurrentUser({ ...user, ...candidate });
    return { user, profile: candidate };
  }

  async function loginWithGoogle() {
    if (useRemoteBackend && auth && typeof auth.signInWithPopup === "function") {
      const provider = new window.studyhubFirebase.GoogleAuthProvider();
      const userCredential = await auth.signInWithPopup(provider);
      const profile = await ensureUserProfile(userCredential.user, {
        provider: "google.com",
      });
      setCurrentUser({ ...userCredential.user, ...profile });
      return { user: userCredential.user, profile };
    }

    const uid = `google_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const user = {
      uid,
      email: `google-${Date.now()}@schoolapp.local`,
      username: "Googleユーザー",
      displayName: "Googleユーザー",
      provider: "google.com",
      providerData: [{ providerId: "google.com" }],
      createdAt: new Date(),
    };

    const profile = await ensureUserProfile(user, {
      username: "Googleユーザー",
      email: user.email,
      provider: "google.com",
    });
    setCurrentUser({ ...user, ...profile });
    return { user, profile };
  }

  async function logoutUser() {
    if (useRemoteBackend && auth && typeof auth.signOut === "function") {
      await auth.signOut();
    }
    setCurrentUser(null);
  }

  async function importSubjectsFromCsv(rows = []) {
    const normalizedRows = rows
      .filter((subject) => subject && (subject.name || subject.subjectName) && subject.day && Number.isFinite(Number(subject.period)))
      .map((subject) => {
        const name = String(subject.name || subject.subjectName || "").trim();
        const teacher = String(subject.teacher || "").trim();
        const room = String(subject.room || "").trim();
        const floor = Number(subject.floor || 0);
        const day = String(subject.day || "").trim();
        const period = Number(subject.period);

        return {
          name,
          teacher,
          room,
          floor,
          day,
          period,
          updatedAt: new Date(),
        };
      });

    if (!normalizedRows.length) {
      return 0;
    }

    const subjects = getLocalSubjects();
    normalizedRows.forEach((subject) => {
      subjects[subject.name] = {
        ...subject,
        createdAt: new Date(),
      };
    });
    persistLocalSubjects(subjects);
    return normalizedRows.length;
  }

  function observeAuth(callback) {
    callback(getCurrentUser());
    return () => {};
  }

  window.studyhubAuth = {
    auth,
    db,
    toEmail,
    getCurrentUser,
    setCurrentUser,
    getNextUserId,
    ensureUserProfile,
    registerWithEmail,
    loginWithEmail,
    loginWithGoogle,
    logoutUser,
    importSubjectsFromCsv,
    observeAuth,
    getLocalSubjects,
    getLocalClassesForCurrentUser,
    upsertLocalClass,
    deleteLocalClass,
    upsertLocalSubject,
  };
})();
