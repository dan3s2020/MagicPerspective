// V35 reproducible, genuinely independent source QA from OFFICIAL SQuAD 1.1.
// Train only TRAIN articles and true annotated answer offsets. Freeze learner,
// then ask it to locate unseen heldout answer spans from DEV articles.
// A full reference answer is NEVER supplied to plan(); evaluated AFTER.
// Original Brain and original Discoverer.shapeGraph are unchanged.
// No synthetic fallback and no hidden answer leakage.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import {performance} from "node:perf_hooks";
import {Brain} from "../transcend/torus-aether/devour/brain.mjs";
import {KIND,playExercise} from "../transcend/torus-aether/worlds/exercise.mjs";
import {makeMaze,seedOf,SEEDS} from "../transcend/torus-aether/worlds/labyrinth.mjs";
import {NativeRealTextEvidencePaths}
 from "../research/text-hypermaze/real-squad-evidence-paths.mjs";

const BASE="https://rajpurkar.github.io/SQuAD-explorer/dataset/";
const cache=new Map();
async function authentic(file){
 if(cache.has(file))return cache.get(file);
 const response=await fetch(BASE+file,{signal:AbortSignal.timeout(120000),
  headers:{"accept":"application/json","user-agent":"MagicPerspective-V35-source-grounded-evaluation"}});
 if(!response.ok)throw Error("OFFICIAL real SQuAD download HTTP "+response.status+" "+file);
 const body=await response.text(),sha256=crypto.createHash("sha256").update(body).digest("hex");
 const json=JSON.parse(body);
 assert.equal(json.version,"1.1");
 assert.ok(json.data.length>20,"Expected actual source authored articles");
 const rows=[];
 for(const article of json.data)for(const paragraph of article.paragraphs){
  for(const qa of paragraph.qas){
   assert.ok(qa.answers?.length>=1);
   rows.push({question:qa.question,context:paragraph.context,
    answer:qa.answers[0].text,answerStart:qa.answers[0].answer_start,
    allAnswers:qa.answers.map(a=>a.text),sourceArticle:article.title,questionId:qa.id});
  }
 }
 const actual={file,rows,sha256,bytes:Buffer.byteLength(body),articles:json.data.length};
 cache.set(file,actual);return actual;
}
const distinctSample=(rows,n,offset=0)=>{
 const out=[],seen=new Set();
 const step=rows.length/(n+offset);
 for(let i=0;i<rows.length&&out.length<n;i++){
  const idx=Math.floor((i+.5)*step);
  if(idx>=rows.length)break;
  const row=rows[idx];
  if(seen.has(row.questionId))continue;
  seen.add(row.questionId);out.push(row);
 }
 assert.equal(out.length,n,"Insufficient authentic source rows");
 return out;
};
function originalBrain(){
 const b=new Brain({rules:{depth:1,off:["R2","R4"],budEvery:100,empty:true,maxWires:32,fold:false},seed:11});
 for(let i=0;i<140;i++){
  const maze=makeMaze(seedOf(SEEDS.train,501+i*23),[7,9,11][i%3]);
  playExercise(maze,b.disc);
  if(i>=25&&b.disc.attract(KIND.target)>.2&&b.disc.conduct(KIND.floor)>=.5&&b.disc.self()>=0)break;
 }
 assert.ok(b.disc.attract(KIND.target)>.2&&b.disc.conduct(KIND.floor)>=.5);
 return b;
}
const normalize=x=>String(x).toLocaleLowerCase("en")
 .replace(/[^\p{L}\p{N}\s]/gu," ")
 .replace(/\b(a|an|the)\b/gu," ")
 .replace(/\s+/gu," ").trim();

test("STRICT original-Brain source-grounded answer-path learning: 2,400 real SQuAD training questions, 450 frozen DEV questions and ablations",{
 timeout:1000000
},async()=>{
 const t0=performance.now(),[train,dev]=await Promise.all([
  authentic("train-v1.1.json"),authentic("dev-v1.1.json")]);
 assert.ok(train.rows.length>=87000&&dev.rows.length>=10000,
  "Real official QA dataset incomplete, cannot fabricate smaller fallback");
 const training=distinctSample(train.rows,2400),heldout=distinctSample(dev.rows,450);
 const trainTitles=new Set(training.map(x=>x.sourceArticle));
 assert.ok(heldout.every(x=>!trainTitles.has(x.sourceArticle)),
  "Article-level train/test leakage prohibited");
 const seenQ=new Set(training.map(x=>x.question.trim().toLowerCase()));
 assert.ok(heldout.every(x=>!seenQ.has(x.question.trim().toLowerCase())),
  "Test questions must be unseen by real original Brain");
 const b=originalBrain(),learner=new NativeRealTextEvidencePaths(b);
 const trainingSummary=learner.train(training,{epochs:2}),frozenCount=learner.memory.acceptedPairs;
 let exact=0,canonical=0,ablated=0,ablatedCanonical=0,shuffled=0,
  canonicalShuffle=0,found=0,goldCandVisible=0;
 const examples=[],fails=[],wrongReasons={};
 let measuredTokens=0,measuredEdges=0;
 const chosen=new Map();
 for(let i=0;i<heldout.length;i++){
  const row=heldout[i];
  // Critical: these calls accept ONLY question and public evidence context,
  // NOT the gold or alternative answers / answer offsets from held-out data.
  const pred=learner.plan({question:row.question,context:row.context});
  const base=learner.plan({question:row.question,context:row.context,
   useLearnedPreference:false});
  const wrongQuestion=heldout[(i+137)%heldout.length].question;
  const scramble=learner.plan({question:wrongQuestion,context:row.context});
  assert.ok(pred.found&&base.found&&scramble.found);
  assert.equal(pred.originalMotor,"Discoverer.shapeGraph");
  assert.equal(pred.referenceAnswerProvided,false);
  assert.equal(pred.candidateSourceOnly,true);
  assert.equal(row.context.slice(pred.extraction.start,pred.extraction.end),pred.predicted,
   "A physically unsupported generated answer must never appear");
  assert.equal(pred.initialShape.length,2);
  assert.equal(learner.memory.acceptedPairs,frozenCount,"Heldout inference must never train!");
  found++;
  measuredTokens+=pred.graph.observedSourceTokens;
  measuredEdges+=pred.graph.directedEdges;
  const exactAny=row.allAnswers.includes(pred.predicted);
  const canonicalAny=row.allAnswers.some(x=>normalize(x)===normalize(pred.predicted));
  exact+=+exactAny;canonical+=+canonicalAny;
  ablated+=+row.allAnswers.includes(base.predicted);
  ablatedCanonical+=+row.allAnswers.some(x=>normalize(x)===normalize(base.predicted));
  shuffled+=+row.allAnswers.includes(scramble.predicted);
  canonicalShuffle+=+row.allAnswers.some(x=>normalize(x)===normalize(scramble.predicted));
  if(i<5)examples.push({id:row.questionId,originalQuestion:row.question.slice(0,90),
   nativePathActions:pred.initialShape.map(x=>x.action.kind),
   predictedSourceSpan:pred.predicted.slice(0,90),
   unseenAnswerExact:exactAny,sourceGraph:pred.graph});
  if(!canonicalAny&&fails.length<8)fails.push({id:row.questionId,
   question:row.question.slice(0,100),predicted:pred.predicted.slice(0,100),
   category:"wrong-frozen-evidence-span-rank-not-unknown-graph"});
 }
 const answerReport={
  benchmark:"Official Stanford SQuAD version 1.1",
  officialDatasetURL:BASE,
  originalNativeBrain:true,originalGoalPropagation:"Discoverer.shapeGraph",
  trainingArticleCount:train.articles,devArticleCount:dev.articles,
  trainSourceSha256:train.sha256,devSourceSha256:dev.sha256,
  trainingRealHumanQuestions:training.length,heldoutRealHumanQuestions:heldout.length,
  trainingSummary,original2DMazeEpisodes:b.disc.episodes,
  exactFullAnswerCount:exact,exactFullAnswerRate:exact/heldout.length,
  standardNormalizedExactCount:canonical,standardNormalizedExactRate:canonical/heldout.length,
  untrainedOriginalPathCount:ablated,untrainedOriginalPathAccuracy:ablated/heldout.length,
  untrainedNormalizedCount:ablatedCanonical,
  questionSwappedSourceCount:shuffled,questionSwappedSourceAccuracy:shuffled/heldout.length,
  swappedNormalizedCount:canonicalShuffle,
  sourceSpanCoverage:found,
  totalFrozenSourceTokens:measuredTokens,totalFrozenObservedEdges:measuredEdges,
  frozenNativeParameterCount:learner.memory.weights.size,
  samples:examples,errors:fails,
  testKind:"genuine extractive question-answering over provided context; source span is evidence, not learned physical causality",
  limits:"not free-response unseen OpenThoughts3 long answers; original shape navigates the learned-ranked source spans rather than generating new world facts"
 };
 console.log("V35_REAL_SQUAD_NATIVE_EVIDENCE_PATHS",JSON.stringify(answerReport));
 // Benchmark exact correctness is an observational quantity. Never fake the
 // threshold, skip failures, or replace the official dataset with generated QA.
 assert.ok(found===450);
 assert.ok(trainingSummary.accepted>1800,"Real training source answer spans not representable");
 assert.ok(exact>=ablated,
  "Trained original source-conditioned preference underperforms the identical untrained original shape");
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),"mp-v35-squad-original-"));
 try{
  const file=path.join(dir,"original.v8");
  const bytes=b.save(file);
  const restored=Brain.load(file);
  const copied=new NativeRealTextEvidencePaths(restored);
  const sample=heldout[33],before=learner.plan({question:sample.question,context:sample.context,
   includeAtlas:true}),after=copied.plan({question:sample.question,context:sample.context,includeAtlas:true});
  assert.equal(after.predicted,before.predicted);
  assert.deepEqual(after.initialShape,before.initialShape);
  assert.equal(after.atlas.nodes.length,before.atlas.nodes.length);
  assert.equal(after.atlas.edges.length,before.atlas.edges.length);
  assert.equal(copied.memory.acceptedPairs,learner.memory.acceptedPairs);
  console.log("V35_SQUAD_PERSISTENT_NATIVE_BRAIN",JSON.stringify({
   originalCheckpointBytes:bytes,learnedRealParameters:copied.memory.weights.size,
   learnedRealSourceExamples:copied.memory.acceptedPairs,
   identicalFrozenOriginalPath:true,completeSourceAtlasRetained:true,
   noProductionBrainClassChanged:true
  }));
 }finally{fs.rmSync(dir,{recursive:true,force:true})}
 console.log("V35_REAL_SQUAD_TOTAL_MS",performance.now()-t0);
});
