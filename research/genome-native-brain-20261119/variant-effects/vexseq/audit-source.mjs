// Authentic Vex-seq source *schema audit*, not a predictor.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
const base=process.argv[2];if(!base)throw Error("Usage: audit-source.mjs PATH_TO_PINNED_VEXSEQ_REPOSITORY");
const files=[
 "processed_files/delta_PSI_values.tsv",
 "processed_files/Vex-seq_positions.tsv",
 "preprocess_data/68_97_final_sequences_fixed.tsv",
 "preprocess_data/variants.txt",
 "processed_files/control_variant_pairs.csv",
 "processed_files/read_counts_PSI_values.tsv"
];
const report={source:"scottiadamson/Vex-seq",commit:"36d9c4a6e5e74def46b3cada69d3166f08c54bd5",purpose:"SOURCE_SCHEMA_AUDIT_ONLY_NO_MODEL_RESULTS",files:{}};
for(const relative of files){
 const buf=fs.readFileSync(path.join(base,relative));
 const str=buf.toString("utf8"),lines=str.split(/\r?\n/).filter(x=>x.trim().length);
 const head=lines.slice(0,4);
 const csvSep=relative.endsWith(".csv")?",":"\t";
 const columns=head[0]?.split(csvSep)||[];
 const regexDNA=/^[ACGTN]{30,}$/i;
 const exampleRows=head.slice(1,4).map(line=>line.split(csvSep));
 report.files[relative]={
  sha256:crypto.createHash("sha256").update(buf).digest("hex"),
  bytes:buf.length,nonemptyRows:lines.length,first16BytesHex:buf.subarray(0,16).toString("hex"),
  firstLineLength:head[0]?.length||0,
  columnCount:columns.length,columns:columns.slice(0,40).map(v=>v.slice(0,140)),
  firstRows:exampleRows.map(r=>r.slice(0,16).map(v=>v.slice(0,150))),
  DNAColumnExamples:columns.map((name,i)=>({name,index:i,validDNAExamples:exampleRows.filter(r=>regexDNA.test(r[i]||"")).length,
    lengths:exampleRows.map(r=>(r[i]||"").length)})).filter(x=>x.validDNAExamples>0).slice(0,20)
 };
}
console.log("VEXSEQ_ASSAY_SCHEMA_AUDIT "+JSON.stringify(report));
