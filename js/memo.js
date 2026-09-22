(function () {
  const { auth, db } = window.studyhubFirebase || {};
  const classId = new URLSearchParams(window.location.search).get("classId") || "";
  const subject = document.getElementById("memoSubject");
  const text = document.getElementById("memoText");
  const status = document.getElementById("memoStatus");
  const saveButton = document.getElementById("saveMemo");
  const deleteButton = document.getElementById("deleteMemo");
  const backLink = document.getElementById("backToClass");
  let user;
  let memoRef;

  function setStatus(message) {
    status.textContent = message;
  }
  async function boot() {
    user = window.studyhubFirebase?.authReady ? await window.studyhubFirebase.authReady : auth?.currentUser;
    if (!user || !classId || !db) {
      window.location.replace("./home.html");
      return;
    }
    const classSnapshot = await db.collection("classes").doc(classId).get();
    if (!classSnapshot.exists || classSnapshot.data().ownerUid !== user.uid) {
      window.location.replace("./home.html");
      return;
    }
    const classData = classSnapshot.data();
    subject.textContent = `${classData.name || "授業"} / ${classData.day || ""}${classData.period || ""}限`;
    backLink.href = `./class-menu.html?classId=${encodeURIComponent(classId)}`;
    memoRef = db.collection("classMemos").doc(`${classId}_${user.uid}`);
    const memoSnapshot = await memoRef.get();
    if (memoSnapshot.exists) text.value = memoSnapshot.data().text || "";
    setStatus("");
  }
  saveButton.addEventListener("click", async () => {
    if (!memoRef || !user) return;
    saveButton.disabled = true;
    setStatus("保存中...");
    try {
      await memoRef.set({ classId, ownerUid: user.uid, text: text.value, updatedAt: new Date() }, { merge: true });
      setStatus("保存しました");
    } catch (error) {
      console.error(error);
      setStatus("保存できませんでした。Firestoreルールを公開してください。");
    } finally {
      saveButton.disabled = false;
    }
  });
  deleteButton.addEventListener("click", async () => {
    if (!memoRef || !user || !text.value) return;
    if (!window.confirm("この授業のメモを削除しますか？")) return;
    deleteButton.disabled = true;
    try {
      await memoRef.delete();
      text.value = "";
      setStatus("削除しました");
    } catch (error) {
      console.error(error);
      setStatus("削除できませんでした。");
    } finally {
      deleteButton.disabled = false;
    }
  });
  boot().catch((error) => {
    console.error(error);
    setStatus("メモを読み込めませんでした。");
  });
})();
