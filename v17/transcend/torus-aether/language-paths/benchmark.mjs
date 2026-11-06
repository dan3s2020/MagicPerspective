// From v17/: node transcend/torus-aether/language-paths/benchmark.mjs
// Induced rules and unseen-word combinations; this is a constrained text micro-world.
import {induceTransformation,discoverPath} from './engine.mjs';
const train=[['mage','stone'],['thief','gate'],['sage','door'],['ranger','crate'],['pilot','chest']];
const heldActors=['farmer','captain','archer','queen','merchant'];
const heldObjects=['cart','shield','barrel','chestnut','boulder'];
const before=(who,what)=>who+' pushes '+what;
const passive=(who,what)=>what+' is pushed by '+who;
const effect=(who,what)=>'if '+who+' pushes then '+what+' moves;
const rule1=induceTransformation(train.map(([who,what])=>({before:before(who,what),after:passive(who,what)})));
const rule2=induceTransformation(train.map(([who,what])=>({before:passive(who,what),after:effect(who,what)})));
const rules=[rule1,rule2];
const cases=[];
for(const who of heldActors) for(const what of heldObjects) {
  const result=discoverPath(before(who,what),rules,s=>s.startsWith('if ')&&s.includes(' then '),{maxDepth:3});
  cases.push({input:before(who,what),expected:effect(who,what),predicted:result.states.at(-1),correct:result.solved&&result.states.at(-1)===effect(who,what),steps:result.rules.length});
}
const negative=discoverPath('farmer lifts cart',rules,s=>s.startsWith('if '),{maxDepth:3});
const summary={method:'paired-example anti-unification + generic state-graph search',
  demonstrationsPerRule:train.length,heldOut:cases.length,correct:cases.filter(x=>x.correct).length,
  rejectedUnseenVerb:!negative.solved,rule1,rule2,
  samplePaths:cases.slice(0,3),
  limitations:'Grouped paired demonstrations, word segmentation, and generic search are supplied. This is not autonomous general-language understanding or discovered mathematics.'};
console.log(JSON.stringify(summary,null,2));
if(summary.correct!==summary.heldOut||!summary.rejectedUnseenVerb)process.exitCode=1;
