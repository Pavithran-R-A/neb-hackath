# QA and security evidence — no certification

Current technical record: draft PR#2 and its exact-head GitHub Actions. Historical119-test release evidence remains in results/sprint-release-evidence.json; subsequent diagnosis/runtime milestones supersede its status, without altering historical artifacts.

## Verified boundaries

- Real Chromium journeys cover all fixed forms, frozen v2 DOM fixture QA, keyboard navigation, evidence export, responsive320/768/1024/1440px layouts and delayed-verdict run changes. Provider transports in tests are explicit simulations; CI has no live inference.
- Private HMAC verifier rejects wrong task/flow/run, intact cross-run receipt replay, missing binding, mutation, duplicates and misleading UI/wrong saved state. Verification, raw claims, suggestions and denied actions stay distinct.
- Source-tagged diagnosis schema requires known unique citation IDs and constrained recovery. Exact NVIDIA identity, HTTP200, completed assistant output, refusal/tool exclusions, JSON and positive consistent usage are validated. Truncation and invalid output stop a campaign. Citation existence is mechanical; semantic faithfulness needs independent assessment.
- Explicit synthetic recovery approval binds diagnosis and current trace digest, is single-use and cannot cross sessions or stale state. Independent action guard uses private state and supplied values, then verifier checks the result. Model suggestions alone cannot authorize arbitrary scripts, new identities, external navigation or completion.
- Session ownership/TTL, host/origin/POST/body/rate/capacity limits, textContent rendering, XSS-in-model-output, inactive-model and named-scenario gates have non-billable regression coverage.
- Every model-capable campaign entrypoint shares an exclusive cumulative account ledger. Reservations fsync file and directory chain before POST; unknown usage keeps reservation; consumed IDs cannot resume. Tests cover quota, request/source/suite/model/credit gates, HTTP/transport/schema/usage failures, concurrency and persistence failure. These are workspace controls, not provider billing enforcement.
- Runtime/build/source and four frozen dataset hashes appear in exports. Gitless manifest consistency, dirty inputs, unexpected files and symlink escape cases are tested. Neither hash nor operator commit claim proves server authenticity.
- Source scan checks exact injected protected values/private-key markers without revealing them; npm audit checks current locked advisories. Neither is exhaustive certification. The deep security scanner server is unavailable in this session; no canonical deep scan was run.

## Independent review fixes

The October17 read-only review of e086dc4 passed15 targeted mocked/local tests and found two report/lifecycle defects. Fixed in26f7840: rejected live provider results now export attempted-live status with failure metadata instead of NOT RUN; service stops admission and drains pending provider work before campaign close/account settlement. Deferred-promise regression tests verify successful/failed drains without retries. Failure totals remain conservatively unknown if actual POST count cannot be established from the export; campaign ledger is authoritative.

Earlier cumulative-account bypass in the old action CLI is fixed/tested; old unbounded live benchmark remains disabled. Ledger directory durability and intended-run verifier binding fixes remain intact.

## Operational limits

Synthetic form URLs and session cookies are capabilities. Default local mode loses state on restart; the retained local candidate stores sessions, records, signing key and consumed approvals in atomic SQLite snapshots on a restricted state directory. Private actual-Caddy HTTPS and isolated read-only/nonroot container restart/replacement rehearsals passed. Canonical HTTPS, Secure cookies and same-origin session-owned forms are implemented. Only one instance may use SQLite state; this is not distributed budget coordination or high availability. A Render Free service with Neon PostgreSQL is recorded in Issue #5, and external synthetic acceptance passed in Actions run `40452641162`; current hosted restart persistence and judge mode with real inference are still unverified here. Render idle sleep and Neon quota suspension limit availability. No exhaustive external penetration test or human usability certification has been completed.

Recorded screenshots/browser assertions are not a screen-reader audit or WCAG certification. Real model campaigns are separate sanitized evidence; failed/truncated calls remain failures. A known local UI success cannot prove generalization, external workflow safety or comparative advantage. No payment method, hosting resource, merge, public deployment or submission was authorized or performed in this sprint.

## Final observed runtime risk and regression

CampaignF actual model on false-success UI recommended retry at high confidence without evidence of a temporary server error. Structural citations/schema accepted the suggestion. Private state guard made recovery non-executable and verifier rejected completion. A dedicated mocked regression additionally forges explicit approval for that same unsafe suggestion and confirms API409, zero commits and rejected completion. This demonstrates the independent guard boundary, not correct model reasoning. Actual positive F journey used an eligible transient-error retry with explicit automated synthetic QA approval and obtained a unique verified receipt. Full non-billable suite236 passed locally; exact final-head hosted CI is linked in PR#2.

Final read-only review of fe3ac5f plus F evidence ran10 targeted tests, exit0, found no outstanding blocker in the scoped export/lifecycle/action-guard changes, independently verified ledger totals/hashes and both before/after exports. This is scoped code/evidence review, not security certification.

## October18 candidate evidence

Current non-billable suite at source922a9cb passed299 tests locally and hosted CI39094869975. Scoped independent review passed23 focused tests including full HTTP diagnosis transaction drain before SQLite closure. Source-secret check found0 exact protected-value/private-key findings across235 tracked source files; npm audit found0 advisories at that check. These checks are scoped evidence, not security certification.

Semantic gate2 adds source-aware cause/action support checks and additional review when independent telemetry interpretation disagrees with high-confidence advice. It preserves raw output, private action restrictions and the signed verifier. On a post-hoc replay of16 consumed outputs,9accepted/4abstained/3review-required, neither of2observed high-confidence diagnosis errors remained accepted, but displayed pair agreement fell to6/16. Common model/comparator errors and false abstention remain risks; no fresh gate2 efficacy claim. See rc-sprint.md and immutable campaign reports.
