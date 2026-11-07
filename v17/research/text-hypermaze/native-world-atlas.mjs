// V30 exhaustive-at-observed-scope atlas: ALL witnessed transformations,
// cross-episode sources, ALL explicitly recorded complete explored graphs,
// frontiers, block reasons and before/after physical outcomes.
// This is an OBSERVER over the ONE ORIGINAL V17 Brain, not a second learner.
// The unbounded language world is NEVER claimed to be fully enumerated.
import {Brain} from "../../transcend/torus-aether/devour/brain.mjs";

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
  const entry={id,episodeId,tag,time:new Date().toISOString(),
   ...clone(fshape(plan)),
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
   completeMemoryHistory:true, // Every event is retained in this saved Brain.
   completeKnownRuleAtlas:true,
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
