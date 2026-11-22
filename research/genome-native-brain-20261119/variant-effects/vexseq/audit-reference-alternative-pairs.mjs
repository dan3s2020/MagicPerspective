// Real Vex-seq assay variant + genuine reference construct join integrity audit.
// No model trained, no user donor weights, no invented allele sequences.
import fs from "node:fs";
import crypto from "node:crypto";
import path from "node:path";
const dir=process.argv[2];if(!dir)throw Error("Usage: audit-reference-alternative-pairs.mjs PINNED_VEXSEQ_REPO");
const text=f=>fs.readFileSync(path.join(dir,f),"utf8");
const split=(content,sep)=>{const lines=content.split(/\r?\n/).filter(Boolean);
 const columns=lines.shift().split(sep);
 return lines.map((l,i)=>{const fields=l.split(sep),o={};
  for(let j=0;j<columns.length;j++)o[columns[j]]=fields[j]??"";
  return o;});};
const design=split(text("preprocess_data/68_97_final_sequences_fixed.tsv"),"\t");
const assay=split(text("processed_files/delta_PSI_values.tsv"),"\t");
const controls=text("processed_files/control_variant_pairs.csv").trim().split(/\r?\n/).map(s=>s.split(","));
const designMap=new Map(),groups=new Map();
for(const row of design){
 const id=[row.chromosome,row.position,row.reference,row.alternative].join("_");
 if(!designMap.has(id))designMap.set(id,new Set());
 designMap.get(id).add(row["Final Sequence"]);
}
const issues={missingPairedControl:0,missingVariantSequence:0,missingReference:0,ambiguousVariant:0,
 ambiguousReference:0,nonSNV:0,lengthMismatch:0,notSingleBaseSubstitution:0,nonDNA:0,
 idNotFoundInPairTable:0,hasValidPair:0,ambiguousGroup:0};
const eventFor=new Map(),originalFor=new Map();
for(let i=0;i<controls.length;i++){
 const row=controls[i],controlsInRow=row.filter(x=>x.endsWith("_Control_Original"));
 if(!controlsInRow.length)issues.missingPairedControl++;
 for(const variant of row){
  if(eventFor.has(variant) && eventFor.get(variant)!==i)issues.ambiguousGroup++;
  eventFor.set(variant,i);
  if(controlsInRow.length===1)originalFor.set(variant,controlsInRow[0]);
 }
}
const matched=[],missed=[],mismatches={};
const seqCount=new Map();
for(const row of assay){
 const id=row.variant,parts=id.split("_"),ref=parts.at(-2),alt=parts.at(-1);
 if(!/^[ACGT]$/.test(ref)||!/^[ACGT]$/.test(alt)){issues.nonSNV++;continue;}
 const originalId=originalFor.get(id),group=eventFor.get(id);
 if(!originalId){issues.idNotFoundInPairTable++;missed.push({id,reason:"no original control group"});continue;}
 const seqs=designMap.get(id),refSeqs=designMap.get(originalId);
 if(!seqs){issues.missingVariantSequence++;missed.push({id,reason:"variant missing in design"});continue;}
 if(!refSeqs){issues.missingReference++;missed.push({id,reason:"control original missing in design",originalId});continue;}
 if(seqs.size!==1){issues.ambiguousVariant++;missed.push({id,reason:"multiple variant sequences",count:seqs.size});continue;}
 if(refSeqs.size!==1){issues.ambiguousReference++;missed.push({id,reason:"multiple reference sequences",count:refSeqs.size});continue;}
 const a=[...seqs][0],b=[...refSeqs][0];
 if(a.length!==b.length){issues.lengthMismatch++;missed.push({id,reason:"different construct lengths",altLen:a.length,refLen:b.length});continue;}
 if(!/^[ACGT]+$/i.test(a)||!/^[ACGT]+$/i.test(b)){issues.nonDNA++;missed.push({id,reason:"non-ACGT letters"});continue;}
 const differences=[];for(let i=0;i<a.length;i++)if(a[i]!==b[i])differences.push(i);
 mismatches[differences.length]=(mismatches[differences.length]||0)+1;
 if(differences.length!==1){issues.notSingleBaseSubstitution++;
  if(missed.length<300)missed.push({id,reason:"not one aligned changed base",hamming: differences.length,
   firstDiffs:differences.slice(0,12)});continue;}
 const delta=Number(row.delta_PSI),pos=differences[0];
 if(!Number.isFinite(delta))throw Error("Published ΔPSI measurement invalid: "+id);
 matched.push({variant:id,originalId,group,sequenceLength:a.length,changeIndex:pos,
  changedFrom:b[pos],changedTo:a[pos],declaredRef:ref,declaredAlt:alt,
  exactAlleleMatch:(b[pos]===ref&&a[pos]===alt),deltaPSI:delta,
  seqRefHash:crypto.createHash("sha256").update(b).digest("hex"),
  seqAltHash:crypto.createHash("sha256").update(a).digest("hex")});
 issues.hasValidPair++;
 seqCount.set(a.length,(seqCount.get(a.length)||0)+1);
}
const exactAlleles=matched.filter(m=>m.exactAlleleMatch).length;
const deltaClasses={negative:matched.filter(m=>m.deltaPSI<=-5).length,
 nearZero:matched.filter(m=>m.deltaPSI>-5&&m.deltaPSI<5).length,
 positive:matched.filter(m=>m.deltaPSI>=5).length};
const events=new Set(matched.map(m=>m.group));
const result={source:"scottiadamson/Vex-seq",sourceCommit:"36d9c4a6e5e74def46b3cada69d3166f08c54bd5",
 auditOnly:true,noPredictions:true,assayRows:assay.length,designRows:design.length,designIDs:designMap.size,
 rawControlGroups:controls.length,issues,matchedPairs:matched.length,
 trueAlleleLetterAgreement:{n:exactAlleles,total:matched.length,fraction:matched.length?exactAlleles/matched.length:null},
 matchedDNASequenceLengths:Object.fromEntries(seqCount),hammingDistribution:mismatches,
 distinctOriginalControlGroups:events.size,effectCategoriesAt5PercentagePoints:deltaClasses,
 matchedSamples:matched.slice(0,9),examplesOfRejected:missed.slice(0,15),
 inputSHA256:Object.fromEntries(["preprocess_data/68_97_final_sequences_fixed.tsv",
 "processed_files/delta_PSI_values.tsv","processed_files/control_variant_pairs.csv"].map(f=>[f,crypto.createHash("sha256").update(fs.readFileSync(path.join(dir,f))).digest("hex")]))};
console.log("VEXSEQ_PAIR_JOIN_AUDIT "+JSON.stringify(result));
if(process.env.VEXSEQ_JOIN_AUDIT_FILE)fs.writeFileSync(process.env.VEXSEQ_JOIN_AUDIT_FILE,JSON.stringify(result,null,2)+"\n");
