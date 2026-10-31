// Reconstruct the single original canonical reservation. Successor source pins
// must never rewrite a reservation already present in the production ledger.
export async function readCanonicalJudgeHistory({pool, baseHistory, plan, namespace='receiptlab-judge'}) {
  if(!pool || typeof pool.query!=='function' || typeof baseHistory!=='string' || !baseHistory.endsWith('\n') || !plan)
    throw Error('Canonical judge history inputs invalid');
  let predecessor=plan;
  try {
    const rows=await pool.query(
      "SELECT from_plan_json FROM receiptlab_judge_budget_migrations WHERE namespace=$1 AND to_plan_json=$2 AND status IN ('prepared','active','halted')",
      [namespace,JSON.stringify(plan)]);
    if(rows.rowCount>1)throw Error('Conflicting judge successor records');
    if(rows.rowCount===1)predecessor=JSON.parse(rows.rows[0].from_plan_json);
  }catch(error){if(error.code!=='42P01')throw error;}
  if(!predecessor || predecessor.id!==plan.id ||
     predecessor.suiteSha256!==plan.suiteSha256 ||
     predecessor.spendLimitUsd!==plan.spendLimitUsd ||
     !/^[a-f0-9]{40}$/.test(predecessor.sourceCommit??''))
    throw Error('Canonical judge predecessor reservation invalid');
  const reservation={
    event:'reserved', campaignId:predecessor.id, maxReservedUsd:predecessor.spendLimitUsd,
    purpose:'Bounded hosted judge inference envelope; unknown usage is retained and halts admission',
    sourceCommit:predecessor.sourceCommit, suiteSha256:predecessor.suiteSha256,
  };
  return baseHistory+JSON.stringify(reservation)+'\n';
}
