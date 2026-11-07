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
const delay=ms=>new Promise(ok=>setTimeout(ok,ms));
const port=()=>new Promise((ok,bad)=>{const s=createServer();s.once('error',bad);s.listen(0,'127.0.0.1',()=>{
 const p=s.address().port;s.close(err=>err?bad(err):ok(p));
});});

test('native V17 worker really exports the persisted complete atlas and existing V17 UI renders the new panel', {timeout:90000}, async()=>{
 const temp=mkdtempSync(path.join(os.tmpdir(),'mp-v30-real-http-'));
 const input=path.join(temp,'source.txt'),out=path.join(temp,'runtime');
 const docs=Array.from({length:24},(_,i)=>'Mira buys tea. Mira buys coffee. Ivo likes tea. Ivo likes coffee. World_'+i+' is observed.');
 writeFileSync(input,docs.join('\n\n')+'\n','utf8');
 const listen=await port();
 const proc=spawn(process.execPath,[native,'--workers','1','--arms','stable+many',
   '--worlds','cognitivemap','--text',input,'--gpu','off','--out',out,'--port',String(listen),'--start'],
   {cwd:root,env:{...process.env,MP_NO_BROWSER:'1'},stdio:['ignore','pipe','pipe']});
 let log='';
 for(const stream of [proc.stdout,proc.stderr])stream.on('data',b=>{log=(log+b.toString()).slice(-15000);});
 const base='http://127.0.0.1:'+listen;
 const get=async p=>{const r=await fetch(base+p,{signal:AbortSignal.timeout(5000)});if(!r.ok)throw Error(p+' '+r.status);return r.json();};
 const evalPlan=async(word)=>{const response=await fetch(base+'/cognitive-eval',{
  method:'POST',headers:{'content-type':'application/json'},
  body:JSON.stringify({w:0,initial:'Ada keeps tea.',goal:{slots:{2:word}},maxNodes:256,maxDepth:8}),
  signal:AbortSignal.timeout(18000)});
  assert.equal(response.status,200);return response.json();
 };
 try {
  let graph;const t=Date.now();
  while(Date.now()-t<40000){
    if(proc.exitCode!==null)throw Error('Native service crashed: '+log);
    try{graph=await get('/graph?w=0');if(graph.cognitive?.documents>=8)break;}catch{}
    await delay(150);
  }
  assert.ok(graph?.cognitive?.documents>=8,'No corpus ingestion '+log);
  const good=await evalPlan('coffee'),bad=await evalPlan('cocoa');
  assert.equal(good.found,true,'Native original learner did not recover previously seen portable effects');
  assert.equal(good.directOriginalMethod,'Discoverer.shape');
  assert.equal(good.usedCrossWorld,true);
  assert.equal(bad.found,false);
  assert.ok(bad.diagnostics.excludedByDesign.includes('MISSING_GOAL_TRANSFORMATION_OR_CONTEXT'));
  const page=await get('/atlas?w=0&cursor=0&limit=50&kind=planning-attempt');
  assert.ok(page.rows.length>=2,'No FULL attempts in native journal');
  assert.deepEqual(page.rows.slice(-2).map(x=>x.found),[true,false]);
  assert.ok(page.rows[page.rows.length-2].fullAtlas.states.length>=2);
  assert.ok(page.rows[page.rows.length-2].fullAtlas.neighbors.some(x=>x.some(e=>e.crossWorld)));
  assert.ok(page.rows[page.rows.length-1].diagnostics.goalTokensNeverGenerated.includes('cocoa'));
  const downloaded=await fetch(base+'/atlas-export?w=0',{signal:AbortSignal.timeout(10000)});
  assert.equal(downloaded.status,200);
  assert.match(downloaded.headers.get('content-type')||'',/ndjson/);
  const raw=await downloaded.text();
  assert.match(raw,/"type":"planning-attempt"/);
  assert.match(raw,/"found":false/);
  assert.match(raw,/"found":true/);
  const html=await(await fetch(base+'/transcend/torus-aether/ui/index.html?live=1')).text();
  assert.match(html,/id="v30AtlasCanvas"/);
  assert.match(html,/src="atlas-explorer.js"/);
  assert.match(html,/id="datasetProgressBar"/,'Old V17 progress must remain untouched');
  assert.match(html,/id="mazeCv"/,'Original maze UI preserved');
  const js=await(await fetch(base+'/transcend/torus-aether/ui/atlas-explorer.js')).text();
  assert.match(js,/fullPredictedPath/);
  assert.match(js,/v30AtlasChars/);
  assert.match(js,/\/atlas-export/);
  const missing=await get('/atlas?w=999&limit=1');
  assert.ok(missing.error,'Wrong worker must not grant access to other files');
  console.log('V30_NATIVE_END_TO_END',JSON.stringify({
   actualDocuments:graph.cognitive.documents,good:good.found,bad:bad.found,
   originalMethod:good.directOriginalMethod,atlasEvents:page.rows.length,
   preservedOriginalUI:true,atlasExportBytes:raw.length,hardware:'GitHub-hosted CPU, NOT local CUDA',
   semanticNaturalAnswersTested:false
  }));
 }finally{
  if(proc.exitCode===null){
   const exited=new Promise(done=>proc.once('exit',done));
   proc.kill('SIGTERM');await Promise.race([exited,delay(1000)]);
   if(proc.exitCode===null)proc.kill('SIGKILL');
  }
  rmSync(temp,{recursive:true,force:true});
 }
});
