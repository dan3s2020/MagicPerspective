import {loadVexseq,summarize} from "./vexseq-source.mjs";
const source=process.argv[2];if(!source)throw Error("Source folder required");
const r=loadVexseq(source);
const all=Object.values(r.splits).flat();
const uniqueMutations=all.every(x=>x.ref.length===x.alt.length&&
 [...x.ref].filter((c,i)=>c!==x.alt[i]).length===1);
const splitGroups=Object.fromEntries(Object.entries(r.splits).map(([k,rows])=>[k,new Set(rows.map(r=>r.event))]));
if(!uniqueMutations)throw Error("Malformed real pair");
for(const k of Object.keys(splitGroups))for(const j of Object.keys(splitGroups))
 if(k!==j&&[...splitGroups[k]].some(g=>splitGroups[j].has(g)))throw Error("Group leakage");
const report={
 status:"REAL_VEXSEQ_ORIENTATION_CORRECTED_VALID_REF_ALT_DATA_VALIDATED_NO_MODEL_SCORES",
 source:r.source,commit:r.pinnedSourceCommit,sourceInputSHA256:r.sourceInputSHA256,
 originalCounts:r.sourceCounts,rejected:r.rejected,
 validatedTotal:r.validatedTotal,uniqueEvents:r.uniqueEvents,
 splitGroupCounts:r.splitGroupCounts,
 sampleCounts:Object.fromEntries(Object.entries(r.splits).map(([k,rows])=>[k,summarize(rows)])),
 firstRealPairedVariants:r.splits.train.slice(0,6).map(x=>({
 id:x.id,group:x.event,strand:x.strand,orient:x.orientation,changeIndex:x.changeIndex,
 refBase:x.observedRef,altBase:x.observedAlt,deltaPSI:x.deltaPSI,
 refSequenceHash:x.ref.length,altSequenceLength:x.alt.length
 }))
};
if(process.env.VEXSEQ_SOURCE_VALIDATION_JSON)await (await import("node:fs")).promises.writeFile(
 process.env.VEXSEQ_SOURCE_VALIDATION_JSON,JSON.stringify(report,null,2)+"\n");
console.log("VEXSEQ_TRUE_PAIRS "+JSON.stringify(report));
