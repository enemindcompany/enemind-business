# Enemind — Free-tier-first Firebase → Supabase profile sync

This package removes the need for Firebase Authentication blocking functions and the `role=authenticated` custom claim. It keeps Firebase Google sign-in and uses a Supabase Edge Function to verify Firebase ID tokens before writing a minimal profile row.

## Security notes
- Firebase ID tokens are verified server-side against Google's public signing keys, issuer and audience.
- The Supabase service-role key is stored only as an Edge Function secret. Never put it in `config.js`, HTML, or browser JavaScript.
- The browser cannot directly read or write `firebase_user_profiles`; RLS is enabled and there are no client policies.
- This is a profile-sync endpoint, not yet a complete user-profile edit API or marketplace backend.
- Supabase free-tier quotas and terms can change. Check your dashboard quotas; no platform can promise unlimited free usage.

## 1. Keep the working sign-in
Do not remove Firebase Google sign-in. Do not deploy the old Firebase blocking functions. The function folder in this package is for Supabase, not Firebase.

## 2. Apply the SQL migration
1. Open Supabase Dashboard → SQL Editor.
2. Run the contents of `supabase/migrations/202610210001_firebase_user_profiles.sql`.
3. Confirm `public.firebase_user_profiles` exists and RLS is enabled.

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

## 6. Deploy the Edge Function
From the folder containing `supabase/config.toml`:

```powershell
supabase functions deploy enemind-profile --no-verify-jwt
```

The `--no-verify-jwt` flag is intentional because the request contains a Firebase token, not a Supabase Auth token. The function itself verifies that Firebase token. Do not remove its `jwtVerify` checks.

## 7. Connect the frontend
The file `profile-sync-client.js` contains the client helper. Integrate it into the existing sign-in success handler:

```js
const profile = await syncEnemindProfileWithSupabase(user, SUPABASE_URL, SUPABASE_ANON_KEY);
console.log("Enemind profile synced", profile.firebase_uid);
```

- `user` is the Firebase user object returned by your existing Google sign-in.
- `SUPABASE_URL` is the project URL, for example `https://YOUR_SUPABASE_PROJECT_REF.supabase.co`.
- `SUPABASE_ANON_KEY` is the public anon/publishable key from Supabase Project Settings → API keys. This key is intended for browser use; never use the service-role key in the browser.
- Import the helper if your frontend uses ES modules, or adapt the same fetch logic to your current script structure.
- Remove the old direct Supabase profile-sync code that expects the Firebase token to contain `role=authenticated`.

The package does not automatically modify your existing `index.html`, because your local working copy and exact sign-in handler should be preserved. Back up `index.html` before editing it.

## 8. Test
1. Sign in to Enemind with Google.
2. Confirm the page calls `POST https://YOUR_SUPABASE_PROJECT_REF.supabase.co/functions/v1/enemind-profile` with the Firebase ID token in the Authorization header.
3. In Supabase Table Editor, check `firebase_user_profiles` for the Firebase UID and email.
4. If the function returns 401, confirm `FIREBASE_PROJECT_ID` matches the Firebase project that issued the token.
5. If it returns 500, check Supabase Edge Function logs and confirm the SQL migration and secrets were applied.

## Notes about free tiers
Supabase Edge Functions are available on supported Supabase plans subject to current quotas and limits. This avoids Firebase blocking functions and a Firebase billing upgrade, but it does not guarantee zero cost if you exceed quotas or enable other paid resources. Review current usage before launch.
