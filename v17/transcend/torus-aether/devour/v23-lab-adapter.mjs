// Additive native V17 Brain-backed V23 interface, not a next-token writer.
// On training, store only explicit before/action/after observations in the
// SAME original Brain checkpoint. On planning, run ORIGINAL Discoverer.shape
// recursively, freeze ALL steps before first movement, paginate true steps.
// No active trained CUDA, UI frame or semantic QA success is fabricated.
import {createHash} from "node:crypto";
import {GroundedTemporalHypermaze} from "../worlds/grounded-temporal-hypermaze.mjs";
import {MultiscaleGroundedHypermaze} from "../worlds/multiscale-grounded-hypermaze.mjs";
import {LearnedNumericalTextPhysics} from "../worlds/learned-numeric-causal-shape.mjs";

const CACHE = new WeakMap();
const limitInt=(x,lo,hi,def)=>Number.isInteger(x)&&x>=lo&&x<=hi?x:def;
const branch = kind => kind==="numeric" ? 
  {slot:"v23Numeric",model:LearnedNumericalTextPhysics} :
  kind==="temporal" ? {slot:"v23Temporal",model:GroundedTemporalHypermaze} : null;
function load(brain,kind){
 const b=branch(kind);if(!b)throw Error("Choose numeric or temporal observed text world");
 return {slot:b.slot,model:brain[b.slot]?b.model.restore(brain[b.slot]):new b.model()};
}
function modelSummary(kind,model){
 return kind==="numeric"?
  {observedTemplates:model.laws.size,verifiedLaws:[...model.laws.values()].filter(x=>x.verified).length,
   actionSamples:[...model.laws.values()].reduce((s,x)=>s+x.samples.length,0),
   initialSchemas:model.initials.size,questionSchemas:model.questions.size}:
  {observedTemplates:model.actions.size,verifiedActionTypes:[...model.actions.values()].filter(x=>x.evidence>=model.minimumEvidence).length,
   actionSamples:model.trainingActions,questionSamples:model.trainingQuestions};
}
function planPage(p,offset,limit){
 const arr=p.path||[],from=limitInt(offset,0,Math.max(0,arr.length),0);
 const length=limitInt(limit,1,500,100);
 return {offset:from,limit:length,total:arr.length,nextOffset:from+length<arr.length?from+length:null,
  steps:arr.slice(from,from+length).map((e,i)=>({
   index:from+i,
   action:e.action,
   from:e.from,
   to:e.to,
   sourceIndex:e.sourceIndex??null,
   learnedSupport:e.support??null,
   rule:e.law??null
  }))};
}
export function runV23Lab(brain,request={}){
 if(!brain||typeof brain!=="object")throw Error("Native original Brain instance required");
 const kind=request.kind,cmd=request.command,{slot,model}=load(brain,kind);
 if(cmd==="train"){
  if(!Array.isArray(request.observations)||!request.observations.length||
     request.observations.length>2000)throw Error("Provide 1..2000 independently observed physical samples");
  const outcomes=[];
  for(const row of request.observations){
    if(!row||typeof row!=="object")throw Error("Invalid observed sample");
    if(kind==="numeric"){
      if(row.type==="action")outcomes.push(model.observeAction(row));
      else if(row.type==="initial")outcomes.push({learned:model.observeInitial(row)});
      else if(row.type==="question")outcomes.push({learned:model.observeQuestion(row)});
      else throw Error("Expected numeric action, initial, or question evidence");
    }else{
      if(row.type==="action")outcomes.push(model.observeAction({
        sentence:row.sentence,item:row.item,before:row.before,after:row.after,accepted:row.accepted!==false
      }));
      else if(row.type==="question")outcomes.push(model.observeQuestion({
        question:row.question,item:row.item
      }));
      else throw Error("Expected temporal action or question evidence");
    }
  }
  brain[slot]=model.export();CACHE.delete(brain);
  return {changed:true,kind,command:cmd,samplesConsumed:outcomes.length,
    learnedResults:outcomes.slice(-12),statistics:modelSummary(kind,model),
    checkpointField:slot,truthStatus:"user-supplied observed before/action/after; external physical verification required"};
 }
 if(cmd==="plan"){
  if(typeof request.document!=="string"||request.document.length<1||
     request.document.length>8000000||typeof request.question!=="string"||
     request.question.length>4096)throw Error("Provide <=8M-character full document and a question");
  const pre=JSON.stringify(model.export());
  const p=kind==="numeric"?model.plan(request.document,request.question,{
    seed:limitInt(request.seed,0,4294967295,74129),
    temperature:typeof request.temperature==="number"?Math.max(0,Math.min(2,request.temperature)):0}):
    new MultiscaleGroundedHypermaze(model).plan(request.document,request.question,{
      seed:limitInt(request.seed,0,4294967295,74129),
      temperature:typeof request.temperature==="number"?Math.max(0,Math.min(2,request.temperature)):0});
  if(JSON.stringify(model.export())!==pre)throw Error("The frozen original shape modified learned Brain state");
  if(!p.found)return {changed:false,kind,command:cmd,found:false,reason:p.reason||"UNKNOWN",
    statistics:modelSummary(kind,model),originalMethod:"Discoverer.shape",frozen:true};
  const hash=createHash("sha256").update(JSON.stringify(p.path)).digest("hex");
  const planId=hash.slice(0,24);
  CACHE.set(brain,{planId,kind,plan:p});
  return {changed:false,kind,command:cmd,found:true,frozen:true,
    planId,sha256:hash,originalMethod:"Discoverer.shape",plannedBeforeAction:true,
    answer:kind==="numeric"?p.answer:p.plannedAnswer,
    goal:p.goal,levels:p.levels?.map(L=>({depth:L.depth,
      from:L.fromStep??L.range?.[0],to:L.toStep??L.range?.[1],
      nodes:L.nodes??L.groups+1,fieldAtStart:L.fieldAtStart??L.scalarAtStart,
      method:L.originalMethod})),
    originalShapeCalls:p.originalShapeCalls??p.recursiveOriginalCalls,
    maxLocalNodes:p.maxLocalNodes??p.maximumLocalNodes,
    path:planPage(p,request.offset,request.limit),statistics:modelSummary(kind,model),
    verificationStatus:"NOT_EXECUTED; these are frozen predictions; no independent real world action has been reported"};
 }
 if(cmd==="page"){
  const cached=CACHE.get(brain);
  if(!cached||cached.kind!==kind||cached.planId!==request.planId)
    return {changed:false,found:false,reason:"FROZEN_PLAN_CACHE_EXPIRED_REPLAN"};
  return {changed:false,found:true,kind,command:cmd,frozen:true,planId:cached.planId,
    path:planPage(cached.plan,request.offset,request.limit),
    answer:kind==="numeric"?cached.plan.answer:cached.plan.plannedAnswer,
    verificationStatus:"NOT_EXECUTED"};
 }
 throw Error("Expected train, plan, or page command");
}
