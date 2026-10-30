# Final submission go/no-go — October 30, 2026

**Decision: NO-GO for a complete, verified submission.** The public source is licensed and the service is live in bounded-judge mode. There is still no independently captured provider response from the deployed judge, the persistent plan expires before the official judging window ends, and the video and Devpost project have not been published. Do not describe the model gate or submission as complete.

## Current evidence

| Gate | Evidence | Status |
|---|---|---|
| Source and license | Public `main`, source `ebf2ee7274087a40c4967111817904bd88e27357`; Apache-2.0 recognized by GitHub | PASS |
| Exact-head CI | [Run 40891258475](https://github.com/Pavithran-R-A/neb-hackath/actions/runs/40891258475), 363 tests / 0 failures / 0 skips; source and dependency checks passed | PASS |
| Hosted synthetic acceptance | [Run 40902880407](https://github.com/Pavithran-R-A/neb-hackath/actions/runs/40902880407), synthetic acceptance only | PASS; no model quality claim |
| Public service | `https://receiptlab-judge.onrender.com`: fresh GET `/health` and `/` returned HTTP 200 on Oct 30. Health reports `persistent-synthetic`, PostgreSQL, `liveInferenceEnabled:true`. | Live at check time; startup state is not provider-call proof |
| Deployed SHA | Render connector confirms service `srv-dbfn8bavcj2c738p2b80`, deployment `dep-dbi3r8dg1s2s73dtqdfg`, source `ebf2ee7274087a40c4967111817904bd88e27357`, bounded-judge startup and zero startup calls | Live at last check; configuration secrets remain protected |
| Live NVIDIA journey | Public run and form were exercised; no real provider diagnosis, token settlement, model recommendation, signed recovery or negative model result was captured. The protected judge code is not available in this session. | BLOCKED / unverified |
| Token Factory catalog | Read-only check at `2026-10-30T07:51:33Z`: `nvidia/Nemotron-3_5-Lightning`, $0.06/M input, $0.24/M output, zero inference requests. Dry-run estimate $0.00039894 for 1,024 output tokens; `creditOnlyVerified:false`. | Price/model metadata only; no balance or billing proof |
| Campaign access horizon | Persisted plan expires `2026-12-15T20:00:00Z`; official rules require judge access through `2026-12-23T20:00:00Z`. Existing budget row is source/plan/history pinned. | FAIL until controlled migration and restart verification |
| Video | Existing MP4 SHA-256 `737696338926edb06466bbe05eaec503e7fb4e7c77b206fe060245abb2a4d2e5`, 122.461 s | Private; not uploaded; captured before bounded mode activation |
| Devpost | Draft exists in [`submission-draft.md`](submission-draft.md) | Not submitted; no public entry URL |

## Model and billing boundary

The public page requires the privately issued judge code to unlock model diagnosis. This session used connected Render and Neon tools to verify the live deployment and read the campaign budget (0 requests, not halted). The public UI has a private judge-code field; its code and Render secret values are not available through these tools and were not retrieved or printed. No provider API call, spend, budget-row mutation, redeploy, purchase, top-up, card change or plan change occurred here. Credit-only billing safety remains unverified.

GitHub Issue #5 records a $0.50 campaign envelope, 100 lifetime requests, 20 per day, 2 per session, and a $50 judging reserve. It also records that Nebius stops usage at trial end. These are the saved policy settings and owner account reports, not provider-enforced dollar caps or current billing verification. Do not enable post-trial billing or alter the campaign ledger without the owner’s explicit safe authorization.

## Required release blockers

1. Through the authenticated provider interface, run one positive and one negative synthetic diagnosis against the existing service, then capture the actual model ID, response, tokens, latency and price; verify the accepted safe action, independent signed receipt, false-success rejection and unchanged/settled PostgreSQL budget. The owner’s private judge code must remain in the protected access flow.
2. Extend campaign admission through `2026-12-23T20:00:00Z` with a versioned, transactional migration that verifies the exact existing row and old plan, preserves every call, access attempt, reservation, settlement and failure halt, and changes only the approved plan metadata. Back up the row first; validate the migrated state across a restart. Neon read access is available, but the protected plan JSON and corresponding Render environment values are not available through the connected interfaces. Do not update the row until a fully specified, backed-up versioned migration and matched protected configuration can be prepared and verified.
3. Resolve the mismatch between the $0.50 software reservation and Nebius’s trial-stop/card exposure. Current catalog prices and a historical account balance do not prove available credits or prevent account-level billing.
4. Owner reviews rights, audio, captions and claims of the pinned video, then approves public YouTube publication. The existing YouTube packet is in [`youtube-publication-packet.md`](youtube-publication-packet.md); this session has no authenticated YouTube tool.
5. Owner completes Devpost eligibility/originality declarations and final submission approval. Devpost requires the public video and judge access details; this session has no authenticated Devpost tool. Verify its public project URL after submission.

## Evidence limits

Historical Campaign L contains genuine model-assisted synthetic journeys. It does not prove that the current hosted deployment has made a provider request. The fresh v3 evaluation remains partial and negative: 4 usable outputs from 5 attempted, one truncated at 8,192 output tokens, eleven cases unattempted; on the four paired cases Nemotron matched 1/4 diagnosis labels and 2/4 safe actions while the deterministic baseline matched 3/4 for both. No general superiority claim is supported. Independent application state and signed-receipt verification remain authoritative.

The existing video’s line that live judge mode is pending was accurate when recorded. Its footage does not demonstrate the newly deployed bounded-judge mode; do not change or upload it as a current hosted-model demo without accurately revising the context and completing owner rights review. Apache-2.0 is approved and published; this does not grant media rights or complete personal eligibility attestations.
