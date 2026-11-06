// Native MagicPerspective V17 Geometry.learn() only. No changes to the production Brain.
// Tests xD expansion, coordinate-gauge invariance and exact reducible embeddings.
// An explicitly lifted 2D state is NOT evidence for spontaneous dimensional collapse.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {Geometry} from "../transcend/torus-aether/concepts.mjs";

const T=Math.PI*2,wrap=x=>x-Math.floor(x),short=x=>x-Math.round(x);
const random=seed=>()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
const corpus=Array.from(fs.readFileSync(new URL("../docs/TORUS_AETHER_ABC_20261104.md",import.meta.url),"utf8")
  .replace(/[^\x20-\x7e\n\t]/g," ").slice(0,47000),c=>c.charCodeAt(0));
const opts={lr:.03,neg:3,repel:.3,every:1_000_000_000};
const make=(D,seed=17)=>new Geometry({...opts,D,seed});
const score=(v,u)=>u.reduce((s,z,i)=>s+Math.cos(T*(v[i]-z)),0);

function geometryCopy(g,D,transform,shiftBias=0,seed=123) {
 const result=make(D,seed);
 result.U=new Map([...g.U].map(([k,v])=>[k,transform(v)]));
 result.V=new Map([...g.V].map(([k,v])=>[k,transform(v)]));
 result.B=new Map([...g.B].map(([k,v])=>[k,v+shiftBias]));
 result.seen=g.seen.slice();result.n=g.n;
 result.r=random(seed);
 return result;
}
function compare(g,h,project,unshift=0) {
 let max=0,bias=0;
 for(const [symbol,p] of g.U){
  const desired=project(p),actual=h.U.get(symbol),wantV=project(g.V.get(symbol)),gotV=h.V.get(symbol);
  for(let j=0;j<desired.length;j++){
   max=Math.max(max,Math.abs(short(desired[j]-actual[j])),Math.abs(short(wantV[j]-gotV[j])));
  }
  bias=Math.max(bias,Math.abs(g.B.get(symbol)-(h.B.get(symbol)+unshift)));
 }
 return {phase:max,bias};
}
test("the original xD update is equivariant under phase changes, axis permutations and axis sign reversal, from 2D to 256D",()=>{
 const summaries=[];
 for(const D of [2,5,16,64,256]){
  const g=make(D,17);
  for(let t=1;t<5000;t++)g.learn(corpus[t-1],corpus[t]);
  // All axes relabeled with coprime multiplier and nonzero phase.
  const index=Array.from({length:D},(_,j)=>(D===5?2*j+1:7*j+3)%D);
  assert.equal(new Set(index).size,D);
  const signs=Array.from({length:D},(_,i)=>i%2?-1:1);
  const offsets=Array.from({length:D},(_,i)=>wrap(.11734+(i+1)*.19871));
  const tr=p=>index.map((j,i)=>wrap(signs[i]*p[j]+offsets[i]));
  const h=geometryCopy(g,D,tr,0,9191);
  g.r=random(9191);
  let valid=0;
  for(let t=5000;t<5300;t++){
   const x=corpus[t-1],y=corpus[t];if(!g.U.has(x)||!g.U.has(y))continue;
   g.learn(x,y);h.learn(x,y);valid++;
  }
  const err=compare(g,h,tr);
  const keys=[...g.U.keys()];let scoreErr=0,rankingDifference=0;
  for(let t=8000;t<8250;t++){
   const x=corpus[t-1],y=corpus[t],v=g.V.get(x),vp=h.V.get(x);
   if(!v||!g.U.has(y))continue;
   scoreErr=Math.max(scoreErr,Math.abs(score(v,g.U.get(y))-score(vp,h.U.get(y))));
   let best=-Infinity,best2=-Infinity,top=null,top2=null;
   for(const k of keys){
    const s=score(v,g.U.get(k)),q=score(vp,h.U.get(k));
    if(s>best){best=s;top=k;}
    if(q>best2){best2=q;top2=k;}
   }
   rankingDifference+=+(top!==top2);
  }
  assert.ok(valid>200);
  assert.ok(err.phase<1e-10,JSON.stringify({D,...err}));
  assert.ok(err.bias<1e-10,JSON.stringify({D,...err}));
  assert.ok(scoreErr<1e-10,JSON.stringify({D,scoreErr}));
  assert.equal(rankingDifference,0);
  summaries.push({dimension:D,continuedNativeUpdates:valid,maxPhaseError:err.phase,
   maxBiasError:err.bias,maxScoreError:scoreErr,changedPredictions:rankingDifference});
 }
 console.log("REAL_XD_GAUGE_SYMMETRY",JSON.stringify(summaries));
});
test("reversible 2D→8D→32D→128D→512D→1024D lifted Geometry.learn: expanded graphs can encode the same small dynamics EXACTLY",()=>{
 const g=make(2,17);
 for(let t=1;t<5000;t++)g.learn(corpus[t-1],corpus[t]);
 const Dlist=[8,32,128,512,1024];
 const expanded=Dlist.map(D=>{
   const tr=p=>p.concat(Array(D-2).fill(.271));
   const h=geometryCopy(g,D,tr,-(D-2),989);
   return {D,h,tr};
 });
 g.r=random(989);
 let valid=0;
 for(let t=5000;t<5200;t++){
  const x=corpus[t-1],y=corpus[t];
  if(!g.U.has(x)||!g.U.has(y))continue;
  g.learn(x,y);
  for(const o of expanded)o.h.learn(x,y);
  valid++;
 }
 assert.ok(valid>150);
 const reports=[];
 for(const {D,h,tr} of expanded){
   const e=compare(g,h,tr,D-2);
   let extra=0,scoreError=0;
   for(const [k,p] of g.U){
    for(let j=2;j<D;j++)extra=Math.max(extra,Math.abs(short(h.U.get(k)[j]-.271)),Math.abs(short(h.V.get(k)[j]-.271)));
    const x=g.V.get(k);
    scoreError=Math.max(scoreError,Math.abs(score(x,p)-(score(h.V.get(k),h.U.get(k))-(D-2))));
   }
   assert.ok(e.phase<1e-9,JSON.stringify({D,e}));
   assert.ok(e.bias<1e-9,JSON.stringify({D,e}));
   assert.ok(extra<1e-9);
   assert.ok(scoreError<1e-9,JSON.stringify({D,scoreError}));
   reports.push({dimension:D,liftedFrom:2,realNativeUpdateSteps:valid,maxPhaseError:e.phase,maxBiasError:e.bias,
    extraAxisDrift:extra,maxEffectiveScoreError:scoreError});
 }
 console.log("XD_REDUCIBLE_2D_LIFT",JSON.stringify(reports));
});
