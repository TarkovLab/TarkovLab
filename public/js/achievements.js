// TarkovLab — Achievements (plain JS, no build step)
(function () {
  "use strict";

  var API = "https://api.tarkovlab.org/graphql";
  var FALLBACK = "/assets/icon.png";
  var RANK = { common: 0, rare: 1, legendary: 2 };

  var state = {
    all: [],
    query: "",
    rarity: "all",
    hiddenOnly: false,
    sortKey: "rarity",
    sortDir: "asc"
  };

  function $(id) { return document.getElementById(id); }

  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }

  function normRarity(a) {
    return a.normalizedRarity || String(a.rarity || "").toLowerCase();
  }

  function setStatus(online) {
    var el = $("status"), txt = $("stxt");
    if (el) el.className = "status " + (online ? "on" : "off");
    if (txt) txt.textContent = online ? "API ONLINE" : "API OFFLINE";
  }

  function load() {
    var query = "query { achievements { id name description rarity normalizedRarity hidden imageLink gameId } }";
    fetch(API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: query })
    })
      .then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); })
      .then(function (j) {
        if (!j.data || !j.data.achievements) throw new Error("Empty dataset");
        state.all = j.data.achievements;
        setStatus(true);
        render();
      })
      .catch(function (e) {
        console.error("Failed to load achievements:", e.message);
        setStatus(false);
        var tb = $("tbody");
        if (tb) tb.innerHTML = '<tr><td colspan="3"><div class="state err"><span class="t">Connection failed</span>Could not reach api.tarkovlab.org.</div></td></tr>';
      });
  }

  function filtered() {
    var list = state.all.filter(function (a) {
      if (state.hiddenOnly && !a.hidden) return false;
      if (state.rarity !== "all" && normRarity(a) !== state.rarity) return false;
      if (state.query.trim()) {
        var q = state.query.toLowerCase();
        return a.name.toLowerCase().indexOf(q) !== -1 ||
          (a.description || "").toLowerCase().indexOf(q) !== -1;
      }
      return true;
    });

    var dir = state.sortDir === "asc" ? 1 : -1;
    list.sort(function (a, b) {
      var c = 0;
      if (state.sortKey === "name") {
        c = a.name.localeCompare(b.name);
      } else if (state.sortKey === "rarity") {
        var ra = RANK[normRarity(a)]; if (ra === undefined) ra = 9;
        var rb = RANK[normRarity(b)]; if (rb === undefined) rb = 9;
        c = ra - rb;
        if (c === 0) c = a.name.localeCompare(b.name);
      } else {
        c = (a.hidden ? 1 : 0) - (b.hidden ? 1 : 0);
        if (c === 0) c = a.name.localeCompare(b.name);
      }
      return c * dir;
    });
    return list;
  }

  function renderCount(shown) {
    var el = $("count");
    if (!el) return;
    var hidden = state.all.filter(function (a) { return a.hidden; }).length;
    el.innerHTML = "<b>" + shown + "</b> / " + state.all.length +
      " achievements &middot; <span class='h'>" + hidden + "</span> hidden";
  }

  function render() {
    var list = filtered();
    renderCount(list.length);

    var tb = $("tbody");
    if (!tb) return;

    if (list.length === 0) {
      tb.innerHTML = '<tr><td colspan="3"><div class="state"><span class="t">No results</span>No achievements match the current filters.</div></td></tr>';
      return;
    }

    var html = "";
    for (var i = 0; i < list.length; i++) {
      var a = list[i];
      var rarity = normRarity(a);
      var img = a.imageLink || FALLBACK;
      var status = a.hidden
        ? '<span class="pill hide">⊘ Hidden</span>'
        : '<span class="pill vis">Visible</span>';
      html +=
        '<tr class="' + rarity + '">' +
          '<td><div class="ach">' +
            '<img src="' + esc(img) + '" alt="" loading="lazy" onerror="this.onerror=null;this.src=\'' + FALLBACK + '\';" />' +
            '<div><div class="nm">' + esc(a.name) + '</div>' +
            '<div class="ds">' + esc(a.description || "No description available.") + '</div></div>' +
          '</div></td>' +
          '<td class="c-rarity"><span class="pill ' + rarity + '">' + esc(a.rarity || "Unknown") + '</span></td>' +
          '<td class="c-status">' + status + '</td>' +
        '</tr>';
    }
    tb.innerHTML = html;
  }

  function updateArrows() {
    var ths = document.querySelectorAll("thead th[data-s]");
    for (var i = 0; i < ths.length; i++) {
      ths[i].classList.remove("asc", "desc");
      if (ths[i].getAttribute("data-s") === state.sortKey) {
        ths[i].classList.add(state.sortDir);
      }
    }
  }

  function bind() {
    var search = $("search");
    if (search) search.addEventListener("input", function (e) {
      state.query = e.target.value;
      render();
    });

    var filters = $("filters");
    if (filters) {
      var btns = filters.querySelectorAll(".fbtn");
      for (var i = 0; i < btns.length; i++) {
        btns[i].addEventListener("click", function () {
          var r = this.getAttribute("data-r");
          if (r === "hidden") {
            state.hiddenOnly = !state.hiddenOnly;
            this.classList.toggle("on", state.hiddenOnly);
          } else {
            state.rarity = r;
            var all = filters.querySelectorAll('.fbtn[data-r]');
            for (var j = 0; j < all.length; j++) {
              if (all[j].getAttribute("data-r") !== "hidden") all[j].classList.remove("on");
            }
            this.classList.add("on");
          }
          render();
        });
      }
    }

    var ths = document.querySelectorAll("thead th[data-s]");
    for (var k = 0; k < ths.length; k++) {
      ths[k].addEventListener("click", function () {
        var key = this.getAttribute("data-s");
        if (state.sortKey === key) {
          state.sortDir = state.sortDir === "asc" ? "desc" : "asc";
        } else {
          state.sortKey = key;
          state.sortDir = "asc";
        }
        updateArrows();
        render();
      });
    }
    updateArrows();
  }

  document.addEventListener("DOMContentLoaded", function () {
    bind();
    load();
  });
})();
