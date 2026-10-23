# Enemind Store Admin — Catalogue Guide

## Admin access

Use the **Admin sign in** button in the store header and sign in with Google. The admin panel is shown only when the Firebase-authenticated email matches `storeAdminEmail` in `config.js`. The current configured address is `enemindcompany@gmail.com`.

The Supabase Row Level Security policies in `supabase/migrations/202610230006_digital_products_store.sql` also authorize that same email. If you change the admin email, update `storeAdminEmail` in `config.js` and the matching email conditions in the Supabase policies, then apply the policy update in Supabase. Do not remove the Row Level Security policies or expose a service-role key in browser code.

## Add a product

1. Sign in to Enemind using the authorised admin Google account.
2. Scroll to **Enemind Admin — Catalogue & order management**.
3. Open **Catalogue manager — add or edit a product**.
4. Enter a title. The URL slug is generated from the title; you may change it before saving.
5. Choose category, curriculum, class/level, subject and (if relevant) career pathway.
6. Enter the price in KES, audience, short description and full description.
7. Upload an optional JPG, PNG or WebP product image (maximum 5 MB), or enter an HTTPS image URL. If neither is provided, the Enemind logo is used. Add a free-preview URL if needed.
8. Select **Draft** to save privately or **Published now** to make the resource visible in the public catalogue.
9. Select **Save product**. The catalogue refreshes after a successful save.

## Edit or publish an existing product

Use **Edit** beside a product to load its saved values into the form. Save with **Update product**, or use **Cancel edit**. The **Publish/Unpublish** control changes public visibility. Drafts are not shown in the public catalogue.

## Curriculum fields

The form supports CBC/CBE, 8-4-4 and early years; Baby Class, PP1, PP2, Grades 1–9, Standards 1–8 and Forms 1–4; subjects; and career pathways. Apply the migrations in `supabase/migrations/` in chronological order, including `202610230006_digital_products_store.sql`, `202610230007_store_learning_filters.sql`, `202610230008_store_product_images.sql`, and `202610230009_store_media_and_category_fix.sql`.

## Security note

Keep paid download files in private storage or protected links. Do not put secret keys in `config.js`. Verify M-Pesa payments independently before activating customer downloads.

## Product images (added in this update)

In Supabase SQL Editor, run migrations `202610230008_store_product_images.sql` and then `202610230009_store_media_and_category_fix.sql`. The latter re-applies storage policies to handle Firebase ID tokens whose database role claim is not `authenticated`, while still requiring the admin email claim. It also adds Online earning procedures and Selling prompts & scripts product categories and creates the admin-managed YouTube video table. After applying migrations, sign out and sign in again as `enemindcompany@gmail.com`. If image uploads still fail, verify that Firebase is configured as a third-party authentication provider for the Supabase project and that the browser is forwarding the Firebase ID token. Never add a Supabase service-role key to frontend code.

## Online earning and selling resources

Choose **Online earning procedure** for step-by-step learning guides (for example, setting up a legitimate online service, creating a product listing, pricing, customer support, and scam avoidance). Choose **Selling prompts & scripts** for reusable product descriptions, customer reply templates, WhatsApp sales messages, and follow-up scripts. Write clear, honest product descriptions and avoid income guarantees.

## YouTube videos

Open **YouTube video manager** in the admin panel to add, edit, publish/unpublish, or delete YouTube video links. Paste a standard YouTube watch link, youtu.be link, embed link, or Shorts link. Published videos appear in the public video-learning section; drafts remain private. Run migration `202610230009_store_media_and_category_fix.sql` first.


## Fix product save error: `new row violates row-level security policy for table store_products`

Run `supabase/migrations/202610230010_fix_store_products_admin_rls.sql` in Supabase Dashboard → SQL Editor. This re-creates the admin write policy for the configured Firebase admin email and grants the required SQL table privileges while keeping RLS enabled. Then sign out of Enemind, sign in again with `enemindcompany@gmail.com`, and try saving a draft product. Do not disable RLS or expose the Supabase service-role key.

If the same error remains, verify Supabase's Firebase third-party authentication provider is configured for the correct Firebase project and that the request JWT includes the `email` claim `enemindcompany@gmail.com`. A Firebase UI sign-in alone does not guarantee Supabase can validate the Firebase JWT for database RLS.

## Checkout error and international Binance Pay

If checkout fails with `function gen_random_bytes(integer) does not exist`, run `supabase/migrations/202610230011_fix_checkout_crypto_and_binance_pay.sql` in Supabase SQL Editor. This replaces checkout token generation with built-in UUID generation and hashes the high-entropy lookup token without requiring pgcrypto functions on the `public` search path. The same migration adds the selected payment method to orders and updates payment-reference submission.

At checkout, buyers can select M-Pesa (Till 6817863) or Binance Pay (international). The current Binance Pay ID displayed by the store is `1236166874`, matching the Enemind Binance destination already configured in the platform. This is a manual-transfer workflow, not an automated Binance payment gateway: the buyer submits a transaction reference and an admin must verify it independently in Binance before approving the order. Never approve based only on a screenshot or submitted reference. Confirm the displayed Binance Pay ID is correct for your account before publishing the store.

## Product card sizing

Public catalogue cards are capped at 500px wide and 500px high, centered in the product grid. At smaller screen widths they adapt to the available space. Long card descriptions scroll within the card rather than stretching the whole catalogue width.
