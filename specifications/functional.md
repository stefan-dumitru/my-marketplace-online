# Functional Specification

## Product Overview

- What is this app, in 2-3 sentences: A multi-vendor online marketplace modeled on emag.ro.
  Independent third-party sellers list and sell products directly to consumers through a single
  platform, rather than each running their own storefront.
- Who is it for: Buyers (browse/purchase across categories and sellers), sellers (list products,
  fulfill their own orders), and a platform admin (oversees sellers, catalog, and orders
  platform-wide). Solo portfolio/learning project, not a production business at launch.
- Core problem it solves / why it needs to exist: Lets many independent sellers reach buyers
  through one shared catalog/checkout instead of each needing their own site — the standard
  multi-vendor marketplace model.
- Explicit scope boundary — see `Non-Goals` below (carried over from
  [first-prompt.md](first-prompt.md)): no real payments, no payouts/commission, web only, single
  language, no real carrier integration, no live chat/support ticketing, no B2B/bulk ordering, no
  coupons/discounts, no automated moderation, single stock quantity per product (no
  multi-warehouse), no social login, no admin financial exports.

## Authentication & Identity Source

- Does this app handle its own login, or does it receive an already-authenticated identity from
  an external system (SSO, an internal identity/auth service, another app)? This app handles its
  own login (email/password, in-app sign-up) — no external SSO or identity provider.
- If external: N/A.
- Admin accounts are **not** created through public sign-up *(assumed default — adjust if
  needed)*. There's no public "become an admin" flow; the first admin is provisioned directly
  (e.g. a seed script / manual DB insert), and any further admins are created by an existing
  admin. This avoids an admin-escalation endpoint that would otherwise need its own threat model.

## User Roles

| Role | Description | Can do | Cannot do |
|---|---|---|---|
| Guest | Unauthenticated visitor | Browse/search the full public catalog, view product detail pages | Cart, checkout, review, access any role dashboard |
| Buyer | Any signed-up account, by default | Maintain a cart (multi-seller), check out, view own order history, leave reviews on delivered purchases, manage own profile/addresses | See other buyers' data, access seller/admin screens |
| Seller | A buyer account with an **approved** seller application | Everything a buyer can do, plus: manage own product listings, view/fulfill orders containing their own products, view own sales stats | See another seller's inventory, orders, or sales figures |
| Admin | Platform operator, provisioned directly (see above) | Approve/reject/suspend sellers, manage category tree, moderate any listing, view/manage all orders and sellers, view platform-wide stats | — (sees/manages everything) |

Note: seller status is an *addition* to a buyer account, not a separate account type — the same
person keeps their buyer capabilities (cart, own orders, own reviews) after becoming a seller.
This is modeled in `data-model.md` as a `SellerProfile` linked to a `User`, not a separate user
table.

Dashboards with aggregate stats, scoped per role:

- **Buyer:** a small summary on their account home (e.g. count of orders currently in progress),
  in addition to the full order history list.
- **Seller:** own sales stats — orders, revenue, top products (on-screen only, see Reporting
  below).
- **Admin:** platform-wide aggregate stats (on-screen only).

## Notifications

Email notifications are sent for key events, delivered synchronously and best-effort (see
`operations.md` > External Integrations — if sending fails, it's logged but never blocks the
underlying action, e.g. an order still succeeds even if its confirmation email doesn't send).

- Recipients and triggers:
  - **Buyer:** order placed (per seller-order), order status change (shipped / delivered /
    cancelled).
  - **Seller:** seller application approved / rejected; new order received.
  - No notifications to parties outside the app's own logged-in users (no partner orgs, no
    regulators) — this section's original gate ("sends messages to someone outside its own
    logged-in users") doesn't fire; email is just the delivery channel to our own users.
- Email provider: **[TODO]** — not yet chosen (e.g. Resend, SendGrid, SMTP via the host). Decide
  during the notifications feature's Plan Mode; this is a new dependency, so name it and confirm
  before adding it per `CLAUDE.md` > "No new dependencies without asking first."
- Template variation: content varies by event type, not by recipient identity — one template per
  event.

## Search & Reporting

- What's searchable, on which entities, and by which fields? Product catalog, filterable/
  searchable by: product name/description (text), category, seller, price range.
- Exact match, prefix, or fuzzy/full-text? Simple prefix/substring match (SQL `ILIKE`) — no
  search-engine dependency needed at this scale.
- What reports or exports does each role need, in what format? On-screen only for v1 — seller
  sales stats and admin platform stats are tables/numbers in the dashboard, no CSV/PDF export.
- Do any reports need aggregated/denormalized data the transactional model won't answer
  efficiently? Not expected at this scale — seller/admin stats are computed on read (aggregate
  queries over `Order`/`OrderLine`), no denormalized reporting tables needed for v1.

## Use Cases

### Checkout

- **Role(s):** Buyer
- **Trigger:** Buyer clicks "checkout" from their cart (cart may contain items from multiple
  sellers).
- **Main flow:**
  1. For each distinct seller represented in the cart, create one `Order` containing only that
     seller's line items (an order never spans more than one seller).
  2. For each line item, atomically re-check and decrement stock (`UPDATE ... WHERE stock >=
     qty`, see `operations.md` > Concurrency) inside that order's transaction.
  3. Snapshot the shipping address and each product's name/price onto the order/order lines at
     this moment (see `data-model.md` — orders never depend on live product/address data later).
  4. Clear the successfully-ordered items from the cart. Send an order-placed email per
     seller-order.
- **Rules & edge cases:**
  - If a line item's stock is no longer sufficient at checkout time, that item is dropped from
    the checkout (not ordered) and the buyer is shown which item(s) were skipped and why; every
    other seller's order still goes through (partial success, not all-or-nothing).
  - Each seller-order's creation + stock decrement is one DB transaction — either that whole
    seller-order is created correctly or none of it is; other sellers' orders are unaffected
    either way.
  - Double-submitted checkout (e.g. double-click) must not create duplicate orders — client
    disables the checkout control while in flight, and the server treats an already-emptied cart
    as nothing-to-checkout.
  - No self-service cancellation exists in v1 (see below) — a buyer who checks out by mistake
    needs the seller or admin to cancel it.

### Cancel / Fulfill an Order

- **Role(s):** Seller (fulfillment), Admin (override); no buyer self-cancel in v1.
- **Trigger:** Seller updates the fulfillment status of an order containing their products; or
  admin intervenes on a dispute.
- **Main flow:** Order status moves `Placed → Shipped → Delivered`, or to `Cancelled` from
  `Placed`/`Shipped`. Every transition is recorded in `OrderStatusHistory` (who changed it, from
  what, to what, when) and triggers a status-change email to the buyer.
- **Rules & edge cases:**
  - Buyers cannot cancel an order themselves in v1 — a mistaken order needs seller or admin
    action. *(Revisit if this turns out to be a common support burden.)*
  - Only the seller who owns the order (or an admin) may change its status.
  - `Delivered` and `Cancelled` are terminal — no further transitions once reached.

### Leave a Product Review

- **Role(s):** Buyer
- **Trigger:** Buyer opens a product they've purchased.
- **Main flow:** The review option appears once at least one of the buyer's orders for that
  product has reached `Delivered`. Buyer submits a rating + comment; it's stored against
  `(product, buyer)`.
- **Rules & edge cases:**
  - One review per product per buyer, ever — a second purchase of the same product doesn't grant
    a second review slot; editing their existing review is how they'd update it.
  - The buyer may edit or delete their own review at any time.
  - No review is possible before any order for that product reaches `Delivered`.

### Apply to Become a Seller

- **Role(s):** Buyer (applicant), Admin (decision)
- **Trigger:** Buyer submits a seller application from their account.
- **Main flow:** Application is created with status `Pending`. Admin reviews it and sets status
  to `Approved` or `Rejected` (with an optional reason). Approval creates/activates the
  `SellerProfile`, unlocking seller screens; rejection emails the buyer with the reason if given.
- **Rules & edge cases:**
  - *Assumed default — adjust if needed:* a rejected applicant may reapply at any time (no
    cooldown, no permanent ban) — resubmitting resets the application to `Pending`. This is a
    business rule enforced in application code, not a schema constraint, so it's cheap to
    tighten later if it turns out to need a cooldown.
  - Every approve/reject/suspend decision is logged (`SellerActionLog`) with the admin, reason,
    and timestamp (see `security.md` > Audit / Logging).

### Suspend a Seller

- **Role(s):** Admin
- **Trigger:** Admin suspends a seller (policy violation, dispute, etc.).
- **Main flow:** `SellerProfile.status → Suspended`. All of that seller's active product listings
  are automatically deactivated (hidden from the public catalog) as part of the same action.
- **Rules & edge cases:**
  - Existing orders already placed against that seller are **not** affected — they still get
    fulfilled/tracked normally; suspension only blocks new listings/sales going forward.
  - A suspended seller can be reinstated by an admin, which does **not** automatically
    reactivate their listings — the seller has to reactivate each one themselves (avoids
    silently re-publishing something that was suspended for a reason).

### Moderate a Product Listing

- **Role(s):** Admin
- **Trigger:** Admin removes or suspends a single listing that violates policy (independent of
  its seller's standing).
- **Main flow:** Listing's moderation status changes; it disappears from the public catalog.
  Logged to `ProductModerationLog` (admin, reason, timestamp).
- **Rules & edge cases:**
  - Any pending/unfulfilled orders that already contain this listing are unaffected — moderation
    only blocks *new* purchases, existing orders still get fulfilled.
