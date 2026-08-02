// tarkov.dev-style item tiles (icon + count badge + FIR badge + tag + name below)

function getItemImageCandidates(it) {
  if (!it) return ["/assets/icon.png"];
  var candidates = [];

  // Local CDN order: base-image (item artwork sized to its slot,
  // transparent background) first, then the 512px variant for crisp
  // upscaling, the 64px icon, and only as last resorts the slot-baked
  // grid-image and any custom links.
  if (it.id) {
    var base = "https://assets.tarkovlab.org/items/" + String(it.id).replace(/-/g, "_");
    candidates.push(base + "-base-image.webp");
    candidates.push(base + "-512.webp");
    candidates.push(base + "-icon.webp");
  }
  if (it.image512pxLink) candidates.push(it.image512pxLink);
  if (it.imageLink) candidates.push(it.imageLink);
  if (it.gridImageLink) candidates.push(it.gridImageLink);
  if (it.fallbackIconLink) candidates.push(it.fallbackIconLink);
  candidates.push("/assets/icon.png");

  var unique = [];
  for (var i = 0; i < candidates.length; i++) {
    if (candidates[i] && unique.indexOf(candidates[i]) === -1) {
      unique.push(candidates[i]);
    }
  }
  return unique;
}

// EFT inventory background colors (from the tarkov.dev color map)
var TILE_BG_COLORS = {
  black: { r: 0, g: 0, b: 0 },
  blue: { r: 28, g: 65, b: 86 },
  default: { r: 127, g: 127, b: 127 },
  green: { r: 21, g: 45, b: 0 },
  grey: { r: 29, g: 29, b: 29 },
  gray: { r: 29, g: 29, b: 29 },
  orange: { r: 60, g: 25, b: 0 },
  red: { r: 109, g: 36, b: 24 },
  violet: { r: 76, g: 42, b: 85 },
  yellow: { r: 104, g: 102, b: 40 },
};

function tileBgColorString(it) {
  var c = TILE_BG_COLORS[(it && it.backgroundColor) || 'default'] || TILE_BG_COLORS.default;
  return c.r + ', ' + c.g + ', ' + c.b + ', 0.55';
}

// tarkov.dev-style tile background: black base + dark checker grid + the item's
// own EFT background color tinted over it.
function tileGridStyle(it, cellPx) {
  var size = (cellPx || 32) + 'px ' + (cellPx || 32) + 'px';
  var colorString = tileBgColorString(it);
  var svg = "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"100%\" height=\"100%\">" +
    "<defs>" +
    "<pattern id=\"smallChecks\" width=\"2\" height=\"2\" patternUnits=\"userSpaceOnUse\">" +
    "<rect x=\"0\" y=\"0\" width=\"1\" height=\"1\" style=\"fill:rgba(29, 29, 29, .62)\"/>" +
    "<rect x=\"0\" y=\"1\" width=\"1\" height=\"1\" style=\"fill:rgba(44, 44, 44, .62)\"/>" +
    "<rect x=\"1\" y=\"0\" width=\"1\" height=\"1\" style=\"fill:rgba(44, 44, 44, .62)\"/>" +
    "<rect x=\"1\" y=\"1\" width=\"1\" height=\"1\" style=\"fill:rgba(29, 29, 29, .62)\"/>" +
    "</pattern>" +
    "<pattern id=\"gridCell\" width=\"100%\" height=\"100%\" patternUnits=\"userSpaceOnUse\">" +
    "<rect x=\"0\" y=\"0\" width=\"100%\" height=\"100%\" fill=\"url(#smallChecks)\"/>" +
    "<line x1=\"0\" x2=\"0\" y1=\"0\" y2=\"100%\" stroke=\"rgba(50, 50, 50, .75)\" stroke-width=\"2\"/>" +
    "<line x1=\"0\" x2=\"100%\" y1=\"0\" y2=\"0\" stroke=\"rgba(50, 50, 50, .75)\" stroke-width=\"2\"/>" +
    "<rect x=\"0\" y=\"0\" width=\"100%\" height=\"100%\" style=\"fill:rgba(" + colorString + ")\"/>" +
    "</pattern>" +
    "</defs>" +
    "<rect width=\"100%\" height=\"100%\" fill=\"#000\"/>" +
    "<rect width=\"100%\" height=\"100%\" fill=\"url(#gridCell)\"/>" +
    "</svg>";
  var url = "url('data:image/svg+xml," + encodeURIComponent(svg).replace(/'/g, "%27").replace(/"/g, "%22") + "')";
  return 'background-color:#000;background-image:' + url + ';background-size:' + size + ';';
}

function tileBoxStyle(it, opts) {
  opts = opts || {};
  var w = (it && it.width && it.width > 0) ? it.width : 1;
  var h = (it && it.height && it.height > 0) ? it.height : 1;
  var maxDim = opts.maxDim || 96;
  var cellPx = Math.min(64, Math.floor(maxDim / Math.max(w, h)));
  cellPx = Math.max(24, cellPx);
  var bw = w * cellPx;
  var bh = h * cellPx;
  return ' style="width:' + bw + 'px;height:' + bh + 'px;' + tileGridStyle(it, cellPx) + '"';
}

function tileImgHtml(it) {
  if (!it) return "";
  var sources = getItemImageCandidates(it);
  var primary = sources[0];
  var rest = sources.slice(1).join("|");
  return '<img class="tile-img" alt="" loading="lazy" src="' + App.esc(primary) + '"' +
    (rest ? ' data-sources="' + App.esc(rest) + '"' : '') +
    ' onerror="var s=(this.getAttribute(\'data-sources\')||\'\').split(\'|\');if(s.length&&s[0]){this.src=s.shift();this.setAttribute(\'data-sources\',s.join(\'|\'))}else{this.src=\'/assets/icon.png\'}" />';
}

function tileItemHtml(it, count, opts) {
  opts = opts || {};
  if (!it) return "";
  var id = (it && (it.id || it.gameId)) || "";
  var name = (it && (it.shortName || it.name)) || id || "?";
  var shortName = (it && it.shortName) || name;
  var title = (it && it.name) || name;
  var displayCount = count != null ? count : (it.count != null ? it.count : null);
  
  var countBadge = (displayCount != null && (displayCount > 1 || opts.showCount))
    ? '<span class="tile-count">' + (typeof displayCount === "number" && !Number.isInteger(displayCount) ? displayCount : Math.round(displayCount)) + '</span>'
    : "";
    
  var isFir = opts.fir != null ? !!opts.fir : !!it.foundInRaid;
  var firBadge = isFir
    ? '<img class="tile-fir-img" src="https://assets.tarkovlab.org/items/icon-fir.png" alt="FIR" title="Found in raid" />'
    : "";

  var tag = opts.showTag !== false && shortName
    ? '<span class="tile-tag">' + App.esc(shortName) + '</span>'
    : "";

  var dogtag = opts.dogtagLevel || it.dogtagLevel || it.minDogtagLevel;
  var dogtagBadge = dogtag
    ? '<span class="tile-dogtag" title="Minimum Dogtag Level">&ge;' + App.esc(dogtag) + '</span>'
    : "";

  var box = '<span class="tile-box"' + tileBoxStyle(it, opts) + '>' +
    tileImgHtml(it) +
    tag +
    countBadge +
    firBadge +
    dogtagBadge +
    '</span>';

  var showName = opts.showName === true && !opts.noName;
  if (!showName) {
    if (opts.noLink || !id) return box;
    return '<a href="/items/' + App.esc(id) + '" title="' + App.esc(title) + '">' + box + '</a>';
  }

  var nameEl = '<span class="tile-name">' + App.esc(name) + '</span>';
  if (opts.noLink || !id) return '<span class="tile">' + box + nameEl + '</span>';
  return '<a class="tile" href="/items/' + App.esc(id) + '" title="' + App.esc(title) + '">' + box + nameEl + '</a>';
}

// Normalize a list entry into { item, count, foundInRaid, dogtagLevel }
function tileEntry(itemOrEntry, fallbackCount) {
  if (!itemOrEntry) return { item: null, count: null, foundInRaid: false };
  var itemObj = itemOrEntry.item ? itemOrEntry.item : itemOrEntry;
  var c = itemOrEntry.count != null ? itemOrEntry.count : (itemOrEntry.item && itemOrEntry.item.count != null ? itemOrEntry.item.count : fallbackCount);
  
  var isFir = false;
  if (itemOrEntry.foundInRaid != null) {
    isFir = !!itemOrEntry.foundInRaid;
  } else if (itemOrEntry.item && itemOrEntry.item.foundInRaid != null) {
    isFir = !!itemOrEntry.item.foundInRaid;
  } else {
    var t = itemOrEntry.objectiveType || (itemOrEntry.item && itemOrEntry.item.objectiveType);
    var d = itemOrEntry.objectiveDescription || (itemOrEntry.item && itemOrEntry.item.objectiveDescription) || "";
    isFir = t === "findItem" || t === "handoverItem" || /found in raid|in raid/i.test(d);
  }

  var dogtag = itemOrEntry.dogtagLevel || itemOrEntry.minDogtagLevel || (itemOrEntry.item && (itemOrEntry.item.dogtagLevel || itemOrEntry.item.minDogtagLevel));

  return {
    item: itemObj,
    count: c,
    foundInRaid: isFir,
    dogtagLevel: dogtag
  };
}

function tileListHtml(arr, opts) {
  opts = opts || {};
  var html = "";
  for (var i = 0; i < (arr || []).length; i++) {
    var e = tileEntry(arr[i], opts.count);
    if (!e.item || (!e.item.id && !e.item.gameId)) continue;
    html += tileItemHtml(e.item, e.count, { fir: e.foundInRaid, dogtagLevel: e.dogtagLevel, showCount: opts.showCount, maxDim: opts.maxDim });
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
    if (!e.item || (!e.item.id && !e.item.gameId)) continue;
    tiles.push(tileItemHtml(e.item, e.count, { fir: e.foundInRaid, dogtagLevel: e.dogtagLevel, noLink: opts.noLink, showCount: opts.showCount, maxDim: opts.maxDim }));
  }
  if (tiles.length === 0) return "";
  return '<div class="tile-row">' + tiles.join('<span class="tile-plus">+</span>') + '</div>';
}
