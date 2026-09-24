# Operations & Runtime Requirements

## Availability & Recovery

This app will be deployed (Railway), but treated as best-effort — a portfolio project, not a
business with paying customers depending on uptime.

- Uptime/availability target: best-effort, no formal SLA.
- Acceptable planned-maintenance downtime: any time, no restriction.
- Backup frequency / RPO: relies on Railway's managed Postgres default backups; no additional
  application-level backup policy for v1.
- RTO / restore testing: **[TODO]** — no restore has been tested. Flagged explicitly per this
  file's own warning ("an untested backup is not a backup") rather than left silently assumed
  fine.

## Observability

- Structured application logging: JSON structured logs, written to stdout (Railway captures
  stdout/stderr for its logs view) — chosen over plain-text logging since it's already deployed
  and searchable structured logs cost little extra to set up now.
- Health check endpoint: `GET /health` — verifies both process-alive and DB-reachable (a bare
  "process is up" check wouldn't catch a DB connection failure, which is the more likely failure
  mode here).
- Metrics worth tracking / alerting: **[TODO]** — not decided. Given the best-effort availability
  posture above, this may reasonably stay unanswered for v1; revisit only if this ever needs to
  actually page someone.
- Fields redacted in operational logs: `password_hash`, session cookie/token values, full address
  fields — log a user ID instead of PII (see `security.md` > Data Protection).

## Environments & Configuration

- Environments: local (development) + production (Railway) only — no staging environment.
- Config/secrets per environment: environment variables, differing per environment per
  `CLAUDE.md` > Security Baseline (`.env` locally, Railway's environment variable store in
  production — never committed).
- Release/rollback: **[TODO]** — not decided; Railway supports redeploying a previous build,
  which is likely sufficient, but the exact process hasn't been settled.

## Database Migrations

- Schema changes ship via a maintenance-window/just-rerun-migrations approach — no zero-downtime
  (expand/contract) discipline required at this scale. Brief downtime during a migration is
  acceptable.
- Migration tool: Alembic (paired with SQLAlchemy, see `CLAUDE.md` > Stack).
- Reversibility: **[TODO]** — not explicitly decided; a reasonable practice is writing a `down`
  migration whenever one is straightforward, but this hasn't been committed to as a hard rule.
- Large-table backfills: not expected to be a concern at this data volume; no specific handling
  designed.

## Background Jobs & Queues

N/A for v1 — this app has no work that runs outside a request. Email notifications are sent
synchronously and best-effort during the request itself (see External Integrations below and
`functional.md` > Notifications), not queued. No queue infrastructure (Celery/RQ/etc.) is part of
this stack. Revisit if email volume or reliability ever makes synchronous sending a problem.

## External Integrations

- **Cloudflare R2** (product image storage): if unreachable, product create/edit that includes an
  image upload fails with a clear error asking the seller to retry *(assumed default)* — the
  image is part of the create action, so a partial success (product without its image) isn't
  created silently.
- **Email provider:** **[TODO]** — not yet chosen (see `functional.md` > Notifications; this is a
  new dependency to confirm before adding, per `CLAUDE.md`). If sending fails, it's logged but
  never blocks the underlying action (an order still succeeds even if its confirmation email
  doesn't send) — this part is decided regardless of which provider is picked.
- Timeout/retry policy per integration: **[TODO]** — not decided; needs a bounded timeout at
  minimum per `CLAUDE.md`'s general expectations, exact numbers TBD.
- Circuit breaker / graceful degradation: **[TODO]** — not decided; likely unnecessary at this
  scale given both integrations are best-effort/non-blocking already.
- Failure surfacing: R2 failures surface to the user immediately (see above); email failures
  never surface to the user at all — they're purely logged server-side.

## Concurrency & Write Correctness

- **Stock race** (two buyers competing for the last unit): handled with a DB-level atomic
  decrement — the checkout transaction updates `Product.stock_quantity` with a conditional
  `WHERE stock_quantity >= quantity`, so the second buyer's write simply affects zero rows and
  that line item is treated as out-of-stock (see `functional.md` > Checkout). No optimistic-
  locking version column needed for this case.
- **Product edits** (seller editing their own listing): *(assumed default)* last-write-wins, no
  version column — a product has exactly one owning seller, so genuinely concurrent conflicting
  edits are unlikely; revisit only if that assumption turns out wrong.
- **Idempotency:** the checkout endpoint is the main concern — a double-submitted checkout must
  not create duplicate orders. Handled by disabling the checkout control client-side while in
  flight, plus the server treating an already-emptied cart as nothing left to check out (see
  `functional.md` > Checkout). No webhook redelivery concern exists (no real payment gateway).
- **Transaction boundaries:** each seller-order's creation + its line items' stock decrements are
  one all-or-nothing DB transaction; other sellers' orders in the same checkout are independent
  and unaffected if one fails.
- **Known race conditions:** the stock race above is the only one identified; two admins acting
  on the same seller application/listing simultaneously is a theoretical last-write-wins
  scenario *(assumed default)*, not expected to matter in practice given a single-admin project.

## Scalability Constraints

- **Statelessness:** sessions must not be held in local app-instance memory if this ever runs on
  more than one instance — store them in the database (a sessions table) or a shared store
  rather than in-process. At current single-instance/portfolio scale this isn't yet a hard
  requirement, but the app shouldn't be built in a way that assumes one instance forever.
- What breaks first as load grows: the single Postgres instance / connection pool, well before
  anything else, at this scale.
- Database connection pool sizing: **[TODO]** — not decided; use the ORM's (SQLAlchemy's)
  reasonable defaults until there's a real reason to tune it.

## Query Efficiency

- N+1 prevention: SQLAlchemy eager-loading (`joinedload`/`selectinload`) is the convention for
  any endpoint that returns a list with related data (e.g. products with their images, orders
  with their lines) — reviewed per list endpoint during that feature's Plan Mode rather than
  caught later.
- Unbounded queries: every list endpoint is paginated (see `performance.md`), including internal/
  admin ones.
- Query budget per page/endpoint: **[TODO]** — no specific number set.
- Cache invalidation: N/A — no caching exists in v1 (see `performance.md`).
