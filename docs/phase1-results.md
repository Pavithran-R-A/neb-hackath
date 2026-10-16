# Phase 1 measured evidence and decision

Historical report for the source commit below. For the later protected-configuration check and one-request preflight, see [Nemotron preflight status](nemotron-preflight.md).

## Status

**Local testbed and scripted recovery feasibility: GO. NVIDIA inference effectiveness and hackathon eligibility: NOT YET DEMONSTRATED.** The actual Nemotron comparison is blocked by missing `NEBIUS_API_KEY`, missing selected `NEBIUS_MODEL`, and separate approval for paid calls. Nothing was deployed publicly. No live API calls or paid resources were used.

## Reproduction and provenance

Source commit: `f3f6db8d4eda8297ae26dbb9081f75e3d9199659`. Benchmark reports `codeTreeDirty: false`. Node `v24.19.0`, pinned Playwright 1.64.1 Chromium. Report interval: `2026-10-16T11:17:16.019Z` to `2026-10-16T11:17:51.425Z` (UTC).

Commands executed in `/workspace/neb-hackath`:

| Command | Exit | Actual result |
|---|---:|---|
| `npm ci` | 0 | Frozen installation of two packages |
| `npm run browsers:install` | 0 | Pinned Chromium available |
| `npm run test:ci` | 0 | 30 tests passed, 0 failed, 0 skipped; includes ten real-browser subtests |
| `npm run benchmark -- --repetitions 3 --output results/phase1-offline.json` | 0 | 60 actual trials, 30 per mode |
| `npm run benchmark -- --live` | 1 | Credential prerequisite rejected before any request |

Raw evidence: [test output](../results/test-output.txt), [benchmark JSON](../results/phase1-offline.json), [per-trial JSONL](../results/phase1-offline.json.jsonl), [console output](../results/benchmark-output.txt), [live prerequisite output](../results/live-prerequisite-output.txt). The source commit identifies the implementation measured; a later evidence-only commit contains these files. CI runs independently on the PR and uploads its own results; local logs are not GitHub Actions logs.

## Results

| Metric | Fixed-label baseline | Scripted guarded control | Live NVIDIA Nemotron |
|---|---:|---:|---|
| Trials | 30 | 30 | Not run |
| Verified completions | 9 / 30 | 24 / 30 | Unknown |
| Completable-case completion | 9 / 24 (37.5%) | 24 / 24 (100%) | Unknown |
| Correct negative outcomes (no completion or claim) | 3 / 6 | 3 / 6 | Unknown |
| False completion claims | 3 / 30 | 3 / 30 | Unknown |
| Executed inappropriate actions | 0 observed | 0 observed | Unknown |
| Denied action/network attempts | 0 | 0 | Unknown |
| Median end-to-end latency | 331.23 ms | 313.85 ms | Unknown |
| P95 end-to-end latency | 1679.99 ms | 432.48 ms | Unknown |
| Model calls / inference cost | 0 / $0 | 0 / $0 | Not measured |

Eight of ten scenarios are completable. Two are negative cases. Both agents complete the two clean cases and the injection case in all repetitions. The scripted control additionally completes renamed labels, missing labels, strict telephone formatting, consent expiry, and transient submission failure, all independently verified. Thus five distinct baseline failures are recovered, with 15 additional verified completions over three repetitions. This is an engineering control comparison, **not a model comparison**.

## Failure analysis

- Renamed/unlabeled fields: fixed accessible-label selectors time out. The control reads current labels/placeholders. These are known cases, so this does not establish general web robustness.
- Telephone format: baseline submits unformatted data and stalls; the control applies only the transformation requested by validation, retaining the same digits.
- Consent reset/transient submission: baseline does not retry. The guarded control observes the new error and retries within its turn bound.
- False-success page: both modes claim completion three times, despite no committed submission. The independent verifier rejects all six claims. The system reports failure rather than accepting the model/UI statement. Preventing the agent's false claim itself remains unsolved.
- Invalid email: both modes fail to complete. The control aborts instead of fabricating a corrected identity; no receipt is created. This is the correct negative outcome.
- Injection: the scripted control ignores page instructions by construction. Guard tests reject explicit malicious actions. Whether a real model follows the task under prompt injection remains untested.

## Review and limitations

An independent source review identified three Important defects: pending response rejection after a failed click, accepting a policy decision without usage, and treating a null provider envelope as zero cost. Each was reproduced with a failing regression test, fixed, and verified with a green full suite. No Critical or Minor findings remained from that review. The final fixes were verified by tests; live provider behavior remains unreviewed and unexecuted.

The verifier is independent of the browser/model within one process and uses a private server ledger plus signed run-bound receipts. It is not an external third-party authority or a persistent production database. Server restarts erase all runs. This is a testbed, not a production security boundary against a malicious application server.

Only two small fixed flows and ten development cases exist. The control is tailored to visible form semantics, and the baseline is intentionally basic. Repetitions measure reliability on these cases, not statistical significance or out-of-distribution generalization. Timing includes selector timeouts, fresh browser contexts and local server work; it cannot estimate paid model latency. CPU/browser use is real cloud execution, but no separate infrastructure billing measurements were collected. Reported $0 is specifically inference cost for zero model calls, not a claim that all infrastructure is free.

## Required next steps

1. In the published `neb-hackath` cloud environment's **environment settings → protected secrets**, configure `NEBIUS_API_KEY` with HTTPS destination `api.tokenfactory.nebius.com` if required. Never provide the value in chat. Set `NEBIUS_MODEL` to an available NVIDIA Nemotron catalog ID.
2. Obtain explicit spending approval for a bounded run. The README command caps the full first comparison at 80 requests, 1,024 output tokens each, with no automatic HTTP retries; this is not a dollar cap. Supply current token prices for labeled estimates and consult Nebius billing for actual charged cost.
3. Run the live comparison, retain real usage/outcomes/latency/cost evidence, add held-out cases and repeated model runs. No silent fallback is permitted. Claim runtime eligibility only after actual NVIDIA model execution.
4. If Nemotron does not recover at least one baseline failure with an independently verified receipt, report no-go or pivot. If it succeeds, improve negative-case handling before further product work. Select a license and prepare verified demo/video only after feasibility is established.

Rulings made during implementation: continue in this existing isolated cloud checkout on a development branch, without creating another worktree; preserve the user's no-paid-calls constraint and label scripted results separately. No deferred Minor review findings.
