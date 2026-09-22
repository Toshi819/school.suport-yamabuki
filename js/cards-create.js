(function () {
  const { auth, db } = window.studyhubFirebase || {};
  const classId = new URLSearchParams(window.location.search).get("classId") || "";
  const subject = document.getElementById("createSubject");
  const form = document.getElementById("cardForm");
  const front = document.getElementById("cardFront");
  const back = document.getElementById("cardBack");
  const status = document.getElementById("createStatus");
  const list = document.getElementById("cardList");
  const backLink = document.getElementById("backToCards");
  let user;
  let classData;

  function cardQuery() { return db.collection("classCards").where("classId", "==", classId).where("ownerUid", "==", user.uid); }
  function renderCards(snapshot) {
    list.innerHTML = snapshot.docs.length ? snapshot.docs.map((doc) => `<div class="card-row"><span>${escapeHtml(doc.data().front)} / ${escapeHtml(doc.data().back)}</span><button class="delete-button" type="button" data-card-id="${doc.id}">削除</button></div>`).join("") : "<p class='sub'>まだ単語カードがありません。</p>";
    list.querySelectorAll("[data-card-id]").forEach((button) => button.addEventListener("click", () => deleteCard(button.dataset.cardId)));
  }
  function escapeHtml(value) { const div = document.createElement("div"); div.textContent = value; return div.innerHTML; }
  async function loadCards() { renderCards(await cardQuery().get()); }
  async function deleteCard(cardId) {
    if (!window.confirm("この単語カードを削除しますか？")) return;
    await db.collection("classCards").doc(cardId).delete();
    status.textContent = "削除しました";
    await loadCards();
  }
  async function boot() {
    user = window.studyhubFirebase?.authReady ? await window.studyhubFirebase.authReady : auth?.currentUser;
    if (!user || !classId || !db) { window.location.replace("./home.html"); return; }
    const snapshot = await db.collection("classes").doc(classId).get();
    if (!snapshot.exists || snapshot.data().ownerUid !== user.uid) { window.location.replace("./home.html"); return; }
    classData = snapshot.data();
    subject.textContent = `${classData.name || "授業"} / ${classData.day || ""}${classData.period || ""}限`;
    backLink.href = `./cards.html?classId=${encodeURIComponent(classId)}`;
    await loadCards();
  }
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!user) return;
    status.textContent = "保存中...";
    try {
      await db.collection("classCards").doc(`${classId}_${user.uid}_${Date.now()}`).set({ classId, ownerUid: user.uid, front: front.value.trim(), back: back.value.trim(), createdAt: new Date(), updatedAt: new Date() });
      form.reset();
      status.textContent = "単語カードを追加しました";
      await loadCards();
    } catch (error) { console.error(error); status.textContent = "保存できませんでした。Firestoreルールを公開してください。"; }
  });
  boot().catch((error) => { console.error(error); status.textContent = "カードを読み込めませんでした。"; });
})();
