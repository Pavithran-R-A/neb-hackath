# Final submission go/no-go checklist

**Current result: NO-GO for public release/submission; GO for private review.** The Render + Neon backend candidate is implemented and locally verified; provider account actions remain blocked by unavailable Neon/Render tools in this Work session. This checklist records evidence and remaining decisions rather than implying publication readiness.

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
| Security regression checks | 362 exact-tree tests, source protected-value scan, `npm audit`; PostgreSQL tests exercise isolation, TLS policy, Origin and quota failures | Baseline only; not an external penetration audit |
| Accessibility/responsive behavior | Real Chromium keyboard path, labeled evidence links, status announcements, width checks at320/768/1024/1440 | Ready for private review; no human usability study or WCAG certification |

## Hosting gate

- **Selected architecture:** use only the dedicated existing Neon Free project and one isolated Render Free web service defined by [`render.yaml`](../../render.yaml). The user explicitly ruled out further Azure/Cloudflare work; Cloudflare was separately tested and failed its Free CPU qualification. Do not repeat that work or create another Neon project.
- **Account-specific cost:** Neon Free limits and suspension behavior are recorded from Issue #5. The owner's $100 Render promotional-credit statement could not be provider-verified for balance, expiry, card status or a hard no-cash ceiling. Do not use a paid plan or disk; the selected candidate therefore uses Render Free + Neon Free, which has no extra hosting charge if both accounts remain on those plans. Render idle spin-down and Neon suspension mean uninterrupted judge availability through Dec15 is not guaranteed.
- **Provider access blocker:** GitHub is callable, but the connected Neon and Render tools are not exposed in this Work session. No `DATABASE_URL`, Render resource API or protected campaign configuration is available. `render.yaml` and local PostgreSQL tests do not prove that a service was created or deployed. Connect the existing Neon and Render integrations to this Work session; never paste a URL, password, or key into chat.
- **External judge proof:** not yet performed. After provisioning, verify exact HTTPS/Host/proxy behavior, `/health`, positive recovery, misleading-success abstention, signed receipt verification and replay denial from an external client. Restart the Render service and re-check the same session/receipt. Then perform the separately source-pinned bounded inference campaign from the existing Nebius credits; preserve the $50 judging reserve and stop if current price/credit evidence or usage differs from the plan.
- **Public availability:** no hosted build or URL exists. The product cannot be described as publicly judge-ready until the external test passes and the free account limits are rechecked. No paid fallback is authorized.

## Submission materials and publication gates

- [README](../../README.md), test instructions, architecture, deployment guide and model/provenance guidance are in the public repository. Verify clean checkout `npm ci`, browser install and `npm test` from exact release tag/commit before publish.
- [Devpost text](submission-draft.md) is a draft; preserve all negative model outcomes, limitations and feedback. No entry is submitted.
- [License proposal](license-proposal.md) is not applied. Owner must confirm contribution ownership, team/territory/track eligibility and approve the license.
- The current 1:59.26 **candidate** narrated cut (`.cache/qa/receiptlab-judge-pitch.mp4`, SHA256 `cab7dcd13d6cffe71a5a33c55a5ba54ae1cd6c907479a3cc754ff3c9670b9ee6`) is stored only in the cloud workspace until owner review; its manifest pins local Chromium and Campaign L video, screenshots and model evidence. It uses a local synthetic Flite voice, factual NVIDIA/Nebius text and actual recorded product footage; confirm model/tool attribution, trademark/media rights, voice and captions before any upload.
- Devpost requires an open-source licensed repository, a functioning test URL, a public under-three-minute video and unrestricted free judge access to December15 noon PST. Deadline is October30, 2026 at10:00 PDT /22:30 India time. No root license, public URL, YouTube upload or Devpost entry is currently complete.
- External experts have not validated diagnosis labels or the amended semantic gate. No production impact, adoption or general agent completion claim is established.

## Exact current release status

- Draft PR #2 remains the engineering source of truth; current local changes require a push and exact-head GitHub Actions run. No merge is authorized.
- No model calls, purchases, top-ups, hosting resources, deployment, license application, public video upload, Devpost submission or merge occurred in this work phase.
- **Approval sequence:** connect the already-created Neon and Render accounts to this Work session → owner review/approval of the prepared protected deployment configuration → independently verify public positive/negative judge journeys → confirm intellectual-property ownership/eligibility and MIT license → approve video upload and Devpost submission → separately authorize PR merge.
