function renderSettings() {
  if (!Auth.isAuthenticated()) {
    App.render(
      '<div class="state err"><span class="t">Not logged in</span>' +
      '<a href="/auth/login" class="wlink">Login with Authentik</a></div>'
    );
    return;
  }
  var user = Auth.getUser();
  var name = user.preferred_username || user.name || user.nickname || user.sub || "User";
  App.render(
    '<h1>Settings</h1>' +
    '<p class="sub">Hello, ' + App.esc(name) + ' !</p>'
  );
}
