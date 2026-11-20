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




// New causal question, different from Braivour's already-tested Python V5:
// Can the SAME original V42 Brain learn primitive DISCOVERY SEQUENCES by
// rehearsing discoveries it itself observed in real SHA-256 word schedules?
// NO hidden-world truth reward, NO external Q learner, NO hash inversion claim.
// Sensory instrumentation includes W[16], W[20], and actual 64-round SHA digest.
const OUT_PRIM=['untried','open','mover_q','again','any','mover','undo'];
const OUT_CHAR=OUT_PRIM.map((_,i)=>65+i);
const SHA_BYTES_MAX=3, NTRAIN=Number(process.env.SHA_DISCOVERY_TRAIN||80);
const NTEST=Number(process.env.SHA_DISCOVERY_TEST||25);
const MAX_STEPS=Number(process.env.SHA_DISCOVERY_MAX_STEPS||160);
assert(Number.isInteger(NTRAIN)&&NTRAIN>=10&&NTRAIN<=200);
assert(Number.isInteger(NTEST)&&NTEST>=8&&NTEST<=50);
assert(Number.isInteger(MAX_STEPS)&&MAX_STEPS>=64&&MAX_STEPS<=400);
let physicsChecks=0,shaObservations=0;
function prng(seed) {
 let s=seed>>>0;
 return ()=>{s^=s<<13;s^=s>>>17;s^=s<<5;return s>>>0;};
}
function shuffle(a,r) {for(let i=a.length-1;i>0;i--){const j=r()%(i+1);[a[i],a[j]]=[a[j],a[i]];}return a;}
function physicalSHA(bytes) {
 assert(bytes.length>=1&&bytes.length<=SHA_BYTES_MAX);
 const b=Buffer.alloc(64);bytes.copy(b);b[bytes.length]=0x80;b.writeUInt32BE(bytes.length*8,60);
 const w=new Uint32Array(64);
 for(let t=0;t<16;t++)w[t]=b.readUInt32BE(t*4);
 for(let t=16;t<64;t++)w[t]=(w[t-16]+s0(w[t-15])+w[t-7]+s1(w[t-2]))>>>0;
 let state=IV.slice();
 for(let t=0;t<64;t++){
  const [a,bb,c,d,e,f,g,h]=state;
  const t1=(h+S1(e)+ch(e,f,g)+K[t]+w[t])>>>0;
  const t2=(S0(a)+maj(a,bb,c))>>>0;
  state=[(t1+t2)>>>0,a,bb,c,(d+t1)>>>0,e,f,g];
 }
 const digest=state.map((x,i)=>h32((x+IV[i])>>>0)).join('');
 assert.equal(digest,hash(bytes),'real SHA-256 full 64-round check');
 physicsChecks++;
 return {w,digest};
}
class SHAWorld {
 constructor(seed,nBytes){
  assert(nBytes>=1&&nBytes<=3);
  this.r=prng(seed);
  this.bytes=Buffer.from(Array.from({length:nBytes},()=>this.r()&255));
  this.actions=shuffle(Array.from({length:nBytes*8},(_,i)=>i),this.r);
  this.last=physicalSHA(this.bytes);
 }
 emit(a){
  const before=this.last,bit=this.actions[a];
  this.bytes[bit>>3]^=1<<(bit&7);
  const after=physicalSHA(this.bytes);
  const d=BigInt(after.w[0])-BigInt(before.w[0]);
  assert.notEqual(d,0n);
  // The agent can SEE this sign through its observed schedule change.
  const sign=d>0n?'+':'-';
  let changed=0;for(let t=0;t<64;t++)changed+=Number(before.w[t]!==after.w[t]);
  assert(changed>0);
  this.last=after;shaObservations++;
  return {sign,changed,digest:after.digest,w16:after.w[16],w20:after.w[20]};
 }
}
class OwnMap {
 constructor(count){
  this.seen=Array.from({length:count},()=>new Set());
  this.history=[];
 }
 open(){return this.seen.map((v,i)=>({n:v.size,i})).filter(x=>x.n===1).map(x=>x.i);}
 untried(){return this.seen.map((v,i)=>({n:v.size,i})).filter(x=>x.n===0).map(x=>x.i);}
 movers(){return this.seen.map((v,i)=>({n:v.size,i})).filter(x=>x.n>0).map(x=>x.i);}
 record(a,sign){
  const before=this.seen[a].size;
  this.seen[a].add(sign);this.history.push(a);
  return {gain:Number(this.seen[a].size>before),complete:this.seen.every(x=>x.size===2)};
 }
 state(prev1='X',prev2='X'){
  const bucket=n=>String.fromCharCode(48+Math.min(3,n));
  return 'S'+bucket(this.untried().length)+bucket(this.open().length)+prev1+prev2;
 }
}
function selectOutput(p,map,r){
 const U=map.untried(),O=map.open(),M=map.movers(),H=map.history;
 let candidates=[];
 if(p===0)candidates=U;
 if(p===1)candidates=O;
 if(p===2&&H.length&&map.seen[H.at(-1)].size===1)candidates=[H.at(-1)];
 if(p===3&&H.length>=2)candidates=[H.at(-2)];
 if(p===4)candidates=map.seen.map((_,i)=>i);
 if(p===5)candidates=M;
 if(p===6&&H.length)candidates=[H.at(-1)];
 if(!candidates.length)candidates=map.seen.map((_,i)=>i);
 return candidates[r()%candidates.length];
}
const sensor=x=>'W16:'+h32(x.w16)+' W20:'+h32(x.w20)+' HASH:'+x.digest+'\n';
function bytes(a){return Array.from(a,x=>x.charCodeAt(0));}
const learned=new Brain({rules:{depth:2},c:{cap:4},seed:43});
const scrambled=new Brain({rules:{depth:2},c:{cap:4},seed:43});
function ingest(brain,state,act,physical,repetitions){
 const seq=bytes(state).concat([OUT_CHAR[act]]);
 for(const y of seq)brain.live(y);
 for(const c of sensor(physical))brain.live(c.charCodeAt(0));
 for(let n=0;n<repetitions;n++)for(const y of seq)brain.live(y);
}
let trainingObservations=0,observedDiscoveryGains=0,trainingCompleted=0;
for(let episode=0;episode<NTRAIN;episode++){
 const world=new SHAWorld(0x516ac212+episode*131,1);
 const map=new OwnMap(world.actions.length),random=prng(0xd521401a+episode*193);
 const transcript=[];
 let prev1='X',prev2='X';
 for(let step=0;step<80;step++){
  const st=map.state(prev1,prev2),primitive=random()%OUT_PRIM.length;
  const output=selectOutput(primitive,map,random);
  const obs=world.emit(output),result=map.record(output,obs.sign);
  transcript.push({st,primitive,obs,gain:result.gain});
  observedDiscoveryGains+=result.gain;trainingObservations++;
  prev2=prev1;prev1=String.fromCharCode(OUT_CHAR[primitive]);
  if(result.complete){trainingCompleted++;break;}
 }
 const shuffledRewards=shuffle(transcript.map(t=>t.gain),prng(0xbacb2147+episode*33));
 for(let i=0;i<transcript.length;i++){
  const t=transcript[i];
  // Reinforcement is a SIMPLE sensory replay gate; the ONLY model whose
  // parameters change remains original Brain.live, not another Q/policy.
  ingest(learned,t.st,t.primitive,t.obs,5*t.gain);
  ingest(scrambled,t.st,t.primitive,t.obs,5*shuffledRewards[i]);
 }
}
learned.frozen=true;scrambled.frozen=true;
const learnedLived=learned.lived,scrambledLived=scrambled.lived;
function nativePick(brain,state,r) {
 const logits=brain.predict(bytes(state));
 let max=-Infinity,top=[];
 for(let k=0;k<OUT_CHAR.length;k++){
  const score=logits[OUT_CHAR[k]]??-Infinity;
  if(score>max+1e-12){max=score;top=[k];}
  else if(Math.abs(score-max)<=1e-12)top.push(k);
 }
 return top.length?top[r()%top.length]:r()%OUT_CHAR.length;
}
const policies=['native_rewarded','native_constant_state','native_inverted_counts','native_no_history','native_history_only','native_shuffled_reward','uniform','own_map_heuristic','untrained'];
const fresh=new Brain({rules:{depth:2},c:{cap:4},seed:43});fresh.frozen=true;
function play(policy,nBytes,worldSeed){
 const w=new SHAWorld(worldSeed,nBytes),map=new OwnMap(w.actions.length);
 const r=prng(worldSeed^0xb18bca05);
 let prev1='X',prev2='X',complete=false,primitiveCounts=Array(7).fill(0),novelty=0;
 for(let step=0;step<MAX_STEPS;step++){
  const state=map.state(prev1,prev2);
  let primitive;
  if(policy==='native_rewarded')primitive=nativePick(learned,state,r);
  else if(policy==='native_constant_state')primitive=nativePick(learned,'S00XX',r);
  else if(policy==='native_inverted_counts'){
   const fake='S'+String(3-Number(state[1]))+String(3-Number(state[2]))+state.slice(3);
   primitive=nativePick(learned,fake,r);
  }
  else if(policy==='native_no_history')primitive=nativePick(learned,state.slice(0,3)+'XX',r);
  else if(policy==='native_history_only')primitive=nativePick(learned,'S00'+state.slice(3),r);
  else if(policy==='native_shuffled_reward')primitive=nativePick(scrambled,state,r);
  else if(policy==='untrained')primitive=nativePick(fresh,state,r);
  else if(policy==='uniform')primitive=r()%7;
  else if(policy==='own_map_heuristic')primitive=map.untried().length?0:map.open().length?1:4;
  else throw Error('unknown policy');
  primitiveCounts[primitive]++;
  const output=selectOutput(primitive,map,r);
  const obs=w.emit(output),res=map.record(output,obs.sign);
  novelty+=res.gain;prev2=prev1;prev1=String.fromCharCode(OUT_CHAR[primitive]);
  if(res.complete){complete=true;return {complete,steps:step+1,novelty,primitiveCounts};}
 }
 return {complete,steps:MAX_STEPS,novelty,primitiveCounts};
}
const evaluated={},perTrial={},testWorlds=[{name:'1-byte-eight-actions',nBytes:1},{name:'2-byte-sixteen-actions',nBytes:2},{name:'3-byte-twentyfour-actions',nBytes:3}];
for(const t of testWorlds){
 evaluated[t.name]={};perTrial[t.name]={};
 for(const policy of policies){
  const rows=[];
  for(let k=0;k<NTEST;k++)rows.push(play(policy,t.nBytes,0xc7102f09+k*1201+t.nBytes*2317));
  perTrial[t.name][policy]=rows;
  const completed=rows.filter(v=>v.complete);
  evaluated[t.name][policy]={
   completed:completed.length,trials:rows.length,
   meanStepsToCompleteOrCap:Number((rows.reduce((a,b)=>a+b.steps,0)/rows.length).toFixed(3)),
   meanStepsWhenComplete:completed.length?Number((completed.reduce((a,b)=>a+b.steps,0)/completed.length).toFixed(3)):null,
   meanNovelty:Number((rows.reduce((a,b)=>a+b.novelty,0)/rows.length).toFixed(3)),
   primitiveCounts:rows.reduce((a,b)=>a.map((v,i)=>v+b.primitiveCounts[i]),Array(7).fill(0))
  };
 }
}
assert.equal(learned.lived,learnedLived,'no Brain.live during blind test');
assert.equal(scrambled.lived,scrambledLived,'no Brain.live during blind test');
assert.equal(fresh.lived,0,'untrained original Brain must remain unseen');
const result={
 status:'EXECUTED_IF_CI_SUCCESS',
 researchQuestion:'CAUSAL ABLATION: Does original V42 Brain actually use its OWN map state, or only global primitive-frequency biases?',
 originalNativeBrain:true,originalBrainSource:'v17/transcend/torus-aether/devour/brain.mjs',
 primitiveDefinitions:OUT_PRIM,shaPhysics:'full standard 64-round SHA256 with exact Node crypto cross-check',
 domain:'instrumented SHA schedule causal discovery, NOT hidden preimage inversion',
 sourceV5:'Braivour experiment/ORIGINAL-BRAIN-LIVES-WHOLE-INFERENCE-LOOP-20261111 research/discovery_maze/README.md and discovery_maze_v5.py',
 trainingWorlds:NTRAIN,trainingObservations,observedDiscoveryGains,trainingCompleted,
 replayExtraOnObservedDiscovery:5,replayExtraOnShuffledDiscovery:5,causalStateAblations:['constant-state','inverted map count buckets','no previous primitive history','only previous primitive history'],
 originalBrainLived:{rewarded:learnedLived,shuffled:scrambledLived},
 testsPerSize:NTEST,limitEmissionsPerWorld:MAX_STEPS,
 physicsChecks,shaObservations,evaluated,perTrial,
 caveats:[
  'The native Brain is the only learned policy; the external fivefold event repetition is a handcrafted reward gate rather than learned reward assignment.',
  'The seven primitive selectors are defined by the V5 experiment, not autonomously invented by Brain.',
  'The SHA word schedule is instrumented and its internal W16/W20 values are visible; these observations are NOT available when given an unknown final digest only.',
  'Map completeness is known from the agents own seen action response signatures (+/-); no hidden map truth is injected to learner.',
  'This is an algorithm-discovery test on a designed world with real SHA physics, not an attack on SHA256 or evidence of a preimage vulnerability.',
  'Training uses only 1-byte worlds; 2-3-byte heldouts have more action choices; no previously tested synthetic V5 world was re-run.'
 ]
};
fs.mkdirSync('research/sha256-labyrinth-20261119',{recursive:true});
fs.writeFileSync('research/sha256-labyrinth-20261119/native_v5_sha_state_ablation_results.json',JSON.stringify(result,null,2));
console.log('SHA_DISCOVERY_STATE_ABLATION_RESULT '+JSON.stringify({trainingWorlds:NTRAIN,trainingObservations,observedDiscoveryGains,trainingCompleted,physicsChecks,evaluated}));
