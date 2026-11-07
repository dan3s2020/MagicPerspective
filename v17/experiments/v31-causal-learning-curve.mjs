// Controlled, frozen and reproducible LEARNING CURVE for the native cognitive
// map + original Discoverer.shape path + V31 path-only output readout.
// This is NOT OpenThoughts3, not unrestricted language comprehension.
// The explicit instruction gives the target word, NEVER the complete answer.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {LearnedCognitiveMap,tokenizeWorld} from '../transcend/torus-aether/worlds/learned-cognitive-map.mjs';
import {answerFromOriginalPath,firstTryCharacterComparison}
  from '../transcend/torus-aether/worlds/path-answer-writer.mjs';

const ops=[
 ['tea','coffee'],['coffee','water'],['red','blue'],['small','large'],
 ['north','south'],['rain','snow'],['cat','dog'],['silver','gold'],
 ['old','new'],['quiet','loud'],['slow','fast'],['seed','flower']
];
const trials=[31,47,73],casesPerOp=10;
const checkpointStages=[0,6,12,18,24,36];
const trainWorld=(i,context)=>{
 const [a,b]=ops[i],names=['Mira','Ivo','Zara'];
 const verbs=['buys','likes','finds'];
 const base=names[context]+'_'+i+' '+verbs[context]+' ';
 return base+a+'. '+base+b+'.';
};
const trainingSchedule=[
 ...ops.map((_,i)=>({operator:i,context:0})),
 ...ops.map((_,i)=>({operator:i,context:1})),
 ...ops.map((_,i)=>({operator:i,context:2}))
];
const prompt=(from,to,initial)=>'Replace "'+from+'" with "'+to+'" in:\n'+initial;

function heldouts(seed){
 const rows=[];
 for(let op=0;op<ops.length;op++)for(let i=0;i<casesPerOp;i++){
   const [from,to]=ops[op],name='Case_'+seed+'_'+op+'_'+i;
   const source=name+' keeps '+from+'.',expected=name+' keeps '+to+'.';
   rows.push({id:seed+'-'+op+'-'+i,op,source,prompt:prompt(from,to,source),expected});
 }
 return rows;
}
function requireNoLeakage(model,samples){
 for(const s of samples){
   const k1=tokenizeWorld(s.source).join('\u001f');
   const k2=tokenizeWorld(s.expected).join('\u001f');
   assert.equal(model.examples.has(k1),false,'Input never in training '+s.id);
   assert.equal(model.examples.has(k2),false,'Expected answer never in training '+s.id);
 }
}
function evaluate(model,samples,stage,seed){
 requireNoLeakage(model,samples);
 const snapshot=JSON.stringify(model.export());
 let correct=0,found=0,firstCharacterRight=0,allCorrectCharacters=0,allComparedCharacters=0;
 const cases=[];
 for(const sample of samples){
   const out=answerFromOriginalPath(model,sample.prompt,{maxDepth:6,maxNodes:384,seed:74129});
   const score=firstTryCharacterComparison(out.answer,sample.expected);
   if(out.found)found++;
   if(score.answerExact)correct++;
   if(out.answer!==null&&Array.from(out.answer)[0]===Array.from(sample.expected)[0])
     firstCharacterRight++;
   allCorrectCharacters+=score.correctCharacters;
   allComparedCharacters+=score.comparedCharacters;
   cases.push({
     id:sample.id,operator:sample.op,stage,seed,
     found:out.found,exact:score.answerExact,firstMismatch:score.firstMismatch,
     correctCharacters:score.correctCharacters,comparedCharacters:score.comparedCharacters,
     goalFromInstruction:out.goalPredicate||null,
     answer:out.answer,expected:sample.expected,
     reason:out.reason,source:out.source,
     path:out.path?.map(x=>({action:x.action,from:x.from,to:x.to,support:x.support,
       crossWorld:!!x.crossWorld,verified:!!x.verified}))||[],
     diagnostics:out.diagnostics?{
       missingGoalTokens:out.diagnostics.goalTokensNeverGenerated||[],
       excludedByDesign:out.diagnostics.excludedByDesign||[],
       portableClasses:out.diagnostics.portableClasses,
       maxNodes:out.diagnostics.maxNodes,
       maxDepth:out.diagnostics.maxDepth,
     }:null,
     characterErrors:score.errors
   });
 }
 assert.equal(JSON.stringify(model.export()),snapshot,
   'Frozen evaluation may not update learning/memory');
 return {stage,seed,trainingWorlds:stage,total:samples.length,
   found,correct,exactRate:correct/samples.length,firstCharacterRight,
   charRate:allComparedCharacters?allCorrectCharacters/allComparedCharacters:0,
   activeRules:model.rules.size,learningDocuments:model.documents,
   portableRulesActive:cases.filter(c=>c.found&&c.path.some(p=>p.crossWorld)).length,
   cases};
}

export function runLearningCurve(){
 const all=[],negative=[];
 for(const seed of trials){
   const m=new LearnedCognitiveMap({maxExamples:256,maxRules:30000,maxDepth:8,maxNodes:384});
   const samples=heldouts(seed);let next=0;
   for(const stage of checkpointStages){
     while(next<stage){
       const {operator,context}=trainingSchedule[next];
       const txt=trainWorld(operator,context);
       assert.ok(m.observeWorld(txt,{id:'world-'+seed+'-'+next}));
       next++;
     }
     const out=evaluate(m,samples,stage,seed);
     all.push(out);
     console.log('V31_LEARNING_CURVE',JSON.stringify({stage,seed,
       worlds:out.learningDocuments,exact:out.correct,total:out.total,
       exactRate:out.exactRate,chars:out.charRate,
       portable:out.portableRulesActive,originalPath:true}));
   }
   // Negative heldout distribution: these transformations are NEVER in training.
   const unknown=Array.from({length:20},(_,j)=>{
     const from='untrained_'+seed+'_'+j,to='unknown_'+seed+'_'+j;
     const subject='OOD_'+seed+'_'+j;
     return {id:'OOD-'+seed+'-'+j,op:-1,source:subject+' keeps '+from+'.',
       expected:subject+' keeps '+to+'.',
       prompt:prompt(from,to,subject+' keeps '+from+'.')};
   });
   const n=evaluate(m,unknown,36,seed);
   negative.push({seed,correct:n.correct,total:n.total,
     reasons:[...new Set(n.cases.map(x=>x.reason))]});
   assert.equal(n.correct,0,'Novel operators MUST be honestly unsolved (no hidden answer oracle)');
   // Target in the instruction does not by itself allow any answer. The same
   // case MUST fail when its causally necessary learned operator is removed.
   const check=samples.find(x=>x.op===0);
   const pre=answerFromOriginalPath(m,check.prompt);
   assert.equal(pre.answer,check.expected);
   const restored=LearnedCognitiveMap.restore(m.export());
   const removed=[...m.rules].filter(([,r])=>r.from===ops[0][0]&&r.to===ops[0][1]);
   assert.ok(removed.length>0);
   for(const [id] of removed)m.rules.delete(id);
   const ablated=answerFromOriginalPath(m,check.prompt);
   assert.equal(ablated.found,false,'Ablating the learned operator must break the FIRST-TRY answer');
   assert.equal(ablated.answer,null);
   const repaired=answerFromOriginalPath(restored,check.prompt);
   assert.equal(repaired.answer,check.expected);
   // Two-hop composition with no direct training pair tea -> water.
   const two=prompt('tea','water','Traveler_'+seed+' keeps tea.');
   const multi=answerFromOriginalPath(restored,two,{maxDepth:8,maxNodes:384});
   assert.equal(multi.found,true,'Two learned transformations should compose');
   assert.equal(multi.path.length,2);
   assert.equal(multi.answer,'Traveler_'+seed+' keeps water.');
   console.log('V31_CAUSAL_ABLATION',JSON.stringify({seed,removed:removed.length,
     firstTryBefore:true,afterAblation:false,restored:true,
     composedTwoHop:true,stepCount:multi.path.length}));
 }
 const summary=checkpointStages.map(stage=>{
   const r=all.filter(x=>x.stage===stage),
      correct=r.reduce((v,x)=>v+x.correct,0),
      total=r.reduce((v,x)=>v+x.total,0);
   return {trainingWorlds:stage,correct,total,firstTryExact:correct/total,
     charRate:r.reduce((v,x)=>v+x.charRate,0)/r.length,
     originalPathDriven:true,goalSpecifiedInPrompt:true};
 });
 const expected=[0,0,0,.5,1,1];
 summary.forEach((r,i)=>assert.equal(r.firstTryExact,expected[i],
   'Document the curve, do not smooth or invent measurements'));
 assert.ok(summary.at(-1).firstTryExact===1);
 const report={title:'Native V19/V23 cognitive + original V17 Discoverer.shape output',
   measured:summary,negative,
   seeds:trials,testsPerStage:trials.length*ops.length*casesPerOp,
   heldoutContentNeverObserved:true,
   aim:'EXACT first try response after more training (CLOSED finite operator grammar)',
   caveat:'No proof that unrestricted language/OpenThoughts reaches 100%',
   firstTryBeforeAction:true,
   producedByActualDiscoveredPath:true,
   answerShownToTraining:false,answerTargetTokenInPrompt:true,
   checkpointHistory:all,expectedStageRates:expected};
 const dest=process.env.MP_V31_CURVE_JSON;
 if(dest){
   fs.mkdirSync(path.dirname(dest),{recursive:true});
   fs.writeFileSync(dest,JSON.stringify(report,null,2));
   fs.writeFileSync(dest.replace(/\.json$/i,'')+'.jsonl',
     all.flatMap(a=>a.cases).map(x=>JSON.stringify(x)).join('\n')+'\n');
   console.log('V31_REPORT_FILES',dest);
 }
 console.log('V31_FINAL_VERIFIED_CURVE',JSON.stringify(summary));
 console.log('V31_OOD_NEGATIVE',JSON.stringify(negative));
 return report;
}
if(import.meta.url===new URL('file://'+process.argv[1]).href)runLearningCurve();
