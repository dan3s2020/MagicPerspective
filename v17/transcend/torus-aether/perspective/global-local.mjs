// The same maze from two perspectives: ONE global glimpse, then ONLY a 3x3 local retina.
// Pure/frozen evaluation: world physics and true position are held exclusively by the evaluator.
// Policy sees (initial map, learned body effects, local patch, its estimated pose).
// Original V17 Brain/Discoverer and checkpoint serialization are NEVER overwritten.
import {KIND,Discoverer,playExercise} from '../worlds/exercise.mjs';
import {ACTIONS,makeMaze,seedOf,SEEDS,RNG,nextCell} from '../worlds/labyrinth.mjs';
import {BodyPerspectiveMemory} from './body-memory.mjs';

export function globalGlance(world){
  const ret=Array.from(world.wall,v=>v?KIND.wall:KIND.floor);
  ret[world.goal]=KIND.target;ret[world.start]=KIND.self;return ret;
}
export function localRetina(world,truePosition,radius=1){
  const out=[],n=world.n,xc=truePosition%n,yc=Math.floor(truePosition/n);
  for(let dy=-radius;dy<=radius;dy++)for(let dx=-radius;dx<=radius;dx++){
    const x=xc+dx,y=yc+dy;
    if(x<0||y<0||x>=n||y>=n){out.push(-1);continue;}
    const j=y*n+x;out.push(j===truePosition?KIND.self:j===world.goal?KIND.target:world.wall[j]?KIND.wall:KIND.floor);
  }
  return out;
}
function rememberedPatch(initial,n,origin,selfKind,radius=1){
  const out=[],x=origin%n,y=Math.floor(origin/n),init=initial.indexOf(selfKind);
  for(let dy=-radius;dy<=radius;dy++)for(let dx=-radius;dx<=radius;dx++){
    const X=x+dx,Y=y+dy;
    if(X<0||Y<0||X>=n||Y>=n){out.push(-1);continue;}
    const j=Y*n+X;out.push(j===origin?selfKind:j===init?KIND.floor:initial[j]);
  }
  return out;
}
export function relocalize(initial,n,observed,predicted,selfKind,{radius=1}={}){
  if(!Array.isArray(initial)||initial.length!==n*n||!Array.isArray(observed)||observed.length!==(2*radius+1)**2)
    throw Error('Invalid global-map/local-patch dimensions');
  // The actual coordinate is never an argument: rank candidate positions using ONLY remembered landmarks.
  let first=null,second=null;
  for(let i=0;i<initial.length;i++){
    if(initial[i]===KIND.wall)continue;
    const sample=rememberedPatch(initial,n,i,selfKind,radius);
    let matches=0,total=0;
    for(let k=0;k<sample.length;k++){total++;if(sample[k]===observed[k])matches++;}
    const distance=Math.abs(i%n-predicted%n)+Math.abs(Math.floor(i/n)-Math.floor(predicted/n));
    const score=matches/Math.max(1,total)-.055*distance;
    const candidate={cell:i,match:matches/Math.max(1,total),score,distance};
    if(!first||score>first.score){second=first;first=candidate;}
    else if(!second||score>second.score)second=candidate;
  }
  return first?{...first,gap:second?first.score-second.score:1,ambiguous:!!second&&first.score-second.score<.04}:null;
}
function planCells(n,start,dirs){
  const out=[start];let at=start;
  for(const direction of dirs||[]){const v=ACTIONS[direction];if(!v)break;
    const x=at%n+v[0],y=Math.floor(at/n)+v[1];if(x<0||y<0||x>=n||y>=n)break;
    at=y*n+x;out.push(at);}
  return out;
}
export function cloneDiscoverer(d){
  const copy=Object.assign(Object.create(Discoverer.prototype),structuredClone(d));
  copy.r=Object.assign(Object.create(RNG.prototype),copy.r);
  copy.noise=0;copy.temp=0;return copy;
}
// The evaluator is permitted to know truePosition/goal only for physics and AFTER-the-fact scoring.
export function playLocalPerspective(world,discoverer,bodyMemory=new BodyPerspectiveMemory(),{maxTrace=250,localRadius=1}={}){
  const D=cloneDiscoverer(discoverer),n=world.n,initial=globalGlance(world),selfKind=D.self();
  const firstShape=selfKind>=0?D.shape(initial,n,initial.indexOf(selfKind)):null;
  const firstPath=selfKind>=0?planCells(n,initial.indexOf(selfKind),firstShape):[];
  if(selfKind<0)return {solved:false,reason:'SELF_UNDISCOVERED',steps:0,optimal:world.dist[world.start],n,
    wall:Array.from(world.wall),initial,initialShape:[],initialPath:[],path:[world.start],trace:[],
    locality:{globalObservations:1,localObservations:0,patchSide:2*localRadius+1,afterFirstFullMapRead:false},poseAccuracy:null,
    extraSteps:null,skippedForUnknownBody:true};
  let pos=world.start,estimate=initial.indexOf(selfKind),steps=0,poseHits=0,visible=0,
    followed=0,explored=0,relocalized=0,ambiguous=0,blocked=0;
  const path=[pos],trace=[],maxSteps=Math.min(1200,3*world.dist[world.start]+15);
  const visits=new Uint16Array(n*n);visits[estimate]++;
  while(pos!==world.goal&&steps<maxSteps){
    // NEVER pass actual world retina here. D.shape works on the preserved first-glimpse map,
    // with only its own estimated body coordinate shifted.
    const remembered=initial.slice(),start=remembered.indexOf(selfKind);
    if(start>=0)remembered[start]=KIND.floor;
    remembered[estimate]=selfKind;
    const projected=D.shape(remembered,n,estimate),planned=projected?.[0]??null,
      targetDelta=planned==null?null:ACTIONS[planned];
    const effective=Array.from({length:8},(_,o)=>bodyMemory.effect(o)||D.effect(o));
    let output=targetDelta?effective.findIndex(v=>v&&v[0]===targetDelta[0]&&v[1]===targetDelta[1]):-1;
    let how='remembered_global_shape';
    if(output<0){
      // Fallback is still the original V17 Discoverer policy, but with a REMEMBERED retina,
      // never with the actual after-step whole world.
      const c=D.choose(remembered,n,estimate,visits,projected);
      output=c.o;how='body_mapping_unknown:'+c.how;explored++;
    }else followed++;
    if(!Number.isInteger(output)||output<0||output>=8)break;
    const expected=effective[output];
    const expectedPos=expected?(() => {const x=estimate%n+expected[0],y=Math.floor(estimate/n)+expected[1];
      return x<0||y<0||x>=n||y>=n?estimate:y*n+x;})():estimate;
    const trueDir=D.world.moves.indexOf(output); // only evaluator physics reads the true action mapping
    const to=trueDir<0?-1:nextCell(world,pos,trueDir),before=pos;
    if(to>=0&&!world.wall[to])pos=to;else blocked++;
    // The policy observes ONLY the resulting 3x3 egocentric patch.
    const patch=localRetina(world,pos,localRadius);
    const match=relocalize(initial,n,patch,expectedPos,selfKind,{radius:localRadius});
    if(match){estimate=match.cell;relocalized++;if(match.ambiguous)ambiguous++;}
    else estimate=expectedPos;
    visits[estimate]++;
    steps++;visible++;poseHits+=estimate===pos;path.push(pos);
    if(trace.length<maxTrace)trace.push({step:steps,output,how,plannedDirection:planned,
      expectedPosition:expectedPos,estimatedPosition:estimate,truePosition:pos,previousTruePosition:before,
      localPatch:patch,match:match?.match??null,ambiguity:match?.ambiguous??null,moved:pos!==before,
      remainingShape:projected?projected.slice(0,Math.min(80,projected.length)):[]});
  }
  const solved=pos===world.goal;
  return {solved,reason:solved?'REACHED_GOAL':'STEP_LIMIT_OR_UNKNOWN_ACTION',steps,
    optimal:world.dist[world.start],extraSteps:solved?steps-world.dist[world.start]:null,
    firstShapeLength:firstShape?.length||0,firstPath,initialShape:firstShape||[],
    initial,wall:Array.from(world.wall),start:world.start,goal:world.goal,n,path,trace,
    locality:{globalObservations:1,localObservations:visible,patchSide:2*localRadius+1,
      afterFirstFullMapRead:false},
    poseAccuracy:visible?poseHits/visible:null,followed,explored,relocalized,ambiguous,blocked,
    rememberedMapUsed:true,actorKnowsTruePosition:false,bodyEffectsKnown:effectiveCount(bodyMemory,D)};
}
function effectiveCount(memory,D){return Array.from({length:8},(_,i)=>memory.effect(i)||D.effect(i)).filter(Boolean).length;}
const summarize=rows=>{
 const solved=rows.filter(x=>x.solved),avg=(list,field)=>list.length?list.reduce((s,x)=>s+(x[field]||0),0)/list.length:null;
 return {count:rows.length,solved:solved.length,solvedRate:rows.length?solved.length/rows.length:0,
   meanStepsSolved:avg(solved,'steps'),meanExtraStepsSolved:avg(solved,'extraSteps'),
   meanStepsPerOptimalSolved:solved.length?solved.reduce((s,x)=>s+x.steps/x.optimal,0)/solved.length:null};
};
export function evaluateBodyPerspective(brain,memory,{sizes=[7,9,11],per=2,seed=9173,maxTrace=250}={}){
 if(!Array.isArray(sizes)||!sizes.length||sizes.length>10||sizes.some(n=>!Number.isInteger(n)||n<5||n>31||n%2!==1))
  throw Error('sizes must be an array of 5..31 odd integers');
 if(!Number.isInteger(per)||per<1||per>10||!Number.isSafeInteger(seed))throw Error('Invalid perspective exam options');
 if(!brain?.disc)throw Error('Original Brain Discoverer is missing');
 const cases=[],base=[],body=[];
 for(const n of sizes)for(let k=0;k<per;k++){
  const world=makeMaze(seedOf(SEEDS.test,(seed%100000)*13+n*101+k),n);
  const native=playExercise(world,cloneDiscoverer(brain.disc),()=>{},{record:true});
  const local=playLocalPerspective(world,brain.disc,memory,{maxTrace});
  base.push(native);body.push(local);
  cases.push({...local,index:cases.length,baseline:{solved:native.solved,steps:native.steps,optimal:native.optimal,
    first:native.first,how:native.how,firstPath:native.shapes?.[0]||[]},scoreSource:'Oracle shortest distance and true pose appear ONLY in evaluator'});
 }
 return {protocol:'ONE_GLOBAL_GLANCE_THEN_ONLY_3X3_LOCAL_PATCHES',realMazePhysics:true,
   frozen:true,actor:'trained V17 Discoverer + separately trained body-effect memory',
   controls:{sizes,per,seed},cases,summary:{native:summarize(base),body:summarize(body),
    poseAccuracy:body.filter(x=>x.poseAccuracy!==null).length?
      body.filter(x=>x.poseAccuracy!==null).reduce((a,x)=>a+x.poseAccuracy,0)/body.filter(x=>x.poseAccuracy!==null).length:null,
    totalGlobalReads:body.length,totalLocalReads:body.reduce((a,x)=>a+x.locality.localObservations,0),
    bodyTraining:memory.summary()},
   limitations:['V17 action outputs are fixed compass moves; body orientation rotation is not modeled',
     'The global map is shown once and then stored intact as memory; active SLAM of an unknown map is not yet implemented',
     'Frozen evaluation updates pose belief but not neural weights; learned motor effects were collected from prior V17 training',
     'Original V17 full-retina learner is retained; this body viewpoint is an opt-in, isolated comparative actor']};
}
