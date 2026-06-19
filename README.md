# 🏗️ TX Dev Tracker

Automated weekly tracker for residential development filings across Texas county clerk records.

**Covers 75+ counties in three regions:**
- Fort Worth / DFW (150-mile radius)
- Georgetown / Austin (150-mile radius)
- San Antonio (150-mile radius)

**Features:**
- Weekly auto-scrape via GitHub Actions every Sunday 6 AM
- AI-powered market intelligence on each filing (Claude API)
- Weekly email digest sent to your inbox
- Interactive dashboard on Netlify — filter, search, export CSV
- Falls back to sample data until live scraper runs

---

## 🚀 Setup (one time, ~15 minutes)

### Step 1 — GitHub

1. Go to **github.com** → click **+** → **New repository**
2. Name it `tx-dev-tracker`, set to **Public**, click **Create**
3. Click **"uploading an existing file"**
4. Drag ALL files from this folder onto the upload box (including the `.github` folder — you may need to drag it separately)
5. Click **Commit changes**

### Step 2 — Netlify

1. Go to **netlify.com** → **Add new project** → **Import from Git** → **GitHub**
2. Select your `tx-dev-tracker` repository
3. Build settings (Netlify should auto-detect these):
   - **Build command:** `npm run build`
   - **Publish directory:** `dist`
4. Click **Deploy**
5. Your dashboard will be live at a URL like `https://amazing-name-123.netlify.app`

### Step 3 — GitHub Secrets (for the scraper + email)

Go to your GitHub repo → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**

Add these 4 secrets:

| Secret Name | Value |
|---|---|
| `ANTHROPIC_API_KEY` | Your key from [console.anthropic.com](https://console.anthropic.com) |
| `EMAIL_TO` | Email address to receive weekly digest |
| `EMAIL_FROM` | A Gmail address to send from |
| `EMAIL_PASSWORD` | Gmail App Password (see below) |

**How to get a Gmail App Password:**
1. Go to myaccount.google.com → Security
2. Make sure 2-Step Verification is **ON**
3. Search for **"App passwords"**
4. Select app: **Mail** → Generate
5. Copy the 16-character code → paste as `EMAIL_PASSWORD`

### Step 4 — Test it manually

After adding secrets, go to your GitHub repo → **Actions** → **Weekly TX Dev Tracker Scrape** → **Run workflow**

This triggers the scraper immediately without waiting for Sunday. Check the Actions log to see it run. When it finishes, Netlify will auto-redeploy with live data.

---

## 📅 Schedule

The scraper runs automatically **every Sunday at 6 AM Central** via GitHub Actions cron. You don't need to do anything — just check your email Sunday morning.

You can also trigger it manually anytime from GitHub Actions → Run workflow.

---

## 📁 File Structure

```
tx-dev-tracker/
├── src/
│   ├── App.jsx          ← React dashboard
│   └── main.jsx         ← Entry point
├── public/
│   └── filings.json     ← Updated weekly by GitHub Actions
├── .github/
│   └── workflows/
│       └── weekly-scrape.yml  ← Automation schedule
├── tx_dev_scraper.py    ← Python scraper
├── send_weekly_email.py ← Email sender
├── package.json
├── vite.config.js
├── netlify.toml
└── index.html
```

---

## 🔧 Customization

**Change scrape schedule** — edit `weekly-scrape.yml`, change the cron line:
```yaml
- cron: "0 11 * * 0"   # Sunday 6 AM Central (11 AM UTC)
- cron: "0 11 * * 1"   # Monday instead
```

**Add a county** — edit `COUNTIES` list in `tx_dev_scraper.py`

**Change keywords** — edit `RESIDENTIAL_KEYWORDS` in `tx_dev_scraper.py`
