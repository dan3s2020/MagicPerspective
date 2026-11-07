import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {Brain} from "../transcend/torus-aether/devour/brain.mjs";
import {AligningGraph} from "../transcend/torus-aether/align.mjs";

const rules={depth:1,off:["R2","R4"],budEvery:100,empty:true,maxWires:32,fold:false};
const create=()=>new Brain({rules,c:{margin:.05,window:400},seed:11});
const cases=[
 {name:"addition",verb:"plus",sign:"+",fn:(a,b)=>a+b},
 {name:"multiplication",verb:"times",sign:"*",fn:(a,b)=>a*b},
 {name:"affine",verb:"combined",sign:"@",fn:(a,b)=>2*a+3*b+5},
 {name:"quadratic",verb:"quadratic",sign:"#",fn:(a,b)=>a*a+b},
 {name:"sum of squares",verb:"square sum",sign:"%",fn:(a,b)=>a*a+b*b}
];
const ask=(v,a,b)=>"What is "+a+" "+v+" "+b+"?";
const reply=(c,a,b)=>a+" "+c.sign+" "+b+" = "+c.fn(a,b)+".";

function train(c){
 const b=create();
 b.enableUnifiedWorldLearning();
 let seen=0;
 for(let a=0;a<=4;a++)for(let z=0;z<=4;z++){
   const q=ask(c.verb,a,z),out=reply(c,a,z);
   // The very same Brain owns semantic goal and shared model: no synthetic API.
   b.learnObservedTransformations(out);
   const r=b.learnGoalPathPair(q,out);
   assert.equal(r.coupled.learned,true,c.name+q);
   seen++;
 }
 assert.equal(seen,25);
 assert.ok(b.numericGoalField.paired>=20,c.name);
 return b;
}

test("native V17 defaults to WHOLE preaction learned numeric solution paths for five unseen families", {timeout:90000},()=>{
 let exact=0,paths=0;
 for(const c of cases){
   const b=train(c);
   // Directly guarantee the legacy next-character engine is not consulted.
   b.align={write(){throw Error("ILLEGAL next-character fallback");}};
   for(let a=5;a<=7;a++)for(let z=5;z<=7;z++){
     const q=ask(c.verb,a,z);
     const r=b.chat([["you",q]],{T:0,max:1000});
     // Reference target is computed AFTER the plan/execution has completed.
     const expected=reply(c,a,z);
     assert.equal(r.mode,"goal-path",c.name);
     assert.equal(r.noNextCharacterFallback,true,c.name);
     assert.equal(r.plannedBeforeFirstAction,true,c.name);
     assert.equal(r.predictedFullAnswerBeforeFirstCharacter,r.text,c.name);
     assert.equal(r.text,expected,JSON.stringify({name:c.name,q,r,expected}));
     assert.equal(r.execution.internalMatch,true,c.name);
     assert.ok(r.execution.executedSteps>=1,c.name);
     assert.equal(r.externallySemanticallyVerified,false);
     paths++;exact++;
   }
 }
 assert.equal(paths,45);
 assert.equal(exact,45);
 console.log("V17_NATIVE_CAUSAL_PREACTION_HELDOUT "+JSON.stringify({
    exact,total:45,wholeAnswerBeforeOutput:true,legacyAlignCalled:false,
    worlds:cases.map(x=>x.name),ruleOperatorNotHardcoded:true}));
});

test("native goal-route cannot secretly fall back to character prediction; causal axis ablation fails",()=>{
 const c=cases[3],b=train(c);
 b.align={write(){throw Error("FALLBACK NOT ALLOWED");}};
 const q=ask(c.verb,6,7);
 const normal=b.chat([["you",q]]);
 assert.equal(normal.text,reply(c,6,7));
 const negative=b.chat([["you",q]],{ablateAxes:true});
 assert.equal(negative.ready,false);
 assert.equal(negative.text,"");
 assert.equal(negative.noNextCharacterFallback,true);
 const novel=b.chat([["you","Write a previously unseen encyclopedia essay on stars"]]);
 assert.equal(novel.ready,false);
 assert.equal(novel.text,"");
 assert.equal(novel.noNextCharacterFallback,true);
 console.log("V17_NATIVE_CAUSAL_ABLATION "+JSON.stringify({
    normal:normal.text,ablate:negative.reason,unknown:novel.reason,
    noOracle:true,noCharacterFallback:true}));
});

test("native original V17 checkpoint: restore learned numeric axes and predict entire unseen answer from same brain",()=>{
 const c=cases[1],b=train(c),dir=fs.mkdtempSync(path.join(os.tmpdir(),"native-causal-field-"));
 try{
   const out=path.join(dir,"brain.v8");
   b.save(out);
   assert.ok(fs.statSync(out).size>0);
   const restored=Brain.load(out);
   assert.equal(restored.unifiedEnabled,true);
   assert.equal(restored.numericGoalField.rows,25);
   assert.ok(restored.numericGoalField.worlds instanceof Map);
   for(const w of restored.numericGoalField.worlds.values()){
     assert.equal(typeof w.model.plan,"function","The learned model must recover its true class methods");
   }
   const r=restored.chat([["you",ask(c.verb,7,6)]]);
   assert.equal(r.text,reply(c,7,6));
   assert.equal(r.predictedFullAnswerBeforeFirstCharacter,r.text);
   // Continue observations with the same brain AFTER checkpoint restore.
   const more=restored.learnGoalPathPair(ask(c.verb,5,4),reply(c,5,4));
   assert.equal(more.coupled.learned,true);
   assert.equal(restored.numericGoalField.rows,26);
   console.log("V17_CAUSAL_BRAIN_RESUME "+JSON.stringify({
     fileSize:fs.statSync(out).size,loadedRows:25,newRows:26,
     unseenPrediction:r.text,success:true}));
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});

test("long text outside numeric field is not silently passed off as solved",()=>{
 const b=create(),long="Explanation: "+"Long observed statement. ".repeat(80);
 b.learnGoalPathPair("Explain the entire unobserved process",long);
 const r=b.chat([["you","Explain an unrelated mathematical theorem"]]);
 assert.equal(r.ready,false);
 assert.equal(r.text,"");
 assert.equal(r.noNextCharacterFallback,true);
 assert.ok(b.numericGoalField.skipped>=1);
});


test("genuine frozen heldout Q/A evaluation reports exact whole-answer path BEFORE legacy character diagnostics",()=>{
  const b=train(cases[1]);
  b.align=new AligningGraph();
  const unseen="Q: What is 7 times 6?\nA: 7 * 6 = 42.\n\n";
  // The independent reference is introduced ONLY when the heldout
  // evaluator is called, never in any observePair() or training step.
  const report=b.evalTextExercises([Uint8Array.from(Buffer.from(unseen,"utf8"))],
    {T:0,noise:0,seed:77});
  assert.equal(report.nativeGoalNoTeacherAnswerDuringPlanning,true);
  assert.equal(report.nativeWholeAnswerExact,1);
  assert.equal(report.exercises[0].nativeGoal.fullAnswerExact,true);
  assert.equal(report.exercises[0].nativeGoal.wholePredictedBeforeFirstCharacter,
    "7 * 6 = 42.");
  assert.equal(report.exercises[0].shapeLegacyDiagnosticOnly,true);
  assert.equal(report.exercises[0].nativeGoal.noNextCharacterFallback,true);
  console.log("V17_FROZEN_EXACT_WHOLE_SOLUTION "+JSON.stringify({
    exact:report.nativeWholeAnswerExact,preaction:true,heldout:true,
    legacyNextCharacterDiagnosticSeparate:true
  }));
});


test("real causal action-field cache preserves identical planned whole-answer and invalidates after every new observation",()=>{
  const b=train(cases[1]),world=b.numericGoalField.worlds.values().next().value;
  const initial="4 * 4 = 16.";
  const x=world.model.discover(initial),y=world.model.discover(initial);
  assert.strictEqual(x.operators,y.operators,"Unchanged actual training evidence must reuse exact field");
  const before=b.chat([["you","What is 7 times 6?"]]);
  assert.equal(before.text,"7 * 6 = 42.");
  const obs=b.learnGoalPathPair("What is 5 times 4?","5 * 4 = 20.");
  assert.equal(obs.coupled.learned,true);
  const after=world.model.discover(initial);
  assert.notStrictEqual(x.operators,after.operators,
    "A new real paired transition must force rediscovery of the entire local field");
  assert.equal(after.pairedObservations>x.pairedObservations,true);
  const again=b.chat([["you","What is 7 times 6?"]]);
  assert.equal(again.text,before.text,"Caching cannot change complete unseen numeric answer");
  assert.equal(again.predictedFullAnswerBeforeFirstCharacter,before.predictedFullAnswerBeforeFirstCharacter);
});
