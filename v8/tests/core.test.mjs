import test from 'node:test';
import assert from 'node:assert/strict';
import {makeWorld,sense,horizon,windowOf,truthRoute,KINDS,WALL,costOf,neighbors} from '../engine/world.mjs';
import {Organism,Organism7,emptyMemory,remember,featuresOf,FEATURES,restoreBrain,signature,SLOTS} from '../engine/organ.mjs';
import {Episode,shapeMatch,deviation,MODES} from '../engine/agent.mjs';
import {liveEpisode,evaluate,train,SEEDS,MILESTONES,imagineOnce,SHOWCASE,lightSnapshot,makeAny} from '../engine/training.mjs';
import {Organism8,restoreAny} from '../engine/organism8.mjs';
const sig=x=>JSON.stringify(x,(k,v)=>v instanceof Float64Array?Array.from(v):v);

test('worlds are seeded, reproducible and solvable',()=>{for(const k of KINDS)for(let s=1;s<=10;s++){const w=makeWorld(s,k,15);assert.equal(sig(w),sig(makeWorld(s,k,15)));assert.ok(Number.isFinite(truthRoute(w).cost));assert.ok(w.h[w.start]<=WALL&&w.h[w.goal]<=WALL);}});
test('the window is 3x3 (smaller at borders) and the horizon has 16 directions × 3 bands',()=>{
  const w=makeWorld(3,'relief',15),c=7*15+7;assert.equal(windowOf(15,c).length,9);assert.equal(windowOf(15,0).length,4);
  const hz=horizon(w,c);assert.equal(hz.length,48);assert.ok(hz.every(v=>v===-1||(v>=0&&v<=1)));});
test('the organism never receives the true map: memory holds only window cells and horizon readings',()=>{
  const w=makeWorld(4,'relief',15),m=emptyMemory(15,w.start,w.goal);remember(m,sense(w,w.start));
  const known=[...m.known.keys()].filter(i=>!Number.isNaN(m.known[i]));assert.deepEqual(new Set(known),new Set(windowOf(15,w.start)));
  assert.equal(m.views.length,1);assert.equal(m.views[0].hz.length,48);});
test('two worlds with the same window and horizon give the same imagined map',()=>{
  const a=makeWorld(5,'relief',15),b=structuredClone(a),win=new Set(windowOf(15,a.start)),hz=horizon(a,a.start);
  // change a hidden cell that no horizon ray reports as the band maximum: lower it below every reading
  const free=[...b.h.keys()].find(i=>!win.has(i)&&b.h[i]<.05);b.h[free]=0;assert.deepEqual(horizon(b,b.start),hz);
  const o=new Organism(3),ma=emptyMemory(15,a.start,a.goal),mb=emptyMemory(15,b.start,b.goal);remember(ma,sense(a,a.start));remember(mb,sense(b,b.start));
  assert.deepEqual(Array.from(o.perceive(ma,a.start,{imagine:0}).mean),Array.from(o.perceive(mb,b.start,{imagine:0}).mean));});
test('the whole route is predicted before the first step and is a connected path start→goal',()=>{
  for(const k of KINDS){const w=makeWorld(9,k,15),ep=new Episode(w,new Organism(1));const r=ep.p.route;assert.equal(ep.steps,0);
    assert.equal(r[0],w.start);assert.equal(r.at(-1),w.goal);for(let i=1;i<r.length;i++)assert.ok(neighbors(15,r[i-1]).includes(r[i]));}});
test('the cloud is a distribution of imagined routes; without the organ it is one hard line',()=>{
  const w=makeWorld(11,'relief',15),o=new Episode(w,new Organism(2)),c=new Episode(w,new Organism(2),{mode:'classic'});
  assert.ok(o.p.cloud.every(v=>v>=0&&v<=1+1e-9));assert.ok(o.p.cloud.some(v=>v>0&&v<1));assert.ok(c.p.cloud.every(v=>v===0||v===1));});
test('the organism never steps into known rock and always reaches the goal',()=>{
  for(const k of KINDS)for(let s=1;s<=6;s++){const ep=new Episode(makeWorld(s,k,11),new Organism(1),{record:false});ep.run();assert.ok(ep.finished);
    for(const c of ep.walked)assert.ok(Number.isFinite(costOf(ep.world.h[c])));}});
test('learning comes ONLY from revealed cells: guesses made before, truth seen after',()=>{
  const w=makeWorld(12,'relief',15),o=new Organism(4),ep=new Episode(w,o,{record:false});ep.run(10);assert.ok(o.recon.updates>0);assert.ok(o.samples>0);
  const f=new Organism(4),before=sig(f.snapshot()),ef=new Episode(makeWorld(12,'relief',15),f,{online:false,record:false});ef.run(10);assert.equal(sig(f.snapshot()),before);});
test('features have the declared size and stay in a sane range',()=>{
  const w=makeWorld(2,'relief',15),m=emptyMemory(15,w.start,w.goal);remember(m,sense(w,w.start));const x=featuresOf(m,(w.start+30)%225);
  assert.equal(x.length,FEATURES);assert.ok(x.every(v=>Number.isFinite(v)&&v>=-1&&v<=1.01));});
test('shape metrics behave',()=>{assert.equal(shapeMatch([0,1,2],[0,1,2]),1);assert.equal(shapeMatch([0,1],[0,5]),0);assert.equal(deviation(5,[0,1,2],[0,1,2]),0);assert.ok(deviation(5,[0,1,2],[20,21,22])>=3);});
test('evaluation never changes the brain it receives and is deterministic',()=>{
  const o=new Organism(7);liveEpisode(o,5,'relief',11);const before=sig(o.snapshot()),a=evaluate(o,{count:4,size:11}),b=evaluate(o,{count:4,size:11});
  assert.equal(sig(o.snapshot()),before);assert.equal(sig(a),sig(b));assert.deepEqual(Object.keys(a.modes),MODES);});
test('training, validation and test worlds use different seeds',()=>{const s=Object.values(SEEDS);assert.equal(new Set(s).size,s.length);});
test('checkpoint round-trip keeps the imagined map identical; wrong schema rejected',()=>{
  const o=new Organism(9);liveEpisode(o,3,'relief',11);const r=Organism.restore(JSON.parse(JSON.stringify(o.snapshot())));const w=makeWorld(8,'relief',15);
  const m1=emptyMemory(15,w.start,w.goal),m2=emptyMemory(15,w.start,w.goal);remember(m1,sense(w,w.start));remember(m2,sense(w,w.start));
  assert.deepEqual(Array.from(o.perceive(m1,w.start,{imagine:0}).mean),Array.from(r.perceive(m2,w.start,{imagine:0}).mean));assert.throws(()=>Organism.restore({schema:5}));});
test('after a short mixed life (relief, mazes, networks) the V8 organism beats "no organ" on unseen relief worlds',async()=>{
  const o=new Organism8(17),r=await train(o,{episodes:120,size:11,validationCount:6});
  const t=evaluate(restoreAny(r.bestSnapshot),{count:16,size:11,kind:'relief'}).modes;
  assert.ok(t.organ.match0>t.classic.match0,`shape ${t.organ.match0} vs ${t.classic.match0}`);
  assert.ok(t.organ.surprises<t.classic.surprises,`surprises ${t.organ.surprises} vs ${t.classic.surprises}`);});
test('frames keep every step for replay, including the step-0 shape',()=>{
  const ep=new Episode(makeWorld(31,'relief',11),new Organism(1));ep.run(6);assert.equal(ep.frames.length,ep.steps+1);
  const f=ep.frame(0);assert.equal(f.step,0);assert.equal(f.imagined.length,121);assert.deepEqual(f.route,ep.initial.route);});

test('V7 discovers kinds of worlds by itself: mazes and relief end up with different specialists',()=>{
  const o=new Organism7(5);for(let i=0;i<30;i++)liveEpisode(o,100+i,i%2?'maze':'relief',11);
  assert.ok(o.centroids.length>=2&&o.centroids.length<=SLOTS);
  const slotOf=(k,s)=>{const w=makeWorld(s,k,11),m=emptyMemory(11,w.start,w.goal);remember(m,sense(w,w.start));return o.recognize(m).slot;};
  const mazeSlots=new Set([1,2,3,4,5].map(s=>slotOf('maze',900+s))),reliefSlots=[1,2,3,4,5].map(s=>slotOf('relief',900+s));
  assert.equal(mazeSlots.size,1);assert.ok(reliefSlots.filter(x=>mazeSlots.has(x)).length<=1);});
test('V7 checkpoint round-trip; V6 brains still load and behave exactly as in V6',()=>{
  const o=new Organism7(9);liveEpisode(o,3,'relief',11);liveEpisode(o,4,'maze',11);const r=restoreBrain(JSON.parse(JSON.stringify(o.snapshot())));
  const w=makeWorld(8,'relief',15),m1=emptyMemory(15,w.start,w.goal),m2=emptyMemory(15,w.start,w.goal);remember(m1,sense(w,w.start));remember(m2,sense(w,w.start));
  assert.deepEqual(Array.from(o.perceive(m1,w.start,{imagine:0,claim:false}).mean),Array.from(r.perceive(m2,w.start,{imagine:0,claim:false}).mean));
  const v6=new Organism(4);liveEpisode(v6,5,'relief',11);const back=restoreBrain(JSON.parse(JSON.stringify(v6.snapshot())));assert.ok(back instanceof Organism);
  assert.equal(signature(m1).length,4);});
test('the test can include another brain (e.g. the V6 brain on this device) on the same worlds',()=>{
  const v7=new Organism7(3),v6=new Organism(3);const t=evaluate(v7,{count:4,size:11,extra:{'v6-brain':v6}});assert.ok(t.modes['v6-brain']);assert.ok(t.kinds.relief['v6-brain']);});
test('life milestones are captured during training and the showcase imagination is reproducible',async()=>{
  const o=new Organism8(2),got=[];await train(o,{episodes:16,size:11,validationCount:3,onMilestone:(e,b)=>got.push([e,b])});
  assert.deepEqual(got.map(g=>g[0]),MILESTONES.filter(m=>m<=16));assert.ok(!JSON.stringify(got[0][1]).includes('"m":'));
  const w=makeAny(SHOWCASE[0].seed,SHOWCASE[0].kind,11),a=imagineOnce(restoreAny(got.at(-1)[1]),w),b=imagineOnce(restoreAny(lightSnapshot(o)),w);
  assert.equal(a.imagined.length,121);assert.ok(a.mapError>=0&&a.mapError<=1);assert.ok(b.truth.length>1);});
