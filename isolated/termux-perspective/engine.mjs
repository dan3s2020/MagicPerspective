// MagicPerspective / isolated Termux experiment: learning a GLOBAL↔BODY perspective transform.
// Uses the unchanged V17/V16 maze generator, but does NOT modify or replace the V17 Brain.
// This is a supervised calibration experiment. A teacher discloses frame + displacement
// ONLY during calibration; unseen test navigation sees an overhead map ONCE, then local patches.
import {makeMaze,bfs,seedOf,SEEDS,RNG,ACTIONS,nextCell} from '../../v17/transcend/torus-aether/worlds/labyrinth.mjs';

const mod4=x=>(x%4+4)%4;
const vec=d=>ACTIONS[mod4(d)];
const cell=(n,x,y)=>x<0||y<0||x>=n||y>=n?-1:y*n+x;
const xy=(n,p)=>[p%n,Math.floor(p/n)];
const neighbors=(memory,p)=>{
  const [x,y]=xy(memory.n,p);return ACTIONS.map(([dx,dy])=>cell(memory.n,x+dx,y+dy)).filter(q=>q>=0&&!memory.wall[q]);
};
function argmax(a){let idx=0;for(let i=1;i<a.length;i++)if(a[i]>a[idx])idx=i;return idx;}
function distinct(a){return [...new Set(a)];}
export class BodyFrameLearner{
 constructor(){
  this.counts=Array.from({length:4},()=>Array.from({length:4},()=>[0,0,0,0]));
  this.examples=0;this.collisions=0;
 }
 learn(frame,localAction,dx,dy){
  const d=ACTIONS.findIndex(([x,y])=>x===dx&&y===dy);
  if(d<0){this.collisions++;return false;}
  if(![frame,localAction].every(x=>Number.isInteger(x)&&x>=0&&x<4))throw Error('Invalid calibration action or frame');
  this.counts[frame][localAction][d]++;this.examples++;return true;
 }
 direction(frame,localAction){
  const counts=this.counts[mod4(frame)][mod4(localAction)];
  if(counts.reduce((a,b)=>a+b,0)===0)return mod4(localAction); // before learning: identity hypothesis
  return argmax(counts);
 }
 confidence(frame,localAction){
  const c=this.counts[mod4(frame)][mod4(localAction)],s=c.reduce((a,b)=>a+b,0);
  return s?Math.max(...c)/s:0;
 }
 inverse(frame,worldDir){
  for(let a=0;a<4;a++)if(this.direction(frame,a)===worldDir)return a;
  return worldDir; // uncalibrated control
 }
 offset(frame,localDx,localDy){
  const east=vec(this.direction(frame,1)),south=vec(this.direction(frame,2));
  return [east[0]*localDx+south[0]*localDy,east[1]*localDx+south[1]*localDy];
 }
 accuracy(){
  let ok=0;
  for(let h=0;h<4;h++)for(let a=0;a<4;a++)ok+=+(this.direction(h,a)===mod4(h+a));
  return ok/16;
 }
 freeze(){const o=new BodyFrameLearner();o.counts=this.counts.map(row=>row.map(x=>x.slice()));o.examples=this.examples;o.collisions=this.collisions;return o;}
}
// World physics. The hidden orientation and actual position are used here only,
// NOT passed to Navigator during the evaluation phase.
export function perceiveLocal(world,pos,hiddenFrame,radius=2){
 const [sx,sy]=xy(world.n,pos),out=[];
 const east=vec(mod4(hiddenFrame+1)),south=vec(mod4(hiddenFrame+2));
 for(let ly=-radius;ly<=radius;ly++)for(let lx=-radius;lx<=radius;lx++){
  const j=cell(world.n,sx+lx*east[0]+ly*south[0],sy+lx*east[1]+ly*south[1]);
  out.push(j<0||world.wall[j]?1:0);
 }
 return out;
}
export function rememberedMap(w){
 // One overhead glance. This copy is retained; the agent never reads w again.
 const memory={n:w.n,wall:Array.from(w.wall),goal:w.goal,start:w.start};
 memory.dist=Array.from(bfs(memory.n,memory.wall,memory.goal));
 return memory;
}
function mismatch(memory,model,local,p,frame,radius=2){
 const [sx,sy]=xy(memory.n,p);let errors=0;
 let j=0;
 for(let y=-radius;y<=radius;y++)for(let x=-radius;x<=radius;x++){
  const [dx,dy]=model.offset(frame,x,y),k=cell(memory.n,sx+dx,sy+dy);
  const expected=k<0||memory.wall[k]?1:0;
  if(expected!==local[j++])errors++;
 }
 return errors;
}
export class Navigator{
 constructor(memory,calibration,{radius=2}={}){
  this.memory=memory;this.calibration=calibration;this.radius=radius;
  this.position=memory.start;this.frame=null;this.lastAction=null;this.lastMoved=null;
  this.history=[];this.disagreements=0;this.fallbacks=0;
 }
 observe(local){
  const m=this.memory;
  if(local.length!==(2*this.radius+1)**2)throw Error('Unexpected local observation size');
  let candidate;
  if(this.frame===null){candidate=[m.start];}
  else if(this.lastMoved){candidate=neighbors(m,this.position);}
  else candidate=[this.position];
  if(!candidate.length)candidate=[this.position];
  const expected=this.lastAction!==null&&this.frame!==null&&this.lastMoved
    ?(()=>{const [x,y]=xy(m.n,this.position),[dx,dy]=vec(this.calibration.direction(this.frame,this.lastAction));return cell(m.n,x+dx,y+dy);})()
    :this.position;
  let scored=[];
  const rank=positions=>{
   const ranked=[];
   for(const pos of positions)for(let frame=0;frame<4;frame++){
    const mismatchCount=mismatch(m,this.calibration,local,pos,frame,this.radius);
    // Weak continuity preference; match against the remembered initial map,
    // not against the simulator's hidden true position or heading.
    const penalty=pos!==expected?.15:0;
    ranked.push({pos,frame,errors:mismatchCount,score:mismatchCount+penalty});
   }
   ranked.sort((a,b)=>a.score-b.score||a.pos-b.pos||a.frame-b.frame);
   return ranked;
  };
  scored=rank(candidate);
  if(scored[0]?.errors>5){
   // Re-localization by image matching against the remembered full map.
   // It does NOT reveal the current full world state.
   const possible=m.wall.flatMap((v,i)=>v?[]:[i]);
   const global=rank(possible);
   if(global[0].errors<scored[0].errors){scored=global;this.fallbacks++;}
  }
  const best=scored[0];
  if(!best)throw Error('Cannot localize from observation');
  this.position=best.pos;this.frame=best.frame;
  return {...best,confidence:scored.length>1?scored[1].score-best.score:0};
 }
 choose(){
  const m=this.memory,p=this.position;
  const ways=neighbors(m,p);
  let bestWorldDir=-1,bestD=m.dist[p];
  for(let d=0;d<4;d++){
    const [x,y]=xy(m.n,p),[dx,dy]=vec(d);
    const j=cell(m.n,x+dx,y+dy);
    if(j>=0&&!m.wall[j]&&m.dist[j]<bestD){bestD=m.dist[j];bestWorldDir=d;}
  }
  if(bestWorldDir<0){
    this.fallbacks++;
    // Defensive maneuver if localization was wrong; uses only remembered map.
    bestWorldDir=ways.length?ACTIONS.findIndex(([dx,dy])=>{const [x,y]=xy(m.n,p),j=cell(m.n,x+dx,y+dy);return j===ways[0];}):0;
  }
  const bodyAction=this.calibration.inverse(this.frame,bestWorldDir);
  this.lastAction=bodyAction;
  return {bodyAction,bestWorldDir,estimatedPos:p,estimatedFrame:this.frame,
    mapDistance:m.dist[p],firstOverheadGoal:m.goal};
 }
 feedback(moved){this.lastMoved=!!moved;}
}
export function calibrate(model,{samples=320,seed=19,onProgress}={}){
 const r=new RNG(seed),record=[];
 for(let i=0;i<samples;i++){
  const world=makeMaze(seedOf(SEEDS.train,i),[7,9,11][i%3]);
  const hiddenFrame=r.int(4),bodyAction=r.int(4);
  const globalDir=mod4(hiddenFrame+bodyAction);
  const available=[];
  for(let k=0;k<world.wall.length;k++){
   if(world.wall[k])continue;
   const j=nextCell(world,k,globalDir);
   if(j>=0&&!world.wall[j])available.push([k,j]);
  }
  if(!available.length)continue;
  const [from,to]=available[r.int(available.length)];
  const [x,y]=xy(world.n,from),[xx,yy]=xy(world.n,to);
  model.learn(hiddenFrame,bodyAction,xx-x,yy-y);
  if(record.length<64)record.push({hiddenFrame,bodyAction,observedDisplacement:[xx-x,yy-y]});
  if(onProgress&&((i+1)%32===0||i===samples-1))onProgress({sample:i+1,examples:model.examples,accuracy:model.accuracy()});
 }
 return {examples:model.examples,accuracy:model.accuracy(),calibrationExamples:record};
}
function initialRoute(mem){
 const points=[mem.start],seen=new Set(points);
 let p=mem.start;
 while(p!==mem.goal&&points.length<=mem.n*mem.n){
  let best=-1,bestDist=mem.dist[p];
  for(const j of neighbors(mem,p))if(mem.dist[j]<bestDist){best=j;bestDist=mem.dist[j];}
  if(best<0||seen.has(best))break;
  p=best;points.push(p);seen.add(p);
 }
 return points;
}
export function episode(model,seed,{size=11,trace=false,noise=0,seedSalt=117}={}){
 const world=makeMaze(seed,size),memory=rememberedMap(world),nav=new Navigator(memory,model);
 const rng=new RNG((seed^seedSalt)>>>0),hiddenFrame=rng.int(4);
 let actual=world.start,moves=0,bumps=0,positionErrors=0,frameErrors=0,locCount=0;
 const budget=Math.min(size*size*6,Math.max(30,3*world.dist[world.start]+15));
 const records=[],physicalPath=[actual],idealPath=initialRoute(memory);
 for(let t=0;t<budget&&actual!==world.goal;t++){
  const patch=perceiveLocal(world,actual,hiddenFrame);
  if(noise>0)for(let j=0;j<patch.length;j++)if(rng.next()<noise)patch[j]=1-patch[j];
  const inferred=nav.observe(patch);
  locCount++;if(inferred.pos!==actual)positionErrors++;if(inferred.frame!==hiddenFrame)frameErrors++;
  const decision=nav.choose(),trueGlobalDir=mod4(hiddenFrame+decision.bodyAction),actualBefore=actual;
  const next=nextCell(world,actual,trueGlobalDir),moved=next>=0&&!world.wall[next];
  if(moved)actual=next;else bumps++;
  nav.feedback(moved);moves++;
  if(physicalPath.at(-1)!==actual)physicalPath.push(actual);
  if(trace)records.push({step:t+1,observedPatch:patch,estimatedPos:inferred.pos,
    actualPosBefore:actualBefore,actualPosAfter:actual,estimatedFrame:inferred.frame,
    realFrame:hiddenFrame,matchingErrors:inferred.errors,confidence:inferred.confidence,
    requestedGlobalDirection:decision.bestWorldDir,bodyAction:decision.bodyAction,
    realWorldDirection:trueGlobalDir,moved,remainingMapDistance:decision.mapDistance});
 }
 return {seed,size,solved:actual===world.goal,steps:moves,optimal:world.dist[world.start],
  extra:actual===world.goal?moves-world.dist[world.start]:null,bumps,
  positionAccuracy:locCount?1-positionErrors/locCount:null,
  orientationAccuracy:locCount?1-frameErrors/locCount:null,
  firstShapeCorrect:idealPath.at(-1)===memory.goal,
  budget,localObservations:locCount,fullMapGlances:1,globalReReads:0,
  relocalizations:nav.fallbacks,hiddenOrientation:trace?hiddenFrame:undefined,
  ...(trace?{world:{n:world.n,wall:memory.wall,start:world.start,goal:world.goal},initialGlobalRoute:idealPath,
    path:physicalPath,records}:{} )};
}
export function aggregate(rows){
 const solved=rows.filter(r=>r.solved),avg=(xs)=>xs.length?xs.reduce((a,b)=>a+b,0)/xs.length:null;
 return {count:rows.length,solved:solved.length,successRate:rows.length?solved.length/rows.length:0,
  meanExtraStepsSolved:avg(solved.map(x=>x.extra)),
  meanStepsSolved:avg(solved.map(x=>x.steps)),
  meanOptimalSteps:avg(rows.map(x=>x.optimal)),
  meanStepsToOptimalSolved:avg(solved.map(x=>x.steps/x.optimal)),
  meanBumps:avg(rows.map(x=>x.bumps)),
  localizationAccuracy:avg(rows.map(x=>x.positionAccuracy)),
  orientationAccuracy:avg(rows.map(x=>x.orientationAccuracy)),
  meanReLocalizations:avg(rows.map(x=>x.relocalizations)),
  firstShapeCorrectRate:avg(rows.map(x=>+x.firstShapeCorrect))};
}
export function runExperiment({train=320,test=64,seed=29,size=11,noise=0,onProgress}={}){
 if(!Number.isSafeInteger(train)||train<0||train>300000)throw Error('train must be 0..300000');
 if(!Number.isSafeInteger(test)||test<4||test>5000)throw Error('test must be 4..5000');
 if(![7,9,11,13,15,17,19,21,25,31].includes(size))throw Error('size must be an odd supported maze size');
 if(!Number.isFinite(noise)||noise<0||noise>.25)throw Error('noise must be 0..0.25');
 const before=new BodyFrameLearner();
 const calibrated=new BodyFrameLearner();
 const training=calibrate(calibrated,{samples:train,seed,onProgress});
 const after=calibrated.freeze();
 // Independent validation seeds measure the learning curve; final test seeds remain untouched.
 const checkpoints=distinct([0,8,16,32,64,128,256,train].filter(x=>x<=train)).sort((a,b)=>a-b);
 const learningCurve=checkpoints.map(samples=>{
  const snapshot=new BodyFrameLearner();
  if(samples>0)calibrate(snapshot,{samples,seed});
  const validations=Array.from({length:12},(_,j)=>episode(snapshot,seedOf(SEEDS.test,700000+seed*19+j*13),{size,noise}));
  const stats=aggregate(validations);
  return {samples,examples:snapshot.examples,mappingAccuracy:snapshot.accuracy(),
    validationSuccessRate:stats.successRate,validationExtraSteps:stats.meanExtraStepsSolved,
    orientationAccuracy:stats.orientationAccuracy,localizationAccuracy:stats.localizationAccuracy};
 });
 const tested=[],base=[],trained=[];
 for(let i=0;i<test;i++){
  const worldSeed=seedOf(SEEDS.test,50000+i*7+seed*31);
  base.push(episode(before,worldSeed,{size,noise,trace:i<2}));
  trained.push(episode(after,worldSeed,{size,noise,trace:i<2}));
  if(onProgress&&(i+1)%16===0)onProgress({test:i+1,successBefore:aggregate(base).successRate,successAfter:aggregate(trained).successRate});
 }
 const evidence=aggregate(trained),baseline=aggregate(base);
 const diff=evidence.successRate-baseline.successRate;
 const statement=train===0?'No training supplied; the two controls should coincide.':
  diff>0?'Transfer improved held-out maze success against the uncalibrated control.':
  diff<0?'Calibrated transfer performed worse than the uncalibrated control.':
  'No success-rate advantage demonstrated against the uncalibrated control.';
 return {metadata:{name:'MagicPerspective / Global-to-Body Termux experiment',
   method:'supervised body-frame calibration from observed displacements; full map once, then 5x5 local patches',
   trainedV17Brain:false,accelerator:'CPU / Node.js',seed,train,test,size,noise,
   trainSeedBase:SEEDS.train,testSeedBase:SEEDS.test,
   checkpointNote:'Dedicated perspective table; unchanged original V17 model',
   disclosedTeacher:'Training calibration receives true frame ID and global displacement; unseen test does not'},
  learned:training,learningCurve,counts:after.counts,baseline,trained:evidence,improvement:{
   successRatePoints:diff*100,
   successRateGain:diff,
   meanExtraStepsChange:evidence.meanExtraStepsSolved!==null&&baseline.meanExtraStepsSolved!==null
    ?evidence.meanExtraStepsSolved-baseline.meanExtraStepsSolved:null,
   orientationGain:evidence.orientationAccuracy-baseline.orientationAccuracy,
   localizationGain:evidence.localizationAccuracy-baseline.localizationAccuracy},
  verdict:statement,rows:trained.map((r,i)=>({seed:r.seed,before:{solved:base[i].solved,steps:base[i].steps,extra:base[i].extra},
    after:{solved:r.solved,steps:r.steps,extra:r.extra},
    optimal:r.optimal})),replay:trained.slice(0,2),baselineReplay:base.slice(0,2)};
}
