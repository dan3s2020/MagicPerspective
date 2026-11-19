// Executable native SHA-256 experiment — SAME real V42 Brain, not ShapeNet, not a substitute.
// The MagicPerspective source is checked out at pinned commit ac205b5bc561274b957584a7dee058a1110ab6f8.
// Training sees 64 complete 8×32-bit round states per known preimage.
// Frozen blind inference sees ONLY a new full SHA-256 hash and a prompt boundary;
// preimage is used exclusively by the evaluator for exact SHA-256 verification.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {Brain} from '../../v17/transcend/torus-aether/devour/brain.mjs';
import {KIND} from '../../v17/transcend/torus-aether/worlds/exercise.mjs';

const IV=[0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19];
const K=[0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2];
const rot=(x,n)=>(x>>>n)|(x<<(32-n));
const s0=x=>rot(x,7)^rot(x,18)^(x>>>3),s1=x=>rot(x,17)^rot(x,19)^(x>>>10);
const S0=x=>rot(x,2)^rot(x,13)^rot(x,22),S1=x=>rot(x,6)^rot(x,11)^rot(x,25);
const ch=(x,y,z)=>(x&y)^(~x&z),maj=(x,y,z)=>(x&y)^(x&z)^(y&z);
const h32=x=>(x>>>0).toString(16).padStart(8,'0');
const hash=b=>createHash('sha256').update(b).digest('hex');
const TRAIN_COUNT=Number(process.env.NATIVE_SHA_TRAIN||8);
const BLIND_COUNT=Number(process.env.NATIVE_SHA_BLIND||32);
assert(Number.isInteger(TRAIN_COUNT)&&TRAIN_COUNT>=2&&TRAIN_COUNT<=40);
assert(Number.isInteger(BLIND_COUNT)&&BLIND_COUNT>=4&&BLIND_COUNT<=200);
function world(byte) {
  const msg=Buffer.from([byte]);const block=Buffer.alloc(64);
  msg.copy(block);block[1]=0x80;block.writeUInt32BE(8,60);
  const w=new Uint32Array(64);
  for(let t=0;t<16;t++)w[t]=block.readUInt32BE(t*4);
  for(let t=16;t<64;t++)w[t]=(w[t-16]+s0(w[t-15])+w[t-7]+s1(w[t-2]))>>>0;
  const states=[IV.slice()];
  for(let t=0;t<64;t++){
    const [a,b,c,d,e,f,g,hh]=states.at(-1);
    const t1=(hh+S1(e)+ch(e,f,g)+K[t]+w[t])>>>0;
    const t2=(S0(a)+maj(a,b,c))>>>0;
    states.push([(t1+t2)>>>0,a,b,c,(d+t1)>>>0,e,f,g]);
  }
  const digest=states.at(-1).map((x,i)=>h32((x+IV[i])>>>0)).join('');
  assert.equal(digest,hash(msg),'full SHA-256 cross-check');
  return {byte,msgHex:msg.toString('hex'),digest,states};
}
const N=TRAIN_COUNT+BLIND_COUNT;
const values=Array.from({length:256},(_,i)=>(i*73+19)&255);
const training=values.slice(0,TRAIN_COUNT).map(world);
const heldout=values.slice(TRAIN_COUNT,N).map(world);
assert.equal(new Set(training.map(w=>w.msgHex).concat(heldout.map(w=>w.msgHex))).size,N);

// This is the EXACT pinned V42 Brain: its own EmergentChain/AligningGraph learns through Brain.live.
const contextCap=Number(process.env.NATIVE_SHA_CTX||4);
assert(Number.isInteger(contextCap)&&contextCap>=4&&contextCap<=32);
const brain=new Brain({rules:{depth:2},c:{cap:contextCap},seed:43});
const D=brain.disc;
let livedChars=0,physicalEdges=0,knownPathSolved=0;
const neighbors=[[]],starts=[],termini=[];
function liveText(s){for(let i=0;i<s.length;i++){brain.live(s.charCodeAt(i));livedChars++;}}
console.log('NATIVE_SHA_BEGIN '+JSON.stringify({train:TRAIN_COUNT,blind:BLIND_COUNT,engine:'pinned MagicPerspective native V42 Brain',shaRounds:64}));
const N9=9,ACTS=[[0,-1],[1,0],[0,1],[-1,0]],RAW_SYMS=[1,2,3,4],RAW_OUTS=[5,6,7,8,11,12,14,15];
let realMotorSteps=0;
function snake(){
 const out=[];for(let y=0;y<N9&&out.length<65;y++)for(let j=0;j<N9&&out.length<65;j++)out.push(y*N9+(y%2?N9-1-j:j));
 return out;
}
function motorDir(a,b){
 const dx=b%N9-a%N9,dy=Math.floor(b/N9)-Math.floor(a/N9);
 const k=ACTS.findIndex(v=>v[0]===dx&&v[1]===dy);
 assert(k>=0);return k;
}
function state64RoundSensory(s){
 const buf=Buffer.alloc(32);
 for(let j=0;j<8;j++)buf.writeUInt32BE(s[j]>>>0,j*4);
 const base64=buf.toString('base64');
 assert(Buffer.from(base64,'base64').equals(buf));return base64;
}
for(const [index,w] of training.entries()){
 // 9x9 physical serpentine representation of 65 real SHA-256 round states.
 const path=snake(),ret=new Array(N9*N9).fill(KIND.wall);
 for(const square of path)ret[square]=KIND.floor;
 ret[path[64]]=KIND.target;ret[path[0]]=KIND.self;
 for(const kind of ret)brain.live(RAW_SYMS[kind]);
 const start=neighbors.length;starts.push(start);neighbors.push([]);
 let pos=start;
 liveText('B:'+w.msgHex+'\n');
 for(let t=0;t<64;t++){
  const before=ret.slice(),from=path[t],to=path[t+1];
  // Training puppet demonstrates valid actions; NO oracle mapping at inference.
  const motor=D.world.moves[motorDir(from,to)];
  ret[from]=KIND.floor;ret[to]=KIND.self;
  brain.live(RAW_OUTS[motor]);
  D.learnStep(before,ret,N9,motor,from);
  for(let k=0;k<ret.length;k++)if(before[k]!==ret[k])brain.live(RAW_SYMS[ret[k]]);
  liveText('R'+t.toString(16).padStart(2,'0')+state64RoundSensory(w.states[t+1])+'\n');
  const next=neighbors.length;neighbors.push([]);
  neighbors[pos].push({to:next,action:motor});
  pos=next;physicalEdges++;realMotorSteps++;
 }
 termini.push(pos);
 // The ORIGINAL Discoverer determines lastEntered and target attraction from
 // its own learned physical observations, not counters assigned by the harness.
 D.endEpisode(true,{plan:0,explore:64});
 liveText('H:'+w.digest+'\nM:'+w.msgHex+'\n');
 const kinds=new Array(neighbors.length).fill(KIND.floor);
 kinds[start]=KIND.self;kinds[pos]=KIND.target;
 const plan=D.shapeGraph(kinds,neighbors,start,{details:true});
 if(plan?.targetReached && plan.path.length===64)knownPathSolved++;
 console.log('NATIVE_SHA_TRAIN '+JSON.stringify({index:index+1,
  originalSelf:D.self(),originalTargetAttraction:D.attract(KIND.target),
  originalMotorEffects:RAW_OUTS.map((_,o)=>D.effect(o)).filter(Boolean).length,
  brainLived:brain.lived,shaRounds:64}));
}
const trainedLived=brain.lived;
const hex='0123456789abcdef', argmax=(p)=>{let best=hex[0],val=-Infinity;for(const c of hex){const x=p[c.charCodeAt(0)]??-Infinity;if(x>val){val=x;best=c;}}return best;};
function nativeGuess(digest){
  const s='H:'+digest+'\nM:';const prior=Array.from(s,x=>x.charCodeAt(0));
  let guess='';
  for(let i=0;i<2;i++){const logits=brain.predict(prior);const c=argmax(logits);prior.push(c.charCodeAt(0));guess+=c;}
  return guess;
}
// Recall of KNOWN teacher examples is not blind inversion; it tests whether
// native predictions can even use the hash-to-message relation it experienced.
const seenExamples=training.map(w=>{
 const candidate=nativeGuess(w.digest);
 return {digest:w.digest,candidate,exact:hash(Buffer.from(candidate,'hex'))===w.digest};
});
const seenRecall=seenExamples.filter(x=>x.exact).length;
const seenPredictionVariety=new Set(seenExamples.map(x=>x.candidate)).size;
const blindGoalResults=[];let successes=0,randomSuccesses=0;
const observed=training.map(w=>w.digest);const knownSet=new Set(observed);
for(let i=0;i<heldout.length;i++){
  const w=heldout[i];
  // The SHA-256 digest reveals the final compression state of this 1-block world.
  // It does NOT reveal W[t] or any missing directed edge into that state.
  const targetWords=IV.map((iv,j)=>(parseInt(w.digest.slice(j*8,(j+1)*8),16)-iv)>>>0);
  assert.deepEqual(targetWords,w.states[64]);
  const kinds=new Array(neighbors.length+1).fill(KIND.floor);
  kinds[starts[0]]=KIND.self;kinds[neighbors.length]=KIND.target;
  const missingTargetNeighbors=neighbors.concat([[]]);
  const route=D.shapeGraph(kinds,missingTargetNeighbors,starts[0],{details:true});
  const guessed=nativeGuess(w.digest);
  const candidateHash=hash(Buffer.from(guessed,'hex'));
  const success=candidateHash===w.digest;
  successes+=Number(success);
  const randomHex=values[(i*31+151)%256].toString(16).padStart(2,'0');
  const randomCorrect=hash(Buffer.from(randomHex,'hex'))===w.digest;
  randomSuccesses+=Number(randomCorrect);
  blindGoalResults.push({hash:w.digest,goalInKnownGraph:knownSet.has(w.digest),nativeCandidate:guessed,nativeSha256Exact:success,randomCandidate:randomHex,randomSha256Exact:randomCorrect,knownPathToBlindGoal:!!route?.targetReached});
}
// SECOND, SEPARATE FROZEN EVALUATION: transfer learned physical motors to
// previously unseen SHA-256 states whose ENTIRE 65-node physical topology is
// revealed. This is explicitly NOT digest-only inversion.
let unseenFullMapTransfer=0,changedMotorPhysicsControl=0,unmappedMotorSteps=0;
for(let k=0;k<heldout.length;k++){
 const w=heldout[k];
 const original=snake(),boardPath=original.map(v=>(k%2===0)?v:Math.floor(v/N9)*N9+(N9-1-v%N9));
 const edges=Array.from({length:65},()=>[]);let mapped=true;
 for(let t=0;t<64;t++){
  const from=boardPath[t],to=boardPath[t+1],dir=motorDir(from,to);
  const effect=ACTS[dir];
  const action=RAW_OUTS.map((_,o)=>o).find(o=>{
   const e=D.effect(o);return e&&e[0]===effect[0]&&e[1]===effect[1];
  });
  if(action===undefined){mapped=false;unmappedMotorSteps++;break;}
  edges[t].push({to:t+1,action});
 }
 if(!mapped)continue;
 const kinds=new Array(65).fill(KIND.floor);kinds[0]=KIND.self;kinds[64]=KIND.target;
 const path=D.shapeGraph(kinds,edges,0,{details:true});
 if(!path?.targetReached||path.path.length!==64)continue;
 // The original world mapping validates the predicted action after prediction;
 // it never selects the action for the organism.
 const physicallyCorrect=path.path.every((e,t)=>e.action===D.world.moves[motorDir(boardPath[t],boardPath[t+1])]);
 unseenFullMapTransfer+=Number(physicallyCorrect);
 const permuted=D.world.moves.slice();
 [permuted[1],permuted[2]]=[permuted[2],permuted[1]];
 const falsePhysics=path.path.every((e,t)=>e.action===permuted[motorDir(boardPath[t],boardPath[t+1])]);
 changedMotorPhysicsControl+=Number(falsePhysics);
}
assert.equal(brain.lived,trainedLived,'frozen test must not train');
const result={status:'EXECUTED_NATIVE_V42_ONLY_IF_RUNTIME_COMPLETES',seed:43,pinnedOriginalBrain:'ac205b5bc561274b957584a7dee058a1110ab6f8',worldsTrained:TRAIN_COUNT,blindCount:BLIND_COUNT,shaRoundsPerWorld:64,fullStateBytesPerRound:32,observedGraphNodes:neighbors.length,observedGraphEdges:physicalEdges,wholeWorldTextSymbolsLived:livedChars,realMotorSteps,originalDiscovererSelf:D.self(),originalTargetAttraction:D.attract(KIND.target),originalLearnedMotorEffects:RAW_OUTS.map((_,o)=>D.effect(o)).filter(Boolean).length,trainedLived:brain.lived,knownPathSolved,contextCap,seenRecall,seenPredictionVariety,seenExamples,blindCandidateVariety:new Set(blindGoalResults.map(x=>x.nativeCandidate)).size,blindExact:successes,randomExact:randomSuccesses,blindGraphReachable:blindGoalResults.filter(x=>x.knownPathToBlindGoal).length,unseenFullMapTransfer,changedMotorPhysicsControl,unmappedMotorSteps,blind:blindGoalResults,method:'genuine V42 Brain.live + Discoverer.learnStep and endEpisode from observed puppet actions + frozen Brain.predict and shapeGraph',limitations:['Hash and message pairs used only for training experiences, never at blind inference','Only one-byte unknown inputs, original native Brain, no proxy solver','Training actions are teacher demonstrated, not free-running autonomous SHA inversion','Replay of known 64-round path is not preimage inversion','Full-map transfer reveals all round locations and shares motor physics; it is NOT hash-only inversion','A 64-round graph of observed messages omits unseen inverse branches']};
const output='research/sha256-labyrinth-20261119/native_results.json'; fs.mkdirSync('research/sha256-labyrinth-20261119',{recursive:true});fs.writeFileSync(output,JSON.stringify(result,null,2));
console.log('NATIVE_SHA_RESULT '+JSON.stringify({contextCap,train:TRAIN_COUNT,blind:BLIND_COUNT,livedChars,knownPathSolved,seenRecall,seenPredictionVariety,blindPredictionVariety:result.blindCandidateVariety,nativeExact:successes,randomExact:randomSuccesses,fullMapTransfer:result.unseenFullMapTransfer,changedPhysics:result.changedMotorPhysicsControl,resultsFile:output}));
