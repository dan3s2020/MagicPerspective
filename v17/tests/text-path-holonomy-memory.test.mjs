import test from "node:test";
import assert from "node:assert/strict";
import {StateDependentTextAxes} from "../research/text-hypermaze/state-dependent-axes.mjs";
import {learnedHolonomy,predictFromPath,executeLearnedPath}
  from "../research/text-hypermaze/path-holonomy.mjs";
import {TWorld} from "../transcend/torus-aether/worlds/transform.mjs";
import {PerspectiveLearner} from "../transcend/torus-aether/worlds/perspective.mjs";

// No hidden reference outputs at inference. State-dependent movement coefficients
// are observed from paired text effects by the existing experimental V17 class.
// The signed-area sufficient statistic is explicitly supplied as an inductive
// bias, not autonomously discovered by the original Brain.

const multiply=[
 ["2 * 3 = 6.","3 * 3 = 9."],
 ["2 * 4 = 8.","3 * 4 = 12."],
 ["2 * 3 = 6.","2 * 4 = 8."],
 ["3 * 3 = 9.","3 * 4 = 12."],
 ["3 * 4 = 12.","4 * 4 = 16."],
 ["2 * 4 = 8.","2 * 5 = 10."]
];
const noncommuting=[
 ["2 @ 3 ~ 6.","3 @ 3 ~ 9."],
 ["2 @ 4 ~ 8.","3 @ 4 ~ 12."],
 ["2 @ 3 ~ 6.","2 @ 4 ~ 10."],
 ["3 @ 3 ~ 9.","3 @ 4 ~ 15."]
];
const train=rows=>{
  const field=new StateDependentTextAxes({maxValue:200000});
  for(const [a,b] of rows)assert.equal(field.observePair(a,b).learned,true);
  return field;
};
const rng=initial=>()=>{initial=(Math.imul(initial,1664525)+1013904223)>>>0;return initial/4294967296;};
const move=(p,s)=>({primary:p,step:s});
const X=move(0,1),Y=move(1,1),negX=move(0,-1),negY=move(1,-1);

test("native V17 observed pairs yield integrable multiplication: commutator zero, no path-memory axis required",()=>{
 const model=train(multiply),start="5 * 6 = 30.",law=learnedHolonomy(model,start);
 assert.equal(law.ready,true,JSON.stringify(law));
 assert.equal(law.integrated,true);
 assert.equal(law.alpha,1);
 assert.equal(law.beta,1);
 assert.equal(law.commutator,0);
 const xy=executeLearnedPath(model,start,[X,Y]),yx=executeLearnedPath(model,start,[Y,X]);
 assert.equal(xy.matched,true);assert.equal(yx.matched,true);
 assert.deepEqual(xy.actual,yx.actual);
 assert.deepEqual(xy.actual,[6,7,42]);
 assert.equal(xy.expected.compressedExtraStateCoordinates,0);
 console.log("INTEGRABLE_TEXT_AXES_WITHOUT_EXTRA_MEMORY",JSON.stringify({alpha:law.alpha,
  beta:law.beta,commutator:law.commutator,XY:xy.actual,YX:yx.actual,
  learnedTrainingPairs:model.observations}));
});
test("noncommuting learned axes: ONE extra traversal-area coordinate distinguishes same (x,y) endpoints",()=>{
 const model=train(noncommuting),start="5 @ 6 ~ 30.",law=learnedHolonomy(model,start);
 assert.equal(law.ready,true,JSON.stringify(law));
 assert.equal(law.integrated,false);
 assert.equal(law.alpha,1);assert.equal(law.beta,2);
 assert.equal(law.commutator,1);
 const xy=executeLearnedPath(model,start,[X,Y]),yx=executeLearnedPath(model,start,[Y,X]);
 assert.equal(xy.matched,true);assert.equal(yx.matched,true);
 assert.deepEqual(xy.actual,[6,7,48]);assert.deepEqual(yx.actual,[6,7,47]);
 assert.equal(xy.expected.signedArea,1);assert.equal(yx.expected.signedArea,-1);
 assert.equal(xy.expected.compressedExtraStateCoordinates,1);
 assert.equal(yx.expected.compressedExtraStateCoordinates,1);
 assert.equal(xy.expected.finalOutput-yx.expected.finalOutput,1);
 assert.equal(xy.expected.endpointOnlyOutput,yx.expected.endpointOnlyOutput);
 const loop=executeLearnedPath(model,start,[X,Y,negX,negY]);
 assert.equal(loop.matched,true);
 assert.deepEqual(loop.actual,[5,6,31]);
 assert.equal(loop.expected.signedArea,2);
 assert.equal(loop.expected.originalFullHistoryLength,4);
 console.log("EMERGENT_EXTRA_PATH_MEMORY_AXIS",JSON.stringify({
  discoveredCrossSlopes:[law.alpha,law.beta],commutator:law.commutator,
  sameApparentLocation:[6,7],XY:xy.actual,YX:yx.actual,
  loopComesBackToSameXYButChangesThird:loop.actual,
  memoryDimensionsRequired:1,loopSignedArea:loop.expected.signedArea
 }));
});
test("200 unseen random noncommuting paths: one signed-area statistic reconstructs every actual final state",()=>{
 const model=train(noncommuting),r=rng(20261107),start="30 @ 30 ~ 900.";
 let cases=0,exact=0,baselineExact=0,areaCases=0,estimatedAreaSum=0;
 const outcomes=[];
 for(let k=0;k<200;k++){
  const actions=[];
  for(let i=0;i<32;i++){
    const t=r();
    actions.push(t<.25?X:t<.5?Y:t<.75?negX:negY);
  }
  const executed=executeLearnedPath(model,start,actions);
  assert.equal(executed.ready,true,JSON.stringify({k,reason:executed.reason}));
  assert.equal(executed.matched,true,JSON.stringify({k,executed}));
  const predicted=executed.expected,actual=executed.actual[2];
  cases++;exact+=+Math.abs(predicted.finalOutput-actual)<1e-8;
  baselineExact+=+ (Math.abs(predicted.endpointOnlyOutput-actual)<1e-8);
  areaCases+=+(Math.abs(predicted.pathOrderContribution)>0);
  estimatedAreaSum+=Math.abs(predicted.signedArea);
  outcomes.push({area:predicted.signedArea,actual,base:predicted.endpointOnlyOutput});
 }
 assert.equal(exact,200);
 assert.ok(areaCases>130,JSON.stringify({areaCases}));
 assert.ok(baselineExact<80,JSON.stringify({baselineExact}));
 let permutedCorrect=0;
 for(let i=0;i<200;i++){
  // Preserve each trajectory's endpoint-only prediction but swap the
  // route-memory coordinate with that from a DIFFERENT held-out path.
  const switched=outcomes[(i+1)%200];
  const predicted=outcomes[i].base+(switched.area*.5);
  permutedCorrect+=+(Math.abs(predicted-outcomes[i].actual)<1e-8);
 }
 assert.ok(permutedCorrect<100,JSON.stringify({permutedCorrect}));
 console.log("REAL_RANDOM_PATH_AREA_ABLATION",JSON.stringify({cases,fullStatePredictions:exact,
   endpointOnlyPredictions:baselineExact,permutedMemoryPredictions:permutedCorrect,
   nonzeroAreaTrajectories:areaCases,meanAbsoluteSignedArea:estimatedAreaSum/200,
   trajectoriesNeverSeenInTraining:true,extraSufficientStatisticCount:1}));
});
test("the same learned area coordinate becomes irrelevant on integrable multiplication loops",()=>{
 const model=train(multiply),start="30 * 30 = 900.",law=learnedHolonomy(model,start);
 assert.equal(law.ready,true);assert.equal(law.commutator,0);
 const r=rng(3191);let total=0,exact=0,areaNonzero=0;
 for(let k=0;k<120;k++){
  const actions=[];for(let t=0;t<40;t++){
   const d=r();actions.push(d<.25?X:d<.5?Y:d<.75?negX:negY);
  }
  const actual=executeLearnedPath(model,start,actions);
  assert.equal(actual.ready,true);assert.equal(actual.matched,true);
  assert.equal(actual.expected.compressedExtraStateCoordinates,0);
  assert.ok(Math.abs(actual.expected.endpointOnlyOutput-actual.actual[2])<1e-8);
  exact++;total++;
  areaNonzero+=+(actual.expected.signedArea!==0);
 }
 assert.equal(exact,120);
 assert.ok(areaNonzero>50);
 console.log("INTEGRABLE_ZERO_CURVATURE_CONTROL",JSON.stringify({
  paths:total,exact,nonzeroAreaPaths:areaNonzero,
  areaContributionAlwaysZero:true,needExtraDimension:false}));
});
test("insufficient contextual contrasts DO NOT establish a 1D curvature/memory law",()=>{
 const model=train([multiply[0],multiply[2]]),law=learnedHolonomy(model,"5 * 6 = 30.");
 assert.equal(law.ready,false);
 assert.equal(law.reason,"insufficient-context-contrast-for-curvature");
 console.log("NO_UNEARNED_CURVATURE_CLAIM",JSON.stringify(law));
});
test("original causal-world lever creates aliased LOCAL perspective with different action futures",()=>{
 // Real original TWorld physics, not a substituted simulator.
 // A lever is outside the 3x3 local view of self; door also outside.
 const n=7,terr=Array(n*n).fill(0),idx=(x,y)=>y*n+x;
 for(let i=0;i<n;i++){terr[idx(i,0)]=terr[idx(i,n-1)]=1;terr[idx(0,i)]=terr[idx(n-1,i)]=1;}
 terr[idx(1,1)]=3; // actual original V17 lever terrain code
 terr[idx(3,1)]=5; // actual original V17 lever-controlled door
 const level={n,terr,self:idx(3,3),boxes:[],goal:Array(n*n).fill(17)};
 const a=new TWorld(level,[0,1,2,3]),b=new TWorld(level,[0,1,2,3]);
 b.lever=true; // two physically possible world-history states
 const local=w=>{
  const array=w.board(),out=[];
  for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++)
    out.push(array[idx(3+dx,3+dy)]);
  return out;
 };
 assert.deepEqual(local(a),local(b),"same 3x3 egocentric perception");
 assert.notDeepEqual(a.board(),b.board(),"different full world state");
 a.step(0);a.step(0);b.step(0);b.step(0);
 assert.equal(a.self,idx(3,2));
 assert.equal(b.self,idx(3,1));
 assert.notEqual(a.self,b.self);
 console.log("REAL_V17_CAUSAL_WORLD_LOCAL_ALIASING",JSON.stringify({
  localObservationIdentical:true,leverMemoryDifferent:true,
  identicalOutputSequence:[0,0],closedDoorEndpoint:a.self,openDoorEndpoint:b.self,
  hiddenStateMattersForTwoStepPrediction:true}));
});
test("original perspective mapping confirms action coordinates must be transformed, not treated as absolute",()=>{
 const p=new PerspectiveLearner();for(let f=0;f<4;f++)for(let i=0;i<8;i++)p.learn(f,0,f);
 assert.equal(p.mappingAccuracy(),1);
 for(let f=0;f<4;f++)for(let global=0;global<4;global++)
   assert.equal(p.globalDir(f,p.bodyDir(f,global)),global);
 const permuted=new PerspectiveLearner();for(let f=0;f<4;f++)for(let i=0;i<8;i++)
   permuted.learn(f,0,(f+1)%4);
 assert.equal(permuted.mappingAccuracy(),0);
 assert.equal(permuted.globalDir(0,0),1);
 console.log("NATIVE_PERSPECTIVE_ROTATION_COORDINATE_TEST",JSON.stringify({
  learnedFrames:4,rotationRecovered:true,permutedFrameUnchangedGoal:false,
  explanation:"Rotate the goal direction to the body's learned coordinate frame"}));
});
