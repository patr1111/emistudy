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

  function pl(p) {
    const row = shopPlaces()[p] || ["ばしょ", "🛒"];
    return row[1] + " " + row[0];
  }
  function show(id) {
    document.querySelectorAll(".screen").forEach((el) => el.classList.remove("on"));
    document.getElementById(id).classList.add("on");
  }
  function persist() { K.saveShop(extra); }
  function nm(c) { return C.shownName(c); }

  function renderMap() {
    const n = K.placeCount();
    const open = K.unlockedPlace();
    const mark = { kawaii: "🎀", kakkoii: "⚡", cool: "◆" }[tasteId()] || "🎀";
    document.getElementById("map-stat").textContent = mark + " " + Math.floor((K.getProgress().clearedEns || []).length / ROUND) + " ／ まちがい " + K.missEntries().length;
    const grid = document.getElementById("map-grid");
    grid.innerHTML = "";
    for (let p = 0; p < n; p++) {
      const slice = K.wordQueue().slice(p * PLACE_SIZE, (p + 1) * PLACE_SIZE);
      const done = new Set(K.getProgress().clearedEns || []);
      const doneN = slice.filter((w) => done.has(w.en)).length;
      const need = Math.ceil(slice.length / ROUND) || 1;
      const doneRounds = Math.floor(doneN / ROUND);
      const fullyDone = slice.length > 0 && doneN === slice.length;
      const el = document.createElement("button");
      el.type = "button";
      el.className = "place" + (p > open ? " lock" : "") + (p === open ? " now" : "") + (fullyDone ? " done" : "");
      el.innerHTML = "<img class='place-img' src='" + sceneSrc(p) + "' alt='' /><div class='place-cap'><div class='nm'>" + (shopPlaces()[p] ? shopPlaces()[p][0] : "ばしょ") + "</div><div class='st'>" + "●".repeat(doneRounds) + "○".repeat(Math.max(0, need - doneRounds)) + "</div></div>";
      if (doneN > 0) {
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
      else if (fullyDone) el.addEventListener("click", () => redoPlace(p));
      grid.appendChild(el);
    }
  }
  function redoPlace(place) {
    if (!confirm("このばしょの記録を消す？まちがいリストはそのまま残るよ。")) return;
    K.unClearPlace(place);
    extra.ribbons = Math.floor((K.getProgress().clearedEns || []).length / ROUND);
    persist();
    K.toast("このばしょの記録を消したよ");
    renderMap();
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
    quiz = { place, items, i: 0, log: [], review: !!customWords, buddy: buddy || C.shopChars()[0], token: roundToken };
    show("quiz");
    renderQuestion();
  }
  function quitQuiz() {
    if (!quiz) return;
    if (!confirm("このステージをやめる？答えた分のまちがいは残るよ。クリアにはならないよ。")) return;
    const review = quiz.review;
    roundToken += 1;
    quiz = null;
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
    const icon = quiz.review ? "💌" : (shopPlaces()[quiz.place] ? shopPlaces()[quiz.place][1] : "🛒");
    const g = document.getElementById("gauge");
    g.innerHTML = "";
    for (let i = 0; i < quiz.items.length; i++) {
      const d = document.createElement("div");
      if (i < quiz.log.length) {
        d.className = "gdot on" + (quiz.log[i].ok ? "" : " bad");
        d.textContent = quiz.log[i].ok ? icon : "💧";
      } else {
        d.className = "gdot" + (i === quiz.i ? " on" : "");
        d.textContent = i === quiz.i ? "🛒" : "";
      }
      g.appendChild(d);
    }
  }

  async function setBuddyMood(mood) {
    const wrap = document.getElementById("buddy-wrap");
    wrap.className = "buddy-wrap " + (mood || "");
    wrap.innerHTML = await C.faceHtml(quiz.buddy, mood || "normal", 120)
      + "<div class='buddy-name' id='buddy-line'></div>";
    const line = mood === "happy" ? nm(quiz.buddy) + "、元気いっぱい！"
      : mood === "sad" ? nm(quiz.buddy) + "、悲しい…"
      : nm(quiz.buddy) + "と お買い物";
    document.getElementById("buddy-line").textContent = line;
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
    K.recordAnswer(w.en, ok);
    quiz.log.push({ en: w.en, w: w, ok: ok });
    renderGauge();
    setBuddyMood(ok ? "happy" : "sad");
    flash(ok, w);
    const t = K.flashTimes(ok);
    setTimeout(() => {
      if (!quiz || quiz.token !== token) return;
      quiz.i += 1;
      if (quiz.i >= quiz.items.length) finishRound();
      else renderQuestion();
    }, t.wait);
  }

  async function finishRound() {
    if (!quiz) return;
    const okN = quiz.log.filter((x) => x.ok).length;
    if (!quiz.review) {
      K.markCleared(quiz.items);
      extra.ribbons = Math.floor((K.getProgress().clearedEns || []).length / ROUND);
      persist();
      K.maybeAutoExport();
    }
    document.getElementById("result-buddy").innerHTML =
      await C.faceHtml(quiz.buddy, okN >= 7 ? "happy" : "sad", 100)
      + "<div class='buddy-name'>" + nm(quiz.buddy) + "</div>";
    const ico = shopPlaces()[quiz.place] ? shopPlaces()[quiz.place][1] : "○";
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
      K.levelsLabel() + "　残り " + K.unclearedWords().length + " / " + WORDS.length + "ご";
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
    K.bindGuide("shop");
  }
  boot();
})();
