(function () {
  const { auth, db } = window.studyhubFirebase || {};
  const {
    getCurrentUser,
    getLocalClassesForCurrentUser,
    upsertLocalClass,
    deleteLocalClass,
  } = window.studyhubAuth || {};

  const form = document.getElementById("classForm");
  const title = document.getElementById("classTitle");
  const backBtn = document.getElementById("backBtn");
  const deleteBtn = document.getElementById("deleteBtn");
  const roomValue = document.getElementById("roomValue");
  const floorValue = document.getElementById("floorValue");
  const subjectSelect = document.getElementById("subjectSelect");
  const daySelect = document.getElementById("daySelect");
  const periodSelect = document.getElementById("periodSelect");

  const fallbackSubjectCatalog = [
    { name: "国語", teacher: "田中先生", room: "101", floor: 1 },
    { name: "数学", teacher: "佐藤先生", room: "202", floor: 2 },
    { name: "英語", teacher: "伊藤先生", room: "303", floor: 3 },
    { name: "理科", teacher: "山本先生", room: "404", floor: 4 },
    { name: "社会", teacher: "中村先生", room: "105", floor: 1 },
    { name: "情報", teacher: "松本先生", room: "ラボ1", floor: 2 },
    { name: "保健体育", teacher: "小林先生", room: "体育館", floor: 1 },
    { name: "美術", teacher: "渡辺先生", room: "美術室", floor: 2 },
  ];

  let subjectCatalog = [...fallbackSubjectCatalog];

  const params = new URLSearchParams(window.location.search);
  const editingId = params.get("classId") || "";
  let day = params.get("day") || "月";
  let period = Number(params.get("period") || 1);

  function syncSelectedSlot() {
    if (daySelect) daySelect.value = day;
    if (periodSelect) periodSelect.value = String(period);
  }

  function renderSubjectOptions() {
    if (!subjectSelect) return;

    const currentValue = subjectSelect.value;
    subjectSelect.innerHTML = '<option value="">授業を選択してください</option>';

    subjectCatalog.forEach((subject) => {
      const option = new Option(subject.name, subject.name);
      subjectSelect.add(option);
    });

    if (currentValue) {
      subjectSelect.value = currentValue;
    }
  }

  async function loadSubjectCatalog() {
    if (db) {
      try {
        const snapshot = await db.collection("subjects").orderBy("name").get();
        if (!snapshot.empty) {
          subjectCatalog = snapshot.docs.map((docSnap) => ({
            ...docSnap.data(),
            name: docSnap.data().name || docSnap.id,
          }));
          renderSubjectOptions();
          return;
        }
      } catch (error) {
        console.warn("subjects collection is not available yet, using fallback list.", error);
      }
    }

    const localSubjects = window.studyhubAuth?.getLocalSubjects ? window.studyhubAuth.getLocalSubjects() : {};
    const localList = Object.values(localSubjects || {}).map((subject) => ({
      ...subject,
      name: subject.name || "",
    })).filter((subject) => subject.name);

    subjectCatalog = localList.length ? localList : [...fallbackSubjectCatalog];
    renderSubjectOptions();
  }

  function getSubjectInfo(name = "") {
    const normalized = String(name || "").trim();
    return subjectCatalog.find((subject) => subject.name === normalized) || null;
  }

  function syncSummary(data = {}) {
    const roomText = data.room || "未設定";
    const floorText = Number(data.floor) ? `${Number(data.floor)}階` : "-";

    if (roomValue) roomValue.textContent = roomText;
    if (floorValue) floorValue.textContent = floorText;
  }

  function setFormValues(data = {}) {
    const subjectName = data.name || "";
    const info = getSubjectInfo(subjectName);

    const teacherValue = document.getElementById("teacher");
    const roomValueInput = document.getElementById("room");
    const floorValueInput = document.getElementById("floor");

    const resolvedTeacher = info?.teacher || data.teacher || "";
    const resolvedRoom = info?.room || data.room || "";
    const resolvedFloor = info?.floor || data.floor || "";

    if (subjectSelect) {
      const existingOptions = Array.from(subjectSelect.options).map((option) => option.value);
      if (subjectName && !existingOptions.includes(subjectName)) {
        const option = new Option(subjectName, subjectName);
        subjectSelect.add(option);
      }
      subjectSelect.value = subjectName || "";
    }

    if (daySelect) daySelect.value = day;
    if (periodSelect) periodSelect.value = String(period);

    if (teacherValue) teacherValue.value = resolvedTeacher;
    if (roomValueInput) roomValueInput.value = resolvedRoom;
    if (floorValueInput) floorValueInput.value = resolvedFloor;

    syncSummary({ room: resolvedRoom, floor: resolvedFloor });
  }

  async function resolveTargetDocId() {
    if (editingId) return editingId;

    const currentUser = (auth && auth.currentUser) || getCurrentUser();
    if (!currentUser) return "";

    if (db) {
      const snapshot = await db.collection("classes")
        .where("ownerUid", "==", currentUser.uid)
        .where("day", "==", day)
        .where("period", "==", Number(period))
        .get();

      if (!snapshot.empty) {
        return snapshot.docs[0].id;
      }
    } else if (typeof getLocalClassesForCurrentUser === "function") {
      const localClass = getLocalClassesForCurrentUser(currentUser.uid).find((entry) => entry.day === day && Number(entry.period) === Number(period));
      if (localClass) {
        return localClass.id;
      }
    }

    return `${currentUser.uid}_${day}_${period}`;
  }

  async function loadClass() {
    const currentUser = (auth && auth.currentUser) || getCurrentUser();

    if (!editingId) {
      if (currentUser && db) {
        const snapshot = await db.collection("classes")
          .where("ownerUid", "==", currentUser.uid)
          .where("day", "==", day)
          .where("period", "==", Number(period))
          .get();

        if (!snapshot.empty) {
          const existing = snapshot.docs[0];
          const data = existing.data();
          title.textContent = data.name || "授業詳細";
          setFormValues(data);
          deleteBtn.hidden = false;
          return;
        }
      }

      if (currentUser && !db && typeof getLocalClassesForCurrentUser === "function") {
        const localClass = getLocalClassesForCurrentUser(currentUser.uid).find((entry) => entry.day === day && Number(entry.period) === Number(period));
        if (localClass) {
          title.textContent = localClass.name || "授業詳細";
          setFormValues(localClass);
          deleteBtn.hidden = false;
          return;
        }
      }

      title.textContent = "授業登録";
      setFormValues();
      return;
    }

    if (db) {
      const snap = await db.collection("classes").doc(editingId).get();
      if (snap.exists) {
        const data = snap.data();
        title.textContent = data.name || "授業詳細";
        setFormValues(data);
        deleteBtn.hidden = false;
      }
      return;
    }

    const localClass = getLocalClassesForCurrentUser ? getLocalClassesForCurrentUser(currentUser?.uid || "").find((entry) => entry.id === editingId) : null;
    if (localClass) {
      title.textContent = localClass.name || "授業詳細";
      setFormValues(localClass);
      deleteBtn.hidden = false;
    }
  }

  if (backBtn) {
    backBtn.addEventListener("click", () => {
      window.location.href = "./home.html";
    });
  }

  if (deleteBtn) {
    deleteBtn.addEventListener("click", async () => {
      const targetId = editingId || (await resolveTargetDocId());
      if (!targetId) return;

      const ok = window.confirm("この授業を時間割から削除しますか？");
      if (!ok) return;

      if (db) {
        await db.collection("classes").doc(targetId).delete();
      } else if (typeof deleteLocalClass === "function") {
        deleteLocalClass(targetId);
      }
      window.location.href = "./home.html";
    });
  }

  if (daySelect) {
    daySelect.addEventListener("change", () => {
      day = daySelect.value || "月";
      syncSelectedSlot();
    });
  }

  if (periodSelect) {
    periodSelect.addEventListener("change", () => {
      period = Number(periodSelect.value || 1);
      syncSelectedSlot();
    });
  }

  if (form) {
    form.addEventListener("submit", async (event) => {
      event.preventDefault();

      const currentUser = (auth && auth.currentUser) || getCurrentUser();
      if (!currentUser) {
        window.location.href = "./index.html";
        return;
      }

      const selectedDay = daySelect ? daySelect.value : day;
      const selectedPeriod = periodSelect ? Number(periodSelect.value || period) : period;
      const titleValue = (subjectSelect && subjectSelect.value || "").trim();
      if (!titleValue) {
        alert("授業を選択してください");
        return;
      }

      const targetId = `${currentUser.uid}_${selectedDay}_${selectedPeriod}`;

      const selectedSubject = getSubjectInfo(titleValue) || {
        name: titleValue,
        teacher: document.getElementById("teacher").value.trim(),
        room: document.getElementById("room").value.trim(),
        floor: Number(document.getElementById("floor").value || 0),
      };

      const payload = {
        ownerUid: currentUser.uid,
        name: titleValue,
        teacher: selectedSubject.teacher || "",
        room: selectedSubject.room || "",
        floor: Number(selectedSubject.floor || 0),
        day: selectedDay,
        period: Number(selectedPeriod),
        updatedAt: new Date(),
      };

      if (db) {
        const existingSnap = await db.collection("classes").doc(targetId).get();
        const existingData = existingSnap.exists ? existingSnap.data() : {};
        payload.createdAt = existingData.createdAt || new Date();
        await db.collection("classes").doc(targetId).set(payload, { merge: true });
      } else if (typeof upsertLocalClass === "function") {
        const existingData = getLocalClassesForCurrentUser ? getLocalClassesForCurrentUser(currentUser.uid).find((entry) => entry.day === selectedDay && Number(entry.period) === Number(selectedPeriod)) : null;
        payload.createdAt = existingData?.createdAt || new Date();
        upsertLocalClass(targetId, payload);
      }

      window.location.href = "./home.html";
    });
  }

  syncSelectedSlot();

  (async function init() {
    await loadSubjectCatalog();
    await loadClass();
  })();
})();
