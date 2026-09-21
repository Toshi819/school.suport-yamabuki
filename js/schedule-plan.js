(function () {
  const dayNames = ["月", "火", "水", "木", "金"];
  const periods = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
  const grid = document.getElementById("scheduleGrid");
  const mobileGrid = document.getElementById("mobileScheduleGrid");
  const form = document.getElementById("scheduleForm");
  const status = document.getElementById("status");
  const mobilePickerBackdrop = document.getElementById("mobilePickerBackdrop");
  const mobilePickerTitle = document.getElementById("mobilePickerTitle");
  const mobilePickerOptions = document.getElementById("mobilePickerOptions");
  const mobilePickerClear = document.getElementById("mobilePickerClear");
  const mobilePickerClose = document.getElementById("mobilePickerClose");
  const auth = window.studyhubFirebase?.auth;
  const db = window.studyhubFirebase?.db;
  const getCurrentUser = window.studyhubAuth?.getCurrentUser;
  let subjectCatalog = [];
  let activeMobileSlot = null;

  function getUser() {
    return auth?.currentUser || getCurrentUser?.();
  }

  function getPairedPeriod(period) {
    const numericPeriod = Number(period);
    return numericPeriod % 2 === 1 ? numericPeriod + 1 : numericPeriod - 1;
  }

  function isAvailableAt(subject, period) {
    const numericPeriod = Number(period);
    return Number(subject.period) === numericPeriod
      || (subject.isDoublePeriod && getPairedPeriod(subject.period) === numericPeriod);
  }

  function selectSubjectAtSlot(day, period, subjectId) {
    const select = getSelect(day, period);
    if (select) select.value = subjectId;
    const subject = subjectCatalog.find((item) => item.id === subjectId);
    if (subject?.isDoublePeriod) {
      const pairedSelect = getSelect(day, getPairedPeriod(period));
      if (pairedSelect) pairedSelect.value = subjectId;
    }
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
          .filter((subject) => subject.day === day && isAvailableAt(subject, period))
          .forEach((subject) => select.add(new Option(`${subject.name}（${subject.teacher}）`, subject.id)));
        select.addEventListener("change", () => {
          if (select.value) selectSubjectAtSlot(day, period, select.value);
          renderMobileGrid();
        });
        wrapper.appendChild(select);
        grid.appendChild(wrapper);
      });
    });

    renderMobileGrid();
  }

  function getSelect(day, period) {
    return form.elements.namedItem(`${day}_${period}`);
  }

  function renderMobileGrid() {
    if (!mobileGrid) return;
    mobileGrid.innerHTML = "";
    mobileGrid.appendChild(Object.assign(document.createElement("div"), { className: "mobile-cell header" }));
    dayNames.forEach((day) => {
      mobileGrid.appendChild(Object.assign(document.createElement("div"), { className: "mobile-cell header", textContent: day }));
    });

    periods.forEach((period) => {
      mobileGrid.appendChild(Object.assign(document.createElement("div"), { className: "mobile-cell period", textContent: `${period}限` }));
      dayNames.forEach((day) => {
        const cell = document.createElement("div");
        const select = getSelect(day, period);
        const selectedSubject = subjectCatalog.find((subject) => subject.id === select?.value);
        cell.className = `mobile-cell ${selectedSubject ? "filled" : ""}`;
        if (selectedSubject) {
          cell.innerHTML = `<span class="subject">${selectedSubject.name}</span><span class="room">${selectedSubject.room || ""}</span>`;
        } else {
          const addButton = document.createElement("button");
          addButton.className = "add-slot";
          addButton.type = "button";
          addButton.textContent = "+";
          addButton.setAttribute("aria-label", `${day}${period}限の授業を選択`);
          addButton.addEventListener("click", () => openMobilePicker(day, period));
          cell.appendChild(addButton);
        }
        cell.addEventListener("click", () => {
          if (selectedSubject) openMobilePicker(day, period);
        });
        mobileGrid.appendChild(cell);
      });
    });
  }

  function closeMobilePicker() {
    activeMobileSlot = null;
    if (mobilePickerBackdrop) {
      mobilePickerBackdrop.classList.remove("open");
      mobilePickerBackdrop.hidden = true;
    }
  }

  function openMobilePicker(day, period) {
    activeMobileSlot = { day, period };
    const choices = subjectCatalog.filter((subject) => subject.day === day && isAvailableAt(subject, period));
    mobilePickerTitle.textContent = `${day}${period}限の授業を選択`;
    mobilePickerOptions.innerHTML = "";
    choices.forEach((subject) => {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = `${subject.name}（${subject.teacher} / ${subject.room}）`;
      button.addEventListener("click", () => {
        selectSubjectAtSlot(day, period, subject.id);
        closeMobilePicker();
        renderMobileGrid();
      });
      mobilePickerOptions.appendChild(button);
    });
    if (!choices.length) {
      mobilePickerOptions.textContent = "この曜日・時限に選択できる授業はありません。";
    }
    mobilePickerBackdrop.hidden = false;
    mobilePickerBackdrop.classList.add("open");
  }

  mobilePickerClear?.addEventListener("click", () => {
    if (activeMobileSlot) {
      const currentSelect = getSelect(activeMobileSlot.day, activeMobileSlot.period);
      const currentSubject = subjectCatalog.find((subject) => subject.id === currentSelect?.value);
      currentSelect.value = "";
      if (currentSubject?.isDoublePeriod) {
        getSelect(activeMobileSlot.day, getPairedPeriod(activeMobileSlot.period)).value = "";
      }
      closeMobilePicker();
      renderMobileGrid();
    }
  });
  mobilePickerClose?.addEventListener("click", closeMobilePicker);
  mobilePickerBackdrop?.addEventListener("click", (event) => {
    if (event.target === mobilePickerBackdrop) closeMobilePicker();
  });

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
      const existingSnapshot = await db.collection("classes")
        .where("ownerUid", "==", currentUser.uid)
        .get();
      const selectedClassIds = new Set();

      for (const day of dayNames) {
        for (const period of periods) {
          const select = form.elements.namedItem(`${day}_${period}`);
          const subject = subjectCatalog.find((item) => item.id === select?.value);
          if (subject) {
            const slots = subject.isDoublePeriod
              ? [Number(subject.period), getPairedPeriod(subject.period)]
              : [period];
            for (const slot of slots) {
              selectedClassIds.add(`${currentUser.uid}_${day}_${slot}`);
              await persistScheduleEntry(subject, currentUser, day, slot);
            }
          }
        }
      }

      for (const existingClass of existingSnapshot.docs) {
        if (!selectedClassIds.has(existingClass.id)) {
          await db.collection("classes").doc(existingClass.id).delete();
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
