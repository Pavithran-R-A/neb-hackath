# Preflight truncation investigation and next-request proposal

This is non-billable engineering evidence. **No new inference request was made.** The earlier one-request authorization is consumed; the following live proposal is not authorized. PR #2 remains draft.

## Observed failure

The immutable [execution evidence](../results/live-preflight-2026-10-17.json) records HTTP 200, exact `nvidia/Nemotron-3_5-Lightning`, 391 input tokens, 256 output tokens, total 647, and `finish_reason: length`. Authentication and model access worked; JSON/action readiness did not pass. Estimated credit use was $0.00008490, not a provider billing statement. End-to-end client latency was 1062.98 ms.

The output budget was exhausted. Raw content, reasoning text and reasoning-token details were not retained, so we cannot establish whether reasoning consumed the budget, whether partial JSON was produced, or whether more tokens alone will solve it. Historical evidence and source reconstruction hashes remain unchanged. No partial JSON repair or acceptance of truncated valid-looking JSON is allowed.

## Documentation checked October 17, 2026

- [Structured output & JSON](https://docs.tokenfactory.nebius.com/ai-models-inference/json.md) documents `json_object` and `json_schema`; the schema example uses nested `name`, `schema`, `strict`.
- [Chat completion reference](https://docs.tokenfactory.nebius.com/api-reference/inference/create-chat-completion.md) defines that wrapper and `max_tokens`. It also exposes `max_completion_tokens` (described as including reasoning tokens), optional `completion_tokens_details.reasoning_tokens`, and `reasoning_effort` values. A general API field is not proof of support for a specific model.
- The [documentation index](https://docs.tokenfactory.nebius.com/llms.txt), [inference overview](https://docs.tokenfactory.nebius.com/ai-models-inference/overview.md), and [model-list examples](https://docs.tokenfactory.nebius.com/api-reference/examples/list-of-models.md) did not establish model-specific reasoning controls for the configured Lightning model. We omit `reasoning_effort`, `enable_thinking`, template overrides and other speculative controls. No claim that this model supports disabling reasoning is made.

Public docs were fetched without inference. Documentation hashes, a refreshed authenticated read-only catalog GET, and the local dry-run are in [revision evidence](../results/preflight-revision-plan-2026-10-17.json). The catalog was checked at 2026-10-17T14:13:56.503Z and reports $0.06/M input, $0.24/M output, with no supported non-token charges. A catalog listing does not prove schema support or future availability.

## Revised behavior

A short dedicated preflight system prompt replaces the generic browser-agent prompt **only for preflight**. It requests exactly the synthetic name-fill and Next-click plan. `response_format` is now `json_schema`, using a named strict schema with two bounded actions and no extra properties. Local `validateBatch` and exact expected-plan comparison remain mandatory even when the provider claims schema enforcement. The general browser-agent prompt and JSON-object contract remain unchanged.

The default output budget is 1,024, configurable through `--max-output-tokens INTEGER` or the library option, within 1–1,024. Invalid values fail before network access. Dry-run accepts this option without live flags. The cost estimate includes UTF-8 bytes for both messages and the schema plus a 1,024-token framing reserve. It is a conservative estimate, not an exact tokenizer or provider-enforced dollar cap.

The client retains only sanitized HTTP status, exact-model match boolean, allowlisted finish reason, refusal boolean, content character count and valid optional reasoning-token count. No response text or reasoning is retained. Unknown/absent reasoning usage stays null. Usage/cost remain unknown when required usage is absent; successful HTTP or model identity never substitutes for valid output. Diagnostics reset between attempts on the general client. No retry, model fallback or schema fallback is implemented.

Preflight still executes no browser actions. The independent signed-receipt verifier, task-bound action restrictions, credit-only gate, fixed destination, redirect prohibition, 30-second timeout, maximum one request and $0.50 project safety ceiling are preserved.

## Test evidence and limits

Mocked transports exercise normal completion; the historical 391/256 `length` response; 1,024-token truncation with reasoning metadata; malformed JSON/envelopes; provider refusal/content filtering; missing/inconsistent usage; model mismatch; token overruns; excessive response text; invalid task data/actions; invalid budgets; sanitized errors; no retries; and safe CLI defaults. Browser/application/receipt-verifier regression tests run without paid model calls. Tests do not establish real provider compatibility, reasoning behavior, robust browser-agent performance or competitive advantage.

Local validation: `node --test test/preflight.test.mjs test/nebius.test.mjs` passes 26 tests, exit 0. `npm run test:ci` passes all 78 tests (0 failed/skipped), exit 0; the [full regression log](../results/preflight-revision-regression-tests.txt) is retained. The configured 1,024-token CLI dry-run also exits 0 with zero requests. Hosted CI is tracked separately in PR #2. Independent review found no Critical/Important issues; its minor stale-diagnostics finding was fixed and covered by the 26th targeted test. No benchmark command was run.

## Go/no-go and precise next live test

**Go:** the revised contract is ready for one separately approved provider check after green CI. **No-go for execution now:** the prior approval is consumed. A full benchmark, deployment and merge remain out of scope.

Proposed next test: exactly one POST to `https://api.tokenfactory.nebius.com/v1/chat/completions`, existing protected NVIDIA model/key, compact synthetic preflight prompt and strict `synthetic_preflight` JSON schema; `temperature: 0`, `stream: false`, `max_tokens: 1024`; no reasoning overrides; 30-second timeout; redirects/retries/fallbacks disabled. Validate exact model, normal stop, JSON and exact allowed plan, positive consistent usage, and bounded cost. Stop after that request on success or failure. Preserve only sanitized diagnostics.

At the checked rates: input allowance 2,553 × $0.06/M = $0.00015318; output 1,024 × $0.24/M = $0.00024576; total safety estimate **$0.00039894**. For comparison, reusing the old 391 input-token count with the new output ceiling would cost $0.00026922; that is not a prediction for the changed prompt/schema. Pricing and current credit-only coverage must be rechecked before any future call. Propose a separate **$0.001 estimated credit ceiling for exactly one request**, existing credits only, no card/top-up. This is not an enforceable account billing cap. If model/schema incompatibility or truncation recurs, stop without a second request and investigate offline.
