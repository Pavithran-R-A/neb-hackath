# ReceiptLab — verified workflow evidence

ReceiptLab is a cloud-developed browser-agent verification and failure-diagnosis workbench. Select a fictional challenge, inspect a failed workflow, compare a claim with private application state, request a grounded diagnosis, approve a permitted recovery, and export evidence. A model suggestion never proves completion: a separate verifier checks the intended task/run, unique server commit and signed receipt.

## Run in the isolated cloud checkout

```bash
cd /workspace/neb-hackath
npm ci
npm run browsers:install
npm test
npm run workbench
```

Node24.19.0 or newer; Playwright is pinned by lockfile. Browser/npm caches stay inside the ignored cloud checkout. The workbench listens only on loopback, port3000 (`PORT` override). Sessions expire after30minutes and restart clears state. No laptop installation, public deployment or model call occurs with these commands. Tests use simulated provider transports and real Chromium. `npm run test:ci`, `npm run security:check` and `npm audit` are the CI gates.

## User journey

1. Create a synthetic grant or workshop challenge and open its three-step form.
2. Observe validation, expired consent, transient failures, misleading success, injection or wrong-state cases.
3. Check private server state. Green page text alone cannot produce a verified outcome.
4. Diagnose with local rules, or NVIDIA Nemotron when an operator has started a bounded approved cloud campaign. Citations refer to actual source-tagged trace events. Model explanations and confidence are suggestions.
5. Explicitly approve an eligible synthetic recovery. The server checks the diagnosis/trace binding, permitted supplied values and current state; approval is single-use. Other recommendations require manual investigation.
6. Verify again and export the before/after verdicts, model usage, runtime/build hashes and frozen dataset hashes. Export checksums indicate consistency, not public-key authenticity.

NVIDIA diagnosis is **inactive by default**. `npm run workbench:live` prints a no-network plan. Its explicit approval-file mode is a local operator experiment, not an unrestricted public endpoint: source/suite/model/price pins, first preflight,3POST maximum,8192diagnostic output tokens,.02 estimated reservation, named scenarios only and cumulative account lock. Protected keys stay server-side. Do not invoke live mode outside the owner's recorded credit authorization.

## Evidence and limits

The original browser benchmark found that a competent DOM policy removed the scripted recovery advantage. All v2 positive cases are solvable by that comparator; they cannot establish NVIDIA completion-rate superiority. See [v1 evaluation](docs/evaluation-v1.md), [frozen v2](results/evaluation-v2-freeze.json) and [product decision](docs/release/product-decision.md).

A separate diagnosis dataset has16cases authored without policy access, then reviewed independently with labels visible. Frozen files and chronology are in [diagnosis freeze](results/diagnosis-freeze-v1.json) and [protocol](evaluation/diagnosis-v1/protocol.md). This is synthetic AI-agent authorship/review, **not external human expert validation**. Expected diagnoses, actions and required citations are inspectable. Consumed cases become regression cases. Mechanically valid citations do not certify explanation truth.

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

Read [architecture](docs/release/architecture.md), [deployment assessment](docs/release/deployment.md), [security/QA](docs/release/security-qa.md), [submission/video draft](docs/release/submission-draft.md) and [milestones](docs/coordination.md). Local Docker rehearsal is not public deployment. Public HTTPS routing, durable sessions/signing/budget coordination, owner licensing/eligibility signoff and judge access remain release gates. There is no public demo, uploaded video or Devpost submission. License remains pending owner approval.

Use factual NVIDIA/Nebius text attribution; no endorsement or unapproved logo use. This repository concerns this isolated synthetic project only. It proves nothing about completion on arbitrary external websites.
