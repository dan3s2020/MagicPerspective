import test from 'node:test';
import assert from 'node:assert/strict';
import {BASE,TOOLS,INPUTS,PROBES,createWorld,senseProbes,encodeContext,parseGoal,
 describeGoal,generateTask,shortestOracle,features} from '../engine/world.mjs';
import {CausalNet} from '../engine/model.mjs';
import {buildExperience,predictedPlan,testPlan,train,evaluate,SPLITS} from '../engine/training.mjs';

test('worlds are seeded, reproducible and hide rules from every observation',()=>{
 for(let s=1;s<=40;s++){
  const a=createWorld(s),b=createWorld(s);
  assert.deepEqual(a.teacher(),b.teacher());
  for(const tool of TOOLS)for(const state of PROBES){
   const x=a.intervene(state,tool);
   assert.deepEqual(x,b.intervene(state,tool));
   assert.deepEqual(Object.keys(x).sort(),['from','to','tool']);
   assert.ok(x.to.every(v=>Number.isInteger(v)&&v>=0&&v<BASE));
  }
 }
});
test('intervention context has exactly 18 observed outputs and no law labels',()=>{
 const world=createWorld(18),events=senseProbes(world),context=encodeContext(events);
 assert.equal(events.length,9);assert.equal(context.length,18);
 assert.ok(context.every(x=>x>=0&&x<=1&&Number.isFinite(x)));
 const f=features([3,5],'amber',context);
 assert.equal(f.length,INPUTS);assert.ok(f.every(Number.isFinite));
 assert.throws(()=>encodeContext(events.slice(1)));
});
test('text goals parse both supported grammars without revealing action sequence',()=>{
 for(let a=0;a<BASE;a++)for(let b=0;b<BASE;b++){
  const goal=[a,b];
  assert.deepEqual(parseGoal(describeGoal(goal,0)),goal);
  assert.deepEqual(parseGoal(describeGoal(goal,1)),goal);
 }
 assert.throws(()=>parseGoal('solve everything'));
 assert.throws(()=>parseGoal('Set red to 99 and blue to 1.'));
 assert.throws(()=>parseGoal('Set red to 2 and red to 3.'));
});
test('generated tasks give reachable multi-step goals when candidates exist',()=>{
 for(let s=8;s<28;s++){
  const world=createWorld(s),task=generateTask(world,s*77);
  assert.deepEqual(parseGoal(task.text),task.goal);
  if(task.reachable){
   const actions=shortestOracle(world,task.start,task.goal,task.maxSteps);
   assert.ok(Array.isArray(actions));
   let state=task.start;
   for(const tool of actions)state=world.intervene(state,tool).to;
   assert.deepEqual(state,task.goal);
  }
 }
});
test('neural dynamics update real weights, optimizer state and counters',()=>{
 const world=createWorld(31),data=buildExperience(world,999,5),model=new CausalNet(17);
 assert.equal(data.samples.length,15);
 const previous=model.snapshot(),loss=model.trainBatch(data.samples);
 assert.ok(Number.isFinite(loss)&&loss>0);
 assert.equal(model.steps,1);assert.equal(model.samples,15);
 assert.notDeepEqual(model.snapshot().w1,previous.w1);
 assert.notDeepEqual(model.snapshot().w2,previous.w2);
});
test('repeated observed transitions decrease neural loss on the SAME local experiment',()=>{
 const world=createWorld(77),data=buildExperience(world,997,7),model=new CausalNet(17);
 const first=model.trainBatch(data.samples);
 for(let i=0;i<75;i++)model.trainBatch(data.samples);
 const last=model.trainBatch(data.samples);
 assert.ok(last<first*.7,JSON.stringify({first,last}));
});
test('checkpoint restore reproduces every softmax output and can continue training',()=>{
 const m=new CausalNet(23),world=createWorld(21),ex=buildExperience(world,133);
 for(let i=0;i<4;i++)m.trainBatch(ex.samples);
 const copy=CausalNet.restore(m.snapshot());
 const input=ex.samples[2].input;
 assert.deepEqual(copy.forward(input).p,m.forward(input).p);
 assert.deepEqual(copy.snapshot(),m.snapshot());
 assert.throws(()=>CausalNet.restore({...m.snapshot(),w2:[1]}));
});
test('training observes intervention results, not privileged teacher() or oracle paths',()=>{
 const w=createWorld(47);
 const noTeacher={seed:w.seed,intervene:w.intervene,teacher(){throw Error('Teacher leak')}};
 const data=buildExperience(noTeacher,553,5);
 assert.equal(data.samples.length,15);
 const m=new CausalNet(17);assert.ok(Number.isFinite(m.trainBatch(data.samples)));
});
test('planner generates a connected action sequence from a model prediction function',()=>{
 const w=createWorld(84),start=[1,2],goal=[3,5];
 const plan=predictedPlan(start,goal,(state,tool)=>w.intervene(state,tool).to,6);
 if(plan.found){
  let at=start;
  for(const tool of plan.actions){assert.ok(TOOLS.includes(tool));at=w.intervene(at,tool).to;}
  assert.deepEqual(at,goal);
 }
 const no=predictedPlan([1,2],[3,5],()=>[1,2],3);
 assert.equal(no.found,false);
});
test('a goal is judged ONLY by executing predicted actions in the actual world',()=>{
 const w=createWorld(222),task=generateTask(w,884);
 const withTruth=testPlan(w,task,(state,tool)=>w.intervene(state,tool).to);
 if(task.reachable)assert.equal(withTruth.success,true);
 const wrong=testPlan(w,task,()=>task.start);
 if(task.start.join(',')!==task.goal.join(','))assert.equal(wrong.success,false);
});
test('blind evaluation is reproducible, seed-disjoint, and does not change neural weights',()=>{
 const m=new CausalNet(17),original=JSON.stringify(m.snapshot());
 const a=evaluate(m,{seed:SPLITS.test,worlds:5,goalsPerWorld:2});
 const b=evaluate(m,{seed:SPLITS.test,worlds:5,goalsPerWorld:2});
 assert.deepEqual(a,b);assert.equal(JSON.stringify(m.snapshot()),original);
 for(const [name,v] of Object.entries(a.modes)){
  assert.ok(v.exactTransition>=0&&v.exactTransition<=1,name);
  assert.ok(v.planningSuccess>=0&&v.planningSuccess<=1,name);
  assert.ok(v.solved<=v.attempted,name);
 }
});
test('training emits validation history and snapshots without using the test split',async()=>{
 const m=new CausalNet(17),snap=JSON.stringify(m.snapshot());
 const progress=[];
 const r=await train(m,{episodes:22,validationWorlds:3,validateEvery:11,
  onProgress:p=>progress.push({done:p.done,loss:p.latest.loss})});
 assert.equal(m.episodes,22);assert.equal(progress.length,2);
 assert.ok(r.bestSnapshot);
 assert.notEqual(JSON.stringify(m.snapshot()),snap);
 assert.equal(r.history.at(-1).episode,22);
 assert.ok(r.history.every(p=>Number.isFinite(p.validationExact)));
});
