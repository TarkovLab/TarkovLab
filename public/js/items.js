var itemState = {
  total: 0,
  query: "",
  offset: 0,
  pageSize: 120
};

function itemIconHtml(item, cls) {
  return '<img class="' + (cls || "item-ic") + '" src="' + App.esc(item.imageLink || "") + '" alt="" loading="lazy" onerror="this.onerror=null;if(this.getAttribute(\'data-f\')){this.src=this.getAttribute(\'data-f\')}else{this.style.display=\'none\'}"' +
    (item.fallbackIconLink ? ' data-f="' + App.esc(item.fallbackIconLink) + '"' : '') + ' />';
}

function itemNeedTotal(item) {
  var n = 0;
  if (item.neededFor) {
    n += item.neededFor.quests.length + item.neededFor.barters.length + item.neededFor.crafts.length;
  }
  return n;
}

function itemTypeLabel(t) {
  if (!t) return "";
  return String(t).replace(/([A-Z])/g, " $1").replace(/^./, function (c) { return c.toUpperCase(); });
}

function itemCardHtml(item) {
  var needs = itemNeedTotal(item);
  var needsBadge = needs > 0
    ? '<span class="item-needs">' + needs + ' need' + (needs > 1 ? "s" : "") + '</span>'
    : "";
  return '<div class="item-card" data-href="/items/' + App.esc(item.id) + '">' +
    itemIconHtml(item) +
    '<div class="item-card-body">' +
      '<div class="item-card-name">' + App.esc(item.shortName || item.name || item.id) + '</div>' +
      '<div class="item-card-sub">' + App.esc(item.name || "") + '</div>' +
      '<div class="item-card-foot">' +
        '<span class="pill lvl">' + App.esc(item.types && item.types.length ? itemTypeLabel(item.types[0]) : "Item") + '</span> ' +
        needsBadge +
      '</div>' +
    '</div>' +
    '</div>';
}

function itemFetch() {
  var se = App.$("i-grid");
  if (!se) return;
  se.innerHTML = '<div class="state"><div class="spin"></div>Loading items...</div>';

  var safe = itemState.query.replace(/["\\]/g, "");
  var query = 'query { items(search: "' + safe + '", limit: ' + itemState.pageSize + ', offset: ' + itemState.offset + ') { total items { id name shortName types imageLink fallbackIconLink neededFor { quests { quest } barters { barter } crafts { craft } } } } }';
  fetch(App.API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query: query })
  })
    .then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); })
    .then(function (j) {
      if (!j.data || !j.data.items) throw new Error("Empty dataset");
      itemState.total = j.data.items.total;
      var list = j.data.items.items;

      var count = App.$("i-count");
      if (count) {
        var from = itemState.total === 0 ? 0 : itemState.offset + 1;
        var to = Math.min(itemState.offset + list.length, itemState.total);
        count.innerHTML = "<b>" + from + "&ndash;" + to + "</b> / " + itemState.total + " items";
      }

      if (list.length === 0) {
        se.innerHTML = '<div class="state"><span class="t">No results</span>No items match your search.</div>';
      } else {
        se.innerHTML = '<div class="item-grid">' + list.map(itemCardHtml).join("") + '</div>';
        var cards = se.querySelectorAll(".item-card");
        for (var i = 0; i < cards.length; i++) {
          (function (c) {
            c.addEventListener("click", function () {
              App.navigate(c.getAttribute("data-href"));
            });
          })(cards[i]);
        }
      }
      itemRenderPager();
    })
    .catch(function (e) {
      console.error("Failed to load items:", e.message);
      se.innerHTML = '<div class="state err"><span class="t">Connection failed</span>' + App.esc(e.message) + '</div>';
    });
}

function itemRenderPager() {
  var pager = App.$("i-pager");
  if (!pager) return;
  var pages = Math.max(1, Math.ceil(itemState.total / itemState.pageSize));
  var cur = Math.floor(itemState.offset / itemState.pageSize) + 1;
  var html = "";
  if (cur > 1) html += '<button class="pg-btn" data-page="' + (cur - 1) + '">&larr; Prev</button> ';
  html += '<span class="pg-info">Page ' + cur + ' / ' + pages + '</span> ';
  if (cur < pages) html += '<button class="pg-btn" data-page="' + (cur + 1) + '">Next &rarr;</button>';
  pager.innerHTML = html;
  var btns = pager.querySelectorAll(".pg-btn");
  for (var i = 0; i < btns.length; i++) {
    (function (b) {
      b.addEventListener("click", function () {
        itemState.offset = (parseInt(b.getAttribute("data-page"), 10) - 1) * itemState.pageSize;
        itemFetch();
        window.scrollTo(0, 0);
      });
    })(btns[i]);
  }
}

function itemBindEvents() {
  var search = App.$("i-search");
  if (search) {
    var timer = null;
    search.addEventListener("input", function (e) {
      clearTimeout(timer);
      timer = setTimeout(function () {
        itemState.query = e.target.value;
        itemState.offset = 0;
        itemFetch();
      }, 250);
    });
  }
}

App.registerPage("/items", "Items", "Browse all items with quest, barter and craft requirements.", "/assets/icon.png");

function renderItems() {
  document.title = "TarkovLab | Items";
  App.render(
    '<h1>Items</h1>' +
    '<p class="sub">All Escape from Tarkov items with their quest, barter and craft requirements.</p>' +
    '<div class="toolbar">' +
      '<div class="search">' +
        '<span class="ic">&#x2315;</span>' +
        '<input id="i-search" type="text" placeholder="Search by name, short name or id..." autocomplete="off" />' +
      '</div>' +
      '<div class="count" id="i-count">Loading...</div>' +
    '</div>' +
    '<div id="i-grid"><div class="state"><div class="spin"></div>Loading items...</div></div>' +
    '<div id="i-pager" class="pager"></div>'
  );
  itemBindEvents();
  itemFetch();
}
