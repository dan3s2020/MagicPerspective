// Pre-model forensic audit of exact real Vex-seq construct REF/ALT pairings.
// Three construct sequences per variant must NEVER be chosen arbitrarily.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
const base=process.argv[2];if(!base)throw Error("Missing source");
const file=name=>fs.readFileSync(path.join(base,name),"utf8");
const tab=src=>{const lines=src.trim().split(/\r?\n/),h=lines.shift().split("\t");
 return lines.map(l=>{const cols=l.split("\t");return Object.fromEntries(h.map((k,i)=>[k,cols[i]||""]))})};
const design=tab(file("preprocess_data/68_97_final_sequences_fixed.tsv"));
const assay=tab(file("processed_files/delta_PSI_values.tsv"));
const pairList=file("processed_files/control_variant_pairs.csv").trim().split(/\r?\n/).map(s=>s.split(","));
const rows=new Map(),controlFor=new Map(),groupFor=new Map();
for(const r of design){
 const key=[r.chromosome,r.position,r.reference,r.alternative].join("_");
 if(!rows.has(key))rows.set(key,[]);
 rows.get(key).push(r);
}
for(let group=0;group<pairList.length;group++){
 const ids=pairList[group],controls=ids.filter(s=>s.endsWith("_Control_Original"));
 if(controls.length!==1)throw Error("Unique control missing group "+group);
 for(const id of ids){controlFor.set(id,controls[0]);groupFor.set(id,group);}
}
const rawReport={assayRows:assay.length,byColumn:{},examples:[],source:"scottiadamson/Vex-seq",sourceCommit:"36d9c4a6e5e74def46b3cada69d3166f08c54bd5",noModelResults:true};
for(const column of ["Sequence","Final Sequence"]){
 const histogram={},numberNear={0:0,1:0,2:0,">2":0},valid=[];
 let missing=0,ambiguous=0,badAllele=0,nonSNV=0,normalization=0;
 for(const r of assay){
  const id=r.variant,segments=id.split("_"),declaredRef=segments.at(-2),declaredAlt=segments.at(-1);
  if(!/^[ACGT]$/.test(declaredRef)||!/^[ACGT]$/.test(declaredAlt)){nonSNV++;continue;}
  const controls=rows.get(controlFor.get(id))||[],altRows=rows.get(id)||[];
  if(!controls.length||!altRows.length){missing++;continue;}
  const candidates=[];
  for(const a of [...new Set(altRows.map(v=>v[column]))])for(const b of [...new Set(controls.map(v=>v[column]))]){
   const n=Math.max(a.length,b.length);
   let diff=[];for(let i=0;i<n;i++)if(a[i]!==b[i])diff.push(i);
   candidates.push({nDiff:diff.length,diffPositions:diff.slice(0,12),sequenceLength:a.length,
    originalLength:b.length,firstChange:diff[0],from:b[diff[0]],to:a[diff[0]],
    matchesDeclaredChange:diff.length===1&&b[diff[0]]===declaredRef&&a[diff[0]]===declaredAlt,
    ref:b,alt:a});
  }
  const min=Math.min(...candidates.map(c=>c.nDiff));
  histogram[min]=(histogram[min]||0)+1;
  numberNear[min<=2?String(min):">2"]++;
  const acceptable=candidates.filter(x=>x.matchesDeclaredChange);
  if(acceptable.length>1){const unique=new Set(acceptable.map(x=>x.ref+"|"+x.alt));if(unique.size>1){ambiguous++;continue;}}
  if(!acceptable.length){badAllele++;if(rawReport.examples.length<14)rawReport.examples.push({
   id,column,controlId:controlFor.get(id),altRows:altRows.length,controlRows:controls.length,
   numAltSequences:new Set(altRows.map(v=>v[column])).size,
   candidates:candidates.slice(0,9).map(v=>({nDiff:v.nDiff,firstChange:v.firstChange,
    from:v.from,to:v.to,changes:v.diffPositions,sequenceLength:v.sequenceLength})),
   declaredRef,declaredAlt
  });continue;}
  const v=acceptable[0],delta=Number(r.delta_PSI);
  if(!Number.isFinite(delta))throw Error("Nonfinite real assay "+id);
  valid.push({id,group:groupFor.get(id),position:v.firstChange,length:v.sequenceLength,
   delta,declaredRef,declaredAlt,ref:v.ref,alt:v.alt});
 }
 rawReport.byColumn[column]={validPairs:valid.length,validEvents:new Set(valid.map(v=>v.group)).size,
  missing,ambiguous,nonSNV,badAllele,smallestDifferenceHistogram:histogram,
  minimalMismatchCount:numberNear,
  effectClasses:{negative:valid.filter(v=>v.delta<=-5).length,
    neutral:valid.filter(v=>v.delta>-5&&v.delta<5).length,
    positive:valid.filter(v=>v.delta>=5).length},
  lengths:Object.fromEntries([...new Set(valid.map(v=>v.length))].map(n=>[n,valid.filter(v=>v.length===n).length])),
  exampleValid:valid.slice(0,3).map(v=>({id:v.id,group:v.group,pos:v.position,
   len:v.length,ref:v.declaredRef,alt:v.declaredAlt,delta:v.delta,
   referenceHash:crypto.createHash("sha256").update(v.ref).digest("hex"),
   alternativeHash:crypto.createHash("sha256").update(v.alt).digest("hex")}))};
}
console.log("VEXSEQ_CONSTRUCT_RESOLUTION "+JSON.stringify(rawReport));
if(process.env.VEXSEQ_RESOLUTION_FILE)fs.writeFileSync(process.env.VEXSEQ_RESOLUTION_FILE,JSON.stringify(rawReport,null,2)+"\n");
