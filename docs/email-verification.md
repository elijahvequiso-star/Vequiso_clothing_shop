# Gmail OTP Email Verification

Signup sends a real six-digit code through Gmail SMTP before creating a Supabase Auth user. Codes expire after five minutes; only HMAC hashes are stored in Supabase. The flow limits requests to five per email in a 24-hour window anchored to the first send in that window, enforces a 60-second resend cooldown, and permits at most five verification attempts per code. Successful verification issues a random, one-use, HTTP-only registration proof bound to the normalized email. Changing the email revokes that proof.

## Required environment variables

Copy `.env.example` to `.env.local` and set:

| Variable | Use |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project root URL, such as `https://your-project.supabase.co` (not a URL ending in `/rest/v1/`) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase publishable/anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only key for verification RPCs and Auth account creation |
| `OTP_PEPPER` | Server-only random HMAC secret of at least 32 characters |
| `GMAIL_USER` | Gmail account used as the SMTP sender and username |
| `GMAIL_APP_PASSWORD` | The sender's 16-character Google App Password (spaces shown by Google may be omitted); do not use its regular password |
| `SMTP_HOST` | Gmail SMTP hostname, `smtp.gmail.com` |
| `SMTP_PORT` | `465` for SSL or `587` for STARTTLS |

Never add `NEXT_PUBLIC_` to a server secret. Do not paste credentials into source code, support requests, or logs. Generate a distinct `OTP_PEPPER` for each environment:

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

After changing `.env.local`, stop and restart the Next.js development server. In a hosted environment, update the server-side environment variables and redeploy.

## Gmail SMTP setup

1. Turn on 2-Step Verification for the Google Account used by `GMAIL_USER`.
2. In Google Account security settings, create an App Password and put it in `GMAIL_APP_PASSWORD`. App Passwords require 2-Step Verification and may not be available for some managed accounts or accounts enrolled in Advanced Protection. Never use your regular Google password here.
3. Set `SMTP_HOST=smtp.gmail.com`. Use `SMTP_PORT=465` for SSL or `SMTP_PORT=587` for STARTTLS. Gmail requires SMTP authentication.

The server uses Nodemailer with connection, greeting, and socket timeouts. It reports success only after Gmail accepts the SMTP message. Errors are logged using a sanitized stage and error code; the app password and OTP are never logged.

## Supabase database setup

For a new Supabase project, run `supabase/complete-setup.sql` in the Supabase SQL Editor. It creates the shop tables, access policies, profile trigger, registration email-verification table, and required RPCs. It can also be rerun if setup stopped partway through; existing rows are preserved. For an existing shop database, use the timestamped migrations below when possible.

For an existing project, keep its data and apply only the required timestamped migrations in order. If it does not yet have the shop's base schema, apply `supabase/schema.sql` first, then apply these migrations:

1. `supabase/migrations/20261017000000_registration_email_verifications.sql`
2. `supabase/migrations/20261021000000_revoke_registration_verification.sql`
3. `supabase/migrations/20261021010000_registration_email_verification_columns.sql`

For a project that already has the shop schema and first two migrations, apply only the third migration. It adds any missing registration verification columns and refreshes the PostgREST schema cache; it does not drop or rewrite customer, product, or order data. The existing `public.otp_verifications` table is retained for compatibility/data preservation; registration uses `public.registration_email_verifications`.

The verification table has row-level security enabled and no client-facing policies. Only server handlers use the Supabase service-role key, and the RPC functions are executable only by `service_role`. A code is not eligible for verification until Gmail accepts the message and the server confirms delivery in Supabase. Keep Supabase Auth email confirmation enabled as defense in depth; the signup handler confirms the Auth user only after consuming the server-side registration proof.

## Local run and validation

```powershell
npm run dev
```

In another terminal, the project checks are:

```powershell
npm run lint
npx tsc --noEmit
npm run build
```

## Hosting

Add the exact variables above to the hosting platform's server environment. On Vercel, add them under **Project Settings → Environment Variables** and select the environment used by the deployment (Production, Preview, or Development). `GMAIL_USER` must be the full Gmail address that created the App Password; use a Google App Password, not the account password. The code removes whitespace from the App Password and trims the sender address and SMTP host. Save the variables and create a new deployment; existing deployments do not pick up changed environment values.

If signup reports `Gmail SMTP authentication failed`, check the Vercel deployment's environment scope and confirm `GMAIL_USER` and `GMAIL_APP_PASSWORD` belong together. In the Google Account, verify 2-Step Verification is enabled and create a fresh App Password if needed. App Passwords may be unavailable for managed or Advanced Protection accounts. Keep the service-role key and Gmail App Password server-only, and never share them in logs or support messages. Use separate Supabase projects and sender credentials for previews when possible. Apply all required migrations to the production database before deploying the updated application.

## Integration checklist

Run against a non-production Supabase project and an inbox you control:

- Send a code to a valid Gmail address, receive the real message, verify it, and create an account. Confirm Supabase Auth has `email_confirmed_at` and a `profiles` row exists.
- Submit an incorrect code five times; further attempts must be locked. Confirm expired and already-used codes are rejected.
- Resend before 60 seconds and confirm the cooldown; after 60 seconds request another code and confirm the old code no longer works.
- Request six codes during one 24-hour window anchored to the first request, respecting cooldowns; the sixth request must be blocked.
- Change the email after sending or verifying and confirm the old server-side registration proof is revoked.
- Try signup directly without verification and with a mismatched confirmation password; both requests must be rejected. Confirm a successful verified signup can log in.
- Try an existing account and confirm the user is directed to log in.
- In a non-production environment, unset a Gmail variable and confirm the endpoint names the missing variable without exposing secrets. Test a revoked refresh token or missing scope and confirm the response recommends reauthorization.
- Confirm SMTP errors never return success and an undelivered code cannot be verified.

Do not alter production verification rows to simulate expiry. Use disposable test accounts and data for rate-limit and expiry tests. Real Gmail delivery cannot be validated without a working Gmail App Password and an inbox you control.
