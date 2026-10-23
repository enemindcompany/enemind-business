# Enemind — Free-tier-first Firebase → Supabase profile sync

This package keeps Firebase Google sign-in and uses a Supabase Edge Function to verify Firebase ID tokens before writing the signed-in user's profile.

## Security notes
- Firebase ID tokens are verified server-side against Google's public signing keys, issuer and audience.
- The Supabase service-role key is stored only as an Edge Function secret. Never put it in `config.js`, HTML, or browser JavaScript.
- The browser cannot directly read or write `firebase_user_profiles`; RLS is enabled and there are no client policies.
- PayPal email and Binance ID/UID are private profile fields and are not displayed in the dashboard. The profile endpoint returns a user's record only after verifying that user's Firebase ID token.
- WhatsApp group invite links may allow anyone with the shared link to join. Never enter payment passwords, recovery phrases, private keys, or API secrets.
- Supabase free-tier quotas and terms can change. Check your dashboard quotas; no platform can promise unlimited free usage.

## 1. Keep the working sign-in
Do not remove Firebase Google sign-in. Do not deploy the old Firebase blocking functions. The function folder in this package is for Supabase, not Firebase.

## 2. Apply the SQL migration
1. Open Supabase Dashboard → SQL Editor.
2. Run `supabase/migrations/202610210001_firebase_user_profiles.sql` if the profile table has not been created yet.
3. Run `supabase/migrations/202610220001_add_account_type.sql` to add the allowed account types.
4. Run `supabase/migrations/202610220002_add_profile_contact_fields.sql` to add optional contact and private payment identifiers.
5. Confirm `public.firebase_user_profiles` exists and RLS is enabled. These migrations do not change `public.profiles` or add client policies.

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
After applying all three SQL migrations, deploy the function from the project root:

```powershell
supabase functions deploy enemind-profile --no-verify-jwt
```

The `--no-verify-jwt` flag is intentional because the request contains a Firebase token, not a Supabase Auth token. The function verifies that Firebase token itself; do not remove its `jwtVerify` checks. The existing `index.html` sends the Firebase ID token and profile changes directly to this function. The server ignores client-supplied identity or privileged role fields. Never place the service-role key in browser code.

## 7. Test
1. Sign in to Enemind with Google.
2. Select each account type and confirm it is saved and restored after signing out and signing in again.
3. In the profile setup, test valid/invalid URLs and email, save values, clear saved values, use Back and Skip for Now, and reopen the form from the dashboard.
4. Confirm the page calls `POST https://YOUR_SUPABASE_PROJECT_REF.supabase.co/functions/v1/enemind-profile` with the Firebase ID token in the Authorization header.
5. In Supabase Table Editor, check `firebase_user_profiles` for the Firebase UID, account type, and optional profile fields.
6. If the function returns 401, confirm `FIREBASE_PROJECT_ID` matches the Firebase project that issued the token.
7. If it returns 500, check Supabase Edge Function logs and confirm the SQL migrations and secrets were applied.

## Notes about free tiers
Supabase Edge Functions are available on supported Supabase plans subject to current quotas and limits. This avoids Firebase blocking functions and a Firebase billing upgrade, but it does not guarantee zero cost if you exceed quotas or enable other paid resources. Review current usage before launch.
