(function () {
  const { auth, db } = window.studyhubFirebase || {};
  if (!auth || !db) return;

  const form = document.getElementById("classForm");
  const title = document.getElementById("classTitle");
  const backBtn = document.getElementById("backBtn");
  const deleteBtn = document.getElementById("deleteBtn");
  const roomValue = document.getElementById("roomValue");
  const floorValue = document.getElementById("floorValue");

  const params = new URLSearchParams(window.location.search);
  const editingId = params.get("classId") || "";
  const day = params.get("day") || "月";
  const period = Number(params.get("period") || 1);

  function syncSummary(data = {}) {
    const roomText = data.room || "未設定";
    const floorText = data.floor ? `${data.floor}階` : "-";

    if (roomValue) roomValue.textContent = roomText;
    if (floorValue) floorValue.textContent = floorText;
  }

  function setFormValues(data = {}) {
    document.getElementById("className").value = data.name || "";
    document.getElementById("teacher").value = data.teacher || "";
    document.getElementById("room").value = data.room || "";
    document.getElementById("floor").value = data.floor || "";
    syncSummary(data);
  }

  async function resolveTargetDocId() {
    if (editingId) return editingId;

    const currentUser = auth.currentUser;
    if (!currentUser) return "";

    const snapshot = await db.collection("classes")
      .where("ownerUid", "==", currentUser.uid)
      .where("day", "==", day)
      .where("period", "==", Number(period))
      .get();

    if (!snapshot.empty) {
      return snapshot.docs[0].id;
    }

    return `${currentUser.uid}_${day}_${period}`;
  }

  async function loadClass() {
    if (!editingId) {
      const currentUser = auth.currentUser;

      if (currentUser) {
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

      title.textContent = "授業登録";
      setFormValues();
      return;
    }

    const snap = await db.collection("classes").doc(editingId).get();

    if (snap.exists) {
      const data = snap.data();
      title.textContent = data.name || "授業詳細";
      setFormValues(data);
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

      await db.collection("classes").doc(targetId).delete();
      window.location.href = "./home.html";
    });
  }

  if (form) {
    form.addEventListener("submit", async (event) => {
      event.preventDefault();

      const currentUser = auth.currentUser;
      if (!currentUser) {
        window.location.href = "./index.html";
        return;
      }

      const titleValue = document.getElementById("className").value.trim();
      if (!titleValue) {
        alert("授業名を入力してください");
        return;
      }

      const targetId = await resolveTargetDocId();
      if (!targetId) {
        alert("保存先を特定できませんでした");
        return;
      }

      const existingSnap = await db.collection("classes").doc(targetId).get();
      const existingData = existingSnap.exists ? existingSnap.data() : {};

      const payload = {
        ownerUid: currentUser.uid,
        name: titleValue,
        teacher: document.getElementById("teacher").value.trim(),
        room: document.getElementById("room").value.trim(),
        floor: Number(document.getElementById("floor").value || 0),
        day,
        period: Number(period),
        createdAt: existingData.createdAt || new Date(),
        updatedAt: new Date(),
      };

      await db.collection("classes").doc(targetId).set(payload, { merge: true });
      window.location.href = "./home.html";
    });
  }

  loadClass();
})();
