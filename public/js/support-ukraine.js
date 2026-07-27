App.registerPage("/support-ukraine", "Support Ukraine", "Ways to support Ukraine.", "/assets/icon.png");

function renderSupportUkraine() {
  document.title = "TarkovLab | Support Ukraine";
  App.render(
    '<h1><span style="font-size:1.6em;">&#x1F1FA;&#x1F1E6;</span> Support Ukraine</h1>' +
    '<p class="sub">Ways to help Ukraine against russian aggression.</p>' +
    '<div style="display:flex;flex-direction:column;gap:12px;">' +
      card("United24", "The official fundraising platform of Ukraine. Donations go directly to the government for defense, humanitarian aid, and reconstruction.", "https://u24.gov.ua/") +
      card("Come Back Alive", "One of the largest foundations supporting the Armed Forces of Ukraine. Provides equipment, training, and supplies to soldiers.", "https://savelife.in.ua/") +
      card("Red Cross Ukraine", "Provides humanitarian aid including food, water, medicine, and shelter to those affected by the war.", "https://redcross.org.ua/") +
      card("Voices of Children", "Provides psychological and psychosocial support to children affected by the war in Ukraine.", "https://voices.org.ua/en/") +
      card("Prytula Foundation", "Founded by Ukrainian volunteer Serhiy Prytula. Supports the military with drones, vehicles, and medical supplies.", "https://prytulafoundation.org/") +
      card("Hospitaliers", "A volunteer medical battalion that provides first aid and evacuation for soldiers on the front lines.", "https://www.hospitaliers.org/") +
    '</div>' +
    '<p style="margin-top:24px;font-size:0.85rem;color:var(--muted);">' +
      'Slava Ukraini. &#x1F1FA;&#x1F1E6;' +
    '</p>'
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
