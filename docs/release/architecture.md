# ReceiptLab architecture and trust boundaries

~~~mermaid
flowchart LR
  U[Local judge / tester] --> W[Loopback workbench]
  W --> S[Session-owned challenge / task]
  S --> F[Fictional form on separate loopback origin]
  F --> R[Private application state + HMAC receipt]
  W --> V[Run-bound independent verifier]
  R --> V
  V --> E[Sanitized evidence export]
  A[Guarded browser agent] --> F
  A --> G[Observed controls + task-value action guard]
  C[Owner-approved campaign ledger] --> N[NVIDIA Nemotron / Nebius]
  N --> A
~~~

Workbench never calls inference. A separate CLI requires new explicit approval. Agent contexts are fresh and route-restricted: no verifier endpoints, expected outcomes, signing key, workbench cookie or other run. Public app-owned field bindings are available equally to the deterministic and model policies, not private evaluator metadata.

Workbench uses HttpOnly/SameSite=Strict session capabilities, exact host/origin checks, same-origin POSTs, bounded session/run/request/body counts, TTL, no third-party assets and textContent data rendering. Private HMAC receipts bind intended run, flow, normalized task digest and one commit. Export omits contact values, signatures, keys and model reasoning. Its checksum detects accidental corruption; it does not authenticate a malicious exporter.

Restart invalidates sessions/signing keys. Campaign ledgers are fsynced local files, not distributed/account-enforced billing controls. Production needs durable coordination, HTTPS/Secure cookies, public gateway/routing, monitoring, abuse controls and account validation. Do not expose the current dynamic child run origins publicly.
