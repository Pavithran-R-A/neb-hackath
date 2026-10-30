# Submission package — working draft, not submitted

**Product:** ReceiptLab — trust the receipt, inspect the claim
**Candidate track:** Best Apps and Agents, subject to owner eligibility/track confirmation
**Status:** Submission is incomplete. The public URL is https://receiptlab-judge.onrender.com. As of October 30, Render starts the app in bounded-judge mode and `/health` reports `liveInferenceEnabled:true`; this does not prove a real model response. Health and homepage returned HTTP 200 today. Public `main` is `1db019dbf0784a20ce3ef211d7ec97d6f155615d` (documentation-only update atop deployed source `ebf2ee7274087a40c4967111817904bd88e27357`); exact-source CI passed 363/363 and hosted synthetic acceptance passed without provider calls. Draft PR #6's PostgreSQL-backed five-second health regression also passed in exact-head CI (run 41037877196, 363/363). PR #2 is merged and closed; Apache-2.0 LICENSE/NOTICE are public. The campaign plan currently expires before the official judge-access deadline. The video is not uploaded and Devpost has not been submitted.

The [official rules snapshot](../../results/hackathon-rules-check-2026-10-20.json) was retrieved October20, 2026. It requires runtime Token Factory inference or Nebius AI Cloud compute plus an NVIDIA open-source model; a working test-build URL; a public licensed repository and README; an under-three-minute public YouTube demonstration; feedback on tools/models; and free judge access through December23 at 20:00 UTC, the end of the official judging window. The equally weighted criteria are Technological Implementation, Design, Potential Impact and Quality of the Idea. Submission deadline is October30 at 10:00 PDT (17:00 UTC / 22:30 India).

## Devpost description draft

Browser agents can show “submitted” even when the server never committed the form. ReceiptLab gives agent developers a synthetic workbench for testing that gap. It compares a browser's claim with source-tagged workflow events and an independent verifier bound to the intended task, run, single server commit and signed receipt.

NVIDIA Nemotron through Nebius Token Factory can diagnose a failed workflow, cite trace evidence and recommend a constrained recovery. Its answer is advice: a semantic gate can abstain, private state checks determine whether recovery is permitted, a human explicitly approves, and the verifier checks the resulting state. The model cannot create a receipt or declare completion.

Actual private HTTPS Chromium captures show a positive transient-error case: one guarded retry was approved and a signed receipt verified. A second case shows a misleading success claim: the model recommended stopping and the verifier found no receipt. This is integration evidence, not a benchmark.

Our frozen v3 live evaluation was negative and partial. Four of five attempted diagnoses were usable; one exhausted 8,192 output tokens, leaving eleven cases unattempted. On the same four cases, Nemotron matched 1/4 diagnosis labels and 2/4 safe actions; the deterministic comparator matched 3/4 on each. A prior gate falsely accepted one uncertain write. A consumed-output replay now requires review, but does not validate the amendment on fresh data. We make no general superiority or arbitrary-site reliability claim. The cases and review were AI-authored/AI-reviewed, not external expert validation.

ReceiptLab's intended audience is developers debugging browser-agent failures and false completion. External adoption and real-world impact remain unmeasured. The public service is configured for bounded NVIDIA diagnosis, but this checkpoint has not independently captured a successful provider response from that deployed runtime. Historical Campaign L contains actual model-assisted synthetic journeys; those are not current deployment evidence. Owner-approved Apache-2.0 licensing is applied to the covered project source. Public video, current hosted inference evidence and final submission are still outstanding.

## Demo URL and judge instructions

**Test build:** https://receiptlab-judge.onrender.com

**Public repository / license:** https://github.com/Pavithran-R-A/neb-hackath (Apache-2.0 detected on `main`)

**Complete hackathon source:** https://github.com/Pavithran-R-A/neb-hackath/tree/main (default branch; PR #2 merged October 29, 2026).

**Source revision:** `ebf2ee7274087a40c4967111817904bd88e27357`. Issue #5 and the connected Render API confirm deployment `dep-dbi3r8dg1s2s73dtqdfg` running this SHA; the connected Neon API confirms the campaign budget has zero requests and is not halted. Protected configuration values remain unavailable.

**Model mode:** bounded judge runner configured and health reports inference enabled. No new real provider call has been independently verified in this session. A private judge access code is required and must be issued to judges via an approved private access path; never put it in the repository or public page description. The saved plan allows 100 lifetime requests, 20/day, 2/session and a $0.50 total reservation; the existing expiry is Dec 15, shorter than the Dec 23 rules requirement. Do not claim qualified access until a safe migration is verified.

Suggested reviewer journey (synthetic data only):

1. Open the test URL. Synthetic challenges, local-rule diagnosis and receipt checks need no account. To make a model request, an operator-issued code is required; no code is published in this draft.
2. Start the positive transient-error case, complete its fictional three-step form in the separate form view, and return to ReceiptLab.
3. Inspect the trace. If a private judge code has been issued and the bounded campaign is still valid, ask Nemotron once and inspect the actual usage and citations; otherwise use local rules and label it as deterministic. Explicitly approve only an eligible retry, then verify the signed receipt independently. Export the evidence and confirm completion proof comes from server state.
4. Start the negative false-success case. Complete its fictional form, return to ReceiptLab, and check the claim. The verifier must reject the claim and keep unsupported recovery disabled.

This is an accurate synthetic judge journey. It does not demonstrate a current hosted Nemotron response, durable state after a live Render restart, or access through Dec 23. Do not describe it as provider-verified until the two actual model-assisted flows and database accounting are independently recorded.

## Screenshot attachments prepared

| Candidate attachment | What it shows | Evidence boundary |
| --- | --- | --- |
| [`workbench-first-screen-2026-10-20-rc.png`](screenshots/workbench-first-screen-2026-10-20-rc.png) | Product promise, claim/proof/advice separation and guided cases | Local Chromium capture; no inference |
| [`recorded-positive-local-recovery-2026-10-20.png`](screenshots/recorded-positive-local-recovery-2026-10-20.png) | Deterministic diagnosis, explicit approval and verified receipt | Local synthetic QA; no inference |
| [`recorded-negative-local-claim-2026-10-20.png`](screenshots/recorded-negative-local-claim-2026-10-20.png) | Misleading claim rejected and recovery blocked | Local synthetic QA; no inference |
| [`rc-L-grant-transient-live-diagnosis.png`](screenshots/rc-L-grant-transient-live-diagnosis.png) | Actual historical Nemotron recommendation and provider metrics | Campaign L at its pinned historical source; not current public runtime |
| [`rc-L-workshop-false-success-live-outcome.png`](screenshots/rc-L-workshop-false-success-live-outcome.png) | False-success claim rejected despite historical model recommendation | Campaign L historical model advice; independent guard/verifier denied completion |

The public Devpost form requires image uploads. These repository assets are ready for selection, but no browser/Devpost connector is available in this Work session to upload them. Apache-2.0 licensing is approved and published; media rights and personal eligibility attestations remain separate owner decisions.

## Evidence for the four criteria

| Official criterion | Evidence presented | Honest limitation |
| --- | --- | --- |
| Technological Implementation | Bounded Nemotron/Token Factory runtime is deployed; historical live Campaign L journeys; grounded trace citations; semantic gate; single-use approval; independent signed-receipt verification; hosted synthetic acceptance; local Node/PostgreSQL restart tests | No current hosted provider response or production restart was verified in this session; campaign expiry is Dec 15 vs required Dec 23; v3 is partial and negative; no measured model advantage |
| Design | First screen says what false-success problem ReceiptLab addresses; guided positive/negative paths; claim, advice, approval and verifier outcome are separated; browser testing covers keyboard and320/768/1024/1440 widths | No human usability study, WCAG certification or public judge session |
| Potential Impact | Specific target: agent developers diagnosing false completion and uncertain writes; demonstrates a useful audit boundary | No adoption, incident-reduction, external user, or production impact data |
| Quality of the Idea | Proof-first, run-bound verification paired with model-generated failure diagnosis | Synthetic scope only; the model trails the comparator on the four paired v3 cases |

## Video and artifacts

The [2:02.46 judge-pitch review cut and rights/quality assessment](narrated-video-plan.md) contains 90.3 seconds of source-hash-verified moving browser footage plus 8.4 seconds of separately labeled historical Campaign L screenshots. It shows local-rule recovery/refusal plus genuine historical NVIDIA/Nebius advice and receipt evidence, and preserves the partial negative v3 result. The closing narration says live judge mode is pending; that was accurate at recording time, but the mode is now deployed. The video does not show a current hosted provider request. SHA256: `737696338926edb06466bbe05eaec503e7fb4e7c77b206fe060245abb2a4d2e5`; details are in [the derivative manifest](../../results/rc-final-pitch-video-manifest.json). The MP4 is present in the cloud checkout and remains unpublished. The upload description now discloses the deployed-mode status and limits; owner media review remains required.

Official rules prohibit third-party trademarks or copyrighted material in the public video without permission. The draft uses only textual NVIDIA/Nemotron/Nebius names, no logo, stock footage or music, but text attribution is not proof of permission. Owner clearance is required before upload. The narration is synthetic Flite voice; the owner must review listening quality and caption timing.

## Constructive NVIDIA/Nebius feedback draft

- Exact model identity, strict JSON output and token usage were recorded on completed calls. The Lightning v2 suite completed16/16 diagnoses; the v3 campaign exposed reasoning/output-token exhaustion at8,192. Model-specific reasoning controls remain unconfirmed for Lightning.
- On the usable four-case v3 subset, the deterministic diagnosis baseline matched three cases versus Nemotron's one; safe actions were three versus two. This is the only paired comparison for that partial run and does not justify a general model-quality claim.
- A malformed/semantic failure from Nano and an HTTP500 from Super were retained. The Super diagnosis request had unknown usage, so the full reservation stayed charged in the local ledger.
- Helpful platform improvements would be model-specific documented reasoning budgets, precise token-accounting behavior on failed requests, provider-side per-request/per-campaign hard credit caps, and an explicit credit-only/no-card billing mode.
- Citation structure is useful for inspecting a recommendation, but citations and confidence labels do not establish semantic truth; preserve an independent state/action guard and receipt verifier.

## Remaining release decisions

- **Hosting:** the existing isolated Render + Neon service is in bounded-judge mode; do not recreate it. Render and Neon connectors verified the existing resources and budget, but do not expose the protected config values. Capture a real hosted model call and complete the safely versioned restart/budget migration only after the exact protected plan and billing guard are verifiable. Render Free idle sleep and Neon quotas prevent a 24/7 guarantee.
- **Ownership and licensing:** the owner approved Apache-2.0 and root LICENSE/NOTICE are present. Independently confirm contribution and dependency/media rights, and team/affiliation/territorial eligibility before final submission.
- **Brand/media rights:** confirm textual sponsor/model naming is allowed under Devpost's third-party trademark rule and review synthetic narration/captions.
- **Submission:** verify hosted inference, migrate the budget through Dec 23 without resetting history, complete rights review, publish the video and complete Devpost's final owner attestations. PR #2 is already merged; no further merge is pending.

The owner-approved Apache-2.0 software license is already published. It does not grant video-publication rights, make personal eligibility attestations, or authorize final Devpost submission. A read-only Oct 30 catalog check made zero inference calls and returned `creditOnlyVerified:false`; no current hosted model usage is claimed. See [release evidence](../../results/sprint-release-evidence.json), [latest v3 result](../../results/judge-M-analysis.json), [video manifest](../../results/rc-final-pitch-video-manifest.json), [hosting assessment](workers-hosting-assessment.md), [license proposal](license-proposal.md), [final release report](RECEIPTLAB-FINAL-HACKATHON-RELEASE-REPORT.md) and [current go/no-go](final-go-no-go.md).
