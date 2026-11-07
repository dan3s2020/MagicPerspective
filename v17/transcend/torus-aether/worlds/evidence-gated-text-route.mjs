// MagicPerspective native V17: testable recovery for routes blocked by
// overly strict one-token context anchors. Uses the ACTUAL original
// ObservedTransformations operators; novel bridge contexts must be witnessed
// in corpus/training worlds BEFORE a previously forbidden edge is considered.
// A planner's symbolic prediction is NOT independent semantic ground truth.
import {tokenizeObservation,renderObservation}
  from "./observed-transformations.mjs";
import {ContextAxisNavigator}
  from "../../../research/text-hypermaze/context-axis-evidence.mjs";
const freeze=xs=>JSON.stringify(xs);
export function evidenceGatedTextRoute(observed,{start,required,maxSteps=8,maxExpanded=6000}={}){
  if(!observed?.operators?.size)return {found:false,
    reason:"no-observed-training-transformations",evidence:[],strict:null,gated:null,
    probesNeeded:true};
  if(!start||!Array.isArray(required)||!required.length)
    throw Error("Observed starting sentence and goal token constraints required");
  const words=tokenizeObservation(start);
  const allowed=required.map(x=>String(x).trim()).filter(Boolean);
  const before=JSON.stringify({
    observed:observed.seen,ops:observed.operators.size,
    operators:[...observed.operators.values()].map(op=>op.sourceObservations)
  });
  const strict=observed.plan({start,required:allowed,maxDepth:Math.min(maxSteps,9),
    maxExpanded:Math.min(maxExpanded,40000),allowUnseenStart:true,
    recordSearch:true,maxRecordedStates:240});
  const navigator=new ContextAxisNavigator(observed);
  const axes=navigator.axisEvidence(words.length);
  const gated=navigator.plan(start,allowed,{maxSteps,maxExpanded});
  const strictNext=observed.neighbors(words).map(x=>renderObservation(x.tokens));
  const gatedNext=navigator.neighbors(words).map(x=>renderObservation(x.tokens));
  const known=new Set(strictNext);
  const candidates=gatedNext.map(x=>({state:x,
    accessibleInOriginal:known.has(x),
    becameAccessibleThroughObservedBridge:!known.has(x)}));
  const bridge=navigator.suggestBridge(start);
  const allStages=[];
  if(gated.found){
    for(let i=0;i<gated.actions.length;i++){
      const from=gated.states[i],to=gated.states[i+1],
        fromTokens=tokenizeObservation(from),
        original=observed.neighbors(fromTokens).some(nx=>
          renderObservation(nx.tokens)===to),
        relaxed=navigator.neighbors(fromTokens).find(nx=>
          renderObservation(nx.tokens)===to);
      if(!relaxed)throw Error("Gated planner claimed edge not supported by actual observed operator");
      allStages.push({from,to,action:gated.actions[i],
        strictOriginalPermitted:original,
        observedBridgePermitted:!original,
        observedEvidence:relaxed.operator.evidence||null,
        originalOperatorSupport:relaxed.operator.observedSupport,
        reason:original?"existing-native-action":
          "previously-rejected-neighbor-anchor; independent context witnessed",
        stateSeenPreviously:observed.containsSentence(to)});
    }
  }
  const after=JSON.stringify({
    observed:observed.seen,ops:observed.operators.size,
    operators:[...observed.operators.values()].map(op=>op.sourceObservations)
  });
  if(before!==after)throw Error("Evidence-gated plan modified native learned operators (test leakage)");
  return {
    found:gated.found,strictFound:strict.found,
    recoveredBecauseOfObservedBridges:gated.found&&!strict.found&&
      allStages.some(x=>x.observedBridgePermitted),
    predictedBeforeFirstAction:true,referenceAnswerProvided:false,
    start,goalConstraints:allowed,
    predicted:gated.found?gated.predicted:null,
    reason:gated.found?"evidence-supported-symbolic-route":
      "no-proven-route-through-known-actions",
    strict:{found:strict.found,reason:strict.reason||null,expanded:strict.expanded,
      actualSearch:strict.search},
    gated:{found:gated.found,reason:gated.reason||null,expanded:gated.expanded,
      axes:gated.axisEvidence||axes,
      steps:gated.found?gated.steps:null,
      states:gated.found?gated.states:[],
      actions:gated.found?gated.actions:[]},
    everyExecutedInternalStep:allStages,
    previouslyForbiddenFromStart:candidates.filter(x=>!x.accessibleInOriginal),
    allObservedFrontier:candidates,
    bridgeProbeSuggestion:bridge,probeIsUnverifiedHypothesis:!!bridge,
    evidenceAxes:axes,
    nativeOperatorCount:observed.operators.size,
    originalMemoryUnchanged:true,
    independentWorldSemanticValidityNotProven:true
  };
}
