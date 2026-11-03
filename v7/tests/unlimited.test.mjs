import test from 'node:test';
import assert from 'node:assert/strict';
import {makeWorld} from '../engine/world.mjs';
import {Organism7} from '../engine/organ.mjs';
import {train,SEEDS} from '../engine/training.mjs';

test('continuous mode receives authentic maze and relief episodes with replay frames', {timeout:30000},async()=>{
 const o=new Organism7(17),samples=[];
 const result=await train(o,{episodes:12,size:11,validationCount:3,
  seedOffset:410000,previewEvery:3,
  onEpisode:ep=>samples.push({
   seed:ep.world.seed,kind:ep.world.kind,
   n:ep.world.n,frames:ep.frames,episode:ep.summary()
  })});
 assert.equal(o.episodes,12);
 assert.ok(samples.length>=4);
 assert.ok(new Set(samples.map(x=>x.seed)).size===samples.length);
 assert.ok(samples.some(x=>x.kind==='maze'));
 assert.ok(samples.some(x=>x.kind==='relief'));
 for(const item of samples){
  assert.ok(item.frames.length>=2);
  assert.equal(item.frames[0].step,0);
  assert.ok(item.frames[0].route.length>=2);
  assert.ok(item.frames[0].known.length===121);
  assert.ok(item.frames.every(f=>Array.isArray(f.walked)));
 }
 assert.ok(result.bestSnapshot);
});
test('stop-controlled training actually terminates mid-batch, not after an arbitrary 5,000 cap', {timeout:30000},async()=>{
 const o=new Organism7(17);let seen=0,stop=false;
 const result=await train(o,{episodes:1000,size:11,validationCount:3,seedOffset:700000,
  previewEvery:2,onEpisode:()=>{seen++;if(seen>=3)stop=true;},
  cancel:()=>stop});
 assert.ok(result.cancelled);
 assert.ok(o.episodes<1000);
 assert.ok(seen>=3);
});
