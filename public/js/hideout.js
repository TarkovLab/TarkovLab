App.registerPage("/hideout", "Hideout", "Browse all hideout stations with upgrade requirements and crafts.", "/assets/icon.png");

function hideoutCardHtml(s) {
  var maxLevel = s.levels && s.levels.length ? s.levels.length : 1;
  var crafts = s.crafts ? s.crafts.length : 0;
  return '<div class="trader-card" data-href="/hideout/' + App.esc(s.id) + '">' +
    '<img class="trader-img" src="' + App.esc(s.imageLink || "") + '" alt="" loading="lazy" onerror="this.style.display=\'none\'" />' +
    '<div class="trader-card-body">' +
      '<div class="trader-card-name">' + App.esc(s.name) + '</div>' +
      '<div class="trader-card-sub">' + maxLevel + ' level' + (maxLevel > 1 ? "s" : "") +
        (crafts ? ' &middot; ' + crafts + ' crafts' : '') + '</div>' +
    '</div>' +
    '</div>';
}

function renderHideout() {
  document.title = "TarkovLab | Hideout";
  App.render(
    '<h1>Hideout</h1>' +
    '<p class="sub">All Escape from Tarkov hideout stations with upgrade requirements and crafts.</p>' +
    '<div id="h-grid"><div class="state"><div class="spin"></div>Loading hideout...</div></div>'
  );

  var query = "query { hideout { id name imageLink levels { level } crafts { id } } }";
  fetch(App.API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query: query })
  })
    .then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); })
    .then(function (j) {
      if (!j.data || !j.data.hideout) throw new Error("Empty dataset");
      var grid = App.$("h-grid");
      if (j.data.hideout.length === 0) {
        grid.innerHTML = '<div class="state"><span class="t">No stations</span></div>';
        return;
      }
      grid.innerHTML = '<div class="trader-grid">' + j.data.hideout.map(hideoutCardHtml).join("") + '</div>';
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
      console.error("Failed to load hideout:", e.message);
      var grid = App.$("h-grid");
      if (grid) grid.innerHTML = '<div class="state err"><span class="t">Connection failed</span>' + App.esc(e.message) + '</div>';
    });
}
