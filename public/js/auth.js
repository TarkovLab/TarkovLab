var Auth = (function () {
  "use strict";

  var user = null;
  var ready = false;
  var listeners = [];

  function onChange(fn) {
    if (ready) setTimeout(fn, 0);
    else listeners.push(fn);
  }

  function notify() {
    ready = true;
    listeners.forEach(function (fn) { fn(user); });
    listeners = [];
  }

  function updateUI() {
    var el = document.getElementById("auth-section");
    var navSettings = document.getElementById("nav-settings");
    if (!el) return;
    if (user) {
      var name = user.user_metadata && user.user_metadata.display_name || user.email || user.id || "User";
      el.innerHTML =
        '<a href="/settings" class="auth-user">' + App.esc(name) + '</a>' +
        '<a href="/auth/logout" class="auth-btn">Logout</a>';
      if (navSettings) navSettings.style.display = "";
    } else {
      el.innerHTML = '<a href="/auth/login" class="auth-btn">Login</a>';
      if (navSettings) navSettings.style.display = "none";
    }
  }

  function check() {
    return fetch("/auth/me")
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (data.authenticated) {
          user = data.user;
        } else {
          user = null;
        }
        updateUI();
        notify();
      })
      .catch(function () {
        user = null;
        updateUI();
        notify();
      });
  }

  function getUser() { return user; }
  function isAuthenticated() { return !!user; }

  check();

  return {
    check: check,
    getUser: getUser,
    isAuthenticated: isAuthenticated,
    onChange: onChange,
  };
})();
