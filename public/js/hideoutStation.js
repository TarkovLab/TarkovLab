function hideoutDuration(ms) {
  if (!ms) return "—";
  var sec = Math.round(ms / 1000);
  var h = Math.floor(sec / 3600);
  var m = Math.floor((sec % 3600) / 60);
  if (h >= 24) {
    var d = Math.floor(h / 24);
    h = h % 24;
    return d + "d " + (h ? h + "h" : "");
  }
  if (h > 0) return h + "h" + (m ? " " + m + "m" : "");
  return m + "m";
}

function hideoutItemReqHtml(r) {
  return tileItemHtml(r.item, r.count > 1 ? r.count : null, { fir: !!r.foundInRaid });
}

function hideoutStationReqHtml(r) {
  return '<span class="pill">' + App.esc(r.station) + ' Lv' + r.level + '</span> ';
}

function hideoutTraderReqHtml(r) {
  return '<span class="pill">' + App.esc(r.trader) + ' LL' + (r.value != null ? r.value : "?") + '</span> ';
}

function hideoutSkillReqHtml(r) {
  return '<span class="pill">' + App.esc(r.name) + ' ' + r.level + '</span> ';
}

function hideoutCopyRow(label, value) {
  if (!value) return '<div class="qst-meta-row"><span class="qst-meta-label">' + label + '</span><span class="qst-meta-val">—</span></div>';
  return '<div class="qst-meta-row"><span class="qst-meta-label">' + label + '</span><span class="qst-meta-val">' +
    '<code class="qst-id">' + App.esc(value) + '</code>' +
    '<button class="copy-btn" data-copy="' + App.esc(value) + '">Copy</button>' +
    '</span></div>';
}

function hideoutMetaRow(label, value) {
  return '<div class="qst-meta-row"><span class="qst-meta-label">' + label + '</span><span class="qst-meta-val">' + value + '</span></div>';
}

function hideoutStationRenderDetail(s) {
  var de = App.$("h-detail");
  if (!de) return;

  var levelsHtml = "";
  if (s.levels && s.levels.length > 0) {
    levelsHtml = '<div class="sec"><div class="h">Upgrade levels <span class="cat-count">' + s.levels.length + '</span></div>';
    for (var i = 0; i < s.levels.length; i++) {
      var lv = s.levels[i];
      var reqs = "";
      if (lv.itemRequirements && lv.itemRequirements.length > 0) {
        reqs += '<div class="barter-side">' + tileRowHtml(lv.itemRequirements) + '</div>';
      }
      var other = "";
      if (lv.stationLevelRequirements && lv.stationLevelRequirements.length > 0) {
        other += lv.stationLevelRequirements.map(hideoutStationReqHtml).join("");
      }
      if (lv.traderRequirements && lv.traderRequirements.length > 0) {
        other += lv.traderRequirements.map(hideoutTraderReqHtml).join("");
      }
      if (lv.skillRequirements && lv.skillRequirements.length > 0) {
        other += lv.skillRequirements.map(hideoutSkillReqHtml).join("");
      }
      levelsHtml += '<div class="barter">' +
        '<div class="barter-head">' +
          '<span class="pill lvl">Level ' + lv.level + '</span> ' +
          '<span class="pill">' + hideoutDuration(lv.constructionTime) + '</span> ' +
          other +
        '</div>' +
        '<div class="barter-body">' + reqs + '</div>' +
        '</div>';
    }
    levelsHtml += '</div>';
  }

  var craftsHtml = "";
  if (s.crafts && s.crafts.length > 0) {
    craftsHtml = '<div class="sec"><div class="h">Crafts <span class="cat-count">' + s.crafts.length + '</span></div>';
    for (var i = 0; i < s.crafts.length; i++) {
      var c = s.crafts[i];
      var reqs = tileRowHtml(c.requiredItems || []);
      craftsHtml += '<div class="barter">' +
        '<div class="barter-head">' +
          '<span class="pill lvl">Level ' + (c.level != null ? c.level : "?") + '</span> ' +
          '<span class="pill">' + hideoutDuration(c.duration) + '</span> ' +
        '</div>' +
        '<div class="barter-body">' +
          '<div class="barter-side">' + reqs + '</div>' +
          '<div class="barter-arrow">&#x2192;</div>' +
          '<div class="barter-side">' + tileItemHtml(c.productItem, c.productItem.count > 1 ? c.productItem.count : null) + '</div>' +
        '</div>' +
        '</div>';
    }
    craftsHtml += '</div>';
  }

  de.innerHTML =
    '<div class="qst-detail">' +
      '<div class="qst-dhead">' +
        '<div class="qst-dhead-main">' +
          '<div class="qst-dcat">Hideout station</div>' +
          '<h2 class="qst-dname">' + App.esc(s.name) + '</h2>' +
          '<div class="qst-dmeta">' +
            '<span class="pill lvl">' + (s.levels ? s.levels.length : 0) + ' levels</span> ' +
            '<span class="pill map">' + (s.crafts ? s.crafts.length : 0) + ' crafts</span> ' +
          '</div>' +
        '</div>' +
        '<img class="trader-img-big" src="' + App.esc(s.imageLink || "") + '" alt="" onerror="this.style.display=\'none\'" />' +
      '</div>' +

      '<div class="sec qst-meta">' +
        hideoutCopyRow("ID", s.id) +
        hideoutCopyRow("Game ID", s.gameId) +
      '</div>' +
      levelsHtml +
      craftsHtml +
    '</div>';

  var btns = de.querySelectorAll(".copy-btn");
  for (var b = 0; b < btns.length; b++) {
    (function (btn) {
      btn.addEventListener("click", function () {
        App.copyToClipboard(btn.getAttribute("data-copy"));
        App.showCopied(btn);
      });
    })(btns[b]);
  }
}

function renderHideoutStation(id) {
  if (!id) {
    App.render('<div class="state err"><span class="t">No station selected</span><a class="back-link" href="/hideout">&larr; Back to Hideout</a></div>');
    return;
  }

  App.render(
    '<a href="/hideout" class="back-link">&larr; Back to Hideout</a>' +
    '<div id="h-detail"><div class="state"><div class="spin"></div>Loading station...</div></div>'
  );

  var safeId = App.esc(id);
  function loadStation(dims) {
    var itemFields = dims
      ? 'id name shortName imageLink fallbackIconLink gridImageLink width height'
      : 'id name shortName imageLink fallbackIconLink';
    var query = 'query { hideoutStation(id: "' + safeId + '") { id gameId name imageLink levels { level constructionTime itemRequirements { item { ' + itemFields + ' } count foundInRaid } stationLevelRequirements { station level } traderRequirements { trader value } skillRequirements { name level } } crafts { id duration level productItem { ' + itemFields + ' count } requiredItems { ' + itemFields + ' count } } } }';
    return fetch(App.API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: query })
    })
      .then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); })
      .then(function (j) {
        if (j.errors) throw new Error((j.errors[0] && j.errors[0].message) || "GraphQL error");
        if (!j.data || !j.data.hideoutStation) throw new Error("Not found");
        return j.data.hideoutStation;
      });
  }
  loadStation(true).catch(function (e) {
    console.warn("Hideout station with item sizes unavailable, retrying without:", e.message);
    return loadStation(false);
  })
    .then(function (s) {
      hideoutStationRenderDetail(s);
      document.title = "TarkovLab | " + s.name;
    })
    .catch(function (e) {
      console.error("Failed to load station:", e.message);
      var de = App.$("h-detail");
      if (de) de.innerHTML = '<div class="state err"><span class="t">Failed to load</span>' + App.esc(e.message) + '</div>';
    });
}
