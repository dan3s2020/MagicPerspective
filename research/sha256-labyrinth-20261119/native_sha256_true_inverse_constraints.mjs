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


// NOTE: all new code is a separate research experiment; the original Brain
// imported above remains unmodified. SHA physics was copied from an already
// verified native runner and still checked against node:crypto by world().
const RUN_SEED=0x6c29d5a1;
let rngState=RUN_SEED;function rng(){rngState^=rngState<<13;rngState^=rngState>>>17;rngState^=rngState<<5;return rngState>>>0;}
const bits=x=>{x=x>>>0;x=x-((x>>>1)&0x55555555);x=(x&0x33333333)+((x>>>2)&0x33333333);return Math.imul(((x+(x>>>4))&0x0f0f0f0f),0x01010101)>>>24;};
const IV2=IV.slice(), ACTS8=[5,6,7,8,11,12,14,15]; // output symbols, one for each candidate-bit physical motor
const perm=Array.from({length:256},(_,i)=>i);
for(let i=perm.length-1;i>0;i--){const j=rng()%(i+1);[perm[i],perm[j]]=[perm[j],perm[i]];}
const TRAIN=Number(process.env.SHA_ROUND_TRAIN||8),BLIND=Number(process.env.SHA_ROUND_BLIND||64);
const MAX_QUERY=Number(process.env.SHA_ROUND_BUDGET||64);
assert(TRAIN>=4&&TRAIN<=24&&BLIND>=16&&BLIND<=200&&TRAIN+BLIND<=256);
assert(MAX_QUERY>=8&&MAX_QUERY<=256);
const train=perm.slice(0,TRAIN).map(world),held=perm.slice(TRAIN,TRAIN+BLIND).map(world);
const W0=x=>(((x<<24)>>>0)+0x800000)>>>0; // one-byte padding: W[0] contains 8 message bits + 0x80
function schedule(x) {
  const b=Buffer.alloc(64);b[0]=x;b[1]=128;b.writeUInt32BE(8,60);
  const w=new Uint32Array(64);
  for(let t=0;t<16;t++)w[t]=b.readUInt32BE(t*4);
  for(let t=16;t<64;t++)w[t]=(w[t-16]+s0(w[t-15])+w[t-7]+s1(w[t-2]))>>>0;
  assert.equal(w[0],W0(x));
  return w;
}
// Exact algebraic inverse of one SHA-256 round, given the proposed schedule word.
function backRound(out,t,wt) {
  const [aa,bb,cc,dd,ee,ff,gg,hh]=out;
  const a=bb,b=cc,c=dd,e=ff,f=gg,g=hh;
  const t2=(S0(a)+maj(a,b,c))>>>0;
  const t1=(aa-t2)>>>0;
  const d=(ee-t1)>>>0;
  const h=(t1-S1(e)-ch(e,f,g)-K[t]-wt)>>>0;
  return [a,b,c,d,e,f,g,h];
}
function stateFromDigest(digest) {
  assert(/^[0-9a-f]{64}$/.test(digest));
  return IV.map((iv,i)=>(parseInt(digest.slice(i*8,i*8+8),16)-iv)>>>0);
}
function invertAll(digest,candidate) {
  let st=stateFromDigest(digest),w=schedule(candidate);
  for(let t=63;t>=0;t--)st=backRound(st,t,w[t]);
  return st;
}
const hammingIV=state=>state.reduce((sum,x,i)=>sum+bits(x^IV[i]),0);
const inverseScore=(targetDigest,candidate)=>hammingIV(invertAll(targetDigest,candidate));
const firstScore=(observedRound1,candidate)=>hammingIV(backRound(observedRound1,0,W0(candidate)));
const digestScore=(targetDigest,candidate,alreadyComputedDigest=null)=>{
  const obtained=alreadyComputedDigest??world(candidate).digest;
  let h=0;for(let i=0;i<8;i++)h+=bits(parseInt(targetDigest.slice(i*8,i*8+8),16)^parseInt(obtained.slice(i*8,i*8+8),16));
  return h;
};
function analyticFirstByte(st1){
  const a=IV[0],b=IV[1],c=IV[2],e=IV[4],f=IV[5],g=IV[6],h=IV[7];
  const t2=(S0(a)+maj(a,b,c))>>>0;
  const t1=(st1[0]-t2)>>>0;
  const wt=(t1-h-S1(e)-ch(e,f,g)-K[0])>>>0;
  if((wt&0xffffff)!==0x800000)return -1;
  return wt>>>24;
}
// Each known physical world gives the SAME Brain native sensor stream; it learns
// to emit one of eight actual bit-flip actions. Teacher knows answers ONLY in train.
function sensor(digest,cand,kind,st1,withAnswer=false) {
  const residual=kind==='round1'?firstScore(st1,cand):inverseScore(digest,cand);
  const scoreHex=residual.toString(16).padStart(2,'0');
  // Full SHA target and full candidate are in sensor, along with 256-bit algebraic
  // inverse mismatch. These bytes are seen by original Brain.live during TRAIN.
  const reverseState=kind==='round1'?backRound(st1,0,W0(cand)):invertAll(digest,cand);
  return "DOMAIN:"+kind+"\nTARGET:"+digest+"\nCAND:"+cand.toString(16).padStart(2,'0')+
    "\nBACK:"+reverseState.map(h32).join('')+"\nR:"+scoreHex+"\nACT:";
}
const brains={};
const trainingSummary={};
for(const kind of ['round1','full64']){
  const brain=new Brain({rules:{depth:2},c:{cap:4},seed:43});
  let acts=0,physicalQueries=0;
  for(const target of train)for(let ep=0;ep<8;ep++){
    // Candidate starts 2-5 bits away from known target for causal motor training.
    let mask=0;while(bits(mask)<2||bits(mask)>5)mask=rng()&255;
    let candidate=target.byte^mask;
    for(let step=0;step<5&&candidate!==target.byte;step++){
      const st1=target.states[1],text=sensor(target.digest,candidate,kind,st1);
      for(const ch0 of text)brain.live(ch0.charCodeAt(0));
      physicalQueries++;
      // Teacher demonstrates ONE correct bit-flip from known preimage, ONLY in train.
      const delta=candidate^target.byte;const options=[];
      for(let i=0;i<8;i++)if(delta&(1<<i))options.push(i);
      const action=options[rng()%options.length];
      brain.live(ACTS8[action]);candidate^=1<<action;acts++;
      const after=sensor(target.digest,candidate,kind,st1);
      for(const ch0 of after)brain.live(ch0.charCodeAt(0));
    }
  }
  brains[kind]=brain;
  trainingSummary[kind]={knownTargets:train.length,trainingBitFlips:acts,trainingSensorEpisodes:physicalQueries,brainLived:brain.lived};
  brain.frozen=true;
}
function originalPolicy(digest,candidate,kind,st1){
  const str=sensor(digest,candidate,kind,st1);
  const logits=brains[kind].predict(Array.from(str,ch0=>ch0.charCodeAt(0)));
  let best=0,val=-Infinity;
  for(let action=0;action<8;action++){
    const v=logits[ACTS8[action]]??-Infinity;
    if(v>val){val=v;best=action;}
  }
  return best;
}
function blindTrial(target,index,kind,policy) {
  // The secret byte is never given to the original native policy; only digest
  // and (for local round1 positive-control only) an observed first round state.
  const digest=target.digest, st1=kind==='round1'?target.states[1]:null;
  let candidate=(index*73+23)&255;
  const r=()=>rng();
  const visited=new Set(),actions=[];
  let cost=0,hit=false,previousScore=null;
  while(cost<MAX_QUERY){
    let measured;
    if(kind==='round1')measured=firstScore(st1,candidate);
    else measured=inverseScore(digest,candidate);
    const actual=world(candidate);cost++;
    hit=(actual.digest===digest);
    visited.add(candidate);
    if(hit||cost>=MAX_QUERY)break;
    let action=0;
    if(policy==='native') action=originalPolicy(digest,candidate,kind,st1);
    else if(policy==='native_scrambled') action=originalPolicy(held[(index+17)%held.length].digest,candidate,kind,st1);
    else if(policy==='random_bit') action=r()%8;
    else if(policy==='inverse_greedy'||policy==='digest_greedy'){
      // Each neighbor is physically evaluated; no magical look-ahead.
      // Budget must include the actual SHA256 computations for each probe.
      const trials=[];
      for(let b=0;b<8&&cost<MAX_QUERY;b++){
        const newC=candidate^(1<<b);
        const res=world(newC);cost++;
        if(res.digest===digest){
          hit=true;candidate=newC;break;
        }
        const sc=policy==='inverse_greedy'?inverseScore(digest,newC):digestScore(digest,newC,res.digest);
        trials.push({b,sc,visited:visited.has(newC)});
      }
      if(hit||!trials.length)break;
      trials.sort((a,b)=>a.sc-b.sc||Number(a.visited)-Number(b.visited)||a.b-b.b);
      action=trials[0].b;
    }else throw Error('unknown policy '+policy);
    if(actions.length<8)actions.push(action);
    candidate^=1<<action;
    previousScore=measured;
  }
  return {hit,cost,unique:visited.size,previewActions:actions};
}
const tables={},MAX_TARGETS=Number(process.env.SHA_ROUND_EVAL_TARGETS||64);
const tests=held.slice(0,MAX_TARGETS);
for(const kind of ['round1','full64']){
  tables[kind]={};
  for(const policy of ['native','native_scrambled','random_bit','inverse_greedy','digest_greedy']){
    let hits=0,queries=0,unique=0;
    // Reinitialize policy RNG per policy to keep randomized control independent
    // of execution order. Native predictions are frozen.
    rngState=(RUN_SEED^0x2de09fd2)>>>0;
    for(const [i,target] of tests.entries()){
      const r=blindTrial(target,i,kind,policy);
      hits+=Number(r.hit);queries+=r.cost;unique+=r.unique;
    }
    tables[kind][policy]={hits,total:tests.length,queries,unique};
  }
}
// Stronger-than-digest oracle positive control: round 1 reveals the first W0
// word exactly, so a classical algebraic solver trivially recovers the byte.
// DO NOT attribute this reference calculation to the Brain.
const reference={oneRoundAnalyticExact:tests.filter(t=>analyticFirstByte(t.states[1])===t.byte).length,
  full64KnownScheduleRoundTrip:tests.filter(t=>inverseScore(t.digest,t.byte)===0).length};
let gradient={full:{correctedBetter:0,incorrectBetter:0,correctedObservations:0,incorrectObservations:0},first:{correctedBetter:0,incorrectBetter:0,correctedObservations:0,incorrectObservations:0}};
for(const [i,target] of tests.entries()){
  let mask=(rng()&255);while(bits(mask)<3||bits(mask)>5)mask=rng()&255;
  const candidate=target.byte^mask, correctBits=[],wrongBits=[];
  for(let b=0;b<8;b++)((mask&(1<<b))?correctBits:wrongBits).push(b);
  for(const [key,score] of [['full',x=>inverseScore(target.digest,x)],['first',x=>firstScore(target.states[1],x)]]){
    const baseline=score(candidate);
    for(const b of correctBits){gradient[key].correctedObservations++;if(score(candidate^(1<<b))<baseline)gradient[key].correctedBetter++;}
    for(const b of wrongBits){gradient[key].incorrectObservations++;if(score(candidate^(1<<b))<baseline)gradient[key].incorrectBetter++;}
  }
}
const finalResult={status:'EXECUTED_ONLY_WHEN_CI_SUCCESS',seed:RUN_SEED,
  actualOriginalBrain:true,full64HashVerified:true,
  physics:'backward round algebra with inferred candidate W schedule; full 64-round inverse from public target digest; no target message in blind',
  inputSpace:'one-byte SHA256 only (256 possible inputs)',trainCount:train.length,blindCount:tests.length,
  maxPhysicalSHAQueriesPerTarget:MAX_QUERY,trainingSummary,reference,tables,gradient,
  limitations:[
    'Round1 exposes full internal round state; trivial algebraic inverse is a NON-BRAIN positive control.',
    'Inverse score from digest is computed by a public algebraic formula for candidate W and has no known gradient near a secret.',
    'Greedy controls evaluate eight neighbor candidates per step and charge each to their query budget.',
    'Native original Brain is not replaced by a proxy, but this does not prove autonomous invention of SHA laws.',
    'Full64 preimage candidates use at most one-byte messages; no SHA256 vulnerability demonstrated.',
    'Correct training bit-action uses known secret ONLY in train, hidden targets never provided to Brain in test.'
  ]};
fs.mkdirSync('research/sha256-labyrinth-20261119',{recursive:true});
fs.writeFileSync('research/sha256-labyrinth-20261119/inverse_constraint_results.json',JSON.stringify(finalResult,null,2));
console.log('SHA_INVERSE_CONSTRAINT_RESULT '+JSON.stringify({reference,tables,trainingSummary,gradient}));
