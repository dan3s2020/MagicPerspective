import test from "node:test";
import assert from "node:assert/strict";
import {Brain} from "../transcend/torus-aether/devour/brain.mjs";

const make=(d,n)=>{
  const tokens=Array.from({length:d},(_,j)=>
    Array.from({length:n},(_,v)=>"dim"+j+"value"+v));
  const sentence=ids=>ids.map((v,i)=>tokens[i][v]).join(" ")+" artifact.";
  const origin=Array(d).fill(0),rows=[sentence(origin)];
  for(let i=0;i<d;i++)for(let v=1;v<n;v++){
    const ids=origin.slice();ids[i]=v;rows.push(sentence(ids));
  }
  const brain=new Brain({rules:"winner",seed:17});
  for(const row of rows)brain.learnObservedTransformations(row);
  return {brain,sentence,tokens,origin:sentence(origin)};
};

test("ALL 64 restricted novel text paths remain BLOCKED by native design before bridge evidence; never assume missing language paths",()=>{
 const z=make(3,5);let solved=0;
 for(let a=1;a<5;a++)for(let b=1;b<5;b++)for(let c=1;c<5;c++){
  const goal=[z.tokens[0][a],z.tokens[1][b],z.tokens[2][c]];
  const p=z.brain.planEvidenceGatedTextRoute(z.origin,goal,{maxSteps:3});
  solved+=Number(p.found);
  assert.equal(p.referenceAnswerProvided,false);
  assert.equal(p.originalMemoryUnchanged,true);
  assert.equal(p.probeIsUnverifiedHypothesis,true);
 }
 assert.equal(solved,0);
});

test("TWO actually observed bridge sentences unlock 64/64 previously forbidden text routes in SAME original V17 Brain; predicted before action",()=>{
 const z=make(3,5),before=z.brain.observedTransformations.operators.size;
 const first=z.brain.planEvidenceGatedTextRoute(z.origin,
   [z.tokens[0][1],z.tokens[1][1],z.tokens[2][1]],{maxSteps:3});
 assert.equal(first.found,false);
 assert.deepEqual(first.bridgeProbeSuggestion.positions,[0,1]);
 // Crucial difference: the bridge hypothesis must now be a REAL witness
 // inserted into the original observed corpus. No automatic rule switch.
 z.brain.learnObservedTransformations(first.bridgeProbeSuggestion.candidate);
 const next=z.brain.planEvidenceGatedTextRoute(z.origin,
   [z.tokens[0][1],z.tokens[1][1],z.tokens[2][1]],{maxSteps:3});
 assert.ok(next.bridgeProbeSuggestion);
 assert.deepEqual(next.bridgeProbeSuggestion.positions,[1,2]);
 z.brain.learnObservedTransformations(next.bridgeProbeSuggestion.candidate);
 assert.ok(z.brain.observedTransformations.operators.size>before);
 let recovered=0,strict=0,otherEdges=0,executed=0;
 const original=JSON.stringify([...z.brain.observedTransformations.operators]);
 for(let a=1;a<5;a++)for(let b=1;b<5;b++)for(let c=1;c<5;c++){
  const target=z.sentence([a,b,c]),goal=[z.tokens[0][a],z.tokens[1][b],z.tokens[2][c]];
  const p=z.brain.planEvidenceGatedTextRoute(z.origin,goal,{maxSteps:3});
  strict+=Number(p.strictFound);
  recovered+=Number(p.found&&p.predicted===target&&p.gated.steps===3);
  assert.equal(p.referenceAnswerProvided,false);
  assert.equal(p.predictedBeforeFirstAction,true);
  assert.equal(p.originalMemoryUnchanged,true);
  if(p.found){
   executed+=p.everyExecutedInternalStep.length;
   otherEdges+=p.everyExecutedInternalStep.filter(x=>x.observedBridgePermitted).length;
   assert.equal(p.everyExecutedInternalStep.length,3);
   assert.ok(p.everyExecutedInternalStep.every(x=>x.originalOperatorSupport>=1));
  }
  assert.equal(z.brain.observedTransformations.containsSentence(target),false);
 }
 assert.equal(JSON.stringify([...z.brain.observedTransformations.operators]),original,
   "Frozen path planning cannot mutate native V17 observations");
 assert.equal(recovered,64);
 assert.ok(strict<64);
 assert.ok(otherEdges>0);
 console.log("NATIVE_TEXT_FAILURE_TO_PATH_RECOVERY",JSON.stringify({
    previouslyUnreachable:64,afterActualBridgeObservations:64,
    stillRestrictedByNativeDesign:64-strict,
    internalExecutedEdges:executed,recoveredDueToEvidence:otherEdges,
    semanticGroundTruthNotEstablished:true
 }));
});

test("Do NOT relax arbitrary semantic constraints on sparse positives without real witnessed bridges",()=>{
 const z=make(3,5),p=z.brain.planEvidenceGatedTextRoute(z.origin,
  [z.tokens[0][2],z.tokens[1][3],z.tokens[2][4]],{maxSteps:3});
 assert.equal(p.found,false);
 assert.equal(p.reason,"no-proven-route-through-known-actions");
 assert.equal(p.gated.states.length,0);
 assert.ok(p.bridgeProbeSuggestion);
 assert.equal(p.probeIsUnverifiedHypothesis,true);
});
