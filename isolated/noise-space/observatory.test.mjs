import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {Worker} from 'node:worker_threads';
import {fileURLToPath} from 'node:url';
import {GeometricLearningLab,observedFeatures} from './learning_geometry.mjs';
import {labelEvent} from './interpret.mjs';

test('analytic 5D→8D→5D model trains, validates without updating, and restores exactly',()=>{
 const l=new GeometricLearningLab(33),x=[.1,-.2,.4,.7,-.3],p=[.2,-.18,.2,.6,-.1],y=[.2,-.1,.35,.66,-.2];
 const before=l.forward('maze',x,p,3).prediction.reduce((a,v,i)=>a+(v-y[i])**2,0);
 for(let i=0;i<180;i++)l.consume({world:'maze',x,prev:p,y,action:3,heldout:false});
 const after=l.forward('maze',x,p,3).prediction.reduce((a,v,i)=>a+(v-y[i])**2,0);
 assert.ok(Number.isFinite(after)&&after<before,'gradient steps should lower loss on a fixed supervised transition');
 const prior=l.updates,out=l.consume({world:'maze',x,prev:p,y,action:3,heldout:true});
 assert.equal(l.updates,prior);assert.equal(out.heldout,true);
 const restored=GeometricLearningLab.restore(JSON.parse(JSON.stringify(l.export())));
 assert.deepEqual(restored.forward('maze',x,p,3).prediction,l.forward('maze',x,p,3).prediction);
 assert.ok(l.summary().lanes.maze.evalN>0);
});
test('strict observed-world features, no invented correspondence',()=>{
 assert.equal(observedFeatures('maze',{n:7,index:8,goal:40,wall:Array(49).fill(0)}).length,5);
 assert.equal(observedFeatures('text',{history:[65,66,67,68,69]}).length,5);
 assert.equal(observedFeatures('transform',{n:7,board:Array(49).fill(0),goal:Array(49).fill(17)}).length,5);
 const l=new GeometricLearningLab();
 assert.throws(()=>l.consume({world:'maze',x:[1],y:[1],prev:[1],action:0}),/5D/);
});
test('decision labels include reasons and do not infer impossible worlds',()=>{
 assert.equal(labelEvent('maze',{solved:false,steps:10}).status,'WORSE');
 assert.equal(labelEvent('geometry',{assessment:'INSUFFICIENT_EVIDENCE'}).status,'LOW_SAMPLE');
 assert.equal(labelEvent('transform',{solved:false,said:'limitation',steps:4}).status,'LIMITATION');
});
test('both frontend scripts parse as Javascript, no fabricated fallback geometry',()=>{
 for(const p of ['index.html','observatory.html','v17.html']){
   const content=fs.readFileSync(new URL('./'+p,import.meta.url),'utf8');
   const script=content.match(/<script[^>]*>([\s\S]*?)<\/script>/i)?.[1];
   assert.ok(script,'Missing script '+p);new vm.Script(script,{filename:p});
 }
 const frontend=fs.readFileSync(new URL('./observatory.html',import.meta.url),'utf8');
 assert.match(frontend,/actual observed path/i);
 assert.match(frontend,/persistence/i);
 assert.match(frontend,/CPU/i);
});
test('original real V17 worker provides pre-action evidence from text, maze and game',async()=>{
 const worker=new Worker(new URL('./v17_worker.mjs',import.meta.url),{env:{...process.env,MP_SESSION:'observatory-test-'+process.pid}});
 try{
  const initial=await new Promise((resolve,reject)=>{
   const timer=setTimeout(()=>reject(Error('V17 worker boot timeout')),45000);
   const onData=m=>{if(m.type==='state'){clearTimeout(timer);worker.off('message',onData);resolve(m.state);}};
   worker.on('message',onData);worker.once('error',reject);
  });
  assert.equal(initial.available,true,initial.error);
  worker.postMessage({action:'start',worlds:['text','maze','transform'],episodes:3,infinite:false,text:'A quick real text corpus. It contains repeated patterns for observable next-byte learning. '.repeat(25),resume:false});
  const final=await new Promise((resolve,reject)=>{
   const timer=setTimeout(()=>reject(Error('V17 three-world experiment timeout')),180000);
   const onData=m=>{if(m.type==='state'&&m.state.error){clearTimeout(timer);worker.off('message',onData);reject(Error(m.state.error));}
    else if(m.type==='state'&&m.state.episode>=3&&!m.state.running){clearTimeout(timer);worker.off('message',onData);resolve(m.state);}};
   worker.on('message',onData);
  });
  assert.ok(final.last.text.observations.length>0);
  assert.ok(final.last.maze.actions.length>0);
  assert.ok(Array.isArray(final.last.transform.frames));
  assert.ok(Array.isArray(final.last.transform.actions));
  assert.ok(final.history.length>=3);
  assert.ok(final.geometry.updates>0);
  assert.ok(final.trace.U.length>0);
  assert.equal(final.crossWorld.status,'UNVERIFIED');
 }finally{await worker.terminate();}
});
