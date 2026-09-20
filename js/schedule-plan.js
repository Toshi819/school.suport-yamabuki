(function () {
  const dayNames = ["月", "火", "水", "木", "金"];
  const periods = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
  const grid = document.getElementById("scheduleGrid");
  const form = document.getElementById("scheduleForm");

  const getCurrentUser = window.studyhubAuth?.getCurrentUser;
  const getLocalSubjects = window.studyhubAuth?.getLocalSubjects;
  const upsertLocalClass = window.studyhubAuth?.upsertLocalClass;
  const auth = window.studyhubFirebase?.auth;
  const db = window.studyhubFirebase?.db;

  const defaultSubjects = [
    { name: "国語", teacher: "田中先生", room: "101", floor: 1 },
    { name: "数学", teacher: "佐藤先生", room: "202", floor: 2 },
    { name: "英語", teacher: "伊藤先生", room: "303", floor: 3 },
    { name: "理科", teacher: "山本先生", room: "404", floor: 4 },
    { name: "社会", teacher: "中村先生", room: "105", floor: 1 },
    { name: "情報", teacher: "松本先生", room: "ラボ1", floor: 2 },
    { name: "保健体育", teacher: "小林先生", room: "体育館", floor: 1 },
    { name: "美術", teacher: "渡辺先生", room: "美術室", floor: 2 },
  ];

  function getUser() {
    return (auth && auth.currentUser) || (getCurrentUser ? getCurrentUser() : null);
  }

  function isScheduleFixed(user) {
    return user && localStorage.getItem(`studyhub_schedule_fixed_${user.uid}`) === "true";
  }

  function getSubjectOptions() {
    const subjects = getLocalSubjects ? getLocalSubjects() : {};
    const savedSubjects = Object.values(subjects || {}).filter((item) => item && item.name);
    return savedSubjects.length ? savedSubjects : defaultSubjects;
  }

  function renderGrid() {
    if (!grid) return;
    grid.innerHTML = "";

    const blank = document.createElement("div");
    blank.className = "cell head";
    blank.textContent = "";
    grid.appendChild(blank);

    dayNames.forEach((day) => {
      const header = document.createElement("div");
      header.className = "cell head";
      header.textContent = day;
      grid.appendChild(header);
    });

    const subjectOptions = getSubjectOptions();
    const listForSelect = [
      { name: "未設定", value: "" },
      ...subjectOptions.map((subject) => ({ ...subject, value: subject.name })),
    ];

    periods.forEach((period) => {
      const label = document.createElement("div");
      label.className = "cell period-label";
      label.textContent = `${period}限`;
      grid.appendChild(label);

      dayNames.forEach((day) => {
        const wrapper = document.createElement("div");
        wrapper.className = "cell";

        const select = document.createElement("select");
        select.name = `${day}_${period}`;
        select.setAttribute("aria-label", `${day}${period}限`);

        listForSelect.forEach((subject) => {
          const option = new Option(subject.name, subject.value || "", false, false);
          if (!subject.value) {
            option.selected = true;
          }
          select.add(option);
        });

        wrapper.appendChild(select);
        grid.appendChild(wrapper);
      });
    });
  }

  async function ensureLocalSubjectsLoaded() {
    if (!getLocalSubjects) return;

    const subjects = getLocalSubjects();
    if (Object.keys(subjects || {}).length > 0) {
      renderGrid();
      return;
    }

    renderGrid();
  }

  if (form) {
    form.addEventListener("submit", (event) => {
      event.preventDefault();

      const currentUser = getUser();
      if (!currentUser) {
        window.location.href = "./index.html";
        return;
      }

      const subjects = getLocalSubjects ? getLocalSubjects() : {};
      const subjectCatalog = Object.keys(subjects || {}).length ? Object.values(subjects) : defaultSubjects;
      const selectedNames = new Map();

      dayNames.forEach((day) => {
        periods.forEach((period) => {
          const key = `${day}_${period}`;
          const select = form.elements.namedItem(key);
          const value = select && select.value ? String(select.value).trim() : "";
          if (value) {
            const subjectInfo = subjectCatalog.find((item) => item && item.name === value);
            if (subjectInfo) {
              selectedNames.set(`${day}_${period}`, {
                ...subjectInfo,
                id: `${currentUser.uid}_${day}_${period}`,
                ownerUid: currentUser.uid,
                day,
                period,
              });
            }
          }
        });
      });

      const saved = [...selectedNames.values()];
      saved.forEach((item) => {
        if (typeof upsertLocalClass === "function") {
          upsertLocalClass(item.id, {
            ownerUid: currentUser.uid,
            name: item.name,
            teacher: item.teacher || "",
            room: item.room || "",
            floor: Number(item.floor || 0),
            day: item.day,
            period: Number(item.period),
            updatedAt: new Date(),
            createdAt: item.createdAt || new Date(),
          });
        }
      });

      localStorage.setItem(`studyhub_schedule_fixed_${currentUser.uid}`, "true");
      alert("時間割を登録しました");
      window.location.href = "./home.html";
    });
  }

  const currentUser = getUser();
  if (isScheduleFixed(currentUser)) {
    window.location.href = "./home.html";
    return;
  }

  sessionStorage.removeItem("studyhub_registration_in_progress");
  ensureLocalSubjectsLoaded();
})();
