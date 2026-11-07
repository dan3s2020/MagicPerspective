// Tests are on the original V19/V22 cognitive world and actual V17 Discoverer.shape.
// Bounded structured synthetic contrast exercises, NOT a natural-language semantic solver.
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,existsSync,rmSync} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {LearnedCognitiveMap} from '../transcend/torus-aether/worlds/learned-cognitive-map.mjs';
import {Discoverer} from '../transcend/torus-aether/worlds/exercise.mjs';
import {AtlasJournal,readAtlasPage,atlasPath} from '../transcend/torus-aether/devour/atlas-journal.mjs';

const goal={slots:{2:'coffee'}};
function model(){const m=new LearnedCognitiveMap();m.observeWorld('Mira buys tea. Mira buys coffee.',{id:'world-1'});return m;}
const explain=(m,input,opts={})=>m.formSolution(input,goal,{maxDepth:8,maxNodes:256,seed:74129,transfer:true,...opts});

test('segmented text: one previous world is NOT enough; new independent context unlocks a portable route in the same original actor',()=>{
 const m=model(),start='Ada keeps tea.',old=JSON.stringify(m.export());
 const first=explain(m,start);
 assert.equal(first.found,false,'No verified cross-context transfer should be available yet');
 assert.ok(first.world.diagnostics.excludedByDesign.includes('INSUFFICIENT_INDEPENDENT_CONTEXT_EVIDENCE_FOR_TRANSFER'));
 assert.equal(JSON.stringify(m.export()),old,'Frozen failure must not change learned evidence');
 m.observeWorld('Ivo likes tea. Ivo likes coffee.',{id:'world-2'});
 const after=explain(m,start);
 assert.equal(after.found,true);
 assert.equal(after.directOriginalMethod,'Discoverer.shape');
 assert.equal(after.plannedBeforeAction,true);
 assert.equal(after.path.length,1);
 assert.equal(after.usedCrossWorld,true);
 assert.equal(after.world.states[after.path[0].to].join(' '),'Ada keeps coffee .');
 assert.ok(after.world.neighbors[0].some(e=>e.crossWorld&&e.hypothesis===true&&!e.verified));
 assert.equal(m.examples.has('Ada\u001fkeeps\u001fcoffee\u001f.'),false,'Held-out text must not be in training');
 let steps=0;
 const actual=m.execute(after,{step:(before,action,predicted)=>{
   steps++;const correct=before.join(' ')==='Ada keeps tea .'&&
     action.startsWith('__XWORLD__:')&&predicted.join(' ')==='Ada keeps coffee .';
   return {accepted:correct,after:correct?predicted:before};
 }});
 assert.equal(steps,1);assert.equal(actual.solved,true);
 const report={scope:'structured explicit-goal word-edit physics',initialPlan:false,afterSecondSource:true,
   beforeSources:1,afterSources:2,actionPhysicallyVerified:true,method:after.directOriginalMethod,
   learnedNaturalLanguageSemantics:false};
 console.log('V30_SEGMENT_TRANSFER_RECOVERY',JSON.stringify(report));
});

test('frozen 100 novel complete contexts become navigable only after a second independent observed rule context',()=>{
 const m=model(),inputs=Array.from({length:100},(_,i)=>'Agent_'+i+' keeps tea.');
 const before=inputs.map(s=>explain(m,s));
 assert.equal(before.filter(p=>p.found).length,0);
 m.observeWorld('Ivo likes tea. Ivo likes coffee.',{id:'world-2'});
 const frozen=JSON.stringify(m.export());
 const after=inputs.map(s=>explain(m,s));
 const achieved=after.filter(p=>p.found&&p.usedCrossWorld&&p.path.length===1&&
  p.world.states[p.path[0].to][2]==='coffee').length;
 assert.equal(achieved,100);
 assert.equal(JSON.stringify(m.export()),frozen,'Heldout planning may not learn target strings');
 console.log('V30_100_FROZEN_STRUCTURED',JSON.stringify({before:0,after:achieved,denominator:100,
   goalGivenAsSlot:true,exactNativeMethod:'Discoverer.shape',
   naturalQuestionFirstAnswerAccuracy:null}));
});

test('every failure class has its own evidence: absent operator, depth budget, and actual rejected action',()=>{
 const m=model();
 const missing=explain(m,'Ada keeps tea.');
 assert.equal(missing.found,false);
 assert.ok(missing.world.diagnostics.excludedByDesign.includes('INSUFFICIENT_INDEPENDENT_CONTEXT_EVIDENCE_FOR_TRANSFER'));
 m.observeWorld('Ivo likes tea. Ivo likes coffee.',{id:'world-2'});
 const absent=m.formSolution('Ada keeps tea.',{slots:{2:'cocoa'}},{maxDepth:8,maxNodes:128});
 assert.equal(absent.found,false);
 assert.ok(absent.world.diagnostics.goalTokensNeverGenerated.includes('cocoa'));
 assert.ok(absent.world.diagnostics.excludedByDesign.includes('MISSING_GOAL_TRANSFORMATION_OR_CONTEXT'));
 const two=m.formSolution('Ada keeps tea tea.',{slots:{2:'coffee',3:'coffee'}},{maxDepth:1,maxNodes:256});
 assert.equal(two.found,false);
 assert.ok(two.world.diagnostics.excludedByDesign.includes('MAX_DEPTH_EXCEEDED'));
 const enough=m.formSolution('Ada keeps tea tea.',{slots:{2:'coffee',3:'coffee'}},{maxDepth:4,maxNodes:256});
 assert.equal(enough.found,true,'Removing the DESIGN depth wall must recover a valid path');
 assert.equal(enough.path.length,2);
 // A rejected action is a real wall at the specific state, not a global blacklist.
 const plan=explain(m,'Ada keeps tea.');
 assert.equal(plan.found,true);
 const real=m.execute(plan,{step:before=>({after:before,accepted:false})});
 assert.equal(real.solved,false);
 const afterRejected=explain(m,'Ada keeps tea.');
 assert.equal(afterRejected.found,false);
 const otherContext=explain(m,'Bela keeps tea.');
 assert.equal(otherContext.found,true,'Rejection is context-specific; keep other corridors open');
 console.log('V30_FAILURE_TAXONOMY',JSON.stringify({missingOperator:true,depthWall:true,actualRejectedWall:true,
  alternativeContextPreserved:true,originalMethod:otherContext.directOriginalMethod}));
});

test('transformation memory persists when examples are compacted and through native checkpoint export / restore',()=>{
 const m=new LearnedCognitiveMap({maxExamples:32,maxRules:30000,maxNodes:384,maxDepth:12});
 m.observeWorld('Mira buys tea. Mira buys coffee.',{id:'world-1'});
 m.observeWorld('Ivo likes tea. Ivo likes coffee.',{id:'world-2'});
 for(let i=0;i<180;i++)m.observeWorld('Filler_'+i+' walks outside.',{id:'other-'+i});
 assert.ok(m.compactedExamples>0);
 const before=explain(m,'Ada keeps tea.');
 assert.equal(before.found,true);
 const restored=LearnedCognitiveMap.restore(m.export());
 const after=explain(restored,'Ada keeps tea.');
 assert.equal(after.found,true);
 assert.deepEqual(after.path.map(x=>x.action),before.path.map(x=>x.action));
 assert.equal(after.directOriginalMethod,'Discoverer.shape');
 console.log('V30_MEMORY_PERSISTENCE',JSON.stringify({documents:m.documents,compactedExamples:m.compactedExamples,
  activeExamples:m.examples.size,portablePathsPreserved:true}));
});

test('persist every SUCCESS/FAILURE and large Unicode graph event; read all 64 KB-crossing pages without loss',()=>{
 const dir=mkdtempSync(path.join(os.tmpdir(),'mp-v30-atlas-'));
 try {
  const p=atlasPath(path.join(dir,'brain-0-stable.v8')),journal=new AtlasJournal(p);
  const m=model(),failed=explain(m,'Ada keeps tea.');
  m.observeWorld('Ivo likes tea. Ivo likes coffee.',{id:'world-2'});
  const solved=explain(m,'Ada keeps tea.');
  const evs=[
   {type:'planning-attempt',found:false,reason:failed.reason,fullAtlas:{states:failed.world.states,neighbors:failed.world.neighbors,targets:failed.world.targets},
    diagnostics:failed.world.diagnostics,fullPredictedPath:[]},
   {type:'rule-evidence',world:'text',observation:'Știința învățării',big:'λ'.repeat(80000)},
   {type:'planning-attempt',found:true,originalMethod:solved.directOriginalMethod,
    fullAtlas:{states:solved.world.states,neighbors:solved.world.neighbors,targets:solved.world.targets},
    diagnostics:solved.world.diagnostics,fullPredictedPath:solved.path},
   {type:'observed-action',world:'text',action:solved.path[0].action,accepted:true,before:['Ada','keeps','tea','.'],after:['Ada','keeps','coffee','.']}
  ];
  evs.forEach(x=>journal.record(x));journal.sync();
  assert.ok(existsSync(p));const bytes=journal.status().totalBytes;assert.ok(bytes>160000);
  let cursor=0,all=[];
  for(let k=0;k<8;k++){
   const page=readAtlasPage(p,{cursor,limit:1});
   assert.ok(page.nextCursor>cursor);
   all.push(...page.rows);cursor=page.nextCursor;
   if(page.end)break;
  }
  assert.equal(all.length,evs.length);
  assert.deepEqual(all.map(x=>x.type),evs.map(x=>x.type));
  assert.equal(all[1].observation,'Știința învățării');
  assert.equal(all[1].big.length,80000);
  assert.equal(all[2].fullPredictedPath.length,1);
  const onlyAttempts=readAtlasPage(p,{cursor:0,limit:50,kind:'planning-attempt'});
  assert.equal(onlyAttempts.rows.length,2);
  assert.deepEqual(onlyAttempts.rows.map(x=>x.found),[false,true]);
  assert.equal(onlyAttempts.end,true);
  journal.close();
  console.log('V30_ATLAS_PERSISTENCE',JSON.stringify({events:all.length,bytes,unicodePreserved:true,
    failedAndSucceededRecorded:true,paginatedWithoutLoss:true}));
 }finally{rmSync(dir,{recursive:true,force:true});}
});

test('original Discoverer is importable; its 2D baseline is not replaced',()=>{
 assert.equal(typeof Discoverer.prototype.shape,'function');
 assert.equal(typeof Discoverer.prototype.choose,'function');
});
