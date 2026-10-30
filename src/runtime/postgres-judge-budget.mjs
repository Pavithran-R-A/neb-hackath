import {createHash, randomUUID, timingSafeEqual} from 'node:crypto';
import {JUDGE_ACCESS_END_MS} from './judge-window.mjs';

const sha = value => createHash('sha256').update(value).digest('hex');
const nano = value => Math.round(value * 1e9);
const fromJson = value => typeof value === 'string' ? JSON.parse(value) : value;
const denied = message => Object.assign(new Error(message), {expected: true});
const canonicalJson = value => JSON.stringify(value, (_key, item) => {
  if (!item || typeof item !== 'object' || Array.isArray(item)) return item;
  return Object.fromEntries(Object.keys(item).sort().map(key => [key, item[key]]));
});
const planHashFor = (plan, accessCode) => sha(JSON.stringify(plan) + sha(accessCode));
const snapshotHashFor = snapshot => sha(canonicalJson(snapshot));

function validatePlan(plan, accessCode, now, {allowExpired = false} = {}) {
  if (!plan || !/^[\w-]{1,80}$/.test(plan.id ?? '') || !/^nvidia\/.*nemotron/i.test(plan.model ?? '') ||
      !/^[a-f0-9]{40}$/.test(plan.sourceCommit ?? '') || !/^[a-f0-9]{64}$/.test(plan.suiteSha256 ?? '') ||
      !/^[a-f0-9]{64}$/.test(plan.accountHistoryBaseSha256 ?? '') ||
      typeof accessCode !== 'string' || accessCode.length < 24 || !Number.isInteger(plan.maxRequests) || plan.maxRequests < 1 || plan.maxRequests > 100 ||
      !Number.isInteger(plan.dailyRequests) || plan.dailyRequests < 1 || plan.dailyRequests > 20 ||
      !Number.isInteger(plan.sessionRequests) || plan.sessionRequests < 1 || plan.sessionRequests > 2 || plan.maxOutputTokens !== 8192 ||
      !Number.isFinite(plan.spendLimitUsd) || plan.spendLimitUsd <= 0 || plan.spendLimitUsd > .5 ||
      ![plan.inputUsdPerMillion, plan.outputUsdPerMillion].every(n => Number.isFinite(n) && n > 0) ||
      JSON.stringify(plan.scenarioIds) !== JSON.stringify(['grant-transient', 'workshop-false-success']) ||
      !Number.isFinite(Date.parse(plan.expiresAt)) || (!allowExpired && Date.parse(plan.expiresAt) <= now()) || Date.parse(plan.expiresAt) > JUDGE_ACCESS_END_MS) {
    throw new Error('Invalid bounded judge configuration');
  }
}

function validateSuccessorPolicy(previousPlan, nextPlan) {
  const fixed = ['id', 'model', 'maxRequests', 'dailyRequests', 'sessionRequests', 'maxOutputTokens', 'spendLimitUsd', 'inputUsdPerMillion', 'outputUsdPerMillion', 'accountHistoryBaseSha256'];
  if (fixed.some(key => previousPlan[key] !== nextPlan[key]) ||
      JSON.stringify(previousPlan.scenarioIds) !== JSON.stringify(nextPlan.scenarioIds) ||
      previousPlan.sourceCommit === nextPlan.sourceCommit ||
      !/^[a-f0-9]{64}$/.test(previousPlan.runtimeSha256 ?? '') || !/^[a-f0-9]{64}$/.test(nextPlan.runtimeSha256 ?? '') ||
      !Number.isFinite(Date.parse(previousPlan.expiresAt)) || Date.parse(nextPlan.expiresAt) <= Date.parse(previousPlan.expiresAt)) {
    throw new Error('Successor plan changes campaign limits, accounting basis, or provenance unexpectedly');
  }
}

function currentAccounting(snapshot, plan) {
  if (!snapshot || !Array.isArray(snapshot.calls) || !snapshot.access || typeof snapshot.access !== 'object') throw new Error('PostgreSQL judge budget snapshot invalid');
  const committed = snapshot.calls.reduce((n, call) => {
    if (!Number.isSafeInteger(call.reservation) || call.reservation < 0 || (call.cost !== null && (!Number.isSafeInteger(call.cost) || call.cost < 0))) throw new Error('PostgreSQL judge call accounting invalid');
    return n + (call.cost ?? call.reservation);
  }, 0);
  if (snapshot.calls.length > plan.maxRequests || committed > nano(plan.spendLimitUsd)) throw new Error('Existing judge ledger exceeds the successor plan limits');
  return {
    committed,
    unknownReservation: snapshot.calls.reduce((n, call) => n + (call.cost === null ? call.reservation : 0), 0),
  };
}

function validateActivationEvidence(evidence, now) {
  const text = value => typeof value === 'string' && value.trim().length >= 4 && value.length <= 500;
  if (!evidence || !['reconciled', 'unknown-reservation-retained'].includes(evidence.providerUsage) ||
      !text(evidence.providerEvidenceRef) || evidence.promoCreditsVerified !== true ||
      evidence.stopUsageVerified !== true || evidence.noCashExposureVerified !== true ||
      !text(evidence.organizerPermissionRef) || !text(evidence.operator) ||
      !Number.isFinite(Date.parse(evidence.verifiedAt)) || Date.parse(evidence.verifiedAt) > now() + 300_000 || now() - Date.parse(evidence.verifiedAt) > 86_400_000) {
    throw new Error('Successor activation requires provider, no-cash, and organizer evidence');
  }
}

/**
 * Prepare a source-pinned plan revision without changing the legacy budget row.
 * The campaign id, canonical account history, limits, prices, access map and calls stay shared.
 * The additive migration table must already exist (migrations/neon/003_judge_budget_successor.sql).
 */
export async function preparePostgresJudgeBudgetSuccessor({
  pool, namespace = 'receiptlab', migrationId, previousPlan, nextPlan, accessCode,
  previousAccountHistory, nextAccountHistory = previousAccountHistory, now = Date.now,
} = {}) {
  if (!pool || typeof pool.query !== 'function' || !/^[a-z0-9-]{1,80}$/.test(namespace) || !/^[a-z0-9-]{8,80}$/.test(migrationId ?? '')) throw new Error('PostgreSQL successor migration configuration invalid');
  validatePlan(previousPlan, accessCode, now, {allowExpired: true});
  validatePlan(nextPlan, accessCode, now);
  validateSuccessorPolicy(previousPlan, nextPlan);
  if (typeof previousAccountHistory !== 'string' || nextAccountHistory !== previousAccountHistory) throw new Error('Successor must preserve canonical account history byte-for-byte');
  const history = parseHistory(previousAccountHistory, previousPlan);
  const fromPlanHash = planHashFor(previousPlan, accessCode), toPlanHash = planHashFor(nextPlan, accessCode);
  const client = await pool.connect();
  let began = false;
  try {
    await client.query('BEGIN'); began = true;
    const saved = await client.query('SELECT plan_hash,history_hash,snapshot FROM receiptlab_judge_budget WHERE namespace=$1 FOR UPDATE', [namespace]);
    if (!saved.rowCount || saved.rows[0].plan_hash !== fromPlanHash || saved.rows[0].history_hash !== history.hash) throw new Error('Stale predecessor plan or history; no migration prepared');
    const snapshot = fromJson(saved.rows[0].snapshot);
    const accounting = currentAccounting(snapshot, previousPlan);
    if (snapshot.halted !== true || !snapshot.calls.some(call => !call.validated) || accounting.unknownReservation <= 0) throw new Error('Successor preparation requires the existing halted campaign and retained unknown reservation');
    if (snapshot.baseHistoryHash !== history.reservationHash) throw new Error('Predecessor snapshot does not match canonical history');
    const snapshotHash = snapshotHashFor(snapshot);
    const existing = await client.query('SELECT * FROM receiptlab_judge_budget_migrations WHERE namespace=$1 AND (migration_id=$2 OR to_plan_hash=$3) FOR UPDATE', [namespace, migrationId, toPlanHash]);
    if (existing.rowCount > 1) throw new Error('Conflicting successor migration already exists');
    if (existing.rowCount) {
      const row = existing.rows[0];
      const same = row.migration_id === migrationId && row.from_plan_hash === fromPlanHash && row.to_plan_hash === toPlanHash &&
        row.from_history_hash === history.hash && row.to_history_hash === history.hash &&
        row.from_plan_json === JSON.stringify(previousPlan) && row.to_plan_json === JSON.stringify(nextPlan);
      if (!same) throw new Error('Conflicting successor migration already exists');
      await client.query('COMMIT'); began = false;
      return {migrationId, status: row.status, idempotent: true, legacyHalted: true, unknownReservationNanoUsd: Number(row.unknown_reservation_nano_usd)};
    }
    await client.query(`INSERT INTO receiptlab_judge_budget_migrations
      (namespace,migration_id,version,from_plan_hash,to_plan_hash,from_history_hash,to_history_hash,snapshot_hash_at_prepare,
       from_plan_json,to_plan_json,unknown_reservation_nano_usd,status)
      VALUES($1,$2,1,$3,$4,$5,$5,$6,$7,$8,$9,'prepared')`,
    [namespace,migrationId,fromPlanHash,toPlanHash,history.hash,snapshotHash,JSON.stringify(previousPlan),JSON.stringify(nextPlan),accounting.unknownReservation]);
    await client.query(`INSERT INTO receiptlab_judge_budget_migration_events(namespace,migration_id,event_type,event_json)
      VALUES($1,$2,'prepared',$3::jsonb)`, [namespace,migrationId,JSON.stringify({version:1,fromPlanHash,toPlanHash,historyHash:history.hash,snapshotHashAtPrepare:snapshotHash,unknownReservationNanoUsd:accounting.unknownReservation,unknownUsageDisposition:'retained-held-no-replay',legacyHalted:true})]);
    await client.query('COMMIT'); began = false;
    return {migrationId, status:'prepared', idempotent:false, legacyHalted:true, unknownReservationNanoUsd:accounting.unknownReservation};
  } catch (error) {
    if (began) { try { await client.query('ROLLBACK'); } catch {} }
    throw error;
  } finally { client.release(); }
}

/** Activation records owner-verified gates; it never modifies or clears the legacy snapshot.halted flag. */
export async function activatePostgresJudgeBudgetSuccessor({pool, namespace = 'receiptlab', migrationId, nextPlan, accessCode, evidence, now = Date.now} = {}) {
  if (!pool || typeof pool.query !== 'function' || !/^[a-z0-9-]{1,80}$/.test(namespace) || !/^[a-z0-9-]{8,80}$/.test(migrationId ?? '')) throw new Error('PostgreSQL successor activation configuration invalid');
  validatePlan(nextPlan,accessCode,now);
  const toPlanHash = planHashFor(nextPlan,accessCode);
  validateActivationEvidence(evidence,now);
  const client = await pool.connect();
  let began = false;
  try {
    await client.query('BEGIN'); began = true;
    const budget = await client.query('SELECT plan_hash,history_hash,snapshot FROM receiptlab_judge_budget WHERE namespace=$1 FOR UPDATE', [namespace]);
    if (!budget.rowCount) throw new Error('PostgreSQL judge budget row missing');
    const migration = await client.query('SELECT * FROM receiptlab_judge_budget_migrations WHERE namespace=$1 AND migration_id=$2 FOR UPDATE', [namespace,migrationId]);
    if (!migration.rowCount) throw new Error('Prepared successor migration missing');
    const row = migration.rows[0], snapshot = fromJson(budget.rows[0].snapshot);
    const activation = {...evidence, verifiedAt:new Date(Date.parse(evidence.verifiedAt)).toISOString()};
    if (row.status === 'active' && row.to_plan_hash === toPlanHash && budget.rows[0].plan_hash === row.from_plan_hash &&
        budget.rows[0].history_hash === row.from_history_hash && canonicalJson(row.activation_evidence) === canonicalJson(activation)) {
      await client.query('COMMIT'); began = false;
      return {migrationId,status:'active',idempotent:true,legacyHalted:Boolean(snapshot.halted)};
    }
    if (row.status !== 'prepared' || row.to_plan_hash !== toPlanHash || canonicalJson(JSON.parse(row.to_plan_json)) !== canonicalJson(nextPlan) ||
        budget.rows[0].plan_hash !== row.from_plan_hash || budget.rows[0].history_hash !== row.from_history_hash || snapshotHashFor(snapshot) !== row.snapshot_hash_at_prepare) throw new Error('Successor activation preconditions changed; remain halted');
    const updated = await client.query(`UPDATE receiptlab_judge_budget_migrations SET status='active',activation_evidence=$3::jsonb,activated_at=$4 WHERE namespace=$1 AND migration_id=$2 AND status='prepared' RETURNING status`, [namespace,migrationId,JSON.stringify(activation),new Date(now()).toISOString()]);
    if (!updated.rowCount) throw new Error('Successor activation lost a concurrent update');
    await client.query(`INSERT INTO receiptlab_judge_budget_migration_events(namespace,migration_id,event_type,event_json)
      VALUES($1,$2,'activated',$3::jsonb)`, [namespace,migrationId,JSON.stringify(activation)]);
    await client.query('COMMIT'); began = false;
    return {migrationId,status:'active',legacyHalted:Boolean(snapshot.halted)};
  } catch (error) {
    if (began) { try { await client.query('ROLLBACK'); } catch {} }
    throw error;
  } finally { client.release(); }
}

function parseHistory(text, plan) {
  if (typeof text !== 'string' || !text.endsWith('\n')) throw new Error('Canonical account history required');
  const entries = text.trimEnd().split('\n').map(line => JSON.parse(line));
  if (entries[0]?.event !== 'initial' || entries[0].initialAccountUsd !== 59 || entries[0].judgeReserveUsd !== 50) throw new Error('Canonical account history required');
  const reservations = entries.filter(entry => entry.event === 'reserved' && entry.campaignId === plan.id);
  const reservation = reservations[0];
  const settled = entries.some(entry => entry.event === 'settled' && entry.campaignId === plan.id);
  if (reservations.length!==1 || entries.at(-1)!==reservation || reservation.maxReservedUsd !== plan.spendLimitUsd || reservation.sourceCommit!==plan.sourceCommit || reservation.suiteSha256!==plan.suiteSha256 || settled) throw new Error('Existing bounded judge reservation/history required');
  const before = entries.slice(0, entries.indexOf(reservation)).map(entry => JSON.stringify(entry)).join('\n') + '\n';
  if(sha(before)!==plan.accountHistoryBaseSha256)throw new Error('Canonical account history source hash mismatch');
  return {entries, hash: sha(text), reservationHash: sha(before)};
}

// PostgreSQL row locking makes each budget mutation atomic across processes and restarts.
// accountHistory is an immutable sanitized ledger supplied from protected deployment config.
export async function openPostgresJudgeBudget({pool, namespace = 'receiptlab', plan, accessCode, accountHistory, now = Date.now} = {}) {
  if (!pool || typeof pool.query !== 'function' || !/^[a-z0-9-]{1,80}$/.test(namespace)) throw new Error('PostgreSQL judge storage configuration invalid');
  validatePlan(plan, accessCode, now);
  if (typeof accountHistory !== 'string') throw new Error('Canonical account history required');
  const historyHash = sha(accountHistory), planHash = planHashFor(plan, accessCode);
  let history, migration = null;
  await pool.query(`CREATE TABLE IF NOT EXISTS receiptlab_judge_budget (
    namespace text PRIMARY KEY,
    plan_hash text NOT NULL,
    history_hash text NOT NULL,
    snapshot jsonb NOT NULL,
    updated_at timestamptz NOT NULL DEFAULT now()
  )`);
  let closed = false, failed = false;
  const healthy = () => { if (closed) throw new Error('Judge budget closed'); if (failed) throw new Error('Judge budget unavailable after storage failure'); };
  const transact = async mutate => {
    healthy();
    let began = false, client;
    try {
      client = await pool.connect();
      await client.query('BEGIN'); began = true;
      const row = await client.query('SELECT plan_hash,history_hash,snapshot FROM receiptlab_judge_budget WHERE namespace=$1 FOR UPDATE', [namespace]);
      if (!row.rowCount) throw new Error('PostgreSQL judge budget row missing');
      const legacyRow = migration && row.rows[0].plan_hash === migration.from_plan_hash && row.rows[0].history_hash === migration.from_history_hash;
      if ((!legacyRow && row.rows[0].plan_hash !== planHash) || (!legacyRow && row.rows[0].history_hash !== historyHash)) throw new Error('Judge plan or canonical account history changed; explicit migration required');
      if (migration) {
        const currentMigration = await client.query('SELECT status FROM receiptlab_judge_budget_migrations WHERE namespace=$1 AND migration_id=$2 FOR UPDATE', [namespace,migration.migration_id]);
        if (!currentMigration.rowCount) throw new Error('Successor migration audit row missing; inference halted');
        const status = currentMigration.rows[0].status;
        if (status !== 'active') throw denied('Successor migration is not active');
      }
      const state = fromJson(row.rows[0].snapshot);
      const result = await mutate(state, client);
      await client.query('UPDATE receiptlab_judge_budget SET snapshot=$1::jsonb,updated_at=now() WHERE namespace=$2', [JSON.stringify(state), namespace]);
      await client.query('COMMIT'); began = false;
      return result;
    } catch (error) {
      if (began) { try { await client.query('ROLLBACK'); } catch { failed = true; } }
      if (!error.expected) failed = true;
      throw error;
    } finally { client?.release(); }
  };
  const initClient = await pool.connect();
  try {
    await initClient.query('BEGIN');
    const saved = await initClient.query('SELECT plan_hash,history_hash,snapshot FROM receiptlab_judge_budget WHERE namespace=$1 FOR UPDATE', [namespace]);
    if (!saved.rowCount) {
      history = parseHistory(accountHistory, plan);
      await initClient.query('INSERT INTO receiptlab_judge_budget(namespace,plan_hash,history_hash,snapshot) VALUES($1,$2,$3,$4::jsonb)',
        [namespace,planHash,history.hash,JSON.stringify({halted:false,access:{},calls:[],baseHistoryHash:history.reservationHash})]);
    } else if (saved.rows[0].plan_hash === planHash && saved.rows[0].history_hash === historyHash) {
      history = parseHistory(accountHistory, plan);
      const snapshot = fromJson(saved.rows[0].snapshot);
      if (!snapshot || !Array.isArray(snapshot.calls) || !snapshot.access || snapshot.baseHistoryHash !== history.reservationHash) throw new Error('PostgreSQL judge budget snapshot invalid');
      if (snapshot.calls.some(call => !call.validated)) snapshot.halted = true;
      await initClient.query('UPDATE receiptlab_judge_budget SET snapshot=$1::jsonb,updated_at=now() WHERE namespace=$2', [JSON.stringify(snapshot), namespace]);
    } else {
      const migrations = await initClient.query(`SELECT * FROM receiptlab_judge_budget_migrations
        WHERE namespace=$1 AND to_plan_hash=$2 AND to_history_hash=$3 ORDER BY prepared_at DESC LIMIT 1 FOR UPDATE`, [namespace,planHash,historyHash]);
      if (!migrations.rowCount) throw new Error('Judge plan or canonical account history changed; explicit migration required');
      migration = migrations.rows[0];
      if (migration.from_plan_hash !== saved.rows[0].plan_hash || migration.from_history_hash !== saved.rows[0].history_hash) throw new Error('Successor migration predecessor hashes do not match; inference halted');
      const previousPlan = JSON.parse(migration.from_plan_json), recordedNextPlan = JSON.parse(migration.to_plan_json);
      if (planHashFor(previousPlan,accessCode) !== migration.from_plan_hash || planHashFor(recordedNextPlan,accessCode) !== planHash || canonicalJson(recordedNextPlan) !== canonicalJson(plan)) throw new Error('Successor plan provenance does not match its audit record');
      validatePlan(previousPlan,accessCode,now,{allowExpired:true});
      validateSuccessorPolicy(previousPlan,plan);
      history = parseHistory(accountHistory,previousPlan);
      if (history.hash !== historyHash || (migration.status === 'prepared' && migration.snapshot_hash_at_prepare !== snapshotHashFor(fromJson(saved.rows[0].snapshot)))) throw new Error('Successor migration history or prepared snapshot does not match');
      const snapshot = fromJson(saved.rows[0].snapshot);
      if (!snapshot || !Array.isArray(snapshot.calls) || !snapshot.access || snapshot.baseHistoryHash !== history.reservationHash || snapshot.halted !== true) throw new Error('PostgreSQL successor requires preserved halted predecessor state');
      currentAccounting(snapshot,plan);
    }
    await initClient.query('COMMIT');
  } catch (error) {
    try { await initClient.query('ROLLBACK'); } catch {}
    throw error;
  } finally { initClient.release(); }

  if (!history) throw new Error('Canonical account history required');

  const read = async () => {
    healthy();
    try {
      const result = await pool.query('SELECT snapshot FROM receiptlab_judge_budget WHERE namespace=$1', [namespace]);
      if (!result.rowCount) throw new Error('PostgreSQL judge budget row missing');
      return fromJson(result.rows[0].snapshot);
    } catch { failed = true; throw new Error('PostgreSQL judge budget unavailable; inference halted'); }
  };
  const summary = async () => {
    const state = await read(), calls = state.calls;
    const known = calls.reduce((n, call) => n + (call.cost ?? 0), 0);
    const committed = calls.reduce((n, call) => n + (call.cost ?? call.reservation), 0);
    let successorStatus = null;
    if (migration) {
      const result = await pool.query('SELECT status FROM receiptlab_judge_budget_migrations WHERE namespace=$1 AND migration_id=$2', [namespace,migration.migration_id]);
      if (!result.rowCount) throw new Error('Successor migration audit row missing; inference halted');
      successorStatus = result.rows[0].status;
    }
    const successorPending = migration && calls.some(call => call.source === plan.sourceCommit && !call.validated);
    const halted = migration ? successorStatus !== 'active' || successorPending : Boolean(state.halted);
    return {requests: calls.length, knownCostUsd: known / 1e9, committedUsd: committed / 1e9,
      unknownRequests: calls.filter(call => call.cost === null).length, pendingRequests: calls.filter(call => !call.validated).length,
      maxRequests: plan.maxRequests, envelopeUsd: plan.spendLimitUsd, expiresAt: plan.expiresAt, halted,
      legacyHalted: Boolean(state.halted), successorStatus};
  };
  const budget = {
    plan,
    postgresDurableBudget: true,
    summary,
    async authorized(sessionId) { const state = await read(); return state.access[sha(sessionId)]?.approved === true; },
    async authorize(sessionId, code) {
      const session = sha(sessionId), supplied = sha(typeof code === 'string' ? code : ''), expected = sha(accessCode);
      const equal = timingSafeEqual(Buffer.from(supplied, 'hex'), Buffer.from(expected, 'hex'));
      return transact(state => {
        const day = new Date(now()).toISOString().slice(0, 10), access = state.access[session] ?? {attempts: 0, approved: false, attemptDay: day, attemptsToday: 0};
        if (access.attempts >= 5) throw denied('Judge access attempt limit');
        const daily = Object.values(state.access).reduce((n, item) => n + (item.attemptDay === day ? item.attemptsToday : 0), 0);
        if (daily >= 200) throw denied('Judge daily access attempt capacity');
        access.attempts++;
        access.attemptsToday = access.attemptDay === day ? access.attemptsToday + 1 : 1;
        access.attemptDay = day;
        access.approved ||= equal;
        state.access[session] = access;
        return equal;
      });
    },
    async reserve({sessionId, runId, scenarioId, inputAllowance, outputLimit}) {
      const session = sha(sessionId), run = sha(runId), day = new Date(now()).toISOString().slice(0, 10);
      if (!Number.isSafeInteger(inputAllowance) || inputAllowance < 1 || inputAllowance > 20000 || !Number.isSafeInteger(outputLimit) || outputLimit < 1 || outputLimit > plan.maxOutputTokens) throw new Error('Judge allowance invalid');
      const reservation = nano((inputAllowance * plan.inputUsdPerMillion + outputLimit * plan.outputUsdPerMillion) / 1e6), id = randomUUID();
      return transact(state => {
        if (!state.access[session]?.approved) throw denied('Judge access required');
        if (Date.parse(plan.expiresAt) <= now() || (!migration && state.halted)) throw denied('Judge expired or halted');
        if (migration && state.calls.some(call => call.source === plan.sourceCommit && !call.validated)) throw denied('Successor campaign has unresolved provider usage');
        if (!plan.scenarioIds.includes(scenarioId)) throw denied('Judge scenario scope denied');
        if (state.calls.some(call => call.run === run)) throw denied('Judge run already consumed');
        const calls = state.calls, sessionCalls = calls.filter(call => call.session === session), dailyCalls = calls.filter(call => call.day === day);
        const committed = calls.reduce((n, call) => n + (call.cost ?? call.reservation), 0);
        if (calls.length >= plan.maxRequests || sessionCalls.length >= plan.sessionRequests || dailyCalls.length >= plan.dailyRequests || committed + reservation > nano(plan.spendLimitUsd)) throw denied('Judge quota exhausted');
        calls.push({id, session, run, day, reservation, inputLimit: inputAllowance, outputLimit, cost: null, source: plan.sourceCommit, planHash, validated: false});
        return id;
      });
    },
    async settle(id, usage) {
      return transact(state => {
        const call = state.calls.find(item => item.id === id);
        if (!call) throw new Error('Judge call missing from PostgreSQL budget');
        if (call.cost !== null) throw denied('Judge call already settled');
        if (!Number.isSafeInteger(usage?.inputTokens) || !Number.isSafeInteger(usage?.outputTokens) || usage.inputTokens <= 0 || usage.outputTokens <= 0 || usage.inputTokens > call.inputLimit || usage.outputTokens > call.outputLimit) throw denied('Judge usage invalid');
        const cost = nano((usage.inputTokens * plan.inputUsdPerMillion + usage.outputTokens * plan.outputUsdPerMillion) / 1e6);
        if (cost > call.reservation) throw denied('Judge usage exceeds reservation');
        call.cost = cost;
      });
    },
    async finalize(id) {
      return transact(state => {
        const call = state.calls.find(item => item.id === id);
        if (!call) throw new Error('Judge call missing from PostgreSQL budget');
        if (call.cost === null || call.validated) throw denied('Judge call not ready for validated finalization');
        call.validated = true;
      });
    },
    async halt() {
      return transact(async (state, client) => {
        state.halted = true;
        if (migration) {
          const halted = await client.query(`UPDATE receiptlab_judge_budget_migrations SET status='halted',halted_at=now()
            WHERE namespace=$1 AND migration_id=$2 AND status='active' RETURNING migration_id`, [namespace,migration.migration_id]);
          if (halted.rowCount) await client.query(`INSERT INTO receiptlab_judge_budget_migration_events(namespace,migration_id,event_type,event_json)
            VALUES($1,$2,'halted',$3::jsonb)`, [namespace,migration.migration_id,JSON.stringify({version:1,reason:'successor-provider-outcome-unresolved'})]);
        }
      });
    },
    async close() { if (closed) return; closed = true; },
  };
  return budget;
}
