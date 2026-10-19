ENEMIND PWA — VS CODE STARTER

PROJECT LOCATION
C:\enemind\enemind-business

FILES
- index.html: landing page, social buttons, Google sign-in, PWA install button
- config.js: public Firebase and Supabase browser configuration placeholders
- manifest.webmanifest and sw.js: installable PWA setup
- icons/: generated PWA icons; keep your real logo at icons/logo.jpg
- supabase-schema.sql: profiles table and row-level security policies
- .gitignore: avoids committing common local secrets/build files

1. OPEN IN VS CODE
Extract the project and open the folder in VS Code. If you are merging into your existing project, copy these files into C:\enemind\enemind-business and keep your real icons\logo.jpg.

2. RUN LOCALLY
Install the Live Server extension. Right-click index.html and choose Open with Live Server. Do not open using file:// because ES modules and the service worker need localhost or HTTPS.

3. FIREBASE GOOGLE SIGN-IN
- In Firebase Console, create/open your project.
- Add a Web app and copy its web config into config.js.
- Authentication > Sign-in method: enable Google.
- Authentication > Settings / Authorized domains: add localhost for local development and your production domain when deployed.
- Never put a Firebase service-account private key in this folder.

4. SUPABASE
- Create a Supabase project.
- Copy the Project URL and anon/public key into supabaseConfig in config.js. The anon key is intended for browser use when RLS is configured; never use the service_role key in the browser.
- Configure Firebase Auth as a Third-Party Auth provider in Supabase's Auth/Third-Party Auth settings. The Firebase project/issuer and audience must match your Firebase project. Follow the current Supabase dashboard instructions for Firebase integration.
- Open Supabase SQL Editor and run supabase-schema.sql.
- Test using a non-admin account. If profile sync is denied, inspect browser console and confirm Supabase recognizes the Firebase JWT and auth.uid() maps to the Firebase UID. Do not disable RLS to fix errors.

This starter only syncs basic Google profile details (UID, display name, email, avatar URL). It does not yet create the complete buyer/seller marketplace or store contact/payment details.

5. GITHUB
- Create a new empty repository on GitHub, e.g. enemind-business. Do not add a README/license if you already have these local files.
- In VS Code, open Terminal > New Terminal and confirm you are in C:\enemind\enemind-business.
- Run:
    git init
    git add .
    git commit -m "Initial Enemind landing page and PWA"
    git branch -M main
    git remote add origin https://github.com/YOUR_GITHUB_USERNAME/enemind-business.git
    git push -u origin main
- Replace YOUR_GITHUB_USERNAME with your actual GitHub username and use the repository URL GitHub gives you. GitHub may prompt you to sign in.
- Do not commit passwords, service-role keys, Firebase service-account JSON, or other private secrets. config.js should contain only Firebase web config and Supabase anon/public key.

6. SOCIAL LINKS
X is set to https://x.com/enemind. WhatsApp, Facebook, Instagram, YouTube, TikTok, Telegram, and Binance are configured as previously requested. WeChat remains a placeholder until an official profile URL or QR link is supplied.

7. DEPLOYMENT
GitHub stores your code; it does not automatically host the site unless you configure a hosting service. GitHub Pages can host a static PWA, but Firebase authorized domains and your final HTTPS domain must be configured. The PWA install prompt appears only when browser/platform criteria are met.
