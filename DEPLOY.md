# Deployment Guide — PAPD Off-Duty Report Submission System

## Overview

This guide walks you through setting up the Google Sheets backend, deploying the Apps Script, and configuring both `index.html` and `admin.html`.

---

## Step 1: Create the Google Sheet

1. Go to [Google Sheets](https://sheets.google.com) and create a **new blank spreadsheet**
2. Name it: **PAPD Off-Duty Report Submissions**
3. In **row 1**, add these column headers (A through T):

```
Timestamp | Officer | Rank | Division | Month | Year | ReportID | Page | DateWorked | Day | Employer | Vehicle | Type | Start | End | Hours | OfficerSignature | CommanderSignature | HasOfficerSig | HasCommanderSig
```

4. Leave row 2+ empty — the script will populate it automatically
5. Note the **Spreadsheet ID** from the URL:
   ```
   https://docs.google.com/spreadsheets/d/SPREADSHEET_ID_HERE/edit
   ```

---

## Step 2: Set Up Google Apps Script

1. In your new Google Sheet, go to **Extensions > Apps Script**
2. You'll see a default `myFunction()` — **delete it**
3. Copy the **entire contents** of the `Code.gs` file from this repo and paste it into the editor
4. Find this line near the top:
   ```javascript
   const SECRET_KEY = 'CHANGE_ME_TO_A_RANDOM_STRING';
   ```
5. Replace `CHANGE_ME_TO_A_RANDOM_STRING` with a strong random string, for example:
   ```
   const SECRET_KEY = 'a3f8b2c1d4e5f6a7b8c9d0e1f2a3b4c5';
   ```
   > You can generate one at [random.org](https://www.random.org/) or use any password generator

6. **Save** the project (Ctrl+S) and name it: **Off-Duty Report Backend**

---

## Step 3: Deploy the Web App

1. In the Apps Script editor, click **Deploy > New deployment**
2. Click the gear icon and select **Web app**
3. Fill in:
   - **Description:** `Off-Duty Report API v1`
   - **Execute as:** `Me`
   - **Who has access:** `Anyone`
4. Click **Deploy**
5. **Authorize** the app when prompted (it needs permission to write to your spreadsheet)
6. Copy the **Web App URL** — it looks like:
   ```
   https://script.google.com/macros/s/AKfyc...xxxxxxxx/exec
   ```

> **Important:** This URL is your API endpoint. Keep it handy.

---

## Step 4: Update index.html

1. Open `index.html` in a text editor
2. Find these two lines near the top of the `<script>` section:
   ```javascript
   const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec';
   const SUBMISSION_SECRET = 'YOUR_SECRET_KEY_HERE';
   ```
3. Replace them with your actual values:
   ```javascript
   const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfyc...your_actual_url/exec';
   const SUBMISSION_SECRET = 'a3f8b2c1d4e5f6a7b8c9d0e1f2a3b4c5';
   ```
   > The `SUBMISSION_SECRET` must match exactly what you set in `Code.gs`

4. Save the file

---

## Step 5: Update admin.html

1. Open `admin.html` in a text editor
2. Find this line near the top of the `<script>` section:
   ```javascript
   const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec';
   ```
3. Replace it with the same Web App URL:
   ```javascript
   const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfyc...your_actual_url/exec';
   ```
5. Save the file

> **Note on admin credentials:** Since v2, admin logins are verified **server-side** in Code.gs against the `ADMINS` map. The admin page no longer hardcodes a PIN. To add/change admins, edit `ADMINS` in Code.gs:
> ```javascript
> const ADMINS = {
>   'Admin': '0911',
>   // 'OtherAdmin': '1234'
> };
> ```
> Make sure `ADMIN_SECRET` in `admin.html` matches `SECRET_KEY` in `Code.gs`.

---

## Step 6: Commit and Push to GitHub

```bash
git add index.html admin.html Code.gs
git commit -m "Add Google Sheets submission and admin portal"
git push origin main
```

GitHub Pages will auto-deploy. Your URLs will be:

- **Officer Form:** `https://YOUR_USERNAME.github.io/off-duty-report/index.html`
- **Admin Portal:** `https://YOUR_USERNAME.github.io/off-duty-report/admin.html`

---

## Step 7: Test End-to-End

1. Open the **officer form** (`index.html`) in a browser
2. Fill in all header fields (Officer, Rank, Division, Month/Year)
3. Add at least one work entry with a date
4. (Optional) Draw signatures on the signature pads
5. Click **📤 Submit Report**
6. Confirm the submission dialog
7. You should see: "Report submitted successfully! X entries saved."
8. The form should become **read-only** with a green banner
9. Open the **admin portal** (`admin.html`)
10. Enter PIN `1234`
11. Click **Refresh Data**
12. Your submitted report should appear in the table
13. Click **View** to see the full detail with all entries and signatures

---

## Updating the Apps Script After Changes

If you modify `Code.gs` in the future:

1. Open the Apps Script editor (Extensions > Apps Script)
2. Make your changes and save
3. Go to **Deploy > Manage deployments**
4. Click the **pencil icon** (edit) next to your current deployment
5. Change the **Version** dropdown to **New version**
6. Click **Deploy**
7. The URL stays the same — no need to update the HTML files

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| "Unauthorized" error on submit | `SUBMISSION_SECRET` in `index.html` doesn't match `SECRET_KEY` in `Code.gs` |
| Blank admin page / no data | Check the Apps Script URL is correct and deployment is set to "Anyone" access |
| "Failed to fetch" error | Apps Script URL might be wrong, or the deployment needs re-authorization |
| Signatures not showing in admin | Check that signatures were drawn before submit; empty sigs show "(Not signed)" |
| CORS error in browser console | Redeploy the Apps Script as a new version; ensure "Execute as Me" + "Anyone" |
| Form not becoming read-only | Clear localStorage and reload; check browser console for errors |

---

## Audit Log

The admin portal records an **audit trail** of activity to a separate `AuditLog` sheet (created automatically):

- **login** — successful admin login (name + PIN)
- **login_failed** — failed login attempts (good for spotting unauthorized access)
- **view** — when an admin opens a report's detail view
- **delete** — when an admin deletes a report

View it by clicking the **📃 Audit Log** button in the admin header. Because login is verified against the `ADMINS` map in Code.gs, each action is attributed to the specific admin who performed it.

## Security Notes

- The `SECRET_KEY` in `Code.gs` prevents random HTTP requests from writing to your sheet
- Admin logins are verified **server-side** against the `ADMINS` map in Code.gs, and every login/view/delete is logged to the `AuditLog` sheet
- The PINs stored in `ADMINS` are a **basic deterrent** — for stronger security, consider hosting the admin page behind proper authentication
- Google Apps Script has a quota of ~20,000 calls/day on free accounts — sufficient for a department of ~50 officers submitting monthly
- Signature data is stored as compressed JPEG base64 strings (~3-8KB each), well within Google Sheets' 50KB cell limit

---

## File Structure After Deployment

```
off-duty-report/
  index.html          ← Officer form (modified)
  admin.html          ← Admin portal (new)
  Code.gs             ← Reference copy (paste into Apps Script editor)
  DEPLOY.md           ← This file
  badge.png           ← PAPD badge image
  patch.png           ← PAPD patch image
  site.webmanifest    ← PWA manifest
  favicon-*.png       ← Favicon files
  apple-touch-icon.png
```
