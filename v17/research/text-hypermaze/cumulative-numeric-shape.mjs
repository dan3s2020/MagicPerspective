// V30 research integration of ORIGINAL demonstrated PR34/PR36 discoveries:
// StateDependentTextAxes and signed path holonomy, which were previously
// isolated research tests. Every numerical action observation comes from a
// physically ACCEPTED step in the SAME persistent original Brain.
//
// A secondary learning/prediction algorithm is NOT substituted. The existing
// StateDependentTextAxes computes local action effects; ONLY the ACTUAL
// original brain.disc.shapeGraph() propagates the goal field and chooses
// the global action path. Numeric constraints are task inputs, NOT the hidden
// dependent output answer. All generated edges are labeled unverified until
// actual independent physical outcomes accept/reject them.
import {StateDependentTextAxes} from "./state-dependent-axes.mjs";
import {learnedHolonomy} from "./path-holonomy.mjs";
import {tokenizeObservation,renderObservation} from
 "../../transcend/torus-aether/worlds/observed-transformations.mjs";
import {KIND} from "../../transcend/torus-aether/worlds/exercise.mjs";

const isN=x=>Number.isSafeInteger(x)&&x>=0;
const k=t=>JSON.stringify(t);
export function planNumericOnCumulativeMemory(graph,{start,numericGoals,
 maxExpansionDepth=18,maxGraphNodes=5000,includeTopology=false}={}){
 const b=graph.brain,S=graph.state;
 const origin=renderObservation(tokenizeObservation(start));
 const fail=(reason,details={})=>({
  found:false,reason,originalPlanner:"Discoverer.shapeGraph",
  goalDependentAnswerSupplied:false,referenceAnswerProvided:false,
  plannedBeforeFirstAction:true,actions:[],steps:0,predicted:null,
  numericEvidenceSource:"physically accepted transitions from original Brain's persistent cross-exercise graph",
  ...details
 });
 if(!origin||!Array.isArray(numericGoals)||numericGoals.length===0||
  numericGoals.some(g=>!isN(g.index)||!isN(g.value))||
  !Number.isSafeInteger(maxExpansionDepth)||maxExpansionDepth<1||maxExpansionDepth>64||
  !Number.isSafeInteger(maxGraphNodes)||maxGraphNodes<4||maxGraphNodes>100000)
  return fail("INVALID_TASK_GOAL_OR_EXPANSION");
 const goal=new Map();
 for(const {index,value} of numericGoals){
  if(goal.has(index)&&goal.get(index)!==value)return fail("CONTRADICTORY_NUMERIC_GOALS");
  goal.set(index,value);
 }
 const learner=new StateDependentTextAxes({maxValue:1000,maxExpanded:maxGraphNodes});
 let validObservations=0;
 for(const edge of S.edges.values()){
  if(edge.status!=="physically-verified"||
   S.blocked.has(JSON.stringify([edge.before,edge.action,edge.after]))||
   S.ambiguousActions?.has(JSON.stringify([edge.before,edge.action])))continue;
  const observed=learner.observePair(edge.before,edge.after);
  validObservations+=Number(!!observed.learned);
 }
 const law=learner.discover(origin);
 if(!law.ready)return fail("NO_IDENTIFIED_STATE_DEPENDENT_AXES",{
  learnedOperatorObservations:validObservations,modelReason:law.reason});
 const indices=law.numericTokenIndices;
 if([...goal.keys()].some(i=>!indices.includes(i)||i===indices[law.dependent]))
  return fail("GOAL_MUST_CONSTRAIN_ONLY_INDEPENDENT_INPUT_COORDINATES",
   {numericTokenIndices:indices,dependentOutputTokenIndex:indices[law.dependent]});
 // A general local field needs at least TWO independent witnessed action
 // axes and variation in the OTHER coordinate for every causal slope.
 // This is what the original 2-pair PR34 experiment proved: 8*7=32 WRONG.
 // Do not fill missing causal slopes with unjustified constants.
 if(law.axes.length>=2&&law.axes.some(primary=>
  !law.operators.some(op=>op.primary===primary&&
   law.axes.some(other=>other!==primary&&
    Number(op.evidence[other])>0))))
  return fail("INSUFFICIENT_CROSS_CONTEXT_EVIDENCE",{
   learnedOperatorObservations:validObservations,
   learnedAxes:law.axes,
   contextualSupports:law.operators.map(o=>({
    primary:o.primary,step:o.step,evidence:o.evidence.slice()
   }))});
 const source=tokenizeObservation(origin);
 const nodes=[{tokens:source,text:origin,depth:0}],lookup=new Map([[k(source),0]]),
  adjacent=[[]],graphEdges=[];
 let head=0,cut=false,blocked=0;
 const goalAt=t=>[...goal].every(([index,value])=>Number(t[index])===value);
 while(head<nodes.length){
  const item=nodes[head],from=head++;
  if(item.depth>=maxExpansionDepth)continue;
  for(const op of law.operators){
   // The true original model, exactly as in the successful PR34 tests,
   // computes each locally state-dependent movement. No '*' or '+'
   // mathematical semantics are hardcoded into our bridge.
   const result=learner.apply(item.tokens,op,law);
   if(!result||k(result)===k(item.tokens))continue;
   const text=renderObservation(result);
   const actionId="numeric:"+op.primary+":"+op.step+":"+op.dependent;
   if(S.blocked.has(JSON.stringify([item.text,actionId,text]))){
    blocked++;continue;
   }
   let dest=lookup.get(k(result));
   if(dest===undefined){
    if(nodes.length>=maxGraphNodes){cut=true;continue;}
    dest=nodes.length;lookup.set(k(result),dest);
    nodes.push({tokens:result,text,depth:item.depth+1});adjacent.push([]);
   }
   const action={kind:"inferred-state-dependent-numeric-axis",
    actionId,primary:op.primary,step:op.step,dependent:op.dependent,
    observedTrainingPairs:op.trainingPairs,contextSupport:op.evidence.slice(),
    maxObservedFitResidual:op.maxTrainingResidual,
    verifiedPhysically:false};
   adjacent[from].push({to:dest,action});
   graphEdges.push({from,to:dest,action,status:"inferred-not-yet-physically-verified"});
  }
 }
 const kinds=nodes.map((x,i)=>i===0?KIND.self:goalAt(x.tokens)?KIND.target:KIND.floor);
 const targets=kinds.filter(x=>x===KIND.target).length;
 if(!targets)return fail("LEARNED_NUMERIC_WORLD_HAS_NO_REACHABLE_GOAL",{
  learnedOperatorObservations:validObservations,
  graphNodes:nodes.length,boundedGraphTruncated:cut,
  numericGoalInputs:[...goal].map(([index,value])=>({index,value}))});
 const shape=b.disc.shapeGraph(kinds,adjacent,0,{
  details:true,geometryWeight:0,edgePreference:null});
 if(!shape?.targetReached)return fail("ORIGINAL_ATTRACTION_DID_NOT_REACH_NUMERIC_GOAL",{
  graphNodes:nodes.length,goalCount:targets,boundedGraphTruncated:cut});
 const route=shape.path,states=[origin,...route.map(step=>nodes[step.to].text)];
 const actions=route.map(step=>({
  from:nodes[step.from].text,to:nodes[step.to].text,
  ...step.action,potential:step.value,edgeStatus:"inferred-unverified"}));
 const holonomy=learnedHolonomy(learner,origin);
 const output={found:true,reason:null,start:origin,
  predicted:states.at(-1),initialShape:states,
  originalPlanner:"Discoverer.shapeGraph",
  frozenBeforeAction:true,plannedBeforeFirstAction:true,
  referenceAnswerProvided:false,goalDependentAnswerSupplied:false,
  numericGoalInputs:[...goal].map(([index,value])=>({index,value})),
  originalLearnedField:true,inferredNumericModel:"original-StateDependentTextAxes",
  learnedOperatorObservations:validObservations,
  learnedAxisRank:law.axes.length,learnedDependent:law.dependent,
  learnedNumericPositions:law.numericTokenIndices.slice(),
  holisticHistoryInformation:holonomy.ready?{
   pathOrderCommutator:holonomy.commutator,
   extraMemoryNeeded:holonomy.integrated?0:1,
   learnedFromSource:holonomy.learnedSources
  }:{available:false,reason:holonomy.reason},
  steps:actions.length,actions,values:shape.values,
  pathContainsInferredEdges:true,
  semanticCorrectnessExternallyVerified:false,
  bodyMustVerifyEveryPredictedTransition:true,
  graph:{nodes:nodes.length,edges:graphEdges.length,
   goalNodes:targets,truncated:cut,blocked,
   actionAxes:law.axes.length},
  inputNotSuppliedOutput:true};
 if(includeTopology)output.topology={
  originalNativeV17Graph:true,complete:!cut,sourceId:0,
  nodes:nodes.map((n,id)=>({id,text:n.text,depth:n.depth,
   kind:kinds[id],goal:kinds[id]===KIND.target,
   position5D:b.trace.geo.U.get("text-state:"+n.text)||null,
   potential:shape.values[id]??null,observed:S.nodes.has(n.text)})),
  edges:graphEdges.map(e=>({
   from:e.from,to:e.to,action:e.action.actionId,status:e.status,
   modelEvidence:e.action.observedTrainingPairs
  })),initialShapeIds:[0,...route.map(x=>x.to)],
  hypothesisEdges:graphEdges.length,verifiedWalkableEdges:0,
  priorPhysicalExperiences:validObservations,
  semanticEdgesNotProven:true,
  source:"original StateDependentTextAxes learned from independent verified episodes, same original Discoverer attraction"
 };
 return output;
}
