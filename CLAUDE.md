# CLAUDE.md

Durable conventions for this project. Auto-loaded into every session, so it stays short —
anything long or feature-specific belongs in [specifications/](specifications/SPECS.md), which is
read selectively.

Sections marked `[TODO]` are filled in per project. Everything else is a default that applies
unless this file says otherwise.

---

## Project

- **What this is:** A multi-vendor online marketplace modeled on emag.ro — independent
  third-party sellers list and sell products through a single platform. Buyers browse/purchase
  across sellers, sellers manage their own listings and orders, admin oversees the platform.
  Solo portfolio/learning project — checkout/payment is simulated, no real money moves.
- **Full specification:** [specifications/SPECS.md](specifications/SPECS.md)

## Stack

- **Language / runtime:** Python 3.12+ (backend), Node.js + TypeScript (frontend tooling)
- **Frontend:** React + Vite, TypeScript
- **Backend:** FastAPI (Python), SQLAlchemy + Alembic (ORM / migrations)
- **Database:** PostgreSQL
- **Testing:** pytest (backend), Vitest + React Testing Library (frontend)
- **Object storage:** Cloudflare R2 (S3-compatible) for product images
- **Hosting:** Railway (app + managed Postgres)

## Commands

Fill these in as soon as they exist, and delete any row this project doesn't have. Use these
rather than guessing an equivalent, and tell me if one is missing instead of inventing a
workaround.

| Purpose | Command |
|---|---|
| Install dependencies | Backend: `pip install -r requirements.txt` (run inside `backend/`) · Frontend: `npm install` (run inside `frontend/`) |
| Run in development | Backend: `uvicorn app.main:app --reload` · Frontend: `npm run dev` |
| Run tests | Backend: `pytest` · Frontend: `npm test` |
| Run a single test file | Backend: `pytest path/to/test_file.py` · Frontend: `npm test -- path/to/file.test.tsx` |
| Lint / format | Backend: `ruff check .` / `black .` · Frontend: `npm run lint` / `npm run format` |
| Type check | Backend: `mypy app` · Frontend: `tsc -b` (or `npm run build`, which includes it) |
| Build for production | Frontend: `npm run build` · Backend: no build step, served directly by uvicorn/gunicorn |
| Database migration | `alembic revision --autogenerate -m "<message>"` then `alembic upgrade head` |

## Project Structure

```
my-online-marketplace/
├── backend/            # FastAPI app
│   ├── app/
│   │   ├── main.py       # app entrypoint, router registration
│   │   ├── models/       # SQLAlchemy models (one file per entity/group)
│   │   ├── schemas/      # Pydantic request/response schemas
│   │   ├── routers/      # one file per resource (products, orders, sellers, admin, auth...)
│   │   ├── services/     # business logic that doesn't belong directly on a route handler
│   │   └── deps.py       # auth/role dependency guards (require_buyer, require_seller_owns, ...)
│   ├── alembic/          # migration scripts
│   └── tests/
├── frontend/           # React + Vite app
│   └── src/
│       ├── pages/        # one folder per route/screen
│       ├── components/   # shared components used across pages
│       └── api/          # typed API client functions
├── specifications/     # this spec
└── CLAUDE.md
```

---

## How We Work

My experience level: Beginner-to-intermediate. I'm here to understand the code, not just receive
it — explain non-obvious decisions as we go, and favor conventional patterns over clever ones.

- **Plan before building.** For anything beyond a small edit, use Plan Mode first. Read the
  relevant `specifications/` file(s), propose an approach, and wait for my review before writing
  code.
- **Ask instead of assuming.** If a requirement is ambiguous and two readings would produce
  materially different code, ask. Don't guess and don't build both.
- **No new dependencies without asking first.** Name the library, what it's for, and what the
  alternative is without it.
- **Stay in scope.** Build what was asked. If you spot an unrelated problem, mention it — don't
  fix it in the same change.
- **Work in small, verifiable steps.** Prefer a working slice I can run over a large change I have
  to take on faith. For multi-step work, state the steps up front and stop at the end of each one.
- **Explain non-obvious decisions.** A one-line comment or a sentence in your reply. Not a tutorial
  on the obvious parts.
- **Keep specs in sync.** When a feature reveals a spec file is wrong or incomplete, update that
  file as part of the same work — not as cleanup later.
- **Report honestly.** If tests fail, show the output. If something is unverified, say so. "Done"
  means written, run, and checked.

## Definition of Done

A change is finished when all of these hold:

1. It does what was asked, and nothing extra.
2. It runs — verified by actually executing it, not by inspection.
3. Tests for the new behavior exist and pass, and the existing suite still passes. The exception
   is a spike or throwaway we've agreed is exploratory — say so out loud rather than quietly
   skipping this.
4. Lint / type check / format are clean.
5. Errors and empty states are handled, not just the happy path.
6. Any spec file the change contradicts has been updated.

## Code Style

- **Clear over clever.** Conventional, readable code beats a compact abstraction. If a junior dev
  would need to pause and work out what a line does, write the longer version.
- **Don't abstract early.** Duplication is cheaper than the wrong abstraction. Extract on the third
  use, not the first.
- **Match surrounding code.** Naming, file layout, and comment density should follow what's already
  in the file over any general preference here.
- **Name things for what they mean,** not what type they are. `unpaidInvoices`, not `dataArray`.
- **Handle errors where you can act on them.** No empty catch blocks, no swallowed failures.
- **Comment the why, not the what.** The code says what it does; comments explain why it's done
  that way.
- **Functions do one thing.** If you need "and" to describe it, it's two functions.
- **Store every timestamp in UTC,** regardless of where users are. Convert for display only.
  Mixing zones at the storage layer is nearly impossible to untangle later.
- **Project-specific conventions:** [TODO — anything that overrides the above]

## Testing

- Write tests alongside the code, not as a later pass — the change isn't done until both exist.
  Where the expected behavior is already written down (the "Rules & edge cases" in a use case),
  write the test first.
- Derive a test from what the code *should* do, not from what it does. Reading a finished
  function and asserting its current output encodes the bug as the requirement.
- Cover the **behavior**, not the implementation — a test that breaks on every refactor is a
  liability.
- For each unit of logic: the expected case, the boundaries, and the failure case.
- Test what's genuinely yours. Don't write tests that only prove the framework works.
- A bug fix starts with a test that reproduces the bug and fails.
- Never weaken or skip a test to make a suite pass. A failing test is information — bring it to me.

## Security Baseline

Non-negotiable defaults for every project. App-specific requirements (auth model, compliance
scope, data sensitivity) live in [specifications/security.md](specifications/security.md).

- **Validate all input server-side,** at the boundary where it enters the system. Client-side
  validation is a convenience for the user, never a control.
- **Default-deny authorization.** Every endpoint requires an explicit check that this user may
  perform this action on this record. Absence of a rule means denied, not allowed.
- **No secrets in code** — no keys, passwords, tokens, or connection strings in source or in git.
  Environment variables or a secrets manager, and `.env` stays in `.gitignore`.
- **Parameterized queries only.** Never build SQL by string concatenation.
- **Hash passwords** with a strong, slow algorithm (bcrypt/argon2). Never store or log them in
  plaintext.
- **Escape user content on output** before it reaches HTML or the DOM.
- **Don't leak internals in error responses.** Generic message to the client, full detail to the
  server log.
- **Never log secrets or PII.**
- **HTTPS everywhere.** No credentials, tokens, or user data over plain HTTP, in any environment.
- **Never trust an uploaded filename.** Generate the stored path yourself; the original name is
  display metadata only. Authorize the upload *before* writing the file, not after.

## Git Conventions

- **Branch per change:** `feature/<short-name>` for new functionality, `fix/<short-name>` for bug fixes.
- **Commit messages:** imperative mood, subject under ~70 characters, explaining *why* in the body
  when the change isn't self-evident. e.g. `Add stock check before checkout`.
- **One logical change per commit.** Don't mix a refactor with a feature.
- **Never commit or push unless I ask.** Never force-push, never rewrite shared history, never
  commit directly to the default branch.
- **Never commit** secrets, `.env` files, build output, or dependency directories.
