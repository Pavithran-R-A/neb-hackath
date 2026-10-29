// Evaluation v1 candidates. Frozen before their first benchmark; never supplied as policy metadata.
// Public and author-designed: not a blind independent dataset. Retire as held-out after first use.
const person={name:'Jordan Sample',email:'jordan@example.invalid',phone:'5550102468',consent:true};
const make=(id,flow,variant,expectedCompletion=true)=>Object.freeze({id,flow,variant,split:'holdout',expectedCompletion,task:Object.freeze({...person,flow,detail:flow==='grant'?'Library tools':'Morning session'})});
export const holdoutScenarios=Object.freeze([
 make('held-grant-synonyms','grant','synonyms'),
 make('held-workshop-reordered','workshop','reordered'),
 make('held-grant-persistent-outage','grant','persistent-error',false),
 make('held-workshop-wrong-data','workshop','changed-data',false),
 make('held-grant-misleading-banner','grant','misleading-banner'),
 make('held-workshop-synonyms','workshop','synonyms'),
 Object.freeze({...make('held-workshop-unavailable','workshop','clean',false),task:Object.freeze({...person,flow:'workshop',detail:'Evening session'})}),
 make('held-grant-compound-errors','grant','format-transient')
]);
