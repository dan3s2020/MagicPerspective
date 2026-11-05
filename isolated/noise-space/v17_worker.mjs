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

const here=path.dirname(fileURLToPath(import.meta.url)),dir=path.join(here,'runs','real-v17');
fs.mkdirSync(dir,{recursive:true});
const checkpoint=path.join(dir,'brain.v8'),geoFile=path.join(dir,'geometry.json'),obsFile=path.join(dir,'observatory.json');
const docs=path.resolve(here,'../../v17/docs/TORUS_AETHER_ABC_20261104.md');
const modesAllowed=['text','maze','transform'];
let brain=null,geo=null,run=false,paused=false,remaining=0,modes=modesAllowed.slice();
let episode=0,idx=0,cursor=0,sourceText='',userText=false,seenTexts=0;
let last={text:null,maze:null,transform:null},history=[],error=null,lastSave=null,evaluation={};
let stage='idle',lastDurationMs=null,progress={world:null,step:0,expected:null,observed:null};
let gpuRunner=new IsolatedGpuRunner(),gpuRequested=false,gpuError=null,sourceRoot='',dataset=null,datasetIndex=0,datasetTestIndex=0;
let corpusCycles=0,heldWindowIndex=0,sourceSamples=0,gpuWorldsProcessed=0,learningStart=performance.now();
const bounded=(a,k=300)=>a.length>k?a.slice(-k):a;
const finite=v=>Number.isFinite(v)?v:null;
const ascii=s=>Array.from(s,c=>{const n=c.charCodeAt(0);return n===10||n===9||(n>=32&&n<127)?n:63;});
const asciiChar=y=>y===10?'↵':y===9?'⇥':y===32?'␣':y>=32&&y<127?String.fromCharCode(y):'['+y+']';
const writeJSON=(file,v)=>{const tmp=file+'.tmp';fs.writeFileSync(tmp,JSON.stringify(v));fs.renameSync(tmp,file);};
function ensureBrain(resume=true){
 if(brain)return;
 if(resume&&fs.existsSync(checkpoint))brain=Brain.load(checkpoint);else brain=new Brain({seed:11,rules:{}});
 if(resume&&fs.existsSync(geoFile)){geo=GeometricLearningLab.restore(JSON.parse(fs.readFileSync(geoFile,'utf8')));}
 else geo=new GeometricLearningLab(brain.seed||11);
 if(resume&&fs.existsSync(obsFile)){
  const m=JSON.parse(fs.readFileSync(obsFile,'utf8'));
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
  trainingRate:{worlds:gpuWorldsProcessed,elapsedSec:Math.round((performance.now()-learningStart)/1000),worldsPerSec:gpuWorldsProcessed/Math.max(1,(performance.now()-learningStart)/1000)},
  sourceTextLabel:userText?'User-supplied text':'V17 repository technical documentation',
  conversionWarning:'The original V17 text learner maps non-ASCII characters to ASCII question marks.',
  last,evaluation,history:bounded(history,120),geometry:geo?.summary()||null,
  lastSave,error,lastDurationMs,checkpoint:path.relative(here,checkpoint),
  trace:withTrace&&brain?copyTrace():null,
  crossWorld:{status:'UNVERIFIED',why:'Training the same Brain in several worlds does not by itself prove that their observations share a single hidden trajectory. Pair identifiers or independent transfer tests are needed.'}};
}
function publish(){parentPort.postMessage({type:'state',state:state()});}
function emitProgress(p){progress={...progress,...p};parentPort.postMessage({type:'progress',progress:{...progress,stage,episode,learned:brain?.lived||0}});}
function save(){
 ensureBrain(false);
 const bytes=brain.save(checkpoint);
 writeJSON(geoFile,geo.export());
 lastSave={at:new Date().toISOString(),bytes};
 writeJSON(obsFile,{version:1,episode,idx,cursor,sourceText,userText,seenTexts,history,evaluation,last,lastSave,
  sourceRoot,datasetIndex,datasetTestIndex,corpusCycles,heldWindowIndex,sourceSamples,gpuWorldsProcessed});
 publish();
}
function geoSample(world,x,y,prev,action,heldout){
 if(!geo)return;
 try{geo.consume({world,x,y,prev,action,heldout});}
 catch(e){error='Geometry sample rejected ('+world+'): '+e.message;}
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
function textEpisode(){
 stage='learning text';const {train,held,nonAscii}=splitSource();
 if(!train.length)throw Error('Training text is empty');
 if(cursor>=train.length)cursor=0;
 const chunk=train.slice(cursor,cursor+Math.min(320,train.length));cursor+=chunk.length;
 brain.beginExercise();
 const A=brain.align,original=A.live,observations=[];
 const beforeHits=A.hits,beforeSeen=A.lived;
 A.live=function(y,opts){
  const r=original.call(this,y,opts);
  observations.push({step:observations.length,actual:y,predicted:r.guess,correct:r.guess===y,
    from:r.src===null?'none':JSON.stringify(r.src)});
  if(observations.length%96===0)emitProgress({world:'text',step:observations.length,expected:r.guess,observed:y});
  return r;
 };
 try{for(const y of chunk){brain.live(y,brain.lived%32===0);brain.chars++;}}
 finally{delete A.live;}
 seenTexts++;
 const heldoutGeo=episode%5===0;
 geometryForText(chunk,heldoutGeo);
 if(seenTexts%4===0&&held.length>=80){
  const H=held.slice(0,Math.min(420,held.length)),r=brain.evalText(H,H.length);
  const persistence=H.reduce((sum,y,i)=>sum+(i>0&&y===H[i-1]),0)/H.length;
  evaluation.text={frozen:true,n:H.length,aligned:r.aligned,chain:r.live,persistence,
    sampledPredictions:r.rows.slice(0,100).map((z,i)=>({step:i,actual:z[0],predicted:z[1],old:z[3]})),
    assessment:labelEvent('text',{n:H.length,heldoutAccuracy:r.aligned,heldoutPersistence:persistence})};
 }
 const acc=(A.hits-beforeHits)/Math.max(1,A.lived-beforeSeen);
 const item={world:'text',episode,source:userText?'Pasted text':'V17 documentation',actual:Buffer.from(chunk).toString('latin1'),
  characters:chunk.length,onlineAccuracy:acc,observations,heldout:evaluation.text||null,
  measuredNonAscii:nonAscii,geometryHeldout:heldoutGeo,
  assessment:labelEvent('text',{n:evaluation.text?.n||0,heldoutAccuracy:evaluation.text?.aligned,heldoutPersistence:evaluation.text?.persistence})};
 last.text=item;
 return {world:'text',episode,trainSymbols:chunk.length,heldoutAccuracy:evaluation.text?.aligned||null,assessment:item.assessment};
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
function tick(){
 if(!run||paused)return;
 const now=performance.now();
 try{
  ensureBrain(true);
  const mode=modes[idx++%modes.length];episode++;progress={world:mode,step:0,expected:null,observed:null};
  emitProgress(progress);
  const outcome=mode==='text'?textEpisode():mode==='maze'?mazeEpisode():transformEpisode();
  lastDurationMs=Math.round(performance.now()-now);
  const row={...outcome,at:new Date().toISOString(),durationMs:lastDurationMs,
    geometry:(()=>{const g=geo.summary().lanes[mode];return {assessment:g.assessment,evalN:g.evalN,evalRMSE:g.evalRMSE,baselineRMSE:g.baselineRMSE,improvement:g.improvement};})()};
  history.push(row);history=bounded(history,300);
  if(remaining>0&&--remaining===0)run=false;
  stage=run?'between episodes':'idle';
  if(episode%12===0||!run)save();else publish();
 }catch(e){error=String(e.stack||e);run=false;stage='error';publish();}
 if(run)setImmediate(tick);
}
parentPort.on('message',m=>{
 try{
  const action=m?.action;
  if(action==='start'){
   if(run)throw Error('Training already running');
   ensureBrain(m.resume!==false);
   const selected=Array.isArray(m.worlds)?m.worlds.filter(x=>modesAllowed.includes(x)):[];
   if(!selected.length)throw Error('Select at least one real world');
   modes=[...new Set(selected)];
   if(typeof m.text==='string'&&m.text.trim()){sourceText=m.text.slice(0,250000);userText=true;cursor=0;}
   run=true;paused=false;error=null;remaining=m.infinite?0:Math.max(1,Math.min(100,Math.trunc(Number(m.episodes)||3)));
   stage='starting';publish();setImmediate(tick);
  }else if(action==='pause'){paused=true;stage='paused after current episode';publish();}
  else if(action==='resume'){if(!run)throw Error('Not running; choose Train to continue');paused=false;stage='resumed';publish();setImmediate(tick);}
  else if(action==='stop'){run=false;paused=false;stage='stopped';save();}
  else if(action==='save'){save();}
  else if(action==='load'){if(run)throw Error('Stop before loading');brain=null;geo=null;ensureBrain(true);publish();}
  else if(action==='reset'){
   if(run)throw Error('Stop before starting a fresh run');
   const stamp=new Date().toISOString().replace(/[^0-9]/g,'');
   for(const file of [checkpoint,geoFile,obsFile])if(fs.existsSync(file))fs.renameSync(file,file+'.backup-'+stamp);
   brain=null;geo=null;episode=idx=cursor=seenTexts=0;sourceText='';userText=false;
   last={text:null,maze:null,transform:null};evaluation={};history=[];error=null;
   ensureBrain(false);stage='new isolated brain';save();
  }else if(action==='state')publish();
  else throw Error('Unknown action');
 }catch(e){error=String(e.stack||e);publish();}
});
try{if(fs.existsSync(checkpoint))ensureBrain(true);else ensureBrain(false);publish();}
catch(e){error=String(e.stack||e);stage='error';brain=null;geo=null;publish();}
