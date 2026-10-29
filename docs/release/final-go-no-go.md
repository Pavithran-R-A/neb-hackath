# Final submission go/no-go — October 29, 2026

**Decision: NO-GO for a complete/qualified hackathon submission; GO for the published Apache-2.0 source and the deterministic synthetic demo.** The project is merged on `main` and exact post-merge CI passed. The public service still runs without live inference. Video publication, the official Devpost submission, provider billing/configuration checks, restart qualification and real hosted NVIDIA acceptance remain unverified.

## Verified status

| Gate | Evidence | Status |
|---|---|---|
| Public source and license | Repository default branch `main`, merge commit `e90f032f8cef1901e563208791c5460ff06ec40b`; GitHub detects Apache-2.0 | PASS |
| Post-merge CI | [Run 40834879951](https://github.com/Pavithran-R-A/neb-hackath/actions/runs/40834879951), exact SHA `e90f032…`; 363 passed, 0 failed, 0 skipped. Source secret scan, dependency audit and Chromium/PostgreSQL test job passed. | PASS |
| Hosted synthetic acceptance | [Run 40510973580](https://github.com/Pavithran-R-A/neb-hackath/actions/runs/40510973580), positive and false-success synthetic workflows; zero NVIDIA requests | PASS for synthetic behavior only |
| Public health | `GET https://receiptlab-judge.onrender.com/health` returned HTTP 200 on October 29, 2026 at 07:46 UTC (0.42 s TTFB), `persistent-synthetic`, PostgreSQL storage, inference disabled | Point-in-time PASS; uptime/restart unproven |
| Render deployment | Latest provider evidence records Free service `srv-dbfn8bavcj2c738p2b80`, deployment `dep-dbhegue7bikc73ee1ifg`, source `d3a6f6614898e3f8bd2997c72326059b463ed0c6`; automatic deploy off | Not verified against current dashboard in this session; not exact merge SHA |
| Neon persistence | Existing dedicated project and `receiptlab` application namespace are recorded in Issue #5. No current database read/write/restart verification was possible in this session. | Historical evidence only |
| NVIDIA/Nebius | Current Token Factory catalog check at `2026-10-29T07:48:53Z` found configured `nvidia/Nemotron-3_5-Lightning` at $0.06/M input and $0.24/M output. `inferenceRequests:0`; dry-run says `creditOnlyVerified:false`, `readyForApproval:false`. | Not enabled; live hosted journey not run |
| Video | Existing private MP4 SHA-256 `737696338926edb06466bbe05eaec503e7fb4e7c77b206fe060245abb2a4d2e5`, duration 122.461 s. | Prepared; not published |
| Devpost | Submission material is in [`submission-draft.md`](submission-draft.md). | Not submitted |

## Spending and access

No inference request, purchase, top-up, plan change, redeploy or database mutation occurred in this checkpoint. The catalog read is metadata only, not a credit balance, account statement, invoice cap or billing-mode proof. The one-request dry-run estimates $0.00039894 at current catalog rates and allows 1,024 output tokens, but readiness is false. The environment confirmed only that the model and key settings are present; the key value was not displayed. It cannot verify the provider network-secret scope, current promotional credits/expiry, no-card billing status or the $50 judging reserve.

Render and Neon remain the existing Free resources, but their account settings, current usage, overage controls, exact deployed revision and stored judge-budget row were not accessible through this Work session. Do not infer a no-cash guarantee from their plan labels. Render Free can sleep; no availability guarantee through December 15 is established.

## Release decisions still required

1. Provide this Work session access to the existing Render and Neon account connectors or authenticated cloud browser. Do not send secrets in chat. Confirm current billing/usage exposure, protected settings, `receiptlab` state revision and durable judge accounting before any deployment change.
2. Enable the bounded hosted judge only if the current account-credit gate and protected configuration pass. Pin the actual deployed source/runtime/suite/history/model/catalog rates, preserve the $50 judging reserve and $0.50 campaign maximum, then record actual positive and negative external model journeys. The current preflight fails closed; do not bypass it.
3. Verify restart/session/receipt/replay behavior and exact deployed SHA from Render and Neon. A green CI run does not prove these production properties.
4. Owner reviews the already-created video’s rights, voice, captions, sponsor attribution and accuracy, then authorizes public YouTube publication. No YouTube connection is available here.
5. Owner completes Devpost’s personal eligibility and originality attestations and final-submission confirmation after reviewing the live demo and video. No Devpost connection is available here.

## Evidence limits

The October 19 v3 model evaluation remains a partial negative result: four usable diagnoses of five attempted, one truncated at 8,192 output tokens, and eleven cases unattempted. On the four paired cases Nemotron matched 1/4 diagnosis labels and 2/4 safe actions, compared with 3/4 for each on the deterministic comparator. Earlier Campaign L provides real historical model-assisted integration evidence, but does not prove current hosted model execution. No superiority claim is made. Independent server state and signed-receipt verification remain authoritative.

The MP4 is private and its local checksum is verified; no public watch URL exists. No Devpost project URL exists. Accordingly, the entry is not fully submitted and must not be described as 100% complete.
