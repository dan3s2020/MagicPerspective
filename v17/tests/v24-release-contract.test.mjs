import test from "node:test";
import assert from "node:assert/strict";
import {checkV24Release,V24_RELEASE_CONTRACT} from "./v24-release-contract.mjs";

test("completed CI synthetic native Q/A run is NOT 100% unseen and MUST NOT authorize launch",()=>{
 const actual={originalAlgorithm:"Discoverer.shape",
   source:"CI synthetic original-format Parquet",
   heldoutRows:4,exactCorrect:0,exactPercent:0,
   noAnswerOracle:true,heldoutIndicesDisjoint:true,
   originalMazeParity:true,geometry5DUsedForDecision:true,
   learnedGoal32UsedForDecision:true,
   liveObservedPaths:true,nativeCheckpointRoundTrip:true,
   originalMainUnchanged:true,allTrainingCuda:false,
   cudaDevice:"off",exercisesPerSecond:0,megabytesPerSecond:0};
 const gate=checkV24Release(actual);
 assert.equal(gate.releaseAllowed,false);
 assert.ok(gate.blockedReasons.some(s=>s.includes("whole answer")));
 assert.ok(gate.blockedReasons.some(s=>s.includes("CUDA")));
 assert.equal(gate.required.requiredExactPercent,100);
 assert.equal(V24_RELEASE_CONTRACT.originalAlgorithm,"Discoverer.shape");
 console.log("V24_RELEASE_BLOCKED_AS_REQUIRED",JSON.stringify({
  heldout:4,exact:0,reasons:gate.blockedReasons.length
 }));
});
test("absence of actual OpenThoughts3 training/heldout results is always blocking",()=>{
 const result=checkV24Release(null);
 assert.equal(result.releaseAllowed,false);
 assert.ok(result.blockedReasons.length>=8);
});
