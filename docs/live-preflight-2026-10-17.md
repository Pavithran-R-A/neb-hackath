# One actual NVIDIA Nemotron preflight — October 17, 2026

**Exactly one inference request was sent. No retry or further inference is authorized.** The call occurred at approximately **3:46 PM India time** (raw evidence timestamps are UTC). The owner's latest chat explicitly accepted their balance screenshot and no-bank-card statement as the billing attestation, authorized existing credits only, and prohibited purchases/top-ups/replenishment. That instruction supersedes the previous missing-billing-API blocker. No payment method, billing setting or resource was changed.

## Actual result

| Field | Observed result |
|---|---|
| Inference requests | **1** |
| HTTP status | **200** — credential accepted by the inference endpoint |
| Returned model | **nvidia/Nemotron-3_5-Lightning**, exact configured-model match |
| Input tokens | **391** |
| Output tokens | **256** |
| Total tokens | **647** |
| Full-response latency | **1,062.24 ms** capture; client reports **1,062.98 ms** including wrapper overhead |
| Current catalog input/output prices | **$0.06 / $0.24 per million tokens** |
| Estimated credit consumption | **$0.00008490** |
| Maximum authorized estimated expenditure | **$0.50** |
| Finish reason | **length** |
| Overall preflight | **Rejected / fail closed** — token-limited response, no accepted action plan |

Cost calculation: `(391 × 0.06 + 256 × 0.24) / 1,000,000 = $0.00008490`. This is a token-rate estimate, not a measured balance delta or provider billing statement. Balance delta and actual billed amount are unavailable; neither was fabricated. No billing endpoint was required after the owner explicitly accepted their attestation.

Authentication and model reachability succeeded. Full JSON/action readiness did **not** pass: the provider ended at the configured 256-token limit. The client rejected `finish_reason: length` before accepting a decision or executing any action. It is not known from the retained metadata whether reasoning, JSON length or other generation behavior consumed the limit. Do not invent a cause or claim end-to-end completion, competitive model performance or hackathon eligibility.

## Sanitized evidence and provenance

- `results/live-preflight-2026-10-17.json`: request counter, HTTP status, returned public model ID, usage, finish reason, latency, priced estimate, sanitized attestation flags and rejected result. No key, authorization header, raw financial amount or model response text is stored.
- Parent source: `7a2204b557711c1989a96bd2dafc5815e5471740`, with the narrowly scoped owner-no-card attestation extension. SHA-256 hashes in the evidence identify the exact executed source files.
- `results/live-preflight-execution.patch` preserves the executed gate extension against that parent. Later regression hardening rejects newly contradictory card/payment/expiry evidence; that later code was tested with simulated responses, not another live call.
- The execution-only wrapper reserved `results/live-preflight-2026-10-17.json` exclusively (`wx`) before any provider operation, refused a second POST, and consumed the existing preflight response clone for allowlisted metadata. Cloning a response does not make another request. An existing reservation/result prevents another invocation in this checkout. The persisted `authorizationConsumed: true` is the authoritative engineering record for future tasks; a fresh checkout is not new permission.

No redirects or automatic retries. The protected key remained scoped only to `api.tokenfactory.nebius.com`. A single non-billable catalog GET refreshed the current configured-model listing and prices before the inference call. Requests did not target other projects or billing APIs.

## Billing attestation handling

`owner-attested-no-card` is a distinct source, rather than falsely setting unknown platform toggles to disabled or claiming credit never expires. It requires the owner's explicit no-card, existing-credit-only and no-paid-replenishment assertions, recent confirmation and credits exceeding the limit. Actual expiry remains independently unverified, as the owner acknowledged/accepted. Explicit contradictory evidence still rejects. Legacy Billing-page/API evidence keeps its stricter expiry/toggle requirements.

## Regression validation and next decision

The added simulated regression reproduces the observed HTTP-200, exact model, 391/256/647 usage and `length` result, and confirms rejection with one attempted mock request and retained known usage/cost. It is not another provider execution. Full non-billable tests and hosted CI are recorded in `results/live-preflight-regression-tests.txt` and PR #2. The benchmark step remains opt-in and is skipped for this PR update.

The authorization is now **consumed**, including because the overall contract check failed. No token-limit increase, alternative model, altered prompt, retry or scenario benchmark was attempted. A future live diagnostic request needs separate owner authorization after offline investigation of supported model settings. PR #2 remains draft; no merge or public deployment occurred.

## Executed non-billable checks

- `npm ci`: exit 0, frozen dependency installation.
- `npm run browsers:install`: exit 0, pinned Chromium installed in cloud only.
- `npm run test:ci`: exit 0, **72 passed, 0 failed, 0 skipped**; actual local-browser regressions and simulated provider transports only. Raw log: `results/live-preflight-regression-tests.txt`.
- `node --test test/credit-gate.test.mjs test/preflight.test.mjs`: exit 0, **18 passed**. The observed truncation has its own simulated regression; no real retry.
- `git diff --check`: exit 0.

Independent review found no Critical/Important issue and verified the four exact execution-source checksums from the preserved patch/base. Its documentation note distinguishing observed usage from unverified billing was addressed. Hosted CI is recorded separately in PR #2; its benchmark step is disabled for PR events.
