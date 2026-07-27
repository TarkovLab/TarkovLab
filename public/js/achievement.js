function renderAchievement(id) {
  if (!id) {
    App.render('<div class="state err"><span class="t">No achievement ID</span>Please select an achievement from the list.</div>');
    return;
  }

  App.render(
    '<a href="/achievements" class="back-link">&larr; Back to Achievements</a>' +
    '<div id="ach-detail"><div class="state"><div class="spin"></div>Loading achievement...</div></div>'
  );

  var safeId = App.esc(id);
  var query = 'query { achievement(id: "' + safeId + '") { id gameId name description rarity normalizedRarity hidden PvPOnly imageLink category } }';
  fetch(App.API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query: query })
  })
    .then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); })
    .then(function (j) {
      if (!j.data || !j.data.achievement) throw new Error("Not found");
      achRenderDetail(j.data.achievement);
      document.title = "TarkovLab | " + j.data.achievement.name;
    })
    .catch(function (e) {
      console.error("Failed to load achievement:", e.message);
      var de = App.$("ach-detail");
      if (de) de.innerHTML = '<div class="state err"><span class="t">Failed to load</span>' + App.esc(e.message) + '</div>';
    });
}

function achRenderDetail(a) {
  var de = App.$("ach-detail");
  if (!de) return;

  var CATEGORY_LABEL = {
    boss: "Boss", event: "Event", kill: "Kill", prestige: "Prestige",
    pvp: "PvP", quests: "Quests", raid: "Raid", storyline: "Storyline"
  };

  var rarity = a.normalizedRarity || String(a.rarity || "").toLowerCase();
  var img = a.imageLink || App.FALLBACK;
  var catLabel = CATEGORY_LABEL[a.category] || a.category;

  var badges = "";
  if (a.hidden) badges += '<span class="pill hide">&#x2298; Hidden</span> ';
  if (a.PvPOnly) badges += '<span class="pill pvp">PvP Only</span> ';

  de.innerHTML =
    '<div class="ach-detail">' +
      '<div class="ach-dhead">' +
        '<img src="' + App.esc(img) + '" alt="" onerror="this.onerror=null;this.src=\'' + App.FALLBACK + '\';" />' +
        '<div>' +
          '<div class="ach-dcat">' + App.esc(catLabel) + '</div>' +
          '<h2 class="ach-dname">' + App.esc(a.name) + '</h2>' +
          '<div class="ach-dmeta">' +
            '<span class="pill ' + rarity + '">' + App.esc(a.rarity || "Unknown") + '</span> ' +
            badges +
          '</div>' +
        '</div>' +
      '</div>' +

      '<div class="sec">' +
        '<div class="h">Description</div>' +
        '<p class="ach-ddesc">' + App.esc(a.description || "No description available.") + '</p>' +
      '</div>' +

      '<div class="sec">' +
        '<div class="h">Identifiers</div>' +
        '<div class="ach-dids">' +
          '<div class="ach-id-row"><span class="ach-id-label">ID</span><code class="ach-id-val">' + App.esc(a.id) + '</code><button class="copy-btn" data-copy="' + App.esc(a.id) + '">Copy</button></div>' +
          '<div class="ach-id-row"><span class="ach-id-label">Game ID</span><code class="ach-id-val">' + App.esc(a.gameId) + '</code><button class="copy-btn" data-copy="' + App.esc(a.gameId) + '">Copy</button></div>' +
        '</div>' +
      '</div>' +
    '</div>';

  var btns = de.querySelectorAll(".copy-btn");
  for (var i = 0; i < btns.length; i++) {
    btns[i].addEventListener("click", function () {
      App.copyToClipboard(this.getAttribute("data-copy"));
      App.showCopied(this);
    });
  }
}
