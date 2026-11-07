// V25 conservative source completeness gate, opt-in on ORIGINAL V17 Brain.
import {ObservedNoEffectEvidence} from "../worlds/observed-no-effect-gate.mjs";
import {GroundedTemporalHypermaze} from "../worlds/grounded-temporal-hypermaze.mjs";
import {LearnedNumericalTextPhysics} from "../worlds/learned-numeric-causal-shape.mjs";
import {runV23Lab} from "./v23-lab-adapter.mjs";

export function runV25StrictLab(brain,request={}){
 if(!brain||typeof brain!=="object")throw Error("Native Brain instance required");
 const kind=request.kind;
 if(!["temporal","numeric"].includes(kind))throw Error("Only grounded original-shape text worlds are allowed");
 const saved=brain.v25NeutralEvidence;
 const gate=saved?ObservedNoEffectEvidence.restore(saved):new ObservedNoEffectEvidence();
 if(request.command==="teach-neutral"){
  const records=request.observations;
  if(!Array.isArray(records)||records.length<1||records.length>1000)
    throw Error("Give 1..1000 independently witnessed unchanged-state observations");
  const details=records.map(x=>gate.observe(x));
  brain.v25NeutralEvidence=gate.export();
  return {changed:true,kind,command:"teach-neutral",samples:details.length,
    accepted:details.filter(x=>x.learned).length,
    verifiedNeutralPatterns:gate.compiled().length,
    semantics:"User-reported before==after physical evidence, not automatically inferred language intent",
    checkpointField:"v25NeutralEvidence"};
 }
 if(!["plan","audit","page"].includes(request.command))throw Error("Expected teach-neutral, audit, plan or page");
 if(request.command==="page"){
  const paged=runV23Lab(brain,{...request,command:"page"});
  return {...paged,strictClosedWorld:true,changed:false};
 }
 const slot=kind==="numeric"?"v23Numeric":"v23Temporal";
 if(!brain[slot])return {changed:false,found:false,reason:"NO_LEARNED_ORIGINAL_BRAIN_MODEL",
   strictClosedWorld:true};
 const model=kind==="numeric"?LearnedNumericalTextPhysics.restore(brain[slot]):
   GroundedTemporalHypermaze.restore(brain[slot]);
 if(typeof request.document!=="string"||typeof request.question!=="string"||
    request.document.length>8000000||request.question.length>4096)
   throw Error("Provide full <=8M-character document and known-question grammar");
 const savedBefore=JSON.stringify(model.export());
 const audit=gate.audit(model,request.document,request.question);
 if(JSON.stringify(model.export())!==savedBefore)throw Error("Completeness audit changed learned original Brain model");
 if(request.command==="audit")return {changed:false,kind,command:"audit",found:audit.safe,
   strictClosedWorld:true,completeForObservedEntityLiterals:audit.safe,audit};
 if(!audit.safe)return {changed:false,found:false,kind,command:"plan",
   plannedBeforeAction:true,strictClosedWorld:true,reason:audit.reason,
   audit,answer:null,nativeOriginalMethod:"Discoverer.shape",unrestrictedLanguageQAProven:false};
 const frozen=runV23Lab(brain,{...request,command:"plan"});
 return {...frozen,changed:false,strictClosedWorld:true,audit,
   certifiedOnlyForObservedEntityLiterals:true,
   unrestrictedLanguageQAProven:false};
}
