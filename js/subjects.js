(function () {
  const { db } = window.studyhubFirebase || {};
  const { importSubjectsFromCsv, getLocalSubjects, upsertLocalSubject } = window.studyhubAuth || {};

  const csvInput = document.getElementById("subjectCsv");
  const importBtn = document.getElementById("importSubjectsBtn");
  const addSubjectBtn = document.getElementById("addSubjectBtn");
  const subjectNameInput = document.getElementById("subjectName");
  const teacherInput = document.getElementById("teacherInput");
  const roomInput = document.getElementById("roomInput");
  const floorInput = document.getElementById("floorInput");
  const dayInput = document.getElementById("dayInput");
  const periodInput = document.getElementById("periodInput");
  const status = document.getElementById("importStatus") || document.getElementById("status");
  const subjectList = document.getElementById("subjectList");

  function parseCsv(text) {
    const rows = [];
    const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);

    lines.forEach((line) => {
      const cells = line.split(',').map((cell) => cell.trim());
      if (cells.length < 6) return;

      const [name, teacher, room, floor, day, period] = cells;
      rows.push({
        name,
        teacher,
        room,
        floor: Number(floor || 0),
        day,
        period: Number(period || 0),
      });
    });

    return rows;
  }

  async function renderSubjects() {
    if (!subjectList) return;
    subjectList.innerHTML = "";

    if (db) {
      const snapshot = await db.collection("subjects").orderBy("name").get();
      if (snapshot.empty) {
        subjectList.innerHTML = '<div class="subject-item">まだ授業がありません。</div>';
        return;
      }

      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const item = document.createElement("div");
        item.className = "subject-item";
        item.textContent = `${data.name || docSnap.id} / ${data.teacher || "先生未設定"} / ${data.room || "教室未設定"} / ${data.day || "-"} ${data.period || "-"}限`;
        subjectList.appendChild(item);
      });
      return;
    }

    const subjects = getLocalSubjects ? getLocalSubjects() : {};
    const entries = Object.values(subjects || {}).filter((item) => item && item.name);

    if (!entries.length) {
      subjectList.innerHTML = '<div class="subject-item">まだ授業がありません。</div>';
      return;
    }

    entries.forEach((data) => {
      const item = document.createElement("div");
      item.className = "subject-item";
      item.textContent = `${data.name} / ${data.teacher || "先生未設定"} / ${data.room || "教室未設定"} / ${data.day || "-"} ${data.period || "-"}限`;
      subjectList.appendChild(item);
    });
  }

  if (addSubjectBtn) {
    addSubjectBtn.addEventListener("click", async () => {
      const name = subjectNameInput ? subjectNameInput.value.trim() : "";
      const teacher = teacherInput ? teacherInput.value.trim() : "";
      const room = roomInput ? roomInput.value.trim() : "";
      const floor = Number(floorInput ? floorInput.value || 0 : 0);
      const day = dayInput ? dayInput.value : "月";
      const period = Number(periodInput ? periodInput.value || 1 : 1);

      if (!name) {
        alert("授業名を入力してください");
        return;
      }

      try {
        if (db) {
          await db.collection("subjects").doc(name).set({
            name,
            teacher,
            room,
            floor,
            day,
            period,
            updatedAt: new Date(),
          }, { merge: true });
        } else if (typeof upsertLocalSubject === "function") {
          upsertLocalSubject(name, {
            name,
            teacher,
            room,
            floor,
            day,
            period,
            updatedAt: new Date(),
          });
        }

        if (status) status.textContent = `${name} を授業マスタに追加しました。`;
        if (subjectNameInput) subjectNameInput.value = "";
        if (teacherInput) teacherInput.value = "";
        if (roomInput) roomInput.value = "";
        if (floorInput) floorInput.value = "";
        if (dayInput) dayInput.value = "月";
        if (periodInput) periodInput.value = "1";
        await renderSubjects();
      } catch (error) {
        console.error(error);
        alert("授業の追加に失敗しました");
      }
    });
  }

  if (importBtn) {
    importBtn.addEventListener("click", async () => {
      const text = csvInput ? csvInput.value.trim() : "";
      if (!text) {
        alert("CSV を入力してください");
        return;
      }

      const rows = parseCsv(text);
      if (!rows.length) {
        alert("CSV を読み取れませんでした。列の数を確認してください。");
        return;
      }

      try {
        const count = await importSubjectsFromCsv(rows);
        if (status) {
          status.textContent = `${count} 件の授業を保存しました。`;
        }
        if (csvInput) csvInput.value = "";
        await renderSubjects();
      } catch (error) {
        console.error(error);
        alert("授業の取り込みに失敗しました");
      }
    });
  }

  renderSubjects();
})();
