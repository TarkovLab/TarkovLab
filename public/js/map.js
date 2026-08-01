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
    '<div id="map-tools" class="map-tools" style="display:none"></div>' +
    '<div id="map-levels" class="map-levels"></div>' +
    '<div id="map-container" class="map-container"><div class="state"><div class="spin"></div>Loading map...</div></div>' +
    '<div id="map-credit" class="map-credit"></div>'
  );

  var svgPromise = fetch(App.DATA + "/maps/" + encodeURIComponent(id) + ".svg")
    .then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.text(); });

  var dataPromise = fetch(App.API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      query: "query($name: String!) { mapData(name: $name) { map name svg viewBox levels objectiveCount objectives { quest questId questSlug objectiveId type description zoneId x y xPct yPct world { x y z } level outline } extracts { name faction x y xPct yPct world { x y z } outline } zones { zoneId x y xPct yPct world { x y z } outline } interactables { id label kind trigger x y xPct yPct world { x y z } } lights { name type on x y xPct yPct world { x y z } } } }",
      variables: { name: id }
    })
  })
    .then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); })
    .then(function (j) { return j.data && j.data.mapData ? j.data.mapData : null; })
    .catch(function (e) { console.warn("Failed to load map data:", e.message); return null; });

  Promise.all([svgPromise, dataPromise])
    .then(function (results) {
      setupMapViewer(id, results[0], displayName, results[1]);
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

function setupMapViewer(id, svgText, displayName, mapData) {
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

  // Overlay markers from the API data
  var overlay = null;
  if (mapData) {
    overlay = renderMapOverlay(svgEl, mapData);
    setupMapTools(mapData, overlay);
  }

  // Credit
  setupMapCredit(displayName);

  // Pan/Zoom
  setupPanZoom(svgEl, container, overlay);
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

function renderMapOverlay(svgEl, mapData) {
  var ns = "http://www.w3.org/2000/svg";
  var vb = svgEl.getAttribute("viewBox").split(/[\s,]+/).map(Number);
  var W = vb[2], H = vb[3];

  var g = document.createElementNS(ns, "g");
  g.setAttribute("id", "tl-overlay");
  svgEl.appendChild(g);

  var state = { objectives: true, extracts: true, zones: true, interactables: true, lights: false };

  // ---- custom tooltip (follows the mouse) ----
  var tip = document.createElement("div");
  tip.className = "tl-tooltip";
  tip.style.display = "none";
  document.body.appendChild(tip);

  function bindTip(el, html) {
    el.addEventListener("pointerenter", function () {
      tip.innerHTML = html;
      tip.style.display = "block";
    });
    el.addEventListener("pointermove", function (e) {
      tip.style.left = (e.clientX + 14) + "px";
      tip.style.top = (e.clientY + 14) + "px";
    });
    el.addEventListener("pointerleave", function () {
      tip.style.display = "none";
    });
  }

  // ---- zones: translucent polygons (kill zones get a distinct color) ----
  var killZones = {};
  if (mapData.objectives) {
    for (var i = 0; i < mapData.objectives.length; i++) {
      if (mapData.objectives[i].type === "shoot") killZones[mapData.objectives[i].zoneId] = true;
    }
  }
  var zoneG = document.createElementNS(ns, "g");
  zoneG.setAttribute("class", "tl-layer tl-zones");
  if (mapData.zones) {
    for (var i = 0; i < mapData.zones.length; i++) {
      var z = mapData.zones[i];
      if (!z.outline || z.outline.length < 3) continue;
      var pts = z.outline.map(function (p) { return p[0] + "," + p[1]; }).join(" ");
      var poly = document.createElementNS(ns, "polygon");
      var isKill = killZones[z.zoneId] || (z.zoneId || "").indexOf("kill") !== -1;
      poly.setAttribute("points", pts);
      poly.setAttribute("class", "tl-zone" + (isKill ? " tl-zone-kill" : ""));
      poly.setAttribute("data-zone", z.zoneId || "");
      bindTip(poly, "<strong>" + (isKill ? "Kill zone" : "Zone") + "</strong> \u2014 " + App.esc(z.zoneId || "?"));
      zoneG.appendChild(poly);
    }
  }
  g.appendChild(zoneG);

  // ---- objectives ----
  var objG = document.createElementNS(ns, "g");
  objG.setAttribute("class", "tl-layer tl-objectives");
  if (mapData.objectives) {
    for (var i = 0; i < mapData.objectives.length; i++) {
      var o = mapData.objectives[i];
      if (o.xPct == null || o.yPct == null) continue;
      var c = document.createElementNS(ns, "circle");
      c.setAttribute("cx", o.xPct * W);
      c.setAttribute("cy", o.yPct * H);
      c.setAttribute("r", "5");
      c.setAttribute("class", "tl-obj");
      c.setAttribute("data-id", o.objectiveId || o.zoneId || "");
      if (o.questSlug) c.setAttribute("data-quest-slug", o.questSlug);
      var tipHtml = "<strong>" + App.esc(o.quest || "?") + "</strong>";
      if (o.description) tipHtml += "<div class=\"tip-desc\">" + App.esc(o.description) + "</div>";
      if (o.type) tipHtml += "<div class=\"tip-meta\">" + App.esc(o.type) + "</div>";
      bindTip(c, tipHtml);
      c.addEventListener("click", function (e) {
        e.stopPropagation();
        var slug = this.getAttribute("data-quest-slug");
        if (slug) App.navigate("/quests/" + encodeURIComponent(slug));
      });
      objG.appendChild(c);
    }
  }
  g.appendChild(objG);

  // ---- extracts ----
  var extG = document.createElementNS(ns, "g");
  extG.setAttribute("class", "tl-layer tl-extracts");
  if (mapData.extracts) {
    for (var i = 0; i < mapData.extracts.length; i++) {
      var e = mapData.extracts[i];
      if (e.xPct == null || e.yPct == null) continue;
      var c = document.createElementNS(ns, "circle");
      c.setAttribute("cx", e.xPct * W);
      c.setAttribute("cy", e.yPct * H);
      c.setAttribute("r", "6");
      var cls = "tl-extract";
      var faction = e.faction || "";
      if (faction === "scav") cls += " tl-extract-scav";
      else if (faction === "pmc") cls += " tl-extract-pmc";
      else if (faction === "shared") cls += " tl-extract-shared";
      c.setAttribute("class", cls);
      c.setAttribute("data-id", "extract-" + (e.name || i));
      var tipHtml = "<strong>Extract \u2014 " + App.esc(e.name || "?") + "</strong>";
      if (e.faction) tipHtml += "<div class=\"tip-meta\">" + App.esc(e.faction) + "</div>";
      bindTip(c, tipHtml);
      extG.appendChild(c);
    }
  }
  g.appendChild(extG);

  // ---- interactables ----
  var intG = document.createElementNS(ns, "g");
  intG.setAttribute("class", "tl-layer tl-interactables");
  if (mapData.interactables) {
    for (var i = 0; i < mapData.interactables.length; i++) {
      var it = mapData.interactables[i];
      if (it.xPct == null || it.yPct == null) continue;
      var rect = document.createElementNS(ns, "rect");
      rect.setAttribute("x", it.xPct * W - 4);
      rect.setAttribute("y", it.yPct * H - 4);
      rect.setAttribute("width", "8");
      rect.setAttribute("height", "8");
      rect.setAttribute("class", "tl-interact");
      bindTip(rect, "<strong>Interactable</strong><div class=\"tip-desc\">" + App.esc(it.label || it.kind || "?") + "</div>");
      intG.appendChild(rect);
    }
  }
  g.appendChild(intG);

  // ---- lights ----
  var lightG = document.createElementNS(ns, "g");
  lightG.setAttribute("class", "tl-layer tl-lights");
  if (mapData.lights) {
    for (var i = 0; i < mapData.lights.length; i++) {
      var l = mapData.lights[i];
      if (l.xPct == null || l.yPct == null) continue;
      var c = document.createElementNS(ns, "circle");
      c.setAttribute("cx", l.xPct * W);
      c.setAttribute("cy", l.yPct * H);
      c.setAttribute("r", "2");
      c.setAttribute("class", "tl-light");
      bindTip(c, "<strong>Light</strong><div class=\"tip-desc\">" + App.esc(l.name || l.type || "?") + "</div>");
      lightG.appendChild(c);
    }
  }
  g.appendChild(lightG);

  function apply() {
    var map = {
      zones: state.zones, objectives: state.objectives, extracts: state.extracts,
      interactables: state.interactables, lights: state.lights
    };
    for (var key in map) {
      var layer = g.querySelector(".tl-" + key);
      if (layer) layer.style.display = map[key] ? "" : "none";
    }
  }

  var overlay = { g: g, apply: apply, state: state, W: W, H: H };
  apply();
  return overlay;
}

function setupMapTools(mapData, overlay) {
  var el = App.$("map-tools");
  if (!el) return;
  el.style.display = "flex";

  var counts = {
    objectives: mapData.objectives ? mapData.objectives.length : 0,
    extracts: mapData.extracts ? mapData.extracts.length : 0,
    zones: mapData.zones ? mapData.zones.length : 0,
    interactables: mapData.interactables ? mapData.interactables.length : 0,
    lights: mapData.lights ? mapData.lights.length : 0,
  };

  var defs = [
    { key: "objectives", label: "Objectives" },
    { key: "extracts", label: "Extracts" },
    { key: "zones", label: "Zones" },
    { key: "interactables", label: "Interactables" },
    { key: "lights", label: "Lights" }
  ];

  var html = "";
  for (var i = 0; i < defs.length; i++) {
    var d = defs[i];
    html += '<button class="tl-toggle' + (d.key === "lights" ? " off" : " on") + '" data-layer="' + d.key + '">' +
      App.esc(d.label) + ' <span class="cnt">' + counts[d.key] + '</span></button>';
  }
  el.innerHTML = html;

  var btns = el.querySelectorAll("button");
  for (var i = 0; i < btns.length; i++) {
    btns[i].addEventListener("click", function () {
      this.classList.toggle("on");
      this.classList.toggle("off");
      var key = this.getAttribute("data-layer");
      if (overlay && overlay.state) {
        overlay.state[key] = this.classList.contains("on");
        overlay.apply();
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
    'licensed under <a href="https://creativecommons.org/licenses/by-nc-sa/4.0/" target="_blank" rel="noopener">CC BY-NC-SA 4.0</a>.<br/>' +
    'Objectives, extracts, zones and interactables from the ATLAS game-data extraction pipeline.';
}

function setupPanZoom(svgEl, container, overlay) {
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
    var factor = e.deltaY > 0 ? 1.15 : 0.85;
    var sw = cur[2] * factor;
    var sh = cur[3] * factor;
    var cx = cur[0] + mx * cur[2];
    var cy = cur[1] + my * cur[3];
    svgEl.setAttribute("viewBox", (cx - sw / 2) + " " + (cy - sh / 2) + " " + sw + " " + sh);
  }, { passive: false });

  container.addEventListener("mousedown", function (e) {
    if (e.button !== 0) return;
    if (e.target.closest && e.target.closest(".tl-obj,.tl-extract,.tl-interact,.tl-zone")) return;
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
