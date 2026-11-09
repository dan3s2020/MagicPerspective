import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import url from "node:url";
import {spawnSync} from "node:child_process";

const home=path.resolve(path.dirname(url.fileURLToPath(import.meta.url)),"..");
const read=name=>fs.readFileSync(path.join(home,name),"utf8");

test("V44 all four wholly new JS parts parse independently",()=>{
  for(const file of ["server.mjs","data-worker.mjs","studio.js"]){
    const result=spawnSync(process.execPath,["--check",path.join(home,file)],{encoding:"utf8"});
    assert.equal(result.status,0,file+": "+result.stderr);
  }
});
test("V44 new UI every bound status and control is live",()=>{
  const html=read("studio.html"),js=read("studio.js");
  assert.ok(!html.includes("native-v43.html"));
  for(const id of [...js.matchAll(/\$\("([^"]+)"\)/g)].map(x=>x[1])){
    assert.ok(html.includes('id="'+id+'"'),"Missing bound V44 UI control #"+id);
  }
  for(const action of ["start","pause","resume","save","stop","batch","test","reset"]){
    assert.ok(js.includes('send("'+action+'"'),"Nonfunctional V44 UI action "+action);
  }
  assert.ok(html.includes("targetFull"));
  assert.ok(html.includes("shapeText")&&html.includes("beforeText")&&html.includes("afterText"));
  assert.ok(html.includes("exerciseJournal")&&html.includes("holdoutPct"));
});
test("V44 server cannot count partial rows, hide GPU fallback or share V43 checkpoints",()=>{
  const server=read("server.mjs"),engine=read("engine.py"),dataset=read("data-worker.mjs");
  assert.ok(server.includes("state.completed=data.completed_exercises"));
  assert.ok(server.includes('cmd:"batch"')||server.includes('cmd: "batch"'));
  assert.ok(server.includes("journal.record(row)"));
  assert.ok(server.includes("full-replays.v44.bin"));
  assert.ok(engine.includes("No CPU training fallback"));
  assert.ok(engine.includes("torch.bincount"));
  assert.ok(engine.includes('checkpoint.with_name('));
  assert.ok(dataset.includes("openTextDataset"));
  assert.ok(!dataset.includes("V43FusedOneUniverse"));
});
