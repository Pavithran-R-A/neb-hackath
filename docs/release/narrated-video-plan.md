# Final judge-pitch review cut

The current owner-review candidate is `.cache/qa/receiptlab-judge-pitch.mp4`, H.264/AAC 1920×1080 with selectable English captions. It is **122.461 seconds (2:02.46)**, with **90.3 seconds of actual source browser video at original speed**, **8.4 seconds of source-hash-pinned screenshots from the historical live campaign**, and clearly editorial results/end cards. SHA256: `737696338926edb06466bbe05eaec503e7fb4e7c77b206fe060245abb2a4d2e5`. The [final cut manifest](../../results/rc-final-pitch-video-manifest.json) pins the output, Chromium recordings, Campaign L screenshots, model outcome and preflight evidence. It remains private in the cloud workspace; it has not been uploaded or submitted.

The current UI path opens with the ReceiptLab problem statement, then follows a fictional multi-step form into a transient failure, local deterministic advice, explicit synthetic-QA approval, recovery, and independent signed-receipt verification. The local sequence is marked **no inference**. Two genuine, clearly dated Campaign L screenshots show the actual NVIDIA Nemotron-3.5 Lightning recommendation and later signed-receipt verdict. The actual source browser capture then shows the separate negative live case. That video is not edited to imply the stills are live footage. Campaign L cost three bounded posts including preflight, estimated at **$0.00232932**. No new inference was made for this cut.

| Approx. time | Evidence in the cut |
|---|---|
| 0–40s | Current ReceiptLab UI; synthetic local positive path, claim/proof separation, approval and receipt |
| 40–49s | Source-hash-pinned historical Campaign L diagnosis and verified-receipt screenshots |
| 49–77s | Actual historical Campaign L browser video; false-success rejection and model stop case |
| 77–100s | Current local synthetic false-success case and independent rejection/no-recovery |
| 100–122s | Partial negative v3 result, limitations, and accurate release status |

The local Chromium interactions are Playwright-driven synthetic QA, not human-at-keyboard evidence or NVIDIA execution. Historical L screenshots and video are genuine model-backed browser evidence from the same bounded three-POST campaign; they are separately labeled and source-pinned. All workflow data is fictional. Synthetic English Flite `slt` voice is used; its intelligibility and the approximate sentence-level caption timing need owner listening review.

The last slate preserves the partial negative v3 result: 4 usable from 5 attempted, one truncated at 8,192 output tokens, 11 unattempted; on four paired cases Nemotron matched 1/4 labels and 2/4 safe actions versus the deterministic baseline's 3/4 and 3/4. It also states that the prior semantic gate accepted an unresolved write and that post-hoc replay is not fresh validation. No superiority claim is made. The corrected final slate now states that the public test build is deterministic and live NVIDIA judge mode remains pending; it no longer says no public deployment exists. No superiority claim is made. The independent receipt verifier remains authoritative.

## Presentation and rights review

The cut explains the problem, shows actual product behavior and addresses all four equally weighted criteria: Technological Implementation (grounded advice and independent proof), Design (positive/negative walkthrough), Potential Impact (specific intended developer audience without adoption claims), and Quality of the Idea (completion as an untrusted claim). It does not imply a live NVIDIA deployment, external validation, production impact or general model advantage.

The video uses textual NVIDIA Nemotron and Nebius Token Factory attribution, no logos, stock footage or music, and no endorsement claim. Official rules' third-party mark restrictions still require owner clearance before upload. Confirm ownership, eligibility, proposed MIT grant and caption/voice rights independently. The existing public deployment is deterministic and inference-disabled; no license application, video upload or Devpost submission has happened. The revised cut was fully decoded with ffmpeg and inspected at the closing slate; embedded captions disclose deterministic public mode and pending live judge mode. Caption timing remains approximate and the synthetic Flite voice needs owner listening review.

The video and raw screen recordings stay in the cloud workspace; this repository contains sanitized provenance plus actual captured PNGs. Reproduce the current browser capture with `node scripts/record-release-demo.mjs` from the cloud checkout. It records local deterministic behavior, asserts positive signed-receipt verification and false-claim rejection, and fails if it sees an NVIDIA provider request. The older `.cache/qa/narrated/build.py` produces a superseded 155-second review cut and should not be used for this candidate.
