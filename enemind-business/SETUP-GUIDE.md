# ENEMIND — Google Sign-In Starter (Step-by-step setup)

This ZIP is the first build stage only: Google sign-in using Firebase Authentication, with an optional secure profile sync to Supabase. It preserves the existing Enemind logo, app icons and social links. It does not yet implement the marketplace, KYC document collection, payments, seller listings or courses.

## What you need
- A Google account that owns or can administer the Enemind Firebase and Supabase projects.
- Node.js LTS and npm installed on your Windows computer.
- VS Code (recommended).
- Internet access.

## 1. Extract and open the project
1. Extract the ZIP to a normal development folder, for example `C:\Projects\enemind-signin-starter` (avoid editing the ZIP directly).
2. Open that extracted folder in VS Code.
3. In VS Code, select **Terminal → New Terminal**.
4. Run:

   ```powershell
   npm install
   npm run dev
   ```

5. Open the local URL printed by Vite, usually `http://localhost:5173`.
6. Do not open `index.html` by double-clicking it; authentication needs localhost or HTTPS.

## 2. Check the Firebase web app configuration
The `config.js` file currently contains the public web configuration already found in the supplied project. Check it against your Firebase project before testing:

1. Open Firebase Console: https://console.firebase.google.com/
2. Select project **enemind-business** (project ID `enemind-business`) if that is the intended project.
3. Open **Project settings → General → Your apps → Web app**.
4. Copy the web app configuration values into `config.js` (`apiKey`, `authDomain`, `projectId`, `appId`). These browser values are not service-account secrets.
5. Do not put service-account JSON, private keys, or Supabase `service_role` keys in `config.js` or any browser file.

If you intend to create a completely new Firebase project instead, create a Web app first and replace every Firebase project ID reference consistently, including `.firebaserc` and the Supabase third-party provider configuration described below.

## 3. Enable Google sign-in in Firebase
1. In Firebase Console, open **Authentication → Get started** (if prompted).
2. Open **Sign-in method** / **Sign-in providers**.
3. Enable **Google** and select the support email for the project.
4. Save.
5. Open **Authentication → Settings → Authorized domains**.
6. Confirm `localhost` is listed. Later, add the exact production domain (for example `app.example.com`) when you deploy. Do not add a domain you do not control.
7. Return to `http://localhost:5173` and click **Continue with Google**. Select the Google account you want to test.

## 4. Configure Supabase profile storage
The sign-in can work without Supabase, but profile sync needs the database setup.

1. Open https://supabase.com/dashboard and select the project configured in `config.js`.
2. Open **Project Settings → API** (labels can vary by dashboard version). Check that the project URL and browser-safe publishable/anon key match `supabaseConfig` in `config.js`.
3. Open **Authentication → Third-Party Auth** and add **Firebase** as a provider. Set the Firebase project ID to `enemind-business` (or the exact ID of the Firebase project you actually use) and save.
4. Open **SQL Editor → New query**.
5. Open `supabase-schema.sql` in VS Code, copy the entire file, paste it into the SQL Editor and run it.
6. Sign in to Enemind with Google once so your own profile row is created.
7. In Supabase SQL Editor, run the admin promotion statement only after checking the email is your own trusted administrator email. The supplied SQL currently targets `enemindcompany@gmail.com`; change that value to the exact owner/admin Google email you intend to use before running the schema. Do not promote a public or shared account.
8. Verify the profile in **Table Editor → profiles**. RLS must remain enabled.

### Important compatibility note about Supabase third-party auth
This starter expects Firebase ID tokens to include `role: authenticated`. The included Firebase blocking functions add that claim for sign-in sessions. Firebase blocking functions require upgrading Firebase Authentication to **Identity Platform** and may require enabling billing. This can affect your “free tier only” goal. Check the current Firebase pricing and project billing status before enabling it. Do not proceed with billing unless you understand and accept any potential charges.

If you want to stay strictly on free tiers, stop after testing Google sign-in and ask for the alternative integration path before enabling Identity Platform. We can change profile sync to a server-side endpoint that validates Firebase ID tokens, rather than exposing database privileges in the browser. Never work around this by disabling Supabase RLS or putting a service-role key in the frontend.

## 5. Deploy the included Firebase blocking functions (only if you accept the Identity Platform requirement)
The functions add the `authenticated` role claim expected by Supabase Third-Party Auth.

1. Install Node.js 20 LTS if needed; the included Functions package specifies Node 20.
2. Review Firebase Identity Platform requirements and billing first.
3. Install Firebase CLI in a terminal:

   ```powershell
   npm install -g firebase-tools
   firebase login
   ```

4. From the project root, check the target project:

   ```powershell
   firebase projects:list
   firebase use enemind-business
   ```

5. Install function dependencies and deploy:

   ```powershell
   cd functions
   npm install
   cd ..
   firebase deploy --only functions
   ```

6. Sign out of Enemind and sign in again. If you previously signed in, refresh the ID token by signing in again before testing profile sync.

If deployment asks you to enable APIs or billing, stop and review the Firebase console's current pricing and plan requirements before accepting.

## 6. Verify sign-in works
- Click **Continue with Google**.
- Google should ask you to select an account (if you are not already signed in).
- The page should show the signed-in account.
- If Supabase is configured correctly, the page will report successful profile sync.
- In Supabase Table Editor, confirm a row exists in `public.profiles` with your Firebase UID as `id` and your verified Google email.
- Confirm the `role` is not editable from the browser.

## 7. Troubleshooting
- `auth/unauthorized-domain`: add `localhost` or your exact hosted domain in Firebase Authentication → Settings → Authorized domains.
- `auth/operation-not-allowed`: enable Google under Firebase Authentication providers.
- Popup blocked: allow popups for localhost and try again.
- Supabase says token rejected: verify Supabase Third-Party Auth uses the same Firebase project ID as `config.js`.
- RLS blocks profile sync: run `supabase-schema.sql`, check Third-Party Auth, and ensure the Firebase token contains `role: authenticated`.
- Missing `role: authenticated`: the included blocking functions are not deployed, or Identity Platform is not configured. Review the cost note above.
- A blank or outdated page appears: stop Vite, restart `npm run dev`, and hard-refresh the browser.

## 8. Deployment
Deploy the built `dist` folder to a static host that supports HTTPS (for example Firebase Hosting or another static host). Before production, add the real domain to Firebase Authorized domains and test on that domain. Keep `.env` files and secrets out of Git. The current page registers a service worker, so after deploying updates you may need to hard-refresh or clear the site's cached data while testing.

## What this first stage does not do yet
- Account-type selection (Seller / Buyer / Both / Learner)
- KYC form, identity-document upload or approval workflow
- Public international seller/buyer directories
- Binance Pay ID, WhatsApp and Telegram profile management
- Listings, messaging, orders or payments
- YouTube course catalogue or learning progress

Those are the next stages after sign-in and the database connection have been tested successfully.

## 2026-10-23 services update
After applying the original four migrations, also run `supabase/migrations/202610230001_enemind_services.sql`. Deploy the updated `enemind-profile` function. This adds payment-reference submissions, service requests, Bwrite submissions, referral attribution, the trial record, and the service activation ledger. Payment verification remains manual: check the Binance transaction in the admin account before setting status to `paid`.

The public payment destination is configured in `config.js` as `adminBinancePayId = "1236166874"`. The actual Binance referral URL was not included in the supplied project; add the correct official URL to `binanceReferralUrl` before launch. The admin email used in the current SQL review policies is `enemindcompany@gmail.com`; confirm this is correct for your account.

## Buyer marketplace update (23 October 2026)
Apply these migrations in order in Supabase SQL Editor if they are not already applied:
1. `supabase/migrations/202610230001_enemind_services.sql`
2. `supabase/migrations/202610230002_fix_profile_sync.sql`
3. `supabase/migrations/202610230003_buyer_marketplace.sql`

The buyer dashboard now includes request tracking, matched-offer comparison, order requests/status tracking, multi-country request instructions, CSV requests ($10 per 20 records), and optional Google Sheets tracker requests. Offers are currently published by the Enemind admin for sellers who have opted in; the app does not yet sync Google Sheets automatically or expose a full seller self-service inventory dashboard. A buyer placing an order creates an order request; it does not itself charge money or confirm delivery. Admin must review/confirm orders and payment separately. Check that `enemindcompany@gmail.com` is the correct trusted admin email in the SQL policies before running them.
