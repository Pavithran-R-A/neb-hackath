# Narrated video — revised cloud-local review cut

The latest cut is `.cache/qa/rc-narrated-review.mp4`, **155.181333 seconds (2:35.18)**, below the three-minute maximum. It is a private review draft; it has not been owner-approved, uploaded, submitted or publicly deployed. The [manifest](../../results/rc-narrated-video-manifest.json) records its SHA256, source capture hashes, evidence hashes, captions, tool provenance and limitations. The video SHA256 is `820371ab1b6c7bd4c4c1933ba2dcc97e9897275ceca29d13c054456b179d3402`.

The revised cut adds the October19 v3 partial negative result, the actual current first-screen capture, and explicit coverage of the official judging criteria. It does not present the post-hoc consumed-output replay as fresh validation or claim model superiority. The original 36.36-second campaign L private HTTPS recording remains continuous and at original speed. The updated first-screen segment is an actual local Chromium screenshot (`workbench-first-screen-2026-10-20.png`), labelled cloud-local/no inference; the other non-product segments are clearly editorial slates, not UI reenactments.

| Timeline | Segment | What the evidence supports |
| --- | --- | --- |
| 0.00–24.60s | Problem and product | ReceiptLab purpose; model advice is not proof; synthetic voice disclosure |
| 24.60–60.96s | Actual L integration | Real private HTTPS NVIDIA positive retry/verified receipt and negative stop/unverified outcome, with operator approval visible |
| 60.96–93.04s | Fresh v3 | 4 usable / 5 attempted diagnoses, 11 unattempted, one 8,192-token truncation, four-case paired results and the prior false acceptance |
| 93.04–111.44s | Current first screen | Current product question and claim/proof/advice separation; one static local browser capture |
| 111.44–136.96s | Official judging lenses | Technological implementation, design, potential impact and quality of the idea; no adoption claim |
| 136.96–155.18s | Release state and credits | Unresolved host/license/eligibility gates, attribution and no endorsement |

## Review against the hackathon requirements

The Devpost rules retrieved on October20, 2026 say the submission needs a working demo/test-build URL, a public open-source repository with a root license, README instructions, a public YouTube video under three minutes showing the project functioning, track selection and provider feedback. The project must make a runtime Token Factory call or run on Nebius AI Cloud compute and use an NVIDIA open-source model. Judges need free, unrestricted test access through the judging period. The official judging criteria are equally weighted: **Technological Implementation**, **Design**, **Potential Impact**, and **Quality of the Idea**. The current draft speaks to all four, while accurately marking the public host, license, and open judge access as not ready.

- **Technological Implementation:** real private HTTPS footage and actual bounded NVIDIA responses; independent signed-receipt verification and current-state recovery permissions; local D1 persistence/query-plan/restart tests. The footage does not demonstrate a deployed Worker, and hosted CPU/quota behavior remains unverified.
- **Design:** the captured current first screen poses the problem immediately, offers positive and negative guided journeys, and distinguishes claim, proof and advice. Keyboard and responsive test results are documented elsewhere.
- **Potential Impact:** the intended user is a browser-agent developer debugging false completion and uncertain writes. No user study, adoption, production incident reduction or external impact is measured; the cut states this limit.
- **Quality of the Idea:** treating agent “done” as an untrusted claim and binding proof to a specific run is the distinct product idea. The v3 results are negative/partial, so the cut makes no general advantage claim.

## Audio and rights review

Narration is synthetic English from the local FFmpeg Flite filter with the `slt` voice; no human voice was cloned and no paid voice service or music was used. The opening, live-overlay and end slate disclose synthetic narration and automated synthetic QA. On-screen and spoken text attributes NVIDIA Nemotron and Nebius Token Factory; the video uses no logos and makes no endorsement claim. The live browser capture and current screenshot are original project recordings. FFmpeg, Flite, system font and source-media provenance are captured in the manifest and [third-party inventory](third-party-inventory.md).

**Rights blocker:** the official rules prohibit third-party trademarks and copyrighted material in the video without permission. The cut contains the names NVIDIA, Nemotron and Nebius as textual credits because they identify the required tools, but textual attribution is not proof of trademark permission. No third-party music or stock footage appears. The owner must confirm the sponsor/tool naming is permitted for this entry (or request a cleared version) before upload. No unapproved logo or borrowed media was added.

`ffprobe` reports H.264 1440×1200, AAC stereo 48kHz, selectable English `mov_text` captions and 155.181333s total duration. Full video/audio decode exited0. `volumedetect` measured mean−19.5dB and maximum−5.7dB. The current first-screen capture was inspected at full resolution, and intro, v3, design, judging-criteria, live and ending frames were inspected. Captions for new synthetic narration use proportional estimates rather than forced alignment; live browser captions are burned in, and some summarize outcomes before the last corresponding screen. Owner listening, pronunciation, caption timing, trademark and media rights review remain required.

The reusable cloud-local helpers are `.cache/qa/narrated/build.py` and `.cache/qa/narrated/finalize.py`; run them from the repository root after the first-screen screenshot exists. They create the slates, local Flite audio, caption track, MP4 and provenance manifest. FFmpeg emitted fontconfig cache warnings because the sandbox cannot write its system cache; rendering and decode succeeded. The finished media and raw browser recordings remain in cloud storage and have not been copied to a laptop, YouTube or Devpost.
