# 🏭 Bhuvaneswari Oil Mill - Price Ledger

A fully **static, client-side** price management system for **Bhuvaneswari Oil Mill**. Deploy on **Netlify**, **Vercel**, or any static hosting — no server or database needed.

## ✨ Features

- **Admin Dashboard** — Secure login to manage products, prices, and visibility
- **Unlimited Products** — Add, edit, delete any number of products with price and unit
- **Visibility Toggle** — Toggle products on/off; hidden products won't appear in shared links or PDFs
- **Share via Link** — Generate a unique compressed shareable URL for customers (read-only)
- **PDF Export** — Download a professionally formatted PDF price list (client-side, via jsPDF)
- **Password Management** — Change admin password from settings
- **Data Backup** — Export/import product data as JSON
- **Zero Server** — 100% client-side; data stored in browser localStorage
- **Responsive** — Works on desktop, tablet, and mobile

## 🚀 Deploy

### Netlify
1. Push this folder to a GitHub/GitLab repo
2. Connect the repo on [app.netlify.com](https://app.netlify.com)
3. Set publish directory to `.` (root)
4. Click **Deploy**

### Vercel
1. Push this folder to a GitHub/GitLab repo
2. Import the repo on [vercel.com/new](https://vercel.com/new)
3. Framework preset: **Other**
4. Click **Deploy**

### Local Preview
Open `index.html` in a browser, or run a local server:
```bash
npx serve .
# or
python3 -m http.server 8080
```

## 📁 Project Structure

```
price-ledger/
├── index.html          # Main SPA
├── app.js              # Application logic
├── style.css           # Custom styles
├── netlify.toml        # Netlify deployment config
├── vercel.json         # Vercel deployment config
└── README.md           # This file
```

## 🔐 First-Time Setup

1. Open the app
2. Set an admin password on the setup screen
3. Log in and start adding products!

## 📋 How Sharing Works

- Product data is **compressed and encoded** into the URL
- Anyone with the link sees a **read-only** price list
- Only **visible** products appear in shared links and PDFs
- Each time you click "Share", a fresh link is generated with the latest prices

## ⚠️ Important Notes

- Data is stored in your **browser's localStorage**
- Use **Export Data** regularly to back up your product list
- Clearing browser data will reset the app — use Import to restore
- The admin password is only stored in your browser
