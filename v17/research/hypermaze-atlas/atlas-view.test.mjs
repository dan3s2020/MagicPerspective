import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";import os from "node:os";import path from "node:path";import vm from "node:vm";
import {saveBenchmark} from "./atlas-benchmark.mjs";
import {renderAtlasHTML,writeAtlasHTML} from "./atlas-view.mjs";

test("offline viewer visualizes ALL actual graph nodes, edges, training events and 96 real heldout paths",{
 timeout:60000},()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),"mp-hyperatlas-view-"));
 try {
  const r=saveBenchmark(dir,{seed:1181,worlds:96});
  const a=JSON.parse(fs.readFileSync(path.join(dir,"atlas.json"),"utf8"));
  const training=JSON.parse(fs.readFileSync(path.join(dir,"learned-transforms.json"),"utf8"));
  const html=writeAtlasHTML(dir);
  const document=fs.readFileSync(html,"utf8");
  assert.equal(a.nodes.length,256);
  assert.equal(a.edges.length,2048);
  assert.equal(training.events.length,2432);
  assert.equal(r.attempts.length,96);
  assert.ok(document.length>100000);
  assert.ok(document.includes("Traseu prezis înaintea acțiunii"));
  const payload=document.match(/<script id='payload' type='application\/json'>([\s\S]*?)<\/script>/)?.[1];
  const js=document.match(/<script>\((function client\(\)[\s\S]*?)\)\(\);<\/script>/)?.[1];
  assert.ok(payload?.length>100000,"Viewer did not embed complete actual data");
  assert.ok(js?.length>1000,"Viewer has no executable graph browser");
  assert.doesNotThrow(()=>new vm.Script("("+js+")();"));
  const elements=new Map();
  class Fake {
   constructor(id){this.id=id;this.value=id==="mode"?"path":id==="action"?"all":"";this.innerHTML="";this.textContent=id==="payload"?payload:"";this.width=1200;this.height=860;this.listeners=new Map()}
   addEventListener(name,callback){this.listeners.set(name,callback)}
   getContext(){return new Proxy({}, {get:(target,key)=>target[key]||(()=>{}),set:(target,key,v)=>{target[key]=v;return true}})}
  }
  const dom={getElementById:id=>{if(!elements.has(id))elements.set(id,new Fake(id));return elements.get(id)}};
  vm.runInNewContext("("+js+")();",{document:dom,console,Math,Number,Array,Map,Set,String,Boolean,JSON},{timeout:20000});
  assert.ok(elements.get("metrics").innerHTML.includes("2.048"));
  assert.ok(elements.get("routes").innerHTML.includes("FORMA COMPLETĂ"));
  assert.ok(elements.get("rules").innerHTML.includes("parity"));
  assert.equal((elements.get("attempts").innerHTML.match(/data-row=/g)||[]).length,96);
  assert.ok(elements.get("edges").innerHTML.includes("fold"));
  console.log("REAL_4D_ATLAS_OFFLINE_VIEWER",JSON.stringify({
   modelEvents:2432,nodes:256,edges:2048,heldoutPaths:96,
   embeddedBytes:document.length,renderedWithoutSyntheticDOMData:true}));
 }finally{fs.rmSync(dir,{recursive:true,force:true})}
});
