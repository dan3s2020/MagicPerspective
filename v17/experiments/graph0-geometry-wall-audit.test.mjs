import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {spawnSync} from "node:child_process";
import {Brain} from "../transcend/torus-aether/devour/brain.mjs";
import {AligningGraph} from "../transcend/torus-aether/align.mjs";

test("frozen 5D coordinate intervention changes observer coordinates, not native generated path",()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),"graph0-wall-"));
 try{
  const cp=path.join(dir,"graph0-checkpoint-copy.v8");
  const brain=new Brain({rules:"winner",seed:21});
  const a=new AligningGraph({g:8});
  a.imagineEvery=0;
  const text=("Q: What is two plus two?\nA: Four.\n\n"+
    "Q: Can you find another route?\nA: The path has many possible edges.\n\n").repeat(12);
  for(const c of text)a.live(c.charCodeAt(0));
  a.mem.lazy=a.fmem.lazy=true;a.mem.ready(true);a.fmem.ready(true);
  brain.align=a;
  for(let i=1;i<text.length;i++)brain.trace.geo.learn(text.charCodeAt(i-1),text.charCodeAt(i));
  brain.save(cp);
  const original=fs.readFileSync(cp);
  const child=spawnSync(process.execPath,[
   fileURLToPath(new URL("./graph0-geometry-wall-audit.mjs",import.meta.url)),
   "--checkpoint",cp,"--out",dir,"--max","80","--seed","20261107"
  ],{cwd:os.homedir(),encoding:"utf8",timeout:120000,maxBuffer:4*1024*1024});
  assert.equal(child.status,0,child.stdout+"\n"+child.stderr);
  const r=JSON.parse(fs.readFileSync(path.join(dir,"graph0-geometry-policy-wall-audit.json"),"utf8"));
  assert.equal(r.rows.length,4);
  assert.equal(r.invariantTextAllPrompts,true);
  assert.equal(r.invariantSelectedBytesAllPrompts,true);
  assert.equal(r.geometryChangeVisible,true);
  assert.ok(r.structural.geometryKnownSymbols>0);
  assert.deepEqual(fs.readFileSync(cp),original);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
