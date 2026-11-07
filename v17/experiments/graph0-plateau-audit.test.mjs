import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import {spawnSync} from "node:child_process";
import {fileURLToPath} from "node:url";
import {buildGraph0History,summarizeLearningCurve} from "./graph0-plateau-core.mjs";

test("separate learner plateaus from improving metrics and insufficient points",()=>{
 const rows=Array.from({length:14},(_,i)=>({
  w:0,chars:100000+i*100000,exercises:i*10,
  test:{aligned:0.62+0.0001*i,live:0.40+0.025*i,field:0.37+0.001*i,together:0.39+0.01*i,C:0.41,masked:0.43}
 }));
 const history=buildGraph0History(rows,0);
 const report=summarizeLearningCurve(history);
 assert.equal(report.enoughDataForPlateauDecision,true);
 assert.equal(report.metrics.aligned.plateauCandidate,true);
 assert.equal(report.metrics.live.plateauCandidate,false);
 assert.equal(report.metrics.C.plateauCandidate,true);
 assert.equal(summarizeLearningCurve(history.slice(0,3)).enoughDataForPlateauDecision,false);
});
test("latest graph0 reset segment, deduplication and malformed logs are handled",()=>{
 const rows=[
 {w:0,chars:1000,test:{aligned:0.5}},
 {w:1,chars:2000,test:{aligned:0.8}},
 {w:0,chars:1000,test:{aligned:0.6}},
 {w:0,chars:500,test:{aligned:0.4}},
 {w:0,chars:700,test:{aligned:0.45}}
 ];
 const H=buildGraph0History(rows,0);
 assert.equal(H.length,2);
 assert.equal(H[0].chars,500);
 assert.equal(H[1].chars,700);
});
test("actual native JSONL plateau runner works from outside repo without altering log",()=>{
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),"graph0-plateau-"));
 try{
  const logfile=path.join(temp,"log.jsonl"),rows=Array.from({length:9},(_,i)=>({
   w:0,chars:100000+i*80000,exercises:i+1,test:{aligned:0.61,live:0.35+i*0.03,field:0.3,together:0.4,C:0.4}
  }));
  const content=rows.map(r=>JSON.stringify(r)).join("\n")+"\n";
  fs.writeFileSync(logfile,content);
  const proc=spawnSync(process.execPath,[
   fileURLToPath(new URL("./graph0-plateau-audit.mjs",import.meta.url)),
   "--log",logfile,"--out",temp
  ],{cwd:os.homedir(),encoding:"utf8",timeout:30000});
  assert.equal(proc.status,0,proc.stderr+"\n"+proc.stdout);
  const report=JSON.parse(fs.readFileSync(path.join(temp,"graph0-training-plateau-audit.json"),"utf8"));
  assert.equal(report.summary.count,9);
  assert.equal(report.summary.metrics.aligned.plateauCandidate,true);
  assert.equal(report.summary.metrics.live.plateauCandidate,false);
  assert.equal(fs.readFileSync(logfile,"utf8"),content);
 } finally{fs.rmSync(temp,{recursive:true,force:true});}
});
