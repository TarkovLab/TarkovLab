# TarkovLab - Interactive Contractors Interface

TarkovLab is a high-fidelity, interactive web application designed for Escape from Tarkov players. It serves as a tactical computer terminal dashboard detailing the region's 10 primary contractors (traders), their specialties, locations, quest lines, loyalty levels, and barter economies.

The application is built with a premium, immersive military computer terminal aesthetic—featuring scanline overlays, CRT-style glow effects, active diagnostic status badges, and dynamic dual Tarkov clocks.

---

## 🚀 Features Implemented

1. **Complete Contractor Dossier Database**: Authentic, detailed profiles for all 10 Escape from Tarkov traders:
   - **Prapor** (Weapons & Ammo)
   - **Therapist** (Medical & Provisions)
   - **Skier** (Attachments & Gear)
   - **Peacekeeper** (NATO Equipment)
   - **Mechanic** (High-Tech & Gunsmithing)
   - **Ragman** (Gear & Clothing)
   - **Jaeger** (Hunting & Survival)
   - **Fence** (Scav Network & Black Market)
   - **Ref** (Arena Supplies & Custom presets)
   - **Lightkeeper** (High-Tech Secrets & Operations)
2. **Tactical Filter & Search Control Center**: Instantly filter contractors by their specialty tags (Weapons, Medical, Gear, Survival, Black Market) or search via their names, real names, or specialties.
3. **Immersive Dossier Inspect Panel**: Clicking a contractor displays their full tactical intelligence profile:
   - **01 // Profile & Trust**: Live reputation trackers, transaction volumes, and interactive loyalty level (LL1 to LL4) unlocking requirement checklists.
   - **02 // Operation Tasks**: A list of representative in-game quests, complete with tactical objective bullet points and capsule reward tags.
   - **03 // Barter Schemes**: A blueprint grid of simulated barter exchanges they offer.
4. **Dual Tarkov-Time Clocks**: Displays the two active in-game timezones (Day and Night operations) running at their authentic $7\times$ real-world speed, updating dynamically.
5. **Robust CDN Portrayal**: Fetches high-quality trader portraits dynamically from the TarkovLab CDN (`https://assets.tarkovlab.org/traders/name.webp`), including automatic spelling fallbacks (e.g., `jaeger` vs. `jeager`) to guarantee image loading.
6. **AI Context Rules**: Included a workspace rule configuration file (`.agents/AGENTS.md`) so that any AI assistants working on this repo will instantly understand the architecture and style parameters.

---

## 🛠️ Technology Stack

- **Frontend**: HTML5, Vanilla CSS3 (tactical styling, micro-animations, and full responsive design), TypeScript.
- **Backend Server**: Native Node.js static file server (`server.js`) serving the `public/` folder on port `3000`.
- **Compilation**: TypeScript compiles strictly to browser-compatible ES2022 modules in `public/js/app.js`, loaded natively by the browser without heavy bundlers.

---

## 📦 How to Build & Run

### 1. Run the Application Server
Run the local Node.js server to serve the static assets:
```bash
npm start
```
The server will boot and be accessible at:
👉 **[http://localhost:3000](http://localhost:3000)**

### 2. Compile TypeScript
To compile the TypeScript source file (`src/app.ts`) into the public script (`public/js/app.js`):
```bash
npm run build
```

To watch and auto-compile on changes during development:
```bash
npm run watch
```

---

## ⚠️ Important: WSL2 Compilation Workaround
Since this project is hosted on a Windows shared drive mount (`/mnt/c/Users/...`) in WSL, running standard `npm install` can occasionally corrupt the local `node_modules/typescript` installation due to Windows-to-Linux filesystem lock translations. 

If you encounter `SyntaxError` or compilation errors when running `npm run build`, use this clean workaround:
1. Create a clean, uncorrupted compiler directory in your native Linux home folder (ext4 filesystem, which is free of translation issues):
   ```bash
   mkdir -p ~/ts-compiler && cd ~/ts-compiler && npm install typescript@5.5.2
   ```
2. Run the compiler from your home directory, targeting this workspace:
   ```bash
   ~/ts-compiler/node_modules/.bin/tsc --project /mnt/c/Users/Niv/tarkovlab/tsconfig.json
   ```
This compiles the code successfully into `public/js/app.js` without relying on the corrupted local WSL mount.

---

## 📡 Future API Integration
The application is currently configured in **Offline Cache Mode** since the live API at `https://api.tarkovlab.org` is offline. The frontend has been designed to transition to dynamic API data fetching in `src/app.ts` as soon as the endpoints are available online.
