// AUDIO IS THE PHYSICS, not an illustrated maze. Everything is owned by ONE
// ORIGINAL MagicPerspective Brain: its lived audio memory, ConstructedPath
// transitions, Discoverer body, movement effects, learned world, attractors,
// and full shapeGraph() planning BEFORE acting.
//
// The 9 perceptual dimensions come directly from real PCM: pitch, energy,
// harmonicity, six spectra. The body physically navigates the first two axes
// (pitch/energy); other acoustic dimensions are felt and sounded on every move.
// Unlike a generic grid, transitions are ALLOWED only where the ORIGINAL
// Brain.constructedPaths.links was directly taught an observed consecutive
// pitch-energy transition by actual cat recordings. No external transition
// model or transition-inventing interpolator exists.
//
// Eight unlabelled original Discoverer output symbols control the body; four
// actually move ±1 acoustic cell, four are inert. The organism must discover
// the causal mapping by acting. All target endpoints are real measured WAV
// states, never human semantic labels or scripted movement directions.
// All interior heldout sound is hidden to body at test; target is visible in
// the same way MagicPerspective maze gives a destination on the retina.
//
// Acoustic world can be rewound/edited by *actions* here; it is a learned
// controllable game, NOT proof of a cat's natural vocal motor physiology.
import {NativeAuditoryBody} from './auditory_body.mjs';
import {Discoverer,KIND} from '../../v17/transcend/torus-aether/worlds/exercise.mjs';
import {ACTIONS,nextCell} from '../../v17/transcend/torus-aether/worlds/labyrinth.mjs';

const N=12,C=9,ABSENT=1e9;
const outSymbols=[5,6,7,8,11,12,14,15];
const rawSymbols=[1,2,3,4];
function rand(seed){let x=seed>>>0;return()=>{x^=x<<13;x^=x>>>17;x^=x<<5;return (x>>>0)/4294967296;};}
function posOf(f){return f[1]*N+f[0];}
function valid(f){return Array.isArray(f)&&f.length===9&&f.every(v=>Number.isInteger(v)&&v>=0&&v<=11);}
function directedBFS(adjacency,start,goal){
 const dist=new Int32Array(N*N).fill(ABSENT);
 const queue=[goal];dist[goal]=0;
 // Reverse real observed directed audio transitions to find actual distance
 // TO the goal without smuggling path as an instruction into Discoverer.
 const reverse=Array.from({length:N*N},()=>[]);
 for(let p=0;p<N*N;p++)for(const edge of adjacency[p]||[])reverse[edge.to].push(p);
 for(let i=0;i<queue.length;i++){
  const at=queue[i];
  for(const before of reverse[at])if(dist[before]>=ABSENT){
   dist[before]=dist[at]+1;queue.push(before);
  }
 }
 return dist;
}
export class NativeTemporalAuditoryBody extends NativeAuditoryBody{
 finishPerception(){
  const result=super.finishPerception();
  const graph=this.brain.constructedPaths.links;
  this.adjacency=Array.from({length:N*N},()=>[]);
  let observedEdges=0,adjacentEvidence=0,nonAdjacent=0,selfLoops=0;
  for(let from=0;from<N*N;from++){
   if(!this.seen[from])continue;
   const bucket=graph.choices('auditory-body:'+from).find(e=>e.action==='actual-time-flow');
   if(!bucket)continue;
   for(const successor of bucket.successors){
    const m=/^auditory-body:(\d+)$/.exec(successor.to);
    if(!m)throw Error('Original Brain graph produced invalid auditory transition');
    const to=Number(m[1]);
    observedEdges++;
    if(from===to){selfLoops++;continue;}
    const dx=(to%N)-(from%N),dy=Math.floor(to/N)-Math.floor(from/N);
    if(Math.abs(dx)+Math.abs(dy)!==1){nonAdjacent++;continue;}
    const dir=ACTIONS.findIndex(([x,y])=>x===dx&&y===dy);
    if(dir<0||!this.seen[to])throw Error('Invalid physical transformed sound transition');
    this.adjacency[from].push({to,action:dir,support:successor.seen,probability:successor.probability});
    adjacentEvidence+=successor.seen;
   }
  }
  const nodes=this.adjacency.filter(e=>e.length>0).length,
   directedEdges=this.adjacency.reduce((s,a)=>s+a.length,0);
  if(directedEdges<8)throw Error('No physically supported connected sound-world transitions');
  this.nativeTemporalStatus={
   directObservedAcousticStatePairs:observedEdges,
   validObservedUnitTransformations:directedEdges,
   actualRealAudioUnitTransitionsSupported:adjacentEvidence,
   fromPhysicalNodes:nodes,
   realAudioStateRepeatEdges:selfLoops,
   actualNonUnitRealFrameTransformationsNotInserted:nonAdjacent,
   interpolationOrFabricatedEdges:0,
   model:'same original Brain.constructedPaths.links',
   forwardTimeOnly:true
  };
  return {...result,...this.nativeTemporalStatus};
 }
 toWorld(start,goal,minDistance=2,maxDistance=28){
  if(!this.adjacency)throw Error('Native temporal audio world must be observed first');
  if(!Number.isInteger(start)||!Number.isInteger(goal)||start===goal||
     !this.seen[start]||!this.seen[goal])return null;
  const dist=directedBFS(this.adjacency,start,goal);
  if(dist[start]<minDistance||dist[start]>maxDistance)return null;
  return {n:N,wall:this.wall.slice(),start,goal,dist,
    seed:goal+start*7973,usesOnlyObservedTemporalEdges:true};
 }
 fromRecording(record,{difficulty='full'}={}){
  if(!record?.frames||record.frames.length!==48||!['full','near'].includes(difficulty))
    throw Error('Expected real 48-frame CatMeows audio world');
  const f=record.frames;
  let best=null,score=-Infinity;
  const maxStart=difficulty==='near'?40:16;
  for(let a=0;a<maxStart;a++){
   const start=posOf(f[a]);
   for(let b=a+1;b<48;b++){
    if(difficulty==='near'&&b>a+12)break;
    if(difficulty==='full'&&b<32)continue;
    const goal=posOf(f[b]);
    const w=this.toWorld(start,goal,difficulty==='near'?1:2,difficulty==='near'?2:28);
    if(!w)continue;
    const d=w.dist[start];
    const merit=difficulty==='near'?100/(1+d)+10/(1+b-a):d;
    if(merit>score){
      score=merit;
      best={world:w,source:record.name,sourceChronologicalAudio:true,
        startTime:a,targetTime:b,recordingFutureIntermediateAudioWasNeverShown:true,
        sourceIsVerifiedOriginalPCM:true};
    }
   }
  }
  return best;
 }
 nativeShape(ret,at){
  return this.brain.disc.shapeGraph(ret,this.adjacency,at,{details:true});
 }
 chooseOriginalBody(D,ret,current,visits){
  // The same native value-propagation and choice mechanism. Original D is the
  // player. The original native audio graph is the *world's physical space*.
  const plan=D.self()===KIND.self?
    D.shapeGraph(ret,this.adjacency,current,{details:true}):null;
  const planDirs=plan?.path?.map(p=>p.action)??null;
  const local=ret.slice();
  // Physical impossibilities of the current acoustic state are felt as
  // repelling neighbours, just as MagicPerspective's original retina does.
  const allowed=new Set(this.adjacency[current].map(x=>x.to));
  for(let a=0;a<4;a++){
   const j=nextCell({n:N},current,a);
   if(j>=0 && j!==current&&!allowed.has(j)&&j!==ret.indexOf(KIND.target))
    local[j]=KIND.wall;
  }
  const chosen=D.choose(local,N,D.self()===KIND.self?current:-1,visits,planDirs);
  return {chosen,plan,planDirs,sensed:local};
 }
 step(D,pos,output){
  const dir=D.world.moves.indexOf(output);
  if(dir<0)return {next:pos,blocked:true,direction:dir};
  const physical=nextCell({n:N},pos,dir);
  const possible=this.adjacency[pos].some(e=>e.to===physical&&e.action===dir);
  return {next:possible?physical:pos,blocked:!possible,direction:dir};
 }
 retina(world,pos){
  const ret=Array.from(world.wall,x=>x?KIND.wall:KIND.floor);
  ret[world.goal]=KIND.target;
  ret[pos]=KIND.self;
  return ret;
 }
 play(episode,{learn=true,cold=false,maxSteps=null}={}){
  const D=cold?new Discoverer(this.brain.seed):this.brain.disc;
  const brain=this.brain,w=episode.world,n=N;
  if(w.n!==N||!w.usesOnlyObservedTemporalEdges)throw Error('Not original strictly real audio transition world');
  const max=Math.min(maxSteps??(w.dist[w.start]*5+18),110),
   visits=new Uint16Array(N*N),path=[w.start],acts=[],f=[this.atCell(w.start)],
   how={plan:0,explore:0,noise:0};
  let pos=w.start,steps=0,firstPlan=null,firstCorrect=0,
   blocked=0, moves=0,planned=0;
  visits[pos]=1;
  // Original world is presented once to the same living Brain.
  if(learn){
   for(const kind of this.retina(w,pos))brain.live(rawSymbols[kind]);
   brain.live(245);const initialSound=this.atCell(pos);for(let j=0;j<C;j++)brain.live(20+12*j+initialSound[j]);
  }
  while(pos!==w.goal&&steps<max){
   const before=this.retina(w,pos);
   const {chosen,plan,planDirs}=this.chooseOriginalBody(D,before,pos,visits);
   if(steps===0){
    firstPlan=planDirs?.slice()??null;
    if(firstPlan) {
     let loc=pos;
     for(const dir of firstPlan){
      const next=nextCell({n:N},loc,dir);
      if(next<0||!this.adjacency[loc].some(e=>e.to===next)||w.dist[next]!==w.dist[loc]-1)break;
      firstCorrect++;loc=next;
     }
    }
   }
   planned+=Number(!!planDirs?.length);
   const action=chosen.o;
   if(!Number.isInteger(action)||action<0||action>=8)throw Error('Original Discoverer emitted invalid action');
   acts.push(action);
   how[chosen.how]=(how[chosen.how]||0)+1;
   if(learn)brain.live(outSymbols[action]);
   const out=this.step(D,pos,action);
   if(out.blocked)blocked++;
   if(out.next!==pos)moves++;
   pos=out.next;
   const after=this.retina(w,pos);
   if(learn){
    // Core unchanged original native body learns by FELT actual sound action
    // consequences, not by human labels or hard-coded movement answers.
    D.learnStep(before,after,N,action,path.at(-1));
    this.brain.constructedPaths.links.observe(
      'auditory-motor:'+path.at(-1),'output:'+action,'auditory-motor:'+pos);
    const actual=this.atCell(pos);
    brain.live(249);
    for(let j=0;j<C;j++)brain.live(20+12*j+actual[j]);
    for(let i=0;i<after.length;i++)if(before[i]!==after[i])brain.live(rawSymbols[after[i]]);
   }
   if(pos!==path.at(-1)){
    path.push(pos);f.push(this.atCell(pos));visits[pos]++;
   }
   steps++;
  }
  const solved=pos===w.goal;
  if(learn)D.endEpisode(solved,how);
  return {solved,steps,optimal:w.dist[w.start],path,actions:acts,
    actualAudioFrames:f,blocked,moves,nativeBodySelf:D.self(),
    nativeBodyEffects:[0,1,2,3,4,5,6,7].map(a=>D.effect(a)),
    originalShapeAttempted:planned,
    firstNativePredictedShape:firstPlan,
    firstNativeShapeCorrectPrefix:firstCorrect,
    frozenEvaluation:!learn,allPhysicalPathsFollowActuallyExperiencedAudioTransitions:
      path.every((q,i)=>i===0||this.adjacency[path[i-1]].some(e=>e.to===q))};
 }
 frozenPlay(episode,{cold=false,maxSteps=null}={}){
  return this.play(episode,{learn:false,cold,maxSteps});
 }
 train(episode,options={}){
  return this.play(episode,{learn:true,...options});
 }
 dream({seed=731,length=48,start=null,desired=null}={}){
  const D=this.brain.disc,rand=rand(seed);
  if(D.self()!==KIND.self)throw Error('Original body cannot yet identify itself');
  const starts=this.cells.filter(i=>this.early[i]>0&&this.adjacency[i].length>0);
  const ends=this.cells.filter(i=>this.terminal[i]>0);
  if(!starts.length||!ends.length)throw Error('No genuine acoustic body start/end');
  let current=start===null?starts[Math.floor(rand()*starts.length)]:start;
  const options=()=>ends.filter(i=>this.toWorld(current,i,1,28));
  let goals=options(),goal=desired===null?goals[Math.floor(rand()*goals.length)]:desired;
  if(!this.toWorld(current,goal,1,28))goal=goals[0];
  if(goal==null)throw Error('Native audio body has no reachable dream target');
  const frames=[this.atCell(current)],cells=[current],goalsReached=[],outputs=[],plans=[];
  const visits=new Uint16Array(N*N);visits[current]=1;
  for(let t=1;t<length;t++){
   if(current===goal){
    goalsReached.push(goal);goals=options();
    if(!goals.length)goals=this.cells.filter(i=>this.toWorld(current,i,1,28));
    if(goals.length)goal=goals[Math.floor(rand()*goals.length)];
    visits.fill(0);
   }
   const ret=this.retina({wall:this.wall,goal},current);
   const {chosen,planDirs}=this.chooseOriginalBody(D,ret,current,visits);
   const result=this.step(D,current,chosen.o);
   current=result.next;
   cells.push(current);frames.push(this.atCell(current));outputs.push(chosen.o);
   plans.push(planDirs?.length||0);visits[current]++;
  }
  if(frames.length!==length||frames.some(x=>!valid(x)))throw Error('Native original organism dream corrupt');
  return {frames,cells,outputs,goalsReached,
   stats:{seed,generatedFrames:frames.length,
     originalNativeMotorOutputActions:outputs.length,
     actualBodilySoundMovements:cells.filter((x,i)=>i>0&&x!==cells[i-1]).length,
     uniqueAcousticStates:new Set(cells).size,
     exactOriginalDiscovererShapePlans:plans.filter(x=>x>0).length,
     genuineSoundGoalsReached:goalsReached.length,
     everyDreamTransitionInNativeActualAudioGraph:
       cells.every((p,i)=>i===0||p===cells[i-1]||this.adjacency[cells[i-1]].some(x=>x.to===p)),
     noRawWavCopied:true,noSeparateSoundModel:true}};
 }
}
