(function () {
  const { auth, db, storage, storageApi } = window.studyhubFirebase || {};
  const classSelect = document.getElementById("classSelect");
  const fileInput = document.getElementById("fileInput");
  const form = document.getElementById("filesForm");
  const list = document.getElementById("fileList");
  const status = document.getElementById("filesStatus");
  const requestedSubjectId = new URLSearchParams(window.location.search).get("subjectId") || "";
  let classes = [];

  function getUser() {
    return auth?.currentUser || null;
  }

  function showStatus(message) {
    status.textContent = message;
  }

  function classLabel(item) {
    return `${item.name || "授業"} / ${item.day || "-"}${item.period || "-"}限`;
  }

  async function loadClasses(user) {
    const snapshot = await db.collection("classes").where("ownerUid", "==", user.uid).get();
    classes = snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
    const subjectIds = new Set(classes.map((item) => item.subjectId).filter(Boolean));
    for (const subjectId of subjectIds) {
      await db.collection("classMembers").doc(`${subjectId}_${user.uid}`).set({
        subjectId,
        uid: user.uid,
        updatedAt: new Date(),
      }, { merge: true });
    }
    classSelect.innerHTML = "";
    const uniqueClasses = new Map();
    classes.forEach((item) => {
      const subjectId = item.subjectId || item.id;
      if (!uniqueClasses.has(subjectId)) uniqueClasses.set(subjectId, { ...item, id: subjectId });
    });
    classes = [...uniqueClasses.values()];
    classes.forEach((item) => classSelect.add(new Option(classLabel(item), item.id)));
    if (!classes.length) {
      showStatus("時間割に登録された授業がありません。");
      return;
    }
    if (requestedSubjectId && classes.some((item) => item.id === requestedSubjectId)) {
      classSelect.value = requestedSubjectId;
    }
    await loadFiles();
  }

  async function loadFiles() {
    const subjectId = classSelect.value;
    list.innerHTML = "";
    if (!subjectId) return;
    const snapshot = await db.collection(`subjects/${subjectId}/files`).get();
    if (!snapshot.docs.length) {
      list.textContent = "この授業の資料はまだありません。";
      return;
    }
    snapshot.docs.forEach((item) => {
      const data = item.data();
      const row = document.createElement("div");
      row.className = "file-row";
      const info = document.createElement("div");
      info.innerHTML = `<strong>${data.name || item.id}</strong><div class="file-meta">${Math.ceil(Number(data.size || 0) / 1024)}KB / ${data.contentType || "不明"}</div>`;
      const actions = document.createElement("div");
      actions.className = "file-actions";
      const download = document.createElement("a");
      download.href = data.downloadUrl || "#";
      download.target = "_blank";
      download.rel = "noopener";
      download.textContent = "開く";
      const remove = document.createElement("button");
      remove.type = "button";
      remove.textContent = "削除";
      remove.addEventListener("click", async () => {
        await storageApi.deleteObject(storageApi.ref(storage, data.storagePath));
        await db.collection(`subjects/${subjectId}/files`).doc(item.id).delete();
        await loadFiles();
      });
      actions.append(download, remove);
      row.append(info, actions);
      list.appendChild(row);
    });
  }

  classSelect.addEventListener("change", loadFiles);
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const user = getUser();
    const file = fileInput.files?.[0];
    const subjectId = classSelect.value;
    if (!user || !file || !subjectId) return;
    try {
      const fileId = `${Date.now()}_${file.name}`.replace(/[^a-zA-Z0-9._-]/g, "_");
      const storagePath = `subjects/${subjectId}/files/${fileId}`;
      const storageRef = storageApi.ref(storage, storagePath);
      await storageApi.uploadBytes(storageRef, file, { contentType: file.type || "application/octet-stream" });
      const downloadUrl = await storageApi.getDownloadURL(storageRef);
      await db.collection(`subjects/${subjectId}/files`).doc(fileId).set({
        subjectId,
        name: file.name,
        storagePath,
        downloadUrl,
        size: file.size,
        contentType: file.type || "application/octet-stream",
        uploadedBy: user.uid,
        createdAt: new Date(),
      });
      fileInput.value = "";
      showStatus("資料をアップロードしました。");
      await loadFiles();
    } catch (error) {
      console.error(error);
      showStatus(error.code === "storage/unauthorized" ? "この授業の資料を操作する権限がありません。" : "アップロードに失敗しました。");
    }
  });

  (async () => {
    const user = window.studyhubFirebase?.authReady ? await window.studyhubFirebase.authReady : getUser();
    if (!user) {
      window.location.replace("./index.html");
      return;
    }
    await loadClasses(user);
  })().catch((error) => {
    console.error(error);
    showStatus("資料画面の読み込みに失敗しました。");
  });
})();
