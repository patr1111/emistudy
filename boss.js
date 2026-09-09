(function () {
  const K = window.Kirameki;
  const C = window.KiramekiChars;
  const W = window.KiramekiWorld;
  const CHOICES = 6;
  let quiz = null;
  let roundToken = 0;

  function tasteId() { return (K.getSettings().taste) || "kawaii"; }
  function titles() { return (W.bossTitles && W.bossTitles[tasteId()]) || W.bossTitles.kawaii; }
  function sceneSrc() {
    const key = (W.bossScenes && W.bossScenes[tasteId()]) || "illust-boss";
    return "img/" + key + ".jpg";
  }
  function storyText() {
    return (W.bossStories && W.bossStories[tasteId()]) || W.bossStories.kawaii;
  }
  function show(id) {
    document.querySelectorAll(".screen").forEach((el) => el.classList.remove("on"));
    document.getElementById(id).classList.add("on");
  }
  function nm(c) { return C.shownName(c); }
  function player() { return C.playerChar(); }
  function shuffleCopy(list) {
    const a = (list || []).slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }
  function missWords() { return K.missWordItems(); }
  function uniqueLeft() {
    if (!quiz) return 0;
    return new Set(quiz.queue.map((w) => w.en)).size;
  }
  function insertLater(queue, w) {
    if (!queue.length) {
      queue.push(w);
      return;
    }
    const delay = Math.min(queue.length, 2 + Math.floor(Math.random() * 3));
    queue.splice(delay, 0, w);
  }
  function wordMap() {
    const m = {};
    K.allWords().forEach((w) => { m[w.en] = w; });
    return m;
  }
  function stillWrongSet() {
    return new Set(missWords().map((w) => w.en));
  }
  function clearSavedRun() {
    K.saveGame("boss", { run: null });
  }
  function saveRun() {
    if (!quiz || !quiz.queue.length) return;
    K.saveGame("boss", {
      run: {
        queueEns: quiz.queue.map((w) => w.en),
        log: quiz.log.map((x) => ({ en: x.en, ok: !!x.ok })),
        phases: quiz.phases || { p1: false, p2: false },
        peakHp: quiz.startN || uniqueLeft(),
        startN: quiz.startN || uniqueLeft()
      }
    });
  }
  function leftoverEns(raw) {
    if (!raw || !Array.isArray(raw.queueEns) || !raw.queueEns.length) return [];
    const still = stillWrongSet();
    return raw.queueEns.filter((en) => still.has(en));
  }
  function hasSavedRun() {
    return leftoverEns((K.getGame("boss") || {}).run).length > 0;
  }
  function extraMissWords(queue) {
    const inQ = new Set((queue || []).map((w) => w.en));
    return shuffleCopy(missWords().filter((w) => w && !inQ.has(w.en)));
  }
  function buildSavedQuiz() {
    const raw = (K.getGame("boss") || {}).run;
    const left = leftoverEns(raw);
    if (!left.length) return null;
    const byEn = wordMap();
    const queue = left.map((en) => byEn[en]).filter(Boolean);
    if (!queue.length) return null;
    const extras = extraMissWords(queue);
    const log = (raw.log || []).map((x) => ({ en: x.en, ok: !!x.ok, w: byEn[x.en] || { en: x.en } }));
    return {
      queue: queue,
      extras: extras,
      startN: new Set(queue.map((w) => w.en)).size,
      log: log,
      token: ++roundToken,
      phases: raw.phases || { p1: false, p2: false }
    };
  }

  function hpMax() {
    const done = (K.rosterStats() || {}).done || 0;
    const left = uniqueLeft();
    return Math.max(done, left, 1);
  }
  function renderHp() {
    const left = uniqueLeft();
    const maxHp = hpMax();
    const lab = document.getElementById("hp-lab");
    const pill = document.getElementById("q-hp");
    const fill = document.getElementById("hp-fill");
    if (lab) lab.textContent = "敵の体力";
    if (pill) pill.textContent = "のこり " + left;
    if (fill) fill.style.width = Math.max(0, Math.min(100, Math.round((left / maxHp) * 100))) + "%";
  }

  async function setBuddyMood(mood) {
    const wrap = document.getElementById("buddy-wrap");
    wrap.className = "buddy-wrap " + (mood || "");
    wrap.innerHTML = await C.faceHtml(player(), mood || "normal", 120)
      + "<div class='buddy-name' id='buddy-line'></div>";
    document.getElementById("buddy-line").textContent = nm(player()) + "の しれん";
  }

  function renderQuestion() {
    const w = quiz.queue[0];
    document.getElementById("q-place").textContent = titles().title;
    const banner = document.querySelector("#quiz-banner img");
    if (banner) banner.src = sceneSrc();
    renderHp();
    setBuddyMood("normal");
    document.getElementById("english").textContent = w.en;
    const ex = document.getElementById("example");
    if (ex) ex.innerHTML = K.exampleHtml(w);
    K.setSpeakText(w.en, w.ex || "");
    const pool = K.filteredWords().length >= CHOICES ? K.filteredWords() : K.allWords();
    const box = document.getElementById("choices");
    box.innerHTML = "";
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
    if (face) face.innerHTML = await C.faceHtml(player(), ok ? "happy" : "sad", 160);
    document.getElementById("react-burst").textContent = ok ? "たおした！" : "次は勝つぞ！";
    document.getElementById("react-en").textContent = w.en;
    document.getElementById("react-ja").innerHTML = (ok ? "" : "正解は<br>") + K.jaHtml(w);
    el.className = "react on " + (ok ? "ok" : "ng");
    await K.waitReact(K.flashTimes(ok).wait);
  }

  function maybePhase() {
    const start = quiz ? quiz.startN : 0;
    if (!quiz || start < 4) return "";
    const left = uniqueLeft();
    const beaten = start - left;
    const p1 = Math.ceil(start / 3);
    const p2 = Math.ceil(start * 2 / 3);
    if (!quiz.phases.p1 && beaten >= p1 && left > 0) {
      quiz.phases.p1 = true;
      return "三分の一 たおした！　まだ終わらない！";
    }
    if (!quiz.phases.p2 && beaten >= p2 && left > 0) {
      quiz.phases.p2 = true;
      return "三分の二 たおした！　さいごまで！";
    }
    return "";
  }

  function showPhase(text) {
    return new Promise((resolve) => {
      const box = document.getElementById("phase");
      document.getElementById("phase-text").textContent = text;
      const go = document.getElementById("phase-go");
      const onGo = () => {
        go.removeEventListener("click", onGo);
        box.classList.remove("on");
        resolve();
      };
      go.addEventListener("click", onGo);
      box.classList.add("on");
    });
  }

  async function onChoose(btn, opt, w) {
    const ok = opt.en === w.en;
    const token = quiz.token;
    document.querySelectorAll(".choice").forEach((el) => {
      el.disabled = true;
      if (el.dataset.en === w.en) el.classList.add("ok");
    });
    if (!ok) btn.classList.add("ng");
    K.recordAnswer(w.en, ok);
    quiz.log.push({ en: w.en, w: w, ok: ok });
    quiz.queue.shift();
    if (!ok) insertLater(quiz.queue, w);
    if (quiz.queue.length) saveRun();
    else clearSavedRun();
    renderHp();
    setBuddyMood(ok ? "happy" : "sad");
    await flash(ok, w);
    if (!quiz || quiz.token !== token) return;
    const phase = maybePhase();
    if (phase) await showPhase(phase);
    if (!quiz || quiz.token !== token) return;
    if (!quiz.queue.length) finishBoss();
    else renderQuestion();
  }

  async function finishBoss() {
    if (!quiz) return;
    clearSavedRun();
    const okN = quiz.log.filter((x) => x.ok).length;
    const ngN = quiz.log.filter((x) => !x.ok).length;
    const left = missWords().length;
    K.maybeAutoExport();
    document.getElementById("result-banner").src = sceneSrc();
    document.getElementById("result-buddy").innerHTML =
      await C.faceHtml(player(), left === 0 ? "happy" : "sad", 100)
      + "<div class='buddy-name'>" + nm(player()) + "</div>";
    document.getElementById("score-big").textContent = left === 0 ? "CLEAR" : ("のこり " + left);
    document.getElementById("result-msg").textContent = left === 0
      ? "ことばを 全部 たおしたよ。"
      : ("せいかい " + okN + "　まちがい " + ngN);
    K.showPrize(document.querySelector("#result .prize"), left === 0, "boss");
    document.getElementById("result-review").innerHTML = quiz.log.map((x) =>
      "<div class='miss-row'><span>" + K.esc(x.en) + "</span><span class='ja'>" + (x.ok ? "○ " : "× ") + K.esc(K.jaText(x.w)).replace(/\n/g, "<br>") + "</span></div>"
    ).join("");
    show("result");
  }

  function pauseBoss() {
    if (quiz && quiz.queue.length) saveRun();
    K.downloadMissExcel();
    roundToken += 1;
    quiz = null;
    K.setSpeakText("", "");
    document.getElementById("react").className = "react";
    bootTitle();
    show("title");
  }

  function startBoss() {
    const items = shuffleCopy(missWords());
    if (!items.length) {
      K.toast("いままちがえている単語がないよ");
      bootTitle();
      show("title");
      return;
    }
    quiz = {
      queue: items.slice(),
      startN: items.length,
      log: [],
      token: ++roundToken,
      phases: { p1: false, p2: false }
    };
    saveRun();
    show("quiz");
    renderQuestion();
  }
  async function resumeBoss() {
    const next = buildSavedQuiz();
    if (!next) {
      clearSavedRun();
      K.toast("つづきがないよ");
      bootTitle();
      show("title");
      return;
    }
    const extras = next.extras || [];
    const extraN = new Set(extras.map((w) => w.en)).size;
    quiz = {
      queue: next.queue,
      startN: next.startN,
      log: next.log,
      token: next.token,
      phases: next.phases
    };
    saveRun();
    show("quiz");
    renderQuestion();
    if (!extraN) return;
    await showPhase("てきは" + extraN + "人の仲間を呼んだ");
    if (!quiz || quiz.token !== next.token) return;
    extras.forEach((w) => quiz.queue.push(w));
    quiz.startN = uniqueLeft();
    renderHp();
    saveRun();
  }

  function openStory() {
    const items = missWords();
    if (!items.length) {
      K.toast("いままちがえている単語がないよ");
      return;
    }
    document.getElementById("story-img").src = sceneSrc();
    document.getElementById("story-text").textContent = nm(player()) + "、" + storyText();
    document.getElementById("story").classList.add("on");
  }

  function bootTitle() {
    const t = titles();
    document.getElementById("title-kicker").textContent = t.kicker;
    document.getElementById("title-h").textContent = t.title;
    document.getElementById("title-illust").src = sceneSrc();
    if (!hasSavedRun() && (K.getGame("boss") || {}).run) clearSavedRun();
    const n = missWords().length;
    const resume = hasSavedRun();
    document.getElementById("title-level").textContent =
      K.levelsLabel() + "　まちがい " + n + "ご" + (resume ? "　つづきあり" : "");
    const lock = document.getElementById("lock-box");
    const start = document.getElementById("start-box");
    const btn = document.getElementById("go-start");
    lock.hidden = n > 0;
    start.hidden = n === 0;
    if (btn) btn.textContent = resume ? "つづける" : "しれんに いどむ";
  }

  function boot() {
    bootTitle();
    document.getElementById("go-start").addEventListener("click", () => {
      if (hasSavedRun()) resumeBoss();
      else openStory();
    });
    document.getElementById("story-go").addEventListener("click", () => {
      document.getElementById("story").classList.remove("on");
      startBoss();
    });
    document.getElementById("quiz-quit").addEventListener("click", pauseBoss);
    document.getElementById("quiz-later").addEventListener("click", pauseBoss);
    document.querySelector("#quiz a[href='index.html']").addEventListener("click", () => {
      if (quiz && quiz.queue.length) saveRun();
    });
    window.addEventListener("pagehide", () => {
      if (quiz && quiz.queue.length) saveRun();
    });
    document.getElementById("result-home").addEventListener("click", () => {
      bootTitle();
      show("title");
    });
    document.getElementById("result-again").addEventListener("click", () => {
      bootTitle();
      if (missWords().length) openStory();
      else show("title");
    });
    document.getElementById("result-save").addEventListener("click", () => K.downloadMissExcel());
    K.bindSpeakButtons();
    K.bindGuide("boss");
  }
  boot();
})();
