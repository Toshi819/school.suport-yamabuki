import { doc, getDoc, setDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";
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

async function loadClass() {
  if (!editingId) {
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
    if (!editingId) return;

    const ok = window.confirm("この授業を時間割から削除しますか？");
    if (!ok) return;

    await deleteDoc(doc(db, "classes", editingId));
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
      period,
      createdAt: new Date(),
    };

    if (!payload.name) {
      alert("授業名を入力してください");
      return;
    }

    if (editingId) {
      await setDoc(doc(db, "classes", editingId), { ...payload, updatedAt: new Date() }, { merge: true });
    } else {
      await setDoc(doc(db, "classes", `${currentUser.uid}_${day}_${period}`), payload);
    }

    window.location.href = "./home.html";
  });
}

loadClass();
