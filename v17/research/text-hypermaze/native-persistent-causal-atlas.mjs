// V31 research adapter. The SAME original persistent Brain owns the
// witnessed before/after transformation evidence, and the SAME unchanged
// original Brain.disc supplies learned attraction/conductance.
//
// Text action laws are FIT by existing StateDependentTextAxes, not supplied
// by this adapter. Graph edges are generated ONLY by its learned operators.
// This is an explicitly typed, numeric path-dependent goal API.
// It is NOT free natural-language understanding / an LLM / a new Brain.
import {Brain} from "../../transcend/torus-aether/devour/brain.mjs";
import {KIND} from "../../transcend/torus-aether/worlds/exercise.mjs";
import {StateDependentTextAxes} from "./state-dependent-axes.mjs";
import {originalAttractionSparse} from "./scalable-original-attraction.mjs";
import {tokenizeObservation,renderObservation} from "../../transcend/torus-aether/worlds/observed-transformations.mjs";

const getNumeric=t=>tokenizeObservation(t).filter(s=>/^\d+$/.test(s)).map(Number);
const stateKey=t=>JSON.stringify(t);
const exactInteger=v=>Number.isSafeInteger(v);
export class NativePersistentCausalAtlas {
 constructor(brain,{maxStates=2500,maxDepth=8,maxEvidence=20000,maxValue=1000000000}={}){
  if(!(brain instanceof Brain))throw Error("The actual native V17 Brain is required");
  if(!Number.isSafeInteger(maxStates)||maxStates<8||maxStates>200000)
   throw Error("Invalid observed graph state budget");
  if(!Number.isSafeInteger(maxDepth)||maxDepth<4||maxDepth>64)
   throw Error("Invalid original field-depth budget");
  this.brain=brain;this.maxStates=maxStates;this.maxDepth=maxDepth;
  this.maxEvidence=maxEvidence;this.maxValue=maxValue;
  const stored=brain.persistentCausalAtlasEvidence ||= {
   version:1,observations:[],rejected:0,witnessed:0
  };
  if(stored.version!==1)throw Error("Unsupported native causal memory format");
  this.memory=stored;
  this.learned=new StateDependentTextAxes({maxValue,maxExpanded:maxStates});
  for(const {before,after} of stored.observations){
   const result=this.learned.observePair(before,after);
   if(!result.learned)throw Error("Corrupted persistent original Brain causal evidence");
  }
 }
 observePair(before,after){
  if(this.memory.observations.length>=this.maxEvidence)
   throw Error("Original Brain evidence budget exhausted: no silent eviction");
  if(typeof before!=="string"||typeof after!=="string")
   throw Error("Only actual observed text transition pairs accepted");
  const result=this.learned.observePair(before,after);
  if(result.learned){
   this.memory.observations.push({before,after});
   this.memory.witnessed++;
  }else this.memory.rejected++;
  return result;
 }
 // Typed goal is supplied by the TASK. A z+delta target is NOT an answer
 // the learner discovered from arbitrary natural-language prompts.
 plan({start,dependentDelta,includeAtlas=false}={}){
  if(typeof start!=="string"||!exactInteger(dependentDelta)||!dependentDelta)
   throw Error("Observed numeric start and nonzero integer delta are required");
  const model=this.learned.discover(start);
  if(!model.ready)return {found:false,reason:model.reason};
  if(model.axes.length!==2||model.numericTokenIndices.length!==3)
   return {found:false,reason:"only-observed-two-axis-three-numeric-token-world"};
  const orig=getNumeric(start);
  if(orig.length!==3||orig.some(v=>!exactInteger(v)))
   return {found:false,reason:"invalid-start-state"};
  const want=orig.slice();want[model.dependent]+=dependentDelta;
  if(!exactInteger(want[model.dependent])||want[model.dependent]<0||
   want[model.dependent]>this.maxValue)
   return {found:false,reason:"goal-outside-learned-world"};
  const t0=tokenizeObservation(start),nodes=[t0],edges=[[]],depths=[0],
   ids=new Map([[stateKey(t0),0]]);
  let head=0,blocked=0,fullyExpanded=true;
  // Construct the ENTIRE bounded reachable state space before planning.
  // Do not use the hidden independent evaluator / reference action sequence.
  while(head<nodes.length){
   const i=head++,t=nodes[i];
   if(depths[i]>=this.maxDepth)continue;
   for(const op of model.operators){
    const next=this.learned.apply(t,op,model);
    if(!next){blocked++;continue;}
    const id=stateKey(next);
    let j=ids.get(id);
    if(j===undefined){
     if(nodes.length>=this.maxStates){fullyExpanded=false;break;}
     j=nodes.length;ids.set(id,j);nodes.push(next);edges.push([]);
     depths.push(depths[i]+1);
    }
    edges[i].push({to:j,action:{primary:op.primary,step:op.step,
      evidence:op.trainingPairs}});
   }
   if(!fullyExpanded)break;
  }
  if(!fullyExpanded)return {found:false,reason:"complete-graph-budget-exceeded",
   exploredStates:nodes.length,maxStates:this.maxStates,trainingPairs:this.memory.witnessed};
  const matches=nodes.map((v,i)=>getNumeric(renderObservation(v)).every((z,k)=>z===want[k])?i:-1)
   .filter(i=>i>=0&&i!==0);
  if(!matches.length)return {found:false,reason:"no-observed-transform-path",
   exploredStates:nodes.length,blockedTransitions:blocked,trainingPairs:this.memory.witnessed};
  const kinds=nodes.map((_,i)=>i===0?KIND.self:
   matches.includes(i)?KIND.target:KIND.floor);
  const shape=originalAttractionSparse(this.brain.disc,kinds,edges,0);
  if(!shape?.targetReached)return {found:false,reason:"native-attraction-did-not-reach-goal",
   exploredStates:nodes.length};
  const path=shape.path.map(s=>({from:renderObservation(nodes[s.from]),
   to:renderObservation(nodes[s.to]),action:s.action,value:s.value,
   alternatives:s.options?.map(x=>({to:renderObservation(nodes[x.to]),value:x.value}))}));
  const output={found:true,sharedOriginalBrain:true,
   originalMotor:"Discoverer.attraction/conductance/sparse-exact-equation",
   plannedBeforeFirstAction:true,referenceAnswerProvided:false,
   taskProvidedDependentDelta:dependentDelta,
   predicted:renderObservation(nodes[shape.path.at(-1).to]),
   path,actionCount:path.length,trainingPairs:this.memory.witnessed,
   graph:{states:nodes.length,edges:edges.reduce((n,es)=>n+es.length,0),
    goalCandidates:matches.length,blockedTransitions:blocked,
    completeToDepth:this.maxDepth,budgetComplete:true},
   firstPotential:shape.values[0],
   successfulGoalProof:"independent-physical-execution-required",
   originalLearnerModelStats:{
    observedActions:model.operators.length,
    learnedActiveAxes:model.axes,
    fitMaxResidual:Math.max(...model.operators.map(o=>o.maxTrainingResidual))
   }};
  if(includeAtlas)output.atlas={
   nodes:nodes.map((n,i)=>({id:i,text:renderObservation(n),depth:depths[i],
    potential:shape.values[i],kind:kinds[i]})),
   edges:edges.flatMap((es,i)=>es.map(e=>({from:i,to:e.to,action:e.action}))),
   initialShapeIds:[0,...shape.path.map(s=>s.to)],
   completeWithinDepth:this.maxDepth,
   semanticsAreControlledNumericGrammar:true
  };
  return output;
 }
 execute(plan){
  if(!plan?.found||!plan.plannedBeforeFirstAction)
   return {attempted:false,reason:"no-first-prediction"};
  const model=this.learned.discover(plan.path[0].from);
  if(!model.ready)return {attempted:false,reason:"lost-learner"};
  let t=tokenizeObservation(plan.path[0].from),frames=[renderObservation(t)];
  for(const step of plan.path){
   if(renderObservation(t)!==step.from)
    return {attempted:true,valid:false,reason:"model-trajectory-diverged",frames};
   const op=model.operators.find(o=>
    o.primary===step.action.primary&&o.step===step.action.step);
   if(!op)return {attempted:true,valid:false,reason:"unlearned-operator",frames};
   const next=this.learned.apply(t,op,model);
   if(!next)return {attempted:true,valid:false,reason:"physical-action-blocked",frames};
   t=next;frames.push(renderObservation(t));
  }
  const actual=renderObservation(t);
  return {attempted:true,valid:actual===plan.predicted,actual,
   executedSteps:plan.path.length,frames,
   notExternalSemanticValidation:true};
 }
}
