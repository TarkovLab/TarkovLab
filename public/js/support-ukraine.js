function renderSupportUkraine() {
  document.title = "TarkovLab | Support Ukraine";
  App.render(
    '<h1><span style="font-size:1.6em;"></span> Support Ukraine</h1>' +
    '<p class="sub">Ways to help Ukraine against russian aggression.</p>' +
    '<div style="display:flex;flex-direction:column;gap:12px;">' +
      card("United24", "The official fundraising platform of Ukraine. Donations go directly to the government for defense, humanitarian aid, and reconstruction.", "https://u24.gov.ua/") +
      card("Come Back Alive", "One of the largest foundations supporting the Armed Forces of Ukraine. Provides equipment, training, and supplies to soldiers.", "https://savelife.in.ua/") +
      card("Red Cross Ukraine", "Provides humanitarian aid including food, water, medicine, and shelter to those affected by the war.", "https://redcross.org.ua/") +
      card("Voices of Children", "Provides psychological and psychosocial support to children affected by the war in Ukraine.", "https://voices.org.ua/en/") +
      card("Prytula Foundation", "Founded by Ukrainian volunteer Serhiy Prytula. Supports the military with drones, vehicles, and medical supplies.", "https://prytulafoundation.org/") +
    '</div>' +
    '<div style="margin-top:32px;text-align:center;">' +
      '<span style="font-family:Oswald,sans-serif;font-weight:700;font-size:2.4rem;letter-spacing:0.06em;text-transform:uppercase;background:linear-gradient(180deg,#0057B7 50%,#FFD700 50%);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;">Slava Ukraini</span>' +
    '</div>'
  );
}

function card(title, desc, url) {
  return '<a href="' + App.esc(url) + '" target="_blank" rel="noopener" class="home-card">' +
    '<div class="home-body">' +
      '<div class="home-label">' + App.esc(title) + '</div>' +
      '<div class="home-desc">' + App.esc(desc) + '</div>' +
    '</div>' +
    '<span class="home-arrow">&#x2192;</span>' +
  '</a>';
}
