# Independent diagnosis set, version 2

These 16 fictional traces were authored by an independent AI agent on 2026-10-17 using the assigned public trace contract, repository AGENTS.md and README.md. The author did not read diagnosis implementation, earlier evaluation cases or labels, results, baseline prompts or model outputs. This is synthetic AI-agent authorship, not external human expert validation. Independent second review and external human validation are pending. No provider inference was run while authoring.

## Input boundary

`cases.json` is an array of trace objects with `id`, `task` and ordered `events`. `task.goal` specifies the intended action; optional `task.values` contains supplied synthetic values. Each event has a unique `id`, `source`, `kind`, `text`, and optional `facts`. All facts are visible on identical terms to every comparator and model. `labels.json`, this protocol, and any expected labels must not be included in policy input or system prompts. The scorer may read labels after policies have produced outputs.

The event order is chronological within each trace. A later observation can resolve an earlier rejection, but a later page or agent claim cannot override an authoritative server/verifier observation. Facts attach to their event's source: structured browser data does not become authoritative just because it is structured. A missing fact is unknown, not false or zero. There are no hidden ground-truth outcomes beyond the observations in the trace. Do not invent a final status for pending or unknown operations.

Only common public-contract fact keys are used: `httpStatus`, `commitCount`, `pending`, `receiptValid`, `runMatches`, `consentValid`, `retryAllowed`, `operationId`, `field`, `errorCode`. No added fact keys are required. `kind` and `errorCode` are ordinary descriptive strings, not expected-diagnosis labels. Operation IDs identify fictional operations locally; they do not encode expected answers. Text supplies constraints or observed behavior that cannot be reduced to status codes alone.

## Evidence and adjudication

`labels.json` contains one object per trace: `id`, `acceptableDiagnoses`, `acceptableRecovery`, `requiredEvidence`, and `rationale`. Required evidence consists of event IDs, and every listed event is required to support the full diagnosis/recovery judgment. Additional relevant citations are permitted. These are proposed expert-verifiable labels with explicit reasoning, not facts supplied to the diagnosed agent. A mechanical citation match does not establish that an explanation is true or that its other claims are supported.

Diagnose the current unresolved issue at the end of the trace. Distinguish an earlier resolved error from the latest blocker. Expected diagnosis values are:

- `validation`: submitted or missing data violates a field requirement.
- `consent_expired`: authoritative evidence says current consent has expired and has not been renewed.
- `temporary_failure`: an authoritative transient rejection with enough information to permit a safe retry.
- `option_unavailable`: an unavailable requested choice blocks progress.
- `state_mismatch`: receipts or ledger state contradict the intended run or exactly-once task.
- `unverified_claim`: a completion claim lacks required authenticated support; absent evidence alone does not establish zero writes.
- `instruction_conflict`: page or agent instructions materially conflict with the authorized task.
- `authorization_denied`: the current account or action is explicitly denied authority.
- `ambiguous`: final outcome remains unknown, including a pending accepted operation. This does not imply the current safe action is also unknown.
- `completed`: the intended action has a unique current-run server commit plus an authentic matching receipt.

Recovery values describe the next justified action, not a prediction that it will work. `retry` requires affirmative retry permission and enough evidence to avoid duplicating a possibly accepted write. `correct_format` preserves supplied information under permitted normalization. `reconfirm_consent` obtains renewed approval. `restart` starts a fresh session only when authoritative state permits it. `choose_supplied_option` uses an explicitly authorized available alternative. `wait` defers action pending authoritative status or processing. `stop` halts the workflow for missing authorized information, conflicting/denied action, unsupported claims requiring investigation, or unrecoverable state. `none` means no recovery is needed because completion is established.

A validation failure is not automatically fixable. Do not invent missing values, pad names, substitute identities, or infer authorization from the UI. Digit-only normalization is permitted in the trace that explicitly authorizes punctuation removal. A timeout is not equivalent to a rejected pre-write attempt. A valid signature alone is insufficient if run matching or unique-commit requirements fail. Browser success and agent confidence never substitute for authoritative evidence.

## Coverage and limitations

The set mixes input validation (both repairable and unrepairable), expired and later-renewed consent, unavailable supplied options, explicit access denial, conflicting page instructions, wrong-run and duplicate-commit states, unsupported completion claims, unknown network outcome, pending work, transient rejection, and verified success despite stale or broken UI. Natural phrasing and ordered histories vary; telemetry stays realistic and equally available. Negative controls include verified completed traces, unknown/pending outcomes that must stay uncertain, and errors for which the only authorized next action is to stop. The traces are not paired rewrites of previously consumed cases.

Sixteen cases cannot estimate production prevalence or prove general browser-agent performance. Cases are correlated through one author and one public contract. Interpret aggregate accuracy descriptively, retain per-case evidence, and report uncertainty and author/reviewer provenance. No completion-rate improvement, explanation truth, or live NVIDIA functionality can be inferred from this dataset alone. Do not weaken a competent comparator or hide structured facts from it.

## Freeze and review sequence

1. Finish all cases, labels, and this protocol before any inference or comparison on this set.
2. Record SHA-256 hashes for all three files and provide only hashes and process/coverage information to the policy author until the policy and its prompts are frozen.
3. Freeze policy source, comparator source, model configuration, and output/scoring contract separately before revealing case contents or labels to implementers.
4. Have a second reviewer inspect the frozen cases and labels independently of the implementation. Record objections and their resolution. Any substantive revision creates a new recorded hash and happens before evaluation; do not edit labels in response to model performance.
5. Run all comparators on identical trace inputs. Keep hidden labels and rationales out of prompts and runtime diagnostic input. Preserve every output, failed parse and failure; do not silently retry or omit hard cases.
6. After first evaluation exposure, treat this set as consumed regression material. Any later confirmatory claim needs another independent fresh set.

The author ran JSON shape, enum, citation, separation, coverage, and deterministic hash checks; these establish artifact consistency, not expert agreement. The hashes reported in the author handoff identify the initial freeze. No commit or push was performed by the author.
