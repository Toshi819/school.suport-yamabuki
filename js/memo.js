(function () {
  const { auth, db } = window.studyhubFirebase || {};
  const classId = new URLSearchParams(window.location.search).get("classId") || "";
  const requestedSubjectId = new URLSearchParams(window.location.search).get("subjectId") || "";
  const subject = document.getElementById("memoSubject");
  const text = document.getElementById("memoText");
  const status = document.getElementById("memoStatus");
  const saveButton = document.getElementById("saveMemo");
  const deleteButton = document.getElementById("deleteMemo");
  const backLink = document.getElementById("backToClass");
  let user;
  let memoRef;
  let groupId = "";

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
    groupId = requestedSubjectId || classData.subjectId || classId;
    subject.textContent = `${classData.name || "授業"} / ${classData.day || ""}${classData.period || ""}限`;
    backLink.href = `./class-menu.html?classId=${encodeURIComponent(classId)}&subjectId=${encodeURIComponent(groupId)}`;
    memoRef = db.collection("classMemos").doc(`${groupId}_${user.uid}`);
    const memoSnapshot = await memoRef.get();
    if (memoSnapshot.exists) {
      text.value = memoSnapshot.data().text || "";
    } else if (groupId !== classId) {
      const classList = await db.collection("classes").where("ownerUid", "==", user.uid).get();
      const relatedIds = classList.docs
        .filter((item) => item.data().subjectId === groupId)
        .map((item) => item.id);
      const legacySnapshots = await Promise.all([...new Set([classId, ...relatedIds])].map((id) => db.collection("classMemos").doc(`${id}_${user.uid}`).get()));
      const legacyMemo = legacySnapshots.find((item) => item.exists);
      if (legacyMemo) text.value = legacyMemo.data().text || "";
    }
    setStatus("");
  }
  saveButton.addEventListener("click", async () => {
    if (!memoRef || !user) return;
    saveButton.disabled = true;
    setStatus("保存中...");
    try {
      await memoRef.set({ classId: groupId, ownerUid: user.uid, text: text.value, updatedAt: new Date() }, { merge: true });
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
