import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';

const sleep=ms=>new Promise(r=>setTimeout(r,ms));
test('HTTP root is real observatory; real V17 worker receives a training command',async()=>{
 const port=20000+(process.pid%20000);
 const server=spawn(process.execPath,['server.mjs'],{cwd:new URL('.',import.meta.url),env:{...process.env,PORT:String(port),HOST:'127.0.0.1',MP_SESSION:'http-test-'+process.pid},stdio:['ignore','pipe','pipe']});
 let stderr='';server.stderr.on('data',chunk=>{stderr+=chunk.toString().slice(0,1000);});
 let done=false;
 try{
  const url='http://127.0.0.1:'+port;
  let healthy=false;
  for(let i=0;i<60;i++){try{const r=await fetch(url+'/api/health');if(r.ok){healthy=true;break;}}catch{}await sleep(100);}
  assert.equal(healthy,true,'Server did not start: '+stderr);
  const html=await (await fetch(url+'/')).text();
  assert.match(html,/REAL TRAINING OBSERVATORY/i);assert.match(html,/Labyrinth/i);
  const synthetic=await (await fetch(url+'/synthetic.html')).text();
  assert.match(synthetic,/Train \/ Evaluate/);
  let ready=false;
  for(let i=0;i<60;i++){const s=await (await fetch(url+'/api/v17')).json();if(s.available){ready=true;break;}await sleep(100);}
  assert.equal(ready,true,'Original V17 Brain worker unavailable: '+stderr);
  const call=await fetch(url+'/api/v17',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({
   action:'start',worlds:['text'],episodes:1,infinite:false,text:'A measured text exercise for the observatory. '.repeat(18)})});
  assert.equal(call.status,202);
  let finished=null;
  for(let i=0;i<90;i++){
   const s=await (await fetch(url+'/api/v17')).json();
   if(s.error)throw Error(s.error);
   if(s.episode>=1&&!s.running&&s.last?.text?.observations?.length){finished=s;break;}
   await sleep(100);
  }
  assert.ok(finished,'Did not get real text evidence from HTTP');
  assert.ok(finished.last.text.observations[0].actual!==undefined);
  assert.ok(finished.geometry.updates>0);
  done=true;
 }finally{
  server.kill('SIGINT');await Promise.race([new Promise(r=>server.once('exit',r)),sleep(6000)]);
  if(server.exitCode===null&&!server.killed)server.kill('SIGKILL');
 }
 assert.equal(done,true);
});
