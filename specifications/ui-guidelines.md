# UI / Design Guidelines

## Design System

- Component library / design system: **Tailwind CSS v4 + shadcn/ui** (revised from the earlier
  "no third-party UI kit" decision, once the plain-CSS scaffold needed a real visual pass).
  shadcn/ui components are copied into the repo under `frontend/src/components/ui/` as editable
  source (Radix UI primitives underneath), not pulled in as an opaque dependency — this keeps the
  original goal of beginner-readable styling code intact while getting a more polished look than
  hand-rolled CSS gave in reasonable time. Shared, non-shadcn layout pieces (e.g. the site header/
  nav) live under `frontend/src/components/layout/`.
- Brand colors / typography: shadcn's default neutral palette (light + dark CSS variables in
  `frontend/src/index.css`), system font stack. No custom brand palette chosen yet — revisit if/
  when one is wanted.
- Light/dark mode: both supported.
- Responsive targets: desktop-first, mobile best-effort — mobile must not be broken, but layout
  decisions optimize for desktop/laptop browsing first.
- Exact breakpoints *(assumed default — adjust if needed)*: single breakpoint at `768px`. Below
  it, navigation collapses behind a hamburger menu and multi-column layouts (catalog grid,
  dashboards) stack to one column. At/above it, full nav bar and multi-column grids.
- `<select>` elements stay native HTML (styled with Tailwind classes), not swapped for shadcn's
  Radix-based `Select` — several existing tests drive dropdowns via `user-event`'s
  `selectOptions()`, which only works on real `<select>` elements.
- Component structure convention: components co-located with the page/feature that uses them
  (`pages/<page>/`), promoted to the shared `components/` folder only once reused by a second
  page.
- Browser/device support matrix *(assumed default)*: latest two versions of evergreen browsers
  (Chrome, Firefox, Safari, Edge); no legacy browser support.

## Information Architecture

- Top-level navigation structure:
  - **Guest / Buyer:** Home/Catalog, Category browse, Search, Cart, Account (Orders, Profile,
    Addresses) — Account requires login.
  - **Seller** (in addition to the buyer nav above, since a seller is still a buyer account):
    Seller Dashboard — My Products, My Orders, Sales Stats.
  - **Admin:** Admin Dashboard — Sellers (approve/reject/suspend), Categories, Listing
    Moderation, All Orders, Platform Stats.
- How roles map to nav: nav items for Seller Dashboard only render once `SellerProfile.status =
  approved`; Admin Dashboard only renders for `User.is_admin`. A guest sees the buyer nav minus
  Cart/Account, and is redirected to login when attempting either.

## Key Flows

- **Sign-up → become a seller:** buyer signs up → applies for seller status → waits for admin
  decision → (if approved) seller nav appears.
- **Checkout:** multi-seller cart → review per-seller split → confirm → per-seller orders created
  (see `functional.md` > Checkout for the partial-success/stock-race behavior this flow must
  surface to the buyer).
- **Admin seller approval:** application queue → review → approve/reject with optional reason →
  applicant notified by email.
- **Order fulfillment:** seller's order list → update status per order → buyer notified by email
  on each change.
- **Review:** product page (only once a `delivered` order exists for it) → rating + comment →
  editable/deletable later from the buyer's own order/product view.

## Accessibility

- Target conformance level: best-effort — no formal WCAG audit, but reasonable semantic HTML and
  keyboard-navigable flows throughout.
- Anything specific: none beyond best-effort semantic HTML/keyboard nav.
- Minimum touch target size *(assumed default)*: 44×44px minimum, 8px minimum gap between
  interactive elements, for any touch-usable control.

## Feedback & Error States

*(All of this section is a proposed convention — reasonable defaults, not asked for explicitly;
adjust anything that doesn't fit once real screens exist.)*

- Error message convention: network/server errors → toast ("Something went wrong, try again");
  field-level validation errors → inline message under the field; authorization errors (403) →
  a full-page/banner "You don't have permission to view this" rather than a silent redirect.
- Success/confirmation convention: quick actions (added to cart, review saved) → toast; consequential
  actions (order placed, seller application submitted) → a dedicated confirmation
  screen/banner, not just a toast that can be missed.
- Loading-state convention: buttons that trigger an async action disable themselves and show an
  inline spinner while in flight; list/page loads show a skeleton rather than a blank screen.
- Empty-state convention: every list shows a message plus a role-appropriate next action instead
  of just "no results" — e.g. buyer with no orders sees "Browse the catalog"; seller with no
  products sees "Add your first product."
- Client vs. server validation: client validates for immediate feedback (required fields,
  format); the server re-validates everything authoritatively regardless of what the client
  checked (see `CLAUDE.md` > Security Baseline) — the server is the single source of truth, the
  client copy is a convenience, not a second implementation to keep in sync by hand.
- Session-expiry behavior: an expired session redirects to login with a return-to path; forms
  don't guarantee unsaved input survives the round trip, so consequential forms (checkout,
  product edit) should warn before navigating away rather than relying on recovery after expiry.

## Localization & Formatting

- Languages supported now: Romanian *(assumed default — adjust if this should be English)*,
  matching the RON currency/Romanian formatting decision below and the emag.ro reference model;
  single language, no i18n framework for v1 (see `functional.md` > Non-Goals).
- Date, number, and currency formatting: Romanian convention — `1.234,56 lei` (period as
  thousands separator, comma as decimal separator, currency suffix).
- Time zone handling for display *(assumed default)*: fixed to `Europe/Bucharest` rather than
  each user's detected local time zone — simplest choice for a single-country app; storage stays
  UTC per `CLAUDE.md` > Code Style.
- RTL layout support: not needed — Romanian is left-to-right.

## Per-Screen Specification Files

None yet — no screen has been identified as complex enough to warrant its own file under
`specifications/pages/`. Revisit once checkout or the seller/admin dashboards are being built if
Plan Mode alone starts missing details.
