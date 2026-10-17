# Product selection gate — October 19 decision deadline

Provisional direction: **ReceiptLab**, a verified-workflow QA workbench for builders of browser agents. Distinguish the agent's claim, actual synthetic state and an independently checked receipt. Keep deterministic automation as the competent default; use NVIDIA only for a measured recovery/diagnosis role after approved evaluation. No final model-product gate has passed.

Evidence: the historical 108 offline trials show DOM automation completing 10/10 newly authored positive trials while scripted recovery completed 4/10. All 14 raw false claims were blocked by the reporting boundary. The sole real Nemotron call authenticated and returned the exact NVIDIA model, but truncated at 256 tokens. There is no real model recovery, reasoning-quality or comparative advantage result.

| Candidate | Implementation | Design | Potential impact | Quality of idea | Decision |
|---|---|---|---|---|---|
| Generic autonomous form filler | Existing synthetic runner, no model advantage over DOM | Familiar workflow | Broad hypothetical use, no external validation | Crowded category, stable-name automation works | Do not polish as a proven autonomous product |
| ReceiptLab: workflow QA + verified completion | Working signed receipts, replay checks and reproducible failures | Claims/state/evidence comparison fits <3 min | Plausible tool for agent builders; no customer validation | Focus on independently testable outcomes | Best feasible provisional direction |
| Autonomous operations certification | Needs privileged systems, durable audit and rollback | Hard to demonstrate safely | Potential but unvalidated | Higher operational risk, missing integrations | Reject this sprint |
| General document fact checker | Needs new datasets/search/provenance | Discards browser work | Unvalidated | Crowded and unrelated to strengths | Reject scope expansion |

These are qualitative judgments against the official equally weighted criteria, not judge scores or market research. Tavily/live search is unnecessary: product tasks have synthetic local ground truth. Analytics and more research do not fix missing experimental evidence.

## Pre-registered evaluation / no-go

The v2 suite is public, author-designed and frozen by SHA with baseline/guard hashes in results/evaluation-v2-freeze.json. HTTP/Chromium fixture tests exercise nine cases: unfamiliar semantics, conditional sections, chained validation, conflicting instructions, malformed app responses, refreshed interfaces, injection, unavailable options and wrong saved state behind success UI. DOM fixture QA completes all seven positives; verification rejects both negatives. These are QA assertions, not an independent model benchmark.

After NEW aggregate approval, the campaign must first pass the revised preflight or stop. Run matched cases in fresh contexts, report raw model claims/action results, verified completion, negative-case behavior, guard/network denials, latency, tokens, known/unknown costs and source/suite/ledger IDs. Preserve failures; never substitute scripts.

Meaningful recovery advantage requires repeatable additional verified positives on legitimate tasks the competent comparator fails, without extra false claims or unsafe actions. **The current v2 comparator has no positive failures, so this suite cannot demonstrate a completion-rate advantage over it.** It can demonstrate parity, regressions or safety failures. Before an efficacy campaign, an independent task designer must supply new legitimate cases frozen before either policy sees them; do not manufacture comparator failures. The prepared campaign is an integration/safety feasibility check, not proof of superiority.

By October19, if no real reproducible benefit exists, stop advertising autonomous recovery. ReceiptLab may proceed as a verification/QA product only if Nemotron demonstrates useful, faithful diagnosis or assistance on separately evaluated traces. That role is a new hypothesis, not already implemented/live-validated. If no meaningful NVIDIA role passes, recommend no-go rather than decorative mandatory inference.
