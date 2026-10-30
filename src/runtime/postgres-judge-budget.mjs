import {createHash, randomUUID, timingSafeEqual} from 'node:crypto';
import {JUDGE_ACCESS_END_MS} from './judge-window.mjs';

const sha = value => createHash('sha256').update(value).digest('hex');
const nano = value => Math.round(value * 1e9);
const fromJson = value => typeof value === 'string' ? JSON.parse(value) : value;
const denied = message => Object.assign(new Error(message), {expected: true});

function validatePlan(plan, accessCode, now) {
  if (!plan || !/^[\w-]{1,80}$/.test(plan.id ?? '') || !/^nvidia\/.*nemotron/i.test(plan.model ?? '') ||
      !/^[a-f0-9]{40}$/.test(plan.sourceCommit ?? '') || !/^[a-f0-9]{64}$/.test(plan.suiteSha256 ?? '') ||
      !/^[a-f0-9]{64}$/.test(plan.accountHistoryBaseSha256 ?? '') ||
      typeof accessCode !== 'string' || accessCode.length < 24 || !Number.isInteger(plan.maxRequests) || plan.maxRequests < 1 || plan.maxRequests > 100 ||
      !Number.isInteger(plan.dailyRequests) || plan.dailyRequests < 1 || plan.dailyRequests > 20 ||
      !Number.isInteger(plan.sessionRequests) || plan.sessionRequests < 1 || plan.sessionRequests > 2 || plan.maxOutputTokens !== 8192 ||
      !Number.isFinite(plan.spendLimitUsd) || plan.spendLimitUsd <= 0 || plan.spendLimitUsd > .5 ||
      ![plan.inputUsdPerMillion, plan.outputUsdPerMillion].every(n => Number.isFinite(n) && n > 0) ||
      JSON.stringify(plan.scenarioIds) !== JSON.stringify(['grant-transient', 'workshop-false-success']) ||
      !Number.isFinite(Date.parse(plan.expiresAt)) || Date.parse(plan.expiresAt) <= now() || Date.parse(plan.expiresAt) > JUDGE_ACCESS_END_MS) {
    throw new Error('Invalid bounded judge configuration');
  }
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
  const history = parseHistory(accountHistory, plan);
  const planHash = sha(JSON.stringify(plan) + sha(accessCode));
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
      if (row.rows[0].plan_hash !== planHash || row.rows[0].history_hash !== history.hash) throw new Error('Judge plan or canonical account history changed; explicit migration required');
      const state = fromJson(row.rows[0].snapshot);
      const result = await mutate(state);
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
    const inserted = await initClient.query(`INSERT INTO receiptlab_judge_budget(namespace,plan_hash,history_hash,snapshot)
      VALUES($1,$2,$3,$4::jsonb) ON CONFLICT(namespace) DO NOTHING RETURNING namespace`,
    [namespace, planHash, history.hash, JSON.stringify({halted: false, access: {}, calls: [], baseHistoryHash: history.reservationHash})]);
    if (!inserted.rowCount) {
      const saved = await initClient.query('SELECT plan_hash,history_hash,snapshot FROM receiptlab_judge_budget WHERE namespace=$1 FOR UPDATE', [namespace]);
      if (!saved.rowCount || saved.rows[0].plan_hash !== planHash || saved.rows[0].history_hash !== history.hash) throw new Error('Judge plan or canonical account history changed; explicit migration required');
      const snapshot = fromJson(saved.rows[0].snapshot);
      if (!snapshot || !Array.isArray(snapshot.calls) || !snapshot.access || snapshot.baseHistoryHash !== history.reservationHash) throw new Error('PostgreSQL judge budget snapshot invalid');
      if (snapshot.calls.some(call => !call.validated)) snapshot.halted = true;
      await initClient.query('UPDATE receiptlab_judge_budget SET snapshot=$1::jsonb,updated_at=now() WHERE namespace=$2', [JSON.stringify(snapshot), namespace]);
    }
    await initClient.query('COMMIT');
  } catch (error) {
    try { await initClient.query('ROLLBACK'); } catch {}
    throw error;
  } finally { initClient.release(); }

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
    return {requests: calls.length, knownCostUsd: known / 1e9, committedUsd: committed / 1e9,
      unknownRequests: calls.filter(call => call.cost === null).length, pendingRequests: calls.filter(call => !call.validated).length,
      maxRequests: plan.maxRequests, envelopeUsd: plan.spendLimitUsd, expiresAt: plan.expiresAt, halted: Boolean(state.halted)};
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
        if (Date.parse(plan.expiresAt) <= now() || state.halted) throw denied('Judge expired or halted');
        if (!plan.scenarioIds.includes(scenarioId)) throw denied('Judge scenario scope denied');
        if (state.calls.some(call => call.run === run)) throw denied('Judge run already consumed');
        const calls = state.calls, sessionCalls = calls.filter(call => call.session === session), dailyCalls = calls.filter(call => call.day === day);
        const committed = calls.reduce((n, call) => n + (call.cost ?? call.reservation), 0);
        if (calls.length >= plan.maxRequests || sessionCalls.length >= plan.sessionRequests || dailyCalls.length >= plan.dailyRequests || committed + reservation > nano(plan.spendLimitUsd)) throw denied('Judge quota exhausted');
        calls.push({id, session, run, day, reservation, inputLimit: inputAllowance, outputLimit, cost: null, source: plan.sourceCommit, validated: false});
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
    async halt() { return transact(state => { state.halted = true; }); },
    async close() { if (closed) return; closed = true; },
  };
  return budget;
}
