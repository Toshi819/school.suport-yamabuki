(function () {
  const { db } = window.studyhubFirebase || {};
  const words = window.STUDYHUB_LEAP_WORDS || [];
  const selfPanel = document.getElementById("selfPanel");
  const rankingPanel = document.getElementById("rankingPanel");
  const selfModeButton = document.getElementById("selfModeButton");
  const rankingModeButton = document.getElementById("rankingModeButton");
  const stageList = document.getElementById("stageList");
  const rankingList = document.getElementById("rankingList");
  const nearbyList = document.getElementById("nearbyList");
  const totalScore = document.getElementById("totalScore");
  let rankingStage = 1;

  function setMode(mode) {
    const self = mode === "self";
    selfPanel.hidden = !self;
    rankingPanel.hidden = self;
    selfModeButton.classList.toggle("active", self);
    rankingModeButton.classList.toggle("active", !self);
    if (!self) { renderStages(); renderTotalScore(); }
  }
  function beginQuiz(mode, start, end, stage) {
    const params = new URLSearchParams({ mode, start: String(start), end: String(end), stage: String(stage) });
    window.location.href = `./problem-quiz.html?${params.toString()}`;
  }
  function renderStages() {
    stageList.innerHTML = "";
    for (let stage = 1; stage <= Math.floor(words.length / 100); stage += 1) {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = `ステージ${stage}（${(stage - 1) * 100 + 1}-${stage * 100}語）`;
      button.addEventListener("click", () => beginQuiz("ranking", (stage - 1) * 100 + 1, stage * 100, stage));
      stageList.appendChild(button);
    }
  }
  async function renderTotalScore() {
    const user = window.studyhubFirebase?.authReady ? await window.studyhubFirebase.authReady : null;
    if (!user || !db) { totalScore.textContent = "合計スコア: 0点"; return; }
    const snapshot = await db.collection("leapScores").where("uid", "==", user.uid).get();
    const total = snapshot.docs.reduce((sum, item) => sum + Number(item.data().score || 0), 0);
    totalScore.textContent = `合計スコア: ${total}点`;
  }
  async function renderRankings() {
    const user = window.studyhubFirebase?.authReady ? await window.studyhubFirebase.authReady : null;
    if (!user || !db) return;
    const snapshot = await db.collection("leapScores").where("stage", "==", rankingStage).get();
    const rows = snapshot.docs.map((item) => item.data()).sort((a, b) => Number(b.score || 0) - Number(a.score || 0));
    rankingList.innerHTML = "";
    nearbyList.innerHTML = "";
    rows.slice(0, 10).forEach((row, index) => rankingList.insertAdjacentHTML("beforeend", `<div class="rank-row"><span>${index + 1}位</span><strong>${row.score} / 10</strong></div>`));
    const rank = rows.findIndex((row) => row.uid === user.uid);
    if (rank >= 0) rows.slice(Math.max(0, rank - 2), rank + 3).forEach((row) => nearbyList.insertAdjacentHTML("beforeend", `<div class="rank-row"><span>${rows.indexOf(row) + 1}位</span><strong>${row.score} / 10</strong></div>`));
  }
  selfModeButton.addEventListener("click", () => setMode("self"));
  rankingModeButton.addEventListener("click", () => setMode("ranking"));
  document.getElementById("selfStart").addEventListener("click", () => {
    const start = Number(document.getElementById("selfStartWord").value);
    const end = Number(document.getElementById("selfEndWord").value);
    if (start >= 1 && end >= start && end <= words.length && end - start + 1 >= 10) beginQuiz("self", start, end, 0);
  });
  document.getElementById("rankingView").addEventListener("click", renderRankings);
  setMode("self");
})();
