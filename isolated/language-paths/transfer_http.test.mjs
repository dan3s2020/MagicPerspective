import test from 'node:test';
import assert from 'node:assert/strict';
import {server} from './server.mjs';

test('existing health and new transfer observer work without modifying original interface',async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 try{
  const root=`http://127.0.0.1:${server.address().port}`;
  let r=await fetch(root+'/health');assert.equal(r.status,200);assert.equal(await r.text(),'ok');
  r=await fetch(root+'/transfer');assert.equal(r.status,200);assert.match(await r.text(),/Verified Transformation Transport/);
  r=await fetch(root+'/api/transfer');assert.equal(r.status,200);const data=await r.json();
  assert.equal(data.summary.heldoutTasks,30);assert.equal(data.summary.solved,30);
  assert.equal(data.summary.naiveUnalignedProbesMatched,5);
  r=await fetch(root+'/does-not-exist');assert.equal(r.status,404);
 }finally{await new Promise((resolve,reject)=>server.close(e=>e?reject(e):resolve()));}
});
