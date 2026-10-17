# Historical blocked preflight record

**Superseded October 17:** the owner accepted their screenshot/no-card attestation; one actual request was executed and the authorization is consumed. See [live outcome](live-preflight-2026-10-17.md). Everything below records the earlier blocked state, not current authorization or execution status.

Scope: exactly ONE NVIDIA Nemotron inference request, using existing credits only, maximum estimated expenditure $0.50, no retry or follow-on inference. [Recorded owner authorization](https://github.com/Pavithran-R-A/neb-hackath/pull/2#issuecomment-6220295986). This approval does not authorize a benchmark, merge, deployment, purchases, top-ups or billing/card changes.

## Current outcome

**No inference request was made. The one-request authorization remains unused.**

The current owner's Billing-page confirmation establishes available account/trial credit above the authorized ceiling and trial validity of 17 days. Account-credit expiry and automatic charging/top-up status were not confirmed. The owner explicitly instructed that inference remain blocked while billing settings are checked. No historical screenshot was used as current proof. Raw financial amounts are deliberately omitted from public execution evidence.

The exact remaining prerequisite is confirmation that automatic card charging/top-ups/paid replenishment are disabled, plus selection of known-unexpired existing credits that cover the authorized ceiling. The already confirmed trial validity may cover the latter, without assuming the account-credit expiry. No additional approval for the same first call is being requested; its credit-only conditions remain unsatisfied.

## Checks completed without inference

- Read both owner authorization comments and the newest independent checkpoint on PR #2.
- Published environment metadata: `NEBIUS_API_KEY` binding saved, no error/pending requirement, allowed credential destination exactly `api.tokenfactory.nebius.com`. Both required variables are present; their values were not displayed.
- Current credential-bearing GET to `/v1/models?verbose=true` lists the configured model and confirms $0.06/$0.24 per million input/output tokens, with no extra per-request catalog charge. This does not establish a successful chat completion.
- Current estimate remains $0.00021762, at most one inference request with 256 output tokens and no automatic retries. This is an estimate, not a provider-side dollar guarantee.
- [Official billing documentation](https://docs.tokenfactory.nebius.com/other-capabilities/billing-new) describes Billing-page balance/payment controls and automatic charging on negative-balance/threshold conditions. The published API index exposes no balance or automatic-payment-status endpoint. No authenticated billing connector/browser is available in this session. No undocumented endpoint was guessed and the inference secret was not sent to another host.
- Latest dry catalog/readiness evidence: `results/authorized-preflight-readiness.txt`. Billing remains unverified and `readyForApproval` is false despite credentials/prices being present.

## Enforcement and safe resumption

The live preflight now requires fresh structured credit evidence before creating a provider request. Missing, stale, insufficient, expiring or payment-enabled evidence rejects without fetching. Raw credit amounts are not returned. Tests use synthetic amounts and explicitly injected mock transport; these are not real billing confirmations.

A local ignored JSON evidence file must contain:

- `source`: `owner-confirmed-billing-ui` or a supported `read-only-billing-api` response.
- `checkedAt`: current ISO timestamp; at most 15 minutes old, allowing at most 30 seconds of clock skew.
- `availableCreditUsd`: confirmed eligible existing credits, strictly greater than the full authorized limit.
- `expiresAt`: known ISO expiry more than one minute in the future, or explicit null only when no expiry has been confirmed.
- `automaticChargingDisabled` and `automaticTopupsDisabled`: both explicitly true.

This is an attestation gate, not independent provider authentication or a guarantee against concurrent account spending. Do not create that file from unknown or historical status. Do not change billing settings, remove/add cards, top up, or infer disabled status from a positive balance. Keep financial inputs outside Git and print only sanitized flags. Once the owner supplies the missing current status, recheck freshness and catalog prices, execute one invocation, save its sanitized outcome, and stop even on error. Separate permission is required for any additional inference.

CI's separate benchmark is now manual opt-in with a false default; PR updates run full non-billable verification tests but no benchmark. No full benchmark was run for this authorization.

## Non-billable verification evidence

`npm run test:ci` completed with exit 0: **69 passed, 0 failed, 0 skipped**. The suite uses explicit simulated transport for all provider cases; real Chromium tests exercise only the local synthetic app. `node --test test/preflight.test.mjs test/credit-gate.test.mjs` passed **15 tests**, exit 0. The new missing-billing and invalid-readiness regressions were observed failing before implementation/fix. Independent source review found no Important issue; its readiness follow-up was fixed and verified.

Actual logs: `results/authorized-preflight-tests.txt`; sanitized attempt state: `results/authorized-preflight-status.json`. All live response/model/token/latency/cost fields are null because there was **no inference attempt**. Hosted CI on the pushed revision is recorded in PR #2, separately from these local logs. The current missing billing-status confirmation is an external prerequisite, not a test failure or a request for new spending authorization.
