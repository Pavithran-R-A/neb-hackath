# ReceiptLab judge-budget successor migration (v1)

This migration is for the existing `receiptlab-judge` PostgreSQL budget only. It is additive: it records a source-pinned plan revision in `receiptlab_judge_budget_migrations` and does not replace the original budget row, clear `snapshot.halted`, alter either request record, change the access map, or edit canonical account history. The old and successor plan must share the same campaign id, $0.50 envelope, model, rates, request/token quotas, scenarios, and canonical history. The successor changes source/runtime provenance and the approved expiry only.

## States and invariants

- `prepared` records the exact predecessor/successor plan hashes, unchanged history hash, pre-migration snapshot digest, and retained unknown reservation. It cannot authorize, reserve, settle, or finalize any request.
- `active` is only written by `activatePostgresJudgeBudgetSuccessor` after explicit provider, no-cash, and organizer evidence references are supplied. That call does not change the legacy snapshot's `halted=true`. The current plan's admission view is separate; the legacy state remains halted and visible.
- Every old and successor call remains in the same snapshot and consumes the same lifetime, daily, per-session, replay, and $0.50 envelope accounting. Successor calls add a source plan hash; old calls are not rewritten.
- An unresolved successor request makes the successor halt on restart and blocks another reservation. A provider failure halts the successor migration record. There is no retry or replay path.
- The migration state row is keyed by namespace and successor plan hash; state transitions are also written to the append-only `receiptlab_judge_budget_migration_events` table. Conflicting or stale hashes fail closed. The original row hashes and snapshot remain readable by the previous application version, which stays halted because it still sees the unresolved historical request.

## Preconditions

1. Reconcile the timed-out provider request. If usage remains unknown, retain the full $0.00234522 reservation. Verify credits, expiry, and Stop Usage/no-cash controls through the provider account. Do not infer that the current $59 owner-attested ledger is a provider balance.
2. Obtain organizer permission for any material post-deadline implementation change.
3. Build the exact successor commit and run the source-pin generator. Keep the existing protected access credential unchanged. The successor expiry must be no later than `2026-12-23T20:00:00Z`.
4. Create and verify a fresh production recovery point. Keep production untouched until the isolated migration test below passes.

## Isolated test

The PostgreSQL migration suite applies `migrations/neon/003_judge_budget_successor.sql` on a disposable namespace and uses a synthetic access code and account history. It verifies byte-for-byte account-history preservation, exact original request identity/status/cost/reservation retention, prepared-state admission denial, activation evidence gates, unchanged legacy row hashes, concurrency/idempotence, shared quota and replay enforcement, restart behavior, and old-code rollback staying halted.

Run locally with an isolated PostgreSQL 17 database:

```sh
RECEIPTLAB_TEST_DATABASE_URL='postgres://...' node --test --test-concurrency=1 --test-name-pattern='successor migration|PostgreSQL judge budget|concurrent PostgreSQL|unsettled provider reservation' test/postgres-judge-budget*.test.mjs
npm test
npm run security:check
```

Do not use production `DATABASE_URL` as `RECEIPTLAB_TEST_DATABASE_URL`. CI uses an ephemeral PostgreSQL service and Chromium; mocked provider calls only. A passing current-main or PR #9 run is not evidence that this migration passed.

## Production sequence (not executed)

1. Confirm provider and organizer gates, verify the exact old protected plan and canonical account-history hashes through secure owner-controlled access, and record the evidence references.
2. Take a recoverable production backup and verify it before any write. Apply the additive SQL migration transactionally.
3. With existing protected values injected only into a secured operator process (`DATABASE_URL`, `RECEIPTLAB_PREVIOUS_JUDGE_CONFIG_JSON`, `RECEIPTLAB_SUCCESSOR_JUDGE_CONFIG_JSON`, and unchanged `RECEIPTLAB_JUDGE_CODE`), run `node scripts/judge-budget-successor.mjs --prepare <migration-id>`. Preparation leaves the legacy row and snapshot unchanged. Verify the migration row is `prepared` and unknown reservation remains 2,345,220 nanoUSD.
4. Deploy only the exact tested successor source and its hash-pinned protected plan. Prepared state must remain denied. After verifying service start, ledger counts, and the old halted state, activation requires documented evidence references for provider accounting, no-cash safeguards, and organizer permission.
5. With `RECEIPTLAB_JUDGE_MIGRATION_EVIDENCE_JSON` populated from verified references, run `node scripts/judge-budget-successor.mjs --activate <migration-id>` only after those gates. This changes the migration-state row and appends a transition event; it does not change the budget snapshot. Do not run the script against production until all gates have been verified.
6. Verify the startup summary shows legacy halted, successor status active, both historical calls intact, the unknown hold intact, and shared headroom consistent. No real provider request is part of migration testing.

## Rollback

The migration is additive and leaves the predecessor plan/history hashes and halted snapshot in the original budget row. Rollback is an application-code rollback only; the old version sees the old hashes and old campaign, preserves any newer calls in the shared snapshot, and denies admission while the historical unresolved request exists. Do not drop the migration table, restore a snapshot over live requests, lower counters, change campaign namespace, alter protected credentials, or clear `halted`. If a successor call exists, keep the full current ledger and roll back code only; do not attempt a database rewind.

## Current status

This code and test plan are isolated on `recovery/receiptlab-budget-v2-20261030`. No production migration, plan update, activation, deploy, judge-code attempt, or inference request was made. Passing tests and production gates must be recorded separately before promotion.
