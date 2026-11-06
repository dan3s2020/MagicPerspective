import test from 'node:test';
import assert from 'node:assert/strict';
import {Discoverer,KIND} from '../worlds/exercise.mjs';
import {ACTIONS,makeMaze,SEEDS,seedOf} from '../worlds/labyrinth.mjs';
import {BodyPerspectiveMemory} from './body-memory.mjs';
import {globalGlance,localRetina,relocalize,playLocalPerspective,evaluateBodyPerspective} from './global-local.mjs';

function experienced(seed=11){
 const D=new Discoverer(seed),memory=new BodyPerspectiveMemory();
 for(let d=0;d<4;d++){
  const o=D.world.moves[d],delta=ACTIONS[d],k=KIND.self+'|'+delta[0]+'|'+delta[1];
  D.disp[o].set(k,12);
  for(let s=0;s<12;s++){
   const n=9,before=Array(n*n).fill(KIND.floor),after=before.slice(),i=40,
     j=i+delta[0]+delta[1]*n;
   before[i]=KIND.self;after[j]=KIND.self;after[i]=KIND.floor;
   assert.equal(memory.observe({domain:'maze',before,after,action:'output:'+o,context:'grid:9'},KIND.self),true);
  }
 }
 D.pass[KIND.floor]=400;D.block[KIND.wall]=400;D.endIn[KIND.target]=25;D.enter[KIND.target]=25;
 D.trust.plan=[30,32];D.trust.explore=[1,32];D.temp=0;D.noise=0;
 assert.equal(D.self(),KIND.self);
 return {D,memory};
}
test('the native body-memory updates ONLY from observed transitions and survives serialization',()=>{
 const {memory,D}=experienced();
 assert.equal(memory.summary().known,4);
 assert.ok(memory.summary().localizer.samples>0,'Global/local evidence must train on real before/after observation pairs');
 assert.equal(memory.export().version,2);
 assert.deepEqual(memory.effect(D.world.moves[0]),ACTIONS[0]);
 assert.equal(memory.observe({domain:'text'},3),false);
 const restored=BodyPerspectiveMemory.restore(JSON.parse(JSON.stringify(memory.export())));
 assert.deepEqual(restored.summary(),memory.summary());
 assert.throws(()=>BodyPerspectiveMemory.restore({version:2}),/Invalid/);
});
test('global glance occurs once; local retina is strictly an egocentric 3x3 without whole-retina input',()=>{
 const w=makeMaze(53,9),G=globalGlance(w),patch=localRetina(w,w.start);
 assert.equal(G.length,81);
 assert.equal(patch.length,9);
 assert.equal(patch[4],KIND.self);
 const match=relocalize(G,9,patch,w.start,KIND.self);
 assert.equal(match.cell,w.start);
 assert.equal(match.match,1);
});
test('known body mappings let actual blind-body controller act on remembered map without refreshing world retina',()=>{
 const {D,memory}=experienced();
 let solved=0;
 for(const seed of [53,71,97,131,157]){
  const w=makeMaze(seed,7);
  const out=playLocalPerspective(w,D,memory);
  assert.equal(out.locality.globalObservations,1);
  assert.equal(out.locality.afterFirstFullMapRead,false);
  assert.equal(out.locality.localObservations,out.steps);
  assert.equal(out.trace.length,out.steps);
  assert.ok(out.firstPath.length>1,JSON.stringify({seed,first:out.initialShape}));
  assert.ok(out.steps<=3*w.dist[w.start]+15);
  assert.ok(out.trace.every(x=>x.localPatch.length===9&&Number.isInteger(x.output)));
  if(out.solved)solved++;
 }
 assert.ok(solved>=3,'Frozen matched seeds should reach at least 3/5 goals using remembered map and local sensors');
});
test('honest matched-original baseline versus body navigation on frozen unseen worlds',()=>{
 const {D,memory}=experienced(7);
 const snapshot=JSON.stringify(memory.export());
 const n=3,per=2,r=evaluateBodyPerspective({disc:D},memory,{sizes:[7,9,11],per,seed:726,maxTrace:100});
 assert.equal(r.cases.length,n*per);
 assert.equal(r.summary.native.count,n*per);
 assert.equal(r.summary.body.count,n*per);
 assert.equal(r.summary.fixedLocalizer.count,n*per);
 assert.ok(r.cases.every(x=>x.fixedLocalizer&&typeof x.fixedLocalizer.steps==='number'));
 assert.equal(r.summary.totalGlobalReads,n*per);
 assert.ok(r.summary.totalLocalReads>=0);
 assert.equal(JSON.stringify(memory.export()),snapshot,'evaluation does not train or overwrite motor memory');
 assert.ok(r.cases.every(x=>x.baseline&&x.scoreSource.includes('ONLY in evaluator')));
 assert.throws(()=>evaluateBodyPerspective({disc:D},memory,{sizes:[6],per:1,seed:0}),/sizes/);
});
