// Enabled only by the local benchmark binding, absent from candidate configuration.
export function measuredDatabase(db,metrics){
 const record=result=>{if(result.meta)metrics.push(result.meta);return result};
 function statement(s){return {bind(...args){return statement(s.bind(...args))},async first(column){const result=record(await s.all());return column?result.results[0]?.[column]??null:result.results[0]??null},async all(){return record(await s.all())},async run(){return record(await s.run())},raw:s};}
 return {prepare(sql){return statement(db.prepare(sql))},async batch(statements){return (await db.batch(statements.map(s=>s.raw))).map(record)}};
}
