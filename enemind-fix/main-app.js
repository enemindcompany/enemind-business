
    import { firebaseConfig, supabaseConfig, adminBinancePayId, binanceReferralUrl, bwriteAdminEmail } from './config.js';
    import { initializeApp } from 'firebase/app';
    import {
      getAuth,
      signOut,
      onAuthStateChanged
    } from 'firebase/auth';
    import { createClient } from '@supabase/supabase-js';

    const message = document.getElementById('authMessage');
    const installButton = document.getElementById('installApp');
    const page = document.querySelector('.page');
    const dashboard = document.getElementById('dashboard');
    const publicStore = document.getElementById('publicStore');
    // Put the sign-in experience first, with the public storefront directly below it.
    // Visitors can browse and buy without an account by scrolling past the landing screen.
    if (publicStore && dashboard) page.insertBefore(publicStore, dashboard);
    const landingElements = [...document.querySelectorAll('.brand-mark, .wordmark, .tagline, #browseProducts, #installApp, #authMessage, .divider, .socials, .note, .footer')];
    if (landingElements.length) {
      const authScreen = document.createElement('section');
      authScreen.className = 'auth-screen';
      authScreen.setAttribute('aria-label', 'Welcome to Enemind');
      page.insertBefore(authScreen, landingElements[0]);
      landingElements.forEach((element) => authScreen.appendChild(element));
    }
    let profileUser = null;
    let currentProfile = null;
    let currentTrial = null;

    const brandIconPaths = {
      whatsapp: '<path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>',
      facebook: '<path d="M9.101 23.691v-7.98H6.627v-3.667h2.474v-1.58c0-4.085 1.848-5.978 5.858-5.978.401 0 .955.042 1.468.103a8.68 8.68 0 0 1 1.141.195v3.325a8.623 8.623 0 0 0-.653-.036 26.805 26.805 0 0 0-.733-.009c-.707 0-1.259.096-1.675.309a1.686 1.686 0 0 0-.679.622c-.258.42-.374.995-.374 1.752v1.297h3.919l-.386 2.103-.287 1.564h-3.246v8.245C19.396 23.238 24 18.179 24 12.044c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.628 3.874 10.35 9.101 11.647Z"/>',
      wechat: '<path d="M8.691 2.188C3.891 2.188 0 5.476 0 9.53c0 2.212 1.17 4.203 3.002 5.55a.59.59 0 0 1 .213.665l-.39 1.48c-.019.07-.048.141-.048.213 0 .163.13.295.29.295a.326.326 0 0 0 .167-.054l1.903-1.114a.864.864 0 0 1 .717-.098 10.16 10.16 0 0 0 2.837.403c.276 0 .543-.027.811-.05-.857-2.578.157-4.972 1.932-6.446 1.703-1.415 3.882-1.98 5.853-1.838-.576-3.583-4.196-6.348-8.596-6.348zM5.785 5.991c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 0 1-1.162 1.178A1.17 1.17 0 0 1 4.623 7.17c0-.651.52-1.18 1.162-1.18zm5.813 0c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 0 1-1.162 1.178 1.17 1.17 0 0 1-1.162-1.178c0-.651.52-1.18 1.162-1.18zm5.34 2.867c-1.797-.052-3.746.512-5.28 1.786-1.72 1.428-2.687 3.72-1.78 6.22.942 2.453 3.666 4.229 6.884 4.229.826 0 1.622-.12 2.361-.336a.722.722 0 0 1 .598.082l1.584.926a.272.272 0 0 0 .14.047c.134 0 .24-.111.24-.247 0-.06-.023-.12-.038-.177l-.327-1.233a.582.582 0 0 1-.023-.156.49.49 0 0 1 .201-.398C23.024 18.48 24 16.82 24 14.98c0-3.21-2.931-5.837-6.656-6.088V8.89c-.135-.01-.27-.027-.407-.03zm-2.53 3.274c.535 0 .969.44.969.982a.976.976 0 0 1-.969.983.976.976 0 0 1-.969-.983c0-.542.434-.982.97-.982zm4.844 0c.535 0 .969.44.969.982a.976.976 0 0 1-.969.983.976.976 0 0 1-.969-.983c0-.542.434-.982.969-.982z"/>',
      instagram: '<path fill="url(#instagram-brand-gradient)" d="M7.0301.084c-1.2768.0602-2.1487.264-2.911.5634-.7888.3075-1.4575.72-2.1228 1.3877-.6652.6677-1.075 1.3368-1.3802 2.127-.2954.7638-.4956 1.6365-.552 2.914-.0564 1.2775-.0689 1.6882-.0626 4.947.0062 3.2586.0206 3.6671.0825 4.9473.061 1.2765.264 2.1482.5635 2.9107.308.7889.72 1.4573 1.388 2.1228.6679.6655 1.3365 1.0743 2.1285 1.38.7632.295 1.6361.4961 2.9134.552 1.2773.056 1.6884.069 4.9462.0627 3.2578-.0062 3.668-.0207 4.9478-.0814 1.28-.0607 2.147-.2652 2.9098-.5633.7889-.3086 1.4578-.72 2.1228-1.3881.665-.6682 1.0745-1.3378 1.3795-2.1284.2957-.7632.4966-1.636.552-2.9124.056-1.2809.0692-1.6898.063-4.948-.0063-3.2583-.021-3.6668-.0817-4.9465-.0607-1.2797-.264-2.1487-.5633-2.9117-.3084-.7889-.72-1.4568-1.3876-2.1228C21.2982 1.33 20.628.9208 19.8378.6165 19.074.321 18.2017.1197 16.9244.0645 15.6471.0093 15.236-.005 11.977.0014 8.718.0076 8.31.0215 7.0301.0839m.1402 21.6932c-1.17-.0509-1.8053-.2453-2.2287-.408-.5606-.216-.96-.4771-1.3819-.895-.422-.4178-.6811-.8186-.9-1.378-.1644-.4234-.3624-1.058-.4171-2.228-.0595-1.2645-.072-1.6442-.079-4.848-.007-3.2037.0053-3.583.0607-4.848.05-1.169.2456-1.805.408-2.2282.216-.5613.4762-.96.895-1.3816.4188-.4217.8184-.6814 1.3783-.9003.423-.1651 1.0575-.3614 2.227-.4171 1.2655-.06 1.6447-.072 4.848-.079 3.2033-.007 3.5835.005 4.8495.0608 1.169.0508 1.8053.2445 2.228.408.5608.216.96.4754 1.3816.895.4217.4194.6816.8176.9005 1.3787.1653.4217.3617 1.056.4169 2.2263.0602 1.2655.0739 1.645.0796 4.848.0058 3.203-.0055 3.5834-.061 4.848-.051 1.17-.245 1.8055-.408 2.2294-.216.5604-.4763.96-.8954 1.3814-.419.4215-.8181.6811-1.3783.9-.4224.1649-1.0577.3617-2.2262.4174-1.2656.0595-1.6448.072-4.8493.079-3.2045.007-3.5825-.006-4.848-.0608M16.953 5.5864A1.44 1.44 0 1 0 18.39 4.144a1.44 1.44 0 0 0-1.437 1.4424M5.8385 12.012c.0067 3.4032 2.7706 6.1557 6.173 6.1493 3.4026-.0065 6.157-2.7701 6.1506-6.1733-.0065-3.4032-2.771-6.1565-6.174-6.1498-3.403.0067-6.156 2.771-6.1496 6.1738M8 12.0077a4 4 0 1 1 4.008 3.9921A3.9996 3.9996 0 0 1 8 12.0077"/>',
      x: '<path d="M14.234 10.162 22.977 0h-2.072l-7.591 8.824L7.251 0H.258l9.168 13.343L.258 24H2.33l8.016-9.318L16.749 24h6.993zm-2.837 3.299-.929-1.329L3.076 1.56h3.182l5.965 8.532.929 1.329 7.754 11.09h-3.182z"/>',
      paypal: '<path d="M15.607 4.653H8.941L6.645 19.251H1.82L4.862 0h7.995c3.754 0 6.375 2.294 6.473 5.513-.648-.478-2.105-.86-3.722-.86m6.57 5.546c0 3.41-3.01 6.853-6.958 6.853h-2.493L11.595 24H6.74l1.845-11.538h3.592c4.208 0 7.346-3.634 7.153-6.949a5.24 5.24 0 0 1 2.848 4.686M9.653 5.546h6.408c.907 0 1.942.222 2.363.541-.195 2.741-2.655 5.483-6.441 5.483H8.714Z"/>',
      binance: '<path d="M16.624 13.9202l2.7175 2.7154-7.353 7.353-7.353-7.352 2.7175-2.7164 4.6355 4.6595 4.6356-4.6595zm4.6366-4.6366L24 12l-2.7154 2.7164L18.5682 12l2.6924-2.7164zm-9.272.001l2.7163 2.6914-2.7164 2.7174v-.001L9.2721 12l2.7164-2.7154zm-9.2722-.001L5.4088 12l-2.6914 2.6924L0 12l2.7164-2.7164zM11.9885.0115l7.353 7.329-2.7174 2.7154-4.6356-4.6356-4.6355 4.6595-2.7174-2.7154 7.353-7.353z"/>'
    };
    let brandIconCount = 0;

    function createBrandIcon(platform) {
      const icon = document.createElement('span');
      icon.className = `brand-icon brand-${platform}`;
      icon.setAttribute('aria-hidden', 'true');
      const instagramGradient = platform === 'instagram'
        ? `<defs><linearGradient id="instagram-gradient-${++brandIconCount}" x1="0" y1="24" x2="24" y2="0" gradientUnits="userSpaceOnUse"><stop stop-color="#feda75"/><stop offset=".35" stop-color="#fa7e1e"/><stop offset=".65" stop-color="#d62976"/><stop offset="1" stop-color="#4f5bd5"/></linearGradient></defs>`
        : '';
      const paths = platform === 'instagram'
        ? brandIconPaths.instagram.replaceAll('instagram-brand-gradient', `instagram-gradient-${brandIconCount}`)
        : brandIconPaths[platform];
      icon.innerHTML = `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">${instagramGradient}${paths}</svg>`;
      return icon;
    }

    document.querySelectorAll('[data-brand-icon]').forEach((icon) => {
      const generated = createBrandIcon(icon.dataset.brandIcon);
      icon.replaceChildren(generated.firstElementChild);
    });

    const accountExperience = {
      title: 'Your Enemind account is ready. Explore Health, Finance, Football, Beauty, and Digital Earning from one place.',
      actions: [
        ['❤️', 'Health', 'Explore responsible health, fitness, nutrition, and wellness information.'],
        ['💰', 'Finance', 'Learn about budgeting, saving, and financial literacy.'],
        ['⚽', 'Football', 'Follow football stories, analysis, and community updates.'],
        ['✨', 'Beauty', 'Discover skincare, haircare, grooming, and beauty content.'],
        ['💻', 'Digital Earning', 'Explore digital skills, freelancing, products, and legitimate earning ideas.']
      ]
    };

    document.getElementById('year').textContent = String(new Date().getFullYear());
    document.querySelectorAll('[data-admin-binance-id]').forEach((el) => { el.textContent = adminBinancePayId || 'Not configured'; });
    const binanceHelp = document.getElementById('binanceOnboardingHelp');
    if (binanceHelp && binanceReferralUrl) { binanceHelp.replaceChildren(document.createTextNode('Do not have Binance? ')); const referralAnchor=document.createElement('a'); referralAnchor.href=binanceReferralUrl; referralAnchor.target='_blank'; referralAnchor.rel='noopener noreferrer'; referralAnchor.textContent='Register using the Enemind admin referral link'; binanceHelp.append(referralAnchor); }
    else if (binanceHelp) binanceHelp.textContent='A Binance account is needed for Enemind payments and payouts. The admin referral URL is not yet configured; add it to binanceReferralUrl in config.js before launch.';


    // Show a fallback if the logo file cannot be loaded.
    document.getElementById('brandLogo').addEventListener('error', () => {
      document.getElementById('brandLogo').style.display = 'none';
      document.getElementById('brandFallback').style.display = 'block';
    }, { once: true });

    const isConfiguredValue = (value) =>
      typeof value === 'string' && value.trim() !== '' && !value.includes('YOUR_');

    const firebaseReady = Boolean(
      firebaseConfig &&
      isConfiguredValue(firebaseConfig.apiKey) &&
      isConfiguredValue(firebaseConfig.authDomain) &&
      isConfiguredValue(firebaseConfig.projectId) &&
      isConfiguredValue(firebaseConfig.appId)
    );

    const supabaseReady = Boolean(
      supabaseConfig &&
      isConfiguredValue(supabaseConfig.url) &&
      isConfiguredValue(supabaseConfig.anonKey) &&
      /^https:\/\/[a-zA-Z0-9-]+\.supabase\.co\/?$/.test(supabaseConfig.url)
    );

    let firebaseAuth = null;
    let firebaseUser = null;
    let supabase = null;

    if (firebaseReady) {
      try {
        const app = initializeApp(firebaseConfig);
        firebaseAuth = getAuth(app);
        onAuthStateChanged(firebaseAuth, (user) => {
          firebaseUser = user;
        });
      } catch (error) {
        console.error('Firebase initialization failed:', error);
        message.textContent = 'Firebase could not initialize. Check config.js and the browser console.';
      }
    } else {
      message.textContent = 'Browse the public marketplace without signing in.';
    }

    if (supabaseReady) {
      try {
        // Configure Firebase as a Supabase Third-Party Auth provider before enabling profile sync.
        supabase = createClient(supabaseConfig.url, supabaseConfig.anonKey, {
          accessToken: async () => {
            const user = firebaseAuth?.currentUser || firebaseUser;
            return user ? await user.getIdToken() : null;
          }
        });
      } catch (error) {
        console.error('Supabase initialization failed:', error);
      }
    }

    // Sync the Firebase-authenticated profile through Supabase Edge Function.
    // Firebase ID tokens are verified server-side by the Edge Function.
    async function syncProfile(user) {
      try {
        const token = await user.getIdToken(true);
        const requestBody = {
          displayName: user.displayName || null,
          photoUrl: user.photoURL || null,
        };

        const response = await fetch(
          `${supabaseConfig.url}/functions/v1/enemind-profile`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
              'apikey': supabaseConfig.anonKey
            },
            body: JSON.stringify(requestBody)
          }
        );

        const result = await response.json().catch(() => ({}));

        if (!response.ok) {
          console.error('Supabase Edge Function failed:', response.status, result);
          throw new Error(`Profile sync failed (${response.status}): ${result.error || 'Unknown error'}.`);
        }

        if (!result.ok || !result.profile) {
          console.error('Unexpected profile-sync response:', result);
          throw new Error('Supabase did not confirm profile synchronization.');
        }

        console.log('Supabase profile synced:', result.profile.firebase_uid);
        return result.profile;
      } catch (error) {
        console.error('Supabase profile sync failed:', error);
        throw error;
      }
    }

    function showAppView(view) {
      landingElements.forEach((element) => { element.hidden = view === 'dashboard'; });
      dashboard.hidden = view !== 'dashboard';
      page.classList.toggle('app-mode', view === 'dashboard');
      document.body.classList.toggle('app-open', view === 'dashboard');
    }

    function normalizeInternationalPhone(value) {
      const normalized = value.replace(/[\s().-]/g, '');
      return /^\+[1-9]\d{3,14}$/.test(normalized) ? normalized : null;
    }

    function showDashboard(user) {
      document.getElementById('dashboardTitle').textContent = `Welcome, ${user.displayName || user.email?.split('@')[0] || 'to Enemind'}`;
      document.getElementById('dashboardCopy').textContent = accountExperience.title;
      const badge = document.getElementById('accountBadge');
      if (badge) badge.textContent = 'One Enemind account';
      const actions = document.getElementById('starterActions');
      actions.replaceChildren(...accountExperience.actions.map(([icon, title, description]) => {
        const card = document.createElement('div');
        card.className = 'starter-action';
        const iconElement = document.createElement('span');
        iconElement.className = 'starter-action-icon';
        iconElement.setAttribute('aria-hidden', 'true');
        iconElement.textContent = icon;
        const titleElement = document.createElement('strong');
        titleElement.textContent = title;
        const descriptionElement = document.createElement('span');
        descriptionElement.textContent = description;
        card.append(iconElement, titleElement, descriptionElement);
        return card;
      }));
      renderProfileSummary(currentProfile || {});
      document.getElementById('dashboardStatus').textContent = '';
      document.getElementById('dashboardStatus').dataset.state = '';
      showAppView('dashboard');
      loadMyRequests();
      loadBuyerRequests();
      loadAdminQueue();
      loadLearningResources();
    }

    function renderProfileSummary(profile) {
      const summary = document.getElementById('profileSummary');
      const list = document.getElementById('profileSummaryList');
      const contacts = [
        ['whatsapp_phone', 'WhatsApp phone', 'whatsapp', (value) => {
          const normalized = normalizeInternationalPhone(value);
          return normalized ? `https://wa.me/${normalized.slice(1)}` : null;
        }]
      ];
      const items = contacts.filter(([field]) => typeof profile[field] === 'string' && profile[field].trim());
      list.replaceChildren(...items.map(([field, label, platform, linkFor]) => {
        const value = profile[field];
        const href = linkFor(value);
        const item = document.createElement(href ? 'a' : 'span');
        item.className = href ? 'profile-summary-link' : 'profile-summary-item';
        if (href) {
          item.href = href;
          item.target = '_blank';
          item.rel = 'noopener noreferrer';
        }
        item.append(createBrandIcon(platform));
        const text = document.createElement('span');
        text.textContent = `${label}: ${value}`;
        item.append(text);
        return item;
      }));
      summary.hidden = items.length === 0;
    }

    // Enemind uses one account type: any user who signs in with Google can explore the platform.

    document.getElementById('signOut').addEventListener('click', async () => {
      if (!firebaseAuth) return;
      try {
        await signOut(firebaseAuth);
        location.reload();
      } catch (error) {
        console.error('Sign-out failed:', error);
        const dashboardStatus = document.getElementById('dashboardStatus');
        dashboardStatus.textContent = 'Could not sign out. Please try again.';
        dashboardStatus.dataset.state = 'error';
      }
    });


    // Enemind service operations. Payment proof is submitted for human review; the browser never marks a payment as paid.
    const SERVICE_PRICES = {
      buyer_weekly: { label: 'Buyer weekly activation', amount: 10, duration: 'weekly' },
      worker_monthly: { label: 'Worker monthly activation', amount: 10, duration: 'monthly' },
      learner_activation: { label: 'Learner activation', amount: 10, duration: 'activation' },
      bwrite_activation: { label: 'Bwrite activation', amount: 5, duration: 'activation' }
    };
    const byId = (id) => document.getElementById(id);
    const servicePanels = ['paymentSubmissionPanel','csvRequestPanel','bwriteSubmissionPanel','referralPanel','withdrawalRequestPanel','buyerRequestPanel'];
    function closeServicePanels() { servicePanels.forEach((id) => { const el=byId(id); if(el) el.hidden=true; }); }
    function setServiceStatus(id, messageText, state='') { const el=byId(id); if(el){el.textContent=messageText;el.dataset.state=state;} }
    function showPaymentForm(serviceCode, amountOverride=null, labelOverride=null) {
      if (!profileUser || !supabaseReady || !supabase) { setServiceStatus('dashboardStatus','Sign in and ensure Supabase is configured before submitting a payment reference.','error'); return; }
      if (serviceCode !== 'csv_purchase' && currentTrial && new Date(currentTrial.ends_at).getTime() > Date.now()) {
        const end = new Date(currentTrial.ends_at).toLocaleString();
        setServiceStatus('dashboardStatus',`Your 2-day free trial is active until ${end}. Service activation payments open after the trial. CSV purchases are separate and can be ordered now.`,'success');
        return;
      }
      closeServicePanels();
      const service = SERVICE_PRICES[serviceCode];
      if (!service && serviceCode !== 'csv_purchase') return;
      const amount = amountOverride ?? service.amount;
      byId('paymentServiceCode').value = serviceCode;
      byId('paymentAmount').value = amount.toFixed(2);
      byId('paymentReference').value = '';
      byId('paymentNote').value = '';
      byId('paymentFormTitle').textContent = `Payment verification — ${labelOverride || service.label}`;
      byId('paymentFormDescription').textContent = `Send $${amount.toFixed(2)} USD to Binance Pay ID ${adminBinancePayId}. Then enter the Binance transaction/order reference below. Your request remains pending until an administrator verifies it.`;
      byId('paymentSubmissionPanel').hidden = false;
      byId('paymentSubmissionPanel').scrollIntoView({behavior:'smooth',block:'center'});
      setServiceStatus('paymentStatus','', '');
    }
    document.querySelectorAll('[data-pay-service]').forEach((button) => button.addEventListener('click', () => showPaymentForm(button.dataset.payService)));
    byId('openBwriteWorkspace').addEventListener('click',async()=>{if(!profileUser||!supabase){setServiceStatus('dashboardStatus','Sign in first to view today’s Bwrite topics.','error');return;}closeServicePanels();byId('bwriteSubmissionPanel').hidden=false;await loadBwriteTopics();byId('bwriteSubmissionPanel').scrollIntoView({behavior:'smooth',block:'start'});});
    byId('copyAdminBinance').addEventListener('click', async () => {
      try { await navigator.clipboard.writeText(adminBinancePayId); byId('copyAdminBinance').textContent='Copied'; }
      catch { setServiceStatus('dashboardStatus',`Binance Pay ID: ${adminBinancePayId}. Select and copy it manually.`,'success'); }
      setTimeout(() => { byId('copyAdminBinance').textContent='Copy Binance Pay ID'; }, 1800);
    });
    byId('cancelPayment').addEventListener('click', () => { byId('paymentSubmissionPanel').hidden=true; });
    byId('paymentSubmissionForm').addEventListener('submit', async (event) => {
      event.preventDefault();
      if (!profileUser || !supabase) return;
      const ownBinance = currentProfile?.binance_uid;
      if (!ownBinance) {
        setServiceStatus('paymentStatus','Before continuing, add your own Binance ID/UID in Edit profile details. This is separate from Enemind’s payment destination. If you do not have Binance, ask the admin to configure the official referral link.','error');
        return;
      }
      const serviceCode=byId('paymentServiceCode').value;
      const amount=Number(byId('paymentAmount').value);
      const transactionReference=byId('paymentReference').value.trim();
      const note=byId('paymentNote').value.trim();
      if (!transactionReference || transactionReference.length>160 || !Number.isFinite(amount) || amount<=0) { setServiceStatus('paymentStatus','Enter a valid transaction reference and amount.','error'); return; }
      const submit=byId('submitPayment'); submit.disabled=true; submit.textContent='Submitting…';
      try {
        const {error}=await supabase.from('payment_submissions').insert({user_id:profileUser.uid,email:profileUser.email||'',service_code:serviceCode,amount_usd:amount,currency:'USD',transaction_reference:transactionReference,note:note||null,status:'pending'});
        if(error) throw error;
        setServiceStatus('paymentStatus','Submitted for admin review. Your service is not activated until payment is verified. Keep your Binance transaction details.','success');
        byId('paymentReference').value=''; byId('paymentNote').value='';
        await loadMyRequests();
      } catch(error) {
        console.error('Payment submission failed',error);
        setServiceStatus('paymentStatus','Could not save the payment reference. Confirm that migration 202610230001_enemind_services.sql is applied and RLS is configured, then retry. No payment was confirmed by Enemind.','error');
      } finally { submit.disabled=false; submit.textContent='Submit for review'; }
    });
    const openBuyerRequestPanel=()=>{closeServicePanels();byId('buyerRequestPanel').hidden=false;byId('buyerRequestPanel').scrollIntoView({behavior:'smooth',block:'center'});};
    byId('openBuyerRequest').addEventListener('click',openBuyerRequestPanel);
    byId('buyerWorkspaceRequest').addEventListener('click',openBuyerRequestPanel);
    byId('buyerRequestForm').addEventListener('submit',async(event)=>{
      event.preventDefault();if(!profileUser||!supabase)return;const countries=[...document.querySelectorAll('input[name="buyerCountry"]:checked')].map(x=>x.value);const type=byId('buyerRequestType').value.trim(),quantity=Number(byId('buyerRequestQuantity').value),budget=byId('buyerRequestBudget').value?Number(byId('buyerRequestBudget').value):null,currency=byId('buyerRequestCurrency').value,url=byId('buyerRequestUrl').value.trim(),notes=byId('buyerRequestNotes').value.trim();
      if(!countries.length||!type||!Number.isInteger(quantity)||quantity<1){setServiceStatus('buyerRequestStatus','Select at least one country, enter the service type and a valid quantity.','error');return;}
      if(url&&!/^https?:\/\//i.test(url)){setServiceStatus('buyerRequestStatus','Use a valid official/provider registration URL.','error');return;}
      try{const {data,error}=await supabase.from('service_requests').insert({user_id:profileUser.uid,email:profileUser.email||'',request_type:'buyer_request',details:{countries,service_type:type,quantity,budget,currency,registration_url:url||null,requirements:notes,addons:{country_contact_csv:byId('buyerAddonCsv').checked,google_sheets_tracker:byId('buyerAddonSheet').checked},addons_pricing:'Admin to confirm availability and price before payment'},status:'submitted'}).select('id').single();if(error)throw error;setServiceStatus('buyerRequestStatus',`Buyer request ${data.id} submitted for admin review and partner matching. Selected add-ons are requests only; wait for admin confirmation before paying.`, 'success');byId('buyerRequestForm').reset();await loadMyRequests();}
      catch(error){console.error(error);setServiceStatus('buyerRequestStatus','Could not save the request. Apply the Enemind services migration and retry.','error');}
    });
    byId('openWithdrawalRequest').addEventListener('click',()=>{
      if(!profileUser||!currentProfile?.binance_uid){setServiceStatus('dashboardStatus','Add your own Binance Pay ID/UID in Edit profile details before requesting a payout.','error');return;}
      closeServicePanels();byId('withdrawalBinanceUid').value=currentProfile.binance_uid;byId('withdrawalRequestPanel').hidden=false;byId('withdrawalRequestPanel').scrollIntoView({behavior:'smooth',block:'center'});
    });
    byId('withdrawalRequestForm').addEventListener('submit',async(event)=>{
      event.preventDefault();if(!profileUser||!supabase)return;const amount=Number(byId('withdrawalAmount').value),uid=byId('withdrawalBinanceUid').value.trim(),note=byId('withdrawalNote').value.trim();
      if(!Number.isFinite(amount)||amount<=0||!uid||uid!==currentProfile?.binance_uid){setServiceStatus('withdrawalStatus','Enter a positive amount and the Binance ID/UID saved in your Enemind profile.','error');return;}
      try{const {error}=await supabase.from('withdrawal_requests').insert({user_id:profileUser.uid,email:profileUser.email||'',amount_usd:amount,payout_binance_uid:uid,note:note||null,status:'pending'});if(error)throw error;setServiceStatus('withdrawalStatus','Withdrawal request submitted for balance and fraud review. No payout has been sent yet.','success');byId('withdrawalRequestForm').reset();byId('withdrawalBinanceUid').value=currentProfile.binance_uid;await loadMyRequests();}
      catch(error){console.error(error);setServiceStatus('withdrawalStatus','Request was not saved. Ensure the services migration is applied and that your approved earnings cover this amount.','error');}
    });
    byId('openCsvRequest').addEventListener('click', () => { closeServicePanels(); byId('csvRequestPanel').hidden=false; byId('csvRequestPanel').scrollIntoView({behavior:'smooth',block:'center'}); });
    document.querySelectorAll('[data-close-panel]').forEach((button)=>button.addEventListener('click',()=>byId(button.dataset.closePanel).hidden=true));
    byId('csvRequestForm').addEventListener('submit', async (event) => {
      event.preventDefault(); if(!profileUser||!supabase)return;
      const countries=byId('csvCountries').value.split(',').map(v=>v.trim()).filter(Boolean);
      const quantity=Number(byId('csvQuantity').value); const requirements=byId('csvRequirements').value.trim();
      if(!countries.length || ![20,40,60,100].includes(quantity)){setServiceStatus('csvStatus','Enter at least one country and a supported batch size.','error');return;}
      const amount=quantity/2;
      try {
        const {data,error}=await supabase.from('service_requests').insert({user_id:profileUser.uid,email:profileUser.email||'',request_type:'seller_csv',details:{countries,quantity,requirements,price_usd:amount,currency:'USD',admin_binance_pay_id:adminBinancePayId,addons:{google_sheets_tracker:byId('csvAddonSheet').checked},addons_pricing:'Admin to confirm any add-on price before payment'},status:'submitted'}).select('id').single();
        if(error)throw error;
        setServiceStatus('csvStatus',`Request ${data.id} submitted. Base price: $${amount}.00 for ${quantity} records. ${byId('csvAddonSheet').checked?'Google Sheets tracker requested; wait for admin to confirm any add-on price. ':''}Pay only after reviewing the request details and confirmed total. Binance Pay ID ${adminBinancePayId}.`, 'success');
        showPaymentForm('csv_purchase',amount,`CSV request ${data.id} — ${quantity} seller records`);
        await loadMyRequests();
      } catch(error){console.error(error);setServiceStatus('csvStatus','Could not save your CSV request. Apply the new Supabase migration and retry.','error');}
    });
    function localDayRange(){const now=new Date(),start=new Date(now.getFullYear(),now.getMonth(),now.getDate()),end=new Date(now.getFullYear(),now.getMonth(),now.getDate()+1);return {start:start.toISOString(),end:end.toISOString()};}
    async function loadBwriteTopics(){
      const list=byId('bwriteTopicsList'),select=byId('bwriteTopicSelect');if(!list||!select||!supabase)return;
      list.replaceChildren();select.replaceChildren(new Option('Choose a topic…',''));
      try{const {start,end}=localDayRange();const {data,error}=await supabase.from('bwrite_topics').select('id,title,category,brief,created_at').eq('status','published').gte('created_at',start).lt('created_at',end).order('created_at',{ascending:false});if(error)throw error;
        if(!data?.length){const empty=document.createElement('div');empty.className='record-row';empty.textContent='No topics have been published today yet. Please check again later.';list.append(empty);setServiceStatus('bwriteTopicsStatus','No topics available today yet.','');return;}
        data.forEach(topic=>{const option=new Option(`${topic.title} · ${topic.category}`,topic.id);select.append(option);const row=document.createElement('div');row.className='record-row';const title=document.createElement('strong');title.textContent=topic.title;const meta=document.createElement('p');meta.textContent=topic.category;const brief=document.createElement('p');brief.textContent=topic.brief;const choose=document.createElement('button');choose.type='button';choose.className='mini-action';choose.textContent='Choose this topic';choose.addEventListener('click',()=>{select.value=topic.id;byId('bwriteTitle').value=topic.title;byId('bwriteDescription').value=`Topic: ${topic.title}. My document covers the requirements in the selected topic brief.`;byId('bwriteSubmissionForm').scrollIntoView({behavior:'smooth',block:'center'});});row.append(title,meta,brief,choose);list.append(row);});setServiceStatus('bwriteTopicsStatus',`${data.length} topic${data.length===1?'':'s'} available today. Select one to begin.`,'success');
      }catch(e){console.error('Bwrite topics load failed',e);const row=document.createElement('div');row.className='record-row';row.textContent='Could not load topics. Apply migration 202610230004_bwrite_topics.sql in Supabase SQL Editor.';list.append(row);setServiceStatus('bwriteTopicsStatus','Topics are not available until the Supabase migration is applied.','error');}
    }
    byId('bwriteSubmissionForm').addEventListener('submit', async (event) => {
      event.preventDefault(); if(!profileUser||!supabase)return;
      const topicId=byId('bwriteTopicSelect').value,title=byId('bwriteTitle').value.trim(),url=byId('bwriteDocUrl').value.trim(),description=byId('bwriteDescription').value.trim();
      if(!topicId){setServiceStatus('bwriteStatus','Choose one of today’s admin-published topics first.','error');return;}
      if(!/^https:\/\/docs\.google\.com\/document\/d\//i.test(url)){setServiceStatus('bwriteStatus','Enter a valid Google Docs document URL.','error');return;}
      if(!bwriteAdminEmail){setServiceStatus('bwriteStatus','Admin review email is not configured yet. Set bwriteAdminEmail in config.js, then share the document with that email before submitting.','error');return;}
      try {
        const {data:topic,error:topicError}=await supabase.from('bwrite_topics').select('id,title,category').eq('id',topicId).eq('status','published').single();if(topicError||!topic)throw topicError||new Error('Selected topic is no longer available.');
        const {error}=await supabase.from('bwrite_submissions').insert({user_id:profileUser.uid,email:profileUser.email||'',title,category:topic.category,topic_id:topic.id,topic_title:topic.title,document_url:url,description,status:'submitted'});
        if(error)throw error;
        setServiceStatus('bwriteStatus',`Submission saved for topic “${topic.title}”. Share the Google Doc with ${bwriteAdminEmail} using Viewer or Commenter access; do not make it publicly editable.`,'success');
        byId('bwriteSubmissionForm').reset(); await loadMyRequests();
      } catch(error){console.error(error);setServiceStatus('bwriteStatus','Could not save the writing submission. Confirm migration 202610230004_bwrite_topics.sql is applied and share access with admin.','error');}
    });
    byId('bwriteTopicForm').addEventListener('submit',async(event)=>{event.preventDefault();if(!profileUser||!supabase||String(profileUser.email||'').toLowerCase()!==ADMIN_EMAIL){setServiceStatus('adminBwriteTopicStatus','Admin account required.','error');return;}const title=byId('adminBwriteTopicTitle').value.trim(),category=byId('adminBwriteTopicCategory').value,brief=byId('adminBwriteTopicBrief').value.trim();try{const {error}=await supabase.from('bwrite_topics').insert({title,category,brief,status:'published',created_by:profileUser.uid});if(error)throw error;setServiceStatus('adminBwriteTopicStatus','Topic published. It now appears in today’s Bwrite topic list.','success');byId('bwriteTopicForm').reset();await loadBwriteTopics();await loadAdminBwriteTopics();}catch(e){console.error(e);setServiceStatus('adminBwriteTopicStatus','Could not publish topic. Apply migration 202610230004_bwrite_topics.sql and verify admin access.','error');}});
    async function loadAdminBwriteTopics(){const holder=byId('adminBwriteTopicsList');if(!holder||!supabase)return;holder.replaceChildren();try{const {start,end}=localDayRange();const {data,error}=await supabase.from('bwrite_topics').select('id,title,category,brief,created_at').gte('created_at',start).lt('created_at',end).order('created_at',{ascending:false});if(error)throw error;if(!data?.length){const empty=document.createElement('div');empty.className='record-row';empty.textContent='No topics published today yet.';holder.append(empty);return;}data.forEach(t=>{const row=document.createElement('div');row.className='record-row';const title=document.createElement('strong');title.textContent=t.title;const brief=document.createElement('p');brief.textContent=`${t.category} — ${t.brief}`;row.append(title,brief);holder.append(row);});}catch(e){console.warn(e);}}

    function renderReferralLinks() {
      closeServicePanels(); const panel=byId('referralPanel'); panel.hidden=false;
      const base=`${location.origin}${location.pathname}`; const tracks=[['buyer','Buyer'],['worker','Worker'],['learner','Learner'],['bwrite','Bwrite']];
      const holder=byId('referralLinks'); holder.replaceChildren();
      for(const [track,label] of tracks){
        const url=new URL(base); url.searchParams.set('ref',profileUser.uid); url.searchParams.set('track',track);
        const row=document.createElement('div');row.className='referral-line';const code=document.createElement('code');code.textContent=`${label}: ${url.toString()}`;const button=document.createElement('button');button.type='button';button.className='mini-action';button.textContent='Copy link';button.addEventListener('click',async()=>{try{await navigator.clipboard.writeText(url.toString());button.textContent='Copied';}catch{setServiceStatus('referralStatus','Select and copy the link manually.','error');}});row.append(code,button);holder.append(row);
      }
      const referralLink=binanceReferralUrl;
      if(!referralLink){setServiceStatus('referralStatus','Your Enemind referral links are generated. The Binance account referral link is not configured; add your official referral URL to binanceReferralUrl in config.js before showing it to new users. Referral rewards still require backend attribution and admin fraud review.','');}
      else {const link=document.createElement('p');link.className='payment-hint';link.textContent=`New Binance users: ${referralLink}`;holder.append(link);}
      panel.scrollIntoView({behavior:'smooth',block:'center'});
    }
    byId('showReferralLinks').addEventListener('click',renderReferralLinks);
    async function loadMyRequests(){
      if(!profileUser||!supabase)return;
      const holder=byId('myRequestsList');holder.replaceChildren();
      try{
        const [payments,requests,writings,activations,withdrawals,earnings]=await Promise.all([
          supabase.from('payment_submissions').select('id,service_code,amount_usd,transaction_reference,status,created_at').eq('user_id',profileUser.uid).order('created_at',{ascending:false}).limit(10),
          supabase.from('service_requests').select('id,request_type,status,created_at,details').eq('user_id',profileUser.uid).order('created_at',{ascending:false}).limit(10),
          supabase.from('bwrite_submissions').select('id,title,status,created_at').eq('user_id',profileUser.uid).order('created_at',{ascending:false}).limit(10),
          supabase.from('service_activations').select('id,service_code,status,activated_at,expires_at').eq('user_id',profileUser.uid).order('activated_at',{ascending:false}).limit(10),
          supabase.from('withdrawal_requests').select('id,amount_usd,status,created_at').eq('user_id',profileUser.uid).order('created_at',{ascending:false}).limit(10),
          supabase.from('worker_earnings').select('id,amount_usd,status,description,created_at').eq('user_id',profileUser.uid).order('created_at',{ascending:false}).limit(20)
        ]);
        const failure=[payments,requests,writings,activations,withdrawals,earnings].find(x=>x.error); if(failure)throw failure.error;
        const rows=[...(currentTrial?[{kind:'Trial',title:'2-day free trial',detail:`${new Date(currentTrial.ends_at).getTime()>Date.now()?'active until':'ended'} ${new Date(currentTrial.ends_at).toLocaleString()}`,date:currentTrial.started_at}]:[]),...(payments.data||[]).map(x=>({kind:'Payment',title:x.service_code,detail:`$${Number(x.amount_usd).toFixed(2)} · ${x.status} · ref ${x.transaction_reference}`,date:x.created_at})),...(requests.data||[]).map(x=>({kind:'Request',title:x.request_type,detail:`${x.status}${x.details?.quantity?` · ${x.details.quantity} records`:''}`,date:x.created_at})),...(writings.data||[]).map(x=>({kind:'Bwrite',title:x.title,detail:x.status,date:x.created_at})),...(activations.data||[]).map(x=>({kind:'Activation',title:x.service_code,detail:`${x.status}${x.expires_at?` · expires ${new Date(x.expires_at).toLocaleDateString()}`:' · no expiry configured'}`,date:x.activated_at})),...(withdrawals.data||[]).map(x=>({kind:'Withdrawal',title:`$${Number(x.amount_usd).toFixed(2)}`,detail:x.status,date:x.created_at})),...(earnings.data||[]).map(x=>({kind:'Worker earning',title:`$${Number(x.amount_usd).toFixed(2)}`,detail:`${x.status} · ${x.description}`,date:x.created_at}))].sort((a,b)=>new Date(b.date)-new Date(a.date));
        if(!rows.length){const empty=document.createElement('div');empty.className='record-row';empty.textContent='No requests or payment submissions yet.';holder.append(empty);}
        rows.forEach(x=>{const row=document.createElement('div');row.className='record-row';row.textContent=`${x.kind}: ${x.title} — ${x.detail} (${new Date(x.date).toLocaleDateString()})`;holder.append(row);});
        setServiceStatus('requestsStatus','Records loaded from Supabase. Payment statuses are set by the review process.','success');
      }catch(error){console.warn('Could not load service records',error);setServiceStatus('requestsStatus','Service records are not available yet. Apply supabase/migrations/202610230001_enemind_services.sql and ensure the latest Supabase client/auth configuration is deployed.','error');}
    }
    // Buyer marketplace records: offers are published by Enemind/admin for opted-in sellers.
    const buyerTabIds = {requests:'buyerRequestsSection',offers:'buyerOffersSection',orders:'buyerOrdersSection'};
    document.querySelectorAll('[data-buyer-tab]').forEach(button=>button.addEventListener('click',()=>{
      const tab=button.dataset.buyerTab;
      document.querySelectorAll('[data-buyer-tab]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));
      Object.entries(buyerTabIds).forEach(([key,id])=>byId(id).hidden=key!==tab);
      if(tab==='requests')loadBuyerRequests(); if(tab==='offers')loadBuyerOffers(); if(tab==='orders')loadBuyerOrders();
    }));
    function buyerEmpty(holder,message){holder.replaceChildren();const el=document.createElement('div');el.className='buyer-empty';el.textContent=message;holder.append(el);}
    function buyerCard(holder,{title,meta,status,description,actions=[]}){
      const card=document.createElement('article');card.className='buyer-item';const top=document.createElement('div');top.className='buyer-item-top';const left=document.createElement('div');const strong=document.createElement('strong');strong.textContent=title;left.append(strong);const pill=document.createElement('span');pill.className='buyer-status-pill';pill.textContent=status||'submitted';top.append(left,pill);card.append(top);if(meta){const m=document.createElement('p');m.textContent=meta;card.append(m);}if(description){const d=document.createElement('p');d.textContent=description;card.append(d);}if(actions.length){const row=document.createElement('div');row.className='buyer-item-actions';actions.forEach(a=>row.append(a));card.append(row);}holder.append(card);return card;
    }
    function buyerAction(label,callback){const b=document.createElement('button');b.type='button';b.className='mini-action';b.textContent=label;b.addEventListener('click',callback);return b;}
    async function loadBuyerRequests(){
      const holder=byId('buyerRequestsList');if(!profileUser||!supabase){buyerEmpty(holder,'Sign in and connect Supabase to view your requests.');return;}
      try{const {data,error}=await supabase.from('service_requests').select('id,request_type,status,created_at,updated_at,details,admin_note').eq('user_id',profileUser.uid).eq('request_type','buyer_request').order('created_at',{ascending:false}).limit(50);if(error)throw error;
        if(!data?.length){buyerEmpty(holder,'No buyer requests yet. Create your first request to tell Enemind which service, country, quantity and budget you need.');setServiceStatus('buyerRequestsStatus','', '');return;}
        holder.replaceChildren();data.forEach(r=>{const d=r.details||{};const countries=Array.isArray(d.countries)?d.countries.join(', '):'Countries not specified';const addons=[];if(d.addons?.country_contact_csv)addons.push('CSV requested');if(d.addons?.google_sheets_tracker)addons.push('Sheets tracker requested');buyerCard(holder,{title:d.service_type||r.request_type,meta:`${countries} · Qty ${d.quantity||1}${d.budget!==null&&d.budget!==undefined?' · Budget '+d.currency+' '+d.budget:''}`,status:r.status,description:`Request ${r.id} · Submitted ${new Date(r.created_at).toLocaleDateString()}${addons.length?' · '+addons.join(', '):''}${d.requirements?' · '+d.requirements:''}${r.admin_note?' · Admin note: '+r.admin_note:''}`,actions:[buyerAction('View matched offers',()=>{document.querySelector('[data-buyer-tab="offers"]').click();})]});});setServiceStatus('buyerRequestsStatus',`${data.length} buyer request(s) loaded.`, 'success');
      }catch(e){console.warn('Buyer requests failed',e);buyerEmpty(holder,'Buyer requests could not load. Apply the latest Enemind marketplace migration and check Supabase RLS.');setServiceStatus('buyerRequestsStatus','Could not load buyer requests.','error');}
    }
    async function loadBuyerOffers(){
      const holder=byId('buyerOffersList');if(!profileUser||!supabase){buyerEmpty(holder,'Sign in and connect Supabase to view matched offers.');return;}
      try{const {data:reqs,error:reqError}=await supabase.from('service_requests').select('id,details').eq('user_id',profileUser.uid).eq('request_type','buyer_request').order('created_at',{ascending:false}).limit(100);if(reqError)throw reqError;
        const ids=(reqs||[]).map(r=>r.id);if(!ids.length){buyerEmpty(holder,'Create a buyer request first. Matched offers will be attached to that request.');return;}
        const {data,error}=await supabase.from('buyer_marketplace_offers').select('id,request_id,seller_name,country,offer_title,description,price_usd,delivery_days,status,terms,created_at').in('request_id',ids).eq('status','available').order('created_at',{ascending:false});if(error)throw error;
        if(!data?.length){buyerEmpty(holder,'No offers are available yet. Enemind/admin must record offers from participating sellers who opted in to the request.');setServiceStatus('buyerOffersStatus','No matched offers found yet.','');return;}
        holder.replaceChildren();data.forEach(o=>{const req=reqs.find(r=>r.id===o.request_id);const detail=req?.details||{};const place=buyerAction('Place order',async()=>{place.disabled=true;try{const {error:orderError}=await supabase.from('buyer_marketplace_orders').insert({buyer_user_id:profileUser.uid,buyer_email:profileUser.email||'',request_id:o.request_id,offer_id:o.id,quantity:Number(detail.quantity)||1,agreed_price_usd:Number(o.price_usd),status:'pending'});if(orderError)throw orderError;setServiceStatus('buyerOffersStatus','Order request recorded. Wait for Enemind/admin to confirm payment and order acceptance.','success');await loadBuyerOrders();}catch(e){console.error(e);setServiceStatus('buyerOffersStatus','Could not place order. Check the latest marketplace migration and your request ownership.','error');}finally{place.disabled=false;}});buyerCard(holder,{title:o.offer_title||`Offer from ${o.seller_name}`,meta:`${o.seller_name} · ${o.country||'Country not specified'} · $${Number(o.price_usd).toFixed(2)} · ${o.delivery_days??'—'} day(s) estimated`,status:o.status,description:[o.description,o.terms?'Terms: '+o.terms:'',`Request: ${detail.service_type||'Buyer request'} · quantity ${detail.quantity||1}`].filter(Boolean).join(' · '),actions:[place]});});setServiceStatus('buyerOffersStatus',`${data.length} available offer(s) loaded.`, 'success');
      }catch(e){console.warn('Buyer offers failed',e);buyerEmpty(holder,'Offers could not load. Apply supabase/migrations/202610230003_buyer_marketplace.sql and check Supabase RLS.');setServiceStatus('buyerOffersStatus','Could not load matched offers.','error');}
    }
    async function loadBuyerOrders(){
      const holder=byId('buyerOrdersList');if(!profileUser||!supabase){buyerEmpty(holder,'Sign in and connect Supabase to view orders.');return;}
      try{const {data,error}=await supabase.from('buyer_marketplace_orders').select('id,request_id,offer_id,quantity,agreed_price_usd,status,delivery_note,created_at,updated_at').eq('buyer_user_id',profileUser.uid).order('created_at',{ascending:false}).limit(100);if(error)throw error;
        if(!data?.length){buyerEmpty(holder,'You have no orders yet. When you select a matched seller offer, your order request will appear here.');setServiceStatus('buyerOrdersStatus','', '');return;}
        const offerIds=[...new Set(data.map(x=>x.offer_id))];let offers=[];if(offerIds.length){const r=await supabase.from('buyer_marketplace_offers').select('id,seller_name,country,offer_title').in('id',offerIds);if(!r.error)offers=r.data||[];}
        holder.replaceChildren();data.forEach(o=>{const offer=offers.find(x=>x.id===o.offer_id);buyerCard(holder,{title:offer?.offer_title||`Order ${o.id.slice(0,8)}`,meta:`${offer?.seller_name||'Seller offer'} · ${offer?.country||'Country'} · Qty ${o.quantity} · $${Number(o.agreed_price_usd).toFixed(2)}`,status:o.status,description:`Order ${o.id} · Placed ${new Date(o.created_at).toLocaleDateString()}${o.delivery_note?' · Delivery note: '+o.delivery_note:''}`,actions:[]});});setServiceStatus('buyerOrdersStatus',`${data.length} order(s) loaded.`, 'success');
      }catch(e){console.warn('Buyer orders failed',e);buyerEmpty(holder,'Orders could not load. Apply the latest marketplace migration and check Supabase RLS.');setServiceStatus('buyerOrdersStatus','Could not load orders.','error');}
    }
    byId('buyerLoadRequests').addEventListener('click',loadBuyerRequests);byId('buyerLoadOffers').addEventListener('click',loadBuyerOffers);byId('buyerLoadOrders').addEventListener('click',loadBuyerOrders);
    byId('buyerRefreshMarketplace').addEventListener('click',async()=>{await Promise.all([loadBuyerRequests(),loadBuyerOffers(),loadBuyerOrders()]);});

    byId('refreshMyRequests').addEventListener('click',loadMyRequests);
    async function loadLearningResources(){
      if(!supabase||!profileUser)return;const holder=byId('learningResourcesList');holder.replaceChildren();
      try{const {data,error}=await supabase.from('learning_resources').select('id,title,category,video_url,description,created_at').eq('status','published').order('created_at',{ascending:false}).limit(50);if(error)throw error;
        if(!data.length){const empty=document.createElement('div');empty.className='record-row';empty.textContent='No lessons published yet. The admin will add approved YouTube lessons here.';holder.append(empty);}
        data.forEach(x=>{const row=document.createElement('div');row.className='record-row';const title=document.createElement('strong');title.textContent=x.title;const meta=document.createElement('p');meta.textContent=`${x.category}${x.description?' — '+x.description:''}`;const link=document.createElement('a');link.href=x.video_url;link.target='_blank';link.rel='noopener noreferrer';link.textContent='Open lesson on YouTube';link.style.color='var(--mint)';row.append(title,meta,link);holder.append(row);});setServiceStatus('learningResourcesStatus','Learning library loaded.','success');
      }catch(e){console.warn(e);setServiceStatus('learningResourcesStatus','Learning library needs the new Supabase migration.','error');}
    }
    byId('learningResourceForm').addEventListener('submit',async(event)=>{event.preventDefault();if(!profileUser||!supabase||String(profileUser.email||'').toLowerCase()!==ADMIN_EMAIL)return;const title=byId('lessonTitle').value.trim(),category=byId('lessonCategory').value,url=byId('lessonUrl').value.trim(),description=byId('lessonDescription').value.trim();if(!/^https:\/\/(www\.)?(youtube\.com|youtu\.be)\//i.test(url)){setServiceStatus('lessonStatus','Enter a valid YouTube video URL.','error');return;}try{const {error}=await supabase.from('learning_resources').insert({title,category,video_url:url,description,status:'published',created_by:profileUser.uid});if(error)throw error;setServiceStatus('lessonStatus','Lesson published to the learning library.','success');byId('learningResourceForm').reset();await loadLearningResources();}catch(e){console.error(e);setServiceStatus('lessonStatus','Could not publish lesson. Confirm the new migration and admin email policy.','error');}});
    const ADMIN_EMAIL='enemindcompany@gmail.com';
    function statusSelect(table,id,currentStatus,options){
      const wrap=document.createElement('div');wrap.className='form-row';const select=document.createElement('select');select.setAttribute('aria-label','Update status');options.forEach(status=>{const opt=document.createElement('option');opt.value=status;opt.textContent=status.replaceAll('_',' ');opt.selected=status===currentStatus;select.append(opt);});
      const save=document.createElement('button');save.type='button';save.className='mini-action';save.textContent='Save status';save.addEventListener('click',async()=>{save.disabled=true;try{const update={status:select.value};if(['payment_submissions','referral_attributions','buyer_marketplace_orders'].includes(table))update.reviewed_at=new Date().toISOString();if(['service_requests','bwrite_submissions','buyer_marketplace_orders','buyer_marketplace_offers'].includes(table))update.updated_at=new Date().toISOString();const {error}=await supabase.from(table).update(update).eq('id',id);if(error)throw error;setServiceStatus('adminQueueStatus','Status updated.','success');await loadAdminQueue();await loadMyRequests();}catch(e){console.error(e);setServiceStatus('adminQueueStatus','Status update failed. Confirm the admin email and SQL migration policies.','error');}finally{save.disabled=false;}});wrap.append(select,save);return wrap;
    }
    async function loadAdminBuyerRequestOptions(){
      const select=byId('adminOfferRequestId');if(!select||!supabase||!profileUser||String(profileUser.email||'').toLowerCase()!==ADMIN_EMAIL)return;
      try{const {data,error}=await supabase.from('service_requests').select('id,email,details,status,created_at').eq('request_type','buyer_request').order('created_at',{ascending:false}).limit(100);if(error)throw error;select.replaceChildren();const first=document.createElement('option');first.value='';first.textContent=data?.length?'Choose buyer request…':'No buyer requests yet';select.append(first);(data||[]).forEach(r=>{const d=r.details||{};const option=document.createElement('option');option.value=r.id;option.textContent=`${String(d.service_type||'Buyer request').slice(0,70)} · ${(d.countries||[]).join(', ')} · ${r.email||r.id.slice(0,8)} · ${r.status}`;select.append(option);});}catch(e){console.warn('Admin buyer request options failed',e);select.replaceChildren(new Option('Could not load requests — check migration/RLS',''));}
    }
    byId('adminBuyerOfferForm').addEventListener('submit',async(event)=>{
      event.preventDefault();if(!profileUser||!supabase||String(profileUser.email||'').toLowerCase()!==ADMIN_EMAIL){setServiceStatus('adminOfferStatus','Admin account required.','error');return;}
      const request_id=byId('adminOfferRequestId').value,seller_name=byId('adminOfferSeller').value.trim(),country=byId('adminOfferCountry').value.trim(),offer_title=byId('adminOfferTitle').value.trim(),description=byId('adminOfferDescription').value.trim(),price_usd=Number(byId('adminOfferPrice').value),days=byId('adminOfferDays').value,terms=byId('adminOfferTerms').value.trim();
      if(!request_id||!seller_name||!country||!offer_title||!description||!Number.isFinite(price_usd)||price_usd<0){setServiceStatus('adminOfferStatus','Complete the request, seller, country, offer description and valid price.','error');return;}
      try{const {error}=await supabase.from('buyer_marketplace_offers').insert({request_id,seller_name,country,offer_title,description,price_usd,delivery_days:days===''?null:Number(days),terms:terms||null,status:'available'});if(error)throw error;setServiceStatus('adminOfferStatus','Offer published. The buyer can now compare it under Matched offers.','success');byId('adminBuyerOfferForm').reset();await loadAdminQueue();}catch(e){console.error(e);setServiceStatus('adminOfferStatus','Could not publish offer. Apply 202610230003_buyer_marketplace.sql and verify admin access.','error');}
    });

    
async function loadAdminContributors(){
 if(!firebaseUser||firebaseUser.email?.toLowerCase()!==STORE_ADMIN)return;
 const {data,error}=await sb.from('store_contributors').select('id,full_name,phone,email,contributor_type,experience,portfolio_url,status,created_at').order('created_at',{ascending:false}).limit(100);
 if(error){$('adminContributorQueue').textContent='Unable to load applications: '+error.message;return;}
 $('adminContributorQueue').innerHTML=(data||[]).map(c=>`<article class="admin-order" data-contributor="${esc(c.id)}"><h4>${esc(c.full_name)} · ${esc(c.contributor_type)}</h4><p>${esc(c.phone)} ${c.email?'· '+esc(c.email):''} · Status: ${esc(c.status)}</p><p>${esc(c.experience||'No experience notes')}${c.portfolio_url?' · '+esc(c.portfolio_url):''}</p><div class="admin-order-actions"><button class="store-button" type="button" data-contributor-status="${esc(c.id)}" data-next-status="approved">Approve</button><button class="store-button store-button-secondary" type="button" data-contributor-status="${esc(c.id)}" data-next-status="paused">Pause</button><button class="store-share" type="button" data-contributor-status="${esc(c.id)}" data-next-status="declined">Decline</button></div></article>`).join('')||'<p>No applications yet.</p>';
}
async function loadAdminQuotes(){
 if(!firebaseUser||firebaseUser.email?.toLowerCase()!==STORE_ADMIN)return;
 const {data,error}=await sb.from('store_school_quotes').select('id,school_name,contact_name,phone,email,needs,status,created_at').order('created_at',{ascending:false}).limit(100);
 if(error){$('adminQuoteQueue').textContent='Unable to load quotations: '+error.message;return;}
 $('adminQuoteQueue').innerHTML=(data||[]).map(q=>`<article class="admin-order" data-quote="${esc(q.id)}"><h4>${esc(q.school_name)} · ${esc(q.status)}</h4><p>Contact: ${esc(q.contact_name)} · ${esc(q.phone)} ${q.email?'· '+esc(q.email):''}</p><p>${esc(q.needs)}</p><div class="admin-order-actions"><button class="store-button" type="button" data-quote-status="${esc(q.id)}" data-next-status="contacted">Mark contacted</button><button class="store-button store-button-secondary" type="button" data-quote-status="${esc(q.id)}" data-next-status="quoted">Mark quoted</button><button class="store-share" type="button" data-quote-status="${esc(q.id)}" data-next-status="accepted">Accepted</button><button class="store-share" type="button" data-quote-status="${esc(q.id)}" data-next-status="declined">Declined</button></div></article>`).join('')||'<p>No school quotation requests yet.</p>';
}
$('adminRefreshContributors').addEventListener('click',loadAdminContributors);
$('adminRefreshQuotes').addEventListener('click',loadAdminQuotes);
document.addEventListener('click',async e=>{
 const cb=e.target.closest('[data-contributor-status]'),qb=e.target.closest('[data-quote-status]');if(!cb&&!qb)return;
 if(!firebaseUser||firebaseUser.email?.toLowerCase()!==STORE_ADMIN)return;
 try{
  if(cb){const {error}=await sb.from('store_contributors').update({status:cb.dataset.nextStatus}).eq('id',cb.dataset.contributorStatus);if(error)throw error;await loadAdminContributors();}
  if(qb){const {error}=await sb.from('store_school_quotes').update({status:qb.dataset.nextStatus}).eq('id',qb.dataset.quoteStatus);if(error)throw error;await loadAdminQuotes();}
  setStatus('adminStatus','Admin record updated.');
 }catch(err){setStatus('adminStatus',err.message||'Could not update record.',true);}
});

async function loadAdminQueue(){
      if(!profileUser||!supabase||String(profileUser.email||'').toLowerCase()!==ADMIN_EMAIL){byId('adminReviewPanel').hidden=true;byId('adminLearningPanel').hidden=true;byId('adminEarningsPanel').hidden=true;byId('adminBwriteTopicsPanel').hidden=true;return;}
      byId('adminBwriteTopicsPanel').hidden=false;await loadAdminBwriteTopics();byId('adminLearningPanel').hidden=false;byId('adminEarningsPanel').hidden=false;
      byId('adminReviewPanel').hidden=false;const holder=byId('adminQueueList');holder.replaceChildren();await loadAdminBuyerRequestOptions();
      try{
        const [payments,requests,writings,referrals,withdrawals,earnings,orders]=await Promise.all([
          supabase.from('payment_submissions').select('*').order('created_at',{ascending:false}).limit(30),
          supabase.from('service_requests').select('*').order('created_at',{ascending:false}).limit(30),
          supabase.from('bwrite_submissions').select('*').order('created_at',{ascending:false}).limit(30),
          supabase.from('referral_attributions').select('*').order('created_at',{ascending:false}).limit(30),
          supabase.from('withdrawal_requests').select('*').order('created_at',{ascending:false}).limit(30),
          supabase.from('worker_earnings').select('*').order('created_at',{ascending:false}).limit(30),
          supabase.from('buyer_marketplace_orders').select('*').order('created_at',{ascending:false}).limit(30)
        ]);const fail=[payments,requests,writings,referrals,withdrawals,earnings,orders].find(x=>x.error);if(fail)throw fail.error;
        const groups=[
          ...(payments.data||[]).map(x=>({table:'payment_submissions',id:x.id,title:`PAYMENT · ${x.service_code} · $${Number(x.amount_usd).toFixed(2)}`,detail:`${x.email} · ref ${x.transaction_reference} · ${x.note||''}`,status:x.status,options:['pending','approved','paid','rejected']})),
          ...(requests.data||[]).map(x=>({table:'service_requests',id:x.id,title:`REQUEST · ${x.request_type}`,detail:`${x.email} · ${JSON.stringify(x.details).slice(0,400)}`,status:x.status,options:['submitted','under_review','approved','fulfilled','rejected']})),
          ...(writings.data||[]).map(x=>({table:'bwrite_submissions',id:x.id,title:`BWRITE · ${x.title}`,detail:`${x.email} · ${x.category} · ${x.document_url}`,status:x.status,options:['submitted','under_review','revision_required','approved','published','rejected']})),
          ...(referrals.data||[]).map(x=>({table:'referral_attributions',id:x.id,title:`REFERRAL · ${x.track} · $${Number(x.reward_usd).toFixed(2)}`,detail:`referrer ${x.referrer_uid} → referred ${x.referred_uid}`,status:x.status,options:['pending_review','qualified','rejected','paid']})),
          ...(withdrawals.data||[]).map(x=>({table:'withdrawal_requests',id:x.id,title:`WITHDRAWAL · $${Number(x.amount_usd).toFixed(2)}`,detail:`${x.email} · Binance ${x.payout_binance_uid} · ${x.note||''}`,status:x.status,options:['pending','approved','paid','rejected']})),
          ...(earnings.data||[]).map(x=>({table:'worker_earnings',id:x.id,title:`WORKER EARNING · $${Number(x.amount_usd).toFixed(2)}`,detail:`worker ${x.user_id} · ${x.task_reference||''} · ${x.description}`,status:x.status,options:['pending','approved','rejected']})),
          ...(orders.data||[]).map(x=>({table:'buyer_marketplace_orders',id:x.id,title:`BUYER ORDER · $${Number(x.agreed_price_usd).toFixed(2)} · Qty ${x.quantity}`,detail:`${x.buyer_email} · request ${x.request_id} · offer ${x.offer_id} · ${x.delivery_note||''}`,status:x.status,options:['pending','accepted','awaiting_payment','in_progress','delivered','completed','cancelled','disputed']}))
        ];
        if(!groups.length){const empty=document.createElement('div');empty.className='record-row';empty.textContent='No review items yet.';holder.append(empty);}
        groups.forEach(x=>{const row=document.createElement('div');row.className='record-row';const title=document.createElement('strong');title.textContent=x.title;const detail=document.createElement('p');detail.textContent=x.detail;detail.style.overflowWrap='anywhere';const state=document.createElement('p');state.textContent=`Current status: ${x.status}`;row.append(title,detail,state,statusSelect(x.table,x.id,x.status,x.options));holder.append(row);});
        setServiceStatus('adminQueueStatus','Admin queue loaded. Verify transaction references in Binance before marking payments paid.','success');
      }catch(e){console.error(e);setServiceStatus('adminQueueStatus','Could not load admin queue. Confirm the admin email, migration, and RLS policies.','error');}
    }
    byId('refreshAdminQueue').addEventListener('click',loadAdminQueue);
    byId('adminEarningsForm').addEventListener('submit',async(event)=>{event.preventDefault();if(!profileUser||String(profileUser.email||'').toLowerCase()!==ADMIN_EMAIL||!supabase)return;const userId=byId('earningWorkerUid').value.trim(),amount=Number(byId('earningAmount').value),taskRef=byId('earningTaskRef').value.trim(),description=byId('earningDescription').value.trim();if(!userId||!Number.isFinite(amount)||amount<=0||!description){setServiceStatus('earningStatus','Enter worker UID, a positive amount and task description.','error');return;}try{const {error}=await supabase.from('worker_earnings').insert({user_id:userId,task_reference:taskRef||null,description,amount_usd:amount,status:'pending'});if(error)throw error;setServiceStatus('earningStatus','Earning recorded as pending. Approve it in the Supabase table after quality review before it can be withdrawn.','success');byId('adminEarningsForm').reset();await loadAdminQueue();}catch(e){console.error(e);setServiceStatus('earningStatus','Could not record earning. Confirm admin access and migration.','error');}});


    async function ensureTrialForUser(user){
      if(!user||!supabase)return null;
      try{
        const {data,error}=await supabase.from('user_trials').select('user_id,started_at,ends_at').eq('user_id',user.uid).maybeSingle();
        if(error)throw error;
        if(data){currentTrial=data;return data;}
        const {data:created,error:insertError}=await supabase.from('user_trials').insert({user_id:user.uid}).select('user_id,started_at,ends_at').single();
        if(insertError)throw insertError;currentTrial=created;return created;
      }catch(error){console.warn('Could not initialize trial (apply Enemind services migration)',error);return null;}
    }
    // Capture a referral invite for admin review after the invited person signs in.
    async function captureReferralForSignedInUser(user){
      const params=new URLSearchParams(location.search);const referrer=params.get('ref');const track=params.get('track');
      if(!referrer||!track||referrer===user.uid||!['buyer','worker','learner','bwrite'].includes(track)||!supabase)return;
      try{const key=`enemind_ref_${user.uid}`;if(sessionStorage.getItem(key))return;
        const {error}=await supabase.from('referral_attributions').insert({referrer_uid:referrer,referred_uid:user.uid,track,status:'pending_review'});
        if(error && error.code!=='23505')throw error;sessionStorage.setItem(key,'1');
      }catch(error){console.warn('Referral attribution awaiting setup/review',error);}
    }
    // Admin records are not auto-approved in the client. A privileged admin workflow must verify references and qualify rewards.

    async function completeGoogleSignIn(user) {
      firebaseUser = user;
      profileUser = user;
      const displayName = user.displayName || user.email || 'your account';
      const basicProfile = {
        firebase_uid: user.uid,
        email: user.email || '',
        display_name: user.displayName || null,
        photo_url: user.photoURL || null
      };
      if (!supabaseReady || !supabase) {
        currentProfile = basicProfile;
        message.textContent = `Signed in as ${displayName}. Supabase is not configured, so saved services may be unavailable.`;
        showDashboard(user);
        return;
      }
      let profile;
      try {
        profile = await syncProfile(user);
      } catch (error) {
        console.error('Profile sync failed after Google sign-in:', error);
        currentProfile = basicProfile;
        message.textContent = 'Google sign-in succeeded, but profile storage is unavailable. You can still open Enemind; some saved services may not load.';
        showDashboard(user);
        return;
      }
      await ensureTrialForUser(user);
      await captureReferralForSignedInUser(user);
      currentProfile = profile;
      message.textContent = `Signed in as ${displayName}.`;
      showDashboard(user);
    }

    // PWA install prompt: capture it here, then call prompt() only after the user clicks.
    let installPrompt = null;

    window.addEventListener('beforeinstallprompt', (event) => {
      event.preventDefault();
      installPrompt = event;
      installButton.style.display = 'inline-flex';
    });

    installButton.addEventListener('click', async () => {
      if (!installPrompt) {
        message.textContent = 'To install Enemind, open your browser menu and choose “Install app” or “Add to Home screen”.';
        return;
      }

      const promptEvent = installPrompt;
      installPrompt = null;
      installButton.disabled = true;

      try {
        await promptEvent.prompt();
        const choice = await promptEvent.userChoice;

        if (choice?.outcome === 'accepted') {
          message.textContent = 'Thanks — Enemind is being installed.';
        } else {
          message.textContent = 'Installation was dismissed. You can install Enemind later from your browser menu.';
        }
      } catch (error) {
        console.warn('PWA installation prompt could not be shown:', error);
        message.textContent = 'The install prompt is no longer available. Use your browser menu to install Enemind.';
      } finally {
        installButton.disabled = false;
        installButton.style.display = 'none';
      }
    });

    window.addEventListener('appinstalled', () => {
      installPrompt = null;
      installButton.style.display = 'none';
      message.textContent = 'Enemind has been installed on this device.';
    });

    // Register the service worker only on secure contexts or localhost.
    if ('serviceWorker' in navigator &&
        (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1')) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
          .catch((error) => console.warn('Service worker registration failed:', error));
      });
    }

    // Open configured social links safely; WeChat remains a placeholder until its real URL is supplied.
    document.querySelectorAll('[data-social]').forEach((link) => {
      const platform = link.dataset.social;
      if (platform === 'wechat') {
        link.addEventListener('click', (event) => {
          event.preventDefault();
          message.textContent = 'Add Enemind’s official WeChat profile or QR-code link to enable this button.';
        });
      } else {
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
      }
    });
  