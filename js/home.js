import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import { collection, addDoc, getDocs, query, where, deleteDoc, doc, updateDoc } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";
import { auth, db } from "../firebase.js";

const dayNames = ["月", "火", "水", "木", "金"];
const periods = [1, 2, 3, 4, 5, 6, 7, 8];
const timetableGrid = document.getElementById("timetableGrid");

let currentUser = null;
let timetableData = {};

function buildEmptyTimetable() {
  const grid = {};

  dayNames.forEach((day) => {
    grid[day] = {};
    periods.forEach((period) => {
      grid[day][period] = null;
    });
  });

  return grid;
}

function slotKey(day, period) {
  return `${day}-${period}`;
}

function renderTimetable() {
  if (!timetableGrid) return;

  timetableGrid.innerHTML = "";

  const empty = document.createElement("div");
  empty.className = "cell header";
  empty.textContent = "";
  timetableGrid.appendChild(empty);

  dayNames.forEach((day) => {
    const header = document.createElement("div");
    header.className = "cell header";
    header.textContent = day;
    timetableGrid.appendChild(header);
  });

  periods.forEach((period) => {
    const periodCell = document.createElement("div");
    periodCell.className = "cell period";
    periodCell.textContent = `${period}限`;
    timetableGrid.appendChild(periodCell);

    dayNames.forEach((day) => {
      const cell = document.createElement("button");
      const key = slotKey(day, period);
      const subject = timetableData?.[day]?.[period];

      cell.type = "button";
      cell.className = `cell timetable-slot ${subject ? "filled" : ""}`;
      cell.dataset.key = key;
      cell.dataset.day = day;
      cell.dataset.period = String(period);

      if (subject) {
        cell.innerHTML = `
          <span class="subject">${subject.name}</span>
          <span class="room">${subject.room || "教室未設定"}</span>
        `;
      } else {
        cell.innerHTML = "<span>＋</span>";
      }

      cell.addEventListener("click", () => {
        const params = new URLSearchParams({ day, period: String(period), classId: subject?.id || "" });
        window.location.href = `./class.html?${params.toString()}`;
      });

      timetableGrid.appendChild(cell);
    });
  });
}

async function loadTimetable() {
  if (!currentUser) return;

  const q = query(collection(db, "classes"), where("ownerUid", "==", currentUser.uid));
  const snapshot = await getDocs(q);

  const grid = buildEmptyTimetable();

  snapshot.forEach((docSnap) => {
    const data = docSnap.data();
    const day = data.day;
    const period = Number(data.period);

    if (dayNames.includes(day) && periods.includes(period)) {
      grid[day][period] = { id: docSnap.id, ...data };
    }
  });

  timetableData = grid;
  renderTimetable();
}

onAuthStateChanged(auth, (user) => {
  if (!user) {
    window.location.href = "./index.html";
    return;
  }

  currentUser = user;
  loadTimetable();
});
