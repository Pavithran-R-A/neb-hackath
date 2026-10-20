# One-shot no-charge Cloudflare experiment

**State: prepared, not authorized to provision, and not deployed.** This runbook is for one isolated Cloudflare account selected by the owner. The connected-account review recorded two accounts (`First Moonflower`, `Personal Cloudflare account`), zero D1 databases in each at review time, and HTTP403 for subscription lookup because the connector lacked Billing Read/Write. The plan, card state, Workers usage, D1 quota headroom, and Free eligibility are therefore unverified. No resource, billing state or account was changed by this work.

The experiment answers one bounded question: can the existing synthetic Worker/D1 candidate serve the positive recovery and false-success journeys reliably on the chosen account’s Free limits while preserving state across Worker versions? It keeps `INFERENCE_ENABLED=false`, sends no Nebius request, imports no Nebius credit ledger, binds no `NEBIUS_API_KEY`, and accepts only fictional form data. The `workers.dev` endpoint is publicly reachable while deployed; it is a temporary demo, not a production or inference service.

## Gate before any provider command

The owner must select exactly one of the two accounts and approve one temporary Worker, one D1 database, and a public `workers.dev` experiment. Before execution, the owner must verify in that account’s Cloudflare dashboard: active Free plan; no card/payment method, paid subscription, add-on, auto-upgrade or automatic top-up; sufficient remaining daily Workers/D1 allowance; and permission to create these two isolated resources. Record only plan/card/quota status, account alias, timestamps, and new resource IDs in the experiment log. Stop if any part is uncertain or contradicts the no-charge condition. Do not enumerate, deploy into or reuse unrelated resources.

Use a short-lived token scoped only to the selected account with Workers Scripts Edit and D1 Edit (plus only the minimum account-read permission Wrangler requires). Configure it in the cloud environment’s protected secret settings as `CLOUDFLARE_API_TOKEN`; configure the selected non-secret account ID as `CLOUDFLARE_ACCOUNT_ID`. Do not paste either value in chat, commit, video, shell transcripts or GitHub logs. Do not grant Billing permissions to work around the connector’s 403. The dashboard owner must attest to billing/Free status.

The config [wrangler.experiment.jsonc](../../workers/wrangler.experiment.jsonc) uses a unique ReceiptLab experiment name, a deliberately invalid D1 ID, no custom domain or route, `preview_urls=false`, `INFERENCE_ENABLED=false`, and no model or provider secret binding. Recheck every field before running a provisioning command. Replace the D1 ID only with the ID returned for the newly created experiment database.

## Ordered execution after owner selection

Run these commands only in the published cloud checkout after the gate passes. All commands are account-scoped; never remove the account flag. Do not run Wrangler deploy against `workers/wrangler.jsonc`, whose ID is intentionally fake/local-only.

1. Check source and authorization without provisioning:

   ```sh
   git status --short
   git rev-parse HEAD
   npx wrangler whoami
   npx wrangler deploy --dry-run --config workers/wrangler.experiment.jsonc --outdir .cache/workers-experiment-dry-run
   ```

   `whoami` must identify the selected account. Dry-run must show only the `DB` binding and `INFERENCE_ENABLED="false"`. Any `NEBIUS_API_KEY`, `MODEL`, `ACCESS_CODE`, other account, unexpected route or billing/resource prompt means stop. Dry-run does not prove account eligibility or hosted CPU.

2. After the owner-approved account gate, set the protected `CLOUDFLARE_API_TOKEN` and selected `CLOUDFLARE_ACCOUNT_ID` environment settings. The installed Wrangler4.151.1 CLI recognizes `CLOUDFLARE_ACCOUNT_ID` for non-interactive account selection. Check `npx wrangler d1 create --help` again, then create exactly one D1 database and let Wrangler update only this experiment config:

   ```sh
   npx wrangler d1 create receiptlab-judge-experiment-20261020 \
     --config workers/wrangler.experiment.jsonc --binding DB --update-config
   ```

   Record the returned ID. Do not create a second database to retry an error. If Wrangler reports another account or the selected account ID is missing, stop before any create command.

3. Apply [schema.sql](../../workers/schema.sql) once to that new database, deploy the dedicated config once, and note the provider-generated HTTPS `workers.dev` address. Commands use the same `--config` and the already selected account ID from protected settings:

   ```sh
   npx wrangler d1 execute receiptlab-judge-experiment-20261020 \
     --remote --file workers/schema.sql --config workers/wrangler.experiment.jsonc
   npx wrangler deploy --config workers/wrangler.experiment.jsonc \
     --message "one-shot inference-disabled ReceiptLab Free experiment"
   ```

   Keep Workers observability disabled and do not enable logs containing request bodies or synthetic form values. The random `RECEIPT_KEY` must be configured as a Worker secret using Cloudflare’s protected secret UI; generate a new random value in the cloud and never expose it in command output. It must remain unchanged throughout the experiment and any version rollback. No model credential is configured.

4. From the cloud test runner, use real Chromium on the HTTPS URL to run the two existing journeys: transient submission failure → verify incomplete → local rules advice → explicit approval → recovery → independently valid signed receipt; then false success screen → rejected completion claim → local rules abstention → no enabled recovery. Confirm the Secure/HttpOnly/SameSite session cookie, cross-session isolation, same-origin policy, and `INFERENCE_ENABLED=false`. Make no inference request. Use the Worker/D1 runtime browser suite as the local parity oracle before and after the hosted run.

5. Preserve one valid synthetic run and receipt, publish a no-op Worker version, then confirm the same HTTPS URL can still verify the receipt and that its owning session remains private. Exercise a second authorized approval and a conflicting/stale approval; only the first valid single-use approval may recover. Confirm imported account/campaign tables remain empty, no model binding exists, and a provider-call counter remains zero.

6. Measure actual per-invocation **Cloudflare** CPU from the account dashboard/Workers Observability metrics for each route. Do not compare local inspector sampled-active-V8 directly to this field. Collect at least100 representative invocations for each hot route (session, create, each step, verify, diagnose-local, approve, recover); keep the whole experiment below1% of published Free daily request/rows quotas and stop earlier if shared account headroom is unclear. Pass only if every invocation succeeds without CPU-limit 1102 or D1 quota errors, p95 CPU is at most8ms, max CPU below10ms, p95 reads/writes are below10% of that account’s remaining daily allowance, both functional flows pass after version replacement, and no inference endpoint becomes active. The 8ms p95 leaves headroom below the published 10ms Free per-invocation ceiling; it is an experiment acceptance margin, not a new Cloudflare guarantee. If the dashboard cannot expose actual route CPU or sample enough cleanly, result is **inconclusive** and the experiment stops.

7. Stop all testing immediately if the account plan/card/usage differs from the owner’s attestation, Wrangler requests an upgrade/payment method, any resource name/ID is unexpected, quota or 1102/1103 errors occur, state/receipt/budget restrictions fail, or any provider request is observed. Do not retry provisioning or inference.

## Rollback

Rollback order is deliberate; do not restore an old budget or approval snapshot.

1. Immediately disable the Worker route/Workers.dev service or delete only `receiptlab-judge-experiment-20261020` using the selected account and captured exact deployment identifier. Confirm its `workers.dev` route no longer responds. Do not use broad `wrangler delete` without both account scope and exact experiment config.
2. Export the experiment D1 database to the cloud evidence directory, validate the export contains only fictional ReceiptLab state, and record its size/hash. Do not publish session IDs, receipt signatures or secret material. Since inference is disabled and no imported account exists, this export is disposable application evidence; it does not represent Nebius spend history.
3. Delete only `receiptlab-judge-experiment-20261020` D1 after verifying exact name/ID in the selected account dashboard. If deletion is ambiguous, stop and leave the isolated D1 intact for owner cleanup; never delete other resources.
4. Remove the experiment `RECEIPT_KEY` from the Worker secret settings and revoke the temporary scoped Cloudflare token in the owner’s cloud settings. Do not remove unrelated account credentials.
5. Confirm the Worker and D1 no longer appear, no paid plan/add-on was enabled, no billing adjustment occurred, no other resource changed, and only local sanitized evidence remains. If a charge or unexpected quota effect appears, stop and report it; do not attempt a billing repair.

## Decision and no-cost fallback

Local D1 query-plan/index tests remain useful, but local V8 inspector timings do not decide Cloudflare’s 10ms limit. The first optimized local profile reported11.661ms p95 and the repeat12.432ms with instrumentation enabled; the [source evidence](../../results/workers-hotspot-2026-10-20-followup.json) explicitly says neither is Cloudflare CPU. Do not claim Free CPU failure or pass from these numbers. Deployment remains gated on account selection, the actual Cloudflare metric and the functional/durability gates above.

If the one hosted experiment fails or is inconclusive, stop Workers optimization. The preselected technical fallback is **Vercel Hobby Node functions + Neon Free Postgres**, but only if the owner verifies both selected accounts are eligible, no-card/no-charge, and viable through the judging window. Port the existing Node service’s atomic state changes to PostgreSQL transactions and prove its receipt, session, single-use approval, crash recovery and cumulative-budget invariants before deployment. No database marketplace add-on is implicit. If Vercel or Neon billing/eligibility cannot be verified or the Postgres port fails its contract tests within one bounded implementation phase, the decisive fallback is **no public release / no Devpost submission**; keep the private demo/video and do not continue host research indefinitely. Oracle and unrelated project infrastructure are not assumed.
