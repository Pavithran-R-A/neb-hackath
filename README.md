# ReceiptLab — verified workflow evidence

> **Hackathon source:** the complete ReceiptLab application is on the default [`main` branch](https://github.com/Pavithran-R-A/neb-hackath/tree/main). PR #2 was merged on October 29, 2026 (merge commit `e90f032f8cef1901e563208791c5460ff06ec40b`). The public repository is licensed under Apache-2.0.

ReceiptLab is a cloud-developed browser-agent verification and failure-diagnosis workbench. Select a fictional challenge, inspect a failed workflow, compare a claim with private application state, request a grounded diagnosis, approve a permitted recovery, and export evidence. A model suggestion never proves completion: a separate verifier checks the intended task/run, unique server commit and signed receipt.

## Run in the isolated cloud checkout

```bash
cd /workspace/neb-hackath
npm ci
npm run browsers:install
npm test
npm run workbench
```

Node 24.19.0 or newer; Playwright is pinned by lockfile. Browser/npm caches stay inside the ignored checkout. The local workbench listens only on loopback, port 3000 (`PORT` override). Sessions expire after 30 minutes; local mode clears state on restart. The separately configured PostgreSQL runtime persists sessions, signing key, receipts and consumed approvals. These commands make no model request. Tests use simulated provider transports and real Chromium. `npm run test:ci`, `npm run security:check` and `npm audit` are the CI gates.

## User journey

1. Create a synthetic grant or workshop challenge and open its three-step form.
2. Observe validation, expired consent, transient failures, misleading success, injection or wrong-state cases.
3. Check private server state. Green page text alone cannot produce a verified outcome.
4. Diagnose with local rules, or NVIDIA Nemotron when an operator has started a bounded approved cloud campaign. Citations refer to actual source-tagged trace events. Model explanations and confidence are suggestions.
5. Explicitly approve an eligible synthetic recovery. The server checks the diagnosis/trace binding, permitted supplied values and current state; approval is single-use. Other recommendations require manual investigation.
6. Verify again and export the before/after verdicts, model usage, runtime/build hashes and frozen dataset hashes. Export checksums indicate consistency, not public-key authenticity.

The public service is configured in bounded judge mode; its health endpoint reported `liveInferenceEnabled:true` on October 30, 2026. **That flag is not proof of a successful provider request.** The latest release evidence still has no new real hosted diagnosis or usage settlement. A private judge code is required; do not publish it. The recorded campaign limits are 100 total requests, 20 per day, 2 per session and a $0.50 reserved envelope, with no automatic retry. The current persisted plan expires December 15, 2026, earlier than the official December 23 judge-access requirement, so availability through judging is not qualified. `npm run workbench:live` prints a no-network plan; no page load or startup makes an inference request.

## Evidence and limits

The original browser benchmark found that a competent DOM policy removed the scripted recovery advantage. All v2 positive cases are solvable by that comparator; they cannot establish NVIDIA completion-rate superiority. See [v1 evaluation](docs/evaluation-v1.md), [frozen v2](results/evaluation-v2-freeze.json) and [product decision](docs/release/product-decision.md).

A separate diagnosis dataset has16cases authored without policy access, then reviewed independently with labels visible. Frozen files and chronology are in [diagnosis freeze](results/diagnosis-freeze-v1.json) and [protocol](evaluation/diagnosis-v1/protocol.md). This is synthetic AI-agent authorship/review, **not external human expert validation**. Expected diagnoses, actions and required citations are inspectable. Consumed cases become regression cases. Mechanically valid citations do not certify explanation truth.

The October18 release-candidate evaluation completed all16 new v2 traces with NVIDIA Nemotron Lightning: raw diagnosis12/16, recovery12/16 and paired diagnosis/recovery10/16; the independent telemetry comparator scored12/16,10/16 and8/16. The model had two high-confidence diagnosis errors. A later review gate replayed these consumed outputs with zero inference:9accepted,4abstained,3review-required, leaving neither observed high-confidence error accepted while reducing displayed pair agreement to6/16. This is post-hoc safety adaptation, not new held-out validation or autonomous superiority. Remaining9v1traces also completed; their results are consumed regression evidence. See [RC sprint](docs/release/rc-sprint.md) and [review amendment](results/rc-semantic-review-amendment.json).

The October19 fresh v3 campaign is the newest live evaluation and a **partial negative result**: after one preflight, five diagnoses were attempted; four were usable, one exhausted the8,192 output-token limit, and eleven cases were unattempted. On the same four paired cases Nemotron matched1/4 diagnosis labels and2/4 safe actions, compared with3/4 and3/4 for the deterministic baseline. The previous gate falsely accepted one uncertain write. A post-hoc replay now requires review until the write outcome resolves, but it uses consumed outputs and is not fresh gate validation. See [v3 analysis](results/judge-M-analysis.json) and [campaign evidence](results/judge-M-outcome.json). No model or product superiority is claimed.

The latest private HTTPS integration capture (campaignL) completed both actual NVIDIA journeys: an accepted transient retry with explicit automated synthetic-QA approval obtained a verified receipt; an accepted unverified-claim/stop recommendation left the misleading-success task incomplete. Three POSTs including preflight cost an estimated$0.00232932. [Actual L evidence](results/rc-L-browser-outcome.json), [current credit accounting](results/rc-credit-usage-summary.json), [candidate screenshots](docs/release/screenshots/README.md) and [36.36-second captioned engineering-preview manifest](results/rc-video-manifest.json) are preserved. No benchmark, public deployment, human usability study or video upload is implied. The final 1:59.26 cloud-local owner-review cut and source hashes are in [the video review](docs/release/narrated-video-plan.md); it contains source-authentic local positive/negative UI interactions plus separately labeled historical Campaign L model video and screenshots. It has not been uploaded. Historical model failures and K's capture-helper failure remain recorded.

Live experiments and subsequent model-readiness decisions are recorded in [diagnosis sprint](docs/release/diagnosis-sprint.md), `results/campaign-*-plan.json`, corresponding outcome/ledger files and [draft PR#2](https://github.com/Pavithran-R-A/neb-hackath/pull/2). Preserve failed campaigns. An HTTP200/model match with truncated output is a failure, not successful NVIDIA functionality. Simulated integration tests and screenshots must not be presented as live model evidence.

## Credentials, credits and execution controls

Only in the published `neb-hackath` environment settings, configure protected `NEBIUS_API_KEY` with destination **api.tokenfactory.nebius.com** and non-secret `NEBIUS_MODEL` with the exact available NVIDIA Nemotron ID. Never paste keys into chat, Git or browser code. `npm run preflight:catalog` performs catalog GET only. `npm run preflight`, `npm run campaign:plan` and `npm run diagnosis:plan` perform no inference.

[Owner standing authorization](https://github.com/Pavithran-R-A/neb-hackath/pull/2#issuecomment-6235724302) supersedes historical one-request permissions: bounded documented campaigns may use existing account credits while retaining the planned$50 judge reserve. No cards, purchases, replenishment or hosting charges. A fresh campaign records purpose, source/suite, request/token/reservation limits and current rates **before** inference. Exclusive persistent workspace/account ledgers reserve before POST; unknown usage keeps full reservation; failure stops; no retries, resume, fallback or concurrent replicas. Estimates are not provider-enforced dollar caps or independently observed balances.

The legacy live benchmark entrypoint is disabled. Offline benchmarking remains explicit:

```bash
npm run benchmark -- --split development --repetitions 2 --output results/local/development.json
```

Raw claims and denied actions remain separate from verified outcomes. `reportedFalseCompletions=0` follows from the verifier boundary, not improved model reasoning. Unmeasured action-safety metrics remain null.

## Release preparation

Read [architecture](docs/release/architecture.md), [deployment assessment](docs/release/deployment.md), [Render + Neon deployment runbook](docs/release/render-neon-runbook.md), [security/QA](docs/release/security-qa.md), [submission/video draft](docs/release/submission-draft.md), [final go/no-go checklist](docs/release/final-go-no-go.md), [final judge-pitch video review](docs/release/narrated-video-plan.md) and [milestones](docs/coordination.md). The local reference runtime uses atomic SQLite snapshots. The existing public service is `https://receiptlab-judge.onrender.com`, on the existing Render Free service and dedicated Neon project documented in [Issue #5](https://github.com/Pavithran-R-A/neb-hackath/issues/5). Current Work checks on October 30 returned HTTP 200 for `/health` and `/`; health reports PostgreSQL-backed `persistent-synthetic` storage and `liveInferenceEnabled:true`. This confirms the configured mode, not a successful live model diagnosis. Exact main CI [run 40891258475](https://github.com/Pavithran-R-A/neb-hackath/actions/runs/40891258475) passed at source `ebf2ee7274087a40c4967111817904bd88e27357`; hosted synthetic acceptance [run 40902880407](https://github.com/Pavithran-R-A/neb-hackath/actions/runs/40902880407) also passed. The private judge code and current Render/Neon account settings are unavailable in this Work session. The current persisted plan expires December 15, before the official December 23 access date. The private video remains unpublished and Devpost has not been submitted. See the [current release report](docs/release/RECEIPTLAB-FINAL-HACKATHON-RELEASE-REPORT.md) for the evidence boundaries and remaining gates.

Use factual NVIDIA/Nebius text attribution; no endorsement or unapproved logo use. This repository concerns this isolated synthetic project only. It proves nothing about completion on arbitrary external websites.
