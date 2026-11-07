import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {AligningGraph} from "../transcend/torus-aether/align.mjs";
import {Geometry} from "../transcend/torus-aether/concepts.mjs";
import {seeded} from "../research/local-axes/transport.mjs";

// This test uses the ACTUAL V17 AligningGraph and Geometry classes, not a
// mock text generator or modified production sampler. ReadFrozen teacher-forces
// heldout CONTEXT only; the target current character is never passed to scores.
const raw=fs.readFileSync(new URL("../docs/TORUS_AETHER_ABC_20261104.md",import.meta.url),"utf8")
 .replace(/[^\x20-\x7e\n\t]/g," ").slice(0,47000);
const bytes=Uint8Array.from(raw, c=>c.charCodeAt(0));
const trainingEnd=23000,validationEnd=30000,testEnd=Math.min(38000,bytes.length);
const lambdas=[0,.02,.05,.1,.2,.4,.8,1.5,3],D=5;
const E=1e-12,TWO_PI=2*Math.PI;
const distance=(v,u)=>u.reduce((sum,x,i)=>sum+Math.cos(TWO_PI*(v[i]-x)),0)/Math.sqrt(D);
function permutation(map,seed=93){
 const keys=[...map.keys()],values=keys.map(k=>map.get(k)),rng=seeded(seed);
 for(let i=values.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[values[i],values[j]]=[values[j],values[i]];}
 return new Map(keys.map((k,i)=>[k,values[i]]));
}
function evaluate(align,geo,words,shuffled){
 const hits=Array(lambdas.length).fill(0),nullHits=Array(lambdas.length).fill(0);
 const divergences=Array(lambdas.length).fill(0);
 let total=0,native=0,geometryOnly=0,hasCandidate=0;
 const predict=(d,v,coords,lambda)=>{
  let score=-Infinity,arg=32;
  for(const [y,w] of d){
    const U=coords.get(y);
    const signal=v&&U?distance(v,U):0;
    const s=Math.log(w+E)+lambda*signal;
    if(s>score){score=s;arg=y;}
  }
  return arg;
 };
 align.readFrozen(words,(i,y,g,d)=>{
   const last=i>0?words[i-1]:null,v=last===null?null:geo.V.get(last);
   total++;native+=+(g===y);hasCandidate+=+d.has(y);
   const pure=(()=>{let s=-Infinity,c=32;for(const [z]of d){
     const q=v&&geo.U.get(z)?distance(v,geo.U.get(z)):-Infinity;
     if(q>s){s=q;c=z;}
   }return c;})();
   geometryOnly+=+(pure===y);
   for(let j=0;j<lambdas.length;j++){
     const p=predict(d,v,geo.U,lambdas[j]),pn=predict(d,v,shuffled,lambdas[j]);
     hits[j]+=+(p===y);nullHits[j]+=+(pn===y);
     divergences[j]+=+(p!==g);
   }
 },{T:0});
 return {n:total,native:native/total,geometryOnly:geometryOnly/total,
  targetInNativeCandidates:hasCandidate/total,
  options:lambdas.map((lambda,i)=>({lambda,accuracy:hits[i]/total,
    scrambledGeometryAccuracy:nullHits[i]/total,
    predictedNextDifferentFromOriginal:divergences[i]/total}))};
}
test("native AligningGraph: does 5D geometry add CAUSAL signal to real held-out text?",()=>{
 assert.ok(bytes.length>=testEnd&&testEnd>validationEnd,"need separated training, validation and test");
 const align=new AligningGraph();
 const geo=new Geometry({D,neg:3,lr:.03,repel:.3,every:1e9,seed:17});
 const start=performance.now();
 for(let i=0;i<trainingEnd;i++){
   align.live(bytes[i]);
   if(i>0)geo.learn(bytes[i-1],bytes[i]);
 }
 const trainedMs=performance.now()-start;
 const shuffled=permutation(geo.U);
 const validation=evaluate(align,geo,bytes.slice(trainingEnd,validationEnd),shuffled);
 const selected=validation.options.slice().sort((a,b)=>b.accuracy-a.accuracy||a.lambda-b.lambda)[0].lambda;
 // COMMIT one value based only on validation. Do not tune from test.
 const held=evaluate(align,geo,bytes.slice(validationEnd,testEnd),shuffled);
 const chosen=held.options.find(v=>v.lambda===selected),original=held.options[0];
 const result={trainedCharacters:trainingEnd,validationN:validation.n,testN:held.n,
  nativeTrainingMs:+trainedMs.toFixed(1),D,
  bestLambdaFromValidation:selected,
  originalNativeTop1:original.accuracy,
  geometryOnly:held.geometryOnly,
  coverage:held.targetInNativeCandidates,
  selectedHybridTop1:chosen.accuracy,
  causalGeometryPermutationControl:chosen.scrambledGeometryAccuracy,
  changedNativeChoices:chosen.predictedNextDifferentFromOriginal,
  improvedNative:chosen.accuracy>original.accuracy,
  validation:validation.options,testAllWithoutRetuning:held.options,
  noArchitectureIntegration:true,
  claim:"Only native next-character candidate reranking; NOT semantic solution-shape navigation"};
 assert.ok(Math.abs(original.accuracy-held.native)<1e-12);
 assert.equal(held.n,testEnd-validationEnd);
 console.log("ACTUAL_NATIVE_V17_TEXT_CAUSAL_GEOMETRY_TEST",JSON.stringify(result));
});
