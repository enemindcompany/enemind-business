# ENEMIND Digital Products System — Build & Launch Guide

This release adds a public digital-product storefront to the existing Enemind PWA. Visitors can browse without an account, place guest orders, pay to M-Pesa Till **6817863**, submit a transaction code for manual verification, and receive download activation or WhatsApp delivery after approval. It also includes product sharing, school quotation requests, contributor applications and an admin order/product queue.

## What is included

- Public product catalogue with search and category filters.
- Guest checkout; no sign-in required to order.
- Unique order reference plus a private lookup token.
- M-Pesa Till instructions and transaction-reference submission.
- Order status lookup that requires both reference and private token.
- Admin-only order queue for verifying payment, activating a protected download, marking WhatsApp delivery, or rejecting a payment.
- Admin product publishing form.
- WhatsApp and Facebook share links for every product.
- Facebook Marketplace guidance button. It does **not** publish a Marketplace listing automatically; Meta rules may restrict digital downloads.
- School quotation request form and contributor application form.
- SQL tables for products, orders, school quotes, contributors, commissions and payouts.
- Only WhatsApp and Facebook are shown in the landing-page social links.

## Important boundaries

1. **This ZIP cannot deploy itself.** You must apply the SQL migration to the correct Supabase project and deploy the updated PWA to HTTPS.
2. **Manual M-Pesa verification:** a Till number alone does not verify transactions automatically. Check the transaction in the M-Pesa business statement/portal before approving an order. Never approve based only on a screenshot or a buyer-entered code.
3. **Secure downloads:** enter only an HTTPS URL that is access-controlled or signed and expires. Do not put paid files in a public bucket or use a permanent public Google Drive link. The order lookup endpoint returns the download URL only after payment is verified and delivery is activated. For production, use a private Supabase Storage bucket with short-lived signed URLs generated server-side.
4. **Facebook Marketplace:** product sharing is available, but the app cannot guarantee Marketplace eligibility or publish listings on a user's behalf. Digital-only downloads may be disallowed under Meta policies. The user must check current Meta rules and complete any permitted listing manually.
5. **Facebook link preview:** a static PWA generally shares the public product URL, but Facebook crawlers may show the site's general Open Graph metadata rather than product-specific title/image. Product-specific link previews need server-rendered share pages or a hosting/Edge Function rewrite.
6. **Admin email:** the migration currently authorizes `enemindcompany@gmail.com`, matching the existing app configuration. If the real owner/admin email differs, update the admin email in the SQL migration policies and `config.js` before running it. Do not grant admin access to a shared/public email.
7. **Authentication:** the admin UI uses the Firebase ID token with Supabase. The Supabase project must already be configured to trust the Firebase project as a third-party JWT provider, as described in the existing README. If it is not, public browsing may work while admin actions fail.
8. **Data protection:** collect only the contact details needed to fulfil orders. Restrict order-table access with RLS, use HTTPS, publish clear refund/licence/privacy terms, and check Kenyan data-protection and tax obligations before launch.
9. **Contributor earnings:** applications and commission/payout ledger tables are included, but automatic affiliate attribution, commission calculation, contributor self-service earnings dashboards, and actual payouts are not yet automated. Do not promise income or charge application/recruitment fees.

## Setup steps

### 1. Back up and extract

1. Keep a backup of the existing ZIP and Supabase database.
2. Extract this ZIP into a development folder.
3. Confirm `config.js` has the correct Firebase web configuration and Supabase project URL/publishable key.
4. Never add the Supabase service-role key to `config.js` or any browser code.

### 2. Apply the database migration

In Supabase Dashboard → SQL Editor, run this new migration after your existing profile/service migrations:

`supabase/migrations/202610230006_digital_products_store.sql`

It creates the digital products, guest orders, school quotes, contributors, commissions and payout tables, RLS policies, and secure guest-order RPC functions. Do not run it against the wrong Supabase project.

### 3. Confirm the admin account

- Sign in to Firebase with the trusted administrator Google account.
- Confirm the email is exactly `enemindcompany@gmail.com`, or change the hard-coded admin email in the migration policies before applying the migration.
- Confirm Supabase trusts Firebase ID tokens for the same Firebase project (`enemind-business`).
- The admin panel appears inside the storefront only for the configured admin email.

### 4. Start locally

```bash
npm install
npm run dev
```

Use the local HTTPS/localhost URL printed by the development server. Test Google sign-in and the storefront. The public catalogue will show an explanatory message until at least one product is published.

### 5. Publish a first product

1. Sign in with the configured admin account.
2. Open the **Add or publish a digital product** panel in the storefront's admin section.
3. Enter title, slug, category, price in KES, description, optional preview image/preview URL, licence and status.
4. Choose **Published now** to display it in the public catalogue.
5. Test from a private/incognito browser where you are not signed in.

Use original resources or content you have rights to sell. Keep a separate licence for single-user, teacher and school use. Avoid uploading or reselling copyrighted textbook pages without permission.

### 6. Test guest checkout

1. In a private browser, select a product and click **Buy now**.
2. Enter a name, phone/WhatsApp and optional email.
3. Save both the order reference and private lookup token. The token is required for later status lookup.
4. Pay the exact amount to M-Pesa Till **6817863**.
5. Submit the M-Pesa transaction code in the order window.
6. Confirm the order is still pending/reviewing; the product must not unlock automatically.

### 7. Verify and deliver

1. Sign in as the admin.
2. Open the order queue and independently verify the transaction in M-Pesa.
3. Click **Verify & approve payment** only after the transaction is confirmed.
4. For download delivery, enter an HTTPS protected/signed download URL and click **Activate download**.
5. For WhatsApp delivery, actually send the resource or secure link to the buyer and then click **Mark WhatsApp delivered**.
6. Test order status lookup with the order reference and private token. A download URL is returned only after verified payment and activation.

**Production recommendation:** replace manually pasted download URLs with a Supabase Edge Function that checks the order token/payment state and generates a short-lived signed URL from a private storage bucket. Do not paste public file links into orders.

### 8. Test school and contributor forms

Submit a test school quotation and contributor application. These are stored for admin review. The included tables have admin-only access policies; review requests in Supabase Table Editor. Before paying commissions, define written eligibility, attribution, refund/reversal, minimum payout, records and payout approvals.

### 9. Deploy

Deploy the updated PWA to an HTTPS static host using the existing deployment flow. Keep the Firebase authorized domain and service worker cache in mind. After release, hard-refresh or clear the old service-worker cache if the old page remains.

## Current scope vs. follow-on work

**Implemented in this release:** public catalogue, guest order creation, M-Pesa transaction-code submission, private token-based order lookup, admin manual payment approval, manual download/WhatsApp delivery activation, product publishing, school quotation requests, contributor applications, WhatsApp/Facebook sharing buttons, and SQL ledgers for commissions/payouts.

**Still required for a production-grade full business:** private-storage signed-link delivery function, automated M-Pesa Daraja integration and reconciliation (after credentials/approval), refund/dispute workflow, contributor self-service dashboard and payout processing, affiliate attribution/click tracking, email/SMS notifications, rate limiting/CAPTCHA on public forms, audit logging, product-specific Open Graph share pages, privacy/terms/licence/refund pages, backups/monitoring and end-to-end tests on the real Firebase/Supabase projects.
