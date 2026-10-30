import {readFile} from 'node:fs/promises';
import {createPostgresPool} from '../src/runtime/postgres-state.mjs';
import {preparePostgresJudgeBudgetSuccessor,activatePostgresJudgeBudgetSuccessor} from '../src/runtime/postgres-judge-budget.mjs';

const [mode, migrationId] = process.argv.slice(2);
const fail = () => {
  console.error('Usage: node scripts/judge-budget-successor.mjs --prepare|--activate <migration-id>');
  process.exitCode = 2;
};
if (!['--prepare','--activate'].includes(mode) || !/^[a-z0-9-]{8,80}$/.test(migrationId ?? '')) fail();
else {
  let pool;
  try {
    const oldPlan = JSON.parse(process.env.RECEIPTLAB_PREVIOUS_JUDGE_CONFIG_JSON ?? 'null');
    const nextPlan = JSON.parse(process.env.RECEIPTLAB_SUCCESSOR_JUDGE_CONFIG_JSON ?? 'null');
    const accessCode = process.env.RECEIPTLAB_JUDGE_CODE;
    const accountHistory = await readFile(new URL('../workers/account-history.jsonl',import.meta.url),'utf8');
    if (!oldPlan || !nextPlan || typeof accessCode !== 'string' || !process.env.DATABASE_URL) throw new Error('Protected migration inputs are unavailable');
    pool = createPostgresPool(process.env.DATABASE_URL);
    if (mode === '--prepare') {
      const result = await preparePostgresJudgeBudgetSuccessor({pool,namespace:'receiptlab-judge',migrationId,previousPlan:oldPlan,nextPlan,accessCode,previousAccountHistory:accountHistory,nextAccountHistory:accountHistory});
      console.log(JSON.stringify({operation:'prepare-successor',...result}));
    } else {
      const evidence = JSON.parse(process.env.RECEIPTLAB_JUDGE_MIGRATION_EVIDENCE_JSON ?? 'null');
      const result = await activatePostgresJudgeBudgetSuccessor({pool,namespace:'receiptlab-judge',migrationId,nextPlan,accessCode,evidence});
      console.log(JSON.stringify({operation:'activate-successor',...result}));
    }
  } catch {
    console.error('Successor operation failed closed. No protected configuration or provider credential was printed.');
    process.exitCode = 1;
  } finally { await pool?.end(); }
}
