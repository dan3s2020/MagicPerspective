// Explicit V24 release guard. A green unit test is NOT evidence of
// all unseen natural-language answers being solved. No release without proof.
export const V24_RELEASE_CONTRACT=Object.freeze({
 originalAlgorithm:"Discoverer.shape",
 realUnseenSource:"OpenThoughts3-original-Parquet",
 minIndependentHeldout:16,
 minLongAnswerCharacters:2048,
 requiredExactPercent:100,
 minExercisesPerSecond:100,
 minTrainingMegabytesPerSecond:1,
 devices:["cuda:0"],
 mustPreserveOriginal2D:true,
 mustKeepQuestionAndAnswerDisjoint:true,
 mustHaveReal5DAndGoal32:true,
 mustHaveVisibleLivePath:true
});
export function checkV24Release(evidence){
 const e=evidence||{},v=[];
 const fail=(test,reason)=>{if(!test)v.push(reason);};
 fail(e.originalAlgorithm===V24_RELEASE_CONTRACT.originalAlgorithm,
  "Original V17 Discoverer.shape was not the solution operator");
 fail(e.source===V24_RELEASE_CONTRACT.realUnseenSource,
  "Real OpenThoughts3 original reserved rows not verified");
 fail(Number.isInteger(e.heldoutRows)&&e.heldoutRows>=16,
  "Fewer than 16 independent unseen rows were checked");
 fail(Number(e.exactPercent)===100&&e.exactCorrect===e.heldoutRows&&e.heldoutRows>0,
  "Not every whole answer exactly matches the heldout text on its first attempt");
 fail(Number(e.minHeldoutAnswerChars)>=2048,
  "Large-answer test is absent: not every reserved answer has >=2048 characters");
 fail(e.noAnswerOracle===true&&e.heldoutIndicesDisjoint===true,
  "No verified absence of heldout labels and training overlap");
 fail(e.originalMazeParity===true,
  "Original maze algorithm parity is unverified");
 fail(e.geometry5DUsedForDecision===true&&e.learnedGoal32UsedForDecision===true,
  "Both actual 5D geometry and learned 32D goals must control decisions");
 fail(e.liveObservedPaths===true&&e.nativeCheckpointRoundTrip===true,
  "Real live UI/observed paths or native checkpoint integration unverified");
 fail(e.allTrainingCuda===true&&e.cudaDevice==="cuda:0",
  "Native full-path training on user's CUDA card unverified");
 fail(Number(e.exercisesPerSecond)>=100&&Number(e.megabytesPerSecond)>=1,
  "Requested training throughput on actual GPU is unverified");
 fail(e.originalMainUnchanged===true,"Original production branch preservation unverified");
 return {releaseAllowed:v.length===0,blockedReasons:v,required:V24_RELEASE_CONTRACT,
   note:"The release gate cannot be bypassed by shortest known-goal path or synthetic Q/A fixtures."};
}
