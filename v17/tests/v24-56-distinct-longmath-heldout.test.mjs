import test from "node:test";
import assert from "node:assert/strict";
import {performance} from "node:perf_hooks";
import {NativeMathGoalField} from "../research/goal-path-field/native-math-graph.mjs";

const observations=[
 ["2 * 3 = 6.","3 * 3 = 9."],
 ["2 * 4 = 8.","3 * 4 = 12."],
 ["2 * 3 = 6.","2 * 4 = 8."],
 ["3 * 3 = 9.","3 * 4 = 12."],
 ["3 * 4 = 12.","4 * 4 = 16."],
 ["2 * 4 = 8.","2 * 5 = 10."]
];
function physics(before,op){
 const after=before.slice(),i=op.numericIndices,at=op.offset;
 let x=Number(before[at+i[0]]),y=Number(before[at+i[1]]);
 if(op.primary===0)x+=op.step;
 if(op.primary===1)y+=op.step;
 if(x<0||y<0||x>300||y>300)return {accepted:false,after:before};
 after[at+i[0]]=String(x);after[at+i[1]]=String(y);
 after[at+i[2]]=String(x*y);
 return {accepted:true,after};
}
function uniqueText(x,y){
 const seed=x*1009+y*37;
 return "2 * 3 = 6. \n"+
   Array.from({length:2048},(_,i)=>"previouslyunseencontext"+seed+"paragraph"+i).join(" ") +
   "\nAn independent scientific report with its original bytes preserved.";
}
test("56 distinct unseen arithmetic TARGETS, each in a 2057-token complete document: original preaction shape versus independent physical world", {timeout:240000},()=>{
 const brain=new NativeMathGoalField({maxNodes:1700,maxSteps:36,maxDocumentTokens:4096,maxValue:300});
 for(const [a,b]of observations)assert.equal(brain.observePair(a,b).learned,true);
 const learnedSnapshot=()=>{const x=brain.export();return JSON.stringify({
   induction:x.induction,observedPairs:x.observedPairs,
   observedExecutions:x.observedExecutions,failedExecutions:x.failedExecutions,
   blockedContexts:x.blockedContexts
  });};
 const before=learnedSnapshot(),t0=performance.now();
 let successes=0,actions=0,explored=0,totalCharacters=0;
 let minSteps=Infinity,maxSteps=0,minNodes=Infinity,maxNodes=0;
 const failures=[];
 for(let x=4;x<=10;x++)for(let y=5;y<=12;y++){
  const doc=uniqueText(x,y),goals=[{index:0,value:x},{index:2,value:y}];
  const expected=doc.replace("2 * 3 = 6.",x+" * "+y+" = "+(x*y)+".");
  const plan=brain.formSolution(doc,goals,{seed:x*2048+y,temperature:0});
  if(!plan.found){
    failures.push({x,y,reason:plan.reason,states:plan.world?.states?.length||0});
    continue;
  }
  assert.equal(plan.method,"Discoverer.shape");
  assert.equal(plan.referenceAnswerProvided,false);
  assert.equal(plan.plannedBeforeAction,true);
  assert.ok(plan.fullDocumentTokens>=2050);
  assert.equal(plan.fullCandidate,expected,
    "The entire answer was a goal-conditioned plan, not next-character teacher forcing");
  assert.equal(plan.novelDocument,true);
  assert.ok(plan.path.length>=2);
  assert.ok(plan.field[0]>0);
  assert.ok(plan.path.every(p=>p.verified===false));
  const result=brain.execute(plan,{step:physics,observe:false});
  if(result.solved&&result.fullActual===expected&&result.allMovesVerified)successes++;
  else failures.push({x,y,reason:"Independent physics disagreed",trace:result.trace});
  actions+=plan.path.length;
  explored+=plan.world.states.length;
  totalCharacters+=expected.length;
  minSteps=Math.min(minSteps,plan.path.length);maxSteps=Math.max(maxSteps,plan.path.length);
  minNodes=Math.min(minNodes,plan.world.states.length);maxNodes=Math.max(maxNodes,plan.world.states.length);
 }
 const ms=performance.now()-t0;
 const raw={distinctUnseenNumericGoals:56,
  correctFullDocuments:successes,incorrect:failures.length,
  fullExactRate:successes/56,
  totalFullAnswerCharacters:totalCharacters,
  inputTokensPerDocument:"2050+",
  minPlannedActionSteps:minSteps,maxPlannedActionSteps:maxSteps,
  meanPlannedActionSteps:actions/Math.max(1,successes),
  exploredStatesMean:explored/Math.max(1,successes),
  exploredStatesRange:[minNodes,maxNodes],
  CPUHeldoutDurationMs:+ms.toFixed(1),
  fullOutputMiBPerSecond:+(totalCharacters/1048576/(ms/1000)).toFixed(3),
  operatorObservations:brain.observedPairs,
  originalPlanningLaw:"Discoverer.shape",
  outsideWorldStepVerification:true,
  outputLearnedDuringHeldout:false,
  answerHiddenUntilScoring:true,
  naturalLanguageSemanticGeneralizationProven:false,
  CUDAProven:false,failures:failures.slice(0,12)};
 console.log("V24_56_DIFFERENT_LONG_HELDOUT_SHAPES",JSON.stringify(raw));
 assert.equal(learnedSnapshot(),before,
  "Heldout scoring can update last-run diagnostics, but MUST NOT mutate the learned action field, evidence, or physical-feedback history");
 assert.equal(failures.length,0,"Harder distinct goals must remain visible failures until actually solved");
 assert.equal(successes,56);
});
