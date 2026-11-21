// Positive CONTROL for the EXACT original V42 Brain's SHA digest -> action interface.
// NOT preimage inversion. A native Brain must learn a known (trivial) public-digest
// nibble -> motor relation before a SHA inverse-action failure can be interpreted.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {Brain} from '../../v17/transcend/torus-aether/devour/brain.mjs';
const symbol=x=>x.charCodeAt(0);
const hex='0123456789abcdef';
const ACTIONS=Array.from({length:16},(_,x)=>65+x);
const encode=(digest)=>[symbol('S'),symbol('H'),symbol('A'),symbol(digest[0])];
const targetAction=(digest)=>ACTIONS[hex.indexOf(digest[0])];
let st=0x2e5bfa12;
const rng=()=>{st^=st<<13;st^=st>>>17;st^=st<<5;return st>>>0;};
const values=Array.from({length:65536},(_,i)=>i);
for(let i=values.length-1;i>0;i--){const j=rng()%(i+1);[values[i],values[j]]=[values[j],values[i]];}
const TRAIN=512,BLIND=512;
const targetDigest=n=>createHash('sha256').update(Buffer.from([n>>>8,n&255])).digest('hex');
const brain=new Brain({rules:{depth:2},c:{cap:4},seed:43});
for(const n of values.slice(0,TRAIN)){
  const d=targetDigest(n),ctx=encode(d),label=targetAction(d);
  assert(ctx.length===4&&ctx.every(x=>x>=0&&x<128));
  assert(label>=65&&label<=80);
  for(const y of ctx)brain.live(y);
  brain.live(label);
}
brain.frozen=true;
const trainedLived=brain.lived;
const predictions=[];
let correct=0,maskedCorrect=0,uniqueOutput=new Set(),correctPerNibble=Array(16).fill(0),testedPerNibble=Array(16).fill(0);
const predict=ctx=>{
 const p=brain.predict(ctx);
 return ACTIONS.reduce((best,a)=>(p[a]>p[best]?a:best),ACTIONS[0]);
};
for(const n of values.slice(TRAIN,TRAIN+BLIND)){
  const d=targetDigest(n),ctx=encode(d),expected=targetAction(d);
  const chosen=predict(ctx),masked=predict([ctx[0],ctx[1],ctx[2],symbol('?')]);
  uniqueOutput.add(chosen);
  const nib=hex.indexOf(d[0]);testedPerNibble[nib]++;correctPerNibble[nib]+=Number(chosen===expected);
  correct+=Number(chosen===expected);maskedCorrect+=Number(masked===expected);
  if(predictions.length<16)predictions.push({firstNibble:d[0],predictedMotor:chosen,truthMotor:expected,maskedMotor:masked});
}
assert.equal(brain.lived,trainedLived);
const result={mode:'EXACT_ORIGINAL_V42_POSITIVE_WIRING_CONTROL_NOT_SHA_INVERSE',
  train:TRAIN,blind:BLIND,correct,maskedCorrect,
  accuracy:correct/BLIND,maskedAccuracy:maskedCorrect/BLIND,uniqueMotorOutputs:uniqueOutput.size,
  expectedChance:1/16,brainLived:brain.lived,correctPerNibble,testedPerNibble,first16:predictions,
  limitations:['The correct motor here is simply the PUBLIC first hexadecimal nibble of the target digest, purposefully supplied as a sensor.','This does not recover any unknown SHA preimage.','Its purpose is to verify that Brain.live and Brain.predict use valid 0..127 alphabet and can condition on an informative public SHA digest symbol.']
};
fs.mkdirSync('research/sha256-labyrinth-20261119',{recursive:true});
fs.writeFileSync('research/sha256-labyrinth-20261119/native_ascii_wiring_positive_results.json',JSON.stringify(result,null,2));
console.log('SHA256_ORIGINAL_NATIVE_ASCII_POSITIVE '+JSON.stringify({train:TRAIN,blind:BLIND,correct,maskedCorrect,uniqueMotors:uniqueOutput.size,brainLived:brain.lived}));
