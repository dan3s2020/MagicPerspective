// Read-only geometry/evaluator audit: NOT an organism, predictor, or teacher.
// Quantifies the empirical upper bound on exact 4x4 C3 reconstruction by
// selecting any exact *previously lived training* C3 template.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {frames} from './physical_sections.mjs';
const TRAIN=Array.from({length:360},(_,i)=>2026111601+i*613);
const tests={
 active: Array.from({length:200},(_,i)=>2026900001+i*1009),
 fullNine: Array.from({length:200},(_,i)=>2027200001+i*1009),
 gestalt: Array.from({length:200},(_,i)=>2027800001+i*991)
};
const toBits=r=>r.map(x=>+(x>48)).join('');
function masks(seed){
 const f=frames(seed);
 const data={};
 for(let i=0;i<5;i++){
   data['A'+(i+1)]=toBits(f[i].A);
   data['C'+(i+1)]=toBits(f[i].C);
 }
 return data;
}
const bank=TRAIN.map(masks),library=new Map();
for(const b of bank)library.set(b.C3,(library.get(b.C3)||0)+1);
const results={};
for(const [group,seeds] of Object.entries(tests)){
 assert.equal(new Set([...TRAIN,...seeds]).size,TRAIN.length+seeds.length);
 let supported=0,distinct=new Set(),all9Exact=0,aliases=0, nearestSum=0,
     sameInputDifferentHidden=0;
 for(const seed of seeds){
  const x=masks(seed),visible=Object.keys(x).filter(k=>k!=='C3');
  distinct.add(x.C3);supported+=+library.has(x.C3);
  let nearest=Infinity,exactVisible=[];
  for(const b of bank){
   let diff=0;
   for(const k of visible)for(let i=0;i<16;i++)diff+=+(x[k][i]!==b[k][i]);
   if(diff<nearest){nearest=diff;exactVisible=[];}
   if(diff===nearest)exactVisible.push(b);
  }
  nearestSum+=nearest;
  all9Exact+=+(nearest===0);
  if(nearest===0){
   const outcomes=new Set(exactVisible.map(b=>b.C3));
   aliases+=+(outcomes.size>1);
   sameInputDifferentHidden+=+(outcomes.size>1&&!outcomes.has(x.C3));
  }
 }
 results[group]={worlds:seeds.length,trainUniqueFullTargets:library.size,
   heldoutUniqueTargetMasks:distinct.size,
   hiddenTargetPresentInTraining: supported,
   exactTemplateOracleSupportFraction:supported/seeds.length,
   heldoutFullNineViewExactObservedSignatureInTraining:all9Exact,
   heldoutFullyMatchingInputsWithDifferentStoredHiddenTargets:aliases,
   meanNearestTrainingAll9InputHamming:nearestSum/seeds.length,
   // The value is only an upper bound for a predictor forced to choose from
   // the native atlas templates. It is not an achievable actual prediction.
   exactMemoryTemplateSelectionCeilingIsEvaluatorOnly:true
 };
}
fs.mkdirSync('runtime/dimensional_slices',{recursive:true});
fs.writeFileSync('runtime/dimensional_slices/native_gestalt_support_audit.json',JSON.stringify({
 status:'EVALUATOR_ONLY_SHAPE_MEMORY_SUPPORT_AND_UNSEEN_IDENTIFIABILITY_CHECK',
 trainCount:TRAIN.length,results
},null,2));
console.log('NATIVE_ATLAS_GEOMETRIC_SUPPORT_AUDIT '+JSON.stringify(results));
