import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {AligningGraph} from "../transcend/torus-aether/align.mjs";
import {Geometry} from "../transcend/torus-aether/concepts.mjs";
import {seeded} from "../research/local-axes/transport.mjs";

// This is an explicit attempt to fix the crucial mismatch:
// previous V17 geometry encodes SYMBOLS, while a language labyrinth needs
// GEOMETRY OF CONTEXTUAL STATES. Train native Geometry.learn on observed
// context→next-character transitions, then try a frozen, causal hybrid.
// Original Brain and AligningGraph remain unchanged.
const corpus=fs.readFileSync(new URL("../docs/TORUS_AETHER_ABC_20261104.md",import.meta.url),"utf8")
 .replace(/[^\x20-\x7e\n\t]/g," ").slice(0,47000);
const bytes=Uint8Array.from(corpus,c=>c.charCodeAt(0));
const trainEnd=23000,valEnd=30000,testEnd=38000;
const scales=[1,2,3,4],lambdas=[0,.02,.05,.1,.2,.4,.8,1.5,3],D=5;
const key=(bytes,i,n)=>{
 if(i<n)return null;
 let s="context:"+n+":";
 for(let k=i-n;k<i;k++)s+=String.fromCharCode(bytes[k]);
 return s;
};
const angle=(u,v)=>u.reduce((s,x,i)=>s+Math.cos(2*Math.PI*(x-v[i])),0)/Math.sqrt(D);
function scramble(map,seed){
 const k=[...map.keys()],v=k.map(x=>map.get(x)),rng=seeded(seed);
 for(let i=v.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[v[i],v[j]]=[v[j],v[i]];}
 return new Map(k.map((x,i)=>[x,v[i]]));
}
function collect(align,models,txt,shuffled){
 const hits=Array.from({length:scales.length},()=>Array(lambdas.length).fill(0));
 const randomHits=Array.from({length:scales.length},()=>Array(lambdas.length).fill(0));
 const coverage=Array(scales.length).fill(0);
 let total=0,baseline=0;
 align.readFrozen(txt,(i,gold,native,d)=>{
   total++;baseline+=+(gold===native);
   const options=[...d];
   for(let si=0;si<scales.length;si++){
     const model=models[si],n=scales[si],k=key(txt,i,n);
     const state=k===null?null:model.V.get(k);
     if(state)coverage[si]++;
     const vals=options.map(([y,weight])=>{
       const u=model.U.get(y),s=state&&u?angle(state,u):0;
       const ur=shuffled[si].get(y),r=state&&ur?angle(state,ur):0;
       return {y,l:Math.log(weight+1e-12),s,r};
     });
     for(let li=0;li<lambdas.length;li++){
       const lambda=lambdas[li],predict=axis=>{
         let best=-Infinity,winner=32;
         for(const entry of vals){
           const score=entry.l+lambda*entry[axis];
           if(score>best){best=score;winner=entry.y;}
         }
         return winner;
       };
       hits[si][li]+=+(predict("s")===gold);
       randomHits[si][li]+=+(predict("r")===gold);
     }
   }
 },{T:0});
 return {total,baseline:baseline/total,
   coverage:coverage.map(x=>x/total),
   combinations:scales.flatMap((scale,si)=>lambdas.map((lambda,li)=>({
     scale,lambda,
     accuracy:hits[si][li]/total,
     permutedAccuracy:randomHits[si][li]/total
   })))};
}
test("REAL V17 state-geometry perspective: does local 1–4 symbol CONTEXT improve frozen native text prediction?",()=>{
 const align=new AligningGraph(),models=scales.map((n,i)=>new Geometry({D,neg:3,lr:.03,repel:.3,every:1e9,seed:17+i}));
 const started=performance.now();
 for(let i=0;i<trainEnd;i++){
   align.live(bytes[i]);
   for(let j=0;j<models.length;j++){
     const context=key(bytes,i,scales[j]);
     if(context!==null)models[j].learn(context,bytes[i]);
   }
 }
 const durationMs=performance.now()-started;
 const permutations=models.map((g,i)=>scramble(g.U,85+i));
 const val=collect(align,models,bytes.slice(trainEnd,valEnd),permutations);
 // Fixed selector chooses on VALIDATION ONLY; ties prefer lambda=0.
 const selected=val.combinations.slice().sort((a,b)=>b.accuracy-a.accuracy||a.lambda-b.lambda||a.scale-b.scale)[0];
 const test=collect(align,models,bytes.slice(valEnd,testEnd),permutations);
 const chosen=test.combinations.find(x=>x.scale===selected.scale&&x.lambda===selected.lambda);
 assert.equal(val.total,valEnd-trainEnd);
 assert.equal(test.total,testEnd-valEnd);
 assert.ok(Math.abs(test.baseline-test.combinations[0].accuracy)<1e-12);
 console.log("NATIVE_V17_CONTEXT_AXIS_GEOMETRY_HYPOTHESIS",JSON.stringify({
  train:trainEnd,validation:val.total,heldout:test.total,trainingMs:Math.round(durationMs),
  original:val.baseline,selectedOnValidation:selected,
  heldoutOriginal:test.baseline,heldoutSelected:chosen.accuracy,
  heldoutPermuted:chosen.permutedAccuracy,
  improvement:chosen.accuracy-test.baseline,contextCoverage:test.coverage,
  heldoutByScaleAndLambda:test.combinations,
  conclusion:chosen.accuracy>test.baseline?"positive-on-one-heldout-set-not-yet-robust":"no-independent-evidence-of-text-improvement",
  explicitTextGoalsSolved:false,productionChanged:false
 }));
});
