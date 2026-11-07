// Read-only evaluation AFTER the original V17 AligningGraph.write produced its
// answer from the QUESTION PREFIX alone. Ground truth is consulted solely
// here, to identify each incorrect position and a POSSIBLE post-hoc repair.
// Such a repair is never re-labelled "predicted correctly on first try".
export function explainOriginalV17AnswerShape(exercise,characterAtlas,
 {maxExplained=80,maxNodes=128,maxDepth=5}={}){
 if(!exercise||!Array.isArray(exercise.rows)||exercise.a0<0||
    typeof exercise.shape!=="string"||!Number.isInteger(exercise.a0))
  return {valid:false,reason:exercise?.invalidShapeReason||
    "NO_FROZEN_ORIGINAL_V17_FULL_QA_SHAPE",source:"none"};
 if(!characterAtlas?.formSolution)throw Error("Actual learned character atlas is required");
 const expected=exercise.rows.slice(exercise.a0).map(row=>String.fromCharCode(row[0]));
 const predicted=Array.from(exercise.shape),n=expected.length;
 const same=expected.reduce((sum,ch,i)=>sum+Number(predicted[i]===ch),0);
 const scored=n?same/n:null;
 if(exercise.shapeSame!==null&&scored!==null&&Math.abs(scored-exercise.shapeSame)>1e-8)
  throw Error("Forensic metric differs from the ORIGINAL frozen V17 positional score; no substitutions allowed");
 const misses=[],spans=[];let run=null;
 for(let i=0;i<Math.max(n,predicted.length);i++){
  if(predicted[i]===expected[i]&&i<n){
   if(run){spans.push(run);run=null;}
   continue;
  }
  const type=i>=n?"EXTRA_GENERATED_CHARACTER":
    i>=predicted.length?"MISSING_GENERATED_CHARACTER":"INCORRECT_GENERATED_CHARACTER";
  const record={index:i,type,predicted:predicted[i]??null,expected:expected[i]??null};
  misses.push(record);
  if(!run)run={from:i,to:i,types:[],count:0};
  run.to=i;run.count++;if(!run.types.includes(type))run.types.push(type);
 }
 if(run)spans.push(run);
 const explained=[];
 for(const m of misses.slice(0,maxExplained)){
  if(!m.predicted||!m.expected){
   explained.push({...m,pathStatus:"NO_CHARACTER_OUTPUT_TO_NAVIGATE",postHocOnly:true});
   continue;
  }
  const goal={charSlots:{0:m.expected}};
  const route=characterAtlas.formSolution(m.predicted,goal,{
   transfer:true,maxNodes,maxDepth,seed:74129,temperature:0,postHocReference:true});
  const noTransfer=characterAtlas.formSolution(m.predicted,goal,{
   transfer:false,maxNodes,maxDepth,seed:74129,temperature:0,postHocReference:true});
  explained.push({...m,
   preRepairBlocked:!noTransfer.found,
   postHocCharacterRouteFound:route.found,
   postHocCandidatePath:route.firstPrediction||[],
   pathStatus:route.found?"POST_HOC_REPAIR_PATH_IN_LEARNED_ATLAS":
     route.reason||"CHARACTER_TRANSFORMATION_UNAVAILABLE",
   missingCharacterPaths:route.world.diagnostics.missingGoalCharacterPaths,
   designLimitsHit:route.world.diagnostics.nodeLimitReached||
      route.world.diagnostics.depthLimitReached,
   postHocOnly:true,referenceWasUsedToSetDiagnosticGoal:true,
   originalAnswerWasNotRegenerated:true});
 }
 return {
  valid:true,originalMetric:"V17 AligningGraph.write shapeSame BEFORE reference",
  originalScore:scored,
  originalWholeAnswerExactlyCorrect:misses.length===0,
  referenceLength:n,generatedLength:predicted.length,
  originalGeneratedBeforeReference:exercise.shape,
  actualReferenceExaminedAfterGeneration:expected.join(""),
  correctOriginalPositions:same,
  incorrectOriginalPositions:n-same,
  totalAllMismatchedPositions:misses.length,
  allMismatches:misses,allMismatchSpans:spans,
  explainedPositions:explained.length,
  unexaminedMismatchPositions:Math.max(0,misses.length-explained.length),
  examples:explained,
  genuineImprovementInFirstTryScore:null,
  hypotheticalCharacterRepairsAreNotFirstTryAnswers:true,
  hiddenAnswerWasUsedOnlyForPostHocDiagnostic:true
 };
}
