// TarkovLab — Quests (plain JS, no build step)
(function () {
  "use strict";

  var API = "https://api.tarkovlab.org/graphql";

  var GIVER_ID = { 0: "prapor", 1: "therapist", 2: "skier", 3: "peacekeeper", 4: "mechanic", 5: "ragman", 6: "jaeger", 7: "fence", 8: "ref", 9: "lightkeeper" };
  var ID_GIVER = { prapor: 0, therapist: 1, skier: 2, peacekeeper: 3, mechanic: 4, ragman: 5, jaeger: 6, fence: 7, ref: 8, lightkeeper: 9 };
  var GIVER_NAME = { 0: "Prapor", 1: "Therapist", 2: "Skier", 3: "Peacekeeper", 4: "Mechanic", 5: "Ragman", 6: "Jaeger", 7: "Fence", 8: "Ref", 9: "Lightkeeper" };
  var MAP = { 0: "Factory", 1: "Customs", 2: "Woods", 3: "Shoreline", 4: "Lighthouse", 5: "Reserve", 6: "Interchange", 7: "The Lab", 8: "Streets of Tarkov", 9: "Ground Zero" };
  var ITEM = {
    "54491c4f4bdc2db1078b4568": "MP-133 12g shotgun",
    "5937ee6486f77408994ba448": "Machinery key",
    "5780d0532459777a5108b9a2": "Tarcone Director's office key",
    "590a3b4e86f7742f7c46ab72": "Gas analyzer",
    "590a3efd86f77437d351a251": "Salewa first aid kit",
    "5af0534a86f77434190c1767": "Lebel rifle",
    "57347ca924597744596b4e62": "Graphics card",
    "5c0677f486f77426123e4450": "Physical Bitcoin",
    "590a3e3c86f7742d4f3b6d08": "CMS surgical kit"
  };

  var state = { quests: [], selected: null, query: "", trader: "all" };

  function $(id) { return document.getElementById(id); }
  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }

  function setStatus(online) {
    var el = $("status"), txt = $("stxt");
    if (el) el.className = "status " + (online ? "on" : "off");
    if (txt) txt.textContent = online ? "API ONLINE" : "API OFFLINE";
  }

  function fmtObj(o) {
    var target = "Target";
    if (typeof o.target === "string" && o.target.charAt(0) === "[" && o.target.charAt(o.target.length - 1) === "]") {
      try {
        var arr = JSON.parse(o.target);
        target = Array.isArray(arr) ? arr.map(function (t) { return ITEM[t] || t; }).join(" or ") : (ITEM[o.target] || o.target);
      } catch (e) { target = o.target; }
    } else {
      target = ITEM[o.target] || o.target || "Target";
    }
    var num = o.number > 1 ? o.number + "x " : "";
    var loc = (o.location !== undefined && o.location !== -1) ? " on " + (MAP[o.location] || "map") : "";
    switch (o.type) {
      case "kill": return "Eliminate " + o.number + " " + target + loc;
      case "collect": return "Hand over " + num + target;
      case "pickup": return "Find " + num + target + " in raid" + loc;
      case "key": return "Obtain key for " + target;
      case "locate": return "Locate " + target + loc;
      default: return (o.type || "action").toUpperCase() + ": " + num + target + loc;
    }
  }

  function load() {
    var query = "query { quests { id title exp giver turnin wiki reputation { trader rep } require { level quests } objectives { id type target number location } unlocks } }";
    fetch(API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: query })
    })
      .then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); })
      .then(function (j) {
        if (!j.data || !j.data.quests) throw new Error("Empty dataset");
        state.quests = j.data.quests;
        setStatus(true);
        renderList();
        if (state.quests.length) select(state.quests[0].id);
      })
      .catch(function (e) {
        console.error("Failed to load quests:", e.message);
        setStatus(false);
        var l = $("qlist");
        if (l) l.innerHTML = '<div class="state err"><span class="t">Connection failed</span>Could not reach api.tarkovlab.org.</div>';
      });
  }

  function getFiltered() {
    return state.quests.filter(function (q) {
      if (state.trader !== "all" && q.giver !== ID_GIVER[state.trader]) return false;
      if (state.query.trim()) {
        var ql = state.query.toLowerCase();
        var t = q.title.toLowerCase().indexOf(ql) !== -1;
        var g = (GIVER_NAME[q.giver] || "").toLowerCase().indexOf(ql) !== -1;
        var o = (q.objectives || []).some(function (ob) { return fmtObj(ob).toLowerCase().indexOf(ql) !== -1; });
        return t || g || o;
      }
      return true;
    });
  }

  function renderList() {
    var l = $("qlist");
    if (!l) return;
    var list = getFiltered();

    var cnt = $("count");
    if (cnt) cnt.innerHTML = "<b>" + list.length + "</b> / " + state.quests.length + " quests";

    if (list.length === 0) {
      l.innerHTML = '<div class="state"><span class="t">No results</span>No quests match the current filters.</div>';
      return;
    }

    var html = "";
    for (var i = 0; i < list.length; i++) {
      var q = list[i];
      var giver = GIVER_NAME[q.giver] || ("Giver " + q.giver);
      var on = q.id === state.selected ? " on" : "";
      html +=
        '<div class="qrow' + on + '" data-id="' + q.id + '">' +
          '<div class="top"><span class="giver">' + esc(giver) + '</span><span class="qid">#' + q.id + '</span></div>' +
          '<div class="ttl">' + esc(q.title) + '</div>' +
          '<div class="meta"><span>EXP <b>' + (q.exp ? q.exp.toLocaleString() : 0) + '</b></span>' +
          '<span>OBJ <b>' + (q.objectives ? q.objectives.length : 0) + '</b></span></div>' +
        '</div>';
    }
    l.innerHTML = html;

    var rows = l.querySelectorAll(".qrow");
    for (var k = 0; k < rows.length; k++) {
      rows[k].addEventListener("click", function () {
        select(Number(this.getAttribute("data-id")));
      });
    }
  }

  function select(id) {
    state.selected = id;
    var rows = document.querySelectorAll(".qrow");
    for (var i = 0; i < rows.length; i++) {
      rows[i].classList.toggle("on", Number(rows[i].getAttribute("data-id")) === id);
    }
    renderDetail();
  }

  function renderDetail() {
    var q = null;
    for (var i = 0; i < state.quests.length; i++) {
      if (state.quests[i].id === state.selected) { q = state.quests[i]; break; }
    }
    var empty = $("empty"), body = $("body");
    if (!q) {
      if (empty) empty.style.display = "block";
      if (body) body.style.display = "none";
      return;
    }
    if (empty) empty.style.display = "none";
    if (body) body.style.display = "block";

    var giverId = GIVER_ID[q.giver] || "fence";
    var giverName = GIVER_NAME[q.giver] || ("Trader " + q.giver);
    var p = "https://assets.tarkovlab.org/traders/" + giverId + ".webp";
    var s = "https://assets.tarkovlab.org/traders/" + (giverId === "jaeger" ? "jeager" : giverId) + ".webp";
    var dh = $("dhead");
    if (dh) {
      dh.innerHTML =
        '<img src="' + p + '" alt="" onerror="this.onerror=null;this.src=\'' + s + '\';this.addEventListener(\'error\',function(){this.src=\'https://assets.tarkovlab.org/traders/fence.webp\';})" />' +
        '<div><div class="lbl">Task &middot; ' + esc(giverName) + '</div>' +
        '<div class="ttl">' + esc(q.title) + '</div>' +
        '<div class="sub"><span><b>ID</b> ' + q.id + '</span><span><b>EXP</b> ' + (q.exp ? q.exp.toLocaleString() : 0) + '</span></div></div>';
    }

    var wiki = $("wiki");
    if (wiki) {
      wiki.innerHTML = q.wiki
        ? '<a class="wlink" href="' + esc(q.wiki) + '" target="_blank" rel="noopener">Open wiki briefing ↗</a>'
        : '<span class="dim">No external briefing link available.</span>';
    }

    var objs = $("objs");
    if (objs) {
      var oList = q.objectives || [];
      if (oList.length) {
        objs.innerHTML = oList.map(function (o) { return "<li>" + esc(fmtObj(o)) + "</li>"; }).join("");
      } else {
        objs.innerHTML = '<li class="dim">No objectives listed.</li>';
      }
    }

    var rews = $("rews");
    if (rews) {
      var r = [];
      if (q.exp) r.push("+" + q.exp.toLocaleString() + " EXP");
      (q.reputation || []).forEach(function (rep) {
        var t = GIVER_NAME[rep.trader] || ("Trader " + rep.trader);
        r.push((rep.rep >= 0 ? "+" : "") + rep.rep.toFixed(2) + " " + t + " reputation");
      });
      (q.unlocks || []).forEach(function (u) { r.push("Unlocks: " + (ITEM[u] || u)); });
      rews.innerHTML = r.length
        ? r.map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("")
        : '<li class="dim">No rewards listed.</li>';
    }

    var reqs = $("reqs");
    if (reqs) {
      var lvl = q.require && q.require.level;
      var rq = q.require && q.require.quests;
      var html = "";
      if (lvl) html += "<div>Minimum level: <strong>" + lvl + "</strong></div>";
      if (rq && rq.length) {
        html += "<div>Required quests:</div><ul>";
        html += rq.map(function (id) {
          var found = null;
          for (var i = 0; i < state.quests.length; i++) { if (state.quests[i].id === id) { found = state.quests[i]; break; } }
          return "<li>- " + esc(found ? found.title : ("Task #" + id)) + "</li>";
        }).join("");
        html += "</ul>";
      }
      if (!lvl && (!rq || !rq.length)) html = '<span class="dim">No prerequisites.</span>';
      reqs.innerHTML = html;
    }
  }

  function bind() {
    var search = $("search");
    if (search) search.addEventListener("input", function (e) {
      state.query = e.target.value;
      renderList();
    });

    var filters = $("filters");
    if (filters) {
      var btns = filters.querySelectorAll(".fbtn");
      for (var i = 0; i < btns.length; i++) {
        btns[i].addEventListener("click", function () {
          for (var j = 0; j < btns.length; j++) btns[j].classList.remove("on");
          this.classList.add("on");
          state.trader = this.getAttribute("data-t");
          renderList();
          var f = getFiltered();
          if (f.length) select(f[0].id);
          else { state.selected = null; renderDetail(); }
        });
      }
    }
  }

  document.addEventListener("DOMContentLoaded", function () {
    bind();
    load();
  });
})();
