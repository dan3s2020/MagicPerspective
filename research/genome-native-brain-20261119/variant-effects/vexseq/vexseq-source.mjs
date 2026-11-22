// Exact published Vex-seq experimental data, original paired REF vs ALT construct.
// No synthetic labels; no derived input may use measured ΔPSI at prediction time.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const sha=s=>crypto.createHash("sha256").update(s).digest("hex");
function tsv(file) {
 const lines=fs.readFileSync(file,"utf8").split(/\r?\n/).filter(Boolean);
 const head=lines.shift().split("\t");
 return lines.map((line,index)=>{
  const parts=line.split("\t");
  if(parts.length!==head.length)throw Error("Malformed source TSV "+file+" line "+(index+2));
  return Object.fromEntries(head.map((key,i)=>[key,parts[i]]));
 });
}
const complement={A:"T",T:"A",C:"G",G:"C"};
const need=(value,msg)=>{if(!value)throw Error(msg)};

export function loadVexseq(root) {
 const design=tsv(path.join(root,"preprocess_data/68_97_final_sequences_fixed.tsv"));
 const assays=tsv(path.join(root,"processed_files/delta_PSI_values.tsv"));
 const positions=tsv(path.join(root,"processed_files/Vex-seq_positions.tsv"));
 const rawPairs=fs.readFileSync(path.join(root,"processed_files/control_variant_pairs.csv"),"utf8").trim().split(/\r?\n/).map(l=>l.split(","));
 need(design.length===7490,"Unexpected source design size");
 need(assays.length===2055,"Unexpected source assay measurement count");
 const targets=new Map(positions.map(r=>[r.variant,r]));
 const groups=new Map(),controlMap=new Map(),repeats={};
 for(const row of design){
  const key=[row.chromosome,row.position,row.reference,row.alternative].join("_");
  if(!groups.has(key))groups.set(key,[]);
  groups.get(key).push(row);
 }
 for(let i=0;i<rawPairs.length;i++){
  const item=rawPairs[i],ctrl=item.filter(id=>id.endsWith("_Control_Original"));
  need(ctrl.length===1,"Source control must be unique for event index "+i);
  for(const v of item){
   if(controlMap.has(v)&&controlMap.get(v).group!==i)throw Error("Cross-event variant ID collision "+v);
   controlMap.set(v,{controlId:ctrl[0],group:i});
  }
 }
 const rejected={notSNV:0,controlUnavailable:0,multipleSequence:0,lengthMismatch:0,
   notOneBase:0,unknownAllele:0,nonCanonicalDNA:0,missingDistance:0,invalidEffect:0,
   missingControlGroup:0,sourceStrandMismatch:0};
 const observed=[],groupCount=new Map();
 for(const assay of assays){
  const id=assay.variant,parts=id.split("_"),refBase=parts.at(-2),altBase=parts.at(-1);
  if(!/^[ACGT]$/.test(refBase)||!/^[ACGT]$/.test(altBase)){rejected.notSNV++;continue;}
  const c=controlMap.get(id);if(!c){rejected.missingControlGroup++;continue;}
  const controlRows=groups.get(c.controlId),variantRows=groups.get(id);
  if(!controlRows?.length||!variantRows?.length){rejected.controlUnavailable++;continue;}
  const original=[...new Set(controlRows.map(r=>r.Sequence))],
    alternate=[...new Set(variantRows.map(r=>r.Sequence))];
  if(original.length!==1||alternate.length!==1){rejected.multipleSequence++;continue;}
  const ref=original[0],alt=alternate[0];
  if(ref.length!==alt.length){rejected.lengthMismatch++;continue;}
  if(!/^[ACGT]+$/.test(ref)||!/^[ACGT]+$/.test(alt)){rejected.nonCanonicalDNA++;continue;}
  const changes=[];for(let p=0;p<ref.length;p++)if(ref[p]!==alt[p])changes.push(p);
  if(changes.length!==1){rejected.notOneBase++;continue;}
  const p=changes[0],observedRef=ref[p],observedAlt=alt[p];
  const direct=observedRef===refBase&&observedAlt===altBase;
  const reverse=observedRef===complement[refBase]&&observedAlt===complement[altBase];
  if(!direct&&!reverse){rejected.unknownAllele++;continue;}
  const strand=[...new Set(variantRows.map(r=>r.strand))];
  if(strand.length!==1||(strand[0]!=="+"&&strand[0]!=="-")||
    (direct&&strand[0]!=="+"&&!reverse)||(reverse&&strand[0]!=="-"&&!direct))
   rejected.sourceStrandMismatch++;
  const delta=Number(assay.delta_PSI);
  if(!Number.isFinite(delta)){rejected.invalidEffect++;continue;}
  const dist=targets.get(id),d3=Number(dist?.["3SS"]),d5=Number(dist?.["5SS"]);
  if(!dist||!Number.isFinite(d3)||!Number.isFinite(d5)){rejected.missingDistance++;continue;}
  const effectClass=delta>=5?"+":delta<=-5?"-":"0";
  observed.push({id,event:c.group,controlId:c.controlId,ref,alt,
   changeIndex:p,strand:strand[0],orientation:direct?"forward":"reverse-complement",
   declaredRef:refBase,declaredAlt:altBase,observedRef,observedAlt,
   distance3SS:d3,distance5SS:d5,deltaPSI:delta,effectClass});
  groupCount.set(c.group,(groupCount.get(c.group)||0)+1);
 }
 if(observed.length<1000)throw Error("Too few verified authentic REF/ALT pairs: "+observed.length);
 const groupOrder=[...groupCount.keys()].sort((a,b)=>sha("vexseq-GROUP-BLIND-20261122:"+a).localeCompare(sha("vexseq-GROUP-BLIND-20261122:"+b)));
 const n=groupOrder.length,trainCount=Math.floor(n*0.7),devCount=Math.floor(n*0.15);
 need(trainCount>10&&devCount>5,"Too few published original-control events for partitioning");
 const trainGroups=new Set(groupOrder.slice(0,trainCount)),
  devGroups=new Set(groupOrder.slice(trainCount,trainCount+devCount));
 const splits={train:[],dev:[],final:[]};
 for(const r of observed){
  const key=trainGroups.has(r.event)?"train":devGroups.has(r.event)?"dev":"final";
  splits[key].push(r);
 }
 const seqMap=new Map();for(const r of observed){
  const pairKey=r.ref+"|"+r.alt;
  if(seqMap.has(pairKey)&&seqMap.get(pairKey)!==r.event)
   throw Error("Identical real mutation duplicated across distinct original-control event groups");
  seqMap.set(pairKey,r.event);
 }
 return {source:"scottiadamson/Vex-seq",pinnedSourceCommit:"36d9c4a6e5e74def46b3cada69d3166f08c54bd5",
  sourceInputSHA256:Object.fromEntries([
   "preprocess_data/68_97_final_sequences_fixed.tsv",
   "processed_files/delta_PSI_values.tsv",
   "processed_files/control_variant_pairs.csv",
   "processed_files/Vex-seq_positions.tsv"].map(name=>[name,sha(fs.readFileSync(path.join(root,name)))])),
  sourceCounts:{designRows:design.length,assayRows:assays.length,sourceControlGroups:rawPairs.length},
  rejected,validatedTotal:observed.length,uniqueEvents:groupOrder.length,
  splitGroupCounts:{train:trainGroups.size,dev:devGroups.size,final:n-trainGroups.size-devGroups.size},
  splits};
}
export const summarize=rows=>({n:rows.length,groups:new Set(rows.map(r=>r.event)).size,
 labels:{"+":rows.filter(r=>r.effectClass==="+").length,
  "-":rows.filter(r=>r.effectClass==="-").length,
  "0":rows.filter(r=>r.effectClass==="0").length},
 strands:{forward:rows.filter(r=>r.orientation==="forward").length,
  reverse:rows.filter(r=>r.orientation==="reverse-complement").length},
 mutationPositions:{min:Math.min(...rows.map(r=>r.changeIndex)),max:Math.max(...rows.map(r=>r.changeIndex))},
 measuredEffect:{min:Math.min(...rows.map(r=>r.deltaPSI)),max:Math.max(...rows.map(r=>r.deltaPSI))}});
