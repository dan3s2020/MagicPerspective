// Real online global-to-egocentric navigation attached to the original V17 Brain.
// The original Discoverer.shape() supplies the first global trajectory.
// After the initial map the policy receives only egocentric 5x5 sensory patches,
// moved/blocked feedback and its OWN initial memory; world pose is evaluator-only.
// The body->world rotation is not taught by hidden frame labels. It is estimated
// from successive local observations matched against the remembered map.
import {makeMaze,seedOf,SEEDS,RNG,ACTIONS,nextCell,bfs} from './labyrinth.mjs';
import {KIND,bodyEffect} from './exercise.mjs';

const wrap=x=>(x%4+4)%4;
const step=(n,p,d)=>{const x=p%n+ACTIONS[wrap(d)][0],y=Math.floor(p/n)+ACTIONS[wrap(d)][1];return x<0||y<0||x>=n||y>=n?-1:y*n+x;};
const dirOf=(dx,dy)=>ACTIONS.findIndex(([x,y])=>x===dx&&y===dy);
const average=a=>a.length?a.reduce((x,y)=>x+y,0)/a.length:null;
const draw=(rng,count)=>rng.int(count);
function frameMap(memory,center,frame,rx,ry){
  const east=ACTIONS[wrap(frame+1)],south=ACTIONS[wrap(frame+2)];
  const x=center%memory.n+rx*east[0]+ry*south[0],y=Math.floor(center/memory.n)+rx*east[1]+ry*south[1];
  return x<0||y<0||x>=memory.n||y>=memory.n?-1:y*memory.n+x;
}
function localPatch(world,pos,frame,radius=2){
  const out=[];for(let y=-radius;y<=radius;y++)for(let x=-radius;x<=radius;x++){
    const j=frameMap(world,pos,frame,x,y);
    out.push(j<0||world.wall[j]?1:0);
  }return out;
}
function mismatch(memory,patch,pos,frame,radius=2){
  let errors=0,k=0;
  for(let y=-radius;y<=radius;y++)for(let x=-radius;x<=radius;x++){
    const j=frameMap(memory,pos,frame,x,y);
    errors+=+(patch[k++]!==(j<0||memory.wall[j]?1:0));
  }return errors;
}
function sensedPlan(discoverer,world,ret){
  const plan=discoverer.shape(ret,world.n,world.start),positions=[world.start];
  if(plan)for(const d of plan){
    const j=step(world.n,positions.at(-1),d);
    if(j<0||world.wall[j]||positions.includes(j))break;
    positions.push(j);
  }
  return {directions:plan?.slice()||[],positions};
}
function memoryFrom(world){
  // The retina is copied only once, before acting. Oracle world.dist is NOT used
  // for policy or localization; the memory builds its own reachability graph.
  return {n:world.n,start:world.start,goal:world.goal,wall:Array.from(world.wall),
    dist:Array.from(bfs(world.n,world.wall,world.goal))};
}
function snapshotBody(model){
  return {votes:model.votes.map(row=>row.slice()),samples:model.samples,episodes:model.episodes,
    solved:model.solved,tracked:model.tracked,correctPose:model.correctPose,correctFrame:model.correctFrame};
}
export class PerspectiveLearner{
  constructor(){
    this.votes=Array.from({length:4},()=>[0,0,0,0]);
    this.samples=0;this.episodes=0;this.solved=0;this.tracked=0;
    this.correctPose=0;this.correctFrame=0;
    this.last=null;this.test=null;this.recent=[];
  }
  rotation(frame){
    const v=this.votes[wrap(frame)],total=v.reduce((a,b)=>a+b,0);
    if(!total)return 0;let max=0;for(let i=1;i<4;i++)if(v[i]>v[max])max=i;
    return max;
  }
  confidence(frame){
    const row=this.votes[wrap(frame)],sum=row.reduce((a,b)=>a+b,0);
    return sum?Math.max(...row)/sum:0;
  }
  globalDir(frame,bodyDir){return wrap(bodyDir+this.rotation(frame));}
  bodyDir(frame,globalDir){return wrap(globalDir-this.rotation(frame));}
  learn(frame,bodyDir,observedWorldDir,weight=1){
    const rotation=wrap(observedWorldDir-bodyDir);
    const row=this.votes[wrap(frame)];
    row[rotation]+=weight;this.samples+=weight;return rotation;
  }
  mappingAccuracy(){
    let right=0;for(let f=0;f<4;f++)right+=+(this.rotation(f)===f);
    return right/4; // evaluator's known transform, never fed to model.
  }
  frozen(){
    const o=new PerspectiveLearner();
    Object.assign(o,snapshotBody(this));o.votes=this.votes.map(row=>row.slice());return o;
  }
  summary(){
    return {episodes:this.episodes,solved:this.solved,samples:this.samples,
      mappingAccuracy:this.mappingAccuracy(),
      poseAccuracy:this.tracked?this.correctPose/this.tracked:null,
      headingAccuracy:this.tracked?this.correctFrame/this.tracked:null,
      votes:this.votes.map(row=>row.slice()),last:this.last,test:this.test,
      recent:this.recent.slice(-50)};
  }
}
function chooseKnownOutput(D,dir){
  for(let o=0;o<8;o++){
    const eff=D.effect(o)||bodyEffect(D.body,o);
    if(eff&&dirOf(eff[0],eff[1])===dir)return o;
  }
  return null;
}
class EgocentricAgent {
  constructor(memory,initialPlan,model){
    this.map=memory;this.plan=initialPlan.positions;this.model=model;
    this.candidates=[];this.lastActionDir=null;this.lastMoved=null;
    this.prev=null;this.best=null;this.confident=false;this.relocalizations=0;
    this.routeUses=0;this.fallbackUses=0;
  }
  observe(patch){
    const map=this.map,possible=[];
    if(!this.candidates.length){
      for(let heading=0;heading<4;heading++)possible.push({pos:map.start,heading,penalty:0});
    }else{
      for(const c of this.candidates){
        const candidates=this.lastMoved
          ?ACTIONS.map((_,i)=>step(map.n,c.pos,i)).filter(p=>p>=0&&!map.wall[p])
          :[c.pos];
        for(const p of candidates)possible.push({
          pos:p,heading:c.heading,penalty:(this.lastMoved&&this.lastActionDir!==null &&
            step(map.n,c.pos,this.model.globalDir(c.heading,this.lastActionDir))!==p ? .35:0)
        });
      }
    }
    let evaluated=possible.map(x=>({...x,errors:mismatch(map,patch,x.pos,x.heading)}));
    if(!evaluated.length||Math.min(...evaluated.map(x=>x.errors))>=6){
      this.relocalizations++;
      // No full physical-world reobservation. Search local patch signatures in
      // the map retained from the FIRST overhead look.
      evaluated=[];
      for(let p=0;p<map.wall.length;p++)if(!map.wall[p])
        for(let h=0;h<4;h++)evaluated.push({pos:p,heading:h,errors:mismatch(map,patch,p,h),penalty:0});
    }
    evaluated.sort((a,b)=>(a.errors+a.penalty)-(b.errors+b.penalty)||a.pos-b.pos||a.heading-b.heading);
    const best=evaluated[0];if(!best)throw Error('No matching state for local patch');
    const runner=evaluated.find(x=>x.pos!==best.pos||x.heading!==best.heading);
    this.confident=best.errors===0&&(!runner||runner.errors>0);
    const candidates=evaluated.filter(x=>x.errors<=best.errors+1).slice(0,12);
    const prior=this.best;
    this.prev=prior;this.best=best;this.candidates=candidates;
    // Learn the mapping from inferred pose change and the action we emitted,
    // NEVER from simulator.truePosition or simulator.hiddenHeading.
    if(this.lastMoved&&prior&&this.lastActionDir!==null&&this.confident){
      const dx=(best.pos%map.n)-(prior.pos%map.n);
      const dy=Math.floor(best.pos/map.n)-Math.floor(prior.pos/map.n);
      const observedDir=dirOf(dx,dy);
      if(observedDir>=0&&best.heading===prior.heading)this.model.learn(best.heading,this.lastActionDir,observedDir);
    }
    return {pos:best.pos,heading:best.heading,errors:best.errors,confidenceGap:runner?runner.errors-best.errors:25,
      unique:this.confident};
  }
  choose(discoverer){
    const m=this.map,pos=this.best.pos;
    // Prefer the persistent initial trajectory predicted ONCE by V17's Discoverer.
    const index=this.plan.indexOf(pos);let wanted=-1,source='initial V17 shape';
    if(index>=0&&index+1<this.plan.length){
      const nx=this.plan[index+1],dx=nx%m.n-pos%m.n,dy=Math.floor(nx/m.n)-Math.floor(pos/m.n);
      wanted=dirOf(dx,dy);
      // An incorrect initial shape must be measured as a fallback, not passed
      // off as a perfect shape. Use only the memorized original overhead map.
      if(nx<0||m.wall[nx]||m.dist[nx]>=m.dist[pos])wanted=-1;
    }
    if(wanted<0){
      source='memory-based repair';
      let best=m.dist[pos];
      for(let dir=0;dir<4;dir++){
        const j=step(m.n,pos,dir);
        if(j>=0&&!m.wall[j]&&m.dist[j]<best){best=m.dist[j];wanted=dir;}
      }
      this.fallbackUses++;
    }else this.routeUses++;
    if(wanted<0)wanted=0;
    const desiredBodyDir=this.model.bodyDir(this.best.heading,wanted);
    let output=chooseKnownOutput(discoverer,desiredBodyDir);
    if(output===null){const possibilities=Array.from({length:8},(_,i)=>i);output=possibilities[discoverer.r.int(8)];source='unknown output / exploration';}
    const effect=discoverer.effect(output)||bodyEffect(discoverer.body,output);
    this.lastActionDir=effect?dirOf(effect[0],effect[1]):null;
    return {output,wanted,desiredBodyDir,estimatedPos:pos,estimatedHeading:this.best.heading,
      confidence:this.confident,source};
  }
  feedback(moved){this.lastMoved=!!moved;}
}
function stats(rows){
  const ok=rows.filter(x=>x.solved);
  return {count:rows.length,solved:ok.length,successRate:rows.length?ok.length/rows.length:0,
    extraStepsSolved:average(ok.map(x=>x.steps-x.optimal)),
    ratioSolved:average(ok.map(x=>x.steps/x.optimal)),
    poseAccuracy:average(rows.map(x=>x.poseAccuracy)),
    headingAccuracy:average(rows.map(x=>x.headingAccuracy)),
    firstShapeAccuracy:average(rows.map(x=>x.firstShapeAccuracy)),
    bumps:average(rows.map(x=>x.bumps)),originalPlanFollowed:average(rows.map(x=>x.originalPlanFollowed)),
    memoryRepairs:average(rows.map(x=>x.memoryRepairs))};
}
export function perspectiveEpisode(world,discoverer,model,{train=false,record=false,live=()=>{},seed=1}={}){
  const overhead=Array.from(world.wall,v=>v?KIND.wall:KIND.floor);
  overhead[world.goal]=KIND.target;overhead[world.start]=KIND.self;
  const plan=sensedPlan(discoverer,world,overhead),mem=memoryFrom(world);
  const nav=new EgocentricAgent(mem,plan,model);
  const rnd=new RNG(seedOf(SEEDS.train,world.start*119+world.goal+seed)),hiddenHeading=rnd.int(4);
  let actual=world.start,steps=0,bumps=0,correctPose=0,correctFrame=0,tracked=0;
  const stepLimit=3*world.dist[world.start]+15;
  const trace=[],physicalPath=[actual];
  if(train)for(const y of overhead)live([1,2,3,4][y]); // single global look, before the first action
  while(actual!==world.goal&&steps<stepLimit){
    const before=actual,sensed=localPatch(world,actual,hiddenHeading);
    if(train)for(const y of sensed)live(y?2:1); // after overhead: LOCAL vision only
    const estimated=nav.observe(sensed);
    tracked++;correctPose+=+(estimated.pos===actual);correctFrame+=+(estimated.heading===hiddenHeading);
    const c=nav.choose(discoverer);
    if(train)live([5,6,7,8,11,12,14,15][c.output]);
    const dir=discoverer.world.moves.indexOf(c.output);
    const global=dir>=0?wrap(dir+hiddenHeading):-1;
    const j=global>=0?nextCell(world,actual,global):-1;
    const moved=j>=0&&!world.wall[j];
    if(moved){actual=j;physicalPath.push(actual);}else bumps++;
    nav.feedback(moved);steps++;
    if(record)trace.push({step:steps,patch:sensed,estimatedPos:estimated.pos,actualBefore:before,
      actualAfter:actual,estimatedHeading:estimated.heading,hiddenHeading,
      unique:estimated.unique,errors:estimated.errors,confidenceGap:estimated.confidenceGap,
      chosenOutput:c.output,wantedDir:c.wanted,desiredBodyDir:c.desiredBodyDir,
      actualDir:global,moved,source:c.source});
  }
  const result={seed:world.seed??seed,n:world.n,solved:actual===world.goal,steps,optimal:world.dist[world.start],
    extra:actual===world.goal?steps-world.dist[world.start]:null,bumps,
    poseAccuracy:tracked?correctPose/tracked:null,headingAccuracy:tracked?correctFrame/tracked:null,
    mapGlances:1,globalObservationsAfterStart:0,bodyObservations:tracked,
    initialShape:plan.directions,initialShapePositions:plan.positions,originalPlanFollowed:nav.routeUses/Math.max(1,steps),
    memoryRepairs:nav.fallbackUses,relocalizations:nav.relocalizations,firstShapeAccuracy:plan.directions.length?
      (()=>{let k=0,p=world.start;for(const d of plan.directions){const q=nextCell(world,p,d);if(q<0||world.wall[q]||world.dist[q]>=world.dist[p])break;p=q;k++;if(p===world.goal)break;}
        return k/Math.max(plan.directions.length,world.dist[world.start]);})():0};
  if(train){
    model.episodes++;model.solved+=+result.solved;model.tracked+=tracked;model.correctPose+=correctPose;model.correctFrame+=correctFrame;
    model.recent.push({solved:result.solved,steps,optimal:result.optimal,poseAccuracy:result.poseAccuracy,
      headingAccuracy:result.headingAccuracy,firstShapeAccuracy:result.firstShapeAccuracy});
    if(model.recent.length>100)model.recent.shift();
  }
  if(record)Object.assign(result,{world:{n:world.n,wall:mem.wall,start:world.start,goal:world.goal},
    physicalPath,trace,hiddenHeading,initialMapRet:overhead});
  return result;
}
export function evaluatePerspective(discoverer,model,{count=20,seed=73}={}){
  count=Math.max(4,Math.min(80,Math.trunc(count)));
  const learned=model.frozen(),identity=new PerspectiveLearner(),rows=[],base=[];
  for(let i=0;i<count;i++){
    // Original test partition. Never use these test states to update the learner.
    const w=makeMaze(seedOf(SEEDS.test,900000+seed*101+i*13),[7,9,11,13][i%4]);
    const s=seed+i*211;
    rows.push(perspectiveEpisode(w,discoverer,learned,{train:false,record:i<2,seed:s}));
    base.push(perspectiveEpisode(w,discoverer,identity,{train:false,record:i<2,seed:s}));
  }
  const a=stats(rows),b=stats(base);
  return {seed,count,learned:a,control:b,improvementPoints:100*(a.successRate-b.successRate),
    replay:rows.slice(0,2),controlReplay:base.slice(0,2),
    explanation:'Frozen V17 first-shape + learned body→map rotation versus the same V17 first-shape with untrained identity mapping. Both see the full map once and local patches thereafter. No teacher heading at test time.'};
}
