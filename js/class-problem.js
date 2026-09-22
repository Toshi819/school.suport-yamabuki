(function () {
  const { auth, db } = window.studyhubFirebase || {};
  const classId = new URLSearchParams(window.location.search).get("classId") || "";
  const subject = document.getElementById("problemSubject");
  const questionPanel = document.getElementById("questionPanel");
  const resultPanel = document.getElementById("resultPanel");
  const progress = document.getElementById("questionProgress");
  const questionText = document.getElementById("questionText");
  const choices = document.getElementById("choices");
  const nextButton = document.getElementById("nextButton");
  const resultTitle = document.getElementById("resultTitle");
  const resultScore = document.getElementById("resultScore");
  const backLink = document.getElementById("backToClass");
  const backDuringQuiz = document.getElementById("backDuringQuiz");
  let cards = [];
  let questions = [];
  let index = 0;
  let score = 0;
  let answered = false;

  function shuffle(items) { return [...items].sort(() => Math.random() - 0.5); }
  function makeQuestions() {
    questions = shuffle(cards).map((card) => {
      const answer = card.back;
      const distractors = shuffle(cards.filter((item) => item.id !== card.id)).slice(0, 3).map((item) => item.back);
      return { prompt: card.front, answer, choices: shuffle([answer, ...distractors]) };
    });
  }
  function renderQuestion() {
    const question = questions[index];
    answered = false;
    progress.textContent = `${index + 1} / ${questions.length}問　正解: ${score}`;
    questionText.textContent = question.prompt;
    choices.innerHTML = "";
    question.choices.forEach((choice) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "choice";
      button.textContent = choice;
      button.addEventListener("click", () => answerQuestion(button, choice, question.answer));
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
  function showNoCards(message) {
    questionText.textContent = message;
    progress.textContent = "";
    choices.innerHTML = "";
    nextButton.hidden = true;
  }
  function finish() {
    questionPanel.hidden = true;
    resultPanel.hidden = false;
    resultTitle.textContent = "結果発表";
    resultScore.textContent = `${questions.length}問中 ${score}問正解でした。`;
  }
  async function boot() {
    const user = window.studyhubFirebase?.authReady ? await window.studyhubFirebase.authReady : auth?.currentUser;
    if (!user || !classId || !db) { window.location.replace("./home.html"); return; }
    const classSnapshot = await db.collection("classes").doc(classId).get();
    if (!classSnapshot.exists || classSnapshot.data().ownerUid !== user.uid) { window.location.replace("./home.html"); return; }
    const classData = classSnapshot.data();
    subject.textContent = `${classData.name || "授業"} / ${classData.day || ""}${classData.period || ""}限`;
    const classMenuUrl = `./class-menu.html?classId=${encodeURIComponent(classId)}`;
    backLink.href = classMenuUrl;
    backDuringQuiz.href = classMenuUrl;
    const cardSnapshot = await db.collection("classCards").where("classId", "==", classId).where("ownerUid", "==", user.uid).get();
    cards = cardSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })).filter((card) => card.front && card.back);
    if (cards.length < 4) { showNoCards("4択問題には単語カードが4枚以上必要です。先に単語カードを作成してください。"); return; }
    makeQuestions();
    renderQuestion();
  }
  nextButton.addEventListener("click", () => { index += 1; if (index >= questions.length) finish(); else renderQuestion(); });
  boot().catch((error) => { console.error(error); showNoCards("授業の問題を読み込めませんでした。"); });
})();
