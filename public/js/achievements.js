var ACH_CATEGORY_LABEL = {
  boss: "Boss",
  event: "Event",
  kill: "Kill",
  prestige: "Prestige",
  pvp: "PvP",
  quests: "Quests",
  raid: "Raid",
  storyline: "Storyline"
};

var ACH_RANK = { common: 0, rare: 1, legendary: 2 };

var achState = {
  all: [],
  query: "",
  rarity: "all",
  hiddenOnly: false,
  sort: null,
  sortDir: 0
};

var ACH_CAT_ORDER = ["raid", "kill", "pvp", "boss", "quests", "event", "prestige", "storyline"];

function achNormRarity(a) {
  return a.normalizedRarity || String(a.rarity || "").toLowerCase();
}

function achFiltered() {
  return achState.all.filter(function (a) {
    if (achState.hiddenOnly && !a.hidden) return false;
    if (achState.rarity !== "all" && achNormRarity(a) !== achState.rarity) return false;
    if (achState.query.trim()) {
      var q = achState.query.toLowerCase();
      return a.name.toLowerCase().indexOf(q) !== -1 ||
        (a.description || "").toLowerCase().indexOf(q) !== -1;
    }
    return true;
  });
}

function achSorted(list) {
  if (!achState.sort || achState.sortDir === 0) return list;
  var dir = achState.sortDir;
  var sorted = list.slice();
  sorted.sort(function (a, b) {
    var c = 0;
    if (achState.sort === "name") {
      c = a.name.localeCompare(b.name);
    } else if (achState.sort === "rarity") {
      var ra = ACH_RANK[achNormRarity(a)]; if (ra === undefined) ra = 9;
      var rb = ACH_RANK[achNormRarity(b)]; if (rb === undefined) rb = 9;
      c = ra - rb;
    } else if (achState.sort === "hidden") {
      c = (a.hidden ? 1 : 0) - (b.hidden ? 1 : 0);
    } else if (achState.sort === "pvp") {
      c = (a.PvPOnly ? 1 : 0) - (b.PvPOnly ? 1 : 0);
    }
    return c * dir;
  });
  return sorted;
}

function achGroupByCategory(list) {
  var groups = {};
  for (var i = 0; i < list.length; i++) {
    var a = list[i];
    var cat = a.category || "other";
    if (!groups[cat]) groups[cat] = [];
    groups[cat].push(a);
  }
  var result = [];
  for (var k = 0; k < ACH_CAT_ORDER.length; k++) {
    var c = ACH_CAT_ORDER[k];
    if (groups[c] && groups[c].length) result.push({ category: c, items: groups[c] });
  }
  return result;
}

function achRenderCount(shown) {
  var el = App.$("ach-count");
  if (!el) return;
  var hidden = achState.all.filter(function (a) { return a.hidden; }).length;
  el.innerHTML = "<b>" + shown + "</b> / " + achState.all.length +
    " achievements &middot; <span class='h'>" + hidden + "</span> hidden";
}

function achSortArrow(key) {
  if (achState.sort !== key || achState.sortDir === 0) return "";
  return achState.sortDir === 1 ? " &#x25B2;" : " &#x25BC;";
}

function achSortClick(key) {
  if (achState.sort === key) {
    if (achState.sortDir === 1) {
      achState.sortDir = -1;
    } else if (achState.sortDir === -1) {
      achState.sort = null;
      achState.sortDir = 0;
    }
  } else {
    achState.sort = key;
    achState.sortDir = 1;
  }
  achRenderTable();
}

function renderTh(label, sortKey) {
  var cls = "";
  if (achState.sort === sortKey && achState.sortDir !== 0) {
    cls = achState.sortDir === 1 ? " asc" : " desc";
  }
  return '<th class="c-sort' + cls + '" data-sort="' + sortKey + '">' + label + '<span class="ar"></span></th>';
}

function achRenderTable() {
  var list = achSorted(achFiltered());
  achRenderCount(list.length);

  var se = App.$("ach-sections");
  if (!se) return;

  if (list.length === 0) {
    se.innerHTML = '<div class="state"><span class="t">No results</span>No achievements match the current filters.</div>';
    return;
  }

  var isSorted = achState.sort && achState.sortDir !== 0;
  var html = "";

  if (isSorted) {
    html += '<section class="cat-section"><div class="tbl-wrap"><table><thead><tr>' +
      renderTh("Achievement", "name") +
      renderTh("Rarity", "rarity") +
      renderTh("Hidden", "hidden") +
      renderTh("PvP", "pvp") +
      '</tr></thead><tbody>';
    for (var i = 0; i < list.length; i++) {
      html += achRowHtml(list[i]);
    }
    html += '</tbody></table></div></section>';
  } else {
    var groups = achGroupByCategory(list);
    for (var g = 0; g < groups.length; g++) {
      var grp = groups[g];
      var label = ACH_CATEGORY_LABEL[grp.category] || grp.category.charAt(0).toUpperCase() + grp.category.slice(1);
      html += '<section class="cat-section">';
      html += '<h2 class="cat-head">' + App.esc(label) + ' <span class="cat-count">' + grp.items.length + '</span></h2>';
      html += '<div class="tbl-wrap"><table><thead><tr>' +
        renderTh("Achievement", "name") +
        renderTh("Rarity", "rarity") +
        renderTh("Hidden", "hidden") +
        renderTh("PvP", "pvp") +
        '</tr></thead><tbody>';
      for (var i = 0; i < grp.items.length; i++) {
        html += achRowHtml(grp.items[i]);
      }
      html += '</tbody></table></div></section>';
    }
  }

  se.innerHTML = html;

  var ths = se.querySelectorAll("thead th[data-sort]");
  for (var t = 0; t < ths.length; t++) {
    ths[t].addEventListener("click", function () {
      achSortClick(this.getAttribute("data-sort"));
    });
  }

  var rows = se.querySelectorAll("tbody tr");
  for (var r = 0; r < rows.length; r++) {
    rows[r].addEventListener("click", function () {
      App.navigate(this.getAttribute("data-href"));
    });
    rows[r].style.cursor = "pointer";
  }
}

function achRowHtml(a) {
  var rarity = achNormRarity(a);
  var img = a.imageLink || App.FALLBACK;
  var hiddenBadge = a.hidden
    ? '<span class="pill hide">&#x2298; Hidden</span>'
    : '<span class="pill vis">Visible</span>';
  var pvpBadge = a.PvPOnly
    ? '<span class="pill pvp">PvP</span>'
    : '<span class="pill vis">—</span>';
  return '<tr class="' + rarity + '" data-href="/achievement?id=' + App.esc(a.id) + '">' +
    '<td><div class="ach">' +
    '<img src="' + App.esc(img) + '" alt="" loading="lazy" onerror="this.onerror=null;this.src=\'' + App.FALLBACK + '\';" />' +
    '<div><div class="nm">' + App.esc(a.name) + '</div>' +
    '<div class="ds">' + App.esc(a.description || "No description available.") + '</div></div>' +
    '</div></td>' +
    '<td><span class="pill ' + rarity + '">' + App.esc(a.rarity || "Unknown") + '</span></td>' +
    '<td>' + hiddenBadge + '</td>' +
    '<td>' + pvpBadge + '</td>' +
    '</tr>';
}

function achBindEvents() {
  var search = App.$("ach-search");
  if (search) search.addEventListener("input", function (e) {
    achState.query = e.target.value;
    achRenderTable();
  });

  var filters = App.$("ach-filters");
  if (filters) {
    var btns = filters.querySelectorAll(".fbtn");
    for (var i = 0; i < btns.length; i++) {
      btns[i].addEventListener("click", function () {
        var r = this.getAttribute("data-r");
        if (r === "hidden") {
          achState.hiddenOnly = !achState.hiddenOnly;
          this.classList.toggle("on", achState.hiddenOnly);
        } else {
          achState.rarity = r;
          var all = filters.querySelectorAll('.fbtn[data-r]');
          for (var j = 0; j < all.length; j++) {
            if (all[j].getAttribute("data-r") !== "hidden") all[j].classList.remove("on");
          }
          this.classList.add("on");
        }
        achRenderTable();
      });
    }
  }
}

App.registerPage("/achievements", "Achievements", "Browse all achievements grouped by category, with search and rarity filters.", "/assets/icon.png");

function renderAchievements() {
  App.render(
    '<h1>Achievements</h1>' +
    '<p class="sub">All Escape from Tarkov achievements grouped by category.</p>' +
    '<div class="toolbar">' +
      '<div class="search">' +
        '<span class="ic">&#x2315;</span>' +
        '<input id="ach-search" type="text" placeholder="Search by name or description..." autocomplete="off" />' +
      '</div>' +
      '<div class="filters" id="ach-filters">' +
        '<button class="fbtn on" data-r="all">All</button>' +
        '<button class="fbtn" data-r="common">Common</button>' +
        '<button class="fbtn" data-r="rare">Rare</button>' +
        '<button class="fbtn" data-r="legendary">Legendary</button>' +
        '<button class="fbtn" data-r="hidden">Hidden</button>' +
      '</div>' +
      '<div class="count" id="ach-count">Loading...</div>' +
    '</div>' +
    '<div id="ach-sections"></div>'
  );

  achBindEvents();

  var query = "query { achievements { id gameId name description rarity normalizedRarity hidden PvPOnly imageLink category } }";
  fetch(App.API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query: query })
  })
    .then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); })
    .then(function (j) {
      if (!j.data || !j.data.achievements) throw new Error("Empty dataset");
      achState.all = j.data.achievements;
      App.setStatus(true);
      achRenderTable();
    })
    .catch(function (e) {
      console.error("Failed to load achievements:", e.message);
      App.setStatus(false);
      var se = App.$("ach-sections");
      if (se) se.innerHTML = '<div class="state err"><span class="t">Connection failed</span>Could not reach api.tarkovlab.org.</div>';
    });
}
