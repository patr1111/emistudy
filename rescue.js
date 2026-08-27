(function () {
  const K = window.Kirameki;
  const C = window.KiramekiChars;
  const W = window.KiramekiWorld;
  function tasteId() { return K.getSettings().taste || "kawaii"; }
  function places() { return W.rescuePlaces[tasteId()] || W.rescuePlaces.kawaii; }
  const TOTAL = K.ROUND, CHOICES = 6, TOOL_NEED = 7;
  let WORDS = [];
  let state = K.getRescue();
  let quiz = null;
  let roundToken = 0;
  function player() { return C.playerChar(); }
  function friend() { return C.friendChar(); }

  function persist() { K.saveRescue(state); }
  function show(id) {
    document.querySelectorAll(".screen").forEach((el) => el.classList.remove("on"));
    document.getElementById(id).classList.add("on");
  }
  function me() { return C.shownName(player()); }
  function pal() { return C.shownName(friend()); }
  function placeAt(i) {
    const list = places();
    return list[Math.min(Math.max(i, 0), list.length - 1)];
  }

  function statusOf(i) {
    if (i < state.stage) return "できた";
    if (i === state.stage && state.stage < 5) return "いまここ";
    return "まだ";
  }
  function renderMap() {
    const grid = document.getElementById("rescue-map");
    if (!grid) return;
    grid.innerHTML = "";
    places().forEach((place, i) => {
      const el = document.createElement("button");
      el.type = "button";
      const now = i === state.stage && state.stage < 5;
      const done = i < state.stage;
      const lock = i > state.stage;
      el.className = "path-stop" + (now ? " now" : "") + (done ? " done" : "") + (lock ? " lock" : "");
      el.innerHTML =
        "<span class='path-node'>" +
          "<span class='place-no'>" + (i + 1) + "</span>" +
          "<img src='img/" + place.scene + ".jpg' alt='' />" +
        "</span>" +
        "<span class='path-info'><span class='nm'>" + place.name + "</span>" +
        "<span class='st'>" + statusOf(i) + "</span></span>";
      if (done) {
        const redo = document.createElement("span");
        redo.className = "redo-btn";
        redo.textContent = "記録を消す";
        redo.addEventListener("click", (ev) => {
          ev.stopPropagation();
          redoFrom(i);
        });
        el.querySelector(".path-info").appendChild(redo);
        el.addEventListener("click", () => redoFrom(i));
      } else if (now) {
        el.addEventListener("click", () => startStage());
      } else {
        el.addEventListener("click", () => K.toast("まえのばしょから いこう"));
      }
      grid.appendChild(el);
    });
    const endingRow = document.getElementById("ending-row");
    if (endingRow) endingRow.hidden = state.stage < 5;
    updateOpenHint();
    layoutPath();
  }
  function layoutPath() {
    const wrap = document.querySelector(".path-map");
    const svg = document.getElementById("path-svg");
    if (!wrap || !svg) return;
    const nodes = wrap.querySelectorAll(".path-node");
    if (nodes.length < 2) return;
    const wr = wrap.getBoundingClientRect();
    const w = Math.max(1, Math.round(wr.width));
    const h = Math.max(1, Math.round(wr.height));
    svg.setAttribute("viewBox", "0 0 " + w + " " + h);
    svg.setAttribute("width", String(w));
    svg.setAttribute("height", String(h));
    const first = nodes[0].getBoundingClientRect();
    const cx = first.left + first.width / 2 - wr.left;
    const ys = [];
    nodes.forEach((n) => {
      const r = n.getBoundingClientRect();
      ys.push(r.top + r.height / 2 - wr.top);
    });
    const base = svg.querySelector(".path-svg-base");
    const done = svg.querySelector(".path-svg-done");
    if (base) {
      base.setAttribute("x1", String(cx));
      base.setAttribute("x2", String(cx));
      base.setAttribute("y1", String(ys[0]));
      base.setAttribute("y2", String(ys[ys.length - 1]));
    }
    if (done) {
      const di = Math.min(state.stage, ys.length - 1);
      done.setAttribute("x1", String(cx));
      done.setAttribute("x2", String(cx));
      done.setAttribute("y1", String(ys[0]));
      done.setAttribute("y2", String(ys[di]));
      done.setAttribute("opacity", state.stage > 0 ? "1" : "0");
    }
  }
  function redoFrom(i) {
    if (i >= state.stage) return;
    if (!confirm(placeAt(i).name + "の記録を消す？この先のクリアも消えるよ。まちがいリストはそのまま残るよ。")) return;
    const ens = [];
    (state.stageEns || []).slice(i).forEach((arr) => {
      (arr || []).forEach((en) => ens.push(en));
    });
    if (ens.length) K.unClearEns(ens);
    else K.unClearLast(TOTAL * (state.stage - i));
    state.stage = i;
    state.tools = (state.tools || []).slice(0, i);
    state.stageEns = (state.stageEns || []).slice(0, i);
    persist();
    K.toast(placeAt(i).name + "の記録を消したよ");
    renderMap();
  }
  function updateOpenHint() {
    const hint = document.getElementById("open-redo-hint");
    if (!hint) return;
    if (state.stage >= 5) {
      hint.textContent = "5つのばしょ おわったよ。できたばしょの「記録を消す」でもう一度できるよ。";
    } else if (state.stage > 0) {
      hint.textContent = "できたばしょの「記録を消す」を押すと、そこからもう一度できるよ。";
    } else {
      hint.textContent = "かがやいてるばしょから、ひとつずつ いこう。";
    }
  }
  async function renderFaces(boxId) {
    const html = [
      await C.faceHtml(player(), "normal", 100) + "<div class='buddy-name'>" + me() + "</div>",
      await C.faceHtml(friend(), "normal", 100) + "<div class='buddy-name'>" + pal() + "</div>"
    ].map((h) => "<div class='buddy-wrap'>" + h + "</div>").join("");
    document.getElementById(boxId).innerHTML = html;
  }
  function renderGauge() {
    const g = document.getElementById("gauge");
    g.innerHTML = "";
    for (let i = 0; i < TOTAL; i++) {
      const d = document.createElement("div");
      if (quiz && i < quiz.log.length) {
        d.className = "gdot on" + (quiz.log[i].ok ? "" : "bad");
        d.textContent = quiz.log[i].ok ? "★" : "💧";
      } else {
        d.className = "gdot" + (quiz && i === quiz.i ? " on" : "");
        d.textContent = quiz && i === quiz.i ? "▶" : "";
      }
      g.appendChild(d);
    }
  }
  function renderQuestion() {
    const w = quiz.items[quiz.i];
    document.getElementById("english").textContent = w.en;
    const playBanner = document.querySelector("#play-banner img");
    if (playBanner) playBanner.src = "img/" + placeAt(state.stage).scene + ".jpg";
    renderGauge();
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
  function flash(ok, w) {
    const el = document.getElementById("react");
    document.getElementById("react-burst").textContent = ok ? "○ せいかい" : "× まちがい";
    document.getElementById("react-en").textContent = w.en;
    document.getElementById("react-ja").innerHTML = (ok ? "" : "正解は<br>") + K.jaHtml(w);
    el.className = "react on " + (ok ? "ok" : "ng");
    const t = K.flashTimes(ok);
    setTimeout(() => { el.className = "react"; }, t.flash);
  }
  function onChoose(btn, opt, w) {
    const ok = opt.en === w.en;
    const token = quiz.token;
    document.querySelectorAll(".choice").forEach((el) => {
      el.disabled = true;
      if (el.dataset.en === w.en) el.classList.add("ok");
    });
    if (!ok) btn.classList.add("ng");
    if (ok) quiz.score += 1;
    K.recordAnswer(w.en, ok);
    quiz.log.push({ en: w.en, w: w, ok: ok });
    renderGauge();
    flash(ok, w);
    const t = K.flashTimes(ok);
    setTimeout(() => {
      if (!quiz || quiz.token !== token) return;
      quiz.i += 1;
      if (quiz.i >= quiz.items.length) finishStage();
      else renderQuestion();
    }, t.wait);
  }
  function goMap() {
    quiz = null;
    document.getElementById("react").className = "react";
    renderMap();
    show("opening");
  }
  function quitStage() {
    if (!quiz) {
      goMap();
      return;
    }
    if (!confirm("このばしょをやめる？答えた分のまちがいは残るよ。クリアにはならないよ。")) return;
    roundToken += 1;
    goMap();
  }
  async function finishStage() {
    if (!quiz) return;
    K.markCleared(quiz.items);
    const okN = quiz.score;
    const place = placeAt(state.stage);
    const resultBanner = document.querySelector("#result .quiz-banner img");
    if (resultBanner) resultBanner.src = "img/" + place.scene + ".jpg";
    let msg = okN + "もん できたよ。";
    if (okN >= TOOL_NEED) {
      if (!state.tools.includes(place.tool)) state.tools.push(place.tool);
      msg += place.tool + " をてにいれた！";
    } else {
      msg += "どうぐは つぎに がんばろう。";
    }
    state.stageEns = state.stageEns || [];
    state.stageEns[state.stage] = quiz.items.map((w) => w.en);
    state.stage += 1;
    persist();
    K.maybeAutoExport();
    await renderFaces("result-faces");
    document.getElementById("score-big").textContent = "★".repeat(okN);
    document.getElementById("score-big").style.fontSize = "1.6rem";
    document.getElementById("result-msg").textContent = msg;
    document.getElementById("result-review").innerHTML = quiz.log.map((x) =>
      "<div class='miss-row'><span>" + K.esc(x.en) + "</span><span class='ja'>" + (x.ok ? "○ " : "× ") + K.esc(K.jaText(x.w)).replace(/\n/g, "<br>") + "</span></div>"
    ).join("");
    K.showPrize(document.querySelector("#result .prize"), K.allWordsCleared(), "rescue");
    const nextBtn = document.getElementById("next-stage");
    nextBtn.textContent = state.stage >= 5 ? "おわりを見る" : "マップへ";
    show("result");
  }
  async function startStage() {
    if (state.stage >= 5) {
      await showEnding();
      return;
    }
    if (WORDS.length < CHOICES) {
      K.toast("単語がたりないよ");
      return;
    }
    const items = K.nextRoundItems();
    if (!items.length) {
      K.toast("出る単語がもうないよ");
      return;
    }
    document.getElementById("stageTitle").textContent = placeAt(state.stage).name;
    roundToken += 1;
    quiz = { items: items, i: 0, log: [], score: 0, token: roundToken };
    await renderFaces("play-faces");
    show("play");
    renderQuestion();
  }
  async function showEnding() {
    await renderFaces("end-faces");
    document.getElementById("end-story").textContent =
      me() + "は " + pal() + " のところまでついた。" + pal() + "はにっこりして、「ありがとう！」といった。";
    K.showPrize(document.querySelector("#ending .prize"), true, "rescue");
    show("ending");
  }
  async function boot() {
    WORDS = K.wordQueue();
    document.getElementById("title-level").textContent =
      K.levelsLabel() + "　残り " + K.unclearedWords().length + " / " + WORDS.length + "ご";
    document.getElementById("open-story").textContent = pal() + "の ところまで、ばしょを ひとつずつ いこう。";
    await renderFaces("open-faces");
    renderMap();
    if (!WORDS.length) K.toast("この級の単語がまだないよ。管理画面で級を変えてね");
    document.getElementById("play-quit").addEventListener("click", quitStage);
    document.getElementById("next-stage").addEventListener("click", async () => {
      if (state.stage >= 5) await showEnding();
      else goMap();
    });
    document.getElementById("see-ending").addEventListener("click", () => showEnding());
    document.getElementById("result-save").addEventListener("click", () => K.downloadMissExcel());
    document.getElementById("end-save").addEventListener("click", () => K.downloadMissExcel());
    document.getElementById("result-home").addEventListener("click", goMap);
    document.getElementById("end-home").addEventListener("click", goMap);
    window.addEventListener("resize", layoutPath);
    const guideGo = document.getElementById("guide-go");
    if (guideGo) guideGo.addEventListener("click", () => setTimeout(layoutPath, 40));
    K.bindGuide("rescue");
  }
  boot();
})();
