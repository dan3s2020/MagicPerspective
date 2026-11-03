import test from 'node:test';import assert from 'node:assert/strict';
import {AssociationRule} from '../engine/dance.mjs';
import {train} from '../engine/training.mjs';

test('Graph Dance infinite batches expose actual observed node interactions', {timeout:20000},async()=>{
 const rule=new AssociationRule(19),seen=[];
 const r=await train(rule,{episodes:13,n:13,seedOffset:130000,previewEvery:4,
  onEpisode:ep=>seen.push({seed:ep.world.seed,payload:ep.payload()})});
 assert.equal(r.done,13);
 assert.ok(seen.length>=3);
 assert.equal(new Set(seen.map(x=>x.seed)).size,seen.length);
 for(const s of seen){
  assert.equal(s.payload.info.n,13);
  assert.ok(s.payload.history.length>=2);
  assert.ok(s.payload.history[0].phase.length===13);
  assert.ok(s.payload.journal.length>0);
  assert.ok(s.payload.evaluator.edges.length>0);
 }
});
test('Graph Dance cancel interrupts unbounded caller loop between episodes', {timeout:20000},async()=>{
 let n=0,stopped=false;const rule=new AssociationRule(20);
 const result=await train(rule,{episodes:500,n:13,seedOffset:170000,previewEvery:2,
  onEpisode:()=>{if(++n>=3)stopped=true;},cancel:()=>stopped});
 assert.ok(result.cancelled);assert.ok(result.done<500);
});
