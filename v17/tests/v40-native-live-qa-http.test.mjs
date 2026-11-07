import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createServer} from 'node:net';
import {spawn} from 'node:child_process';
import crypto from 'node:crypto';
import {Brain} from '../transcend/torus-aether/devour/brain.mjs';
import {KIND,playExercise} from '../transcend/torus-aether/worlds/exercise.mjs';
import {makeMaze,seedOf,SEEDS} from '../transcend/torus-aether/worlds/labyrinth.mjs';
import {V40OriginalBrainEvidence} from '../research/text-hypermaze/v40-original-brain-evidence.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const native=path.join(root,'transcend/torus-aether/devour/devour.mjs');
const sha=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const delay=ms=>new Promise(done=>setTimeout(done,ms));
const port=()=>new Promise((ok,bad)=>{
 const s=createServer();s.once('error',bad);
 s.listen(0,'127.0.0.1',()=>{const p=s.address().port;s.close(e=>e?bad(e):ok(p));});
});
function brainFixture(){
 const brain=new Brain({rules:{depth:1,off:['R2','R4'],budEvery:100,empty:true,maxWires:32,fold:false},seed:11});
 for(let i=0;i<60;i++){
  playExercise(makeMaze(seedOf(SEEDS.train,501+i*23),[7,9,11][i%3]),brain.disc);
  if(i>=25&&brain.disc.attract(KIND.target)>.2&&brain.disc.conduct(KIND.floor)>=.5)break;
 }
 const integrated=new V40OriginalBrainEvidence(brain);
 for(const {id,states} of [
  {id:'test-1',states:['Mira buys tea.','Mira buys coffee.']},
  {id:'test-2',states:['Ivo likes tea.','Ivo likes coffee.']}
 ]){
  integrated.observeTextWorld(states.join(' '),id);
  assert.equal(integrated.observeInstructionEpisode({
   instruction:'Brew the refreshment',states,episodeId:id,
   executedTransitionsObserved:true}).ok,true);
 }
 const qas=[
  {question:'Which city was Ada born in?',context:'Ada was born in Lisbon. She moved to Oslo.',answer:'Lisbon',answerStart:16},
  {question:'Who founded the institute?',context:'Mira founded the institute in 1998.',answer:'Mira',answerStart:0},
  {question:'Which city hosted the meeting?',context:'The meeting was hosted in Rome yesterday.',answer:'Rome',answerStart:26},
  {question:'In which year was the lab established?',context:'The lab was established in 2018.',answer:'2018',answerStart:27}
 ];
 integrated.trainHumanQA(qas,{epochs:4,snapshotEvery:20,burnIn:0});
 assert.ok(integrated.qa.memory.averagedWeights.size>0);
 return brain;
}
test('V40 actual original V34 live HTTP worker answers from V36 and V39 memories in SAME Brain and existing original UI',{timeout:95000},async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'mp-v40-native-http-')),
  out=path.join(dir,'runtime'),brains=path.join(out,'brains'),
  source=path.join(dir,'training-source.txt'),p=await port(),base='http://127.0.0.1:'+p;
 fs.mkdirSync(brains,{recursive:true});
 const saved=path.join(brains,'brain-0-winner.v8');
 brainFixture().save(saved);
 const originalSHA=sha(saved);
 fs.writeFileSync(source,Array.from({length:25},(_,i)=>'Original living text paragraph '+i+' with enough information to be observed by actual native V17.').join('\n\n')+'\n');
 const child=spawn(process.execPath,[native,
  '--workers','1','--arms','winner','--worlds','text','--text',source,
  '--out',out,'--port',String(p),'--gpu','off','--resume'
 ],{cwd:root,env:{...process.env,MP_NO_BROWSER:'1'},stdio:['ignore','pipe','pipe']});
 let log='';
 for(const stream of [child.stdout,child.stderr])stream.on('data',b=>{log=(log+b.toString()).slice(-30000);});
 const post=async data=>{
  const res=await fetch(base+'/v40/answer?w=0',{method:'POST',
   headers:{'content-type':'application/json'},
   body:JSON.stringify(data),signal:AbortSignal.timeout(30000)});
  assert.equal(res.status,200);return res.json();
 };
 try{
  let ready=false;const t=Date.now();
  while(Date.now()-t<35000){
   if(child.exitCode!==null)throw Error('Native worker exited before HTTP: '+log);
   try{
    const r=await fetch(base+'/state',{signal:AbortSignal.timeout(2500)});
    if(r.ok){ready=true;break;}
   }catch{}
   await delay(150);
  }
  assert.equal(ready,true,'Native V34 actual HTTP unavailable '+log);
  const human=await post({kind:'human-extractive',
   question:'Which city hosted the meeting?',
   context:'The meeting was hosted in Rome yesterday.',includeAtlas:true});
  assert.equal(human.found,true,JSON.stringify(human));
  assert.equal(human.predicted,'Rome');
  assert.equal(human.originalMotor,'Discoverer.shapeGraph');
  assert.equal(human.originalSharedBrain,true);
  assert.ok(human.atlas?.nodes?.length>1);
  const intent=await post({kind:'instruction-goal',
   instruction:'Brew the refreshment',source:'Ada keeps tea.'});
  assert.equal(intent.found,true,JSON.stringify(intent));
  assert.equal(intent.answer,'Ada keeps coffee.');
  assert.equal(intent.source,'Discoverer.shape');
  assert.equal(intent.userSpecifiedDestinationToken,false);
  const unknown=await post({kind:'instruction-goal',
   instruction:'Invent unknown semantics',source:'Ada keeps tea.'});
  assert.equal(unknown.found,false);
  const leaked=await post({kind:'human-extractive',question:'Who was Ada?',
   context:'Ada was born in Lisbon.',reference:'Lisbon'});
  assert.match(leaked.error,/Reference answer/);
  const html=await(await fetch(base+'/transcend/torus-aether/ui/index.html?live=1')).text();
  assert.match(html,/id="v40LivePanel"/);
  assert.match(html,/id="v40LiveAsk"/);
  assert.match(html,/id="gpuDev"/);
  assert.match(html,/id="fullAtlasPanel"/);
  assert.match(html,/src="app.js"/);
  assert.match(html,/src="v40-live-human.js"/);
  const js=await(await fetch(base+'/transcend/torus-aether/ui/v40-live-human.js')).text();
  assert.match(js,/\/v40\/answer/);
  assert.doesNotMatch(js,/reference:|expected:/,'Frontend cannot inject gold into the native query');
  const journal=saved+'.v40-native-frozen-answer-atlas.jsonl';
  assert.ok(fs.existsSync(journal),'Original native V17 source journal absent');
  const rows=fs.readFileSync(journal,'utf8').trim().split('\n').map(JSON.parse);
  assert.equal(rows.length,3,'Exactly two planned predictions and one observed abstention');
  assert.equal(rows[0].result.predicted,'Rome');
  assert.equal(rows[1].result.answer,'Ada keeps coffee.');
  assert.equal(rows[2].result.found,false);
  assert.equal(sha(saved),originalSHA,'The ORIGINAL source checkpoint must not change from read-only answers');
  console.log('V40_NATIVE_REAL_LIVE_WORKER_AND_ORIGINAL_UI_PASS',JSON.stringify({
   realNativeHTTP:true,originalWorker:true,sameOriginalBrain:true,
   V39HumanAnswer:human.predicted,V36TargetFreeInstructionAnswer:intent.answer,
   fullSourceAtlasNodes:human.atlas.nodes.length,
   originalUIControlsPreserved:true,referenceInjectionBlocked:true,
   appendOnlyAttemptCount:rows.length,originalBrainSHAUnchanged:true,
   openThoughtsHumanSemantic100PercentProved:false
  }));
 }finally{
  if(child.exitCode===null){
   const done=new Promise(ok=>child.once('exit',ok));
   child.kill('SIGTERM');await Promise.race([done,delay(1500)]);
   if(child.exitCode===null)child.kill('SIGKILL');
  }
  fs.rmSync(dir,{force:true,recursive:true});
 }
});
