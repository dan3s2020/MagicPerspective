// READ-ONLY paired independent-world statistical comparator for the TWO
// already completed original Brain jobs. No training or new predictions.
import fs from 'node:fs';
import assert from 'node:assert/strict';
const path=x=>'compare_input/original-braivour-4d-'+x+
  '/native_mixed_4d_comparison_'+x+'.json';
const a=JSON.parse(fs.readFileSync(path('tesseract-only'),'utf8'));
const b=JSON.parse(fs.readFileSync(path('mixed-4d'),'utf8'));
assert.equal(a.originalNativeTraining.worlds,360);
assert.equal(b.originalNativeTraining.worlds,360);
assert.equal(a.originalNativeTraining.mode,'tesseract-only');
assert.equal(b.originalNativeTraining.mode,'mixed-4d');
assert.equal(a.independentWorldDetails.length,400);
assert.equal(b.independentWorldDetails.length,400);
assert.equal(a.heldout.hiddenTrueC3NeverVisited,true);
assert.equal(b.heldout.hiddenTrueC3NeverVisited,true);
assert.equal(a.heldout.originalBrainLearnedNothingFromHeldout,true);
assert.equal(b.heldout.originalBrainLearnedNothingFromHeldout,true);
const pairs=a.independentWorldDetails.map((r,i)=>{
  const s=b.independentWorldDetails[i];
  assert.equal(r.seed,s.seed);
  assert.equal(r.family,s.family);
  assert.deepEqual(r.trueC3,s.trueC3);
  return {seed:r.seed,family:r.family,control:r.scores,mixed:s.scores};
});
const groups={all:pairs};
for(const family of ['tesseract','16-cell','5-cell','24-cell'])
  groups[family]=pairs.filter(x=>x.family===family);
function random(seed){let x=seed>>>0;return()=>{x^=x<<13;x^=x>>>17;x^=x<<5;return(x>>>0)/4294967296;};}
function paired(group,method,metric){
 const deltas=group.map(x=>x.mixed[method][metric]-x.control[method][metric]);
 const observed=deltas.reduce((s,x)=>s+x,0)/deltas.length;
 const rand=random(203011+method.length*81+metric.length*97+deltas.length);
 const boot=[],flips=[];
 for(let k=0;k<10000;k++){
   let sum=0,sgn=0;
   for(let j=0;j<deltas.length;j++){
     sum+=deltas[Math.floor(rand()*deltas.length)];
     sgn+=(rand()<.5?-1:1)*deltas[j];
   }
   boot.push(sum/deltas.length);
   flips.push(sgn/deltas.length);
 }
 boot.sort((x,y)=>x-y);
 return {n:deltas.length,deltaMixedMinusControl:observed,
   bootstrap95:[boot[250],boot[9749]],
   exploratoryPairedTwoSidedSignFlipP:(1+flips.filter(x=>Math.abs(x)>=Math.abs(observed)-1e-12).length)/10001};
}
const results=Object.fromEntries(Object.entries(groups).map(([family,group])=>[
 family,{
   n:group.length,
   full9Exact:paired(group,'full9','exact'),
   full9F1:paired(group,'full9','f1'),
   full9Brier:paired(group,'full9','brier'),
   baseExact:paired(group,'base','exact')
 }
]));
const out={
 status:'READ_ONLY_VERIFIED_PAIRED_ORIGINAL_BRAIVOUR_TESSERACT_ONLY_VS_MIXED_4D',
 sourceWorkflowRun:43798852508,
 identicalUnseenTargetWorlds:true,
 nativeOrganismSourceUnmodified:true,
 eachOriginalBrainLived360Worlds:true,
 originalMotorTrainingUnchanged:true,
 metricsPairedAtIndependentWorldLevel:true,
 familyResults:results,
 caveats:[
   'Mixed body trained on all 4 evaluated families and is not evidence of zero-shot novel-family transfer',
   'Mixed body saw 90 vs control 360 tesseracts: specialization tradeoff is expected',
   'Exact is full 4x4 binary C3 raster, not a 3D mesh or reconstructed 4D latent state',
   'Exploratory p-values after previous experiments: not prospective registration'
 ]
};
fs.mkdirSync('runtime/dimensional_slices',{recursive:true});
fs.writeFileSync('runtime/dimensional_slices/paired_mixed_4d_statistical_audit.json',JSON.stringify(out,null,2));
console.log('PAIRED_NATIVE_4D_BODY_MIXED_RESULT '+JSON.stringify(results));
