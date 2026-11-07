import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import {createHash} from "node:crypto";
import {Brain} from "../transcend/torus-aether/devour/brain.mjs";
import {NativeGoalTextMaze} from "../research/text-hypermaze/goal-conditioned-native.mjs";
import {openNativeMotifArchive} from "../research/text-hypermaze/native-motif-disk-archive.mjs";
import {selectAnchors} from "../research/text-hypermaze/winnow-token-anchors.mjs";
import {tokenizeObservation} from "../transcend/torus-aether/worlds/observed-transformations.mjs";

const rand = n=>Array.from({length:n},(_,i)=>"unique-"+i+"-"+n);
const word32=t=>{
 let h=2166136261;
 for(const c of t.normalize("NFC")){h^=c.codePointAt(0);h=Math.imul(h,16777619);}
 return h>>>0;
};
const oldSample=tokens=>tokens.flatMap((v,i)=>i===0||(word32(v)&31)===0?[i]:[]);
const ids=(anchors,tokens)=>new Set(anchors.map(a=>a.width+":"+tokens.slice(a.at,a.at+a.width).join("\u001f")));
const hasAny=(a,b)=>[...a].some(x=>b.has(x));

const mkBrain=()=>new Brain({seed:1001,rules:{depth:1,off:["R2","R4"],budEvery:100,
 empty:true,maxWires:32,fold:false}});

test("RED: deterministic full-content winnowing guarantees at least one SAME 5-token anchor for shared >=20-token substring across different offsets, even if old 1-in-32 gate misses",()=>{
 // Explicit counterexample: no token begins with a legacy sampling hash.
 const shared=[];
 for(let i=0;shared.length<23;i++){
  const tok="contextbridge"+i+"k";
  if((word32(tok)&31)!==0)shared.push(tok);
 }
 const first=[...rand(80),...shared,...rand(47).map(x=>"A"+x)];
 const second=[...rand(29).map(x=>"B"+x),...shared,...rand(110).map(x=>"C"+x)];
 const oldA=oldSample(first).map(i=>first.slice(i,i+5).join("\u001f"));
 const oldB=new Set(oldSample(second).map(i=>second.slice(i,i+5).join("\u001f")));
 assert.equal(oldA.some(x=>oldB.has(x)),false,
  "Old content-independent sparse hash misses EVERY common 5-token anchor");
 const a=selectAnchors(first,{width:5,window:16});
 const b=selectAnchors(second,{width:5,window:16});
 assert.ok(a.length>0&&b.length>0);
 assert.ok(hasAny(ids(a,first),ids(b,second)),
  "Whole 23-word shared phrase must give an identical selected 5-word anchor");
 assert.ok(a.every(x=>Number.isSafeInteger(x.at)&&x.width===5));
 assert.deepEqual(a,selectAnchors(first,{width:5,window:16}),
  "Same real source must create reproducible identical source positions");
 assert.ok(a.length<first.length/3&&b.length<second.length/3,
  "Disk index must remain sparse, not log all possible windows");
});
test("RED: winnowing guarantees overlap at two original scales for a 40-token shared passage with completely unrelated surrounding language",()=>{
 const bridge=rand(42).map(x=>"shared"+x);
 const x=[...rand(23).map(t=>"X"+t),...bridge,...rand(19).map(t=>"Y"+t)];
 const y=[...rand(71).map(t=>"Z"+t),...bridge,...rand(41).map(t=>"K"+t)];
 for(const width of [5,12]){
  const a=selectAnchors(x,{width,window:16}),
   b=selectAnchors(y,{width,window:16});
  assert.ok(hasAny(ids(a,x),ids(b,y)),width+"-token bridge was missed");
  assert.ok(a.every(v=>v.width===width));
 }
});
test("RED: uncorrelated token sequences must not acquire bogus identical long anchors",()=>{
 const x=rand(240).map(t=>"first"+t),
  y=rand(240).map(t=>"second"+t);
 assert.equal(hasAny(ids(selectAnchors(x,{width:5,window:16}),x),
  ids(selectAnchors(y,{width:5,window:16}),y)),false);
});
test("RED: actual SAME native Brain and SQLite source memory reuse a missed >20-token bridge across two independent LONG Q/A worlds",async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),"v32-winnow-native-"));
 let archive=null;
 try{
  const b=mkBrain(),native=new NativeGoalTextMaze(b);
  archive=await openNativeMotifArchive(path.join(dir,"old-source-motifs.sqlite"));
  native.qaRole.attachMotifArchive(archive);
  const share=rand(38).map(t=>"mutual"+t).join(" ");
  const beforeA="Problem type A: "+rand(98).map(t=>"uniqueA"+t).join(" ");
  const beforeB="Problem type B: "+rand(180).map(t=>"uniqueB"+t).join(" ");
  const outA=rand(150).map(t=>"anchorA"+t).join(" ")+" "+share+" "+
   rand(230).map(t=>"tailA"+t).join(" ");
  const outB=rand(45).map(t=>"anchorB"+t).join(" ")+" "+share+" "+
   rand(290).map(t=>"tailB"+t).join(" ");
  const e1=native.observeQA(beforeA,outA);
  const e2=native.observeQA(beforeB,outB);
  assert.equal(e1.archiveDiskEnabled,true);
  assert.equal(e2.archiveDiskEnabled,true);
  assert.ok(archive.status().sharedExactMotifsAcrossEpisodes>=2,
   "Both winnowed scales should bridge long independent Q/A examples");
  assert.equal(native.cumulativeWorldStatus().physicallyVerifiedEdges,0,
   "Textual overlap is NOT a verified semantic transformation");
  assert.equal(native.planCumulativeWorld({
   start:outA,required:["imaginary-answer"]}).found,false);
  console.log("V32_CROSS_EPISODE_WITNESS",JSON.stringify({
   distinctLongSourceEpisodes:2,
   sharedExactIndexedAnchors:archive.status().sharedExactMotifsAcrossEpisodes,
   numberOfPhysicallyVerifiedSemanticActions:0,
   sameBrain:true,
   oracleAnswerSupplied:false
  }));
 }finally{archive?.close();fs.rmSync(dir,{recursive:true,force:true})}
});
test("RED: reused SQLite episode number with a DIFFERENT source payload after an old checkpoint is rejected, never merged or silently overwritten",async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),"v32-source-replay-"));
 const file=path.join(dir,"train-history.sqlite");
 let db=null;
 try{
  db=await openNativeMotifArchive(file);
  const id="5:"+("a".repeat(64));
  const identity1=createHash("sha256").update("Q1\u0000A1").digest("hex");
  const identity2=createHash("sha256").update("Q2\u0000A2").digest("hex");
  db.beginEpisode(1,identity1);
  db.motif({id,width:5,role:"answer",at:0,example:"verified first source"});
  db.commitEpisode();db.close();
  db=await openNativeMotifArchive(file);
  assert.throws(()=>db.beginEpisode(1,identity2),
   /replay|different|identity|mismatch|source/i);
  assert.equal(db.lookupMotif(id).episodes,1);
  assert.equal(db.lookupMotif(id).occurrences,1);
  db.beginEpisode(1,identity1);
  const repeat=db.motif({id,width:5,role:"answer",at:0,example:"verified first source"});
  db.commitEpisode();
  assert.equal(repeat.repeatedExactPosition,true);
  assert.equal(db.lookupMotif(id).occurrences,1);
 }finally{db?.close();fs.rmSync(dir,{recursive:true,force:true})}
});
