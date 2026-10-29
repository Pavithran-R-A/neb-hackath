# Render + Neon Durable Judge Deployment Implementation Plan

> **For agentic workers:** Native implementation is authorized by the owner’s request. Execute the tasks below in order and verify each milestone before continuing.

**Goal:** Add a PostgreSQL-backed hosted mode for ReceiptLab that keeps SQLite as the local reference and fails closed on stale writes, incomplete inference accounting, or untrusted proxy metadata.

**Architecture:** Render Free serves the existing Node workbench; the already-created Neon Free project stores durable application and judge state. PostgreSQL writes use transactional revision checks, and HTTP responses wait for durable commits. SQLite remains unchanged for local tests and development. Render deployment remains blocked until its connector and server-side secrets are available.

**Tech Stack:** Node 24, PostgreSQL 17, `pg`, Neon Free, Render Free, existing Node test/Playwright suite.

**Spec:** GitHub Issue #5 and the updated PR #2 release description.

## Global Constraints

- Do not create another Neon project or reuse any unrelated resource.
- Do not create a Render resource until the backend and health checks pass.
- No cards, top-ups, paid plans, or personal-cash risk; use Render Free if credits and hard spend stops cannot be proven.
- `DATABASE_URL`, `NEBIUS_API_KEY`, judge access codes, receipt keys and credit history stay server-side.
- All consequential recovery requires explicit approval; signed independent verification remains authoritative.
- Do not claim public deployment, live inference, rights clearance, or submission without actual evidence.

## Review Focus

- Concurrent or stale writers must be rejected without losing another process’s state.
- Restart after a pending diagnosis must preserve used approvals and mark in-flight work interrupted.
- Neon timeout/suspension or SQL failure must prevent successful HTTP responses and halt inference accounting.
- Render proxy headers must not override the configured HTTPS origin or host.
- Free database/runtime limits must fail closed without silently moving to paid resources.

---

### Task 1: PostgreSQL runtime snapshot adapter

**Files:** `src/runtime/postgres-state.mjs`, `migrations/neon/001_runtime.sql`, `test/postgres-state.test.mjs`, `package.json`, `package-lock.json`.

- [ ] Test initial state creation, Map snapshot round-trip, monotonically increasing revision, stale-writer rejection, storage failure poisoning, and restart interruption recovery against a local PostgreSQL 17 instance.
- [ ] Implement an async PostgreSQL store with TLS verification, serialized local saves, `revision` compare-and-swap, one retained state key, and fail-closed health checks.
- [ ] Verify tests against PostgreSQL, not only a mocked query interface.

### Task 2: Workbench durable response boundary and Render ingress

**Files:** `src/workbench/server.mjs`, `src/runtime/durable-state.mjs`, `test/public-runtime.test.mjs`, `test/render-config.test.mjs`.

- [ ] Test that responses are withheld until remote state commits and that persistence failure returns 503.
- [ ] Keep SQLite synchronous behavior unchanged; make hosted PostgreSQL writes awaitable at the HTTP boundary and before any provider request.
- [ ] Accept Render’s configured canonical HTTPS host and one exact HTTPS forwarding protocol; ignore forwarded host/client-IP headers and reject mismatches.
- [ ] Listen on `0.0.0.0` only in hosted mode and honor Render’s `PORT`.

### Task 3: Persistent judge budget and restart safety

**Files:** `src/runtime/postgres-judge-budget.mjs`, `src/runtime/judge-policy.mjs`, PostgreSQL migration, `test/postgres-judge-budget.test.mjs`.

- [ ] Test concurrent reservations, daily/global/session quotas, single-use runs, uncertain provider outcomes, exact settlement, immutable history, restart recovery and the existing $50 judging reserve.
- [ ] Port durable admission and accounting to SQL transactions without seeding a fresh account balance or losing prior campaign history.
- [ ] Keep inference disabled until a source/suite/model/price-pinned bounded plan and protected credentials are configured.

### Task 4: Render deployment candidate and release checks

**Files:** `render.yaml`, `docs/release/render-neon-runbook.md`, deployment and release evidence.

- [ ] Add a single isolated Render Free service definition after local PostgreSQL and provider-contract tests pass.
- [ ] Confirm the existing Neon/Render account access through their connected providers; use protected environment settings only.
- [ ] Deploy only after the exact-head CI is green; then verify external positive/negative flows, restart persistence, signed receipts, real bounded inference and measured credit use.
- [ ] Preserve model-evaluation limits; leave ownership/license/video/submission claims pending until verified.
