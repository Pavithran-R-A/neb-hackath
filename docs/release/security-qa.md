# QA and security review — no certification

Implementation source: d59089260f0a41619f8e032e3b3972faff9a097b, following 67fa080 (campaign/run binding) and 412b976 (workbench/fixtures). Current branch/CI evidence is linked in PR#2. Tests and mock/provider evidence are distinct.

## Executed checks

- npm run test:ci: **119 passed, zero failed/skipped**, including real Chromium (see results/sprint-final-tests.txt and final exact-SHA hosted CI).
- Campaign tests: known/unknown usage, reservation before fetch, call/token/credit limits, source/suite mismatch, refusal/model/JSON/HTTP/transport failure, concurrent request denial, closed ledger reuse and directory-sync failure; explicit simulated transports only.
- Verifier: same-task intact cross-run replay, missing run binding, tampered signature/payload, duplicate, wrong task/flow, misleading UI and wrong saved state.
- Workbench: parallel session ownership, unauthenticated evaluator denial, host/origin/POST checks, body/rate/session/run limits, expiration, restart, keyboard navigation, delayed-verdict race, downloads and 320/768/1024/1440px layouts. No horizontal overflow/page errors in tested journey; no screen-reader/WCAG certification claimed.
- New nine-case fixture QA: actual HTTP state transitions and Chromium DOM automation, all seven positives and both verifier-negative cases pass. These are consumed public author-designed regression cases, not blind model results.
- npm audit: **zero known advisories** in the current locked dependency set at check time; not proof of vulnerability absence.
- npm run security:check: no exact injected protected-value/private-key markers found in tracked source. Narrow heuristic, not a comprehensive historical secret scan.
- Nonroot, read-only, no-network container build/three-step smoke/restart passes; no credentials or host ports attached. Not a public deployment test.

## Independent review and fixes

Initial audit identified the live benchmark's credit-gate bypass, missing intended-run identity binding, guard's unsupported-semantic ceiling, unbounded records, and hardcoded unmeasured safety zeros. The live legacy path is disabled; bounded campaigns are now the proposed path. Run identity is mandatory. Public app-owned field bindings are equally available to both policies. Synthetic records expire and have admission limits; unmeasured action counts are null.

Final read-only review ran 30 targeted tests and found no critical issue, one important durability gap and one minor provenance limitation. **Fixed:** fsync newly created ledger directory entries/ancestors and their existing parent before network access. The fault-injection test failed first, then passed; full suite passes after the fix. Unknown outcomes keep reservations and require a new authorization, not automatic retry/resume.

**Deferred minor:** workbench exports identify git HEAD or operator-provided SOURCE_COMMIT, but do not attest clean runtime contents or include suite hash. Modified/unverified deployments can therefore use an unchanged label. Export is a review record; authenticate the build against the published commit/file hashes and CI before relying on provenance. This does not bypass the private task/run verifier. Do not call the artifact checksum a public authenticity proof.

## Limits and tool availability

The Codex Security deep-scan server is not exposed in this session. Its [skill](skill://Plugin_1e648473be9c8191a91ac3947151af55/deep-security-scan/SKILL.md) requires: “If the tool is unavailable, stop and explain that Deep Security Scan requires the Codex Security plugin server.” No canonical deep scan was run and no security certification is claimed. Manual independent review and tests are narrower evidence.

The form's random run URL is a capability within the local synthetic app. Do not share it or expose the raw app publicly. Workbench private verdicts require owner cookies, but public deployment still needs gateway/routing, HTTPS, durable state/key handling, multi-replica abuse/budget coordination and account verification. Expired records are removed during subsequent app activity; restart clears all state. Model action restrictions do not prove absence of every harmful in-vocabulary action on arbitrary websites.

No full benchmark, new inference, card/payment/top-up, public resource, merge or submission occurred. Actual model evidence remains one HTTP200/model-match response with finish_reason:length and $0.00008490 estimated use. The compact/schema/1,024-token revision has only mocked validation.
