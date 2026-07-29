function renderSettings() {
  if (!Auth.isAuthenticated()) {
    App.render(
      '<div class="state err"><span class="t">Not logged in</span>' +
      '<a href="/auth/login" class="wlink">Sign In</a></div>'
    );
    return;
  }
  var user = Auth.getUser();
  var name = user.user_metadata && user.user_metadata.display_name || user.email || user.id || "User";
  App.render(
    '<h1>Settings</h1>' +
    '<p class="sub">Hello, ' + App.esc(name) + ' !</p>'
  );
}
