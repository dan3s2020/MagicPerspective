import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {spawnSync} from "node:child_process";
import {AligningGraph} from "../transcend/torus-aether/align.mjs";
import {Brain} from "../transcend/torus-aether/devour/brain.mjs";
import {POLICIES,applyPolicy} from "./graph0-phase2.mjs";

test("all six policies filter/reweight ONLY self/fself and restore original",()=>{
  const a=new AligningGraph(),original=()=>[
    {src:"mem",tot:2,dist:new Map([[65,2]])},
    {src:"form",tot:3,dist:new Map([[65,3]])},
    {src:"self",tot:1,dist:new Map([[65,1]])},
    {src:"fself",tot:1,dist:new Map([[65,1]])}
  ];
  a.proposals=original;
  for(const [name,weights] of Object.entries(POLICIES)){
    const undo=applyPolicy(a,name);
    const ps=a.proposals();
    const mem=ps.find(p=>p.src==="mem");
    assert.equal(mem.dist.get(65),2);
    const self=ps.find(p=>p.src==="self");
    const fself=ps.find(p=>p.src==="fself");
    assert.equal(self?.dist.get(65)??0,weights.self);
    assert.equal(fself?.dist.get(65)??0,weights.fself);
    undo();
    assert.equal(a.proposals,original);
  }
});

test("native frozen same-checkpoint phase2 runs all six arms with fixed length",()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),"graph0-phase2-test-"));
 try{
  const cp=path.join(dir,"synthetic-graph0.v8");
  const b=new Brain({rules:"winner",seed:12});
  const a=new AligningGraph({g:8});
  a.imagineEvery=0;
  const corpus=("Q: so\nA: Try another path.\n\n"+
    "Q: What is two plus two?\nA: Four.\n\n"+
    "Q: Describe your graph.\nA: It has nodes and edges.\n\n").repeat(12);
  for(const ch of corpus)a.live(ch.charCodeAt(0));
  a.mem.lazy=a.fmem.lazy=true;a.mem.ready(true);a.fmem.ready(true);
  b.align=a;b.save(cp);
  const original=fs.readFileSync(cp);
  let sourceHash=null;
  for(const arm of Object.keys(POLICIES)){
    const run=spawnSync(process.execPath,[
     path.resolve("v17/experiments/graph0-phase2.mjs"),
     "--checkpoint",cp,"--out",dir,"--policy",arm,"--max","80","--seed","20261107"
    ],{encoding:"utf8",maxBuffer:10*1024*1024,timeout:120000});
    assert.equal(run.status,0,arm+"\n"+run.stdout+"\n"+run.stderr);
    const result=JSON.parse(fs.readFileSync(path.join(dir,"phase2-"+arm+"-seed20261107.json"),"utf8"));
    assert.equal(result.rows.length,4);
    assert.ok(result.rows.every(r=>r.output.length===80));
    assert.ok(result.rows.every(r=>r.steps.length===80));
    assert.ok(result.rows.every(r=>r.traceMetrics.emptySuccessorSteps>=0));
    const sources=result.rows.flatMap(r=>r.steps.flatMap(s=>s.supportingPerspectives.map(p=>p.perspective)));
    if(POLICIES[arm].self===0)assert.ok(!sources.includes("self"));
    if(POLICIES[arm].fself===0)assert.ok(!sources.includes("fself"));
    sourceHash??=result.checkpointSha256;
    assert.equal(result.checkpointSha256,sourceHash);
  }
  assert.deepEqual(fs.readFileSync(cp),original);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
