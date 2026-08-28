(function () {
  const K = window.Kirameki;
  const C = window.KiramekiChars;
  const BOARD_URL = "";
  function show(id) {
    document.querySelectorAll(".screen").forEach((el) => el.classList.remove("on"));
    document.getElementById(id).classList.add("on");
  }
  function fillRadio(box, items, key, current) {
    box.innerHTML = "";
    items.forEach((it) => {
      const lab = document.createElement("label");
      lab.innerHTML = `<input type="radio" name="${key}" value="${it.id}"> ${it.name}`;
      if (it.id === current) lab.querySelector("input").checked = true;
      lab.querySelector("input").addEventListener("change", () => {
        const patch = {};
        patch[key] = it.id;
        K.saveSettings(patch);
        refresh();
      });
      box.appendChild(lab);
    });
  }
  function fillLevels() {
    const box = document.getElementById("level-seg");
    const selected = K.getSettings().levels;
    box.innerHTML = "";
    K.LEVELS.forEach((it) => {
      const lab = document.createElement("label");
      lab.innerHTML = `<input type="checkbox" value="${it.id}"> ${it.name}`;
      lab.querySelector("input").checked = selected.indexOf(it.id) >= 0;
      lab.querySelector("input").addEventListener("change", () => {
        const levels = Array.from(box.querySelectorAll("input:checked")).map((el) => el.value);
        if (!levels.length) {
          lab.querySelector("input").checked = true;
          K.toast("級は1つ以上選んでください");
          return;
        }
        K.saveSettings({ levels: levels });
        refresh();
      });
      box.appendChild(lab);
    });
  }
  function roleLabels(c, st) {
    const tags = [];
    if (st.playerId === c.id) tags.push("主人公");
    if (st.friendId === c.id) tags.push("友達");
    if ((st.shopBuddyIds || []).indexOf(c.id) >= 0) tags.push("買い物仲間");
    return tags.length ? tags.join("・") : "役なし";
  }
  function addFileInput(parent, label, onFile) {
    const lab = document.createElement("label");
    lab.className = "photo-lab";
    const cap = document.createElement("span");
    cap.textContent = label;
    const file = document.createElement("input");
    file.type = "file";
    file.accept = "image/*";
    file.addEventListener("change", async (ev) => {
      const f = ev.target.files && ev.target.files[0];
      ev.target.value = "";
      if (!f) return;
      await onFile(f);
    });
    lab.appendChild(cap);
    lab.appendChild(file);
    parent.appendChild(lab);
  }
  function addRoleButtons(roles, c, st) {
    const mkBtn = (label, on, click) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "role-btn" + (on ? " on" : "");
      b.textContent = label;
      b.addEventListener("click", click);
      roles.appendChild(b);
    };
    mkBtn("主人公", st.playerId === c.id, () => {
      K.saveSettings({ playerId: c.id });
      refresh();
    });
    mkBtn("友達", st.friendId === c.id, () => {
      K.saveSettings({ friendId: c.id });
      refresh();
    });
    mkBtn("買い物仲間", (st.shopBuddyIds || []).indexOf(c.id) >= 0, () => {
      const ids = (K.getSettings().shopBuddyIds || []).slice();
      const i = ids.indexOf(c.id);
      if (i >= 0) {
        if (ids.length <= 1) {
          K.toast("買い物仲間は1人以上選んでください");
          return;
        }
        ids.splice(i, 1);
      } else {
        ids.push(c.id);
      }
      K.saveSettings({ shopBuddyIds: ids });
      refresh();
    });
  }
  async function renderAtlas() {
    const box = document.getElementById("char-atlas");
    const st = K.getSettings();
    box.innerHTML = "";
    for (const c of C.atlasChars()) {
      const wrap = document.createElement("div");
      wrap.className = "friend-slot atlas-slot" + (c.custom ? " custom" : "");
      if (c.custom) {
        const moods = document.createElement("div");
        moods.className = "atlas-moods";
        moods.innerHTML =
          "<div class='mood'><span class='mood-lab'>うれしい</span>" + await C.faceHtml(c, "happy", 72) + "</div>"
          + "<div class='mood'><span class='mood-lab'>くやしい</span>" + await C.faceHtml(c, "sad", 72) + "</div>";
        wrap.appendChild(moods);
      } else {
        wrap.innerHTML = await C.faceHtml(c, "normal", 96);
      }
      const row = document.createElement("div");
      row.className = "name-row";
      if (c.custom) {
        const inp = document.createElement("input");
        inp.type = "text";
        inp.maxLength = 12;
        inp.value = K.displayName(c.id);
        inp.placeholder = "名前";
        inp.addEventListener("change", () => {
          const names = {};
          names[c.id] = inp.value;
          K.saveSettings({ names: names });
        });
        row.appendChild(inp);
      } else {
        const nm = document.createElement("div");
        nm.className = "char-name";
        nm.textContent = K.displayName(c.id);
        row.appendChild(nm);
      }
      const tags = document.createElement("div");
      tags.className = "role-tags";
      tags.textContent = roleLabels(c, st);
      const roles = document.createElement("div");
      roles.className = "role-row";
      addRoleButtons(roles, c, st);
      wrap.appendChild(row);
      wrap.appendChild(tags);
      wrap.appendChild(roles);
      if (c.custom) {
        addFileInput(wrap, "うれしい顔", async (f) => {
          await K.setImage("friend-" + c.id + "-happy", await K.shrinkFile(f));
          K.toast("うれしい顔を入れました（この端末のみ）");
          refresh();
        });
        addFileInput(wrap, "くやしい顔", async (f) => {
          await K.setImage("friend-" + c.id + "-sad", await K.shrinkFile(f));
          K.toast("くやしい顔を入れました（この端末のみ）");
          refresh();
        });
      } else {
        addFileInput(wrap, "写真を変える", async (f) => {
          await K.setImage("friend-" + c.id, await K.shrinkFile(f));
          K.toast("画像を入れました（この端末のみ）");
          refresh();
        });
      }
      box.appendChild(wrap);
    }
  }
  function bindPrize(textId, fileId, clearId, boxId, textKey, imgKey, game) {
    document.getElementById(textId).addEventListener("change", (e) => {
      const patch = {};
      patch[textKey] = e.target.value;
      K.saveSettings(patch);
    });
    document.getElementById(fileId).addEventListener("change", async (ev) => {
      const f = ev.target.files && ev.target.files[0];
      ev.target.value = "";
      if (!f) return;
      await K.setImage(imgKey, await K.shrinkFile(f));
      K.showPrize(document.getElementById(boxId), false, game);
    });
    document.getElementById(clearId).addEventListener("click", async () => {
      await K.setImage(imgKey, "");
      K.showPrize(document.getElementById(boxId), false, game);
    });
  }
  function refresh() {
    const st = K.getSettings();
    const n = K.wordQueue().length;
    const left = K.unclearedWords().length;
    const cleared = (K.getProgress().clearedEns || []).length;
    document.getElementById("level-count").textContent =
      "出題は " + n + "語です。" + (st.abstract ? "抽象語を含みます。" : "抽象語は外しています。") +
      " クリア済み " + (n - left) + "語は、どのゲームでも出ません。";
    document.getElementById("cleared-count").textContent =
      "いまクリア済みは " + cleared + "語です。";
    document.getElementById("shop-prize-text").value = st.shopPrizeText;
    document.getElementById("rescue-prize-text").value = st.rescuePrizeText;
    document.getElementById("abstract-toggle").checked = !!st.abstract;
    document.getElementById("hide-shop-guide").checked = !!st.hideShopGuide;
    document.getElementById("hide-rescue-guide").checked = !!st.hideRescueGuide;
    document.getElementById("hide-battle-guide").checked = !!st.hideBattleGuide;
    document.getElementById("prize-toggle").checked = st.prizeOn !== false;
    const prizeFields = document.getElementById("prize-fields");
    if (prizeFields) prizeFields.hidden = st.prizeOn === false;
    document.querySelectorAll("#export-seg input").forEach((el) => {
      el.checked = (el.value === "on") === !!st.autoExport;
    });
    fillLevels();
    fillRadio(document.getElementById("kanji-seg"), K.KANJI_MODES, "kanji", st.kanji);
    fillRadio(document.getElementById("taste-seg"), K.TASTES, "taste", st.taste);
    K.showPrize(document.getElementById("shop-prize-box"), false, "shop");
    K.showPrize(document.getElementById("rescue-prize-box"), false, "rescue");
    renderAtlas();
  }
  function bind() {
    document.getElementById("abstract-toggle").addEventListener("change", (e) => {
      K.saveSettings({ abstract: e.target.checked });
      refresh();
    });
    document.getElementById("hide-shop-guide").addEventListener("change", (e) => {
      K.saveSettings({ hideShopGuide: e.target.checked });
    });
    document.getElementById("hide-rescue-guide").addEventListener("change", (e) => {
      K.saveSettings({ hideRescueGuide: e.target.checked });
    });
    document.getElementById("hide-battle-guide").addEventListener("change", (e) => {
      K.saveSettings({ hideBattleGuide: e.target.checked });
    });
    document.getElementById("prize-toggle").addEventListener("change", (e) => {
      K.saveSettings({ prizeOn: e.target.checked });
      refresh();
    });
    document.querySelectorAll("#export-seg input").forEach((el) => {
      el.addEventListener("change", () => K.saveSettings({ autoExport: el.value === "on" }));
    });
    bindPrize("shop-prize-text", "shop-prize-file", "shop-prize-clear", "shop-prize-box", "shopPrizeText", "prize-shop", "shop");
    bindPrize("rescue-prize-text", "rescue-prize-file", "rescue-prize-clear", "rescue-prize-box", "rescuePrizeText", "prize-rescue", "rescue");
    document.querySelectorAll(".js-open-adult").forEach((el) => {
      el.addEventListener("click", () => show("adult"));
    });
    const menuBtn = document.getElementById("lp-menu");
    const nav = document.getElementById("lp-nav");
    if (menuBtn && nav) {
      menuBtn.addEventListener("click", () => {
        const open = nav.classList.toggle("open");
        menuBtn.setAttribute("aria-expanded", open ? "true" : "false");
      });
      nav.querySelectorAll("a, button").forEach((el) => {
        el.addEventListener("click", () => {
          nav.classList.remove("open");
          menuBtn.setAttribute("aria-expanded", "false");
        });
      });
    }
    document.querySelectorAll('a[href^="#"]').forEach((a) => {
      a.addEventListener("click", (ev) => {
        if (a.id === "board-link") return;
        const id = (a.getAttribute("href") || "").slice(1);
        const target = id && document.getElementById(id);
        if (!target) return;
        ev.preventDefault();
        if (!document.getElementById("hub").classList.contains("on")) {
          refresh();
          show("hub");
        }
        target.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    });
    const board = document.getElementById("board-link");
    const boardNote = document.getElementById("board-note");
    if (board) {
      if (BOARD_URL) {
        board.href = BOARD_URL;
        board.target = "_blank";
        board.rel = "noopener noreferrer";
        if (boardNote) boardNote.textContent = "別のページが開きます。";
      } else {
        board.addEventListener("click", (ev) => {
          ev.preventDefault();
          K.toast("掲示板のURLは後日掲載します");
        });
      }
    }
    document.getElementById("adult-back").addEventListener("click", () => {
      refresh();
      show("hub");
      window.scrollTo(0, 0);
    });
    document.getElementById("record-export").addEventListener("click", () => K.exportBackup());
    document.getElementById("record-import").addEventListener("click", () => {
      document.getElementById("record-file").click();
    });
    document.getElementById("record-file").addEventListener("change", (ev) => {
      const file = ev.target.files && ev.target.files[0];
      ev.target.value = "";
      if (!file) return;
      if (!confirm("今の記録と管理画面の内容を消して、このファイルの内容に入れ替えます。設定した画像はファイルに含まれないため引き継がれません。よろしいですか？")) return;
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          await K.importBackupText(reader.result);
          K.toast("記録を読み込みました");
          location.reload();
        } catch (e) {
          K.toast("このファイルは記録ではありません");
        }
      };
      reader.readAsText(file, "utf-8");
    });
    document.getElementById("undo-10").addEventListener("click", () => {
      const n = (K.getProgress().clearedEns || []).length;
      if (!n) { K.toast("戻すクリアがありません"); return; }
      if (!confirm("直近10語のクリアを戻します。まちがいリストはそのままです。よろしいですか？")) return;
      K.unClearLast(10);
      K.toast("直近のクリアを戻しました");
      refresh();
    });
    document.getElementById("undo-50").addEventListener("click", () => {
      const n = (K.getProgress().clearedEns || []).length;
      if (!n) { K.toast("戻すクリアがありません"); return; }
      if (!confirm("直近50語のクリアを戻します。まちがいリストはそのままです。よろしいですか？")) return;
      K.unClearLast(50);
      K.toast("直近のクリアを戻しました");
      refresh();
    });
    document.getElementById("undo-all").addEventListener("click", () => {
      const n = (K.getProgress().clearedEns || []).length;
      if (!n) { K.toast("戻すクリアがありません"); return; }
      if (!confirm("クリア済みを全部戻します。まちがいリストはそのままです。よろしいですか？")) return;
      K.resetCleared();
      const shop = K.getShop();
      shop.ribbons = 0;
      K.saveShop(shop);
      K.saveRescue({ stage: 0, tools: [], stageEns: [] });
      K.toast("クリアを全部戻しました");
      refresh();
    });
    refresh();
  }
  bind();
})();
