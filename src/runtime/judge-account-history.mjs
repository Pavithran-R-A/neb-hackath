// Build the canonical account reservation from its original source pin.
// A successor plan must never rewrite the reservation that was already persisted.
export function buildCanonicalJudgeAccountHistory({baseHistory, plan, previousPlan = null}) {
  if (typeof baseHistory !== 'string' || !baseHistory.endsWith('\n') || !plan || typeof plan !== 'object')
    throw new Error('Canonical judge history inputs invalid');
  const originalPlan = previousPlan ?? plan;
  if (previousPlan) {
    const immutable = ['id','model','suiteSha256','accountHistoryBaseSha256','maxRequests','dailyRequests',
      'sessionRequests','maxOutputTokens','spendLimitUsd','inputUsdPerMillion','outputUsdPerMillion'];
    if (immutable.some(key => previousPlan[key] !== plan[key]) ||
        JSON.stringify(previousPlan.scenarioIds) !== JSON.stringify(plan.scenarioIds) ||
        !/^[a-f0-9]{40}$/.test(previousPlan.sourceCommit ?? ''))
      throw new Error('Predecessor plan cannot change existing judge reservation');
  }
  const reservation = {
    event: 'reserved',
    campaignId: originalPlan.id,
    maxReservedUsd: originalPlan.spendLimitUsd,
    purpose: 'Bounded hosted judge inference envelope; unknown usage is retained and halts admission',
    sourceCommit: originalPlan.sourceCommit,
    suiteSha256: originalPlan.suiteSha256,
  };
  return baseHistory + JSON.stringify(reservation) + '\n';
}
