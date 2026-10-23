# Enemind sign-in update

- Removed the account-type selector and mandatory profile-onboarding screen from the active app.
- Google sign-in now opens the dashboard directly.
- All signed-in users see one Enemind account with the five main divisions: Health, Finance, Football, Beauty, and Digital Earning.
- Updated the Supabase profile Edge Function so it no longer reads or writes `account_type`.
- Added `supabase/migrations/202610230005_remove_account_types.sql` to remove the legacy `account_type` columns from `public.firebase_user_profiles` and `public.profiles`. The separate `role` field (`user`/`admin`) is preserved for authorization.
- Bumped the PWA shell cache to v6 so browsers can pick up the changed app shell.

## Existing Supabase project

Apply the new migration after the older migrations have run. Then redeploy the `enemind-profile` Edge Function. The migration is safe to rerun.

## Quick check

The active `index.html` JavaScript module passes `node --check`. Test Google sign-in in your Firebase-authorized local/production domain after deploying the updated Edge Function and migration.
