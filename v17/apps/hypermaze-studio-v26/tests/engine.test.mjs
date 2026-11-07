import test from "node:test";
import assert from "node:assert/strict";
import {ObservedEffects,planShape,executeShape,seeded} from "../engine.mjs";
import {Discoverer as Original,KIND} from "../../../transcend/torus-aether/worlds/exercise-v17-IMMUTABLE-BASELINE.mjs";
import {Discoverer as Current} from "../../../transcend/torus-aether/worlds/exercise.mjs";
const eq=(a,b)=>a.length===b.length&&a.every((x,i)=>x===b[i]);
function world(axes=8,n=3072){
 const before=Array.from({length:n},(_,i)=>"corpus_word_"+i);
 const fx=Array.from({length:axes},(_,i)=>({
   action:"opaque_physical_action_"+i,from:"source_axis_"+i,
   to:"target_axis_"+i,index:i}));
 const places=fx.map((_,i)=>Math.floor((i+.5)*n/fx.length));
 for(let i=0;i<fx.length;i++)before[places[i]]=fx[i].from;
 const learner=new ObservedEffects({maxRules:axes});
 for(let i=0;i<fx.length;i++){
   const after=before.slice();after[places[i]]=fx[i].to;
   assert.equal(learner.observe({before,action:fx[i].action,after,accepted:true}).learned,true);
 }
 const physical=(tokens,action)=>{
   const r=fx.find(x=>x.action===action),out=tokens.slice();
   if(!r)return {accepted:false,after:out};
   const at=out.indexOf(r.from);
   if(at<0||out.lastIndexOf(r.from)!==at)return {accepted:false,after:out};
   out[at]=r.to;return {accepted:true,after:out};
 };
 return {learner,before,fx,physical,places};
}
test("actual Discoverer.shape: frozen complete multi-axis text path on 120 unseen 1k-4k documents",()=>{
 const {learner,fx,physical}=world(8,512),before=JSON.stringify(learner.export());
 let correct=0,transitions=0;
 for(let seed=0;seed<120;seed++){
   const n=[1024,2048,4096][seed%3];
   const input=Array.from({length:n},(_,j)=>"genuine_independent_context_"+seed+"_"+j);
   const positions=fx.map((_,i)=>Math.floor((i+.5)*n/fx.length));
   for(let i=0;i<fx.length;i++)input[positions[i]]=fx[i].from;
   const required=fx.filter((_,i)=>(seed+i*13)%11<8);
   if(!required.length)required.push(fx[seed%fx.length]);
   const goal={requires:required.map(r=>r.to)};
   const p=planShape(learner,input,goal,{seed:74129+seed*7919,
     maxAxes:8,noise:seed%5===0?.7:0,includeGraph:seed===0});
   assert.equal(JSON.stringify(learner.export()),before,"Frozen pre-action planning leaked");
   assert.equal(p.nativeMethod,"Discoverer.shape");
   assert.equal(p.completeBeforeAction,true);
   assert.equal(p.found,true,p.reason);
   assert.equal(p.worldNodes,256);
   assert.equal(p.path.length,required.length);
   const reference=input.slice();
   for(const r of required){reference[reference.indexOf(r.from)]=r.to;}
   assert.ok(eq(p.final,reference),"Full target must match, not just goal word");
   const result=executeShape(p,input,physical);
   assert.equal(result.exactFullShape,true);
   assert.ok(eq(result.actual,reference));
   transitions+=result.trace.length;correct++;
   if(seed===0){
     assert.equal(p.graph.nodes.length,256);
     assert.equal(p.graph.edges.length,1024);
     assert.equal(p.graph.path.length,p.path.length+1);
     assert.ok(p.fieldAtStart>0);
   }
 }
 assert.equal(correct,120);
 console.log("V26_UNSEEN_FROZEN_TEXT",JSON.stringify({
   exactInitialShapes:correct,unseenTasks:120,
   fullTextTokenLengths:[1024,2048,4096],actions:transitions,
   nativeMethod:"Discoverer.shape",scope:"controlled observed token edits"}));
});
test("four causal regressions: no training, missing rule, independent wrong physics, duplicate perspective",()=>{
 const {learner,before,fx,physical}=world(6,1024);
 const required={requires:fx.map(x=>x.to)};
 assert.equal(planShape(new ObservedEffects(),before,required).found,false);
 const missing=ObservedEffects.restore(learner.export());
 missing.rules.delete(fx[0].action);
 assert.equal(planShape(missing,before,required).found,false);
 const good=planShape(learner,before,required);
 const bad=executeShape(good,before,(tokens,action)=>{
   const index=fx.findIndex(x=>x.action===action);
   return physical(tokens,fx[(index+1)%fx.length].action);
 });
 assert.equal(bad.exactFullShape,false);
 const repeated=before.slice();repeated[100]=fx[0].from;
 assert.equal(planShape(learner,repeated,{requires:[fx[0].to]}).found,false);
 const beforeConflicting=before.slice(),after=before.slice();
 after[200]="changed_again";
 assert.equal(learner.observe({before:beforeConflicting,action:fx[0].action,
   after,accepted:true}).learned,false);
 assert.equal(learner.rules.get(fx[0].action).ambiguous,true);
 console.log("V26_NEGATIVE_CONTROLS",JSON.stringify({
   noLearnedRules:false,missingRequiredRule:false,
   physicsScrambledExact:false,duplicateSourceAbstains:true,contradictionDetected:true}));
});
test("deterministic random state, independent 2D original parity and native route noise",()=>{
 const R=seeded(123);for(let i=0;i<33;i++)R();
 const snapshot=R.state(),next=R();
 R.restore(snapshot);assert.equal(R(),next);
 let parity=0;
 for(let seed=1;seed<=84;seed++){
   const n=7+2*(seed%3),ret=Array(n*n).fill(KIND.floor);
   for(let j=1;j<n*n-1;j++)if((j*131+seed*17)%19<4)ret[j]=KIND.wall;
   ret[0]=KIND.self;ret[n*n-1]=KIND.target;
   const a=new Original(seed),b=new Current(seed);
   for(const x of [a,b]){x.pass=[18,1,19,9];x.block=[2,80,1,4];
     x.enter=[1,1,10,1];x.endIn=[0,0,9,0];x.temp=seed%2?.7:0;}
   assert.deepEqual(a.shape(ret,n,0),b.shape(ret,n,0));parity++;
 }
 const {learner,before,fx}=world(6,1024);
 const goal={requires:fx.map(x=>x.to)},paths=new Set();
 for(let i=0;i<128;i++){
   const p=planShape(learner,before,goal,{seed:74129+i*7919,noise:.8,
     includeGraph:false});
   assert.equal(p.found,true);assert.equal(p.path.length,6);
   paths.add(p.path.map(x=>x.action).join("|"));
 }
 assert.ok(paths.size>2);
 console.log("V26_PARITY_NOISE",JSON.stringify({original2DBoards:parity,
   stochasticSeeds:128,distinctNativeCompletePaths:paths.size}));
});


test("scale native learned topology to full 10-axis graph over actual 8192-word long state without cloning text in nodes",()=>{
 const {learner,before,fx,physical}=world(10,8192);
 const target={requires:fx.map(x=>x.to)};
 const start=Date.now();
 const plan=planShape(learner,before,target,{seed:74129,
   noise:.5,maxAxes:10,includeGraph:true});
 assert.equal(plan.nativeMethod,"Discoverer.shape");
 assert.equal(plan.found,true);
 assert.equal(plan.completeBeforeAction,true);
 assert.equal(plan.worldNodes,1024);
 assert.equal(plan.worldEdges,5120);
 assert.equal(plan.path.length,10);
 assert.equal(plan.final.length,8192);
 assert.equal(plan.graph.nodes.length,1024);
 assert.equal(plan.graph.edges.length,5120);
 assert.equal(plan.graph.axes.length,10);
 assert.ok(plan.graph.nodes.every(n=>!Array.isArray(n.fullText)),
   "Must not duplicate 8,192 words inside each graph node");
 const output=executeShape(plan,before,physical);
 assert.equal(output.exactFullShape,true);
 assert.equal(output.trace.length,10);
 const rawGraphBytes=Buffer.byteLength(JSON.stringify(plan.graph));
 assert.ok(rawGraphBytes<2_000_000,"Sparse graph should stay under 2MB");
 console.log("V26_TEN_AXIS_SPARSE_SCALE",JSON.stringify({
   dimensions:10,stateNodes:plan.worldNodes,edges:plan.worldEdges,
   textWords:plan.final.length,fullPreactionPathLength:plan.path.length,
   exactExecuted:output.exactFullShape,
   serializedGraphBytes:rawGraphBytes,elapsedMs:Date.now()-start,
   scope:"controlled observed ten-axis corpus edit physics"}));
});
