(function () {
  const K = window.Kirameki;
  const C = window.KiramekiChars;
  const CHOICES = 6;
  const ROUND_START = [0, 6, 12];
  const ROUND_LEN = [6, 6, 8];
  let WORDS = [];
  let quiz = null;

  function show(id) {
    if (id !== "quiz") {
      document.documentElement.classList.remove("turn-kid", "turn-par");
      const q = document.getElementById("quiz");
      if (q) q.classList.remove("turn-kid", "turn-par");
    }
    document.querySelectorAll(".screen").forEach((el) => el.classList.remove("on"));
    document.getElementById(id).classList.add("on");
  }
  function player() { return C.playerChar(); }
  function kidName() { return C.shownName(player()); }
  function isKid(i) { return i % 2 === 0; }
  function parentFaceHtml(mood, size) {
    const src = mood === "sad" ? "img/parent-sad.jpg" : "img/parent-happy.jpg";
    return '<img class="face" src="' + src + '" alt="パパ・ママ" width="' + size + '" height="' + size + '">';
  }
  async function turnFaceHtml(kidTurn, mood, size) {
    if (kidTurn) return await C.faceHtml(player(), mood || "normal", size);
    return parentFaceHtml(mood, size);
  }
  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
  function roundOf(i) {
    if (i < 6) return 0;
    if (i < 12) return 1;
    return 2;
  }
  function roundProgress(i) {
    const r = roundOf(i);
    const n = ROUND_LEN[r] / 2;
    const cur = Math.floor((i - ROUND_START[r]) / 2) + 1;
    return { cur: cur, n: n, r: r };
  }
  function fillProgress(i) {
    const el = document.getElementById("round-progress");
    if (!el) return;
    const p = roundProgress(i);
    el.textContent = p.cur + "/" + p.n;
  }
  function waitOverlay(el, ms) {
    return new Promise((resolve) => {
      let done = false;
      const finish = () => {
        if (done) return;
        done = true;
        el.removeEventListener("click", onClick);
        resolve();
      };
      const onClick = () => finish();
      el.addEventListener("click", onClick);
      setTimeout(finish, ms);
    });
  }
  function roundMarks() {
    const log = (quiz && quiz.log) || [];
    return [0, 1, 2].map((r) => {
      const start = ROUND_START[r];
      const len = ROUND_LEN[r];
      const slice = log.filter((x) => x.i >= start && x.i < start + len);
      if (slice.length < len) return { kid: "", par: "" };
      const kidOk = slice.filter((x) => isKid(x.i) && x.ok).length;
      const parOk = slice.filter((x) => !isKid(x.i) && x.ok).length;
      if (kidOk > parOk) return { kid: "○", par: "×" };
      if (parOk > kidOk) return { kid: "×", par: "○" };
      return { kid: "△", par: "△" };
    });
  }
  function tallyRounds(marks) {
    let kid = 0, par = 0;
    marks.forEach((m) => {
      if (m.kid === "○") kid += 1;
      if (m.par === "○") par += 1;
    });
    return { kid: kid, par: par };
  }
  function fillBoard(root, currentRound) {
    if (!root) return;
    const marks = roundMarks();
    [0, 1, 2].forEach((r) => {
      const kid = root.querySelector('[data-who="kid"][data-r="' + r + '"]');
      const par = root.querySelector('[data-who="par"][data-r="' + r + '"]');
      if (kid) kid.textContent = marks[r].kid;
      if (par) par.textContent = marks[r].par;
      [kid, par].forEach((el) => {
        if (!el) return;
        el.classList.toggle("now", currentRound === r);
      });
    });
    root.querySelectorAll("thead th[data-r]").forEach((th) => {
      th.classList.toggle("now", String(currentRound) === th.getAttribute("data-r"));
    });
  }
  async function fillBoardFaces() {
    const kidHtml = await C.faceHtml(player(), "happy", 48);
    const parHtml = parentFaceHtml("happy", 48);
    document.querySelectorAll("[data-vs-kid]").forEach((el) => { el.innerHTML = kidHtml; });
    document.querySelectorAll("[data-vs-par]").forEach((el) => { el.innerHTML = parHtml; });
  }
  function fillParentLevels() {
    const box = document.getElementById("parent-level-seg");
    if (!box) return;
    const selected = (K.getSettings().battleParentLevels || [])[0] || "pre2";
    box.innerHTML = "";
    K.LEVELS.forEach((it) => {
      const lab = document.createElement("label");
      lab.innerHTML = '<input type="radio" name="parent-lv" value="' + it.id + '"> ' + it.name;
      lab.querySelector("input").checked = it.id === selected;
      lab.querySelector("input").addEventListener("change", () => {
        K.saveSettings({ battleParentLevels: [it.id] });
        renderTitle();
      });
      box.appendChild(lab);
    });
  }
  function renderTitle() {
    WORDS = K.wordQueue();
    const st = K.battleStatus();
    document.getElementById("title-level").textContent =
      "こども " + K.levelsLabel() + "　パパ・ママ " + K.parentLevelsLabel() + "　まだ " + st.left + "ご";
    fillParentLevels();
    const lock = document.getElementById("lock-box");
    const start = document.getElementById("start-box");
    if (st.canPlay) {
      lock.hidden = true;
      start.hidden = false;
    } else {
      lock.hidden = false;
      start.hidden = true;
      const why = st.parentN < K.ROUND
        ? "パパ・ママの級の単語が足りません。級を変えてください。"
        : "まだ出していない単語が " + st.left + "語です。10語ないと遊べません。";
      document.getElementById("lock-count").textContent = why;
    }
  }
  async function setTurnFace(mood) {
    const kidTurn = isKid(quiz.i);
    const wrap = document.getElementById("buddy-wrap");
    wrap.className = "buddy-wrap " + (mood || "");
    wrap.innerHTML = await turnFaceHtml(kidTurn, mood || "normal", 120)
      + "<div class='buddy-name' id='buddy-line'></div>";
    document.getElementById("buddy-line").textContent = kidTurn
      ? kidName() + "の ばん"
      : "パパ・ママの ばん";
  }
  function renderTurn() {
    const kidTurn = isKid(quiz.i);
    document.getElementById("turn-banner").textContent = kidTurn
      ? "いまは こどものばん"
      : "いまは パパ・ママのばん";
    document.getElementById("turn-banner").className = "turn-banner" + (kidTurn ? " kid" : " par");
    document.documentElement.classList.toggle("turn-kid", kidTurn);
    document.documentElement.classList.toggle("turn-par", !kidTurn);
    document.getElementById("quiz").classList.toggle("turn-kid", kidTurn);
    document.getElementById("quiz").classList.toggle("turn-par", !kidTurn);
    fillBoard(document.getElementById("vs-board"), roundOf(quiz.i));
    fillProgress(quiz.i);
  }
  function renderQuestion() {
    const w = quiz.items[quiz.i];
    renderTurn();
    setTurnFace("normal");
    document.getElementById("english").textContent = w.en;
    const ex = document.getElementById("example");
    if (ex) ex.innerHTML = K.exampleHtml(w);
    K.setSpeakText(w.en, w.ex || "");
    const box = document.getElementById("choices");
    box.innerHTML = "";
    const pool = isKid(quiz.i) ? (quiz.kidPool || WORDS) : (quiz.parentPool || WORDS);
    K.pickChoices(w, pool, CHOICES).forEach((opt) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "choice";
      b.dataset.en = opt.en;
      b.innerHTML = K.choiceHtml(opt);
      b.addEventListener("click", () => onChoose(b, opt, w));
      box.appendChild(b);
    });
  }
  async function flash(ok, w) {
    const el = document.getElementById("react");
    const face = document.getElementById("react-face");
    if (face) face.innerHTML = await turnFaceHtml(isKid(quiz.i), ok ? "happy" : "sad", 160);
    document.getElementById("react-burst").textContent = ok
      ? (isKid(quiz.i) ? "その調子！" : "ナイス！")
      : "";
    document.getElementById("react-en").textContent = w.en;
    document.getElementById("react-ja").innerHTML = (ok ? "" : "正解は<br>") + K.jaHtml(w);
    el.className = "react on " + (ok ? "ok" : "ng");
    await K.waitReact(K.flashTimes(ok).wait);
  }
  async function showRoundIntro(round) {
    const el = document.getElementById("round-intro");
    const lab = document.getElementById("round-intro-lab");
    const count = document.getElementById("round-intro-count");
    if (!el) return;
    const token = quiz && quiz.token;
    const react = document.getElementById("react");
    if (react) react.className = "react";
    lab.textContent = "Round " + (round + 1);
    count.textContent = "3";
    el.classList.add("on");
    for (let n = 3; n >= 1; n--) {
      if (!quiz || quiz.token !== token) {
        el.classList.remove("on");
        return;
      }
      count.textContent = String(n);
      await sleep(1000);
    }
    el.classList.remove("on");
  }
  async function showTurnIntro(i) {
    const el = document.getElementById("turn-intro");
    const face = document.getElementById("turn-intro-face");
    const lab = document.getElementById("turn-intro-lab");
    if (!el) return;
    const token = quiz && quiz.token;
    const react = document.getElementById("react");
    if (react) react.className = "react";
    const intro = document.getElementById("round-intro");
    if (intro) intro.classList.remove("on");
    const kidTurn = isKid(i);
    if (face) face.innerHTML = await turnFaceHtml(kidTurn, "normal", 140);
    lab.textContent = kidTurn ? "こどものばん" : "パパ・ママのばん";
    lab.className = "turn-intro-lab" + (kidTurn ? " kid" : " par");
    fillBoard(document.getElementById("vs-board"), roundOf(i));
    fillProgress(i);
    document.getElementById("turn-banner").textContent = kidTurn
      ? "いまは こどものばん"
      : "いまは パパ・ママのばん";
    document.getElementById("turn-banner").className = "turn-banner" + (kidTurn ? " kid" : " par");
    document.documentElement.classList.toggle("turn-kid", kidTurn);
    document.documentElement.classList.toggle("turn-par", !kidTurn);
    const qel = document.getElementById("quiz");
    qel.classList.toggle("turn-kid", kidTurn);
    qel.classList.toggle("turn-par", !kidTurn);
    await setTurnFace("normal");
    el.classList.add("on");
    await waitOverlay(el, 1800);
    el.classList.remove("on");
    if (!quiz || quiz.token !== token) return;
  }
  async function afterQuestion() {
    if (!quiz) return;
    if (quiz.i >= quiz.items.length) {
      finishBattle();
      return;
    }
    if (quiz.i === 6 || quiz.i === 12) {
      fillBoard(document.getElementById("vs-board"), roundOf(quiz.i));
      fillProgress(quiz.i);
      await showRoundIntro(roundOf(quiz.i));
      if (!quiz) return;
    }
    await showTurnIntro(quiz.i);
    if (!quiz) return;
    renderQuestion();
  }
  async function onChoose(btn, opt, w) {
    const ok = opt.en === w.en;
    const token = quiz.token;
    const turnI = quiz.i;
    document.querySelectorAll(".choice").forEach((el) => {
      el.disabled = true;
      if (el.dataset.en === w.en) el.classList.add("ok");
    });
    if (!ok) btn.classList.add("ng");
    quiz.log.push({ i: turnI, en: w.en, w: w, ok: ok });
    renderTurn();
    setTurnFace(ok ? "happy" : "sad");
    await flash(ok, w);
    if (!quiz || quiz.token !== token) return;
    quiz.i += 1;
    afterQuestion();
  }
  function saveKidProgress() {
    const kidLog = (quiz.log || []).filter((x) => isKid(x.i));
    kidLog.forEach((x) => K.recordAnswer(x.en, x.ok));
    K.markCleared(kidLog.map((x) => x.w));
  }
  async function finishBattle() {
    saveKidProgress();
    const marks = roundMarks();
    const t = tallyRounds(marks);
    let winner = "draw";
    let line = "ひきわけ！";
    if (t.kid > t.par) { winner = "kid"; line = "こどものかち！"; }
    else if (t.par > t.kid) { winner = "par"; line = "パパ・ママのかち！"; }
    document.getElementById("winner-line").textContent = line;
    document.getElementById("winner-line").className = "english winner-" + winner;
    document.getElementById("result-msg").textContent =
      "○の数  " + t.kid + " 対 " + t.par;
    fillBoard(document.getElementById("vs-board-final"), 3);
    await fillBoardFaces();
    document.getElementById("result-faces").innerHTML =
      "<div class='buddy-wrap'>" + await C.faceHtml(player(), winner === "par" ? "sad" : "happy", 100)
      + "<div class='buddy-name'>" + kidName() + "</div></div>"
      + "<div class='buddy-wrap'>" + parentFaceHtml(winner === "kid" ? "sad" : "happy", 100)
      + "<div class='buddy-name'>パパ・ママ</div></div>";
    document.getElementById("result-review").innerHTML = quiz.log.map((x) =>
      "<div class='miss-row'><span>" + (isKid(x.i) ? "こども" : "親") + " " + K.esc(x.en) + "</span><span class='ja'>" + (x.ok ? "○ " : "× ") + K.esc(K.jaText(x.w)).replace(/\n/g, "<br>") + "</span></div>"
    ).join("");
    show("result");
  }
  async function startBattle() {
    const items = K.pickBattleItems();
    if (items.length < 20) {
      K.toast("まだ出していない単語が10語ないよ");
      renderTitle();
      show("title");
      return;
    }
    quiz = {
      items: items,
      i: 0,
      log: [],
      token: Date.now(),
      kidPool: K.wordQueue(),
      parentPool: K.parentWordPool()
    };
    show("quiz");
    document.getElementById("english").textContent = "";
    document.getElementById("choices").innerHTML = "";
    const ex = document.getElementById("example");
    if (ex) ex.innerHTML = "";
    document.getElementById("turn-banner").textContent = "";
    document.getElementById("buddy-wrap").innerHTML = "";
    await fillBoardFaces();
    fillBoard(document.getElementById("vs-board"), 0);
    fillProgress(0);
    await showRoundIntro(0);
    if (!quiz) return;
    await showTurnIntro(0);
    if (!quiz) return;
    renderQuestion();
  }
  function quitQuiz() {
    quiz = null;
    K.stopSpeak();
    const intro = document.getElementById("round-intro");
    if (intro) intro.classList.remove("on");
    const turn = document.getElementById("turn-intro");
    if (turn) turn.classList.remove("on");
    document.getElementById("react").className = "react";
    renderTitle();
    show("title");
  }
  function boot() {
    WORDS = K.wordQueue();
    renderTitle();
    document.getElementById("go-start").addEventListener("click", startBattle);
    document.getElementById("quiz-quit").addEventListener("click", quitQuiz);
    document.getElementById("again").addEventListener("click", startBattle);
    document.getElementById("result-home").addEventListener("click", () => {
      renderTitle();
      show("title");
    });
    K.bindSpeakButtons();
    C.preloadMoods();
    K.bindGuide("battle");
  }
  boot();
})();
