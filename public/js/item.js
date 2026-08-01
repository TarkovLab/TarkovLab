var ITEM_TYPE_LABEL = itemTypeLabel || function (t) {
  if (!t) return "";
  return String(t).replace(/([A-Z])/g, " $1").replace(/^./, function (c) { return c.toUpperCase(); });
};

function itemCopyRow(label, value) {
  if (!value) return '<div class="qst-meta-row"><span class="qst-meta-label">' + label + '</span><span class="qst-meta-val">—</span></div>';
  return '<div class="qst-meta-row"><span class="qst-meta-label">' + label + '</span><span class="qst-meta-val">' +
    '<code class="qst-id">' + App.esc(value) + '</code>' +
    '<button class="copy-btn" data-copy="' + App.esc(value) + '">Copy</button>' +
    '</span></div>';
}

function itemMetaRow(label, value) {
  return '<div class="qst-meta-row"><span class="qst-meta-label">' + label + '</span><span class="qst-meta-val">' + value + '</span></div>';
}

function itemIconHtmlBig(item) {
  var cellPx = 200 / Math.max(1, (item && item.width) || 1, (item && item.height) || 1);
  cellPx = Math.max(24, Math.round(cellPx));
  var box = ' style="width:200px;height:200px;' + tileGridStyle(item, cellPx) + '"';
  var tdevBase = (item && item.gameId)
    ? "https://assets.tarkov.dev/" + item.gameId + "-base-image.webp"
    : "";
  var primary = (item && (tdevBase || item.image512pxLink || item.gridImageLink || item.imageLink)) || "";
  var fallback = (item && tdevBase && (item.image512pxLink || item.gridImageLink))
    ? (item.image512pxLink || item.gridImageLink)
    : (item && (item.image512pxLink || item.gridImageLink || item.imageLink)) || "";
  var tag = (item && (item.shortName || item.name))
    ? '<span class="tile-tag">' + App.esc(item.shortName || item.name) + '</span>'
    : "";
  return '<span class="item-grid-big"' + box + '>' +
    '<img class="item-ic-big" src="' + App.esc(primary) + '" alt="" ' +
    'onerror="this.onerror=null;if(this.getAttribute(\'data-f\')){this.src=this.getAttribute(\'data-f\')}else{this.style.display=\'none\'}"' +
    (fallback ? ' data-f="' + App.esc(fallback) + '"' : '') + ' />' +
    tag +
    '</span>';
}

function itemPrice(n) {
  if (n == null) return "—";
  return n.toLocaleString() + " \u20BD";
}

function itemTraderOffersHtml(item) {
  var html = "";
  if (item.sellToTrader && item.sellToTrader.length > 0) {
    var rows = item.sellToTrader.slice(0, 8).map(function (o) {
      return '<span class="pill">' + App.esc(o.trader) + ' · ' + itemPrice(o.price) + '</span> ';
    }).join("");
    html += '<div class="qst-meta-row"><span class="qst-meta-label">Sells to</span><span class="qst-meta-val">' + rows + '</span></div>';
  }
  if (item.buyFromTrader && item.buyFromTrader.length > 0) {
    var rows = item.buyFromTrader.slice(0, 8).map(function (o) {
      return '<span class="pill">' + App.esc(o.trader) + ' · ' + itemPrice(o.price) +
        (o.minTraderLevel ? ' · LL' + o.minTraderLevel : '') + '</span> ';
    }).join("");
    html += '<div class="qst-meta-row"><span class="qst-meta-label">Buys from</span><span class="qst-meta-val">' + rows + '</span></div>';
  }
  return html;
}

function itemNeedRowsHtml(nf) {
  var qRows = "", bRows = "", cRows = "";
  if (nf.quests && nf.quests.length > 0) {
    qRows = '<div class="sec"><div class="h">Required for quests <span class="cat-count">' + nf.quests.length + '</span></div>';
    for (var i = 0; i < nf.quests.length; i++) {
      var nq = nf.quests[i];
      qRows += '<div class="qst-obj">' +
        '<div class="qst-obj-head"><a class="qst-obj-type link" href="/quests/' + App.esc(nq.quest) + '">' + App.esc(nq.questName) + '</a>' +
        '<span class="pill lvl">x' + nq.count + '</span>' +
        '<span class="pill">' + App.esc(itemTypeLabel(nq.objectiveType)) + '</span></div>' +
        (nq.objectiveDescription ? '<div class="qst-obj-desc">' + App.esc(nq.objectiveDescription) + '</div>' : '') +
        '</div>';
    }
    qRows += '</div>';
  }
  if (nf.barters && nf.barters.length > 0) {
    bRows = '<div class="sec"><div class="h">Required for barters <span class="cat-count">' + nf.barters.length + '</span></div>';
    for (var i = 0; i < nf.barters.length; i++) {
      var nb = nf.barters[i];
      bRows += '<div class="qst-obj">' +
        '<div class="qst-obj-head"><a class="qst-obj-type link" href="/traders/' + App.esc(nb.trader) + '">' + App.esc(nb.traderName) + '</a>' +
        '<span class="pill lvl">x' + nb.count + '</span>' +
        (nb.minTraderLevel ? '<span class="pill">LL' + nb.minTraderLevel + '</span>' : '') +
        '</div></div>';
    }
    bRows += '</div>';
  }
  if (nf.crafts && nf.crafts.length > 0) {
    cRows = '<div class="sec"><div class="h">Required for crafts <span class="cat-count">' + nf.crafts.length + '</span></div>';
    for (var i = 0; i < nf.crafts.length; i++) {
      var nc = nf.crafts[i];
      cRows += '<div class="qst-obj">' +
        '<div class="qst-obj-head"><a class="qst-obj-type link" href="/hideout/' + App.esc(nc.station) + '">' + App.esc(nc.station) + '</a>' +
        '<span class="pill lvl">x' + nc.count + '</span>' +
        (nc.level ? '<span class="pill">Level ' + nc.level + '</span>' : '') +
        '</div></div>';
    }
    cRows += '</div>';
  }
  return qRows + bRows + cRows;
}

function itemRenderDetail(item) {
  var de = App.$("i-detail");
  if (!de) return;

  var types = (item.types || []).map(function (t) {
    return '<span class="pill">' + App.esc(itemTypeLabel(t)) + '</span> ';
  }).join("");

  var wiki = item.wikiLink
    ? '<a href="' + App.esc(item.wikiLink) + '" target="_blank" rel="noopener">Escape from Tarkov Wiki &nearr;</a>'
    : "—";
  var anti = item.antifandomLink
    ? '<a href="' + App.esc(item.antifandomLink) + '" target="_blank" rel="noopener">Antifandom &nearr;</a>'
    : "—";

  var totalNeeds = itemNeedTotal(item);

  de.innerHTML =
    '<div class="qst-detail">' +
      '<div class="qst-dhead">' +
        '<div class="qst-dhead-main">' +
          '<div class="qst-dcat">' + App.esc(item.shortName || "Item") + '</div>' +
          '<h2 class="qst-dname">' + App.esc(item.name || item.id) + '</h2>' +
          '<div class="qst-dmeta">' + types + '</div>' +
        '</div>' +
        itemIconHtmlBig(item) +
      '</div>' +

      '<div class="sec qst-meta">' +
        itemCopyRow("ID", item.id) +
        itemCopyRow("Game ID", item.gameId) +
        itemMetaRow("Short name", App.esc(item.shortName || "—")) +
        itemMetaRow("Weight", item.weight != null ? item.weight + " kg" : "—") +
        itemMetaRow("Slots", item.width != null && item.height != null ? item.width + " x " + item.height : "—") +
        itemMetaRow("Base price", itemPrice(item.basePrice)) +
        itemMetaRow("Required uses", totalNeeds) +
        itemTraderOffersHtml(item) +
        itemMetaRow("Wiki", wiki) +
        itemMetaRow("Antifandom", anti) +
      '</div>' +
      itemNeedRowsHtml(item.neededFor || {}) +
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

function renderItem(id) {
  if (!id) {
    App.render('<div class="state err"><span class="t">No item selected</span><a class="back-link" href="/items">&larr; Back to Items</a></div>');
    return;
  }

  App.render(
    '<a href="/items" class="back-link">&larr; Back to Items</a>' +
    '<div id="i-detail"><div class="state"><div class="spin"></div>Loading item...</div></div>'
  );

  var safeId = App.esc(id);
  var queryWithColor = 'query { item(id: "' + safeId + '") { id gameId name shortName backgroundColor types weight width height basePrice wikiLink antifandomLink imageLink fallbackIconLink gridImageLink sellToTrader { trader price } buyFromTrader { trader price minTraderLevel } neededFor { quests { quest questName objectiveId objectiveType objectiveDescription count } barters { barter trader traderName minTraderLevel count } crafts { craft station level duration count } } } }';
  var queryNoColor = 'query { item(id: "' + safeId + '") { id gameId name shortName types weight width height basePrice wikiLink antifandomLink imageLink fallbackIconLink gridImageLink sellToTrader { trader price } buyFromTrader { trader price minTraderLevel } neededFor { quests { quest questName objectiveId objectiveType objectiveDescription count } barters { barter trader traderName minTraderLevel count } crafts { craft station level duration count } } } }';
  function fetchItem(q) {
    return fetch(App.API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: q })
    })
      .then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); })
      .then(function (j) {
        if (j.errors) throw new Error((j.errors[0] && j.errors[0].message) || "GraphQL error");
        if (!j.data || !j.data.item) throw new Error("Not found");
        return j.data.item;
      });
  }
  fetchItem(queryWithColor).catch(function (e) {
    console.warn("Item query with backgroundColor unavailable, retrying without:", e.message);
    return fetchItem(queryNoColor);
  })
    .then(function (item) {
      itemRenderDetail(item);
      document.title = "TarkovLab | " + (item.name || item.id);
    })
    .catch(function (e) {
      console.error("Failed to load item:", e.message);
      var de = App.$("i-detail");
      if (de) de.innerHTML = '<div class="state err"><span class="t">Failed to load</span>' + App.esc(e.message) + '</div>';
    });
}
