# ReceiptLab release-candidate implementation plan

**Goal:** Prepare a private reviewable release candidate with semantic safety and realistic evaluation, durable public-compatible architecture, genuine NVIDIA evidence and judge UX.
**Architecture:** See ../specs/2026-10-17-release-candidate.md. Root implements acceptance/inference orchestration; isolated authors implement independent suite/comparator, UI and runtime. Source freeze/CI before paid experiments. Owner expressly requests autonomous execution.
**Tech:** Node24.19+, node:test, real Playwright Chromium, built-in SQLite, protected Nebius fixed endpoint.

## Constraints and review focus

No unrelated project/resources/card/topup/hosting/deploy/merge/media upload/submission. Retain50USD reserve. Evidence must distinguish raw suggestions/accepted abstentions/guard/outcome, simulation/live, source claim/hash authenticity and credit estimate/provider balance. Tests must cover unsupported confident retry, stale/contradictory telemetry, restart/replay/lease loss, spoofed proxy origin, provider truncation/refusal/missing usage, blocked persistence, mobile/error/session recovery.

- [ ] Root: failing semantic gate tests (including actualFwrongretry), minimal gate/workflow integration, confidence-error metrics; freeze before v2cases inspected.
- [ ] Independent author:16fresh realistic structured/prose traces+labels; separate reviewer audits before freeze; no policy access.
- [ ] Independent baseline author: source/temporal/fact-aware policy with own generic tests; freeze before any v2input; retain even if model loses.
- [ ] Research supported current NVIDIAmodels/configurations/rates; root adds mock-tested explicit per-campaign selection, source/suite/account gates; plan record before each paid experiment, exact-headCI first.
- [ ] Runtime agent: single-origin proxy, configuredHTTPS/Securecookies, durable records/sessions/key + exclusive lease/budgetroot; meaningful restart/isolation/failure tests, concrete private deploy config.
- [ ] UI agent: guided judgedemo andsemantic statuses, keyboard/mobile/loading/error handling, realChromiummocked tests; root actualbounded live capture only after clean source/CI.
- [ ] Root: integrate, fullregression/audit/scan, localHTTPS/container restart rehearsal, independent review/fix, source-pinned actualevidence, docs/assets/licenseproposal, push milestones and verify exactheadCI; update draftPR2 and reportgates.
