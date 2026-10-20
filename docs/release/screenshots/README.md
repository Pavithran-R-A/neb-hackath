# Actual cloud browser screenshots

- `workbench-first-screen-2026-10-20.png`: first screen of the updated local Chromium workbench.
- `workbench-first-screen-2026-10-20-rc.png`: first screen captured during the source-hash-manifested final video run.
- `recorded-positive-local-recovery-2026-10-20.png`: actual current workbench positive path, local deterministic advice, explicit approval and independently verified signed receipt.
- `recorded-negative-local-claim-2026-10-20.png`: actual current workbench false-success path; the completion claim is rejected and recovery remains unavailable. These three new captures are fictional local synthetic QA behavior, not hosted pages or live NVIDIA inference; see [the capture manifest](../../results/rc-final-pitch-video-manifest.json).
- `workers-first-screen-2026-10-20.png`: first screen of the local Workers/D1 candidate after the same claim/proof/advice framing was added. Real Chromium confirmed keyboard labels and no horizontal overflow at320/768/1024/1440px; inference was disabled. A separate pinned local HTTPS test completes both guided outcomes, retains the valid receipt across Worker restart and records zero provider requests.

- `desktop.png`, `mobile.png`: earlier manual/DOM synthetic workbench, no NVIDIA inference.
- `live-e-ambiguous.png`: actual campaignE NVIDIA ambiguous/stop failure. No recovery completed; preserved honestly.
- `grant-transient-live-diagnosis.png`: actual campaignF model diagnosis before approval/recovery.
- `grant-transient-live-outcome.png`, `grant-transient-live-mobile.png`: actual model-assisted synthetic recovery with independent verified receipt after authorized automated QA approval.
- `workshop-false-success-live-outcome.png`, `workshop-false-success-live-mobile.png`: actual model's incorrect retry recommendation blocked by independent guard; UI completion claim rejected. This is system guard success, model negative failure.

CampaignF source fe3ac5f330eb0baccde4560a1890a246ac985374, exact source CI39048416815. Browser page errors0; no horizontal overflow at320/768/1024/1440px. Screenshots contain synthetic contact fields and expired local capability paths, no credentials or provider reasoning. Actual raw local videos are hash-listed in results/local-video-manifest.json; no public video uploaded. See demo-recording-plan.md for the final under3minute storyboard. These screenshots do not establish external-site efficacy or full accessibility certification.

## October18 candidate capture L

The six `rc-L-*.png` files are actual NVIDIA Lightning diagnosis/outcome/mobile screenshots at source7f6e5f55e267c8d69ef2ab6dfcdd1a07960978f0, CI39095156804 passed301. The service used private loopback HTTPS with an explicit temporary certificate SPKI pin and retained sessions/receipts/budgets. Positive: accepted temporary_failure/retry, explicit automated synthetic-QA approval, verified receipt. Negative: accepted unverified_claim/stop, no executable recovery, completion claim rejected. These are successful observed integration cases, not a new benchmark. All four viewport widths320/768/1024/1440passed horizontal-reflow assertions; pageErrors0. No public deployment/certificate, human usability study or WCAG certification. K's earlier capture-helper failure is preserved separately.
