// PRE-FROZEN OFFICIAL ONE-SHOT final loader, created ONLY after independent method selection.
// Same genuine reference allele validation and canonical connected gene/exon split.
// Official 8324 variants are exposed to a READ-ONLY original Brain after native training/calibration.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
const sha=s=>crypto.createHash("sha256").update(s).digest("hex");
const must=(okay,msg)=>{if(!okay)throw Error(msg)};
const expected={
 source:"a637ca0e307e66ff48811ec7efa22b9ce453bc7883b04f0cacb867f7283132d8",
 split:"999ebcb7e63a5c5eaa8780fa468e59ac1f934260ad50102814174c396317f052"
};
function readTSV(buffer){
 const s=buffer.toString("utf8").trimEnd().split(/\r?\n/),h=s.shift().split("\t");
 return s.map((line,i)=>{const values=line.split("\t");
  must(h.length===values.length,"MFASS TSV column mismatch "+i);
  return Object.fromEntries(h.map((name,k)=>[name,values[k]]));});
}
const complementary={A:"T",T:"A",C:"G",G:"C"};
function validatePair(r){
 const ref=r.natural_seq.toUpperCase(),alt=r.original_seq.toUpperCase();
 const p=Number(r.rel_position)-1;
 must(ref.length===170&&alt.length===170&&Number.isInteger(p)&&p>=0&&p<170,
  "MFASS original 170nt paired genotype invalid "+r.id);
 let diff=0;for(let i=0;i<170;i++)if(ref[i]!==alt[i])diff++;
 must(diff===1&&ref[p]!==alt[p],"Source MFASS single SNV not verified "+r.id);
 const plus=r.strand==="+",minus=r.strand==="-";
 must(plus||minus,"MFASS strand must be physical orientation "+r.id);
 const observedRef=minus?complementary[r.ref_allele]:r.ref_allele;
 const observedAlt=minus?complementary[r.alt_allele]:r.alt_allele;
 must(ref[p]===observedRef&&alt[p]===observedAlt,
  "Alleles are not physical original REF ALT "+r.id);
 const label=r.label;
 must(["exon","upstr_intron","downstr_intron"].includes(label),
  "Unrecognized original physical exon region "+r.id+" "+label);
 const intron=Number(r.intron1_len),exon=Number(r.exon_len),intr2=Number(r.intron2_len);
 must(Number.isFinite(intron)&&Number.isFinite(exon)&&Number.isFinite(intr2)&&
  intron>=0&&exon>0,"MFASS true exon/intron boundaries invalid "+r.id);
 return{
  id:r.id,exon:r.ensembl_id,region:label,strand:r.strand,
  ref,alt,p,upstreamIntron:intron,exonLength:exon,downstreamIntron:intr2,
  strongDisruption:r.strong_lof==="TRUE"?1:0
 };
}
export function loadMfassOneShotFinal(sourceRepo,benchRepo){
 const s=fs.readFileSync(path.join(sourceRepo,"processed_data/snv/snv_data_clean.txt"));
 const t=fs.readFileSync(path.join(benchRepo,"benchmarks/mfass/splits/split-v2.tsv"));
 must(sha(s)===expected.source&&sha(t)===expected.split,
  "REAL MFASS original source or frozen corrected gene split SHA mismatched");
 const rows=readTSV(s),splits=readTSV(t);
 must(rows.length===32669&&splits.length===27733,"MFASS original cohort changed");
 const map=new Map(splits.map(r=>[r.id,r]));
 must(map.size===27733,"Split IDs are not unique");
 const train=[],officialTest=[],testGroup=new Set(),trainGroup=new Set();
 let n=0,sdv=0,testN=0,testSDV=0;
 for(const r of rows){
  if(r.category!=="mutant"||r.strong_lof==="NA")continue;
  must(["TRUE","FALSE"].includes(r.strong_lof),"Unknown source outcome "+r.id);
  const sp=map.get(r.id);
  must(sp&&["train","test"].includes(sp.split),"MFASS canonical source ID missing");
  n++;sdv+=Number(r.strong_lof==="TRUE");
  if(sp.split==="test"){
   testN++;testSDV+=Number(r.strong_lof==="TRUE");
   testGroup.add(sp.group);
   const x=validatePair(r);x.group=sp.group;officialTest.push(x);
   continue;
  }
  const x=validatePair(r);x.group=sp.group;
  train.push(x);trainGroup.add(sp.group);
 }
 must(n===27733&&sdv===1050&&train.length===19409&&
  train.reduce((v,r)=>v+r.strongDisruption,0)===735&&testN===8324&&testSDV===315,
  "Published real assay and canonical split counts changed");
 must(officialTest.length===8324&&
  officialTest.reduce((v,r)=>v+r.strongDisruption,0)===315&&
  new Set(officialTest.map(r=>r.exon)).size>300,
  "Official MFASS variant labels or independently heldout authentic allele validation changed");
 must(trainGroup.size===1127&&testGroup.size===463&&
  [...trainGroup].every(g=>!testGroup.has(g)),
  "Original connected gene/exon group appears in both splits");
 const groups=[...trainGroup].sort((a,b)=>sha("MFASS-ORIGINAL-NATIVE-20261122:"+a)
  .localeCompare(sha("MFASS-ORIGINAL-NATIVE-20261122:"+b)));
 const devGroups=new Set(groups.slice(0,150)),calGroups=new Set(groups.slice(150,300)),
  trGroups=new Set(groups.slice(300));
 must(devGroups.size===150&&calGroups.size===150&&trGroups.size===827,
  "Internal true source gene group count changed");
 const split={train:[],calibration:[],dev:[]};
 for(const r of train){
  const target=devGroups.has(r.group)?"dev":calGroups.has(r.group)?"calibration":"train";
  split[target].push(r);
 }
 const sampleCounts=Object.fromEntries(Object.entries(split).map(([name,x])=>[name,{
  n:x.length,sdv:x.reduce((v,r)=>v+r.strongDisruption,0),
  groups:new Set(x.map(r=>r.group)).size,exons:new Set(x.map(r=>r.exon)).size
 }]));
 const allIDs=new Set();
 for(const [name,subset] of Object.entries(split))
  for(const r of subset){must(!allIDs.has(r.id),"MFASS internal same ID used twice "+r.id);
   allIDs.add(r.id);}
 must(allIDs.size===19409,"MFASS internal native model partition not complete");
 return{
  sourceSha:sha(s),splitSha:sha(t),canonical:{trainN:19409,trainSDV:735,
   officialTestProtectedN:8324,officialTestProtectedSDV:315,testGroupCount:463},
  sampleCounts,split,officialTest
 };
}
export function physicalFeature(r){
 const start=Math.max(0,Math.min(166,r.p-2)),ref4=r.ref.slice(start,start+4),
  alt4=r.alt.slice(start,start+4),off=r.p-start;
 must(ref4.length===4&&alt4.length===4&&off>=0&&off<4&&
  [...ref4].map((x,i)=>i===off?r.alt[r.p]:x).join("")===alt4,
  "MFASS authentic 4nt REF ALT world not losslessly reconstructible");
 const pos=r.p,acc=r.upstreamIntron,don=r.upstreamIntron+r.exonLength;
 const d=Math.min(Math.abs(pos-acc),Math.abs(pos-don));
 const bin=d<=2?"a":d<=5?"b":d<=10?"c":d<=20?"d":"e";
 const reg=r.region==="exon"?"E":r.region==="upstr_intron"?"U":"D";
 const s=reg+bin+String(off)+ref4+r.alt[r.p];
 must(s.length===8,"MFASS source genuine compressed physical perspective must be 8 ASCII");
 return{region:reg,bin,offset:off,ref4,altBase:r.alt[r.p],
  stimulus:Array.from(s,c=>c.charCodeAt(0)),
  basicKey:reg+":"+bin+":"+r.ref[r.p]+">"+r.alt[r.p]};
}
