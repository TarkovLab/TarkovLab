<div align="center">

<h1>
  <img src="https://logo.tarkovlab.org/tl-logo" alt="TarkovLab" width="420" style="vertical-align:middle;" />
</h1>

<p>A clean, dark web app for browsing <strong>Escape From Tarkov</strong> quests and achievements, built on the <a href="https://tarkovlab.org">TarkovLab</a> ecosystem.</p>

<!-- Stars -->
<a href="https://github.com/Nivmizz7/tarkovlab/stargazers">
  <img src="https://img.shields.io/github/stars/Nivmizz7/tarkovlab?style=for-the-badge&logo=github&logoColor=white&color=FFD700&labelColor=1a1a2e" alt="Stars" />
</a>
<!-- Last Commit -->
<a href="https://github.com/Nivmizz7/tarkovlab/commits/master">
  <img src="https://img.shields.io/github/last-commit/Nivmizz7/tarkovlab?style=for-the-badge&logo=git&logoColor=white&color=4CAF50&labelColor=1a1a2e" alt="Last Commit" />
</a>
<!-- Contributors -->
<a href="https://github.com/Nivmizz7/tarkovlab/graphs/contributors">
  <img src="https://img.shields.io/github/contributors/Nivmizz7/tarkovlab?style=for-the-badge&logo=github&logoColor=white&color=6C63FF&labelColor=1a1a2e" alt="Contributors" />
</a>
<!-- Pull Requests (all) -->
<a href="https://github.com/Nivmizz7/tarkovlab/pulls?q=is%3Apr">
  <img src="https://img.shields.io/github/issues-pr/Nivmizz7/tarkovlab?style=for-the-badge&logo=git-pull-request&logoColor=white&color=00BCD4&labelColor=1a1a2e&label=pull%20requests" alt="Pull Requests" />
</a>
<!-- Issues (all) -->
<a href="https://github.com/Nivmizz7/tarkovlab/issues?q=is%3Aissue">
  <img src="https://img.shields.io/github/issues/Nivmizz7/tarkovlab?style=for-the-badge&logo=github&logoColor=white&color=FF5722&labelColor=1a1a2e" alt="Issues" />
</a>
<!-- License -->
<a href="LICENSE">
  <img src="https://img.shields.io/github/license/Nivmizz7/tarkovlab?style=for-the-badge&logo=open-source-initiative&logoColor=white&color=9C27B0&labelColor=1a1a2e" alt="License" />
</a>

</div>

---

## What is TarkovLab?

**TarkovLab** is a lightweight web application for [Escape From Tarkov](https://www.escapefromtarkov.com/) players. It provides a fast, dark, Tarkov-styled interface to browse the game's quests and achievements, pulling its data live from the TarkovLab GraphQL API.

The app is intentionally simple: plain HTML, CSS and vanilla JavaScript served by a tiny Node.js static server. No frameworks, no build step.

---

## Features

- **Quests** &mdash; Browse every task with its objectives, rewards, reputation changes, unlocks and prerequisites. Filter by trader or search by quest, trader or objective.
- **Achievements** &mdash; A sortable data table of all in-game achievements, with rarity and hidden status. Filter by rarity, toggle hidden-only, and search by name or description.
- **Live data** &mdash; Quests and achievements are fetched from the TarkovLab GraphQL API at `https://api.tarkovlab.org/graphql`.
- **Clean URLs** &mdash; Extensionless routes (`/`, `/achievements`) with automatic redirects from legacy `.html` paths.
- **Dark, Tarkov-style theme** &mdash; Oswald and Rajdhani typography, muted gold accents, rarity colour coding, fully responsive.

---

## Tech Stack

- **Frontend**: HTML5, vanilla CSS3 and vanilla JavaScript (no framework, no build step).
- **Server**: Native Node.js static file server (`server.js`) serving the `public/` folder.
- **Data**: TarkovLab GraphQL API (`api.tarkovlab.org`), backed by the [TarkovData](https://github.com/TarkovLab/TarkovData) dataset.

---

## Project Structure

```
public/
  index.html          Quests page
  achievements.html   Achievements page
  styles.css          Theme and layout
  js/
    quests.js         Quests page logic
    achievements.js   Achievements page logic
  assets/             Logo and icon
server.js             Static file server with clean-URL routing
```

---

## Authentication

TarkovLab uses **Supabase Auth** with email/password sign-in. Users are managed through your Supabase project dashboard (Authentication → Users).

### Supabase Setup

1. Create a project at [supabase.com](https://supabase.com)
2. In your project dashboard, go to **Authentication → Providers** and ensure **Email** is enabled
3. Go to **Project Settings → API** to find your credentials

---

## Database Setup

Authentication requires a Supabase project. The app itself has **no database** — it fetches game data from the TarkovLab GraphQL API. The only persisted data is user sessions (stored in-memory on the server).

### 1. Create a Supabase project

- Go to [supabase.com](https://supabase.com) and sign up/in
- Create a new project
- Once created, note your **Project URL** and **anon public key** from **Project Settings → API**

### 2. Configure environment variables

Copy `.env.example` to `.env` and fill in your Supabase credentials:

```bash
cp .env.example .env
```

Edit `.env`:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-public-key
```

| Variable | Where to find it |
|----------|------------------|
| `SUPABASE_URL` | Project Settings → API → Project URL |
| `SUPABASE_ANON_KEY` | Project Settings → API → anon public key |

### 3. Create a user

In the Supabase dashboard:

1. Go to **Authentication → Users**
2. Click **Add User** → create a user with email and password
3. The user can now sign in at `/auth/login`

### What you need to send me

To make the `.env` file work, I need from you:

1. **`SUPABASE_URL`** – Your project URL (e.g. `https://abcdefghijkl.supabase.co`)
2. **`SUPABASE_ANON_KEY`** – The anon public key from your project settings

These are the only two values required to enable authentication.

---

## Running Locally

```bash
npm install
npm start
```

The app is then available at:

**[http://localhost:3000](http://localhost:3000)**

The port can be overridden with the `PORT` environment variable:

```bash
PORT=8080 npm start
```

---

## Contributing

Contributions are welcome. To get started:

1. **Fork** this repository
2. **Create a branch** for your changes
3. **Open a Pull Request** against `master`

---

## License & Credits

- Maintained as part of the **[TarkovLab](https://tarkovlab.org)** ecosystem.
- Game data provided by **[TarkovData](https://github.com/TarkovLab/TarkovData)**.
- Released under the [MIT License](LICENSE).

<div align="center">
  <sub>Game content and materials are trademarks and copyrights of Battlestate Games and its licensors. All rights reserved.</sub>
</div>
