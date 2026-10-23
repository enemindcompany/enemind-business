# Enermind separate Google Sheets + Drive setup

This Apps Script creates separate private Google spreadsheets for the marketplace, worker operations, learner academy, and administration. It also creates a private Google Drive folder tree. The script runs as the Google account that deploys it.

## 1. Create a private Apps Script project

1. Sign in to the Google account that will own Enermind's records.
2. Open `https://script.google.com` and create a **New project**. A standalone project is recommended because it creates and manages several spreadsheets.
3. Rename it `Enermind Storage Bridge`.
4. Replace the default code with the full contents of `Code.gs` and save.
5. Select `setupEnermindWorkbooks` in the function dropdown and click **Run**.
6. Review the requested Google Sheets and Drive permissions and approve them only if you trust this project.
7. Open **Execution log** to retrieve the returned spreadsheet and folder URLs. The function also saves their IDs in Script Properties so rerunning setup reuses them.

The setup creates these separate spreadsheets:

- `Enermind Marketplace` — Sellers, Buyers, Buyer_Social_Contacts, Buyer_Activity, Categories.
- `Enermind Worker Operations` — Work_Requests, Task_Applications, Deliverables.
- `Enermind Learner Academy` — Learning_Progress.
- `Enermind Admin Operations` — Audit_Log.

It also creates a private Drive folder tree named `Enermind Business Storage` with folders for Marketplace Records, Worker Projects, Learner Academy, Health Finance Sample Data, Project Deliverables, and Admin Reports and Audit.

Keep all spreadsheets and folders private to you and authorised administrators. Do not publish the master records to the web. Do not put passwords, access tokens, bank login credentials, patient identifiers, or other restricted data in these files.

## 2. Configure the shared secret

1. In Apps Script, open **Project Settings** → **Script Properties**.
2. Add `ENERMIND_API_SECRET` with a newly generated high-entropy random value.
3. Keep this value private and use the same value as the Supabase secret `ENERMIND_APPS_SCRIPT_SECRET`.

Generate a random secret locally in PowerShell:

```powershell
$bytes = New-Object byte[] 32
[System.Security.Cryptography.RandomNumberGenerator]::Fill($bytes)
[Convert]::ToBase64String($bytes)
```

Never put the secret in `index.html`, `config.js`, GitHub, or chat.

## 3. Deploy the Apps Script web app

1. Click **Deploy** → **New deployment** → **Web app**.
2. Execute as: **Me** (the owner).
3. Choose the least permissive access setting that permits the server-side Supabase Edge Function to call it. Some Google Workspace policies may block the needed setting; if so, stop and use a supported server-to-server integration rather than making the spreadsheets public.
4. Deploy and copy the `/exec` URL.
5. The browser must never call this endpoint with the shared secret. The Supabase Edge Function verifies Firebase ID tokens and forwards permitted operations.

## 4. Configure Supabase secrets

From the project root, set these secrets locally, replacing placeholders without sharing the values:

```powershell
supabase secrets set ENERMIND_APPS_SCRIPT_URL="YOUR_APPS_SCRIPT_WEB_APP_URL"
supabase secrets set ENERMIND_APPS_SCRIPT_SECRET="THE_SAME_RANDOM_SECRET"
supabase secrets set ENERMIND_ALLOWED_ORIGIN="http://localhost:5173"
```

For production, use the exact trusted app origin. Keep the existing `FIREBASE_PROJECT_ID`, `SUPABASE_URL`, and `SUPABASE_SERVICE_ROLE_KEY` server-side.

Deploy the Edge Function:

```powershell
supabase functions deploy enemind-workspace --no-verify-jwt
```

## 5. How the data is separated

- Buyer/seller listings and buyer-added public social profile references stay in the Marketplace spreadsheet.
- Work requests, applications and deliverable metadata stay in Worker Operations.
- Course progress stays in Learner Academy.
- Operational audit events stay in Admin Operations.
- The Apps Script routes each sheet operation to the appropriate spreadsheet by tab name.
- Creating a work request also creates a private Drive folder for the task. The folder ID is recorded in the private Worker Operations sheet. It is not returned in public task search results.
- Google Docs/Sheets deliverables are currently stored as file URLs and metadata. The setup does not automatically grant Drive access or upload arbitrary files. Share each task folder only with the buyer and accepted worker who need it, or implement and security-test a dedicated Drive permission workflow before launch.

## 6. Safe pilot tests

- Test with separate Buyer, Seller, Worker, and Learner accounts.
- Verify buyers can only see approved seller listings and their own activity/social references.
- Verify seller-only, worker, and learner profiles cannot add buyer social-contact entries.
- Verify workers cannot access buyer/seller marketplace registers through the app.
- Verify learners cannot access private project records except those intentionally exposed to them.
- Test a sample work request and confirm a private Drive task folder is created.
- Check the spreadsheets' sharing settings directly; app-level permissions do not protect against an administrator manually sharing a Sheet or Drive folder too widely.

## Operational limitations

This is a development foundation, not a production security certification. Use synthetic or properly de-identified health/finance datasets until a separate privacy, legal, and security review is completed. Do not store patient identifiers, bank credentials, payment card security codes, private keys, seed phrases, or third-party account credentials. Apps Script quotas and Google Workspace policies apply.
