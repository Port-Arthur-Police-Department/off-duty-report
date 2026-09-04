# Off-Duty Employment Report (PAPD)

A mobile-friendly **Progressive Web App** that lets police officers log off-duty
(secondary) employment, capture signatures, print/export the report, and submit it
electronically to a Google Sheet — with an **admin portal** for review, export, and
audit.

Built for the Port Arthur Police Department, but designed to be **copied and
customized for any agency** — see [CUSTOMIZE.md](CUSTOMIZE.md).

---

## Features

### 📝 Officer Form (`index.html`)
- **Multi-page work sheets** — each page holds 20 rows for date, employer, vehicle,
  type of work, and time worked; pages can be added or removed as needed.
- **Automatic hours** — hours are computed for you from start/end times; a running
  total updates across all pages.
- **Signature capture** — a touch/mouse signature pad per page (officer signature).
  Signatures are compressed on submit so they store efficiently in Google Sheets.
- **Auto-save** — every keystroke is saved to the browser's local storage, so closing
  or refreshing never loses work. Save / Load buttons also create/restore `.json`
  backups.
- **Print & PDF** — a clean, single-page print layout (with department badge/patch
  logos) for printing or "Save as PDF" from the print dialog.
- **Submit Report** — validates and sends the report to your Google Sheet backend.
  After a successful submit the form locks read-only to prevent edits, then resets
  blank so the next officer can start fresh.
- **⚙️ Admin link** — one-tap navigation to the admin portal from the toolbar.

### 🔐 Admin Portal (`admin.html`)
- **Secure login** — name + PIN verified server-side against the `ADMINS` list in
  `Code.gs` (each admin gets their own PIN).
- **Summary table** — all submissions with officer, rank, division, month/year,
  entry count, **total hours**, and submission status; filterable by officer,
  Month, and Year.
- **Report detail** — full view of any report with every entry, per-page totals,
  the officer signature, and the running total.
- **Export / Print** — re-creates the report as a print-ready PDF with the same
  badge/patch headers as the officer form. Works on desktop and iOS.
- **Delete** — remove a report (with confirmation) — every deletion is logged.
- **Audit log** — records every login, failed login, report view, and delete, with
  timestamps, so you can see who did what.

### 🤖 Google Sheets Backend (`Code.gs`)
- Receives submissions via `doPost`, flattens them into rows, and batch-writes them
  to a `Submissions` sheet with a unique `ReportID` per submission.
- Serves data to the admin portal via `doGet` (summaries, or full detail by ID).
- Writes audit events to a separate `AuditLog` sheet.
- Includes CORS handling (`doOptions`) and a shared `SECRET_KEY` guard.

---

## PWA Function

This app is installable on phones and desktops like a native app:

- **Install to home screen** — via the browser's "Add to Home Screen" / "Install"
  option (Android Chrome, iOS Safari, Windows Edge, etc.).
- **Standalone window** — `display: "standalone"` in `site.webmanifest` launches it
  in its own window without browser chrome.
- **Custom icon & branding** — a favicon icon set plus an install icon, custom app
  name/short name, and brand-colored status bar (`theme_color: #1e3a5f`).
- **Designed for touch** — responsive layout that turns each work row into a
  card-style form on narrow screens.

> **Offline note:** the app has no service worker, so installing isn't a full offline
> install. It still needs a connection to **submit** and to view the **admin portal** —
> but an in-progress form is auto-saved locally, so a lost connection never loses the
> officer's work.

---

## File Structure

```
off-duty-report/
  index.html          ← Officer form (PWA entry point)
  admin.html          ← Admin portal
  Code.gs             ← Google Apps Script backend (paste into Apps Script editor)
  site.webmanifest    ← PWA install metadata (name, icons, theme)
  icon.png            ← App icon source image
  badge.png           ← Department badge logo (report header)
  patch.png           ← Department patch logo (report header)
  favicon-*.png / apple-touch-icon.png / android-chrome-*.png   ← PWA icons
  DEPLOY.md           ← Step-by-step backend + GitHub Pages setup
  CUSTOMIZE.md        ← How to adapt this template for your own agency
```

---

## Getting Started

- **Just want to use it?** Follow **[DEPLOY.md](DEPLOY.md)** — set up the Google
  Sheet + Apps Script, drop in your URLs, push, and you're live on GitHub Pages.
- **Want it for your agency?** Start with **[CUSTOMIZE.md](CUSTOMIZE.md)** to rebrand
  and reconfigure, then use DEPLOY.md to put it online.

---

## Security Notes

- The `SECRET_KEY` in `Code.gs` blocks unauthorized writes to your sheet; it must be
  matched in both `index.html` (`SUBMISSION_SECRET`) and `admin.html` (`ADMIN_SECRET`).
- Admin logins are verified **server-side** against the `ADMINS` map in `Code.gs`;
  PINs are a basic deterrent — for stronger protection, host the admin page behind a
  separate authentication layer.
- Every login, failed login, view, and delete is logged to the `AuditLog` sheet.
- Signature data is stored as compressed JPEG base64 (~3–8 KB each), well within
  Google Sheets' cell limits.