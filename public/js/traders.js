App.registerPage("/traders", "Traders", "Browse all traders with their barter offers.", "/assets/icon.png");

function traderCardHtml(t) {
  var barters = t.barters ? t.barters.length : 0;
  var levels = t.levels && t.levels.length ? t.levels.length : 1;
  return '<div class="trader-card" data-href="/traders/' + App.esc(t.id) + '">' +
    '<img class="trader-img" src="' + App.esc(t.imageLink || "") + '" alt="" loading="lazy" onerror="this.style.display=\'none\'" />' +
    '<div class="trader-card-body">' +
      '<div class="trader-card-name">' + App.esc(t.name) + '</div>' +
      '<div class="trader-card-sub">' + barters + ' barters &middot; ' + levels + ' loyalty levels' +
        (t.currency ? ' &middot; ' + App.esc(t.currency) : '') + '</div>' +
    '</div>' +
    '</div>';
}

function renderTraders() {
  document.title = "TarkovLab | Traders";
  App.render(
    '<h1>Traders</h1>' +
    '<p class="sub">All Escape from Tarkov traders with their barter offers.</p>' +
    '<div id="t-grid"><div class="state"><div class="spin"></div>Loading traders...</div></div>'
  );

  var query = "query { traders { id name imageLink currency levels { level } barters { id } } }";
  fetch(App.API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query: query })
  })
    .then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); })
    .then(function (j) {
      if (!j.data || !j.data.traders) throw new Error("Empty dataset");
      var grid = App.$("t-grid");
      if (j.data.traders.length === 0) {
        grid.innerHTML = '<div class="state"><span class="t">No traders</span></div>';
        return;
      }
      grid.innerHTML = '<div class="trader-grid">' + j.data.traders.map(traderCardHtml).join("") + '</div>';
      var cards = grid.querySelectorAll(".trader-card");
      for (var i = 0; i < cards.length; i++) {
        (function (c) {
          c.addEventListener("click", function () {
            App.navigate(c.getAttribute("data-href"));
          });
        })(cards[i]);
      }
    })
    .catch(function (e) {
      console.error("Failed to load traders:", e.message);
      var grid = App.$("t-grid");
      if (grid) grid.innerHTML = '<div class="state err"><span class="t">Connection failed</span>' + App.esc(e.message) + '</div>';
    });
}
