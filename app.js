(function (global) {
  const STORE_KEY = "kirameki-eigo-public-v1";
  const IMG_DB = "kirameki-images";
  const IMG_STORE = "files";
  const ROUND = 10;
  const PLACE_SIZE = 50;
  const LEVEL_WORDS = 150;
  const SHOP_PLACES_PER_LEVEL = 3;
  const RESCUE_STOPS_PER_LEVEL = 5;
  const RESCUE_ROUNDS_PER_STOP = 3;
  const LEVELS = [
    { id: "g4", name: "4級ぐらい" },
    { id: "g3", name: "3級ぐらい" },
    { id: "pre2", name: "準2級ぐらい" },
    { id: "g2", name: "2級ぐらい" },
    { id: "pre1", name: "準1級ぐらい" }
  ];
  const KANJI_MODES = [
    { id: "none", name: "漢字なし" },
    { id: "simple", name: "簡単な漢字あり" },
    { id: "full", name: "漢字あり" }
  ];
  const TASTES = [
    { id: "kawaii", name: "かわいい" },
    { id: "kakkoii", name: "かっこいい" },
    { id: "cool", name: "クール" }
  ];
  const W = global.KiramekiWorld;
  const CHAR_BY_TASTE = W.charIdsByTaste;
  const CHAR_IDS = W.allCharIds;
  const DEFAULT_NAMES = W.defaultNames;
  const DEFAULT_SETTINGS = {
    levels: ["pre2"],
    abstract: false,
    kanji: "simple",
    autoExport: false,
    taste: "kawaii",
    playerId: W.defaultPlayer.kawaii,
    friendId: W.defaultFriend.kawaii,
    shopBuddyIds: CHAR_BY_TASTE.kawaii.slice(),
    shopPrizeText: "全部終わったら、このご褒美がもらえるよ。",
    rescuePrizeText: "全部終わったら、このご褒美がもらえるよ。",
    hideShopGuide: false,
    hideRescueGuide: false,
    hideBattleGuide: false,
    prizeOn: true,
    prizeAllClearOn: true,
    prizeLevelOn: false,
    levelPrizeTexts: {},
    battleParentLevels: ["pre2"],
    names: Object.assign({}, DEFAULT_NAMES)
  };

  const FLASH = 3600, WAIT = 4000;

  function today() {
    const d = new Date(), z = (n) => String(n).padStart(2, "0");
    return d.getFullYear() + "-" + z(d.getMonth() + 1) + "-" + z(d.getDate());
  }
  function esc(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }
  function toast(msg) {
    let el = document.getElementById("toast");
    if (!el) {
      el = document.createElement("div");
      el.id = "toast";
      el.className = "toast";
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.style.display = "block";
    setTimeout(() => { el.style.display = "none"; }, 2200);
  }
  function applyTaste(taste) {
    document.documentElement.setAttribute("data-taste", taste || "kawaii");
    document.documentElement.removeAttribute("data-theme");
  }
  function normalizeSettings(raw) {
    const s = Object.assign({}, DEFAULT_SETTINGS, raw || {});
    if (!Array.isArray(s.levels) || !s.levels.length) {
      s.levels = s.level ? [s.level] : ["pre2"];
    }
    s.levels = s.levels.filter((id) => LEVELS.some((x) => x.id === id));
    if (!s.levels.length) s.levels = ["pre2"];
    if (!Array.isArray(s.battleParentLevels) || !s.battleParentLevels.length) {
      s.battleParentLevels = [s.levels[0]];
    }
    s.battleParentLevels = s.battleParentLevels.filter((id) => LEVELS.some((x) => x.id === id));
    if (!s.battleParentLevels.length) s.battleParentLevels = [s.levels[0]];
    {
      let pick = s.battleParentLevels[0];
      LEVELS.forEach((x) => {
        if (s.battleParentLevels.indexOf(x.id) >= 0) pick = x.id;
      });
      s.battleParentLevels = [pick];
    }
    if (!s.taste) {
      s.taste = s.theme === "sky" ? "cool" : "kawaii";
    }
    if (!TASTES.some((x) => x.id === s.taste)) s.taste = "kawaii";
    if (!s.shopPrizeText) s.shopPrizeText = s.prizeText || DEFAULT_SETTINGS.shopPrizeText;
    if (!s.rescuePrizeText) s.rescuePrizeText = s.prizeText || DEFAULT_SETTINGS.rescuePrizeText;
    if (typeof s.prizeOn !== "boolean") s.prizeOn = true;
    if (typeof s.prizeAllClearOn !== "boolean") s.prizeAllClearOn = true;
    if (typeof s.prizeLevelOn !== "boolean") s.prizeLevelOn = false;
    if (!s.levelPrizeTexts || typeof s.levelPrizeTexts !== "object") s.levelPrizeTexts = {};
    s.names = Object.assign({}, DEFAULT_NAMES, s.names || {});
    s.kanji = s.kanji || "simple";
    const ids = CHAR_BY_TASTE[s.taste] || CHAR_BY_TASTE.kawaii;
    const customIds = W.customCharIds || [];
    const allowed = ids.concat(customIds);
    if (!allowed.includes(s.playerId)) s.playerId = W.defaultPlayer[s.taste] || ids[0];
    if (!allowed.includes(s.friendId)) s.friendId = W.defaultFriend[s.taste] || ids[1];
    if (s.playerId === s.friendId) {
      s.friendId = allowed.find((id) => id !== s.playerId) || ids[1];
    }
    if (!Array.isArray(s.shopBuddyIds) || !s.shopBuddyIds.length) s.shopBuddyIds = ids.slice();
    s.shopBuddyIds = s.shopBuddyIds.filter((id) => allowed.includes(id));
    if (!s.shopBuddyIds.length) s.shopBuddyIds = ids.slice();
    return s;
  }
  function blankProgress() { return { answers: {}, clearedEns: [] }; }
  function blankShop() { return { ribbons: 0, buddyByPlace: {} }; }
  function blankRescue() { return { stage: 0, tools: [], stageEns: [] }; }
  const GAMES = [
    { id: "shop", title: "おかいものライブ", href: "shop.html" },
    { id: "rescue", title: "ともだちをたすける", href: "rescue.html" },
    { id: "battle", title: "パパやママと戦おう", href: "battle.html" }
  ];
  const GAME_BLANKS = { shop: blankShop, rescue: blankRescue };
  const CORE_KEYS = ["settings", "progress", "imageIds"];
  function mergeAnswers() {
    const out = {};
    Array.from(arguments).forEach((src) => {
      Object.keys(src || {}).forEach((en) => {
        const a = src[en] || {};
        const b = out[en] || { seen: 0, right: 0, wrong: 0, last: "", lastAt: "", firstWrongAt: "" };
        out[en] = {
          seen: (b.seen || 0) + (a.seen || 0),
          right: (b.right || 0) + (a.right || 0),
          wrong: (b.wrong || 0) + (a.wrong || 0),
          last: a.last || b.last,
          lastAt: a.lastAt || b.lastAt,
          firstWrongAt: b.firstWrongAt || a.firstWrongAt || ""
        };
      });
    });
    return out;
  }
  function collectOldAnswers(container) {
    if (!container) return {};
    if (container.answers) return container.answers;
    if (container.byLevel) {
      return mergeAnswers.apply(null, Object.values(container.byLevel).map((x) => (x && x.answers) || {}));
    }
    return {};
  }
  function blankAll() {
    return {
      settings: normalizeSettings({}),
      progress: blankProgress(),
      shop: blankShop(),
      rescue: blankRescue(),
      imageIds: {}
    };
  }
  function readAll() {
    try {
      const s = JSON.parse(localStorage.getItem(STORE_KEY) || "null");
      if (!s || typeof s !== "object") return blankAll();
      const progress = s.progress && typeof s.progress === "object"
        ? {
          answers: Object.assign({}, s.progress.answers || {}),
          clearedEns: Array.isArray(s.progress.clearedEns) ? s.progress.clearedEns.slice() : []
        }
        : {
          answers: mergeAnswers(collectOldAnswers(s.shop), collectOldAnswers(s.rescue)),
          clearedEns: []
        };
      const shop = s.shop && s.shop.buddyByPlace ? { ribbons: s.shop.ribbons || 0, buddyByPlace: s.shop.buddyByPlace }
        : blankShop();
      const rescue = s.rescue && typeof s.rescue.stage === "number"
        ? {
          stage: s.rescue.stage || 0,
          tools: s.rescue.tools || [],
          stageEns: Array.isArray(s.rescue.stageEns) ? s.rescue.stageEns : []
        }
        : blankRescue();
      const out = {
        settings: normalizeSettings(s.settings),
        progress: progress,
        shop: shop,
        rescue: rescue,
        imageIds: sanitizeImageIds(s.imageIds)
      };
      Object.keys(s).forEach((k) => {
        if (CORE_KEYS.indexOf(k) >= 0 || GAME_BLANKS[k]) return;
        if (s[k] && typeof s[k] === "object") out[k] = s[k];
      });
      return out;
    } catch (e) {
      return blankAll();
    }
  }
  function writeAll(data) {
    const out = {
      settings: data.settings,
      progress: data.progress,
      shop: data.shop,
      rescue: data.rescue,
      imageIds: sanitizeImageIds((data && data.imageIds) || {})
    };
    Object.keys(data || {}).forEach((k) => {
      if (out[k] === undefined && k !== "images") out[k] = data[k];
    });
    localStorage.setItem(STORE_KEY, JSON.stringify(out));
  }
  function getSettings() { return readAll().settings; }
  function saveSettings(patch) {
    const all = readAll();
    if (patch.names) patch = Object.assign({}, patch, { names: Object.assign({}, all.settings.names, patch.names) });
    all.settings = normalizeSettings(Object.assign({}, all.settings, patch));
    writeAll(all);
    applyTaste(all.settings.taste);
    return all.settings;
  }
  function getProgress() { return readAll().progress; }
  function saveProgress(progress) {
    const all = readAll();
    all.progress = progress;
    writeAll(all);
  }
  function getShop() { return getGame("shop"); }
  function saveShop(shop) { saveGame("shop", shop); }
  function getRescue() { return getGame("rescue"); }
  function saveRescue(rescue) { saveGame("rescue", rescue); }
  function getGame(id) {
    const blank = GAME_BLANKS[id] ? GAME_BLANKS[id]() : {};
    const cur = Object.assign(blank, readAll()[id] || {});
    if (id === "rescue") {
      if (!Array.isArray(cur.tools)) cur.tools = [];
      if (!Array.isArray(cur.stageEns)) cur.stageEns = [];
    }
    return cur;
  }
  function saveGame(id, state) {
    const all = readAll();
    all[id] = state;
    writeAll(all);
  }
  function resetAll() { writeAll(blankAll()); }
  function displayName(id) {
    const customIds = W.customCharIds || [];
    if (customIds.indexOf(id) < 0) return DEFAULT_NAMES[id] || id;
    const names = getSettings().names || {};
    return (names[id] && String(names[id]).trim()) || DEFAULT_NAMES[id] || id;
  }
  function levelsLabelFor(ids) {
    return (ids || []).map((id) => {
      const hit = LEVELS.find((x) => x.id === id);
      return hit ? hit.name : id;
    }).join("・");
  }
  function levelsLabel() { return levelsLabelFor(getSettings().levels); }
  function parentLevelsLabel() { return levelsLabelFor(getSettings().battleParentLevels); }

  const IMG_LS = STORE_KEY + "-img";
  const objectUrls = {};

  function sanitizeImageIds(raw) {
    const out = {};
    if (!raw || typeof raw !== "object") return out;
    Object.keys(raw).forEach((k) => {
      const v = raw[k];
      if (typeof v !== "string" || !v) return;
      if (v.indexOf("data:") === 0 || v.length > 200) return;
      out[k] = v;
    });
    return out;
  }
  function readImageIds() {
    return sanitizeImageIds(readAll().imageIds);
  }
  function writeImageIds(ids) {
    const all = readAll();
    all.imageIds = sanitizeImageIds(ids);
    writeAll(all);
  }
  function resolveImageId(key) {
    const ids = readImageIds();
    if (ids[key]) return ids[key];
    if (key === "prize-shop" && ids.prize) return ids.prize;
    return "";
  }
  function lsImages() {
    try { return JSON.parse(localStorage.getItem(IMG_LS) || "{}"); } catch (e) { return {}; }
  }
  function isDataUrl(v) {
    return typeof v === "string" && v.indexOf("data:") === 0;
  }
  function dataUrlToBlob(dataUrl) {
    const m = String(dataUrl).match(/^data:([^;]+)(;base64)?,([\s\S]*)$/);
    if (!m) return null;
    const mime = m[1] || "image/jpeg";
    const isB64 = !!m[2];
    const data = m[3] || "";
    try {
      if (isB64) {
        const bin = atob(data);
        const arr = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
        return new Blob([arr], { type: mime });
      }
      return new Blob([decodeURIComponent(data)], { type: mime });
    } catch (e) {
      return null;
    }
  }
  function toBlob(val) {
    if (!val) return null;
    if (typeof Blob !== "undefined" && val instanceof Blob) return val;
    if (isDataUrl(val)) return dataUrlToBlob(val);
    return null;
  }
  function blobUrl(key, blob) {
    if (objectUrls[key]) {
      URL.revokeObjectURL(objectUrls[key]);
      delete objectUrls[key];
    }
    if (!blob) return "";
    const url = URL.createObjectURL(blob);
    objectUrls[key] = url;
    return url;
  }
  function openDb() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(IMG_DB, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(IMG_STORE)) db.createObjectStore(IMG_STORE);
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
  async function withStore(mode, fn) {
    const db = await openDb();
    try {
      return await new Promise((resolve, reject) => {
        const tx = db.transaction(IMG_STORE, mode);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
        fn(tx.objectStore(IMG_STORE), tx);
      });
    } finally {
      db.close();
    }
  }
  async function idbGet(id) {
    let val = "";
    await withStore("readonly", (store) => {
      const q = store.get(id);
      q.onsuccess = () => { val = q.result || ""; };
    });
    return val;
  }
  async function idbPut(id, blob) {
    await withStore("readwrite", (store) => { store.put(blob, id); });
  }
  async function idbDelete(id) {
    await withStore("readwrite", (store) => { store.delete(id); });
  }
  async function idbGetAll() {
    const out = {};
    await withStore("readonly", (store) => {
      const q = store.openCursor();
      q.onsuccess = (ev) => {
        const c = ev.target.result;
        if (c) { out[c.key] = c.value; c.continue(); }
      };
    });
    return out;
  }
  async function idbPutMany(entries) {
    if (!entries.length) return;
    await withStore("readwrite", (store) => {
      entries.forEach((it) => { if (it && it.key && it.value) store.put(it.value, it.key); });
    });
  }

  let migrateWait = null;
  async function runImageMigrate() {
    const lsMap = lsImages();
    const ids = readImageIds();
    const hasLs = Object.keys(lsMap).length > 0;
    let idbMap = {};
    try {
      idbMap = await idbGetAll();
    } catch (e) {
      if (!hasLs) return;
    }
    const toPut = [];
    const take = (logicalKey, val) => {
      const blob = toBlob(val);
      if (!blob) return;
      const id = ids[logicalKey] || logicalKey;
      ids[logicalKey] = id;
      toPut.push({ key: id, value: blob });
    };
    if (hasLs) {
      Object.keys(lsMap).forEach((k) => {
        const dest = (k === "prize" && !lsMap["prize-shop"] && !ids["prize-shop"]) ? "prize-shop" : k;
        take(dest, lsMap[k]);
      });
    }
    Object.keys(idbMap).forEach((k) => {
      const dest = (k === "prize" && !ids["prize-shop"] && !idbMap["prize-shop"]) ? "prize-shop" : k;
      const val = idbMap[k];
      if (isDataUrl(val)) take(dest, val);
      else if (toBlob(val) && !ids[dest]) ids[dest] = dest === k ? k : dest;
    });
    if (toPut.length) await idbPutMany(toPut);
    writeImageIds(ids);
    if (hasLs) localStorage.removeItem(IMG_LS);
  }
  function migrateImagesOnce() {
    if (!migrateWait) {
      migrateWait = runImageMigrate().catch((e) => {
        migrateWait = null;
        throw e;
      });
    }
    return migrateWait;
  }

  async function setImage(key, blobOrEmpty) {
    try { await migrateImagesOnce(); } catch (e) { /* 続行 */ }
    const all = readAll();
    all.imageIds = readImageIds();
    if (blobOrEmpty) {
      const blob = toBlob(blobOrEmpty) || blobOrEmpty;
      if (!(typeof Blob !== "undefined" && blob instanceof Blob)) return;
      const id = all.imageIds[key] || key;
      await idbPut(id, blob);
      all.imageIds[key] = id;
    } else {
      const id = all.imageIds[key] || key;
      try { await idbDelete(id); } catch (e) { /* 索引だけ消す */ }
      if (key === "prize-shop") {
        try { await idbDelete("prize"); } catch (e) { /* 旧キー */ }
      }
      delete all.imageIds[key];
      if (key === "prize-shop") delete all.imageIds.prize;
      blobUrl(key, null);
    }
    writeAll(all);
  }
  async function getImage(key) {
    try { await migrateImagesOnce(); } catch (e) { /* 旧データへ */ }
    const id = resolveImageId(key);
    if (id) {
      try {
        const val = await idbGet(id);
        const blob = toBlob(val);
        if (blob) {
          if (isDataUrl(val)) {
            try { await idbPut(id, blob); } catch (e) { /* 次回再変換 */ }
          }
          return blobUrl(key, blob);
        }
      } catch (e) { /* fall through */ }
    }
    const map = lsImages();
    const raw = map[key] || (key === "prize-shop" ? map.prize : "");
    if (isDataUrl(raw)) {
      const blob = dataUrlToBlob(raw);
      if (blob) return blobUrl(key, blob);
      return raw;
    }
    return "";
  }
  function shrinkFile(file, max = 480) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, max / Math.max(img.width, img.height));
        const c = document.createElement("canvas");
        c.width = Math.max(1, Math.round(img.width * scale));
        c.height = Math.max(1, Math.round(img.height * scale));
        c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url);
        const finish = (blob) => {
          if (blob) resolve(blob);
          else reject(new Error("blob"));
        };
        if (typeof c.toBlob === "function") {
          c.toBlob(finish, "image/jpeg", 0.72);
        } else {
          finish(dataUrlToBlob(c.toDataURL("image/jpeg", 0.72)));
        }
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error("image"));
      };
      img.src = url;
    });
  }

  function allWords() { return global.WORDS || []; }
  function wordsForLevels(levelIds) {
    const st = getSettings();
    const set = new Set(levelIds && levelIds.length ? levelIds : st.levels);
    return allWords().filter((w) => set.has(w.lv) && (st.abstract || !w.ab));
  }
  function filteredWords() { return wordsForLevels(getSettings().levels); }
  function parentWordPool() { return wordsForLevels(getSettings().battleParentLevels); }
  function wordQueue() {
    const all = filteredWords();
    return all.slice(0, Math.floor(all.length / ROUND) * ROUND);
  }
  function unclearedWords() {
    const done = new Set(getProgress().clearedEns || []);
    return wordQueue().filter((w) => !done.has(w.en));
  }
  function nextRoundItems() {
    return unclearedWords().slice(0, ROUND);
  }
  function itemsInPlace(place) {
    const q = wordQueue();
    const done = new Set(getProgress().clearedEns || []);
    return q.slice(place * PLACE_SIZE, (place + 1) * PLACE_SIZE).filter((w) => !done.has(w.en)).slice(0, ROUND);
  }
  function placeCount() {
    return Math.max(1, Math.ceil(wordQueue().length / PLACE_SIZE));
  }
  function placeCleared(place) {
    const q = wordQueue();
    const slice = q.slice(place * PLACE_SIZE, (place + 1) * PLACE_SIZE);
    if (!slice.length) return true;
    const done = new Set(getProgress().clearedEns || []);
    return slice.every((w) => done.has(w.en));
  }
  function unlockedPlace() {
    const n = placeCount();
    for (let p = 0; p < n; p++) if (!placeCleared(p)) return p;
    return n - 1;
  }
  function allWordsCleared() {
    return wordQueue().length > 0 && unclearedWords().length === 0;
  }
  function markCleared(items) {
    const p = getProgress();
    p.clearedEns = p.clearedEns || [];
    (items || []).forEach((w) => {
      if (w && w.en && p.clearedEns.indexOf(w.en) < 0) p.clearedEns.push(w.en);
    });
    saveProgress(p);
  }
  function unClearEns(ens) {
    const drop = new Set(ens || []);
    const p = getProgress();
    p.clearedEns = (p.clearedEns || []).filter((en) => !drop.has(en));
    saveProgress(p);
  }
  function unClearPlace(place) {
    const slice = wordQueue().slice(place * PLACE_SIZE, (place + 1) * PLACE_SIZE);
    unClearEns(slice.map((w) => w.en));
  }
  function placeStepInfo(place) {
    const slice = wordQueue().slice(place * PLACE_SIZE, (place + 1) * PLACE_SIZE);
    const done = new Set(getProgress().clearedEns || []);
    const need = Math.max(1, Math.ceil(slice.length / ROUND));
    let doneRounds = 0;
    for (let i = 0; i < need; i++) {
      const chunk = slice.slice(i * ROUND, (i + 1) * ROUND);
      if (chunk.length && chunk.every((w) => done.has(w.en))) doneRounds += 1;
      else break;
    }
    return { slice: slice, need: need, doneRounds: doneRounds };
  }
  function unClearPlaceFromStep(place, fromStep) {
    const info = placeStepInfo(place);
    unClearEns(info.slice.slice(fromStep * ROUND).map((w) => w.en));
  }
  function clearedInQueue() {
    const q = wordQueue();
    const done = new Set(getProgress().clearedEns || []);
    return q.filter((w) => done.has(w.en)).length;
  }
  function levelCount() {
    const n = wordQueue().length;
    return Math.max(1, Math.ceil(n / LEVEL_WORDS));
  }
  function currentLevelIndex() {
    const n = wordQueue().length;
    if (!n) return 0;
    const c = clearedInQueue();
    if (c >= n) return Math.max(0, Math.ceil(n / LEVEL_WORDS) - 1);
    return Math.floor(c / LEVEL_WORDS);
  }
  function levelDisplay() { return currentLevelIndex() + 1; }
  function levelJustCleared(beforeCount, afterCount) {
    const n = wordQueue().length;
    if (afterCount <= beforeCount) return false;
    if (afterCount >= n && beforeCount < n) return true;
    return Math.floor(afterCount / LEVEL_WORDS) > Math.floor(beforeCount / LEVEL_WORDS);
  }
  function completedLevelDisplay(beforeCount, afterCount) {
    if (!levelJustCleared(beforeCount, afterCount)) return 0;
    const n = wordQueue().length;
    if (afterCount >= n) return Math.max(1, Math.ceil(n / LEVEL_WORDS));
    return Math.floor(afterCount / LEVEL_WORDS);
  }
  function shopPlaceRange(lv) {
    const start = (typeof lv === "number" ? lv : currentLevelIndex()) * SHOP_PLACES_PER_LEVEL;
    const end = Math.min(placeCount(), start + SHOP_PLACES_PER_LEVEL);
    return { start: start, end: end };
  }
  function rescueRoundsPerLevel() { return RESCUE_STOPS_PER_LEVEL * RESCUE_ROUNDS_PER_STOP; }
  function rescueStopCount(lv) {
    const startRound = (typeof lv === "number" ? lv : currentLevelIndex()) * rescueRoundsPerLevel();
    const totalRounds = Math.floor(wordQueue().length / ROUND);
    const remaining = Math.max(0, totalRounds - startRound);
    if (remaining <= 0) return 1;
    return Math.min(RESCUE_STOPS_PER_LEVEL, Math.ceil(remaining / RESCUE_ROUNDS_PER_STOP));
  }
  function rescueStopInfo(lv, stop) {
    const startRound = lv * rescueRoundsPerLevel() + stop * RESCUE_ROUNDS_PER_STOP;
    const totalRounds = Math.floor(wordQueue().length / ROUND);
    const need = Math.max(0, Math.min(RESCUE_ROUNDS_PER_STOP, totalRounds - startRound));
    const q = wordQueue();
    const done = new Set(getProgress().clearedEns || []);
    let doneRounds = 0;
    for (let i = 0; i < need; i++) {
      const chunk = q.slice((startRound + i) * ROUND, (startRound + i + 1) * ROUND);
      if (chunk.length && chunk.every((w) => done.has(w.en))) doneRounds += 1;
      else break;
    }
    return {
      startRound: startRound,
      need: need,
      doneRounds: doneRounds,
      slice: q.slice(startRound * ROUND, (startRound + need) * ROUND)
    };
  }
  function rescueCursor() {
    const lv = currentLevelIndex();
    const nStops = rescueStopCount(lv);
    if (allWordsCleared()) {
      const last = rescueStopInfo(lv, nStops - 1);
      return { level: lv, stop: nStops - 1, doneRounds: last.need, need: last.need, nStops: nStops, allDone: true };
    }
    for (let s = 0; s < nStops; s++) {
      const info = rescueStopInfo(lv, s);
      if (info.need <= 0) continue;
      if (info.doneRounds < info.need) {
        return { level: lv, stop: s, doneRounds: info.doneRounds, need: info.need, nStops: nStops, allDone: false };
      }
    }
    const last = rescueStopInfo(lv, nStops - 1);
    return { level: lv, stop: nStops - 1, doneRounds: last.need, need: last.need, nStops: nStops, allDone: false };
  }
  function unClearRescueFromStop(lv, fromStop) {
    const info = rescueStopInfo(lv, fromStop);
    const q = wordQueue();
    unClearEns(q.slice(info.startRound * ROUND).map((w) => w.en));
  }
  function prizeFlags() {
    const st = getSettings();
    const on = st.prizeOn !== false;
    return {
      on: on,
      all: on && st.prizeAllClearOn !== false,
      level: on && !!st.prizeLevelOn
    };
  }
  function levelPrizeKey(lv1) { return "prize-level-" + lv1; }
  function levelPrizeText(lv1) {
    const t = ((getSettings().levelPrizeTexts || {})[String(lv1)] || "").trim();
    return t || "このレベルをクリアしたら、このご褒美がもらえるよ。";
  }
  function fillPrizeImg(img, fallback, src) {
    const showFallback = () => {
      if (img) {
        img.removeAttribute("src");
        img.style.display = "none";
      }
      if (fallback) fallback.style.display = "grid";
    };
    if (src && img) {
      img.onload = () => {
        img.style.display = "inline-block";
        if (fallback) fallback.style.display = "none";
      };
      img.onerror = showFallback;
      img.src = src;
    } else {
      showFallback();
    }
  }
  function previewPrize(box, key, text) {
    if (!box) return;
    box.hidden = false;
    const img = box.querySelector("[data-prize-img]");
    const fallback = box.querySelector("[data-prize-fallback]");
    const msg = box.querySelector("[data-prize-msg]");
    getImage(key).then((src) => fillPrizeImg(img, fallback, src)).catch(() => fillPrizeImg(img, fallback, ""));
    if (msg) msg.innerHTML = esc(text || "").replace(/\n/g, "<br>");
  }
  async function renderMapPrize(box) {
    if (!box) return;
    const flags = prizeFlags();
    if (!flags.level || allWordsCleared()) {
      box.hidden = true;
      return;
    }
    box.hidden = false;
    const lv = levelDisplay();
    const lab = box.querySelector("[data-map-prize-lab]");
    const msg = box.querySelector("[data-map-prize-msg]");
    const img = box.querySelector("[data-map-prize-img]");
    const fallback = box.querySelector("[data-map-prize-fallback]");
    if (lab) lab.textContent = "Lv" + lv + "をクリアしたら";
    if (msg) msg.textContent = levelPrizeText(lv);
    const src = await getImage(levelPrizeKey(lv));
    fillPrizeImg(img, fallback, src);
  }
  function marksRowHtml(items) {
    let html = "<div class=\"step-marks\">";
    (items || []).forEach((it) => {
      html += "<span class=\"step-mark" + (it.done ? " done" : "") + (it.now ? " now" : "") + "\">"
        + "<span class=\"step-ico\">" + (it.mark || "●") + "</span>"
        + (it.done ? "<span class=\"step-x\">×</span>" : "")
        + "</span>";
    });
    return html + "</div>";
  }
  function stepMarksHtml(mark, doneRounds, need) {
    const items = [];
    for (let i = 0; i < need; i++) items.push({ mark: mark || "●", done: i < doneRounds });
    return marksRowHtml(items);
  }
  function unClearLast(n) {
    const p = getProgress();
    p.clearedEns = (p.clearedEns || []).slice(0, Math.max(0, p.clearedEns.length - n));
    saveProgress(p);
  }
  function resetCleared() {
    const p = getProgress();
    p.clearedEns = [];
    saveProgress(p);
  }
  function sense(w, which) {
    const st = getSettings();
    if (st.kanji === "none") return which === 2 ? (w.k2 || "") : w.k;
    if (st.kanji === "full") return which === 2 ? (w.j2 || "") : w.j;
    return which === 2 ? (w.s2 || "") : w.s;
  }
  function jaLines(w) { return [sense(w, 1), sense(w, 2)].filter(Boolean); }
  function jaText(w) { return jaLines(w).join("\n"); }
  function jaHtml(w) { return jaLines(w).map(esc).join("<br>"); }
  function exampleHtml(w) {
    const ex = (w && w.ex) ? String(w.ex) : "";
    if (!ex) return "";
    const word = (w.en || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    if (!word) return esc(ex);
    return esc(ex).replace(new RegExp("(" + word + ")", "ig"), "<b>$1</b>");
  }
  function canSpeak() {
    return !!(window.speechSynthesis && window.SpeechSynthesisUtterance);
  }
  let speakToken = 0;
  function stopSpeak() {
    speakToken += 1;
    if (canSpeak()) speechSynthesis.cancel();
  }
  function pickEnVoice() {
    if (!canSpeak()) return null;
    const voices = speechSynthesis.getVoices() || [];
    return voices.find((v) => v.lang === "en-US")
      || voices.find((v) => (v.lang || "").toLowerCase().indexOf("en-us") === 0)
      || voices.find((v) => (v.lang || "").toLowerCase().indexOf("en") === 0)
      || null;
  }
  function speakEnglish(text) {
    const t = String(text || "").trim();
    if (!t) return;
    if (!canSpeak()) {
      toast("この端末では音声が使えません");
      return;
    }
    stopSpeak();
    const token = speakToken;
    const u = new SpeechSynthesisUtterance(t);
    u.lang = "en-US";
    u.rate = 0.5;
    u.pitch = 1;
    const voice = pickEnVoice();
    if (voice) u.voice = voice;
    // Chrome は cancel 直後の speak を落とすことがあるので、少し遅らせる
    setTimeout(() => {
      if (token !== speakToken) return;
      speechSynthesis.speak(u);
    }, 40);
  }
  function bindSpeakButtons() {
    const ok = canSpeak();
    if (ok) {
      speechSynthesis.getVoices();
      if (typeof speechSynthesis.onvoiceschanged !== "undefined") {
        speechSynthesis.onvoiceschanged = function () { speechSynthesis.getVoices(); };
      }
    }
    ["speak-word", "speak-ex"].forEach((id) => {
      const btn = document.getElementById(id);
      if (!btn) return;
      if (!ok) {
        btn.disabled = true;
        btn.title = "この端末では音声が使えません";
        btn.setAttribute("aria-disabled", "true");
        return;
      }
      btn.addEventListener("click", (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        speakEnglish(btn.getAttribute("data-text") || "");
      });
    });
  }
  function setSpeakText(word, example) {
    stopSpeak();
    const wordBtn = document.getElementById("speak-word");
    const exBtn = document.getElementById("speak-ex");
    if (wordBtn) wordBtn.setAttribute("data-text", word || "");
    if (exBtn) {
      exBtn.setAttribute("data-text", example || "");
      exBtn.hidden = !example;
    }
  }
  function choiceHtml(w) {
    const a = esc(sense(w, 1) || w.en);
    const b = sense(w, 2);
    return '<span class="g1">' + a + "</span>" + (b ? '<span class="g2">' + esc(b) + "</span>" : "");
  }
  function pickChoices(correct, pool, n) {
    const bag = pool.filter((w) => w.en !== correct.en && w.s !== correct.s && (w.k || "").slice(0, 2) !== (correct.k || "").slice(0, 2));
    const src = bag.length >= n - 1 ? bag : pool.filter((w) => w.en !== correct.en);
    const picked = [], used = new Set();
    while (picked.length < n - 1 && used.size < src.length) {
      const w = src[Math.floor(Math.random() * src.length)];
      if (used.has(w.en)) continue;
      used.add(w.en);
      picked.push(w);
    }
    const opts = picked.concat([correct]);
    for (let i = opts.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [opts[i], opts[j]] = [opts[j], opts[i]];
    }
    return opts;
  }
  function recordAnswer(en, ok) {
    const p = getProgress();
    const a = p.answers[en] || { seen: 0, right: 0, wrong: 0, last: "", lastAt: "", firstWrongAt: "" };
    a.seen += 1;
    a.lastAt = today();
    if (ok) { a.right += 1; a.last = "せいかい"; }
    else { a.wrong += 1; a.last = "まちがい"; if (!a.firstWrongAt) a.firstWrongAt = today(); }
    p.answers[en] = a;
    saveProgress(p);
  }
  function missEntries() {
    const p = getProgress();
    const pool = allWords();
    return Object.entries(p.answers || {})
      .filter(([, a]) => a.wrong > 0)
      .map(([en, a]) => {
        const w = pool.find((x) => x.en === en) || { en, k: en, s: en, j: en };
        return { en, ja: jaText(w), w: w, ...a };
      })
      .sort((a, b) => b.wrong - a.wrong || a.en.localeCompare(b.en));
  }
  function shuffleCopy(list) {
    const a = (list || []).slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }
  function seenWordItems() {
    const answers = getProgress().answers || {};
    return filteredWords().filter((w) => ((answers[w.en] || {}).seen || 0) > 0);
  }
  function clearedWordItems() {
    const done = new Set(getProgress().clearedEns || []);
    return filteredWords().filter((w) => done.has(w.en));
  }
  function missWordItems() {
    const allowed = new Set(filteredWords().map((w) => w.en));
    return missEntries().map((r) => r.w).filter((w) => w && allowed.has(w.en));
  }
  function battleStatus() {
    const left = unclearedWords().length;
    const parentN = parentWordPool().length;
    return { left: left, parentN: parentN, canPlay: left >= ROUND && parentN >= ROUND };
  }
  function pickBattleItems() {
    const kidItems = unclearedWords().slice(0, ROUND);
    if (kidItems.length < ROUND) return [];
    const used = new Set(kidItems.map((w) => w.en));
    let parentSrc = parentWordPool().filter((w) => !used.has(w.en));
    if (parentSrc.length < ROUND) parentSrc = parentWordPool().slice();
    if (parentSrc.length < ROUND) {
      wordQueue().forEach((w) => {
        if (!used.has(w.en) && parentSrc.indexOf(w) < 0) parentSrc.push(w);
      });
    }
    const parentItems = shuffleCopy(parentSrc).slice(0, ROUND);
    if (kidItems.length < ROUND || parentItems.length < ROUND) return [];
    const items = [];
    const sizes = [3, 3, 4];
    let ki = 0, pi = 0;
    sizes.forEach((n) => {
      for (let i = 0; i < n; i++) {
        items.push(kidItems[ki++]);
        items.push(parentItems[pi++]);
      }
    });
    return items;
  }
  function downloadMissExcel(rows) {
    rows = rows || missEntries();
    const cell = (v) => "<Cell><Data ss:Type=\"String\">" + esc(v) + "</Data></Cell>";
    let body = "<Row>" + ["英語", "日本語", "まちがい回数", "正解回数", "最後", "日付", "初めてまちがえた日"].map(cell).join("") + "</Row>";
    rows.forEach((r) => {
      body += "<Row>" + [r.en, String(r.ja).replace(/\n/g, " / "), r.wrong, r.right, r.last, r.lastAt, r.firstWrongAt || ""].map(cell).join("") + "</Row>";
    });
    const xml = "<?xml version=\"1.0\"?><?mso-application progid=\"Excel.Sheet\"?><Workbook xmlns=\"urn:schemas-microsoft-com:office:spreadsheet\" xmlns:ss=\"urn:schemas-microsoft-com:office:spreadsheet\"><Worksheet ss:Name=\"まちがえたたんご\"><Table>" + body + "</Table></Worksheet></Workbook>";
    const blob = new Blob(["\uFEFF" + xml], { type: "application/vnd.ms-excel" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "まちがえたたんご_" + today() + ".xls";
    a.click();
    URL.revokeObjectURL(a.href);
    toast("まちがいリストを保存したよ（" + rows.length + "語）");
  }
  async function exportBackup() {
    try { await migrateImagesOnce(); } catch (e) { /* テキストだけ出す */ }
    const all = readAll();
    const payload = {
      app: "kirameki-eigo",
      v: 5,
      key: STORE_KEY,
      exportedAt: today(),
      settings: all.settings,
      progress: all.progress,
      shop: all.shop,
      rescue: all.rescue,
      imageIds: sanitizeImageIds(all.imageIds)
    };
    Object.keys(all).forEach((k) => {
      if (payload[k] !== undefined || k === "images") return;
      payload[k] = all[k];
    });
    const blob = new Blob([JSON.stringify(payload)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "きらめきえいたんご_きろく_" + today() + ".json";
    a.click();
    URL.revokeObjectURL(a.href);
    toast("記録ファイルを保存したよ（学習記録と設定のみ）");
  }
  async function importBackupText(raw) {
    let data = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (!data || typeof data !== "object") throw new Error("format");
    try { await migrateImagesOnce(); } catch (e) { /* テキストだけ入れる */ }
    const prevIds = readImageIds();
    const all = blankAll();
    all.settings = normalizeSettings(data.settings || {});
    if (data.progress) {
      all.progress = {
        answers: data.progress.answers || {},
        clearedEns: Array.isArray(data.progress.clearedEns) ? data.progress.clearedEns : []
      };
    } else {
      all.progress.answers = mergeAnswers(collectOldAnswers(data.shop), collectOldAnswers(data.rescue), (data.state && data.state.answers) || {});
    }
    if (data.shop && data.shop.buddyByPlace) all.shop = { ribbons: data.shop.ribbons || 0, buddyByPlace: data.shop.buddyByPlace };
    if (data.rescue && typeof data.rescue.stage === "number") {
      all.rescue = {
        stage: data.rescue.stage || 0,
        tools: data.rescue.tools || [],
        stageEns: Array.isArray(data.rescue.stageEns) ? data.rescue.stageEns : []
      };
    }
    if (data.imageIds) all.imageIds = sanitizeImageIds(data.imageIds);
    else all.imageIds = prevIds;
    Object.keys(data).forEach((k) => {
      if (["app", "v", "key", "exportedAt", "images", "settings", "progress", "shop", "rescue", "state", "imageIds"].indexOf(k) >= 0) return;
      if (data[k] && typeof data[k] === "object") all[k] = data[k];
    });
    writeAll(all);
    applyTaste(all.settings.taste);
  }
  function maybeAutoExport() {
    if (!getSettings().autoExport) return;
    downloadMissExcel();
  }
  function flashTimes(ok) {
    return { flash: FLASH, wait: WAIT };
  }
  let reactWaitFinish = null;
  let clickShield = null;
  function eatClickThrough() {
    if (clickShield) {
      clearTimeout(clickShield.t);
      if (clickShield.el.parentNode) clickShield.el.remove();
    }
    const shield = document.createElement("div");
    shield.className = "click-shield";
    shield.setAttribute("aria-hidden", "true");
    const stop = (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
    };
    ["pointerdown", "pointerup", "click", "touchstart", "touchend", "mousedown", "mouseup"].forEach((type) => {
      shield.addEventListener(type, stop, true);
    });
    document.body.appendChild(shield);
    const t = setTimeout(() => {
      if (shield.parentNode) shield.remove();
      if (clickShield && clickShield.el === shield) clickShield = null;
    }, 400);
    clickShield = { el: shield, t: t };
  }
  function waitReact(ms) {
    const el = document.getElementById("react");
    if (reactWaitFinish) reactWaitFinish();
    return new Promise((resolve) => {
      let done = false;
      const finish = (fromUser) => {
        if (done) return;
        done = true;
        reactWaitFinish = null;
        if (el) {
          el.removeEventListener("click", onBg);
          if (fromUser) eatClickThrough();
          el.className = "react";
        }
        resolve();
      };
      const onBg = (ev) => {
        if (ev.target.closest(".react-box")) return;
        ev.preventDefault();
        ev.stopPropagation();
        finish(true);
      };
      reactWaitFinish = () => finish(false);
      if (el) el.addEventListener("click", onBg);
      setTimeout(() => finish(false), ms);
    });
  }
  function showPrize(box, allDone, game) {
    if (!box) return;
    const flags = prizeFlags();
    if (!flags.on || (!flags.all && !flags.level)) {
      box.hidden = true;
      return;
    }
    box.hidden = false;
    const st = getSettings();
    const allDoneNow = !!allDone || allWordsCleared();
    const cleared = clearedInQueue();
    const n = wordQueue().length;
    let gotLevel = 0;
    if (allDoneNow) gotLevel = levelCount();
    else if (cleared > 0 && cleared % LEVEL_WORDS === 0) gotLevel = cleared / LEVEL_WORDS;
    const nearLevel = gotLevel || levelDisplay();
    const allKey = game === "rescue" ? "prize-rescue" : "prize-shop";
    const allText = game === "rescue" ? st.rescuePrizeText : st.shopPrizeText;
    const near = box.querySelector("[data-prize-near]") || box;
    const far = box.querySelector("[data-prize-far]");
    const useLevelNear = flags.level;
    const nearKey = useLevelNear ? levelPrizeKey(nearLevel) : allKey;
    let nearText;
    if (useLevelNear) {
      nearText = gotLevel
        ? "レベル" + gotLevel + "クリア！ご褒美をGETだよ！"
        : levelPrizeText(nearLevel);
    } else {
      nearText = allDoneNow
        ? "全部できた！ご褒美をGETだよ！"
        : (allText || DEFAULT_SETTINGS.shopPrizeText);
    }
    const nearImg = near.querySelector("[data-prize-img]");
    const nearFb = near.querySelector("[data-prize-fallback]");
    const nearMsg = near.querySelector("[data-prize-msg]");
    getImage(nearKey).then((src) => fillPrizeImg(nearImg, nearFb, src)).catch(() => fillPrizeImg(nearImg, nearFb, ""));
    if (nearMsg) nearMsg.innerHTML = esc(nearText || "").replace(/\n/g, "<br>");
    if (far) {
      const showFar = flags.all && flags.level;
      far.hidden = !showFar;
      if (showFar) {
        const lab = far.querySelector("[data-prize-far-lab]");
        if (lab) lab.textContent = allDoneNow ? "全部クリアのご褒美" : "全部終わったら";
        const farImg = far.querySelector("[data-prize-far-img]") || far.querySelector("[data-prize-img]");
        const farFb = far.querySelector("[data-prize-far-fallback]") || far.querySelector("[data-prize-fallback]");
        const farMsg = far.querySelector("[data-prize-far-msg]");
        const farText = allDoneNow
          ? "全部できた！ご褒美をGETだよ！"
          : (allText || DEFAULT_SETTINGS.shopPrizeText);
        getImage(allKey).then((src) => fillPrizeImg(farImg, farFb, src)).catch(() => fillPrizeImg(farImg, farFb, ""));
        if (farMsg) farMsg.innerHTML = esc(farText).replace(/\n/g, "<br>");
      }
    }
  }

  function bindGuide(game) {
    const el = document.getElementById("guide");
    if (!el) return;
    const keys = { shop: "hideShopGuide", rescue: "hideRescueGuide", battle: "hideBattleGuide" };
    const key = keys[game] || "hideShopGuide";
    const go = document.getElementById("guide-go");
    const skip = document.getElementById("guide-skip");
    if (getSettings()[key]) return;
    el.classList.add("on");
    if (go) {
      go.addEventListener("click", () => {
        if (skip && skip.checked) {
          const patch = {};
          patch[key] = true;
          saveSettings(patch);
        }
        el.classList.remove("on");
      });
    }
  }

  applyTaste(getSettings().taste);
  migrateImagesOnce().catch(() => {});

  global.Kirameki = {
    STORE_KEY, ROUND, PLACE_SIZE, LEVEL_WORDS, SHOP_PLACES_PER_LEVEL, RESCUE_STOPS_PER_LEVEL, RESCUE_ROUNDS_PER_STOP,
    CHAR_IDS, CHAR_BY_TASTE, LEVELS, KANJI_MODES, TASTES, DEFAULT_SETTINGS, DEFAULT_NAMES, GAMES,
    today, esc, toast, applyTaste,
    getSettings, saveSettings, getProgress, saveProgress, getGame, saveGame, getShop, saveShop, getRescue, saveRescue, resetAll,
    displayName, levelsLabel, parentLevelsLabel, setImage, getImage, shrinkFile, previewPrize,
    filteredWords, parentWordPool, allWords, wordQueue, unclearedWords, nextRoundItems, itemsInPlace,
    placeCount, placeCleared, unlockedPlace, allWordsCleared, markCleared,
    unClearEns, unClearPlace, unClearPlaceFromStep, placeStepInfo, marksRowHtml, stepMarksHtml, unClearLast, resetCleared,
    clearedInQueue, levelCount, currentLevelIndex, levelDisplay, levelJustCleared, completedLevelDisplay,
    shopPlaceRange, rescueStopCount, rescueStopInfo, rescueCursor, unClearRescueFromStop,
    prizeFlags, levelPrizeKey, levelPrizeText, renderMapPrize,
    sense, jaLines, jaText, jaHtml, exampleHtml, choiceHtml, pickChoices,
    canSpeak, speakEnglish, bindSpeakButtons, setSpeakText, stopSpeak,
    recordAnswer, missEntries, downloadMissExcel,
    seenWordItems, clearedWordItems, missWordItems, battleStatus, pickBattleItems,
    exportBackup, importBackupText, maybeAutoExport, flashTimes, waitReact, showPrize, bindGuide
  };
})(window);
