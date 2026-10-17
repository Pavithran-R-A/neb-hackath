# Verified Workflow Release Sprint Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Ship tested non-billable infrastructure and local product journey while keeping inference/release gates closed.
**Architecture:** Run-bound receipts, fixed provider contract, exclusive persistent campaign reservation ledger, frozen evaluation candidates, isolated loopback evidence workbench.
**Tech Stack:** Node >=24.19, native HTTP/fs/crypto/test, pinned Playwright Chromium; no new runtime dependencies.
**Spec:** docs/superpowers/specs/2026-10-17-release-sprint.md

## Global Constraints

- Cloud-only /workspace/neb-hackath; branch feat/phase1-verified-completion, PR #2 draft.
- Zero inference now; fresh explicit aggregate budget required; no merge/public resources/submission.
- Model identity exact; task values only; independent receipt verdict; no raw secrets/model reasoning in logs.
- No license/eligibility certification without owner attestation.

## Review Focus

- Same-task cross-run replay must fail using caller-supplied run identity.
- Failed/ambiguous requests consume reservations and stop campaigns; restarts cannot reset a ledger.
- Baseline and guard must both handle supported semantic labels before v2 freezes.
- Workbench cookies cannot grant evaluator access to another session or agent context.
- Restart loses synthetic sessions honestly; deployment must not suggest durable signing/budgets on ephemeral storage.

## Tasks

### 1. Verification, comparator and bounded campaign
Files: src/verification.mjs and call sites; src/agents/dom-baseline.mjs, actions.mjs; src/campaign.mjs; scripts/campaign.mjs; scripts/benchmark.mjs; test/campaign.test.mjs and verifier tests.
Interfaces: verifyCompletion(record, task, key, {runId}); createCampaign({authorization,ledgerPath,sourceCommit,suiteSha256,apiKey,fetchImpl}) -> {fetch,close,status}; offline default CLI plan; execution requires matching source and approval.
- [ ] Add run-replay, guard semantics, request reservation/budget/usage/error/reopen/parallel tests; observe failure.
- [ ] Implement minimum interfaces, block legacy live CLI, validate targeted + full tests.
- [ ] Commit/push first milestone.

### 2. Frozen suite and useful local journey
Files: src/evaluation-v2.mjs, src/app/{server.mjs,client.js}, src/workbench/*, scripts/workbench.mjs; test/evaluation-v2.test.mjs, workbench.test.mjs, workbench-browser.test.mjs.
Interfaces: frozen scenario array + SHA256; workbench server createWorkbench({port}) -> {origin,close}; session-scoped create/verify/export endpoints, zero model path.
- [ ] Add HTTP/browser tests for conditional/recovery/negative scenarios, isolation/TTL/rate/body/host bounds, false UI claims, keyboard and responsive layouts; observe failures.
- [ ] Implement fixture and workbench; freeze candidates/comparator hash before model evaluation; don't tune on results.
- [ ] Run tests, capture actual screenshots, commit/push milestone.

### 3. Release evidence and readiness
Files: deployment config/build smoke scripts, docs/release/*, README, docs/coordination.md, CI; no public creation or selected license.
- [ ] Verify official rules and deployment runtime fit; record account/entitlement uncertainty.
- [ ] Run all tests, npm audit, secret/source checks, local restart/build/health checks; fix failures.
- [ ] Request independent review; fix findings; commit/push verified milestone; inspect hosted CI exact SHA and update draft PR.
- [ ] Prepare honest submission text/storyboard/checklist and explicit model/product/deployment/license/eligibility gates.
