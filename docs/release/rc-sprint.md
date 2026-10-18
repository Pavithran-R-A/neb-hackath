# Release candidate sprint — October18

Authority: owner standing existing-credit-only PR6235724302 and new review6236987327. No purchases/card/topups/paid hosting/public deploy/merge/media upload/Devpost. Source milestone71386e4359de872fe9c4c536b1854516dfc55ae3 / CI39052789817 passed293tests before inference.

Implemented a conservative semantic acceptance boundary before display/execution, independent current-state action restriction and signed verifier retained. Added guided judge journeys, loading/session/coldstart states, keyboard/reflow/audit evidence. Public-compatible architecture now has canonical HTTPS, Secure sessions, session-owned single-origin forms, atomic retained SQLite/key/session/approval state and exclusive crash-safe instance lease. Real local Caddy gateway and actual process restart passed with0modelcalls. See rc-caddy-rehearsal.json; no public DNS/listener/service was created.

## Frozen evaluation and actual experiments

V2 author/reviewer remained implementation-blind; separate comparator author remained dataset/model/prompt-blind. Coordinator heard two label details from reviewer after gate/comparator implementation but before sampling-only freeze; recorded explicitly in rc-v2-freeze.json. Do not call coordinator evaluation pristine blind.16realistic structured/prose traces with expert-verifiable labels, all10diagnoses/8recoveries covered. Review is labels-visible AI review, not external human expert validation. Cases/labels/hashes unchanged after evaluation.

Telemetry baseline:12diagnoses,10actions,8pairs,3joint diagnosis/action/required-citation matches out of16; two high-confidence diagnosis errors and four consequential action disagreements. Strong comparator for structured telemetry; prose-only consumed-v1 performance remains poor and is disclosed.

- G Nano alternative:1POST, HTTP200/exact model/stop, failedJSON/actionpreflight; .00004842 known estimate; no diagnoses/retry.
- H Super alternative:2POST, full preflight then HTTP500 first diagnosis; .00018120 known preflight estimate; diagnosis usage unknown. Account conservatively holds full .05 campaign envelope. Do not call the request free or cost complete.
- I Lightning temperature1/top_p1,8192cap unchanged: all16diagnoses completed,17totalPOST,.01149318 known estimate. Raw12diagnoses/12actions/10pairs/10joint;2high-confidence taxonomy errors,0consequential action disagreements. Model citations cover all16required sets mechanically. Gatev1 accepted12,abstained4; displayed pair agreement7/16 with2high-confidence errors remaining. Actual mean/median/token distributions are retained in outcome and final comparison. Improved observed coverage is not controlled causal proof of temperature or general superiority.
- J previously unattempted9v1traces: all9completed,10POST,.00710286 estimate. Raw5diagnoses/7actions/5pairs;3high-confidence diagnosis errors,0consequential action disagreements. Gatev1 accepted3/abstained6 and no remaining high-confidence diagnosis error. This is consumed/public regression evidence, not fresh independent benchmark or a stitched uniform16case rerun. Earlier failed case7 remains a historical truncation under its original configuration.

Every campaign plan preceded its first POST, exact source/suite/order/model/sampling/prices/call/token/reservation pinned, current catalog refreshed, common1024preflight first, no retries/fallback, first contract failure stopped. Raw/accepted/provider failures preserved. Only supported temperature/top_p used; model-specific reasoning-off remains unconfirmed. No blind token-cap increase.

## Post-evaluation semantic review amendment

I's two high-confidence primary-cause errors chose instruction_conflict instead of gold validation while safely recommending stop. Labels are retained; do not relabel for score. New generic review rule requires corroboration from independent telemetry interpretation for high-confidence advice, unless actual private application state independently permits the proposed recovery. Disagreement becomes review-required/ambiguous-stop with raw advice retained in warned details. Runtime eligible positive recovery still requires explicit human approval.

Replaying the SAME consumed I outputs costs0newinference:9accepted,4abstained,3review-required;0of2observed high-confidence diagnosis errors remain accepted. This is post-hoc safety adaptation, not new held-out validation. Preserve original gatev1 results and coverage loss. New generic regression failed first, then passed. UI says high-confidence advice was blocked, not that every rejected recommendation is necessarily wrong. Gate is not semantic certification; common model/baseline mistakes remain possible.

V1/V2 frozen artifact original and review-policy manifests are separate. Old-source reproduction requires the matching original source; future repeats using review manifest must explicitly pin it and be labeled consumed regressions. No further static inference is planned this sprint. One separate bounded real UI/canonical HTTPS integration capture may follow after exact new-source CI; no public deployment.

## Release gates

Prepared configuration is reviewable; public hosting entitlement/no-card retained volume, judge availability through December15, final licensing/ownership/eligibility, merge/publication/media upload/submission approvals remain unresolved. Default public startup has inference disabled. Short-lived bounded model campaigns do not automatically renew; a judge operating schedule and retained budget history are required before publication. No connected hosting/Linear/deep-security tools available; no fabricated account checks or remote updates.

A final lifecycle check found that HTTP connection closure could precede completion of a pending diagnosis and close SQLite too early. A real deferred-provider public-mode regression failed first, then passed after tracking active HTTP handler transactions and awaiting them before closing the private app/store. It checks the accepted diagnosis survives restart; no provider call is involved. Closing admission still forbids new model work and account settlement waits for usage. This extends the earlier policy-only drain to the complete durable transaction.

## Private HTTPS capture K — preserved failure

At source922a9cb8bd317b4df606354bd55945b3f590142f with CI39094869975 green, campaignK reserved3POST/.02 and issued only its preflight: HTTP200, exact NVIDIA model, stop,235input/564output tokens,2145ms, estimated.00014946. The browser then timed out before either diagnosis because `clickAndSettle` only recognized the local `/api/runs/` response path, while the HTTPS form correctly posted through `/forms/api/runs/`. Service closed and account settled with complete usage; no retry or diagnosis was issued. The failed capture/video is retained; it does not prove the NVIDIA product journey. A real public-mode browser regression must pass before a separately documented source-pinned rehearsal is considered. K evidence is immutable.

## Measured reasoning and latency

On I, the16 actual diagnosis responses used10,370 input and44,645 output tokens; provider metadata reported42,224 reasoning tokens (94.58% of outputs). Output median2,713/max4,456 was below the unchanged8,192 cap. Diagnosis latency median9,577.56ms, p95(linearly interpolated)13,966.01ms, max15,499.93ms; preflight excluded. Thus the old exhaustion concern is observed as heavy reasoning overhead even when completion succeeds. Supported sampling changes/alternate probes were tested, but different traces and stochastic behavior prevent attributing improvement causally to sampling. Model-specific reasoning-disable parameters remain unsupported/unconfirmed and were not sent. See rc-latency-token-summary.json.

The K harness defect now has a real Chromium HTTPS/SPKI-pinned regression: it failed after the first public form POST before the fix, then passed all three steps and independent receipt verification afterward with0modelrequests. `clickAndSettle` derives the exact same-origin/current-run endpoint from local or public form paths; it cannot settle on another run, prefix, origin, method or query. The browser session navigation/action allowlist is unchanged. Full `npm test` passed301/301,0failed/0skipped after this fix. A separate read-only review is recorded with the final evidence; no consumed campaign is resumed.
