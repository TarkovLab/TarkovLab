App.registerPage("/maps", "Maps", "All Escape from Tarkov maps with full credits.", "/assets/icon.png");

var MAPS_DATA = "https://data.tarkovlab.org";
var MAP_CREDIT = "the-hideout/tarkov-dev-svg-maps";
var MAP_LICENSE = "CC BY-NC-SA 4.0";
var MAP_LICENSE_URL = "https://creativecommons.org/licenses/by-nc-sa/4.0/";

function renderMaps() {
  App.render(
    '<h1>Maps</h1>' +
    '<p class="sub">All Escape from Tarkov maps. Click a map to open the full-resolution SVG.</p>' +
    '<div id="maps-grid"></div>'
  );

  fetch(MAPS_DATA + "/")
    .then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); })
    .then(function (j) {
      if (!j.files) throw new Error("Empty dataset");
      App.setStatus(true);
      var mapFiles = j.files.filter(function (f) { return f.indexOf("maps/") === 0 && f.endsWith(".svg"); });
      renderMapsGrid(mapFiles);
    })
    .catch(function (e) {
      console.error("Failed to load maps:", e.message);
      App.setStatus(false);
      var grid = App.$("maps-grid");
      if (grid) grid.innerHTML = '<div class="state err"><span class="t">Connection failed</span>Could not reach data.tarkovlab.org.</div>';
    });
}

function renderMapsGrid(files) {
  var grid = App.$("maps-grid");
  if (!grid) return;

  if (files.length === 0) {
    grid.innerHTML = '<div class="state"><span class="t">No maps</span>No maps are available at this time.</div>';
    return;
  }

  var html = '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(340px,1fr));gap:20px;">';

  for (var i = 0; i < files.length; i++) {
    var file = files[i];
    var name = file.replace("maps/", "").replace(/\.svg$/, "");
    var displayName = name.replace(/([A-Z])/g, " $1").trim();
    var imgUrl = MAPS_DATA + "/" + file;
    html +=
      '<div style="background:var(--panel);border:1px solid var(--line);display:flex;flex-direction:column;">' +
        '<a href="' + App.esc(imgUrl) + '" target="_blank" rel="noopener" style="display:block;background:#060606;padding:16px;">' +
          '<img src="' + App.esc(imgUrl) + '" alt="' + App.esc(displayName) + '" style="display:block;width:100%;height:auto;aspect-ratio:16/10;object-fit:contain;" loading="lazy" />' +
        '</a>' +
        '<div style="padding:16px 20px;flex:1;display:flex;flex-direction:column;gap:8px;">' +
          '<h3 style="font-family:Oswald,sans-serif;font-weight:600;font-size:1.15rem;text-transform:uppercase;letter-spacing:0.03em;color:var(--text);">' + App.esc(displayName) + '</h3>' +
          '<div style="font-size:0.78rem;color:var(--muted);line-height:1.5;">' +
            'Source: <a href="https://github.com/' + App.esc(MAP_CREDIT) + '" target="_blank" rel="noopener" style="color:var(--gold);border-bottom:1px dashed var(--gold);">' + App.esc(MAP_CREDIT) + '</a><br/>' +
            'License: <a href="' + App.esc(MAP_LICENSE_URL) + '" target="_blank" rel="noopener" style="color:var(--gold);border-bottom:1px dashed var(--gold);">' + App.esc(MAP_LICENSE) + '</a>' +
          '</div>' +
        '</div>' +
      '</div>';
  }

  html += "</div>";

  html +=
    '<div style="margin-top:28px;padding:16px 20px;background:var(--panel);border:1px solid var(--line);font-size:0.82rem;color:var(--muted);line-height:1.5;">' +
      '<strong style="color:var(--text);">Attribution</strong><br/>' +
      'Map SVGs are sourced from <a href="https://github.com/' + App.esc(MAP_CREDIT) + '" target="_blank" rel="noopener" style="color:var(--gold);border-bottom:1px dashed var(--gold);">' + App.esc(MAP_CREDIT) + '</a> ' +
      'and licensed under <a href="' + App.esc(MAP_LICENSE_URL) + '" target="_blank" rel="noopener" style="color:var(--gold);border-bottom:1px dashed var(--gold);">' + App.esc(MAP_LICENSE) + '</a>.' +
    '</div>';

  grid.innerHTML = html;
}
