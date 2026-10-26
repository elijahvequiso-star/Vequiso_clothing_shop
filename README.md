# Elijah ClothingShop

## Signup email verification

Each time `npm run dev` starts, the first browser request clears any existing Supabase login from the development browser. Log in normally after the app loads; this reset only runs in development.

The signup flow sends a six-digit OTP through Gmail SMTP before allowing account creation. Configure these server-side values in `.env.local`:

| Variable | Purpose |
| --- | --- |
| `GMAIL_USER` | Gmail sender address |
| `GMAIL_APP_PASSWORD` | Google App Password for the sender account; never use the normal account password |
| `SMTP_HOST` | Gmail SMTP hostname (`smtp.gmail.com`) |
| `SMTP_PORT` | `465` for SSL or `587` for STARTTLS |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only Supabase service role key |
| `OTP_PEPPER` | Random server-only key of at least 32 characters for OTP hashing |

`.env.example` contains fake values for reference. Never commit `.env.local` or put server secrets in `NEXT_PUBLIC_` variables. Apply `20261017000000_registration_email_verifications.sql`, then `20261021000000_revoke_registration_verification.sql`, then `20261021010000_registration_email_verification_columns.sql` in the Supabase SQL Editor before using signup. The last migration refreshes the PostgREST schema cache.

For Gmail SMTP, turn on 2-Step Verification on the sender Google Account and create an App Password. App Passwords are only available for eligible accounts with 2-Step Verification; some managed accounts and Advanced Protection accounts may not offer them. Enter the generated password in `GMAIL_APP_PASSWORD` (spaces may be omitted). Google documents Gmail SMTP at `smtp.gmail.com`, using port 465 with SSL or port 587 with STARTTLS.

After configuring credentials and applying migrations, restart `npm run dev`, open `/signup`, request a code for an inbox you control, enter the received OTP, and finish account creation. The send endpoint enforces a 60-second resend cooldown and a five-send daily limit per email.

## Admin dashboard, orders, and customer tracking

Apply `supabase/migrations/20261024000000_admin_order_management.sql`, `supabase/migrations/20261024010000_qr_payment_submissions.sql`, and `supabase/migrations/20261026000000_order_checkout_fields.sql` in the Supabase SQL Editor after the email verification migrations. These add shipping and payment reference fields, order status history, customer notifications, QR proof submissions, the private `payment-proofs` storage bucket, and any missing checkout columns plus the stock adjustment function. The complete setup script also includes the checkout fields and stock function. If you previously ran that script, rerun it after pulling updates; it is safe to rerun. The project already has an active administrator in its configured Supabase project; continue using that account.

Apply `supabase/migrations/20261024020000_product_discounts.sql` as well to enable admin-managed discounts. Until that table exists, the storefront and checkout use each product's existing base price, so missing the discounts migration will not prevent ordering. The complete setup script also creates this table. The Products page lists existing storefront and database products; it does not create products.

Admin authentication checks the signed-in user's `profiles.role` and `account_status` on the server. Customers and administrators use the shared `/login` page; an active admin is routed to `/admin/dashboard` based on the stored profile role. Admin logout returns to that shared login page. Never assign admin privileges based on a submitted email address.

Customer checkout saves orders in Supabase and requires a signed-in customer account. Prices come from the server catalog, and quantities are reserved for products present in Supabase. Customers can pay by GCash or Maya using the corresponding local QR image, then upload receipt images to a private bucket. An administrator manually reviews each submission and confirms or rejects it. A receipt image is a manual claim and does not verify payment with a bank or payment provider. Admins can record cash-on-delivery collection after the order is delivered.

The admin sidebar contains Dashboard, Orders, Customers, Notifications, and Logout. The Customers page can invite customers by email, update customer names, and disable or restore customer access while retaining order history. Each order displays its purchased items, options, quantities, and prices. Order status changes follow the defined workflow and create audit history and in-app customer notifications. Customers can see orders, tracking numbers, notifications, and status history at `/account/orders`. Courier tracking is manual; no live courier integration is configured.
# GCash and Maya checkout payments

Place the original QR images supplied by the shop owner at `public/images/gcash.png` and `public/images/maya.png`. The QR artwork is served as local Next.js public assets and should not be edited or regenerated. These image files were not present in the project when this feature was added, so add them before accepting online payments or deploying.

Online checkout records the selected `gcash` or `maya` method and a server-calculated total on the existing `orders` row. Receipt uploads use the private Supabase Storage bucket `payment-proofs`; the server creates or configures this private bucket on the first upload when needed. The `payment_submissions` table links each receipt to the customer's order. The server checks order ownership and uses the service role only after authorization. Admin payment review uses the existing protected payments page, short-lived signed receipt URLs, and admin authorization. Apply the existing migrations in order, including `20261024000000_admin_order_management.sql` and `20261024010000_qr_payment_submissions.sql` (plus earlier required migrations), or run the project's documented Supabase setup script. No additional table is needed for GCash or Maya.

For local testing, configure the Supabase values in `.env.local`, apply the migrations, start the app with `npm run dev`, and sign in with a customer account. Add an item to the cart, choose GCash or Maya at checkout, place the order, and submit a receipt image. Sign in to `/admin` with an authorized administrator, open Payments, inspect the receipt, and confirm or reject it. Then verify the payment status and notification in `/account/orders`. Test both providers and cash on delivery. For Vercel, set the same server environment variables in the project settings, apply the migrations to the production Supabase project, and deploy both original image files with the app. Payment review notifications appear in customer order history; email/SMS delivery is not configured by this flow.
