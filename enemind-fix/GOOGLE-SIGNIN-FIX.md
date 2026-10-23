# Google sign-in and full-screen landing page update

This update improves the Enemind sign-in screen and adds a redirect-based fallback for browsers that block sign-in popups.

## Firebase settings required

The front-end cannot enable Google sign-in on its own. In the Firebase project `enemind-business`:

1. Open **Firebase Console → Authentication → Sign-in method** and enable **Google**. Choose a support email and save.
2. Open **Authentication → Settings → Authorized domains** and add every hostname where Enemind will run, including `localhost` for local development and the production hostname (for example, `enemind-business.web.app` or your own domain).
3. In **Project settings → General → Your apps**, verify the web app configuration in `config.js` matches the same Firebase project.
4. Serve the app over HTTPS in production. For local testing, use `npm run dev` and `http://localhost:5173`.
5. After deploying, hard-refresh the page or close and reopen the installed PWA so the updated service worker is loaded.

## What changed

- The sign-in experience now fills the viewport and adapts to mobile screens.
- The public product marketplace remains available below the sign-in landing screen; visitors do not need to sign in to browse or buy.
- Google sign-in still tries a popup first and falls back to Firebase redirect sign-in if the popup is blocked.
- Redirect results are handled when the user returns to Enemind.
- The service-worker cache version was bumped so clients can pick up the updated app shell.

## If it still fails

Read the message beneath the Google button and check the browser console. `auth/unauthorized-domain` means the current hostname is missing from Firebase **Authorized domains**. `auth/operation-not-allowed` means Google is not enabled as a sign-in provider. Network, OAuth consent, or browser restrictions can also prevent sign-in.

Google authentication was syntax-checked in this source update, but it cannot be fully tested without deploying to the Firebase project and completing an actual Google OAuth sign-in in a browser.
