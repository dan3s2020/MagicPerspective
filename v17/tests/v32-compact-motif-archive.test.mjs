import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {createHash} from "node:crypto";
import {openNativeMotifArchive} from "../research/text-hypermaze/native-motif-disk-archive.mjs";
import {openCompactNativeMotifArchive} from "../research/text-hypermaze/native-motif-compact-archive.mjs";

const sha=x=>createHash("sha256").update(String(x)).digest("hex");
const size=file=>[file,file+"-wal",file+"-shm"].reduce((n,f)=>
 n+(fs.existsSync(f)?fs.statSync(f).size:0),0);
const originalObservations=[];
for(let ep=1;ep<=35;ep++){
 const rows=[];
 for(let p=0;p<220;p++){
  const content="cross-world-section-"+((p*17+ep*13)%1800);
  const width=(p%3===0)?12:5;
  rows.push({episode:ep,width,at:p,role:p%4===0?"question":"answer",
   id:width+":"+sha(content+"|"+width),
   example:content+" every observed byte witnessed"});
 }
 originalObservations.push(rows);
}
async function ingest(archive){
 for(const rows of originalObservations){
  const ep=rows[0].episode,sourceSHA=sha("actual observed original episode "+ep);
  archive.beginEpisode(ep,sourceSHA);
  try{
   let prev=null;
   for(let i=0;i<rows.length;i++){
    const row=rows[i];
    archive.motif(row);
    if(prev)archive.edge({from:prev,to:row.id,
     role:"observed-qa-source-order",ordinal:i});
    prev=row.id;
   }
   archive.commitEpisode();
  }catch(e){archive.rollbackEpisode();throw e;}
 }
}
test("RED V32: compact indexed original-witness archive preserves every old episode/role/position/edge, exact idempotent restart, at <80% disk bytes",async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),"v32-compact-evidence-"));
 let legacy=null,compact=null;
 try{
  const legacyFile=path.join(dir,"existing-uncompressed.sqlite"),
   compactFile=path.join(dir,"original-compact-probe.sqlite");
  legacy=await openNativeMotifArchive(legacyFile);
  compact=await openCompactNativeMotifArchive(compactFile);
  await ingest(legacy);await ingest(compact);
  const oldStats=legacy.status(),newStats=compact.status();
  for(const key of ["indexedExactMotifs","sharedExactMotifsAcrossEpisodes",
   "observedSourceOnlyEdgeTypes","verifiedSourceEpisodeIdentities"]){
   assert.equal(newStats[key],oldStats[key],key+" witness counts must match");
  }
  for(const q of [originalObservations[0][0],
   originalObservations[5][65],originalObservations[32][180]]){
   assert.deepEqual(compact.lookupMotif(q.id),legacy.lookupMotif(q.id),
    "Exact source witness must survive binary key transformation without identity loss");
   assert.deepEqual(compact.related(q.id),legacy.related(q.id),
    "Original source-neighbor link and provenance must be unchanged");
  }
  assert.equal(compact.inspect({limit:100}).total,legacy.inspect({limit:100}).total);
  assert.equal(compact.inspect({limit:40,offset:20}).rows.length,40);
  legacy.db.exec("PRAGMA wal_checkpoint(TRUNCATE)");
  compact.db.exec("PRAGMA wal_checkpoint(TRUNCATE)");
  const legacyBytes=size(legacyFile),compactBytes=size(compactFile);
  assert.ok(compactBytes<legacyBytes*.8,
   "Compact archive must be observably smaller than 80% of ORIGINAL equivalent complete source evidence, observed "+compactBytes+" vs "+legacyBytes);
  compact.close();compact=null;
  compact=await openCompactNativeMotifArchive(compactFile);
  const before=compact.status();
  await ingest(compact);
  const after=compact.status();
  assert.equal(after.indexedExactMotifs,before.indexedExactMotifs);
  assert.equal(after.observedSourceOnlyEdgeTypes,before.observedSourceOnlyEdgeTypes);
  assert.ok(after.duplicateSourceRowsSkipped>0);
  const first=originalObservations[0][0];
  assert.equal(compact.lookupMotif(first.id).occurrences,
   legacy.lookupMotif(first.id).occurrences);
  const invalid=sha("MALICIOUS DIFFERENT SOURCE");
  assert.throws(()=>compact.beginEpisode(first.episode,invalid),
   /SOURCE_REPLAY_IDENTITY_MISMATCH/);
  assert.equal(compact.status().sourceOnlyNoSemanticPhysics,true);
  console.log("V32_COMPACT_SOURCE_WITNESS_PARITY",JSON.stringify({
   originalUncompressedDiskBytes:legacyBytes,compactDiskBytes:compactBytes,
   ratio:Number((compactBytes/legacyBytes).toFixed(4)),
   sourceEpisodes:before.verifiedSourceEpisodeIdentities,
   witnessedMotifTypes:before.indexedExactMotifs,
   witnessedSourceLinkTypes:before.observedSourceOnlyEdgeTypes,
   originalCheckpointReplayIdempotent:true,
   noVerifiedSemanticEdgesInvented:true
  }));
 }finally{legacy?.close();compact?.close();fs.rmSync(dir,{recursive:true,force:true});}
});
