# Phase 1: Verified Completion Agent

Authority: README, AGENTS, GitHub Issue #1, and the user's instruction to implement autonomously. No design approval pause is required by the user.

Build an isolated Node 24 loopback-only HTTP testbed: fictional grant and workshop applications, identity → details → review → submission. Fixed cases cover normal flows, renamed labels, missing labels, phone formatting, consent reset, transient failure, false-success UI, invalid input, and prompt injection. No production targets or personal data.

The baseline uses fixed accessible labels. The guarded runner observes visible controls and accepts only bounded JSON fill/click/check/wait/done/abort actions from either a clearly labeled scripted control or a real NVIDIA Nemotron provider. The provider uses the official Nebius Token Factory HTTPS endpoint, explicit model configuration, timeout, a shared call cap and output-token cap. Paid mode requires explicit opt-in. It never falls back to another provider or to the scripted policy.

Browser requests and navigation are restricted to the one ephemeral app origin and public form endpoints. Model input is untrusted page text, observations and fictional task data. Model actions cannot access evaluator state or arbitrary JavaScript, URLs or selectors. A completion claim is never sufficient.

An independent verifier reads server state outside the browser. It validates a server-signed receipt against the stored submitted payload, run, flow, expected synthetic identity/details and exactly one completion event. A forged receipt, stale receipt, incomplete or wrong-data submission cannot pass. Server validation remains authoritative even if the browser is bypassed.

Benchmark both agents on identical fixed tasks in fresh contexts. Store per-run completion, claims, false claims, blocked actions, latency, calls, token usage, and model cost (null when unmeasured; configured token-rate estimates labeled as estimates). Scripted control results do not establish Nemotron effectiveness. Live results require credentials and paid-call approval; neither is currently available. Exit criterion: at least one baseline failure recovered with independent verification, with live eligibility evidence separately pending if blocked.

No public deployment. Commit and push a development branch and open a PR with actual test/benchmark evidence and blockers.
