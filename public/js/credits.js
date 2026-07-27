App.registerPage("/credits", "Credits", "Contributors to TarkovLab and TarkovData.", "/assets/icon.png");

function renderCredits() {
  document.title = "TarkovLab | Credits";
  App.render(
    '<h1>Credits</h1>' +
    '<p class="sub">People who contribute to the TarkovLab ecosystem.</p>' +
    '<div id="credits-app"></div>' +
    '<div id="credits-data"></div>'
  );

  fetch("https://api.github.com/repos/tarkovlab/tarkovlab/contributors")
    .then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); })
    .then(function (users) {
      renderContributors("tarkovlab-app", "TarkovLab (App)", users);
    })
    .catch(function () {
      var el = App.$("credits-app");
      if (el) el.innerHTML = '<div class="state err"><span class="t">Failed to load</span>Could not fetch contributors.</div>';
    });

  fetch("https://api.github.com/repos/tarkovlab/tarkovdata/contributors")
    .then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); })
    .then(function (users) {
      renderContributors("credits-data", "TarkovData", users);
    })
    .catch(function () {
      var el = App.$("credits-data");
      if (el) el.innerHTML = '<div class="state err"><span class="t">Failed to load</span>Could not fetch contributors.</div>';
    });
}

function renderContributors(containerId, title, users) {
  var el = App.$(containerId);
  if (!el) return;

  if (!users || !users.length) {
    el.innerHTML = '<div class="state"><span class="t">No data</span></div>';
    return;
  }

  var html =
    '<section class="cat-section">' +
    '<h2 class="cat-head">' + App.esc(title) + ' <span class="cat-count">' + users.length + '</span></h2>' +
    '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:10px;">';

  for (var i = 0; i < users.length; i++) {
    var u = users[i];
    html +=
      '<a href="' + App.esc(u.html_url) + '" target="_blank" rel="noopener" style="display:flex;align-items:center;gap:12px;background:var(--panel);border:1px solid var(--line);padding:12px 16px;transition:border-color 0.15s;">' +
        '<img src="' + App.esc(u.avatar_url) + '&s=48" alt="" style="width:36px;height:36px;border-radius:50%;flex-shrink:0;" loading="lazy" />' +
        '<div style="flex:1;min-width:0;">' +
          '<div style="font-family:Oswald,sans-serif;font-weight:500;font-size:0.95rem;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + App.esc(u.login) + '</div>' +
          '<div style="font-size:0.72rem;color:var(--muted);">' + u.contributions + ' commit' + (u.contributions > 1 ? "s" : "") + '</div>' +
        '</div>' +
        '<span style="color:var(--dim);font-size:0.85rem;">&rarr;</span>' +
      '</a>';
  }

  html += '</div></section>';
  el.innerHTML = html;
}
