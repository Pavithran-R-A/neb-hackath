# NVIDIA model/configuration research

Checked 2026-10-17, account catalog at **16:59:49 UTC**. Research issued GET requests only; **zero inference requests**. This does not establish account balance, billed spend, inference availability, or diagnosis quality. Existing protected authentication was sent only to `api.tokenfactory.nebius.com`, without printing it. No global model/environment setting changed.

## Current account catalog

Source: [authenticated verbose model catalog](https://api.tokenfactory.nebius.com/v1/models?verbose=true). Filtered safe metadata is retained locally in `.cache/rc-model-research/catalog-nemotron.json`; no complete account catalog or credentials are retained.

| Exact case-sensitive model ID | Input USD / million tokens | Output USD / million tokens | Context tokens | Quantization | Catalog region |
| --- | ---: | ---: | ---: | --- | --- |
| `nvidia/NVIDIA-Nemotron-3-Nano-30B-A3B` | 0.06 | 0.24 | 262144 | fp8 | FI / eu-north1 |
| `nvidia/Nemotron-3_5-Lightning` | 0.06 | 0.24 | 1048576 | bf16 | FI / eu-north1 |
| `nvidia/nemotron-3-super-120b-a12b` | 0.30 | 0.90 | 262144 | fp4 | US / us-central1 |
| `nvidia/Nemotron-3-Ultra-550b-a55b` | 1.00 | 3.00 | 1048576 | fp4 | US / us-central1 |

Prices are catalog `pricing.prompt` / `pricing.completion` per-token USD rates multiplied by 1,000,000. All four explicitly show zero `request`, `image`, `price_per_video_second`, and `price_per_minute` charges. `input_cache_read` is null: no cache discount assumed. Catalog estimates are not provider billing statements or hard dollar caps. Region metadata does not prove a request routed through a specific region or certify retention/privacy guarantees.

All four advertise exactly `supported_features: ["tools", "reasoning"]` and sampling parameters `temperature`, `top_p`, `top_k`, `repetition_penalty`, `frequency_penalty`, `presence_penalty`. They do **not** advertise JSON/schema support, `reasoning_effort`, `chat_template_kwargs`, or a reasoning-budget parameter. Missing metadata is uncertainty rather than a proven rejection.

The [official public catalog JSON](https://tokenfactory.nebius.com/api/public/models_info) corroborates these four IDs/rates and has no JSON-mode tag for them. It also lists `nvidia/Nemotron-3.5-Super-VL`, but that model is absent from this account's verbose catalog; do not select it based on public availability alone. Public catalog throughput values are marketing metadata, not latency measurements for this workload.

## What the documentation actually supports

- [Nebius JSON guide](https://docs.tokenfactory.nebius.com/ai-models-inference/json.md): generic `response_format.type=json_schema` and `json_object`; explicitly directs users to a model card's **JSON mode** tag and warns that engine/model capabilities differ. This does not establish strict schema compatibility for these exact Nemotron endpoints. Keep a schema preflight and local validation.
- [Nebius Chat Completions API reference](https://docs.tokenfactory.nebius.com/api-reference/inference/create-chat-completion.md): generic `reasoning_effort` enum `none`, `minimal`, `low`, `medium`, `high`, `xhigh`, `max`, or null. No model-specific mapping was found, and this schema does not document `chat_template_kwargs`. Do not infer that `reasoning_effort="none"` disables Lightning thinking.
- [NVIDIA Nano BF16 model card](https://huggingface.co/nvidia/NVIDIA-Nemotron-3-Nano-30B-A3B-BF16): local `apply_chat_template(enable_thinking=False)` disables reasoning; default thinking is true. Recommends temperature 1.0 / top_p 1.0 for reasoning and temperature 0.6 / top_p 0.95 for tool calling. This is upstream model guidance, **not confirmation** that Nebius's fp8 endpoint forwards template kwargs.
- [NVIDIA Super BF16 model card](https://huggingface.co/nvidia/NVIDIA-Nemotron-3-Super-120B-A12B-BF16): recommends temperature 1.0 / top_p 0.95 across reasoning, tool calling and chat. Self-hosted compatible-client examples show `chat_template_kwargs.enable_thinking`, `low_effort`, and `force_nonempty_content`. These are upstream controls, **not established Nebius endpoint controls**. Its advanced `reasoning_budget` example is a custom two-call continuation wrapper, not evidence of a single-request Nebius parameter; that wrapper conflicts with the existing no-retry campaign contract.

A guessed Lightning Hugging Face model-card URL returned HTTP401; no authoritative Lightning-specific reasoning-control support was established. Neither the API-wide enum nor another Nemotron generation's tokenizer template is sufficient evidence to add reasoning controls to Lightning. A provider-supported endpoint-specific mapping remains unresolved.

## Two bounded representative configurations

Recommend changing model and supported sampling deliberately, keeping the existing **8192 output-token maximum**, instead of repeating the exhausted Lightning request with more tokens. These are proposals for a separately pinned campaign, not executed inference or claims that the alternatives will pass.

1. **Nano baseline:** model `nvidia/NVIDIA-Nemotron-3-Nano-30B-A3B`, `temperature:1`, `top_p:1`, `stream:false`, `max_tokens:8192`, same strict diagnosis response schema; omit reasoning/template controls. Tests another currently available NVIDIA endpoint at the current price, using its upstream reasoning recommendation.
2. **Super stronger comparator:** model `nvidia/nemotron-3-super-120b-a12b`, `temperature:1`, `top_p:0.95`, `stream:false`, `max_tokens:8192`, same strict diagnosis response schema; omit reasoning/template controls. Tests a larger model at 3.75 times output price and 5 times input price. Catalog region is US; retain synthetic data only.

For each configuration: freeze source/suite/schema/model/sampling and exact rates before any POST; require one small schema preflight and at most two representative diagnoses (one recoverable transient, one misleading-success/contradiction). Maximum three POSTs per model; stop on first HTTP error, identity/schema/grounding failure, empty content, timeout, unknown usage, or `finish_reason=length`; no automatic retry, fallback, or parallel replicas. Bound preflight output to 256 and diagnoses to 8192 each; retain existing exclusive persistent account reservations. A fresh unseen negative trace improves safety evidence; consumed examples establish regression behavior only.

With conservative **16384 input tokens per request**, three requests and those output bounds reserve approximately **$0.00694 Nano** / **$0.02972 Super** before extra safety margin. A reviewable combined estimate ceiling of $0.05 covers this token arithmetic, not unknown provider charges or account balance. Recompute using the actual input allowance and refreshed catalog before execution; preserve the owner-required $50 judging reserve. Failures retain reservations under the existing unknown-usage rules.

Current diagnosis runner enforces `approval.model === process.env.NEBIUS_MODEL` and hardcodes temperature zero. A campaign-specific explicit model/sampling pin and corresponding request guard are needed to test these proposals without changing the global environment. Do not bypass the source-cleanliness, schema, token, spending, or account-ledger checks. Log only safe status, model identity, finish reason, token counts, latency, and estimates; never raw reasoning, auth, provider bodies, or user contact values.
