import { collection, deleteDoc, doc, getDoc, getDocs, query, setDoc, where } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";
import { auth, db } from "../firebase.js";

const form = document.getElementById("classForm");
const title = document.getElementById("classTitle");
const backBtn = document.getElementById("backBtn");
const deleteBtn = document.getElementById("deleteBtn");

const params = new URLSearchParams(window.location.search);
const editingId = params.get("classId") || "";
const day = params.get("day") || "月";
const period = Number(params.get("period") || 1);

function setFormValues(data = {}) {
  document.getElementById("className").value = data.name || "";
  document.getElementById("teacher").value = data.teacher || "";
  document.getElementById("room").value = data.room || "";
  document.getElementById("floor").value = data.floor || "";
}

async function resolveTargetDocId() {
  if (editingId) return editingId;

  const currentUser = auth.currentUser;
  if (!currentUser) return "";

  const q = query(
    collection(db, "classes"),
    where("ownerUid", "==", currentUser.uid),
    where("day", "==", day),
    where("period", "==", Number(period))
  );

  const snapshot = await getDocs(q);
  if (!snapshot.empty) {
    return snapshot.docs[0].id;
  }

  return `${currentUser.uid}_${day}_${period}`;
}

async function loadClass() {
  if (!editingId) {
    const currentUser = auth.currentUser;

    if (currentUser) {
      const q = query(
        collection(db, "classes"),
        where("ownerUid", "==", currentUser.uid),
        where("day", "==", day),
        where("period", "==", Number(period))
      );

      const snapshot = await getDocs(q);
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

  const ref = doc(db, "classes", editingId);
  const snap = await getDoc(ref);

  if (snap.exists()) {
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

    await deleteDoc(doc(db, "classes", targetId));
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

    const payload = {
      ownerUid: currentUser.uid,
      name: document.getElementById("className").value.trim(),
      teacher: document.getElementById("teacher").value.trim(),
      room: document.getElementById("room").value.trim(),
      floor: Number(document.getElementById("floor").value || 0),
      day,
      period: Number(period),
      updatedAt: new Date(),
    };

    if (!payload.name) {
      alert("授業名を入力してください");
      return;
    }

    const targetId = await resolveTargetDocId();
    if (!targetId) {
      alert("保存先を特定できませんでした");
      return;
    }

    await setDoc(doc(db, "classes", targetId), {
      ...payload,
      createdAt: (await getDoc(doc(db, "classes", targetId))).exists() ? (await getDoc(doc(db, "classes", targetId))).data().createdAt || new Date() : new Date(),
    }, { merge: true });

    window.location.href = "./home.html";
  });
}

loadClass();
