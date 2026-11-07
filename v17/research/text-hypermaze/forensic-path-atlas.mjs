// V31: FORENSIC, READ-ONLY atlas of actual ONE Brain topology and missing paths.
// No new planner, no new trainable weights, no synthetic model output.
// Only Discoverer.shapeGraph in CumulativeHyperMaze may select a solution.
// This module diagnoses retained evidence, missing links, rejected edges,
// compaction, disconnected islands, and character failures AFTER prediction.
// Full retained evidence is available in PAGED form; never claim that bounded
// memory includes every ever-lived episode or all natural-language states.
import {tokenizeObservation,renderObservation}
 from "../../transcend/torus-aether/worlds/observed-transformations.mjs";
import {createHash} from "node:crypto";

const norm=s=>renderObservation(tokenizeObservation(String(s??"")));
const key=(a,b,c)=>JSON.stringify([a,b,c]);
const cap=(n,a,b)=>Math.max(a,Math.min(b,Math.trunc(Number(n))||a));
const unique=a=>[...new Set(a)];
const digest=s=>createHash("sha256").update(String(s)).digest("hex");
const codepoints=s=>Array.from(String(s));
const active=(S,e)=>!S.blocked.has(key(e.before,e.action,e.after))&&
 e.status==="physically-verified";
const fromMap=m=>m instanceof Map?m:new Map();
const fromSet=s=>s instanceof Set?s:new Set();
function eligibleBrain(brain){
 if(!brain?.disc||typeof brain.disc.shapeGraph!=="function")
  throw Error("Atlas requires the same original native V17 Brain Discoverer.shapeGraph");
 return brain;
}
function referenceAudit(predicted,truth,{knownStates=[],reachableStates=[]}={}){
 const P=codepoints(predicted),T=codepoints(truth);
 const matched=P.reduce((n,c,i)=>n+Number(i<T.length&&c===T[i]),0);
 let mismatch=0;while(mismatch<P.length&&mismatch<T.length&&P[mismatch]===T[mismatch])mismatch++;
 const allKnownChars=new Set(knownStates.flatMap(s=>codepoints(s)));
 const reachableChars=new Set(reachableStates.flatMap(s=>codepoints(s)));
 const correct=mismatch<T.length?T[mismatch]:null,chosen=mismatch<P.length?P[mismatch]:null;
 const known=knownStates.includes(norm(truth)),reach=reachableStates.includes(norm(truth));
 const reason=P.length===T.length&&matched===T.length?"EXACT":
  correct===null?"ANSWER_TOO_LONG_OR_INSERTION":
  !allKnownChars.has(correct)?"CORRECT_CHARACTER_ABSENT_FROM_RETAINED_STATES":
  !reachableChars.has(correct)?"CHARACTER_EXISTS_BUT_NOT_IN_REACHABLE_COMPONENT":
  known&&!reach?"EXACT_REFERENCE_STATE_IS_IN_ANOTHER_COMPONENT":
  reach?"CORRECT_REFERENCE_STATE_REACHABLE_BUT_WRONG_ROUTE":
  "CHARACTER_EXISTS_BUT_REQUIRED_SEQUENCE_OR_TRANSFORMATION_UNPROVEN";
 const samples=[];
 for(let i=0;i<Math.max(P.length,T.length)&&samples.length<80;i++){
  if(P[i]===T[i])continue;
  samples.push({index:i,expected:T[i]??null,predicted:P[i]??null,
   expectedCodePoint:T[i]?.codePointAt(0)??null,
   predictedCodePoint:P[i]?.codePointAt(0)??null,
   expectedCharInRetainedStates:T[i]!=null&&allKnownChars.has(T[i]),
   expectedCharInReachableStates:T[i]!=null&&reachableChars.has(T[i])});
 }
 return {
  exact:P.length===T.length&&matched===T.length,
  comparedAfterFrozenPrediction:true,referenceNeverSentToPlanner:true,
  predictedCodePoints:P.length,referenceCodePoints:T.length,
  matchedAtSamePosition:matched,
  positionalAccuracy:matched/Math.max(1,T.length),
  firstMismatch:mismatch===Math.max(P.length,T.length)?null:mismatch,
  firstWrongExpected:correct,firstWrongPredicted:chosen,
  firstWrongReason:reason,referenceStateRetained:known,
  referenceStateReachable:reach,
  wrongCharacterExamples:samples,examplesTruncated:samples.length<
   Math.max(P.length,T.length)-matched,
  note:"Character presence is not path reachability; exact reference is used ONLY for post-inference diagnostics."
 };
}
function enumerateSimpleRoutes(source,goals,bySource,{
 maxRoutes=32,maxDepth=24,maxWalk=25000}={}){
 const routes=[],path=[],visited=new Set([source]);
 let walked=0,capped=false,cycles=0;
 if(goals.has(source))routes.push([{state:source,action:null}]);
 function dfs(current,depth){
  if(routes.length>=maxRoutes||walked>=maxWalk){capped=true;return;}
  if(goals.has(current)&&depth>0){
   routes.push([{state:source,action:null},...path.map(x=>({...x}))]);
   return;
  }
  if(depth>=maxDepth){
   if((bySource.get(current)||[]).length)capped=true;
   return;
  }
  for(const e of bySource.get(current)||[]){
   if(walked++>=maxWalk||routes.length>=maxRoutes){capped=true;return;}
   if(visited.has(e.after)){cycles++;continue;}
   visited.add(e.after);path.push({state:e.after,action:e.action,
    firstEpisode:e.firstEpisode,support:e.support});
   dfs(e.after,depth+1);
   path.pop();visited.delete(e.after);
  }
 }
 dfs(source,0);
 return {routes,enumerated:routes.length,cycleSkips:cycles,
  exhaustiveWithinLimits:!capped,iterationBudgetExceeded:walked>=maxWalk,
  maxRoutes,maxDepth,meaning:"Enumerated bounded SIMPLE paths, never infinite walks around cycles."};
}
function bfs(root,map){
 const reached=new Map();
 if(root==null)return reached;
 reached.set(root,0);const queue=[root];
 for(let i=0;i<queue.length;i++)for(const e of map.get(queue[i])||[]){
  const other=typeof e==="string"?e:e.after;
  if(!reached.has(other)){reached.set(other,reached.get(queue[i])+1);queue.push(other);}
 }
 return reached;
}
function weakComponents(states,edges){
 const neighbors=new Map(states.map(s=>[s,new Set()]));
 for(const e of edges){
  if(!neighbors.has(e.before))neighbors.set(e.before,new Set());
  if(!neighbors.has(e.after))neighbors.set(e.after,new Set());
  neighbors.get(e.before).add(e.after);neighbors.get(e.after).add(e.before);
 }
 const groups=[],done=new Set();
 for(const item of neighbors.keys()){
  if(done.has(item))continue;
  const queue=[item],members=[];done.add(item);
  for(let i=0;i<queue.length;i++){
   const x=queue[i];members.push(x);
   for(const y of neighbors.get(x)||[])if(!done.has(y)){
    done.add(y);queue.push(y);
   }
  }
  groups.push(members);
 }
 return groups.sort((a,b)=>b.length-a.length||a[0].localeCompare(b[0]));
}
function pagedRows(arr,offset,limit){
 const start=cap(offset,0,2000000),size=cap(limit,1,1000);
 return {offset:start,pageSize:size,total:arr.length,hasMore:start+size<arr.length,
  nextOffset:start+size<arr.length?start+size:null,items:arr.slice(start,start+size)};
}

export class ForensicPathAtlas{
 constructor(brain){this.brain=eligibleBrain(brain);}
 _memory(){
  const S=this.brain.hypermazeCumulativeExperience;
  return S&&S.version===1?S:null;
 }
 _all(){
  const S=this._memory(),nodes=fromMap(S?.nodes),edges=fromMap(S?.edges),
   blocked=fromSet(S?.blocked),proposed=fromMap(S?.proposed),
   adjacency=fromMap(S?.textAdjacency),operatorMemory=this.brain.observedTransformations;
  const verified=[...edges.values()].filter(e=>e.status==="physically-verified"&&
    !blocked.has(key(e.before,e.action,e.after)));
  const nonwalkable=[...edges.values()].filter(e=>e.status!=="physically-verified"||
    blocked.has(key(e.before,e.action,e.after)));
  return {S,nodes,edges,blocked,proposed,adjacency,verified,nonwalkable,
   operatorMemory};
 }
 summary(){
  const {S,nodes,edges,blocked,proposed,adjacency,verified,operatorMemory:O}=this._all();
  const R=this.brain.qaRoleEvidence?.longForm||null;
  const X=this.brain.crossEpisodeTransformations||null;
  const adjacencyActive=adjacency.size;
  const immutableLimitations={
   observationMemory:O?{observedStates:O.records.size,
    maxObserved:O.maxObserved,evictedStates:O.evicted,
    observedLongRejected:O.rejectedLong,maximumTokensPerState:O.maxTokens,
    droppedOperators:O.droppedOperators,retainedOperators:O.operators.size,
    maxOperators:O.maxOperators}:null,
   causalMemory:S?{nodeBudget:S.maxStates,edgeBudget:S.maxEdges,
    evictedNodes:S.evictedNodes,evictedEdges:S.evictedEdges,
    recordedEpisodeIDs:S.recordedEpisodeIds.size}:null
  };
  return {
   originalBrain:true,originalPlanner:"Discoverer.shapeGraph",
   retainedNodes:nodes.size,retainedEdges:edges.size,
   walkableVerifiedEdges:verified.length,blockedEdges:blocked.size,
   proposedButUnverifiedEdges:proposed.size,
   chronologicalTextLinksNotWalkable:adjacencyActive,
   operatorHypotheses:O?.operators.size??0,
   crossWorldRules:X?.rules?.size??0,
   crossWorldObservations:X?.witnesses??0,
   independentWorldAttempts:X?.atlas?.attempts?.length??0,
   independentlyVerifiedOutcomes:X?.atlas?.outcomes?.length??0,
   failedPhysicalOutcomes:X?.atlas?.outcomes?.filter(x=>x.predictionCorrect===false).length??0,
   discardedWorldAttempts:X?.atlas?.discarded?.attempts??0,
   discardedWorldOutcomes:X?.atlas?.discarded?.outcomes??0,
   qaLongFormEpisodes:R?.episodes??0,
   qaObservedSequentialEdges:R?.observedRoleTransitions??0,
   qaLongFormAnswerTokens:R?.answerTokens??0,
   atlasGeneration:{cumulativeObservations:S?.observedTransitions??0,
    cumulativeRejections:S?.rejectedActions??0,
    cumulativeRepeatObservations:S?.repeatedObservations??0,
    proposedObservations:S?.proposedObservations??0,
    sequentialObservations:S?.sourceAdjacentPairs??0,
    totalOriginalCorpusObservations:O?.seen??0,
    originalOperatorLearningComparisons:O?.comparisons??0,
    originalObservationEvictions:O?.evicted??0,
    crossWorldObservations:X?.witnesses??0,
    crossWorldAtlasAttemptCount:X?.atlas?.attempts?.length??0,
    crossWorldAtlasOutcomeCount:X?.atlas?.outcomes?.length??0,
    crossWorldAtlasEventGeneration:X?.atlas?.nextId??0,
    qaEpisodes:R?.episodes??0},
   wholeWorldEverLivedComplete:false,
   retainedMemoryComplete:!!S&&!(S.evictedNodes||S.evictedEdges||O?.evicted),
   causalTruth:"Only independently witnessed physical edges are walkable.",
   modelTruth:"Observed text order and inferred operators are NOT physical action outcomes.",
   designLimits:immutableLimitations,
   referenceAnswerAvailableToPlanner:false,
   dimensionUsedInTextRoute:"the exact original Brain attraction field; 5D positions are evidence, NOT guaranteed causal"
  };
 }
 page({section="nodes",offset=0,limit=200}={}){
  const A=this._all(),S=A.S,O=A.operatorMemory;
  const lists={
   observations:[...(O?.records.values()||[])].map(x=>({
    observedId:x.id,rawText:renderObservation(x.tokens),
    completeActiveTokenCount:x.tokens.length,seen:x.count,
    provenance:"original native ObservedTransformations retained corpus observation",
    status:"OBSERVED_TEXT_NOT_AUTOMATICALLY_WALKABLE"})),
   qaEpisodes:[...(this.brain.qaRoleEvidence?.longForm?.sequences||[])].map((e,i)=>({
    retainedIndex:i,questionChunkDigests:e.questionChunks||[],
    answerChunkDigests:e.answerChunks||[],
    status:"OBSERVED_CHUNKS_SEQUENTIAL_NOT_VERIFIED_ACTIONS"})),
   nodes:[...A.nodes.values()].map(x=>({
    text:x.text,firstEpisode:x.firstEpisode,lastEpisode:x.lastEpisode,
    support:x.seen,lastSourceCount:x.sourceCount,
    position5D:this.brain.trace?.geo?.U?.get("text-state:"+x.text)??null})),
   verified:A.verified.map(e=>({
    from:e.before,to:e.after,action:e.action,firstEpisode:e.firstEpisode,
    lastEpisode:e.lastEpisode,independentEpisodes:e.episodes?.size??0,
    episodeIds:[...(e.episodes||[])],support:e.support,source:e.source,
    status:e.status,blocked:false})),
   blocked:[...A.blocked].map(encoded=>{
    const tuple=JSON.parse(encoded);
    return {from:tuple[0],action:tuple[1],to:tuple[2],status:"rejected-by-world"};}),
   proposals:[...A.proposed.values()].map(e=>({
    from:e.before,to:e.after,action:e.action,source:e.source,
    episode:e.firstEpisode,status:"HYPOTHESIS_NOT_WALKABLE"})),
   textOnly:[...A.adjacency].map(([encoded,v])=>{
    const tuple=JSON.parse(encoded);
    return {from:tuple[0],to:tuple[2],action:tuple[1],
     occurrenceCount:v.count,firstEpisode:v.firstEpisode,
     status:"CHRONOLOGICAL_NOT_PHYSICAL"};}),
   operators:[...(O?.operators.values()||[])].map(op=>({
    kind:op.kind,index:op.index,from:op.from,to:op.to,
    leftAnchor:op.left,rightAnchor:op.right,
    observedSupport:op.sourceObservations,evidence:op.evidence,
    status:"INFERRED_EFFECT_REQUIRES_EXTERNAL_ACTION_VERIFICATION"})),
   attempts:[...(this.brain.crossEpisodeTransformations?.atlas?.attempts||[])].map(r=>({
    ...r,status:"FROZEN_PREACTION_EXPERIMENT",referenceAnswerProvided:false})),
   outcomes:[...(this.brain.crossEpisodeTransformations?.atlas?.outcomes||[])].map(r=>({
    ...r,status:r.predictionCorrect?"EXTERNALLY_VERIFIED_CORRECT_ACTION":
     "EXTERNALLY_FALSIFIED_ACTION"})),
   crossWorld:[...(this.brain.crossEpisodeTransformations?.rules?.values()||[])].map(r=>({
    action:r.action,kind:r.type,delta:r.delta,from:r.from,to:r.to,
    worlds:[...r.worlds],distinctInputs:r.values.size,
    conflicting:r.conflicted,support:r.witnesses,
    status:"TRANSFER_HYPOTHESIS_UNTIL_VERIFIED_IN_TARGET_WORLD"}))
  };
  if(!Object.hasOwn(lists,section))throw Error("Unknown forensic atlas section "+section);
  return {section,...pagedRows(lists[section],offset,limit),
   source:"ONE existing original native Brain, no fabricated nodes or transitions",
   ephemeralReadOnly:true,atlasTotals:this.summary()};
 }
 analyse({start,required=[],nativePlan=null,maxRoutes=24,maxDepth=32,
  maxExamples=80}={}){
  const A=this._all(),source=norm(start),goal=unique(required.map(String)),
   verified=A.verified,nodes=[...A.nodes.keys()];
  const goalNodes=nodes.filter(s=>{
   const tokens=new Set(tokenizeObservation(s));
   return goal.length>0&&goal.every(t=>tokens.has(t));
  });
  const adjacency=new Map(),inverse=new Map();
  for(const e of verified){
   if(!adjacency.has(e.before))adjacency.set(e.before,[]);
   adjacency.get(e.before).push(e);
   if(!inverse.has(e.after))inverse.set(e.after,[]);
   inverse.get(e.after).push(e.before);
  }
  const forward=bfs(A.nodes.has(source)?source:null,adjacency),backward=new Map(),
   queue=goalNodes.slice();
  for(const s of queue)backward.set(s,0);
  for(let i=0;i<queue.length;i++)for(const prev of inverse.get(queue[i])||[]){
   if(!backward.has(prev)){backward.set(prev,backward.get(queue[i])+1);queue.push(prev);}
  }
  const fset=new Set(forward.keys()),bset=new Set(backward.keys());
  const components=weakComponents(nodes,verified);
  const reachedGoal=goalNodes.some(s=>fset.has(s));
  const rootKnown=A.nodes.has(source),canNative=(nativePlan?.originalPlanner===
   "Discoverer.shapeGraph");
  let diagnosis=!rootKnown?"START_NOT_WITNESSED_IN_CAUSAL_MEMORY":
   !goalNodes.length?"GOAL_NOT_IN_RETAINED_CAUSAL_STATES":
   reachedGoal&&nativePlan?.found===false?
     "VERIFIED_PATH_EXISTS_BUT_ORIGINAL_POLICY_FAILED_TO_SELECT":
   reachedGoal?"AT_LEAST_ONE_VERIFIED_PATH_EXISTS":
   "DISCONNECTED_VERIFIED_COMPONENTS_REQUIRE_NEW_EVIDENCE";
  if(rootKnown&&A.S&&(A.S.evictedNodes||A.S.evictedEdges)&&!reachedGoal)
   diagnosis="POSSIBLE_MEMORY_EVICTION_OR_MISSING_CAUSAL_BRIDGE";
  const attempts=[],add=(kind,from,to,action,reason,provenance=null)=>{
   if(!fset.has(from)||fset.has(to)||attempts.length>=maxExamples)return;
   attempts.push({kind,from,to,action,reason,
    reachesKnownGoalComponent:bset.has(to),
    verified:false,walkable:false,provenance});
  };
  for(const e of A.proposed.values())
   add("OBSERVED_PROPOSAL",e.before,e.after,e.action,
    "MUST_VERIFY_PHYSICAL_EFFECT",e.firstEpisode);
  for(const [encoded,v] of A.adjacency){
   let t;try{t=JSON.parse(encoded);}catch{continue;}
   add("CORPUS_ORDER_ONLY",t[0],t[2],t[1],
    "CONSECUTIVE_TEXT_IS_NOT_A_PHYSICAL_ACTION",v.firstEpisode);
  }
  for(const encoded of A.blocked){
   let t;try{t=JSON.parse(encoded);}catch{continue;}
   add("EXPLICIT_WORLD_REJECTION",t[0],t[2],t[1],
    "PHYSICALLY_REJECTED_OR_CONTRADICTED");
  }
  // Potential new learned edit operators are proof hypotheses, NOT
  // automatically walkable world edges. Enumerate from frontiers only.
  const O=A.operatorMemory;
  if(O&&attempts.length<maxExamples){
   const maxFrontier=cap(maxExamples,1,100);
   let inspected=0;
   for(const from of fset){
    if(inspected++>=maxFrontier||attempts.length>=maxExamples)break;
    const options=O.neighbors(tokenizeObservation(from));
    for(const e of options){
     const to=renderObservation(e.tokens);
     const op=e.action||{};
     add("LEARNED_EDIT_HYPOTHESIS",from,to,
      String(op.key||op.kind||"unknown-edit"),
      "LANGUAGE_OPERATION_NOT_VERIFIED_AS_WORLD_EFFECT",
      op.learnedFrom||null);
    }
   }
  }
  const routes=source&&goalNodes.length?enumerateSimpleRoutes(source,
   new Set(goalNodes),adjacency,{maxRoutes:cap(maxRoutes,1,100),
    maxDepth:cap(maxDepth,1,256),maxWalk:50000}):
   {routes:[],enumerated:0,exhaustiveWithinLimits:false,maxRoutes,maxDepth};
  const candidateRoutes=attempts.filter(e=>e.reachesKnownGoalComponent);
  // The original text operator can still propose a candidate from a source
  // absent in cumulative physical evidence. Keep this separate from the
  // verified reachable graph rather than manufacturing a causal start node.
  const orphanOperators=[];
  if(!rootKnown&&source&&O){
   for(const choice of O.neighbors(tokenizeObservation(source)).slice(0,maxExamples)){
    orphanOperators.push({from:source,
     to:renderObservation(choice.tokens),
     action:choice.action?.key??choice.action?.kind??"unknown",
     evidence:choice.action?.learnedFrom??null,
     reason:"TEXT_OPERATOR_HYPOTHESIS_ONLY; NO VERIFIED CAUSAL START",
     verified:false,walkable:false});
   }
  }
  const frontier=[...forward].filter(([s])=>!(adjacency.get(s)||[]).length)
   .slice(0,maxExamples).map(([text,dist])=>({text,stepsFromStart:dist,
    goalTokenOverlap:tokenizeObservation(text).filter(t=>goal.includes(t)).length}));
  const preview=attempts.sort((a,b)=>Number(b.reachesKnownGoalComponent)-
   Number(a.reachesKnownGoalComponent));
  return {
   source:"forensic audit, not a replacement solver",
   start:source,goalTokens:goal,referenceWasNotSupplied:true,
   originalPlanner:nativePlan?.originalPlanner||"Discoverer.shapeGraph",
   originalPlanFound:!!nativePlan?.found,originalPlanCertified:canNative,
   originalSelectedPath:nativePlan?.actions?.map(x=>({
    from:x.before,to:x.after,action:x.action,firstEpisode:x.evidenceEpisode,
    support:x.observedSupport,value:x.value}))||[],
   predictedBeforeAction:nativePlan?.predicted??null,
   selectedPathEvidenceComplete:nativePlan?.actions?.every(x=>
    x.edgeStatus==="physically-verified")??null,
   atlas:this.summary(),diagnosis,
   topology:{
    totalRetainedNodes:nodes.length,retainedVerifiedEdges:verified.length,
    reachableFromStart:forward.size,goalNodesRetained:goalNodes.length,
    canReachGoalInVerifiedGraph:backward.size,
    weakComponents:components.length,
    largestComponents:components.slice(0,30).map(x=>({
     count:x.length,example:x[0],containsStart:x.includes(source),
     containsGoal:x.some(t=>goalNodes.includes(t))})),
    allComponentSummariesIncluded:components.length<=30,
    verifiedPathExists:reachedGoal,
    hasCycles:routes.cycleSkips>0,
    retainedTopologyNotEverLivedCorpus:!!(A.S?.evictedNodes||A.S?.evictedEdges)
   },
   verifiedPathAlternatives:routes,
   deadEnds:frontier,deadEndsTruncated:[...forward].filter(
    ([s])=>!(adjacency.get(s)||[]).length).length>maxExamples,
   missingBridgeCandidates:preview,unanchoredTextOperatorHypotheses:orphanOperators,
   candidateCountTruncated:attempts.length>=maxExamples,
   oneEvidenceBridgeCandidates:candidateRoutes,
   nextExperiment:candidateRoutes.length?{
    type:"VERIFY_SPECIFIC_BRIDGE_IN_INDEPENDENT_WORLD",
    candidates:candidateRoutes.slice(0,10),
    warning:"A proposed bridge is NOT a discovered valid path."}:{
    type:"OBSERVE_NEW_TRUE_BEFORE_ACTION_AFTER_AT_REACHABLE_FRONTIER",
    startingStates:frontier.slice(0,10),
    warning:"No known candidate joins this component to the goal. Do not invent missing physics."},
   designRestrictions:this.summary().designLimits,
   noise:{selectionControlledByNoiseInThisAuditor:false,
    nativeNoiseStatus:this.brain.noiseAgent?.status?.()??null},
   pagination:"Use page(section,offset,limit) for EVERY retained edge, operator and rejected path; neither this summary nor a plot replaces full pages.",
   interpretation:"If semantic target is UNKNOWN, this is an atlas of known edges, not proof of arbitrary unseen answer correctness."
  };
 }
 // This is the ONLY method that can inspect withheld/correct output text.
 // Call it *after* the ORIGINAL planner completed its pre-action shape.
 compareAfterFrozenPlan({atlasResult,reference}={}){
  if(!atlasResult||typeof reference!=="string")
   throw Error("Need a completed frozen atlas and withheld reference for AFTER-only scoring");
  const A=this._all(),source=atlasResult.start;
  const adjacency=new Map();
  for(const e of A.verified){
   if(!adjacency.has(e.before))adjacency.set(e.before,[]);
   adjacency.get(e.before).push(e);
  }
  const reachable=[...bfs(A.nodes.has(source)?source:null,adjacency).keys()];
  return {atlasDiagnosis:atlasResult.diagnosis,...referenceAudit(
   atlasResult.predictedBeforeAction??"",reference,
   {knownStates:[...A.nodes.keys()],reachableStates:reachable})};
 }
}
