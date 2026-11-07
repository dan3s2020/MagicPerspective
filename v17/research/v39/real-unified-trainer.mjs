// MagicPerspective V39 original Brain trainer. One native Brain.v8 owns BOTH
// genuine 2D maze action learning, original Unicode corpus transformations
// and V38 evidence QA answer-selection weights. NO replacement GPT or demo.
// Complete QA source articles and real story bytes are never fabricated.
// Gold spans are supplied ONLY for SQuAD TRAIN; heldout DEV is evaluated
// with frozen original Discoverer.shapeGraph and no answer in the planner.
import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import crypto from "node:crypto";
import {setImmediate as yieldToEventLoop} from "node:timers/promises";
import {fileURLToPath} from "node:url";
import {Brain} from "../../transcend/torus-aether/devour/brain.mjs";
import {playExercise,KIND} from "../../transcend/torus-aether/worlds/exercise.mjs";
import {makeMaze,seedOf,SEEDS} from "../../transcend/torus-aether/worlds/labyrinth.mjs";
import {NativeRealTextEvidencePaths}
 from "../text-hypermaze/real-squad-evidence-paths.mjs";

const TRAIN_SHA="3527663986b8295af4f7fcdff1ba1ff3f72d07d61a20f487cb238a6ef92fd955";
const DEV_SHA="95aa6a52d5d6a735563366753ca50492a658031da74f301ac5238b03966972c9";
const ROOT=path.dirname(fileURLToPath(import.meta.url));
const now=()=>new Date().toISOString();
const digest=buffer=>crypto.createHash("sha256").update(buffer).digest("hex");
const get=(name,defaultValue)=>{const i=process.argv.indexOf("--"+name);return i<0?defaultValue:process.argv[i+1];};
const int=(name,fallback,low,high)=>{const value=Number(get(name,fallback));if(!Number.isSafeInteger(value)||value<low||value>high)throw Error("--"+name+" must be integer "+low+".."+high);return value;};
const rawText=(s)=>String(s||"").normalize("NFC");
const normalize=s=>rawText(s).toLowerCase().replace(/[^\p{L}\p{N}\s]/gu," ")
 .replace(/\b(a|an|the)\b/gu," ").replace(/\s+/gu," ").trim();
const choose=(rows,n)=>{const N=Math.min(rows.length,n);if(!N)return [];
 return Array.from({length:N},(_,i)=>rows[Math.floor((i+.5)*rows.length/N)]);};
const format=v=>v?.toLocaleString("en-US")||"0";

function loadSquad(filename,{requireOfficial=true,expectedSha=null}={}){
 const bytes=fs.readFileSync(filename),sha=digest(bytes);
 if(requireOfficial&&sha!==expectedSha)
  throw Error("Official SQuAD SHA256 mismatch: "+filename+". Refusing train/test cross-contamination.");
 const raw=JSON.parse(bytes.toString("utf8"));
 if(String(raw.version)!=="1.1"||!Array.isArray(raw.data))
  throw Error("Expected authentic SQuAD 1.1 JSON article structure");
 const articles=[],rows=[];
 for(const article of raw.data){
  if(typeof article.title!=="string"||!Array.isArray(article.paragraphs))
   throw Error("Malformed SQuAD article");
  articles.push(article.title);
  for(const paragraph of article.paragraphs){
   for(const qa of paragraph.qas||[]){
    if(!qa.answers?.length)continue;
    const gold=qa.answers[0];
    // SQuAD offset contract: TRAIN source substring must equal ground truth
    // before the model may observe the supervised training pair.
    if(typeof qa.question!=="string"||typeof paragraph.context!=="string"||
       typeof gold.answer_start!=="number"||typeof gold.text!=="string"||
       paragraph.context.slice(gold.answer_start,gold.answer_start+gold.text.length)!==gold.text)
     throw Error("Incorrect SQuAD supervised source/offset for question "+qa.id);
    rows.push({id:qa.id,article:article.title,context:paragraph.context,
     question:qa.question,answer:gold.text,answerStart:gold.answer_start,
     referenceAnswers:qa.answers.map(x=>x.text)});
   }
  }
 }
 return {sha,articles,rows,filename:path.resolve(filename),sizeBytes:bytes.length};
}
function assertIsolatedFolder(out,manifest,original){
 fs.mkdirSync(out,{recursive:true});
 const current=fs.readdirSync(out);
 if(current.length&&!fs.existsSync(manifest))
  throw Error("Output directory is not a V39 checkpoint. Refusing overwrite: "+out);
 if(original&&path.resolve(original).startsWith(path.resolve(out)+path.sep))
  throw Error("Original Brain must not be stored inside new isolated runtime");
}
function makeBrain(){
 return new Brain({rules:{depth:1,off:["R2","R4"],budEvery:100,
  empty:true,maxWires:32,fold:false},seed:11});
}
function prepareMaze(brain){
 let episodes=0;
 for(let i=0;i<145;i++){
  const world=makeMaze(seedOf(SEEDS.train,501+i*23),[7,9,11][i%3]);
  playExercise(world,brain.disc);episodes++;
  if(i>=25&&brain.disc.attract(KIND.target)>.2&&
     brain.disc.conduct(KIND.floor)>=.5&&brain.disc.self()>=0)break;
 }
 if(!(brain.disc.attract(KIND.target)>.2&&brain.disc.conduct(KIND.floor)>=.5))
  throw Error("Original Discoverer has not learned physical 2D maze goal attraction");
 return episodes;
}
function appendJSONL(p,obj){
 fs.appendFileSync(p,JSON.stringify(obj)+"\n","utf8");
}
function atomicJSON(p,data){
 fs.mkdirSync(path.dirname(p),{recursive:true});
 const tmp=p+".tmp";fs.writeFileSync(tmp,JSON.stringify(data,null,2)+"\n","utf8");
 fs.renameSync(tmp,p);
}
function snapshotAverage(memory,state){
 state.avgSnapshots++;
 for(const [feature,value] of memory.weights)
  state.avgWeightSum.set(feature,(state.avgWeightSum.get(feature)||0)+value);
 const average=new Map();
 for(const [feature,sum] of state.avgWeightSum){
  const w=sum/state.avgSnapshots;if(w)average.set(feature,w);
 }
 memory.averagedWeights=average;
 memory.averagedSnapshots=state.avgSnapshots;
}
function scoreFrozen(learner,rows,weightMode){
 const result={n:rows.length,exact:0,normalized:0,missingSource:0,
  firstMisses:[],originalBrain:true,originalPath:"Discoverer.shapeGraph"};
 for(const row of rows){
  const prediction=learner.plan({question:row.question,context:row.context,
   weightMode,includeAtlas:false});
  if(!prediction.found){result.missingSource++;continue;}
  if(prediction.referenceAnswerProvided!==false)
   throw Error("Found heldout plan that was supplied its reference answer");
  if(!row.context.includes(prediction.predicted))
   throw Error("Extractive answer was not sourced from actual observed source text");
  const exact=row.referenceAnswers.includes(prediction.predicted),
    norm=row.referenceAnswers.some(ref=>normalize(ref)===normalize(prediction.predicted));
  result.exact+=Number(exact);result.normalized+=Number(norm);
  if(!exact&&result.firstMisses.length<12)
   result.firstMisses.push({id:row.id,predicted:prediction.predicted,
    answerInAvailableSource:true,sourceGraph:prediction.graph,reason:prediction.goalInferredBy});
 }
 result.exactPct=result.n?100*result.exact/result.n:0;
 result.normalizedPct=result.n?100*result.normalized/result.n:0;
 return result;
}
function* streamStories(file,offset,{maxPendingBytes=4*1024*1024}={}){
 const delimiter=Buffer.from("<|endoftext|>","utf8"),fd=fs.openSync(file,"r");
 const fileSize=fs.fstatSync(fd).size;
 let position=offset,pending=Buffer.alloc(0),done=false;
 try{
  while(!done){
   const where=pending.indexOf(delimiter);
   if(where>=0){
    const story=pending.subarray(0,where),consumed=where+delimiter.length;
    const exactBytes=story.length,after=position-pending.length+consumed;
    pending=pending.subarray(consumed);
    if(story.length){
     const text=new TextDecoder("utf-8",{fatal:true}).decode(story).trim();
     if(text)yield {text,nextOffset:after,rawBytes:exactBytes};
    }
    continue;
   }
   if(position>=fileSize){
    done=true;
    if(pending.length){
     const text=new TextDecoder("utf-8",{fatal:true}).decode(pending).trim();
     if(text)yield {text,nextOffset:fileSize,rawBytes:pending.length};
    }
    continue;
   }
   if(pending.length>maxPendingBytes)
    throw Error("Story longer than "+maxPendingBytes+" bytes without separator; no source truncation permitted");
   const block=Buffer.allocUnsafe(128*1024);
   const n=fs.readSync(fd,block,0,block.length,position);
   if(n<=0){done=true;continue;}
   pending=Buffer.concat([pending,block.subarray(0,n)]);
   position+=n;
  }
 }finally{fs.closeSync(fd);}
}
export function statusOf(brain,config,source){
 const s=brain.v39Training||{};
 return {version:"V39-ORIGINAL-UNIFIED",checkpoint:config.checkpoint,
  state:s.state||"unknown",paused:s.paused||false,
  currentExposures:s.qaExposure||0,totalExposures:config.totalExposures,
  percentQA:config.totalExposures?100*(s.qaExposure||0)/config.totalExposures:0,
  storyBytesConsumed:s.storyOffset||0,storyBytesTotal:source.storySize,
  percentTinyStories:source.storySize?100*(s.storyOffset||0)/source.storySize:null,
  storiesObserved:s.stories||0,storyObservationRejected:s.storyRejected||0,
  fullOriginalMazeEpisodes:brain.disc?.episodes||0,
  originalTextObserved:brain.observedTransformations?.seen||0,
  originalOperators:brain.observedTransformations?.operators?.size||0,
  originalTextRejections:brain.observedTransformations?.rejectedLong||0,
  originalNoiseEnabled:!!brain.noiseAgent,
  originalXdDimensions:brain.xdAtlas?.dimensions||null,
  humanQAAccepted:brain.realEvidencePathMemory?.acceptedPairs||0,
  humanQAUnrepresentable:brain.realEvidencePathMemory?.unrepresentable||0,
  humanQAWeights:brain.realEvidencePathMemory?.weights?.size||0,
  humanQAAveragedWeights:brain.realEvidencePathMemory?.averagedWeights?.size||0,
  averagedSnapshots:s.avgSnapshots||0,
  selectedPolicy:s.selectedPolicy||null,
  validation:s.validation||null,
  independentDev:s.dev||null,
  measuredExamplesPerSecond:s.examplesPerSecond||null,
  trainedOriginalBrainSameInstance:true,
  finalGeneralIntelligenceProven:false,
  actualCudaVerified:false,
  lastCheckpoint:s.lastSaved||null};
}
function dashboard(base,token){
 const esc=JSON.stringify(token);
 return \`<!doctype html><html lang="ro"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>MagicPerspective V39 · Original Brain</title>
<style>:root{color-scheme:dark}body{font:15px system-ui;background:#070d17;color:#e8f0f7;margin:2vw auto;max-width:1040px;padding:10px}h1{font:35px Georgia,serif}p{color:#a9c3d5}main{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:12px}.cell{background:#101d2c;border:1px solid #29425b;border-radius:13px;padding:17px}.cell strong{display:block;font:30px Georgia;margin:8px 0}button{padding:12px;margin:7px 5px 4px 0;background:#1b3348;color:#e5edf7;border:1px solid #456781;border-radius:9px;cursor:pointer}pre{white-space:pre-wrap;overflow-wrap:anywhere;font:12px/1.55 Consolas,monospace;background:#101d2c;padding:16px;border:1px solid #29425b;border-radius:12px;max-height:340px;overflow:auto}progress{width:100%;height:23px}small{color:#99b8c9}</style></head><body>
<small>REAL Original V17/V34 Brain · V38 human-source semantic preference · frozen external validation</small>
<h1>MagicPerspective — Training real, checkpoint permanent</h1><p>Un singur Brain.v8 pentru labirinte 2D, transformări textuale TinyStories și selecție semantică SQuAD. Nu înlocuiește interfața veche; funcțiile CUDA nu sunt activate automat.</p>
<main id="cards"></main>
<p>Progres SQuAD <progress id="qa" value="0" max="100"></progress></p>
<p>Progres TinyStories <progress id="story" value="0" max="100"></progress></p>
<div><button id="pause">Ⅱ Pauză</button><button id="resume">▶ Continuă</button><button id="save">◈ Salvează acum</button></div>
<h2>Evaluare înghețată și blocaje de design</h2><pre id="data">Conectez la motorul original…</pre>
<script>
const tok=\${esc},$=id=>document.getElementById(id);
async function req(route,method='GET'){const r=await fetch(route,{method,headers:{'x-v39-control-token':tok},cache:'no-store'});return r.json()}
for(const key of ['pause','resume','save'])$(key).onclick=async()=>{const x=await req('/control?do='+key,'POST');if(x.error)alert(x.error);await refresh()};
async function refresh(){try{const x=await req('/status');let cards=[
['Status',x.state],['SQuAD exemple',x.currentExposures+'/'+x.totalExposures],
['Povești trăite',x.storiesObserved],['Operatori originali',x.originalOperators],
['Labirinte',x.fullOriginalMazeEpisodes],['Politică',x.selectedPolicy||'învață'],
['Validare',x.validation?.selected?.exactPct?.toFixed(2)+'%'||'neefectuată'],
['DEV extern',x.independentDev?.exactPct?.toFixed(2)+'%'||'nedeschis'],
['Viteză',x.measuredExamplesPerSecond?.toFixed(1)+' exemple/s'||'încă necalculată']
];$('cards').replaceChildren(...cards.map(([k,v])=>{const d=document.createElement('div');d.className='cell';const label=document.createElement('small');label.textContent=k;const strong=document.createElement('strong');strong.textContent=String(v);d.append(label,strong);return d}));$('qa').value=x.percentQA||0;$('story').value=x.percentTinyStories||0;$('data').textContent=JSON.stringify({status:x.state,validation:x.validation,independentDev:x.independentDev,designLimits:{originalTextRejections:x.originalTextRejections,qaUnrepresentable:x.humanQAUnrepresentable,CUDAHardwareVerified:x.actualCudaVerified,generalIntelligenceProven:x.finalGeneralIntelligenceProven},checkpoint:x.lastCheckpoint},null,2)}catch(e){$('data').textContent=e.message}}
refresh();setInterval(refresh,1500);
</script></body></html>\`;
}
export async function runOriginalV39(config){
 const out=path.resolve(config.out);
 const manifest=path.join(out,"v39-manifest.json");
 const checkpoint=path.join(out,"brains","brain-0.v8");
 const journal=path.join(out,"v39-training-atlas.jsonl"),statusPath=path.join(out,"v39-status.json");
 const sourceTrain=loadSquad(config.train,{requireOfficial:!config.fixture,expectedSha:TRAIN_SHA});
 const sourceDev=loadSquad(config.dev,{requireOfficial:!config.fixture,expectedSha:DEV_SHA});
 const articleCount=sourceTrain.articles.length;
 const divide=Math.max(1,Math.min(articleCount-1,Math.floor(articleCount*380/442)));
 if(articleCount<3||sourceDev.articles.length<1)
  throw Error("Insufficient independent SQuAD articles for real training/calibration/DEV");
 const selectedTrain=new Set(sourceTrain.articles.slice(0,divide)),
  selectedCalib=new Set(sourceTrain.articles.slice(divide));
 const allTrain=sourceTrain.rows.filter(x=>selectedTrain.has(x.article)),
  allCalibration=sourceTrain.rows.filter(x=>selectedCalib.has(x.article));
 if(!allTrain.length||!allCalibration.length||!sourceDev.rows.length)
  throw Error("SQuAD article split contains an empty role");
 const training=choose(allTrain,config.trainSamples),
  calibration=choose(allCalibration,config.calibrationSamples),
  dev=choose(sourceDev.rows,config.devSamples);
 const sourceStory=config.tiny?fs.statSync(config.tiny):null;
 if(sourceStory&&!sourceStory.isFile())throw Error("TinyStories input must be a file");
 if(config.tiny&&path.resolve(config.tiny)===path.resolve(config.train))
  throw Error("Never train on QA training JSON as story text");
 const source={trainSha:sourceTrain.sha,devSha:sourceDev.sha,
  storyFile:config.tiny?path.resolve(config.tiny):null,
  storySize:sourceStory?.size||0,storyMtimeMs:sourceStory?.mtimeMs||null,
  trainArticleCount:selectedTrain.size,calibrationArticleCount:selectedCalib.size,
  devArticleCount:sourceDev.articles.length,
  trainIdsSha:digest(Buffer.from(JSON.stringify(training.map(x=>x.id))))};
 const identity={source,trainSamples:training.length,calibrationSamples:calibration.length,
  devSamples:dev.length,epochs:config.epochs,storyLimit:config.storyLimit,
  storyEvery:config.storyEvery,snapshotEvery:config.snapshotEvery,burnIn:config.burnIn,
  checkpointEvery:config.checkpointEvery};
 assertIsolatedFolder(out,manifest,config.original);
 if(fs.existsSync(manifest)){
  const old=JSON.parse(fs.readFileSync(manifest,"utf8"));
  if(JSON.stringify(old.identity)!==JSON.stringify(identity))
   throw Error("V39 resume identity differs from previous corpus/parameters. Refusing silent memory corruption.");
  if(!fs.existsSync(checkpoint))throw Error("V39 manifest exists but native Brain.v8 checkpoint is missing.");
 }else{
  if(!config.fixture&&!config.original)
   throw Error("Serious original training requires --original EXISTING_BRAIN.v8. Fresh synthetic replacement not allowed.");
  if(config.original&&!fs.existsSync(config.original))
   throw Error("Original Brain checkpoint missing: "+config.original);
 }
 let brain=fs.existsSync(checkpoint)?Brain.load(checkpoint):
  config.original?Brain.load(config.original):makeBrain();
 if(!brain.v39Training){
  brain.v39Training={qaExposure:0,storyOffset:0,stories:0,storyRejected:0,
   avgSnapshots:0,avgWeightSum:new Map(),state:"initializing",paused:false,
   selectedPolicy:null,validation:null,dev:null,lastSaved:null,examplesPerSecond:null};
 }
 const state=brain.v39Training;
 if(!(state.avgWeightSum instanceof Map))throw Error("Broken V39 running average checkpoint");
 const learner=new NativeRealTextEvidencePaths(brain);
 if(!brain.enableEndogenousNoise)throw Error("Original V17 Brain noise agent unavailable");
 brain.enableEndogenousNoise();
 const totalExposures=training.length*config.epochs;
 config={...config,out,checkpoint,totalExposures};
 if(!fs.existsSync(manifest))atomicJSON(manifest,{version:"V39-UNIFIED",
  created:now(),identity,sourceBrain:config.original||"fixture-original-v17"});
 const doSave=(reason)=>{
  brain.v39Training.lastSaved=now();
  brain.save(checkpoint);
  atomicJSON(statusPath,statusOf(brain,config,source));
  appendJSONL(journal,{kind:"checkpoint",reason,time:now(),atExposure:state.qaExposure,
   stories:state.stories,sourceOffset:state.storyOffset,
   originalBrain:true,estimatedBest:state.validation?.selected?.exactPct??null});
 };
 if(state.qaExposure===0&&state.stories===0){
  if(brain.disc.episodes<26){
   const n=prepareMaze(brain);
   appendJSONL(journal,{kind:"real-original-maze",experienced:n,
    noTeacherRoute:true,time:now()});
  }
  state.state="training";doSave("original-native-maze-initialized");
 }
 const controls={paused:false,saveRequested:false};
 const token=crypto.randomBytes(22).toString("hex");
 const server=http.createServer((request,response)=>{
  const u=new URL(request.url,"http://127.0.0.1");
  const write=(data,code=200,type="application/json")=>{
   response.writeHead(code,{"content-type":type+"; charset=utf-8","cache-control":"no-store"});
   response.end(type==="application/json"?JSON.stringify(data):data);
  };
  if(request.method==="GET"&&u.pathname==="/")return write(dashboard(config,token),200,"text/html");
  if(request.method==="GET"&&u.pathname==="/status")
   return write(statusOf(brain,config,source));
  if(request.method==="POST"&&u.pathname==="/control"){
   if(request.headers["x-v39-control-token"]!==token)
    return write({error:"Invalid UI session token"},403);
   const command=u.searchParams.get("do");
   if(!["pause","resume","save"].includes(command))return write({error:"Unknown control"},400);
   if(command==="pause")controls.paused=true;
   if(command==="resume")controls.paused=false;
   if(command==="save")controls.saveRequested=true;
   return write({ok:true,command,checkpointProtected:true});
  }
  return write({error:"Unknown local endpoint"},404);
 });
 await new Promise((resolve,reject)=>{
  server.once("error",reject);server.listen(config.port,"127.0.0.1",resolve);
 });
 const started=performance.now(),step0=state.qaExposure;
 const sync=async()=>{
  if(controls.saveRequested){controls.saveRequested=false;doSave("user-requested");}
  if(controls.paused){state.paused=true;state.state="paused";await yieldToEventLoop();await new Promise(x=>setTimeout(x,120));}
  else if(state.paused){state.paused=false;state.state="training";}
 };
 let storyIterator=null,storyDone=false;
 const prepareStory=()=>{if(!source.storyFile||storyDone)return null;
  storyIterator ||= streamStories(source.storyFile,state.storyOffset);
  const item=storyIterator.next();
  if(item.done){storyDone=true;return null;}
  return item.value;};
 const liveStory=()=>{
  const item=prepareStory();if(!item)return false;
  const observed=brain.observedTransformations.observeText(item.text);
  state.storyOffset=item.nextOffset;state.stories++;
  state.storyRejected+=Math.max(0,observed.observedUnits-observed.newSentences);
  if(state.stories<=5||state.stories%100===0)
   appendJSONL(journal,{kind:"actual-real-tinystory",time:now(),index:state.stories,
    observedUnits:observed.observedUnits,newOriginalSentences:observed.newSentences,
    newOriginalOperators:observed.newOperators,rawBytes:item.rawBytes,
    originalNativeBrain:true});
  return true;
 };
 const doneQA=()=>state.qaExposure>=totalExposures;
 const controlTimeout=setInterval(()=>{atomicJSON(statusPath,statusOf(brain,config,source));},5000);
 try{
  state.state="training";
  while(!doneQA()||(source.storyFile&&state.stories<config.storyLimit&&!storyDone)){
   await sync();if(controls.paused)continue;
   if(!doneQA()){
    const sample=training[state.qaExposure%training.length];
    // Actual QA TRAIN gold answer is used by original V38 trainOne ONLY.
    const outcome=learner.trainOne(sample);
    state.qaExposure++;
    if(state.qaExposure>=config.burnIn&&
       state.qaExposure%config.snapshotEvery===0)
     snapshotAverage(learner.memory,state);
    if(source.storyFile&&state.stories<config.storyLimit&&
      state.qaExposure%config.storyEvery===0)liveStory();
   }else if(!liveStory())break;
   if(state.qaExposure>0&&state.qaExposure%config.checkpointEvery===0&&
      state.qaExposure!==step0&&state.qaExposure<=totalExposures)
    doSave("periodic-real-training-checkpoint");
   const duration=(performance.now()-started)/1000;
   state.examplesPerSecond=duration>0?(state.qaExposure-step0)/duration:null;
   if(state.qaExposure%25===0||doneQA()){
    process.stdout.write("V39_REAL_ORIGINAL_PROGRESS "+JSON.stringify({
     qa:state.qaExposure,total:totalExposures,stories:state.stories,
     storyBytes:state.storyOffset,operators:brain.observedTransformations.operators.size,
     nativeMazeEpisodes:brain.disc.episodes,
     qaPerSec:state.examplesPerSecond,originalBrain:true})+"\n");
    await yieldToEventLoop();
   }
  }
  if(!state.avgSnapshots)snapshotAverage(learner.memory,state);
  if(!state.validation){
   state.state="validating";
   doSave("before-freeze-internal-validation");
   const last=scoreFrozen(learner,calibration,"last"),
    average=scoreFrozen(learner,calibration,"average");
   const policy=average.normalized>last.normalized?"average":"last";
   state.selectedPolicy=policy;
   state.validation={N:calibration.length,last,average,
    selected:policy==="average"?average:last,policySelectedBeforeDev:true,
    articleDisjoint:true,referenceNeverUsedForScore:true};
   appendJSONL(journal,{kind:"frozen-internal-validation",time:now(),
    selectedPolicy:policy,metrics:state.validation,originalBrain:true});
   doSave("policy-selected-without-opening-external-DEV");
  }
  if(!state.dev){
   state.state="external-frozen-evaluation";
   const devScore=scoreFrozen(learner,dev,state.selectedPolicy);
   state.dev={...devScore,articleDisjoint:true,answerHiddenFromPlanner:true,
    policyFrozenBeforeDev:true,realIndependentHumanQA:true};
   appendJSONL(journal,{kind:"external-frozen-dev",time:now(),
    selectedPolicy:state.selectedPolicy,metrics:state.dev});
  }
  state.state="complete";doSave("final-training-and-external-evaluation");
  const original=Brain.load(checkpoint);
  const restored=new NativeRealTextEvidencePaths(original);
  const q=dev[0],r1=learner.plan({question:q.question,context:q.context,
   weightMode:state.selectedPolicy,includeAtlas:true}),
   r2=restored.plan({question:q.question,context:q.context,
    weightMode:state.selectedPolicy,includeAtlas:true});
  if(r1.predicted!==r2.predicted||JSON.stringify(r1.initialShape)!==JSON.stringify(r2.initialShape))
   throw Error("STOPSHIP: original Brain checkpoint restored DIFFERENT global text shape");
  appendJSONL(journal,{kind:"brain-original-checkpoint-reloaded",time:now(),
   originalShapeIdentical:true,heldoutPredicted:r2.predicted,
   actualNativeBrainBytes:fs.statSync(checkpoint).size});
  const result={ok:true,branch:"V39 original unified",
   realTraining:state.qaExposure,storyCount:state.stories,
   totalStoryBytesConsumed:state.storyOffset,
   sampledStoryRetentionWindow:brain.observedTransformations.maxObserved,
   originalMazeEpisodes:brain.disc.episodes,
   originalTextOperators:brain.observedTransformations.operators.size,
   averagedSnapshots:state.avgSnapshots,
   internalCalibration:state.validation,
   externalDev:state.dev,restoreVerified:true,
   originalBrain:checkpoint,journal,
   physicalCudaTrainingTested:false,allInfiniteLanguageSolved:false};
  atomicJSON(path.join(out,"v39-result.json"),result);
  console.log("V39_REAL_UNIFIED_TRAINED_CHECKPOINT_VERIFIED",JSON.stringify(result));
  if(!config.keepUiOpen)return result;
  console.log("V39_UI http://127.0.0.1:"+config.port+"/");
  await new Promise(resolve=>process.once("SIGINT",resolve));
  return result;
 }catch(e){
  state.state="error";state.lastError=e.message;
  doSave("error-snapshot-no-silent-reset");
  throw e;
 }finally{clearInterval(controlTimeout);server.close();}
}
export async function main(){
 const config={
  train:get("train",""),dev:get("dev",""),tiny:get("tiny",""),
  original:get("original",""),out:get("out",""),
  port:int("port",8909,1024,65535),
  trainSamples:int("train-samples",2400,2,100000),
  calibrationSamples:int("calibration-samples",500,1,10000),
  devSamples:int("dev-samples",650,1,10000),
  epochs:int("epochs",2,1,6),
  checkpointEvery:int("checkpoint-every",100,1,100000),
  snapshotEvery:int("snapshot-every",200,1,10000),
  burnIn:int("burn-in",400,0,100000),
  storyLimit:int("story-limit",0,0,100000000),
  storyEvery:int("story-every",16,1,100000),
  fixture:process.argv.includes("--fixture"),
  keepUiOpen:process.argv.includes("--keep-ui-open")
 };
 if(!config.train||!config.dev||!config.out)throw Error("--train --dev --out required");
 if(config.storyLimit&&!config.tiny)throw Error("--story-limit requires an existing real --tiny TXT");
 if(config.snapshotEvery>config.trainSamples*config.epochs)
  throw Error("Averaging cadence exceeds all training exposures");
 return runOriginalV39(config);
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))
 main().catch(e=>{console.error("V39_STOPSHIP",e.stack||e);process.exitCode=1;});
