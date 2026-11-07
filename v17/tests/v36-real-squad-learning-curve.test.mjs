// V36 — real human-written QA scaling, direct-ranker and native-shape causal
// ablations, with entirely independent official Stanford SQuAD DEV articles.
// No hidden answer tokens enter inference, no pretrained transformer or
// artificially generated questions, no replacement original Brain.
import test from "node:test";
import assert from "node:assert/strict";
import {performance} from "node:perf_hooks";
import crypto from "node:crypto";
import {Brain} from "../transcend/torus-aether/devour/brain.mjs";
import {KIND,playExercise} from "../transcend/torus-aether/worlds/exercise.mjs";
import {makeMaze,seedOf,SEEDS} from "../transcend/torus-aether/worlds/labyrinth.mjs";
import {NativeRealTextEvidencePaths} from "../research/text-hypermaze/real-squad-evidence-paths.mjs";

const corpus="https://rajpurkar.github.io/SQuAD-explorer/dataset/";
async function fetchOfficial(file){
 const res=await fetch(corpus+file,{signal:AbortSignal.timeout(120000),
  headers:{"accept":"application/json","user-agent":"MagicPerspective-V36-independent-evidence-analysis"}});
 if(!res.ok)throw Error("Missing OFFICIAL original Stanford source: "+res.status);
 const raw=await res.text(),sha=crypto.createHash("sha256").update(raw).digest("hex"),
  j=JSON.parse(raw),rows=[];
 assert.equal(j.version,"1.1");
 for(const article of j.data)for(const passage of article.paragraphs)
  for(const qa of passage.qas)rows.push({
   id:qa.id,question:qa.question,context:passage.context,
   sourceArticle:article.title,answer:qa.answers[0].text,
   answerStart:qa.answers[0].answer_start,
   allAnswers:qa.answers.map(a=>a.text)
  });
 return {sha,rows,articles:j.data.length,bytes:Buffer.byteLength(raw,"utf8")};
}
const sample=(source,n)=>{
 const out=[];
 for(let i=0;i<n;i++)out.push(source[Math.floor((i+.5)*source.length/n)]);
 assert.equal(new Set(out.map(x=>x.id)).size,out.length,"No sampled question duplicates");
 return out;
};
function origin(){
 const b=new Brain({rules:{depth:1,off:["R2","R4"],budEvery:100,empty:true,maxWires:32,fold:false},seed:11});
 for(let i=0;i<145;i++){
  const w=makeMaze(seedOf(SEEDS.train,501+i*23),[7,9,11][i%3]);
  playExercise(w,b.disc);
  if(i>=25&&b.disc.attract(KIND.target)>.2&&b.disc.conduct(KIND.floor)>=.5&&b.disc.self()>=0)break;
 }
 assert.ok(b.disc.attract(KIND.target)>.2&&b.disc.conduct(KIND.floor)>=.5);
 return b;
}
const normalize=s=>String(s).toLowerCase()
 .replace(/[^\p{L}\p{N}\s]/gu," ").replace(/\b(a|an|the)\b/gu," ")
 .replace(/\s+/gu," ").trim();
const exact=(v,row)=>row.allAnswers.includes(v);
const canon=(v,row)=>row.allAnswers.some(a=>normalize(a)===normalize(v));
test("Real-SQuAD learning curve from 600 -> 2,400 -> 9,000 source questions; same 600 frozen human DEV questions; direct-vs-native causal controls",{
 timeout:1200000
},async()=>{
 const t0=performance.now(),[train,dev]=await Promise.all([
  fetchOfficial("train-v1.1.json"),fetchOfficial("dev-v1.1.json")]);
 assert.ok(train.rows.length>=87000&&dev.rows.length>=10500);
 assert.equal(train.sha,"3527663986b8295af4f7fcdff1ba1ff3f72d07d61a20f487cb238a6ef92fd955");
 assert.equal(dev.sha,"95aa6a52d5d6a735563366753ca50492a658031da74f301ac5238b03966972c9");
 const frozen=sample(dev.rows,600),trainTitles=new Set(train.rows.map(x=>x.sourceArticle));
 assert.ok(frozen.every(x=>!trainTitles.has(x.sourceArticle)),"One whole DEV article leaked into TRAIN");
 const summaries=[],trainingSizes=[600,2400,9000];
 let untrainedNativeRate=null,untrainedNativeCorrect=null;
 for(const count of trainingSizes){
  const begin=performance.now(),b=origin(),learner=new NativeRealTextEvidencePaths(b);
  const examples=sample(train.rows,count),training=learner.train(examples,{epochs:2});
  const oldWeights=learner.memory.weights.size,oldUpdates=learner.memory.updates;
  const scores={heldout:frozen.length,nativeExact:0,nativeNormalized:0,
   directExact:0,directNormalized:0,
   directNativeAgree:0,untrainedNativeExact:0,wrongQuestionExact:0};
  const observedFirstFailures=[];
  const tokenHashes=new Set(examples.map(x=>crypto.createHash("sha256").update(x.question).digest("hex")));
  for(let i=0;i<frozen.length;i++){
   const row=frozen[i],qh=crypto.createHash("sha256").update(row.question).digest("hex");
   assert.ok(!tokenHashes.has(qh),"Source-train question leakage");
   const natural=learner.plan({question:row.question,context:row.context});
   const direct=learner.rankDirectly({question:row.question,context:row.context});
   assert.ok(natural.found&&direct.found);
   assert.equal(natural.originalMotor,"Discoverer.shapeGraph");
   assert.equal(natural.referenceAnswerProvided,false);
   assert.equal(natural.candidateSourceOnly,true);
   assert.ok(row.context.includes(natural.predicted),"No unsupported text can be created by inference");
   const same=natural.predicted===direct.predicted;
   scores.directNativeAgree+=+same;
   scores.nativeExact+=+exact(natural.predicted,row);
   scores.nativeNormalized+=+canon(natural.predicted,row);
   scores.directExact+=+exact(direct.predicted,row);
   scores.directNormalized+=+canon(direct.predicted,row);
   if(count===600){
    const zero=learner.plan({question:row.question,context:row.context,useLearnedPreference:false});
    scores.untrainedNativeExact+=+exact(zero.predicted,row);
   }
   if(count===9000){
    const wrongQuestion=frozen[(i+113)%frozen.length].question;
    const wrong=learner.plan({question:wrongQuestion,context:row.context});
    scores.wrongQuestionExact+=+exact(wrong.predicted,row);
   }
   if(!same&&observedFirstFailures.length<5)
    observedFirstFailures.push({questionId:row.id,native:natural.predicted,
     direct:direct.predicted,reason:"route-and-ranker-differ-despite-shared-observed-source"});
   assert.equal(learner.memory.updates,oldUpdates,"Real frozen test trained model weights");
  }
  assert.equal(learner.memory.weights.size,oldWeights);
  assert.equal(scores.directNativeAgree,600,
   "The direct-span ranker and native goal-shape path disagree: cannot attribute semantic gain to source ranker without audit");
  if(count===600){untrainedNativeCorrect=scores.untrainedNativeExact;untrainedNativeRate=scores.untrainedNativeExact/600;}
  summaries.push({trainedOriginalRealQuestions:count,epochs:2,
   independentRealDevQuestions:frozen.length,
   rawExact:scores.nativeExact,rawAccuracy:scores.nativeExact/frozen.length,
   normalizedExact:scores.nativeNormalized,normalizedAccuracy:scores.nativeNormalized/frozen.length,
   directSameExact:scores.directExact,exactPathRankAgreement:scores.directNativeAgree,
   wrongQuestionExact:scores.wrongQuestionExact,
   noTrainingBaselineExact:scores.untrainedNativeExact,
   acceptedOriginalLabels:training.accepted,
   unrepresentableTrainExposures:training.unrepresentable,
   learnedParameterKeys:training.features,
   originalMazeEpisodes:b.disc.episodes,
   milliseconds:performance.now()-begin,divergences:observedFirstFailures});
  console.log("V36_SQUAD_PROGRESSIVE_MODEL",JSON.stringify(summaries.at(-1)));
 }
 assert.ok(summaries[2].rawExact>untrainedNativeCorrect,
  "No real improvement over an original attraction field without question-source learning");
 console.log("V36_AUTHENTIC_SQUAD_CAUSAL_LEARNING_CURVE",JSON.stringify({
  humanTrainingSizeConfigs:trainingSizes,
  trainSha256:train.sha,devSha256:dev.sha,
  trainArticles:train.articles,devArticles:dev.articles,
  fixedHeldoutDevQuestionCount:frozen.length,
  zeroLearnedPreferenceExact:untrainedNativeCorrect,
  zeroLearnedPreferenceAccuracy:untrainedNativeRate,
  fullReproducibleResults:summaries,
  nativeShapeAnswerIsIdenticalToDirectRanker:true,
  interpretation:"Learned question/evidence-score drives the short extractive answer gain. Original shapeGraph builds and traverses the real source graph, but does not improve the single-hop span selected by the ranker.",
  limitation:"SQuAD given passage and supervised answer-span training; NOT unknown-answer goal discovery for unrestricted OpenThoughts long-form tasks.",
  totalMilliseconds:performance.now()-t0
 }));
});
