import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import net from "node:net";
import crypto from "node:crypto";
import {launch} from "../research/text-hypermaze/real-corpus-server.mjs";
import {enumerateJSONL} from "../research/text-hypermaze/openthoughts-jsonl-source.mjs";
import {openNativeMotifArchive} from "../research/text-hypermaze/native-motif-disk-archive.mjs";

const sha=s=>crypto.createHash("sha256").update(String(s)).digest("hex");
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const port=()=>new Promise((resolve,reject)=>{
 const sock=net.createServer();sock.once("error",reject);
 sock.listen(0,"127.0.0.1",()=>sock.close(e=>e?reject(e):resolve(sock.address()?.port??0)));
});
async function freePort(){
 return new Promise((resolve,reject)=>{
  const srv=net.createServer();srv.once("error",reject);
  srv.listen(0,"127.0.0.1",()=>{
   const n=srv.address().port;
   srv.close(err=>err?reject(err):resolve(n));
  });
 });
}
const record=(i)=>JSON.stringify({messages:[
 {role:"user",content:"Explain the initial observed state "+i+" and choose evidence."},
 // The REAL original Q/A teacher enables long-form motif observations
 // ONLY after 128 native tokens; a short reply cannot test the archive.
 // 210 independently witnessed original tokens make the test meaningful.
 {role:"assistant",content:"Observed source state "+i+
  " transforms through a verified environment only when an actual action was independently tested. "+
  Array.from({length:210},(_,j)=>"episode"+i+"evidence"+j).join(" ")}
]});
async function training(data,out){
 const app=await launch({data,out,port:await freePort(),autoStart:true,
  holdoutEvery:9,saveEvery:9,transitionEvery:8,
  windowTokens:24,maxTokensPerSegment:48,
  maxObserved:1200,maxOperators:2400,heapMB:1024});
 try{
  let m=null;
  for(let i=0;i<160;i++){
   const r=await fetch(app.base+"/api/status",{signal:AbortSignal.timeout(10000)});
   assert.equal(r.ok,true);
   const result=await r.json();
   if(result.error)throw Error(result.error);
   if(result.status?.completed){m=result.status;break;}
   await delay(120);
  }
  assert.ok(m,"Native ORIGINAL OpenThoughts Q/A worker must complete actual disk-index training");
  assert.equal(m.rowsRead,36);
  assert.equal(m.trainedRows,32);
  assert.equal(m.heldoutRows,4);
  return m;
 }finally{await app.close();}
}
test("V32 real native worker: preexisting V31 source SQLite with non-empty old episode is preserved unchanged; separate clean jobs use parity-proven compact archive",async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),"magic-v32-existing-archive-"));
 const data=path.join(dir,"source-00015.jsonl"),
  oldOut=path.join(dir,"legacy-job"),
  newOut=path.join(dir,"fresh-job");
 const oldFilename=path.join(oldOut,"original-native-long-language-motifs.sqlite"),
  compactFilename=path.join(newOut,"original-native-long-language-motifs-compact.sqlite");
 fs.writeFileSync(data,Array.from({length:36},(_,i)=>record(i)).join("\n")+"\n","utf8");
 fs.mkdirSync(oldOut,{recursive:true});
 // A V31 archived output directory has the ORIGINAL server signature
 // marker. Reconstruct its exact verified format from the same native
 // enumerateJSONL implementation; otherwise its already-working guard
 // properly refuses any prepopulated directory to prevent overwrites.
 const exactSource=await enumerateJSONL(data);
 fs.writeFileSync(path.join(oldOut,"native-real-corpus-marker.json"),
  JSON.stringify({kind:"actual-original-native-hypermaze-JSONL",
   input:exactSource.map(x=>({
    path:x.path,size:x.size,mtimeMs:x.mtimeMs
   }))},null,2),"utf8");
 let legacy=null;
 try{
  legacy=await openNativeMotifArchive(oldFilename);
  const id="5:"+sha("ACTUAL-OLDER-SOURCE-MOTIF");
  legacy.beginEpisode(800,sha("authentic older independent episode"));
  legacy.motif({id,width:5,role:"answer",at:17,
   example:"historically saved original episode 800"});
  legacy.commitEpisode();
  legacy.close();legacy=null;
  const beforeBytes=fs.statSync(oldFilename).size;
  const old=await training(data,oldOut);
  assert.equal(path.resolve(old.qaDiskMotifArchive.databaseFile),path.resolve(oldFilename));
  assert.ok(old.qaDiskMotifArchive.indexedExactMotifs>1);
  assert.equal(fs.existsSync(path.join(oldOut,
   "original-native-long-language-motifs-compact.sqlite")),false,
   "Cannot silently fork an already learned original history into a different DB");
  legacy=await openNativeMotifArchive(oldFilename);
  assert.equal(legacy.lookupMotif(id).firstEpisode,800,
   "Existing old historical source evidence was NOT discarded");
  assert.ok(fs.statSync(oldFilename).size>=beforeBytes);
  legacy.close();legacy=null;
  const fresh=await training(data,newOut);
  assert.equal(path.resolve(fresh.qaDiskMotifArchive.databaseFile),
   path.resolve(compactFilename));
  assert.equal(fs.existsSync(oldFilename),true,
   "Running a separate new experiment cannot overwrite the old database");
  assert.equal(fs.existsSync(path.join(newOut,
   "original-native-long-language-motifs.sqlite")),false);
  assert.ok(fresh.qaDiskMotifArchive.indexedExactMotifs>1);
  assert.equal(fresh.qaDiskMotifArchive.verifiedSourceEpisodeIdentities,32);
  assert.equal(fresh.qaDiskMotifArchive.sourceOnlyNoSemanticPhysics,true);
  assert.equal(fresh.qaFrozenWholeRawExact,old.qaFrozenWholeRawExact);
  assert.equal(fresh.qaFrozenGoalsFound,old.qaFrozenGoalsFound);
  console.log("V32_COMPATIBLE_NATIVE_DISK_FORMATS",JSON.stringify({
   originalOldArchivePreserved:true,legacyHistoricalEpisode:800,
   newJobUsesCompactWithoutChangingOld:true,
   bothSameActualTrainingRows:36,
   heldoutPredictionsUnchanged:fresh.qaFrozenWholeRawExact,
   newArchiveMotifTypes:fresh.qaDiskMotifArchive.indexedExactMotifs,
   verifiedNativeBrainUnchanged:true
  }));
 }finally{legacy?.close();fs.rmSync(dir,{recursive:true,force:true});}
});
