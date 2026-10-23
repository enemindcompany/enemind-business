# Enemind — Free-tier-first Firebase → Supabase profile sync

This package keeps Firebase Google sign-in and uses a Supabase Edge Function to verify Firebase ID tokens before writing the signed-in user's profile.

## Security notes
- Firebase ID tokens are verified server-side against Google's public signing keys, issuer and audience.
- The Supabase service-role key is stored only as an Edge Function secret. Never put it in `config.js`, HTML, or browser JavaScript.
- The browser cannot directly read or write `firebase_user_profiles`; RLS is enabled and there are no client policies.
- A user's own PayPal email and Binance ID/UID remain private profile fields. The Enemind admin Binance Pay destination is intentionally shown publicly on payment instructions. The profile endpoint returns a user's record only after verifying that user's Firebase ID token.
- WhatsApp group invite links may allow anyone with the shared link to join. Never enter payment passwords, recovery phrases, private keys, or API secrets.
- Supabase free-tier quotas and terms can change. Check your dashboard quotas; no platform can promise unlimited free usage.

## 1. Keep the working sign-in
Do not remove Firebase Google sign-in. Do not deploy the old Firebase blocking functions. The function folder in this package is for Supabase, not Firebase.

## 2. Apply the SQL migration
1. Open Supabase Dashboard → SQL Editor.
2. Run `supabase/migrations/202610210001_firebase_user_profiles.sql` if the profile table has not been created yet.
3. Run `supabase/migrations/202610220001_add_account_type.sql` only if following the historical migration chain; the final migration removes this legacy field.
4. Run `supabase/migrations/202610220002_add_profile_contact_fields.sql` to add optional contact and private payment identifiers.
5. Run `supabase/migrations/202610220003_add_whatsapp_phone.sql` to add the optional international WhatsApp phone number.
6. Run `supabase/migrations/202610230001_enemind_services.sql` if the service tables have not been created yet.
7. Run `supabase/migrations/202610230004_bwrite_topics.sql` to enable daily admin-published Bwrite topics and topic-linked submissions.
8. Run `supabase/migrations/202610230005_remove_account_types.sql` last. It removes legacy account_type columns from `firebase_user_profiles` and `profiles` while preserving the separate user/admin authorization role.
9. Confirm `public.firebase_user_profiles` exists and RLS is enabled. These migrations do not add client policies.

**Bwrite daily topics:** sign in as `enemindcompany@gmail.com`, open the admin area, and use “Admin: add today's Bwrite topics” to publish a topic with a writing brief. Users select one of the topics published that day, write in Google Docs, share the document with the configured admin email as Viewer or Commenter, and submit the document URL in Bwrite. The topic list resets by date; older topics are not shown in the daily user list.

## 3. Install Supabase CLI
Use a terminal in your Enemind project folder. If you already use Scoop on Windows:

```powershell
scoop install supabase
```

Alternatively follow the official CLI installation instructions: https://supabase.com/docs/guides/cli/getting-started

Then authenticate:

```powershell
supabase login
```

## 4. Link the existing Supabase project
From the folder that contains the `supabase` directory in this package:

```powershell
supabase link --project-ref YOUR_SUPABASE_PROJECT_REF
```

Find the project ref in Supabase Dashboard → Project Settings → General. Do not use your Firebase project ID here.

## 5. Set Edge Function secrets
Run these commands, replacing the values with your actual project details:

```powershell
supabase secrets set FIREBASE_PROJECT_ID=enemind-business
supabase secrets set SUPABASE_URL=https://YOUR_SUPABASE_PROJECT_REF.supabase.co
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=YOUR_SUPABASE_SERVICE_ROLE_KEY
```

Get the service-role key from Supabase Project Settings → API keys. It is a secret: only set it as a server-side secret. Never paste it into chat or a frontend file. If your project uses the newer `sb_secret_...` key format, use the server-side secret key accepted by your Supabase project and current CLI.

## 6. Deploy the profile function
After applying the profile, contact-field, service, Bwrite-topic, and final account-type-removal migrations, deploy the function from the project root:

```powershell
supabase functions deploy enemind-profile --no-verify-jwt
```

The `--no-verify-jwt` flag is intentional because the request contains a Firebase token, not a Supabase Auth token. The function verifies that Firebase token itself; do not remove its `jwtVerify` checks. The existing `index.html` sends the Firebase ID token and profile changes directly to this function. The server ignores client-supplied identity or privileged role fields. Never place the service-role key in browser code.

## 7. Test
1. Sign in to Enemind with Google.
2. Confirm sign-in opens the dashboard directly without account-type selection or required profile setup.
3. Confirm the dashboard shows Health, Finance, Football, Beauty, and Digital Earning under the same Enemind account.
4. Confirm the page calls `POST https://YOUR_SUPABASE_PROJECT_REF.supabase.co/functions/v1/enemind-profile` with the Firebase ID token in the Authorization header.
5. In Supabase Table Editor, check `firebase_user_profiles` for the Firebase UID, email, and display name; there should be no account_type field after the final migration.
6. If the function returns 401, confirm `FIREBASE_PROJECT_ID` matches the Firebase project that issued the token.
7. If it returns 500, check Supabase Edge Function logs and confirm the SQL migrations and secrets were applied.

## Notes about free tiers
Supabase Edge Functions are available on supported Supabase plans subject to current quotas and limits. This avoids Firebase blocking functions and a Firebase billing upgrade, but it does not guarantee zero cost if you exceed quotas or enable other paid resources. Review current usage before launch.

## Enemind services update (2026-10-23)

This version adds the service hub, payment reference submission, buyer CSV requests, Bwrite Google Docs submission, separate referral links, a trial record, service activation ledger, and a restricted admin review queue.

### Config values
- `adminBinancePayId` is the Enemind destination shown on payment instructions. It is set to `1236166874` from the existing project. It is public by design; it is not a password or API key.
- `binanceReferralUrl` is intentionally blank until the owner supplies the exact official Binance referral URL. Do not invent one.
- `bwriteAdminEmail` is currently set to `enemindcompany@gmail.com`; change it if the real admin account differs.
- The SQL migration admin policies also use `enemindcompany@gmail.com`. If the owner/admin login differs, update those policies before deployment.

### Apply the new database migration
1. Back up your Supabase database.
2. Open Supabase Dashboard → SQL Editor.
3. Run `supabase/migrations/202610230001_enemind_services.sql` after the existing profile migrations.
4. Deploy the updated `supabase/functions/enemind-profile` Edge Function so `bwrite` is accepted as an account profile type.
5. Test using a non-admin account and the real admin account. Check that users can see only their own payment/request/submission records and the admin queue is only visible to the configured admin email.

### Payment review model
The app does **not** connect to the Binance API and cannot automatically confirm a transfer. Users submit a Binance transaction/order reference; an administrator must independently verify it in Binance before marking the payment `paid`. Only the `paid` transition creates/renews a service activation. CSV purchases are reviewed separately. Do not mark a transaction paid from a screenshot alone.

### Current service rules in the interface
- First sign-in starts a two-day trial record. Activation-payment forms remain blocked until the recorded trial end; CSV purchases are separate.
- Buyer activation: $10 weekly.
- Worker activation: $10 monthly. Weekly withdrawal requests and earnings approval must be added before operating a paid worker program; this release does not promise earnings or automatically pay withdrawals.
- Learner activation: $10 one-time activation; duration has not been defined.
- Bwrite activation: $5 one-time activation. Writers submit a Google Docs URL for review; the admin email must be configured and the document shared with that address.
- Seller CSV: $10 per 20 records. Only data approved for sharing with consent may be delivered.
- Referral links exist for buyer, worker, learner and Bwrite. Attribution records are pending review; the $1 reward is not automatically approved or paid.

### Important launch checklist
- Supply the actual Binance referral URL if new users should register through it.
- Confirm the admin Google email and update both `config.js` and SQL policies if needed.
- Implement/verify the worker earnings ledger and weekly withdrawal approval process before accepting workers.
- Buyer marketplace workflow now includes country-aware buyer requests, request tracking, admin-published matched seller offers, offer comparison, buyer order requests/status tracking, CSV requests, and optional Google Sheets tracker requests. Admin still publishes seller offers for opted-in sellers; seller self-service inventory, live Google Sheets synchronization, automated payments, dispute/refund tooling, and public product checkout/downloads are not complete.
- Use HTTPS hosting. Do not commit `.env`, service-role keys, service-account JSON, private keys, passwords, or OTPs.


## Digital products storefront
See `FULL-SYSTEM-SETUP.md` and apply `supabase/migrations/202610230006_digital_products_store.sql` for the public digital-products catalogue, guest checkout, manual M-Pesa verification and admin delivery workflow. Do not deploy until you have reviewed the security and remaining production-work notes in that guide.


## Build and deploy

Run `npm ci`, `npm run build`, then `firebase deploy --only hosting`. Always rebuild before deploying because Firebase Hosting serves the generated `dist/` folder.


**Important deployment note:** The downloaded source archive intentionally does not ship a stale prebuilt `dist/` directory. Run `npm ci` and `npm run build` first; this creates a fresh `dist/` with locally bundled Firebase and Supabase modules. Only then run `firebase deploy --only hosting`.
