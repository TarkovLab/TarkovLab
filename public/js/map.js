function renderMap(id) {
  if (!id) {
    App.render('<div class="state err"><span class="t">No map selected</span>Please select a map from the list.</div>');
    return;
  }

  var displayName = id.replace(/([A-Z])/g, " $1").trim();
  document.title = "TarkovLab | " + displayName;

  App.render(
    '<a href="/maps" class="back-link">&larr; Back to Maps</a>' +
    '<h1>' + App.esc(displayName) + '</h1>' +
    '<div id="map-levels" class="map-levels"></div>' +
    '<div id="map-container" class="map-container"><div class="state"><div class="spin"></div>Loading map...</div></div>' +
    '<div id="map-credit" class="map-credit"></div>'
  );

  fetch("https://data.tarkovlab.org/maps/" + encodeURIComponent(id) + ".svg")
    .then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.text(); })
    .then(function (svgText) {
      App.setStatus(true);
      setupMapViewer(id, svgText, displayName);
    })
    .catch(function (e) {
      console.error("Failed to load map:", e.message);
      App.setStatus(false);
      var container = App.$("map-container");
      if (container) container.innerHTML = '<div class="state err"><span class="t">Failed to load</span>' + App.esc(e.message) + '</div>';
    });
}

var LEVEL_LABELS = {
  Basement: "Basement",
  Underground_Level: "Underground",
  Ground_Level: "Ground",
  First_Floor: "Floor 1",
  Second_Floor: "Floor 2",
  Third_Floor: "Floor 3",
  Fourth_Floor: "Floor 4",
  Fifth_Floor: "Floor 5",
  First_Level: "Level 1",
  Second_Level: "Level 2",
  Technical_Level: "Technical",
};

var LEVEL_ORDER = [
  "Basement", "Underground_Level", "Ground_Level",
  "First_Floor", "Second_Floor", "Third_Floor",
  "Fourth_Floor", "Fifth_Floor",
  "First_Level", "Second_Level", "Technical_Level"
];

function setupMapViewer(id, svgText, displayName) {
  var container = App.$("map-container");
  if (!container) return;

  var parser = new DOMParser();
  var doc = parser.parseFromString(svgText, "image/svg+xml");
  var svgEl = doc.querySelector("svg");
  if (!svgEl) {
    container.innerHTML = '<div class="state err"><span class="t">Invalid SVG</span>Could not parse map file.</div>';
    return;
  }

  // Detect available levels
  var levelGIds = [];
  var gEls = svgEl.querySelectorAll("g");
  for (var i = 0; i < gEls.length; i++) {
    var gid = gEls[i].getAttribute("id");
    if (gid && LEVEL_LABELS[gid]) {
      levelGIds.push(gid);
    }
  }

  // Sort by level order
  levelGIds.sort(function (a, b) {
    return LEVEL_ORDER.indexOf(a) - LEVEL_ORDER.indexOf(b);
  });

  // Hide all levels except Ground by default
  for (var i = 0; i < levelGIds.length; i++) {
    var g = svgEl.querySelector("#" + levelGIds[i]);
    if (g && levelGIds[i] !== "Ground_Level") {
      g.setAttribute("display", "none");
    }
  }

  // If no Ground_Level, show the first one
  if (levelGIds.length > 0 && levelGIds.indexOf("Ground_Level") === -1) {
    var first = svgEl.querySelector("#" + levelGIds[0]);
    if (first) first.removeAttribute("display");
  }

  svgEl.removeAttribute("width");
  svgEl.removeAttribute("height");
  svgEl.setAttribute("style", "width:100%;height:100%;");

  // Inject SVG
  container.innerHTML = "";
  container.appendChild(svgEl);

  // Level selector
  if (levelGIds.length > 1) {
    renderLevelSelector(levelGIds, svgEl);
  }

  // Credit
  setupMapCredit(displayName);

  // Pan/Zoom
  setupPanZoom(svgEl, container);
}

function renderLevelSelector(levels, svgEl) {
  var el = App.$("map-levels");
  if (!el) return;

  var html = "";
  var activeLevel = "Ground_Level";
  if (levels.indexOf(activeLevel) === -1) activeLevel = levels[0];

  for (var i = 0; i < levels.length; i++) {
    var l = levels[i];
    var label = LEVEL_LABELS[l] || l.replace(/_/g, " ");
    var active = l === activeLevel ? ' class="on"' : "";
    html += '<button data-level="' + l + '"' + active + ">" + App.esc(label) + "</button>";
  }
  el.innerHTML = html;

  var btns = el.querySelectorAll("button");
  for (var i = 0; i < btns.length; i++) {
    btns[i].addEventListener("click", function () {
      var lvl = this.getAttribute("data-level");
      var all = el.querySelectorAll("button");
      for (var j = 0; j < all.length; j++) all[j].classList.remove("on");
      this.classList.add("on");
      // Show this level, hide others
      for (var k = 0; k < levels.length; k++) {
        var g = svgEl.querySelector("#" + levels[k]);
        if (g) {
          if (levels[k] === lvl) g.removeAttribute("display");
          else g.setAttribute("display", "none");
        }
      }
    });
  }
}

function setupMapCredit(displayName) {
  var el = App.$("map-credit");
  if (!el) return;
  el.innerHTML =
    '<strong>Attribution</strong><br/>' +
    'Map SVG by <a href="https://github.com/the-hideout/tarkov-dev-svg-maps" target="_blank" rel="noopener">the-hideout/tarkov-dev-svg-maps</a>, ' +
    'licensed under <a href="https://creativecommons.org/licenses/by-nc-sa/4.0/" target="_blank" rel="noopener">CC BY-NC-SA 4.0</a>.';
}

function setupPanZoom(svgEl, container) {
  var viewBox = svgEl.getAttribute("viewBox");
  if (!viewBox) return;
  var vbParts = viewBox.split(/[\s,]+/).map(Number);
  var vb = { x: vbParts[0], y: vbParts[1], w: vbParts[2], h: vbParts[3] };
  var scale = 1;
  var panning = false;
  var startX, startY, startVbX, startVbY;

  function applyViewBox() {
    var sw = vb.w / scale;
    var sh = vb.h / scale;
    var cx = vb.x + vb.w / 2;
    var cy = vb.y + vb.h / 2;
    svgEl.setAttribute("viewBox", (cx - sw / 2) + " " + (cy - sh / 2) + " " + sw + " " + sh);
  }

  container.addEventListener("wheel", function (e) {
    e.preventDefault();
    var rect = container.getBoundingClientRect();
    var mx = (e.clientX - rect.left) / rect.width;
    var my = (e.clientY - rect.top) / rect.height;
    var factor = e.deltaY > 0 ? 1.15 : 0.85;
    scale *= factor;
    scale = Math.max(0.3, Math.min(20, scale));
    var sw = vb.w / scale;
    var sh = vb.h / scale;
    var cx = (vb.x + mx * vb.w);
    var cy = (vb.y + my * vb.h);
    svgEl.setAttribute("viewBox", (cx - sw / 2) + " " + (cy - sh / 2) + " " + sw + " " + sh);
  }, { passive: false });

  container.addEventListener("mousedown", function (e) {
    if (e.button !== 0) return;
    panning = true;
    startX = e.clientX;
    startY = e.clientY;
    var vb2 = svgEl.getAttribute("viewBox").split(/[\s,]+/).map(Number);
    startVbX = vb2[0];
    startVbY = vb2[1];
    container.style.cursor = "grabbing";
    e.preventDefault();
  });

  window.addEventListener("mousemove", function (e) {
    if (!panning) return;
    var dx = (e.clientX - startX) / container.clientWidth;
    var dy = (e.clientY - startY) / container.clientHeight;
    var vb3 = svgEl.getAttribute("viewBox").split(/[\s,]+/).map(Number);
    var sw = vb3[2], sh = vb3[3];
    svgEl.setAttribute("viewBox", (startVbX - dx * sw) + " " + (startVbY - dy * sh) + " " + sw + " " + sh);
  });

  window.addEventListener("mouseup", function () {
    if (panning) {
      panning = false;
      container.style.cursor = "default";
      var vb4 = svgEl.getAttribute("viewBox").split(/[\s,]+/).map(Number);
      vb.x = vb4[0];
      vb.y = vb4[1];
    }
  });

  // Double-click to zoom in
  container.addEventListener("dblclick", function (e) {
    var rect = container.getBoundingClientRect();
    var mx = (e.clientX - rect.left) / rect.width;
    var my = (e.clientY - rect.top) / rect.height;
    scale *= 2;
    scale = Math.min(20, scale);
    var sw = vb.w / scale;
    var sh = vb.h / scale;
    var cx = (vb.x + mx * vb.w);
    var cy = (vb.y + my * vb.h);
    svgEl.setAttribute("viewBox", (cx - sw / 2) + " " + (cy - sh / 2) + " " + sw + " " + sh);
  });

  // Touch support
  var touches = [];
  var lastTouchDist = 0;

  container.addEventListener("touchstart", function (e) {
    if (e.touches.length === 1) {
      panning = true;
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
      var vb2 = svgEl.getAttribute("viewBox").split(/[\s,]+/).map(Number);
      startVbX = vb2[0];
      startVbY = vb2[1];
    } else if (e.touches.length === 2) {
      var t = e.touches;
      lastTouchDist = Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);
    }
  }, { passive: true });

  container.addEventListener("touchmove", function (e) {
    if (e.touches.length === 1 && panning) {
      var dx = (e.touches[0].clientX - startX) / container.clientWidth;
      var dy = (e.touches[0].clientY - startY) / container.clientHeight;
      var vb3 = svgEl.getAttribute("viewBox").split(/[\s,]+/).map(Number);
      var sw = vb3[2], sh = vb3[3];
      svgEl.setAttribute("viewBox", (startVbX - dx * sw) + " " + (startVbY - dy * sh) + " " + sw + " " + sh);
      e.preventDefault();
    } else if (e.touches.length === 2) {
      var t = e.touches;
      var dist = Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);
      if (lastTouchDist > 0) {
        var factor = lastTouchDist / dist;
        scale *= factor;
        scale = Math.max(0.3, Math.min(20, scale));
        var sw2 = vb.w / scale;
        var sh2 = vb.h / scale;
        var cx = vb.x + vb.w / 2;
        var cy = vb.y + vb.h / 2;
        svgEl.setAttribute("viewBox", (cx - sw2 / 2) + " " + (cy - sh2 / 2) + " " + sw2 + " " + sh2);
      }
      lastTouchDist = dist;
      e.preventDefault();
    }
  }, { passive: false });

  container.addEventListener("touchend", function () {
    panning = false;
    var vb4 = svgEl.getAttribute("viewBox").split(/[\s,]+/).map(Number);
    vb.x = vb4[0];
    vb.y = vb4[1];
  }, { passive: true });
}
