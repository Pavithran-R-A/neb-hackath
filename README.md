# Nebius × NVIDIA Hackathon 2026 — Feasibility Lab

**Status:** initial cloud-only prototype foundation. The final project idea has not been committed. Nothing here is a completed or submitted hackathon entry.

## Working hypothesis
A **Verified Completion Agent** could help someone navigate a confusing or inaccessible online form, recover from errors, and independently verify when a task is actually completed. We will compare a basic agent with a guarded, verification-oriented agent before deciding whether to proceed.

## Technology and competition constraints
- Build and test entirely in cloud environments; no local laptop installation required.
- The final application must meaningfully use at least one NVIDIA open model through **Nebius Token Factory** or **Nebius AI Cloud**.
- Coding may use Codex and other development tools. Coding models alone do not satisfy runtime eligibility.
- Tavily is an optional source of live information; add only when its output makes a genuine difference.
- Never expose API keys in code, issues, screenshots, or logs. Store them as protected cloud-environment secrets.
- Use fictional test records and allowlisted test sites. Never submit real forms or take irreversible actions without approval.
- Keep this project independent of all existing apps, credentials, databases and deployments.

## First milestone
1. Establish a cloud Node.js environment for this repository.
2. Make `npm test` pass and record test output.
3. Build a controlled example web form and a deterministic server-side completion receipt.
4. Implement an agent baseline and a recovery strategy with Nebius Nemotron (secrets provided privately).
5. Evaluate on held-out scenarios and report actual task completion, incorrect actions, cost and latency.

**No prototype results or Nebius API integration have been verified yet.**

## Getting started
This repository currently uses a minimal Node.js test harness, with no third-party dependencies:
```bash
npm test
```
Use the Codex cloud environment for subsequent implementation. Publish the environment after selecting this GitHub repository and its `main` branch.

## Source and submission
This GitHub repository is currently PUBLIC. Do not add sensitive information. Before hackathon submission, add a suitable open-source license, complete installation instructions, a working demo, a public short video, and verified model-inference evidence.