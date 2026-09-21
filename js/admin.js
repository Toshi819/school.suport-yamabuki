(function () {
  const { auth, db } = window.studyhubFirebase || {};
  const { getCurrentUser, getUserProfile, isAdmin } = window.studyhubAuth || {};
  const form = document.getElementById("adminSubjectForm");
  const list = document.getElementById("adminSubjectList");
  const status = document.getElementById("adminStatus");
  const periodInput = document.getElementById("adminPeriod");
  const dayInput = document.getElementById("adminDay");

  for (let period = 1; period <= 12; period += 1) {
    periodInput.add(new Option(`${period}限`, String(period)));
  }

  function showStatus(message) {
    if (status) status.textContent = message;
  }

  function getUser() {
    return auth?.currentUser || getCurrentUser?.();
  }

  function subjectId(name, day, period) {
    return `${name}_${day}_${period}`.replace(/[\\/#?\[\]]/g, "_").slice(0, 120);
  }

  async function loadSubjects() {
    const snapshot = await db.collection("subjects").get();
    const subjects = snapshot.docs
      .map((item) => ({ id: item.id, ...item.data() }))
      .sort((left, right) => `${left.day}${left.period}${left.name}`.localeCompare(`${right.day}${right.period}${right.name}`, "ja"));

    list.innerHTML = "";
    if (!subjects.length) {
      list.textContent = "授業マスタはまだありません。";
      return;
    }

    subjects.forEach((subject) => {
      const row = document.createElement("div");
      row.className = "subject-row";
      const details = document.createElement("div");
      details.innerHTML = `<strong>${subject.name}</strong><div class="subject-meta">${subject.day} ${subject.period}限 / ${subject.teacher} / ${subject.room}</div>`;
      const deleteButton = document.createElement("button");
      deleteButton.className = "delete-btn";
      deleteButton.type = "button";
      deleteButton.textContent = "削除";
      deleteButton.addEventListener("click", async () => {
        if (!window.confirm(`${subject.name}を削除しますか？`)) return;
        await db.collection("subjects").doc(subject.id).delete();
        showStatus("授業マスタから削除しました。");
        await loadSubjects();
      });
      row.append(details, deleteButton);
      list.appendChild(row);
    });
  }

  async function boot() {
    const authenticatedUser = window.studyhubFirebase?.authReady
      ? await window.studyhubFirebase.authReady
      : getUser();
    const user = authenticatedUser;
    if (!user) {
      window.location.href = "./index.html";
      return;
    }
    const profile = await getUserProfile(user.uid);
    if (!isAdmin(profile)) {
      alert("管理者権限が必要です。");
      window.location.href = "./home.html";
      return;
    }
    await loadSubjects();
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const name = document.getElementById("adminSubjectName").value.trim();
    const teacher = document.getElementById("adminTeacher").value.trim();
    const room = document.getElementById("adminRoom").value.trim();
    const floor = Number(document.getElementById("adminFloor").value || 0);
    const day = dayInput.value;
    const period = Number(periodInput.value);

    try {
      await db.collection("subjects").doc(subjectId(name, day, period)).set({
        name,
        teacher,
        room,
        floor,
        day,
        period,
        updatedAt: new Date(),
      }, { merge: true });
      form.reset();
      periodInput.value = "1";
      showStatus("授業マスタに追加しました。");
      await loadSubjects();
    } catch (error) {
      console.error(error);
      showStatus("授業マスタの保存に失敗しました。");
    }
  });

  boot().catch((error) => {
    console.error(error);
    showStatus("管理者画面の読み込みに失敗しました。");
  });
})();