import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {BodyFrameLearner,calibrate,runExperiment,episode,perceiveLocal,rememberedMap,Navigator} from './engine.mjs';
import {makeMaze,seedOf,SEEDS} from '../../v17/transcend/torus-aether/worlds/labyrinth.mjs';

test('body-frame mapping is learned from displacement, not preloaded',()=>{
 const m=new BodyFrameLearner();
 assert.equal(m.examples,0);
 assert.equal(m.accuracy(),.25);
 const report=calibrate(m,{samples:320,seed:29});
 assert.equal(report.examples,320);
 assert.equal(m.accuracy(),1,'the 16 discrete orientation/action mappings must have been learned');
 for(let h=0;h<4;h++)for(let a=0;a<4;a++)assert.equal(m.direction(h,a),(h+a)%4);
});
test('only one global memory snapshot is constructed for test navigation',()=>{
 const world=makeMaze(seedOf(SEEDS.test,19023),11);
 const memory=rememberedMap(world);
 const model=new BodyFrameLearner();
 const nav=new Navigator(memory,model);
 assert.notEqual(memory.wall,world.wall);
 assert.equal(nav.memory, memory);
 assert.equal(perceiveLocal(world,world.start,2).length,25);
 assert.doesNotThrow(()=>nav.observe(perceiveLocal(world,world.start,2)));
});
test('paired unseen mazes quantify the trained vs untrained navigation policies',()=>{
 const r=runExperiment({train:320,test:64,seed:29,size:11,noise:0});
 assert.equal(r.metadata.trainedV17Brain,false);
 assert.equal(r.trained.count,64);assert.equal(r.baseline.count,64);
 assert.equal(r.learned.accuracy,1);
 assert.ok(r.learningCurve.length>=4);
 assert.ok(r.trained.successRate>r.baseline.successRate,
   'The heldout learned navigation must improve on an untrained coordinate transform');
 assert.ok(r.trained.orientationAccuracy>r.baseline.orientationAccuracy,
   'Orientation inference must improve under the learned frame mapping');
 assert.ok(r.replay.every(x=>x.fullMapGlances===1&&x.globalReReads===0));
 assert.ok(r.replay.every(x=>x.records?.length>0));
 assert.equal(r.replay[0].seed,r.baselineReplay[0].seed);
});
test('0 training yields exactly the same control results, not invented improvement',()=>{
 const r=runExperiment({train:0,test:16,seed:19,size:9});
 assert.equal(r.improvement.successRatePoints,0);
 assert.equal(r.trained.localizationAccuracy,r.baseline.localizationAccuracy);
 assert.equal(r.trained.orientationAccuracy,r.baseline.orientationAccuracy);
 assert.equal(r.learned.examples,0);
});
test('unseen tests repeat deterministically for reproducible evidence',()=>{
 const a=runExperiment({train:60,test:12,seed:41,size:9});
 const b=runExperiment({train:60,test:12,seed:41,size:9});
 assert.deepEqual(a.rows,b.rows);
 assert.deepEqual(a.learningCurve,b.learningCurve);
});
test('viewer scripts parse, no remote dependencies or hidden demonstration data',()=>{
 const html=fs.readFileSync(new URL('./viewer.html',import.meta.url),'utf8');
 const script=html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
 assert.ok(script);assert.doesNotThrow(()=>new vm.Script(script));
 assert.match(html,/\/api\/report/);
 assert.doesNotMatch(html,/https?:\/\/.*(?:\.js|\.css)/);
});
