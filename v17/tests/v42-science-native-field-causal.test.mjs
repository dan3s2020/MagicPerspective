import test from 'node:test';
import assert from 'node:assert/strict';
import {Discoverer,playExercise,makeMaze,seedOf,SEEDS,KIND} from '../transcend/torus-aether/worlds/exercise.mjs';
import {CompleteXDWorld,LearnedXDActionAtlas} from '../transcend/torus-aether/worlds/full-xd-maze-atlas.mjs';
import {fieldEvidence,retinaForWorld} from '../research/science/native-field-mechanics.mjs';
let D,experiments=[];
test('train ORIGINAL unmodified Discoverer on real maze physics',()=>{
  D=new Discoverer(211);D.noise=0;D.temp=0;
  let solved=0;
  for(let i=0;i<160;i++){
    const w=makeMaze(seedOf(SEEDS.train,i),i%2?9:7);
    const result=playExercise(w,D,()=>{},{record:false});
    solved+=Number(result.solved);
  }
  assert.equal(D.self(),KIND.self,'Original organism must learn which glyph it controls');
  assert.ok(D.attract(KIND.target)>.2,'Experience must induce a goal');
  assert.ok(D.conduct(KIND.wall)<.5,'Wall resistance must be learned');
  assert.ok(solved>60,'Original learning insufficient: '+solved);
  console.log('SCIENCE_TRAINING_NATIVE',JSON.stringify({episodes:160,solved,
    conduct:[0,1,2,3].map(k=>D.conduct(k)),
    attraction:[0,1,2,3].map(k=>D.attract(k)),self:D.self()}));
});
test('frozen unseen native maze: replay equals original field/path and independently calculated weighted shortest paths',()=>{
  let seen=0,valid=0,edges=0,worstError=0,iterations=[],maxDelta=0,ended=0;
  for(let i=0;i<72;i++){
    const w=makeMaze(seedOf(SEEDS.test,811013+i),i%3?9:11);
    const e=fieldEvidence(D,w,{keepFrames:true});
    assert.ok(!e.unavailable);
    assert.equal(e.nativePathIdentical,true,'Original solver path differs on seed '+w.seed);
    assert.ok(e.independentMaxAbsError<1e-9,'Independent shortest-path equation failed on '+w.seed+' error '+e.independentMaxAbsError);
    experiments.push({w,e});seen++;worstError=Math.max(worstError,e.independentMaxAbsError);
    if(e.path){valid++;edges+=e.path.length;ended+=Number(e.pathCells.at(-1)===w.goal)}
    iterations.push(e.iterations);
    for(const f of e.frames){
      if(f.values&&f.initial)for(let k=0;k<f.values.length;k++)
        assert.ok(f.values[k]+1e-12>=f.initial[k],'Field lost attraction');
      assert.ok(f.totalDelta>=-1e-13&&f.maxDelta>=-1e-13);maxDelta=Math.max(maxDelta,f.maxDelta);
    }
    assert.equal(e.frames.at(-1)?.changed,0,'Field did not settle to a fixed point');
  }
  assert.ok(valid>=60,'Too few original learned initial paths: '+valid);
  assert.ok(ended>=60,'Too few native paths reached true goal: '+ended);
  assert.ok(iterations.some(x=>x>1),'Incorrect zero-computation one-shot claim');
  console.log('SCIENCE_NATIVE_FIELD_RESULT',JSON.stringify({seen,valid,goalReached:ended,plannedEdges:edges,
    meanSweeps:iterations.reduce((a,b)=>a+b,0)/seen,maxSweeps:Math.max(...iterations),
    worstAbsFieldError:worstError,maxTransientCellDelta:maxDelta}));
});
test('goal-attraction ablation on frozen ORIGINAL solver destroys actual first plans',()=>{
  let lost=0,retained=0;
  for(const {w,e} of experiments){
    if(!e.path)continue;
    const negative=Object.assign(Object.create(Discoverer.prototype),D);
    negative.attract=()=>0;negative.noise=0;negative.temp=0;
    const ablated=negative.shape(retinaForWorld(w),w.n,w.start);
    lost+=Number(ablated===null);retained+=Number(ablated!==null);
  }
  assert.equal(retained,0,'Removing learned goal still left original plan');
  console.log('SCIENCE_GOAL_ABLATION',JSON.stringify({routesDestroyed:lost,routesRetained:retained}));
});
test('material conductance ablation affects learned solution paths',()=>{
  let original=0,after=0;
  for(const {w,e} of experiments){
    if(!e.path||e.pathCells.at(-1)!==w.goal)continue;
    original++;
    const negative=Object.assign(Object.create(Discoverer.prototype),D);
    negative.conduct=k=>k===KIND.floor?0:D.conduct(k);
    negative.noise=0;negative.temp=0;
    const p=negative.shape(retinaForWorld(w),w.n,w.start);
    if(p){
      let at=w.start;
      for(const a of p)at+=[-w.n,1,w.n,-1][a];
      after+=Number(at===w.goal);
    }
  }
  assert.ok(original>0);assert.ok(after<original,'Floor suppression did not affect routes');
  console.log('SCIENCE_CONDUCTANCE_ABLATION',JSON.stringify({originalGoalReached:original,afterGoalReached:after}));
});
test('native field excitation is TRANSIENT and monotone, not a sustainable oscillator',()=>{
  for(const {e} of experiments){
    let previous=Array.from({length:e.n*e.n},(_,i)=>e.ret[i]!==KIND.self&&e.att[e.ret[i]]>.2?e.att[e.ret[i]]:0);
    for(const f of e.frames){
      for(let i=0;i<f.values.length;i++)assert.ok(f.values[i]>=previous[i]-1e-12);
      previous=f.values;
    }
    assert.equal(e.frames.at(-1)?.changed,0);assert.equal(e.frames.at(-1)?.maxDelta,0);
  }
  console.log('SCIENCE_EXCITATION_CLASSIFICATION','transient-monotone-front-to-fixed-point');
});
test('real xD solver: nominal 2048D contains seven ACTIVE axes; 2D observer projection loses information',()=>{
  const b=new LearnedXDActionAtlas();
  const t=b.trainWorld(new CompleteXDWorld({dimensions:16,seed:17,physicsSeed:11}));
  assert.ok(t.execution.solved);assert.equal(b.effects.size,7);
  const target=new CompleteXDWorld({dimensions:2048,seed:211,physicsSeed:11});
  const frozen=b.testFrozen(target);
  assert.equal(frozen.plan.answerRouteWasNotProvided,true);
  assert.equal(frozen.execution.solved,true);
  assert.equal(frozen.plan.initialPredictedSolution.length,frozen.execution.frames.length+1);
  assert.equal(target.view().finiteStateCount,128);assert.equal(target.view().activeRank,7);
  const firstTwo=target.activeDimensions.slice(0,2);
  const occupancy=target.view().vertices.map(x=>firstTwo.map(a=>Number(x.coordinates.includes(a))).join(''));
  assert.equal(new Set(occupancy).size,4);assert.equal(occupancy.length,128);
  console.log('SCIENCE_XD_NATIVE_RESULT',JSON.stringify({ambient:2048,active:7,states:128,
    projected2DStates:new Set(occupancy).size,meanProjectionAliasing:128/4,
    solved:frozen.execution.solved,actions:frozen.execution.attempted,
    matching:frozen.execution.correct,shortest:frozen.plan.evaluatorPhysicalShortestPath,
    plannedBeforeAction:frozen.plan.predictionBeforeExecution}));
});
