# One-request Nemotron preflight

Historical preflight implementation/check record. Current account-catalog pricing, proxy routing, credit ceiling and milestones are recorded in [coordination](coordination.md); the original logs below remain historical.

## Scope and review

This change addresses the one-request preflight gate in the [independent review on PR #2](https://github.com/Pavithran-R-A/neb-hackath/pull/2#issuecomment-6214657699). No approval for billable inference was given. Continue on `feat/phase1-verified-completion`; keep PR #2 draft. Do not merge, deploy or access other projects.

Configuration was checked using variable presence only and the current published configuration metadata:

- `NEBIUS_API_KEY`: present and nonempty in the cloud process; saved environment network-secret binding has exactly one allowed destination, `api.tokenfactory.nebius.com`; no binding error or pending requirement.
- `NEBIUS_MODEL`: present and nonempty; matches the model ID recommended in the review. Its value was not displayed from the process or copied into logs.
- Input/output token price variables: absent. Review-posted prices are not treated as verified current account prices.
- This confirms configuration metadata and presence, not runtime authentication or catalog access. No authenticated inference or model-catalog request was made.

## Implementation

`npm run preflight` is a no-network check by default. It does not claim authentication or live validation. Its output does not include credential/model values. Missing credential prerequisites yield exit 1; missing current prices leave `readyForApproval` false.

The live path is gated on `--live`, `--approve-paid`, a positive explicit `--spend-limit-usd` and positive configured current input/output prices. It makes one request through the same Nemotron client used by the guarded agent. No retries or model fallback are possible. It requests JSON object output, caps output at 256 tokens, forbids redirects, and has a 30-second timeout including response consumption.

The synthetic request asks for a name fill and Next click; its decision is validated but never executed in a browser. Shared pure action validation keeps the preflight and guarded runner aligned. HTTP status must be 200; exactly one assistant choice must finish normally without refusal/tool calls; the returned model must equal the configured NVIDIA Nemotron ID. JSON key order is immaterial. Missing token usage, inconsistent totals, zero preflight usage, output overruns, malformed JSON/envelopes, unknown model aliases and out-of-task actions fail closed. Failed calls retain only sanitized known usage/cost/counts, never raw provider text.

The pre-request cost estimate counts UTF-8 message bytes plus a generous framing allowance and the output maximum. It is conservative guidance, **not a provider-enforced hard dollar cap**. Prices require verification against the account before approval. Any already incurred charge cannot be undone by rejecting a response.

## Non-billable validation

The test suite covers dry-run/no-request behavior; all approval/price/limit/credential gates; single-request endpoint/JSON/token settings; success with exact identity and complete usage; HTTP 401/403/404/429/500; transport/abort/timeout errors; malformed/refused/truncated responses; missing/inconsistent/over-limit usage; invalid model aliases and action schemas; key ordering; response cleanup errors; CLI failures and disclosure prevention. Every provider test supplies simulated transport and explicit test-only credentials. No real key is passed to a mocked request.

The existing real Chromium suite still exercises both flows and all ten scenarios with the baseline and scripted control. Existing offline evidence is historical and remains unchanged. Its `inappropriateActionsExecuted: 0` is a hard-coded runner field, not an independently measured safety result. The 3/30 false completion claims for each mode remain a known limitation.

## Remaining review gates

1. Owner approves a precise spending limit for the one-request preflight and verifies current token prices; no paid operation is approved by a CLI flag alone.
2. Run the preflight once, capture actual identity/authentication/usage/latency and a labeled cost estimate. Exact model aliases are not guessed; an unexpected returned ID fails until explicitly reviewed.
3. Add scenario selection, held-out variants and a smaller separately approved live experiment before the 80-request benchmark. This preflight change does not implement those later gates.
4. Demonstrate real NVIDIA recovery on a known baseline failure with an independent signed receipt. Successful preflight alone does not establish hackathon eligibility, application completion, model robustness or general safety.

## Executed validation evidence

- `npm run test:ci`: exit 0; **39 passed, 0 failed, 0 skipped**, including real Chromium and simulated provider/CLI tests. Raw log: [preflight-tests.txt](../results/preflight-tests.txt).
- `node --test test/preflight.test.mjs`: exit 0; **9 passed**, with explicit simulated transports only. Independent review found no Critical or Important issue; its one test-coverage note was addressed with branch-specific rejection assertions.
- `npm run preflight`: exit 0; dry-run reports **requestsSent: 0**, **liveValidated: false**, **readyForApproval: false** because current prices are absent. Raw log: [preflight-dry-run.txt](../results/preflight-dry-run.txt). Credential/model values are omitted.
- `npm run benchmark -- --repetitions 1 --output results/local/preflight-offline.json`: exit 0; 20 actual offline browser trials, baseline **3/10** and scripted control **8/10** verified completions, one false completion claim per mode rejected by independent verification. This is not model inference.
- `git diff --check`: exit 0. Hosted CI is tracked on PR #2 and is distinct from these local logs. No inference request, paid resource, merge or public deployment was executed.
