import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {cp,mkdtemp,mkdir,readFile,rm,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {tmpdir} from 'node:os';
import {fileURLToPath} from 'node:url';

const src=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const port=44340,origin='http://127.0.0.1:'+port;
async function post(url,payload){
 const response=await fetch(origin+'/api/'+url,{method:'POST',headers:{'Content-Type':'application/json'},
  body:JSON.stringify(payload)});
 const result=await response.json();return {status:response.status,result};
}
async function state(){const response=await fetch(origin+'/api/state');return response.json()}

test('custom problem API uses original canvases, no checkpoint mutation, no demo-only generator', {timeout:40000},async()=>{
 const dir=await mkdtemp(path.join(tmpdir(),'magic-external-'));let child;
 try{
  for(const p of ['engine','public'])await cp(path.join(src,p),path.join(dir,p),{recursive:true});
  await cp(path.join(src,'server.mjs'),path.join(dir,'server.mjs'));
  await mkdir(path.join(dir,'data'));await writeFile(path.join(dir,'package.json'),JSON.stringify({type:'module'}));
  let err='';child=spawn(process.execPath,['server.mjs'],{cwd:dir,env:{...process.env,HOST:'127.0.0.1',PORT:String(port)},stdio:['ignore','pipe','pipe']});
  child.stderr.on('data',x=>err+=String(x));
  let live=false;
  for(let i=0;i<70;i++){try{live=(await fetch(origin+'/api/health')).ok;if(live)break}catch{}await sleep(80)}
  assert.ok(live,err);
  const html=await (await fetch(origin+'/')).text();
  for(const id of ['truth','brain','timeline','step','run','train','stop','replay','task-file','task-load','task-compare']){
   assert.ok(html.includes('id="'+id+'"'),id);
  }
  const initial=await state(),before=JSON.stringify(initial.model);
  const problem={
   schema:1,name:'Input user task',
   nodes:['Start','A','B','Finish'],
   edges:[{from:'Start',to:'A',cost:1},{from:'A',to:'B',cost:1},
    {from:'B',to:'Finish',cost:1},{from:'Start',to:'Finish',cost:15}],
   start:'Start',goal:'Finish'
  };
  let r=await post('task/import',{problem});
  assert.equal(r.status,200);assert.equal(r.result.externalTask.name,'Input user task');
  assert.equal(r.result.externalTask.optimalCost,3);
  assert.equal(r.result.episode.info.family,'external');
  assert.equal(r.result.episode.info.n,4);
  assert.equal(JSON.stringify(r.result.model),before);
  r=await post('task/compare',{});
  assert.equal(r.status,200);
  assert.equal(r.result.externalComparison.reachable,true);
  assert.equal(r.result.externalComparison.optimalCost,3);
  for(const mode of ['dance-frozen','no-dance-frozen','untrained']){
   assert.ok(r.result.externalComparison.modes[mode]);
   assert.equal(r.result.externalComparison.modes[mode].optimalCost,3);
   assert.equal(r.result.externalComparison.modes[mode].learnedUpdates,0);
  }
  assert.equal(JSON.stringify(r.result.model),before,'Frozen comparison modified checkpoint');
  r=await post('step',{});assert.equal(r.status,200);
  assert.equal(JSON.stringify(r.result.model),before,'One imported step modified shared model');
  r=await post('run',{steps:100});assert.equal(r.status,200);
  assert.equal(JSON.stringify(r.result.model),before,'Imported run modified model');
  const files=await readFile(path.join(dir,'public/app.js'),'utf8');
  assert.ok(files.includes("'task/import'"));
  assert.ok(files.includes("'task/compare'"));
  r=await post('new',{family:'mixed',n:33});
  assert.equal(r.status,200);
  assert.equal(r.result.externalTask,null);
  assert.equal(r.result.episode.info.family,'mixed');
  assert.equal(JSON.stringify(r.result.model),before);
 }finally{
  if(child){child.kill('SIGTERM');await Promise.race([new Promise(r=>child.once('exit',r)),sleep(800)])}
  await rm(dir,{recursive:true,force:true});
 }
});
