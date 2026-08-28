(function (global) {
  const W = global.KiramekiWorld;
  function taste() {
    return (window.Kirameki && Kirameki.getSettings().taste) || "kawaii";
  }
  function currentChars() {
    return W.charasByTaste[taste()] || W.charasByTaste.kawaii;
  }
  function customChars() {
    return W.customCharas || [];
  }
  function atlasChars() {
    return currentChars().concat(customChars());
  }
  function allowedIds() {
    return (W.charIdsByTaste[taste()] || W.charIdsByTaste.kawaii).concat(W.customCharIds || []);
  }
  function byId(id) {
    return customChars().find((c) => c.id === id)
      || W.allCharas.find((c) => c.id === id)
      || currentChars()[0];
  }
  function playerChar() {
    const ids = allowedIds();
    const id = window.Kirameki && Kirameki.getSettings().playerId;
    return byId(ids.indexOf(id) >= 0 ? id : W.defaultPlayer[taste()]);
  }
  function friendChar() {
    const ids = allowedIds();
    const id = window.Kirameki && Kirameki.getSettings().friendId;
    return byId(ids.indexOf(id) >= 0 ? id : W.defaultFriend[taste()]);
  }
  function shopChars() {
    const pool = atlasChars();
    const fallback = currentChars();
    const ids = (window.Kirameki && Kirameki.getSettings().shopBuddyIds) || fallback.map((c) => c.id);
    const list = pool.filter((c) => ids.indexOf(c.id) >= 0);
    return list.length ? list : fallback.slice();
  }
  function shownName(c) {
    return (window.Kirameki && Kirameki.displayName(c.id)) || c.name;
  }
  function preloadMoods() {
    const ids = (W.allCharIds || []).slice();
    ids.forEach((id) => {
      ["happy", "sad"].forEach((m) => {
        const img = new Image();
        img.src = "img/char/" + id + "-" + m + ".jpg";
      });
    });
  }
  function phHtml(c, mood, size) {
    const nm = shownName(c);
    const cls = "face face-ph" + (mood === "happy" ? " mood-happy" : mood === "sad" ? " mood-sad" : "");
    const letter = (nm || "?").slice(0, 1);
    return `<span class="${cls}" style="width:${size}px;height:${size}px;line-height:${size}px">${letter}</span>`;
  }
  async function faceHtml(c, mood, size) {
    const nm = shownName(c);
    const cls = "face" + (mood === "happy" ? " mood-happy" : mood === "sad" ? " mood-sad" : "");
    if (c.custom) {
      const key = mood === "sad" ? ("friend-" + c.id + "-sad") : ("friend-" + c.id + "-happy");
      const src = window.Kirameki && await Kirameki.getImage(key);
      if (!src) return phHtml(c, mood, size);
      return `<img class="${cls}" src="${src}" alt="${nm}" width="${size}" height="${size}">`;
    }
    const custom = window.Kirameki && await Kirameki.getImage("friend-" + c.id);
    const base = "img/char/" + c.id + ".jpg";
    const wantMood = !custom && (mood === "happy" || mood === "sad");
    const moodSrc = wantMood ? ("img/char/" + c.id + "-" + mood + ".jpg") : "";
    const src = custom || moodSrc || base;
    const fb = " onerror=\"this.onerror=null;this.src='" + base + "'\"";
    return `<img class="${cls}" src="${src}" alt="${nm}" width="${size}" height="${size}"${fb}>`;
  }
  global.KiramekiChars = {
    get CHARAS() { return currentChars(); },
    currentChars, customChars, atlasChars, byId, playerChar, friendChar, shopChars, faceHtml, shownName, preloadMoods
  };
})(window);
