# Final submission go/no-go checklist

**Current result: NO-GO for public release/submission; GO for private review and the one selected-account hosting experiment after owner approval.** This checklist records evidence and remaining decisions rather than implying publication readiness.

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
| Security regression checks | 341 exact-head CI tests, source protected-value scan, `npm audit`; Cloudflare local tests exercise isolation, Origin and quota failures | Baseline only; not an external penetration audit |
| Accessibility/responsive behavior | Real Chromium keyboard path, labeled evidence links, status announcements, width checks at320/768/1024/1440 | Ready for private review; no human usability study or WCAG certification |

## Hosting gate

- **Cloudflare account selection:** owner must select `First Moonflower` or `Personal Cloudflare account` and verify Free plan, no card, no paid add-on/auto-upgrade, and quota headroom. Current connector review found zero D1 databases but could not read subscriptions (HTTP403); this is not proof of no-card/Free status.
- **One-shot Cloudflare test:** use only [the inference-disabled runbook](cloudflare-experiment-runbook.md), new isolated Worker/D1 names, no Nebius key/model and no reused resources. Require actual Cloudflare CPU metrics, max below10ms, p95 ≤8ms, no resource/quota failures, and complete post-version receipt/approval recovery. Local sampled V8 timing is neither pass nor fail for billed Cloudflare CPU.
- **Rollback:** follow the runbook’s resource-specific Worker stop, synthetic D1 export/delete and scoped token revocation. Retain no unrelated resources.
- **Fallback:** if Cloudflare fails or measurements are unavailable, stop that route. Vercel Hobby + Neon Free is the single technical fallback only after the owner verifies no-card/free eligibility and sufficient two-month headroom; otherwise release is NO-GO. Do not assume Oracle, Render persistence, an existing project or a card.
- **Public demo:** no hosted build exists. A video and repository do not substitute for the Devpost working test-build URL. Obtain separate approval to deploy the selected candidate and confirm free/unrestricted judge access through December15, 2026, 12:00 PST.

## Submission materials and publication gates

- [README](../../README.md), test instructions, architecture, deployment guide and model/provenance guidance are in the public repository. Verify clean checkout `npm ci`, browser install and `npm test` from exact release tag/commit before publish.
- [Devpost text](submission-draft.md) is a draft; preserve all negative model outcomes, limitations and feedback. No entry is submitted.
- [License proposal](license-proposal.md) is not applied. Owner must confirm contribution ownership, team/territory/track eligibility and approve the license.
- The current 1:59.26 **candidate** narrated cut (`.cache/qa/receiptlab-judge-pitch.mp4`, SHA256 `cab7dcd13d6cffe71a5a33c55a5ba54ae1cd6c907479a3cc754ff3c9670b9ee6`) is stored only in the cloud workspace until owner review; its manifest pins local Chromium and Campaign L video, screenshots and model evidence. It uses a local synthetic Flite voice, factual NVIDIA/Nebius text and actual recorded product footage; confirm model/tool attribution, trademark/media rights, voice and captions before any upload.
- Devpost requires an open-source licensed repository, a functioning test URL, a public under-three-minute video and unrestricted free judge access to December15 noon PST. Deadline is October30, 2026 at10:00 PDT /22:30 India time. No root license, public URL, YouTube upload or Devpost entry is currently complete.
- External experts have not validated diagnosis labels or the amended semantic gate. No production impact, adoption or general agent completion claim is established.

## Exact current release status

- Draft PR #2 remains the engineering source of truth for its current branch head and exact-head GitHub Actions result; no merge is authorized.
- No model calls, purchases, top-ups, hosting resources, deployment, license application, public video upload, Devpost submission or merge occurred in this work phase.
- **Approval sequence:** select/attest Cloudflare account → authorize one inference-disabled isolated experiment → review hosted metrics/results → separately authorize public demo deployment → license/eligibility/rights review → approve video upload and Devpost submission → separately authorize PR merge.
