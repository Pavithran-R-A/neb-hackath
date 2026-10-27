# Final submission go/no-go checklist

**Current result: NO-GO for final release/submission; the deterministic public service is deployed, but the bounded NVIDIA judge experience is not active.** Issue #5 records the isolated Render Free + Neon Free service and URL. Exact-head external GitHub Actions acceptance passed synthetic positive and negative journeys at PR head `acf98e3`; this session's direct health probe timed out, and neither the deployed service's current state nor judge-mode settings can be inspected because Render/Neon connectors are unavailable here.

## Engineering and product evidence

| Gate | Evidence now | Decision |
|---|---|---|
| First-screen explanation and demo path | Real Chromium Node workbench and Worker screenshots; positive/negative language, independent proof boundary and no page-load inference | Ready for private review |
| Positive recovery | Actual campaign L: live Nemotron advice, synthetic-QA approval, guarded retry and privately verified signed receipt; separate current-UI deterministic walkthrough captured with zero inference | Demonstrated in captured behavior; current UI local rules are clearly distinct from live model evidence |
| Misleading-success detection | Campaign L actual model stop case plus current UI local-rules refusal; independent verifier rejects uncommitted success | Ready for demo; no arbitrary external workflow claim |
| Model usefulness | v3 partial negative: paired diagnosis1/4 and safe action2/4 vs deterministic3/4 each; one truncation and eleven cases unattempted; post-hoc gate not fresh validation | No superiority/safety claim |
| Independent completion proof | Run-bound unique commit and signed HMAC receipt verified privately; Worker D1 restart test and Node restart tests | Ready for synthetic demonstration; HMAC verification is server-side, not public-key proof |
| Explicit approval/action boundary | Worker atomic one-use approval; stale, replay and false-success tests; explicit checkbox in judge interface | Ready for synthetic demo |
| Bounded judge mode/provider controls | Inference disabled by default; retained quotas, campaign/model/source/price pins; no public unrestricted model route | Ready as implementation evidence; real host operation through Dec15 is unverified |
| Security regression checks | Full suite: 363 tests, 353 pass, 0 fail, 10 skipped because this workspace has no PostgreSQL test URL; source scan: 353 tracked files, 0 findings; `npm audit`: 0 vulnerabilities | Baseline only; not an external penetration audit |
| Accessibility/responsive behavior | Real Chromium keyboard path, labeled evidence links, status announcements, width checks at320/768/1024/1440 | Ready for private review; no human usability study or WCAG certification |

## Hosting gate

- **Selected architecture:** use only the existing Neon Free project and isolated Render Free service `receiptlab-judge`; do not create another service or database. Cloudflare Workers Free already failed its CPU qualification; do not repeat that experiment.
- **Account-specific cost:** Neon Free limits and suspension behavior are recorded from Issue #5. The owner's $100 Render promotional-credit statement could not be provider-verified for balance, expiry, card status or a hard no-cash ceiling. Do not use a paid plan or disk; the selected candidate therefore uses Render Free + Neon Free, which has no extra hosting charge if both accounts remain on those plans. Render idle spin-down and Neon suspension mean uninterrupted judge availability through Dec15 is not guaranteed.
- **Provider access blocker:** GitHub is callable, but the Render and Neon connectors are not exposed in this Work session. This workspace has no `DATABASE_URL`, Render API credential, judge access code or protected judge-plan JSON. Never paste a URL, password, or key into chat. The existing public service and PostgreSQL project are provider evidence from Issue #5, not newly re-created resources.
- **External judge proof:** synthetic model-free journey passed from a GitHub Actions runner at exact source `212174309caa7002a806250c7ccd91468631b3e2` (run [40455548159](https://github.com/Pavithran-R-A/neb-hackath/actions/runs/40455548159)) against the existing service. It did not cover restart durability or inference. Restart and current browser checks are outstanding. The public health request from this workspace timed out, so present availability is unconfirmed. Do not activate bounded inference until protected configuration and current account settings are verifiable.
- **Public availability:** `https://receiptlab-judge.onrender.com` is the recorded test URL, currently evidenced in inference-disabled deterministic mode. This does not satisfy a judge-ready NVIDIA demonstration or prove uninterrupted free access through Dec 15. Render idle sleep and Neon free quotas remain limitations.

## Submission materials and publication gates

- [README](../../README.md), test instructions, architecture, deployment guide and model/provenance guidance are in the public repository. Verify clean checkout `npm ci`, browser install and `npm test` from exact release tag/commit before publish.
- [Devpost text](submission-draft.md) is a draft; preserve all negative model outcomes, limitations and feedback. No entry is submitted.
- [License proposal](license-proposal.md) is not applied. Owner must confirm contribution ownership, team/territory/track eligibility and approve the license.
- The current 1:59.26 **candidate** narrated cut (`.cache/qa/receiptlab-judge-pitch.mp4`, SHA256 `cab7dcd13d6cffe71a5a33c55a5ba54ae1cd6c907479a3cc754ff3c9670b9ee6`) is stored only in the cloud workspace. Its manifest pins local Chromium footage and historical Campaign L evidence. It uses synthetic Flite narration and factual NVIDIA/Nebius text; confirm mark/media rights, voice and captions before any upload.
- Devpost requires a public licensed repository, a functioning test URL, a public under-three-minute video and free judge access through December 15 noon PST. Deadline is October 30, 2026 at 10:00 PDT / 22:30 IST. The URL exists but the live judge journey is not ready; no root license, YouTube upload or Devpost submission is complete.
- External experts have not validated diagnosis labels or the amended semantic gate. No production impact, adoption or general agent completion claim is established.

## Exact current release status

- Draft PR #2 remains open and unmerged. Source commit `212174309caa7002a806250c7ccd91468631b3e2` passed exact-head [Foundation CI run 40455553594](https://github.com/Pavithran-R-A/neb-hackath/actions/runs/40455553594) (363 passed, 0 failed/skipped) and [hosted acceptance run 40455548159](https://github.com/Pavithran-R-A/neb-hackath/actions/runs/40455548159) (synthetic positive/negative, 0 model calls). The latest exact-head checks after documentation updates are linked on [PR #2](https://github.com/Pavithran-R-A/neb-hackath/pull/2).
- No inference call, purchase, top-up, resource creation, deployment change, license application, video upload, Devpost submission or merge occurred in this work phase.
- **Remaining sequence:** expose the existing Render and Neon integrations in this Work session → inspect and update the existing protected service settings with source-pinned judge config → verify current free-tier access and external browser/restart/model journeys → confirm team/ownership/eligibility and approve MIT → approve public video upload and Devpost submission. Never publish secrets in chat or public repository.
