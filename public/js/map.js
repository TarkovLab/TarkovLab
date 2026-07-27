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
      setupMapViewer(id, svgText, displayName);
    })
    .catch(function (e) {
      console.error("Failed to load map:", e.message);
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
  var panning = false;
  var startX, startY, startVbX, startVbY;

  function getVb() {
    return svgEl.getAttribute("viewBox").split(/[\s,]+/).map(Number);
  }

  container.addEventListener("wheel", function (e) {
    e.preventDefault();
    var rect = container.getBoundingClientRect();
    var mx = (e.clientX - rect.left) / rect.width;
    var my = (e.clientY - rect.top) / rect.height;
    var cur = getVb();
    var factor = e.deltaY > 0 ? 0.85 : 1.15;
    var sw = cur[2] * factor;
    var sh = cur[3] * factor;
    var cx = cur[0] + mx * cur[2];
    var cy = cur[1] + my * cur[3];
    svgEl.setAttribute("viewBox", (cx - sw / 2) + " " + (cy - sh / 2) + " " + sw + " " + sh);
  }, { passive: false });

  container.addEventListener("mousedown", function (e) {
    if (e.button !== 0) return;
    panning = true;
    startX = e.clientX;
    startY = e.clientY;
    var cur = getVb();
    startVbX = cur[0];
    startVbY = cur[1];
    container.style.cursor = "grabbing";
    e.preventDefault();
  });

  window.addEventListener("mousemove", function (e) {
    if (!panning) return;
    var dx = (e.clientX - startX) / container.clientWidth;
    var dy = (e.clientY - startY) / container.clientHeight;
    var cur = getVb();
    svgEl.setAttribute("viewBox", (startVbX - dx * cur[2]) + " " + (startVbY - dy * cur[3]) + " " + cur[2] + " " + cur[3]);
  });

  window.addEventListener("mouseup", function () {
    panning = false;
    container.style.cursor = "default";
  });

  container.addEventListener("dblclick", function (e) {
    var rect = container.getBoundingClientRect();
    var mx = (e.clientX - rect.left) / rect.width;
    var my = (e.clientY - rect.top) / rect.height;
    var cur = getVb();
    var sw = cur[2] * 0.5;
    var sh = cur[3] * 0.5;
    var cx = cur[0] + mx * cur[2];
    var cy = cur[1] + my * cur[3];
    svgEl.setAttribute("viewBox", (cx - sw / 2) + " " + (cy - sh / 2) + " " + sw + " " + sh);
  });

  var lastTouchDist = 0;

  container.addEventListener("touchstart", function (e) {
    if (e.touches.length === 1) {
      panning = true;
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
      var cur = getVb();
      startVbX = cur[0];
      startVbY = cur[1];
    } else if (e.touches.length === 2) {
      lastTouchDist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
    }
  }, { passive: true });

  container.addEventListener("touchmove", function (e) {
    if (e.touches.length === 1 && panning) {
      var dx = (e.touches[0].clientX - startX) / container.clientWidth;
      var dy = (e.touches[0].clientY - startY) / container.clientHeight;
      var cur = getVb();
      svgEl.setAttribute("viewBox", (startVbX - dx * cur[2]) + " " + (startVbY - dy * cur[3]) + " " + cur[2] + " " + cur[3]);
      e.preventDefault();
    } else if (e.touches.length === 2) {
      var dist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
      if (lastTouchDist > 0) {
        var factor = lastTouchDist / dist;
        var cur = getVb();
        var sw = cur[2] * factor;
        var sh = cur[3] * factor;
        var cx = cur[0] + cur[2] / 2;
        var cy = cur[1] + cur[3] / 2;
        svgEl.setAttribute("viewBox", (cx - sw / 2) + " " + (cy - sh / 2) + " " + sw + " " + sh);
      }
      lastTouchDist = dist;
      e.preventDefault();
    }
  }, { passive: false });

  container.addEventListener("touchend", function () {
    panning = false;
  }, { passive: true });
}
