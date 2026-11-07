// Native MagicPerspective V31 real-world SCALE acceptance.
// Fetches OFFICIAL OpenThoughts3-1.2M HUMAN question + assistant answer rows.
// No generated fixture, answer leakage, synthetic fallback, privileged goal,
// truncation of real long replies, or token-role guessing.
// Existing original Brain, original native Q/A role learner and shape motor.
// This test measures true frozen raw FULL-answer correctness and failures.
import test from "node:test";
import assert from "node:assert/strict";
import {performance} from "node:perf_hooks";
import {createHash} from "node:crypto";
import {Brain} from "../transcend/torus-aether/devour/brain.mjs";
import {NativeGoalTextMaze} from "../research/text-hypermaze/goal-conditioned-native.mjs";
import {qaPairsFromRealJSON} from "../research/text-hypermaze/openthoughts-jsonl-source.mjs";
import {tokenizeObservation} from "../transcend/torus-aether/worlds/observed-transformations.mjs";
import {KIND,playExercise} from "../transcend/torus-aether/worlds/exercise.mjs";
import {makeMaze,seedOf,SEEDS} from "../transcend/torus-aether/worlds/labyrinth.mjs";

const source="https://datasets-server.huggingface.co/rows";
const dataset="open-thoughts/OpenThoughts3-1.2M";
async function getRealRows(offset,length){
 const qs=new URLSearchParams({dataset,config:"default",split:"train",
  offset:String(offset),length:String(length)});
 const res=await fetch(source+"?"+qs,{
  signal:AbortSignal.timeout(90000),
  headers:{accept:"application/json","user-agent":"MagicPerspective-V31-real-natural-answer-audit"}
 });
 if(!res.ok)throw Error("Authentic public dataset API HTTP "+res.status+" for offset "+offset);
 const j=await res.json();
 if(!Array.isArray(j.rows)||j.rows.length!==length)
  throw Error("Real dataset endpoint returned missing rows; NO synthetic replacement");
 return j.rows.map((x,i)=>{
  assert.equal(x.row_idx,offset+i,"Dataset row index mismatch");
  const pairs=qaPairsFromRealJSON(x.row);
  assert.equal(pairs.length,1,"Need one genuine human/assistant pair");
  return {question:pairs[0].question,answer:pairs[0].answer,offset:offset+i,
   rawBytes:Buffer.byteLength(JSON.stringify(x.row),"utf8")};
 });
}
function originalBrain(){
 const brain=new Brain({rules:{depth:1,off:["R2","R4"],budEvery:100,empty:true,maxWires:32,fold:false},seed:11});
 for(let i=0;i<145;i++){
  const w=makeMaze(seedOf(SEEDS.train,501+i*23),[7,9,11][i%3]);playExercise(w,brain.disc);
  if(i>=25&&brain.disc.attract(KIND.target)>.2&&brain.disc.conduct(KIND.floor)>=.5&&brain.disc.self()>=0)break;
 }
 assert.ok(brain.disc.attract(KIND.target)>.2&&brain.disc.conduct(KIND.floor)>=.5);
 return brain;
}
test("OFFICIAL 144 public OpenThoughts3 human Q/A rows: 120 original Brain training examples, 24 FROZEN natural full-answer tests (no fallback)",{
 timeout:390000
},async()=>{
 const t0=performance.now(),offsets=[0,210000,810000],perWindow=52,
  blocks=await Promise.all(offsets.map(offset=>getRealRows(offset,perWindow)));
 const fetched=blocks.flat(),seen=new Set(),distinct=[];
 for(const row of fetched){
  const questionKey=row.question.normalize("NFC").trim();
  if(seen.has(questionKey))continue;
  seen.add(questionKey);distinct.push(row);
 }
 assert.ok(distinct.length>=144,"Insufficient distinct natural questions; NO synthetic replacement");
 const rows=distinct.slice(0,144);
 assert.equal(new Set(rows.map(x=>x.question)).size,144,
  "Heldout questions must be deduplicated BEFORE the train/test split");
 const model=new NativeGoalTextMaze(originalBrain(),{
  maxStates:2500,maxDepth:6,geometryWeight:0,sharedPolicyWeight:0});
 const training=[],heldout=[];
 for(let i=0;i<rows.length;i++)(i%6===5?heldout:training).push(rows[i]);
 assert.equal(training.length,120);assert.equal(heldout.length,24);
 let qTokens=0,aTokens=0,trainingBytes=0,longEpisodes=0,learnerAccepted=0;
 const sourceHashes=new Set();
 for(const row of training){
  const result=model.observeQA(row.question,row.answer);
  const q=tokenizeObservation(row.question),a=tokenizeObservation(row.answer);
  qTokens+=q.length;aTokens+=a.length;trainingBytes+=row.rawBytes;
  longEpisodes+=+(q.length>128||a.length>128);
  learnerAccepted+=+!!result.learned;
  sourceHashes.add(createHash("sha256").update(row.question).digest("hex"));
 }
 const reasons={},tests=[],predictions=[];
 let exact=0,coverage=0,nonempty=0,goalPath=0;
 for(const row of heldout){
  const prediction=model.planQA({question:row.question});
  const expected=row.answer;
  const got=prediction.predicted??null;
  coverage+=+!!prediction.found;
  exact+=+(got!==null&&got===expected);
  nonempty+=+(typeof got==="string"&&got.length>0);
  goalPath+=+(prediction.found&&prediction.plannedBeforeFirstAction);
  reasons[prediction.reason||"found"]=(reasons[prediction.reason||"found"]||0)+1;
  const qHash=createHash("sha256").update(row.question).digest("hex");
  assert.equal(sourceHashes.has(qHash),false,"Test question leaked to original Brain");
  assert.equal(model.brain.qaRoleEvidence.examples.some(x=>
   x.question===row.question),false,"Original Brain stored hidden query");
  // Never store the full answer in the benchmark output.
  tests.push({offset:row.offset,questionTokens:tokenizeObservation(row.question).length,
   answerTokens:tokenizeObservation(expected).length,found:prediction.found,
   fullRawExact:got===expected&&got!==null,reason:prediction.reason??null});
  if(prediction.found&&predictions.length<3)
   predictions.push({offset:row.offset,steps:prediction.actions.length,
    source:"native original Discoverer.shapeGraph",referenceAnswerUsed:false});
 }
 assert.equal(model.brain.qaRoleEvidence.seen,120);
 assert.ok(trainingBytes>100000,"Expected substantive original natural language dataset");
 console.log("V31_REAL_OPENTHOUGHTS3_144_NATIVE_QA",JSON.stringify({
  dataset,officialSource:true,
  offsetWindows:offsets,sourceRowsPerWindow:perWindow,sourceRowsFetched:fetched.length,
  duplicateQuestionRowsRemoved:fetched.length-distinct.length,distinctRowsUsed:rows.length,
  genuinelyObservedTrainingQA:training.length,genuinelyUnseenHeldoutQA:heldout.length,
  originalNativeBrain:true,
  originalMazeTrainingEpisodes:model.brain.disc.episodes,
  trainingRealJSONBytes:trainingBytes,trainingQuestionTokens:qTokens,
  trainingAnswerTokens:aTokens,trainingLongEpisodes:longEpisodes,
  trainingQAAxesAccepted:learnerAccepted,
  learnedQuestionAnswerContrasts:model.brain.qaRoleEvidence.edges.length,
  completeHeldoutGoalPathCoverage:goalPath,
  heldoutFullAnswerRawExact:exact,heldoutFullAnswerRawAccuracy:exact/heldout.length,
  nonemptyPredictions:nonempty,reasonCounts:reasons,
  testMetadata:tests,successfulPredictions:predictions,
  totalElapsedMilliseconds:performance.now()-t0,
  acceptance:"FAIL if synthetically generated, leaked, missing real rows, or native data were altered. Exact QA accuracy is REPORTED, never faked.",
  limitation:"This is a real failure-sensitive external natural Q/A audit; it does NOT train a new semantic model."
 }));
});
