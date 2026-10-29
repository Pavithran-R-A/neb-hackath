import { createHash, createHmac, timingSafeEqual } from 'node:crypto';

export function canonical(payload) {
  return JSON.stringify({ flow: payload.flow, name: payload.name?.trim(), email: payload.email?.trim().toLowerCase(), phone: payload.phone?.replace(/\D/g, ''), detail: payload.detail?.trim(), consent: payload.consent === true });
}
export const digest = payload => createHash('sha256').update(canonical(payload)).digest('hex');
export const signReceipt = (receipt, key) => createHmac('sha256', key).update(JSON.stringify([receipt.runId, receipt.flow, receipt.digest, receipt.sequence])).digest('hex');

// Evaluator-only: called by the harness, never exposed to the browser or the policy.
export function verifyCompletion(record, expected, key, {runId}={}) {
  const fail = reason => ({ completed: false, reason });
  if (typeof runId !== 'string' || !runId || record?.id !== runId) return fail('Intended run identity mismatch or missing');
  if (!record || record.status !== 'completed' || record.completionCount !== 1 || !record.receipt) return fail('No unique committed server submission');
  const r = record.receipt;
  if (r.runId !== record.id || r.flow !== expected.flow || r.sequence !== 1 || r.digest !== digest(expected) || r.digest !== digest(record.payload)) return fail('Receipt/task/state mismatch');
  const signature = Buffer.from(signReceipt(r, key));
  const actual = Buffer.from(typeof r.signature === 'string' ? r.signature : '');
  if (signature.length !== actual.length || !timingSafeEqual(signature, actual)) return fail('Invalid receipt signature');
  return { completed: true, reason: 'Server submission and signed task receipt verified', receiptId: `${r.runId}:${r.sequence}`, digest: r.digest };
}
