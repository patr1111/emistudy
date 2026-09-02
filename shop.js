(function () {
  const K = window.Kirameki;
  const C = window.KiramekiChars;
  const ROUND = K.ROUND, PLACE_SIZE = K.PLACE_SIZE, CHOICES = 6;
  const W = window.KiramekiWorld;
  function tasteId() { return (K.getSettings().taste) || "kawaii"; }
  function shopPlaces() { return W.shopPlaces[tasteId()] || W.shopPlaces.kawaii; }
  function shopScenes() { return W.shopScenes[tasteId()] || W.shopScenes.kawaii; }
  function shopStories() { return W.shopStories[tasteId()] || W.shopStories.kawaii; }
  function giftSrc() { return "img/" + (W.giftScene[tasteId()] || W.giftScene.kawaii) + ".jpg"; }
  function sceneSrc(p) {
    const sc = shopScenes();
    return "img/" + sc[(p || 0) % sc.length] + ".jpg";
  }

  let WORDS = [];
  let extra = K.getShop();
  let quiz = null;
  let pendingTrip = null;
  let roundToken = 0;

  function placeRow(p) {
    const list = shopPlaces();
    return list[(p || 0) % list.length] || ["ばしょ", "⭐", "スター"];
  }
  function placeMark(p) {
    return quiz && quiz.review ? "💌" : placeRow(p)[1];
  }
  function placeGet(p) {
    return quiz && quiz.review ? "スター" : (placeRow(p)[2] || "アイテム");
  }
  function pl(p) {
    const row = placeRow(p);
    return row[1] + " " + row[0];
  }
  function show(id) {
    document.querySelectorAll(".screen").forEach((el) => el.classList.remove("on"));
    document.getElementById(id).classList.add("on");
  }
  function persist() { K.saveShop(extra); }
  function nm(c) { return C.shownName(c); }

  function renderMap() {
    const range = K.shopPlaceRange();
    const open = K.unlockedPlace();
    const mark = { kawaii: "🎀", kakkoii: "⚡", cool: "◆" }[tasteId()] || "🎀";
    const lvEl = document.getElementById("map-lv");
    if (lvEl) lvEl.textContent = "Lv" + K.levelDisplay();
    document.getElementById("map-stat").textContent = mark + " " + Math.floor((K.getProgress().clearedEns || []).length / ROUND) + " ／ まちがい " + K.missEntries().length;
    const grid = document.getElementById("map-grid");
    grid.innerHTML = "";
    const cleared = new Set(K.getProgress().clearedEns || []);
    for (let p = range.start; p < range.end; p++) {
      const info = K.placeStepInfo(p);
      const anyDone = info.slice.some((w) => cleared.has(w.en));
      const fullyDone = info.slice.length > 0 && info.doneRounds >= info.need;
      const el = document.createElement("button");
      el.type = "button";
      el.className = "place" + (p > open ? " lock" : "") + (p === open ? " now" : "") + (fullyDone ? " done" : "");
      el.innerHTML = "<img class='place-img' src='" + sceneSrc(p) + "' alt='' /><div class='place-cap'><div class='nm'>" + placeRow(p)[0] + "</div><div class='st'>" + K.stepMarksHtml(placeRow(p)[1], info.doneRounds, info.need) + "</div></div>";
      if (anyDone) {
        const redo = document.createElement("span");
        redo.className = "redo-btn";
        redo.textContent = "記録を消す";
        redo.addEventListener("click", (ev) => {
          ev.stopPropagation();
          redoPlace(p);
        });
        el.appendChild(redo);
      }
      if (p <= open && !fullyDone) el.addEventListener("click", () => openPick(p));
      grid.appendChild(el);
    }
    K.renderMapPrize(document.getElementById("map-prize"), "shop");
  }
  function closeRedoDlg() {
    const dlg = document.getElementById("redo-dlg");
    if (dlg) dlg.classList.remove("on");
  }
  function redoPlace(place) {
    const info = K.placeStepInfo(place);
    const cleared = new Set(K.getProgress().clearedEns || []);
    const anyDone = info.slice.some((w) => cleared.has(w.en));
    if (!anyDone) return;
    const dlg = document.getElementById("redo-dlg");
    const text = document.getElementById("redo-text");
    const box = document.getElementById("redo-btns");
    const name = placeRow(place)[0];
    text.textContent = name + "は " + info.need + "こ あるよ。どのステップまで消す？選んだところから あとを消すよ。まちがいリストは残るよ。";
    box.innerHTML = "";
    const maxStep = info.doneRounds > 0 ? info.doneRounds : 1;
    for (let s = 0; s < maxStep; s++) {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "btn";
      b.textContent = (s === 0 ? "1こめから全部" : (s + 1) + "こめから");
      b.addEventListener("click", () => {
        closeRedoDlg();
        K.unClearPlaceFromStep(place, s);
        extra.ribbons = Math.floor((K.getProgress().clearedEns || []).length / ROUND);
        persist();
        K.toast((s + 1) + "こめから消したよ");
        renderMap();
      });
      box.appendChild(b);
    }
    dlg.classList.add("on");
  }

  async function openPick(place, customWords) {
    document.getElementById("pick-place").textContent = customWords ? "たすけてリスト" : pl(place);
    const banner = document.querySelector("#pick-banner img");
    if (banner) banner.src = customWords ? giftSrc() : sceneSrc(place);
    const grid = document.getElementById("char-grid");
    grid.innerHTML = "";
    for (const c of C.shopChars()) {
      const el = document.createElement("button");
      el.type = "button";
      el.className = "char-card";
      el.innerHTML = await C.faceHtml(c, "normal", 88) + "<div class='nm'>" + nm(c) + "</div>";
      el.addEventListener("click", () => {
        if (!customWords) extra.buddyByPlace[place] = c.id;
        persist();
        beginTrip(place, customWords, c);
      });
      grid.appendChild(el);
    }
    show("pick");
  }

  function startRound(place, customWords, buddy) {
    const items = customWords || K.itemsInPlace(place);
    if (!items.length) {
      K.toast("このばしょは もう終わっているよ");
      return;
    }
    roundToken += 1;
    quiz = {
      place, items, i: 0, log: [], review: !!customWords, buddy: buddy || C.shopChars()[0], token: roundToken,
      prefixBefore: K.queuePrefix()
    };
    show("quiz");
    renderQuestion();
  }
  function quitQuiz() {
    if (!quiz) return;
    if (!confirm("このステージをやめる？答えた分は本編ではもう出ないよ。まちがいはリストに残るよ。")) return;
    const review = quiz.review;
    roundToken += 1;
    quiz = null;
    K.setSpeakText("", "");
    document.getElementById("react").className = "react";
    if (review) {
      renderMiss();
      show("miss");
    } else {
      renderMap();
      show("map");
    }
  }

  function renderGauge() {
    const icon = placeMark(quiz.place);
    const g = document.getElementById("gauge");
    g.innerHTML = "";
    for (let i = 0; i < quiz.items.length; i++) {
      const d = document.createElement("div");
      if (i < quiz.log.length) {
        d.className = "gdot on" + (quiz.log[i].ok ? "" : " bad");
        d.textContent = quiz.log[i].ok ? icon : "💧";
      } else {
        d.className = "gdot" + (i === quiz.i ? " on" : "");
        d.textContent = i === quiz.i ? icon : "";
      }
      g.appendChild(d);
    }
  }

  async function setBuddyMood(mood) {
    const wrap = document.getElementById("buddy-wrap");
    wrap.className = "buddy-wrap " + (mood || "");
    wrap.innerHTML = await C.faceHtml(quiz.buddy, mood || "normal", 120)
      + "<div class='buddy-name' id='buddy-line'></div>";
    document.getElementById("buddy-line").textContent = nm(quiz.buddy) + "と お買い物";
  }

  function renderQuestion() {
    const w = quiz.items[quiz.i];
    document.getElementById("q-place").textContent = quiz.review ? "たすけてリスト" : pl(quiz.place);
    document.getElementById("q-buddy-pill").textContent = nm(quiz.buddy);
    const banner = document.querySelector("#quiz-banner img");
    if (banner) banner.src = quiz.review ? giftSrc() : sceneSrc(quiz.place);
    renderGauge();
    setBuddyMood("normal");
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
    if (face) face.innerHTML = await C.faceHtml(quiz.buddy, ok ? "happy" : "sad", 160);
    document.getElementById("react-burst").textContent = ok
      ? placeMark(quiz.place) + " " + placeGet(quiz.place) + "をゲット！"
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
    K.recordAnswer(w.en, ok);
    quiz.log.push({ en: w.en, w: w, ok: ok });
    renderGauge();
    setBuddyMood(ok ? "happy" : "sad");
    await flash(ok, w);
    if (!quiz || quiz.token !== token) return;
    quiz.i += 1;
    if (quiz.i >= quiz.items.length) finishRound();
    else renderQuestion();
  }

  async function finishRound() {
    if (!quiz) return;
    const okN = quiz.log.filter((x) => x.ok).length;
    if (!quiz.review) {
      const before = quiz.prefixBefore != null ? quiz.prefixBefore : K.queuePrefix();
      K.markCleared(quiz.items);
      extra.ribbons = Math.floor((K.getProgress().clearedEns || []).length / ROUND);
      persist();
      K.maybeAutoExport();
      const after = K.queuePrefix();
      const leveled = K.levelJustCleared(before, after);
      const up = document.getElementById("level-up-line");
      if (up) {
        up.hidden = !(leveled && !K.allWordsCleared());
        if (!up.hidden) up.textContent = "お買い物レベルが上がった！　Lv" + K.levelDisplay();
      }
    } else {
      const up = document.getElementById("level-up-line");
      if (up) up.hidden = true;
    }
    document.getElementById("result-buddy").innerHTML =
      await C.faceHtml(quiz.buddy, okN >= 7 ? "happy" : "sad", 100)
      + "<div class='buddy-name'>" + nm(quiz.buddy) + "</div>";
    const ico = placeMark(quiz.place);
    document.getElementById("score-big").textContent = ico.repeat(okN);
    document.getElementById("score-big").style.fontSize = "1.6rem";
    document.getElementById("result-msg").textContent = okN + "もん できたよ。";
    K.showPrize(document.querySelector("#result .prize"), K.allWordsCleared(), "shop");
    document.getElementById("result-review").innerHTML = quiz.log.map((x) =>
      "<div class='miss-row'><span>" + K.esc(x.en) + "</span><span class='ja'>" + (x.ok ? "○ " : "× ") + K.esc(K.jaText(x.w)).replace(/\n/g, "<br>") + "</span></div>"
    ).join("");
    show("result");
  }

  function renderMiss() {
    const rows = K.missEntries();
    document.getElementById("miss-count").textContent = rows.length + "ご";
    document.getElementById("miss-list").innerHTML = rows.length
      ? rows.map((r) => "<div class='miss-row'><span>" + K.esc(r.en) + "</span><span class='ja'>" + K.esc(r.ja).replace(/\n/g, "<br>") + "</span><span>×" + r.wrong + "</span></div>").join("")
      : "まだ まちがいは ないよ。";
  }

  function beginTrip(place, customWords, buddy) {
    pendingTrip = { place, customWords, buddy };
    const stories = shopStories();
    const s = stories[Math.floor(Math.random() * stories.length)];
    const img = document.getElementById("story-img");
    if (img) img.src = customWords ? giftSrc() : sceneSrc(place);
    document.getElementById("story-text").textContent = nm(buddy) + "と、" + s[1];
    document.getElementById("story").classList.add("on");
  }
  function goNextShopping() {
    const p = K.unlockedPlace();
    if (quiz && !quiz.review && quiz.buddy) beginTrip(p, null, quiz.buddy);
    else openPick(p);
  }

  function boot() {
    WORDS = K.wordQueue();
    document.getElementById("title-level").textContent =
      K.levelsLabel() + "　Lv" + K.levelDisplay() + "　残り " + K.unclearedWords().length + " / " + WORDS.length + "ご";
    if (!WORDS.length) K.toast("この級の単語がまだないよ。管理画面で級を変えてね");
    document.getElementById("story-go").addEventListener("click", () => {
      document.getElementById("story").classList.remove("on");
      const t = pendingTrip;
      if (t) startRound(t.place, t.customWords, t.buddy);
    });
    document.getElementById("quiz-quit").addEventListener("click", quitQuiz);
    document.getElementById("go-map").addEventListener("click", () => { renderMap(); show("map"); });
    document.getElementById("map-back").addEventListener("click", () => show("title"));
    document.getElementById("pick-back").addEventListener("click", () => { renderMap(); show("map"); });
    document.getElementById("go-miss").addEventListener("click", () => { renderMiss(); show("miss"); });
    document.getElementById("miss-back").addEventListener("click", () => show("title"));
    document.getElementById("redo-cancel").addEventListener("click", closeRedoDlg);
    document.getElementById("next-round").addEventListener("click", goNextShopping);
    document.getElementById("result-map").addEventListener("click", () => { renderMap(); show("map"); });
    document.getElementById("result-home").addEventListener("click", () => show("title"));
    ["save-xls", "result-save", "miss-save"].forEach((id) => {
      document.getElementById(id).addEventListener("click", () => K.downloadMissExcel());
    });
    document.getElementById("review-start").addEventListener("click", () => {
      const rows = K.missEntries().slice(0, ROUND).map((r) => r.w).filter(Boolean);
      if (!rows.length) { K.toast("まだ まちがいは ないよ"); return; }
      openPick(0, rows);
    });
    K.bindSpeakButtons();
    C.preloadMoods();
    K.bindGuide("shop");
  }
  boot();
})();
