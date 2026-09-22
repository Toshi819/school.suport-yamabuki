(function () {
  const { db } = window.studyhubFirebase || {};
  const words = window.STUDYHUB_LEAP_WORDS || [];
  const params = new URLSearchParams(window.location.search);
  const mode = params.get("mode") === "ranking" ? "ranking" : "self";
  const start = Number(params.get("start"));
  const end = Number(params.get("end"));
  const stage = Number(params.get("stage")) || 0;
  const questionPanel = document.getElementById("questionPanel");
  const resultPanel = document.getElementById("resultPanel");
  const questionText = document.getElementById("questionText");
  const questionProgress = document.getElementById("questionProgress");
  const choices = document.getElementById("choices");
  const nextButton = document.getElementById("nextButton");
  const resultTitle = document.getElementById("resultTitle");
  const resultScore = document.getElementById("resultScore");
  let questions = [];
  let questionIndex = 0;
  let score = 0;
  let answered = false;

  function shuffle(items) { return [...items].sort(() => Math.random() - 0.5); }
  function makeQuestion(item, japaneseToEnglish, pool) {
    const answer = japaneseToEnglish ? item[0] : item[1];
    const distractors = shuffle(pool.filter((entry) => entry !== item)).slice(0, 3).map((entry) => japaneseToEnglish ? entry[0] : entry[1]);
    return { prompt: japaneseToEnglish ? `${item[1]} の英語は？` : `${item[0]} の日本語は？`, answer, choices: shuffle([answer, ...distractors]) };
  }
  function makeQuestions(pool) {
    const selected = shuffle(pool).slice(0, 10);
    return [...selected.slice(0, 5).map((item) => makeQuestion(item, true, pool)), ...selected.slice(5).map((item) => makeQuestion(item, false, pool))];
  }
  function renderQuestion() {
    const current = questions[questionIndex];
    answered = false;
    questionProgress.textContent = `${questionIndex + 1} / ${questions.length}問　正解: ${score}`;
    questionText.textContent = current.prompt;
    choices.innerHTML = "";
    current.choices.forEach((choice) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "choice";
      button.textContent = choice;
      button.addEventListener("click", () => answerQuestion(button, choice, current.answer));
      choices.appendChild(button);
    });
    nextButton.hidden = true;
  }
  function answerQuestion(button, choice, answer) {
    if (answered) return;
    answered = true;
    document.querySelectorAll(".choice").forEach((item) => { item.disabled = true; if (item.textContent === answer) item.classList.add("correct"); });
    if (choice === answer) score += 1; else button.classList.add("wrong");
    nextButton.hidden = false;
  }
  async function saveScore() {
    const user = window.studyhubFirebase?.authReady ? await window.studyhubFirebase.authReady : null;
    if (mode !== "ranking" || !user || !db) return;
    const ref = db.collection("leapScores").doc(`${user.uid}_${stage}`);
    const old = await ref.get();
    const oldScore = old.exists ? Number(old.data().score || 0) : 0;
    if (score > oldScore) await ref.set({ uid: user.uid, stage, score, total: 10, updatedAt: new Date() }, { merge: true });
  }
  async function finishQuiz() {
    questionPanel.hidden = true;
    resultPanel.hidden = false;
    const passed = score > 5;
    resultTitle.textContent = passed ? "ゲームクリア" : "ゲームオーバー";
    resultTitle.className = passed ? "result-pass" : "result-fail";
    resultScore.textContent = `${score} / 10問正解${passed && mode === "ranking" ? "。ハイスコアを保存しました。" : "。"}`;
    if (passed) await saveScore();
  }
  nextButton.addEventListener("click", () => { questionIndex += 1; if (questionIndex >= questions.length) finishQuiz(); else renderQuestion(); });
  const pool = words.slice(Math.max(0, start - 1), end);
  if (pool.length < 10) { questionText.textContent = "出題範囲が正しくありません。"; nextButton.hidden = true; return; }
  questions = makeQuestions(pool);
  renderQuestion();
})();
