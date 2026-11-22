// Source-traceable cell-condition difference audit; looks ONLY at native TRAIN partition.
import fs from "node:fs";
import path from "node:path";
import {loadVexseq} from "./vexseq-source.mjs";
const root=process.argv[2];if(!root)throw Error("Usage: audit-cell-conditioned-train.mjs PINNED_VEXSEQ_DIR");
const source=loadVexseq(root);
const full=fs.readFileSync(path.join(root,"processed_files/delta_PSI_values.tsv"),"utf8").trim().split(/\r?\n/);
const header=full.shift().split("\t");
const table=new Map();
for(const line of full){const v=line.split("\t");
 table.set(v[0],Object.fromEntries(header.map((name,i)=>[name,v[i]])));}
const cls=v=>v>=5?"+":v<=-5?"-":"0";
const labels={K:{"+":0,"-":0,"0":0},H:{"+":0,"-":0,"0":0},aggregate:{"+":0,"-":0,"0":0}};
let oppositeStrong=0,nearlyNeutralButCellStrong=0,differentClass=0,
 cellStrongOnlyOne=0,allFinite=true;
const examples=[];
for(const r of source.splits.train){
 const x=table.get(r.id);if(!x)throw Error("Missing official assay "+r.id);
 const K=Number(x.delta_psi_K),H=Number(x.delta_psi_H),avg=Number(x.delta_PSI);
 if(![K,H,avg].every(Number.isFinite))throw Error("Nonfinite original lab outcome "+r.id);
 const k=cls(K),h=cls(H),a=cls(avg);
 labels.K[k]++;labels.H[h]++;labels.aggregate[a]++;
 const opposite=(k==="+"&&h==="-")||(k==="-"&&h==="+");
 const silent=a==="0"&&(k!=="0"||h!=="0");
 const oneStrong=(k==="0")!==(h==="0");
 oppositeStrong+=Number(opposite);
 nearlyNeutralButCellStrong+=Number(silent);
 differentClass+=Number(k!==h);
 cellStrongOnlyOne+=Number(oneStrong);
 if((opposite||silent)&&examples.length<10){
  examples.push({id:r.id,event:r.event,deltaK:K,deltaH:H,deltaAggregate:avg,classes:{K:k,H:h,aggregate:a}});
 }
}
const out={status:"VERIFIED_REAL_VEXSEQ_TRAIN_ONLY_CELL_CONDITIONED_SPLICE_VARIANT_EFFECT_AUDIT",
 source:source.source,sourceCommit:source.pinnedSourceCommit,
 trainingSnvs:source.splits.train.length,events:new Set(source.splits.train.map(r=>r.event)).size,
 devLabelsNotReported:true,finalLabelsNotReported:true,threshold:"±5 original ΔPSI percentage points",
 labels,oppositeStrong,nearlyNeutralButCellStrong,differentClass,cellStrongOnlyOne,
 interpretation:"Laboratory cell-conditional label divergence audit; no original Brain trained; not AlphaGenome 2 comparison",
 representativeTrainingExamples:examples};
console.log("VEXSEQ_CELL_CONDITION_AUDIT "+JSON.stringify(out));
if(process.env.VEXSEQ_CELL_AUDIT_JSON)fs.writeFileSync(process.env.VEXSEQ_CELL_AUDIT_JSON,JSON.stringify(out,null,2)+"\n");
