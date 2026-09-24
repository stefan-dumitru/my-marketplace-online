# Performance Requirements

## Response Time Targets

| Operation | Target (p50) | Target (p95) | Notes |
|---|---|---|---|
| Page load / initial render | [TODO] | [TODO] | No specific numbers requested — portfolio scale, standard good practice (pagination, indexing, no N+1) is the actual guard, not an SLA. |
| API read (simple) | [TODO] | [TODO] | |
| API write | [TODO] | [TODO] | |
| Catalog search/filter | [TODO] | [TODO] | Debounced client-side, see below. |

## Scale Expectations

- Expected concurrent users at launch / at 1 year: portfolio scale — single digits to low
  hundreds of concurrent users; not a business with real growth projections to design against.
- Expected data volume: low thousands of rows in the largest tables (`Product`, `Order`,
  `OrderLine`) at most; no specific growth-rate target.
- Read/write ratio: read-heavy — catalog browsing/search vastly outnumbers checkout/order writes,
  as with any e-commerce catalog.
- Known spiky load pattern: none expected at this scale.

## Constraints This Implies

- Pagination required on: catalog listing, order history (buyer and seller), product reviews
  list, admin's all-sellers/all-orders/all-listings views. Every list endpoint must have a limit
  — no unbounded queries, even internal ones.
- Caching: none for v1 — skipped deliberately rather than added prematurely; revisit if the
  category tree or catalog listing pages become an actual bottleneck.
- Background/async processing: none required for v1 beyond what's already decided — email
  notifications are sent synchronously and best-effort (see `operations.md` > External
  Integrations), not queued.
- Database indexing priorities *(derived from the query patterns above)*: foreign key columns
  (`Product.category_id`, `Product.seller_id`, `Order.buyer_id`, `Order.seller_id`,
  `OrderLine.order_id`, `CartItem.user_id`), plus an index supporting the catalog name/description
  search (e.g. a `lower(name)`/trigram index if `ILIKE` prefix search alone isn't fast enough at
  the actual data volume).
- Debounce interval for search/filter inputs *(assumed default)*: 300ms.

## Frontend Performance Budget

- Initial JS/CSS bundle size budget: [TODO — no number set; Vite's default code-splitting should
  keep this reasonable without a specific target].
- Core Web Vitals targets (LCP, INP, CLS): [TODO — not set].
- Image strategy: product images served from Cloudflare R2, lazy-loaded below the fold on catalog
  pages; no specific responsive-size/format pipeline decided yet beyond the JPEG/PNG/WebP upload
  formats in `security.md`.
- Font loading strategy: [TODO — depends on the brand/typography choice deferred in
  `ui-guidelines.md`].

## Bulk / File Operation Performance

N/A — no bulk import/export feature in this app (see `data-model.md` > Bulk Operations).
