// Read-only experimental probes of original V42/V41-Fast-compatible Discoverer.
// No engine/weights/checkpoint/training/UI modifications. Native imports only.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { Discoverer, KIND, playExercise } from '../transcend/torus-aether/worlds/exercise.mjs';
import { makeMaze, seedOf, SEEDS, ACTIONS, nextCell } from '../transcend/torus-aether/worlds/labyrinth.mjs';

const digest = p => crypto.createHash('sha256').update(fs.readFileSync(new URL(p, import.meta.url))).digest('hex');
const state = (w, extraGoal = -1) => {
  const ret = Array.from(w.wall, v => v ? KIND.wall : KIND.floor);
  ret[w.goal] = KIND.target;
  if (extraGoal >= 0 && extraGoal !== w.start && extraGoal !== w.goal && !w.wall[extraGoal]) ret[extraGoal] = KIND.target;
  ret[w.start] = KIND.self;
  return ret;
};
const adjacency = n => Array.from({length:n*n}, (_,i) => {
  const x=i%n, y=(i/n)|0;
  return ACTIONS.flatMap(([dx,dy],a) => {
    const xx=x+dx, yy=y+dy;
    return xx>=0&&yy>=0&&xx<n&&yy<n ? [{to:yy*n+xx,action:a}] : [];
  });
});
const geometry = (N,seed) => Array.from({length:N}, (_,i) => [
  ((i*111+seed*7)%1009)/1009,
  ((i*377+seed*11)%1013)/1013
]);
const score = (w,actions) => {
  if (!actions) return {reached:false,valid:false,steps:0};
  let p=w.start, valid=true;
  for (const a of actions) {
    const j=nextCell(w,p,a);
    if(j<0||w.wall[j]) {valid=false;break;}
    p=j;
  }
  return {reached:valid && p===w.goal,valid,steps:actions.length};
};

test('native trained organism: loop/attractor/topology controls, frozen heldout', {timeout:180000}, () => {
  const D=new Discoverer(11);
  let trainSolved=0,trainSteps=0,trainHasInitial=0;
  const episodeTrajectory=[];
  for(let i=0;i<160;i++){
    const n=i<96?7:9;
    const w=makeMaze(seedOf(SEEDS.train,11000+i),n);
    const r=playExercise(w,D,()=>{});
    trainSolved+=Number(r.solved);
    trainSteps+=r.steps;
    trainHasInitial+=Number(r.first>0);
    episodeTrajectory.push([
      ...D.pass,...D.block,...D.endIn,
      ...D.trust.plan,...D.trust.explore
    ]);
  }
  const discovered={
    self:D.self(),moves:[0,1,2,3,4,5,6,7].filter(o=>D.effect(o)).length,
    conductFloor:D.conduct(KIND.floor),conductWall:D.conduct(KIND.wall),
    targetAttract:D.attract(KIND.target),episodes:D.episodes
  };
  const frozen=JSON.stringify({disp:D.disp.map(m=>[...m]),tries:D.tries,pass:D.pass,block:D.block,enter:D.enter,endIn:D.endIn,trust:D.trust,episodes:D.episodes});
  const baseline=new Discoverer(11);
  const R={source:{
    originalExerciseSha256:digest('../transcend/torus-aether/worlds/exercise.mjs'),
    originalWorldSha256:digest('../transcend/torus-aether/worlds/labyrinth.mjs')
  },train:{episodes:160,solved:trainSolved,steps:trainSteps,initialCorrectNonzero:trainHasInitial,discovered},
  heldout:{count:0,shapePresent:0,fullRouteValid:0,fullRouteGoalReached:0,baselineShapePresent:0,
    gridGraphComparable:0,gridGraphExactMatch:0,graphAscents:0,strictlyIncreasing:0,graphRepeatedNodes:0,graphGoalReached:0,
    syntheticTorusChangedPath:0,syntheticTorusGoalReached:0,
    noGoalAblationNull:0,multiTargetRuns:0,multiTargetReachedEither:0,multiTargetVisitedBoth:0,
    deterministicRepetitions:0,stochasticDifferent:0},
  internalState:{nondecreasingCounterViolations:0,consecutiveExactRepeats:0,nonconsecutiveExactRepeats:0},
  notes:[
    'The original function is called directly. The geometry is introduced only through existing optional shapeGraph().',
    'A repeated computation is not proof of periodic hidden-state orbits; this test checks observable states and paths.',
    'The tester uses true maze walls and goals only for independent scoring, not in the original planner.'
  ]};
  const seenStates=new Set();
  let lastKey=null;
  for(const a of episodeTrajectory){
    const key=JSON.stringify(a);
    if(key===lastKey)R.internalState.consecutiveExactRepeats++;
    else if(seenStates.has(key))R.internalState.nonconsecutiveExactRepeats++;
    seenStates.add(key);lastKey=key;
  }
  for(let t=1;t<episodeTrajectory.length;t++)
    for(let i=0;i<16;i++)
      if(episodeTrajectory[t][i]<episodeTrajectory[t-1][i])
        R.internalState.nondecreasingCounterViolations++;
  for(let q=0;q<72;q++){
    const n=q%2?9:11;
    const w=makeMaze(seedOf(SEEDS.test,17000+q),n);
    const ret=state(w),neighbors=adjacency(n);
    D.temp=0;
    const original=D.shape(ret,n,w.start);
    const comparator=baseline.shape(ret,n,w.start);
    R.heldout.count++;
    if(comparator)R.heldout.baselineShapePresent++;
    if(original)R.heldout.shapePresent++;
    const direct=score(w,original);
    R.heldout.fullRouteValid+=Number(direct.valid);
    R.heldout.fullRouteGoalReached+=Number(direct.reached);
    const details=D.shapeGraph(ret,neighbors,w.start,{details:true,geometryWeight:0});
    const graph=details?details.path.map(x=>x.action):null;
    R.heldout.gridGraphComparable++;
    if(JSON.stringify(graph)===JSON.stringify(original))R.heldout.gridGraphExactMatch++;
    if(details){
      let prev=w.start,visited=new Set([prev]);
      for(const hop of details.path){
        R.heldout.graphAscents++;
        if(details.values[hop.to]>details.values[prev])R.heldout.strictlyIncreasing++;
        if(visited.has(hop.to))R.heldout.graphRepeatedNodes++;
        visited.add(hop.to);prev=hop.to;
      }
      R.heldout.graphGoalReached+=Number(prev===w.goal);
    }
    const toroidal=D.shapeGraph(ret,neighbors,w.start,{
      geometry:geometry(n*n,17000+q),geometryWeight:0.5,details:true
    });
    const alternative=toroidal?toroidal.path.map(x=>x.action):null;
    R.heldout.syntheticTorusChangedPath+=Number(JSON.stringify(alternative)!==JSON.stringify(graph));
    R.heldout.syntheticTorusGoalReached+=Number(score(w,alternative).reached);
    const saveEnd=D.endIn.slice();
    D.endIn.fill(0);
    const removed=D.shape(ret,n,w.start);
    R.heldout.noGoalAblationNull+=Number(removed===null);
    D.endIn=saveEnd;
    const extra=ret.findIndex((k,i)=>k===KIND.floor && i!==w.start && i!==w.goal);
    if(extra>=0){
      const multi=state(w,extra);
      const alt=D.shapeGraph(multi,neighbors,w.start,{details:true});
      R.heldout.multiTargetRuns++;
      if(alt){
        const visited=[w.start,...alt.path.map(x=>x.to)];
        R.heldout.multiTargetReachedEither+=Number(visited.includes(extra)||visited.includes(w.goal));
        R.heldout.multiTargetVisitedBoth+=Number(visited.includes(extra)&&visited.includes(w.goal));
      }
    }
    if(q<20){
      const repeated=Array.from({length:4},()=>D.shape(ret,n,w.start));
      R.heldout.deterministicRepetitions+=Number(repeated.every(x=>JSON.stringify(x)===JSON.stringify(repeated[0])));
      D.temp=.9;
      const randoms=Array.from({length:6},()=>D.shape(ret,n,w.start));
      D.temp=0;
      R.heldout.stochasticDifferent+=Number(new Set(randoms.map(x=>JSON.stringify(x))).size>1);
    }
  }
  const frozenAfter=JSON.stringify({disp:D.disp.map(m=>[...m]),tries:D.tries,pass:D.pass,block:D.block,enter:D.enter,endIn:D.endIn,trust:D.trust,episodes:D.episodes});
  assert.equal(frozenAfter,frozen,'Probes must not train or modify learned native state');
  assert.equal(R.heldout.graphRepeatedNodes,0,'Existing native graph ascent should not revisit states');
  assert.equal(R.heldout.strictlyIncreasing,R.heldout.graphAscents,'Native ascent is not strictly increasing');
  assert.equal(R.heldout.noGoalAblationNull,R.heldout.count,'Removing learned goal attraction should remove shape');
  assert.equal(R.heldout.deterministicRepetitions,20,'Noise-free native planning is not repeatable');
  console.log('MAGICPERSPECTIVE_NATIVE_HYPOTHESIS_RESULTS '+JSON.stringify(R));
});
