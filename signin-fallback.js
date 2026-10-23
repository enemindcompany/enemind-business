
// Independent Google sign-in fallback. This runs even if the main app module
// fails while importing the optional Supabase client or another dependency.
(function () {
  var button = document.getElementById('googleSignIn');
  var status = document.getElementById('authMessage');
  if (!button || !status) return;
  var fallbackBusy = false;
  function say(text, color) { status.textContent = text; status.style.color = color || '#ffcf8a'; }
  button.addEventListener('click', async function (event) {
    if (button.dataset.authHandlerReady === 'true' || fallbackBusy) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    fallbackBusy = true;
    button.disabled = true;
    var label = button.querySelector('span');
    var original = label ? label.textContent : 'Continue with Google';
    if (label) label.textContent = 'Connecting to Google…';
    say('Starting secure Google sign-in…');
    try {
      var parts = await Promise.all([
        import('./config.js'),
        import('firebase/app'),
        import('firebase/auth')
      ]);
      var config = parts[0].firebaseConfig;
      var appSdk = parts[1];
      var authSdk = parts[2];
      if (!config || !config.apiKey || !config.authDomain || !config.projectId || !config.appId) {
        throw new Error('Firebase web configuration is incomplete in config.js.');
      }
      var app = appSdk.getApps().find(function (item) { return item.name === '[DEFAULT]'; }) || appSdk.initializeApp(config);
      var auth = authSdk.getAuth(app);
      var provider = new authSdk.GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      await authSdk.signInWithPopup(auth, provider);
      say('Google sign-in successful. Loading your Enemind account…', '#a7f3d0');
      window.location.reload();
    } catch (error) {
      console.error('Independent Google sign-in fallback failed:', error);
      var code = error && error.code ? error.code : '';
      if (code === 'auth/unauthorized-domain') {
        say('This website domain is not authorized. In Firebase Console, open Authentication → Settings → Authorized domains and add this exact website domain.', '#ffb4a8');
      } else if (code === 'auth/operation-not-allowed') {
        say('Google sign-in is disabled. In Firebase Console, open Authentication → Sign-in method and enable Google.', '#ffb4a8');
      } else if (code === 'auth/popup-blocked' || code === 'auth/cancelled-popup-request') {
        try {
          var cfg = await import('./config.js');
          var appMod = await import('firebase/app');
          var authMod = await import('firebase/auth');
          var app2 = appMod.getApps().find(function (item) { return item.name === '[DEFAULT]' }) || appMod.initializeApp(cfg.firebaseConfig);
          var auth2 = authMod.getAuth(app2);
          var provider2 = new authMod.GoogleAuthProvider();
          provider2.setCustomParameters({ prompt: 'select_account' });
          await authMod.signInWithRedirect(auth2, provider2);
          return;
        } catch (redirectError) { console.error('Google redirect fallback failed:', redirectError); }
        say('The sign-in popup was blocked. Allow popups for this site and try again.', '#ffb4a8');
      } else if (code === 'auth/network-request-failed' || /fetch|network|load failed|import/i.test(String(error && error.message))) {
        say('Enemind could not load the sign-in service. Check that the site is hosted on HTTPS and that your network can access www.gstatic.com, then refresh. Details: ' + (error.message || code || 'network/import error'), '#ffb4a8');
      } else {
        say('Google sign-in could not start' + (code ? ' (' + code + ')' : '') + '. Check Firebase Google provider and authorized domains. ' + (error && error.message ? error.message : ''), '#ffb4a8');
      }
    } finally {
      fallbackBusy = false;
      button.disabled = false;
      if (label && label.textContent === 'Connecting to Google…') label.textContent = original;
    }
  }, true);
  window.setTimeout(function () {
    if (button.dataset.authHandlerReady !== 'true') {
      say('The main app did not finish loading. You can still try Google sign-in; if it fails, this screen will show the specific error.', '#ffcf8a');
    }
  }, 5000);
})();
