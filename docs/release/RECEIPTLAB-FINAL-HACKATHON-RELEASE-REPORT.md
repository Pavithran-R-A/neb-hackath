# ReceiptLab final release status — 2026-10-27

## October 30 emergency release checkpoint — current state

This section supersedes earlier deployment and publication statements below; older checkpoints remain as historical evidence.

**Implemented:** public `main` is `1db019dbf0784a20ce3ef211d7ec97d6f155615d` (release-document synchronization) atop the application source deployed at `ebf2ee7274087a40c4967111817904bd88e27357`. PR #2 is merged. The existing Render/Neon service is verified live at deployment `dep-dbi3r8dg1s2s73dtqdfg`, bounded judge mode enabled. No replacement service/database or application namespace was created.

**Tested:** previous exact-source CI [40891258475](https://github.com/Pavithran-R-A/neb-hackath/actions/runs/40891258475) passed **363/363** with PostgreSQL and Chromium; source-pin workflow [40891258476](https://github.com/Pavithran-R-A/neb-hackath/actions/runs/40891258476) and hosted synthetic acceptance [40902880407](https://github.com/Pavithran-R-A/neb-hackath/actions/runs/40902880407) succeeded without inference. PR #6 merged to `main` as `faef4f19b070ded82d5a7898b18781dbeeb6e822`. Exact-head CI [41038435951](https://github.com/Pavithran-R-A/neb-hackath/actions/runs/41038435951) passed **363/363, zero failures/skips**; the PostgreSQL-backed test observed the five-second diagnosis while `/health` returned within the one-second bound. The fix is in source `main` but has not been deployed to Render.

**Provider preflight:** the metadata-only Token Factory catalog request at `2026-10-30T07:51:33Z` confirmed the configured Nemotron model at $0.06/M input and $0.24/M output tokens, with zero inference requests. The dry run estimated $0.00039894 for 1,024 output tokens but returned `creditOnlyVerified:false`, `readyForApproval:false`; that is not a balance or provider-enforced cap. This session independently read the existing Neon budget row: **0 requests, not halted**. The public application exposes the protected judge-code field, but the private code and secret Render environment values are unavailable to this session. No positive/negative live call, token settlement, model-assisted receipt, or model rejection was observed.

**Deployed:** Render connector confirms existing Free service `srv-dbfn8bavcj2c738p2b80`, deployment `dep-dbi3r8dg1s2s73dtqdfg`, source `ebf2ee7274087a40c4967111817904bd88e27357`, and live status. Startup logs report bounded judge mode, Neon PostgreSQL, inference enabled, and zero requests. The session completed the positive synthetic form once; the independent verifier returned draft with zero committed submissions. No new deploy, database mutation or restart test occurred.

**Access expiry blocker:** persisted PostgreSQL budget plan expires `2026-12-15T20:00:00Z`; official judge access is required through `2026-12-23T20:00:00Z`. The row is bound to plan/history hashes. A blind config date edit fails closed; recreating the row could erase usage/reservations. Neon read access is available, but the exact protected plan/config and Render secret values are not readable through the connected interfaces, and credit-only billing safety is unverified. No plan migration or restart qualification was performed. Access through the full judging period is not qualified.

**Published:** no. The original private MP4 still hashes to `737696338926edb06466bbe05eaec503e7fb4e7c77b206fe060245abb2a4d2e5`, 122.461 s. Its “live judge mode pending” slate was accurate at record time; the current hosted mode is now enabled, but this video does not show a new live request. The updated [YouTube publication packet](youtube-publication-packet.md) explains this boundary. No authenticated YouTube tool is available and the owner's media/right-to-publish approval remains outstanding.

**Submitted:** no Devpost submission URL exists. The updated draft uses `main`, records the current bounded mode while disclosing that current live provider behavior is not independently proven, retains the partial negative v3 result and lists the time-limited campaign. No authenticated Devpost tool is available; personal eligibility/originality declarations and final submit authorization are owner-only.

**Decision:** source/CI and public bounded-mode startup are verified. Real hosted NVIDIA acceptance, campaign extension, current billing/credit-only exposure, public video and final Devpost entry are outstanding. Do not claim full qualification or 100% completion. Latest incident/evidence log: [Issue #5](https://github.com/Pavithran-R-A/neb-hackath/issues/5).

This report distinguishes code and test results from provider deployment and publication. It is a release checkpoint, not a claim that the submission is complete.

## Implemented

- Hosted public and judge entry points now share the PostgreSQL application-state namespace `receiptlab`. The judge budget remains isolated in `receiptlab-judge`. This prevents changing the service entry point from silently presenting an empty session store while production sessions, HMAC receipt keys and consumed approvals remain in the existing database.
- README and release runbook now describe the actual existing Render/Neon service and distinguish the deterministic hosted acceptance from live model execution.
- The original SQLite reference remains in place. The independent state verifier, approval/replay protections, campaign ledger, source/model/price controls, quotas and fail-closed provider behavior were not weakened.

## Tested

- `node --test test/workbench-judge-entrypoint.test.mjs`: **2 passed, 0 failed**. The new regression assertion was first run and failed because the shared namespace constant did not exist; it passed after the public and judge entry points were wired to the same constant.
- `npm test`: local **363 tests, 353 passed, 0 failed, 10 skipped**. Skips are PostgreSQL integration cases because `RECEIPTLAB_TEST_DATABASE_URL` is not configured in this workspace. Exact-head GitHub Actions run [40455553594](https://github.com/Pavithran-R-A/neb-hackath/actions/runs/40455553594) on source commit `212174309caa7002a806250c7ccd91468631b3e2` passed **363, 0 failed, 0 skipped** using its PostgreSQL service.
- `npm run security:check`: local **353 tracked files, 0 findings**; exact-head CI checked **354 files, 0 findings**. This is a protected-value source scan, not a full security certification.
- `npm audit --audit-level=moderate`: **0 vulnerabilities**.
- The private review video `.cache/qa/receiptlab-judge-pitch.mp4` exists in the cloud checkout. Its SHA256 is `cab7dcd13d6cffe71a5a33c55a5ba54ae1cd6c907479a3cc754ff3c9670b9ee6`; `ffprobe` reports H.264/AAC, 1920×1080, 119.261 seconds, and embedded English captions; full decode succeeded. It remains unpublished and is not part of the public repository.
- Current read-only Token Factory catalog check: configured NVIDIA model `nvidia/Nemotron-3_5-Lightning` is present; catalog rates are **$0.06/M input tokens and $0.24/M output tokens**. The catalog check reports `inferenceRequests: 0`. Rates are catalog estimates, not a bill or hard spend cap.
- Historical direct HTTPS health probes from this Work runtime were inconclusive. On October 27, the latest direct `GET /health` returned HTTP 200 with `{"ok":true,"mode":"persistent-synthetic","storageMode":"postgresql","liveInferenceEnabled":false}` after an earlier transient 503 recovered. This confirms a successful point-in-time response, not continuous uptime. Later exact-head synthetic acceptance runs also passed without model requests.

## Deployed

- Issue #5 records the existing public service `https://receiptlab-judge.onrender.com`, Render Free, Singapore, deployment `dep-dbg2qqt9fdbs73cjt8r0`, running source commit `9933f10c10a6eb05c7b38d9e60622ca436010176` with inference disabled. It records the dedicated Neon project `receiptlab-nebius-2026` and retained application namespace `receiptlab`.
- The public URL is a deterministic synthetic workbench today. It is **not yet a public NVIDIA-powered judge runtime**. This session did not alter or redeploy the existing service. The recorded automatic-deploy setting is off.
- The external acceptance at run `40455548159` verified HTTPS, a secure session cookie, retained PostgreSQL session, positive synthetic recovery and signed receipt, replay refusal, sanitized export, false-success rejection, denial of unsupported recovery, Origin validation and cross-session isolation. It did not verify process restart, current account quotas or live provider inference.

## Published and submitted

- PR #2 remains open and draft; no merge was performed.
- The MP4 remains private in the cloud workspace. No YouTube upload occurred.
- **Updated October 27:** Owner-approved Apache-2.0 LICENSE and NOTICE are now committed to main and the PR source branch. Third-party rights/eligibility and video/publication approvals remain unverified.
- Devpost text remains a draft. No final owner attestation or submission occurred.

## Model evidence and cost

- No live inference request was made in this release checkpoint. The live catalog request was metadata-only.
- Prior real Campaign L evidence remains: three requests including preflight, estimated provider usage **$0.00232932**, one positive model-assisted approved recovery with an independently verified receipt, and one misleading-success case where the model recommended stopping. It is historical integration evidence, not evidence of current hosted judge-mode activation or model superiority.
- The latest v3 evaluation remains partial and negative: 4 usable results from 5 attempted diagnoses, one completion truncated at 8,192 output tokens, and 11 cases unattempted. On the four paired cases, Nemotron matched 1/4 diagnosis labels and 2/4 safe actions; the deterministic comparator matched 3/4 for each. This is not a general comparison claim.
- The existing conservative ledger estimate of remaining credits is based on the owner's earlier $59 balance attestation less recorded reservations/usage. It is not a fresh provider balance or statement. The $50 judging reserve remains protected by the campaign policy; current balance and billing profile could not be independently read here. No payment method, purchase, top-up or new hosting resource was used.

## Blockers and remaining approvals

1. **Provider access in this Work session:** GitHub is callable, but the Render and Neon connectors are absent from the available tools. The workspace has no `DATABASE_URL`, `RECEIPTLAB_JUDGE_CODE`, `RECEIPTLAB_JUDGE_CONFIG_JSON` or Render API credential. The owner needs to enable the already-connected Render and Neon integrations for this Work session; do not paste secrets into chat.
2. **Judge deployment:** inspect the existing protected settings and current Free-tier state, update that existing service only, then verify exact source, shared `receiptlab` state, external browser flows, restart recovery and bounded real Nemotron usage. Startup must not make an inference call. Keep the $50 judging reserve; do not infer provider credit balance from local bookkeeping.
3. **Current accessibility:** a direct GET returned HTTP 200 on October 27 after an earlier transient 503; exact-head external GitHub acceptance also passed. Neither establishes uninterrupted availability. Recheck after provider changes; Render Free idle sleep and Neon quota suspension remain availability limits through December 15.
4. **Rights and release:** the owner approved the Apache-2.0 source-license grant and root LICENSE/NOTICE are present; independently confirm third-party assets, contributor rights and team/territory eligibility before submission. Owner reviews the video attribution/voice/captions before YouTube publication and completes any required personal Devpost attestation before submission.
5. **Exact-head CI:** record the new PR head and exact Actions run after pushing this checkpoint. CI is the qualifying evidence for this changed source; earlier green runs do not certify the updated branch.

## Final decision

**NO-GO for final submission today; GO for the existing deterministic public synthetic test and private review.** The product has a working hosted synthetic acceptance record and genuine historical NVIDIA integration evidence, but its current public deployment has inference disabled. The required live, bounded, judge-accessible NVIDIA path, fresh external uptime check, owner-approved license, public video and Devpost submission are not complete. The latest PR head, exact-head CI and hosted acceptance links are kept in [PR #2](https://github.com/Pavithran-R-A/neb-hackath/pull/2); the exact source-tested implementation milestone in this report is `212174309caa7002a806250c7ccd91468631b3e2`.

## October 27 submission-readiness follow-up

- Re-read the live PR #2 head and issue #5. PR #2 remains open/draft at `1a2b4b87da9bd12bad127f3995b5d7b876243933`; exact-head Actions passed: [full CI 40462043631](https://github.com/Pavithran-R-A/neb-hackath/actions/runs/40462043631) ran 363 tests (363 passed, 0 failed, 0 skipped) with PostgreSQL; [external hosted synthetic acceptance 40462039867](https://github.com/Pavithran-R-A/neb-hackath/actions/runs/40462039867) passed against the existing Render + Neon service with zero NVIDIA requests. The full run also passed protected-source scan and dependency audit. The final follow-up commit that records this result is documentation-only and receives its own exact-head CI.
- The follow-up report-only commit was `c74a8c3c3afc95eac78dcb8c11a23a9160f89c14`; exact-head full CI [40462279923](https://github.com/Pavithran-R-A/neb-hackath/actions/runs/40462279923) and hosted synthetic acceptance [40462273553](https://github.com/Pavithran-R-A/neb-hackath/actions/runs/40462273553) both passed at that SHA. CI ran 363 tests (363 passed, 0 failed, 0 skipped); hosted acceptance made zero NVIDIA requests. This report correction is based on the resulting evidence.
- A fresh direct HTTPS health request from this Work session returned HTTP 200 with `persistent-synthetic`, PostgreSQL storage and inference disabled. The latest Issue #5 provider cross-check had observed a transient 503 before a successful recovery. Together these are point-in-time checks, not a continuous-availability guarantee.
- A fresh read-only Token Factory catalog/preflight check at `2026-10-27T09:31:54Z` found configured NVIDIA model `nvidia/Nemotron-3_5-Lightning`, catalog prices **$0.06/M input and $0.24/M output**, and **0 inference requests**. The 1,024-output-token dry-run estimate was `$0.00039894`; this is estimated usage, not an account statement or provider hard cap. Readiness returned `creditOnlyVerified:false` because fresh billing evidence was not supplied. The environment exposed `NEBIUS_API_KEY` and `NEBIUS_MODEL` as present without printing values; `DATABASE_URL`, `RECEIPTLAB_JUDGE_CODE`, `RECEIPTLAB_JUDGE_CONFIG_JSON` and `RENDER_API_KEY` were absent.
- `node scripts/workbench-judge.mjs` ran in plan-only mode: no model requests; it pinned source `4ab3dc92c8f8434f273cc79acefdae85f286971b`, runtime SHA-256 `a4aa2db09d7f38ff01f8aaed594ecb45d78f648a82f5d6306172a8921dc94fa9`, suite SHA-256 `e6be598a257c94f8606fe954ac7324e62535cb54024e72d64ab7afb2e152b19c`, and canonical account-history SHA-256 `ce5356eb30f3cb4c358b2a608224d784886ab9caa88e0adc98d82f676238da84`. The plan retains the `$0.50` maximum campaign envelope, calls for protected judge access, and says `publicDeployment:false`. It is not the protected production config and cannot authorize production.
- Render and Neon integrations, Cloud Browser, YouTube and Devpost tools are not exposed in this Work session. No provider settings, secrets, current bill/credit page, eligibility attestation, external account, deployment or submission was accessed or changed. No model request, purchase, upgrade or payment occurred.
- Rebuilt the existing private video candidate only to correct a stale factual statement. The closing card and narration now say the public test build is deterministic and live NVIDIA judge mode remains pending. New SHA-256: `737696338926edb06466bbe05eaec503e7fb4e7c77b206fe060245abb2a4d2e5`; 122.461 seconds; H.264/AAC 1920×1080 with English captions. `ffprobe` succeeded, full ffmpeg decode succeeded, and the closing card/caption were inspected. The voice remains synthetic CMU Flite `slt`; owner listening and rights review are pending. The MP4 is still a private workspace asset, not uploaded.
- Added a YouTube upload packet with accurate description/attribution and owner checks. Updated the Devpost draft with the current public deterministic URL, deployed/source SHA distinction, judge journey, screenshots and the video’s new SHA. This is preparation only; no Devpost fields were changed externally.
- Historical gate superseded October 27: root Apache-2.0 LICENSE and NOTICE have been added with the owner's approval. No public video upload or final Devpost submission is authorized by the software license alone.
- **Separate outcomes:** implementation = release docs and corrected private video derivative prepared; tested = media probe/decode/caption/closing-frame checks, local 363-test run (353 passed, 0 failed, 10 PostgreSQL skips), and exact-head CI/hosted acceptance at `1a2b4b87da9bd12bad127f3995b5d7b876243933`; deployed = existing deterministic Render Free + Neon Free service only, with latest recorded deployment source `9933f10c10a6eb05c7b38d9e60622ca436010176`; published = no; submitted = no.

Remaining external actions are narrowly defined: provide this Work session the existing Render/Neon integrations or authenticated Cloud Browser; provide an authenticated YouTube/Devpost path for account tasks; verify contributor/third-party ownership and eligibility separately from the granted Apache-2.0 license; review media/marks and synthetic narration; then enable a safely bounded judge runtime and obtain owner approval for final upload/submission attestations. No credentials should be sent in chat.

## October 27 — latest release state from the resumed Work session

- Remote PR #2 advanced beyond the prior checkpoint to `9af21a3e1dbf1552e28e41b7bb28bb4b2d77889c`; local checkout was fast-forwarded from the prior clean SHA, with no work discarded. PR remains OPEN / DRAFT. Exact-head [full CI 40488726457](https://github.com/Pavithran-R-A/neb-hackath/actions/runs/40488726457) passed **363/363, 0 failures, 0 skipped** with PostgreSQL. Source-secret scan and dependency audit passed. [Hosted synthetic acceptance 40488719781](https://github.com/Pavithran-R-A/neb-hackath/actions/runs/40488719781) passed with **zero NVIDIA calls**.
- Apache-2.0 and NOTICE were verified on both `main` and the release branch; GitHub reports SPDX `Apache-2.0`. This follows the owner's explicit license approval recorded in Issue #5. No second license approval is needed. Third-party media rights and personal eligibility remain separate.
- The repo default branch is a discoverability concern: `main` contains 9 tracked files and no `src/`; the public release branch contains 357 files including 50 `src/` files. The complete source is public at [`feat/phase1-verified-completion`](https://github.com/Pavithran-R-A/neb-hackath/tree/feat/phase1-verified-completion), but PR #2 is unmerged. Do not merge without explicit approval; the Devpost draft now links directly to the implementation branch.
- The latest Issue #5 provider report observed an external HTTP 503 before Render later logged successful PostgreSQL startup. A new HTTPS health GET from this Work session returned HTTP 200 in **0.98 seconds** with `persistent-synthetic`, PostgreSQL storage and inference disabled. This does not identify the 503 cause or establish uninterrupted uptime. Render Free reported about 12.44 MB outbound for the sampled period, not a full billing/usage statement.
- Read-only Token Factory catalog check at `2026-10-27T13:15:18Z` found `nvidia/Nemotron-3_5-Lightning` at **$0.06/M input, $0.24/M output**, `inferenceRequests:0`. The dry-run estimate for one 1,024-token request is `$0.00039894`; `creditOnlyVerified:false`. This is catalog pricing, not current available credits or a provider-enforced cost cap. No inference request was made.
- Plan-only judge startup at source `9af21a3e1dbf1552e28e41b7bb28bb4b2d77889c` reported runtime SHA-256 `a4aa2db09d7f38ff01f8aaed594ecb45d78f648a82f5d6306172a8921dc94fa9`, suite SHA-256 `e6be598a257c94f8606fe954ac7324e62535cb54024e72d64ab7afb2e152b19c`, and account-history SHA-256 `ce5356eb30f3cb4c358b2a608224d784886ab9caa88e0adc98d82f676238da84`. The $0.50 per-campaign envelope and stored quotas remain configured in code, but plan-only mode reports `publicDeployment:false`.
- Presence-only environment check did not print values: `NEBIUS_API_KEY`/`NEBIUS_MODEL` are present in this workspace, while `DATABASE_URL`, `RECEIPTLAB_JUDGE_CODE`, `RECEIPTLAB_JUDGE_CONFIG_JSON` and `RENDER_API_KEY` are absent. This does not inspect Render's protected variables or verify provider credit balance. Render/Neon, authenticated browser, YouTube and Devpost tools remain unavailable in this Work session.
- The existing video SHA remains `737696338926edb06466bbe05eaec503e7fb4e7c77b206fe060245abb2a4d2e5`, duration 122.461 seconds; it was not rebuilt or uploaded. Devpost remains a draft. No deployment, database mutation, purchase, upgrade, or model request occurred.

The current Devpost source pointer is branch-specific because `main` lacks the application implementation. If official review requires the complete source on `main`, pause and obtain explicit merge authorization. Other remaining owner/account gates: secure provider integrations to inspect billing/protected settings; safe bounded hosted inference; video media/voice approval and public upload; personal eligibility and final Devpost attestation/submission. No credential should be pasted into chat.

## October 29 — final submission checkpoint from merged `main`

This checkpoint supersedes earlier branch and PR state above. The earlier dated entries are retained as historical evidence; they are not the current status.

### Implemented

- GitHub confirms public default branch `main` at merge SHA `e90f032f8cef1901e563208791c5460ff06ec40b`; PR #2 is closed/merged. The application and Apache-2.0 LICENSE/NOTICE are on `main`, and GitHub detects the license. The README and submission materials now point reviewers to the default branch and distinguish source from the older deployment SHA.
- The existing private video candidate remains unchanged at `.cache/qa/receiptlab-judge-pitch.mp4`, SHA-256 `737696338926edb06466bbe05eaec503e7fb4e7c77b206fe060245abb2a4d2e5`, 122.461 seconds. It was not uploaded.

### Tested

- Exact post-merge main CI [run 40834879951](https://github.com/Pavithran-R-A/neb-hackath/actions/runs/40834879951) passed at `e90f032f8cef1901e563208791c5460ff06ec40b`: **363 passed, 0 failed, 0 skipped**, with Chromium and PostgreSQL. Protected-source scan, dependency audit and test job passed.
- Hosted synthetic acceptance [run 40510973580](https://github.com/Pavithran-R-A/neb-hackath/actions/runs/40510973580) passed positive recovery and misleading-success rejection without any live NVIDIA request.
- Direct public `GET /health` on October 29, 2026 at 07:46 UTC returned HTTP 200 in 0.42 seconds with `persistent-synthetic`, PostgreSQL storage and `liveInferenceEnabled:false`. It is point-in-time evidence only, not uptime or restart proof.
- A fresh read-only Token Factory catalog request at `2026-10-29T07:48:53Z` verified configured model `nvidia/Nemotron-3_5-Lightning` and listed $0.06 per million input tokens / $0.24 per million output tokens. The catalog reports `inferenceRequests:0`. A one-request, 1,024-output-token dry-run estimated $0.00039894 but set `creditOnlyVerified:false` and `readyForApproval:false`. This catalog is not a credit/billing statement or hard spend cap. **No inference request was made.**
- Environment presence was checked without printing secret values: `NEBIUS_API_KEY` and `NEBIUS_MODEL` are present; `DATABASE_URL`, `RECEIPTLAB_JUDGE_CODE`, `RECEIPTLAB_JUDGE_CONFIG_JSON` and `RENDER_API_KEY` are absent in this Work environment. Platform secret destination metadata and Render/Neon protected settings were not accessible.

### Deployed

- Existing public service remains `https://receiptlab-judge.onrender.com`. The latest recorded successful Render deployment is `dep-dbhegue7bikc73ee1ifg`, SHA `d3a6f6614898e3f8bd2997c72326059b463ed0c6`, Render Free, inference disabled. The main merge commit `e90f032…` has not been verified as the deployed SHA. No deploy, restart test, Neon mutation or production configuration change occurred in this session.
- Existing Neon project/namespace were not accessed directly in this session; previous reports record the dedicated project and `receiptlab` namespace. Current row revision, judge-budget state, restart recovery and billing usage remain unverified.

### Published and submitted

- **Published:** no YouTube upload. The video remains a private workspace asset. The publication packet is prepared, but the owner’s rights/voice/captions review and authenticated YouTube path are outstanding.
- **Submitted:** no Devpost submission. Draft text is prepared and updated for public `main`; screenshot selection/upload, any personal eligibility/originality attestations, final authorization and resulting public project URL remain outstanding.
- **License:** Apache-2.0 source license is approved and published; licensing is not an open gate. This does not clear third-party media rights.

### Blocked / decision

- The only available non-GitHub tools in this Work session are cloud environment onboarding tools. Render, Neon, authenticated Cloud Browser, YouTube and Devpost integrations are absent. Do not send API keys or database credentials through chat.
- Current account credit balance/expiry, no-card/auto-replenishment status, Render usage/overage settings, Neon quota/state, Render protected configuration and judge-code access could not be verified. Because the current safe dry-run explicitly reports `creditOnlyVerified:false`, the hosted NVIDIA journey was not enabled. Preserve the standing $50 judging reserve and $0.50 campaign envelope; do not treat catalog estimates or historical balances as proof of available credit.
- Historical Campaign L remains genuine earlier model-assisted evidence; it does not prove current production inference. The v3 evaluation remains partial and negative (Nemotron 1/4 label matches and 2/4 safe actions versus the deterministic comparator’s 3/4 on the same four cases); one of five attempts truncated at 8,192 tokens and eleven cases were unattempted. No superiority claim is made.
- **Final verdict: not fully submitted and not 100% complete.** The public licensed source, merge CI and synthetic hosted test are verified. Live hosted NVIDIA use, provider settings/billing qualification, restart proof, public video and final Devpost entry are not.

See the current [go/no-go](final-go-no-go.md), [submission draft](submission-draft.md), [YouTube publication packet](youtube-publication-packet.md), and [Issue #5 evidence](https://github.com/Pavithran-R-A/neb-hackath/issues/5).
