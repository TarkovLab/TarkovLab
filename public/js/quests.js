var questState = {
  all: [],
  query: "",
  map: "all",
  trader: "all"
};

function questFiltered() {
  return questState.all.filter(function (q) {
    if (questState.map !== "all" && q.map !== questState.map) return false;
    if (questState.trader !== "all" && q.trader !== questState.trader) return false;
    if (questState.query.trim()) {
      var s = questState.query.toLowerCase();
      return (q.name || "").toLowerCase().indexOf(s) !== -1 ||
        (q.trader || "").toLowerCase().indexOf(s) !== -1 ||
        (q.map || "").toLowerCase().indexOf(s) !== -1;
    }
    return true;
  });
}

function questTraderLabel(t) {
  if (!t) return "Any";
  return t.replace(/_/g, " ");
}

function questMapLabel(m) {
  if (!m) return "—";
  return m.replace(/-/g, " ").replace(/\b\w/g, function (c) { return c.toUpperCase(); });
}

function questRows(list) {
  var html = "";
  for (var i = 0; i < list.length; i++) {
    var q = list[i];
    var kappa = q.kappa ? '<span class="pill kappa">Kappa</span>' : "";
    var lk = q.lightkeeper ? '<span class="pill lk">Lightkeeper</span>' : "";
    html += '<tr data-href="/quests/' + App.esc(q.id) + '">' +
      '<td><div class="qst">' +
      '<div class="nm">' + App.esc(q.name) + '</div>' +
      '</div></td>' +
      '<td>' + App.esc(questTraderLabel(q.trader)) + '</td>' +
      '<td>' + App.esc(questMapLabel(q.map)) + '</td>' +
      '<td>' + (q.minPlayerLevel != null ? q.minPlayerLevel : "—") + '</td>' +
      '<td>' + (q.experience != null ? q.experience.toLocaleString() : "—") + '</td>' +
      '<td>' + kappa + lk + '</td>' +
      '</tr>';
  }
  return html;
}

function questRenderTable() {
  var list = questFiltered();
  var count = App.$("q-count");
  if (count) count.innerHTML = "<b>" + list.length + "</b> / " + questState.all.length + " quests";

  var se = App.$("q-table");
  if (!se) return;

  if (list.length === 0) {
    se.innerHTML = '<div class="state"><span class="t">No results</span>No quests match the current filters.</div>';
    return;
  }

  se.innerHTML =
    '<div class="tbl-wrap"><table><thead><tr>' +
    '<th>Quest</th><th>Trader</th><th>Map</th><th>Min Level</th><th>Exp</th><th>Flags</th>' +
    '</tr></thead><tbody>' + questRows(list) + '</tbody></table></div>';

  var rows = se.querySelectorAll("tbody tr");
  for (var r = 0; r < rows.length; r++) {
    rows[r].addEventListener("click", function () {
      App.navigate(this.getAttribute("data-href"));
    });
    rows[r].style.cursor = "pointer";
  }
}

function questBindEvents() {
  var search = App.$("q-search");
  if (search) search.addEventListener("input", function (e) {
    questState.query = e.target.value;
    questRenderTable();
  });
  var mapSel = App.$("q-map");
  if (mapSel) mapSel.addEventListener("change", function (e) {
    questState.map = e.target.value;
    questRenderTable();
  });
  var tSel = App.$("q-trader");
  if (tSel) tSel.addEventListener("change", function (e) {
    questState.trader = e.target.value;
    questRenderTable();
  });
}

App.registerPage("/quests", "Quests", "Browse all quests with objectives, locations and map links.", "/assets/icon.png");

function renderQuests() {
  document.title = "TarkovLab | Quests";
  App.render(
    '<h1>Quests</h1>' +
    '<p class="sub">All Escape from Tarkov quests with objectives and in-game locations.</p>' +
    '<div class="toolbar">' +
      '<div class="search">' +
        '<span class="ic">&#x2315;</span>' +
        '<input id="q-search" type="text" placeholder="Search by name, trader or map..." autocomplete="off" />' +
      '</div>' +
      '<div class="filters" style="display:flex;gap:8px;align-items:center">' +
        '<select id="q-map" class="fselect"><option value="all">All maps</option></select>' +
        '<select id="q-trader" class="fselect"><option value="all">All traders</option></select>' +
      '</div>' +
      '<div class="count" id="q-count">Loading...</div>' +
    '</div>' +
    '<div id="q-table"><div class="state"><div class="spin"></div>Loading quests...</div></div>'
  );

  var query = "query { quests { id gameId name trader map minPlayerLevel kappa lightkeeper experience wiki objectives { id type description optional } } }";
  fetch(App.API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query: query })
  })
    .then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); })
    .then(function (j) {
      if (!j.data || !j.data.quests) throw new Error("Empty dataset");
      questState.all = j.data.quests;
      questBindEvents();
      var qMap = App.$("q-map");
      var qT = App.$("q-trader");
      if (qMap) {
        var mk = {};
        for (var i = 0; i < questState.all.length; i++) if (questState.all[i].map) mk[questState.all[i].map] = true;
        var keys = Object.keys(mk).sort();
        for (var m = 0; m < keys.length; m++) {
          qMap.innerHTML += '<option value="' + App.esc(keys[m]) + '">' + App.esc(questMapLabel(keys[m])) + '</option>';
        }
      }
      if (qT) {
        var tk = {};
        for (var i = 0; i < questState.all.length; i++) if (questState.all[i].trader) tk[questState.all[i].trader] = true;
        var keys = Object.keys(tk).sort();
        for (var t = 0; t < keys.length; t++) {
          qT.innerHTML += '<option value="' + App.esc(keys[t]) + '">' + App.esc(questTraderLabel(keys[t])) + '</option>';
        }
      }
      questRenderTable();
    })
    .catch(function (e) {
      console.error("Failed to load quests:", e.message);
      var se = App.$("q-table");
      if (se) se.innerHTML = '<div class="state err"><span class="t">Connection failed</span>Could not reach api.tarkovlab.org.</div>';
    });
}
