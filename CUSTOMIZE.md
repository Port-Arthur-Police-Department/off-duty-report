# Customizing This Template for Your Agency

This repository is a **template** for an Off-Duty (Secondary) Employment reporting
system built for the Port Arthur Police Department. You can copy it and tailor the
branding, options, and admin credentials for your own agency — no coding required
beyond a few find-and-replace edits.

> **Two guides work together:**
> - **This file (`CUSTOMIZE.md`)** — how to make the app *yours* (names, logos, colors, options).
> - **[`DEPLOY.md`](DEPLOY.md)** — how to set up the Google Sheet, Apps Script backend, and GitHub Pages hosting.

Suggested order: **copy the repo → customize (this file) → deploy (DEPLOY.md)**.

---

## 1. Copy the repository

Create your own copy so you don't touch the Port Arthur version:

1. On this repo's GitHub page, click **Use this template > Create a new repository**
   (or **Fork**), and give it a name — e.g. `off-duty-report` or `secondary-employment`.
2. Clone it to your computer.
3. Do all of the edits below, commit, and push.

> **Repo name matters.** Your app is served from
> `https://YOUR_ORG.github.io/YOUR_REPO_NAME/`, and the repo name appears in several
> file paths (see [Step 8](#8-pwa-icon-and-manifest-paths--repo-name)). If you rename
> the repository *after* deploying, remember to update those paths too.

---

## 2. Agency name, titles, and text

Search for **`PAPD`** across the files and replace with your agency's short name:

| Where | What changes |
|-------|--------------|
| `index.html` — `<title>` (line ~6) | Browser tab title of the officer form |
| `index.html` — `<h1>` inside the sheet builder (~line 847) | The report header printed on each sheet |
| `index.html` — `apple-mobile-web-app-title` (~line 21) | App name under the icon on iPhone |
| `admin.html` — `<title>` (line ~6) | Browser tab title of the admin page |
| `admin.html` — `<h1>` in the header (line ~465) | "… – Report Submissions" heading |
| `admin.html` — report `<h1>` + `<title>` in the export builder (~lines 889, 939) | Heading on printed PDFs |
| `site.webmanifest` — `name` / `short_name` | App name / shortcut shown at install |

Example: a Springfield PD would replace `PAPD` with `SPD` and the h1 text with
`SPD - Off-Duty Employment Report`.

---

## 3. Branding colors

The PAL color is navy `#1e3a5f`. If your agency uses different colors, update the
**CSS variables** at the top of the `<style>` block in both `index.html` and
`admin.html`:

```css
:root{
  --accent:#1e3a5f;      /* primary brand color (headers, buttons, links) */
  --accent-soft:#eef2f7; /* light tint used for table headers, badges */
  --ink:#1a1d21;         /* body text   */
  --muted:#6b7280;       /* secondary text */
  --line:#c9cdd3;        /* table borders */
}
```

Change `--accent` and `--accent-soft` to match your department colors.

A few colors are **hard-coded** and won't follow the variables, so also search for
and replace them if you want a full recolor:

- `#1e3a5f` in the **print/export styles** inside `admin.html` (the `buildPrintHtml`
  CSS string and the grand-total line) and the `pdf-capture` block in `index.html`.
- `site.webmanifest` → `theme_color` (and the matching `<meta name="theme-color">`
  in both HTML files).

---

## 4. Logos (badge and patch)

The report sheet shows two images at the top of every page — your department badge
and patch (or any two logos):

1. Replace **`badge.png`** and **`patch.png`** in the repo root with your own images
   (keep the same filenames, or rename and update the `src=` references).
   - `index.html` — sheet builder (`badge.png` / `patch.png` in the `sheet.innerHTML`)
   - `admin.html` — export builder (the `badge` / `patch` paths in `buildPrintHtml`)
2. Keep them roughly the same dimensions as the originals so the print layout stays balanced.

---

## 5. Work options in the form

The per-row dropdowns live in `makeRow()` inside `index.html`:

- **Type of Work** (`type-select`): currently `Traffic`, `Security`, `Other` — edit the
  `<option>` lines to match your accepted work categories.
- **Vehicle used** (`vehicle-select`): currently `Yes` / `No` — adjust if your policy
  differs.
- **Employer** is a free-text field (no dropdown), so nothing to configure there.
- **Day of week** and **Hours** are auto-computed by the app.

---

## 6. Google Sheet + Apps Script backend

This is the only section where you need to set up your *own* cloud resources.
Full step-by-step instructions are in **[DEPLOY.md](DEPLOY.md)**. The short version:

1. Create a new Google Sheet named e.g. **"Off-Duty Report Submissions"** and add the
   20-column header row (listed in `Code.gs` and `DEPLOY.md`).
2. In **Extensions > Apps Script**, paste the entire **`Code.gs`** file and save.
3. Edit the config at the top of `Code.gs`:
   ```javascript
   const SECRET_KEY = 'CHANGE_ME_TO_A_RANDOM_STRING';  // set a strong random string

   const ADMINS = {
     'Admin':    '0911',   // your admin portal logins ("Name": "PIN")
     // 'Cmdr.Smith': '2468',  // add more admins as pairs
   };
   ```
4. Deploy as a **Web app**: *Execute as* **Me**, *Who has access* **Anyone**.
5. Copy the Web App URL and paste it into **both**
   - `index.html` → `APPS_SCRIPT_URL`
   - `admin.html` → `APPS_SCRIPT_URL`
6. Set the same secret in both files:
   - `index.html` → `SUBMISSION_SECRET`
   - `admin.html` → `ADMIN_SECRET`  *(must match `SECRET_KEY` in `Code.gs`)*

> **Security reminder:** the only things a stranger needs to know are your script
> URL and admin PINs. Generate a strong, job-specific `SECRET_KEY` (e.g. with a
> password manager or [random.org](https://www.random.org/)) — never keep the
> `CHANGE_ME` placeholder in production. Change the default `ADMINS` PINs.

The sheet columns, login PINs, and secret key are all configured in `Code.gs`.

---

## 7. Admin access

The admin portal (`admin.html`) is protected by a **name + PIN** login defined in the
`ADMINS` map in `Code.gs`. Each successful login, failed login, report view, and
delete is written to an automatic **Audit Log** sheet so you can see who did what.

- To add/remove admins, edit `ADMINS` and redeploy (see DEPLOY.md → "Updating the
  Apps Script After Changes").
- `admin.html` is a normal GitHub Pages page with a secret URL. Anyone with the link
  can load it, but they can't read data or do anything without valid credentials.

---

## 8. PWA icon and manifest paths (repo name)

The app is a **Progressive Web App**. On phones it can be installed to the home
screen like a native app (standalone window, custom icon, brand-colored status bar).
The install metadata lives in **`site.webmanifest`**, which currently points at
`/off-duty-report/index.html` and `/off-duty-report/…png` paths.

Update these to your own repo name when you copy the repo:

| File | What to change |
|------|----------------|
| `site.webmanifest` | `start_url` → `/YOUR_REPO/index.html`; each `"src"` → `/YOUR_REPO/…`; also `name` / `short_name` / `theme_color` |
| `index.html` | `<link>` tags for the manifest and favicons → `/YOUR_REPO/…` |
| `admin.html` | Same `<link>` tags → `/YOUR_REPO/…` |

**To change the app icons** (the launcher/desktop icon), regenerate the icon set with
[favicon.io](https://favicon.io/) from your badge/crest and drop the new files into
the repo root. The files referenced today are:
`apple-touch-icon.png`, `favicon-16x16.png`, `favicon-32x32.png`,
`android-chrome-192x192.png`, `android-chrome-512x512.png`.

> The manifest's `display: "standalone"` gives the installed app its own window
> without browser chrome. There is **no service worker**, so the app still needs a
> connection for submit/print — but in-progress form data is auto-saved to
> localStorage, so a page reload never loses work.

---

## 9. Deploy to GitHub Pages

1. Push your customized repo to GitHub.
2. In **Settings > Pages**, set the source to `Deploy from a branch` → `main` → `/` (root).
3. After a minute your app is live at:
   - Officer form: `https://YOUR_ORG.github.io/YOUR_REPO/index.html`
   - Admin portal: `https://YOUR_ORG.github.io/YOUR_REPO/admin.html`

For the full backend walkthrough (sheet, Apps Script, testing), follow
**[DEPLOY.md](DEPLOY.md)**.

---

## Quick checklist

- [ ] Copied the repo under your own name (note the repo name for step 8)
- [ ] Replaced `PAPD` with your agency abbreviation (tab title, headers, printouts, web-app title)
- [ ] Set your brand colors (`--accent`, `--accent-soft`) in `index.html` and `admin.html`
- [ ] Replaced `badge.png` / `patch.png` with your department's logos
- [ ] Updated the **Type of Work** (and Vehicle, if needed) dropdown options
- [ ] Created your Google Sheet + deployed Apps Script with a new `SECRET_KEY` and real `ADMINS`
- [ ] Pasted your Web App URL into `APPS_SCRIPT_URL` in `index.html` and `admin.html`
- [ ] Matched the secret key in `SUBMISSION_SECRET` and `ADMIN_SECRET`
- [ ] Regenerated icons and updated `site.webmanifest` + `<link>` tags to your repo name
- [ ] Enabled GitHub Pages and tested both pages end-to-end