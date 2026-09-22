(function () {
  const { auth, db } = window.studyhubFirebase || {};
  const { logoutUser, getCurrentUser, getLocalClassesForCurrentUser } = window.studyhubAuth || {};
  if (!logoutUser) return;

  const dayNames = ["月", "火", "水", "木", "金"];
  const periods = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
  const timetableGrid = document.getElementById("timetableGrid");
  const logoutBtn = document.getElementById("logoutBtn");
  const menuButton = document.getElementById("menuButton");
  const closeMenuButton = document.getElementById("closeMenuButton");
  const sideMenu = document.getElementById("sideMenu");
  const menuBackdrop = document.getElementById("menuBackdrop");

  let currentUser = null;
  let timetableData = {};

  function categoryClass(category) {
    const classes = {
      "数学": "category-math",
      "国語": "category-japanese",
      "科学": "category-science",
      "社会": "category-social",
      "英語": "category-english",
      "情報": "category-information",
      "その他": "category-other",
    };
    return classes[category] || classes["その他"];
  }

  function setMenuOpen(isOpen) {
    sideMenu?.classList.toggle("open", isOpen);
    sideMenu?.setAttribute("aria-hidden", String(!isOpen));
    menuButton?.setAttribute("aria-expanded", String(isOpen));
    if (menuBackdrop) menuBackdrop.hidden = !isOpen;
  }

  menuButton?.addEventListener("click", () => setMenuOpen(true));
  closeMenuButton?.addEventListener("click", () => setMenuOpen(false));
  menuBackdrop?.addEventListener("click", () => setMenuOpen(false));

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

  function getResolvedCurrentUser() {
    if (auth && auth.currentUser) return auth.currentUser;
    if (currentUser) return currentUser;
    return typeof getCurrentUser === "function" ? getCurrentUser() : null;
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
        const cell = document.createElement("div");
        const subject = timetableData?.[day]?.[period];

        const subjectCategoryClass = subject ? categoryClass(subject.category || "その他") : "";
        cell.className = `cell timetable-slot ${subject ? "filled" : ""} ${subjectCategoryClass}`;
        cell.dataset.day = day;
        cell.dataset.period = String(period);
        if (subject) {
          cell.tabIndex = 0;
          cell.setAttribute("role", "link");
          const openClassMenu = () => {
            window.location.href = `./class-menu.html?classId=${encodeURIComponent(subject.id)}`;
          };
          cell.addEventListener("click", openClassMenu);
          cell.addEventListener("keydown", (event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              openClassMenu();
            }
          });
        }

        if (subject) {
          cell.innerHTML = `
            <span class="subject">${subject.name}</span>
            <span class="room">${subject.room || "教室未設定"}</span>
          `;
        } else {
          cell.innerHTML = "";
        }

        timetableGrid.appendChild(cell);
      });
    });
  }

  async function loadTimetable() {
    const user = getResolvedCurrentUser();
    if (!user) {
      timetableData = buildEmptyTimetable();
      renderTimetable();
      return;
    }

    currentUser = user;
    const grid = buildEmptyTimetable();

    if (typeof getLocalClassesForCurrentUser === "function") {
      const localClasses = getLocalClassesForCurrentUser(user.uid);
      localClasses.forEach((data) => {
        const day = data.day;
        const period = Number(data.period);
        if (dayNames.includes(day) && periods.includes(period)) {
          grid[day][period] = { id: data.id, ...data };
        }
      });
    }

    timetableData = grid;
    renderTimetable();

    if (db && auth) {
      try {
        const subjectSnapshot = await db.collection("subjects").get();
        const subjectMap = new Map(subjectSnapshot.docs.map((docSnap) => [docSnap.id, docSnap.data()]));
        const querySnapshot = await db.collection("classes").where("ownerUid", "==", user.uid).get();
        querySnapshot.forEach((docSnap) => {
          const data = docSnap.data();
          const subjectInfo = subjectMap.get(data.subjectId);
          const day = data.day;
          const period = Number(data.period);
          if (dayNames.includes(day) && periods.includes(period)) {
            grid[day][period] = {
              id: docSnap.id,
              ...data,
              category: data.category || subjectInfo?.category || "その他",
            };
          }
        });
        timetableData = grid;
        renderTimetable();
      } catch (error) {
        console.warn("Firestore timetable load failed; keeping local storage data.", error);
      }
    }
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

  const bootUser = getResolvedCurrentUser();
  if (bootUser) {
    currentUser = bootUser;
    timetableData = buildEmptyTimetable();
    renderTimetable();
    loadTimetable();
    return;
  }

  if (auth && typeof auth.onAuthStateChanged === "function") {
    auth.onAuthStateChanged((user) => {
      if (!user) {
        window.location.href = "./index.html";
        return;
      }

      currentUser = user;
      loadTimetable();
    });
    return;
  }

  window.location.href = "./index.html";
})();
