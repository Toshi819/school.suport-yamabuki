(function () {
  const { auth, db } = window.studyhubFirebase || {};
  const form = document.getElementById("verificationForm");
  const status = document.getElementById("verificationStatus");
  const limitText = document.getElementById("storageLimitText");

  function formatBytes(bytes) {
    return `${Math.round(Number(bytes || 0) / (1024 * 1024))}MB`;
  }

  async function getUser() {
    return window.studyhubFirebase?.authReady
      ? window.studyhubFirebase.authReady
      : auth?.currentUser;
  }

  async function loadProfile(user) {
    const snapshot = await db.collection("users").doc(user.uid).get();
    if (!snapshot.exists) return;
    const profile = snapshot.data();
    document.getElementById("schoolEmail").value = profile.schoolEmail || "";
    document.getElementById("fullName").value = profile.fullName || "";
    document.getElementById("studentNumber").value = profile.studentNumber || "";
    if (limitText) {
      limitText.textContent = `現在の資料保存上限: ${formatBytes(profile.storageLimitBytes || window.studyhubAuth.getStorageLimitBytes(profile.verificationStatus))}`;
    }
  }

  (async () => {
    const user = await getUser();
    if (!user) {
      window.location.href = "./index.html";
      return;
    }
    await loadProfile(user);
  })().catch((error) => {
    console.error(error);
    status.textContent = "本人確認情報を読み込めませんでした。";
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const user = await getUser();
    if (!user) {
      window.location.href = "./index.html";
      return;
    }

    try {
      const existingSnapshot = await db.collection("users").doc(user.uid).get();
      const existingProfile = existingSnapshot.exists ? existingSnapshot.data() : {};
      const verificationStatus = existingProfile.verificationStatus === "verified" ? "verified" : "submitted";
      await db.collection("users").doc(user.uid).set({
        schoolEmail: document.getElementById("schoolEmail").value.trim(),
        fullName: document.getElementById("fullName").value.trim(),
        studentNumber: document.getElementById("studentNumber").value.trim(),
        verificationStatus,
        storageLimitBytes: existingProfile.storageLimitBytes || window.studyhubAuth.getStorageLimitBytes(verificationStatus),
        verificationSubmittedAt: new Date(),
        updatedAt: new Date(),
      }, { merge: true });
      status.textContent = "本人確認情報を保存しました。";
      if (limitText) limitText.textContent = "現在の資料保存上限: 50MB（確認待ち）";
    } catch (error) {
      console.error(error);
      status.textContent = "保存に失敗しました。Firestoreルールを確認してください。";
    }
  });
})();