// Authentic MFASS functional human variants. This is a SOURCE AUDIT, NOT a predictor.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
const SRC_SHA="a637ca0e307e66ff48811ec7efa22b9ce453bc7883b04f0cacb867f7283132d8";
const SPLIT_SHA="999ebcb7e63a5c5eaa8780fa468e59ac1f934260ad50102814174c396317f052";
const sha=b=>crypto.createHash("sha256").update(b).digest("hex");
const need=(v,msg)=>{if(!v)throw Error(msg)};
function tsv(buffer,label){
 const lines=buffer.toString("utf8").trimEnd().split(/\r?\n/);
 const names=lines.shift().split("\t");
 return lines.map((l,i)=>{
  const v=l.split("\t");
  need(v.length===names.length,"Malformed "+label+" line "+(i+2));
  return Object.fromEntries(names.map((n,j)=>[n,v[j]]));
 });
}
const [sourceRepo,benchRepo,...extra]=process.argv.slice(2);
need(sourceRepo&&benchRepo&&extra.length===0,
 "Usage: node audit-authentic-mfass.mjs SOURCE_REPO BENCHMARK_REPO");
const source=fs.readFileSync(path.join(sourceRepo,"processed_data/snv/snv_data_clean.txt"));
const split=fs.readFileSync(path.join(benchRepo,"benchmarks/mfass/splits/split-v2.tsv"));
need(sha(source)===SRC_SHA&&sha(split)===SPLIT_SHA,
 "Pinned original source or corrected canonical benchmark split changed");
const rows=tsv(source,"KosuriLab original source");
const groupRows=tsv(split,"Rewire exon+gene split");
need(rows.length===32669&&groupRows.length===27733,
 "Unexpected published MFASS raw/cohort count");
const manifest=new Map(groupRows.map(r=>[r.id,r]));
need(manifest.size===27733,"Canonical variant ID collision");
const complement={A:"T",T:"A",C:"G",G:"C"};
const rc=s=>[...s].reverse().map(x=>complement[x]).join("");
const counts={raw:rows.length,nonMutant:0,unscorableMutant:0,
 variants:0,sdv:0,forwardStrand:0,reverseStrand:0,
 legacyAssayOrientation:0,legacyReverseComplement:0};
const group={train:new Set(),test:new Set()};
const exons={train:new Set(),test:new Set()};
const by={train:{n:0,sdv:0},test:{n:0,sdv:0}};
const seen=new Set(),sampleTrain=[];
for(const r of rows){
 if(r.category!=="mutant"){counts.nonMutant++;continue;}
 if(r.strong_lof==="NA"){counts.unscorableMutant++;continue;}
 need(["TRUE","FALSE"].includes(r.strong_lof),"Unknown assay outcome "+r.id);
 need(!seen.has(r.id),"Repeated MFASS variant ID "+r.id);
 seen.add(r.id);
 const ref=r.natural_seq.toUpperCase(),alt=r.original_seq.toUpperCase(),legacy=r.sequence.toUpperCase();
 const p=Number(r.rel_position)-1;
 need(ref.length===170&&alt.length===170&&legacy.length===170&&
  /^[ACGT]{170}$/.test(ref)&&/^[ACGT]{170}$/.test(alt)&&
  Number.isInteger(p)&&p>=0&&p<170,
  "Wrong original REF/ALT assay construct length/bases/position "+r.id);
 let diffCount=0,diffAt=-1;
 for(let j=0;j<170;j++)if(ref[j]!==alt[j]){diffCount++;diffAt=j;}
 need(diffCount===1&&diffAt===p,"Original construct allele pair not single mutation "+r.id);
 let declaredRef=r.ref_allele.toUpperCase(),declaredAlt=r.alt_allele.toUpperCase();
 need(/^[ACGT]$/.test(declaredRef)&&/^[ACGT]$/.test(declaredAlt),
  "Original declared genome allele invalid "+r.id);
 if(r.strand==="-"){
  declaredRef=complement[declaredRef];declaredAlt=complement[declaredAlt];
  counts.reverseStrand++;
 }else if(r.strand==="+")counts.forwardStrand++;
 else throw Error("Original strand missing "+r.id);
 need(ref[p]===declaredRef&&alt[p]===declaredAlt,
  "Original verified sequence disagrees with source allele and strand "+r.id);
 if(legacy===alt)counts.legacyAssayOrientation++;
 else if(legacy===rc(alt))counts.legacyReverseComplement++;
 else throw Error("MFASS raw sequence not assay or reverse complement "+r.id);
 const a=manifest.get(r.id);need(a&&["train","test"].includes(a.split)&&a.group,
  "Missing canonical whole-gene/exon group for "+r.id);
 const y=Number(r.strong_lof==="TRUE");
 counts.variants++;counts.sdv+=y;
 by[a.split].n++;by[a.split].sdv+=y;
 group[a.split].add(a.group);exons[a.split].add(r.ensembl_id);
 if(a.split==="train"&&sampleTrain.length<4)
  sampleTrain.push({id:r.id,exon:r.ensembl_id,position:p,allele:ref[p]+">"+alt[p]});
}
need(counts.variants===27733&&counts.sdv===1050,
 "MFASS published exactly 27733 /1050 not reproduced");
need(counts.legacyAssayOrientation===19963&&counts.legacyReverseComplement===7770,
 "MFASS 7770 reverse complement orientation not reproduced");
need(by.train.n===19409&&by.train.sdv===735&&
 by.test.n===8324&&by.test.sdv===315&&
 group.test.size===463&&group.train.size+group.test.size===1590,
 "MFASS corrected gene-connected heldout split changed");
need([...group.train].every(g=>!group.test.has(g))&&
 [...exons.train].every(e=>!exons.test.has(e)),
 "Gene or exon leakage between source TRAIN and TEST");
const report={
 status:"VALIDATED_27733_AUTHENTIC_MFASS_170NT_REF_ALT_PAIRS_AND_CANONICAL_GENE_EXON_HOLDOUT_NO_MODEL_TRAINED",
 sources:{originalRepo:"KosuriLab/MFASS",rawCommit:"9a8e4f27106be52aeb11acad27f95f5cded663a8",
  correctedBenchmark:"rewire-bio/rewire-benchmarks",benchmarkCommit:"68d1ee53a0fcd1104d9f427d68dedffdccf2c47f",
  originalSHA256:sha(source),geneGroupSplitSHA256:sha(split)},
 counts,sourceVariants:{total:counts.variants,sdv:counts.sdv,prevalence:counts.sdv/counts.variants,
  independentConnectedGroups:1590,originalSequenceLength:170,
  train:{...by.train,groups:group.train.size,exons:exons.train.size},
  untouchedOfficialTest:{...by.test,groups:group.test.size,exons:exons.test.size}},
 firstTrainingOnlyExamples:sampleTrain,
 noNativePredictions:true,officialHoldoutUnscored:true,
 caveats:["In-vitro reporter assay rather than clinical prediction",
  "Gene/exon group split verified, remote homology not verified",
  "Raw source sequence reverse-complement corrected for 7770 original variants"]
};
console.log("MFASS_AUTHENTIC_SOURCE_AUDIT "+JSON.stringify(report));
if(process.env.MFASS_AUDIT_JSON)
 fs.writeFileSync(process.env.MFASS_AUDIT_JSON,JSON.stringify(report,null,2)+"\n");
