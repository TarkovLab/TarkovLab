function renderSettings() {
  if (!Auth.isAuthenticated()) {
    App.render(
      '<div class="state err"><span class="t">Not logged in</span>' +
      '<a href="/auth/login" class="wlink">Sign In</a></div>'
    );
    return;
  }
  var user = Auth.getUser();
  var name = user.username || user.user_metadata && (user.user_metadata.full_name || user.user_metadata.name || user.user_metadata.display_name) || user.email || user.id || "User";

  var html =
    '<h1>Settings</h1>' +
    '<p class="sub">Hello, ' + App.esc(name) + ' !</p>' +
    '<div class="setting-group">' +
    '<label class="setting-label">Username</label>' +
    '<div class="setting-row">' +
    '<input type="text" id="username-input" class="setting-input" value="' + App.esc(name) + '" placeholder="Enter username" />' +
    '<button id="username-save-btn" class="setting-btn">Save</button>' +
    '</div>' +
    '<p id="username-msg" class="setting-msg"></p>' +
    '</div>';

  App.render(html);

  document.getElementById('username-save-btn').addEventListener('click', function () {
    var input = document.getElementById('username-input');
    var msg = document.getElementById('username-msg');
    var val = input.value.trim();
    if (!val) {
      msg.textContent = 'Username cannot be empty.';
      msg.className = 'setting-msg err';
      return;
    }
    fetch('/auth/update-username', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: val })
    })
    .then(function (r) { return r.json(); })
    .then(function (data) {
      if (data.ok) {
        msg.textContent = 'Username updated to "' + App.esc(data.username) + '"!';
        msg.className = 'setting-msg ok';
        Auth.check();
      } else {
        msg.textContent = data.error || 'Failed to update username.';
        msg.className = 'setting-msg err';
      }
    })
    .catch(function () {
      msg.textContent = 'Network error.';
      msg.className = 'setting-msg err';
    });
  });
}
