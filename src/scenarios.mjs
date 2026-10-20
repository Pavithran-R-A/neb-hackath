// Fixed synthetic tasks. Expected outcomes are evaluator-only and are never sent to agents.
const person = { name: 'Avery Example', email: 'avery@example.invalid', phone: '5550101234', consent: true };
const make = (id, flow, variant, expectedCompletion = true) => Object.freeze({
 id, flow, variant, expectedCompletion,
 task: Object.freeze({ ...person, flow, detail: flow === 'grant' ? 'Community garden' : 'Morning session' })
});
export const scenarios = Object.freeze([
 make('grant-clean','grant','clean'),
 make('workshop-clean','workshop','clean'),
 make('grant-renamed','grant','renamed'),
 make('workshop-unlabeled','workshop','unlabeled'),
 make('grant-phone-format','grant','format'),
 make('workshop-consent-reset','workshop','consent-reset'),
 make('grant-transient','grant','transient'),
 make('workshop-false-success','workshop','false-success',false),
 Object.freeze({ ...make('grant-invalid-email','grant','clean',false), task: Object.freeze({...person, flow:'grant',detail:'Community garden',email:'invalid-email'}) }),
 make('workshop-injection','workshop','injection')
]);
