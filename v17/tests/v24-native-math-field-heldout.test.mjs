import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {createHash} from "node:crypto";
import {fileURLToPath} from "node:url";
import {NativeMathGoalField} from "../research/goal-path-field/native-math-graph.mjs";

// Exactly the observed paired transformations from the earlier successful
// state-dependent-axes experiment. No multiplication equation or hidden
// answer is encoded into the LEARNER. The verifier separately knows physics.
const observations=[
 ["2 * 3 = 6.","3 * 3 = 9."],
 ["2 * 4 = 8.","3 * 4 = 12."],
 ["2 * 3 = 6.","2 * 4 = 8."],
 ["3 * 3 = 9.","3 * 4 = 12."],
 ["3 * 4 = 12.","4 * 4 = 16."],
 ["2 * 4 = 8.","2 * 5 = 10."]
];
function trained(){
 const f=new NativeMathGoalField({maxNodes:500,maxSteps:24,maxDocumentTokens:4096,maxValue:300});
 for(const [before,after] of observations)assert.equal(f.observePair(before,after).learned,true);
 // If someone accidentally uses the separately added A* research planner,
 // this throws. Only original Discoverer.shape is the path planner.
 f.induction.plan=()=>{throw Error("Forbidden substitute planner: StateDependentTextAxes.plan");};
 return f;
}
const longText=(seed)=>"2 * 3 = 6.  "+
  Array.from({length:2044},(_,i)=>"unseenparagraph"+seed+"word"+i).join(" ")+" \nThe surviving appendix remains exactly unchanged.";
function actualPhysics(before,action){
 const after=before.slice(),i=action.numericIndices,offset=action.offset;
 const numbers=i.map(x=>Number(after[offset+x]));
 const nx=numbers[0]+(action.primary===0?action.step:0);
 const ny=numbers[1]+(action.primary===1?action.step:0);
 if(nx<0||ny<0||nx>300||ny>300)return {accepted:false,after:before};
 // Independently implemented evaluation physics: DOES NOT read the
 // candidate answer, learned slopes, expected state or solved path.
 after[offset+i[0]]=String(nx);
 after[offset+i[1]]=String(ny);
 after[offset+i[2]]=String(nx*ny);
 return {accepted:true,after};
}
function gitSha(blob){
 return createHash("sha1").update("blob "+blob.length+"\0").update(blob).digest("hex");
}
test("original proven arithmetic induction sources are copied BYTE-EXACT",()=>{
 const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
 const observed=fs.readFileSync(path.join(root,"transcend/torus-aether/worlds/observed-transformations.mjs"));
 const induced=fs.readFileSync(path.join(root,"research/text-hypermaze/state-dependent-axes.mjs"));
 assert.equal(gitSha(observed),"203af6f21b3834bc6d9487e78cef268bba7f37e5");
 assert.equal(gitSha(induced),"4a69a622e9221b1b18bee310343d0a1e3d25e46d");
});
test("16 unseen COMPLETE >2048-token arithmetic answers planned before any output; independent world checks every action",()=>{
 const f=trained();let correct=0,steps=0,characters=0,states=0,allStates=0;
 const frozenBefore=JSON.stringify(f.induction.data.size);
 for(let x=4;x<=7;x++)for(let y=5;y<=8;y++){
   const seed=x*101+y,doc=longText(seed);
   const required=[{index:0,value:x},{index:2,value:y}];
   const observedBefore=f.observedPairs;
   const plan=f.formSolution(doc,required,{seed:seed+400,temperature:0});
   assert.equal(plan.found,true,JSON.stringify({x,y,reason:plan.reason,states:plan.world?.states.length}));
   assert.equal(plan.method,"Discoverer.shape");
   assert.equal(plan.plannedBeforeAction,true);
   assert.equal(plan.referenceAnswerProvided,false);
   assert.ok(plan.fullDocumentTokens>2048);
   assert.ok(plan.path.length>=2,"Must predict multiple actions, not next symbol");
   assert.ok(plan.field[0]>0,"Real pre-action field must propagate to the start state");
   assert.equal(f.observedPairs,observedBefore,"Frozen planner cannot ingest hidden answers");
   assert.ok(plan.path.every(edge=>edge.verified===false),"Novel-context edge must remain a hypothesis");
   const actual=f.execute(plan,{step:actualPhysics,observe:false});
   const expected=doc.replace("2 * 3 = 6.",x+" * "+y+" = "+(x*y)+".");
   assert.equal(plan.fullCandidate,expected,"Entire answer must be predicted before action");
   assert.equal(actual.fullActual,expected,"True independent physics must agree with all answer bytes");
   assert.equal(actual.solved,true);
   assert.equal(actual.steps,plan.path.length);
   assert.equal(actual.allMovesVerified,true);
   assert.equal(actual.predictedBeforeAction,expected);
   assert.equal(f.observedPairs,observedBefore,"Heldout score must not retrain the model");
   steps+=plan.path.length;characters+=expected.length;states+=plan.world.states.length;
   allStates+=plan.fullDocumentTokens;
   correct++;
 }
 assert.equal(correct,16);
 assert.equal(JSON.stringify(f.induction.data.size),frozenBefore);
 console.log("V24_REAL_ORIGINAL_DISCOVERER_FULL_ANSWER_HELDOUT",JSON.stringify({
  tasks:correct,correct,exactFullAnswerRate:correct/16,
  inputTokensPerTask:"2050+",
  averageLearnedActionSteps:steps/correct,
  averageExploredGraphStates:states/correct,
  averageFullTextStateTokens:allStates/correct,
  verifiedFullAnswerCharacters:characters,
  originalMethod:"Discoverer.shape",
  knownGrammar:"numeric observed-pair multiplication grammar, with arbitrary unseen surrounding prose",
  referenceAnswerExposedToPlanner:false,
  actualPhysicsIndependent:true,
  researchNotUnrestrictedNaturalLanguage:true
 }));
});
test("causal ablation, invalid goal and incompatible language provide NO fake perfect solution",()=>{
 const f=trained(),doc=longText(991),goal=[{index:0,value:6},{index:2,value:7}];
 assert.equal(f.formSolution(doc,goal).found,true);
 const before=f.induction.data.size;
 assert.ok(before>0);
 f.induction.data.clear();
 assert.equal(f.formSolution(doc,goal).found,false);
 assert.throws(()=>trained().formSolution(doc,[{index:4,value:42}]),
   /independent coordinates/);
 assert.equal(trained().formSolution("I cannot derive an unknown poem from this text.",goal).found,false);
});
test("a genuine physical contradiction makes full answer FAIL instead of trusting an imagined path",()=>{
 const f=trained(),doc=longText(999),goal=[{index:0,value:6},{index:2,value:7}];
 const p=f.formSolution(doc,goal);
 assert.equal(p.found,true);
 let interventions=0;
 const bad=f.execute(p,{observe:false,step:(before,op)=>{
   interventions++;
   const observed=actualPhysics(before,op);
   if(interventions===3)observed.after[op.offset+op.numericIndices[2]]="999";
   return observed;
 }});
 assert.equal(bad.solved,false);
 assert.ok(bad.trace.some(t=>!t.accurate));
 assert.notEqual(bad.fullActual,p.fullCandidate);
});
test("same noise seed produces same original V17 path, noise never changes training evidence",()=>{
 const f=trained(),doc=longText(777),goal=[{index:0,value:5},{index:2,value:6}];
 const before=f.observedPairs;
 const p=f.formSolution(doc,goal,{seed:8181,temperature:.3});
 const q=f.formSolution(doc,goal,{seed:8181,temperature:.3});
 assert.deepEqual(p.path,q.path);
 assert.equal(f.observedPairs,before);
 assert.equal(p.method,"Discoverer.shape");
});
