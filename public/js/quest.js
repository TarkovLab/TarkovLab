var QUEST_TYPE_LABEL = {
  mark: "Mark",
  visit: "Visit",
  plantItem: "Plant item",
  shoot: "Shoot",
  useItem: "Use item",
  giveItem: "Give item",
  findItem: "Find item",
  handoverItem: "Hand over item",
  kill: "Kill",
  survive: "Survive",
  extract: "Extract",
  obtainItem: "Obtain item",
  placeItem: "Place item",
  discover: "Discover",
  sellItem: "Sell item",
  complete: "Complete",
  transferItem: "Transfer item",
  intercept: "Intercept",
  donTask: "Don",
  leaveItem: "Leave item",
  neutralize: "Neutralize",
  absorb: "Absorb"
};

var QUEST_OBJ_COLORS = ["#e0b64f", "#5da8d8", "#e08050", "#9b8fe0", "#74c07a", "#d06a90", "#c8b860", "#4fc4b0"];

function questObjColor(idx) {
  return QUEST_OBJ_COLORS[idx % QUEST_OBJ_COLORS.length];
}

function questTypeLabel(t) {
  if (!t) return "Objective";
  return QUEST_TYPE_LABEL[t] || t.replace(/([A-Z])/g, " $1").replace(/^./, function (c) { return c.toUpperCase(); });
}

function questMapLabel(m) {
  if (!m) return "—";
  return m.replace(/-/g, " ").replace(/\b\w/g, function (c) { return c.toUpperCase(); });
}

function questObjectiveCount(q) {
  return q.objectives ? q.objectives.length : 0;
}

function questLocationCount(q) {
  var n = 0;
  if (q.objectives) {
    for (var i = 0; i < q.objectives.length; i++) {
      n += q.objectives[i].locations ? q.objectives[i].locations.length : 0;
    }
  }
  return n;
}

function questTraderName(t) {
  if (!t) return "Quest";
  return String(t).replace(/_/g, " ").replace(/\b\w/g, function (c) { return c.toUpperCase(); });
}

function questCopyRow(label, value) {
  if (!value) return '<div class="qst-meta-row"><span class="qst-meta-label">' + label + '</span><span class="qst-meta-val">—</span></div>';
  return '<div class="qst-meta-row"><span class="qst-meta-label">' + label + '</span><span class="qst-meta-val">' +
    '<code class="qst-id">' + App.esc(value) + '</code>' +
    '<button class="copy-btn" data-copy="' + App.esc(value) + '">Copy</button>' +
    '</span></div>';
}

function questMetaRow(label, value) {
  return '<div class="qst-meta-row"><span class="qst-meta-label">' + label + '</span><span class="qst-meta-val">' + value + '</span></div>';
}

function questObjHtml(q, o, idx, needed) {
  var type = questTypeLabel(o.type);
  var badge = o.optional ? '<span class="pill opt">Optional</span>' : '';
  var sep = '<span class="qst-obj-sep">&ndash;</span>';
  var locations = "";
  if (o.locations && o.locations.length > 0) {
    locations = '<div class="qst-locs">';
    for (var i = 0; i < o.locations.length; i++) {
      var l = o.locations[i];
      var mapName = questMapLabel(l.map);
      var href = l.map ? '/map?id=' + encodeURIComponent(l.map) : null;
      var link = href
        ? '<a href="' + href + '" class="qst-loc">' + App.esc(mapName) + (l.zoneId ? ' &middot; ' + App.esc(l.zoneId) : '') + '</a>'
        : '<span class="qst-loc">' + App.esc(mapName || "Unknown map") + '</span>';
      locations += link;
    }
    locations += '</div>';
  }
  var needs = "";
  if (needed && needed.length > 0) {
    needs = '<div class="qst-needs"><div class="h-sub">Needed items</div>' + tileListHtml(needed) + '</div>';
  }
  return '<div class="qst-obj">' +
    '<div class="qst-obj-head">' + sep + '<span class="qst-obj-type">' + App.esc(type) + '</span> ' + badge + '</div>' +
    '<div class="qst-obj-desc">' + App.esc(o.description || "No description.") + '</div>' +
    locations +
    needs +
    '</div>';
}

function questRewardSetHtml(label, set, experience) {
  if (!set) return "";
  var hasItems = set.items && set.items.length > 0;
  var hasStanding = set.traderStanding && set.traderStanding.length > 0;
  if (!hasItems && !hasStanding) return "";
  var html = '<div class="sec"><div class="h">' + App.esc(label) + ' rewards' +
    (experience ? ' <span class="pill xp">+' + Number(experience).toLocaleString() + ' XP</span>' : '') +
    '</div>';
  if (hasItems) {
    html += '<div class="qst-reward-tiles">' + tileListHtml(set.items) + '</div>';
  }
  if (hasStanding) {
    html += questStandingHtml(set.traderStanding);
  }
  html += '</div>';
  return html;
}

function questStandingHtml(list) {
  if (!list || list.length === 0) return "";
  var html = '<div class="qst-reward-standing">';
  for (var i = 0; i < list.length; i++) {
    var s = list[i];
    var v = Number(s.standing);
    var sign = v > 0 ? "+" : "";
    var cls = v > 0 ? " up" : (v < 0 ? " down" : "");
    html += '<span class="qst-standing' + cls + '">' +
      '<img class="qst-standing-img" src="' + App.esc(s.imageLink || "") + '" alt="" loading="lazy" onerror="this.style.display=\'none\'" />' +
      '<span class="qst-standing-name">' + App.esc(questTraderName(s.trader)) + '</span>' +
      '<span class="qst-standing-val">' + sign + v + '</span>' +
      '</span>';
  }
  html += '</div>';
  return html;
}

function questRewardsHtml(rewards, experience) {
  if (!rewards) return "";
  return questRewardSetHtml("Start", rewards.startRewards, experience) + questRewardSetHtml("Finish", rewards.finishRewards, experience);
}

var questMiniMapCache = null; // { norm: file } loaded from /api/maps

function questNormMapName(m) {
  return String(m || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

function loadQuestMapFiles() {
  if (questMiniMapCache) return Promise.resolve(questMiniMapCache);
  return fetch(App.DATA + "/api/maps")
    .then(function (r) { return r.json(); })
    .then(function (j) {
      var map = {};
      for (var i = 0; i < (j.maps || []).length; i++) {
        var m = j.maps[i];
        map[questNormMapName(m.name)] = m.file;
      }
      questMiniMapCache = map;
      return map;
    })
    .catch(function () {
      questMiniMapCache = {};
      return questMiniMapCache;
    });
}

function renderQuestMiniMap(svgFile, mapId, quest) {
  var wrap = document.createElement("div");
  wrap.className = "qst-minimap";
  var title = '<div class="qst-minimap-title">' + App.esc(questMapLabel(mapId)) +
    ' <a class="qst-minimap-link" href="/map?id=' + encodeURIComponent(mapId) + '">Open full map &nearr;</a></div>';
  wrap.innerHTML = title + '<div class="qst-minimap-body"><div class="state"><div class="spin"></div></div></div>';

  var body = wrap.querySelector(".qst-minimap-body");
  fetch(App.DATA + "/maps/" + encodeURIComponent(svgFile))
    .then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.text(); })
    .then(function (svgText) {
      var parser = new DOMParser();
      var doc = parser.parseFromString(svgText, "image/svg+xml");
      var svg = doc.querySelector("svg");
      if (!svg) throw new Error("Invalid SVG");
      var vb = svg.getAttribute("viewBox");
      var vbParts = vb ? vb.trim().split(/[\s,]+/).map(parseFloat) : [0, 0, 1000, 1000];
      var vbX = vbParts[0], vbY = vbParts[1], vbW = vbParts[2], vbH = vbParts[3];

      var layers = [];
      var i;
      for (i = 0; i < quest.objectives.length; i++) {
        var o = quest.objectives[i];
        if (!o.locations) continue;
        var seen = {};
        for (var j = 0; j < o.locations.length; j++) {
          var l = o.locations[j];
          if (questNormMapName(l.map) !== questNormMapName(mapId)) continue;
          var key = (l.zoneId || "") + "|" + Math.round((l.x || 0) * 10) / 10 + "," + Math.round((l.y || 0) * 10) / 10;
          if (seen[key]) continue;
          seen[key] = true;
          layers.push({ objective: o, objIndex: i, location: l });
        }
      }

      var ns = "http://www.w3.org/2000/svg";
      var g = document.createElementNS(ns, "g");
      g.setAttribute("class", "qst-minimap-markers");
      for (i = 0; i < layers.length; i++) {
        var loc = layers[i].location;
        var obj = layers[i].objective;
        var n = layers[i].objIndex + 1;
        var color = questObjColor(layers[i].objIndex);
        var desc = obj.description || questTypeLabel(obj.type);
        var tip = "Objective " + n + ": " + desc + (loc.zoneId ? " (" + loc.zoneId + ")" : "");
        var cx = vbX + (loc.xPct != null ? loc.xPct : 0) * vbW;
        var cy = vbY + (loc.yPct != null ? loc.yPct : 0) * vbH;
        var dispW = Math.min(380, 560 * (vbW / vbH) + 20);
        var r = Math.max(7, Math.round(vbW * 10 / dispW));
        var c = document.createElementNS(ns, "circle");
        c.setAttribute("cx", cx);
        c.setAttribute("cy", cy);
        c.setAttribute("r", r);
        c.setAttribute("class", "qst-minimap-dot");
        c.setAttribute("style", "fill:" + color);
        var t = document.createElementNS(ns, "title");
        t.textContent = tip;
        c.appendChild(t);
        g.appendChild(c);
        var num = document.createElementNS(ns, "text");
        num.setAttribute("x", cx);
        num.setAttribute("y", cy);
        num.setAttribute("class", "qst-minimap-num");
        num.setAttribute("style", "font-size:" + (r * 1.6) + "px");
        num.textContent = n;
        g.appendChild(num);
        if (loc.outline && loc.outline.length >= 3) {
          var pts = loc.outline.map(function (p) { return (p[0] || p.x) + "," + (p[1] || p.y); }).join(" ");
          var poly = document.createElementNS(ns, "polygon");
          poly.setAttribute("points", pts);
          poly.setAttribute("class", "qst-minimap-outline");
          poly.setAttribute("style", "fill:" + color + ";fill-opacity:0.25;stroke:" + color);
          var ot = document.createElementNS(ns, "title");
          ot.textContent = tip;
          poly.appendChild(ot);
          g.appendChild(poly);
        }
      }

      svg.setAttribute("viewBox", [vbX, vbY, vbW, vbH].join(" "));
      svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
      svg.removeAttribute("width");
      svg.removeAttribute("height");
      svg.appendChild(g);
      body.innerHTML = "";
      body.appendChild(svg);
    })
    .catch(function (e) {
      body.innerHTML = '<div class="state err"><span class="t">Map unavailable</span>' + App.esc(e.message) + '</div>';
    });

  return wrap;
}

function questMiniMapsHtml(quest) {
  var maps = {};
  for (var i = 0; i < quest.objectives.length; i++) {
    var o = quest.objectives[i];
    if (!o.locations) continue;
    for (var j = 0; j < o.locations.length; j++) {
      var l = o.locations[j];
      if (l.map) maps[l.map] = true;
    }
  }
  var mapIds = Object.keys(maps);
  if (mapIds.length === 0) return "";
  var section = '<div class="sec"><div class="h">Locations on maps <span class="cat-count">' + mapIds.length + '</span></div>' +
    '<div class="qst-minimaps">';
  var html = "";
  for (var k = 0; k < mapIds.length; k++) {
    html += '<div id="qst-mm-' + k + '"></div>';
  }
  section += html + '</div></div>';
  return { html: section, mapIds: mapIds };
}

function questRenderDetail(q, neededItems, rewards) {
  var de = App.$("q-detail");
  if (!de) return;

  var flags = "";
  if (q.kappa) flags += '<span class="pill kappa">Kappa</span> ';
  if (q.lightkeeper) flags += '<span class="pill lk">Lightkeeper</span> ';

  var wikiLink = q.wiki
    ? '<a href="' + App.esc(q.wiki) + '" target="_blank" rel="noopener">Escape from Tarkov Wiki &nearr;</a>'
    : "—";
  var antiLink = q.antifandomLink
    ? '<a href="' + App.esc(q.antifandomLink) + '" target="_blank" rel="noopener">Antifandom &nearr;</a>'
    : "—";

  var banner = q.imageLink
    ? '<img class="qst-banner" src="' + App.esc(q.imageLink) + '" alt="" loading="lazy" onerror="this.style.display=\'none\'" />'
    : "";

  var needsByObj = {};
  var leftoverNeeds = [];
  if (neededItems) {
    for (var i = 0; i < neededItems.length; i++) {
      var n = neededItems[i];
      if (n.objectiveId) {
        (needsByObj[n.objectiveId] = needsByObj[n.objectiveId] || []).push(n);
      } else {
        leftoverNeeds.push(n);
      }
    }
  }

  var objectives = "";
  if (q.objectives && q.objectives.length > 0) {
    objectives = '<div class="sec"><div class="h">Objectives <span class="cat-count">' + q.objectives.length + '</span></div>';
    for (var i = 0; i < q.objectives.length; i++) {
      var o = q.objectives[i];
      objectives += questObjHtml(q, o, i, needsByObj[o.id]);
    }
    objectives += '</div>';
  } else {
    objectives = '<div class="sec"><div class="h">Objectives</div><p class="qst-desc">No objectives listed for this quest.</p></div>';
  }

  if (leftoverNeeds.length > 0) {
    objectives += '<div class="sec"><div class="h">Other required items <span class="cat-count">' + leftoverNeeds.length + '</span></div>' +
      tileListHtml(leftoverNeeds) + '</div>';
  }

  var mini = questMiniMapsHtml(q);

  var rewardsHtml = questRewardsHtml(rewards, q.experience);

  de.innerHTML =
    '<div class="qst-detail">' +
      '<div class="qst-dhead">' +
        '<div class="qst-dhead-main">' +
          '<div class="qst-dcat">' + App.esc(questTraderName(q.trader)) + '</div>' +
          '<h2 class="qst-dname">' + App.esc(q.name) + '</h2>' +
          '<div class="qst-dmeta">' +
            '<span class="pill map">' + App.esc(questMapLabel(q.map)) + '</span> ' +
            '<span class="pill lvl">Level ' + (q.minPlayerLevel != null ? q.minPlayerLevel : "?") + '</span> ' +
            flags +
          '</div>' +
        '</div>' +
        banner +
      '</div>' +

      '<div class="sec qst-meta">' +
        questCopyRow("ID", q.id) +
        questCopyRow("Game ID", q.gameId) +
        questMetaRow("Trader", App.esc(questTraderName(q.trader))) +
        questMetaRow("Map", App.esc(questMapLabel(q.map))) +
        questMetaRow("Minimum level", q.minPlayerLevel != null ? q.minPlayerLevel : "—") +
        questMetaRow("Objectives", questObjectiveCount(q)) +
        questMetaRow("Locations", questLocationCount(q)) +
        questMetaRow("Wiki", wikiLink) +
        questMetaRow("Antifandom", antiLink) +
      '</div>' +
      (mini ? mini.html : "") +
      objectives +
      rewardsHtml +
    '</div>';

  var btns = de.querySelectorAll(".copy-btn");
  for (var b = 0; b < btns.length; b++) {
    (function (btn) {
      btn.addEventListener("click", function () {
        App.copyToClipboard(btn.getAttribute("data-copy"));
        App.showCopied(btn);
      });
    })(btns[b]);
  }

  if (mini) {
    loadQuestMapFiles().then(function (files) {
      for (var k = 0; k < mini.mapIds.length; k++) {
        var mapId = mini.mapIds[k];
        var file = files[questNormMapName(mapId)] || null;
        var slot = App.$("qst-mm-" + k);
        if (!slot) continue;
        if (!file) {
          slot.innerHTML = '<div class="state err"><span class="t">Map unavailable</span>No SVG for ' + App.esc(mapId) + '.</div>';
          continue;
        }
        var mm = renderQuestMiniMap(file, mapId, q);
        slot.appendChild(mm);
      }
    });
  }
}

function questFetchNeededItems(id) {
  var safeId = App.esc(id);
  function fetchNeeded(dims) {
    var itemFields = dims
      ? 'id gameId name shortName imageLink fallbackIconLink gridImageLink image512pxLink width height'
      : 'id name shortName imageLink fallbackIconLink width height';
    var extraFields = dims ? ' foundInRaid' : '';
    var query = 'query { quest(id: "' + safeId + '") { neededItems { item { ' + itemFields + ' } count objectiveId objectiveType objectiveDescription' + extraFields + ' } } }';
    return fetch(App.API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: query })
    })
      .then(function (r) {
        if (!r.ok) throw new Error("HTTP " + r.status);
        return r.json();
      })
      .then(function (j) {
        if (j.errors) throw new Error((j.errors[0] && j.errors[0].message) || "GraphQL error");
        if (!j.data || !j.data.quest || !j.data.quest.neededItems) return [];
        return j.data.quest.neededItems;
      });
  }
  return fetchNeeded(true).catch(function (e) {
    console.warn("Needed items with item sizes unavailable, retrying without:", e.message);
    return fetchNeeded(false);
  }).catch(function (e) {
    console.warn("Needed items unavailable:", e.message);
    return [];
  });
}

function questFetchRewards(id) {
  var safeId = App.esc(id);
  function fetchRewards(dims) {
    var itemFields = dims
      ? 'id gameId name shortName imageLink fallbackIconLink gridImageLink image512pxLink width height'
      : 'id name shortName imageLink fallbackIconLink width height';
    var query = 'query { quest(id: "' + safeId + '") { startRewards { items { item { ' + itemFields + ' } count } traderStanding { trader standing } } finishRewards { items { item { ' + itemFields + ' } count } traderStanding { trader standing } } } }';
    return fetch(App.API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: query })
    })
      .then(function (r) {
        if (!r.ok) throw new Error("HTTP " + r.status);
        return r.json();
      })
      .then(function (j) {
        if (j.errors) throw new Error((j.errors[0] && j.errors[0].message) || "GraphQL error");
        return (j.data && j.data.quest) || null;
      });
  }
  return fetchRewards(true).catch(function (e) {
    console.warn("Quest rewards with item sizes unavailable, retrying without:", e.message);
    return fetchRewards(false);
  }).catch(function (e) {
    console.warn("Quest rewards unavailable:", e.message);
    return null;
  });
}

function renderQuest(id) {
  if (!id) {
    App.render('<div class="state err"><span class="t">No quest selected</span><a class="back-link" href="/quests">&larr; Back to Quests</a></div>');
    return;
  }

  App.render(
    '<a href="/quests" class="back-link">&larr; Back to Quests</a>' +
    '<div id="q-detail"><div class="state"><div class="spin"></div>Loading quest...</div></div>'
  );

  var safeId = App.esc(id);
  var query = 'query { quest(id: "' + safeId + '") { id gameId name normalizedName trader map minPlayerLevel kappa lightkeeper experience wiki antifandomLink imageLink objectives { id type description optional locations { map zoneId x y xPct yPct level world { x y z } outline } } } }';
  Promise.all([
    fetch(App.API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: query })
    })
      .then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); })
      .then(function (j) {
        if (!j.data || !j.data.quest) throw new Error("Not found");
        return j.data.quest;
      }),
    questFetchNeededItems(id),
    questFetchRewards(id)
  ])
    .then(function (res) {
      questRenderDetail(res[0], res[1], res[2]);
      document.title = "TarkovLab | " + res[0].name;
    })
    .catch(function (e) {
      console.error("Failed to load quest:", e.message);
      var de = App.$("q-detail");
      if (de) de.innerHTML = '<div class="state err"><span class="t">Failed to load</span>' + App.esc(e.message) + '</div>';
    });
}
