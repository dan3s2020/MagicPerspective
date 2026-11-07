import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {createServer} from 'node:net';
import {mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const native=path.join(root,'transcend/torus-aether/devour/devour.mjs');
const pause=n=>new Promise(resolve=>setTimeout(resolve,n));
const freePort=()=>new Promise((resolve,reject)=>{
 const s=createServer();s.once('error',reject);s.listen(0,'127.0.0.1',()=>{
  const port=s.address().port;s.close(e=>e?reject(e):resolve(port));
 });
});
async function request(url,body){
 const r=await fetch(url,{method:'POST',headers:{'content-type':'application/json'},
  body:JSON.stringify(body),signal:AbortSignal.timeout(60000)});
 assert.equal(r.status,200);
 return r.json();
}
function makeLong(n,position){
 const words=Array.from({length:n},(_,i)=>'word_'+i);
 words[position]='tea';
 return {source:words.join(' ')+'.',
   expected:words.map(x=>x==='tea'?'coffee':x).join(' ')+'.'};
}
test('native original worker: path-answer generated from frozen Discoverer, atlas persisted; missing rule/unknown grammar fail', {timeout:95000},async()=>{
 const temp=mkdtempSync(path.join(os.tmpdir(),'mp-v31-http-')),
  data=path.join(temp,'training.txt'),out=path.join(temp,'runtime'),
  port=await freePort(),base='http://127.0.0.1:'+port;
 const docs=Array.from({length:32},(_,i)=>
   'Mira buys tea. Mira buys coffee. Ivo likes tea. Ivo likes coffee. World_'+i+' is observed.');
 writeFileSync(data,docs.join('\n\n')+'\n');
 const child=spawn(process.execPath,[native,'--workers','1','--arms','stable+many',
  '--worlds','text,cognitivemap','--text',data,'--gpu','off','--out',out,'--port',String(port),'--start'],
  {cwd:root,env:{...process.env,MP_NO_BROWSER:'1'},stdio:['ignore','pipe','pipe']});
 let log='';
 for(const stream of [child.stdout,child.stderr])stream.on('data',chunk=>{log=(log+chunk.toString()).slice(-20000);});
 try{
  let docCount=0;const start=Date.now();
  while(Date.now()-start<40000){
   if(child.exitCode!==null)throw Error('Native worker exited early '+log);
   try{
    const r=await fetch(base+'/graph?w=0',{signal:AbortSignal.timeout(5000)});
    const x=await r.json();docCount=x.cognitive?.documents||0;
    if(docCount>=8)break;
   }catch{}
   await pause(150);
  }
  assert.ok(docCount>=8,'Actual worker did not learn enough documents: '+log);
  const html=await(await fetch(base+'/transcend/torus-aether/ui/index.html?live=1',
    {signal:AbortSignal.timeout(6000)})).text();
  assert.match(html,/id="v31PathPanel"/);
  assert.match(html,/id="v31PathInput"/);
  assert.match(html,/src="v31-path-answer-ui.js"/);
  assert.match(html,/id="v30AtlasCanvas"/);
  assert.match(html,/id="datasetProgressBar"/);
  const js=await(await fetch(base+'/transcend/torus-aether/ui/v31-path-answer-ui.js',
    {signal:AbortSignal.timeout(6000)})).text();
  assert.match(js,/fetch\("\/path-answer"/);
  assert.match(js,/v30AtlasReload/);
  assert.doesNotMatch(js,/reference\s*:/,'The native request must not include reference answers');

  const full=makeLong(400,302),question='Replace "tea" with "coffee" in:\n'+full.source;
  const good=await request(base+'/path-answer',{w:0,question,maxTokens:512});
  assert.ok(!good.error,JSON.stringify(good));
  assert.equal(good.found,true);
  assert.equal(good.answer,full.expected);
  assert.equal(good.originalMethod,'Discoverer.shape');
  assert.equal(good.actualWriter,'PATH_TERMINAL_STATE_READOUT_NOT_LEGACY_ALIGNING_GRAPH');
  assert.equal(good.path.length,1);
  assert.equal(good.path[0].crossWorld,true);
  assert.equal(good.referenceWasNotProvided,true);
  const unknown=await request(base+'/path-answer',{w:0,
   question:'Replace "tea" with "unseenword" in:\nAda keeps tea.',maxTokens:512});
  assert.equal(unknown.found,false);
  assert.equal(unknown.answer,null);
  const rejected=await request(base+'/path-answer',{w:0,question,reference:full.expected});
  assert.match(rejected.error,/Reference answer must NEVER enter/);
  const unsupported=await request(base+'/path-answer',{w:0,question:'Why is the sky blue?'});
  assert.equal(unsupported.found,false);
  assert.equal(unsupported.reason,'UNSUPPORTED_INSTRUCTION_GRAMMAR');
  const fullAtlas=await(await fetch(base+'/atlas?w=0&cursor=0&limit=200&kind=planning-attempt')).json();
  assert.ok(fullAtlas.rows.length>=3);
  const hits=fullAtlas.rows.filter(x=>x.pathDrivenAnswer!==undefined);
  assert.equal(hits.length,3,'Exactly successful, unknown and unsupported attempts — leaked reference rejected');
  assert.equal(hits[0].pathDrivenAnswer,full.expected);
  assert.ok(hits[0].fullAtlas.states.length>=2);
  assert.equal(hits[0].fullPredictedPath.length,1);
  assert.equal(hits[1].found,false);
  console.log('V31_NATIVE_REAL_HTTP',JSON.stringify({
    docs:docCount,fullAnswerCorrect:true,characters:full.expected.length,
    exactPath:'Discoverer.shape',unknownOperatorAbstained:true,
    unknownQuestionAbstained:true,noGroundTruthLeak:true,
    eventsRecorded:hits.length,graphStates:hits[0].fullAtlas.states.length,
    gpu:'off on GitHub; local CUDA not measured'
  }));
 }finally{
  if(child.exitCode===null){const ended=new Promise(ok=>child.once('exit',ok));
   child.kill('SIGTERM');await Promise.race([ended,pause(1500)]);
   if(child.exitCode===null)child.kill('SIGKILL');}
  rmSync(temp,{recursive:true,force:true});
 }
});
