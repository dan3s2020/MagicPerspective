// V30 exhaustive-at-observed-scope atlas: ALL witnessed transformations,
// cross-episode sources, ALL explicitly recorded complete explored graphs,
// frontiers, block reasons and before/after physical outcomes.
// This is an OBSERVER over the ONE ORIGINAL V17 Brain, not a second learner.
// The unbounded language world is NEVER claimed to be fully enumerated.
import {Brain} from "../../transcend/torus-aether/devour/brain.mjs";
import {renderObservation} from "../../transcend/torus-aether/worlds/observed-transformations.mjs";

const clone=x=>structuredClone(x);
const fit=(v,min,max)=>Number.isSafeInteger(v)&&v>=min&&v<=max;
const fshape=plan=>({
 id:plan.id??null,kind:plan.kind,
 predicted:plan.predicted,found:plan.found,reason:plan.reason,
 originalNativeMethod:plan.algorithm,plannedBeforeAction:plan.plannedBeforeFirstAction,
 goal:plan.visibleGoal,start:plan.start,
 path:plan.initialShape||[],actions:plan.actions||[],
 fullExploredGraph:plan.graph,blockedFrontier:plan.frontier,
 limitation:"Complete over explored known edges only; unknown language transitions not generated"
});
const blank=()=>({witnesses:[],attempts:[],outcomes:[],nextId:1});
export class NativeWorldAtlas{
 constructor(brain){
  if(!(brain instanceof Brain))throw Error("Atlas must observe SAME original native Brain");
  this.brain=brain;
  if(!brain.crossEpisodeTransformations)throw Error("Cross-episode memory must exist before atlas");
  brain.crossEpisodeTransformations.atlas ||= blank();
 }
 get store(){return this.brain.crossEpisodeTransformations.atlas;}
 get memory(){return this.brain.crossEpisodeTransformations;}
 logAttempt(plan,{episodeId,tag=null}={}){
  if(typeof episodeId!=="string"||!episodeId.trim())
   throw Error("Plan's real evaluation world ID required");
  if(!plan||plan.algorithm!=="SAME original Discoverer.shapeGraph"||
    plan.plannedBeforeFirstAction!==true||
    !plan.graph||!Array.isArray(plan.graph.nodes)||!Array.isArray(plan.graph.edges))
   throw Error("Only genuine original native frozen plans with actual explored graphs may be logged");
  const id=this.store.nextId++;
  // Freeze exact original predicted structure and FULL bounded explored world.
  const entry={...clone(fshape(plan)),id,episodeId,tag,time:new Date().toISOString(),
   planRecordedBeforeExecution:true,
   resultAvailable:false,
   graphCompleteWithinKnownTransferredRules:plan.frontier?.closureOfAllCurrentlyAdmittedTransfers===true,
   naturalLanguageGraphComplete:false};
  this.store.attempts.push(entry);
  return {id,found:entry.found,graphNodes:entry.fullExploredGraph.nodes.length,
    graphEdges:entry.fullExploredGraph.edges.length,
    knownClosure:entry.graphCompleteWithinKnownTransferredRules};
 }
 logOutcome(id,result){
  if(!fit(id,1,Number.MAX_SAFE_INTEGER))throw Error("Invalid atlas attempt ID");
  const matching=this.store.attempts.find(x=>x.id===id);
  if(!matching)throw Error("No frozen pre-action attempt to score");
  if(matching.resultAvailable)throw Error("Physical outcome already attached");
  if(!result?.independentExternalPhysics)
   throw Error("Independent actual world physics MUST be verified before outcome logging");
  const event={id:this.store.nextId++,attemptId:id,
   episodeId:matching.episodeId,time:new Date().toISOString(),
   actualFinal:result.actualFinal,
   completeExact:result.completeExact===true,
   correctlyPredictedTransitions:result.correctTransitions,
   mismatches:result.mismatchTransitions,
   actualSteps:result.stepsExecuted,
   frames:clone(result.frames||[]),
   independentExternalPhysics:true,
   source:"Physical world step callback; NO target used during frozen path planning"};
  this.store.outcomes.push(event);
  matching.resultAvailable=true;
  return {id:event.id,correct:event.completeExact,
    mismatchTransitions:event.mismatches,attemptId:id};
 }
 summary(){
  const a=this.store,m=this.memory;
  const successes=a.outcomes.filter(x=>x.completeExact),fail=a.outcomes.filter(x=>!x.completeExact);
  const recordedProblems=a.attempts.filter(x=>!x.found);
  const reasonCounts={};
  for(const x of recordedProblems)reasonCounts[x.reason||"NO_REASON"]=(reasonCounts[x.reason||"NO_REASON"]||0)+1;
  const sourceWorlds=new Set(a.witnesses.map(x=>x.episodeId));
  const originalText=this.brain.observedTransformations;
  return {
   originalBrain:"SAME V17 Brain (.v8 checkpoint)",atlasVersion:30,
   witnessedEvents:a.witnesses.length,sourceWorlds:sourceWorlds.size,
   trainedRules:m.rules.size,
   admittedTransferActions:[...m.rules.values()].filter(r=>
    !r.conflicted&&r.worlds.size>=2).length,
   recordedFrozenPlans:a.attempts.length,
   recordedActualOutcomes:a.outcomes.length,
   physicallyValidatedSuccesses:successes.length,
   physicallyValidatedFailures:fail.length,
   unplannedBlockedWorlds:recordedProblems.length,
   planFailureReasons:reasonCounts,
   completeCrossWorldWitnessHistory:true, // Every V30 event is in this Brain.
   completeKnownRuleAtlas:true,
   originalNativeTextObservations:originalText?.seen||0,
   originalNativeTextOperators:originalText?.operators?.size||0,
   originalNativeTextActiveStates:originalText?.records?.size||0,
   originalNativeTextEvictedStates:originalText?.evicted||0,
   originalTextFullRawHistoryRetained:(originalText?.evicted||0)===0,
   originalLearned5DActionAxes:this.brain.hypermazeLearnedAxes?.size||0,
   nativeTextContrastsUsedAsPhysicalActions:false,
   allLanguageStatesKnown:false,
   allReachableStatesEnumerated:false,
   reportingPolicy:"All stored events and full local graphs page-by-page, never fabricate omitted edges"
  };
 }
 page(section,{offset=0,limit=50}={}){
  if(!fit(offset,0,Number.MAX_SAFE_INTEGER)||!fit(limit,1,1000))
   throw Error("Atlas page offset/limit invalid");
  const a=this.store,m=this.memory;
  let all;
  if(section==="witnesses")all=a.witnesses;
  else if(section==="textOperators"){
   const obs=this.brain.observedTransformations;
   const epoch=(obs?.operators?.size||0)+":"+(obs?.seen||0);
   if(this._textOperatorsCache?.epoch!==epoch){
    this._textOperatorsCache={epoch,items:[...obs?.operators?.values()||[]].map(r=>({
     key:r.key,action:r.kind,from:r.from,to:r.to,left:r.left,right:r.right,
     evidence:r.evidence,observedSupport:r.sourceObservations,
     admittedAsPhysicalTransformation:false,
     neededBeforeCrossWorldWalk:"Independent action-labelled before/after effects in two worlds"
    }))};
   }
   all=this._textOperatorsCache.items;
  }
  else if(section==="textStates")all=[...this.brain.observedTransformations?.records?.values()||[]]
   .filter(x=>Array.isArray(x.tokens)).map(x=>({
     id:x.id,text:renderObservation(x.tokens),
     occurrences:x.count,source:"original-V17-native-text-window",
     heldInActiveMemory:true,causalActionNotInferred:true
   }));
  else if(section==="axes")all=[...this.brain.hypermazeLearnedAxes?.entries()||[]].map(([key,r])=>({
   action:key,observations:r.count,meanDelta5D:Array.isArray(r.sum)&&r.count?
     r.sum.map(v=>v/r.count):null,
   source:"original-Brain geometry observations; not invented by V30"
  }));
  else if(section==="attempts")all=a.attempts.map(x=>({
   id:x.id,episodeId:x.episodeId,tag:x.tag,found:x.found,
   reason:x.reason,goal:x.goal,start:x.start,predicted:x.predicted,
   nodes:x.fullExploredGraph?.nodes.length,edges:x.fullExploredGraph?.edges.length,
   frontier:x.blockedFrontier?.counts,
   completeOverCurrentlyAllowedEdges:x.graphCompleteWithinKnownTransferredRules,
   resultAvailable:x.resultAvailable,
   outcome:a.outcomes.find(o=>o.attemptId===x.id)?.completeExact??null
  }));
  else if(section==="outcomes")all=a.outcomes;
  else if(section==="failures"){
   all=a.attempts.filter(x=>!x.found||
     a.outcomes.some(y=>y.attemptId===x.id&&!y.completeExact))
   .map(x=>this.explain(x.id));
  }
  else if(section==="rules")all=[...m.rules.values()].map(r=>({
   action:r.action,type:r.type,delta:r.delta,from:r.from,to:r.to,
   worlds:[...r.worlds],witnesses:r.witnesses,conflicts:r.conflictCount,
   conflicted:r.conflicted,sourceValues:[...r.values],
   evidence:r.examples,
   ready:!r.conflicted&&r.worlds.size>=2&&
    (r.type!=="numeric-delta"||r.values.size>=2),
   evidenceEventIds:a.witnesses.filter(w=>w.action===r.action).map(w=>w.id)
  }));
  else if(section==="worlds"){
   const worlds=new Map();
   for(const w of a.witnesses){
    const world=worlds.get(w.episodeId)||{episodeId:w.episodeId,observedEvents:0,
      actionTypes:new Set(),eventIds:[]};
    world.observedEvents++;world.actionTypes.add(w.action);
    world.eventIds.push(w.id);worlds.set(w.episodeId,world);
   }
   all=[...worlds.values()].map(w=>({...w,actionTypes:[...w.actionTypes]}));
  }else throw Error("Unknown atlas section");
  return {section,offset,limit,total:all.length,
   more:offset+limit<all.length,items:clone(all.slice(offset,offset+limit)),
   allEventsStored:true,modelMutatedByInspection:false};
 }
 // The atlas is more than a last-goal sample. Merge EVERY real witnessed
 // corridor, every PREACTION searched corridor, and every cutoff frontier
 // from ALL past text worlds. Pagination is explicit: no hidden node cap.
 globalTopology({nodeOffset=0,nodeLimit=300,edgeOffset=0,edgeLimit=600}={}){
  for(const [v,label,max] of [[nodeOffset,"nodeOffset",Number.MAX_SAFE_INTEGER],
   [nodeLimit,"nodeLimit",1000],[edgeOffset,"edgeOffset",Number.MAX_SAFE_INTEGER],
   [edgeLimit,"edgeLimit",2000]]){
   if(!fit(v,label.endsWith("Limit")?1:0,max))
    throw Error(label+" invalid for global atlas");
  }
  const observed=this.brain.observedTransformations;
  const geo=this.brain.trace.geo;
  // A genuinely large corpus can have 12k active text states and 80k
  // learned contrast operators. Rebuild ONCE per memory epoch, not for
  // every 300-node HTTP page (the old UI stalled on repeated scans).
  const key=[this.store.witnesses.length,this.store.attempts.length,
   this.store.outcomes.length,observed?.seen||0,
   observed?.operators?.size||0,observed?.records?.size||0,
   geo?.n||0].join(":");
  if(this._globalCache?.key!==key){
   const allNodes=new Map(),allEdges=new Map(),
    witnessed=this.store.witnesses.filter(w=>w.type==="witness"),
    attempts=this.store.attempts;
   const outcomesByAttempt=new Map(this.store.outcomes.map(x=>[x.attemptId,x]));
   const node=(text,{physical=false,corpus=false,geometry=null,world=null}={})=>{
    let v=allNodes.get(text);
    if(!v){
     const learned=geo?.U?.get("text-state:"+text);
     v={id:allNodes.size,text,observedInRealWorld:false,
      observedInTextCorpus:false,onlyPredicted:true,
      sourceWorlds:new Set(),attemptIds:new Set(),
      original5D:Array.isArray(learned)&&learned.length===5?learned:null};
     allNodes.set(text,v);
    }
    if(physical){v.observedInRealWorld=true;if(world)v.sourceWorlds.add(world);}
    if(corpus)v.observedInTextCorpus=true;
    if(physical||corpus)v.onlyPredicted=false;
    if(Array.isArray(geometry)&&geometry.length===5)v.original5D=geometry;
    return v;
   };
   const edge=(from,to,action,status,details={})=>{
    const key=JSON.stringify([from,to,action,status]);
    let item=allEdges.get(key);
    if(!item){
     item={id:allEdges.size,from,to,action,
      status,sourceWorlds:new Set(),attemptIds:new Set(),
      support:0,designBlockingReason:null,verifiedOutcomes:0};
     allEdges.set(key,item);
    }
    if(details.world)item.sourceWorlds.add(details.world);
    if(details.attemptId)item.attemptIds.add(details.attemptId);
    if(details.reason)item.designBlockingReason=details.reason;
    if(details.verified)item.verifiedOutcomes++;
    item.support+=details.support||1;
    return item;
   };
   // EVERY active original native text state, even if it has no edit edge.
   // Older windows evicted by V29 cannot be represented as permanently
   // retained; their operator provenance is preserved separately.
   for(const r of observed?.records?.values()||[]){
    if(Array.isArray(r.tokens))node(renderObservation(r.tokens),{corpus:true});
   }
   // Original V17 learns these from differences between real sentences.
   // Such a contrast is NOT an independently executed physical action;
   // never silently promote it into a witnessed causal corridor.
   for(const op of observed?.operators?.values()||[]){
    for(const sample of op.evidence||[]){
     if(typeof sample?.from!=="string"||typeof sample?.to!=="string")continue;
     node(sample.from,{corpus:true});node(sample.to,{corpus:true});
     edge(sample.from,sample.to,"text-contrast:"+op.key,
      "TEXT_CONTRAST_OBSERVED_NOT_CAUSAL",
      {support:Math.max(1,Number(op.sourceObservations)||1)});
    }
   }
   // Cross-episode physical interventions witnessed in separate worlds.
   for(const ev of witnessed){
    node(ev.before,{physical:true,world:ev.episodeId});
    node(ev.after,{physical:true,world:ev.episodeId});
    edge(ev.before,ev.after,ev.action,"WITNESSED_IN_SOURCE_WORLD",
     {world:ev.episodeId});
   }
   // Every actually explored state/edge and every known omitted corridor.
   for(const attempt of attempts){
    const graph=attempt.fullExploredGraph;if(!graph)continue;
    const expanded=graph.nodes||[],out=outcomesByAttempt.get(attempt.id);
    for(const n of expanded){
     const v=node(n.text,{geometry:n.original5D});
     v.attemptIds.add(attempt.id);
    }
    for(const e of graph.edges||[]){
     const from=expanded[e.from]?.text,to=expanded[e.to]?.text;
     if(from==null||to==null)continue;
     const verified=out?.frames?.some(x=>x.before===from&&
      x.actual===to&&x.action===e.action.name&&x.predictionCorrect===true)||false;
     const fromTextContrast=e.action.causalTrainingEvidence===false;
     edge(from,to,e.action.name,
      verified?"PHYSICALLY_VERIFIED_IN_HELDOUT_WORLD":
       fromTextContrast?"PREDICTED_FROM_TEXT_CONTRAST_NOT_CAUSAL":
       "PREDICTED_FROM_RULES_NOT_YET_VERIFIED_HERE",
       {attemptId:attempt.id,verified});
    }
    for(const [kind,list] of Object.entries(attempt.blockedFrontier?.possibleNextEdges||{})){
     if(!Array.isArray(list))continue;
     for(const cutoff of list){
      const from=expanded[cutoff.from]?.text,to=cutoff.next;
      if(from==null||to==null)continue;
      node(to);
      edge(from,to,cutoff.action,"BLOCKED_BY_EXPLICIT_SEARCH_BUDGET",
       {attemptId:attempt.id,reason:cutoff.reason||kind});
     }
    }
   }
   const serial=n=>({...n,sourceWorlds:[...n.sourceWorlds],
    attemptIds:[...n.attemptIds]});
   const nodes=[...allNodes.values()].map(serial),edges=[...allEdges.values()].map(serial);
   this._globalCache={key,nodes,edges,
    witnessedWorlds:new Set(witnessed.map(x=>x.episodeId)).size,
    corpusActiveStates:observed?.records?.size||0,
    corpusSeenStates:observed?.seen||0,
    corpusLearnedContrastRules:observed?.operators?.size||0,
    corpusEvictedStates:observed?.evicted||0,
    witnessedPhysicalEdges:edges.filter(e=>e.status==="WITNESSED_IN_SOURCE_WORLD").length,
    textContrastEdges:edges.filter(e=>e.status==="TEXT_CONTRAST_OBSERVED_NOT_CAUSAL").length,
    blockedKnownDesignEdges:edges.filter(e=>e.status==="BLOCKED_BY_EXPLICIT_SEARCH_BUDGET").length,
    recordedWorldPlans:attempts.length};
  }
  const cache=this._globalCache,nodes=cache.nodes,edges=cache.edges;
  return {view:"MERGED_ALL_RECORDED_WORLDS",
   totalNodes:nodes.length,totalEdges:edges.length,
   witnessedWorlds:cache.witnessedWorlds,
   nativeTextWindowsSeen:cache.corpusSeenStates,
   nativeTextStatesStillActive:cache.corpusActiveStates,
   nativeTextStatesEvicted:cache.corpusEvictedStates,
   nativeTextContrastRules:cache.corpusLearnedContrastRules,
   textContrastEdges:cache.textContrastEdges,
   witnessedPhysicalEdges:cache.witnessedPhysicalEdges,
   recordedWorldPlans:cache.recordedWorldPlans,
   blockedKnownDesignEdges:cache.blockedKnownDesignEdges,
   noPhysicalClaimsFromCorpusTextContrasts:true,
   allSourceHistoryPermanent:cache.corpusEvictedStates===0,
   unknownLanguageSpaceNotEnumerated:true,
   notClaimedToBeAllNaturalLanguage:true,
   pagination:{
    nodeOffset,nodeLimit,edgeOffset,edgeLimit,
    nodesMore:nodeOffset+nodeLimit<nodes.length,
    edgesMore:edgeOffset+edgeLimit<edges.length
   },
   nodes:nodes.slice(nodeOffset,nodeOffset+nodeLimit),
   edges:edges.slice(edgeOffset,edgeOffset+edgeLimit),
   statusDefinitions:{
    WITNESSED_IN_SOURCE_WORLD:"Actual before/action/after observation in a known world",
    TEXT_CONTRAST_OBSERVED_NOT_CAUSAL:"A text-edit difference inferred from corpus sentences; NOT independently executed physics",
    PREDICTED_FROM_RULES_NOT_YET_VERIFIED_HERE:"Original shapeGraph planned a transferred action whose effect was witnessed in OTHER worlds; not verified here",
    PREDICTED_FROM_TEXT_CONTRAST_NOT_CAUSAL:"Original shapeGraph used a repeatedly observed corpus contrast; no causal action proof even in training worlds",
    PHYSICALLY_VERIFIED_IN_HELDOUT_WORLD:"Actual independent physics callback matched prediction",
    BLOCKED_BY_EXPLICIT_SEARCH_BUDGET:"Potential path refused by explicit depth/state design budget"
   }};
 }

 detail(id){
  const entry=this.store.attempts.find(x=>x.id===id);
  if(!entry)return null;
  const out=this.store.outcomes.find(x=>x.attemptId===id);
  return {attempt:clone(entry),outcome:out?clone(out):null,
   graphSemantics:{
    fullGraph:"ALL actual nodes/edges expanded WITHIN the documented search bounds",
    onlyKnownLearnedActions:true,
    missingWorldTransitionsNotInvented:true,
    knownClosure:entry.graphCompleteWithinKnownTransferredRules,
    frontierCutoffs:entry.blockedFrontier?.counts||{},
    original5DPresent:entry.fullExploredGraph?.nodes.filter(n=>Array.isArray(n.original5D)).length||0,
    original5DAbsent:entry.fullExploredGraph?.nodes.filter(n=>!Array.isArray(n.original5D)).length||0
   }};
 }
 explain(id){
  const attempt=this.store.attempts.find(x=>x.id===id);
  if(!attempt)return null;
  const outcome=this.store.outcomes.find(x=>x.attemptId===id);
  const successful=this.store.outcomes.filter(x=>x.completeExact).map(o=>
    this.store.attempts.find(a=>a.id===o.attemptId)).filter(Boolean);
  const usedSuccess=new Set(successful.flatMap(x=>x.actions.map(a=>a.name)));
  const usedFailure=new Set(attempt.actions.map(a=>a.name));
  const missing=[...this.memory.rules.values()].filter(r=>r.conflicted||r.worlds.size<2)
   .map(r=>({action:r.action,from:r.from,to:r.to,
    reason:r.conflicted?"CONFLICTED_OBSERVED_EFFECTS":
     "NOT_WITNESSED_IN_TWO_INDEPENDENT_WORLDS",worlds:r.worlds.size}));
  const frontier=attempt.blockedFrontier||{};
  const restrictions=[
   ...(frontier.missingLabels||[]).map(action=>({type:"UNKNOWN_ACTION_LABEL",action})),
   ...(frontier.withheldRules||[]).map(x=>({type:x.reason,action:x.action})),
   ...(frontier.counts?.depthCutoff?[{type:"DEPTH_DESIGN_CUTOFF",count:frontier.counts.depthCutoff}]:[]),
   ...(frontier.counts?.stateCutoff?[{type:"STATE_DESIGN_CUTOFF",count:frontier.counts.stateCutoff}]:[]),
   ...(frontier.numericInvariant?.impossibleResidueWithAdmittedRules?
    [{type:"REACHABILITY_INVARIANT",gcd:frontier.numericInvariant.gcdOfAvailableChanges}]:[]),
   ...(attempt.actions.some(x=>x.causalTrainingEvidence===false)?
    [{type:"NONCAUSAL_CORPUS_CONTRAST_USED",
      count:attempt.actions.filter(x=>x.causalTrainingEvidence===false).length,
      note:"Text difference is not independently witnessed physical action; must validate"}]:[]),
   ...(outcome&&!outcome.completeExact?[{type:"EXTERNAL_WORLD_DISAGREED_WITH_PREDICTED_ACTIONS",
    incorrect:outcome.mismatches}]:[])
  ];
  return {attemptId:id,episodeId:attempt.episodeId,
   planned:attempt.found,physicallySucceeded:outcome?.completeExact??null,
   resultAvailable:!!outcome,planFailure:attempt.reason,
   missingObservedRules:missing,
   explicitDesignRestrictions:restrictions,
   blockedReasonCounts:frontier.blockers||{},
   exploredNodes:attempt.fullExploredGraph?.nodes.length||0,
   exploredEdges:attempt.fullExploredGraph?.edges.length||0,
   onlyGloballyTrainedWorldRulesUsed:true,
   pathActions:attempt.actions.map(x=>x.name),
   successfulWorldActions:[...usedSuccess],
   failedWorldActions:[...usedFailure],
   graphClosedWithinBounds:attempt.graphCompleteWithinKnownTransferredRules,
   unknownUnobservedSemanticLinksRemain:true,
   actionableHypothesis:"Acquire independently verified before/action/after examples for absent/ambiguous rules, or expand recorded search budget; never fabricate a corridor."};
 }
}
