# Isolated deployment preparation — no public service

Recommended next architecture: keep evaluation/Playwright in the protected cloud workspace, with a small Node manual evidence surface as a separately approved test build. The local rehearsal image contains Node, this repository's source/scripts and lockfile, and the public `evaluation/diagnosis-v1` dataset; it has no npm runtime dependencies, Chromium, API key or model endpoint. It is not the complete NVIDIA-powered judge application.

## Local cloud rehearsal

The Dockerfile pins Node24.19.0 bookworm-slim by the resolved SHA256 manifest. Build from this repository:

~~~bash
DOCKER_CONFIG="$PWD/.cache/docker" docker build -f deployment/Dockerfile --build-arg SOURCE_COMMIT="$(git rev-parse HEAD)" -t neb-hackath-rehearsal:sprint .
~~~

Run without publishing ports, with network disabled, read-only root filesystem, nonroot node user, 256MiB memory, 0.5CPU and 64 process limit. Feed scripts/smoke-workbench.mjs into docker exec -i CONTAINER node --input-type=module. The smoke test uses only loopback, completes three actual form POSTs, checks the signed verdict, downloads sanitized evidence and resets its session. Restart the same isolated container and repeat. Remove only that created container afterward.

Historical build and smoke/restart tests passed for implementation d59089260f0a41619f8e032e3b3972faff9a097b; evidence in results/sprint-release-evidence.json. No host ports, secrets or external network were attached. Initial browser-heavy Docker experiments failed on npm registry timeout despite the supported proxy route. Separating the manual runtime eliminated that unnecessary install. The cloud development toolchain still needs pinned Playwright, npm ci and browser installation; those run successfully in local/hosted CI.

## Current image provenance and validation boundary

The Dockerfile copies all `src/` and `scripts/` runtime inputs plus `package.json` and `package-lock.json`, then explicitly generates `src/build-manifest.json` as the nonroot `node` user. The diagnosis dataset is copied separately so exported suite hashes can be populated. No dependency installation, model calls, credentials, public listener or published ports are part of this build. The generated manifest is excluded from the build context and its own hash inputs.

`SOURCE_COMMIT` is a build argument containing an operator claim, not verified Git HEAD inside the image. Exported provenance labels that origin and verifies the captured runtime file hashes against current image contents; absent Git, `codeTreeDirty` stays `null`. Matching hashes show content consistency, not signed authorship or proof that the supplied commit matches those bytes. Dataset hashes are separately included in workbench exports; they are not part of the runtime source hash.

The historical Docker evidence above does **not** validate this revised Dockerfile or current application source. Current provenance unit tests cover Gitless build verification, added/modified/missing runtime files, malformed manifests, secret/cache exclusion and symlink rejection. A fresh Docker build plus isolated health, export-provenance and restart checks remains required before claiming this revision passed container validation. These checks are local cloud rehearsal only and do not authorize hosting or inference.

## Hosting research (official sources checked October17)

| Provider | Public plan facts | Fit and decision |
|---|---|---|
| [Render Free](https://render.com/docs/free), [compute](https://render.com/docs/compute-plans), [Node](https://render.com/docs/node-version) | 750 workspace hours/month, 15min idle spin-down, roughly minute cold starts, ephemeral files; 0.1CPU/512MiB. [Tutorial](https://render.com/docs/your-first-deploy) says no payment required. | Closest Node fit for a small manual test build. Our 0.5CPU rehearsal does not prove performance on 0.1CPU. No account quota/card/plan verified. Free Postgres expires in 30days, unsuitable for Oct–Dec. |
| [Vercel Hobby](https://vercel.com/docs/plans/hobby), [function limits](https://vercel.com/docs/functions/limitations) | Personal/noncommercial restriction; Node24; 250MB uncompressed function bundle; 2GB/1vCPU Hobby. | Static frontend possible; current persistent servers/state need adaptation. Not a drop-in serverless deployment. |
| [Cloudflare Workers Free](https://developers.cloudflare.com/workers/platform/pricing/), [Browser Run](https://developers.cloudflare.com/browser-rendering/pricing/) | Workers 100k requests/day, 10ms CPU. Browser Run Free now includes 10 browser minutes/day, three concurrent sessions, Playwright support. | Corrects historical browser-pricing uncertainty. Requires a Worker/remote-browser port; tiny shared quota cannot establish unrestricted judge access. Containers require Paid. |

Public plan descriptions are not this account's entitlements. Render can charge supplementary usage if payment is configured; without payment it suspends services/builds. Do not promise zero charge without account verification. No provider resources, paid service or new account was created. Connected Vercel/Render/Cloudflare tools are not callable here; no unrelated inventories were inspected.

## Required public-demo work / approvals

- Explicit owner approval to create an isolated service and publish.
- Verify account's no-payment/free quotas, supplementary usage behavior, build/memory/cold start and egress limits.
- Single public origin/gateway for form links: current child form URLs are dynamic loopback origins, unsuitable for remote judges. Do not simply bind existing servers publicly.
- Configure canonical trusted origin/host and HTTPS/Secure cookies; preserve cookie ownership, CSRF boundaries, input/TTL/rate/admission controls and agent evaluator isolation.
- Durable evidence/key management and shared atomic campaign/rate control before any public model endpoint; local fsynced files/in-memory receipts cannot provide multi-instance billing limits.
- Pass real NVIDIA product gate. Keep credentials only server-side in protected settings scoped to api.tokenfactory.nebius.com; never put them in image/build args/frontend.
- Provide free judge access through **December15 2026 noon PST (20:00UTC)**. A video alone does not satisfy working-project access. Free idle suspension/restarts/quotas mean uptime cannot yet be guaranteed.
- Monitor health and failures without contact data/keys/reasoning; define owner-supported availability and an authorized test-build fallback.

Production readiness is **NO-GO**. Local runtime rehearsal passed; public routing, state durability, account entitlement and actual model behavior remain unresolved. No deployment configuration here automatically creates resources.
