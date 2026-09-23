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
  const reportList = document.getElementById("adminReportList");
  const logoutButton = document.getElementById("adminLogoutBtn");
  const filterCategory = document.getElementById("subjectFilterCategory");
  const filterDay = document.getElementById("subjectFilterDay");
  const filterPeriod = document.getElementById("subjectFilterPeriod");
  const filterSpan = document.getElementById("subjectFilterSpan");
  let allSubjects = [];
  let editingSubjectId = "";

  document.querySelectorAll("[data-admin-panel]").forEach((tab) => {
    tab.addEventListener("click", () => {
      const panelName = tab.dataset.adminPanel;
      document.querySelectorAll(".admin-tab").forEach((item) => item.classList.toggle("active", item === tab));
      document.getElementById("adminSubjectsPanel").hidden = panelName !== "subjects";
      document.getElementById("adminUsersPanel").hidden = panelName !== "users";
      document.getElementById("adminReportsPanel").hidden = panelName !== "reports";
    });
  });

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

  function formatBytes(bytes) {
    const value = Number(bytes || 0);
    if (value < 1024) return `${value} B`;
    if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
    if (value < 1024 * 1024 * 1024) return `${(value / (1024 * 1024)).toFixed(1)} MB`;
    return `${(value / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  }

  const storageLimitOptions = [
    [50 * 1024 * 1024, "50 MB"],
    [100 * 1024 * 1024, "100 MB"],
    [500 * 1024 * 1024, "500 MB"],
    [1024 * 1024 * 1024, "1 GB"],
  ];

  function storageMarkup(account) {
    const used = Number(account.storageUsedBytes || 0);
    const limit = Number(account.storageLimitBytes || 0);
    const percentage = limit > 0 ? Math.min(100, (used / limit) * 100) : 0;
    const level = percentage >= 90 ? "danger" : (percentage >= 70 ? "warning" : "");
    return `<div class="storage-meta"><strong>${formatBytes(used)} / ${formatBytes(limit)}</strong><div class="account-meta">使用率 ${percentage.toFixed(1)}%</div><div class="storage-bar ${level}" aria-label="使用率 ${percentage.toFixed(1)}%"><span style="width:${percentage}%"></span></div></div>`;
  }

  function verificationElement(account) {
    const container = document.createElement("div");
    container.className = "verification-meta";
    const statusLabels = { verified: "確認済み", submitted: "確認申請中", unverified: "未確認" };
    const status = document.createElement("strong");
    status.textContent = `状態: ${statusLabels[account.verificationStatus] || "未確認"}`;
    const email = document.createElement("div");
    email.className = "account-meta";
    email.textContent = `学校メール: ${account.schoolEmail || "未登録"}`;
    const name = document.createElement("div");
    name.className = "account-meta";
    name.textContent = `氏名: ${account.fullName || "未登録"}`;
    const studentNumber = document.createElement("div");
    studentNumber.className = "account-meta";
    studentNumber.textContent = `学籍番号: ${account.studentNumber || "未登録"}`;
    container.append(status, email, name, studentNumber);
    return container;
  }

  async function loadUploadedBytesByUser() {
    const totals = new Map();
    const subjects = await db.collection("subjects").get();
    await Promise.all(subjects.docs.map(async (subject) => {
      const rootFiles = await db.collection(`subjects/${subject.id}/files`).get();
      const folders = await db.collection(`subjects/${subject.id}/folders`).get();
      const folderFiles = await Promise.all(folders.docs.map((folder) => db.collection(`subjects/${subject.id}/folders/${folder.id}/files`).get()));
      const fileSnapshots = [rootFiles, ...folderFiles];
      fileSnapshots.forEach((snapshot) => snapshot.docs.forEach((file) => {
        const data = file.data();
        if (!data.uploadedBy) return;
        totals.set(data.uploadedBy, (totals.get(data.uploadedBy) || 0) + Number(data.size || 0));
      }));
    }));
    return totals;
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
    const uploadedBytesByUser = await loadUploadedBytesByUser();
    const accounts = snapshot.docs
      .map((item) => ({ id: item.id, ...item.data(), storageUsedBytes: uploadedBytesByUser.has(item.id) ? uploadedBytesByUser.get(item.id) : Number(item.data().storageUsedBytes || 0) }))
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
      row.appendChild(verificationElement(account));
      row.insertAdjacentHTML("beforeend", storageMarkup(account));
      const actions = document.createElement("div");
      actions.className = "account-actions";
      const limitSelect = document.createElement("select");
      limitSelect.className = "limit-select";
      limitSelect.setAttribute("aria-label", `${account.username || account.userId || "アカウント"}の保存容量上限`);
      storageLimitOptions.forEach(([bytes, label]) => limitSelect.add(new Option(label, String(bytes))));
      const currentLimit = Number(account.storageLimitBytes || 50 * 1024 * 1024);
      if (!storageLimitOptions.some(([bytes]) => bytes === currentLimit)) limitSelect.add(new Option(formatBytes(currentLimit), String(currentLimit)));
      limitSelect.value = String(currentLimit);
      limitSelect.addEventListener("change", async () => {
        try {
          await db.collection("users").doc(account.id).set({ storageLimitBytes: Number(limitSelect.value) }, { merge: true });
          showStatus(`${account.username || account.userId} の保存容量上限を変更しました。`);
        } catch (error) {
          console.error(error);
          showStatus("保存容量上限の変更に失敗しました。");
        }
      });
      actions.appendChild(limitSelect);

      const resetButton = document.createElement("button");
      resetButton.type = "button";
      resetButton.className = "reset-btn";
      resetButton.textContent = "再設定メール";
      resetButton.disabled = account.provider === "google.com" || !(account.schoolEmail || account.email);
      resetButton.addEventListener("click", async () => {
        try {
          const targetEmail = account.schoolEmail || account.email;
          await sendUserPasswordReset(targetEmail);
          showStatus(`${targetEmail} に再設定メールを送信しました。`);
        } catch (error) {
          console.error(error);
          showStatus("再設定メールの送信に失敗しました。");
        }
      });
      actions.appendChild(resetButton);
      const deleteButton = document.createElement("button");
      deleteButton.type = "button";
      deleteButton.className = "account-delete-btn";
      deleteButton.textContent = "アプリデータ削除";
      deleteButton.addEventListener("click", () => deleteAccountData(account));
      actions.appendChild(deleteButton);
      row.appendChild(actions);
      accountList.appendChild(row);
    });
  }

  async function deleteAccountData(account) {
    if (!window.confirm(`${account.username || account.userId || "このアカウント"}のStudyHubデータを削除しますか？Firebase Authenticationのログイン情報は残ります。`)) return;
    try {
      const [classes, cards, memos] = await Promise.all([
        db.collection("classes").where("ownerUid", "==", account.id).get(),
        db.collection("classCards").where("ownerUid", "==", account.id).get(),
        db.collection("classMemos").where("ownerUid", "==", account.id).get(),
      ]);
      await Promise.all([
        ...classes.docs.map((item) => db.collection("classes").doc(item.id).delete()),
        ...cards.docs.map((item) => db.collection("classCards").doc(item.id).delete()),
        ...memos.docs.map((item) => db.collection("classMemos").doc(item.id).delete()),
        db.collection("users").doc(account.id).delete(),
      ]);
      showStatus("StudyHubのアカウントデータを削除しました。Firebase Authenticationは別途削除が必要です。");
      await loadAccounts();
    } catch (error) {
      console.error(error);
      showStatus("アカウントデータの削除に失敗しました。ルール公開状態を確認してください。");
    }
  }

  async function loadReports() {
    const snapshot = await db.collection("reports").get();
    const reports = snapshot.docs.map((item) => ({ id: item.id, ...item.data() }))
      .sort((left, right) => Number(right.createdAt?.seconds || 0) - Number(left.createdAt?.seconds || 0));
    reportList.innerHTML = "";
    if (!reports.length) {
      reportList.textContent = "問題報告はありません。";
      return;
    }
    reports.forEach((report) => {
      const row = document.createElement("div");
      row.className = "subject-row";
      const details = document.createElement("div");
      details.innerHTML = `<strong>${report.title || "件名なし"}</strong><div class="subject-meta">${report.category || "その他"} / ${report.reporterEmail || report.ownerUid || "ユーザー不明"}<br>${report.message || ""}</div>`;
      const state = document.createElement("select");
      ["未対応", "対応中", "解決済み"].forEach((value) => state.add(new Option(value, value)));
      state.value = report.status || "未対応";
      state.addEventListener("change", async () => {
        await db.collection("reports").doc(report.id).set({ status: state.value, updatedAt: new Date() }, { merge: true });
        showStatus("問題報告の状態を更新しました。");
      });
      row.append(details, state);
      reportList.appendChild(row);
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
    await loadReports();
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