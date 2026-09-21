(function () {
  const { auth, db } = window.studyhubFirebase || {};
  const form = document.getElementById("reportForm");
  const status = document.getElementById("reportStatus");

  async function getUser() {
    return window.studyhubFirebase?.authReady ? window.studyhubFirebase.authReady : auth?.currentUser;
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const user = await getUser();
    if (!user) {
      window.location.href = "./index.html";
      return;
    }
    try {
      await db.collection("reports").doc(`${user.uid}_${Date.now()}`).set({
        ownerUid: user.uid,
        reporterEmail: user.email || "",
        category: document.getElementById("reportCategory").value,
        title: document.getElementById("reportTitle").value.trim(),
        message: document.getElementById("reportMessage").value.trim(),
        status: "未対応",
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      form.reset();
      status.textContent = "問題報告を送信しました。";
    } catch (error) {
      console.error(error);
      status.textContent = "送信に失敗しました。";
    }
  });
})();