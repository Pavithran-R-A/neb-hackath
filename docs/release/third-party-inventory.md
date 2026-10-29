# Third-party inventory — evidence for owner review

This is an inventory of observed metadata and notices, not legal advice, clearance, or proof that distribution obligations have been discharged. The owner-approved [Apache-2.0 project license](../../LICENSE) is in the root; third-party dependencies and other assets remain subject to their separate licenses and rights. See [licensing decision](license-proposal.md) for scope and outstanding rights/eligibility review. Regenerate this inventory with `node scripts/release-inventory.mjs` if the lockfile or binaries change.

## npm lockfile (all direct and transitive entries)

Observed `package-lock.json` SHA256: `65df178f73a2ba14248ca807040bd2f424235693dd77ee6825029a906b59cfc5`. Lockfile version 3; 93 package entries. Direct declarations: `miniflare@5.20261012.1-beta`, `playwright@1.64.1`, `wrangler@4.151.1`. `installed=no` optional variants are lock entries, not a claim those foreign-platform binaries ran. License fields are copied from lock metadata; inspect actual license/notice and package source before distribution.

| Lock path / identity | Exact version | Relationship | Declared license | Local directory | Local top-level notice files |
| --- | --- | --- | --- | --- | --- |
| `node_modules/@cloudflare/kv-asset-handler` | 0.5.0 | transitive; required | MIT OR Apache-2.0 | yes | not found locally |
| `node_modules/@cloudflare/unenv-preset` | 2.16.2 | transitive; required | MIT OR Apache-2.0 | yes | not found locally |
| `node_modules/@cloudflare/workerd-darwin-64` | 1.20261012.1 | transitive; optional | Apache-2.0 | no | not found locally |
| `node_modules/@cloudflare/workerd-darwin-arm64` | 1.20261012.1 | transitive; optional | Apache-2.0 | no | not found locally |
| `node_modules/@cloudflare/workerd-linux-64` | 1.20261012.1 | transitive; optional | Apache-2.0 | yes | not found locally |
| `node_modules/@cloudflare/workerd-linux-arm64` | 1.20261012.1 | transitive; optional | Apache-2.0 | no | not found locally |
| `node_modules/@cloudflare/workerd-windows-64` | 1.20261012.1 | transitive; optional | Apache-2.0 | no | not found locally |
| `node_modules/@cspotcode/source-map-support` | 0.8.1 | transitive; required | MIT | yes | LICENSE.md |
| `node_modules/@emnapi/runtime` | 1.11.3 | transitive; optional | MIT | yes | LICENSE |
| `node_modules/@esbuild/aix-ppc64` | 0.28.2 | transitive; optional | MIT | no | not found locally |
| `node_modules/@esbuild/android-arm` | 0.28.2 | transitive; optional | MIT | no | not found locally |
| `node_modules/@esbuild/android-arm64` | 0.28.2 | transitive; optional | MIT | no | not found locally |
| `node_modules/@esbuild/android-x64` | 0.28.2 | transitive; optional | MIT | no | not found locally |
| `node_modules/@esbuild/darwin-arm64` | 0.28.2 | transitive; optional | MIT | no | not found locally |
| `node_modules/@esbuild/darwin-x64` | 0.28.2 | transitive; optional | MIT | no | not found locally |
| `node_modules/@esbuild/freebsd-arm64` | 0.28.2 | transitive; optional | MIT | no | not found locally |
| `node_modules/@esbuild/freebsd-x64` | 0.28.2 | transitive; optional | MIT | no | not found locally |
| `node_modules/@esbuild/linux-arm` | 0.28.2 | transitive; optional | MIT | no | not found locally |
| `node_modules/@esbuild/linux-arm64` | 0.28.2 | transitive; optional | MIT | no | not found locally |
| `node_modules/@esbuild/linux-ia32` | 0.28.2 | transitive; optional | MIT | no | not found locally |
| `node_modules/@esbuild/linux-loong64` | 0.28.2 | transitive; optional | MIT | no | not found locally |
| `node_modules/@esbuild/linux-mips64el` | 0.28.2 | transitive; optional | MIT | no | not found locally |
| `node_modules/@esbuild/linux-ppc64` | 0.28.2 | transitive; optional | MIT | no | not found locally |
| `node_modules/@esbuild/linux-riscv64` | 0.28.2 | transitive; optional | MIT | no | not found locally |
| `node_modules/@esbuild/linux-s390x` | 0.28.2 | transitive; optional | MIT | no | not found locally |
| `node_modules/@esbuild/linux-x64` | 0.28.2 | transitive; optional | MIT | yes | not found locally |
| `node_modules/@esbuild/netbsd-arm64` | 0.28.2 | transitive; optional | MIT | no | not found locally |
| `node_modules/@esbuild/netbsd-x64` | 0.28.2 | transitive; optional | MIT | no | not found locally |
| `node_modules/@esbuild/openbsd-arm64` | 0.28.2 | transitive; optional | MIT | no | not found locally |
| `node_modules/@esbuild/openbsd-x64` | 0.28.2 | transitive; optional | MIT | no | not found locally |
| `node_modules/@esbuild/openharmony-arm64` | 0.28.2 | transitive; optional | MIT | no | not found locally |
| `node_modules/@esbuild/sunos-x64` | 0.28.2 | transitive; optional | MIT | no | not found locally |
| `node_modules/@esbuild/win32-arm64` | 0.28.2 | transitive; optional | MIT | no | not found locally |
| `node_modules/@esbuild/win32-ia32` | 0.28.2 | transitive; optional | MIT | no | not found locally |
| `node_modules/@esbuild/win32-x64` | 0.28.2 | transitive; optional | MIT | no | not found locally |
| `node_modules/@img/colour` | 1.1.0 | transitive; required | MIT | yes | LICENSE.md |
| `node_modules/@img/sharp-darwin-arm64` | 0.35.5 | transitive; optional | Apache-2.0 | no | not found locally |
| `node_modules/@img/sharp-darwin-x64` | 0.35.5 | transitive; optional | Apache-2.0 | no | not found locally |
| `node_modules/@img/sharp-freebsd-wasm32` | 0.35.5 | transitive; optional | Apache-2.0 | no | not found locally |
| `node_modules/@img/sharp-libvips-darwin-arm64` | 1.3.4 | transitive; optional | LGPL-3.0-or-later | no | not found locally |
| `node_modules/@img/sharp-libvips-darwin-x64` | 1.3.4 | transitive; optional | LGPL-3.0-or-later | no | not found locally |
| `node_modules/@img/sharp-libvips-linux-arm` | 1.3.4 | transitive; optional | LGPL-3.0-or-later | no | not found locally |
| `node_modules/@img/sharp-libvips-linux-arm64` | 1.3.4 | transitive; optional | LGPL-3.0-or-later | no | not found locally |
| `node_modules/@img/sharp-libvips-linux-ppc64` | 1.3.4 | transitive; optional | LGPL-3.0-or-later | no | not found locally |
| `node_modules/@img/sharp-libvips-linux-riscv64` | 1.3.4 | transitive; optional | LGPL-3.0-or-later | no | not found locally |
| `node_modules/@img/sharp-libvips-linux-s390x` | 1.3.4 | transitive; optional | LGPL-3.0-or-later | no | not found locally |
| `node_modules/@img/sharp-libvips-linux-x64` | 1.3.4 | transitive; optional | LGPL-3.0-or-later | yes | not found locally |
| `node_modules/@img/sharp-libvips-linuxmusl-arm64` | 1.3.4 | transitive; optional | LGPL-3.0-or-later | no | not found locally |
| `node_modules/@img/sharp-libvips-linuxmusl-x64` | 1.3.4 | transitive; optional | LGPL-3.0-or-later | no | not found locally |
| `node_modules/@img/sharp-linux-arm` | 0.35.5 | transitive; optional | Apache-2.0 | no | not found locally |
| `node_modules/@img/sharp-linux-arm64` | 0.35.5 | transitive; optional | Apache-2.0 | no | not found locally |
| `node_modules/@img/sharp-linux-ppc64` | 0.35.5 | transitive; optional | Apache-2.0 | no | not found locally |
| `node_modules/@img/sharp-linux-riscv64` | 0.35.5 | transitive; optional | Apache-2.0 | no | not found locally |
| `node_modules/@img/sharp-linux-s390x` | 0.35.5 | transitive; optional | Apache-2.0 | no | not found locally |
| `node_modules/@img/sharp-linux-x64` | 0.35.5 | transitive; optional | Apache-2.0 | yes | LICENSE |
| `node_modules/@img/sharp-linuxmusl-arm64` | 0.35.5 | transitive; optional | Apache-2.0 | no | not found locally |
| `node_modules/@img/sharp-linuxmusl-x64` | 0.35.5 | transitive; optional | Apache-2.0 | no | not found locally |
| `node_modules/@img/sharp-wasm32` | 0.35.5 | transitive; optional | Apache-2.0 AND LGPL-3.0-or-later AND MIT | yes | LICENSE |
| `node_modules/@img/sharp-webcontainers-wasm32` | 0.35.5 | transitive; optional | Apache-2.0 | no | not found locally |
| `node_modules/@img/sharp-win32-arm64` | 0.35.5 | transitive; optional | Apache-2.0 AND LGPL-3.0-or-later | no | not found locally |
| `node_modules/@img/sharp-win32-ia32` | 0.35.5 | transitive; optional | Apache-2.0 AND LGPL-3.0-or-later | no | not found locally |
| `node_modules/@img/sharp-win32-x64` | 0.35.5 | transitive; optional | Apache-2.0 AND LGPL-3.0-or-later | no | not found locally |
| `node_modules/@jridgewell/resolve-uri` | 3.1.2 | transitive; required | MIT | yes | LICENSE |
| `node_modules/@jridgewell/sourcemap-codec` | 1.6.0 | transitive; required | MIT | yes | LICENSE |
| `node_modules/@jridgewell/trace-mapping` | 0.3.9 | transitive; required | MIT | yes | LICENSE |
| `node_modules/@poppinss/colors` | 4.1.6 | transitive; required | MIT | yes | LICENSE.md |
| `node_modules/@poppinss/dumper` | 0.6.5 | transitive; required | MIT | yes | LICENSE.md |
| `node_modules/@poppinss/exception` | 1.2.3 | transitive; required | MIT | yes | LICENSE.md |
| `node_modules/@sindresorhus/is` | 7.2.0 | transitive; required | MIT | yes | license |
| `node_modules/@speed-highlight/core` | 1.2.24 | transitive; required | CC0-1.0 | yes | LICENSE |
| `node_modules/blake3-wasm` | 2.1.5 | transitive; required | MIT | yes | LICENSE |
| `node_modules/cookie` | 1.1.1 | transitive; required | MIT | yes | LICENSE |
| `node_modules/detect-libc` | 2.1.2 | transitive; required | Apache-2.0 | yes | LICENSE |
| `node_modules/error-stack-parser-es` | 1.0.5 | transitive; required | MIT | yes | LICENSE |
| `node_modules/esbuild` | 0.28.2 | transitive; required | MIT | yes | LICENSE.md |
| `node_modules/fsevents` | 2.3.3 | transitive; optional | MIT | no | not found locally |
| `node_modules/kleur` | 4.1.5 | transitive; required | MIT | yes | license |
| `node_modules/miniflare` | 5.20261012.1-beta | direct; required | MIT | yes | not found locally |
| `node_modules/path-to-regexp` | 6.3.0 | transitive; required | MIT | yes | LICENSE |
| `node_modules/pathe` | 2.0.3 | transitive; required | MIT | yes | LICENSE |
| `node_modules/playwright` | 1.64.1 | direct; required | Apache-2.0 | yes | LICENSE, NOTICE |
| `node_modules/playwright-core` | 1.64.1 | transitive; required | Apache-2.0 | yes | LICENSE, NOTICE |
| `node_modules/semver` | 7.8.5 | transitive; required | ISC | yes | LICENSE |
| `node_modules/sharp` | 0.35.5 | transitive; required | Apache-2.0 | yes | LICENSE |
| `node_modules/supports-color` | 10.2.2 | transitive; required | MIT | yes | license |
| `node_modules/tslib` | 2.8.1 | transitive; optional | 0BSD | yes | LICENSE.txt |
| `node_modules/undici` | 7.29.1 | transitive; required | MIT | yes | LICENSE |
| `node_modules/unenv` | 2.0.0-rc.24 | transitive; required | MIT | yes | LICENSE |
| `node_modules/workerd` | 1.20261012.1 | transitive; required | Apache-2.0 | yes | not found locally |
| `node_modules/wrangler` | 4.151.1 | direct; required | MIT OR Apache-2.0 | yes | not found locally |
| `node_modules/ws` | 8.21.0 | transitive; required | MIT | yes | LICENSE |
| `node_modules/youch` | 4.1.0-beta.10 | transitive; required | MIT | yes | LICENSE.md |
| `node_modules/youch-core` | 0.3.3 | transitive; required | MIT | yes | LICENSE.md |

## Runtime, browser and media tools

| Component observed | Local evidence / source | Observed terms / owner review action |
| --- | --- | --- |
| Node.js 24.19.0 | Actual `node --version`; binary `/opt/codex/runtimes/codex-primary-runtime/dependencies/node/bin/node`; SHA256 `bc17c508ffeed0ec622934f9b7fa72f8e78da65350e63c3eceb56fa688aa5e12` | Node's MIT notice plus bundled third-party notices in [v24.19.0 LICENSE](https://github.com/nodejs/node/blob/v24.19.0/LICENSE), fetched over verified HTTPS into ignored media provenance cache. Do not replace its full notices with the proposed project MIT text. Runtime distribution/container review remains separate. The prepared Node production image copies package manifests/source but installs no npm packages; npm entries below are development/evaluation/Workers tooling, not evidence that they are bundled into that image. |
| Chromium / headless shell 156.0.8078.4, Playwright revision 1248 | `node_modules/playwright-core/browsers.json`; `.cache/ms-playwright/chromium_headless_shell-1248/chrome-headless-shell-linux64/LICENSE.headless_shell` | Chromium BSD-style header plus many component notices in that complete file; file SHA256 `80253764cf5dde31aae6aa57ff29d460947d110f3eae31cb9cf208fb5ffcc089`. Inspect the browser distribution, not just the npm package license. Browsers remain ignored cloud tools; no browser redistribution in the source-only draft. |
| Caddy 2.11.7 | `.cache/caddy/caddy`, SHA256 `678ade3bfc088749c81a681adc603333ee0bb023b6a6cfe3c0f58bef8ff854e9`; release archive contains `LICENSE`, read and retained under ignored provenance cache | Apache-2.0 observed in bundled license and [tagged LICENSE](https://github.com/caddyserver/caddy/blob/v2.11.7/LICENSE). Go dependencies/binary components retain their terms. This inventory does not replace a complete Caddy binary SBOM/notice review if distributed. Private rehearsal only. |
| FFmpeg system binary 7.1.5-0+deb13u1 | `ffmpeg -version`, `dpkg-query -W ffmpeg`; `/usr/share/doc/ffmpeg/copyright` | Debian describes default GPL v2+ builds and Apache-linked libavcodec/libavfilter flavor effectively GPL v3+. This build has `--enable-gpl`; no blanket LGPL-only claim. Binary remains a cloud media tool, not in the submitted source artifact. Any binary redistribution requires its own review. |
| Playwright bundled FFmpeg revision 1013 | `playwright-core/browsers.json`; ignored `.cache/ms-playwright/ffmpeg-1013` | Used by browser recording; inspect its distribution and bundled terms separately from the system encoder. Not an npm runtime dependency or a project license. |
| CMU Flite libflite1 2.2-7; built-in `slt` voice | `dpkg-query -W libflite1`; `ffmpeg -h filter=flite`; `/usr/share/doc/libflite1/copyright` | Mixed file-level notices, including CMU permissive terms, special notices and GPL build/support files. Original synthetic speech generated locally; no cloned human voice or paid speech service. Retain the exact Debian copyright file for voice/tool review; no warranty of media rights is asserted. |

## Assets, hosted services and unclosed gates

- Original project UI footage and synthetic form content come from the actual cloud-only L capture, source `7f6e5f55e267c8d69ef2ab6dfcdd1a07960978f0`; original hashes are in [raw capture manifest](../../results/rc-video-manifest.json). The [narrated derivative manifest](../../results/rc-narrated-video-manifest.json) binds inputs, segment edits, voice, slates and output hashes. No stock imagery, music, third-party logos or copied marketing graphics were added.
- NVIDIA Nemotron is accessed through Nebius Token Factory; no weights are redistributed. API/provider/model terms and text-brand attribution remain separate from source licensing. Factual mention establishes no endorsement or trademark license.
- Workers, Wrangler, Miniflare/workerd dependencies are inventory entries, not proof of hosting entitlement, free-tier capacity, remote deployment, account approval or legal clearance. Cloudflare account/service terms require review for a chosen deployment.
- Project source, AI assistance, contributors, voice/media rights, distribution contents and hackathon personal/territorial/employment eligibility require owner review. Retain all applicable original notices for whatever is actually distributed. No comprehensive OS/container SBOM or full binary dependency-license audit is claimed.
