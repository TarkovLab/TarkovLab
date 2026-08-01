function barterItemHtml(it) {
  return tileItemHtml(it, it.count > 1 ? it.count : null);
}

function traderMetaRow(label, value) {
  return '<div class="qst-meta-row"><span class="qst-meta-label">' + label + '</span><span class="qst-meta-val">' + value + '</span></div>';
}

function traderCopyRow(label, value) {
  if (!value) return '<div class="qst-meta-row"><span class="qst-meta-label">' + label + '</span><span class="qst-meta-val">—</span></div>';
  return '<div class="qst-meta-row"><span class="qst-meta-label">' + label + '</span><span class="qst-meta-val">' +
    '<code class="qst-id">' + App.esc(value) + '</code>' +
    '<button class="copy-btn" data-copy="' + App.esc(value) + '">Copy</button>' +
    '</span></div>';
}

function traderLevelsHtml(levels) {
  if (!levels || levels.length === 0) return "—";
  var rows = levels.map(function (l) {
    return '<span class="pill">LL' + l.level +
      (l.requiredPlayerLevel ? ' · Player ' + l.requiredPlayerLevel : '') +
      (l.requiredReputation ? ' · Rep ' + l.requiredReputation : '') +
      '</span> ';
  }).join("");
  return rows;
}

function traderRenderDetail(t) {
  var de = App.$("t-detail");
  if (!de) return;

  var bartersHtml = "";
  if (t.barters && t.barters.length > 0) {
    bartersHtml = '<div class="sec"><div class="h">Barter offers <span class="cat-count">' + t.barters.length + '</span></div>';
    for (var i = 0; i < t.barters.length; i++) {
      var b = t.barters[i];
      var reqs = tileRowHtml(b.requiredItems || []);
      bartersHtml += '<div class="barter">' +
        '<div class="barter-head">' +
          '<span class="pill">LL' + (b.minTraderLevel != null ? b.minTraderLevel : "?") + '</span> ' +
          (b.taskUnlock ? '<span class="pill lk">' + App.esc(b.taskUnlock) + '</span> ' : '') +
          (b.buyLimit ? '<span class="pill">Limit ' + b.buyLimit + '</span> ' : '') +
        '</div>' +
        '<div class="barter-body">' +
          '<div class="barter-side">' + reqs + '</div>' +
          '<div class="barter-arrow">&#x2192;</div>' +
          '<div class="barter-side">' + barterItemHtml(b.offeredItem) + '</div>' +
        '</div>' +
        '</div>';
    }
    bartersHtml += '</div>';
  } else {
    bartersHtml = '<div class="sec"><div class="h">Barter offers</div><p>This trader has no barter offers.</p></div>';
  }

  de.innerHTML =
    '<div class="qst-detail">' +
      '<div class="qst-dhead">' +
        '<div class="qst-dhead-main">' +
          '<div class="qst-dcat">Trader</div>' +
          '<h2 class="qst-dname">' + App.esc(t.name) + '</h2>' +
          '<div class="qst-dmeta">' +
            (t.currency ? '<span class="pill map">' + App.esc(t.currency) + '</span> ' : '') +
            '<span class="pill lvl">' + (t.barters ? t.barters.length : 0) + ' barters</span> ' +
          '</div>' +
        '</div>' +
        '<img class="trader-img-big" src="' + App.esc(t.imageLink || "") + '" alt="" onerror="this.style.display=\'none\'" />' +
      '</div>' +

      '<div class="sec qst-meta">' +
        traderCopyRow("ID", t.id) +
        traderCopyRow("Game ID", t.gameId) +
        traderMetaRow("Currency", App.esc(t.currency || "—")) +
        traderMetaRow("Loyalty levels", traderLevelsHtml(t.levels)) +
      '</div>' +
      bartersHtml +
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

function renderTrader(id) {
  if (!id) {
    App.render('<div class="state err"><span class="t">No trader selected</span><a class="back-link" href="/traders">&larr; Back to Traders</a></div>');
    return;
  }

  App.render(
    '<a href="/traders" class="back-link">&larr; Back to Traders</a>' +
    '<div id="t-detail"><div class="state"><div class="spin"></div>Loading trader...</div></div>'
  );

  var safeId = App.esc(id);
  function loadTrader(opts) {
    opts = opts || {};
    var itemFields = opts.dims
      ? ' id name shortName imageLink fallbackIconLink gridImageLink width height count'
      : ' id name shortName imageLink fallbackIconLink count';
    var levelFields = opts.reputation
      ? 'level requiredPlayerLevel requiredReputation payRate insuranceRate'
      : 'level requiredPlayerLevel payRate insuranceRate';
    var query = 'query { trader(id: "' + safeId + '") { id gameId name imageLink currency resetTime levels { ' + levelFields + ' } barters { id taskUnlock minTraderLevel restockAmount buyLimit offeredItem {' + itemFields + '} requiredItems {' + itemFields + '} } } }';
    return fetch(App.API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: query })
    })
      .then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); })
      .then(function (j) {
        if (j.errors) throw new Error((j.errors[0] && j.errors[0].message) || "GraphQL error");
        if (!j.data || !j.data.trader) throw new Error("Not found");
        return j.data.trader;
      });
  }
  loadTrader({ dims: true, reputation: true }).catch(function (e) {
    console.warn("Trader barters with item sizes unavailable, retrying without:", e.message);
    return loadTrader({ dims: false, reputation: true });
  }).catch(function (e) {
    console.warn("Trader reputation fields unavailable, retrying without:", e.message);
    return loadTrader({ dims: false, reputation: false });
  })
    .then(function (t) {
      traderRenderDetail(t);
      document.title = "TarkovLab | " + t.name;
    })
    .catch(function (e) {
      console.error("Failed to load trader:", e.message);
      var de = App.$("t-detail");
      if (de) de.innerHTML = '<div class="state err"><span class="t">Failed to load</span>' + App.esc(e.message) + '</div>';
    });
}
