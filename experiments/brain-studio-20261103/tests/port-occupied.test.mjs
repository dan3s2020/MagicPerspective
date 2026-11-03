import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:net';
import {spawn} from 'node:child_process';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
test('Termux launcher refuses occupied port 3044 without killing existing server or wiping data',{timeout:15000},async(t)=>{
 const listener=createServer();
 await new Promise((resolve,reject)=>{
  listener.once('error',reject);
  listener.listen(3044,'127.0.0.1',resolve);
 }).catch(e=>{
  if(e.code==='EADDRINUSE'){t.skip('Port 3044 already in use by an external service');return}
  throw e;
 });
 if(!listener.listening)return;
 try{
  const child=spawn('bash',[path.join(root,'run-termux.sh')],{cwd:root,
   env:{...process.env},stdio:['ignore','pipe','pipe']});
  let out='',err='';
  child.stdout.on('data',x=>out+=String(x));
  child.stderr.on('data',x=>err+=String(x));
  const exit=await new Promise((resolve,reject)=>{
   child.once('error',reject);child.once('close',resolve);
  });
  assert.equal(exit,98,'Second server launch must fail safely: '+out+' '+err);
  assert.match(err,/PORTUL 3044 ESTE DEJA OCUPAT/);
  assert.ok(listener.listening,'Preflight killed existing server');
 }finally{
  await new Promise(resolve=>listener.close(resolve));
 }
});
