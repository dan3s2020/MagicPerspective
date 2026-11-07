// Original V17 organism, in a SEPARATE worker thread from fast CUDA
// TinyStories training. Its own sequential story cursor ensures no unbounded
// message queue and NO blocking of fast GPU text updates or the browser.
// The original Brain is unchanged: same live(), liveLanguage(), constructed
// paths, transformations, 5D geometry, maze body, perspective and causal world.
import {parentPort,workerData} from "node:worker_threads";
import fs from "node:fs";
import path from "node:path";
import {setImmediate as yieldNow} from "node:timers/promises";
import {Brain} from "../../transcend/torus-aether/devour/brain.mjs";
import {NativeSelfCodeWorld} from "../../transcend/torus-aether/devour/selfcode-native.mjs";
import {stories,sourceMetadata} from "./story-stream.mjs";

const out=workerData.out,checkpoint=path.join(out,"tinystories-native-v17.v8");
const rules={depth:1,off:["R2","R4"],budEvery:100,empty:true,maxWires:32,fold:false};
const c={margin:.05,window:400,many:12};
const symbolEvery=Math.max(1,Number(workerData.symbolEvery)||16);
const symbolBytes=Math.min(8192,Math.max(4,Number(workerData.symbolBytes)||48));
const worldEvery=Math.max(1,Number(workerData.worldEvery)||32);
const saveSeconds=Math.max(2,Number(workerData.saveSeconds)||45);
const since=()=>Date.now();
let brain,paused=true,stop=false,started=false,running=false,saveFlag=false;
let lastSent=0,lastCheckpoint=0,progressRows=0,progressOffset=0;
let worldEpisode=0,failed=null,evalBusy=false,exams=null,firstStart=0,bytesObserved=0;
let startRows=0;
let lastNativePrediction=null;
const send=(message)=>parentPort.postMessage(message);
const errors=e=>String(e?.stack||e?.message||e).slice(0,2400);

if(fs.existsSync(checkpoint)){
 brain=Brain.load(checkpoint);
 progressRows=Number(brain.tinyStoriesRows)||0;
 progressOffset=Number(brain.tinyStoriesOffset)||0;
 bytesObserved=Number(brain.tinySymbolBytes)||0;
 worldEpisode=Number(brain.tinyWorlds)||0;
}else brain=new Brain({rules,c,seed:11});
brain.enableEndogenousNoise();
exams=brain.tinyLastExam||null;
const selfcode=new NativeSelfCodeWorld({brain,saveFile:checkpoint,seed:brain.seed,enableEvaluator:false});

const worldStats=()=>{
 brain.tWorld();
 return {
  mazes:{played:brain.mazes.played,solved:brain.mazes.won,
   latest:brain.mazes.last?.solved??null,
   recent:brain.mazes.recent.length?brain.mazes.recent.at(-1):null,
   perspectiveEpisodes:brain.perspective?.episodes||0,
   constructedPaired:brain.constructedPaths?.paired||0},
  transformations:{played:brain.trans?.played||0,solved:brain.trans?.won||0,
   latest:brain.trans?.last?.solved??null,
   discoveredCausalRules:brain.causal?.rules?.size||0},
  text:{observedStories:progressRows,
   perspectives:brain.language?.report()?.trust||[],
   contextualStates:brain.language?.report()?.states||0,
   constructedTextPairs:brain.constructedPaths?.textRows||0,
   observedTransformations:brain.observedTransformations?.report()?.learnedOperators||0,
   sampledGraphBytes:bytesObserved,
   geometryLearnedSteps:brain.trace.geo?.n||0,
   graphNodes:brain.trace.nodes.size,graphEdges:brain.trace.edges.size,
   lastNativePrediction},
  noise:{decisions:brain.noiseAgent?.total||0,sites:brain.noiseAgent?.bySite||{}},
  selfCode:{...selfcode.status(),evaluatorEnabled:false}
 };
};
function status(includeGraph=false){
 const stat=worldStats();
 const o={type:"state",enabled:true,mode:"original-V17-brain-on-independent-CPU-worker",
  status:failed?"error":stop?"stopped":paused?"paused":running?"training":"ready",
  source:"same-real-TinyStories-train-file-independent-stream",
  gpuOriginal:false,workIndependentOfFastCuda:true,
  stories:progressRows,bytesRead:progressOffset,storiesPerSecond:firstStart?
   Number(((progressRows-startRows)/Math.max(.001,(since()-firstStart)/1000)).toFixed(2)):0,
  nativeTextSymbolEvery:symbolEvery,nativeTextBytesPerSelectedStory:symbolBytes,
  nativeGraphSamplingExplicit:true,worldIntervalStories:worldEvery,
  lastUpdate:since(),lastCheckpoint:brain.tinyLastSavedAt||null,
  checkpoint,exam:exams,error:failed,...stat};
 if(includeGraph){
  brain.organismView();
  const g=brain.trace.snapshot(true);
  o.graph={...g,text:g.text?.slice(-450)||""};
 }
 return o;
}
function publish(force=false,graph=false){
 if(!force&&since()-lastSent<700)return;
 lastSent=since();
 try{send(status(graph));}catch(e){failed=errors(e);send({type:"fatal",error:failed});}
}
function commit(){
 brain.tinyStoriesOffset=progressOffset;
 brain.tinyStoriesRows=progressRows;
 brain.tinySymbolBytes=bytesObserved;
 brain.tinyWorlds=worldEpisode;
 brain.tinyLastSavedAt=new Date().toISOString();
 selfcode.save();
 const size=brain.save(checkpoint);
 lastCheckpoint=since();saveFlag=false;
 send({type:"saved",path:checkpoint,bytes:size,rows:progressRows,offset:progressOffset});
 publish(true);
}
function ingest(text,storyNumber){
 const str=String(text||"");
 // Entire story is observed by native language perspectives, constructed
 // text path learner and native transformation difference observer.
 brain.liveLanguage(str);
 brain.learnObservedTransformations(str);
 const sentences=str.match(/[^.!?]+[.!?]+/gu)?.map(x=>x.trim()).filter(Boolean)||[];
 if(sentences.length>=2){
  const question=sentences[0].slice(0,240),answer=sentences[1].slice(0,320);
  if(question&&answer){
   // FROZEN forecast before reading the answer from this story.
   // Run only occasionally: constant latency cannot stall the fast CUDA lane.
   if(storyNumber%worldEvery===0){
    try{
     const found=brain.constructedPaths.imagineText(question,{maxChars:90,beamWidth:2});
     lastNativePrediction={storyNumber,question,actualNext:answer,
       predicted:found.predicted?.slice(0,160)||"",
       actions:found.path?.slice(0,24)||[],source:"before-learning-this-story",
       heldout:false};
    }catch(e){lastNativePrediction={storyNumber,error:String(e.message)};}
   }
   brain.learnConstructedText(question,answer);
  }
 }
 // Full original per-symbol C/A/5D/AligningGraph is expensive.
 // Sample explicit, measured prefixes; do NOT claim every byte learned
 // by this native graph. The independent fast CUDA learner sees ALL bytes.
 if(storyNumber%symbolEvery===0){
  brain.beginExercise();
  const observed=Buffer.from(str,"utf8").subarray(0,symbolBytes);
  for(const y of observed){
   // The original 128-symbol Brain's alphabet, as in its own worker.
   const x=y===9||y===10||(y>=32&&y<127)?y:63;
   brain.live(x,false);
   bytesObserved++;
  }
 }
 if((storyNumber+1)%worldEvery===0){
  brain.playMaze(true);
  brain.playTransform(true);
  selfcode.step();
  worldEpisode++;
 }
}
async function evaluate(){
 if(evalBusy)return;
 evalBusy=true;
 try{
  const valid=await sourceMetadata(workerData.valid);
  let passage="";
  for await(const row of stories(workerData.valid,{metadata:valid})){passage=row.text;break;}
  const text=passage?brain.testLanguage(passage,{maxTokens:700,seed:31}):null;
  const maze=brain.testMazes(4);
  const constructed=brain.testConstructedMaze(3,31,{record:false});
  const transforms=brain.testTransforms(3);
  exams={time:new Date().toISOString(),source:"unseen TinyStories-valid and unseen native world seeds",
   frozen:true,originalV17:true,
   language:{accuracy:text?.tokenPrediction?.accuracy??text?.tokenPrediction?.top1??null,
    details:text?.tokenPrediction||null},
   mazes:{count:maze.n,solvedRate:maze.solved,stepsOptimal:maze.ratio,shape:maze.shape},
   constructed:{count:constructed.count,solvedRate:constructed.successRate,
    paired:constructed.trainedPairs},
   transforms:{count:transforms.n,solvedRate:transforms.solved,
    stepsOptimal:transforms.ratio,predictionError:transforms.failedRate,
    impossible:transforms.impossible,recognizedImpossible:transforms.saidLimitation}};
  brain.tinyLastExam=exams;
  commit();
  publish(true);
 }catch(e){send({type:"exam-error",error:errors(e)});}
 finally{evalBusy=false;}
}
async function run(){
 if(running||failed||stop)return;
 running=true;paused=false;firstStart=since();startRows=progressRows;
 try{
  const meta=await sourceMetadata(workerData.train);
  for await(const item of stories(workerData.train,{startOffset:progressOffset,metadata:meta})){
   while(paused&&!stop){
    if(saveFlag)commit();
    publish();
    await new Promise(ok=>setTimeout(ok,80));
   }
   if(stop)break;
   ingest(item.text,progressRows);
   progressRows++;
   progressOffset=item.endOffset;
   if(saveFlag||since()-lastCheckpoint>=saveSeconds*1000)commit();
   publish(false,progressRows%8===0);
   await yieldNow();
  }
  if(!stop){paused=true;send({type:"finished",rows:progressRows,offset:progressOffset});}
  commit();
 }catch(e){failed=errors(e);send({type:"fatal",error:failed,rows:progressRows});}
 finally{running=false;publish(true,true);}
}
parentPort.on("message",m=>{
 if(!m||typeof m!=="object")return;
 if(m.type==="start"){paused=false;if(!running)void run();}
 if(m.type==="pause"){paused=true;publish(true);}
 if(m.type==="save"){saveFlag=true;if(!running)commit();}
 if(m.type==="evaluate"){if(!running||paused)void evaluate();else{
   // Schedule this only after current full native training step;
   // never train from the held-out validation file.
   void evaluate();
 }}
 if(m.type==="snapshot"){publish(true,true);}
 if(m.type==="stop"){stop=true;paused=false;saveFlag=true;if(!running){commit();send({type:"stopped"});parentPort.close();}}
});
publish(true,true);
