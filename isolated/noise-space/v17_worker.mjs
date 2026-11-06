// Isolated observatory for ORIGINAL V17 training. World and neural learning come from V17, not a fake frontend.
import {parentPort} from 'node:worker_threads';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {Brain} from '../../v17/transcend/torus-aether/devour/brain.mjs';
import {GeometricLearningLab,observedFeatures} from './learning_geometry.mjs';
import {labelEvent} from './interpret.mjs';
import {IsolatedGpuRunner} from './gpu_runner.mjs';
import {openTextDataset} from '../../v17/transcend/torus-aether/data/text-dataset.mjs';
import {nextTrainingSlice,rotatingHeldout,byteEvidence} from './text_schedule.mjs';
import {TextActionPaths,matchScore} from './text_action_paths.mjs';
import {CausalTextAgent,LatentGoalField} from './causal_text_world.mjs';

const here=path.dirname(fileURLToPath(import.meta.url));
// Isolate parallel regression runs; default user's existing checkpoint path is unchanged.
const session=process.env.MP_SESSION||'real-v17';
if(!/^[A-Za-z0-9_-]{1,70}$/.test(session))throw Error('Invalid isolated session name');
const dir=path.join(here,'runs',session);
fs.mkdirSync(dir,{recursive:true});
const checkpoint=path.join(dir,'brain.v8'),geoFile=path.join(dir,'geometry.json'),obsFile=path.join(dir,'observatory.json');
const pathFile=path.join(dir,'text_action_paths.json');
const causalFile=path.join(dir,'causal_text_world.json');
const docs=path.resolve(here,'../../v17/docs/TORUS_AETHER_ABC_20261104.md');
const modesAllowed=['text','maze','transform'];
let brain=null,geo=null,pathHead=null,causalAgent=null,causalTraining=true,causalMaxActions=48,run=false,paused=false,remaining=0,modes=modesAllowed.slice();
let episode=0,idx=0,cursor=0,sourceText='',userText=false,seenTexts=0;
let last={text:null,maze:null,transform:null},history=[],error=null,lastSave=null,evaluation={};
let stage='idle',lastDurationMs=null,progress={world:null,step:0,expected:null,observed:null};
let navigationQuery=null;
let gpuRunner=new IsolatedGpuRunner(),gpuRequested=false,gpuError=null,sourceRoot='',dataset=null,datasetIndex=0,datasetTestIndex=0;
// Observed transitions are queued for the SAME verified V17 CUDA process; CPU only serializes results.
const bufferedGeometry=[];
let cudaAuxLast=null;
let corpusCycles=0,heldWindowIndex=0,sourceSamples=0,gpuWorldsProcessed=0,learningStart=performance.now(),throughputBase=0,backupLegacy=false;
const bounded=(a,k=300)=>a.length>k?a.slice(-k):a;
const finite=v=>Number.isFinite(v)?v:null;
const ascii=s=>Array.from(s,c=>{const n=c.charCodeAt(0);return n===10||n===9||(n>=32&&n<127)?n:63;});
const asciiChar=y=>y===10?'↵':y===9?'⇥':y===32?'␣':y>=32&&y<127?String.fromCharCode(y):'['+y+']';
const writeJSON=(file,v)=>{const tmp=file+'.tmp';fs.writeFileSync(tmp,JSON.stringify(v));fs.renameSync(tmp,file);};
function ensureBrain(resume=true){
 if(brain)return;
 if(resume&&fs.existsSync(checkpoint))brain=Brain.load(checkpoint);else brain=new Brain({seed:11,rules:{}});
 if(resume&&fs.existsSync(checkpoint)&&!fs.existsSync(obsFile))backupLegacy=true;
 if(resume&&fs.existsSync(geoFile)){geo=GeometricLearningLab.restore(JSON.parse(fs.readFileSync(geoFile,'utf8')));}
 else geo=new GeometricLearningLab(brain.seed||11);
 pathHead=resume&&fs.existsSync(pathFile)?TextActionPaths.restore(JSON.parse(fs.readFileSync(pathFile,'utf8'))):new TextActionPaths();
 causalAgent=resume&&fs.existsSync(causalFile)?CausalTextAgent.restore(JSON.parse(fs.readFileSync(causalFile,'utf8'))):new CausalTextAgent({seed:11});
 if(resume&&fs.existsSync(obsFile)){
  const m=JSON.parse(fs.readFileSync(obsFile,'utf8'));
  if(m.version!==2&&fs.existsSync(checkpoint))backupLegacy=true;
  episode=Number.isSafeInteger(m.episode)?m.episode:0;
  idx=Number.isSafeInteger(m.idx)?m.idx:0;cursor=Number.isSafeInteger(m.cursor)?m.cursor:0;
  history=bounded(Array.isArray(m.history)?m.history:[]);
  seenTexts=Number.isSafeInteger(m.seenTexts)?m.seenTexts:0;
  evaluation=m.evaluation||{};last=m.last||last;sourceText=m.sourceText||'';
  userText=!!m.userText;lastSave=m.lastSave||null;
  sourceRoot=typeof m.sourceRoot==='string'?m.sourceRoot:'';
  datasetIndex=Number.isSafeInteger(m.datasetIndex)?m.datasetIndex:0;
  datasetTestIndex=Number.isSafeInteger(m.datasetTestIndex)?m.datasetTestIndex:0;
  corpusCycles=Number.isSafeInteger(m.corpusCycles)?m.corpusCycles:0;
  heldWindowIndex=Number.isSafeInteger(m.heldWindowIndex)?m.heldWindowIndex:0;
  sourceSamples=Number.isSafeInteger(m.sourceSamples)?m.sourceSamples:0;
  gpuWorldsProcessed=Number.isSafeInteger(m.gpuWorldsProcessed)?m.gpuWorldsProcessed:0;
 }
}
function getSource(){return userText&&sourceText.trim()?sourceText:fs.readFileSync(docs,'utf8');}
async function ensureDataset(){if(!sourceRoot)return null;if(!dataset){dataset=await openTextDataset(sourceRoot);if(dataset.trainRows<2||dataset.held<1)throw Error('Parquet dataset must contain distinct training and held-out rows');}return dataset;}
function sourceStatus(){const total=dataset?.trainRows||(userText?sourceText.length:fs.existsSync(docs)?fs.statSync(docs).size:0);return {name:sourceRoot?'Parquet dataset':userText?'User text':'V17 documentation',root:sourceRoot||null,trainRows:dataset?.trainRows??null,heldoutRows:dataset?.held??null,observedRows:datasetIndex,seenTrainingEpisodes:sourceSamples,finiteSourceCharacters:sourceRoot?null:total,cycles:corpusCycles,repetitionWarning:corpusCycles>0?'Training examples are repeating after a finite corpus cycle. Repetition is not novel evidence.':null};}
function splitSource(){
 const chars=ascii(getSource());
 const cut=Math.min(chars.length,Math.max(100,Math.floor(chars.length*.8)));
 return {train:chars.slice(0,cut),held:chars.slice(cut),nonAscii:Array.from(getSource()).filter(c=>c.charCodeAt(0)>127).length};
}
function copyTrace(){
 brain.organismView();
 const s=brain.trace.snapshot(false);
 return {nodes:bounded(s.nodes,3500),edges:bounded(s.edges,2600),U:s.U,flow:s.flow.slice(-80),accC:finite(s.accC),accF:finite(s.accF),
         unplaced:s.nodes.filter(n=>n[1]!=='sym').length};
}
function state(withTrace=true){
 const mem=process.memoryUsage(),gpu=gpuRunner.status();
 return {available:true,real:true,engine:'Original MagicPerspective V17 Brain',device:gpu.active?gpu.info.device+' + CPU merge':'CPU in isolated Node Worker',running:run,paused,
  stage,progress,episode,modes,remaining,startedAt:history.at(-1)?.at||null,
  learned:brain?.lived||0,chars:brain?.chars||0,
  mazePlayed:brain?.mazes?.played||0,mazeWon:brain?.mazes?.won||0,
  transformPlayed:brain?.trans?.played||0,transformWon:brain?.trans?.won||0,
  source:sourceStatus(),gpu:{...gpu,requested:gpuRequested,error:gpuError||gpu.error},
  capacity:{heapMB:Math.round(mem.heapUsed/1e6),rssMB:Math.round(mem.rss/1e6),alignBytes:brain?.align?.mem?.n||0,brainFull:!!brain?.full,priorLearningDisabled:!!brain?.full,observedWorlds:gpuWorldsProcessed,
    note:brain?.full?'Some older V17 organs stopped updating due to brain.full; alignment memory may still grow.':'Brain.full is not set. Plateau may be caused by repeated text or heldout metrics.'},
  trainingRate:{worlds:Math.max(0,gpuWorldsProcessed-throughputBase),elapsedSec:Math.round((performance.now()-learningStart)/1000),worldsPerSec:Math.max(0,gpuWorldsProcessed-throughputBase)/Math.max(1,(performance.now()-learningStart)/1000)},
  sourceTextLabel:userText?'User-supplied text':'V17 repository technical documentation',
  conversionWarning:'The original V17 text learner maps non-ASCII characters to ASCII question marks.',
  last,evaluation,history:bounded(history,120),
  geometry:geo?{...geo.summary(),device:gpu.active?'PyTorch CUDA (batched geometry SGD)':'CPU / JavaScript'}:null,
  cudaAux:cudaAuxLast,
  textPaths:pathHead?.summary()||null,navigationQuery,
   causalMode:{enabled:causalTraining,maxActions:causalMaxActions,world:'training Q/A intervention environment',actionValueDevice:'CPU/JavaScript',goalFieldDevice:gpu.active?'PyTorch CUDA':'CPU/JavaScript',v17BrainReceivesActions:true},
   causalText:causalAgent?.summary()||null,causalCheckpoint:path.relative(here,causalFile),
  lastSave,error,lastDurationMs,checkpoint:path.relative(here,checkpoint),
  trace:withTrace&&brain?copyTrace():null,
  crossWorld:{status:'UNVERIFIED',why:'Training the same Brain in several worlds does not by itself prove that their observations share a single hidden trajectory. Pair identifiers or independent transfer tests are needed.'}};
}
function publish(){parentPort.postMessage({type:'state',state:state()});}
function emitProgress(p){progress={...progress,...p};parentPort.postMessage({type:'progress',progress:{...progress,stage,episode,learned:brain?.lived||0}});}
function save(){
 ensureBrain(false);
 if(backupLegacy&&fs.existsSync(checkpoint)){
  const label=new Date().toISOString().replace(/[^0-9]/g,'');
  fs.copyFileSync(checkpoint,checkpoint+'.pre-gpu-observatory-'+label+'.backup',fs.constants.COPYFILE_EXCL);
  backupLegacy=false;
 }
 const bytes=brain.save(checkpoint);
 writeJSON(geoFile,geo.export());
 writeJSON(pathFile,pathHead.export());
 writeJSON(causalFile,causalAgent.export());
 lastSave={at:new Date().toISOString(),bytes};
 writeJSON(obsFile,{version:2,episode,idx,cursor,sourceText,userText,seenTexts,history,evaluation,last,lastSave,
  sourceRoot,datasetIndex,datasetTestIndex,corpusCycles,heldWindowIndex,sourceSamples,gpuWorldsProcessed});
 publish();
}
function geoSample(world,x,y,prev,action,heldout){
 if(!geo)return;
 const sample={world,x,y,prev,action,heldout};
 if(gpuRunner.active){bufferedGeometry.push(sample);return;}
 try{geo.consume(sample);}
 catch(e){error='Geometry sample rejected ('+world+'): '+e.message;}
}
// Training-only experience stream to the original, shared V17 Brain graph.
function liveCausalExperience(events){
 const samples=events.slice(0,6);if(!samples.length)return;
 brain.beginExercise();
 for(const e of samples){
  const before=e.before.join(' ').slice(-56),after=e.after.join(' ').slice(-56);
  const reward=Math.round(100*(e.feedback?.delta||0));
  const line='ACTION '+e.action.tool+' '+e.action.token+' BEFORE '+before+' AFTER '+after+' REWARD '+reward+'\n';
  for(const ch of line.slice(0,135))brain.live(ch.charCodeAt(0),false,{old:gpuRunner.active});
 }
}
function geometryForText(bytes,heldout){
 let h=[32,32,32,32,32];
 for(const y of bytes){
  const before=observedFeatures('text',{history:h});
  const after=observedFeatures('text',{history:[...h,y]});
  const prev=observedFeatures('text',{history:h.slice(0,-1)});
  geoSample('text',before,after,prev,0,heldout);h=[...h,y].slice(-5);
 }
}
async function nextTextExamples(count){
 const examples=[],ds=await ensureDataset();
 if(ds){
  for(let k=0;k<count;k++){
   if(datasetIndex>0&&datasetIndex%ds.trainRows===0)corpusCycles++;
   const item=await ds.exercise(datasetIndex++);
   const q=String(item.prompt||''),a=String(item.answer||''),raw='Q: '+q+'\nA: '+a+'\n\n';
   const bytes=ascii(raw).slice(0,1600);
   if(bytes.length)examples.push({bytes,prompt:q,answer:a,rowIndex:item.index,
    source:'Parquet training row '+item.index,nonAscii:[...raw].filter(x=>x.codePointAt(0)>127).length});
  }
 }else{
  const data=splitSource();if(!data.train.length)throw Error('Training text is empty');
  for(let k=0;k<count;k++){
   const seg=nextTrainingSlice(data.train,cursor,320);
   if(seg.wrapped)corpusCycles++;
   cursor=seg.cursor;
   examples.push({bytes:seg.slice,source:userText?'Pasted text':'V17 documentation',nonAscii:data.nonAscii});
  }
 }
 sourceSamples+=examples.length;
 if(!examples.length)throw Error('No text exercises available');
 return examples;
}
// This path head never sees a held-out answer until AFTER it finishes its rollout.
function assessNavigation(ex){
 if(!ex?.prompt||!ex?.answer)return {status:'NO_QA_DATA'};
 if(!pathHead?.rows)return {status:'NO_TRAINING_ROWS'};
 const result=pathHead.evaluate(String(ex.prompt),String(ex.answer),{maxSteps:48,beamWidth:4,branching:7});
 let baseline;
 try{
  const generated=brain.chat([['you',String(ex.prompt)]],{T:0,max:160,stopBlank:true,learn:false,seed:11});
  baseline={...matchScore(generated.text,String(ex.answer)),output:generated.text.slice(0,360)};
 }catch(e){baseline={error:String(e)};}
 return {status:'EVALUATED',prompt:String(ex.prompt).slice(0,400),reference:String(ex.answer).slice(0,400),
  route:result.route,metrics:result.metrics,baseline,
  evaluationOnly:true,goalHiddenDuringPlanning:true,
  warning:'Lexical F1 is not semantic correctness. Natural-language solution paths are unverified.'};
}
async function evaluateText(){
 if(seenTexts%4!==0)return;
 const ds=await ensureDataset();let H,meta,navHoldout=null;
 if(ds){
  const ex=await ds.heldOut(datasetTestIndex++);navHoldout=ex;
  const raw='Q: '+String(ex.prompt||'')+'\nA: '+String(ex.answer||'')+'\n\n';
  H=ascii(raw).slice(0,420);meta={heldoutSource:'Parquet heldout row',heldoutIndex:ex.index,heldoutWindow:datasetTestIndex-1,totalWindows:ds.held};
 }else{
  const {held}=splitSource();
  const r=rotatingHeldout(held,heldWindowIndex++,420);
  H=r.bytes;meta={heldoutSource:'Frozen 20% corpus',heldoutIndex:r.offset,heldoutWindow:r.window,totalWindows:r.totalWindows};
 }
 if(H.length<80){evaluation.text={frozen:true,n:H.length,aligned:null,chain:null,persistence:null,
  assessment:labelEvent('text',{n:H.length}),navigation:navHoldout?assessNavigation(navHoldout):{status:'NO_QA_DATA'},
  causalNavigation:navHoldout&&causalAgent.value.updates?causalAgent.evaluate(String(navHoldout.prompt),String(navHoldout.answer),pathHead,{steps:64}):{status:'NOT_TRAINED'},...meta};return;}
 const r=brain.evalText(H,H.length);
 const baseline=H.reduce((sum,y,i)=>sum+(i>0&&y===H[i-1]),0)/H.length;
 evaluation.text={frozen:true,n:H.length,aligned:r.aligned,chain:r.live,persistence:baseline,
  sampledPredictions:r.rows.slice(0,100).map((z,i)=>({step:i,actual:z[0],predicted:z[1],old:z[3]})),
  assessment:labelEvent('text',{n:H.length,heldoutAccuracy:r.aligned,heldoutPersistence:baseline}),
  navigation:navHoldout?assessNavigation(navHoldout):{status:'NO_QA_DATA'},
  causalNavigation:navHoldout&&causalAgent.value.updates?causalAgent.evaluate(String(navHoldout.prompt),String(navHoldout.answer),pathHead,{steps:64}):{status:'NOT_TRAINED'},
  ...meta,checkedAtEpisode:episode};
}
async function textEpisode(){
 stage=gpuRunner.active?'CUDA text batch + V17 alignment merge':'learning text';
 const batch=await nextTextExamples(gpuRunner.active?gpuRunner.settings.textBatch:1);
 const bytes=batch[0].bytes,heldoutGeo=episode%5===0;
 let observations=[],acc=null,gpuMeta=null;
 if(gpuRunner.active){
  gpuMeta=await gpuRunner.text(brain,batch.map(e=>e.bytes));
  gpuWorldsProcessed+=batch.length;
  // Same as original V17 GPU training: let the older organs live one recorded example
  // with the GPU-trained alignment kept separate (old=true).
  brain.beginExercise();
  for(const y of bytes.slice(0,160))brain.live(y,brain.lived%32===0,{old:true});
  acc=gpuMeta.alignAccuracy;
  emitProgress({world:'text',step:batch.length,expected:'GPU aggregate only',observed:gpuMeta.alignAccuracy});
 }else{
  brain.beginExercise();
  const A=brain.align,original=A.live,beforeHits=A.hits,beforeSeen=A.lived;
  A.live=function(y,opts){
   const r=original.call(this,y,opts);
   observations.push({step:observations.length,actual:y,predicted:r.guess,correct:r.guess===y,
     from:r.src===null?'none':JSON.stringify(r.src)});
   if(observations.length%96===0)emitProgress({world:'text',step:observations.length,expected:r.guess,observed:y});
   return r;
  };
  try{for(const y of bytes){brain.live(y,brain.lived%32===0);brain.chars++;}}
  finally{delete A.live;}
  gpuWorldsProcessed++;
  acc=(A.hits-beforeHits)/Math.max(1,A.lived-beforeSeen);
 }
 // Real Parquet Q/A trains an independent goal-conditioned action head alongside ORIGINAL V17.
 // The source row enters learning ONLY here; heldout rows are never passed to learn().
 let pathRows=0,causalRows=0,causalActions=0;
 const latentBatch=[];
 for(const row of batch)if(row.prompt?.trim()&&row.answer?.trim()){
  // Try interventions using only previously observed corpus evidence.
  // The CURRENT answer remains inside the training environment reward.
  if(causalTraining){
   if(!causalAgent.dynamics.observations)causalAgent.probe(causalAgent.seed);
   const trial=causalAgent.train(row.prompt,row.answer,pathHead,{maxActions:causalMaxActions,seed:causalAgent.episodes*7919+11,
    skipLatentUpdate:gpuRunner.active});
   if(trial.trained){
    if(gpuRunner.active)latentBatch.push({features:causalAgent.latent.features(row.prompt),target:causalAgent.latent.target(row.answer)});
    causalRows++;causalActions+=trial.steps;
    // The existing shared geometric learner sees genuine observed action steps;
    // it still does NOT establish aligned semantics with maze/game coordinates.
    for(const ev of trial.events){
     if(ev.latentBefore?.length>=5&&ev.latentAfter?.length>=5)
      geoSample('text',ev.latentBefore.slice(0,5),ev.latentAfter.slice(0,5),
       ev.latentBefore.slice(0,5),ev.action.tool,heldoutGeo);
    }
    liveCausalExperience(trial.events);
   }
  }
  if(pathHead.learn(row.prompt,row.answer).trained)pathRows++;
 }
 if(gpuRunner.active&&latentBatch.length){
  const trained=await gpuRunner.latent(causalAgent,latentBatch);
  causalAgent.latent=LatentGoalField.restore(trained.state);
  cudaAuxLast={...(cudaAuxLast||{}),goalField:{device:trained.device,trained:trained.trained,elapsedMs:trained.elapsedMs,peakVramGB:trained.peakVramGB}};
 }
 seenTexts++;
 geometryForText(bytes,heldoutGeo);
 await evaluateText();
 const assessment=labelEvent('text',{n:evaluation.text?.n||0,heldoutAccuracy:evaluation.text?.aligned,heldoutPersistence:evaluation.text?.persistence});
 const item={world:'text',episode,source:batch[0].source,actual:Buffer.from(bytes).toString('latin1'),
  characters:bytes.length,totalBatchCharacters:batch.reduce((s,x)=>s+x.bytes.length,0),
  exercisesInBatch:batch.length,onlineAccuracy:acc,observations,heldout:evaluation.text||null,
  measuredNonAscii:batch.reduce((s,x)=>s+x.nonAscii,0),geometryHeldout:heldoutGeo,
  corpusCycles,sourceNewExamples:corpusCycles===0,trainingPath:gpuMeta?'Original V17 GPU alignment + one CPU replay sample':'Original V17 CPU Brain.live',
  gpuBatch:gpuMeta,pathRows,causalRows,causalActions,causalNavigation:evaluation.text?.causalNavigation||null,
  goalNavigation:evaluation.text?.navigation||null,assessment};
 last.text=item;
 return {world:'text',episode,trainSymbols:item.totalBatchCharacters,source:item.source,corpusCycles,worldsInBatch:batch.length,
   gpuBatch:gpuMeta,heldoutAccuracy:evaluation.text?.aligned??null,heldoutPersistence:evaluation.text?.persistence??null,
   heldoutCheckedAt:evaluation.text?.checkedAtEpisode??null,heldoutWindow:evaluation.text?.heldoutWindow??null,
   pathRows,causalRows,causalActions,causalHeldoutF1:evaluation.text?.causalNavigation?.metrics?.f1??null,
   goalNavigationF1:evaluation.text?.navigation?.metrics?.f1??null,
   v17GenerationBaselineF1:evaluation.text?.navigation?.baseline?.f1??null,assessment};
}
function mazeEpisode(){
 stage='learning maze';const D=brain.disc,origChoose=D.choose,origLearn=D.learnStep;
 let pending=null;const actions=[];
 D.choose=function(ret,n,me,visits,plan){
  const c=origChoose.call(this,ret,n,me,visits,plan);
  pending={step:actions.length,how:c.how,output:c.o,predictedPlan:plan?plan.slice(0,200):null,
    observableBefore:ret.slice(),observedSelf:ret.indexOf(3)};
  return c;
 };
 D.learnStep=function(before,after,n,o,me){
  const out=origLearn.call(this,before,after,n,o,me);
  const ev={...pending,output:o,observableBefore:before.slice(),observableAfter:after.slice(),
    actualSelf:after.indexOf(3),moved:before.indexOf(3)!==after.indexOf(3),predictionAvailable:!!pending?.predictedPlan?.length};
  actions.push(ev);
  if(actions.length%8===0)emitProgress({world:'maze',step:actions.length,expected:pending?.predictedPlan?.[0]??null,observed:ev.actualSelf});
  pending=null;return out;
 };
 let r;
 try{r=brain.playMaze(true);}finally{delete D.choose;delete D.learnStep;}
 const heldoutGeo=episode%5===0;
 let prev=null;
 for(const a of actions){
  if(a.observedSelf<0||a.actualSelf<0)continue;
  const x=observedFeatures('maze',{n:r.n,index:a.observedSelf,goal:r.goal,wall:r.wall}),
    y=observedFeatures('maze',{n:r.n,index:a.actualSelf,goal:r.goal,wall:r.wall});
  geoSample('maze',x,y,prev||x,a.output??0,heldoutGeo);prev=x;
 }
 const item={world:'maze',episode,n:r.n,wall:r.wall,start:r.start,goal:r.goal,path:r.path,
  shapes:r.shapes,actions,solved:r.solved,steps:r.steps,optimal:r.optimal,first:r.first,
  how:r.how,knows:r.knows,geometryHeldout:heldoutGeo,assessment:labelEvent('maze',r)};
 last.maze=item;
 if(brain.mazes.played%8===0)evaluation.maze=brain.testMazes(6);
 return {world:'maze',episode,solved:r.solved,actions:r.steps,optimal:r.optimal,assessment:item.assessment};
}
function transformEpisode(){
 stage='learning transformation game';brain.tWorld();
 const agent=brain.causal,origChoose=agent.choose,origLearn=agent.learn;
 let pending=null;const actions=[];
 agent.choose=function(b,n,g){
  const c=origChoose.call(this,b,n,g);
  let guess=null;
  if(Number.isInteger(c.at)&&c.at>=0&&Number.isInteger(c.o)){
   const r=this.predict(b,n,c.at,c.o);guess=r?.b?.slice()||null;
  }
  pending={step:actions.length,how:c.how,output:c.o,predictedPlan:c.plan?c.plan.slice(0,100):null,
    preActionPrediction:guess,before:b.slice(),goal:g.slice()};
  return c;
 };
 agent.learn=function(before,after,n,at,o,...rest){
  const out=origLearn.call(this,before,after,n,at,o,...rest);
  const a={...pending,output:o,before:before.slice(),after:after.slice(),
    predictionMatched:pending?.preActionPrediction?pending.preActionPrediction.every((v,i)=>v===after[i]):null};
  actions.push(a);
  if(actions.length%6===0)emitProgress({world:'transform',step:actions.length,
    expected:pending?.preActionPrediction?.slice(0,10)||null,observed:after.slice(0,10)});
  pending=null;return out;
 };
 let r,t;
 try{r=brain.playTransform(true);t=brain.trans.last;}finally{delete agent.choose;delete agent.learn;}
 const heldoutGeo=episode%5===0;
 let prev=null;
 for(const a of actions){
  const x=observedFeatures('transform',{n:r.n,board:a.before,goal:t.goal}),
    y=observedFeatures('transform',{n:r.n,board:a.after,goal:t.goal});
  geoSample('transform',x,y,prev||x,a.output??0,heldoutGeo);prev=x;
 }
 const item={world:'transform',episode,n:r.n,frames:t?.frames||[],goal:t?.goal||[],
  goals:t?.goals||[],solved:r.solved,steps:r.steps,optimal:r.optimal,failed:r.failed,
  predicted:r.predicted,how:r.how,said:r.said,actions,geometryHeldout:heldoutGeo,
  assessment:labelEvent('transform',r)};
 last.transform=item;
 return {world:'transform',episode,solved:r.solved,actions:r.steps,checked:r.predicted,failed:r.failed,assessment:item.assessment};
}
// A GPU batch is the original V17 training, not a UI simulation.
// Only its recorded representative trace is rendered; other worlds are shown as aggregates.
function replayFromGpuPath(r){
 const path=r.path||[],events=[];
 for(let i=1;i<path.length;i++)events.push({step:i-1,observableBefore:[],observableAfter:[],
   observedSelf:path[i-1],actualSelf:path[i],moved:path[i-1]!==path[i],
   output:null,how:'recorded GPU-batch replay; per-action planning not available',
   predictedPlan:null,predictionAvailable:false});
 return events;
}
async function gpuMazeEpisode(){
 stage='parallel CUDA labyrinth learning';
 const stats=await gpuRunner.maze(brain,(phase,done,total)=>emitProgress({world:'maze',phase,step:done,total,expected:null,observed:null}));
 gpuWorldsProcessed+=stats.worlds;
 const r=brain.mazes.last;
 if(!r)throw Error('V17 CUDA batch did not return a recorded maze sample');
 const actions=replayFromGpuPath(r);
 const heldoutGeo=episode%5===0;
 let prev=null;
 for(const a of actions){
  if(a.observedSelf<0||a.actualSelf<0)continue;
  const x=observedFeatures('maze',{n:r.n,index:a.observedSelf,goal:r.goal,wall:r.wall}),
    y=observedFeatures('maze',{n:r.n,index:a.actualSelf,goal:r.goal,wall:r.wall});
  geoSample('maze',x,y,prev||x,0,heldoutGeo);prev=x;
 }
 const item={world:'maze',episode,n:r.n,wall:r.wall,start:r.start,goal:r.goal,path:r.path,
  shapes:r.shapes,actions,solved:r.solved,steps:r.steps,optimal:r.optimal,first:r.first,
  how:r.how,knows:r.knows,geometryHeldout:heldoutGeo,
  gpuBatch:stats,replayProvenance:'Representative world recorded inside original V17 GPU learning batch',
  assessment:labelEvent('maze',r)};
 last.maze=item;
 if(episode%8===0)evaluation.maze=brain.testMazes(6);
 return {world:'maze',episode,solved:r.solved,actions:r.steps,optimal:r.optimal,
   batchWorlds:stats.worlds,batchSolved:stats.solved,gpuBatch:stats,
   assessment:{status:stats.solved===stats.worlds?'BETTER':stats.solved===0?'WORSE':'MIXED',
    title:'Actual CUDA batch completed',
    why:'GPU-trained '+stats.worlds+' original V17 mazes; '+stats.solved+' reached the target. Replay is from one measured world only.'}};
}
async function gpuTransformEpisode(){
 stage='parallel CUDA transformation physics + CPU causal updates';
 const stats=await gpuRunner.transform(brain,(phase,done,total)=>emitProgress({world:'transform',phase,step:done,total,expected:null,observed:null}));
 gpuWorldsProcessed+=stats.worlds;
 const r=brain.trans?.last;if(!r?.frames?.length)throw Error('V17 GPU transform batch did not record frames');
 const actions=[];
 const heldoutGeo=episode%5===0;let prev=null;
 for(let i=0;i<r.frames.length-1;i++){
  const before=r.frames[i].b,after=r.frames[i+1].b;
  if(!before||!after)continue;
  actions.push({step:i,before,after,output:null,how:'GPU batch physics + V17 causal update',
    preActionPrediction:null,predictionMatched:null});
  const x=observedFeatures('transform',{n:r.n,board:before,goal:r.goal}),
    y=observedFeatures('transform',{n:r.n,board:after,goal:r.goal});
  geoSample('transform',x,y,prev||x,0,heldoutGeo);prev=x;
 }
 const item={world:'transform',episode,n:r.n,frames:r.frames,goal:r.goal,goals:r.goals||[],
  solved:r.solved,steps:r.steps,optimal:r.optimal,failed:null,predicted:0,how:'CUDA batch',said:r.said,
  actions,geometryHeldout:heldoutGeo,gpuBatch:stats,
  replayProvenance:'One real recorded world of '+stats.worlds+' GPU physics worlds; individual hidden decisions not streamed',
  assessment:labelEvent('transform',r)};
 last.transform=item;
 return {world:'transform',episode,solved:r.solved,actions:r.steps,batchWorlds:stats.worlds,gpuBatch:stats,assessment:item.assessment};
}
let activeStep=false,pendingSave=false;
async function tick(){
 if(!run||paused||activeStep)return;
 activeStep=true;
 const now=performance.now();
 try{
  ensureBrain(true);
  const mode=modes[idx++%modes.length];episode++;progress={world:mode,step:0,expected:null,observed:null};
  emitProgress(progress);
  const outcome=await (mode==='text'?textEpisode():mode==='maze'?gpuRunner.active?gpuMazeEpisode():mazeEpisode():gpuRunner.active?gpuTransformEpisode():transformEpisode());
  if(gpuRunner.active&&bufferedGeometry.length){
   const trained=await gpuRunner.geometry(geo,bufferedGeometry.splice(0));
   geo=GeometricLearningLab.restore(trained.state);
   cudaAuxLast={...(cudaAuxLast||{}),geometry:{device:trained.device,trained:trained.trained,evaluated:trained.evaluated,
    elapsedMs:trained.elapsedMs,peakVramGB:trained.peakVramGB,kernelGroups:trained.kernelGroups}};
  }
  if(!gpuRunner.active&&mode!=='text')gpuWorldsProcessed++;
  // CPU mode counts one world per episode; CUDA mode counts verified batch worlds.
  lastDurationMs=Math.round(performance.now()-now);
  const row={...outcome,at:new Date().toISOString(),durationMs:lastDurationMs,
    geometry:(()=>{const g=geo.summary().lanes[mode];return {assessment:g.assessment,evalN:g.evalN,evalRMSE:g.evalRMSE,baselineRMSE:g.baselineRMSE,improvement:g.improvement};})()};
  history.push(row);history=bounded(history,300);
  if(remaining>0&&--remaining===0)run=false;
  stage=run?'between episodes':'idle';
  if(episode%12===0||!run)save();else publish();
 }catch(e){error=String(e.stack||e);run=false;stage='error';publish();}
 finally{activeStep=false;if(pendingSave){pendingSave=false;try{save();}catch(e){error='Checkpoint save failed: '+String(e.stack||e);publish();}}
  if(!run&&gpuRunner.active){gpuRunner.close();publish();}
  if(run&&!paused)setImmediate(tick);}
}
let preparing=false;
parentPort.on('message',async m=>{
 try{
  const action=m?.action;
  if(action==='start'){
   if(run||activeStep||preparing)throw Error('A training run is already active');
   ensureBrain(m.resume!==false);
   const selected=Array.isArray(m.worlds)?m.worlds.filter(x=>modesAllowed.includes(x)):[];
   if(!selected.length)throw Error('Select at least one real world');
   modes=[...new Set(selected)];
   causalTraining=m.causalTextEnabled!==false;
   causalMaxActions=Math.max(1,Math.min(256,Math.trunc(Number(m.causalMaxActions)||48)));
   const previousRoot=sourceRoot;
   if(m.sourceKind==='docs'){
    sourceRoot='';userText=false;if(previousRoot)cursor=0;
   }else if(m.sourceKind==='parquet'){
    if(typeof m.datasetRoot!=='string'||!m.datasetRoot.trim())throw Error('Enter the folder containing Parquet training files');
    sourceRoot=m.datasetRoot.trim();userText=false;
    if(sourceRoot!==previousRoot){dataset=null;datasetIndex=0;datasetTestIndex=0;corpusCycles=0;}
   }else if(m.sourceKind==='pasted'){
    if(typeof m.text!=='string'||!m.text.trim())throw Error('Paste text before selecting pasted-text training');
    if(sourceText!==m.text){cursor=0;corpusCycles=0;heldWindowIndex=0;}
    sourceRoot='';sourceText=m.text.slice(0,250000);userText=true;dataset=null;
   }else if(typeof m.text==='string'&&m.text.trim()){
    if(sourceText!==m.text){cursor=0;corpusCycles=0;heldWindowIndex=0;}
    sourceRoot='';sourceText=m.text.slice(0,250000);userText=true;
   }
   bufferedGeometry.length=0;cudaAuxLast=null;
   preparing=true;gpuError=null;error=null;paused=false;stage='preparing training';publish();
   try{
    if(modes.includes('text'))await ensureDataset();
    gpuRequested=!!m.gpu?.enabled;
    if(gpuRequested){
     stage='verifying real CUDA backend';publish();
     await gpuRunner.start(m.gpu);
    }else{
     gpuRunner.close();
    }
   }catch(e){gpuError=String(e.stack||e);gpuRunner.close();throw e;}
   finally{if(!preparing){gpuRunner.close();}}
   if(!preparing){stage='cancelled during setup';publish();return;}
   preparing=false;
   remaining=m.infinite?0:Math.max(1,Math.min(100,Math.trunc(Number(m.episodes)||3)));
   learningStart=performance.now();throughputBase=gpuWorldsProcessed;run=true;paused=false;error=null;
   stage=gpuRunner.active?'CUDA GPU verified: training':'CPU training';publish();setImmediate(tick);
  }else if(action==='causalNavigate'){
   ensureBrain(true);
   const prompt=String(m.prompt||'').trim().slice(0,1600);
   if(!prompt)throw Error('Enter a nonempty causal-language question');
   if(!causalAgent.value.updates)throw Error('Train on actual Q/A examples before causal navigation');
   const route=causalAgent.navigate(prompt,pathHead,{steps:64});
   navigationQuery={status:'CAUSAL_QUERY',prompt,causalRoute:route,at:new Date().toISOString(),
    note:'No reference answer or training reward supplied for this query.'};
   publish();
  }else if(action==='navigate'){
   ensureBrain(true);
   const prompt=String(m.prompt||'').trim().slice(0,1600);
   if(!prompt)throw Error('Enter a nonempty text question');
   if(!pathHead.rows)throw Error('Train on real Q/A examples first; no navigation actions have been learned');
   const route=pathHead.plan(prompt,{maxSteps:48,beamWidth:4,branching:7});
   navigationQuery={status:'USER_QUERY',prompt,route,at:new Date().toISOString(),
    note:'No reference answer or oracle was supplied for this query.'};
   publish();
  }else if(action==='textAction'){
   ensureBrain(true);
   const source=navigationQuery?.route;
   if(!source)throw Error('Navigate a text prompt before selecting an action');
   const step=Number(m.step),token=String(m.token||'');
   if(!Number.isInteger(step)||step<0||step>=source.actions.length)throw Error('Invalid path action step');
   const selected=source.actions[step];
   if(!selected.alternatives?.some(a=>a.action===token))throw Error('Selected action was not among learned candidates at this step');
   const prefix=[...(source.prefix||[]),...source.actions.slice(0,step).map(a=>a.action).filter(a=>a!=='<eos>'),token].filter(a=>a!=='<eos>');
   const route=pathHead.plan(navigationQuery.prompt,{prefix,maxSteps:48,beamWidth:4,branching:7});
   navigationQuery={...navigationQuery,route,selected:{step,token,at:new Date().toISOString()}};
   publish();
  }else if(action==='pause'){
   paused=true;stage=activeStep?'pause requested: after current batch':'paused';publish();
  }else if(action==='resume'){
   if(!run)throw Error('Not running; choose Train to continue');
   paused=false;stage='resumed';publish();setImmediate(tick);
  }else if(action==='stop'){
   run=false;paused=false;preparing=false;
   stage=activeStep?'stopping after current batch':'stopped';
   if(activeStep)pendingSave=true;else {save();gpuRunner.close();}
  }else if(action==='save'){
   if(activeStep){pendingSave=true;stage='save requested: after current batch';publish();}
   else save();
  }else if(action==='load'){
   if(run||activeStep||preparing)throw Error('Stop training before loading');
   gpuRunner.close();brain=null;geo=null;pathHead=null;causalAgent=null;dataset=null;navigationQuery=null;ensureBrain(true);publish();
  }else if(action==='reset'){
   if(run||activeStep||preparing)throw Error('Stop before resetting the isolated brain');
   gpuRunner.close();
   const stamp=new Date().toISOString().replace(/[^0-9]/g,'');
   for(const file of [checkpoint,geoFile,obsFile,pathFile,causalFile])if(fs.existsSync(file))fs.renameSync(file,file+'.backup-'+stamp);
   brain=null;geo=null;pathHead=null;causalAgent=null;dataset=null;episode=idx=cursor=seenTexts=0;sourceText='';userText=false;sourceRoot='';
   datasetIndex=datasetTestIndex=corpusCycles=heldWindowIndex=sourceSamples=gpuWorldsProcessed=throughputBase=0;
   backupLegacy=false;bufferedGeometry.length=0;cudaAuxLast=null;
   last={text:null,maze:null,transform:null};evaluation={};history=[];error=null;gpuError=null;gpuRequested=false;navigationQuery=null;
   ensureBrain(false);stage='new isolated brain';save();
  }else if(action==='state')publish();
  else throw Error('Unknown command');
 }catch(e){preparing=false;run=false;error=String(e.stack||e);stage='error';publish();}
});
try{if(fs.existsSync(checkpoint))ensureBrain(true);else ensureBrain(false);publish();}
catch(e){error=String(e.stack||e);stage='error';brain=null;geo=null;pathHead=null;causalAgent=null;publish();}
