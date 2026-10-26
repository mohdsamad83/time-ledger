# ⏱ Time Ledger

> **Manage your time like capital. Every hour is an intentional transaction.**

A high-performance executive time ledger and personal operating system built on the philosophy of **The Effective Executive** by Peter F. Drucker. Designed for deep-work professionals, founders, and students who demand intentionality, seamless habit pacing, and real-time accountability.

---

## ✨ Core Feature Highlights

### 1. 📅 Hourly Time Ledger & Executive Reflection
- **Granular 24-Hour Logging**: Log waking hours with custom categories, energy levels (`Energized`, `Neutral`, `Drained`), and planned vs. reactive classification.
- **Drucker Effectiveness Check**: Every logged block challenges you with critical executive questions:
  - *Was this planned or reactive?*
  - *Did this contribute to your #1 monthly priority?*
  - *Could this task have been delegated or eliminated?*
- **Morning Intentions & Evening Review**: Start the day by defining *"What needs to be done?"* and close the evening with Stop/Keep/Start reflections, a 1–10 daily rating, and contribution stories.

### 2. 🎯 Monthly Targets & Decision Engine
- **Active vs. Completed Workspaces**: Active targets remain front and center on your dashboard. When marked accomplished, targets gracefully move to a dedicated Accomplished archive with instant 1-click restore.
- **Executive Target Rank**: Progress from *Novice* to *Grandmaster* as you complete your monthly commitments.
- **Anti-Procrastination Target Decider**: Feeling overwhelmed about what to tackle next? Use the 3D Coin Flip / Dice Roll with Web Audio physics to break decision fatigue and pick your next priority.

### 3. ⏱️ Time Table & Routine Blueprint
- **Automatic Chronological Sorting**: Edit activities, start times, and end times in any order — the ledger automatically sorts your daily blueprint into strict 24-hour chronological flow whenever you save or finish editing.
- **1-Click Add from Active Targets**: Seamlessly bridge your monthly targets with your daily routine. Add target blocks with a single tap, with automatic duration and start-time proposals.
- **In-Row Target Autocomplete**: Full native `<datalist>` auto-suggestions and an in-row target picker icon (`🎯`).
- **Live "Active Routine Right Now" Card**: Real-time pulsating status card highlighting whichever block matches the current local time of day with remaining duration.
- **Continuity Analytics**: Displays planned hours, rest/buffer time, and total activity count at a glance.

### 4. 🔔 Topic Pacer & Routine Notification Engine
- **Audio Tone Synthesizer**: Built with Web Audio API (zero external audio files needed). Choose between *Zen Bell*, *Digital Chime*, *Soft Ping*, *Executive Announce*, or *Arcade Fanfare*.
- **Flexible Timing Modes**:
  - `Exact Top of the Hour (:00)`: Clean hourly ledger logging cadence.
  - `5 Minutes Warning (:55)`: Advance warning to conclude current tasks.
  - `📅 Routine Schedule Transitions`: Alerts at the exact start time of your scheduled routine activities.
  - `⚡ Dual Mode`: Top-of-the-hour check-ins + routine transition alerts.
  - `Custom Interval`: Alerts every 15, 30, 45, or 60 minutes.
- **Advance Notice (Lead Time)**: Configure notifications to trigger at exact start time (`0m`), `5m early`, or `10m early`.
- **System Desktop & In-App Alerts**: Native desktop notifications with routine activity names, time spans, and one-click actions (*"Pick Next Target"*, *"Log Previous Hour"*).

### 5. 📚 Academics & Deep Learning Tracker
- Track academic units, lecture completion percentages, and subject-specific hour targets.
- Interactive unit checklists and milestone badges.

### 6. 🔥 Challenges & Sprint Arcs
- Multi-day sprint arcs (e.g., *Winter Arc*, *90-Day Deep Focus*).
- Map commitments directly to targets with daily accountability logs and action blueprints.

### 7. 🎨 Bespoke Themes & Aesthetics
- **🏎️ Built Different (NEW)**: High-craft automotive editorial palette inspired by vintage Carrera aesthetics — Matte Obsidian Black (`#080c0a`), Porsche Mint Green (`#8ae3b5`), and Taillight Crimson Red (`#ea2839`) with ambient studio floor glow.
- **🌑 Dark Gold**: Classic executive obsidian with warm amber gold accents.
- **🌌 Midnight**: Deep naval blue with sapphire highlights.
- **☀️ Parchment**: Clean editorial warm light mode with ink typography.

### 8. ☁️ Google Sheets Two-Way Persistence & Offline-First
- Local data writes instantly to `localStorage` for zero-latency UX.
- Synchronizes automatically to 4 structured Google Sheets:
  - **📅 Time Log**: All hourly blocks with categories, satisfaction, and Drucker answers.
  - **🌅 Day Setup**: Wake/sleep hours, top priorities, and commitments.
  - **🌙 Evening Reviews**: Daily accomplishments, ratings, and energy evaluations.
  - **🎯 Targets & Challenges**: Persistent long-term goal storage.

---

## 🛠 Tech Stack

- **Framework**: [Next.js 14](https://nextjs.org/) (App Router, React 18, TypeScript)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) with native CSS variable theming
- **Icons**: [Lucide React](https://lucide.react.dev/)
- **Audio**: Web Audio API (zero audio file dependencies)
- **APIs**: Google Sheets API v4 (`googleapis`)
- **Date Handling**: [date-fns](https://date-fns.org/)
- **Deployment**: [Vercel](https://vercel.com/)

---

## 🚀 Quick Setup & Deployment

### 1. Clone & Install

```bash
git clone https://github.com/mohdsamad83/time-ledger.git
cd time-ledger
npm install
```

### 2. Configure Google Sheets API

1. Create a blank Google Sheet at [sheets.new](https://sheets.new) and copy the sheet ID from the URL:
   `https://docs.google.com/spreadsheets/d/<SPREADSHEET_ID>/edit`
2. In [Google Cloud Console](https://console.cloud.google.com), create a project and enable the **Google Sheets API**.
3. Create a **Service Account**, generate a JSON key, and note the `client_email` and `private_key`.
4. In your Google Sheet, click **Share** and grant **Editor** access to your service account email.

### 3. Environment Variables

Create `.env.local`:

```env
GOOGLE_SERVICE_ACCOUNT_EMAIL=your-service-account@project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_KEY_HERE\n-----END PRIVATE KEY-----\n"
GOOGLE_SHEET_ID=your_spreadsheet_id
NEXT_PUBLIC_SHEET_URL=https://docs.google.com/spreadsheets/d/your_spreadsheet_id/edit
```

> **Note**: Retain literal `\n` characters in the private key string when configuring in Vercel or `.env.local`.

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view your Time Ledger.

---

## 📁 Repository Structure

```
├── app/
│   ├── api/sheets/           # Next.js API routes for Google Sheets sync
│   │   ├── academics/
│   │   ├── challenges/
│   │   ├── evening/
│   │   ├── init/             # Initializes Google Sheet structure on first load
│   │   ├── log/
│   │   ├── routine/
│   │   ├── setup/
│   │   └── targets/
│   ├── globals.css           # Core design tokens, theme styles, animations
│   ├── layout.tsx            # Root layout with font imports and metadata
│   └── page.tsx              # Main dashboard controller & tab state
├── components/
│   ├── AcademicsView.tsx     # Academic syllabus & lecture tracker
│   ├── AICoachView.tsx       # AI effectiveness coach & review insights
│   ├── BlockModal.tsx        # Hourly block logging modal with Drucker questions
│   ├── ChallengesView.tsx    # Sprint arcs & multi-day challenges
│   ├── EveningReview.tsx     # Daily close modal
│   ├── HistoryView.tsx       # Historical timeline browser
│   ├── HourlyReminderAlert.tsx # Web Audio chime pacer & routine transition notifier
│   ├── InsightsView.tsx      # Analytics, category distribution, & metrics
│   ├── MorningSetup.tsx      # Daily morning setup wizard
│   ├── RoutineView.tsx       # Time table with auto-sort & target quick-add
│   ├── SettingsView.tsx      # Categories, notification cadence, timers, & themes
│   ├── TargetsDeciderModal.tsx # 3D coin-flip / dice target picker
│   ├── TargetsTracker.tsx    # Active & accomplished targets management
│   ├── ThemeToggle.tsx       # Quick-switch theme palette dropdown
│   └── TimelineView.tsx      # Visual day timeline with live activity highlight
└── lib/
    ├── hourly-audio.ts       # Web Audio API chime synthesizer
    ├── sheets-client.ts      # Google Sheets API helper
    ├── storage.ts            # LocalStorage & API sync helpers
    ├── theme.tsx             # Theme provider, context, and configurations
    └── types.ts              # TypeScript definitions & default settings
```

---

## 📖 The Drucker Effectiveness Philosophy

> *"Time is the scarcest resource, and unless it is managed, nothing else can be managed."*  
> — **Peter F. Drucker**, *The Effective Executive*

Time Ledger is built around Drucker’s core rules for high performance:
1. **Know Thy Time**: You cannot optimize what you do not accurately record in real-time.
2. **Focus on Contribution**: Every hour asks how your effort ties to your organization or long-term target.
3. **First Things First**: Force ranking of commitments to prevent minor urgencies from drowning out major priorities.
4. **Eliminate the Unproductive**: Daily evening reviews spotlight low-value tasks that should be pruned or delegated.

---

## 📄 License

MIT © [Mohd Samad](https://github.com/mohdsamad83)
