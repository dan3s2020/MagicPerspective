// Isolated mathematical transformation research COUPLED TO ACTUAL OBSERVED
// V17 TRAINING TEXT (same worker, same stream). There are no synthetic examples.
// It extracts adjacent explicitly written equations; it never invents answers.
// The original V17 Brain, GPU stream, UI and text decoder remain unchanged.
// Native schema-specific arithmetic inductive bias is NOT universal semantics.
import fs from "node:fs";
import v8 from "node:v8";
import path from "node:path";
import {CoupledTextMaze} from "./coupled-axes.mjs";
import {StateDependentTextAxes} from "./state-dependent-axes.mjs";
import {learnedHolonomy} from "./path-holonomy.mjs";
import {LivePredictiveStateGate} from "./live-predictive-state-gate.mjs";

const expr=/\b\d+\s*[+*×÷\/-]\s*\d+\s*=\s*\d+\b/gu;
const cap=(v,n)=>String(v||"").slice(0,n);
function equationLines(input){
 const lines=String(input||"").split(/\r?\n/);
 const found=[];
 for(const raw of lines){
  const s=raw.trim().replace(/^\s*(?:step|pas)\s*\d+\s*[:.)-]\s*/iu,"");
  if(s.length>1000)continue;
  const matches=[...s.matchAll(expr)].map(x=>x[0].replace(/×/g,"*").replace(/÷/g,"/"));
  // A text line containing TWO separate expressions is usable only if it
  // explicitly contains an arrow; no missing causal relation is fabricated.
  if(matches.length===2&&/(?:->|→|=>)/u.test(s)){
   found.push({before:matches[0],after:matches[1],source:"explicit-arrow"});
  }else if(matches.length===1){
   found.push({value:matches[0],source:"adjacent-observed-expression"});
  }
 }
 const results=[];
 for(let i=0;i<found.length;i++){
  if(found[i].before){
   results.push({before:found[i].before,after:found[i].after,source:found[i].source});
  }else if(found[i+1]?.value){
   results.push({before:found[i].value,after:found[i+1].value,source:"adjacent-observed-expression"});
  }
 }
 return results.slice(0,8);
}
export class LiveObservedMathAxes {
 constructor({saveFile=null}={}){
  this.coupled=new CoupledTextMaze({maxValue:100000,maxExpanded:2000});
  this.conditional=new StateDependentTextAxes({maxValue:100000,maxExpanded:2000});
  this.saveFile=saveFile;
  this.predictiveState=new LivePredictiveStateGate();
  this.rows=0;this.extracted=0;this.coupledAccepted=0;this.conditionalAccepted=0;
  this.samples=[];this.rejected=0;
 }
 consume(text){
  this.rows++;
  const candidates=equationLines(text);
  for(const pair of candidates){
   this.extracted++;
   // Predict with ONLY earlier observed evidence, before either existing
   // transformation learner absorbs this pair. This is a measured live check,
   // not an offline precomputed diagram or a replacement decoder.
   this.predictiveState.observePair(pair.before,pair.after,pair.source);
   const a=this.coupled.observePair(pair.before,pair.after);
   const b=this.conditional.observePair(pair.before,pair.after);
   if(a.learned)this.coupledAccepted++;
   if(b.learned)this.conditionalAccepted++;
   if(a.learned||b.learned){
    this.samples.push({...pair,coupled:a.learned,conditional:b.learned});
    if(this.samples.length>24)this.samples.splice(0,this.samples.length-24);
   }else this.rejected++;
  }
  return {rows:this.rows,extracted:this.extracted,accepted:this.coupledAccepted,
   nonlinear:this.conditionalAccepted};
 }
 report(){
  const last=this.samples.at(-1)||null;
  let axes=null,dependent=null;
  if(last){
   try{axes=this.coupled.axesFor(last.before);}
   catch(e){axes={error:e.message};}
   try{
    const d=this.conditional.discover(last.before);
    dependent={ready:d.ready,reason:d.reason||null,
     axes:d.axes||[],dependent:d.dependent??null,
     operators:d.operators?.length||0};
   }catch(e){dependent={ready:false,error:e.message};}
  }
  return {enabled:true,source:"real observed equations in original V17 corpus",
   rows:this.rows,candidatePairs:this.extracted,coupledPairs:this.coupledAccepted,
   stateDependentPairs:this.conditionalAccepted,rejectedPairs:this.rejected,
   templatesCoupled:this.coupled.grammars.size,
   templatesConditional:this.conditional.data.size,
   lastExample:last,axes,dependent,
   predictiveState:this.predictiveState.report(),
   caveat:"Adjacent equations are observed text, not proof of causal intervention; no fabricated labels and no universal arithmetic claims"};
 }
 plan(start,goals){
  if(typeof start!=="string"||!start.trim())throw Error("An observed numeric start expression is required");
  if(!Array.isArray(goals)||!goals.length)throw Error("Specify at least one numeric goal constraint");
  const counts={rows:this.rows,extracted:this.extracted,accepted:this.coupledAccepted,
   nonlinear:this.conditionalAccepted};
  let field="state-dependent",plan;
  try{plan=this.conditional.plan(start,goals,{maxExpanded:1500,maxSteps:24});}
  catch(e){plan={found:false,reason:e.message};}
  if(!plan?.found){
   field="coupled";
   try{plan=this.coupled.plan(start,goals,{maxExpanded:1500,maxSteps:24});}
   catch(e){plan={found:false,reason:e.message};}
  }
  let holonomy={ready:false,reason:"No sufficient observed noncommuting numeric operators"};
  try{
   const h=learnedHolonomy(this.conditional,start);
   holonomy={ready:!!h.ready,reason:h.reason||null,commutator:h.commutator||null,
    ...("compressedExtraStateCoordinates" in h?{compressedExtraStateCoordinates:h.compressedExtraStateCoordinates}:{})};
  }catch(e){holonomy={ready:false,reason:e.message};}
  // Predict the first movement of the EXISTING frozen goal path using the
  // earlier empirically selected context-axis, before any goal execution.
  let preActionEffect={available:false,reason:"no-observed-state-dependent-first-action"};
  if(plan?.found&&field==="state-dependent"&&plan.actions?.length){
   const op=plan.actions[0],indices=plan.model?.numericTokenIndices;
   if(Array.isArray(indices)&&Number.isInteger(op.primary))
    preActionEffect=this.predictiveState.forecastAction(start,indices[op.primary],op.step);
  }
  const unchanged=JSON.stringify(counts)===JSON.stringify({
   rows:this.rows,extracted:this.extracted,accepted:this.coupledAccepted,
   nonlinear:this.conditionalAccepted});
  if(!unchanged)throw Error("Frozen math planning unexpectedly modified learner evidence");
  return {found:!!plan?.found,field,plan,holonomy,preActionEffect,training:counts,
   input:start,goals,referenceAnswerProvided:false,
   actualWorldExecution:false,
   independentSemanticVerifier:false,
   frozen:true,
   explanation:"Plan executes an observed text-derived numeric operator model. No correct answer supplied; this is not physical world feedback."};
 }
 save(){
  if(!this.saveFile)return 0;
  const payload={v:2,rows:this.rows,extracted:this.extracted,
   coupledAccepted:this.coupledAccepted,conditionalAccepted:this.conditionalAccepted,
   rejected:this.rejected,samples:this.samples,
   coupled:{grammars:this.coupled.grammars,observations:this.coupled.observations,rejected:this.coupled.rejected},
   conditional:{data:this.conditional.data,observations:this.conditional.observations,rejected:this.conditional.rejected},
   predictiveState:this.predictiveState.export()};
  const bytes=v8.serialize(payload);
  fs.mkdirSync(path.dirname(this.saveFile),{recursive:true});
  fs.writeFileSync(this.saveFile+".tmp",bytes);fs.renameSync(this.saveFile+".tmp",this.saveFile);
  return bytes.length;
 }
 static restore(saveFile){
  const x=new LiveObservedMathAxes({saveFile});
  if(!saveFile||!fs.existsSync(saveFile))return x;
  const o=v8.deserialize(fs.readFileSync(saveFile));
  if(![1,2].includes(o.v)||!(o.coupled?.grammars instanceof Map)||
    !(o.conditional?.data instanceof Map))throw Error("Incompatible math observer checkpoint");
  x.rows=o.rows;x.extracted=o.extracted;x.coupledAccepted=o.coupledAccepted;
  x.conditionalAccepted=o.conditionalAccepted;x.rejected=o.rejected;x.samples=o.samples;
  x.coupled.grammars=o.coupled.grammars;
  x.coupled.observations=o.coupled.observations;x.coupled.rejected=o.coupled.rejected;
  x.conditional.data=o.conditional.data;
  x.conditional.observations=o.conditional.observations;x.conditional.rejected=o.conditional.rejected;
  if(o.v===2)x.predictiveState=LivePredictiveStateGate.restore(o.predictiveState);
  // Original v1 V17 sidecars remain readable and preserve all existing evidence.
  return x;
 }
}
