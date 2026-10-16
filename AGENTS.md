# Repository agent instructions

Read README.md first. This repository is a **new, separate hackathon feasibility project**. Do not access, alter, or borrow from any other owner repository or infrastructure.

- Work cloud-only. Do not require the user's laptop storage.
- The project idea is a *hypothesis*, not a final decision. Optimize for quickly proving or disproving the difficult functional claim.
- Final hackathon application must meaningfully call an eligible NVIDIA open model through Nebius Token Factory or Nebius AI Cloud.
- All APIs and secrets must be server-side in protected settings, never in source or logs. Never request secret values in a chat message.
- Use synthetic browser-form data, and do not submit to real services or perform irreversible actions.
- Require real, server-confirmed completion evidence; model statements alone cannot prove completion.
- Run actual tests. Report exact commands, exit codes, commit SHA, and any missing environment secrets. Do not claim unrun tests passed.
- Maintain independent test cases, including negative cases, and record real costs/latency when inference is enabled.
- No deployment or paid resources without separate authorization. No fabricated demo outcomes.
- Treat the current public repository as **not secret**.

Initial cloud task: create a reproducible fictional form testbed, deterministic receipt verifier, Node or TypeScript tests, and a benchmark scaffold. Only then integrate Nebius runtime inference.