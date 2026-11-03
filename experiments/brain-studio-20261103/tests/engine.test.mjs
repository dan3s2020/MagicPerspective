import test from 'node:test';import assert from 'node:assert/strict';
import {SharedBrain,makeBrain,restoreBrain,oneEpisode,blindTest,brainStats,functionSamples,DOMAINS} from '../engine/studio.mjs';
import {Vault,detect} from '../engine/vault.mjs';
import {mkdtemp,mkdir,readFile,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';

test('one shared parameter set takes actual environment feedback in maze, graph and symbolic worlds',{timeout:40000},()=>{
 const brain=new SharedBrain(31),before=JSON.stringify(brain.snapshot().net.W1),seen=new Set();
 for(const [i,domain] of DOMAINS.entries()){
  const result=oneEpisode('universal',brain,{domain,size:11,seed:40001+i,learn:true});
  assert.equal(result.meta.domain,domain);seen.add(domain);
  assert.ok(result.frames.length>=1,domain);
  assert.ok(result.outcome.steps>0,domain);
  assert.ok(result.outcome.cost>0,domain);
  assert.ok(result.meta.positions.length>0,domain);
  assert.ok(result.trajectory.every(x=>x.features.length===16&&x.features.every(Number.isFinite)),domain);
 }
 assert.equal(seen.size,3);assert.equal(brain.episodes,3);
 assert.ok(brain.samples>0);assert.ok(brain.net.updates>=3);
 assert.notEqual(JSON.stringify(brain.snapshot().net.W1),before);
 assert.equal(Object.values(brain.domainCounts).reduce((a,b)=>a+b,0),3);
});
test('same shared brain can be saved and resumed with exactly the same weights and optimizer state',()=>{
 const a=new SharedBrain(19);
 for(let i=0;i<4;i++)oneEpisode('universal',a,{domain:DOMAINS[i%3],seed:1000+i,size:11});
 const clone=SharedBrain.restore(a.snapshot());
 assert.deepEqual(clone.snapshot(),a.snapshot());
 assert.equal(clone.predict(Array(16).fill(.2)),a.predict(Array(16).fill(.2)));
 assert.throws(()=>SharedBrain.restore({...a.snapshot(),schema:8}));
});
test('blind test is read-only and matched against a same-architecture untrained model',{timeout:60000},()=>{
 const model=new SharedBrain(91);
 oneEpisode('universal',model,{domain:'maze',seed:20001,size:11});
 const before=JSON.stringify(model.snapshot());
 const first=blindTest('universal',model,{count:3,size:11,seed:9441,domains:['maze','network','text']});
 const second=blindTest('universal',model,{count:3,size:11,seed:9441,domains:['maze','network','text']});
 assert.deepEqual(first,second);
 assert.equal(JSON.stringify(model.snapshot()),before);
 assert.deepEqual(Object.keys(first.domains),['maze','network','text']);
 for(const x of Object.values(first.domains)){assert.equal(x.count,3);
  assert.ok(x.success>=0&&x.success<=1);assert.ok(x.baselineSuccess>=0&&x.baselineSuccess<=1);}
});
test('each native brain restores in its original architecture and supplies an actual training episode',{timeout:60000},()=>{
 const kinds=['v6','v7','graph','dynamic','causal'];
 for(const [i,kind] of kinds.entries()){
  const brain=makeBrain(kind,17),snapshot=brain.snapshot(),copy=restoreBrain(kind,snapshot);
  assert.deepEqual(copy.snapshot(),snapshot,kind+' checkpoint drift');
  const result=oneEpisode(kind,copy,{seed:4001+i,size:11,learn:true});
  assert.ok(result.meta.positions.length>0,kind);
  assert.ok(result.frames.length>0,kind);
  assert.ok(result.outcome.steps>=0,kind);
  assert.ok(copy.episodes>brain.episodes,kind);
  assert.ok(functionSamples(kind,copy).length===41,kind);
  assert.ok(brainStats(kind,copy).architecture.length>0);
 }
});
test('vault can select any supported original saved brain without mutating its source file',{timeout:30000},async()=>{
 const root=await mkdtemp(path.join(tmpdir(),'magic-vault-'));
 try{
  const repository=path.join(root,'repo'),home=path.join(root,'studio');
  await mkdir(path.join(repository,'v7','data'),{recursive:true});
  const original={schema:7,brain:makeBrain('v7',17).snapshot()};
  const file=path.join(repository,'v7','data','live-brain.json');
  const exact=JSON.stringify(original);await writeFile(file,exact);
  const vault=new Vault(repository,home);await vault.setup();
  const list=await vault.list();assert.ok(list.some(x=>x.id==='v7-live'&&x.trainable));
  const selected=await vault.load('v7-live');
  assert.equal(selected.kind,'v7');
  selected.brain.episodes=121;
  const id=await vault.saveBrain('v7',selected.brain,'Test 121 ep');
  const reread=await vault.load(id);assert.equal(reread.brain.episodes,121);
  assert.equal(await readFile(file,'utf8'),exact,'Original checkpoint overwritten');
  assert.throws(()=>detect({what:'unknown'}).kind==='universal'?Error('Wrong'):'');
  await assert.rejects(()=>vault.load('saved:../../escape'));
  const imported=await vault.import({brain:makeBrain('graph',77).snapshot()},'Graph imported');
  assert.equal((await vault.load(imported)).kind,'graph');
 }finally{await rm(root,{recursive:true,force:true})}
});
