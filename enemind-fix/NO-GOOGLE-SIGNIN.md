# Enemind — Google sign-in removed

The landing screen no longer offers Google sign-in. Visitors can browse the public marketplace and start a guest order without creating an account.

## Important
- Existing admin/dashboard tools still rely on an already-authenticated Firebase session. Since the sign-in button is removed, use a previously authenticated admin browser session for admin tasks, or add a separate admin authentication method before production use.
- Deploy the rebuilt site to hosting; downloading the ZIP alone does not update the live website.
- After deployment, test in a fresh/incognito browser and verify public product browsing and guest checkout.
