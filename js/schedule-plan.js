(function () {
  const dayNames = ["月", "火", "水", "木", "金"];
  const periods = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
  const grid = document.getElementById("scheduleGrid");
  const form = document.getElementById("scheduleForm");
  const status = document.getElementById("status");
  const auth = window.studyhubFirebase?.auth;
  const db = window.studyhubFirebase?.db;
  const getCurrentUser = window.studyhubAuth?.getCurrentUser;
  let subjectCatalog = [];

  function getUser() {
    return auth?.currentUser || getCurrentUser?.();
  }

  function renderGrid() {
    grid.innerHTML = "";
    grid.appendChild(Object.assign(document.createElement("div"), { className: "cell head" }));
    dayNames.forEach((day) => grid.appendChild(Object.assign(document.createElement("div"), { className: "cell head", textContent: day })));

    periods.forEach((period) => {
      grid.appendChild(Object.assign(document.createElement("div"), { className: "cell period-label", textContent: `${period}限` }));
      dayNames.forEach((day) => {
        const wrapper = document.createElement("div");
        wrapper.className = "cell";
        const select = document.createElement("select");
        select.name = `${day}_${period}`;
        select.setAttribute("aria-label", `${day}${period}限`);
        select.add(new Option("未設定", ""));
        subjectCatalog
          .filter((subject) => subject.day === day && Number(subject.period) === period)
          .forEach((subject) => select.add(new Option(`${subject.name}（${subject.teacher}）`, subject.id)));
        wrapper.appendChild(select);
        grid.appendChild(wrapper);
      });
    });
  }

  async function loadSubjectCatalog() {
    const snapshot = await db.collection("subjects").get();
    subjectCatalog = snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
    renderGrid();
    if (status) status.textContent = subjectCatalog.length ? "曜日と時限に合う授業を選んで登録します。" : "管理者が授業マスタを登録するまで選択できる授業はありません。";
  }

  async function persistScheduleEntry(subject, currentUser, day, period) {
    await db.collection("classes").doc(`${currentUser.uid}_${day}_${period}`).set({
      ownerUid: currentUser.uid,
      subjectId: subject.id,
      name: subject.name,
      teacher: subject.teacher || "",
      room: subject.room || "",
      floor: Number(subject.floor || 0),
      day,
      period,
      updatedAt: new Date(),
      createdAt: new Date(),
    }, { merge: true });
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const currentUser = getUser();
    if (!currentUser) {
      window.location.href = "./index.html";
      return;
    }

    try {
      for (const day of dayNames) {
        for (const period of periods) {
          const select = form.elements.namedItem(`${day}_${period}`);
          const subject = subjectCatalog.find((item) => item.id === select?.value);
          const classRef = db.collection("classes").doc(`${currentUser.uid}_${day}_${period}`);
          if (subject) {
            await persistScheduleEntry(subject, currentUser, day, period);
          } else {
            await classRef.delete();
          }
        }
      }
      await db.collection("users").doc(currentUser.uid).set({ scheduleFixed: true, updatedAt: new Date() }, { merge: true });
      localStorage.setItem(`studyhub_schedule_fixed_${currentUser.uid}`, "true");
      alert("時間割を登録しました");
      window.location.href = "./home.html";
    } catch (error) {
      console.error(error);
      if (status) status.textContent = "時間割の保存に失敗しました。Firebaseのルールを確認してください。";
    }
  });

  (async () => {
    const authenticatedUser = window.studyhubFirebase?.authReady
      ? await window.studyhubFirebase.authReady
      : getUser();
    if (!authenticatedUser) {
      window.location.href = "./index.html";
      return;
    }

    loadSubjectCatalog().catch((error) => {
      console.error(error);
      if (status) status.textContent = "授業マスタを読み込めませんでした。";
    });
  })();
})();
