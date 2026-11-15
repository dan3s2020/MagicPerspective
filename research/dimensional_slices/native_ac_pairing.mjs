// True geometric experiment: one 4D tesseract, multiple 3D hyperplane sections,
// two 2D perspectives A/C. The ORIGINAL V17 Brain lives sensor signals and
// autonomously predicts unseen C signals from observed A signals.
// No new neural predictor, oracle target at inference, fake learned 4D coordinates,
// or modification to existing Brain/Discoverer/other agents' experiments.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {Brain} from '../../v17/transcend/torus-aether/devour/brain.mjs';

const RULES={depth:2,fold:false,budEvery:300,maxWires:12,maxL:8,empty:false};
const VERTICES=Array.from({length:16},(_,m)=>
  Array.from({length:4},(_,k)=>m&(1<<k)?1:-1));
const EDGES=[];
for(let i=0;i<16;i++)for(let axis=0;axis<4;axis++){
  const j=i^(1<<axis);if(i<j)EDGES.push([i,j]);
}
assert.equal(EDGES.length,32);
function random(seed){
  let x=seed>>>0;
  return()=>{x^=x<<13;x^=x>>>17;x^=x<<5;return(x>>>0)/4294967296;};
}
function rotate(v,a,b,t){
  const p=v.slice(),c=Math.cos(t),s=Math.sin(t);
  p[a]=c*v[a]-s*v[b];p[b]=s*v[a]+c*v[b];
  return p;
}
function orientation(seed){
  const r=random(seed);
  // Fully specified 4D rotations: changing order of 4D planes generally
  // changes the projection; independent of the sensor learner.
  return [[0,3,.18+1.14*r()],[1,3,-.9+1.8*r()],
          [2,3,-.7+1.4*r()],[0,2,-.8+1.6*r()]];
}
function slice4(angles,level){
  assert.ok(Number.isInteger(level)&&level>=0&&level<=4);
  const v=VERTICES.map(p=>angles.reduce((q,[a,b,t])=>rotate(q,a,b,t),p));
  const maxW=Math.max(...v.map(p=>Math.abs(p[3])));
  const h=(level-2)*.35*maxW;
  const samples=[];
  for(const [a,b] of EDGES){
    const u=v[a],w=v[b],delta=w[3]-u[3];
    if(Math.abs(delta)<1e-12){
      if(Math.abs(u[3]-h)<1e-9)samples.push(u.slice(0,3),w.slice(0,3));
      continue;
    }
    const t=(h-u[3])/delta;
    if(t>=-1e-10&&t<=1+1e-10){
      const s=Math.max(0,Math.min(1,t));
      samples.push([0,1,2].map(k=>u[k]+s*(w[k]-u[k])));
    }
  }
  const seen=new Set();
  return samples.filter(p=>{
    const key=p.map(x=>Math.round(x*1e7)).join(',');
    if(seen.has(key))return false;seen.add(key);return true;
  });
}
function sensor(points,view){
  // Real 2D quantized views of actual geometric cross-section points.
  // A projects primarily XY; C projects primarily ZY. No level/angle/seed
  // enters the Brain or its predicted output.
  const raster=new Array(16).fill(0);
  for(const p of points){
    const x=view==='A'?p[0]+.27*p[2]:p[2]-.22*p[0];
    const y=view==='A'?p[1]-.13*p[2]:p[1]+.19*p[0];
    const px=Math.max(0,Math.min(3,Math.floor((x+2.4)/4.8*4)));
    const py=Math.max(0,Math.min(3,Math.floor((y+2.4)/4.8*4)));
    raster[py*4+px]=Math.min(3,raster[py*4+px]+1);
  }
  // Physical sensor alphabet 48..51; empty and occupied cells counted separately.
  return raster.map(x=>48+x);
}
function frames(seed){
  const angles=orientation(seed);
  return Array.from({length:5},(_,level)=>{
    const cut=slice4(angles,level);
    return {level,pointCount:cut.length,A:sensor(cut,'A'),C:sensor(cut,'C')};
  });
}
function stream(brain,frameset,order=null){
  for(let i=0;i<frameset.length;i++){
    const f=frameset[i],c=order?order[i]:f.C;
    for(const y of [94,65,...f.A,67,...c,124])brain.live(y);
  }
}
function sequenceData(seedStart,count){
  const r=[];
  for(let i=0;i<count;i++){
    const g=frames(seedStart+i*919);
    for(const f of g)r.push({seed:seedStart+i*919,...f});
  }
  return r;
}
function predictFull(brain,A){
  // NO teacher forcing: predicted symbols feed the next prediction.
  const past=[94,65,...A,67],p=[],confidence=[];
  for(let i=0;i<16;i++){
    const logits=brain.predict(past);
    let best=0;
    for(let j=1;j<logits.length;j++)if(logits[j]>logits[best])best=j;
    p.push(best);confidence.push(logits[best]);past.push(best);
  }
  return {p,confidence};
}
function summarize(pred,reference){
  let correct=0,tp=0,fp=0,fn=0,unsupported=0;
  for(let k=0;k<16;k++){
    correct+=+(pred[k]===reference[k]);
    const pa=pred[k]>=49&&pred[k]<=51,ra=reference[k]>48;
    tp+=+(pa&&ra);fp+=+(pa&&!ra);fn+=+(!pa&&ra);
    unsupported+=+(pred[k]<48||pred[k]>51);
  }
  return {correct,exact:+(correct===16),f1:2*tp+fp+fn?2*tp/(2*tp+fp+fn):1,
          unsupported,mae:pred.reduce((s,p,k)=>s+Math.abs(p-reference[k]),0)/16};
}
function evaluate(brain,samples){
  const before={lived:brain.lived,episodes:brain.disc.episodes,
                links:brain.constructedPaths.links.observations};
  let correct=0,exact=0,f1=0,unsupported=0,mae=0;
  const previews=[];
  for(const f of samples){
    const {p,confidence}=predictFull(brain,f.A);
    const s=summarize(p,f.C);
    correct+=s.correct;exact+=s.exact;f1+=s.f1;
    unsupported+=s.unsupported;mae+=s.mae;
    if(previews.length<5)previews.push({seed:f.seed,level:f.level,
      actualA:f.A,actualC:f.C,predictedC:p,
      predictedConfidence:confidence.map(x=>+x.toFixed(5)),metrics:s});
  }
  assert.equal(brain.lived,before.lived,'Heldout test changed Brain lived steps');
  assert.equal(brain.disc.episodes,before.episodes,'Heldout test changed Discoverer');
  assert.equal(brain.constructedPaths.links.observations,before.links,
               'Heldout test changed learned physical transition graph');
  const n=samples.length;
  return {n,cellAccuracy:correct/(n*16),fullShapeAccuracy:exact/n,
          occupancyF1:f1/n,unsupportedFraction:unsupported/(n*16),
          symbolMAE:mae/n,previews};
}
function identityControl(samples){
  const n=samples.length;
  const rows=samples.map(summarizeIdentity);
  return {n,cellAccuracy:rows.reduce((a,r)=>a+r.correct,0)/(16*n),
    fullShapeAccuracy:rows.reduce((a,r)=>a+r.exact,0)/n,
    occupancyF1:rows.reduce((a,r)=>a+r.f1,0)/n,
    unsupportedFraction:0,
    symbolMAE:rows.reduce((a,r)=>a+r.mae,0)/n};
}
function summarizeIdentity(s){return summarize(s.A,s.C);}
const train=sequenceData(2026111601,30),test=sequenceData(2026190001,25);
assert.equal(train.length,150);assert.equal(test.length,125);
assert.ok(!test.some(x=>train.some(y=>x.seed===y.seed)),'Train/heldout source leakage');
const paired=new Brain({rules:RULES,seed:1601});
const mismatched=new Brain({rules:RULES,seed:1601});
const wrong=train.map((r,i)=>train[(i+73)%train.length].C);
stream(paired,train);
stream(mismatched,train,wrong);
const pairedResult=evaluate(paired,test);
const mismatchedResult=evaluate(mismatched,test);
const identityResult=identityControl(test);
const ACGenuineDifferent=test.filter(x=>x.A.some((v,i)=>v!==x.C[i])).length;
const diversity=new Set(test.map(x=>x.C.join(','))).size;
assert.ok(ACGenuineDifferent>0&&diversity>5,'Physically degenerate test shapes');
const result={
 status:'ACTUAL_ORIGINAL_V17_BRAIN_TEST_ON_TRUE_4D_TESSERACT_SLICES',
 geometry:{kind:'4D tesseract',vertices:16,edges:32,
  section:'3D intersection with w=h rotated 4D hyperplanes',
  observed:'4x4 two-dimensional projected raster of actual 3D slice vertices',
  dimensionsInWorld:4,availableToBrain:'only sensory stream (A then C), no hidden coordinates or seed',
  numberOfDepths:5,AandCComplementary:true,
  ambiguousInversePossible:true},
 organism:'Original unchanged V17 Brain.live() and Brain.predict() with persistent native Discoverer in same Brain',
 training:{differentLatentObjects:30,observedPairedViews:train.length,
   pairedLivedSymbols:paired.lived,shuffledLivedSymbols:mismatched.lived},
 heldout:{differentLatentObjects:25,unseenSlicedViews:test.length,
  distinctCSignatures:diversity,nonidenticalAandC:ACGenuineDifferent,
  frozen:'yes, autoregressive first unknown C symbol then all subsequent unknown C symbols'},
 matchedNativeBrain:pairedResult,
 shuffledNativeBrain:mismatchedResult,
 rawAIdentityBaseline:identityResult,
 differences:{matchedMinusShuffledCellAccuracy:
  pairedResult.cellAccuracy-mismatchedResult.cellAccuracy,
  matchedMinusIdentityCellAccuracy:pairedResult.cellAccuracy-identityResult.cellAccuracy},
 interpretation:'Only a measured predictive-slice experiment; no success/novelty claim without performance above controls. No full latent-body reconstruction or GGUF assimilation is demonstrated.',
 limitations:['4x4 raster is a coarse measurement, not a full optical image or volume',
  'Physical shape rendered by world code, not discovered as 4D coordinates by Brain',
  'Train and heldout share the same geometric generator but have distinct unseen rotations',
  'No quantum state or human-defined target of intelligence observed']
};
fs.mkdirSync('runtime/dimensional_slices',{recursive:true});
fs.writeFileSync('runtime/dimensional_slices/real_4d_native_ac.json',
  JSON.stringify(result,null,2));
console.log('REAL_4D_NATIVE_AC_RESULT '+JSON.stringify({
 train:result.training,heldout:result.heldout,
 matched:pairedResult.cellAccuracy,
 shuffled:mismatchedResult.cellAccuracy,
 identity:identityResult.cellAccuracy,
 difference:result.differences,
 exactMatched:pairedResult.fullShapeAccuracy,
 occupancyF1Matched:pairedResult.occupancyF1,
 unsupportedFraction:pairedResult.unsupportedFraction
}));
