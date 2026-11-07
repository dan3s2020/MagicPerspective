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
