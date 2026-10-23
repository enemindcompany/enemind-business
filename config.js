// Public browser configuration only. These values are not server secrets.
// Firebase web API keys and Supabase publishable/anon keys may be used in browser code.
// Never put Firebase service-account private keys or Supabase service_role keys here.
export const firebaseConfig = {
  apiKey: "AIzaSyDaQ23VlHsJWkUckornJaRi-wtO7FoMeBc",
  authDomain: "enemind-business.firebaseapp.com",
  projectId: "enemind-business",
  appId: "1:1025936809069:web:e3920b1294801865c73364"
};

export const supabaseConfig = {
    url: "https://qohcfzxvmmhnfxdevbqg.supabase.co",
  anonKey: "sb_publishable_kw7uOSGKQPQnHtF2e7Y6WQ_0Zm8wVe7"
};

// Public payment destination for Enemind. This is a Binance Pay ID, not a secret.
export const adminBinancePayId = "1236166874";
// Add the actual Binance referral URL here before launch; do not invent a link.
export const binanceReferralUrl = "";
// Designated Enemind store administrator. Keep in sync with the admin email in Supabase RLS policies.
export const storeAdminEmail = "enemindcompany@gmail.com";
// Designated Bwrite review inbox. Configure before accepting Google Docs submissions.
export const bwriteAdminEmail = "enemindcompany@gmail.com";
