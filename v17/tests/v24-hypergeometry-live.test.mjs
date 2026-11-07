import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import {RealTextAtlas} from "../research/relational-hypermaze/real-corpus-core.mjs";
import {openRealSource} from "../research/relational-hypermaze/real-data-source.mjs";
import {RealTrainer} from "../research/relational-hypermaze/real-trainer.mjs";

test("16D visible node positions derive from actual observed terms, V17 goal field, evidence and time",()=>{
 const atlas=new RealTextAtlas({maxRecords:20});
 atlas.observe("What causes auroras to appear?", "Charged particles collide with air molecules.",{sourceRow:1});
 atlas.observe("How do aurora lights form?", "Atmospheric gases emit light after particle excitation.",{sourceRow:2});
 atlas.observe("Why do electric charges create northern lights?", "Solar particles transfer energy to the atmosphere.",{sourceRow:3});
 const snapshot=JSON.stringify(atlas.snapshot());
 const p=atlas.predict("Why do auroras appear from charged particles?",{seed:17});
 assert.ok(p.found,"A genuine witnessed answer must be reachable");
 assert.equal(p.method,"Discoverer.shape");assert.equal(p.beforeAction,true);
 assert.equal(p.dimensions,16);assert.equal(p.axisLabels.length,16);
 assert.ok(p.axisLabels[15].includes("Discoverer.shape"));
 assert.ok(p.nodes.length>2);
 assert.ok(p.nodes.every(node=>Array.isArray(node.axes)&&node.axes.length===16));
 assert.ok(p.nodes.some(node=>node.axes.slice(0,12).some(v=>Math.abs(v)>0)));
 assert.ok(new Set(p.nodes.map(n=>n.axes.slice(0,12).join(","))).size>1);
 assert.equal(p.nodes[0].axes[12],-1);
 assert.ok(p.route.some(e=>e.verified), "route includes an observed Q/A action");
 assert.ok(p.route.some(e=>!e.verified), "hypothesized similarity explicitly separate");
 const last=p.nodes[p.route.at(-1).to];
 assert.equal(last.kind,"observed-answer");
 assert.equal(p.answer,atlas.records.get(last.recordId).answer);
 assert.equal(JSON.stringify(atlas.snapshot()),snapshot,"frozen graph navigation must not train");
});
test("legacy frozen path is reprojected for interactive 16D display without modifying legacy checkpoint",async t=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),"mp-v24-geometry-migrate-"));
 t.after(()=>fs.rm(root,{recursive:true,force:true}));
 const file=path.join(root,"qa.jsonl");
 const rows=Array.from({length:15},(_,i)=>({prompt:"What is the observed entity number "+i+"?",
  answer:"The witnessed entity answer is "+i+"."}));
 await fs.writeFile(file,rows.map(r=>JSON.stringify(r)).join("\n")+"\n");
 const src=await openRealSource({jsonl:file,held:3}),out=path.join(root,"save");
 const initial=await new RealTrainer({source:src,out,maxRecords:20,
  onlineEvery:1,saveEvery:2,limit:6}).initialize();
 initial.start();await initial.loop;
 const rawTrace={...initial.trace,nodes:initial.trace.nodes.map(n=>{
  const copy={...n};delete copy.axes;delete copy.axisTerms;delete copy.axisProvenance;return copy;
 })};
 const saved={version:1,sourceFingerprint:src.fingerprint,
  sourceTrainRows:src.trainRows,sourceHeldRows:src.heldRows,
  options:initial.options,progress:initial.progress,
  model:initial.model.snapshot(),trace:rawTrace,events:initial.events};
 const legacy=path.join(out,"atlas-v24.json");
 await fs.writeFile(legacy,JSON.stringify(saved));
 const legacyBytes=await fs.readFile(legacy);
 await fs.rm(path.join(out,"atlas-v24.index.json"));
 const restored=await new RealTrainer({source:src,out,maxRecords:20,resume:true}).initialize();
 assert.equal(restored.progress.cursor,6);
 assert.deepEqual(await fs.readFile(legacy),legacyBytes);
 assert.ok(restored.trace.nodes.length>0);
 assert.ok(restored.trace.nodes.every(n=>n.axes?.length===16));
 assert.equal(restored.trace.geometryReconstructedFromLegacy,true);
 assert.ok(restored.traceHistory.some(t=>t.row===restored.trace.row));
});
test("hyper-dimensional path UI is foreground, selectable, rotatable, sliced and offline old UI is hidden",async()=>{
 const html=await fs.readFile(new URL("../research/relational-hypermaze/real-live.html",import.meta.url),"utf8");
 for(const id of ["axisX","axisY","axisZ","axisW","rotationXY","rotationZW",
  "sliceW","sliceWidth","traceChoice","axisDetail","togglePlayback","actualAnswer",
  "foundBefore","exactBefore","segments"]){
  assert.match(html,new RegExp('id="'+id+'"'));
 }
 assert.match(html,/<main id="layout" class="compact">/);
 assert.match(html,/<div id="oldPane" class="closed">/);
 assert.match(html,/src="about:blank"/);
 assert.match(html,/insertBefore\(\$\("paths"\)\.closest\("section"\)/);
 assert.match(html,/PLAYBACK AL PREDICȚIEI/);
 assert.match(html,/witnessed:dialogue-response|legături Q\/A observate|tranziții martor/);
 const {Script}=await import("node:vm");
 const script=html.match(/<script>([\s\S]*?)<\/script>/);
 assert.ok(script);
 assert.doesNotThrow(()=>new Script(script[1]),"actual inline visualizer syntax must parse");
});
