// MagicPerspective V30 — transfer between PARTIALLY observed text worlds.
// This is an additive, opt-in research module on the SAME original V17 Brain.
// A cross-world action is learned ONLY from witnessed before/action/after
// outcomes, requires >=2 different episodes and independent source values,
// and remains a hypothesis until verified in the new world.
// No gold answer, hidden target text, synthetic trained model or substitute
// next-character head is used in planning. The original Discoverer.shapeGraph
// computes the complete path BEFORE physical world execution.
//
// Scope: numeric one-token delta and literal one-token replacement.
// Do not claim general semantics, universal language, or 70% OpenThoughts3.
import {Brain} from "../../transcend/torus-aether/devour/brain.mjs";
import {tokenizeObservation,renderObservation}
 from "../../transcend/torus-aether/worlds/observed-transformations.mjs";
import {createHash} from "node:crypto";

const integer=/^-?(?:0|[1-9][0-9]*)$/u;
const stable=s=>createHash("sha256").update(String(s)).digest("hex");
const safe=(text,label)=>{
 if(typeof text!=="string"||!text.trim()||text.length>20000)
  throw Error(label+" must contain 1..20000 characters");
 return text;
};
const labelOf=s=>{
 if(typeof s!=="string"||!s.trim()||s.length>128)
  throw Error("Action label is missing or over 128 characters");
 return s;
};
const numberOf=t=>{
 const indices=[];
 for(let i=0;i<t.length;i++)if(integer.test(t[i]))indices.push(i);
 return indices.length===1?{index:indices[0],value:Number(t[indices[0]])}:null;
};
const copy=x=>structuredClone(x);
function observedChange(beforeText,afterText){
 const a=tokenizeObservation(beforeText),b=tokenizeObservation(afterText);
 if(a.length<2||b.length!==a.length)return null;
 const changes=[];
 for(let i=0;i<a.length;i++)if(a[i]!==b[i])changes.push(i);
 if(changes.length!==1)return null;
 const at=changes[0],from=a[at],to=b[at];
 if(integer.test(from)&&integer.test(to)){
  const v=Number(from),w=Number(to);
  if(!Number.isSafeInteger(v)||!Number.isSafeInteger(w)||Math.abs(w-v)>10000)
   return null;
  return {type:"numeric-delta",delta:w-v,from,to,index:at,
    signature:"numeric-delta:"+String(w-v)};
 }
 if(integer.test(from)!==integer.test(to))return null;
 return {type:"token-replace",from,to,index:at,
  signature:"token-replace:"+JSON.stringify([from,to])};
}
function fresh(){return {version:1,witnesses:0,rejected:0,conflicts:0,
 rules:new Map(),lastPlan:null,atlas:{
  witnesses:[],attempts:[],outcomes:[],nextId:1
 }};}
function evidenceLog(memory,event){
 memory.atlas ||= {witnesses:[],attempts:[],outcomes:[],nextId:1};
 const entry={id:memory.atlas.nextId++,time:new Date().toISOString(),...event};
 memory.atlas.witnesses.push(entry);return entry.id;
}
const gcd=(a,b)=>{a=Math.abs(a);b=Math.abs(b);while(b)[a,b]=[b,a%b];return a;};
function actionInapplicable(tokens,r){
 if(r.conflicted)return "CONFLICTED_EVIDENCE";
 if(r.type==="numeric-delta"){
  const values=tokens.filter(x=>integer.test(x));
  if(!values.length)return "NO_NUMERIC_COORDINATE";
  if(values.length!==1)return "AMBIGUOUS_NUMERIC_COORDINATES";
  const target=Number(values[0])+r.delta;
  if(!Number.isSafeInteger(target)||target<0||target>1000000)
   return "NUMERIC_COORDINATE_OUT_OF_DESIGN_RANGE";
  return "NO_PREDICTABLE_EFFECT";
 }
 if(r.type==="token-replace"){
  const count=tokens.filter(x=>x===r.from).length;
  return count===0?"SOURCE_SYMBOL_NOT_IN_THIS_WORLD":
   count>1?"REPEATED_SOURCE_SYMBOL_AMBIGUOUS":"NO_PREDICTABLE_EFFECT";
 }
 return "UNKNOWN_ACTION_FAMILY_NOT_IMPLEMENTED";
}
const proposedAction=(tokens,rule)=>{
 if(rule.conflicted)return null;
 if(rule.type==="numeric-delta"){
  const n=numberOf(tokens);
  if(!n||!Number.isSafeInteger(n.value))return null;
  const result=n.value+rule.delta;
  if(!Number.isSafeInteger(result)||result<0||result>1000000)return null;
  const dest=tokens.slice();dest[n.index]=String(result);
  return {tokens:dest,modifiedIndex:n.index,oldToken:String(n.value),
   newToken:String(result)};
 }
 if(rule.type==="token-replace"){
  const positions=[];
  for(let i=0;i<tokens.length;i++)if(tokens[i]===rule.from)positions.push(i);
  if(positions.length!==1)return null;
  const dest=tokens.slice();dest[positions[0]]=rule.to;
  return {tokens:dest,modifiedIndex:positions[0],
   oldToken:rule.from,newToken:rule.to};
 }
 return null;
};
export class NativeCrossEpisodeTransfer {
 constructor(brain,{minWorlds=2,maxStates=256,maxDepth=8}={}){
  if(!(brain instanceof Brain))throw Error("The original V17 Brain instance is required");
  if(!Number.isInteger(minWorlds)||minWorlds<2||minWorlds>10)
   throw Error("At least two independent lived worlds are required");
  if(!Number.isInteger(maxStates)||maxStates<4||maxStates>4000||
     !Number.isInteger(maxDepth)||maxDepth<1||maxDepth>16)
   throw Error("Invalid native hypermaze search limits");
  this.brain=brain;this.minWorlds=minWorlds;
  this.maxStates=maxStates;this.maxDepth=maxDepth;
  // Plain Maps/Sets are saved INSIDE Brain's existing .v8 checkpoint.
  // The module's class and a second trainable model are NOT checkpointed.
  if(!brain.crossEpisodeTransformations)brain.crossEpisodeTransformations=fresh();
  if(brain.crossEpisodeTransformations.version!==1)
   throw Error("Unsupported original Brain cross-episode evidence version");
 }
 observe({episodeId,action,before,after,accepted=true}={}){
  if(typeof episodeId!=="string"||!episodeId.trim()||episodeId.length>128)
   throw Error("Source world ID is required for independent transfer evidence");
  const key=labelOf(action),from=safe(before,"Original observed before"),
    to=typeof after==="string"?safe(after,"Actual observed after"):null;
  const memory=this.brain.crossEpisodeTransformations;
  if(accepted!==true||!to){
   memory.rejected++;
   evidenceLog(memory,{type:"rejected",episodeId,action:key,before:from,
    after:to,reason:"world-action-not-accepted"});
   return {learned:false,reason:"world-action-not-accepted",world:episodeId};
  }
  const effect=observedChange(from,to);
  if(!effect||effect.from===effect.to){
   memory.rejected++;
   evidenceLog(memory,{type:"rejected",episodeId,action:key,before:from,
    after:to,reason:"unsupported-witnessed-effect",
    designRestriction:"Only one-token substitutions and numeric deltas are currently implemented"});
   return {learned:false,reason:"unsupported-witnessed-effect",
     world:episodeId};
  }
  let rule=memory.rules.get(key);
  if(!rule){
   if(memory.rules.size>=1024){
    memory.rejected++;
    evidenceLog(memory,{type:"rejected",episodeId,action:key,before:from,
     after:to,reason:"action-memory-cap",maxRules:1024});
    return {learned:false,reason:"action-memory-cap"};
   }
   rule={action:key,type:effect.type,signature:effect.signature,
    from:effect.from,to:effect.to,delta:effect.delta??null,
    conflicted:false,worlds:new Set(),values:new Set(),
    witnesses:0,conflictCount:0,examples:[]};
   memory.rules.set(key,rule);
  }
  if(rule.signature!==effect.signature){
   rule.conflicted=true;rule.conflictCount++;memory.conflicts++;
   evidenceLog(memory,{type:"conflict",episodeId,action:key,
    before:from,after:to,previousSignature:rule.signature,
    observedSignature:effect.signature,
    reason:"contradictory-action-physics"});
   return {learned:false,reason:"contradictory-action-physics",
    action:key,conflicted:true};
  }
  rule.witnesses++;rule.worlds.add(episodeId);
  rule.values.add(effect.from);
  if(rule.examples.length<6){
   rule.examples.push({world:episodeId,before:from.slice(0,200),
    after:to.slice(0,200),sourceHash:stable(from+"\n"+to)});
  }
  memory.witnesses++;
  const atlasEventId=evidenceLog(memory,{type:"witness",episodeId,action:key,
    before:from,after:to,signature:effect.signature,
    effectKind:effect.type,sourceHash:stable(from+"\n"+to),
    independentWorlds:rule.worlds.size});
  return {learned:true,action:key,world:episodeId,atlasEventId,
   from:effect.from,to:effect.to,
   kind:effect.type,support:rule.witnesses,independentWorlds:rule.worlds.size,
   ready:this._ready(rule)};
 }
 _ready(rule){
  return !rule.conflicted&&rule.witnesses>=this.minWorlds&&
   rule.worlds.size>=this.minWorlds&&
   (rule.type!=="numeric-delta"||rule.values.size>=this.minWorlds);
 }
 summary(){
  const memory=this.brain.crossEpisodeTransformations;
  return {source:"SAME original native V17 Brain",
   mechanics:"witnessed one-token changes; global transfer across partial worlds",
   observations:memory.witnesses,rejected:memory.rejected,
   conflicts:memory.conflicts,actionsObserved:memory.rules.size,
   reusableActions:[...memory.rules.values()].filter(r=>this._ready(r)).length,
   rules:[...memory.rules.values()].map(r=>({action:r.action,type:r.type,
    delta:r.delta,from:r.type==="token-replace"?r.from:null,
    to:r.type==="token-replace"?r.to:null,
    witnesses:r.witnesses,independentWorlds:r.worlds.size,
    supportDistinctInputs:r.values.size,
    ready:this._ready(r),conflicted:r.conflicted,examples:r.examples.slice(0,3)})),
   memorySavedInOriginalBrain:true,
   noiseUsedInPlan:false,
   fullLanguageSemanticsLearned:false};
 }
 // Visible maze goal, NOT the entire correct output and NOT a hidden
 // reference answer. The goal may come from a distinct task world.
 _goal(tokens,goal){
  const opts=Object.keys(goal||{});
  if(opts.length!==1)throw Error("One explicit objective kind required");
  if(opts[0]==="numericEquals"){
   if(!Number.isSafeInteger(goal.numericEquals)||goal.numericEquals<0||
      goal.numericEquals>1000000)throw Error("Invalid visible numeric goal");
   const n=numberOf(tokens);return !!n&&n.value===goal.numericEquals;
  }
  if(opts[0]==="containsToken"){
   if(typeof goal.containsToken!=="string"||
      tokenizeObservation(goal.containsToken).length!==1)
    throw Error("Invalid visible one-token goal");
   return tokens.includes(goal.containsToken);
  }
  throw Error("Unknown visible goal predicate");
 }
 plan({startText,goal,allowedActions=null}={}){
  const start=safe(startText,"Actual starting world"),
   sourceTokens=tokenizeObservation(start);
  if(sourceTokens.length<2)throw Error("A nonempty text world is required");
  this._goal(sourceTokens,goal);
  const memory=this.brain.crossEpisodeTransformations,
   actions=(allowedActions||[...memory.rules.keys()]).map(labelOf);
  if(actions.length>30)throw Error("Too many candidate action types");
  const rules=actions.map(label=>memory.rules.get(label))
   .filter(r=>r&&this._ready(r));
  const missingLabels=actions.filter(label=>!memory.rules.has(label));
  const withheldRules=actions.map(label=>memory.rules.get(label))
   .filter(r=>r&&!this._ready(r)).map(r=>({
     action:r.action,observations:r.witnesses,
     independentWorlds:r.worlds.size,conflicted:r.conflicted,
     reason:r.conflicted?"CONTRADICTORY_OBSERVED_EFFECTS":
       r.worlds.size<this.minWorlds?"INSUFFICIENT_INDEPENDENT_WORLDS":
       r.type==="numeric-delta"&&r.values.size<this.minWorlds?
         "INSUFFICIENT_DISTINCT_INPUT_VALUES":"INSUFFICIENT_WITNESSES"
   }));
  const kind={floor:0,wall:1,target:2,self:3},
   originText=renderObservation(sourceTokens);
  const nodes=[{id:0,text:originText,tokens:sourceTokens,depth:0,
   kind:kind.self,origin:true}],
   edges=[[]],indexed=new Map([[originText,0]]);
  let index=0,blocked=0,hypothesisEdges=0;
  const blockers=new Map(),blockedSamples=[],
    depthFrontier=[],stateCapFrontier=[];
  const block=(reason,detail)=>{
   blocked++;blockers.set(reason,(blockers.get(reason)||0)+1);
   if(blockedSamples.length<160)blockedSamples.push({reason,...detail});
  };
  while(index<nodes.length){
   const here=nodes[index],pos=index++;
   if(this._goal(here.tokens,goal))continue;
   if(here.depth>=this.maxDepth){
    for(const rule of rules){
     const effect=proposedAction(here.tokens,rule);
     if(!effect||renderObservation(effect.tokens)===here.text)continue;
     depthFrontier.push({from:pos,action:rule.action,
       next:renderObservation(effect.tokens),reason:"DEPTH_BUDGET_PREVENTS_EDGE"});
     block("DEPTH_BUDGET_PREVENTS_EDGE",{from:pos,action:rule.action});
    }
    continue;
   }
   for(const rule of rules){
    const effect=proposedAction(here.tokens,rule);
    if(!effect){
     block(actionInapplicable(here.tokens,rule),
       {from:pos,action:rule.action,depth:here.depth});
     continue;
    }
    const after=renderObservation(effect.tokens);
    if(after===here.text)continue;
    let next=indexed.get(after);
    if(next===undefined){
     if(nodes.length>=this.maxStates){
      stateCapFrontier.push({from:pos,action:rule.action,next:after,
       reason:"STATE_BUDGET_PREVENTS_EDGE"});
      block("STATE_BUDGET_PREVENTS_EDGE",
       {from:pos,action:rule.action,depth:here.depth});
      continue;
     }
     next=nodes.length;indexed.set(after,next);
     nodes.push({id:next,text:after,tokens:effect.tokens,
      depth:here.depth+1,kind:this._goal(effect.tokens,goal)?kind.target:kind.floor});
     edges.push([]);
    }
    // Every edge is a PREDICTED transferred effect whose induction traces
    // to at least two actual independent world outcomes.
    const action={name:rule.action,kind:rule.type,
     oldToken:effect.oldToken,newToken:effect.newToken,
     position:effect.modifiedIndex,trainingWorldCount:rule.worlds.size,
     observedWitnesses:rule.witnesses,
     provenance:"learned-effect-transfer; NOT observed in heldout world"};
    edges[pos].push({to:next,action,observedSupport:rule.witnesses,
     verifiedInCurrentWorld:false});
    hypothesisEdges++;
   }
  }
  const kinds=nodes.map(n=>n.kind),traversal=this.brain.disc.shapeGraph(
   kinds,edges,0,{details:true});
  const reached=!!traversal?.targetReached;
  const path=reached?traversal.path:[];
  const values=traversal?.values||new Array(nodes.length).fill(0);
  const originalShapeReady=this.brain.disc.attract(kind.target)>.2&&
    this.brain.disc.conduct(kind.floor)>=.5;
  const startValue=numberOf(sourceTokens);
  const deltas=rules.filter(r=>r.type==="numeric-delta")
    .map(r=>Math.abs(r.delta));
  const deltaGcd=deltas.reduce((g,d)=>gcd(g,d),0);
  const gap=goal?.numericEquals!==undefined&&startValue?
    goal.numericEquals-startValue.value:null;
  const impossibleResidue=Number.isInteger(gap)&&deltaGcd>0&&
    Math.abs(gap)%deltaGcd!==0;
  const cutoff=depthFrontier.length>0||stateCapFrontier.length>0;
  const frontier={
    closureOfAllCurrentlyAdmittedTransfers:!cutoff,
    completeLanguageKnown:false,
    explicitlyObservedVsHypothesized:"All planned edges extrapolate rules witnessed in other worlds",
    counts:{
      depthCutoff:depthFrontier.length,
      stateCutoff:stateCapFrontier.length,
      exploredStates:nodes.length,exploredEdges:hypothesisEdges
    },
    budget:{maxStates:this.maxStates,maxDepth:this.maxDepth},
    missingLabels,withheldRules,
    blockers:Object.fromEntries(blockers),
    samples:blockedSamples,
    possibleNextEdges:{
      // Full exact known frontier, not the first 300 only.
      // The UI/API pages this evidence; none of the known omitted corridors
      // disappears merely because its record index is large.
      depth:depthFrontier,
      states:stateCapFrontier,
      exhaustive:true
    },
    numericInvariant:{
      source:startValue?.value??null,
      goal:goal?.numericEquals??null,
      gcdOfAvailableChanges:deltaGcd,
      impossibleResidueWithAdmittedRules:impossibleResidue,
      note:"Necessary constraint, not a proof that all other numeric goals are reachable"
    },
    originalShapeReady,
    designCutoff:cutoff
  };
  return {
   kind:"cross-episode-unified-original-native-shapeGraph",
   found:reached,reason:reached?null:!rules.length?
    "NO_ACTION_WITNESSED_IN_MULTIPLE_INDEPENDENT_WORLDS":
    impossibleResidue?"NUMERIC_RESIDUE_UNREACHABLE_WITH_LEARNED_ACTIONS":
    cutoff?"SEARCH_CUTOFF_BEFORE_CLOSURE":
    !originalShapeReady?"ORIGINAL_SHAPE_ATTRACTION_NOT_LEARNED":
    "NO_REACHABLE_GOAL_IN_TRANSFERRED_WORLD",
   plannedBeforeFirstAction:true,referenceAnswerProvided:false,
   goalVisibleAsTaskPredicate:true,
   start:originText,visibleGoal:copy(goal),
   predicted:reached?nodes[path.at(-1).to].text:null,
   initialShape:reached?[originText,...path.map(p=>nodes[p.to].text)]:[],
   actions:path.map(edge=>({...edge.action,
    from:nodes[edge.from].text,predictedNext:nodes[edge.to].text})),
   frontier,graph:{
    states:nodes.length,edges:hypothesisEdges,
    closureOfKnownAdmittedActions:!cutoff,
    completeNaturalLanguageWorld:false,
    blockedUnknownTransitions:blocked,
    learnedIndependentActions:rules.length,
    sourceWorldCount:new Set(rules.flatMap(r=>[...r.worlds])).size,
    goalNodes:nodes.filter(x=>x.kind===kind.target).length,
    nodes:nodes.map((n,i)=>({id:n.id,text:n.text,
     goal:n.kind===kind.target,depth:n.depth,potential:values[i],
     original5D:this.brain.trace.geo.U.get("text-state:"+n.text)||null})),
    edges:edges.flatMap((xs,i)=>xs.map(e=>({from:i,to:e.to,
     action:e.action,verifiedInCurrentWorld:false}))),
    originalV17GeometryDimensions:this.brain.trace.geo.D,
    originalV17AttractionField:values
   },
   algorithm:"SAME original Discoverer.shapeGraph",
   arbitraryTextSemanticsProven:false,
   generalNaturalLanguageAccuracyProven:false,
   noNextCharacterSubstitute:true
  };
 }
 execute(plan,physicalStep,{episodeId="evaluation",learnFeedback=false}={}){
  if(typeof physicalStep!=="function")
   throw Error("Independent external world-step callback REQUIRED");
  if(!plan?.found||!plan.plannedBeforeFirstAction)
   return {attempted:false,reason:"No valid frozen preaction global shape"};
  const frames=[{step:0,text:plan.start,stage:"before-first-action",
   wholePredictedSolution:plan.predicted,
   futurePath:plan.initialShape.slice()}];
  let current=plan.start,correct=0,failed=0;
  for(const [i,action] of plan.actions.entries()){
   const before=current;
   // The external evaluator knows its own physics; this planner does not.
   const world=physicalStep({text:before,action:copy(action),step:i,
    expectedInPlan:action.predictedNext});
   if(typeof world!=="string")throw Error("Actual world must return observed text");
   current=renderObservation(tokenizeObservation(world));
   const matched=current===action.predictedNext;
   correct+=Number(matched);failed+=Number(!matched);
   frames.push({step:i+1,action:action.name,before,actual:current,
    originallyPredicted:action.predictedNext,predictionCorrect:matched,
    transferSourceWorldCount:action.trainingWorldCount,
    externallyObserved:true});
   if(learnFeedback)this.observe({episodeId,action:action.name,
    before,after:current,accepted:true});
   if(!matched)break;
  }
  return {attempted:true,originalWholeAnswerPrediction:plan.predicted,
   actualFinal:current,correctTransitions:correct,
   mismatchTransitions:failed,stepsExecuted:frames.length-1,
   completeExact:failed===0&&current===plan.predicted&&
    frames.length-1===plan.actions.length,
   frames,independentExternalPhysics:true,
   goldNotUsedDuringPlanning:true,
   newWorldOnlyVerifiedAfterAction:true,
   noHiddenAnswerGoal:true};
 }
}
