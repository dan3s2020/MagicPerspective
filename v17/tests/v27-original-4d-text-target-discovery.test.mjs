import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {Brain} from "../transcend/torus-aether/devour/brain.mjs";
import {Discoverer as FrozenOriginal,KIND} from "../transcend/torus-aether/worlds/exercise-v27-PR62-IMMUTABLE-SNAPSHOT.mjs";
import {Discoverer as LiveOriginal} from "../transcend/torus-aether/worlds/exercise.mjs";
import {dec,enc,N,move,ACTIONS} from "../transcend/torus-aether/worlds/goal-text-navigator.mjs";
import {world,train,perform} from "../research/text-hypermaze/grounded-4d-benchmark.mjs";
import {LearnedTargetReference,planOriginal4DFromText} from "../transcend/torus-aether/worlds/goal-text-original-shape-bridge.mjs";

const rules={depth:1,off:["R2","R4"],budEvery:100,empty:true,maxWires:32,fold:false};
const textRef=(id,position)=>"Archive report names "+id+" at coordinate ("+dec(position).join(",")+").";
const query=id=>"Reach "+id+" using the observed world.";
const trainedReference=()=>{
 const learned=new LearnedTargetReference();
 for(let i=0;i<90;i++){
  const pos=enc([i%4,(i>>2)%4,(i>>4)%4,(i>>6)%4]);
  const marker="training_referent_"+i;
  learned.observe({question:"Locate "+marker+".",statement:"Catalog lists "+marker+" in chamber ("+dec(pos).join(",")+").",isGoal:true});
  learned.observe({question:"Locate "+marker+".",statement:"Catalog lists distracting_other_"+i+" in chamber ("+dec((pos+5)%N).join(",")+").",isGoal:false});
 }
 return learned;
};
const documentWith=(w,id,position=w.goal,extra=[])=>w.document+"\n"+textRef(id,position)+(extra.length?"\n"+extra.join("\n"):"");

test("unchanged original native V17 2D shape remains identical on 84 seeded grids/noise levels",()=>{
 for(let seed=1;seed<=84;seed++){
  const n=7+(seed%3)*2,ret=Array(n*n).fill(KIND.floor);
  for(let i=1;i<n*n-1;i++)if((i*131+seed*17)%19<4)ret[i]=KIND.wall;
  ret[0]=KIND.self;ret[n*n-1]=KIND.target;
  const a=new FrozenOriginal(seed),b=new LiveOriginal(seed);
  for(const d of [a,b]){
   d.pass=[18,1,19,9];d.block=[2,80,1,4];d.enter=[1,1,10,1];d.endIn=[0,0,9,0];
   d.temp=seed%2?.7:0;
  }
  assert.deepEqual(b.shape(ret,n,0),a.shape(ret,n,0));
 }
});

test("learned question-to-target association finds novel target coordinates but refuses duplicates or missing evidence",()=>{
 const ref=trainedReference(),w=world(938),id="previously_unseen_radiant_portal";
 const fingerprint=JSON.stringify(ref.export());
 const resolved=ref.resolve(documentWith(w,id),query(id));
 assert.equal(resolved.found,true,JSON.stringify(resolved));
 assert.equal(resolved.goal,w.goal,"Location must be inferred from document, never supplied to solver");
 assert.equal(JSON.stringify(ref.export()),fingerprint,"Heldout target may not train the model");
 assert.equal(ref.resolve(documentWith(w,id,w.goal,[textRef(id,(w.goal+4)%N)]),query(id)).found,false);
 assert.equal(ref.resolve(w.document,query(id)).found,false);
 assert.equal(ref.resolve(documentWith(w,id),query("totally_unsupported_goal")).found,false);
});

test("actual original Discoverer.shape navigates learned 4D axes and wall facts from withheld 100k-char texts, without a goal ID argument",()=>{
 const brain=new Brain({rules,seed:71}),agent=train(17,{agent:brain.textGoal}),ref=trainedReference();
 let exact=0,optimal=0,rank2=0,totalChars=0,windows=0;
 const before=agent.frozenFingerprint(),refBefore=JSON.stringify(ref.export());
 for(let i=0;i<24;i++){
  const w=world(12000+37*i),id="unknown_signal_"+i;
  const document=documentWith(w,id),question=query(id);
  const p=planOriginal4DFromText({navigator:agent,disc:brain.disc,reference:ref,
   document,question,start:w.start,seed:123+i});
  assert.equal(p.originalMethod,"Discoverer.shape");
  assert.equal(p.goalSuppliedToPlanner,false);
  assert.equal(p.preAction,true);
  assert.equal(p.goal,w.goal);
  assert.ok(Array.isArray(p.field)&&p.field.length===N);
  assert.equal(p.path.length>0,true,JSON.stringify(p).slice(0,600));
  let at=w.start,physical=true;
  for(const hop of p.path){
   assert.equal(hop.from,at);
   const actual=perform(at,hop.action); // hidden independent world; NOT using predicted next state
   if(!w.cells[actual]||actual!==hop.to){physical=false;break}
   at=actual;
  }
  const correct=physical&&at===w.goal;
  exact+=Number(correct);
  optimal+=Number(correct&&p.path.length===w.oracle.length);
  totalChars+=document.length;
  windows+=p.axes.length;
  const ablated=planOriginal4DFromText({navigator:agent,disc:brain.disc,reference:ref,
    document,question,start:w.start,axes:[0,1],seed:123+i});
  rank2+=Number(ablated.found);
  assert.equal(correct,true,"Learned 4D path must physically execute before asserting success");
 }
 assert.equal(agent.frozenFingerprint(),before);
 assert.equal(JSON.stringify(ref.export()),refBefore);
 assert.equal(exact,24);
 assert.equal(optimal,24);
 assert.ok(rank2<exact);
 console.log("V27_ORIGINAL_4D_TEXT_GOAL",JSON.stringify({
  hiddenGoalNotPassed:true,worlds:24,physicalFirstTryCorrect:exact,
  optimal,rank2,documentChars:totalChars,
  observedAxes:windows/24,originalMethod:"Discoverer.shape",
  limitations:"structured 4-coordinate textual ontology; prior witnessed goal associations; not general OpenThoughts3"
 }));
});

test("unseen target ambiguity is a genuine wall; missing axis effect or missing evidence cannot invent a route",()=>{
 const a=train(23),ref=trainedReference(),disc=new LiveOriginal(17);
 const w=world(2002),q=query("ref_abc"),doc=documentWith(w,"ref_abc");
 assert.equal(planOriginal4DFromText({navigator:a,reference:ref,disc,document:doc,question:q,start:w.start}).found,true);
 const two=documentWith(w,"ref_abc",w.goal,[textRef("ref_abc",(w.goal+5)%N)]);
 const unknown=planOriginal4DFromText({navigator:a,reference:ref,disc,document:two,question:q,start:w.start});
 assert.equal(unknown.found,false);
 assert.equal(unknown.reason,"AMBIGUOUS_GOAL_REFERENCE");
 const removed=planOriginal4DFromText({navigator:a,reference:ref,disc,document:w.document,question:q,start:w.start});
 assert.equal(removed.found,false);
 for(const key of ACTIONS.slice(2))a.effects.delete(key);
 const broken=planOriginal4DFromText({navigator:a,reference:ref,disc,document:doc,question:q,start:w.start});
 assert.ok(!broken.found||broken.path.every(h=>ACTIONS.slice(0,2).includes(h.action)));
});

test("native original Brain checkpoint persists learned action axes and separately observed goal-reference evidence",()=>{
 const brain=new Brain({rules,seed:35}),agent=train(35,{agent:brain.textGoal}),ref=trainedReference();
 brain.v27GoalEvidence=ref.export();
 const w=world(1450),id="never_visited_reference_54";
 const req={document:documentWith(w,id),question:query(id),start:w.start};
 const pre=planOriginal4DFromText({navigator:agent,disc:brain.disc,reference:ref,...req});
 const folder=fs.mkdtempSync(path.join(os.tmpdir(),"mp-v27-"));
 try{
  const file=path.join(folder,"brain.v8");brain.save(file);
  const recovered=Brain.load(file),ref2=LearnedTargetReference.restore(recovered.v27GoalEvidence);
  const post=planOriginal4DFromText({navigator:recovered.textGoal,disc:recovered.disc,
   reference:ref2,...req});
  assert.deepEqual(post.path,pre.path);
  assert.deepEqual(post.goal,pre.goal);
  assert.equal(typeof recovered.learnTextGPU,"function");
  assert.equal(typeof recovered.testMazes,"function");
 }finally{fs.rmSync(folder,{recursive:true,force:true})}
});

test("native same-Brain original shape API learns goal references and restores .v8 evidence without retraining",()=>{
 const brain=new Brain({rules,seed:70});
 train(17,{agent:brain.textGoal});
 assert.equal(brain.predictOriginal4DShapeFromQuestion("","find missing",0).found,false);
 for(let i=0;i<18;i++){
  const id="old_marker_"+i,coord="("+dec(i).join(",")+")";
  brain.observeGoalReferenceOutcome({question:"Locate "+id+".",
   statement:"The archive keeps "+id+" near "+coord+".",isGoal:true});
  brain.observeGoalReferenceOutcome({question:"Locate "+id+".",
   statement:"The archive keeps not_this_"+i+" near "+coord+".",isGoal:false});
 }
 const w=world(1877),id="completely_novel_4d_destination";
 const document=documentWith(w,id),q=query(id);
 const first=brain.predictOriginal4DShapeFromQuestion(document,q,w.start);
 assert.equal(first.found,true);
 assert.equal(first.goal,w.goal);
 assert.equal(first.originalMethod,"Discoverer.shape");
 assert.equal(first.goalSuppliedToPlanner,false);
 assert.equal(first.frozen,true);
 assert.equal(first.nativeBrain,true);
 assert.equal(first.goalFeedbackObservations,36);
 const folder=fs.mkdtempSync(path.join(os.tmpdir(),"mp-v27-native-"));
 try{
  const file=path.join(folder,"brain.v8");
  brain.save(file);
  const resumed=Brain.load(file);
  const second=resumed.predictOriginal4DShapeFromQuestion(document,q,w.start);
  assert.deepEqual(second.path,first.path);
  assert.deepEqual(second.field,first.field);
  assert.equal(resumed.v27GoalEvidence.exampleCount,36);
  assert.equal(typeof resumed.learnTextGPU,"function");
  assert.equal(typeof resumed.playMaze,"function");
 }finally{fs.rmSync(folder,{recursive:true,force:true})}
});

test("unseen stochastic physical slips: replan exact original attraction from newly observed self position",()=>{
 const brain=new Brain({rules,seed:5});
 const agent=train(17,{agent:brain.textGoal}),ref=trainedReference();
 let frozenSuccess=0,feedbackSuccess=0,physicalSlips=0;
 for(let i=0;i<16;i++){
  const w=world(4000+i*29),id="replanning_rare_target_"+i,
    document=documentWith(w,id),q=query(id),worldSeed=1234567+i*13;
  const replay=replan=>{
   let at=w.start,steps=0,slips=0;
   const randomSeed=(function(){let s=worldSeed>>>0;return ()=>{s^=s<<13;s^=s>>>17;s^=s<<5;return(s>>>0)/4294967296}})();
   let route=planOriginal4DFromText({navigator:agent,disc:brain.disc,reference:ref,
     document,question:q,start:at}).path.slice();
   for(let t=0;t<90&&at!==w.goal&&route.length;t++){
    const chosen=route.shift();
    const actual=perform(at,chosen.action);
    if(randomSeed()<.25||!w.cells[actual])slips++;
    else at=actual;
    steps++;
    if(replan&&at!==w.goal)route=planOriginal4DFromText({
      navigator:agent,disc:brain.disc,reference:ref,
      document,question:q,start:at}).path.slice();
   }
   return {solved:at===w.goal,steps,slips};
  };
  frozenSuccess+=Number(replay(false).solved);
  const adaptive=replay(true);
  feedbackSuccess+=Number(adaptive.solved);
  physicalSlips+=adaptive.slips;
 }
 assert.equal(feedbackSuccess,16,"Real failed moves must cause exact original field to be replanned");
 assert.ok(physicalSlips>0);
 assert.ok(frozenSuccess<feedbackSuccess,"Frozen shape must not know future physical slips");
 console.log("V27_ORIGINAL_ATTRACTION_REPLAN",JSON.stringify({
  worlds:16,frozenCompleted:frozenSuccess,feedbackCompleted:feedbackSuccess,
  actualUnpredictableSlips:physicalSlips,firstActionPathFrozen:true,
  correction:"original Discoverer.shape rerun from measured new state",
  noFutureNoiseOracle:true
 }));
});

test("learned cyclic axes form reversible 4D loops, and learned walls exclude physically blocked edges",()=>{
 const nav=train(17),w=world(2555),decoded=nav.reconstruct(w.document);
 const effects=ACTIONS.map(x=>nav.effect(x));
 let reverses=0,blocked=0,cyclicReturn=0;
 for(let i=0;i<effects.length;i++)for(let j=0;j<effects.length;j++){
  if(i===j)continue;
  if(effects[i].every((x,k)=>(x+effects[j][k])%4===0)){
   reverses++;
   for(let state=0;state<256;state++){
    if(!decoded.map[state])continue;
    const after=move(state,effects[i]);
    if(!decoded.map[after]){blocked++;continue}
    assert.equal(move(after,effects[j]),state);
    cyclicReturn++;
   }
  }
 }
 assert.ok(reverses>=8,"Inverse directions must be DISCOVERED from independent action outcomes");
 assert.ok(blocked>0,"Static text-inferred walls remove some proposed graph edges");
 assert.ok(cyclicReturn>0);
 console.log("V27_OBSERVED_TORUS_LOOPS",JSON.stringify({
  inverseActionPairs:reverses,verifiedClosedTwoActionLoops:cyclicReturn,
  blockedCandidateEdges:blocked,
  interpretation:"periodic symbolic 4D state graph; not physical spacetime evidence"
 }));
});

test("V27 negative semantic counterevidence: learn from outcomes that a same-name document claim can deny a target",()=>{
 const ref=trainedReference();
 for(let i=0;i<24;i++){
  const marker="prior_effect_"+i,question=query(marker);
  ref.observe({question,statement:"Archive confirms "+marker+
    " at ("+dec(i).join(",")+").",isGoal:true});
  ref.observe({question,statement:"Archive denies "+marker+
    " at ("+dec((i+7)%N).join(",")+").",isGoal:false});
 }
 const w=world(2061),id="completely_new_marker_320",q=query(id);
 const negative="Archive denies "+id+" at ("+dec((w.goal+9)%N).join(",")+").";
 const safe=ref.resolve(documentWith(w,id,w.goal,[negative]),q);
 assert.equal(safe.found,true,JSON.stringify(safe));
 assert.equal(safe.goal,w.goal,"Learned negative evidence must not hijack the world target");
 const onlyNegative=ref.resolve(w.document+"\n"+negative,q);
 assert.equal(onlyNegative.found,false,"A known negative declaration is not a valid destination");
 const checkpoint=LearnedTargetReference.restore(JSON.parse(JSON.stringify(ref.export())));
 assert.deepEqual(checkpoint.resolve(documentWith(w,id,w.goal,[negative]),q),safe);
});
