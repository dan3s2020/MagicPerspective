import {enumerateNativePaths} from "./native-path-atlas.mjs";
// Persistent V17 Brain observability only. No independent pathfinder,
// no hidden ground truth, and NO shortcut that changes Discoverer.shapeGraph.
// The atlas records successes AND failures and exposes finite, paginated
// retained evidence. Enumerating all mathematical paths of an unbounded graph
// is not possible; no attempt is made to claim such completeness.
const sliceText=(s,n=240)=>String(s??"").slice(0,n);
const argNumber=(v,d,max)=>Number.isSafeInteger(Number(v))?
 Math.min(max,Math.max(0,Number(v))):d;
const edgeIdentity=(from,action,to)=>JSON.stringify([from,action,to]);

function atlasState(state) {
 const a=state.atlas ||= {version:1,nextId:1,events:[],evictedEvents:0,
  maxEvents:512,attemptsTotal:0,successesTotal:0,failuresTotal:0,
  qaEvaluationsTotal:0,qaExactWholeAnswersTotal:0,
  qaCanonicalWholeAnswersTotal:0,qaPlannedRoutesTotal:0};
 if(a.version!==1)throw Error("Unknown Brain atlas evidence schema");
 // Checkpoints made before the full-answer audit existed may not have
 // explicit zero counters. An unseen failure is numerically zero, not
 // undefined; preserve the exact old journal/events without migration.
 for(const k of ["qaEvaluationsTotal","qaExactWholeAnswersTotal",
  "qaCanonicalWholeAnswersTotal","qaPlannedRoutesTotal"])
  if(!Number.isSafeInteger(a[k]))a[k]=0;
 return a;
}
export function recordOriginalHypermazeAttempt(state,plan,query={}){
 const a=atlasState(state),id=a.nextId++;
 a.attemptsTotal++;if(plan.found)a.successesTotal++;
 else a.failuresTotal++;
 // PR72 discovery: each original frozen path may have other reachable
 // terminal states. Enumerate ONLY the finite original observed graph,
 // keeping all inferences and truncation visibly marked, no gold answer.
 const evidence=plan.topology?.nodes&&plan.topology?.edges?
  enumerateNativePaths(plan,{
   maxPaths:32,maxVisits:2400,maxSteps:24,maxDeadEnds:96
  }):null;
 const alternatives=evidence?{
  enumeratedPathCount:evidence.paths.length,
  goalTerminalsKnownInCurrentGraph:evidence.topology.goalStates,
  distinctGoalTexts:evidence.topology.distinctTerminalGoalTexts,
  goalUnderdetermined:evidence.topology.nonUniqueTerminalGoal,
  enumerationTruncated:evidence.enumeration.truncated,
  truncatedBecause:evidence.enumeration.enumerationTruncationReason,
  frontierCount:evidence.topology.frontierCount,
  graphRetainedFiniteOnly:true,
  allNaturalLanguagePathsEnumerated:false,
  originalChosenPath:evidence.paths.find(p=>p.isInitialShape)?.id||null,
  paths:evidence.paths.map(p=>({
   id:p.id,states:p.states.slice(0,25).map(x=>sliceText(x,190)),
   length:p.length,isOriginalChoice:p.isInitialShape,
   actions:p.actions.slice(0,24).map(a=>({
    from:a.from,to:a.to,action:a.action,
    evidenceEpisode:a.evidenceEpisode,edgeStatus:a.edgeStatus,
    supportingWitness:a.sourceEvidence
   }))
  })),
  deadEnds:evidence.deadEnds.slice(0,64).map(x=>({
   at:x.at,text:sliceText(x.text),reason:x.reason
  }))
 }:null;
 const reasons=diagnoseNoPath(state,{...plan,alternatives},query);
 const event={id,kind:query.numeric?"numeric-contextual-axes":"text-cross-world",
  outcome:plan.found?"path-found":"path-missing",
  reason:plan.reason||null,
  start:sliceText(plan.start??query.start),
  goalTerms:Array.isArray(plan.required)?plan.required.slice(0,32):
   Array.isArray(plan.numericGoalInputs)?plan.numericGoalInputs:
   Array.isArray(query.required)?query.required.slice(0,32):[],
  originalPlanner:plan.originalPlanner||"Discoverer.shapeGraph",
  priorReferenceAnswerProvided:!!plan.referenceAnswerProvided,
  found:!!plan.found,actions:Math.min(plan.actions?.length||0,500),
  inferred:!!plan.pathContainsInferredEdges,
  predictionsAreNotIndependentPhysicalExecution:true,
  heldoutSemanticAccuracyEstablished:false,
  trace:(plan.actions||[]).slice(0,128).map((a,i)=>({
   order:i,from:sliceText(a.before??a.from),to:sliceText(a.after??a.to),
   action:sliceText(a.action??a.actionId??a.kind,120),
   status:a.edgeStatus??"inferred-unverified",
   episode:sliceText(a.evidenceEpisode??"",120),
   source:sliceText(a.evidenceSource??"",120),
   observedSupport:a.observedSupport??a.observedTrainingPairs??null,
   value:Number.isFinite(a.value)?a.value:null
  })),
  diagnostics:reasons,alternatives,
  graph:{reachableStates:plan.reachableStates??plan.graph?.nodes??plan.topology?.nodes?.length??null,
   goalNodes:plan.goalNodes??plan.graph?.goalNodes??null,
   expansionTruncated:plan.memory?.expansionTruncated??plan.graph?.truncated??false,
   nodesRetained:state.nodes?.size||0,
   observedEdges:state.edges?.size||0,
   proposedEdges:state.proposed?.size||0},
  stateOfEvidence:"actual original Brain snapshot at time of query; future training can alter reachability"
 };
 a.events.push(event);
 if(a.events.length>a.maxEvents){a.events.shift();a.evictedEvents++;}
 return id;
}
// Frozen heldout natural-language answer audit. The real withheld answer
// NEVER enters this function or checkpoint, only boolean exact-match from a
// separate scorer that already compared after the original plan was frozen.
export function recordOriginalFrozenQA(state,{question,plan,exact,canonical,
 source="real-corpus-heldout"}={}){
 if(typeof question!=="string"||typeof exact!=="boolean"||
    typeof canonical!=="boolean")
  throw Error("V30 heldout evidence needs a question and scorer booleans only");
 const a=atlasState(state),id=a.nextId++;
 const routeFound=!!plan?.found;
 a.attemptsTotal++;
 a.qaEvaluationsTotal=(a.qaEvaluationsTotal||0)+1;
 if(exact){a.successesTotal++;a.qaExactWholeAnswersTotal=
  (a.qaExactWholeAnswersTotal||0)+1;}
 else a.failuresTotal++;
 if(canonical)a.qaCanonicalWholeAnswersTotal=
  (a.qaCanonicalWholeAnswersTotal||0)+1;
 if(routeFound)a.qaPlannedRoutesTotal=(a.qaPlannedRoutesTotal||0)+1;
 const motifs=state._qaMotifStatsHint||null;
 const issues=[];
 if(!routeFound)issues.push({
  code:"NO_GENERAL_QA_TRANSFORMATION_AXIS",
  kind:"missing-language-transformations",
  explanation:"The original Brain has no learned reusable question-to-complete-answer action for this heldout question; source-order segments are not executable semantic corridors.",
  observed:true
 });
 if(routeFound&&!exact)issues.push({
  code:"ORIGINAL_ROUTE_DID_NOT_YIELD_CORRECT_FULL_ANSWER",
  kind:"independent-answer-mismatch",
  explanation:"A pre-action route existed, but its entire generated answer disagreed with the withheld reference on the independent exact scorer.",
  observed:true
 });
 if(!routeFound&&String(plan?.reason||"").includes("unsupported-query"))
  issues.push({code:"QUERY_ONTOLOGY_NOT_IDENTIFIED",
   kind:"design-gate",explanation:"Known Q/A role learner supports a bounded grammar; this different question lacks transferable semantic action axes.",
   observed:true});
 issues.push({code:"TEXT_SEGMENT_ORDER_IS_NOT_ACTION_PHYSICS",
  kind:"structural-vs-causal-gap",
  explanation:"Cross-exercise lexical motif matches or consecutive chunks are structural observations, not independently confirmed semantic before/action/after transitions.",
  observed:true});
 const event={id,kind:"frozen-real-natural-language-qa",
  outcome:exact?"answer-correct":routeFound?"answer-incorrect":"path-missing",
  reason:plan?.reason||"no-native-semantic-QA-path",
  start:sliceText(question),goalTerms:[],
  originalPlanner:"Discoverer.shapeGraph",
  originalPlannerActuallyInvoked:routeFound,
  priorReferenceAnswerProvided:false,
  withheldGoldAnswerNotPersisted:true,
  comparedAfterFrozenPrediction:true,heldoutSemanticAccuracyEstablished:false,
  rawWholeAnswerExact:exact,canonicalWholeAnswerExact:canonical,
  found:routeFound,inferred:routeFound,actions:plan?.actions?.length||0,
  predictionsAreNotIndependentPhysicalExecution:true,
  trace:(plan?.trace||[]).slice(0,128).map((step,i)=>({
   order:i,from:sliceText(step.from),to:sliceText(step.to),
   action:sliceText(step.action?.kind||step.action||"observed-qa-axis"),
   status:"learned-unverified-semantic-action",
   episode:null,source:"historical-q-a-outcome-witness",
   observedSupport:step.action?.actualObservedContrastSupport??null,
   value:Number.isFinite(step.value)?step.value:null
  })),
  diagnostics:issues,
  graph:{reachableStates:plan?.graph?.nodes??null,
   goalNodes:routeFound?1:0,expansionTruncated:false,
   nodesRetained:state.nodes?.size||0,observedEdges:state.edges?.size||0,
   proposedEdges:state.proposed?.size||0},
  source,
  modelPredictionPreview:sliceText(routeFound?plan.predicted:"",160),
  stateOfEvidence:"real heldout question; no gold answer words stored in original Brain"
 };
 a.events.push(event);
 if(a.events.length>a.maxEvents){a.events.shift();a.evictedEvents++;}
 return {id,answerCorrect:exact,preactionRouteFound:routeFound,
  withheldAnswerNeverStored:true};
}
function diagnoseNoPath(state,plan,query) {
 const issues=[];
 const m=plan.memory||{},reasons=String(plan.reason||"");
 const add=(code,kind,explanation,observed)=>issues.push({
  code,kind,explanation,observed:!!observed});
 if(state.ambiguousActions?.size)
  add("HIDDEN_STATE_ALIASING","learned-world-design",
   "Same visible state and action had contradictory accepted outcomes. A history/context coordinate must be discovered; links excluded.",
   true);
 if(state.blocked?.size||state.rejectedActions)
  add("REJECTED_PHYSICAL_ACTIONS","observed-walls",
   "Actions rejected by independent environment feedback cannot be used as corridors.",true);
 if(state.proposed?.size)
  add("UNTESTED_HYPOTHESIS_EDGES","unverified",
   "Proposed cross-world connections exist but were not independently physically accepted.",true);
 if(!query.allowInferred&&!query.numeric)
  add("INFERRED_AXES_DISABLED_BY_DESIGN","design-gate",
   "This attempt allows only independently accepted physical actions; learned textual operators/contextual proposals are excluded.",true);
 if(m.expansionTruncated||plan.graph?.truncated)
  add("GRAPH_BUDGET_REACHED","bounded-search",
   "Candidate graph reached its finite node/expansion limit; absence of a goal does not imply impossibility.",true);
 if(reasons==="START_STATE_NOT_YET_WITNESSED")
  add("UNOBSERVED_START","insufficient-experience",
   "Start was never confirmed as a reachable physical state; a source sentence alone does not verify movement.",true);
 if(reasons==="NO_EVIDENCED_PATH_TO_GOAL")
  add("DISCONNECTED_OR_MISSING_GOAL","missing-experience",
   "The accumulated verified or permitted inferred edges cannot currently connect this start to a goal.",true);
 if(reasons==="INSUFFICIENT_CROSS_CONTEXT_EVIDENCE")
  add("CONTEXT_AXES_NOT_IDENTIFIED","missing-transformation",
   "The same effect was not witnessed under enough different contexts to infer a transferable local law.",true);
 if(reasons==="NO_IDENTIFIED_STATE_DEPENDENT_AXES")
  add("NO_LEARNED_NUMERIC_FIELD","missing-transformation",
   "No reusable state-dependent numeric action field has yet been identified from accepted outcomes.",true);
 if(reasons==="LEARNED_NUMERIC_WORLD_HAS_NO_REACHABLE_GOAL")
  add("NUMERIC_GOAL_UNREACHABLE","missing-path",
   "Learned numeric action effects did not reach the input-variable goal under current bounds.",true);
 if(plan.found&&plan.pathContainsInferredEdges)
  add("PREDICTED_PATH_UNVERIFIED","validation-required",
   "Original attraction found a path using proposed actions; independent physical/semantic checks have not confirmed it.",true);
 if(plan.found&&!plan.pathContainsInferredEdges)
  add("REUSED_OBSERVED_PATH","previous-experience",
   "The entire path uses transitions accepted in earlier independent experiences; current execution still needs verification.",true);
 if(plan.alternatives?.goalUnderdetermined)
  add("GOAL_CONSTRAINTS_ALLOW_MULTIPLE_VALID_OUTPUTS",
   "underdetermined-task-target",
   "The same explicit task goal is satisfied by more than one distinct reachable complete text; the original attraction picks one, but the constraints alone do not uniquely identify the intended answer.",true);
 if(plan.alternatives?.enumerationTruncated)
  add("ALTERNATIVE_PATH_ENUMERATION_BOUNDED",
   "analysis-design-gate",
   "Alternate-path enumeration reached max paths, visits or steps; unexplored alternatives remain unknown, not impossible.",true);
 if(!issues.length&&!plan.found)
  add("UNRESOLVED_MISSING_CONNECTION","unknown",
   "Insufficient evidence to identify the blocked or missing transformation.",false);
 return issues;
}

function listFiltered(records,filter,search){
 let rows=records;
 if(filter==="failed")rows=rows.filter(x=>x.found===false||x.outcome==="path-missing"||x.outcome==="answer-incorrect");
 if(filter==="found")rows=rows.filter(x=>x.outcome==="path-found"||x.outcome==="answer-correct");
 if(filter==="verified")rows=rows.filter(x=>x.status==="physically-verified");
 if(filter==="proposed")rows=rows.filter(x=>x.status==="hypothesis"||x.status==="inferred-unverified");
 if(filter==="blocked")rows=rows.filter(x=>String(x.status).includes("block"));
 if(filter==="ambiguous")rows=rows.filter(x=>x.status==="ambiguous-action");
 if(search){const term=search.toLowerCase();rows=rows.filter(x=>JSON.stringify(x).toLowerCase().includes(term));}
 return rows;
}
const projectPhysical=(k,v,blocked,ambiguous)=>{
 const status=blocked.has(k)?"blocked-by-physical-feedback":
  ambiguous.has(JSON.stringify([v.before,v.action]))?"ambiguous-action":
  v.status||"physically-verified";
 return {from:v.before,to:v.after,action:v.action,status,
  observedSupport:v.support,firstEpisode:v.firstEpisode,
  lastEpisode:v.lastEpisode,episodes:v.episodes instanceof Set?
   [...v.episodes].slice(-100):[],
  source:v.source,blocks:v.blocks||0,
  physicallyVerifiedOriginally:true,
  traversableNow:status==="physically-verified"};
};
function nodeRows(state){
 return [...state.nodes].map(([text,n])=>({
  text,firstEpisode:n.firstEpisode,lastEpisode:n.lastEpisode,
  sourceObservations:n.sourceCount,visits:n.seen,
  status:"physical-evidence-state"}));
}
function edgeRows(state){
 const out=[...state.edges].map(([k,v])=>projectPhysical(k,v,state.blocked,state.ambiguousActions));
 for(const [id,v] of state.proposed)
  if(!state.edges.has(id))
   out.push({from:v.before,to:v.after,action:v.action,
    status:"hypothesis",firstEpisode:v.firstEpisode,
    source:v.source,physicallyVerifiedOriginally:false,traversableNow:false});
 for(const [k,v] of state.textAdjacency)
  out.push({status:"source-order-only",key:k,
   count:v.count,firstEpisode:v.firstEpisode,physicallyVerifiedOriginally:false,
   traversableNow:false});
 return out;
}
function motifs(brain){
 const m=brain.qaRoleEvidence?.longForm?.motifGraph;
 return m?[...m.nodes].map(([id,x])=>({
  id,width:x.scale,example:x.example,roles:[...x.roles],
  episodes:x.episodes,occurrences:x.occurrences,
  firstEpisode:x.firstEpisode,lastEpisode:x.lastEpisode,
  sourceOnly:true,physicallyVerified:false})):[];
}
function motifEdges(brain){
 const m=brain.qaRoleEvidence?.longForm?.motifGraph;
 return m?[...m.edges].map(([id,x])=>({id,from:x.from,to:x.to,
  role:x.role,status:x.status,episodes:x.episodes,count:x.count,
  physicallyVerified:false,traversableNow:false})):[];
}

// This is a read-only inspection of the original ONE Brain. No lookup
// invents or adds paths, uses the heldout answer, or changes model weights.
export function originalHypermazeAtlas(brain,{view="attempts",offset=0,limit=50,
 filter="all",search="",attemptId=null}={}){
 const state=brain?.hypermazeCumulativeExperience;
 if(!state)return {ok:false,reason:"NO_CUMULATIVE_ORIGINAL_BRAIN_EVIDENCE"};
 if(!["attempts","nodes","edges","motifs","motifEdges","diagnostics"].includes(view))
  return {ok:false,reason:"UNSUPPORTED_ATLAS_VIEW"};
 const a=atlasState(state),m=brain.qaRoleEvidence?.longForm?.motifGraph;
 let rows;
 switch(view){
 case "attempts":rows=a.events.slice().reverse();break;
 case "nodes":rows=nodeRows(state);break;
 case "edges":rows=edgeRows(state);break;
 case "motifs":rows=motifs(brain);break;
 case "motifEdges":rows=motifEdges(brain);break;
 case "diagnostics":
  rows=a.events.flatMap(e=>e.diagnostics.map(d=>({
   ...d,attemptId:e.id,found:e.found,start:e.start,goalTerms:e.goalTerms
  })));
  break;
 }
 rows=listFiltered(rows,filter,String(search).slice(0,180));
 const selected=attemptId===null?null:a.events.find(x=>x.id===Number(attemptId))||null;
 const from=argNumber(offset,0,Number.MAX_SAFE_INTEGER);
 const count=Math.min(200,Math.max(1,argNumber(limit,50,200)));
 return {ok:true,view,filter,search:String(search).slice(0,180),
  total:rows.length,offset:from,limit:count,
  nextOffset:from+count<rows.length?from+count:null,
  rows:rows.slice(from,from+count),selectedAttempt:selected,
  comparison:{
   foundRetained:a.events.filter(x=>x.found).length,
   failedRetained:a.events.filter(x=>x.outcome==="path-missing"||
    x.outcome==="answer-incorrect").length,
   wholeAnswerEvaluationsRetained:a.events.filter(x=>
    x.kind==="frozen-real-natural-language-qa").length,
   wholeAnswerExactRetained:a.events.filter(x=>
    x.kind==="frozen-real-natural-language-qa"&&x.rawWholeAnswerExact).length,
   withInferredEdges:a.events.filter(x=>x.found&&x.inferred).length,
   fullyPhysicalRoutes:a.events.filter(x=>x.found&&!x.inferred).length,
   reasons:[...a.events.reduce((map,event)=>{
    for(const issue of event.diagnostics){
     const prev=map.get(issue.code)||{code:issue.code,count:0,
      kind:issue.kind,explanation:issue.explanation,
      exampleAttemptIds:[]};
     prev.count++;
     if(prev.exampleAttemptIds.length<6)prev.exampleAttemptIds.push(event.id);
     map.set(issue.code,prev);
    }
    return map;
   },new Map()).values()].sort((x,y)=>y.count-x.count||
    x.code.localeCompare(y.code)),
   limitations:"Reasons inferred ONLY from available recorded observations, not oracle knowledge of unknown walls or absent semantic laws"
  },
  memory:{
   originalNativeBrain:true,version:state.version,
   attemptsTotal:a.attemptsTotal,successesTotal:a.successesTotal,
   qaEvaluationsTotal:a.qaEvaluationsTotal||0,
   qaExactWholeAnswersTotal:a.qaExactWholeAnswersTotal||0,
   qaCanonicalWholeAnswersTotal:a.qaCanonicalWholeAnswersTotal||0,
   qaPlannedRoutesTotal:a.qaPlannedRoutesTotal||0,
   failuresTotal:a.failuresTotal,attemptsRetained:a.events.length,
   attemptsEvicted:a.evictedEvents,
   physicalNodes:state.nodes.size,
   physicallyObservedEdges:state.edges.size,
   physicallyTraversableNow:[...state.edges].filter(([k,e])=>
     !state.blocked.has(k)&&e.status==="physically-verified"&&
     !state.ambiguousActions.has(JSON.stringify([e.before,e.action]))).length,
   physicallyRejectedActionTypes:state.blocked.size,
   ambiguousStateActionTypes:state.ambiguousActions.size,
   proposedEdges:state.proposed.size,
   sourceOnlyEdges:state.textAdjacency.size,
   multiScaleSourceNodes:m?.nodes?.size||0,
   multiScaleSourceEdges:m?.edges?.size||0,
   sharedPhraseAnchors:m?.activeSharedAnchors||0,
   sourceRoleBoundaries:m?.observedRoleBoundaries||0,
   evictedPhysicalNodes:state.evictedNodes,
   evictedPhysicalEdges:state.evictedEdges,
   evictedPhraseNodes:(m?.evictedSingletons||0)+(m?.evictedRepeated||0),
   limitedNotCompleteUniversalLanguage:true
  },
  designGates:{
   originalPhysicalGraphMaxNodes:state.maxStates,
   originalPhysicalGraphMaxEdges:state.maxEdges,
   retainedAttemptHistoryLimit:a.maxEvents,
   recordedActionsPerAttemptLimit:128,
   exactOriginalObservedTokensPerSentence:brain.observedTransformations?.maxTokens??null,
   exactOriginalObservedOperatorLimit:brain.observedTransformations?.maxOperators??null,
   originalShortQARoleVariableLimitTokens:128,
   observedLongQASegmentTokens:96,
   longTextMotifScales:[5,12],
   longTextMotifSelection:m?.samplingMethod||
    "older Brain checkpoint: first token plus token-hash sample at approximately 1 in 32 positions",
   longTextGuaranteedOffsetIndependentSharedTokenRun:
    m?.guaranteedSharedSubstringByWidth||null,
   sourceMotifSelectionsRetained:m?.samplesSelected||0,
   sourceMotifSelectionStillSparse:true,
   sourceMotifSelectionCoversEveryPossibleSubstring:false,
   observedLongTextMotifMaxNodes:m?.maxNodes??null,
   observedLongTextMotifMaxEdges:m?.maxEdges??null,
   longTextStructuralEdgesArePhysicallyTraversable:false,
   originalCrossWorldInferredEdgesDefaultDisabled:true,
   contradictoryPhysicalEffectsSuppressedWithoutHiddenContext:true,
   unknownSemanticGoalAutomaticallyDiscovered:false,
   actualCompleteOpenThoughtsTrainingOnUserGPUVerified:false,
   importantCaveat:"This atlas is exhaustive only over retained bounded evidence, not all absent or possible paths."
  },
  provenance:{
   selectedOriginalPlanner:"Discoverer.shapeGraph",
   verifiedCorridors:"independently physically accepted transitions",
   inferredCorridors:"hypotheses from original learned text edits/axes, requiring verification",
   lexicalMotifEdges:"source order and repeated phrases, NOT semantic physics",
   pathHistory:"bounded 512 latest attempts, aggregates retained",
   atlasScope:"ALL retained evidence via pagination; unknown/unseen worlds are NOT declared mapped",
   pathEnumeration:"stores every planned attempt up to explicit bounded retention, not exponentially every mathematically possible route"
  }};
}
