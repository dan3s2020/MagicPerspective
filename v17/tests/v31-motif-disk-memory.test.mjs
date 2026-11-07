import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {Brain} from "../transcend/torus-aether/devour/brain.mjs";
import {createHash} from "node:crypto";
import {tokenizeObservation} from "../transcend/torus-aether/worlds/observed-transformations.mjs";
import {NativeGoalTextMaze} from "../research/text-hypermaze/goal-conditioned-native.mjs";
import {openNativeMotifArchive} from "../research/text-hypermaze/native-motif-disk-archive.mjs";

const phrase="persistent recurrent causal observation bridge context";
const pad=(prefix,n=320)=>Array.from({length:n},(_,i)=>prefix+i).join(" ");
const brain=()=>new Brain({seed:811,rules:{depth:1,off:["R2","R4"],
 budEvery:100,empty:true,maxWires:32,fold:false}});

test("Disk index restores a previous real source phrase even AFTER its entire active memory graph was evicted and original .v8 Brain checkpoint resumed",async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),"mp-v31-source-disk-"));
 const dbfile=path.join(dir,"original-long-language-motifs.sqlite"),
  checkpoint=path.join(dir,"original-brain.v8");
 let archive=null,reopened=null;
 try{
  const b=brain(),native=new NativeGoalTextMaze(b);
  archive=await openNativeMotifArchive(dbfile);
  native.qaRole.attachMotifArchive(archive);
  const one=native.observeQA("first distinct world question "+pad("questionA",180),
    phrase+" "+pad("alpha",480));
  assert.equal(one.archiveDiskEnabled,true);
  const db1=archive.inspect({limit:200});
  assert.ok(db1.total>0);
  // SQLite pages are sorted by hash, not by the visible phrase. Derive
  // the EXACT original canonical token SHA256, then query its indexed id.
  const id="5:"+createHash("sha256").update(JSON.stringify(
   tokenizeObservation(phrase).slice(0,5))).digest("hex");
  const anchor=archive.lookupMotif(id);
  assert.ok(anchor,"The complete exact 5-token anchor must be indexed, even if outside the first page");
  assert.equal(anchor.width,5);
  assert.equal(archive.lookupMotif(id).episodes,1);
  assert.equal(archive.status().sharedExactMotifsAcrossEpisodes,0);
  // Simulate what happens after many OpenThoughts3 problems: active
  // 50,000-node retention pressure destroys earlier singletons.
  native.qaRole.state.longForm.motifGraph.maxNodes=3;
  b.save(checkpoint);
  archive.close();archive=null;
  const restored=new NativeGoalTextMaze(Brain.load(checkpoint));
  reopened=await openNativeMotifArchive(dbfile);
  restored.qaRole.attachMotifArchive(reopened);
  const two=restored.observeQA("second unrelated independent world "+pad("questionB",180),
    phrase+" "+pad("beta",480));
  assert.equal(two.archiveDiskEnabled,true);
  assert.ok(two.archiveDiskRetrievedPriorWitnesses>=1,
   "Actual original Brain must recognize a SOURCE motif from a different old maze despite RAM eviction");
  assert.ok(reopened.status().reencounteredExactSourceMotifs>=1);
  const old=reopened.lookupMotif(id);
  assert.equal(old.episodes,2);
  assert.equal(old.firstEpisode,1);
  assert.equal(old.lastEpisode,2);
  assert.ok(reopened.status().sharedExactMotifsAcrossEpisodes>=1);
  assert.equal(reopened.inspect({view:"motifs",offset:0,limit:2}).rows.length,2);
  const all=[];let offset=0;
  for(;;){
   const page=reopened.inspect({limit:200,offset});all.push(...page.rows);
   if(page.nextOffset===null)break;
   assert.ok(page.nextOffset>offset);offset=page.nextOffset;
  }
  assert.equal(all.length,reopened.status().indexedExactMotifs);
  assert.ok(all.length>restored.qaRole.state.longForm.motifGraph.nodes.size,
   "Archive must retain exact prior source evidence beyond active RAM cap");
  assert.equal(reopened.related(id).every(x=>x.source===id),true);
  assert.equal(restored.cumulativeWorldStatus().physicallyVerifiedEdges,0,
   "An observed exact recurrent phrase is not a permitted semantic world transition");
  assert.equal(restored.planCumulativeWorld({
   start:phrase,required:["alpha479"]}).found,false);
  console.log("V31_DISK_RECALL_AFTER_ACTIVE_EVICTION",JSON.stringify({
   separateLongSourceEpisodes:2,diskMotifEntries:all.length,
   activeRamMotifs:restored.qaRole.state.longForm.motifGraph.nodes.size,
   exactOldAnchorRecalled:true,sourceSharedAcrossEpisodes:old.episodes,
   diskSourceEdges:reopened.status().observedSourceOnlyEdgeTypes,
   originalBrainCheckpointRestored:true,
   validatedSemanticActions:0
  }));
 }finally{
  if(archive)archive.close();if(reopened)reopened.close();
  fs.rmSync(dir,{recursive:true,force:true});
 }
});
test("Disk motif source occurrence writes are idempotent when original checkpoint replays same episode after crash",async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),"mp-v31-resume-disk-"));
 const file=path.join(dir,"observed-original-motifs.sqlite");
 let db;
 try{
  db=await openNativeMotifArchive(file);
  const digest="5:"+("a".repeat(64));
  db.beginEpisode(1);
  const first=db.motif({id:digest,width:5,role:"answer",at:0,example:"same phrase"});
  db.edge({from:digest,to:"12:"+("b".repeat(64)),role:"answer-source-order",ordinal:0});
  db.commitEpisode();
  assert.equal(first.episodes,1);
  db.close();
  db=await openNativeMotifArchive(file);
  db.beginEpisode(1);
  const duplicate=db.motif({id:digest,width:5,role:"answer",at:0,example:"same phrase"});
  const edge=db.edge({from:digest,to:"12:"+("b".repeat(64)),role:"answer-source-order",ordinal:0});
  db.commitEpisode();
  assert.equal(duplicate.repeatedExactPosition,true);
  assert.equal(edge.newWitness,false);
  assert.equal(db.lookupMotif(digest).occurrences,1);
  assert.equal(db.lookupMotif(digest).episodes,1);
  assert.equal(db.related(digest)[0].occurrences,1);
  db.beginEpisode(2);
  const prior=db.motif({id:digest,width:5,role:"answer",at:10,example:"same phrase"});
  db.commitEpisode();
  assert.equal(prior.fromPreviousEpisode,true);
  assert.equal(db.lookupMotif(digest).episodes,2);
  assert.equal(db.status().sharedExactMotifsAcrossEpisodes,1);
 }finally{db?.close();fs.rmSync(dir,{recursive:true,force:true})}
});
