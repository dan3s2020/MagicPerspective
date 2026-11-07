import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import net from "node:net";
import {spawn} from "node:child_process";
import {fileURLToPath} from "node:url";
import {Brain} from "../transcend/torus-aether/devour/brain.mjs";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const wait=ms=>new Promise(done=>setTimeout(done,ms));
async function availablePort(){
 const s=net.createServer();await new Promise(ok=>s.listen(0,"127.0.0.1",ok));
 const p=s.address().port;await new Promise(ok=>s.close(ok));return p;
}
async function fetchJSON(url,options={}){
 const ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),3500);
 try{
  const r=await fetch(url,{...options,signal:ctrl.signal});
  if(!r.ok)throw Error("HTTP "+r.status);
  return await r.json();
 }finally{clearTimeout(timer);}
}
async function poll(fn,ms=80000){
 const start=Date.now(),errors=[];
 while(Date.now()-start<ms){
  try{const result=await fn();if(result)return result;}
  catch(err){errors.push(err.message);}
  await wait(180);
 }
 throw Error("Original backend failed native xD/text atlas acceptance: "+
   errors.slice(-5).join(" | "));
}
test("ORIGINAL V17 worker reads ACTUAL repository corpus, owns trained xD transfers AND native text atlas, exposes whole pages, saves and reloads both",{
 timeout:130000
},async()=>{
 const port=await availablePort(),dir=fs.mkdtempSync(path.join(os.tmpdir(),"v17-full-world-text-atlas-"));
 const corpus=path.join(root,"docs","TORUS_AETHER_ABC_20261104.md");
 const child=spawn(process.execPath,[
   "transcend/torus-aether/devour/devour.mjs",
   "--workers","1","--arms","winner","--mem","1.2",
   "--text",corpus,"--out",dir,"--port",String(port),
   "--worlds","text","--every","1000000","--checkpoint-every","1000",
   "--xd-atlas-every","400","--chars","7000","--gpu","off","--start"
 ],{cwd:root,stdio:["ignore","pipe","pipe"],detached:true});
 let logs="";for(const p of [child.stdout,child.stderr])
   p.on("data",b=>logs=(logs+b.toString()).slice(-20000));
 const base="http://127.0.0.1:"+port;
 try{
   const first=await poll(async()=>await fetchJSON(base+"/graphs"),25000);
   assert.equal(first.graphs.length,1);
   const trained=await poll(async()=>{
     const r=await fetchJSON(base+"/graph?w=0");
     return r.xdAtlas?.trainedWorlds>=1&&r.nativePathAtlas?.episodes>=1?r:null;
   });
   assert.ok(trained.xdAtlas.solved>=1);
   assert.equal(trained.xdAtlas.last.atlas.fullWorld.completeFiniteMap,true,
     "The user explicitly requires the FULL physical finite world in the live UI");
   assert.ok(trained.xdAtlas.last.atlas.allKnownPhysicalEdges.length>0);
   assert.ok(trained.nativePathAtlas.last);
   assert.equal(trained.nativePathAtlas.last.beforeTraining,true);
   assert.equal(trained.nativePathAtlas.last.referenceNotUsedForFreePrediction,true);
   const page=await fetchJSON(base+"/atlas-graph?w=0&scale=0&offset=0&limit=8");
   assert.equal(page.nativeAtlasPage,true);
   assert.ok(page.totalStates>=page.entries.length);
   assert.ok(page.entries.length>=1);
   assert.equal(page.noTruncationOfOriginalGraph,true);
   const journal=await poll(async()=>{
     const r=await fetchJSON(base+"/atlas-log?w=0&offset=0&limit=3");
     return r.entries?.length?r:null;
   });
   assert.ok(journal.entries[0].frames);
   assert.equal(journal.entries[0].referenceNotUsedForFreePrediction,true);
   const nativeFrozen=await fetchJSON(base+"/native-atlas-eval?w=0&count=3",
     {method:"POST"});
   assert.equal(nativeFrozen.nativeAtlasEval,true,JSON.stringify(nativeFrozen));
   assert.equal(nativeFrozen.rows,3);
   assert.equal(nativeFrozen.noTraining,true);
   assert.equal(nativeFrozen.nativeGraphUnchanged,true);
   assert.equal(nativeFrozen.trainingAtlasEpisodesBefore,
     nativeFrozen.trainingAtlasEpisodesAfter,
     "Heldout must not increment real training episodes");
   assert.ok(nativeFrozen.characters>0);
   assert.ok(nativeFrozen.missingEdges+nativeFrozen.wrongRanking<=
     nativeFrozen.characters);
   const frozen=await fetchJSON(base+"/xd-atlas-eval?w=0&dimensions=2048&seed=81919",
    {method:"POST"});
   assert.equal(frozen.xdAtlasTest,true,JSON.stringify(frozen));
   assert.equal(frozen.noTestTargetProbes,true);
   assert.equal(frozen.result.execution.solved,true);
   assert.equal(frozen.result.plan.fullWorld.ambientDimensions,2048);
   assert.equal(frozen.result.plan.fullWorld.vertices.length,128);
   const save=await fetchJSON(base+"/control?do=save&w=0",{method:"POST"});
   assert.equal(save.ok,true);
   const saved=await poll(async()=>{
     const d=path.join(dir,"brains");
     if(!fs.existsSync(d))return null;
     const f=fs.readdirSync(d).find(x=>x.endsWith(".v8")||x.endsWith(".brain"));
     if(!f)return null;
     try{
      const b=Brain.load(path.join(d,f));
      return b.xdAtlas?.observations>0?{file:f,brain:b}:null;
     }catch{return null;}
   },40000);
   assert.ok(saved.brain.xdAtlas.effects.size>=1);
   assert.ok(saved.brain.constructedPaths.textRows>=1);
   console.log("REAL_NATIVE_WHOLE_ATLAS_ACCEPTANCE",JSON.stringify({
     corpus:path.basename(corpus),actualRows:trained.nativePathAtlas.episodes,
     actualXDWorlds:trained.xdAtlas.trainedWorlds,
     realFullFiniteTopology:trained.xdAtlas.last.atlas.allKnownPhysicalEdges.length,
     nativeTextStates:page.totalStates,journalEpisodes:journal.entries.length,
     zeroProbeUnseenSolved:frozen.result.execution.solved,
     checkpoint:saved.file,checkpointXDObservations:saved.brain.xdAtlas.observations
   }));
 }catch(err){throw Error(err.message+"\nORIGINAL BACKEND LOGS:\n"+logs);}
 finally{
  try{process.kill(-child.pid,"SIGTERM");}catch{child.kill("SIGTERM");}
  await Promise.race([new Promise(ok=>child.once("exit",ok)),wait(2200)]);
  fs.rmSync(dir,{recursive:true,force:true,maxRetries:3,retryDelay:150});
 }
});
