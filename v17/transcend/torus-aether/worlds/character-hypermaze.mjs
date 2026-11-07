// MagicPerspective V24: ORIGINAL V17 Discoverer.shape over a *character*
// state/action atlas learned from actual full-word contrasts in other worlds.
// NOT a word-only predictor and NOT an oracle for hidden Q/A answers.
// Unicode handled as codepoints; complete state retained in every node.
// A world-contrast is only a hypothesis until independent action feedback.
import {Discoverer,KIND} from "./exercise.mjs";
import {explainCharacterGaps} from "./character-gap-diagnostics.mjs";

const AT="__CHAR_XWORLD__:";
const cp=s=>Array.from(String(s));
const pair=(a,b)=>JSON.stringify([a,b]);
const same=(a,b)=>a.length===b.length&&a.every((x,i)=>x===b[i]);
const stateKey=s=>JSON.stringify(s);
export const charActionId=(op,at,from,to)=>AT+JSON.stringify([op,at,from,to]);
export function parseCharAction(id){
 if(typeof id!=="string"||!id.startsWith(AT))return null;
 let a;try{a=JSON.parse(id.slice(AT.length));}catch{return null;}
 if(!Array.isArray(a)||a.length!==4||!["replace","insert","delete","swap"].includes(a[0])
    ||!Number.isSafeInteger(a[1])||a[1]<0||typeof a[2]!=="string"||typeof a[3]!=="string")return null;
 const from=cp(a[2]),to=cp(a[3]),op=a[0];
 if((op==="replace"&&(from.length!==1||to.length!==1||same(from,to)))||
    (op==="insert"&&(from.length!==0||to.length!==1))||
    (op==="delete"&&(from.length!==1||to.length!==0))||
    (op==="swap"&&(from.length!==2||to.length!==2||from[0]!==to[1]||from[1]!==to[0]||from[0]===from[1])))
    return null;
 return {op,at:a[1],from:a[2],to:a[3]};
}
function localEdit(a,b){
 const left=cp(a),right=cp(b);if(!left.length&&!right.length)return null;
 if(left.length===right.length){
  const idx=[];for(let i=0;i<left.length;i++)if(left[i]!==right[i])idx.push(i);
  if(idx.length===1)return {op:"replace",at:idx[0],from:left[idx[0]],to:right[idx[0]]};
  if(idx.length===2&&idx[1]===idx[0]+1&&left[idx[0]]===right[idx[1]]&&left[idx[1]]===right[idx[0]])
   return {op:"swap",at:idx[0],from:left.slice(idx[0],idx[1]+1).join(""),to:right.slice(idx[0],idx[1]+1).join("")};
  return null;
 }
 if(Math.abs(left.length-right.length)!==1)return null;
 const long=left.length>right.length?left:right,short=left.length>right.length?right:left;
 let at=0;while(at<short.length&&long[at]===short[at])at++;
 if(!same(long.slice(at+1),short.slice(at)))return null;
 return left.length>right.length?
  {op:"delete",at,from:long[at],to:""}:{op:"insert",at,from:"",to:long[at]};
}
function applyAction(source,action){
 const a=Array.isArray(source)?source.slice():cp(source);
 const op=parseCharAction(action);if(!op)return null;
 const from=cp(op.from),to=cp(op.to);
 if(op.at>a.length||op.at+from.length>a.length)return null;
 if(!same(a.slice(op.at,op.at+from.length),from))return null;
 a.splice(op.at,from.length,...to);return a;
}
function goalMet(chars,goal){
 if(!goal||typeof goal!=="object"||!goal.charSlots||typeof goal.charSlots!=="object"||Array.isArray(goal.charSlots))
  throw Error("Character maze requires explicit checkable goal.charSlots; hidden answer not supplied");
 const entries=Object.entries(goal.charSlots);
 if(!entries.length||entries.length>128)throw Error("Goal needs 1..128 character constraints");
 return entries.every(([at,ch])=>Number.isSafeInteger(Number(at))&&Number(at)>=0&&
   cp(ch).length===1&&chars[Number(at)]===ch);
}
export class CharacterHypermaze{
 constructor({minIndependentWorlds=2, maxRules=100000}={}){
  this.minIndependentWorlds=minIndependentWorlds;this.maxRules=maxRules;
  this.evidence=new Map();this.interventions=new Map();
  this.received=0;this.inferred=0;this.unsupported=0;this.plans=0;
  this.atlasSink=null;this.schema=1;
 }
 observeWordContrast(event,{replay=false}={}){
  if(!event||event.type!=="rule-evidence"||event.world!=="text"||
      typeof event.from!=="string"||typeof event.to!=="string"||!event.from||!event.to)return false;
  const edit=localEdit(event.from,event.to);
  if(!edit){
   this.unsupported++;
   this.atlasSink?.({type:"character-rule-rejected",world:"text-characters",
     wordFrom:event.from,wordTo:event.to,reason:"MULTI_CHAR_OR_UNSUPPORTED_WORD_EDIT",
     documentId:event.documentId,sourceAction:event.action});
   return false;
  }
  const key=JSON.stringify([edit.op,edit.from,edit.to]);
  let r=this.evidence.get(key);
  if(!r){
   if(this.evidence.size>=this.maxRules)throw Error("Character rule budget exhausted: refuse silent evidence eviction");
   r={...edit,key,sourcePairs:[],worlds:[],wordContexts:[],observed:0,accepted:0,blocked:0,
      status:"HYPOTHESIS_FROM_OBSERVED_TEXT_CONTRAST"};
   this.evidence.set(key,r);
  }
  const srcPair=JSON.stringify([event.before,event.after]);
  if(r.sourcePairs.includes(srcPair))return false;
  r.sourcePairs.push(srcPair);
  const doc=event.documentId;
  if(doc!==undefined&&doc!==null&&!r.worlds.includes(doc))r.worlds.push(doc);
  const context=JSON.stringify([event.before?.filter((_,i)=>i!==event.at),event.at,event.from,event.to]);
  if(!r.wordContexts.includes(context))r.wordContexts.push(context);
  r.observed++;this.received++;this.inferred++;
  if(this.atlasSink&&!replay)this.atlasSink({
    type:"character-rule-evidence",world:"text-characters",
    operation:edit.op,from:edit.from,to:edit.to,
    originalWordFrom:event.from,originalWordTo:event.to,
    originalWordIndex:event.at,sourcePair:srcPair,
    context:JSON.parse(context),documentId:doc,sourceAction:event.action,
    sourcePairs:r.sourcePairs.length,independentWorlds:r.worlds.length,
    contexts:r.wordContexts.length,verified:false,
    evidenceLevel:"INFERRED_FROM_INDEPENDENT_OBSERVED_WORD_CONTRASTS_NOT_CAUSAL_PROOF"});
  return true;
 }
 ingestLegacyRules(rules){
  if(this.received||this.evidence.size)return 0;
  let n=0;
  for(const r of rules.values()){
   if(typeof r.from!=="string"||typeof r.to!=="string"||!Array.isArray(r.sources))continue;
   for(const s of r.sources){
    const a=String(s).split(" → ");
    if(a.length!==2)continue;
    const before=a[0]?a[0].split("\u001f"):[];
    const after=a[1]?a[1].split("\u001f"):[];
    if(this.observeWordContrast({type:"rule-evidence",world:"text",from:r.from,to:r.to,
      at:r.at,before,after,action:r.id,documentId:null},{replay:true}))n++;
   }
  }
  return n;
 }
 transferable(){
  return [...this.evidence.values()].filter(r=>r.sourcePairs.length>=this.minIndependentWorlds&&
     r.wordContexts.length>=this.minIndependentWorlds&&
     (r.worlds.length>=this.minIndependentWorlds||r.worlds.length===0) &&
     r.blocked<=r.accepted+r.observed).sort((a,b)=>b.sourcePairs.length-a.sourcePairs.length||a.key.localeCompare(b.key));
 }
 allEvidence(){return [...this.evidence.values()];}
 predict(state,action,admittedKeys=null){
  const op=parseCharAction(action);if(!op)return null;
  const possible=admittedKeys ? admittedKeys.has(JSON.stringify([op.op,op.from,op.to])) :
    this.transferable().some(r=>r.op===op.op&&r.from===op.from&&r.to===op.to);
  if(!possible)return null;
  const current=Array.isArray(state)?state:cp(state),id=stateKey(current)+"|"+action;
  const blocked=this.interventions.get(id);
  if(blocked?.blocked&&blocked.blocked>=blocked.accepted)return null;
  return applyAction(current,action);
 }
 observeIntervention({before,action,after,accepted}){
  const b=Array.isArray(before)?before.slice():cp(before),a=Array.isArray(after)?after.slice():cp(after);
  if(typeof accepted!=="boolean")throw Error("Independent world action accepted flag is required");
  const predicted=this.predict(b,action);
  const correct=accepted&&predicted!==null&&same(predicted,a);
  const id=stateKey(b)+"|"+action,r=this.interventions.get(id)||{accepted:0,blocked:0};
  if(correct)r.accepted++;else r.blocked++;
  this.interventions.set(id,r);
  const decoded=parseCharAction(action);
  const rule=[...this.evidence.values()].find(x=>x.op===decoded?.op&&x.from===decoded?.from&&x.to===decoded?.to);
  if(rule){if(correct)rule.accepted++;else rule.blocked++;}
  this.atlasSink?.({type:"character-real-action",world:"text-characters",
    before:b.join(""),action,actual:a.join(""),predicted:predicted?.join("")??null,
    accepted,correct,evidenceLevel:"INDEPENDENT_ACTION_EFFECT_VERIFIED"});
  return {correct,blocked:!correct,predicted,actual:a};
 }
 buildWorld(initial,goal,{transfer=true,maxNodes=4096,maxDepth=8}={}){
  const start=Array.isArray(initial)?initial.slice():cp(initial);
  if(!start.length||start.length>32768)throw Error("Character state must contain 1..32768 original codepoints");
  if(!Number.isSafeInteger(maxNodes)||maxNodes<2||maxNodes>20000||
     !Number.isSafeInteger(maxDepth)||maxDepth<1||maxDepth>256)
    throw Error("maxNodes must be 2..20000 and maxDepth 1..256");
  goalMet(start,goal); // validate before expansion, not an oracle answer.
  const rules=transfer?this.transferable():[];
  // Use the exact original admitted transforms frozen at the beginning of
  // this candidate world search. The former implementation re-scanned and
  // re-sorted every rule for every hypothetical edge; this preserves EXACT
  // V17 route order, action sequence, seeds and all observed walls.
  const admittedKeys=new Set(rules.map(r=>r.key));
  const states=[start],neighbors=[[]],depth=[0],index=new Map([[stateKey(start),0]]);
  let projected=0,blocked=0,frontier=0,truncated=false,rejected=0;
  // This enumerates the entire reachable learned graph UNDER explicit resource
  // limits, never fabricates the language graph or silently calls it complete.
  for(let head=0;head<states.length;head++){
   const state=states[head];
   if(depth[head]>=maxDepth){frontier++;continue;}
   for(const r of rules){
    for(let at=0;at<=state.length;at++){
     const id=charActionId(r.op,at,r.from,r.to);
     if(!parseCharAction(id))continue;
     if(!applyAction(state,id))continue;
     const next=this.predict(state,id,admittedKeys);
     if(!next){blocked++;continue;}
     const k=stateKey(next);
     let to=index.get(k);
     if(to===undefined){
       if(states.length>=maxNodes){truncated=true;rejected++;continue;}
       to=states.length;states.push(next);neighbors.push([]);depth.push(depth[head]+1);index.set(k,to);
     }
     const actual=this.interventions.get(stateKey(state)+"|"+id);
     neighbors[head].push({to,action:id,transformation:{op:r.op,at,from:r.from,to:r.to},
       support:r.sourcePairs.length,independentWorlds:r.worlds.length,
       provenance:r.sourcePairs,verified:!!actual?.accepted,
       hypothesis:!actual?.accepted,characterLevel:true});
     projected++;
    }
   }
  }
  const targets=states.flatMap((s,i)=>goalMet(s,goal)?[i]:[]);
  const missing=Object.entries(goal.charSlots).filter(([at,ch])=>
     !states.some(s=>s[Number(at)]===ch)).map(([at,ch])=>({position:Number(at),wanted:ch,
       foundAtPosition:[...new Set(states.map(s=>s[Number(at)]).filter(x=>x!==undefined))]}));
  const detailedBlockers=explainCharacterGaps({
    start,goal,states,depth,allEvidence:this.allEvidence(),
    admittedRules:rules,interventions:this.interventions,
    transfer,minIndependentWorlds:this.minIndependentWorlds
  });
  const diag={
    ...detailedBlockers,
    availableEvidenceClasses:this.evidence.size,admittedCrossWorldClasses:rules.length,
    observedContrasts:this.received,projectedCandidateEdges:projected,
    rejectedByWorldWalls:blocked,rejectedByStateBudget:rejected,
    frontierDepthLimited:frontier,maxDepth,maxNodes,
    missingGoalCharacterPaths:missing,
    unsupportedCharacterEditEvents:this.unsupported,
    nodeLimitReached:truncated,depthLimitReached:frontier>0,
    originalWordsOnlyAblation:!transfer,goalExplicit:true,
    designLimitations:[
      "Requires 2 independent observed contrasts/contexts; one observation cannot authorize arbitrary character rewrites",
      "Multi-character nonlocal word edits have no verified portable action operator",
      "Does not infer a new semantic answer or goal from arbitrary Q/A questions",
      "Full KNOWN reachable graph is bounded by explicit maxNodes/maxDepth; when boundary hit NO impossibility claim",
      "Structural observations hypothesize transformations; only actual independent action feedback verifies them"
    ]
  };
  const found=!!targets.length;
  const reason=found?null:truncated?"MAX_NODES_BOUNDARY_BLOCKED_PATH":
     frontier?"MAX_DEPTH_BOUNDARY_BLOCKED_PATH":
     !rules.length?"NO_INDEPENDENT_CHARACTER_TRANSFORM_EVIDENCE":
     missing.length?"MISSING_CHARACTER_TRANSFORMATION_EDGES":"NO_REACHABLE_GOAL_WITH_OBSERVED_RULES";
  return {states,neighbors,targets,start:0,goal,diagnostics:diag,reason,truncated};
 }
 formSolution(initial,goal,{disc=null,temperature=0,seed=74129,transfer=true,maxNodes=4096,maxDepth=8,postHocReference=false}={}){
  this.plans++;
  const world=this.buildWorld(initial,goal,{transfer,maxNodes,maxDepth});
  if(world.targets.includes(0)){
    return {found:true,alreadyAtGoal:true,world,path:[],field:{values:[],nodes:[0]},
      method:"Discoverer.shape",plannedBeforeAction:true,reason:"ALREADY_AT_GOAL"};
  }
  if(!world.targets.length){
    const failed={found:false,world,path:[],field:{values:[],nodes:[0]},
      method:"Discoverer.shape",plannedBeforeAction:true,reason:world.reason};
    this.#auditPlan(initial,failed,transfer,postHocReference);return failed;
  }
  const d=new Discoverer(seed);d.temp=Math.max(0,Number(temperature)||0);
  const kinds=world.states.map((s,i)=>i===0?KIND.self:world.targets.includes(i)?KIND.target:KIND.floor);
  const conduct=k=>k===KIND.wall?0:k===KIND.floor?Math.max(.5,disc?.conduct?.(KIND.floor)??.5):1;
  const attract=k=>k===KIND.target?1:0;
  let vals=[];
  const path=d.shape(kinds,0,0,{neighbors:world.neighbors,conduct,attract,onField:v=>{vals=v;}})||[];
  const nodes=[0,...path.map(x=>x.to)];
  const found=path.length>0&&world.targets.includes(path.at(-1).to);
  const result={found,world,path,field:{values:vals,nodes},
    method:"Discoverer.shape",plannedBeforeAction:true,
    temperature:d.temp,reason:found?null:"NO_ASCENDING_ORIGINAL_V17_SHAPE",
    firstPrediction: path.map(e=>({from:world.states[e.from].join(""),action:e.action,
      to:world.states[e.to].join(""),verified:e.verified}))};
  this.#auditPlan(initial,result,transfer,postHocReference);return result;
 }
 #auditPlan(initial,plan,transfer,postHocReference=false){
  this.atlasSink?.({type:"character-planning-attempt",world:"text-characters",
    input:Array.isArray(initial)?initial.join(""):String(initial),
    goal:plan.world.goal,found:plan.found,reason:plan.reason||null,
    transferUsed:transfer,method:plan.method,plannedBeforeAction:true,
    diagnostics:plan.world.diagnostics,
    fullAtlas:{states:plan.world.states.map(s=>s.join("")),
      neighbors:plan.world.neighbors,targets:plan.world.targets},
    completePredictedPath:plan.firstPrediction||[],
    originalShapeNodes:plan.field.nodes,originalShapeValues:plan.field.values,
    hiddenAnswerNotProvided:!postHocReference,
    postHocReferenceUsedForDiagnosisOnly:!!postHocReference,
    notPartOfOriginalPrediction:!!postHocReference,
    successIsExplicitGoalReachabilityNotSemanticAnswer:true});
 }
 execute(plan,{step}={}){
  if(typeof step!=="function")throw Error("Real independent step() world required, never replay predicted edges as an oracle");
  const before=plan.world.states[0].slice(),log=[];
  let current=before;
  for(const edge of plan.path){
   const response=step(current.slice(),edge.action);
   if(!response||typeof response.accepted!=="boolean"||!Array.isArray(response.after))
    throw Error("World must provide independent accepted and actual after state");
   const observed=this.observeIntervention({before:current,action:edge.action,
     after:response.after,accepted:response.accepted});
   log.push({before:current.join(""),action:edge.action,
     predicted:observed.predicted?.join("")||null,
     observed:response.after.join(""),correct:observed.correct,blocked:observed.blocked});
   if(!observed.correct)break;
   current=response.after.slice();
  }
  return {reached:goalMet(current,plan.world.goal),final:current.join(""),steps:log,
    firstPredictedPath:plan.firstPrediction||[],actualActions:log.length,
    exactEntireObservedTargetIsKnownOnlyUnderExplicitGoal:true};
 }
 status(){return {level:"unicode-characters",observedWordContrastEvents:this.received,
    totalCharacterRuleClasses:this.evidence.size,admittedCrossWorldRuleClasses:this.transferable().length,
    unsupportedMultiCharacterContrasts:this.unsupported,
    verifiedActionContexts:this.interventions.size,plans:this.plans,
    originalNavigator:"Discoverer.shape",predictionsAreHypotheses:true};}
 export(){return {schema:1,minIndependentWorlds:this.minIndependentWorlds,maxRules:this.maxRules,
   evidence:[...this.evidence],interventions:[...this.interventions],
   received:this.received,inferred:this.inferred,unsupported:this.unsupported,plans:this.plans};}
 static restore(o){
  if(!o)return new CharacterHypermaze();
  if(o.schema!==1)throw Error("Unsupported character atlas checkpoint version");
  const m=new CharacterHypermaze({minIndependentWorlds:o.minIndependentWorlds,maxRules:o.maxRules});
  m.evidence=new Map(o.evidence||[]);m.interventions=new Map(o.interventions||[]);
  m.received=o.received||0;m.inferred=o.inferred||0;
  m.unsupported=o.unsupported||0;m.plans=o.plans||0;return m;
 }
}
