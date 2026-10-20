# Judge release implementation plan

Goal: prepare a source-pinned, bounded NVIDIA judge service and test a no-card Workers/D1 alternative without deploying or replacing the tested Node runtime prematurely.

User authorization supplies architectural direction and autonomous execution. No design approval pause is needed; public provisioning/publication remains separately gated.

1. Workers candidate: isolated native fetch/D1 implementation, HMAC receipts, session ownership, transactional versioned recovery, immutable historical-credit import and atomic reservation before model POST. Exercise with actual workerd/D1 and mocked provider. Build only; no remote resources.
2. Hosting evidence: current official limits and no-card offering, quota failure behavior, capacity calculations, local runtime measurements distinguished from hosted CPU/account entitlement. Investigate alternatives if a critical contract fails.
3. Node judge mode: retain single-instance storage, reserve one bounded envelope from canonical account history, persistent per-request/day/session quotas and explicit judge access code. Restart preserves reservations; unknown work is never replayed. Valid through December15 20:00UTC; inference remains disabled absent explicit operator configuration. Tests cover denial, restart, concurrent requests and failure.
4. Fresh safety: implementation-blind new16case dataset frozen/reviewed before inference. Pin gate/comparator/source/suite, no label-driven changes before evaluation. Report raw confident mistakes, accepted errors, false abstention, safe advice, tokens/latency/costs without relabeling failures.
5. Judge UI: genuine elapsed wait, accessible source evidence, explicit protected access, positive/negative guided paths and accurate offline fallback. Real responsive Chromium tests with provider simulation.
6. Release: complete third-party inventory and proposed MIT review text; authentic narrated <3minute draft with synthetic-voice disclosure, no upload. Source-parity build, regressions, scoped security checks and independent review.
7. Push milestones to draft PR2, verify exact remote branch and hosted CI each phase, report only actual capabilities and remaining approvals.

Review focus: race between approval consumption and commit; session creation evading inference quotas; crash after POST before usage settlement; missing/changed history accidentally seeding new credits; server/model output crossing trust boundary. Preserve private action restrictions and signed verifier in all paths.
