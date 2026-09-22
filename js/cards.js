(function () {
  const { auth, db } = window.studyhubFirebase || {};
  const classId = new URLSearchParams(window.location.search).get("classId") || "";
  const subject = document.getElementById("cardsSubject");
  const solveLink = document.getElementById("solveCards");
  const createLink = document.getElementById("createCards");
  const backLink = document.getElementById("backToClass");

  async function boot() {
    const user = window.studyhubFirebase?.authReady ? await window.studyhubFirebase.authReady : auth?.currentUser;
    if (!user || !classId || !db) { window.location.replace("./home.html"); return; }
    const snapshot = await db.collection("classes").doc(classId).get();
    if (!snapshot.exists || snapshot.data().ownerUid !== user.uid) { window.location.replace("./home.html"); return; }
    const data = snapshot.data();
    subject.textContent = `${data.name || "授業"} / ${data.day || ""}${data.period || ""}限`;
    const query = `?classId=${encodeURIComponent(classId)}`;
    solveLink.href = `./cards-solve.html${query}`;
    createLink.href = `./cards-create.html${query}`;
    backLink.href = `./class-menu.html${query}`;
  }
  boot().catch((error) => { console.error(error); window.location.replace("./home.html"); });
})();
