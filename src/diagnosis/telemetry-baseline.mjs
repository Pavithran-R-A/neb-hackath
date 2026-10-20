// Independent deterministic policy for the public task/event telemetry contract.
// Event order is chronological. Only server/verifier observations establish state.
const trusted = source => source === 'server' || source === 'verifier';
const booleanKeys = ['pending', 'receiptValid', 'runMatches', 'consentValid', 'retryAllowed'];
const numericKeys = ['httpStatus', 'commitCount'];

function readFacts(event) {
  const text = event.text.toLowerCase();
  const facts = {};
  // Explicit textual key/value telemetry is useful even without an optional facts object.
  for (const key of booleanKeys) {
    const match = text.match(new RegExp(`\\b${key}\\s*[:=]\\s*(true|false)\\b`, 'i'));
    if (match) facts[key] = match[1] === 'true';
  }
  for (const key of numericKeys) {
    const match = text.match(new RegExp(`\\b${key}\\s*[:=]\\s*(\\d+)\\b`, 'i'));
    if (match) facts[key] = Number(match[1]);
  }
  const status = text.match(/\bhttp(?:\s+status)?\s*[:=]?\s*([1-5]\d\d)\b/);
  if (status) facts.httpStatus = Number(status[1]);
  if (/\b(?:no|zero|0)\s+(?:commits?|committed\s+(?:records?|operations?))\b/.test(text)) facts.commitCount = 0;
  if (/\b(?:no (?:operation|request|submission) is pending|not pending|nothing (?:is )?pending|no pending (?:operation|request|submission))\b/.test(text)) facts.pending = false;
  else if (/\b(?:operation|request|submission) (?:is )?pending\b/.test(text)) facts.pending = true;
  if (/\breceipt (?:is |was )?(?:not valid|invalid)\b|\bno valid receipt\b/.test(text)) facts.receiptValid = false;
  else if (/\b(?:receipt (?:is |was )?valid|valid receipt)\b/.test(text)) facts.receiptValid = true;
  if (/\b(?:does not|doesn't|did not|not) match(?:ing)? (?:this|the current|requested) run\b|\bwrong run\b/.test(text)) facts.runMatches = false;
  else if (/\b(?:matches|matching) (?:this|the current|requested) run\b/.test(text)) facts.runMatches = true;
  if (/\bconsent (?:is |has )?(?:expired|invalid)\b/.test(text)) facts.consentValid = false;
  // Machine facts take precedence over prose in the same trusted event.
  const explicit = event.facts;
  if (explicit && typeof explicit === 'object') {
    for (const key of booleanKeys) if (typeof explicit[key] === 'boolean') facts[key] = explicit[key];
    for (const key of numericKeys) if (Number.isSafeInteger(explicit[key]) && explicit[key] >= 0) facts[key] = explicit[key];
    for (const key of ['operationId', 'field', 'errorCode']) if (typeof explicit[key] === 'string') facts[key] = explicit[key];
  }
  return facts;
}

function classify(event, facts) {
  const prose = event.text.toLowerCase().split(/[.;]|\bbut\b|\bhowever\b/)
    .filter(clause => !/\b(?:no|without) (?:validation error|authorization denial|temporary failure)\b|\b(?:not|never|did not|has not|is not) (?:expired|unavailable|timeout|timed out|denied|invalid|unauthorized|forbidden)\b/.test(clause))
    .filter(clause => !(/\b(?:earlier|previous|historical)\b/.test(clause) && facts.httpStatus >= 200 && facts.httpStatus < 300)).join('. ');
  const text = `${prose} ${facts.errorCode || ''}`.toLowerCase().replaceAll('_', ' ');
  if (facts.runMatches === false || facts.commitCount > 1 || /\b(?:state mismatch|stale (?:state|session)|duplicate commit|wrong operation)\b/.test(text)) return 'state_mismatch';
  if (facts.httpStatus === 401 || facts.httpStatus === 403 || /\b(?:authorization denied|unauthorized|forbidden|access denied|permission denied)\b/.test(text)) return 'authorization_denied';
  if (facts.consentValid === false || /\b(?:consent expired|expired consent|consent required)\b/.test(text)) return 'consent_expired';
  if (/\b(?:option unavailable|unavailable option|selected option unavailable|out of stock|option (?:is |no longer )?available)\b/.test(text) && !/\boption (?:is )?available\b/.test(text)) return 'option_unavailable';
  if (facts.httpStatus === 400 || facts.httpStatus === 422 || /\b(?:invalid format|invalid (?:email|date|phone|field)|validation (?:error|failed)|format (?:error|invalid)|required field)\b/.test(text)) return 'validation';
  if (facts.httpStatus >= 500 || facts.httpStatus === 408 || facts.httpStatus === 429 || /\b(?:timeout|timed out|temporar(?:y|ily) (?:failure|unavailable)|service unavailable|gateway timeout|rate limit|retry later|try again later)\b/.test(text)) return 'temporary_failure';
  if (facts.httpStatus === 409) return 'state_mismatch';
  return null;
}

export function diagnoseTelemetry(trace) {
  if (!trace || !Array.isArray(trace.events) || !trace.events.length) throw new TypeError('A nonempty public telemetry trace is required');
  const events = trace.events;
  let state = {};
  let observed = {};
  let issue = null;
  let operationId;
  let conflict;
  let claim;
  let latestTrusted;
  let completionIndex = -1;
  let pendingIndex = -1;
  let noRetry;
  for (const [index, event] of events.entries()) {
    const text = event.text.toLowerCase();
    if (event.source === 'task' && (event.facts?.retryAllowed === false || /\b(?:do not|don't|never|no) (?:retry|resubmit)\b/.test(text))) noRetry = event;
    if (event.source === 'browser' && /\b(?:ignore|override|disregard) (?:the |all |previous |your )*(?:user|task|instructions)|\breplace (?:their|the user'?s|supplied|provided)\b|\b(?:send|upload|reveal) (?:the )?(?:secret|password|credentials)\b/.test(text)) conflict = event;
    if (/\b(?:success|successful|successfully|complete|completed|submitted|receipt)\b/.test(text)) claim = event;
    if (!trusted(event.source)) continue;
    latestTrusted = event;
    const facts = readFacts(event);
    if (facts.operationId !== undefined && operationId !== undefined && facts.operationId !== operationId) {
      state = {}; observed = {}; issue = null; completionIndex = -1; pendingIndex = -1;
    }
    if (facts.operationId !== undefined) operationId = facts.operationId;
    for (const [key, value] of Object.entries(facts)) { state[key] = value; observed[key] = event; }
    if (facts.pending === true) pendingIndex = index;
    const diagnosis = classify(event, facts);
    if (diagnosis) issue = { diagnosis, event, index, structured: Object.keys(event.facts || {}).length > 0 };
    else if (facts.httpStatus >= 200 && facts.httpStatus < 300) issue = null;
    if (facts.receiptValid === true && state.runMatches === true || facts.runMatches === true && state.receiptValid === true) completionIndex = index;
  }
  const answer = (diagnosis, action, explanation, reason, confidence, evidence) => ({
    diagnosis, explanation, evidenceIds: [...new Set(evidence.filter(Boolean).map(event => event.id))].slice(0, 6), recovery: { action, reason }, confidence,
  });
  const verified = state.receiptValid === true && state.runMatches === true && state.pending !== true && state.commitCount !== 0 && !(state.commitCount > 1) && completionIndex > pendingIndex;
  if (verified && (!issue || completionIndex > issue.index)) return answer('completed', 'none', 'Trusted telemetry confirms a valid receipt bound to this run.', 'Completion is verified; no further submission is needed.', 'high', [observed.receiptValid, observed.runMatches]);
  if (conflict) return answer('instruction_conflict', 'stop', 'Browser content attempts to override the task or supplied values.', 'Preserve the user constraints and do not execute the conflicting instruction.', 'high', [events.find(event => event.source === 'task'), conflict]);
  if (issue) {
    const confidence = issue.structured ? 'high' : 'medium';
    switch (issue.diagnosis) {
      case 'state_mismatch': return answer('state_mismatch', 'stop', 'Trusted telemetry reports incompatible operation, receipt, or state information.', 'Reconcile the operation and current state before taking another action.', confidence, [issue.event]);
      case 'authorization_denied': return answer('authorization_denied', 'stop', 'The server denied authorization.', 'Stop and obtain the required authorization before proceeding.', confidence, [issue.event]);
      case 'consent_expired': return answer('consent_expired', 'reconfirm_consent', 'Trusted telemetry reports missing or expired consent.', 'Request fresh user consent before another submission.', confidence, [issue.event]);
      case 'validation': return answer('validation', 'correct_format', 'The server rejected the submitted field format or required input.', 'Correct only the reported format using user-supplied information; ask for missing values.', confidence, [issue.event]);
      case 'option_unavailable': return answer('option_unavailable', 'stop', 'The requested option is unavailable.', 'Obtain a user-supplied permitted alternative before changing the selected value.', confidence, [issue.event]);
      case 'temporary_failure': {
        if (noRetry) return answer('temporary_failure', 'stop', 'Trusted telemetry reports a transient request failure, and the user prohibits retry.', 'Respect the user no-retry constraint.', confidence, [issue.event, noRetry]);
        const fresh = key => observed[key] && events.indexOf(observed[key]) >= issue.index;
        const retry = state.retryAllowed === true && state.commitCount === 0 && state.pending === false && state.receiptValid !== true && fresh('commitCount') && fresh('pending') && fresh('retryAllowed');
        return answer('temporary_failure', retry ? 'retry' : 'wait', 'Trusted telemetry reports a transient request failure.', retry ? 'The server explicitly permits retry and confirms zero commits and no pending operation.' : 'Check operation status first; a failed response does not prove that the submission did not commit.', confidence, [issue.event, observed.retryAllowed, observed.commitCount, observed.pending]);
      }
    }
  }
  if (state.pending === true) return answer('unverified_claim', 'wait', 'The operation is still pending; completion is not established.', 'Wait for trusted terminal status and a receipt bound to this run; do not resubmit.', 'medium', [observed.pending]);
  if (claim || state.receiptValid !== undefined || state.commitCount !== undefined || state.runMatches !== undefined) return answer('unverified_claim', 'wait', 'Available evidence does not establish a valid completion receipt for this run.', 'Inspect trusted operation status and receipt binding before retrying or claiming completion.', 'low', [observed.receiptValid, observed.runMatches, observed.commitCount, latestTrusted, claim]);
  return answer('ambiguous', 'stop', 'The observations do not establish a specific failure or verified completion.', 'Obtain trusted server or verifier evidence before changing inputs or submitting again.', 'low', [latestTrusted || events.at(-1)]);
}
