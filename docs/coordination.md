# Hackathon milestones and service decisions

Source of scope: the owner's PAV-54–PAV-57 descriptions and latest PR #2 discussion. GitHub is the authoritative engineering record in this session. Linear is connected at account level but its tools are not exposed here; no issues were read/updated through Linear and no duplicate tasks were created. These are sync-ready status notes, not claims of external tracker updates.

| Task | Owner deadline (2026, India date) | Current status | Evidence / next gate |
|---|---|---|---|
| [PAV-54](https://linear.app/pavithran29/issue/PAV-54/live-nemotron-preflight-and-dollar050-credit-guard) | Oct 17 | Non-billable preparation complete; live check blocked | Published binding checked; verbose current catalog confirms rates; proxy-enabled native Node GET works; simulated validation tests pass. One preflight is conditionally approved; current automatic charging/top-up status remains unconfirmed. See authorized-preflight.md. |
| [PAV-55](https://linear.app/pavithran29/issue/PAV-55/held-out-agent-benchmark-and-fix-false-claims) | Oct 20 | In progress | Frozen evaluation v1, stronger DOM baseline, explicit final verification gate and unpaid results implemented. Real NVIDIA comparison and fresh independent cases remain. |
| [PAV-56](https://linear.app/pavithran29/issue/PAV-56/prepare-isolated-judge-accessible-cloud-demo) | Oct 25 | Read-only options assessed; no resources created | Public plan documentation only; account plans/quotas unavailable. Runtime fit, isolation and hosting approval remain. |
| [PAV-57](https://linear.app/pavithran29/issue/PAV-57/ship-licensed-repo-3-minute-demo-and-devpost-entry) | Oct 28 | Pending prerequisite evidence | License choice, verified demo, public YouTube video under three minutes and Devpost materials after actual NVIDIA execution. Nothing submitted. |

The PR discussion records an external final deadline of Oct 30, 10 AM PDT (10:30 PM India time), with judging access through Dec 15. Internal milestones above are earlier. Recheck the [official rules](https://nebiusglobalaihackathon.devpost.com/rules) before submission; this session did not independently certify eligibility or rules changes.

## Billing and live authorization

`npm run preflight:catalog` makes a GET to the fixed `api.tokenfactory.nebius.com/v1/models?verbose=true` endpoint and then performs a no-inference preflight dry-run using its rates. The configured model is present. Current prompt/completion catalog rates are **$0.06/$0.24 per million tokens**, with zero catalog per-request charge. Sanitized timestamped evidence is in `results/catalog-readiness.json.txt`; no key/model value is printed. This is route/catalog access, not a successful completion or proof of account credit balance.

Node's native fetch initially failed on the cloud route. Node 24's supported `--use-env-proxy` option fixed the GET. npm preflight, catalog and benchmark entrypoints now include it; TLS verification is preserved. Node 24.19.0 is the minimum tested runtime, matching this cloud machine. No VPN, credentials or proxy configuration was replaced.

The one-request preflight's current safety estimate is **$0.00021762** using 2,603 input-token allowance and 256 maximum output tokens at the returned catalog prices. Actual tokenizer behavior, response usage and billing remain unverified. `--spend-limit-usd` is an estimate-based per-invocation gate, **not a hard cumulative provider dollar cap**. Limits above $0.50 are refused. Repeated manual invocations would reset the local call counter; there is no account-enforced campaign ledger. No top-up, billing API, retry or second request is automatic. Do not approve/launch a campaign under the pretense of a hard $0.50 total guarantee. A single actual preflight is now conditionally approved, but no inference has run because the current credit-only billing conditions remain unverified. See [authorization/billing status](authorized-preflight.md).

## Hosting investigation — zero resources created

Public official documentation was inspected, not account inventories. ClaimKhoj, DueWeave, Railway and all existing services were untouched. No free-plan entitlement, account quota, provider credit or zero-charge guarantee was inferred from public pricing.

| Option | Public-plan evidence | Fit for this prototype | Decision |
|---|---|---|---|
| [Vercel Hobby](https://vercel.com/docs/plans/hobby) | Free tier for personal/non-commercial use; terms must fit the hackathon use | Suitable for a static judge UI. The persistent Node app plus bundled Playwright browser is not a drop-in serverless deployment; a separate browser backend adds complexity. | Keep as possible frontend only; verify eligibility and current limits before any isolated project. |
| [Cloudflare Workers](https://developers.cloudflare.com/workers/platform/pricing/) | Free plan lists 100,000 requests/day and 10ms CPU/invocation | A Worker cannot directly run this native Chromium process. A managed browser service or separate worker/backend would be needed. Browser service pricing/quotas not verified. | Not a zero-cost equivalent of current runtime; do not provision. |
| [Render Free](https://render.com/docs/free) | 750 free workspace hours/month, idle spin-down after 15 minutes, roughly minute-long cold start; ephemeral files, free database expires after 30 days | Closest candidate for a single Node/browser container, but RAM/build compatibility untested. Existing in-memory ledger resets on spin-down; judge evidence must be exported independently. Quotas may already be consumed in an account, which was not inspected. | First candidate for a later isolated runtime-fit check after authorization, not an approved host or guaranteed free deployment. |

None has been load-tested or deployed. Current server binds loopback only; making it public needs explicit run isolation, request limits, protected credentials, safe browser egress, concurrency controls, durable verification evidence and owner approval. Do not weaken the loopback restriction as part of this assessment. Prefer an offline recorded demonstration until public hosting is authorized and viable through judging.

## PostHog, search and plugin limitations

PostHog requirements were assessed from [official privacy/data-collection documentation](https://posthog.com/docs/privacy/data-collection); no existing PostHog project was accessed. A judge demo needs only allowlisted events such as `run_started`, `verification_finished`, `completion_claim_rejected`, and `provider_request_finished`. Include synthetic scenario ID, agent mode, gate outcome, duration, known token counts and nullable cost estimate. Do not capture form contents, emails, prompts, model responses, secrets, persistent user identifiers or full URLs. Disable autocapture, session replay and automatic pageviews by default. Consent/retention and a dedicated isolated project must be decided before activation. Current local JSON evidence already supplies operational outcomes; no analytics SDK is needed for Phase 1.

No callable Linear, Vercel, Cloudflare, Render, Firecrawl, PostHog or Tavily tools are exposed in this Work session despite account connections. No unsupported plugin installation or ad-hoc credential request was attempted. Official docs and GitHub APIs were sufficient for this scoped work. Firecrawl competitor research was unnecessary for the current bottleneck. Tavily adds no functional value to fixed fictional forms; leave it out until a concrete retrieval task and success metric justify its cost and egress.

## Product decision from stronger evaluation

The scripted recovery control's advantage against a fixed-label baseline does not establish an advantage over conventional robust DOM automation. The stronger baseline matches it on development cases and outperforms it on the new evaluation candidates. Prioritize verified completion as the functioning system boundary. Do not market a Nemotron recovery advantage before actual NVIDIA results beat this stronger comparator. No grand-prize, runtime eligibility, safety or public-demo readiness claim follows from these tests.
