# Independent public telemetry policy

This deterministic baseline consumes only the public trace contract: `id`, `task.goal`, optional `task.values`, and chronological `events` containing `id`, `source`, `kind`, `text`, and optional `facts`. It does not inspect trace IDs, external verification metadata, model output, evaluation files, or other policies.

Only `server` and `verifier` events establish execution facts. Browser and agent claims cannot prove completion or justify field corrections. Task events establish user constraints; explicit no-retry instructions take precedence over server retry permission. Browser instructions that override task values or request secrets trigger a stop. Recovery never invents replacement values.

Recognized typed facts are `httpStatus`, `commitCount`, `pending`, `receiptValid`, `runMatches`, `consentValid`, `retryAllowed`, `operationId`, `field`, and `errorCode`. Booleans must be booleans; numeric facts must be nonnegative safe integers. Explicit typed facts override prose in the same event. Prose supports explicit key/value telemetry and common HTTP, error, receipt, and negation expressions. This is a finite deterministic language parser, not a general natural-language reasoner.

Facts advance chronologically. A change in an explicit operation ID clears inherited execution state. Later verified completion supersedes earlier errors; later pending states block prior completion evidence. Completion requires a trusted valid receipt and positive run binding, no pending operation, and no contradictory zero/multiple commit count. A bare HTTP success or commit count cannot establish completion.

Transient failures permit retry only when fresh observations, at or after the relevant failure, explicitly establish retry permission, zero commits, and no pending operation, without a known valid receipt or user prohibition. Otherwise recovery waits for status. Authorization denials, state mismatches, unavailable options without a supplied permitted alternative, and uncertainty stop or wait as appropriate. Validation recovery corrects format using supplied data only; consent recovery requires renewed user consent.

High confidence describes explicit trusted cause/receipt evidence or an explicit instruction conflict. Unverified completion claims and insufficient observations retain low confidence. Text-only errors generally receive medium confidence. Unknown outcomes never authorize a duplicate retry.

The baseline was authored independently using generic tests in `test/telemetry-baseline.test.mjs`, before any held-out evaluation. Its scope is the public telemetry contract; missing operation IDs, incomplete facts, unrecognized language, and stale-but-unmarked observations remain limits. No external inference or network action is performed.
