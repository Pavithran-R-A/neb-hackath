# Evaluation v1: stronger baselines and completion reporting

## Provenance and test design

Frozen candidate/actor source commit: `01934f4c835acbe27066b93439d6c57c3193984f`, before their first browser evaluation. Measured source: `f842b6166cb350febfd169ebd1f9d31b8fb086b6`, `codeTreeDirty: false`. Node `v24.19.0`. Subsequent runtime pin/credit ceiling changes did not tune agent policies. Eight new author-designed candidates were added to the original ten development cases. These cases were unseen by the existing policies but author-visible and public; this is **not an independent blind holdout**. After this first use they are consumed evaluation/regression cases. Keep future model holdouts separate and frozen before tuning.

New conditions: unfamiliar labels, field reordering, permanent outage, correctly signed receipt for wrong saved task data, misleading success banner while a form remains active, unavailable session, and combined phone-format/transient error. The server still enforces all three stages. Expected outcomes and server records are never supplied to a browser policy. The stronger baseline uses ordinary HTML `name` attributes, select options, bounded retry and observed formatting requirements; stable semantic field names are an explicit assumption.

Command: `npm run benchmark -- --split all --repetitions 2 --output results/evaluation-v1.json`, **exit 0**. **108 actual offline trials**: 18 cases × 3 modes × 2 repetitions. No model inference or model-cost measurements. Latency includes local context/browser work and failure timeouts; lower latency on a premature abort is not better task performance. Order alternates by repetition, cases remain fixed, and the small sample supports no statistical/generalization claim.

Raw [JSON](../results/evaluation-v1.json), [per-trial JSONL](../results/evaluation-v1.json.jsonl), [console output](../results/evaluation-output.txt). The `holdout` split name is retained for reproducible IDs, not continuing novelty.

## Actual comparison

Verified numerator counts independently completed tasks; denominator includes **only completable trials**. Development has 16 positive/4 negative trials per mode; new candidates have 10 positive/6 negative trials per mode. All negative outcomes remain in raw records and completion-claim counts.

| Split | Mode | Verified / completable | Raw false claims | Final false reports | Median all-trial latency |
|---|---|---:|---:|---:|---:|
| development | baseline | 6/16 | 2 | 0 | 330.26 ms |
| development | dom-autofill | 16/16 | 2 | 0 | 305.52 ms |
| development | scripted-control | 16/16 | 2 | 0 | 299.08 ms |
| holdout | baseline | 4/10 | 2 | 0 | 942.67 ms |
| holdout | dom-autofill | 10/10 | 2 | 0 | 295.40 ms |
| holdout | scripted-control | 4/10 | 4 | 0 | 225.25 ms |

The DOM baseline completes every completable case in both splits. The scripted recovery control matches it in development but only completes 4/10 positive new trials. It fails unfamiliar-label cases because its field recognizer/action guard lacks those semantics, and prematurely claims completion on the misleading banner. No policy was tuned after these results. The weak baseline also completes 4/10 positive new trials but fails a different set: unfamiliar labels and compound errors.

Negative cases matter: persistent outage and unavailable sessions do not complete; validly signed wrong-data receipts fail expected-task verification. Baseline/DOM each falsely claim the wrong-data page twice; the scripted control also falsely claims the banner twice. Original false-success UI still induces raw claims twice per mode. In total **14 raw false claims** are preserved and rejected across 108 trials.

## What changed in false-completion handling

A required finalization boundary receives the independent `verifyCompletion` verdict. `rawClaimedCompletion` and `falseCompletionClaim` preserve model/UI behavior. `reportedCompletion` is emitted only when the signed receipt and expected server state verify; otherwise completion is `verification-failed` or `not-completed`. That gate is applied identically to all agents. Zero final false reports is mechanical from this trusted boundary and is not a claim that an agent's reasoning improved. `correctNegativeOutcomes` continues to count raw claims, so a rejected false claim still fails that agent metric. Wrong-task, forged, duplicate and missing receipts remain covered by tests.

`inappropriateActionsExecuted` is now **null/unmeasured**, rather than reusing the runner's old literal zero. Denied actions and network attempts remain observable counts. Neither field proves absence of harmful in-vocabulary actions. Historical evidence files are preserved as historical.

## Product decision and remaining risks

There is no evidence that the scripted recovery approach beats a realistic deterministic baseline; it is weaker on these new cases. No real NVIDIA model run occurred, so model reliability, eligibility, latency and cost remain unmeasured. The useful demonstrated differentiator is the independent verified-completion boundary, not superiority of an untested model.

Next: one owner-approved contract preflight, then an independently approved small model experiment against this stronger comparator. New genuinely unseen cases must follow a separate freeze; do not relabel consumed cases as held-out or tune on them and report unseen performance. The overly narrow guard, stable-name assumption, process-local ledger, lack of paid inference evidence and lack of a public authorized deployment remain limitations. Existing credit balance and a hard cumulative spend guarantee have not been established. See [milestones and service decisions](coordination.md).
