(function () {
  const K = window.Kirameki;
  const C = window.KiramekiChars;
  const CHOICES = 6;
  const MODE_META = {
    easy: { name: "かんたん", desc: "いままで せいかいした ことば" },
    normal: { name: "ふつう", desc: "せいかいと まちがいを はんはん" },
    hard: { name: "むずかしい", desc: "たすけてリストの ことば" }
  };
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
    return "<div class='vs-col'><span class='vs-who'>こども</span><span class='vs-num'>" + c.kidOk + "／" + c.kidN + "</span></div>"
      + "<div class='vs-vs'>VS</div>"
      + "<div class='vs-col'><span class='vs-who'>パパ・ママ</span><span class='vs-num'>" + c.parOk + "／" + c.parN + "</span></div>";
  }
  function renderTitle() {
    WORDS = K.wordQueue();
    const st = K.battleStatus();
    document.getElementById("title-level").textContent =
      K.levelsLabel() + "　履歴 " + st.seen + "ご";
    const lock = document.getElementById("lock-box");
    const start = document.getElementById("start-box");
    if (st.canPlay) {
      lock.hidden = true;
      start.hidden = false;
    } else {
      lock.hidden = false;
      start.hidden = true;
      document.getElementById("lock-count").textContent =
        "いまの履歴は " + st.seen + "語です。10語以上になると遊べます。";
    }
  }
  function renderModes() {
    const st = K.battleStatus();
    const box = document.getElementById("mode-grid");
    box.innerHTML = "";
    [
      { id: "easy", ok: st.canEasy, need: "せいかいした語が10語必要です。いま " + st.easy + "語。" },
      { id: "normal", ok: st.canNormal, need: "せいかい5語とまちがい5語が必要です。いま せいかい " + st.easy + "・まちがい " + st.hard + "。" },
      { id: "hard", ok: st.canHard, need: "たすけてリストが10語必要です。いま " + st.hard + "語。" }
    ].forEach((it) => {
      const meta = MODE_META[it.id];
      const b = document.createElement("button");
      b.type = "button";
      b.className = "mode-card" + (it.ok ? "" : " off");
      b.innerHTML = "<span class='mode-name'>" + meta.name + "</span>"
        + "<span class='mode-desc'>" + meta.desc + "</span>"
        + "<span class='mode-need'>" + (it.ok ? "10もん はじめる" : it.need) + "</span>";
      if (it.ok) b.addEventListener("click", () => startBattle(it.id));
      else b.addEventListener("click", () => K.toast(it.need));
      box.appendChild(b);
    });
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
  }
  function renderQuestion() {
    const w = quiz.items[quiz.i];
    document.getElementById("q-mode").textContent = MODE_META[quiz.mode].name;
    renderGauge();
    renderTurn();
    setTurnFace("normal");
    document.getElementById("english").textContent = w.en;
    const ex = document.getElementById("example");
    if (ex) ex.innerHTML = K.exampleHtml(w);
    K.setSpeakText(w.en, w.ex || "");
    const box = document.getElementById("choices");
    box.innerHTML = "";
    K.pickChoices(w, WORDS, CHOICES).forEach((opt) => {
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
    if (quiz.i >= quiz.items.length) {
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
  async function finishBattle() {
    const c = counts();
    const kidPct = c.kidN ? Math.round(c.kidOk / c.kidN * 100) : 0;
    const parPct = c.parN ? Math.round(c.parOk / c.parN * 100) : 0;
    let winner = "draw";
    let line = "ひきわけ！";
    if (kidPct > parPct) { winner = "kid"; line = "こどものかち！"; }
    else if (parPct > kidPct) { winner = "par"; line = "パパ・ママのかち！"; }
    document.getElementById("winner-line").textContent = line;
    document.getElementById("winner-line").className = "english winner-" + winner;
    document.getElementById("result-msg").textContent =
      "こども " + kidPct + "%　パパ・ママ " + parPct + "%";
    document.getElementById("vs-final").innerHTML =
      "<div class='vs-col'><span class='vs-who'>こども</span><span class='vs-num'>" + kidPct + "%</span><span class='vs-sub'>" + c.kidOk + "／" + c.kidN + "</span></div>"
      + "<div class='vs-vs'>VS</div>"
      + "<div class='vs-col'><span class='vs-who'>パパ・ママ</span><span class='vs-num'>" + parPct + "%</span><span class='vs-sub'>" + c.parOk + "／" + c.parN + "</span></div>";
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
  function startBattle(mode) {
    const items = K.pickBattleItems(mode);
    if (items.length < K.ROUND) {
      K.toast("このモードは まだ あそべないよ");
      return;
    }
    quiz = { mode: mode, items: items, i: 0, log: [], token: Date.now() };
    show("quiz");
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
    document.getElementById("go-modes").addEventListener("click", () => {
      renderModes();
      show("modes");
    });
    document.getElementById("modes-back").addEventListener("click", () => {
      renderTitle();
      show("title");
    });
    document.getElementById("quiz-quit").addEventListener("click", quitQuiz);
    document.getElementById("score-go").addEventListener("click", () => {
      document.getElementById("score-dlg").classList.remove("on");
      if (quiz) renderQuestion();
    });
    document.getElementById("again").addEventListener("click", () => {
      renderModes();
      show("modes");
    });
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
