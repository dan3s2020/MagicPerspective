// Read-only paired independent-new-world audit; no organism training.
// Provenance: both matched 360-world-body runs completed in GitHub Actions #43799511355.
import fs from 'node:fs';
import assert from 'node:assert/strict';
const read=x=>JSON.parse(fs.readFileSync('compared/original-braivour-unseen-polytope-'+x+
 '/native_zero_shot_truncated_5cell_'+x+'.json','utf8'));
const solo=read('tesseract-only'),mixed=read('mixed-4d');
assert.equal(solo.originalNativeTraining.worlds,360);
assert.equal(mixed.originalNativeTraining.worlds,360);
assert.equal(solo.independentWorldDetails.length,200);
assert.equal(mixed.independentWorldDetails.length,200);
assert.equal(solo.heldout.hiddenTrueC3NeverVisited,true);
assert.equal(mixed.heldout.hiddenTrueC3NeverVisited,true);
assert.equal(solo.heldout.originalBrainLearnedNothingFromHeldout,true);
assert.equal(mixed.heldout.originalBrainLearnedNothingFromHeldout,true);
const pairs=solo.independentWorldDetails.map((x,i)=>{
 const y=mixed.independentWorldDetails[i];
 assert.equal(x.seed,y.seed);assert.equal(x.family,'truncated-5-cell');
 assert.deepEqual(x.trueC3,y.trueC3);
 return {seed:x.seed,solo:x.scores,mixed:y.scores};
});
function rand(seed){let x=seed>>>0;return()=>{x^=x<<13;x^=x>>>17;x^=x<<5;return(x>>>0)/4294967296;};}
function paired(metric,sourceA,sourceB){
 const d=pairs.map(r=>sourceA(r)[metric]-sourceB(r)[metric]);
 const delta=d.reduce((s,x)=>s+x,0)/d.length,random=rand(20451111+metric.length+d.length);
 const boots=[],signs=[];
 for(let t=0;t<10000;t++){
  let s=0,q=0;
  for(let j=0;j<d.length;j++){
   s+=d[Math.floor(random()*d.length)];
   q+=(random()<.5?-1:1)*d[j];
  }
  boots.push(s/d.length);signs.push(q/d.length);
 }
 boots.sort((a,b)=>a-b);
 return {n:d.length,delta,clusterBootstrap95:[boots[250],boots[9749]],
   exploratoryPairedSignFlipP:(1+signs.filter(x=>Math.abs(x)>=Math.abs(delta)-1e-12).length)/10001};
}
const comparisons={
 mixedMinusSpecializedBaseExact:paired('exact',x=>x.mixed.base,x=>x.solo.base),
 mixedMinusSpecializedBaseF1:paired('f1',x=>x.mixed.base,x=>x.solo.base),
 mixedMinusSpecializedBaseBrier:paired('brier',x=>x.mixed.base,x=>x.solo.base),
 mixedMinusSpecializedFull9Exact:paired('exact',x=>x.mixed.full9,x=>x.solo.full9),
 mixedBaseMinusMixedFull9Exact:paired('exact',x=>x.mixed.base,x=>x.mixed.full9),
 mixedBaseMinusMixedFull9F1:paired('f1',x=>x.mixed.base,x=>x.mixed.full9)
};
const out={
 status:'PAIRED_200_ACTUAL_ZERO_SHOT_TRUNCATED_4SIMPLEX_ORIGINAL_BRAIN_RECONSTRUCTION',
 sourceWorkflowRun:43799511355,
 same200UnseenTrue4DPhysicalTargetObjects:true,
 bothTrainCount:360,
 nativeBodyOriginalCodePreserved:true,
 strictlyHeldoutUnseenPolytopeFamily:true,
 originalBrainNeverObservedHiddenTarget:true,
 comparisons,
 limitations:[
   'Only 4x4 binary raster of true 4D truncated simplex slice reconstructed, not a full 4D mesh',
   'No polytope family labels or oracle 4D coordinates fed to either native Brain',
   'The mixed body has prior training experience in a related 5-cell simplex but NOT this truncated 5-cell',
   'Exploratory after previous research, not preregistered multiple-comparison-adjusted inference'
 ]
};
fs.mkdirSync('runtime/dimensional_slices',{recursive:true});
fs.writeFileSync('runtime/dimensional_slices/paired_true_unseen_4d_shape.json',JSON.stringify(out,null,2));
console.log('TRUE_UNSEEN_4D_PAIRED_RESULT '+JSON.stringify(comparisons));
