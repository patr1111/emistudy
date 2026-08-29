(function () {
  const K = window.Kirameki;
  const C = window.KiramekiChars;
  const CHOICES = 6;
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
  function counts() {
    const log = (quiz && quiz.log) || [];
    const kid = log.filter((x) => isKid(x.i));
    const par = log.filter((x) => !isKid(x.i));
    return {
      kidOk: kid.filter((x) => x.ok).length,
      kidN: kid.length,
      parOk: par.filter((x) => x.ok).length,
      parN: par.length
    };
  }
  function scoreHtml(c) {
    const goal = K.RACE_GOAL || 5;
    return "<div class='vs-col'><span class='vs-who'>こども</span><span class='vs-num'>" + c.kidOk + "／" + goal + "</span></div>"
      + "<div class='vs-vs'>VS</div>"
      + "<div class='vs-col'><span class='vs-who'>パパ・ママ</span><span class='vs-num'>" + c.parOk + "／" + goal + "</span></div>";
  }
  function fillParentLevels() {
    const box = document.getElementById("parent-level-seg");
    if (!box) return;
    const selected = K.getSettings().battleParentLevels || [];
    box.innerHTML = "";
    K.LEVELS.forEach((it) => {
      const lab = document.createElement("label");
      lab.innerHTML = '<input type="checkbox" value="' + it.id + '"> ' + it.name;
      lab.querySelector("input").checked = selected.indexOf(it.id) >= 0;
      lab.querySelector("input").addEventListener("change", () => {
        const levels = Array.from(box.querySelectorAll("input:checked")).map((el) => el.value);
        if (!levels.length) {
          lab.querySelector("input").checked = true;
          K.toast("級は1つ以上選んでください");
          return;
        }
        K.saveSettings({ battleParentLevels: levels });
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
      const why = st.parentN < 6
        ? "パパ・ママの級の単語が足りません。級を変えてください。"
        : "まだ出していない単語が " + st.left + "語です。10語ないと遊べません。";
      document.getElementById("lock-count").textContent = why;
    }
  }
  function renderGauge() {
    const g = document.getElementById("gauge");
    g.innerHTML = "";
    for (let i = 0; i < quiz.items.length; i++) {
      const d = document.createElement("div");
      if (i < quiz.log.length) {
        d.className = "gdot on" + (quiz.log[i].ok ? "" : " bad") + (isKid(i) ? " kid" : " par");
        d.textContent = quiz.log[i].ok ? (isKid(i) ? "★" : "●") : "💧";
      } else {
        d.className = "gdot" + (i === quiz.i ? " on" : "") + (isKid(i) ? " kid" : " par");
        d.textContent = i === quiz.i ? (isKid(i) ? "★" : "●") : "";
      }
      g.appendChild(d);
    }
  }
  async function setRaceFaces() {
    const kid = document.getElementById("race-kid");
    const par = document.getElementById("race-par");
    if (kid) kid.innerHTML = await C.faceHtml(player(), "happy", 48);
    if (par) par.innerHTML = parentFaceHtml("happy", 48);
  }
  function setRacePos() {
    const c = counts();
    const goal = K.RACE_GOAL || 5;
    const pct = (n) => "calc(" + (Math.min(n, goal) / goal) + " * (100% - 52px))";
    const kid = document.getElementById("race-kid");
    const par = document.getElementById("race-par");
    if (kid) kid.style.left = pct(c.kidOk);
    if (par) par.style.left = pct(c.parOk);
  }
  function raceOver() {
    const c = counts();
    const goal = K.RACE_GOAL || 5;
    return c.kidOk >= goal || c.parOk >= goal || (quiz && quiz.i >= quiz.items.length);
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
    document.getElementById("vs-score").innerHTML = scoreHtml(counts());
    setRacePos();
  }
  function renderQuestion() {
    const w = quiz.items[quiz.i];
    renderGauge();
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
  function openScoreDlg() {
    document.getElementById("score-dlg-body").innerHTML = scoreHtml(counts());
    document.getElementById("score-dlg").classList.add("on");
  }
  function afterQuestion() {
    if (!quiz) return;
    if (raceOver()) {
      finishBattle();
      return;
    }
    if (quiz.i === 4 || quiz.i === 8) {
      openScoreDlg();
      return;
    }
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
    renderGauge();
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
    const c = counts();
    const goal = K.RACE_GOAL || 5;
    let winner = "draw";
    let line = "ひきわけ！";
    if (c.kidOk >= goal && c.parOk < goal) { winner = "kid"; line = "こどものかち！"; }
    else if (c.parOk >= goal && c.kidOk < goal) { winner = "par"; line = "パパ・ママのかち！"; }
    else if (c.kidOk > c.parOk) { winner = "kid"; line = "こどものかち！"; }
    else if (c.parOk > c.kidOk) { winner = "par"; line = "パパ・ママのかち！"; }
    document.getElementById("winner-line").textContent = line;
    document.getElementById("winner-line").className = "english winner-" + winner;
    document.getElementById("result-msg").textContent =
      "こども " + c.kidOk + "マス　パパ・ママ " + c.parOk + "マス";
    document.getElementById("vs-final").innerHTML =
      "<div class='vs-col'><span class='vs-who'>こども</span><span class='vs-num'>" + c.kidOk + "マス</span></div>"
      + "<div class='vs-vs'>VS</div>"
      + "<div class='vs-col'><span class='vs-who'>パパ・ママ</span><span class='vs-num'>" + c.parOk + "マス</span></div>";
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
  function startBattle() {
    const items = K.pickBattleItems();
    if (items.length < K.ROUND) {
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
    setRaceFaces().then(setRacePos);
    renderQuestion();
  }
  function quitQuiz() {
    quiz = null;
    K.stopSpeak();
    document.getElementById("score-dlg").classList.remove("on");
    renderTitle();
    show("title");
  }
  function boot() {
    WORDS = K.wordQueue();
    renderTitle();
    document.getElementById("go-start").addEventListener("click", startBattle);
    document.getElementById("quiz-quit").addEventListener("click", quitQuiz);
    document.getElementById("score-go").addEventListener("click", () => {
      document.getElementById("score-dlg").classList.remove("on");
      if (!quiz) return;
      if (raceOver()) finishBattle();
      else renderQuestion();
    });
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
