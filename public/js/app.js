var App = (function () {
  "use strict";

  var API = "https://api.tarkovlab.org/graphql";
  var FALLBACK = "/assets/icon.png";
  var pages = [];

  function $(id) { return document.getElementById(id); }

  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }

  function setStatus(online) {
    var el = $("status"), txt = $("stxt");
    if (el) el.className = "status " + (online ? "on" : "off");
    if (txt) txt.textContent = online ? "API ONLINE" : "API OFFLINE";
  }

  function copyToClipboard(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).catch(function () { fallbackCopy(text); });
    } else {
      fallbackCopy(text);
    }
  }

  function fallbackCopy(text) {
    var ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand("copy"); } catch (e) {}
    document.body.removeChild(ta);
  }

  function showCopied(btn) {
    var orig = btn.textContent;
    btn.textContent = "Copied!";
    btn.classList.add("copied");
    setTimeout(function () {
      btn.textContent = orig;
      btn.classList.remove("copied");
    }, 2000);
  }

  function render(html) {
    var app = $("app");
    if (app) app.innerHTML = html;
  }

  function navActive(path) {
    var links = document.querySelectorAll("nav a");
    for (var i = 0; i < links.length; i++) {
      var href = links[i].getAttribute("href");
      links[i].classList.toggle("on", path === "/"
        ? href === "/"
        : href !== "/" && path.indexOf(href) === 0
      );
    }
  }

  function renderHome() {
    document.title = "TarkovLab";
    render(
      '<h1>TarkovLab</h1>' +
      '<p class="sub">Escape from Tarkov tools &amp; data.</p>' +
      '<div class="home-grid">' +
        pages.map(function (p) {
          return '<a href="' + esc(p.path) + '" class="home-card">' +
            (p.icon ? '<img src="' + esc(p.icon) + '" alt="" class="home-icon" />' : '') +
            '<div class="home-body">' +
              '<div class="home-label">' + esc(p.label) + '</div>' +
              (p.description ? '<div class="home-desc">' + esc(p.description) + '</div>' : '') +
            '</div>' +
            '<span class="home-arrow">&#x2192;</span>' +
          '</a>';
        }).join("") +
      '</div>'
    );
  }

  function route() {
    var path = window.location.pathname;
    var search = window.location.search;
    navActive(path);

    if (path === "/" || path === "") {
      renderHome();
    } else if (path === "/maps") {
      renderMaps();
    } else if (path === "/map") {
      var id = new URLSearchParams(search).get("id");
      renderMap(id);
    } else if (path === "/achievements") {
      renderAchievements();
    } else if (path === "/achievement") {
      var id = new URLSearchParams(search).get("id");
      renderAchievement(id);
    } else {
      render('<div class="state err"><span class="t">404</span>Page not found.</div>');
    }
  }

  function navigate(path) {
    history.pushState(null, "", path);
    route();
  }

  function registerPage(path, label, description, icon) {
    pages.push({ path: path, label: label, description: description, icon: icon });
  }

  document.addEventListener("click", function (e) {
    var a = e.target.closest("a");
    if (a && a.host === window.location.host && a.getAttribute("href") !== "#") {
      e.preventDefault();
      navigate(a.pathname + a.search);
    }
  });

  window.addEventListener("popstate", route);

  document.addEventListener("DOMContentLoaded", function () {
    route();
    setStatus(false);
  });

  return {
    API: API,
    FALLBACK: FALLBACK,
    $: $,
    esc: esc,
    setStatus: setStatus,
    copyToClipboard: copyToClipboard,
    showCopied: showCopied,
    render: render,
    navigate: navigate,
    registerPage: registerPage
  };
})();
