(function () {
  const { auth, db } = window.studyhubFirebase || {};
  const form = document.getElementById("verificationForm");
  const status = document.getElementById("verificationStatus");

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
      await db.collection("users").doc(user.uid).set({
        schoolEmail: document.getElementById("schoolEmail").value.trim(),
        fullName: document.getElementById("fullName").value.trim(),
        studentNumber: document.getElementById("studentNumber").value.trim(),
        verificationStatus: "submitted",
        verificationSubmittedAt: new Date(),
        updatedAt: new Date(),
      }, { merge: true });
      status.textContent = "本人確認情報を保存しました。";
    } catch (error) {
      console.error(error);
      status.textContent = "保存に失敗しました。Firestoreルールを確認してください。";
    }
  });
})();