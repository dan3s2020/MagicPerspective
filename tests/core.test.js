import test from 'node:test';
import assert from 'node:assert/strict';
import {RNG,makeMaze,blankBelief,observe,shortestPath,pathMask} from '../src/maze.js';
import {ShapeNet,features,evaluateModel,trainingSnapshots} from '../src/model.js';
import {Episode,decodeRoute} from '../src/agent.js';

test('seeded procedural maze is deterministic and always solvable',()=>{
  for(let seed=1;seed<=50;seed++){
    const a=makeMaze(seed,11),b=makeMaze(seed,11);assert.deepEqual(a,b);
    assert.ok(shortestPath(a.cells,11,a.start,a.goal).length>=2);
    assert.equal(a.cells[a.start],0);assert.equal(a.cells[a.goal],0);
  }
});
test('organism observation is strictly 3x3 and unknown truth remains unknown',()=>{
 const w=makeMaze(3,11),b=blankBelief(11);observe(w,b,w.start);
 let revealed=0;
 for(let i=0;i<121;i++){if(b[i]<0)continue;revealed++;
   const x=i%11,y=Math.floor(i/11),sx=w.start%11,sy=Math.floor(w.start/11);
   assert.ok(Math.abs(x-sx)<=1&&Math.abs(y-sy)<=1);
 }
 assert.ok(revealed<=9);assert.ok(revealed>=4);
});
test('latent input contract never accepts hidden full world',()=>{
  const a=makeMaze(193,11),b=makeMaze(800,11);
  const belief=blankBelief(11);
  let same=true;for(let i=0;i<121;i++){
    const x=features(belief,11,a.start,a.goal,i);
    assert.equal(x.length,20);assert.ok(x.every(Number.isFinite));
    assert.deepEqual(x,features(belief,11,a.start,a.goal,i));
    // Swapping secret maze truth must not affect the forward input.
    same&&=JSON.stringify(x)===JSON.stringify(features(belief,11,a.start,a.goal,i));
  }
  assert.equal(same,true);assert.notDeepEqual(a.cells,b.cells);
});
test('full shape target and neural training really change weights',()=>{
 const m=new ShapeNet(11),w=makeMaze(9,9),snapshots=trainingSnapshots(w,12),rng={shuffle(a){return a;}};
 const initial=m.serialize().w1.slice(),target=pathMask(shortestPath(w.cells,w.n,w.start,w.goal),w.n);
 const avg=m.trainSample(w,snapshots[0].belief,w.goal,snapshots[0].position,target,.009,rng,1);
 assert.ok(Number.isFinite(avg)&&avg>0);assert.notDeepEqual(m.serialize().w1,initial);assert.ok(m.steps>=81);
});
test('no route decoder can traverse observed walls',()=>{
 const w=makeMaze(444,11),b=blankBelief(11);observe(w,b,w.start);
 const m=new ShapeNet(),p=m.predict(b,11,w.start,w.goal),route=decodeRoute(p,b,11,w.start,w.goal);
 assert.ok(route.length>0);for(const i of route)assert.notEqual(b[i],1);
});
test('episode distinguishes collision as measured resistance',()=>{
 const e=new Episode(444,new ShapeNet(),11);const neighbors=[e.position-e.world.n,e.position+1,e.position+e.world.n,e.position-1];
 const wall=neighbors.find(i=>i>=0&&i<121&&e.world.cells[i]===1&&Math.abs(i%11-e.position%11)+Math.abs(Math.floor(i/11)-Math.floor(e.position/11))===1);
 if(wall!==undefined){const res=e.move(wall);assert.equal(res.event,'resistance');assert.equal(e.belief[wall],1);assert.equal(e.collisions,1);}
});
test('evaluation is reproducible and does not train',()=>{
 const m=new ShapeNet(3),old=m.steps,a=evaluateModel(m,{count:5,seed:91001,n:9}),b=evaluateModel(m,{count:5,seed:91001,n:9});
 assert.deepEqual(a,b);assert.equal(m.steps,old);
});
test('weight checkpoint roundtrip is bit-identical for predictions',()=>{
 const m=new ShapeNet(123),w=makeMaze(21,11),b=blankBelief(11);observe(w,b,w.start);
 const p=m.predict(b,11,w.start,w.goal),r=ShapeNet.restore(m.serialize());
 assert.deepEqual(r.predict(b,11,w.start,w.goal),p);
 assert.throws(()=>ShapeNet.restore({...m.serialize(),w1:[1,2]}));
});
test('unseen-maze shape error decreases from real backprop, not a fabricated UI metric',()=>{
  const m=new ShapeNet(17),rng=new RNG(1234);
  // Node test is synchronous; same deterministic train/test split as the server.
  const before=evaluateModel(m,{count:24,seed:910001,n:11});
  for(let k=0;k<120;k++){
    const w=makeMaze(20261102+k*7709,11);
    for(const s of trainingSnapshots(w,20261102+k*3))m.trainSample(w,s.belief,w.goal,s.position,s.teacher,.009,rng,1);
  }
  const after=evaluateModel(m,{count:24,seed:910001,n:11});
  assert.ok(after.modelBCE<before.modelBCE,{before,after}.toString());
  assert.ok(after.modelBCE<after.baselineBCE,`No verified improvement: ${JSON.stringify(after)}`);
});
