// V37 450 authentic human SQuAD DEV answer first-error forensics.
// All gold reference text is passed ONLY AFTER the original native Brain
// completed its entire route. No oracle changes to candidate generation.
// Uses exactly the V35 original 2400 TRAIN / 450 DEV benchmark selection.
import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import {Brain} from "../transcend/torus-aether/devour/brain.mjs";
import {KIND,playExercise} from "../transcend/torus-aether/worlds/exercise.mjs";
import {makeMaze,seedOf,SEEDS} from "../transcend/torus-aether/worlds/labyrinth.mjs";
import {NativeRealTextEvidencePaths} from "../research/text-hypermaze/real-squad-evidence-paths.mjs";
import {auditFrozenRealEvidencePath}
 from "../research/text-hypermaze/frozen-source-evidence-forensics.mjs";
const base="https://rajpurkar.github.io/SQuAD-explorer/dataset/";
async function read(file) {
 const r=await fetch(base+file,{signal:AbortSignal.timeout(120000)});
 if(!r.ok)throw Error("No official source; real-data forensic requires actual SQuAD");
 const s=await r.text(),sha=crypto.createHash("sha256").update(s).digest("hex"),
  json=JSON.parse(s),rows=[];
 for(const a of json.data)for(const p of a.paragraphs)
  for(const q of p.qas)rows.push({question:q.question,context:p.context,
   answer:q.answers[0].text,answerStart:q.answers[0].answer_start,
   answers:q.answers.map(x=>x.text),id:q.id,article:a.title});
 return {sha,rows};
}
const sample=(a,n)=>Array.from({length:n},(_,i)=>a[Math.floor((i+.5)*a.length/n)]);
const original=()=>{
 const b=new Brain({rules:{depth:1,off:["R2","R4"],budEvery:100,empty:true,maxWires:32,fold:false},seed:11});
 for(let i=0;i<140;i++){
  const w=makeMaze(seedOf(SEEDS.train,501+i*23),[7,9,11][i%3]);
  playExercise(w,b.disc);
  if(i>=25&&b.disc.attract(KIND.target)>.2&&b.disc.conduct(KIND.floor)>=.5&&b.disc.self()>=0)break;
 }
 assert.ok(b.disc.attract(KIND.target)>.2);
 return b;
};
test("All 450 authentic previously-unseen human-question failures classify using FULL real native source graph AFTER frozen answer",{
 timeout:1000000
},async()=>{
 const [train,dev]=await Promise.all([read("train-v1.1.json"),read("dev-v1.1.json")]);
 assert.equal(train.sha,"3527663986b8295af4f7fcdff1ba1ff3f72d07d61a20f487cb238a6ef92fd955");
 assert.equal(dev.sha,"95aa6a52d5d6a735563366753ca50492a658031da74f301ac5238b03966972c9");
 const training=sample(train.rows,2400),heldout=sample(dev.rows,450),
  trainArticles=new Set(training.map(x=>x.article));
 assert.ok(heldout.every(r=>!trainArticles.has(r.article)));
 const learner=new NativeRealTextEvidencePaths(original()),
  trainReport=learner.train(training,{epochs:2}),before=learner.memory.updates,
  tally={},samples=[],worst=[];
 let totalNodes=0,totalEdges=0,rawExact=0,presentExact=0,presentNormalized=0;
 for(let i=0;i<heldout.length;i++){
  const row=heldout[i];
  const pred=learner.plan({question:row.question,context:row.context,includeAtlas:true});
  assert.ok(pred.found&&pred.atlas?.completeRetainedSourceCandidates);
  const audit=auditFrozenRealEvidencePath(pred,row.context,{answers:row.answers,questionId:row.id});
  tally[audit.status]=(tally[audit.status]||0)+1;
  totalNodes+=audit.completeGraphNodes;totalEdges+=audit.completeGraphEdges;
  rawExact+=+audit.exact;
  presentExact+=+audit.anyExactCorrectGoalPresent;
  presentNormalized+=+audit.anyCanonicalCorrectGoalPresent;
  if(i<6)samples.push({
   id:row.id,question:row.question.slice(0,105),
   predicted:pred.predicted.slice(0,80),
   reason:audit.status,correctGoalRank:audit.correctRawGoalRankInGraph,
   frozenNativePotential:audit.originalValueAtStart,
   sourceNodes:audit.completeGraphNodes
  });
  if(!audit.exact&&audit.anyCanonicalCorrectGoalPresent&&worst.length<8)
   worst.push({id:row.id,question:row.question.slice(0,90),
    reason:audit.status,correctGoalRank:audit.correctCanonicalGoalRankInGraph,
    learnedChosenScore:audit.chosenLearnedGoalScore,
    learnedCorrectScore:audit.bestLearnedCanonicalGoalScore});
 }
 assert.equal(learner.memory.updates,before,"Posthoc user-visible atlas may NOT retrain");
 assert.equal(rawExact,62,"Freeze the independent original V35 62/450 baseline before introducing a new feature");
 assert.equal(Object.values(tally).reduce((a,b)=>a+b,0),450);
 console.log("V37_REAL_SQUAD_POSTHOC_MISSING_PATH_ATLAS",JSON.stringify({
  source:"Official Stanford SQuAD v1.1",
  originalBrain:true,realTrainQuestions:2400,frozenDevQuestions:450,
  sourceArticlesDisjoint:true,
  referenceOnlyExaminedAfterFrozenOriginalFullRoute:true,
  exactOriginalAnswerSuccess:rawExact,
  referenceAnswerPresentAsExactSourceCandidate:presentExact,
  referenceAnswerPresentAsCanonicalSourceCandidate:presentNormalized,
  diagnosedOutcomes:tally,
  inspectedCompleteOriginalAtlasStates:totalNodes,
  inspectedCompleteOriginalAtlasEdges:totalEdges,
  trainingSourceEvidence:trainReport.accepted,
  examples:samples,rankedCorrectGoldFailures:worst,
  meaning:"Distinguish incomplete source state inventory from wrong ranking. No reference answer used to construct or plan an unseen path."
 }));
});
test("Forensic posthoc API refuses to inspect answer without genuine immutable original source atlas",()=>{
 assert.throws(()=>auditFrozenRealEvidencePath({found:false},"context",{answers:["x"]}),
  /Frozen complete native original source atlas/);
 assert.throws(()=>auditFrozenRealEvidencePath({found:true,originalMotor:"fake"},"context",{answers:["x"]}),
  /Frozen complete native original source atlas/);
});
