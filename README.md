# ⏱ Time Ledger

> **Manage your time like money. Every hour is a transaction.**

A full-stack time management application built on the principles of **The Effective Executive** by Peter F. Drucker. Log every hour of your day, answer Drucker's key effectiveness questions, and sync everything automatically to Google Sheets for deeper analysis.

---

## ✨ Features

- **Hourly Time Ledger** — Log every waking hour with category, energy, and a contribution question
- **Morning Setup Wizard** — Set wake/sleep times, top priority, and the "What needs to be done?" Drucker question
- **Evening Review** — Close each day with reflection, stop/keep/start, and your contribution story
- **Drucker Effectiveness Questions** per block: Was this planned? Did it contribute to your #1 priority? Could it have been delegated?
- **Live Google Sheets Sync** — Every entry auto-syncs to 4 structured sheets (Time Log, Day Setup, Evening Reviews, Weekly Insights)
- **Insights Dashboard** — 7-day category breakdown, satisfaction trend, Drucker principles checklist
- **History View** — Browse and re-edit any past day
- **Offline-first** — All data saved to localStorage; syncs to Sheets in the background

---

## 🚀 Deploy to Vercel in 5 Minutes

### 1. Clone and install

```bash
git clone <your-repo>
cd time-ledger
npm install
```

### 2. Create a Google Spreadsheet

1. Go to [sheets.new](https://sheets.new) and create a new blank spreadsheet
2. Copy the spreadsheet ID from the URL:
   `https://docs.google.com/spreadsheets/d/**THIS_PART**/edit`

### 3. Set up a Google Service Account

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project (or use an existing one)
3. Enable the **Google Sheets API**: APIs & Services → Library → "Google Sheets API" → Enable
4. Create a Service Account: APIs & Services → Credentials → Create Credentials → Service Account
5. Give it a name, click Done
6. Click the service account → Keys tab → Add Key → JSON → Download
7. Open the JSON file; you'll need `client_email` and `private_key`

### 4. Share your spreadsheet

In your Google Spreadsheet, click **Share** and add your service account email (looks like `something@project.iam.gserviceaccount.com`) with **Editor** access.

### 5. Set environment variables

Copy `.env.local.example` to `.env.local` and fill in:

```env
GOOGLE_SERVICE_ACCOUNT_EMAIL=your-sa@project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_KEY\n-----END PRIVATE KEY-----\n"
GOOGLE_SHEET_ID=your_spreadsheet_id
NEXT_PUBLIC_SHEET_URL=https://docs.google.com/spreadsheets/d/your_id/edit
```

> **Important:** The private key must have literal `\n` characters (not actual newlines) when stored as an env var. Copy the value exactly from the JSON file.

### 6. Deploy to Vercel

```bash
npx vercel
```

Or push to GitHub and import in [vercel.com/new](https://vercel.com/new). Add all 4 environment variables in Vercel's project settings.

### 7. Initialize your spreadsheet

On first load, the app automatically calls `/api/sheets/init` to create the 4 sheets with headers and formatting. You'll see them appear in your Google Sheet instantly.

---

## 📊 Google Sheet Structure

| Sheet | Contents |
|-------|----------|
| **📅 Time Log** | Every hour logged: category, energy, planned?, priority?, delegation check, satisfaction, contribution |
| **🌅 Day Setup** | Morning intentions: wake/sleep, top priority, 3 tasks, Drucker "What needs to be done?" |
| **🌙 Evening Reviews** | Daily close: accomplishments, waste, stop/keep, tomorrow's priority, day rating |
| **📊 Weekly Insights** | (Ready for your own SUMIF formulas) |

---

## 📖 Drucker Principles Baked In

Each hour you log answers:
1. **"What needs to be done?"** — Morning setup forces you to define this before the day starts
2. **"Where are the results?"** — Every block asks: did this contribute to your top priority?
3. **"Take responsibility for communication"** — Contribution field per block
4. **"Focus on opportunities, not problems"** — Planned vs Reactive tracking
5. **"Make meetings productive"** — Meetings tracked; app warns when meeting % is too high
6. **"Think and say 'we'"** — Delegation check per hour
7. **"Manage your time"** — The entire app is a daily time audit

---

## 🛠 Tech Stack

- **Next.js 14** (App Router) — deployed on Vercel
- **Tailwind CSS** — dark luxury "ledger" aesthetic
- **Google Sheets API** (via `googleapis`) — persistent cloud storage
- **localStorage** — offline-first, instant UX
- **Cormorant Garamond + JetBrains Mono** — typography

---

## 📁 Project Structure

```
app/
  page.tsx              — Main app (Today/History/Insights)
  api/sheets/
    init/route.ts       — Create sheet structure on first run
    setup/route.ts      — Sync morning setup
    log/route.ts        — Sync individual hour blocks
    evening/route.ts    — Sync evening review
components/
  MorningSetup.tsx      — 4-step morning wizard
  BlockModal.tsx        — Hour logging modal with Drucker questions
  TimelineView.tsx      — Hourly timeline for the day
  EveningReview.tsx     — Evening reflection modal
  InsightsView.tsx      — 7-day analytics dashboard
  HistoryView.tsx       — Past days browser
lib/
  types.ts              — TypeScript interfaces
  storage.ts            — localStorage helpers
  sheets-client.ts      — Google Sheets API client
```

---

*"Time is the scarcest resource, and unless it is managed, nothing else can be managed." — Peter F. Drucker*
