# Data Model

## Master Data vs. Transactional Data

- **Master data:** `User`, `SellerProfile`, `Address`, `Category`, `Product`, `ProductImage`.
- **Transactional data:** `CartItem` (current-state, not append-only, but not master data
  either), `Order`, `OrderLine`, `OrderStatusHistory`, `Review`, `SellerActionLog`,
  `ProductModerationLog`, `LoginAttempt`.

## Entities

### User — Master

- **Purpose:** One account per person. Every account can act as a buyer; seller capability is
  granted via an attached `SellerProfile`, not a separate account type. Admin is a flag, not a
  role a user can request (see `functional.md` > Authentication).
- **Key fields:** `id`, `email` (unique), `password_hash`, `full_name`, `is_admin` (bool),
  `is_active` (bool — false once the account is deactivated/deleted), `created_at`,
  `anonymized_at` (nullable — set when the account is deleted, see Data Retention below).
- **Relationships:** has one optional `SellerProfile`; has many `Address`, `CartItem`, `Order`
  (as buyer), `Review`.
- **Lifecycle:** created via sign-up. Profile fields are editable by the owner. Never hard-deleted
  (see Data Retention) — "deleting an account" anonymizes it instead.
- **Delete/cascade semantics:** account deletion is a soft/anonymize operation, not a row delete
  — see Data Retention. Nothing cascades on it because nothing is actually removed.
- **Constraints / invariants:** `email` unique across all accounts, including anonymized ones
  (an anonymized account's email is scrubbed, freeing it for reuse).

### SellerProfile — Master

- **Purpose:** Seller-specific data and approval status, attached to a `User`.
- **Key fields:** `id`, `user_id` (FK, unique — one seller profile per user), `business_name`,
  `status` (`pending` / `approved` / `rejected` / `suspended`), `submitted_at`, `decided_at`
  (nullable), `decided_by` (FK to admin `User`, nullable).
- **Relationships:** belongs to one `User`; has many `Product`; has many `SellerActionLog`
  entries.
- **Lifecycle:** created when a buyer applies (`status=pending`). Admin transitions it to
  `approved`/`rejected`; a rejected applicant may resubmit, resetting it to `pending` (see
  `functional.md`). An approved seller can later be moved to `suspended` and back.
- **Delete/cascade semantics:** never hard-deleted. `suspended` cascades to deactivating all of
  that seller's `Product` rows (see Use Case). Reinstating from `suspended` does **not**
  reactivate products.
- **Constraints / invariants:** only one profile per user; only `approved` sellers can create/
  edit active listings.

### Address — Master

- **Purpose:** A buyer's shipping address. A buyer may have several.
- **Key fields:** `id`, `user_id` (FK), `label`, `recipient_name`, `street`, `city`, `region`,
  `postal_code`, `country`, `is_default` (bool), `created_at`.
- **Relationships:** belongs to one `User`.
- **Lifecycle:** created/edited/deleted freely by its owner.
- **Delete/cascade semantics:** deletable even if past orders were shipped to it, because
  `Order` stores its own **snapshot** of the address at checkout time (see `Order` below) — the
  live `Address` row is never referenced by a historical order.
- **Constraints / invariants:** at most one `is_default = true` per user (app-enforced).

### Category — Master

- **Purpose:** The category tree buyers browse and sellers assign products to.
- **Key fields:** `id`, `parent_id` (FK to `Category`, nullable — self-referential tree), `name`,
  `slug`, `created_at`.
- **Relationships:** self-referential parent/children; has many `Product`.
- **Lifecycle:** created/edited by admin only.
- **Delete/cascade semantics:** **blocked** — a category cannot be deleted while any `Product`
  (in it or in any descendant category) still references it. Admin must reassign or deactivate
  those products first.
- **Constraints / invariants:** no cycles in the parent/child tree.

### Product — Master

- **Purpose:** A single seller's listing for one item.
- **Key fields:** `id`, `seller_id` (FK to `SellerProfile`), `category_id` (FK), `name`,
  `description`, `price` (decimal), `stock_quantity` (int, ≥ 0), `is_active` (bool — seller-
  controlled activate/deactivate), `moderation_status` (`active` / `removed_by_admin` /
  `suspended_by_admin`), `created_at`, `updated_at`.
- **Relationships:** belongs to one `SellerProfile` and one `Category`; has many `ProductImage`,
  `OrderLine`, `Review`, `CartItem`.
- **Lifecycle:** created/edited by its owning seller. Visible in the public catalog only when
  `is_active = true` **and** `moderation_status = active` **and** the seller's status is
  `approved`.
- **Delete/cascade semantics:** products are **deactivated**, not hard-deleted, once any order
  has ever referenced them (an `OrderLine` snapshot keeps history intact regardless, but keeping
  the `Product` row avoids orphaning `ProductImage`/`Review` rows that point at it). A product
  with zero orders and zero reviews may be hard-deleted by its seller.
- **Constraints / invariants:** `stock_quantity >= 0`; only the owning `SellerProfile` may edit
  it; edits by a non-owner are blocked at the authorization layer (see `security.md`).

### ProductImage — Master

- **Purpose:** One uploaded image for a product.
- **Key fields:** `id`, `product_id` (FK), `storage_key` (the R2 object key generated by the app
  — never the uploaded filename, see `security.md` > File Upload Handling), `original_filename`
  (display metadata only), `display_order` (int), `uploaded_at`.
- **Relationships:** belongs to one `Product`.
- **Lifecycle:** created/deleted by the owning seller.
- **Delete/cascade semantics:** deleted along with its `Product` when the product is hard-deleted
  (also delete the underlying R2 object); otherwise deletable independently.

### CartItem — Transactional (current-state)

- **Purpose:** A buyer's current, unpurchased cart contents. Not a historical record — it's
  mutated/cleared, not append-only.
- **Key fields:** `id`, `user_id` (FK), `product_id` (FK), `quantity`, `added_at`.
- **Relationships:** belongs to one `User` and one `Product`.
- **Lifecycle:** created on add-to-cart, updated on quantity change, deleted on remove or on
  successful checkout of that item.
- **Delete/cascade semantics:** if the referenced `Product` is deactivated/deleted while still in
  someone's cart, the cart simply shows it as unavailable at checkout time (price/stock are
  always read live from `Product`, never cached on `CartItem` — see `functional.md` > cart
  pricing decision).
- **Constraints / invariants:** unique `(user_id, product_id)` — adding the same product again
  increments quantity rather than creating a second row.

### Order — Transactional

- **Purpose:** One seller's portion of a checkout. An order always belongs to exactly one buyer
  and exactly one seller (checkout splits a multi-seller cart into one `Order` per seller).
- **Key fields:** `id`, `buyer_id` (FK to `User`), `seller_id` (FK to `SellerProfile`), `status`
  (`placed` / `shipped` / `delivered` / `cancelled`), `placed_at`, `shipped_at` (nullable),
  `delivered_at` (nullable), `cancelled_at` (nullable), `total_amount`, and a **snapshotted**
  shipping address: `ship_recipient_name`, `ship_street`, `ship_city`, `ship_region`,
  `ship_postal_code`, `ship_country`.
- **Relationships:** belongs to one `User` (buyer) and one `SellerProfile`; has many `OrderLine`,
  `OrderStatusHistory`.
- **Lifecycle:** created at checkout (see Use Case). Never edited except via status transitions;
  never deleted.
- **Delete/cascade semantics:** never deleted. Fully independent of the live `Address`/`User`
  rows after creation, thanks to the snapshot fields above.
- **Constraints / invariants:** `status` transitions only `placed → shipped → delivered` or
  `placed/shipped → cancelled`; `delivered`/`cancelled` are terminal.
- **Status change timestamps:** yes — `placed_at`/`shipped_at`/`delivered_at`/`cancelled_at`,
  plus the full transition log in `OrderStatusHistory`.

### OrderLine — Transactional

- **Purpose:** One product line within an `Order`, with its own price/name snapshot so the order
  never depends on the live `Product` row.
- **Key fields:** `id`, `order_id` (FK), `product_id` (FK, kept for traceability but never relied
  on for display), `product_name_snapshot`, `unit_price_snapshot`, `quantity`, `line_total`.
- **Relationships:** belongs to one `Order`; references one `Product`.
- **Lifecycle:** created at checkout, never edited or deleted.
- **Delete/cascade semantics:** none — immutable once created.

### OrderStatusHistory — Transactional (audit)

- **Purpose:** Full audit trail of every order status transition.
- **Key fields:** `id`, `order_id` (FK), `from_status`, `to_status`, `changed_by` (FK to `User`,
  nullable for a system-triggered change), `changed_at`, `note` (nullable).
- **Relationships:** belongs to one `Order`.
- **Lifecycle:** append-only — one row per transition, never edited or deleted.

### Review — Master (user-generated content)

- **Purpose:** A buyer's rating/comment on a product, tied to a delivered purchase.
- **Key fields:** `id`, `product_id` (FK), `buyer_id` (FK), `order_id` (FK — the delivered order
  that justified this review), `rating` (1-5), `comment`, `created_at`, `updated_at`.
- **Relationships:** belongs to one `Product`, one `User` (buyer), one `Order`.
- **Lifecycle:** created once the buyer has a `delivered` order for that product; freely
  editable/deletable by its author afterward.
- **Delete/cascade semantics:** deleting the `Order` never happens (orders are immutable/
  permanent), so this isn't a live concern; deleting the `Product` follows `Product`'s own
  deactivate-not-delete rule above, which keeps the review intact.
- **Constraints / invariants:** unique `(product_id, buyer_id)` — one review per product per
  buyer, ever.

### SellerActionLog — Transactional (audit)

- **Purpose:** Every admin decision on a seller (approve / reject / suspend / reinstate).
- **Key fields:** `id`, `seller_profile_id` (FK), `admin_id` (FK to `User`), `action`, `reason`
  (nullable), `created_at`.
- **Relationships:** belongs to one `SellerProfile`.
- **Lifecycle:** append-only.

### ProductModerationLog — Transactional (audit)

- **Purpose:** Every admin moderation action on a listing.
- **Key fields:** `id`, `product_id` (FK), `admin_id` (FK), `action` (`removed` / `suspended` /
  `reinstated`), `reason` (nullable), `created_at`.
- **Relationships:** belongs to one `Product`.
- **Lifecycle:** append-only.

### LoginAttempt — Transactional (audit/security log)

- **Purpose:** Record of login attempts, for spotting account-takeover attempts.
- **Key fields:** `id`, `email_attempted`, `user_id` (FK, nullable if the email didn't match any
  account), `success` (bool), `ip_address`, `attempted_at`.
- **Relationships:** optionally references one `User`.
- **Lifecycle:** append-only.

---

## Change Auditing

- **Full history needed:** `Order` status transitions (`OrderStatusHistory`), product moderation
  actions (`ProductModerationLog`), admin actions on sellers (`SellerActionLog`), login attempts
  (`LoginAttempt`).
- **Not needed:** seller-application status itself doesn't need a separate versioned history
  beyond `SellerActionLog` (which already captures every transition with who/when/why); product
  field edits (name/price/stock) don't need a change history for v1 — current-state is enough.
- Mechanism: dedicated audit-log entities per the list above (not per-record versioning) — each
  is independently queryable, which fits "what did admin X do" / "what happened to order Y"
  questions better than a generic version table would.

## Bulk Operations

N/A — this app has no file-import or bulk-update feature in v1 (no CSV import, no bulk sync).
Explicitly out of scope, not an oversight.

## Relationships Overview

- `User` 1—0/1 `SellerProfile`
- `User` 1—* `Address`, `CartItem`, `Order` (as buyer), `Review`
- `SellerProfile` 1—* `Product`, `Order` (as seller), `SellerActionLog`
- `Category` 1—* `Category` (self, tree) and 1—* `Product`
- `Product` 1—* `ProductImage`, `OrderLine`, `Review`, `CartItem`; 1—* `ProductModerationLog`
- `Order` 1—* `OrderLine`, `OrderStatusHistory`

## Data Retention / Archival

- **None for v1** — nothing is purged or expired; explicit decision, not an oversight (portfolio
  project, keep everything indefinitely).
- The one exception is account deletion, which is handled as **anonymization, not erasure**: on
  delete, `User.email`/`full_name` are scrubbed and `anonymized_at` is set, but the row (and any
  `Order`/`Review` history involving them) stays — a seller still sees that an order happened,
  reviews stay attached to the product, but the personal data behind them is gone. See
  `security.md` > Data Sensitivity.
