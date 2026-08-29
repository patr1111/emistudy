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
  function cursor() {
    if (K.allWordsCleared()) {
      const last = Math.max(0, K.placeCount() - 1);
      const info = K.placeStepInfo(last);
      return { shopPlace: last, step: info.need, need: info.need, allDone: true };
    }
    const shopPlace = K.unlockedPlace();
    const info = K.placeStepInfo(shopPlace);
    return { shopPlace: shopPlace, step: info.doneRounds, need: info.need, allDone: false };
  }
  function livePlace() {
    return (quiz && typeof quiz.place === "number") ? quiz.place : cursor().step;
  }
  function renderMap() {
    const grid = document.getElementById("rescue-map");
    if (!grid) return;
    grid.innerHTML = "";
    const cur = cursor();
    const jm = document.getElementById("journey-marks");
    if (jm) {
      jm.innerHTML = K.marksRowHtml(places().map((place, i) => ({
        mark: place.mark || "●",
        done: cur.allDone || i < cur.step,
        now: !cur.allDone && i === cur.step && i < cur.need
      })));
    }
    places().forEach((place, i) => {
      const el = document.createElement("button");
      el.type = "button";
      const now = !cur.allDone && i === cur.step && i < cur.need;
      const done = cur.allDone || i < cur.step;
      const lock = !done && !now;
      el.className = "path-stop" + (now ? " now" : "") + (done ? " done" : "") + (lock ? " lock" : "");
      el.innerHTML =
        "<span class='path-node'>" +
          "<span class='place-no'>" + (i + 1) + "</span>" +
          "<img src='img/" + place.scene + ".jpg' alt='' />" +
        "</span>" +
        "<span class='path-info'><span class='nm'>" + place.name + "</span>" +
        "<span class='st'>" + K.marksRowHtml([{ mark: place.mark || "●", done: done, now: now }]) + "</span></span>";
      if (done && (!cur.allDone || i < cur.need)) {
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
    if (endingRow) endingRow.hidden = !cur.allDone;
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
      const di = Math.min(cursor().step, ys.length - 1);
      done.setAttribute("x1", String(cx));
      done.setAttribute("x2", String(cx));
      done.setAttribute("y1", String(ys[0]));
      done.setAttribute("y2", String(ys[di]));
      done.setAttribute("opacity", cursor().step > 0 || cursor().allDone ? "1" : "0");
    }
  }
  function redoFrom(i) {
    const cur = cursor();
    if (!cur.allDone && i >= cur.step) return;
    if (!confirm(placeAt(i).name + "の記録を消す？この先のクリアも消えるよ。おかいものの同じ場所も戻るよ。まちがいリストはそのまま残るよ。")) return;
    K.unClearPlaceFromStep(cur.shopPlace, i);
    state.tools = (state.tools || []).slice(0, i);
    persist();
    K.toast(placeAt(i).name + "の記録を消したよ");
    renderMap();
  }
  function updateOpenHint() {
    const hint = document.getElementById("open-redo-hint");
    if (!hint) return;
    const cur = cursor();
    if (cur.allDone) {
      hint.textContent = "全部できたよ。できたばしょの「記録を消す」でもう一度できるよ。";
    } else if (cur.step > 0) {
      hint.textContent = "おかいものも おなじ すすみだよ。できたばしょの「記録を消す」で、そこからもう一度できるよ。";
    } else {
      hint.textContent = "おかいものも おなじ すすみだよ。かがやいてるばしょから、ひとつずつ いこう。";
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
    const mark = (quiz && quiz.review) ? "💌" : ((placeAt(livePlace()).mark) || "★");
    const g = document.getElementById("gauge");
    g.innerHTML = "";
    for (let i = 0; i < TOTAL; i++) {
      const d = document.createElement("div");
      if (quiz && i < quiz.log.length) {
        d.className = "gdot on" + (quiz.log[i].ok ? "" : " bad");
        d.textContent = quiz.log[i].ok ? mark : "💧";
      } else {
        d.className = "gdot" + (quiz && i === quiz.i ? " on" : "");
        d.textContent = quiz && i === quiz.i ? mark : "";
      }
      g.appendChild(d);
    }
  }
  function renderQuestion() {
    const w = quiz.items[quiz.i];
    document.getElementById("english").textContent = w.en;
    const ex = document.getElementById("example");
    if (ex) ex.innerHTML = K.exampleHtml(w);
    K.setSpeakText(w.en, w.ex || "");
    const playBanner = document.querySelector("#play-banner img");
    if (playBanner) playBanner.src = quiz.review ? "img/illust-rescue.jpg" : ("img/" + placeAt(livePlace()).scene + ".jpg");
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
  async function flash(ok, w) {
    const el = document.getElementById("react");
    const face = document.getElementById("react-face");
    if (face) {
      face.innerHTML =
        await C.faceHtml(player(), ok ? "happy" : "sad", 140) +
        await C.faceHtml(friend(), ok ? "happy" : "sad", 140);
    }
    const cheers = W.rescueCheers || ["その調子！", "いい感じ！"];
    document.getElementById("react-burst").textContent = ok
      ? cheers[Math.floor(Math.random() * cheers.length)]
      : "";
    document.getElementById("react-en").textContent = w.en;
    document.getElementById("react-ja").innerHTML = (ok ? "" : "正解は<br>") + K.jaHtml(w);
    el.className = "react on " + (ok ? "ok" : "ng");
    await K.waitReact(K.flashTimes(ok).wait);
  }

  async function onChoose(btn, opt, w) {
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
    await flash(ok, w);
    if (!quiz || quiz.token !== token) return;
    quiz.i += 1;
    if (quiz.i >= quiz.items.length) finishStage();
    else renderQuestion();
  }
  function goMap() {
    quiz = null;
    K.setSpeakText("", "");
    document.getElementById("react").className = "react";
    renderMap();
    show("opening");
  }
  function goMiss() {
    quiz = null;
    K.setSpeakText("", "");
    document.getElementById("react").className = "react";
    renderMiss();
    show("miss");
  }
  function quitStage() {
    if (!quiz) {
      goMap();
      return;
    }
    if (!confirm("このばしょをやめる？答えた分のまちがいは残るよ。クリアにはならないよ。")) return;
    roundToken += 1;
    if (quiz.review) goMiss();
    else goMap();
  }
  function renderMiss() {
    const rows = K.missEntries();
    const count = document.getElementById("miss-count");
    if (count) count.textContent = rows.length + "ご";
    const list = document.getElementById("miss-list");
    if (!list) return;
    list.innerHTML = rows.length
      ? rows.map((r) => "<div class='miss-row'><span>" + K.esc(r.en) + "</span><span class='ja'>" + K.esc(r.ja).replace(/\n/g, "<br>") + "</span><span>×" + r.wrong + "</span></div>").join("")
      : "まだ まちがいは ないよ。";
  }
  async function startReview() {
    const items = K.missEntries().slice(0, TOTAL).map((r) => r.w).filter(Boolean);
    if (!items.length) { K.toast("まだ まちがいは ないよ"); return; }
    document.getElementById("stageTitle").textContent = "たすけてリスト";
    roundToken += 1;
    quiz = { items: items, i: 0, log: [], score: 0, token: roundToken, review: true };
    await renderFaces("play-faces");
    show("play");
    renderQuestion();
  }
  async function finishStage() {
    if (!quiz) return;
    const review = !!quiz.review;
    const okN = quiz.score;
    const place = placeAt(livePlace());
    const resultBanner = document.querySelector("#result .quiz-banner img");
    if (resultBanner) resultBanner.src = review ? "img/illust-rescue.jpg" : ("img/" + place.scene + ".jpg");
    if (!review) {
      K.markCleared(quiz.items);
      let msg = okN + "もん できたよ。";
      if (okN >= TOOL_NEED) {
        if (!state.tools.includes(place.tool)) state.tools.push(place.tool);
        msg += place.tool + " をてにいれた！";
      } else {
        msg += "どうぐは つぎに がんばろう。";
      }
      persist();
      K.maybeAutoExport();
      document.getElementById("result-msg").textContent = msg;
      document.getElementById("score-big").textContent = (place.mark || "★").repeat(okN);
    } else {
      document.getElementById("result-msg").textContent = okN + "もん できたよ。";
      document.getElementById("score-big").textContent = "💌".repeat(okN);
    }
    await renderFaces("result-faces");
    document.getElementById("score-big").style.fontSize = "1.6rem";
    document.getElementById("result-review").innerHTML = quiz.log.map((x) =>
      "<div class='miss-row'><span>" + K.esc(x.en) + "</span><span class='ja'>" + (x.ok ? "○ " : "× ") + K.esc(K.jaText(x.w)).replace(/\n/g, "<br>") + "</span></div>"
    ).join("");
    K.showPrize(document.querySelector("#result .prize"), !review && K.allWordsCleared(), "rescue");
    const nextBtn = document.getElementById("next-stage");
    nextBtn.textContent = review ? "リストへ" : (K.allWordsCleared() ? "おわりを見る" : "マップへ");
    show("result");
  }
  async function startStage() {
    const cur = cursor();
    if (cur.allDone) {
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
    document.getElementById("stageTitle").textContent = placeAt(cur.step).name;
    roundToken += 1;
    quiz = { items: items, i: 0, log: [], score: 0, token: roundToken, place: cur.step, shopPlace: cur.shopPlace };
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
    document.getElementById("open-story").textContent = pal() + "の ところまで、ばしょを ひとつずつ いこう。おかいものも おなじ すすみだよ。";
    await renderFaces("open-faces");
    renderMap();
    if (!WORDS.length) K.toast("この級の単語がまだないよ。管理画面で級を変えてね");
    document.getElementById("play-quit").addEventListener("click", quitStage);
    document.getElementById("next-stage").addEventListener("click", async () => {
      if (quiz && quiz.review) {
        goMiss();
        return;
      }
      if (K.allWordsCleared()) await showEnding();
      else goMap();
    });
    document.getElementById("see-ending").addEventListener("click", () => showEnding());
    document.getElementById("result-save").addEventListener("click", () => K.downloadMissExcel());
    document.getElementById("end-save").addEventListener("click", () => K.downloadMissExcel());
    document.getElementById("result-home").addEventListener("click", goMap);
    document.getElementById("end-home").addEventListener("click", goMap);
    document.getElementById("go-miss").addEventListener("click", () => { renderMiss(); show("miss"); });
    document.getElementById("miss-back").addEventListener("click", goMap);
    document.getElementById("miss-save").addEventListener("click", () => K.downloadMissExcel());
    document.getElementById("review-start").addEventListener("click", () => startReview());
    document.getElementById("save-xls").addEventListener("click", () => K.downloadMissExcel());
    window.addEventListener("resize", layoutPath);
    const guideGo = document.getElementById("guide-go");
    if (guideGo) guideGo.addEventListener("click", () => setTimeout(layoutPath, 40));
    K.bindSpeakButtons();
    C.preloadMoods();
    K.bindGuide("rescue");
  }
  boot();
})();
