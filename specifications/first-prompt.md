Problem & audience: A multi-vendor online marketplace modeled on emag.ro —
independent third-party sellers list and sell products directly to consumers
through a single platform, rather than each running their own storefront.
This is a solo portfolio/learning project, not a production business at
launch, so scope should favor a smaller, well-executed slice over covering
every real-world edge case. Three audiences: buyers who want to browse and
purchase products across many categories and sellers in one place; sellers
who want to list products and manage their own orders without building their
own site; and a platform admin who oversees sellers, catalog, and orders
platform-wide.

Task:

Buyer:
- Browse and search the product catalog across categories and sellers
- View product detail pages: price, images, description, seller, stock level,
  reviews/ratings
- Maintain a cart that can hold items from multiple sellers at once
- Check out — this splits into one order per seller (an order spans exactly
  one seller's line items, even if the cart had several)
- View order history and track order/fulfillment status
- Leave a review/rating on a product after purchase
- Manage own account profile and shipping address(es)

Seller:
- Apply to become a seller (requires admin approval before selling)
- Manage own product listings: create, edit, activate/deactivate, set price
  and stock quantity
- View and fulfill orders containing their own products only (update
  shipping/fulfillment status on their portion of an order)
- View own basic sales stats (orders, revenue, top products)

Admin:
- Approve or reject seller applications; suspend a seller
- Manage the category tree (master data)
- Moderate product listings (e.g. remove/suspend a listing that violates
  policy)
- View and manage all orders and all sellers platform-wide; handle disputes
- View platform-wide aggregate stats

Guest (not signed in): can browse/search the catalog and view product
details; cannot cart, check out, review, or access any role dashboard.

Roles & access:
- Guest — no account. Sees the full public catalog only.
- Buyer — signs up in-app. Sees and manages only their own cart, orders,
  reviews, and profile; cannot see other buyers' data or any seller-side
  management screens.
- Seller — signs up in-app, then applies for seller status (admin-approved).
  Sees and manages only their own products and the portion of any order that
  contains their products; cannot see another seller's inventory, orders, or
  sales figures.
- Admin — sees everything: every seller, every product, every order, across
  the whole platform.
- Authentication: this app handles its own login for buyers and sellers
  (email/password, in-app sign-up) — no external SSO or identity provider.

Stack & constraints: Open — no stack chosen yet. Leave this to the interview
pass on CLAUDE.md's Stack/Commands section rather than guessing. Hard
constraint for v1: checkout/payment must be simulated (see Non-goals) — no
real payment gateway dependency to evaluate yet.

Non-goals:
- No real payment processing or PCI-DSS scope — checkout is simulated
  (order/payment records move through normal status transitions, no real
  money moves, no real gateway integration)
- No seller payouts or commission/settlement logic — a natural next step,
  but out of scope for v1
- No native mobile apps — web only
- No multi-language/i18n support for v1 — single language
- No real shipping-carrier integration (rate calculation, live tracking) —
  fulfillment status is tracked manually by the seller, not synced with a
  real carrier
- No live chat or a customer-support ticketing system
- No B2B/wholesale/bulk-ordering flows — consumer (B2C) only
- No coupon/promotion/discount engine for v1
- No automated content moderation (image/text scanning) — moderation is
  manual, admin-driven
- No multi-warehouse inventory — one stock quantity per product per seller,
  not per location
- No social login/SSO for v1 — email/password only
- No admin-side financial/accounting exports beyond basic aggregate stats

---

Before asking me anything, read CLAUDE.md and every file in specifications/.
They tell you what needs filling in and which questions are worth asking.

Then interview me with AskUserQuestion, working through the spec files in this
order: functional.md, data-model.md, ui-guidelines.md, security.md,
performance.md, operations.md. Finish with a short pass on CLAUDE.md's Stack
and Commands — the test runner in particular, since that's a dependency you
shouldn't pick for me.

During the interview:
- Respect the gates. A section headed "Skip unless <trigger>" only applies if
  that trigger is actually true of this app. Check the trigger, and if it
  doesn't fire, skip the whole section and leave it in place unfilled — don't
  ask me its questions and don't delete it. If you can't tell whether a trigger
  fires, that one question is worth asking.
- Dig into the hard parts I probably haven't considered — concurrent writes to
  the same record, what happens to in-flight work when referenced data changes,
  delete and cascade behavior, where files are stored, how roles map onto
  accounts. The spec templates flag many of these; use them.
- Skip anything I've already answered above, and anything CLAUDE.md settles.
- "I don't know" and "no opinion" are valid answers. Record them as [TODO].
  Never invent a number, a target, or a policy on my behalf — a guess in a spec
  gets designed against, a [TODO] gets asked about.
- Batch related questions rather than asking one at a time. Aim for roughly
  6-10 rounds. Before your final round, show me a short list of what's still
  unresolved and let me decide what actually matters.

Then write the spec:
- Fill in the existing files under specifications/ in place. Don't create new
  spec files unless a feature or screen genuinely warrants one (see SPECS.md >
  Optional Extensions), and don't write a separate combined spec document.
- Fill in CLAUDE.md's Project, Stack, Commands, and Project Structure sections.
- Leave [TODO] wherever I didn't have an answer.
- Name the actual files, modules, and interfaces involved — not just concepts.
- Break the build into phases, smallest useful slice first. For each phase,
  name two things: what gets automated tests, and the end-to-end check I can
  run myself to confirm the phase works.

Then stop. Don't write application code until I've reviewed the spec and told
you to start.
