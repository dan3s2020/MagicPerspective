import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {LearnedCognitiveMap,tokenizeWorld} from "../transcend/torus-aether/worlds/learned-cognitive-map.mjs";
import {Discoverer} from "../transcend/torus-aether/worlds/exercise.mjs";

const learned=()=>{
 const model=new LearnedCognitiveMap();
 model.observeActionResult({before:["He","is","tired","."],action:"change-subject",
  after:["She","is","tired","."],accepted:true});
 model.observeActionResult({before:["He","is","tired","."],action:"change-mood",
  after:["He","is","calm","."],accepted:true});
 return model;
};
const d=()=>{const result=new Discoverer(17);result.temp=0;return result;};
const goal={slots:{0:"She",2:"calm"}};
const independentPhysics=(state,action)=>{
 const after=state.slice();
 if(action==="change-subject" && after[0]==="He")after[0]="She";
 else if(action==="change-mood"&&after[2]==="tired")after[2]="calm";
 else return {after:state,accepted:false};
 return {after,accepted:true};
};

test("Full native 0.9MB real repository text becomes a long-dimensional state: FIRST exact end solution shape",{
 timeout:25000
},()=>{
 const source=fs.readFileSync(new URL("../../CONVERSATIE_COMPLETA_DIN_CONTEXT.md",import.meta.url),"utf8");
 const input="He is tired. "+source.repeat(12);
 const actual=tokenizeWorld(input);
 assert.ok(input.length>=800000,"Need genuinely large observed source text");
 assert.ok(actual.length>96,"Must exceed old V19 sentence limit");
 const model=learned(),before=model.export(),brain=d();
 const t=performance.now();
 const plan=model.formSolutionLongNative(input,goal,{disc:brain,maxNodes:16,maxDepth:8,maxTokens:400000});
 const planningMs=performance.now()-t;
 assert.equal(plan.found,true);
 assert.equal(plan.originalDiscovererDirectlyUsed,true);
 assert.equal(plan.plannedBeforeAction,true);
 assert.equal(plan.noHiddenAnswerOracle,true);
 assert.equal(plan.path.length,2);
 assert.equal(plan.world.tokenCount,actual.length);
 assert.ok(plan.field.math.maxBellmanResidual<1e-12);
 assert.ok(plan.field.math.inferredHypothesisSteps>=1);
 const expected=actual.slice();expected[0]="She";expected[2]="calm";
 const result=model.execute(plan,{step:independentPhysics,observe:false});
 assert.equal(result.solved,true);
 assert.deepEqual(result.final,expected);
 assert.deepEqual(model.export(),before,"Frozen long test must not update learned rules");
 console.log("NATIVE_LONG_TEXT",JSON.stringify({
  source:"repository archived natural Romanian/English mixed text, with two structured causal edit goals",
  originalCharacters:input.length,originalTokens:actual.length,
  fullAnswerCharacters:result.final.join(" ").length,
  plannedSteps:plan.path.length,firstAction:plan.field.firstAction,
  exactWholeAnswer:true,planningMs:+planningMs.toFixed(2),
  hypotheses:plan.field.math.inferredHypothesisSteps,
  BellmanResidual:plan.field.math.maxBellmanResidual,
  limitations:"Explicit positional goals and 2 learned edit laws, not unrestricted language QA"}));
});
test("100 distinct unseen long-context state vectors: original 2-step shape and independent reality",()=>{
 const model=learned(),brain=d();let right=0,chars=0;
 for(let k=0;k<100;k++){
   const original=["He","is","tired",...Array.from({length:124},(_,i)=>"novel_"+k+"_"+i),"."];
   chars+=original.join(" ").length;
   const p=model.formSolutionLongNative(original,goal,{disc:brain,maxNodes:16,maxDepth:8});
   assert.equal(p.found,true);
   assert.equal(p.path.length,2);
   const actual=model.execute(p,{step:independentPhysics,observe:false});
   const target=original.slice();target[0]="She";target[2]="calm";
   if(actual.solved&&JSON.stringify(actual.final)===JSON.stringify(target))right++;
 }
 assert.equal(right,100);
 console.log("NATIVE_100_LONG_CONTEXTS",JSON.stringify({unseenStates:100,exactWholeEndState:100,totalChars:chars,
  note:"128-token vectors, unseen distractor words, constrained goal physics"}));
});
test("Original V19 short-world 96-token boundary untouched and stays functional",()=>{
 const model=learned(),short=model.formSolutionNative(["He","is","tired","."],goal,{disc:d()});
 assert.equal(short.found,true);
 const long=Array.from({length:124},(_,i)=>i===0?"He":i===1?"is":i===2?"tired":"noise"+i);
 assert.throws(()=>model.formSolutionNative(long,goal,{disc:d()}),/Invalid cognitive planning limits/);
 const full=model.formSolutionLongNative(long,goal,{disc:d()});
 assert.equal(full.found,true);
 assert.equal(full.world.tokenCount,124);
});
test("Long-world ablations, unknown goals and strict untruncated memory",()=>{
 const model=learned(),text=["He","is","tired",...Array.from({length:180},(_,i)=>"context"+i)];
 assert.equal(model.formSolutionLongNative(text,goal,{disc:d(),maxTokens:400000}).found,true);
 assert.throws(()=>model.formSolutionLongNative(text,goal,{disc:d(),maxTokens:100}),/original full text exceeds/i);
 model.rules.clear();
 assert.equal(model.formSolutionLongNative(text,goal,{disc:d()}).found,false);
 assert.equal(model.formSolutionLongNative(text,goal,{disc:d()}).reason,"NO_GOAL_IN_LEARNED_LONG_STATE_SPACE");
});
