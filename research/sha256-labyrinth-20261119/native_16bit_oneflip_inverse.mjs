// Native original Brain V42 experiment: digest-only single-step 16-bit preimage recovery.
// Diagnostic only: the blind candidate starts one bit away from the hidden preimage.
// Trained native Brain predicts correction bits only from TWO public SHA256 digests.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {Brain} from '../../v17/transcend/torus-aether/devour/brain.mjs';

const IV=[0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19];
const K=[0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2];
const rot=(x,n)=>(x>>>n)|(x<<(32-n));
const s0=x=>rot(x,7)^rot(x,18)^(x>>>3),s1=x=>rot(x,17)^rot(x,19)^(x>>>10);
const S0=x=>rot(x,2)^rot(x,13)^rot(x,22),S1=x=>rot(x,6)^rot(x,11)^rot(x,25);
const ch=(x,y,z)=>(x&y)^(~x&z),maj=(x,y,z)=>(x&y)^(x&z)^(y&z);
const h32=x=>(x>>>0).toString(16).padStart(8,'0');
const hash=b=>createHash('sha256').update(b).digest('hex');

const SHA_BYTES_MAX=2;
let physicsChecks=0;
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
 return {digest};
}

const NTRAIN=Number(process.env.SHA_INVERSE_TRAIN||384);
const NTEST=Number(process.env.SHA_INVERSE_TEST||256);
const PAIRS_PER_TRAIN=Number(process.env.SHA_INVERSE_TRAIN_PAIRS||4);
assert(Number.isInteger(NTRAIN)&&NTRAIN>=128&&NTRAIN<=2048);
assert(Number.isInteger(NTEST)&&NTEST>=64&&NTEST<=1000);
assert(Number.isInteger(PAIRS_PER_TRAIN)&&PAIRS_PER_TRAIN>=1&&PAIRS_PER_TRAIN<=16);
assert(NTRAIN+NTEST<=65536);
const ACT=Array.from({length:16},(_,bit)=>224+bit);
const seed=0x4a6d129c;
function rng32(seed0){let st=seed0>>>0;return ()=>{st^=st<<13;st^=st>>>17;st^=st<<5;return st>>>0;};}
const rng=rng32(seed);
const values=Array.from({length:65536},(_,i)=>i);
for(let i=values.length-1;i>0;i--){const j=rng()%(i+1);[values[i],values[j]]=[values[j],values[i]];}
const trainBytes=values.slice(0,NTRAIN);
const blindBytes=values.slice(NTRAIN,NTRAIN+NTEST);
const trainSet=new Set(trainBytes);
const msg=n=>Buffer.from([n>>>8,n&255]);
const digest=n=>physicalSHA(msg(n)).digest;
const trainDigests=trainBytes.map(digest);
const blindDigests=blindBytes.map(digest);
assert.equal(new Set(trainBytes.concat(blindBytes)).size,NTRAIN+NTEST,'train/test secret disjoint');
const digestBytes=hex=>Buffer.from(hex,'hex');
function sensorViews(targetDigest,candidateDigest){
  const a=digestBytes(targetDigest),b=digestBytes(candidateDigest);
  const views=[];
  for(let i=0;i<32;i+=4)
    views.push([a[i]^b[i],a[i+1]^b[i+1],a[i+2]^b[i+2],a[i+3]^b[i+3]]);
  for(let i=0;i<32;i+=4)
    views.push([a[i],b[i],a[i+1],b[i+1]]);
  assert.equal(views.length,16);
  return views;
}
const trained=new Brain({rules:{depth:2},c:{cap:4},seed:43});
const shuffled=new Brain({rules:{depth:2},c:{cap:4},seed:43});
let samples=0;
for(let idx=0;idx<NTRAIN;idx++){
  const target=trainBytes[idx],targetDigest=trainDigests[idx];
  const bits=Array.from({length:16},(_,i)=>i);
  for(let k=bits.length-1;k>0;k--){const j=rng()%(k+1);[bits[k],bits[j]]=[bits[j],bits[k]];}
  for(let q=0;q<PAIRS_PER_TRAIN;q++){
    const correctBit=bits[q],candidate=target^(1<<correctBit);
    const candidateDigest=digest(candidate),views=sensorViews(targetDigest,candidateDigest);
    // Known training target supplies the correct motor label, but neither target
    // bytes nor correctBit enter the sensor context or ever enter blind policy.
    const incorrectLabel=(correctBit+1+rng()%15)&15;
    for(const view of views){
      for(const token of view){trained.live(token);shuffled.live(token);}
      trained.live(ACT[correctBit]);shuffled.live(ACT[incorrectLabel]);
    }
    samples++;
  }
}
trained.frozen=true;shuffled.frozen=true;
const trainedLived=trained.lived,shuffledLived=shuffled.lived;
function scoreActions(brain,targetDigest,candidateDigest){
  const scores=new Float64Array(16);
  for(const view of sensorViews(targetDigest,candidateDigest)){
    const prediction=brain.predict(view);
    for(let bit=0;bit<16;bit++){
      const n=Number(prediction[ACT[bit]]);
      if(Number.isFinite(n))scores[bit]+=n;
    }
  }
  return Array.from({length:16},(_,bit)=>bit).sort((a,b)=>scores[b]-scores[a]||a-b);
}
function randomOrdering(i){
 const ord=Array.from({length:16},(_,b)=>b),r=rng32((0xb9eab14a^(i+1)*0x9e3779b9)>>>0);
 for(let k=ord.length-1;k>0;k--){const j=r()%(k+1);[ord[k],ord[j]]=[ord[j],ord[k]];}
 return ord;
}
function verifyRank(rank,candidate,targetDigest,limit){
 // Every validation candidate is a complete real SHA-256 hash.
 // No secret read here; only SHA(candidate ^ 1<<b) === public target digest.
 for(const b of rank.slice(0,limit))if(digest(candidate^(1<<b))===targetDigest)return true;
 return false;
}
const policies=['original_target','wrong_target','shuffled_labels','random_unique'];
const counts=Object.fromEntries(policies.map(n=>[n,{top1:0,top4:0,top8:0,firstBitHistogram:Array(16).fill(0)}]));
const paired={realOnly:0,wrongOnly:0,both:0,neither:0,realVsRandomOnly:0,randomOnly:0};
const trace=[];
for(let i=0;i<NTEST;i++){
  const secret=blindBytes[i],realDigest=blindDigests[i];
  // Candidate is, by design, exactly ONE bit from secret. This fact is available
  // to the harness but NOT as a bit index, secret, or target word in Brain input.
  let bit=(i*13+7)&15, candidate=secret^(1<<bit);
  while(trainSet.has(candidate)){bit=(bit+1)&15;candidate=secret^(1<<bit);}
  const candidateDigest=digest(candidate);
  const wrongDigest=blindDigests[(i+17)%NTEST];
  const ranks={
    original_target:scoreActions(trained,realDigest,candidateDigest),
    wrong_target:scoreActions(trained,wrongDigest,candidateDigest),
    shuffled_labels:scoreActions(shuffled,realDigest,candidateDigest),
    random_unique:randomOrdering(i)
  };
  const trueBit=bit;
  for(const [name,rank] of Object.entries(ranks)){
    // Rank is based only on publicly accessible digests (or RNG baseline).
    const k=rank.indexOf(trueBit);
    counts[name].top1+=Number(k<1);
    counts[name].top4+=Number(k<4);
    counts[name].top8+=Number(k<8);
    counts[name].firstBitHistogram[rank[0]]++;
  }
  const realHit=ranks.original_target[0]===trueBit,
        wrongHit=ranks.wrong_target[0]===trueBit,
        randHit=ranks.random_unique[0]===trueBit;
  paired.both+=Number(realHit&&wrongHit);
  paired.realOnly+=Number(realHit&&!wrongHit);
  paired.wrongOnly+=Number(!realHit&&wrongHit);
  paired.neither+=Number(!realHit&&!wrongHit);
  paired.realVsRandomOnly+=Number(realHit&&!randHit);
  paired.randomOnly+=Number(!realHit&&randHit);
  if(i<12)trace.push({targetDigest:realDigest,candidateDigest,realFirst:ranks.original_target[0],wrongFirst:ranks.wrong_target[0],randomFirst:ranks.random_unique[0],
    exact:verifyRank(ranks.original_target,candidate,realDigest,1)});
}
assert.equal(trained.lived,trainedLived,'No original Brain training on hidden targets');
assert.equal(shuffled.lived,shuffledLived,'No control training on hidden targets');
const p=ACT.length;
const result={
  status:'NATIVE_BRAIN_16BIT_ONE_BIT_LOCAL_INVERSE_EXECUTED',
  meaning:'Frozen original V42 Brain ranks which ONE of 16 input message bits differs from a hidden 16-bit preimage; only target/candidate full SHA digests are accessible.',
  importantLimitations:[
    'The candidate starts exactly 1 bit from the true 16-bit target. This is artificial privileged experimental task construction; in a real preimage search no one supplies a 1-bit-close candidate.',
    'The true message and bit label exist only in training/evaluator; blind Brain inputs have neither.',
    'Success counts are conditional SINGLE-bit recovery, not arbitrary SHA256 preimage inversion.',
    'The original Brain implementation is unmodified, but the 16 sensor views and action vocabulary are researcher-defined.',
    'If correct-target and wrong-target policy tie, no useful SHA inversion or target information is demonstrated.',
    'Every message hash is full 64-round standard SHA256, cross-checked against Node crypto.'
  ],
  originalBrain:'v17/transcend/torus-aether/devour/brain.mjs',seed,
  trainTargets:NTRAIN,trainSamples:samples,blindTargets:NTEST,
  trainLivedSymbols:trainedLived,
  referenceRandomTop1:NTEST/p,
  referenceRandomTop4:NTEST*4/p,
  physicsChecks,counts,paired,first12:trace
};
fs.mkdirSync('research/sha256-labyrinth-20261119',{recursive:true});
const out='research/sha256-labyrinth-20261119/native_16bit_oneflip_inverse_results.json';
fs.writeFileSync(out,JSON.stringify(result,null,2));
console.log('SHA256_NATIVE_16BIT_ONEFLIP_INVERSE '+JSON.stringify({train:NTRAIN,trainSamples:samples,test:NTEST,physicsChecks,counts,paired,trainLived:trainedLived,results:out}));
