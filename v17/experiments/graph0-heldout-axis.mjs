// Frozen native V17 held-out probe: does opening the 5D field direction HELP real unseen next-byte prediction?
// All predictions are made before consuming the actual byte at that step.
// No training, no geometry-learning, no source checkpoint writes, no data leakage.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import {Brain} from "../transcend/torus-aether/devour/brain.mjs";
import {openTextDataset} from "../transcend/torus-aether/data/text-dataset.mjs";
import {ascii,ALPHAS,scoreAxisPredictions} from "./graph0-heldout-axis-core.mjs";

const opt={};
for(let i=2;i<process.argv.length;i+=2){
  if(!process.argv[i]?.startsWith("--")||!process.argv[i+1])throw Error("Expected --argument value");
  opt[process.argv[i].slice(2)]=process.argv[i+1];
}
for(const k of Object.keys(opt))if(!["checkpoint","data","out","rows","max-chars"].includes(k))
  throw Error("Unknown argument "+k);
if(!opt.checkpoint||!opt.data||!opt.out)
  throw Error("Usage: --checkpoint COPY.v8 --data PARQUET_FOLDER --out RESULTS_DIR [--rows 4 --max-chars 1024]");
const checkpoint=path.resolve(opt.checkpoint),root=path.resolve(opt.data),out=path.resolve(opt.out);
const wanted=opt.rows?Number(opt.rows):4,maxChars=opt["max-chars"]?Number(opt["max-chars"]):1024;
if(!Number.isInteger(wanted)||wanted<1||wanted>16||!Number.isInteger(maxChars)||maxChars<128||maxChars>10000)
  throw Error("Invalid rows or max-chars");
if(!checkpoint.endsWith(".v8")||!fs.statSync(checkpoint).isFile())throw Error("Expected frozen checkpoint COPY.v8");
fs.mkdirSync(out,{recursive:true});
const digest=()=>crypto.createHash("sha256").update(fs.readFileSync(checkpoint)).digest("hex");
const beforeHash=digest();
const brain=Brain.load(checkpoint);
if(!brain.align||!brain.field||!brain.trace?.geo?.U)throw Error("Expected actual V17 graph0 brain with AligningGraph, FIELD and geometry");
const A=brain.align,G=brain.trace.geo;
const frozen=()=>JSON.stringify({
  bytes:A.mem.n,formBytes:A.fmem.n,lived:brain.lived,exerciseCount:brain.exercises,
  trustEntries:A.trust.size,geometrySamples:G.n,coordinates:G.U.size,
  fieldRing:brain.field.ring.length
});
const beforeCounters=frozen();
const ds=await openTextDataset(root);
if(!ds.held)throw Error("No held-out examples: dataset too small");
const selected=[];
let skippedForLength=0;
for(let i=0;i<ds.held && selected.length<wanted;i++){
  const row=await ds.heldOut(i);
  const prefix=ascii("Q: "+row.prompt+"\nA: ");
  const answer=ascii(row.answer+"\n\n");
  if(prefix.length>=maxChars-32||answer.length<16){skippedForLength++;continue;}
  const bytes=prefix.concat(answer).slice(0,maxChars);
  selected.push({index:row.index,bytes,answerStart:prefix.length,
    answerBytesSeen:bytes.length-prefix.length,questionBytes:prefix.length,fullAnswerBytes:answer.length});
}
if(!selected.length)throw Error("No usable held-out rows within max-chars. Increase --max-chars.");
const original=[...G.U.entries()].map(([y,v])=>[y,v.slice()]);
const makeField=bytes=>brain.field.read(bytes,brain.place);
const reportRows=[];
function aggregate(rows,key){
  const results={};
  for(const alpha of ALPHAS){
    const k=String(alpha),selectedRows=rows.map(r=>r[key]?.[k]).filter(Boolean);
    const sum=prop=>selectedRows.reduce((n,s)=>n+(s[prop]||0),0);
    const allTotal=sum("allTotal"),answerTotal=sum("answerTotal");
    results[k]={alpha,allTotal,answerTotal,
      allAccuracy:allTotal?sum("allCorrect")/allTotal:null,
      answerAccuracy:answerTotal?sum("answerCorrect")/answerTotal:null,
      meanAllNLL:allTotal?sum("allNLL")/allTotal:null,
      meanAnswerNLL:answerTotal?sum("answerNLL")/answerTotal:null,
      fieldCoverageFraction:allTotal?sum("fieldCoverage")/allTotal:null,
      alignedTrueByteBlockedFraction:allTotal?sum("alignedTrueByteBlocked")/allTotal:null,
      geometryRestoresBlockedTargetFraction:allTotal?sum("geometricTrueByteRecoveryPossible")/allTotal:null,
      geometryExpandsSuccessorStepsFraction:allTotal?sum("geometricExpandedSuccessorSet")/allTotal:null
    };
  }
  return results;
}
for(const row of selected){
  let alignDists=[];
  A.readFrozen(row.bytes,(i,y,g,d)=>{alignDists[i]=new Map(d);});
  if(alignDists.length!==row.bytes.length)throw Error("Native alignment trace incomplete");
  const regularField=makeField(row.bytes);
  // Counterfactual: deliberately REMOVE every learned symbol-axis distinction.
  // Do not use held-out labels to select a geometry or choose a policy.
  let collapsedField;
  try{
    for(const [y,v] of original)G.U.set(y,v.map(()=>0.5));
    collapsedField=makeField(row.bytes);
  }finally{
    for(const [y,v] of original)G.U.set(y,v);
  }
  const normal=scoreAxisPredictions(row.bytes,row.answerStart,alignDists,regularField);
  const collapsed=scoreAxisPredictions(row.bytes,row.answerStart,alignDists,collapsedField);
  reportRows.push({
    index:row.index,questionBytes:row.questionBytes,answerStart:row.answerStart,
    fullAnswerBytes:row.fullAnswerBytes,answerBytesSeen:row.answerBytesSeen,
    evaluatedChars:row.bytes.length,normal,collapsed
  });
  console.log(JSON.stringify({
    heldOutRow:row.index,chars:row.bytes.length,answerBytes:row.answerBytesSeen,
    alignAnswerAccuracy:normal["0"].answerAccuracy,
    fieldCoverage:normal["1"].fieldCoverageFraction,
    mix025AnswerAccuracy:normal["0.25"].answerAccuracy,
    mix05AnswerAccuracy:normal["0.5"].answerAccuracy,
    mix05CollapsedAnswerAccuracy:collapsed["0.5"].answerAccuracy
  }));
}
if(frozen()!==beforeCounters)throw Error("Frozen learned counters changed during inference");
if(digest()!==beforeHash)throw Error("Checkpoint COPY changed during held-out evaluation");
const normal=aggregate(reportRows,"normal"),collapsed=aggregate(reportRows,"collapsed");
const gain=Object.fromEntries(ALPHAS.map(a=>{const k=String(a);return [k,{
  originalVsAlignAnswer:normal[k].answerAccuracy==null?null:normal[k].answerAccuracy-normal["0"].answerAccuracy,
  originalVsCollapsedAnswer:normal[k].answerAccuracy==null?null:normal[k].answerAccuracy-collapsed[k].answerAccuracy,
  originalVsAlignNLL:normal[k].meanAnswerNLL==null?null:normal[k].meanAnswerNLL-normal["0"].meanAnswerNLL
}]}));
const report={
  experiment:"native-V17-frozen-heldout-5D-field-as-next-action-probe",
  checkpointSha256:beforeHash,datasetRoot:root,datasetTotal:ds.total,trainingRows:ds.trainRows,
  heldoutRowsAvailable:ds.held,selectedRows:reportRows.length,skippedForLength,unseenIndices:reportRows.map(r=>r.index),
  maxCharsPerRow:maxChars,interventions:{normal:"original learned Geometry.U",collapsed:"all trained Geometry.U points collapsed to center, then FIELD rebuilt"},
  readOnly:true,teacherForced:true,trainedOnHeldOut:false,
  limitations:[
    "Predictions use the true PAST characters only; the current/future character is never given before its own decision.",
    "This tests next-character distributions and answer-only next-character accuracy, not long-horizon goal/path planning or free-form answer quality.",
    "The 16 held-out examples are those excluded by openTextDataset; selected examples may be a smaller length-filtered subset.",
    "Comparisons among multiple mix weights on these held-out rows are exploratory; do not tune then claim independent generalization on the same rows.",
    "LivedField.read rebuilds an inference index in RAM; the frozen checkpoint file and learned counters remain untouched.",
    "A geometric perturbation that changes only FIELD does not imply a change in the original AligningGraph.write policy."
  ],
  beforeCounters:JSON.parse(beforeCounters),aggregates:{normal,collapsed,gain},rows:reportRows
};
const target=path.join(out,"graph0-heldout-axis-score.json");
fs.writeFileSync(target,JSON.stringify(report,null,2),"utf8");
console.log("AXIS_SCORE_SUMMARY "+JSON.stringify({sha256:beforeHash,heldoutRows:reportRows.length,
  alignAnswerAccuracy:normal["0"].answerAccuracy,originalMix025AnswerAccuracy:normal["0.25"].answerAccuracy,
  collapsedMix025AnswerAccuracy:collapsed["0.25"].answerAccuracy,
  originalMix05AnswerAccuracy:normal["0.5"].answerAccuracy,
  collapsedMix05AnswerAccuracy:collapsed["0.5"].answerAccuracy,
  fieldAnswerCoverage:normal["1"].fieldCoverageFraction,
  alignedTrueByteBlocked:normal["0"].alignedTrueByteBlockedFraction,
  geometricallyRecoverableTrueByte:normal["0.25"].geometryRestoresBlockedTargetFraction,
  geometryExpandsNextByteChoices:normal["0.25"].geometryExpandsSuccessorStepsFraction}));
console.log("SAVED: "+target);
