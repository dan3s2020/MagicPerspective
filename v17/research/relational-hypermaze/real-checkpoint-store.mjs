// Bounded-memory, append-segment checkpointing for V24.
// Version 1 huge monolithic atlas-v24.json files are NEVER overwritten.
// Version 2 writes individual small JSONL records, verifies their hash before
// publishing an atomic manifest, and only resumes from committed manifests.
// Superseded segments are intentionally retained for recovery, not deleted.
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import readline from "node:readline";
import {once} from "node:events";
import {finished} from "node:stream/promises";
import {RealTextAtlas} from "./real-corpus-core.mjs";

export const manifestName="atlas-v24.index.json";
export const legacyName="atlas-v24.json";

const safeFile=name=>{
 if(typeof name!=="string" || !/^atlas-v24-[a-z0-9-]+\.records\.jsonl$/.test(name))
  throw Error("Unsafe checkpoint segment filename");
 return name;
};
const sha256=()=>crypto.createHash("sha256");
const checkSource=(saved,source,opts,target)=>{
 if(saved.sourceFingerprint!==source.fingerprint)throw Error("Checkpoint source changed: refusing to mix training/held-out partitions");
 if(saved.sourceTrainRows!==source.trainRows||saved.sourceHeldRows!==source.heldRows)
  throw Error("Checkpoint split differs; refusing resume");
 if(saved.options?.maxRecords!==opts.maxRecords||saved.options?.maxAnswerChars!==opts.maxAnswerChars)
  throw Error("Memory configuration changed; choose matching limits for resume");
 if(saved.progress?.cursor>target)throw Error("Requested target limit is below saved cursor");
};
export async function readManifest(out,source,opts,target){
 const manifest=path.join(out,manifestName),legacy=path.join(out,legacyName);
 const isNew=fs.existsSync(manifest);
 if(!isNew&&!fs.existsSync(legacy))return null;
 if(!isNew){
  // Legacy may be large, but it was previously successfully written as ONE
  // JSON.stringify. Load it ONCE for safe migration to segmented v2 format.
  let data;
  try{data=JSON.parse(await fsp.readFile(legacy,"utf8"));}
  catch(err){throw Error("Old checkpoint is unreadable; retained untouched at "+legacy+": "+err.message);}
  if(data.version!==1)throw Error("Unexpected legacy checkpoint version");
  checkSource(data,source,opts,target);
  return {format:1,model:RealTextAtlas.restore(data.model),
    progress:data.progress,trace:data.trace||null,traceHistory:data.traceHistory||[],
    events:data.events||[],heldout:data.heldout||null,segments:[],lastSavedNextId:0,
    legacyFile:legacy};
 }
 const saved=JSON.parse(await fsp.readFile(manifest,"utf8"));
 if(saved.format!==2||!Array.isArray(saved.segments))throw Error("Invalid V24 manifest");
 checkSource(saved,source,opts,target);
 const active=new Map();
 let maxPersistedId=-1;
 for(const entry of saved.segments){
  safeFile(entry.name);
  const src=path.join(out,entry.name),hash=sha256();
  let count=0;
  const lines=readline.createInterface({input:fs.createReadStream(src,{encoding:"utf8"}),crlfDelay:Infinity});
  for await(const line of lines){
   hash.update(line+"\n");
   if(!line.trim())continue;
   let record;try{record=JSON.parse(line);}catch(err){throw Error("Corrupt checkpoint record in "+entry.name+": "+err.message);}
   if(!Number.isSafeInteger(record.id)||record.id<0||record.id<=maxPersistedId||
      typeof record.prompt!=="string"||typeof record.answer!=="string"||
      !Array.isArray(record.terms))throw Error("Invalid or nonmonotonic persisted record");
   maxPersistedId=record.id;active.set(record.id,record);count++;
   if(active.size>opts.maxRecords){const old=active.keys().next().value;active.delete(old);}
  }
  const actual=hash.digest("hex");
  if(actual!==entry.sha256||count!==entry.count)
   throw Error("Checkpoint segment failed SHA256/count validation: "+entry.name);
 }
 const model=RealTextAtlas.restore({version:1,config:saved.modelConfig,
   stats:saved.modelStats,nextId:saved.modelNextId,records:[...active.values()]});
 if(saved.modelNextId<=maxPersistedId)throw Error("Checkpoint nextId regression");
 return {format:2,model,progress:saved.progress,trace:saved.trace||null,
   traceHistory:saved.traceHistory||[],events:saved.events||[],
   heldout:saved.heldout||null,segments:saved.segments,
   lastSavedNextId:saved.modelNextId};
}
async function writeRecords(out,name,records){
 safeFile(name);
 const file=path.join(out,name),tmp=file+".tmp-"+process.pid;
 if(fs.existsSync(file))throw Error("Refusing to replace existing checkpoint segment "+file);
 const hash=sha256();let count=0,bytes=0,done=false;
 const stream=fs.createWriteStream(tmp,{flags:"wx"});
 try{
  for(const record of records){
   // Never materialize the whole model or segment as one JS string.
   const line=JSON.stringify(record)+"\n";
   hash.update(line);bytes+=Buffer.byteLength(line);
   if(!stream.write(line))await once(stream,"drain");
   count++;
  }
  stream.end();await finished(stream);
  await fsp.rename(tmp,file);done=true;
  return {name,sha256:hash.digest("hex"),count,bytes};
 }finally{
  if(!done){stream.destroy();await fsp.rm(tmp,{force:true}).catch(()=>{});}
 }
}
export async function writeManifest({out,source,options,progress,model,trace,traceHistory,heldout,events,
 previousSegments=[],lastSavedNextId=0}){
 const nowId=model.nextId;
 if(!Number.isSafeInteger(nowId)||nowId<lastSavedNextId)throw Error("Checkpoint id regression");
 const segments=[...previousSegments];
 const delta=lastSavedNextId===0?
   [...model.records.values()]:
   [...model.records.values()].filter(x=>x.id>=lastSavedNextId);
 if(delta.length){
  const first=delta[0].id,last=delta.at(-1).id;
  const name="atlas-v24-"+String(progress.cursor).padStart(10,"0")+"-"+first+"-"+last+".records.jsonl";
  const entry=await writeRecords(out,name,delta);
  segments.push(entry);
 }
 const payload={
  format:2,sourceFingerprint:source.fingerprint,
  sourceTrainRows:source.trainRows,sourceHeldRows:source.heldRows,
  options,progress:{...progress,lastSavedCursor:progress.cursor},
  modelConfig:model.config,modelStats:{...model.stats},
  modelNextId:nowId,segments,
  trace:trace||null,traceHistory:(traceHistory||[]).slice(-16),
  events:(events||[]).slice(-120),heldout:heldout||null,
  savedAt:new Date().toISOString()
 };
 const manifest=path.join(out,manifestName),tmp=manifest+".tmp-"+process.pid;
 let committed=false;
 try{
  await fsp.writeFile(tmp,JSON.stringify(payload),"utf8");
  await fsp.rename(tmp,manifest);
  committed=true;return {manifest,segments,lastSavedNextId:nowId,recordsInNewSegment:delta.length};
 }finally{if(!committed)await fsp.rm(tmp,{force:true}).catch(()=>{});}
}
