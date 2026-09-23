(function () {
  const { auth, db } = window.studyhubFirebase || {};
  const params = new URLSearchParams(window.location.search);
  const classId = params.get("classId") || "";
  const title = document.getElementById("subjectName");
  const headerTitle = document.getElementById("classMenuTitle");
  const details = document.getElementById("subjectDetails");
  const filesLink = document.getElementById("filesLink");
  const classProblemLink = document.getElementById("classProblemLink");
  const cardsLink = document.getElementById("cardsLink");
  const memoLink = document.getElementById("memoLink");
  const bottomProblemLink = document.getElementById("bottomProblemLink");
  const bottomCardsLink = document.getElementById("bottomCardsLink");
  const menuButton = document.getElementById("classMenuButton");
  const closeMenuButton = document.getElementById("classCloseMenuButton");
  const sideMenu = document.getElementById("classSideMenu");
  const menuBackdrop = document.getElementById("classMenuBackdrop");
  const classFilesMenuLink = document.getElementById("classFilesMenuLink");

  function setMenuOpen(isOpen) {
    sideMenu?.classList.toggle("open", isOpen);
    sideMenu?.setAttribute("aria-hidden", String(!isOpen));
    menuButton?.setAttribute("aria-expanded", String(isOpen));
    if (menuBackdrop) menuBackdrop.hidden = !isOpen;
  }

  function classQuery(subjectId) {
    return `classId=${encodeURIComponent(classId)}&subjectId=${encodeURIComponent(subjectId || classId)}`;
  }

  menuButton?.addEventListener("click", () => setMenuOpen(true));
  closeMenuButton?.addEventListener("click", () => setMenuOpen(false));
  menuBackdrop?.addEventListener("click", () => setMenuOpen(false));

  async function boot() {
    const user = window.studyhubFirebase?.authReady ? await window.studyhubFirebase.authReady : auth?.currentUser;
    if (!user || !classId) {
      window.location.replace("./home.html");
      return;
    }
    const snapshot = await db.collection("classes").doc(classId).get();
    if (!snapshot.exists || snapshot.data().ownerUid !== user.uid) {
      window.location.replace("./home.html");
      return;
    }
    const data = snapshot.data();
    const label = data.name || "授業";
    title.textContent = label;
    headerTitle.textContent = label;
    details.textContent = `${data.day || ""}${data.period || ""}限 / ${data.room || "教室未設定"}`;
    filesLink.href = `./files.html?subjectId=${encodeURIComponent(data.subjectId || classId)}`;
    classFilesMenuLink.href = filesLink.href;
    classProblemLink.href = `./class-problem.html?${classQuery(data.subjectId)}`;
    cardsLink.href = `./cards.html?${classQuery(data.subjectId)}`;
    bottomCardsLink.href = `./cards.html?${classQuery(data.subjectId)}`;
    memoLink.href = `./memo.html?${classQuery(data.subjectId)}`;
    bottomProblemLink.href = "./problem.html";
  }

  boot().catch((error) => {
    console.error(error);
    window.location.replace("./home.html");
  });
})();
