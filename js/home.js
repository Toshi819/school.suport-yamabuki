(function () {
  const { auth, db } = window.studyhubFirebase || {};
  const { logoutUser } = window.studyhubAuth || {};
  if (!auth || !db || !logoutUser) return;

  const dayNames = ["月", "火", "水", "木", "金"];
  const periods = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
  const timetableGrid = document.getElementById("timetableGrid");
  const logoutBtn = document.getElementById("logoutBtn");

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
        const subject = timetableData?.[day]?.[period];

        cell.type = "button";
        cell.className = `cell timetable-slot ${subject ? "filled" : ""}`;
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
          const params = new URLSearchParams({ day, period: String(period) });
          if (subject?.id) params.set("classId", subject.id);
          window.location.href = `./class.html?${params.toString()}`;
        });

        timetableGrid.appendChild(cell);
      });
    });
  }

  async function loadTimetable() {
    if (!currentUser) return;

    const querySnapshot = await db.collection("classes").where("ownerUid", "==", currentUser.uid).get();
    const grid = buildEmptyTimetable();

    querySnapshot.forEach((docSnap) => {
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

  if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
      try {
        await logoutUser();
        window.location.href = "./index.html";
      } catch (error) {
        console.error(error);
        alert("ログアウトに失敗しました");
      }
    });
  }

  auth.onAuthStateChanged((user) => {
    if (!user) {
      window.location.href = "./index.html";
      return;
    }

    currentUser = user;
    loadTimetable();
  });
})();
