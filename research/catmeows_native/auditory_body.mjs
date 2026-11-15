// ORIGINAL BRAIVOUR / MAGIC PERSPECTIVE AUDITORY BODY.
// No new classifier, no separate sound-trajectory model and no hand-scripted
// future audio. This bodily world is built ENTIRELY from lived real WAV acoustic
// frames. The ORIGINAL Brain owns the body and the ORIGINAL Discoverer learns
// actions using playExercise, learnStep, effect, shape, choose, endEpisode.
//
// The environment has no knowledge of linguistic meaning. Its physical axes
// are perceived fundamental frequency (pitch) and loudness, in 12x12 bins.
// Cells are traversable only when genuinely experienced from training audio.
// The other 7 original waveform features are retained in the BODY's own
// acoustic memories and rendered from its experienced physical locations.
//
// An action symbol has NO built-in meaning for Discoverer: four of its eight
// outputs cause sound-space displacement according to the original shuffled
// world physics. It must discover what these output symbols DO by acting.
// The 4 other outputs are inert, same as original maze organism.
//
// The sound-world evaluation shows (start state, wanted END acoustic state)
// as the maze shows its target. Future intervening frames are NOT shown.
// This is target-conditioned acoustic embodiment, not spontaneous cat semantics.
import {KIND, playExercise, Discoverer} from "../../v17/transcend/torus-aether/worlds/exercise.mjs";
import {ACTIONS, nextCell, bfs} from "../../v17/transcend/torus-aether/worlds/labyrinth.mjs";

const N=12,C=9;
const TOKENS=[1,2,3,4], OUTPUTS=[5,6,7,8,11,12,14,15];
const ABSENT=1e9;
const frameValid=f=>Array.isArray(f)&&f.length===C&&f.every(x=>Number.isInteger(x)&&x>=0&&x<=11);
function audioCell(frame){return frame[1]*N+frame[0];}
function roundClamped(x){return Math.min(11,Math.max(0,Math.round(x)));}
function rng(seed){let x=seed>>>0;return()=>{x^=x<<13;x^=x>>>17;x^=x<<5;return (x>>>0)/4294967296;};}
function audioReadout(ret,body,pos){
 // From this body's own acoustic memory, not WAV samples introduced at test.
 const base=body.atCell(pos);
 if(!base)throw Error("Attempted to hear unsupported acoustic body cell");
 return base;
}
export class NativeAuditoryBody {
 constructor(brain){
  if(!brain?.disc?.learnStep || !brain?.disc?.shape || !brain?.disc?.choose ||
     !brain?.constructedPaths?.links?.observe)
    throw Error("Auditory world requires the ACTUAL ORIGINAL Braivour Brain/Discoverer");
  this.brain=brain;
  this.n=N;
  this.seen=new Uint32Array(N*N);
  this.sum=Array.from({length:N*N},()=>new Float64Array(C));
  this.terminal=new Uint32Array(N*N);
  this.early=new Uint32Array(N*N);
  this.wall=null;
  this.cells=[];
  this.transitionCount=0;
  this.recordingsLived=0;
  this.firstAuditoryMoves=[];
  brain.auditoryBody=this;
 }
 absorb(record){
  // Only real audio prepared from checksum-verified original PCM is accepted.
  if(!Array.isArray(record.frames)||record.frames.length!==48||
     record.frames.some(x=>!frameValid(x)))throw Error("This is not a verified 48x9 real acoustic perception");
  const brain=this.brain;
  brain.live(245);
  let earlier=null;
  for(let t=0;t<48;t++){
   const f=record.frames[t],cell=audioCell(f);
   this.seen[cell]++;
   for(let j=0;j<C;j++)this.sum[cell][j]+=f[j];
   if(t<5)this.early[cell]++;
   if(t>=43)this.terminal[cell]++;
   brain.live(246);
   for(let j=0;j<C;j++)brain.live(20+j*12+f[j]);
   brain.live(247);
   if(earlier!==null){
    const prev="auditory-body:"+earlier,now="auditory-body:"+cell;
    brain.constructedPaths.links.observe(prev,"actual-time-flow",now);
    this.transitionCount++;
   }
   earlier=cell;
  }
  brain.live(248);
  this.recordingsLived++;
 }
 finishPerception(){
  if(this.recordingsLived<20)throw Error("Insufficient real WAV observations");
  this.wall=Uint8Array.from(this.seen,x=>x===0?1:0);
  this.cells=Array.from({length:N*N},(_,i)=>i).filter(i=>!this.wall[i]);
  if(this.cells.length<12)throw Error("Actual auditory data too sparse for 2D body world");
  this.components=[];
  const unvisited=new Set(this.cells);
  while(unvisited.size){
   const start=unvisited.values().next().value,queue=[start],component=[];
   unvisited.delete(start);
   for(let qi=0;qi<queue.length;qi++){
    const p=queue[qi];component.push(p);
    for(let direction=0;direction<4;direction++){
     const q=nextCell({n:N},p,direction);
     if(q>=0&&unvisited.has(q)){unvisited.delete(q);queue.push(q);}
    }
   }
   this.components.push(component);
  }
  this.components.sort((a,b)=>b.length-a.length);
  this.majorComponent=new Set(this.components[0]);
  return {experiencedCells:this.cells.length,largestConnectedAudioStateWorld:this.majorComponent.size,
    allPhysicalComponents:this.components.map(x=>x.length),genuineWAVs:this.recordingsLived,
    genuineTemporallyObservedAudioTransitions:this.transitionCount};
 }
 atCell(pos){
  if(!Number.isInteger(pos)||pos<0||pos>=N*N||!this.seen[pos])return null;
  const n=this.seen[pos],m=Array.from(this.sum[pos],x=>roundClamped(x/n));
  m[0]=pos%N;m[1]=Math.floor(pos/N);
  return m;
 }
 toWorld(start,goal){
  if(!this.wall)throw Error("Original auditory body must live first");
  if(!this.majorComponent.has(start)||!this.majorComponent.has(goal)||start===goal)return null;
  const wall=this.wall.slice(),dist=bfs(N,wall,goal),d=dist[start];
  if(d<2||d>18||d>=ABSENT)return null;
  return {n:N,wall,start,goal,dist,seed:start*1009+goal};
 }
 fromRecording(record){
  if(!record.frames||record.frames.length!==48)throw Error("No genuine auditory frame sequence");
  const f=record.frames;
  let best=null,score=-1;
  // Desired final acoustic state is supplied to the sound-game as a goal,
  // exactly as MagicPerspective maze displays the goal. No intermediate
  // future waveform is exposed to Brain during heldout evaluation.
  for(let a=0;a<12;a++)for(let b=30;b<48;b+=2){
   if(!frameValid(f[a])||!frameValid(f[b]))continue;
   const start=audioCell(f[a]),end=audioCell(f[b]);
   const w=this.toWorld(start,end);if(!w)continue;
   if(w.dist[w.start]>score){score=w.dist[w.start];best={world:w,
     source:record.name,startTime:a,targetTime:b,
     physicallyObservedGoalInUnseenCall:true};}
  }
  return best;
 }
 train(episode,{record=false}={}){
  const brain=this.brain,w=episode.world;
  const previousWorld=brain.liveWorld;
  brain.liveWorld="auditory";
  const samples=[];
  try{
   const result=playExercise(w,brain.disc,y=>brain.live(y),{
    record,
    onTransition:({before,after,action,n})=>{
     const at=before.indexOf(KIND.self),next=after.indexOf(KIND.self);
     if(at<0||next<0)throw Error("Original Discoverer lost its auditory self");
     // Native Brain physically experiences action + resulting full sound body.
     const observedFrame=audioReadout(after,this,next);
     brain.live(249);
     observedFrame.forEach((v,j)=>brain.live(20+12*j+v));
     // SAME Brain's original transition graph also records motor consequences.
     brain.constructedPaths.links.observe("auditory-body:"+at,
       "native-output:"+action,"auditory-body:"+next);
     samples.push({from:at,to:next,out:action,frame:observedFrame});
    }
   });
   return {...result,heardNativeAuditorySteps:samples.length,
     experiencedGeneratedAudioTransitions:samples.filter(s=>s.from!==s.to).length};
  }finally{brain.liveWorld=previousWorld;}
 }
 // The ORIGINAL body's frozen action-selection and shape operator is exercised
 // without any learning or donation of heldout future acoustic states.
 frozenPlay(episode,{cold=false,maxSteps=null}={}){
  const D=cold?new Discoverer(this.brain.seed):this.brain.disc;
  const w=episode.world,n=w.n,ret=Array.from(w.wall,v=>v?KIND.wall:KIND.floor);
  let pos=w.start;ret[w.goal]=KIND.target;ret[pos]=KIND.self;
  const visits=new Uint16Array(n*n),path=[pos],actions=[],heard=[this.atCell(pos)];
  visits[pos]=1;let steps=0,planned=0,attempts=0,bumps=0,correctPlanFirst=0;
  const lim=Math.min(maxSteps??(3*w.dist[pos]+15),85);
  const knowsAtFirst=D.self()===KIND.self;
  let firstPlan=null,firstShapeGood=0;
  while(pos!==w.goal&&steps<lim){
   const me=D.self()===KIND.self?pos:-1;
   const shape=me>=0?D.shape(ret,n,me):null;
   if(steps===0){
    firstPlan=shape?shape.slice():null;
    if(shape?.length){
     let p=pos;
     for(const a of shape){
      const next=nextCell(w,p,a);
      if(next<0||w.wall[next]||w.dist[next]!==w.dist[p]-1)break;
      firstShapeGood++;p=next;
     }
    }
   }
   if(shape?.length)planned++;
   const choice=D.choose(ret,n,me,visits,shape);
   actions.push(choice.o);
   const before=pos,dir=D.world.moves.indexOf(choice.o);
   if(dir>=0){
    const next=nextCell(w,pos,dir);
    if(next>=0&&!w.wall[next]){
     ret[pos]=KIND.floor;pos=next;ret[pos]=KIND.self;visits[pos]++;path.push(pos);
     heard.push(this.atCell(pos));
    }else bumps++;
   }else bumps++;
   if(pos!==before)attempts++;
   steps++;
  }
  return {solved:pos===w.goal,steps,optimal:w.dist[w.start],path,actions,
    heard,pathFromRealExperienceOnly:path.every(i=>this.seen[i]>0),
    nativeShapeWasAvailable:firstPlan!==null,
    originalShapeFirstLength:firstPlan?.length??0,
    originalShapeFirstCorrectPrefix:firstShapeGood,
    originalBodyHadLearnedSelf:knowsAtFirst,
    originalNativeMotorMovements:attempts,
    firstAction:actions[0]??null,plannedSteps:planned,bumps,
    rightGoalWAVNotShown:true,learnedDuringEvaluation:false,
    usesOriginalDiscoverer:true};
 }
 dream({seed=981,length=48,start=null,desired=null}={}){
  const random=rng(seed),D=this.brain.disc;
  if(D.self()!==KIND.self)throw Error("Native body did not discover which symbol is itself");
  const starts=this.cells.filter(i=>this.early[i]>0&&this.majorComponent.has(i));
  const goals=this.cells.filter(i=>this.terminal[i]>0&&this.majorComponent.has(i));
  if(!starts.length||!goals.length)throw Error("No physically observed start/terminal states");
  let current=start===null?starts[Math.floor(random()*starts.length)]:start;
  if(!this.majorComponent.has(current))throw Error("Dream start never seen in the body's real acoustic world");
  let goal=desired===null?goals[Math.floor(random()*goals.length)]:desired;
  if(goal===current||!this.toWorld(current,goal)){
   goal=goals.find(x=>this.toWorld(current,x))??null;
  }
  if(goal===null)throw Error("Audio bodily world cannot dream a reachable goal");
  const heard=[this.atCell(current)],cells=[current],actions=[],plans=[],goalsVisited=[],requestedGoals=[];
  const wall=this.wall,n=N,visits=new Uint16Array(n*n);
  visits[current]=1;
  for(let t=1;t<length;t++){
   if(current===goal){
    goalsVisited.push(goal);
    let possible=goals.filter(g=>this.toWorld(current,g));
    if(possible.length===0)possible=this.cells.filter(g=>this.toWorld(current,g));
    if(possible.length>0){goal=possible[Math.floor(random()*possible.length)];visits.fill(0);}
   }
   requestedGoals.push(goal);
   const ret=Array.from(wall,v=>v?KIND.wall:KIND.floor);
   ret[goal]=KIND.target;ret[current]=KIND.self;
   const plan=D.shape(ret,n,current),choice=D.choose(ret,n,current,visits,plan),direction=D.world.moves.indexOf(choice.o);
   const next=direction<0?-1:nextCell({n},current,direction);
   if(next>=0&&!wall[next])current=next;
   cells.push(current);heard.push(this.atCell(current));actions.push(choice.o);
   plans.push(plan?.length||0);visits[current]++;
  }
  if(heard.length!==length||heard.some(f=>!frameValid(f)))throw Error("Failed original body's autonomous acoustic dream");
  return {frames:heard,cells,actions,requestedGoals,goalsVisited,
     stats:{seed,generatedFrames:heard.length,
       nativeMotorActions:actions.length,
       physicalMovementCount:cells.filter((c,i)=>i>0&&c!==cells[i-1]).length,
       distinctOriginalAuditoryWorldStates:new Set(cells).size,
       learnedBodyTargetsReached:goalsVisited.length,
       originalDiscovererPlansOffered:plans.filter(x=>x>0).length,
       nativeActionsFromOriginalBody:true,
       physicalSoundFramesFromLivedNativeBrainBody:true}};
 }
 audit(){
  const physical=this.finishPerception();
  return {...physical,knownOriginalBody:this.brain.disc.self(),
    originalNativeOutputEffects:[0,1,2,3,4,5,6,7].map(a=>this.brain.disc.effect(a)),
    originalBodyLearnedPass:[0,1,2,3].map(k=>this.brain.disc.conduct(k)),
    originalBodyLearnedAttract:[0,1,2,3].map(k=>this.brain.disc.attract(k))};
 }
}
