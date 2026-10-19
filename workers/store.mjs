export const stmt=(db,sql,...values)=>db.prepare(sql).bind(...values);
export async function reserve(db,{id,campaignId,reservationNano,sourceDigest,sessionId='operator'}){
 if(!Number.isSafeInteger(reservationNano)||reservationNano<=0||reservationNano>500000000)throw new Error('Invalid reservation');
 const day='inference:day:'+Math.floor(Date.now()/86400000),session='inference:session:'+sessionId;
 const results=await db.batch([
 stmt(db,`UPDATE accounts SET active=?,committed_nano=committed_nano+? WHERE id='nebius' AND active IS NULL AND committed_nano+?<=limit_nano AND imported_digest<>'' AND EXISTS(SELECT 1 FROM campaigns c WHERE c.id=? AND c.approved=1 AND c.source_digest=? AND c.expires>? AND (SELECT COUNT(*) FROM ledger WHERE campaign_id=c.id AND kind='reserved')<c.max_posts AND COALESCE((SELECT SUM(nano) FROM ledger WHERE campaign_id=c.id AND kind='reserved'),0)+?<=c.max_nano) AND NOT EXISTS(SELECT 1 FROM ledger WHERE reservation_id=?) AND COALESCE((SELECT count FROM quotas WHERE id='inference:total'),0)<100 AND COALESCE((SELECT count FROM quotas WHERE id=?),0)<20 AND COALESCE((SELECT count FROM quotas WHERE id=?),0)<2 AND COALESCE((SELECT SUM(nano) FROM ledger WHERE kind='reserved' AND id NOT LIKE 'historical:%'),0)+?<=500000000`,id,reservationNano,reservationNano,campaignId,sourceDigest,Date.now(),reservationNano,id,day,session,reservationNano),
 stmt(db,`INSERT INTO ledger SELECT ?,?,?, 'reserved',?,? WHERE EXISTS(SELECT 1 FROM accounts WHERE active=?)`,id+':reserved',campaignId,id,reservationNano,Date.now(),id),
 ...['inference:total',day,session].map(quota=>stmt(db,`INSERT INTO quotas(id,count) SELECT ?,1 WHERE EXISTS(SELECT 1 FROM accounts WHERE active=?) ON CONFLICT(id) DO UPDATE SET count=count+1`,quota,id))
 ]);
 if(results[0].meta.changes!==1)throw new Error('Account unavailable, history missing or budget exhausted');
 return {id,campaignId,reservationNano};
}
export async function settle(db,reservation,costNano){
 if(!Number.isSafeInteger(costNano)||costNano<0||costNano>reservation.reservationNano)throw new Error('Invalid settlement');
 const {id,campaignId,reservationNano}=reservation;
 const results=await db.batch([
 stmt(db,`INSERT INTO ledger SELECT ?,?,?,'settled',?,? WHERE EXISTS(SELECT 1 FROM accounts WHERE active=?)`,id+':settled',campaignId,id,costNano,Date.now(),id),
 stmt(db,`UPDATE accounts SET committed_nano=committed_nano-?,active=NULL WHERE active=? AND EXISTS(SELECT 1 FROM ledger WHERE id=?)`,reservationNano-costNano,id,id+':settled')]);
 if(results[1].meta.changes!==1)throw new Error('Settlement unavailable');
}
