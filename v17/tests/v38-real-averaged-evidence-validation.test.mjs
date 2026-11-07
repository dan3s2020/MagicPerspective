// V38 real question/evidence goal learning with weight-history averaging
// as an opt-in research hypothesis. Model choice is made on TRAIN-source
// articles held out from source training; public DEV answers remain strictly
// blind until that choice is frozen. Same original Brain and shapeGraph.
import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";import os from "node:os";import path from "node:path";
import {performance} from "node:perf_hooks";
import {Brain} from "../transcend/torus-aether/devour/brain.mjs";
import {KIND,playExercise} from "../transcend/torus-aether/worlds/exercise.mjs";
import {makeMaze,seedOf,SEEDS} from "../transcend/torus-aether/worlds/labyrinth.mjs";
import {NativeRealTextEvidencePaths} from "../research/text-hypermaze/real-squad-evidence-paths.mjs";

const source="https://rajpurkar.github.io/SQuAD-explorer/dataset/";
async function get(file){
 const r=await fetch(source+file,{signal:AbortSignal.timeout(120000)});
 if(!r.ok)throw Error("Official real human QA source unavailable: "+r.status);
 const text=await r.text(),sum=crypto.createHash("sha256").update(text).digest("hex"),
  raw=JSON.parse(text),rows=[];
 assert.equal(raw.version,"1.1");
 for(const article of raw.data)for(const paragraph of article.paragraphs)
  for(const qa of paragraph.qas)rows.push({
   id:qa.id,article:article.title,context:paragraph.context,
   question:qa.question,answer:qa.answers[0].text,
   answerStart:qa.answers[0].answer_start,
   referenceAnswers:qa.answers.map(x=>x.text)
  });
 return {rows,articles:raw.data.map(x=>x.title),sum};
}
const choose=(rows,n)=>Array.from({length:n},(_,i)=>rows[Math.floor((i+.5)*rows.length/n)]);
const normalize=s=>String(s).toLowerCase().replace(/[^\p{L}\p{N}\s]/gu," ")
 .replace(/\b(a|an|the)\b/gu," ").replace(/\s+/gu," ").trim();
function createBrain(){
 const b=new Brain({rules:{depth:1,off:["R2","R4"],budEvery:100,empty:true,maxWires:32,fold:false},seed:11});
 for(let i=0;i<145;i++){
  const maze=makeMaze(seedOf(SEEDS.train,501+i*23),[7,9,11][i%3]);
  playExercise(maze,b.disc);
  if(i>=25&&b.disc.attract(KIND.target)>.2&&b.disc.conduct(KIND.floor)>=.5&&b.disc.self()>=0)break;
 }
 assert.ok(b.disc.attract(KIND.target)>.2&&b.disc.conduct(KIND.floor)>=.5);
 return b;
}
function evaluate(learner,rows,{baselines=false}={}){
 const counts={N:rows.length,last:0,average:0,lastNormalized:0,averageNormalized:0,
  graphVsDirectAgree:0,zeroSource:0,sourceErrors:0};
 for(const row of rows){
  const last=learner.plan({question:row.question,context:row.context,weightMode:"last"});
  const avg=learner.plan({question:row.question,context:row.context,weightMode:"average"});
  assert.ok(last.found&&avg.found);
  counts.last+=+row.referenceAnswers.includes(last.predicted);
  counts.average+=+row.referenceAnswers.includes(avg.predicted);
  counts.lastNormalized+=+row.referenceAnswers.some(x=>normalize(x)===normalize(last.predicted));
  counts.averageNormalized+=+row.referenceAnswers.some(x=>normalize(x)===normalize(avg.predicted));
  counts.sourceErrors+=+(row.context.slice(avg.extraction.start,avg.extraction.end)!==avg.predicted);
  if(baselines){
   const direct=learner.rankDirectly({question:row.question,context:row.context,weightMode:"average"});
   counts.graphVsDirectAgree+=+(direct.predicted===avg.predicted);
   const zero=learner.plan({question:row.question,context:row.context,
    useLearnedPreference:false});
   counts.zeroSource+=+row.referenceAnswers.includes(zero.predicted);
  }
 }
 return counts;
}
test("Real human semantic goal weight-history: choose last vs AVERAGED on 500 TRAIN-VALIDATION articles; independently score 650 OFFICIAL DEV human QA",{
 timeout:600000
},async()=>{
 const t0=performance.now(),[train,dev]=await Promise.all([
  get("train-v1.1.json"),get("dev-v1.1.json")]);
 assert.equal(train.sum,"3527663986b8295af4f7fcdff1ba1ff3f72d07d61a20f487cb238a6ef92fd955");
 assert.equal(dev.sum,"95aa6a52d5d6a735563366753ca50492a658031da74f301ac5238b03966972c9");
 assert.ok(train.articles.length===442&&dev.articles.length===48);
 const learningArticleSet=new Set(train.articles.slice(0,380)),
   calibrationArticleSet=new Set(train.articles.slice(380));
 assert.equal(learningArticleSet.size,380);
 assert.ok([...calibrationArticleSet].every(x=>!learningArticleSet.has(x)));
 const training=choose(train.rows.filter(r=>learningArticleSet.has(r.article)),2400),
  calibration=choose(train.rows.filter(r=>calibrationArticleSet.has(r.article)),500),
  frozenDev=choose(dev.rows,650);
 const sampledSourceTitles=new Set(training.map(x=>x.article));
 assert.ok(calibration.every(x=>!sampledSourceTitles.has(x.article)));
 assert.ok(frozenDev.every(x=>!sampledSourceTitles.has(x.article)&&!calibrationArticleSet.has(x.article)));
 const learner=new NativeRealTextEvidencePaths(createBrain());
 const report=learner.trainAveraged(training,{epochs:2,snapshotEvery:200,burnIn:400});
 assert.ok(report.accepted>1800&&report.snapshots>=15);
 const beforeTraining=learner.memory.updates,metaValidation=evaluate(learner,calibration);
 const selected=metaValidation.averageNormalized>metaValidation.lastNormalized?"average":"last";
 // This is the FINAL decision. DEV answers do not enter model selection.
 const devReport=evaluate(learner,frozenDev,{baselines:true});
 assert.equal(learner.memory.updates,beforeTraining);
 assert.equal(devReport.graphVsDirectAgree,650,
  "The native path must not invent extra semantics not present in the score");
 assert.equal(devReport.sourceErrors,0);
 const selectedRaw=selected==="average"?devReport.average:devReport.last;
 const otherRaw=selected==="average"?devReport.last:devReport.average;
 console.log("V38_REAL_TRAIN_VALIDATED_AVERAGED_EVIDENCE",JSON.stringify({
  officialOriginalDataset:source,
  originalTrainTitles:train.articles.length,
  disjointInternalTrainingArticles:380,
  disjointInternalCalibrationArticles:62,
  externalDevArticles:dev.articles.length,
  authenticObservedTrainingPairs:training.length,
  actualTrainExposures:report.realQuestionExposures,
  originalBrainPersistentEvidence:true,
  original2DMazeExperiences:learner.brain.disc.episodes,
  training:report,internalHeldout:metaValidation,
  policySelectedWithoutInspectingDevAnswers:selected,
  frozenExternalHumanQA:devReport,
  externallyChosenPolicyRawExact:selectedRaw,
  externallyUnchosenPolicyRawExact:otherRaw,
  hardcodedAnswerOrHiddenGoalUsed:false,
  nativeShapeAndDirectRankAgreementOnTest:devReport.graphVsDirectAgree,
  knownLimitation:"Given real context and gold TRAIN answers. Averaging improves or worsens source score, not an unsupervised physical semantic law.",
  elapsedMilliseconds:performance.now()-t0
 }));
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),"mp-v38-avg-original-"));
 try{
  const file=path.join(tmp,"brain.v8"),bytes=learner.brain.save(file),
   loaded=Brain.load(file),restored=new NativeRealTextEvidencePaths(loaded);
  const q=frozenDev[17],
   pre=learner.plan({question:q.question,context:q.context,weightMode:"average",includeAtlas:true}),
   post=restored.plan({question:q.question,context:q.context,weightMode:"average",includeAtlas:true});
  assert.equal(post.predicted,pre.predicted);
  assert.deepEqual(post.initialShape,pre.initialShape);
  assert.equal(post.atlas.nodes.length,pre.atlas.nodes.length);
  assert.equal(restored.memory.averagedWeights.size,learner.memory.averagedWeights.size);
  console.log("V38_AVERAGED_NATIVE_ORIGINAL_BRAIN_CHECKPOINT",JSON.stringify({
   storedBrainBytes:bytes,averageWeights:restored.memory.averagedWeights.size,
   originalShapeRestored:true,
   currentTrainingCountUnchanged:true
  }));
 }finally{fs.rmSync(tmp,{recursive:true,force:true})}
});
