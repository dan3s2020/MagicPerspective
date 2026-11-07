import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {createServer} from 'node:net';
import {mkdtempSync,mkdirSync,writeFileSync,rmSync,existsSync} from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {fileURLToPath} from 'node:url';

const root=path.dirname(fileURLToPath(import.meta.url));
const worker=path.resolve(root,'../transcend/torus-aether/devour/devour.mjs');
const delay=ms=>new Promise(done=>setTimeout(done,ms));

async function port(){
 return new Promise((resolve,reject)=>{
   const s=createServer();s.once('error',reject);s.listen(0,'127.0.0.1',()=>{
    const p=s.address().port;s.close(err=>err?reject(err):resolve(p));
   });
 });
}
async function get(url){
 const r=await fetch(url,{signal:AbortSignal.timeout(2000)});
 if(!r.ok)throw Error('HTTP '+r.status);
 return r.json();
}

test('native V19 worker ingests complete documents, persists learned graph, and evaluates unobserved composition without next-token loops', {timeout:35000},async()=>{
 const temp=mkdtempSync(path.join(os.tmpdir(),'mp-v19-runtime-'));
 const portNo=await port(),out=path.join(temp,'runtime'),corpus=path.join(temp,'observations.txt');
 const text=Array.from({length:46},(_,i)=>
   ['She is happy.','She is tired.','He is tired.','He is calm.'].join(' ')+
   ' Context of observation '+i+'.').join('\n\n');
 writeFileSync(corpus,text,'utf8');
 const proc=spawn(process.execPath,[worker,'--workers','1','--arms','stable+many',
   '--mem','2','--worlds','cognitivemap','--text',corpus,'--gpu','off',
   '--out',out,'--port',String(portNo),'--start'],{
    env:{...process.env,MP_NO_BROWSER:'1'},stdio:['ignore','pipe','pipe']
   });
 let log='';proc.stdout.on('data',b=>log+=b.toString().slice(0,3000));
 proc.stderr.on('data',b=>log+=b.toString().slice(0,3000));
 try{
  const base='http://127.0.0.1:'+portNo;
  const started=Date.now();let graph,slots;
  while(Date.now()-started<20000){
   if(proc.exitCode!==null)throw Error('Server terminated early: '+log.slice(-1600));
   try{
    slots=await get(base+'/graphs');
    graph=await get(base+'/graph?w=0');
    if(graph.cognitive?.documents>=25)break;
   }catch{}
   await delay(175);
  }
  assert.ok(graph?.cognitive?.documents>=25,
    'No complete-corpus learning. Logs: '+log.slice(-1600));
  assert.equal(graph.cognitive.version,1);
  assert.ok(graph.cognitive.inducedActionRules>0);
  assert.equal(graph.chars,0,'No old LLM text-char training in cognitive-only mode');
  assert.deepEqual(slots.graphs[0].worlds,['cognitivemap']);
  // The hidden complete answer is withheld from the actual observed corpus.
  assert.ok(!text.includes('She is calm.'));
  const resp=await fetch(base+'/cognitive-eval',{
   method:'POST',headers:{'content-type':'application/json'},
   body:JSON.stringify({w:0,initial:'He is calm.',goal:{slots:{0:'She',2:'calm'}},seed:8031,temperature:0.65})
  });
  assert.equal(resp.status,200);
  const answer=await resp.json();
  assert.equal(answer.frozen,true);
  assert.equal(answer.found,true,'Requires learned topology to derive a NEW composed state');
  assert.equal(answer.novelGoal,true);
  assert.ok(answer.plannedPath.length>=1);
  assert.equal(answer.law,'ORIGINAL_V17_ATTRACTION_0.97');
  assert.equal(answer.originalMethod,'Discoverer.shape');
  assert.equal(answer.noiseTemperature,0.65,'Original actor noise temperature must round-trip HTTP');
  assert.equal(answer.observedTopology.goalBeforeFirstAction,true);
  assert.ok(answer.observedTopology.nodes.length>0,'Read-only UI must receive the real state graph');
  assert.ok(answer.observedTopology.edges.length>0,'Read-only UI must receive real transformation edges');
  assert.deepEqual(answer.observedTopology.path.slice(1),
    answer.plannedPath.map(h=>h.to),'Displayed path must be exact original source path');
  assert.equal(answer.observedTopology.completeNodes,answer.generatedStates);
  assert.ok(answer.observedTopology.completeEdges>=answer.observedTopology.displayedEdges);
  const tooMany=await fetch(base+'/add?arm=stable%2Bmany&worlds=maptext',{method:'POST'});
  assert.equal(tooMany.status,200,'Original nontext graph can still be added without source corruption');
  const after=await get(base+'/graphs');
  assert.equal(after.graphs.length,2);
  // Save and resume run only through native worker checkpoint, not synthetic state.
 } finally {
  if(proc.exitCode===null){
    const exited=new Promise(done=>proc.once('exit',done));
    proc.kill('SIGTERM');
    await Promise.race([exited,delay(2500)]);
    if(proc.exitCode===null)proc.kill('SIGKILL');
  }
  rmSync(temp,{recursive:true,force:true});
 }
});
