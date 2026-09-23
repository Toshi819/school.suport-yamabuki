(function () {
  const { auth, db, storage, storageApi } = window.studyhubFirebase || {};
  const classSelect = document.getElementById("classSelect");
  const classFolderList = document.getElementById("classFolderList");
  const folderSelect = document.getElementById("folderSelect");
  const createFolderButton = document.getElementById("createFolderButton");
  const fileInput = document.getElementById("fileInput");
  const form = document.getElementById("filesForm");
  const list = document.getElementById("fileList");
  const status = document.getElementById("filesStatus");
  const requestedSubjectId = new URLSearchParams(window.location.search).get("subjectId") || "";
  const requestedClassId = new URLSearchParams(window.location.search).get("classId") || "";
  const fromClassMenu = new URLSearchParams(window.location.search).get("from") === "class-menu";
  let classes = [];
  let folders = [];
  const fileViewerModal = document.getElementById("fileViewerModal");
  const fileViewerContent = document.getElementById("fileViewerContent");
  const fileViewerClose = document.getElementById("fileViewerClose");
  const fileViewerToolbar = document.getElementById("fileViewerToolbar");
  const fileViewerZoomIn = document.getElementById("fileViewerZoomIn");
  const fileViewerZoomOut = document.getElementById("fileViewerZoomOut");
  const fileViewerZoomReset = document.getElementById("fileViewerZoomReset");
  const uploadSummary = document.getElementById("uploadSummary");
  const selectedClassChip = document.getElementById("selectedClassChip");
  const selectedFolderChip = document.getElementById("selectedFolderChip");
  let currentViewerZoom = 1;
  let currentViewerMedia = null;

  if (fromClassMenu) {
    classFolderList.hidden = true;
    const classField = classSelect.closest("label");
    if (classField) classField.hidden = true;
    showStatus("授業資料を読み込んでいます。");
  }

  function getUser() {
    return auth?.currentUser || null;
  }

  function showStatus(message) {
    status.textContent = message;
  }

  function refreshUploadSummary() {
    const selectedClass = classes.find((item) => item.id === classSelect.value);
    const selectedFolder = folders.find((folder) => folder.id === (folderSelect.value || "root"));
    const className = selectedClass ? classLabel(selectedClass) : "なし";
    const folderName = selectedFolder ? (selectedFolder.name || selectedFolder.id) : "ルート";
    selectedClassChip.textContent = `授業: ${className}`;
    selectedFolderChip.textContent = `フォルダー: ${folderName}`;
    uploadSummary.textContent = selectedClass ? className : "授業未選択";
  }

  async function updateStorageUsage(uid, deltaBytes) {
    if (!uid || !deltaBytes) return;
    const userRef = db.collection("users").doc(uid);
    const snapshot = await userRef.get();
    if (!snapshot.exists) return;
    const current = Number(snapshot.data().storageUsedBytes || 0);
    await userRef.set({ storageUsedBytes: Math.max(0, current + Number(deltaBytes)) }, { merge: true });
  }

  async function canUploadFiles(user, files) {
    const profile = await db.collection("users").doc(user.uid).get();
    const data = profile.exists ? profile.data() : {};
    const used = Number(data.storageUsedBytes || 0);
    const limit = Number(data.storageLimitBytes || 50 * 1024 * 1024);
    const totalSize = files.reduce((sum, file) => sum + Number(file.size || 0), 0);
    return { allowed: used + totalSize <= limit, used, limit, totalSize };
  }

  function classLabel(item) {
    return `${item.name || "授業"} / ${item.day || "-"}${item.period || "-"}限`;
  }

  async function loadClasses(user) {
    const snapshot = await db.collection("classes").where("ownerUid", "==", user.uid).get();
    classes = snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
    const subjectIds = new Set(classes.map((item) => item.subjectId).filter(Boolean));
    for (const subjectId of subjectIds) {
      try {
        await db.collection("classMembers").doc(`${subjectId}_${user.uid}`).set({
          subjectId,
          uid: user.uid,
          updatedAt: new Date(),
        }, { merge: true });
      } catch (error) {
        console.warn("Class membership sync failed:", error);
      }
    }
    classSelect.innerHTML = "";
    const uniqueClasses = new Map();
    classes.forEach((item) => {
      const subjectId = item.subjectId || item.id;
      if (!uniqueClasses.has(subjectId)) uniqueClasses.set(subjectId, { ...item, id: subjectId });
    });
    classes = [...uniqueClasses.values()];
    classFolderList.innerHTML = "";
    if (!fromClassMenu) {
      classes.forEach((item) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "class-folder-card";
        button.innerHTML = `<strong>${item.name || "授業"}</strong><small>${item.day || "-"}${item.period || "-"}限</small>`;
        button.addEventListener("click", async () => {
          classSelect.value = item.id;
          document.querySelectorAll(".class-folder-card").forEach((card) => card.classList.remove("active"));
          button.classList.add("active");
          await loadFolders();
          await loadFiles();
        });
        classFolderList.appendChild(button);
      });
      classes.forEach((item) => classSelect.add(new Option(classLabel(item), item.id)));
    }
    const classField = classSelect.closest("label");
    if (fromClassMenu || requestedSubjectId || requestedClassId) {
      classFolderList.hidden = true;
      if (classField) classField.hidden = true;
    } else {
      classFolderList.hidden = false;
      if (classField) classField.hidden = false;
    }
    if (!classes.length) {
      showStatus("時間割に登録された授業がありません。");
      return;
    }
    const initialSubject = requestedSubjectId || requestedClassId;
    const targetClass = classes.find((item) => item.id === initialSubject || item.subjectId === initialSubject || item.id === requestedClassId);
    if (targetClass) {
      if (fromClassMenu) {
        classSelect.add(new Option(classLabel(targetClass), targetClass.id));
      }
      classSelect.value = targetClass.id;
      showStatus(`${targetClass.name || "授業"}の資料を表示しています。`);
    }
    await loadFolders();
    await loadFiles();
  }

  function applyViewerZoom(zoom) {
    currentViewerZoom = Math.min(2.5, Math.max(0.6, zoom));
    if (!currentViewerMedia) return;
    currentViewerMedia.style.transform = `scale(${currentViewerZoom})`;
    fileViewerZoomReset.textContent = `${Math.round(currentViewerZoom * 100)}%`;
  }

  function openFileViewer(data) {
    if (!data?.downloadUrl) return;
    const contentType = String(data.contentType || "");
    const fileUrl = data.downloadUrl;
    let content = '<div class="file-meta">この形式はプレビューに対応していないため、別タブで開きます。</div>';
    if (contentType.startsWith("image/")) {
      content = `<img src="${fileUrl}" alt="${data.name || "資料"}" />`;
    } else if (contentType.startsWith("video/")) {
      content = `<video src="${fileUrl}" controls autoplay playsinline></video>`;
    } else if (contentType.includes("pdf") || contentType.includes("text") || contentType.includes("json") || contentType.includes("javascript") || contentType.includes("xml")) {
      content = `<iframe src="${fileUrl}" title="${data.name || "資料"}"></iframe>`;
    }
    fileViewerContent.innerHTML = content;
    currentViewerMedia = fileViewerContent.querySelector("img, video") || null;
    currentViewerZoom = 1;
    if (currentViewerMedia) {
      currentViewerMedia.style.transform = "scale(1)";
      fileViewerToolbar.hidden = false;
      fileViewerZoomReset.textContent = "100%";
    } else {
      fileViewerToolbar.hidden = true;
    }
    fileViewerModal.classList.add("visible");
    fileViewerModal.setAttribute("aria-hidden", "false");
  }

  function closeFileViewer() {
    fileViewerModal.classList.remove("visible");
    fileViewerModal.setAttribute("aria-hidden", "true");
    fileViewerContent.innerHTML = "";
    fileViewerToolbar.hidden = true;
    currentViewerMedia = null;
    currentViewerZoom = 1;
  }

  async function loadFiles() {
    const subjectId = classSelect.value;
    const folderId = folderSelect.value || "root";
    list.innerHTML = "";
    if (!subjectId) return;
    const filesPath = folderId === "root" ? `subjects/${subjectId}/files` : `subjects/${subjectId}/folders/${folderId}/files`;
    const snapshot = await db.collection(filesPath).get();
    if (!snapshot.docs.length) {
      list.textContent = "この授業の資料はまだありません。";
      return;
    }
    snapshot.docs.forEach((item) => {
      const data = item.data();
      const row = document.createElement("div");
      row.className = "file-row";
      const info = document.createElement("div");
      const previewWrapper = document.createElement("div");
      previewWrapper.className = "file-preview";
      const contentType = String(data.contentType || "");
      if (contentType.startsWith("image/")) {
        previewWrapper.innerHTML = `<img src="${data.downloadUrl || ""}" alt="${data.name || item.id}" />`;
      } else if (contentType.startsWith("video/")) {
        previewWrapper.innerHTML = `<video src="${data.downloadUrl || ""}" controls preload="metadata"></video>`;
      }
      info.innerHTML = `<strong>${data.name || item.id}</strong><div class="file-meta">${Math.ceil(Number(data.size || 0) / 1024)}KB / ${contentType || "不明"}</div>`;
      if (previewWrapper.innerHTML.trim()) {
        info.appendChild(previewWrapper);
      }
      const actions = document.createElement("div");
      actions.className = "file-actions";
      const open = document.createElement("button");
      open.type = "button";
      open.textContent = "開く";
      open.addEventListener("click", () => openFileViewer(data));
      const download = document.createElement("a");
      download.href = data.downloadUrl || "#";
      download.target = "_blank";
      download.rel = "noopener";
      download.textContent = "別タブ";
      const remove = document.createElement("button");
      remove.type = "button";
      remove.textContent = "削除";
      remove.addEventListener("click", async () => {
        await storageApi.deleteObject(storageApi.ref(storage, data.storagePath));
        await db.collection(filesPath).doc(item.id).delete();
        try {
          await updateStorageUsage(data.uploadedBy, -Number(data.size || 0));
        } catch (usageError) {
          console.warn("Storage usage sync failed after delete:", usageError);
        }
        await loadFiles();
      });
      actions.append(open, download, remove);
      row.append(info, actions);
      list.appendChild(row);
    });
  }

  async function loadFolders() {
    const subjectId = classSelect.value;
    folderSelect.innerHTML = "";
    folderSelect.add(new Option("ルート（未分類）", "root"));
    if (!subjectId) return;
    const snapshot = await db.collection(`subjects/${subjectId}/folders`).get();
    folders = snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
    folders.forEach((folder) => folderSelect.add(new Option(folder.name || folder.id, folder.id)));
    refreshUploadSummary();
  }

  classSelect.addEventListener("change", async () => { await loadFolders(); await loadFiles(); refreshUploadSummary(); });
  folderSelect.addEventListener("change", () => { refreshUploadSummary(); loadFiles(); });
  fileViewerClose.addEventListener("click", closeFileViewer);
  fileViewerZoomIn.addEventListener("click", () => applyViewerZoom(currentViewerZoom + 0.2));
  fileViewerZoomOut.addEventListener("click", () => applyViewerZoom(currentViewerZoom - 0.2));
  fileViewerZoomReset.addEventListener("click", () => applyViewerZoom(1));
  fileViewerModal.addEventListener("click", (event) => {
    if (event.target === fileViewerModal) closeFileViewer();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && fileViewerModal.classList.contains("visible")) {
      closeFileViewer();
    }
  });
  createFolderButton.addEventListener("click", async () => {
    const subjectId = classSelect.value;
    if (!subjectId) return;
    const name = window.prompt("フォルダー名を入力してください");
    if (!name?.trim()) return;
    const folderId = `${Date.now()}_${name}`.replace(/[^a-zA-Z0-9._-]/g, "_");
    try {
      await db.collection(`subjects/${subjectId}/folders`).doc(folderId).set({ name: name.trim(), createdAt: new Date(), createdBy: getUser()?.uid || "" });
      await loadFolders();
      folderSelect.value = folderId;
      await loadFiles();
      showStatus("教材フォルダーを作成しました。");
    } catch (error) {
      console.error(error);
      showStatus(error.code === "permission-denied" ? "権限がありません。firestore.rulesを公開してください。" : "フォルダー作成に失敗しました。");
    }
  });
  fileInput.addEventListener("change", () => {
    const selectedFiles = Array.from(fileInput.files || []);
    const names = selectedFiles.slice(0, 3).map((file) => file.name);
    if (selectedFiles.length) {
      uploadSummary.textContent = `${selectedFiles.length}件選択`;
      if (selectedFiles.length > 3) uploadSummary.textContent += ` (${names.join(", ")}, ... )`;
    } else {
      refreshUploadSummary();
    }
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const user = getUser();
    const selectedFiles = Array.from(fileInput.files || []);
    const subjectId = classSelect.value;
    const folderId = folderSelect.value || "root";
    if (!user || !selectedFiles.length || !subjectId) return;
    try {
      const capacity = await canUploadFiles(user, selectedFiles);
      if (!capacity.allowed) {
        showStatus(`容量上限を超えるためアップロードできません。選択合計 ${Math.ceil(capacity.totalSize / 1024 / 1024)}MB / 使用量 ${Math.ceil(capacity.used / 1024 / 1024)}MB / 上限 ${Math.ceil(capacity.limit / 1024 / 1024)}MB`);
        return;
      }
      const filesPath = folderId === "root" ? `subjects/${subjectId}/files` : `subjects/${subjectId}/folders/${folderId}/files`;
      let uploadedCount = 0;
      for (const file of selectedFiles) {
        const fileId = `${Date.now()}_${file.name}`.replace(/[^a-zA-Z0-9._-]/g, "_");
        const storagePath = folderId === "root" ? `subjects/${subjectId}/files/${fileId}` : `subjects/${subjectId}/folders/${folderId}/files/${fileId}`;
        const storageRef = storageApi.ref(storage, storagePath);
        await storageApi.uploadBytes(storageRef, file, { contentType: file.type || "application/octet-stream" });
        const downloadUrl = await storageApi.getDownloadURL(storageRef);
        await db.collection(filesPath).doc(fileId).set({
          subjectId,
          name: file.name,
          storagePath,
          downloadUrl,
          size: file.size,
          contentType: file.type || "application/octet-stream",
          uploadedBy: user.uid,
          createdAt: new Date(),
        });
        try {
          await updateStorageUsage(user.uid, file.size);
        } catch (usageError) {
          console.warn("Storage usage sync failed after upload:", usageError);
        }
        uploadedCount += 1;
      }
      fileInput.value = "";
      showStatus(`${uploadedCount}件の資料をアップロードしました。`);
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
    refreshUploadSummary();
    await loadClasses(user);
  })().catch((error) => {
    console.error(error);
    showStatus("資料画面の読み込みに失敗しました。");
  });
})();
