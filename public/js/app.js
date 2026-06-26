"use strict";
// Escape from Tarkov - Quest Tracker & Interface Logic
// TarkovLab Project
class AppState {
    quests = [];
    selectedQuestId = null;
    searchQuery = "";
    selectedTraderFilter = "all";
    constructor() {
        this.init();
    }
    async init() {
        this.startTarkovClocks();
        this.bindEvents();
        await this.loadQuestsFromAPI();
    }
    // Dual Tarkov clocks helper (simulates EFT timezone speed)
    startTarkovClocks() {
        const leftClock = document.getElementById("tarkov-clock-1");
        const rightClock = document.getElementById("tarkov-clock-2");
        const updateClocks = () => {
            const now = new Date();
            const realMs = now.getTime();
            const tarkovMultiplier = 7;
            const tarkovMs = realMs * tarkovMultiplier;
            const time1 = new Date(tarkovMs);
            const time2 = new Date(tarkovMs + 12 * 60 * 60 * 1000); // 12 hours offset
            const formatTime = (d) => {
                const h = String(d.getUTCHours()).padStart(2, '0');
                const m = String(d.getUTCMinutes()).padStart(2, '0');
                const s = String(d.getUTCSeconds()).padStart(2, '0');
                return `${h}:${m}:${s}`;
            };
            if (leftClock)
                leftClock.textContent = formatTime(time1);
            if (rightClock)
                rightClock.textContent = formatTime(time2);
        };
        updateClocks();
        setInterval(updateClocks, 1000 / 7);
    }
    // Bind interactive DOM events
    bindEvents() {
        // Search input
        const searchInput = document.getElementById("quest-search");
        if (searchInput) {
            searchInput.addEventListener("input", (e) => {
                this.searchQuery = e.target.value;
                this.renderQuestsGrid();
            });
        }
        // Trader filter buttons
        const filterContainer = document.getElementById("trader-filters");
        if (filterContainer) {
            const buttons = filterContainer.querySelectorAll(".filter-btn");
            buttons.forEach(btn => {
                btn.addEventListener("click", () => {
                    buttons.forEach(b => b.classList.remove("active"));
                    btn.classList.add("active");
                    this.selectedTraderFilter = btn.getAttribute("data-trader") || "all";
                    this.renderQuestsGrid();
                    // Auto-select first quest in the filtered list
                    const filtered = this.getFilteredQuests();
                    if (filtered.length > 0) {
                        this.selectQuest(filtered[0].id);
                    }
                    else {
                        this.selectedQuestId = null;
                        this.renderInspectPanel();
                    }
                });
            });
        }
    }
    // Fetch quests from remote api.tarkovlab.org GraphQL
    async loadQuestsFromAPI() {
        const query = `
      query FetchQuests {
        quests {
          id
          title
          exp
          giver
          turnin
          wiki
          reputation {
            trader
            rep
          }
          require {
            level
            quests
          }
          objectives {
            id
            type
            target
            number
            location
            gps {
              leftPercent
              topPercent
              floor
            }
          }
        }
      }
    `;
        const statusContainer = document.getElementById("api-status-container");
        try {
            const response = await fetch(`https://api.tarkovlab.org/graphql`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ query }),
            });
            if (!response.ok) {
                throw new Error(`HTTP Error ${response.status}`);
            }
            const result = await response.json();
            if (result.data && result.data.quests) {
                this.quests = result.data.quests;
                console.log(`Successfully fetched ${this.quests.length} quests from api.tarkovlab.org.`);
                // Update status indicator to online success
                if (statusContainer) {
                    statusContainer.innerHTML = `
            <div class="status-indicator success" id="api-status-indicator">
              <span class="status-dot" id="api-status-dot"></span>
              <span class="status-text" id="api-status-text">API.TARKOVLAB.ORG: ONLINE</span>
            </div>
          `;
                }
                // Render layout
                this.renderQuestsGrid();
                // Select first quest
                if (this.quests.length > 0) {
                    this.selectQuest(this.quests[0].id);
                }
            }
            else {
                throw new Error("Empty quests dataset returned.");
            }
        }
        catch (err) {
            console.error("Could not fetch remote quests from api.tarkovlab.org:", err.message);
            // Update status indicator to offline
            if (statusContainer) {
                statusContainer.innerHTML = `
          <div class="status-indicator warning" id="api-status-indicator">
            <span class="status-dot pulsing" id="api-status-dot"></span>
            <span class="status-text" id="api-status-text">API.TARKOVLAB.ORG: OFFLINE</span>
          </div>
        `;
            }
            const grid = document.getElementById("quests-grid");
            if (grid) {
                grid.innerHTML = `
          <div class="error-state" style="padding: 40px 20px; text-align: center; color: var(--accent-red-bright); font-family: 'Rajdhani', sans-serif; grid-column: 1 / -1;">
            <span style="font-size: 1.2rem; font-weight: bold; display: block; margin-bottom: 8px;">DECRYPTION FAILED</span>
            <span>Could not establish connection with remote database api.tarkovlab.org. Verify network interface.</span>
          </div>
        `;
            }
        }
    }
    // Filter logic
    getFilteredQuests() {
        return this.quests.filter(quest => {
            // 1. Trader Giver filter
            if (this.selectedTraderFilter !== "all") {
                const expectedGiver = ID_TO_GIVER[this.selectedTraderFilter];
                if (quest.giver !== expectedGiver) {
                    return false;
                }
            }
            // 2. Search Query filter (matches title, giver, or objectives text)
            if (this.searchQuery.trim() !== "") {
                const query = this.searchQuery.toLowerCase();
                const titleMatch = quest.title.toLowerCase().includes(query);
                const giverNameMatch = (GIVER_TO_NAME[quest.giver] || "").toLowerCase().includes(query);
                let objectiveMatch = false;
                if (quest.objectives) {
                    objectiveMatch = quest.objectives.some(obj => {
                        const formatted = formatObjective(obj).toLowerCase();
                        return formatted.includes(query);
                    });
                }
                return titleMatch || giverNameMatch || objectiveMatch;
            }
            return true;
        });
    }
    // Render Left Column list
    renderQuestsGrid() {
        const grid = document.getElementById("quests-grid");
        if (!grid)
            return;
        grid.innerHTML = "";
        const filtered = this.getFilteredQuests();
        if (filtered.length === 0) {
            grid.innerHTML = `
        <div class="no-results-state" style="padding: 40px 20px; text-align: center; font-family: 'Rajdhani', sans-serif; color: var(--text-muted); grid-column: 1 / -1; width: 100%;">
          <span style="font-size: 1.1rem; font-weight: bold; display: block; margin-bottom: 8px; color: var(--text-dark);">NO TASK CORRESPONDENCE</span>
          <span>No operation tasks found matching the active search parameters.</span>
        </div>
      `;
            return;
        }
        filtered.forEach(quest => {
            const card = document.createElement("div");
            const isSelected = quest.id === this.selectedQuestId;
            card.className = `trader-card ${isSelected ? "active" : ""}`;
            card.setAttribute("data-quest-id", quest.id.toString());
            const giverName = GIVER_TO_NAME[quest.giver] || `Giver ${quest.giver}`;
            card.innerHTML = `
        <div class="trader-card-border-corner top-left"></div>
        <div class="trader-card-border-corner top-right"></div>
        <div class="trader-card-border-corner bottom-left"></div>
        <div class="trader-card-border-corner bottom-right"></div>
        
        <div class="trader-info-block" style="padding: 14px; display: flex; flex-direction: column; height: 100%; justify-content: space-between; gap: 8px;">
          <div>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
              <span style="font-family: 'Rajdhani', sans-serif; font-size: 0.7rem; font-weight: 700; color: var(--accent); letter-spacing: 0.1em; text-transform: uppercase;">
                ${giverName}
              </span>
              <span class="quest-badge" style="font-size: 0.6rem; padding: 1px 4px; font-family: 'Rajdhani', sans-serif;">
                ID: ${quest.id}
              </span>
            </div>
            <h3 style="font-family: 'Bebas Neue', sans-serif; font-size: 1.25rem; letter-spacing: 0.05em; color: var(--text); margin: 0; line-height: 1.2; text-shadow: ${isSelected ? '0 0 8px rgba(156, 165, 94, 0.3)' : 'none'};">
              ${quest.title}
            </h3>
          </div>
          <div style="font-family: 'Rajdhani', sans-serif; font-size: 0.75rem; color: var(--text-muted); display: flex; justify-content: space-between; border-top: 1px dashed rgba(255,255,255,0.05); padding-top: 6px; margin-top: auto;">
            <span>EXP: <strong style="color: var(--warning);">${quest.exp ? quest.exp.toLocaleString() : 0}</strong></span>
            <span>OBJECTIVES: <strong style="color: var(--text);">${quest.objectives ? quest.objectives.length : 0}</strong></span>
          </div>
        </div>
      `;
            card.addEventListener("click", () => {
                this.selectQuest(quest.id);
            });
            grid.appendChild(card);
        });
    }
    // Select a quest from the list
    selectQuest(questId) {
        this.selectedQuestId = questId;
        const cards = document.querySelectorAll(".trader-card");
        cards.forEach(card => {
            const cardId = card.getAttribute("data-quest-id");
            if (cardId === questId.toString()) {
                card.classList.add("active");
            }
            else {
                card.classList.remove("active");
            }
        });
        this.renderInspectPanel();
    }
    // Render Right Column details inspector
    renderInspectPanel() {
        const quest = this.quests.find(q => q.id === this.selectedQuestId);
        const inspectHeader = document.getElementById("inspect-quest-header");
        const detailsBody = document.getElementById("quest-details-body");
        if (!quest) {
            if (inspectHeader) {
                inspectHeader.innerHTML = `
          <div class="no-quest-selected" style="text-align: center; padding: 40px 20px; font-family: 'Rajdhani', sans-serif; color: var(--text-muted); width: 100%;">
            <span style="font-size: 1.2rem; font-weight: 600; display: block; margin-bottom: 8px; color: var(--text-dark);">NO TASK SELECTED</span>
            <span>Select an operation task from the decrypted list to view dossier intelligence.</span>
          </div>
        `;
            }
            if (detailsBody) {
                detailsBody.style.display = "none";
            }
            return;
        }
        if (detailsBody) {
            detailsBody.style.display = "flex";
        }
        // Render header
        if (inspectHeader) {
            const giverId = GIVER_TO_ID[quest.giver] || "fence";
            const giverName = GIVER_TO_NAME[quest.giver] || `Trader ${quest.giver}`;
            const primaryUrl = `https://assets.tarkovlab.org/traders/${giverId}.webp`;
            const secondaryUrl = `https://assets.tarkovlab.org/traders/${giverId === "jaeger" ? "jeager" : giverId}.webp`;
            inspectHeader.innerHTML = `
        <div class="inspect-avatar-container" style="width: 70px; height: 70px; flex-shrink: 0; border: 1px solid var(--line-active); border-radius: var(--border-radius-sm); overflow: hidden; position: relative;">
          <img 
            src="${primaryUrl}" 
            alt="${giverName}" 
            class="inspect-avatar"
            style="width: 100%; height: 100%; object-fit: cover; filter: grayscale(30%) contrast(110%);"
            onerror="this.onerror=null; this.src='${secondaryUrl}'; this.addEventListener('error', function() { this.src='https://assets.tarkovlab.org/traders/fence.webp'; })"
          />
        </div>
        <div class="inspect-title-block" style="flex: 1; display: flex; flex-direction: column; gap: 4px;">
          <div class="inspect-tactical-label" style="font-family: 'Rajdhani', sans-serif; font-size: 0.7rem; font-weight: 700; color: var(--accent); letter-spacing: 0.1em; text-transform: uppercase;">
            OPERATION DOSSIER // GIVER: ${giverName.toUpperCase()}
          </div>
          <h2 class="inspect-trader-name" style="font-family: 'Bebas Neue', sans-serif; font-size: 1.8rem; color: var(--text); margin: 0; line-height: 1.1; letter-spacing: 0.03em;">
            ${quest.title}
          </h2>
          <div class="inspect-trader-meta" style="font-family: 'Rajdhani', sans-serif; font-size: 0.75rem; color: var(--text-muted); display: flex; gap: 16px;">
            <span><b>TASK ID:</b> ${quest.id}</span>
            <span><b>GIVER INDEX:</b> 0${quest.giver}</span>
          </div>
        </div>
      `;
        }
        // Render Wiki link
        const wikiBrief = document.getElementById("quest-wiki-brief");
        if (wikiBrief) {
            if (quest.wiki) {
                wikiBrief.innerHTML = `
          <p style="margin-bottom: 8px;">Contractor instructions and briefing intelligence are compiled on the tactical database:</p>
          <a href="${quest.wiki}" target="_blank" class="tarkov-wiki-link" style="color: var(--accent); font-weight: 700; text-decoration: none; border-bottom: 1px dashed var(--accent); display: inline-flex; align-items: center; gap: 6px; font-family: 'Rajdhani', sans-serif; font-size: 0.9rem;">
            ACCESS SECURE WIKI INTEL LINK ↗
          </a>
        `;
            }
            else {
                wikiBrief.innerHTML = `<p style="color: var(--text-dark);">No external intelligence briefing link available in database.</p>`;
            }
        }
        // Render Objectives
        const objectivesList = document.getElementById("quest-objectives-list");
        if (objectivesList) {
            objectivesList.innerHTML = "";
            if (quest.objectives && quest.objectives.length > 0) {
                quest.objectives.forEach(obj => {
                    const li = document.createElement("li");
                    li.className = "quest-objective-item";
                    li.style.display = "flex";
                    li.style.alignItems = "flex-start";
                    li.style.gap = "8px";
                    li.style.marginBottom = "6px";
                    li.innerHTML = `
            <span class="list-bullet" style="color: var(--accent); margin-top: 2px;">▪</span>
            <span style="font-family: 'Rajdhani', sans-serif; font-size: 0.85rem; color: var(--text-muted); line-height: 1.3;">${formatObjective(obj)}</span>
          `;
                    objectivesList.appendChild(li);
                });
            }
            else {
                objectivesList.innerHTML = `<li style="color: var(--text-dark); font-family: 'Rajdhani', sans-serif; font-size: 0.85rem;">No operational objectives specified for this dossier.</li>`;
            }
        }
        // Render Rewards
        const rewardsList = document.getElementById("quest-rewards-list");
        if (rewardsList) {
            rewardsList.innerHTML = "";
            const rewards = [];
            if (quest.exp) {
                rewards.push(`+${quest.exp.toLocaleString()} EXP`);
            }
            if (quest.reputation && quest.reputation.length > 0) {
                quest.reputation.forEach(rep => {
                    const tName = GIVER_TO_NAME[rep.trader] || `Trader ${rep.trader}`;
                    rewards.push(`${rep.rep >= 0 ? "+" : ""}${rep.rep.toFixed(2)} ${tName} Standing (Rep)`);
                });
            }
            if (quest.unlocks && quest.unlocks.length > 0) {
                quest.unlocks.forEach(unlock => {
                    rewards.push(`Unlock Purchase: ${ITEM_NAMES[unlock] || unlock}`);
                });
            }
            if (rewards.length > 0) {
                rewards.forEach(r => {
                    const li = document.createElement("li");
                    li.style.display = "flex";
                    li.style.alignItems = "flex-start";
                    li.style.gap = "8px";
                    li.style.marginBottom = "4px";
                    li.innerHTML = `
            <span class="list-bullet" style="color: var(--warning); margin-top: 2px;">▪</span>
            <span style="font-family: 'Rajdhani', sans-serif; font-size: 0.85rem; color: var(--text-muted); line-height: 1.3;">${r}</span>
          `;
                    rewardsList.appendChild(li);
                });
            }
            else {
                rewardsList.innerHTML = `<li style="color: var(--text-dark); font-family: 'Rajdhani', sans-serif; font-size: 0.85rem;">No specific rewards listed.</li>`;
            }
        }
        // Render Requirements
        const reqInfo = document.getElementById("quest-requirements-info");
        if (reqInfo) {
            const minLvl = quest.require?.level;
            const requiredQuestIds = quest.require?.quests;
            let html = "";
            if (minLvl) {
                html += `<div>• Minimum PMC Contractor Level: <strong style="color: var(--text);">${minLvl}</strong></div>`;
            }
            if (requiredQuestIds && requiredQuestIds.length > 0) {
                const requiredTitles = requiredQuestIds.map(id => {
                    const rq = this.quests.find(q => q.id === id);
                    return rq ? `"${rq.title}"` : `Task #${id}`;
                });
                html += `<div style="margin-top: 6px;">• Previous completed operations required:</div>`;
                html += `<ul style="list-style: none; padding-left: 12px; margin-top: 4px; color: var(--text-muted); display: flex; flex-direction: column; gap: 3px;">`;
                requiredTitles.forEach(t => {
                    html += `<li>- ${t}</li>`;
                });
                html += `</ul>`;
            }
            if (!minLvl && (!requiredQuestIds || requiredQuestIds.length === 0)) {
                html = `<div style="color: var(--text-dark);">No pre-requisite clearance required. Giver trust level LL1.</div>`;
            }
            reqInfo.innerHTML = html;
        }
    }
}
// ----------------------------------------------------------------
// API INTEGRATION HELPERS & MAPPERS
// ----------------------------------------------------------------
const GIVER_TO_ID = {
    0: "prapor",
    1: "therapist",
    2: "skier",
    3: "peacekeeper",
    4: "mechanic",
    5: "ragman",
    6: "jaeger",
    7: "fence",
    8: "ref",
    9: "lightkeeper"
};
const ID_TO_GIVER = {
    "prapor": 0,
    "therapist": 1,
    "skier": 2,
    "peacekeeper": 3,
    "mechanic": 4,
    "ragman": 5,
    "jaeger": 6,
    "fence": 7,
    "ref": 8,
    "lightkeeper": 9
};
const GIVER_TO_NAME = {
    0: "Prapor",
    1: "Therapist",
    2: "Skier",
    3: "Peacekeeper",
    4: "Mechanic",
    5: "Ragman",
    6: "Jaeger",
    7: "Fence",
    8: "Ref",
    9: "Lightkeeper"
};
const ITEM_NAMES = {
    "54491c4f4bdc2db1078b4568": "MP-133 12g shotgun",
    "5937ee6486f77408994ba448": "Machinery key",
    "5780d0532459777a5108b9a2": "Tarcone Director's office key",
    "590a3b4e86f7742f7c46ab72": "Gas analyzer",
    "590a3efd86f77437d351a251": "Salewa first aid kit",
    "5af0534a86f77434190c1767": "Lebel rifle",
    "57347ca924597744596b4e62": "Graphics card",
    "5c0677f486f77426123e4450": "Physical Bitcoin",
    "590a3e3c86f7742d4f3b6d08": "CMS surgical kit"
};
const MAP_NAMES = {
    0: "Factory",
    1: "Customs",
    2: "Woods",
    3: "Shoreline",
    4: "Lighthouse",
    5: "Reserve",
    6: "Interchange",
    7: "The Lab",
    8: "Streets of Tarkov",
    9: "Ground Zero"
};
function formatObjective(obj) {
    let targetName = "Target";
    if (typeof obj.target === "string" && obj.target.startsWith("[") && obj.target.endsWith("]")) {
        try {
            const targets = JSON.parse(obj.target);
            if (Array.isArray(targets)) {
                const names = targets.map((t) => ITEM_NAMES[t] || t);
                targetName = names.join(" or ");
            }
            else {
                targetName = ITEM_NAMES[obj.target] || obj.target || "Target";
            }
        }
        catch (e) {
            targetName = obj.target;
        }
    }
    else {
        targetName = ITEM_NAMES[obj.target] || obj.target || "Target";
    }
    const numStr = obj.number > 1 ? `${obj.number}x ` : "";
    const typeStr = obj.type ? obj.type.toUpperCase() : "ACTION";
    let locStr = "";
    if (obj.location !== undefined && obj.location !== -1) {
        locStr = ` on ${MAP_NAMES[obj.location] || "Map"}`;
    }
    if (obj.type === "kill") {
        return `Eliminate ${obj.number} ${targetName}${locStr}`;
    }
    else if (obj.type === "collect") {
        return `Hand over ${numStr}${targetName} to trader`;
    }
    else if (obj.type === "pickup") {
        return `Find ${numStr}${targetName} in raid${locStr}`;
    }
    else if (obj.type === "key") {
        return `Obtain key for ${targetName}`;
    }
    else if (obj.type === "locate") {
        return `Locate ${targetName}${locStr}`;
    }
    return `${typeStr}: ${numStr}${targetName}${locStr}`;
}
// Instantiate state manager when DOM is loaded
window.addEventListener("DOMContentLoaded", () => {
    new AppState();
});
//# sourceMappingURL=app.js.map