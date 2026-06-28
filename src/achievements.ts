// Escape from Tarkov - Achievements Browser
// TarkovLab Project

interface GraphQLAchievement {
  id: string;
  name: string;
  description: string | null;
  rarity: string | null;
  normalizedRarity: string | null;
  hidden: boolean;
  imageLink: string | null;
  gameId: string | null;
}

class AchievementsApp {
  private achievements: GraphQLAchievement[] = [];
  private searchQuery: string = "";
  private rarityFilter: string = "all";
  private hiddenOnly: boolean = false;

  constructor() {
    this.init();
  }

  private async init() {
    this.startTarkovClocks();
    this.bindEvents();
    await this.loadAchievementsFromAPI();
  }

  // Dual Tarkov clocks helper (simulates EFT timezone speed) — same as quests view
  private startTarkovClocks(): void {
    const leftClock = document.getElementById("tarkov-clock-1");
    const rightClock = document.getElementById("tarkov-clock-2");

    const updateClocks = () => {
      const now = new Date();
      const tarkovMs = now.getTime() * 7;

      const time1 = new Date(tarkovMs);
      const time2 = new Date(tarkovMs + 12 * 60 * 60 * 1000);

      const formatTime = (d: Date) => {
        const h = String(d.getUTCHours()).padStart(2, "0");
        const m = String(d.getUTCMinutes()).padStart(2, "0");
        const s = String(d.getUTCSeconds()).padStart(2, "0");
        return `${h}:${m}:${s}`;
      };

      if (leftClock) leftClock.textContent = formatTime(time1);
      if (rightClock) rightClock.textContent = formatTime(time2);
    };

    updateClocks();
    setInterval(updateClocks, 1000 / 7);
  }

  private bindEvents(): void {
    const searchInput = document.getElementById("achievement-search") as HTMLInputElement | null;
    if (searchInput) {
      searchInput.addEventListener("input", (e) => {
        this.searchQuery = (e.target as HTMLInputElement).value;
        this.renderGrid();
        this.renderStats();
      });
    }

    const filterContainer = document.getElementById("rarity-filters");
    if (filterContainer) {
      const buttons = filterContainer.querySelectorAll(".filter-btn");
      buttons.forEach((btn) => {
        btn.addEventListener("click", () => {
          const rarity = btn.getAttribute("data-rarity");

          if (rarity === "hidden") {
            // Toggle the hidden-only pseudo filter independently
            this.hiddenOnly = !this.hiddenOnly;
            btn.classList.toggle("active", this.hiddenOnly);
          } else {
            this.rarityFilter = rarity || "all";
            buttons.forEach((b) => {
              if (b.getAttribute("data-rarity") !== "hidden") {
                b.classList.remove("active");
              }
            });
            btn.classList.add("active");
          }

          this.renderGrid();
          this.renderStats();
        });
      });
    }
  }

  private async loadAchievementsFromAPI(): Promise<void> {
    const query = `
      query FetchAchievements {
        achievements {
          id
          name
          description
          rarity
          normalizedRarity
          hidden
          imageLink
          gameId
        }
      }
    `;

    const statusContainer = document.getElementById("api-status-container");

    try {
      const response = await fetch(`https://api.tarkovlab.org/graphql`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });

      if (!response.ok) {
        throw new Error(`HTTP Error ${response.status}`);
      }

      const result = await response.json();
      if (result.data && result.data.achievements) {
        this.achievements = result.data.achievements;
        console.log(`Successfully fetched ${this.achievements.length} achievements from api.tarkovlab.org.`);

        if (statusContainer) {
          statusContainer.innerHTML = `
            <div class="status-indicator success" id="api-status-indicator">
              <span class="status-dot" id="api-status-dot"></span>
              <span class="status-text" id="api-status-text">API.TARKOVLAB.ORG: ONLINE</span>
            </div>
          `;
        }

        this.renderGrid();
        this.renderStats();
      } else {
        throw new Error("Empty achievements dataset returned.");
      }
    } catch (err: any) {
      console.error("Could not fetch remote achievements from api.tarkovlab.org:", err.message);

      if (statusContainer) {
        statusContainer.innerHTML = `
          <div class="status-indicator warning" id="api-status-indicator">
            <span class="status-dot pulsing" id="api-status-dot"></span>
            <span class="status-text" id="api-status-text">API.TARKOVLAB.ORG: OFFLINE</span>
          </div>
        `;
      }

      const grid = document.getElementById("achievements-grid");
      if (grid) {
        grid.innerHTML = `
          <div class="error-state" style="padding: 40px 20px; text-align: center; color: var(--accent-red-bright, var(--warning)); font-family: 'Rajdhani', sans-serif; grid-column: 1 / -1;">
            <span style="font-size: 1.2rem; font-weight: bold; display: block; margin-bottom: 8px;">DECRYPTION FAILED</span>
            <span>Could not establish connection with remote database api.tarkovlab.org. Verify network interface.</span>
          </div>
        `;
      }
    }
  }

  private normalizedRarityOf(a: GraphQLAchievement): string {
    return a.normalizedRarity || String(a.rarity || "").toLowerCase();
  }

  private getFiltered(): GraphQLAchievement[] {
    return this.achievements.filter((a) => {
      if (this.hiddenOnly && !a.hidden) {
        return false;
      }

      if (this.rarityFilter !== "all") {
        if (this.normalizedRarityOf(a) !== this.rarityFilter) {
          return false;
        }
      }

      if (this.searchQuery.trim() !== "") {
        const q = this.searchQuery.toLowerCase();
        const nameMatch = a.name.toLowerCase().includes(q);
        const descMatch = (a.description || "").toLowerCase().includes(q);
        return nameMatch || descMatch;
      }

      return true;
    });
  }

  private renderStats(): void {
    const statsEl = document.getElementById("achievements-stats");
    if (!statsEl) return;

    const total = this.achievements.length;
    const shown = this.getFiltered().length;
    const hiddenCount = this.achievements.filter((a) => a.hidden).length;

    statsEl.innerHTML = `
      <span><b style="color: var(--text);">${shown}</b> / ${total} ACHIEVEMENTS</span>
      <span style="color: var(--text-dark);">|</span>
      <span><b style="color: var(--warning);">${hiddenCount}</b> HIDDEN</span>
    `;
  }

  private renderGrid(): void {
    const grid = document.getElementById("achievements-grid");
    if (!grid) return;

    grid.innerHTML = "";

    const filtered = this.getFiltered();
    if (filtered.length === 0) {
      grid.innerHTML = `
        <div class="no-results-state" style="padding: 40px 20px; text-align: center; font-family: 'Rajdhani', sans-serif; color: var(--text-muted); grid-column: 1 / -1; width: 100%;">
          <span style="font-size: 1.1rem; font-weight: bold; display: block; margin-bottom: 8px; color: var(--text-dark);">NO ACHIEVEMENT CORRESPONDENCE</span>
          <span>No achievements found matching the active search parameters.</span>
        </div>
      `;
      return;
    }

    filtered.forEach((a) => {
      const rarity = this.normalizedRarityOf(a);
      const card = document.createElement("div");
      card.className = `achievement-card rarity-${rarity}`;
      card.setAttribute("data-achievement-id", a.id);

      const fallbackIcon = "https://logo.tarkovlab.org/tl-icon";
      const imageUrl = a.imageLink || fallbackIcon;
      const rarityLabel = (a.rarity || "Unknown").toUpperCase();

      const hiddenTag = a.hidden
        ? `<span class="achievement-hidden-tag">⊘ HIDDEN</span>`
        : "";

      card.innerHTML = `
        <div class="trader-card-border-corner top-left"></div>
        <div class="trader-card-border-corner top-right"></div>
        <div class="trader-card-border-corner bottom-left"></div>
        <div class="trader-card-border-corner bottom-right"></div>

        <div class="achievement-card-top">
          <div class="achievement-icon-wrapper">
            <img
              src="${imageUrl}"
              alt="${a.name}"
              class="achievement-icon"
              loading="lazy"
              onerror="this.onerror=null; this.src='${fallbackIcon}';"
            />
          </div>
          <div class="achievement-rarity-badge rarity-${rarity}">${rarityLabel}</div>
        </div>

        <div class="achievement-card-body">
          <h3 class="achievement-name">${a.name}</h3>
          <p class="achievement-desc">${a.description || "No intel available for this achievement."}</p>
        </div>

        <div class="achievement-card-footer">
          ${hiddenTag}
          <span class="achievement-id-tag">${a.id.replace("achievements-", "")}</span>
        </div>
      `;

      grid.appendChild(card);
    });
  }
}

window.addEventListener("DOMContentLoaded", () => {
  new AchievementsApp();
});
