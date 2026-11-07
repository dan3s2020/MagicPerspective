// V30: durable, cross-exercise adjacency IN THE ORIGINAL V17 Brain.
// Each witnessed physical transition is remembered across separate worlds.
// Same states in different episodes become one node (there is no per-question
// reset). Other observed V17 text edit effects can be considered as
// clearly-labelled HYPOTHESES; they are NEVER mistaken for physical evidence.
//
// This object contains NO alternate planning algorithm. Topology enumeration
// discovers the currently available nodes/edges. The sole route planner is
// brain.disc.shapeGraph(), with the EXACT native learned conductance,
// attraction, 0.97 field propagation and original ascent policy.
//
// Language role text adjacency is not a semantic state transformation.
// It is NOT traversable until a separate action/outcome verifies it.
import {KIND} from "../../transcend/torus-aether/worlds/exercise.mjs";
import {tokenizeObservation,renderObservation} from
 "../../transcend/torus-aether/worlds/observed-transformations.mjs";
import {ContextAxisNavigator} from "./context-axis-evidence.mjs";
import {planNumericOnCumulativeMemory} from "./cumulative-numeric-shape.mjs";
import {recordOriginalHypermazeAttempt,originalHypermazeAtlas} from "./cumulative-atlas.mjs";
import {planNativeQuestionOnCumulativeMemory} from "./cumulative-question-goal.mjs";

const norm=s=>renderObservation(tokenizeObservation(String(s??"")));
const edgeKey=(before,action,after)=>JSON.stringify([before,action,after]);
const isValid=n=>Number.isSafeInteger(n)&&n>0;
const unique=a=>[...new Set(a)];
const hasGoal=(t,required)=>{
 const words=new Set(tokenizeObservation(t));
 return required.every(x=>words.has(x));
};
const bounded=(n,max)=>Number.isSafeInteger(n)&&n>=1&&n<=max;
const empty=(maxStates,maxEdges)=>({
 version:1,maxStates,maxEdges,
 nodes:new Map(),edges:new Map(),blocked:new Set(),proposed:new Map(),
 // Recurrent conflicting action outcomes reveal a hidden perspective.
 // Never merge those into a fake deterministic corridor.
 actionOutcomes:new Map(),ambiguousActions:new Set(),
 textAdjacency:new Map(),
 episodesObserved:0,observedTransitions:0,
 rejectedActions:0,repeatedObservations:0,sourceAdjacentPairs:0,
 proposedObservations:0,evictedNodes:0,evictedEdges:0,
 recordedEpisodeIds:new Set()
});
export class CumulativeHyperMaze {
 constructor(brain,{maxStates=24000,maxEdges=80000}={}){
  if(!brain||!brain.disc||typeof brain.disc.shapeGraph!=="function")
   throw Error("V30 requires the ACTUAL original V17 Brain and Discoverer.shapeGraph");
  if(!bounded(maxStates,100000)||!bounded(maxEdges,600000))
   throw Error("Invalid bounded cross-exercise topology capacity");
  this.brain=brain;
  const prior=brain.hypermazeCumulativeExperience;
  if(prior&&prior.version!==1)throw Error("Unsupported native cumulative graph version");
  this.state=brain.hypermazeCumulativeExperience ||=empty(maxStates,maxEdges);
  // Older original V30 checkpoints may predate conflict detection. Recover
  // the ambiguity index from ACTUALLY witnessed physical outcomes only.
  if(!(this.state.actionOutcomes instanceof Map)){
   this.state.actionOutcomes=new Map();
   this.state.ambiguousActions=new Set();
   for(const edge of this.state.edges.values()){
    const key=JSON.stringify([edge.before,edge.action]);
    const outcomes=this.state.actionOutcomes.get(key)||new Set();
    outcomes.add(edge.after);
    this.state.actionOutcomes.set(key,outcomes);
    if(outcomes.size>1)this.state.ambiguousActions.add(key);
   }
  }
  // The same checkpoint controls the same evolving topology, irrespective
  // of how many transient NativeGoalTextMaze views get constructed later.
  if(!prior){this.state.maxStates=maxStates;this.state.maxEdges=maxEdges;}
 }
 _node(text,episode){
  const S=this.state;
  let n=S.nodes.get(text);
  if(n){
   n.seen++;if(episode){n.sourceCount++;n.lastEpisode=episode;}
   return n;
  }
  while(S.nodes.size>=S.maxStates){
   const oldest=S.nodes.keys().next().value;
   S.nodes.delete(oldest);S.evictedNodes++;
   for(const [id,link] of S.edges)if(link.before===oldest||link.after===oldest){
    S.edges.delete(id);S.evictedEdges++;
   }
   for(const [id,link] of S.proposed)if(link.before===oldest||link.after===oldest)
    S.proposed.delete(id);
  }
  n={text,firstEpisode:episode||null,lastEpisode:episode||null,
   seen:1,sourceCount:episode?1:0};
  S.nodes.set(text,n);return n;
 }
 _trimEdges(){
  const S=this.state;
  while(S.edges.size>=S.maxEdges){
   const oldest=S.edges.keys().next().value;
   S.edges.delete(oldest);S.evictedEdges++;
  }
 }
 observeTransition({episode,before,after,action,accepted,expectedAfter,
  source="independent-physical-outcome"}={}){
  const S=this.state;
  if(typeof episode!=="string"||!episode.trim()||episode.length>200)
   throw Error("A real episode identifier is mandatory");
  if(typeof action!=="string"||!action.trim()||action.length>120)
   throw Error("Action name for observed physical effect must be nonempty");
  if(![true,false,null].includes(accepted))
   throw Error("Physical observation must specify accepted=true/false or null hypothesis");
  const src=norm(before),dst=norm(after),expected=norm(expectedAfter);
  if(!src||(!dst&&accepted!==false))
   throw Error("Both physical before/after observed states are required");
  if(!S.recordedEpisodeIds.has(episode)){
   S.episodesObserved++;S.recordedEpisodeIds.add(episode);
  }
  this._node(src,episode);
  if(accepted===null){
   this._node(dst,episode);
   const k=edgeKey(src,action,dst);
   S.proposedObservations++;
   S.proposed.set(k,{before:src,after:dst,action,
    firstEpisode:episode,source,status:"hypothesis"});
   return {learned:false,proposed:true,walkable:false};
  }
  if(accepted===false){
   S.rejectedActions++;
   const target=expected||dst;
   if(target&&src!==target){
    const k=edgeKey(src,action,target);
    S.blocked.add(k);
    const edge=S.edges.get(k);
    if(edge){edge.status="blocked-by-physical-feedback";edge.blocks++;}
   }
   return {learned:false,blocked:true,
    actualBefore:src,actualAfter:dst,expectedAfter:target};
  }
  if(src===dst)throw Error("Physically accepted edge cannot be a no-op");
  this._node(dst,episode);
  const k=edgeKey(src,action,dst);
  const edge=S.edges.get(k);
  if(edge){
   edge.support++;edge.lastEpisode=episode;
   edge.episodes.add(episode);
   S.repeatedObservations++;
  }else{
   this._trimEdges();
   S.edges.set(k,{before:src,after:dst,action,
    status:"physically-verified",support:1,
    firstEpisode:episode,lastEpisode:episode,
    episodes:new Set([episode]),source,blocks:0});
  }
  S.observedTransitions++;
  const actionState=JSON.stringify([src,action]);
  const destinations=S.actionOutcomes.get(actionState)||new Set();
  destinations.add(dst);
  S.actionOutcomes.set(actionState,destinations);
  if(destinations.size>1)S.ambiguousActions.add(actionState);
  return {learned:true,observedEdge:k,
   observedSupport:S.edges.get(k).support,
   evidenceEpisodes:S.edges.get(k).episodes.size,
   walkable:!S.blocked.has(k)};
 }
 // Merely consecutive text windows must NOT masquerade as permitted actions.
 observeTextAdjacency({episode,beforeText,afterText}={}){
  const S=this.state,src=norm(beforeText),dst=norm(afterText);
  if(!src||!dst||src===dst)throw Error("Nonempty distinct consecutive text required");
  const k=edgeKey(src,"source-order",dst);
  const prior=S.textAdjacency.get(k)||{count:0,firstEpisode:episode};
  prior.count++;S.textAdjacency.set(k,prior);
  S.sourceAdjacentPairs++;
  return {observed:true,worldTransitionVerified:false,
   walkable:false,source:"sequential-text-only"};
 }
 _originalSourceRoleStats(){
  const l=this.brain.qaRoleEvidence?.longForm;
  if(!l)return {roleEpisodes:0,observedChunks:0,
   observedSequentialEdges:0,sharedExactChunkAnchors:0,
   multiScaleSharedAnchors:0,multiScaleObservedMotifs:0,
   multiScaleObservedSourceEdges:0,multiScaleActiveNodes:0};
  const counts=new Map();
  for(const seq of l.sequences||[]){
   const once=new Set([...(seq.questionChunks||[]),...(seq.answerChunks||[])]);
   for(const k of once)counts.set(k,(counts.get(k)||0)+1);
  }
  return {roleEpisodes:l.episodes||0,
   observedChunks:(l.questionChunks||0)+(l.answerChunks||0),
   observedSequentialEdges:l.observedRoleTransitions||0,
   sharedExactChunkAnchors:[...counts.values()].filter(n=>n>=2).length,
   multiScaleSharedAnchors:l.motifGraph?.activeSharedAnchors??0,
   multiScaleSharedAnchorsEver:l.motifGraph?.sharedAnchorsEver??0,
   multiScaleObservedMotifs:l.motifGraph?.seenMotifs??0,
   multiScaleActiveNodes:l.motifGraph?.nodes?.size??0,
   multiScaleObservedSourceEdges:l.motifGraph?.sourceOnlyEdgesObserved??0,
   multiScaleActiveSourceEdges:l.motifGraph?.edges?.size??0,
   multiScaleRoleBoundaryExamples:l.motifGraph?.observedRoleBoundaries??0,
   multiScaleEvictedSingletons:l.motifGraph?.evictedSingletons??0,
   multiScaleEvictedRepeated:l.motifGraph?.evictedRepeated??0,
   multiScaleVerifiedPhysicalActions:l.motifGraph?.physicallyVerifiedActions??0,
   sharedAnchorScope:"exact multi-scale phrase across distinct source episodes, structural evidence ONLY; no semantic action inferred"};
 }
 audit(){
  const S=this.state;
  return {originalBrain:true,version:S.version,
   episodes:S.episodesObserved,observedTransitions:S.observedTransitions,
   memoryNodes:S.nodes.size,physicallyVerifiedEdges:S.edges.size,
   proposedEdges:S.proposed.size,
   ambiguousActions:S.ambiguousActions.size,
   sourceOnlyEdges:S.textAdjacency.size,
   rejectedActions:S.rejectedActions,
   repeatObservations:S.repeatedObservations,
   evictedNodes:S.evictedNodes,evictedEdges:S.evictedEdges,
   ...this._originalSourceRoleStats()};
 }
 // Prior independent research on contextual nonlinear movement and
 // hidden path-order memory is attached to this SAME persistent Brain.
 // We do not use A* here; only the original Discoverer.shapeGraph.
 planNumeric(args={}){
  const computed=planNumericOnCumulativeMemory(this,args);
  const atlasAttemptId=recordOriginalHypermazeAttempt(this.state,computed,
   {...args,numeric:true});
  return {...computed,atlasAttemptId};
 }
 // Query-only semantic/numeric language bridge from the existing V30
 // research branch, preserving all prior contract and model behavior.
 planQuestion(args={}){
  const computed=planNativeQuestionOnCumulativeMemory(this,args);
  const atlasAttemptId=recordOriginalHypermazeAttempt(this.state,computed,
   {...args,question:true,numeric:true});
  return {...computed,atlasAttemptId};
 }
 atlas(options={}){return originalHypermazeAtlas(this.brain,options);}
 // All successful and failed preaction attempts live in SAME native Brain.
 plan(args={}){
  const computed=this._plan(args);
  const atlasAttemptId=recordOriginalHypermazeAttempt(this.state,computed,args);
  return {...computed,atlasAttemptId};
 }
 _plan({start,required,allowInferred=false,maxExpansionDepth=10,
  maxGraphNodes=this.state.maxStates,includeTopology=false}={}){
  const S=this.state;
  const source=norm(start),goals=unique(required||[]).map(x=>String(x));
  const fail=(reason,fields={})=>({found:false,reason,
   frozenBeforeAction:true,goalAnswerSupplied:false,
   plannedBeforeFirstAction:true,referenceAnswerProvided:false,
   originalPlanner:"Discoverer.shapeGraph",start:source,required:goals,
   actions:[],steps:0,predicted:null,
   semanticCorrectnessExternallyVerified:false,
   memory:{...this.audit(),nodes:S.nodes.size,edges:S.edges.size},
   ...fields});
  if(!source||!goals.length||goals.length>32||
   goals.some(x=>tokenizeObservation(x).length!==1))
   return fail("MISSING_START_OR_EXPLICIT_TASK_GOAL");
  if(!Number.isInteger(maxExpansionDepth)||maxExpansionDepth<1||maxExpansionDepth>64||
   !Number.isInteger(maxGraphNodes)||maxGraphNodes<2||maxGraphNodes>S.maxStates)
   return fail("INVALID_BOUNDED_EXPANSION");
  if(!S.nodes.has(source)&&!allowInferred)
   return fail("START_STATE_NOT_YET_WITNESSED");

  // The topology is the SAME accumulated memory of the one Brain. A
  // traversal queue enumerates *reachability*, it does not choose a route:
  // goal attraction, scalar value propagation, and action ascent remain
  // exclusively inside the original Brain's Discoverer.shapeGraph().
  const model=this.brain.observedTransformations;
  const contextual=allowInferred?new ContextAxisNavigator(model):null;
  const list=[{text:source,depth:0,verified:S.nodes.has(source)}];
  const ids=new Map([[source,0]]),adj=[[]],liveEdges=[];
  const knownBySource=new Map();
  for(const edge of S.edges.values()){
   const id=edgeKey(edge.before,edge.action,edge.after);
   if(S.blocked.has(id)||edge.status!=="physically-verified"||
     S.ambiguousActions.has(JSON.stringify([edge.before,edge.action])))continue;
   if(!knownBySource.has(edge.before))knownBySource.set(edge.before,[]);
   knownBySource.get(edge.before).push(edge);
  }
  let head=0,truncated=false,proposedCount=0,blockedCount=0;
  while(head<list.length){
   const item=list[head],origin=head++;
   const choices=[];
   for(const edge of knownBySource.get(item.text)||[])
    choices.push({to:edge.after,action:edge.action,edgeStatus:"physically-verified",
     observedSupport:edge.support,evidenceEpisode:edge.firstEpisode,
     source:edge.source,feedbackEpisodes:edge.episodes.size});
   if(allowInferred&&item.depth<maxExpansionDepth){
    const tokens=tokenizeObservation(item.text);
    const set=new Set();
    for(const choice of [
     ...model.neighbors(tokens).map(x=>({...x,source:"native-observed-transform-operator"})),
     ...contextual.neighbors(tokens).map(x=>({...x,source:"evidence-gated-context-axis-bridge"}))
    ]){
     const dest=renderObservation(choice.tokens);
     const key=dest+"|"+JSON.stringify(choice.action);
     if(set.has(key))continue;set.add(key);
     if(dest===item.text)continue;
     const op=choice.action||{};
     const actionId=String(op.key??"axis:"+op.index+":"+op.from+">"+op.to);
     const evidenceType=choice.source;
     const hypothesisEdgeKey=edgeKey(item.text,actionId,dest);
     if(S.blocked.has(hypothesisEdgeKey)){blockedCount++;continue;}
     const support=model.structuralSupport(choice.tokens);
     if(support.verified&&!support.consistent){blockedCount++;continue;}
     choices.push({to:dest,action:actionId,edgeStatus:"inferred-unverified",
      observedSupport:op.observedSupport||0,evidenceEpisode:null,
      source:evidenceType,operator:op});
    }
   }
   for(const e of choices){
    const k=edgeKey(item.text,e.action,e.to);
    if(S.blocked.has(k)){blockedCount++;continue;}
    let dest=ids.get(e.to);
    if(dest===undefined){
     if(list.length>=maxGraphNodes){truncated=true;continue;}
     dest=list.length;ids.set(e.to,dest);
     list.push({text:e.to,depth:item.depth+1,verified:S.nodes.has(e.to)});
     adj.push([]);
    }
    if(e.edgeStatus!=="physically-verified")proposedCount++;
    const descriptor={to:dest,action:e,observedSupport:e.observedSupport};
    adj[origin].push(descriptor);
    liveEdges.push({...e,from:origin,to:dest});
   }
  }
  const kinds=list.map((x,i)=>i===0?KIND.self:
    hasGoal(x.text,goals)?KIND.target:KIND.floor);
  const goalCount=kinds.filter(k=>k===KIND.target).length;
  const unknownConnections=Math.max(0,S.nodes.size-
   list.filter(x=>x.verified).length);
  if(!goalCount)return fail("NO_EVIDENCED_PATH_TO_GOAL",{
   reachableStates:list.length,goalNodes:0,
   memory:{...this.audit(),nodes:S.nodes.size,edges:S.edges.size,
    unknownConnections,expansionTruncated:truncated,
    inferredCandidates:proposedCount}});
  const original=this.brain.disc.shapeGraph(kinds,adj,0,{
   details:true,geometryWeight:0,edgePreference:null});
  if(!original?.targetReached)return fail("NO_EVIDENCED_PATH_TO_GOAL",{
   reachableStates:list.length,goalNodes:goalCount,
   memory:{...this.audit(),nodes:S.nodes.size,edges:S.edges.size,
    unknownConnections,expansionTruncated:truncated,
    inferredCandidates:proposedCount}});
  const route=original.path,steps=route.map(x=>{
   const e=x.action;
   return {before:list[x.from].text,after:list[x.to].text,
    action:e.action,edgeStatus:e.edgeStatus,
    observedSupport:e.observedSupport,evidenceEpisode:e.evidenceEpisode,
    evidenceSource:e.source,value:x.value};
  });
  const predicted=list[route.at(-1).to].text;
  const containsInferred=steps.some(s=>s.edgeStatus!=="physically-verified");
  const output={found:true,reason:null,start:source,required:goals,
   originalPlanner:"Discoverer.shapeGraph",
   frozenBeforeAction:true,goalAnswerSupplied:false,
   predictionFrom:"persistent original Brain witnessed topology + separately marked learned proposals",
   predicted,initialShape:[source,...steps.map(step=>step.after)],
   actions:steps,steps:steps.length,values:original.values,
   pathContainsInferredEdges:containsInferred,
   externalSemanticValidation:false,externallyVerifiedSemanticExecution:false,
   completeReachableVerifiedTopology:!allowInferred&&!truncated&&S.evictedNodes===0,
   semanticCorrectnessExternallyVerified:false,
   memory:{...this.audit(),nodes:S.nodes.size,edges:S.edges.size,
    unknownConnections,expansionTruncated:truncated,
    inferredCandidates:proposedCount,blockedCandidateEdges:blockedCount},
   plannedBeforeFirstAction:true,referenceAnswerProvided:false};
  if(includeTopology)output.topology={
   complete:!truncated,sourceId:0,originalNativeV17Graph:true,
   nodes:list.map((x,id)=>({id,text:x.text,depth:x.depth,
    kind:kinds[id],goal:kinds[id]===KIND.target,observed:x.verified,
    position5D:this.brain.trace.geo.U.get("text-state:"+x.text)||null,
    potential:original.values[id]??null})),
   edges:liveEdges.map(e=>({from:e.from,to:e.to,
    fromText:list[e.from].text,toText:list[e.to].text,action:e.action,
    status:e.edgeStatus,observedSupport:e.observedSupport,
    firstEvidenceEpisode:e.evidenceEpisode})),
   initialShapeIds:[0,...route.map(e=>e.to)],
   verifiedWalkableEdges:liveEdges.filter(x=>x.edgeStatus==="physically-verified").length,
   hypothesisEdges:proposedCount,
   coordinatesAreOriginalLearned5DTorus:true,
   source:"same native Brain persistent verified cross-world transitions + labeled inferred steps",
   semanticEdgesNotProven:containsInferred
  };
  return output;
 }
}
