import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {Geometry} from "../transcend/torus-aether/concepts.mjs";

// Read-only experiment on the unchanged MagicPerspective Geometry.learn().
// A "direction" is a signed component of the learned V(previous)->U(next) displacement.
// This is an observed symbol relation, NOT yet a learned action of a semantic text state.
const corpus=fs.readFileSync(new URL("../docs/TORUS_AETHER_ABC_20261104.md",import.meta.url),"utf8")
 .replace(/[^\x20-\x7e\n\t]/g," ").slice(0,47000);
const chars=Array.from(corpus,c=>c.charCodeAt(0));
const wrap=x=>x-Math.round(x), C=Math.PI*2;
const rng=seed=>()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
const trainEnd=35000;

test("real V17 5D symbol relations decompose into signed directions and all 10 rotation planes",()=>{
 const g=new Geometry({D:5,lr:.03,neg:3,repel:.3,every:1000000000,seed:17});
 for(let i=1;i<trainEnd;i++)g.learn(chars[i-1],chars[i]);
 const planes=[];for(let i=0;i<5;i++)for(let j=i+1;j<5;j++)planes.push([i,j]);
 assert.equal(planes.length,10);
 let measured=0, multi=0, rotChecks=0, maxReconError=0, maxInverseError=0, maxNormError=0;
 const means=Array(5).fill(0);
 for(let t=trainEnd;t<chars.length;t++){
   const from=g.V.get(chars[t-1]),to=g.U.get(chars[t]);
   if(!from||!to)continue;
   const d=from.map((v,i)=>wrap(to[i]-v));
   for(let i=0;i<5;i++){
     means[i]+=Math.abs(d[i]);
     maxReconError=Math.max(maxReconError,Math.abs(wrap(from[i]+d[i]-to[i])));
   }
   if(d.filter(v=>Math.abs(v)>.05).length>=2)multi++;
   // Rotations are mathematical candidate operators, not already actions of this model.
   const [i,j]=planes[t%planes.length],theta=.49,cos=Math.cos(theta),sin=Math.sin(theta);
   const ri=cos*d[i]-sin*d[j],rj=sin*d[i]+cos*d[j];
   const xi=cos*ri+sin*rj,xj=-sin*ri+cos*rj;
   maxInverseError=Math.max(maxInverseError,Math.abs(xi-d[i]),Math.abs(xj-d[j]));
   maxNormError=Math.max(maxNormError,Math.abs((ri*ri+rj*rj)-(d[i]*d[i]+d[j]*d[j])));
   rotChecks++;measured++;
 }
 assert.ok(measured>11000);
 assert.ok(maxReconError<1e-11);
 assert.ok(maxInverseError<1e-12);
 assert.ok(maxNormError<1e-12);
 console.log("FIVE_DIMENSIONAL_DIRECTIONS",JSON.stringify({
  heldOut:measured,cardinalSignedDirections:10,independentRotationPlanes:10,
  meanAbsoluteTangentMovement:means.map(x=>x/measured),
  multiAxisFraction:multi/measured,
  maxReconError,maxInverseError,maxNormError
 }));
});

test("which actual 5D axes carry held-out predictive signal? full vs leave-one-axis-out vs shuffled",()=>{
 const g=new Geometry({D:5,lr:.03,neg:3,repel:.3,every:1000000000,seed:17});
 for(let i=1;i<trainEnd;i++)g.learn(chars[i-1],chars[i]);
 const alphabet=[...g.U.keys()],shuffled=alphabet.map(x=>g.U.get(x).slice()),rand=rng(1164);
 for(let i=shuffled.length-1;i>0;i--){const j=Math.floor(rand()*(i+1));[shuffled[i],shuffled[j]]=[shuffled[j],shuffled[i]];}
 const shuffledU=new Map(alphabet.map((c,i)=>[c,shuffled[i]]));
 let samples=0,fullHits=0,randomHits=0;
 const leaveOut=Array(5).fill(0),single=Array(5).fill(0),fullScores=Array(5).fill(0);
 const changes=Array(5).fill(0);
 for(let t=trainEnd;t<chars.length;t++){
   const from=g.V.get(chars[t-1]),actual=chars[t];
   if(!from||!g.U.has(actual))continue;
   const rank=Array.from({length:5},()=>({value:-Infinity,char:-1}));
   const singleRanks=Array.from({length:5},()=>({value:-Infinity,char:-1}));
   let best=-Infinity,pred=null,randBest=-Infinity,randPred=null;
   for(const c of alphabet){
     const to=g.U.get(c),parts=Array.from({length:5},(_,d)=>Math.cos(C*(from[d]-to[d])));
     const sum=parts.reduce((s,x)=>s+x,0);
     if(sum>best){best=sum;pred=c;}
     for(let d=0;d<5;d++){
       const score=sum-parts[d];
       if(score>rank[d].value)rank[d]={value:score,char:c};
       if(parts[d]>singleRanks[d].value)singleRanks[d]={value:parts[d],char:c};
     }
     const shuffle=shuffledU.get(c),perm=from.reduce((s,v,d)=>s+Math.cos(C*(v-shuffle[d])),0);
     if(perm>randBest){randBest=perm;randPred=c;}
   }
   samples++;fullHits+=+(pred===actual);randomHits+=+(randPred===actual);
   for(let d=0;d<5;d++){
     leaveOut[d]+=+(rank[d].char===actual);
     single[d]+=+(singleRanks[d].char===actual);
     changes[d]+=+(rank[d].char!==pred);
     fullScores[d]+=Math.cos(C*(from[d]-g.U.get(actual)[d]));
   }
 }
 const accuracy=fullHits/samples,shuffledAccuracy=randomHits/samples;
 assert.ok(samples>11000);
 assert.ok(accuracy>shuffledAccuracy+.03);
 const report={heldOut:samples,full5DAccuracy:accuracy,shuffled5DAccuracy:shuffledAccuracy,
  axisLeaveOutAccuracy:leaveOut.map(v=>v/samples),axisAloneAccuracy:single.map(v=>v/samples),
  fractionOfDecisionsChangedByAblation:changes.map(v=>v/samples),
  axisMeanTrueTransitionCosine:fullScores.map(v=>v/samples)};
 console.log("WHICH_AXES_ACTUALLY_MATTER",JSON.stringify(report));
});
