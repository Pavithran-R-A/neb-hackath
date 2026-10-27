# Submission package — working draft, not submitted

**Product:** ReceiptLab — trust the receipt, inspect the claim
**Candidate track:** Best Apps and Agents, subject to owner eligibility/track confirmation
**Status:** Submission is not ready. The public deterministic test URL is https://receiptlab-judge.onrender.com; its recorded deployment runs with inference disabled. On October 27, a direct HTTPS `/health` request returned HTTP 200 with `persistent-synthetic`, PostgreSQL storage and `liveInferenceEnabled:false`; an earlier 503 had recovered, so this is not continuous-availability proof. Exact-head external GitHub Actions acceptance passed synthetic positive and negative journeys, but did not exercise live Nemotron or process restart. PR #2 is open and draft at source `c74a8c3c3afc95eac78dcb8c11a23a9160f89c14`. No root license has been applied, the video is not uploaded, and Devpost has not been submitted.

The [official rules snapshot](../../results/hackathon-rules-check-2026-10-20.json) was retrieved October20, 2026. It requires runtime Token Factory inference or Nebius AI Cloud compute plus an NVIDIA open-source model; a working test-build URL; a public licensed repository and README; an under-three-minute public YouTube demonstration; feedback on tools/models; and free, unrestricted judge access through December15 at noon Pacific time. The equally weighted criteria are Technological Implementation, Design, Potential Impact and Quality of the Idea. Submission deadline is October30 at 10:00 PDT (17:00 UTC / 22:30 India).

## Devpost description draft

Browser agents can show “submitted” even when the server never committed the form. ReceiptLab gives agent developers a synthetic workbench for testing that gap. It compares a browser's claim with source-tagged workflow events and an independent verifier bound to the intended task, run, single server commit and signed receipt.

NVIDIA Nemotron through Nebius Token Factory can diagnose a failed workflow, cite trace evidence and recommend a constrained recovery. Its answer is advice: a semantic gate can abstain, private state checks determine whether recovery is permitted, a human explicitly approves, and the verifier checks the resulting state. The model cannot create a receipt or declare completion.

Actual private HTTPS Chromium captures show a positive transient-error case: one guarded retry was approved and a signed receipt verified. A second case shows a misleading success claim: the model recommended stopping and the verifier found no receipt. This is integration evidence, not a benchmark.

Our frozen v3 live evaluation was negative and partial. Four of five attempted diagnoses were usable; one exhausted 8,192 output tokens, leaving eleven cases unattempted. On the same four cases, Nemotron matched 1/4 diagnosis labels and 2/4 safe actions; the deterministic comparator matched 3/4 on each. A prior gate falsely accepted one uncertain write. A consumed-output replay now requires review, but does not validate the amendment on fresh data. We make no general superiority or arbitrary-site reliability claim. The cases and review were AI-authored/AI-reviewed, not external expert validation.

ReceiptLab's intended audience is developers debugging browser-agent failures and false completion. External adoption and real-world impact remain unmeasured. A public deterministic test build is available, but it is not the bounded live NVIDIA judge runtime. No repository license has been applied, so the project is not yet an open-source release.

## Demo URL and judge instructions

**Test build:** https://receiptlab-judge.onrender.com

**Public repository:** https://github.com/Pavithran-R-A/neb-hackath

**Source revision:** `c74a8c3c3afc95eac78dcb8c11a23a9160f89c14` (draft PR #2; deployment currently reports older source `9933f10c10a6eb05c7b38d9e60622ca436010176`).

**Model mode:** deterministic / live NVIDIA inference disabled in the deployed service. No judge access code is currently recorded in the submission materials.

Suggested reviewer journey (synthetic data only):

1. Open the test URL. No login is needed for the deterministic synthetic workbench.
2. Start the positive transient-error case, complete its fictional three-step form in the separate form view, and return to ReceiptLab.
3. Inspect the trace, request deterministic diagnosis, explicitly approve the eligible retry, and verify the signed receipt independently. Export the evidence and confirm the completion proof comes from server state.
4. Start the negative false-success case. Complete its fictional form, return to ReceiptLab, and check the claim. The verifier must reject the claim and keep unsupported recovery disabled.

This is an accurate test of the current public service. It does not demonstrate current hosted Nemotron inference, durable state after a Render restart, or availability guarantees through the judging window. Do not submit this as the completed live NVIDIA demo until those release gates pass.

## Screenshot attachments prepared

| Candidate attachment | What it shows | Evidence boundary |
| --- | --- | --- |
| [`workbench-first-screen-2026-10-20-rc.png`](screenshots/workbench-first-screen-2026-10-20-rc.png) | Product promise, claim/proof/advice separation and guided cases | Local Chromium capture; no inference |
| [`recorded-positive-local-recovery-2026-10-20.png`](screenshots/recorded-positive-local-recovery-2026-10-20.png) | Deterministic diagnosis, explicit approval and verified receipt | Local synthetic QA; no inference |
| [`recorded-negative-local-claim-2026-10-20.png`](screenshots/recorded-negative-local-claim-2026-10-20.png) | Misleading claim rejected and recovery blocked | Local synthetic QA; no inference |
| [`rc-L-grant-transient-live-diagnosis.png`](screenshots/rc-L-grant-transient-live-diagnosis.png) | Actual historical Nemotron recommendation and provider metrics | Campaign L at its pinned historical source; not current public runtime |
| [`rc-L-workshop-false-success-live-outcome.png`](screenshots/rc-L-workshop-false-success-live-outcome.png) | False-success claim rejected despite historical model recommendation | Campaign L historical model advice; independent guard/verifier denied completion |

The public Devpost form requires image uploads. These repository assets are ready for selection, but no browser/Devpost connector is available in this Work session to upload them.

## Evidence for the four criteria

| Official criterion | Evidence presented | Honest limitation |
| --- | --- | --- |
| Technological Implementation | Historical bounded Nemotron/Token Factory journeys; grounded trace citations; semantic gate; single-use approval; independent signed-receipt verification; hosted deterministic positive/negative acceptance; local Node/PostgreSQL restart tests | Current public deployment has inference disabled; hosted restart is unverified in this session; v3 is partial and negative; no measured model advantage |
| Design | First screen says what false-success problem ReceiptLab addresses; guided positive/negative paths; claim, advice, approval and verifier outcome are separated; browser testing covers keyboard and320/768/1024/1440 widths | No human usability study, WCAG certification or public judge session |
| Potential Impact | Specific target: agent developers diagnosing false completion and uncertain writes; demonstrates a useful audit boundary | No adoption, incident-reduction, external user, or production impact data |
| Quality of the Idea | Proof-first, run-bound verification paired with model-generated failure diagnosis | Synthetic scope only; the model trails the comparator on the four paired v3 cases |

## Video and artifacts

The [2:02.46 judge-pitch review cut and rights/quality assessment](narrated-video-plan.md) contains 90.3 seconds of source-hash-verified moving browser footage plus 8.4 seconds of separately labeled actual Campaign L screenshots. It shows current local-rule recovery and refusal plus genuine historical NVIDIA/Nebius advice and receipt evidence, preserving the partial negative v3 result. The final slate accurately says the public test build is deterministic and live NVIDIA judge mode is pending. SHA256: `737696338926edb06466bbe05eaec503e7fb4e7c77b206fe060245abb2a4d2e5`; details are in [the derivative manifest](../../results/rc-final-pitch-video-manifest.json). The MP4 is present in the cloud checkout and remains unpublished. A [YouTube publication packet](youtube-publication-packet.md) is prepared, but no video was uploaded.

Official rules prohibit third-party trademarks or copyrighted material in the public video without permission. The draft uses only textual NVIDIA/Nemotron/Nebius names, no logo, stock footage or music, but text attribution is not proof of permission. Owner clearance is required before upload. The narration is synthetic Flite voice; the owner must review listening quality and caption timing.

## Constructive NVIDIA/Nebius feedback draft

- Exact model identity, strict JSON output and token usage were recorded on completed calls. The Lightning v2 suite completed16/16 diagnoses; the v3 campaign exposed reasoning/output-token exhaustion at8,192. Model-specific reasoning controls remain unconfirmed for Lightning.
- On the usable four-case v3 subset, the deterministic diagnosis baseline matched three cases versus Nemotron's one; safe actions were three versus two. This is the only paired comparison for that partial run and does not justify a general model-quality claim.
- A malformed/semantic failure from Nano and an HTTP500 from Super were retained. The Super diagnosis request had unknown usage, so the full reservation stayed charged in the local ledger.
- Helpful platform improvements would be model-specific documented reasoning budgets, precise token-accounting behavior on failed requests, provider-side per-request/per-campaign hard credit caps, and an explicit credit-only/no-card billing mode.
- Citation structure is useful for inspecting a recommendation, but citations and confidence labels do not establish semantic truth; preserve an independent state/action guard and receipt verifier.

## Remaining release decisions

- **Hosting:** the existing isolated Render Free + Neon Free service is deployed; do not recreate it. It offers the deterministic public journey only. Confirm current account tier/quota and protected settings through the connected Render/Neon integrations, then complete hosted restart and bounded NVIDIA journeys. Render Free idle sleep and Neon quotas prevent a 24/7 guarantee.
- **Ownership and licensing:** confirm all contribution ownership, team/affiliation/territorial eligibility, dependencies/media rights and approve the proposed MIT license before adding a root `LICENSE`.
- **Brand/media rights:** confirm textual sponsor/model naming is allowed under Devpost's third-party trademark rule and review synthetic narration/captions.
- **Submission:** activate and verify judge mode and unrestricted free testing through the judging period; review rights, apply an owner-approved license, approve YouTube upload and complete Devpost's final owner attestations. Keep PR #2 in draft. No PR merge is authorized.

No legal or publication approval is granted by this document. No additional Nebius inference was used in this sprint. See [release evidence](../../results/sprint-release-evidence.json), [latest v3 result](../../results/judge-M-analysis.json), [video manifest](../../results/rc-final-pitch-video-manifest.json), [hosting assessment](workers-hosting-assessment.md), [license proposal](license-proposal.md) and [final release report](RECEIPTLAB-FINAL-HACKATHON-RELEASE-REPORT.md).
