# Build Roadmap

Iterative, smallest useful slice first — not a dated/milestone plan (see `SPECS.md` > Optional
Extensions on why this template defaults to iterative). Each phase should be plannable in its own
Plan Mode session against the relevant spec file(s); don't start a phase's code until its plan is
reviewed, per `CLAUDE.md` > How We Work.

For each phase: what gets **automated tests**, and the **end-to-end check** to confirm it works
by hand.

## Phase 0 — Scaffolding

Backend (FastAPI + SQLAlchemy + Alembic) and frontend (React + Vite) skeletons; DB connection; a
`GET /health` endpoint (see `operations.md` > Observability).

- **Automated tests:** a pytest hitting `/health`, asserting `200` and a reachable-DB response.
- **End-to-end check:** run both dev servers (`CLAUDE.md` > Commands); load the frontend's
  placeholder home page; confirm `/health` returns healthy.

## Phase 1 — Auth

`User` model, sign-up, login/logout, session cookie (see `security.md` > Authentication).

- **Automated tests:** sign-up creates a user with a hashed password; login succeeds with correct
  credentials and fails with wrong ones; a session persists across requests; `LoginAttempt` rows
  are created for both outcomes.
- **End-to-end check:** sign up a new account in the browser, log out, log back in.

## Phase 2 — Public catalog (read-only)

`Category`, `Product`, `ProductImage` models; public browse/search/filter endpoints and pages;
product detail page. No login required (guest access).

- **Automated tests:** category-tree endpoint; product search/filter by name, category, seller,
  price range, each paginated (see `functional.md` > Search & Reporting).
- **End-to-end check:** as a guest, browse the catalog, search a product by name, filter by
  category and price range, open its detail page.

## Phase 3 — Seller onboarding & listing management

`SellerProfile` + application flow, minimal admin approve/reject screen, seller CRUD on own
products (create/edit/activate/deactivate, image upload to R2).

- **Automated tests:** seller-application state machine (pending → approved/rejected → reapply);
  authorization — a seller can edit only their own product, a non-owner is blocked; image upload
  authorization runs before the file is written (see `security.md` > File Upload Handling).
- **End-to-end check:** sign up, apply to become a seller, approve the application as admin,
  create a product with an image as that seller, confirm it appears in the public catalog.

## Phase 4 — Cart & checkout

`CartItem`, `Order`/`OrderLine`/`OrderStatusHistory`; multi-seller cart split into one order per
seller; atomic stock decrement; partial-success on a stock-out; snapshotting (see
`functional.md` > Checkout, `data-model.md` > `Order`/`OrderLine`).

- **Automated tests:** cart add/remove/quantity update; checkout splits a multi-seller cart into
  the correct number of orders; two concurrent checkouts for the last unit of stock — exactly one
  succeeds; a stock-out mid-checkout drops only that line item, other sellers' orders still
  complete.
- **End-to-end check:** add items from two different sellers to the cart, check out, confirm two
  separate orders appear (one per seller) in order history.

## Phase 5 — Fulfillment, order history & notifications

Seller order-status updates; buyer order history + dashboard summary; email notifications on
placed/status-change/seller-decision (email provider choice still `[TODO]`, see
`operations.md` > External Integrations).

- **Automated tests:** valid/invalid status transitions enforced (`placed → shipped → delivered`,
  `→ cancelled`, terminal states reject further transitions); only the owning seller or an admin
  can transition an order; each transition writes an `OrderStatusHistory` row.
- **End-to-end check:** as the seller, mark an order shipped then delivered; confirm the buyer's
  order history reflects each new status.

## Phase 6 — Reviews

Post-delivery review eligibility; one review per product per buyer; edit/delete by the author.

- **Automated tests:** review blocked with no `delivered` order for that product; unique
  `(product, buyer)` constraint enforced; only the author can edit/delete their review.
- **End-to-end check:** as a buyer with a delivered order, leave a review, edit it, confirm the
  update shows on the product page.

## Phase 7 — Admin oversight

Category tree management (with delete-block), listing moderation (remove/suspend + log), seller
suspension (cascading listing deactivation), platform-wide stats, all-orders/all-sellers views.

- **Automated tests:** category delete is blocked while products reference it (directly or via a
  descendant); moderation and seller-suspension actions are logged
  (`ProductModerationLog`/`SellerActionLog`); suspending a seller deactivates all their listings.
- **End-to-end check:** as admin, suspend a seller and confirm their products disappear from the
  public catalog; moderate a single listing and confirm it disappears from the catalog while a
  past order referencing it remains intact.

## Phase 8 — Buyer account polish

Multiple shipping addresses with a default, buyer dashboard summary widget, account deletion
(anonymization, see `data-model.md` > Data Retention).

- **Automated tests:** address CRUD and the "only one default address" invariant; account
  deletion scrubs PII and sets `anonymized_at` while past orders/reviews stay intact.
- **End-to-end check:** add a second address and set it default; delete the account and confirm
  login no longer works with the old email, while a seller who sold to that buyer still sees the
  historical order.
