# Build and Complete the Admin Management System for Elijah Clothing Shop

Upgrade the existing Elijah Clothing Shop e-commerce project into a secure, fully functional store administration system. Work in the existing project and integrate with its current customer site, Supabase database, authentication, checkout, and order flows. Do not rebuild the website or replace working features with mock data.

## Project rules

Before changing code:

1. Inspect the repository instructions, project structure, current Git changes, authentication, database schema and RLS policies, cart, checkout, orders, products, and customer account pages.
2. Read the documentation shipped with the installed Next.js version under `node_modules/next/dist/docs/` for any Next.js conventions used in the implementation. Follow the installed version, not remembered or outdated APIs.
3. Check the installed dependencies and use existing patterns and libraries where practical. Make the smallest safe set of changes that completes the work.
4. Preserve existing signup, email OTP verification, customer login, shopping, checkout, account, and order tracking behavior.

Do not print, copy into source control, or expose values from `.env.local` or other secret files. Never add credentials to client code, `NEXT_PUBLIC_` variables, logs, screenshots, or this prompt. Do not reset, replace, or disclose any existing admin credentials. Use a secure, auditable first-admin provisioning method; do not create an undocumented default account or hardcode an admin password.

## 1. Authentication and access control

- Keep customer login and signup separate from administrator login.
- Provide a dedicated `/admin/login` page and protected `/admin/*` pages.
- Use the existing Supabase Auth session and `profiles` role fields when available. Do not introduce a second authentication system.
- Store roles in the database (for example, `customer` and `admin`). A new signup must never receive admin privileges.
- Enforce authentication and role checks on the server for every admin page, route handler, server action, and privileged database operation. Hiding UI is not authorization.
- Send unauthenticated admin visitors to `/admin/login`; reject authenticated customers from admin features.
- Keep customers in the customer interface after normal login. Customers may access only their own permitted profile, orders, order items, notifications, and tracking information.
- Prevent customers from changing their role, account status, order owner, item prices, order totals, or payment state.
- Protect every customer-data endpoint against cross-account access.
- Use the service-role key only in server-only code. Never pass it to a browser or expose it through a public environment variable.
- Provide a documented, secure, repeatable way for the project owner to provision the first admin. Require an explicit trusted operator action or database-side procedure; avoid public bootstrap endpoints and default credentials. Explain required steps without printing secrets.

## 2. Admin interface

Build a responsive, accessible admin area consistent with Elijah Clothing Shop branding. Include navigation for:

- Overview
- Orders
- Customers
- Products
- Inventory (if supported by the existing schema)
- Payments
- Shipping
- Reports and analytics
- Notifications (if supported)
- Admin settings (only if there are real settings to manage)
- Logout

Support desktop, tablet, and mobile layouts. Use clear status badges, searchable tables, confirmation for sensitive actions, useful success/error feedback, loading states, and empty states. Do not add navigation items that lead to nonfunctional placeholder pages.

## 3. Overview and analytics

Use real Supabase data and server-authorized queries. Show, where the schema supports them:

- Total, pending, confirmed, processing, shipped, delivered, and cancelled orders
- Registered customers
- Pending payments
- Revenue under explicitly stated business rules
- Sales over time, orders by status, popular products, and customer growth

Provide useful date filters and refresh behavior. Charts may use an existing compatible library or a suitable dependency only when needed. Do not fabricate sample data. Define revenue carefully: exclude cancelled orders and do not count unpaid, failed, or refunded transactions as completed revenue. Explain any assumptions when existing payment data cannot distinguish collected from due.

Every statistic and chart must have appropriate loading, empty, and error states. Avoid inefficient per-row queries; paginate or aggregate data server-side where practical.

## 4. Orders

Create a usable orders table with order identifier, customer, date, items, quantities, total, payment method/status, order status, shipping details, and actions. Add server-side search, sorting, pagination, date filtering, and status filtering as supported by the data model.

Provide an order detail view with customer and item details, authoritative totals, payment information, shipping information, and status history. Validate all mutations on the server; never trust prices, totals, customer IDs, roles, or status values supplied by the browser.

Use the existing order status enum and workflow when available. A typical workflow is:

`pending → confirmed → processing → shipped → delivered`

Support cancellation only when permitted by defined rules. Reject invalid transitions on the server. Save changes to Supabase and record an audit/history entry containing the previous and new status, timestamp, and acting administrator. Do not silently invent transitions or overwrite unrelated order data.

## 5. Payments

Add payment management only to the extent supported by existing payment data and integrations. Show order, customer, amount, method, status, reference, and payment date when available.

- Keep payment status independent from fulfillment status. Shipping or delivery must never automatically mark an order paid.
- For online payments, accept paid status only from trusted provider-side verification or a verified webhook. A customer click or uploaded screenshot is not proof of payment.
- For cash on delivery, distinguish payment due from payment collected when the schema supports it.
- Permit manual payment confirmation only for authorized administrators under clear rules, with an audit record.
- Never store card numbers, CVVs, passwords, or other payment credentials.
- If no payment provider is configured, report the limitation and identify the integration/configuration needed; do not simulate successful payments.

## 6. Shipping and tracking

Allow authorized staff to manage eligible shipments using the fields and workflow the project supports: packed/ready, courier, tracking number, shipment date, delivery confirmation, and shipment history. Validate eligibility on the server.

Show current status, courier, tracking number, and order history to the correct customer. Do not claim live courier tracking unless a real courier API is configured; manual tracking updates are acceptable and must be labeled accurately.

## 7. Customer notifications

When an order status changes, create one in-app notification for the correct customer, including relevant tracking information when available. Make notification creation safe against duplicate events on retries. Customers must only read their own notifications.

Send email only through an already configured server-side email service. Report missing configuration accurately; never claim an email was sent when delivery was not accepted. Keep notification failures from silently undoing an otherwise successful, audited order update.

## 8. Customer management

Allow admins to search and view customers, registration dates, account status, order history, order counts, and spending totals when those values can be calculated reliably. Do not expose passwords, OTP codes, authentication tokens, or unnecessary sensitive data. Account disable/reactivate actions are optional and must be implemented only if supported by the current auth/data model, with server authorization and an audit trail.

## 9. Database changes and RLS

Inspect the actual database schema before proposing changes. Reuse existing tables and enums, including `profiles`, `orders`, `order_items`, `app_role`, `order_status`, `payment_status`, and existing product, inventory, or notification structures where present. Do not assume a table exists based only on its name in this prompt.

If changes are required, add safe, idempotent SQL migrations with appropriate indexes, constraints, foreign keys, and rollback considerations. Add order history, shipment, notification, or payment-reference structures only when existing data cannot support the required behavior.

Review and implement RLS policies so that:

- Customers can access only their own permitted records.
- Customers cannot assign themselves administrative roles or mutate protected order/payment fields.
- Unauthenticated users cannot access private customer or admin data.
- Admin operations are performed through correctly authorized server-side paths, with least privilege.

Do not weaken existing security policies to make a feature work. Keep the service-role credential server-only and follow the repository's existing Supabase client conventions.

## 10. Validation and reliability

- Validate request bodies and query parameters with the project's existing validation library, if available.
- Handle errors without leaking secrets, tokens, stack traces, or private customer data.
- Add audit records for important administrator actions.
- Make mutations safe against accidental duplicate submissions and retries where practical.
- Keep types, database constraints, and UI behavior consistent.
- Do not add fake authentication, demo admin credentials, mocked production data, or nonfunctional controls.

## 11. Verification

After implementation, run the project's relevant lint, type-check, and build commands if available. Add or run tests only when requested by the project owner. Verify the following flows using an appropriate safe environment and test accounts:

1. A customer can sign up through the existing email-verification flow and log in normally.
2. A customer cannot access admin pages, admin APIs, or another customer's records.
3. The provisioned administrator can sign in separately and access authorized admin features.
4. New customer accounts do not become administrators.
5. Real orders, products, and customer data appear in admin views without fabricated values.
6. Permitted status changes persist, invalid transitions are rejected, and audit history identifies the acting admin.
7. Customers see only their own updated order status, tracking, and notifications.
8. Payment and shipping statuses remain separate; online payments are not marked paid without trusted confirmation.
9. Existing customer shopping, checkout, account, OTP verification, and login behavior still works.

Do not use production customer data to simulate tests or make destructive changes. If a provider, database permission, or test environment is unavailable, state exactly what could not be verified and why.

## Completion report

At the end, summarize:

- Files created or changed
- Migrations added and how to apply them
- Required environment variables and external service setup, without revealing their values
- Secure first-admin provisioning steps
- Commands run and verification results
- Any limitations that remain because of unavailable providers, credentials, permissions, or test data

The result must be a real, secure admin system that manages the same Elijah Clothing Shop data as the customer site, while keeping customer and administrator access properly separated.
