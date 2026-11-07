import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {spawnSync} from "node:child_process";
import {Brain} from "../transcend/torus-aether/devour/brain.mjs";
import {AligningGraph} from "../transcend/torus-aether/align.mjs";
import {ARMS} from "./graph0-ablation-core.mjs";

test("three real Brain.load checkpoint ablation runs on one immutable synthetic checkpoint", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(),"v17-graph0-ablation-"));
  try {
    const checkpoint=path.join(root,"synthetic-graph0.v8");
    const brain=new Brain({rules:"winner",seed:23});
    const align = new AligningGraph({g:8});
    align.imagineEvery=0;
    const corpus=[
      "Q: How do we reach the maze exit?\nA: Follow a valid passage to the goal.\n\n",
      "Q: What happens if S_v is empty?\nA: The equation requires a boundary condition.\n\n",
      "Q: What is two plus two?\nA: Four.\n\n"
    ].join("").repeat(10);
    for (const ch of corpus) align.live(ch.charCodeAt(0));
    align.mem.lazy = align.fmem.lazy = true;
    align.mem.ready(true); align.fmem.ready(true);
    brain.align=align;
    brain.save(checkpoint);
    const source=fs.readFileSync(checkpoint);
    const tests=[];
    for (const arm of ARMS) {
      const child=spawnSync(process.execPath,[
        path.resolve("v17/experiments/graph0-self-path-ablation.mjs"),
        "--checkpoint",checkpoint,"--arm",arm,"--out",root,"--max","80","--seed","20261107"
      ],{encoding:"utf8",maxBuffer:6*1024*1024,timeout:120000});
      assert.equal(child.status,0,arm + "\n"+child.stdout+"\n"+child.stderr);
      const report=JSON.parse(fs.readFileSync(path.join(root,"graph0-"+arm+".json"),"utf8"));
      assert.equal(report.runs.length,8);
      assert.deepEqual(report.learnedBefore,report.learnedAfter);
      assert.ok(report.runs.every(r=>r.observedPathTrace.steps.length===r.output.length));
      for (const r of report.runs) {
        const all=r.observedPathTrace.steps.flatMap(s=>s.supportingPerspectives.map(p=>p.perspective));
        if (arm==="no-self") assert.ok(!all.includes("self"),"self must be removed in no-self");
        if (arm==="no-self-fself") {
          assert.ok(!all.includes("self") && !all.includes("fself"),"both self sources must be removed");
        }
      }
      tests.push({arm,meanLoopRate:report.runs.filter(r=>r.T===0.6)
        .reduce((sum,r)=>sum+r.outputRepeatedEightGramFraction,0)/4});
    }
    assert.deepEqual(fs.readFileSync(checkpoint),source,"the source copy must never be rewritten");
    console.log("END_TO_END_FROZEN_NATIVE_GRAPH0",JSON.stringify(tests));
  } finally {fs.rmSync(root,{recursive:true,force:true});}
});
