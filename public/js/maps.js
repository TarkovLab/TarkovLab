App.registerPage("/maps", "Maps", "All Escape from Tarkov maps with full credits.", "/assets/icon.png");

var MAPS_DATA = App.DATA;
var MAP_CREDIT = "the-hideout/tarkov-dev-svg-maps";
var MAP_LICENSE = "CC BY-NC-SA 4.0";
var MAP_LICENSE_URL = "https://creativecommons.org/licenses/by-nc-sa/4.0/";

var MAP_NAMES = [
  "Customs", "Factory", "GroundZero", "Interchange",
  "Labs", "Lighthouse", "Reserve", "Shoreline",
  "StreetsOfTarkov", "Terminal", "Woods"
];

function renderMaps() {
  document.title = "TarkovLab | Maps";
  App.render(
    '<h1>Maps</h1>' +
    '<p class="sub">All Escape from Tarkov maps. Click a map to open the full-resolution SVG.</p>' +
    '<div id="maps-grid"></div>' +
    '<div id="maps-attr" style="display:none;margin-top:28px;padding:16px 20px;background:var(--panel);border:1px solid var(--line);font-size:0.82rem;color:var(--muted);line-height:1.5;"></div>'
  );

  fetch(MAPS_DATA + "/")
    .then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); })
    .then(function (j) {
      if (!j.files) throw new Error("No files");
      var mapFiles = j.files.filter(function (f) { return f.indexOf("maps/") === 0 && f.endsWith(".svg"); });
      renderMapsGrid(mapFiles);
    })
    .catch(function () {
      renderMapsGrid(MAP_NAMES.map(function (n) { return "maps/" + n + ".svg"; }));
    });
}

function displayName(name) {
  return name.replace(/([A-Z])/g, " $1").trim();
}

function renderMapsGrid(files) {
  var grid = App.$("maps-grid");
  if (!grid) return;

  if (files.length === 0) {
    grid.innerHTML = '<div class="state"><span class="t">No maps</span>No maps are available at this time.</div>';
    return;
  }

  var html = '<div class="maps-grid">';

  for (var i = 0; i < files.length; i++) {
    var file = files[i];
    var name = file.replace("maps/", "").replace(/\.svg$/, "");
    var label = displayName(name);
    var url = MAPS_DATA + "/" + file;
    html +=
      '<a href="/map?id=' + App.esc(name) + '" class="map-btn" style="background-image:url(' + App.esc(url) + ')">' +
        '<span class="map-btn-label">' + App.esc(label) + '</span>' +
      '</a>';
  }

  html += '</div>';

  grid.innerHTML = html;

  var attr = App.$("maps-attr");
  if (attr) {
    attr.style.display = "block";
    attr.innerHTML =
      '<strong style="color:var(--text);">Attribution</strong><br/>' +
      'Map SVGs are sourced from <a href="https://github.com/' + App.esc(MAP_CREDIT) + '" target="_blank" rel="noopener" style="color:var(--gold);border-bottom:1px dashed var(--gold);">' + App.esc(MAP_CREDIT) + '</a> ' +
      'and licensed under <a href="' + App.esc(MAP_LICENSE_URL) + '" target="_blank" rel="noopener" style="color:var(--gold);border-bottom:1px dashed var(--gold);">' + App.esc(MAP_LICENSE) + '</a>.';
  }
}
