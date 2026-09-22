(function () {
  const { auth, db } = window.studyhubFirebase || {};
  const classId = new URLSearchParams(window.location.search).get("classId") || "";
  const subject = document.getElementById("solveSubject");
  const progress = document.getElementById("cardProgress");
  const flashcard = document.getElementById("flashcard");
  const flipButton = document.getElementById("flipCard");
  const nextButton = document.getElementById("nextCard");
  const status = document.getElementById("solveStatus");
  const backLink = document.getElementById("backToCards");
  let cards = [];
  let index = 0;
  let showingBack = false;

  function cardQuery(user) { return db.collection("classCards").where("classId", "==", classId).where("ownerUid", "==", user.uid); }
  function renderCard() {
    if (!cards.length) {
      progress.textContent = "";
      flashcard.textContent = "単語カードがありません";
      flipButton.disabled = true;
      nextButton.disabled = true;
      status.textContent = "先に単語カードを作成してください。";
      return;
    }
    const card = cards[index];
    showingBack = false;
    flashcard.classList.remove("back");
    flashcard.textContent = card.front;
    flipButton.textContent = "裏を見る";
    progress.textContent = `${index + 1} / ${cards.length}枚`;
    status.textContent = "表を覚えたら裏を確認しましょう。";
  }
  async function boot() {
    const user = window.studyhubFirebase?.authReady ? await window.studyhubFirebase.authReady : auth?.currentUser;
    if (!user || !classId || !db) { window.location.replace("./home.html"); return; }
    const classSnapshot = await db.collection("classes").doc(classId).get();
    if (!classSnapshot.exists || classSnapshot.data().ownerUid !== user.uid) { window.location.replace("./home.html"); return; }
    const data = classSnapshot.data();
    subject.textContent = `${data.name || "授業"} / ${data.day || ""}${data.period || ""}限`;
    backLink.href = `./cards.html?classId=${encodeURIComponent(classId)}`;
    const snapshot = await cardQuery(user).get();
    cards = snapshot.docs.map((doc) => doc.data());
    renderCard();
  }
  flipButton.addEventListener("click", () => {
    if (!cards.length) return;
    showingBack = !showingBack;
    flashcard.classList.toggle("back", showingBack);
    flashcard.textContent = showingBack ? cards[index].back : cards[index].front;
    flipButton.textContent = showingBack ? "表に戻す" : "裏を見る";
  });
  nextButton.addEventListener("click", () => {
    if (!cards.length) return;
    index = (index + 1) % cards.length;
    renderCard();
  });
  boot().catch((error) => { console.error(error); status.textContent = "カードを読み込めませんでした。"; });
})();
