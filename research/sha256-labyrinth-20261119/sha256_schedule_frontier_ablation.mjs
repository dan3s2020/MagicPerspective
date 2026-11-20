// Executable native SHA-256 experiment — SAME real V42 Brain, not ShapeNet, not a substitute.
// The MagicPerspective source is checked out at pinned commit ac205b5bc561274b957584a7dee058a1110ab6f8.
// Training sees 64 complete 8×32-bit round states per known preimage.
// Frozen blind inference sees ONLY a new full SHA-256 hash and a prompt boundary;
// preimage is used exclusively by the evaluator for exact SHA-256 verification.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';

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



const xor32=(x)=>{let y=x>>>0;y=y-((y>>>1)&0x55555555);y=(y&0x33333333)+((y>>>2)&0x33333333);return Math.imul((y+(y>>>4))&0x0f0f0f0f,0x01010101)>>>24;};
function schedule(b){
 const block=Buffer.alloc(64);block[0]=b;block[1]=0x80;block.writeUInt32BE(8,60);
 const w=new Uint32Array(64);
 for(let i=0;i<16;i++)w[i]=block.readUInt32BE(i*4);
 for(let i=16;i<64;i++)w[i]=(w[i-16]+s0(w[i-15])+w[i-7]+s1(w[i-2]))>>>0;
 return w;
}
function backward(y,i,w) {
 const [aa,bb,cc,dd,ee,ff,gg,hh]=y;
 const a=bb,b=cc,c=dd,e=ff,f=gg,g=hh;
 const t2=(S0(a)+maj(a,b,c))>>>0;
 const t1=(aa-t2)>>>0;
 return [a,b,c,(ee-t1)>>>0,e,f,g,(t1-S1(e)-ch(e,f,g)-K[i]-w)>>>0];
}
const distance=x=>x.reduce((z,w,i)=>z+xor32(w^IV[i]),0);
function consistency(state,depth,hypothesis,trueWords=null,ablation='actual'){
 let c=state.slice(),words=schedule(hypothesis);
 if(ablation==='oracle_schedule'){
  // CAUSAL ABLATION ONLY: true expanded W16..W63 are directly supplied.
  // This discloses hidden internals and is forbidden in actual blind inference.
  for(let i=16;i<64;i++)words[i]=trueWords[i];
 }else if(ablation==='oracle_W16'){
  words[16]=trueWords[16];
 }
 for(let j=depth-1;j>=0;j--)c=backward(c,j,words[j]);
 return distance(c);
}
let r=0x2b8e493f;
function rand(){r^=r<<13;r^=r>>>17;r^=r<<5;return r>>>0;}
const xs=Array.from({length:256},(_,i)=>i);
for(let i=255;i>0;i--){const j=rand()%(i+1);[xs[i],xs[j]]=[xs[j],xs[i]];}
const targets=xs.slice(8,136).map(world);
const depths=[1,4,8,12,15,16,17,18,19,20,21,22,23,24,25,28,32,40,48,56,64];
const modes=['actual','oracle_W16','oracle_schedule'];
const probes=targets.map((target,k)=>{
  let mask=rand()&255;
  while(xor32(mask)<3||xor32(mask)>5)mask=rand()&255;
  return {target,mask,candidate:target.byte^mask,trueWords:schedule(target.byte)};
});
const influencedAt={};
for(let t=0;t<64;t++){
 let changed=0;
 for(const probe of probes){
  if(schedule(probe.candidate)[t]!==probe.trueWords[t])changed++;
 }
 influencedAt[String(t)]=changed;
}
const stage={};
for(const depth of depths){
 stage[String(depth)]={};
 for(const mode of modes){
  const met={correctReducesError:0,wrongReducesError:0,correctTrials:0,wrongTrials:0,validRoundTrips:0};
  for(const p of probes){
   const cur=p.target.states[depth],score=consistency(cur,depth,p.candidate,p.trueWords,mode);
   if(consistency(cur,depth,p.target.byte,p.trueWords,'actual')===0)met.validRoundTrips++;
   for(let b=0;b<8;b++){
    const alt=p.candidate^(1<<b);
    const reduce=consistency(cur,depth,alt,p.trueWords,mode)<score;
    if(p.mask&(1<<b)){met.correctTrials++;met.correctReducesError+=Number(reduce);}
    else{met.wrongTrials++;met.wrongReducesError+=Number(reduce);}
   }
  }
  met.correctRate=+(met.correctReducesError/met.correctTrials).toFixed(5);
  met.wrongRate=+(met.wrongReducesError/met.wrongTrials).toFixed(5);
  met.advantagePP=+((met.correctRate-met.wrongRate)*100).toFixed(3);
  stage[String(depth)][mode]=met;
 }
}
assert.equal(stage['16'].actual.advantagePP,stage['1'].actual.advantagePP,'first 16-round inverse signal must remain identical for same split');
for(const depth of depths)assert.equal(stage[String(depth)].actual.validRoundTrips,probes.length);
const report={
 status:'EXECUTED_ONLY_WHEN_WORKFLOW_EXITS_0',
 experiment:'Public SHA-256 physics-only schedule-influence ablation (NOT a native Brain training result)',
 sha:'full standard 64-round SHA256 cross-checked with node crypto',
 data:{independentlyPermutedOneByteTargets:probes.length,errorsPerCandidateBits:'3-5',seed:'0x2b8e493f'},
 firstAffectedWords:Object.entries(influencedAt).filter(([i,count])=>count>0).slice(0,16),
 influencedAt,
 stages:stage,
 securityCaveats:[
  'Every depth result uses the secret target internal state at that depth, NOT extractable from a digest alone.',
  'oracle_schedule mode discloses true expanded W[t] for t>=16; causal ablation only, cannot be used as attack.',
  'The original Brain was separately executed in original V42 inverse-constraint experiment; this code isolates the mathematics without pretending to be organism learning.',
  'No SHA256 preimage vulnerability or inversion advantage follows from an internal-state oracle diagnostic.'
 ]
};
fs.mkdirSync('research/sha256-labyrinth-20261119',{recursive:true});
fs.writeFileSync('research/sha256-labyrinth-20261119/schedule_frontier_results.json',JSON.stringify(report,null,2));
console.log('SHA_SCHEDULE_FRONTIER '+JSON.stringify({targets:probes.length,firstAffectedWords:report.firstAffectedWords,stages:Object.fromEntries(Object.entries(stage).filter(([d])=>['1','16','17','18','20','24','32','64'].includes(d)))}));
