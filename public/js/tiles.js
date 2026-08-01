// tarkov.dev-style item tiles (icon + count badge + name below)

var TILE_CELL_PX = 32;
var TILE_MAX_PX = 96;

// Light grid background (cells + borders) like tarkov.dev item tiles
function tileGridStyle(cellPx) {
  cellPx = Math.max(2, Math.round(cellPx || TILE_CELL_PX));
  return 'background-color:#ece9e1;background-image:' +
    'linear-gradient(to right, rgba(0,0,0,0.10) 1px, transparent 1px),' +
    'linear-gradient(to bottom, rgba(0,0,0,0.10) 1px, transparent 1px);' +
    'background-size:' + cellPx + 'px ' + cellPx + 'px;' +
    'background-position:-1px -1px;';
}

function tileBoxStyle(it) {
  var w = it && it.width;
  var h = it && it.height;
  if (!w || !h || w <= 0 || h <= 0) return "";
  var bw = w * TILE_CELL_PX;
  var bh = h * TILE_CELL_PX;
  var scale = Math.min(1, TILE_MAX_PX / Math.max(bw, bh));
  bw = Math.round(bw * scale);
  bh = Math.round(bh * scale);
  return ' style="width:' + bw + 'px;height:' + bh + 'px;' + tileGridStyle(TILE_CELL_PX * scale) + '"';
}

function tileImgHtml(it) {
  var primary = it.gridImageLink || it.imageLink || "";
  var fallback = primary === it.gridImageLink && it.imageLink
    ? it.imageLink
    : (it.fallbackIconLink || "");
  return '<img alt="" loading="lazy" src="' + App.esc(primary) + '"' +
    (fallback ? ' data-f="' + App.esc(fallback) + '"' : '') +
    ' onerror="this.onerror=null;if(this.getAttribute(\'data-f\')){this.src=this.getAttribute(\'data-f\')}else{this.style.display=\'none\'}" />';
}

function tileItemHtml(it, count, opts) {
  opts = opts || {};
  var id = (it && (it.id || it.gameId)) || "";
  var name = (it && (it.shortName || it.name)) || id || "?";
  var title = (it && it.name) || name;
  var badge = (count != null && count > 1)
    ? '<span class="tile-count">' + Math.round(count) + '</span>'
    : "";
  var fir = opts.fir
    ? '<span class="tile-fir" title="Found in raid">&#10003;</span>'
    : "";
  var box = '<span class="tile-box"' + tileBoxStyle(it) + '>' + (it ? tileImgHtml(it) : "") + badge + fir + '</span>';
  var nameEl = '<span class="tile-name">' + App.esc(name) + '</span>';
  if (opts.noLink || !id) return '<span class="tile">' + box + nameEl + '</span>';
  return '<a class="tile" href="/items/' + App.esc(id) + '" title="' + App.esc(title) + '">' + box + nameEl + '</a>';
}

// Normalize a list entry into { item, count, foundInRaid }
function tileEntry(itemOrEntry, fallbackCount) {
  if (itemOrEntry && itemOrEntry.item) {
    return {
      item: itemOrEntry.item,
      count: itemOrEntry.count != null ? itemOrEntry.count : fallbackCount,
      foundInRaid: !!itemOrEntry.foundInRaid,
    };
  }
  return {
    item: itemOrEntry,
    count: itemOrEntry && itemOrEntry.count != null ? itemOrEntry.count : fallbackCount,
    foundInRaid: !!itemOrEntry.foundInRaid,
  };
}

function tileListHtml(arr, opts) {
  opts = opts || {};
  var html = "";
  for (var i = 0; i < (arr || []).length; i++) {
    var e = tileEntry(arr[i], opts.count);
    if (!e.item || !e.item.id) continue;
    html += tileItemHtml(e.item, e.count, { fir: e.foundInRaid });
  }
  if (!html) return "";
  return '<div class="tile-list">' + html + '</div>';
}

// Row of tiles joined by "+" (barter/craft rows)
function tileRowHtml(arr, opts) {
  opts = opts || {};
  var tiles = [];
  for (var i = 0; i < (arr || []).length; i++) {
    var e = tileEntry(arr[i], opts.count);
    if (!e.item || !e.item.id) continue;
    tiles.push(tileItemHtml(e.item, e.count, { fir: e.foundInRaid, noLink: opts.noLink }));
  }
  if (tiles.length === 0) return "";
  return '<div class="tile-row">' + tiles.join('<span class="tile-plus">+</span>') + '</div>';
}
