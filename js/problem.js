(function () {
  const { db } = window.studyhubFirebase || {};
  let words = window.STUDYHUB_LEAP_WORDS || [];
  const page = location.pathname.split("/").pop();

  async function loadWords() {
    try {
      const response = await fetch("./leap単語.txt");
      if (!response.ok) return;
      const text = await response.text();
      const parsed = text.split(/\r?\n/).map((line) => {
        const match = line.match(/^\d+\t([^\t]+)\t(.+)$/);
        return match ? [match[1], match[2]] : null;
      }).filter(Boolean);
      if (parsed.length) words = parsed;
    } catch (error) {
      console.warn("LEAP単語データの読み込みに失敗しました。", error);
    }
  }

  function beginQuiz(mode, start, end, stage) {
    const params = new URLSearchParams({ mode, start: String(start), end: String(end), stage: String(stage) });
    window.location.href = `./problem-quiz.html?${params.toString()}`;
  }
  async function currentUser() {
    return window.studyhubFirebase?.authReady ? window.studyhubFirebase.authReady : null;
  }
  async function getScores() {
    if (!db) return [];
    const snapshot = await db.collection("leapScores").get();
    return snapshot.docs.map((item) => item.data());
  }
  function aggregateScores(rows) {
    const users = new Map();
    rows.forEach((row) => {
      const uid = row.uid;
      if (!uid) return;
      const current = users.get(uid) || { uid, username: row.username || uid.slice(0, 8), totalScore: 0, stages: 0 };
      current.totalScore += Number(row.score || 0);
      current.stages += 1;
      if (row.username) current.username = row.username;
      users.set(uid, current);
    });
    return [...users.values()].sort((a, b) => b.totalScore - a.totalScore || a.username.localeCompare(b.username));
  }
  function renderRows(container, rows, offset = 0) {
    container.innerHTML = rows.length ? rows.map((row, index) => `<div class="rank-row"><span>${offset + index + 1}位 ${row.username}</span><strong>${row.totalScore}点</strong></div>`).join("") : "<p class='progress'>まだランキングデータがありません。</p>";
  }
  async function initializeSelf() {
    const button = document.getElementById("selfStart");
    if (!button) return;
    const message = document.getElementById("problemMessage");
    button.addEventListener("click", () => {
      const start = Number(document.getElementById("selfStartWord").value);
      const end = Number(document.getElementById("selfEndWord").value);
      if (start < 1 || end < start || end > words.length || end - start + 1 < 10) {
        message.textContent = `1-${words.length}の範囲で、10単語以上を指定してください。`;
        return;
      }
      beginQuiz("self", start, end, 0);
    });
  }
  async function initializeRankingHome() {
    const totalScore = document.getElementById("totalScore");
    if (!totalScore) return;
    const user = await currentUser();
    if (!user) { totalScore.textContent = "トータルスコア: 0点"; return; }
    const rows = aggregateScores((await getScores()).filter((row) => row.uid === user.uid));
    totalScore.textContent = `トータルスコア: ${rows[0]?.totalScore || 0}点`;
  }
  function initializeStages() {
    const stageList = document.getElementById("stageList");
    if (!stageList) return;
    const stageCount = Math.floor(words.length / 100);
    if (!stageCount) { stageList.innerHTML = "<p class='progress'>ステージデータがありません。</p>"; return; }
    for (let stage = 1; stage <= stageCount; stage += 1) {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = `ステージ${stage}（${(stage - 1) * 100 + 1}-${stage * 100}語）`;
      button.addEventListener("click", () => beginQuiz("ranking", (stage - 1) * 100 + 1, stage * 100, stage));
      stageList.appendChild(button);
    }
  }
  async function initializeRankingView() {
    const rankingList = document.getElementById("rankingList");
    const nearbyList = document.getElementById("nearbyList");
    if (!rankingList || !nearbyList) return;
    const user = await currentUser();
    const ranking = aggregateScores(await getScores());
    renderRows(rankingList, ranking.slice(0, 10));
    const ownIndex = ranking.findIndex((row) => row.uid === user?.uid);
    renderRows(nearbyList, ownIndex < 0 ? [] : ranking.slice(Math.max(0, ownIndex - 2), ownIndex + 3), Math.max(0, ownIndex - 2));
  }
  initializeRankingHome();
  initializeRankingView();
  loadWords().then(() => {
    initializeSelf();
    initializeStages();
  });
})();
