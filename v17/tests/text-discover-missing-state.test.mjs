import test from "node:test";
import assert from "node:assert/strict";
import {StateDependentTextAxes} from "../research/text-hypermaze/state-dependent-axes.mjs";
import {recordObservedTrajectory,learnMissingPerspective,
  evaluateOnUnseen,pathFeatures,incrementalPathMemory}
  from "../research/text-hypermaze/discover-missing-state.mjs";
import {tokenizeObservation} from "../transcend/torus-aether/worlds/observed-transformations.mjs";

const trainedExamples={
  noncommuting:[
    ["2 @ 3 ~ 6.","3 @ 3 ~ 9."],
    ["2 @ 4 ~ 8.","3 @ 4 ~ 12."],
    ["2 @ 3 ~ 6.","2 @ 4 ~ 10."],
    ["3 @ 3 ~ 9.","3 @ 4 ~ 15."]
  ],
  integrable:[
    ["2 * 3 = 6.","3 * 3 = 9."],
    ["2 * 4 = 8.","3 * 4 = 12."],
    ["2 * 3 = 6.","2 * 4 = 8."],
    ["3 * 3 = 9.","3 * 4 = 12."],
    ["3 * 4 = 12.","4 * 4 = 16."],
    ["2 * 4 = 8.","2 * 5 = 10."]
  ],
  strongerNoncommuting:[
    ["2 @ 3 ~ 6.","3 @ 3 ~ 9."],
    ["2 @ 4 ~ 12.","3 @ 4 ~ 16."],
    ["2 @ 3 ~ 6.","2 @ 4 ~ 12."],
    ["3 @ 3 ~ 9.","3 @ 4 ~ 18."]
  ]
};
const seedRandom=initial=>()=>{initial=(Math.imul(initial,1664525)+1013904223)>>>0;return initial/4294967296;};
const fieldFor=kind=>{
 const field=new StateDependentTextAxes({maxValue:200000,maxExpanded:10000});
 for(const [a,b] of trainedExamples[kind])
   assert.equal(field.observePair(a,b).learned,true);
 return field;
};
function samples(field,kind,{n,seed,lower,span,minLength,variation}){
 const rng=seedRandom(seed),output=[];
 for(let i=0;i<n;i++){
   const x=lower+Math.floor(rng()*span),y=lower+Math.floor(rng()*span);
   // In a non-integrable field there is no globally defined z(x,y).
   // The learner starts from the currently observed state; choose a positive
   // independent z offset in the stronger field to avoid crossing the toy
   // world's explicit nonnegative output boundary during random exploration.
   const z0=kind==="strongerNoncommuting"?x*y+10000:x*y;
   const start=kind==="integrable"?x+" * "+y+" = "+z0+".":
      x+" @ "+y+" ~ "+z0+".";
   const length=minLength+Math.floor(rng()*variation),actions=[];
   for(let t=0;t<length;t++)actions.push({
     primary:rng()<.5?0:1,step:rng()<.5?1:-1
   });
   output.push(recordObservedTrajectory(field,start,actions));
 }
 return output;
}
function caseStudy(kind,seed,noiseAmplitude=0){
 const field=fieldFor(kind);
 // Three disjoint RNG streams, disjoint start-state ranges, longer paths in
 // the final holdout; no output/target read before the chosen model is frozen.
 const train=samples(field,kind,{n:400,seed,lower:20,span:20,minLength:8,variation:14});
 const validation=samples(field,kind,{n:160,seed:seed+1001,lower:45,span:30,minLength:25,variation:17});
 const testRows=samples(field,kind,{n:200,seed:seed+2003,lower:85,span:40,minLength:45,variation:37});
 if(noiseAmplitude){
   const rng=seedRandom(seed+3007);
   for(const group of [train,validation,testRows])for(const row of group){
     const independent=2*Math.floor(rng()*2)-1;
     const perturbation=independent*noiseAmplitude;
     row.target+=perturbation;row.finalObservedOutput+=perturbation;
   }
 }
 const learned=learnMissingPerspective(train,validation);
 const evaluation=evaluateOnUnseen(learned,testRows,{scrambleSeed:seed+4001});
 return {kind,seed,train,validation,testRows,learned,evaluation};
}
test("prediction errors discover exactly ONE extra order coordinate on 3 independent seeds of unseen noncommuting text paths",()=>{
 const results=[];
 for(const seed of [17,19,23]){
   const t=caseStudy("noncommuting",seed),f=t.learned,e=t.evaluation;
   assert.equal(f.addedLatentDimensions,1);
   assert.ok(["ordered_0_1","ordered_1_0"].includes(f.selectedFeature));
   assert.equal(e.selected.exact,200,JSON.stringify({seed,e}));
   assert.equal(e.endpoint.exact,0);
   assert.ok(e.endpoint.rmse>5);
   assert.ok(e.lastFour.rmse>5);
   assert.ok(e.scrambledHistory.rmse>10);
   assert.ok(e.scrambledHistory.exact<30);
   assert.ok(f.selectedValidationRMSE<1e-7);
   results.push({seed,selected:f.selectedFeature,
     validationEndpointRMSE:f.endpointValidationRMSE,
     validationSelectedRMSE:f.selectedValidationRMSE,
     heldoutEndpoint:e.endpoint,heldoutLastFour:e.lastFour,
     heldoutSelected:e.selected,heldoutScrambled:e.scrambledHistory});
 }
 console.log("AUTOMATIC_MISSING_STATE_DETECTION",JSON.stringify(results));
});
test("a truly integrable transformation world correctly rejects any extra state coordinate on three seeds",()=>{
 const results=[];
 for(const seed of [17,19,23]){
   const t=caseStudy("integrable",seed),f=t.learned,e=t.evaluation;
   assert.equal(f.selectedFeature,null);
   assert.equal(f.addedLatentDimensions,0);
   assert.equal(e.endpoint.exact,200);
   assert.equal(e.selected.exact,200);
   assert.ok(e.selected.rmse<1e-7);
   results.push({seed,addedDimensions:f.addedLatentDimensions,
     heldout:e.selected,endpointValidationRMSE:f.endpointValidationRMSE});
 }
 console.log("NO_UNNEEDED_DIMENSION_CONTROL",JSON.stringify(results));
});
test("second independently observed noncommuting law confirms effect is not specific to one field's coefficients",()=>{
 const t=caseStudy("strongerNoncommuting",31);
 assert.equal(t.learned.addedLatentDimensions,1);
 assert.equal(t.evaluation.selected.exact,200);
 assert.ok(t.evaluation.endpoint.exact<5);
 assert.ok(t.evaluation.scrambledHistory.exact<30);
 console.log("DISTINCT_NONCOMMUTING_WORLD_REPLICATION",JSON.stringify({
   selected:t.learned.selectedFeature,endpoint:t.evaluation.endpoint,
   selectedPrediction:t.evaluation.selected,scrambled:t.evaluation.scrambledHistory}));
});
test("two routes can have identical endpoint input features but conflicting observed outcomes: no endpoint-only predictor can be universally correct",()=>{
 const field=fieldFor("noncommuting"),start="5 @ 6 ~ 30.";
 const xy=recordObservedTrajectory(field,start,[{primary:0,step:1},{primary:1,step:1}]);
 const yx=recordObservedTrajectory(field,start,[{primary:1,step:1},{primary:0,step:1}]);
 assert.deepEqual(xy.finalXY,yx.finalXY);
 assert.equal(xy.finalObservedOutput,48);
 assert.equal(yx.finalObservedOutput,47);
 const b=Object.keys(xy.features).filter(k=>!k.startsWith("ordered")&&!k.startsWith("last"));
 assert.deepEqual(b.map(k=>xy.features[k]),b.map(k=>yx.features[k]));
 assert.notEqual(xy.features.ordered_0_1,yx.features.ordered_0_1);
 console.log("PROVABLE_ENDPOINT_ALIASING",JSON.stringify({
  start,identicalVisibleEndpoint:xy.finalXY,
  differentOutcomes:[xy.finalObservedOutput,yx.finalObservedOutput],
  sameAllEndpointFeatures:true,
  historyFeature:[xy.features.ordered_0_1,yx.features.ordered_0_1]}));
});
test("the discovered state coordinate can be maintained online with CONSTANT memory rather than retaining a long action history",()=>{
 const t=caseStudy("noncommuting",17);
 const feature=t.learned.selectedFeature;
 assert.ok(feature);
 const rng=seedRandom(1217);
 for(const len of [2,8,64,256,1024,2048]){
   const actions=Array.from({length:len},()=>({primary:rng()<.5?0:1,step:rng()<.5?1:-1}));
   const offline=pathFeatures(30,30,actions),stream=incrementalPathMemory(actions,feature);
   assert.equal(stream.extraCoordinate,offline[feature]);
   assert.equal(stream.dx,offline.dx);assert.equal(stream.dy,offline.dy);
   assert.equal(stream.retainedHistoryEntries,0);
   assert.equal(stream.onlineStateCoordinateCount,3);
   console.log("ONLINE_EXTRA_PERSPECTIVE_MEMORY",JSON.stringify({
      actionHistoryLength:len,selected:feature,auxiliary:stream.extraCoordinate,
      rememberedCoordinates:stream.onlineStateCoordinateCount,
      fullHistoryRetained:stream.retainedHistoryEntries}));
 }
});
test("independent random outcome noise alone does not justify hallucinating a new deterministic history dimension",()=>{
 for(const kind of ["integrable","noncommuting"]){
   const t=caseStudy(kind,41,20);
   // Noise dominates the deterministic effect at this observation budget.
   // Validation requires a huge >98% gain before adding a coordinate.
   assert.equal(t.learned.addedLatentDimensions,0,JSON.stringify({
     kind,validation:t.learned.candidateValidationRMSE,
     baseline:t.learned.endpointValidationRMSE}));
   assert.ok(t.evaluation.selected.rmse>=15);
   console.log("STOCHASTIC_UNEXPLAINED_NOISE_REJECTED",JSON.stringify({
     kind,selected:t.learned.selectedFeature,
     validationRMSE:t.learned.endpointValidationRMSE,
     heldoutRMSE:t.evaluation.selected.rmse}));
 }
});
test("the full action replay remains the strong reference; compressed learned state makes the same predictions for its restricted world",()=>{
 const t=caseStudy("noncommuting",17),chosen=t.learned.selectedModel;
 let exact=0,trajectories=0,historyMoves=0;
 for(const row of t.testRows){
   // The full-history simulation through independently learned per-action
   // world effects generated this observed outcome: it is the reference teacher,
   // not an excluded baseline.
   const reduced=row.initialOutput+chosen.intercept+chosen.retained.reduce(
     (s,k,i)=>s+chosen.betas[i]*
       (row.features[k]-chosen.means[k])/chosen.scales[k],0);
   exact+=+(Math.abs(reduced-row.finalObservedOutput)<1e-6);
   historyMoves+=row.actions.length;trajectories++;
 }
 assert.equal(exact,trajectories);
 console.log("COMPRESSED_MEMORY_VS_FULL_HISTORY_REFERENCE",JSON.stringify({
   unseen:trajectories,
   fullHistoryReplayExact:trajectories,
   compressedStatePredictionExact:exact,
   meanActionsPreviouslyRequiredForReplay:historyMoves/trajectories,
   compressedOnlineCoordinates:3,
   interpretation:"distills known transition world into constant-memory predictive state; not discovery of the world dynamics"}));
});
