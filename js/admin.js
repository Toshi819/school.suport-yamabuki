(function () {
  const { auth, db } = window.studyhubFirebase || {};
  const { getCurrentUser, getUserProfile, isAdmin, sendUserPasswordReset, logoutUser } = window.studyhubAuth || {};
  const form = document.getElementById("adminSubjectForm");
  const list = document.getElementById("adminSubjectList");
  const status = document.getElementById("adminStatus");
  const periodInput = document.getElementById("adminPeriod");
  const dayInput = document.getElementById("adminDay");
  const secondDayField = document.getElementById("adminSecondDayField");
  const secondDayInput = document.getElementById("adminSecondDay");
  const fourPeriodInput = document.getElementById("adminFourPeriod");
  const accountList = document.getElementById("adminAccountList");
  const logoutButton = document.getElementById("adminLogoutBtn");
  const filterCategory = document.getElementById("subjectFilterCategory");
  const filterDay = document.getElementById("subjectFilterDay");
  const filterPeriod = document.getElementById("subjectFilterPeriod");
  const filterSpan = document.getElementById("subjectFilterSpan");
  let allSubjects = [];
  let editingSubjectId = "";

  logoutButton?.addEventListener("click", async () => {
    try {
      await logoutUser();
      window.location.replace("./index.html");
    } catch (error) {
      console.error(error);
      showStatus("ログアウトに失敗しました。");
    }
  });

  for (let period = 1; period <= 12; period += 1) {
    periodInput.add(new Option(`${period}限`, String(period)));
    filterPeriod.add(new Option(`${period}限`, String(period)));
  }

  function updateFourPeriodFields() {
    const isFourPeriod = fourPeriodInput.checked;
    secondDayField.hidden = !isFourPeriod;
    const doublePeriodInput = document.getElementById("adminDoublePeriod");
    doublePeriodInput.disabled = isFourPeriod;
    if (isFourPeriod) {
      doublePeriodInput.checked = false;
    }
    if (!isFourPeriod) {
      secondDayInput.value = "月";
    }
  }

  fourPeriodInput.addEventListener("change", updateFourPeriodFields);
  updateFourPeriodFields();

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
    allSubjects = snapshot.docs
      .map((item) => ({ id: item.id, ...item.data() }))
      .sort((left, right) => `${left.day}${left.period}${left.name}`.localeCompare(`${right.day}${right.period}${right.name}`, "ja"));

    renderSubjects();
  }

  function matchesSubjectFilter(subject) {
    const subjectSpan = subject.isFourPeriod ? "four" : (subject.isDoublePeriod ? "double" : "single");
    const subjectPeriods = subject.isFourPeriod || subject.isDoublePeriod
      ? [Number(subject.period), Number(subject.period) % 2 === 1 ? Number(subject.period) + 1 : Number(subject.period) - 1]
      : [Number(subject.period)];
    return (filterCategory.value === "all" || (subject.category || "その他") === filterCategory.value)
      && (filterDay.value === "all" || subject.day === filterDay.value || (subject.isFourPeriod && subject.secondDay === filterDay.value))
      && (filterPeriod.value === "all" || subjectPeriods.includes(Number(filterPeriod.value)))
      && (filterSpan.value === "all" || subjectSpan === filterSpan.value);
  }

  function renderSubjects() {
    const subjects = allSubjects.filter(matchesSubjectFilter);

    list.innerHTML = "";
    if (!subjects.length) {
      list.textContent = "授業マスタはまだありません。";
      return;
    }

    subjects.forEach((subject) => {
      const row = document.createElement("div");
      row.className = "subject-row";
      const details = document.createElement("div");
      const days = subject.isFourPeriod ? `${subject.day}・${subject.secondDay}` : subject.day;
      const span = subject.isFourPeriod ? "（4コマ）" : (subject.isDoublePeriod ? "（2コマ）" : "");
      details.innerHTML = `<strong>${subject.name}</strong><div class="subject-meta">${subject.category || "その他"} / ${days} ${subject.period}限${span} / ${subject.teacher} / ${subject.room}</div>`;
      const actionWrap = document.createElement("div");
      actionWrap.style.display = "flex";
      actionWrap.style.gap = "8px";
      const editButton = document.createElement("button");
      editButton.className = "edit-btn";
      editButton.type = "button";
      editButton.textContent = "編集";
      editButton.addEventListener("click", () => {
        editingSubjectId = subject.id;
        document.getElementById("adminSubjectName").value = subject.name || "";
        document.getElementById("adminTeacher").value = subject.teacher || "";
        document.getElementById("adminRoom").value = subject.room || "";
        document.getElementById("adminFloor").value = String(subject.floor || 1);
        dayInput.value = subject.day || "月";
        periodInput.value = String(subject.period || 1);
        document.getElementById("adminCategory").value = subject.category || "その他";
        fourPeriodInput.checked = !!subject.isFourPeriod;
        secondDayInput.value = subject.secondDay || "月";
        document.getElementById("adminDoublePeriod").checked = !!subject.isDoublePeriod;
        updateFourPeriodFields();
        form.querySelector("button[type=submit]").textContent = "授業マスタを更新";
        window.scrollTo({ top: 0, behavior: "smooth" });
      });
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
      actionWrap.append(editButton, deleteButton);
      row.append(details, actionWrap);
      list.appendChild(row);
    });
  }

  [filterCategory, filterDay, filterPeriod, filterSpan].forEach((filter) => {
    filter.addEventListener("change", renderSubjects);
  });

  async function loadAccounts() {
    const snapshot = await db.collection("users").get();
    const accounts = snapshot.docs
      .map((item) => ({ id: item.id, ...item.data() }))
      .sort((left, right) => String(left.userId || left.id).localeCompare(String(right.userId || right.id), "ja"));

    accountList.innerHTML = "";
    if (!accounts.length) {
      accountList.textContent = "アカウントはまだありません。";
      return;
    }

    accounts.forEach((account) => {
      const row = document.createElement("div");
      row.className = "account-row";
      const fields = [
        `${account.userId || "ID未設定"} / ${account.role || "student"}`,
        account.username || "ユーザー名未設定",
        account.email || "メール未設定",
        account.provider || "不明",
      ];
      fields.forEach((value, index) => {
        const element = document.createElement(index === 0 ? "strong" : "div");
        element.className = index === 0 ? "" : "account-meta";
        element.textContent = value;
        row.appendChild(element);
      });

      const resetButton = document.createElement("button");
      resetButton.type = "button";
      resetButton.className = "reset-btn";
      resetButton.textContent = "再設定メール";
      resetButton.disabled = !account.email;
      resetButton.addEventListener("click", async () => {
        try {
          await sendUserPasswordReset(account.email);
          showStatus(`${account.email} に再設定メールを送信しました。`);
        } catch (error) {
          console.error(error);
          showStatus("再設定メールの送信に失敗しました。");
        }
      });
      row.appendChild(resetButton);
      accountList.appendChild(row);
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
    await loadAccounts();
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const name = document.getElementById("adminSubjectName").value.trim();
    const teacher = document.getElementById("adminTeacher").value.trim();
    const room = document.getElementById("adminRoom").value.trim();
    const floor = Number(document.getElementById("adminFloor").value || 0);
    const day = dayInput.value;
    const period = Number(periodInput.value);
    const category = document.getElementById("adminCategory").value;
    const isDoublePeriod = document.getElementById("adminDoublePeriod").checked;
    const isFourPeriod = fourPeriodInput.checked;
    const secondDay = secondDayInput.value;

    if (isFourPeriod && day === secondDay) {
      showStatus("4コマ授業の曜日は別々に選択してください。");
      return;
    }

    try {
      const targetId = editingSubjectId || subjectId(name, day, period);
      await db.collection("subjects").doc(targetId).set({
        name,
        teacher,
        room,
        floor,
        day,
        period,
        category,
        isDoublePeriod,
        isFourPeriod,
        secondDay: isFourPeriod ? secondDay : "",
        updatedAt: new Date(),
      }, { merge: true });
      form.reset();
      periodInput.value = "1";
      editingSubjectId = "";
      updateFourPeriodFields();
      form.querySelector("button[type=submit]").textContent = "授業マスタに追加";
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