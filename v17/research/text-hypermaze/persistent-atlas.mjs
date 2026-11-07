// An append-only, loss-auditable atlas of ACTUAL original V17 experiences,
// reusable learned operators, attempts, successful paths and missing edges.
//
// This is NOT a second learner or another CPU worker. The existing Brain owns
// all learned actions; the atlas retains evidence about how those actions were
// acquired and where their routes fail. A file is optional for unit tests;
// the original worker passes a durable sidecar path next to its Brain.v8.
//
// Every event receives a consecutive id, is UTF-8 JSONL, and is readable by
// pages. No last-N event eviction, no fabricated path, no hidden reference
// answer. Disk-full and torn-last-line errors are explicit, not silent.
// The retained atlas is the totality of OBSERVED and EXPLORED paths, not every
// theoretical state of unrestricted natural language.
import fs from "node:fs";
import path from "node:path";

const natural=(x,fallback=0)=>Number.isSafeInteger(x)&&x>=0?x:fallback;
const knownKinds=["world","operator","search","execution","baseline","note"];
const safeKinds=a=>Array.isArray(a)?a.filter(x=>knownKinds.includes(x)):[];
const countTo=(obj,key)=>{obj[key]=(obj[key]||0)+1;};
export class PersistentHypermazeAtlas {
 constructor({file=null}={}){
  this.file=file;
  this.offsets=[];
  this.counts=Object.create(null);
  this.usedInSuccess=new Map();
  this.usedInFailure=new Map();
  this.failedReasons=Object.create(null);
  this.records=[]; // ONLY used when there is no on-disk journal
  this.last=null;
  this.bytes=0;
  this.recoveredExisting=false;
  if(file&&fs.existsSync(file)){
   this._indexExisting();
   this.recoveredExisting=true;
  }
 }
 _consider(entry){
  if(!entry||!Number.isSafeInteger(entry.seq)||
     entry.seq!==this.offsets.length+1)
   throw Error("Atlas JSONL chronology corrupted: a journal event was lost or reordered");
  countTo(this.counts,entry.type);
  if(entry.type==="search"){
   if(!entry.found)countTo(this.failedReasons,entry.diagnostic?.reason||"unknown");
   const used=entry.actions||[];
   const target=entry.found?this.usedInSuccess:this.usedInFailure;
   for(const a of used)if(a?.key)target.set(a.key,(target.get(a.key)||0)+1);
  }
  this.last={seq:entry.seq,type:entry.type,found:entry.found??null,
   reason:entry.diagnostic?.reason??null};
 }
 _indexExisting(){
  // The index holds only integer *byte offsets*, not past text or graphs.
  // It can address millions of episodes without retaining their raw strings.
  const fd=fs.openSync(this.file,"r");
  const buf=Buffer.allocUnsafe(256*1024);
  let position=0,start=0,partial=Buffer.alloc(0);
  try{
   const size=fs.fstatSync(fd).size;
   while(position<size){
    const sizeNow=fs.readSync(fd,buf,0,Math.min(buf.length,size-position),position);
    if(!sizeNow)throw Error("Atlas journal unexpectedly ended during read");
    let from=0;
    for(let i=0;i<sizeNow;i++)if(buf[i]===10){
     const part=buf.subarray(from,i);
     const full=partial.length?Buffer.concat([partial,part]):part;
     let e;
     try{e=JSON.parse(full.toString("utf8"));}
     catch(err){throw Error("Invalid atlas JSONL at byte "+start+": "+err.message);}
     this._consider(e);
     this.offsets.push(start);
     start=position+i+1;
     from=i+1;partial=Buffer.alloc(0);
    }
    if(from<sizeNow){
     const rem=buf.subarray(from,sizeNow);
     partial=partial.length?Buffer.concat([partial,rem]):Buffer.from(rem);
    }
    position+=sizeNow;
   }
   if(partial.length||start!==size)
    throw Error("Incomplete trailing atlas event at byte "+start+
     " — fail closed rather than silently drop a path");
   this.bytes=size;
  }finally{fs.closeSync(fd);}
 }
 append(type,data={}){
  if(!knownKinds.includes(type))throw Error("Unsupported atlas event type");
  const seq=this.offsets.length+1;
  const entry={seq,type,...data};
  // Never let user-supplied JSON override chronology or type.
  entry.seq=seq;entry.type=type;
  const encoded=JSON.stringify(entry)+"\n";
  const buf=Buffer.from(encoded,"utf8");
  if(this.file){
   fs.mkdirSync(path.dirname(this.file),{recursive:true});
   // Single append call. We surface errors; never convert disk-full into
   // an apparent success or silently reset the atlas.
   const fd=fs.openSync(this.file,"a");
   try{
    const wrote=fs.writeSync(fd,buf,0,buf.length,null);
    if(wrote!==buf.length)throw Error("Atlas append was a short write");
   }finally{fs.closeSync(fd);}
  }else this.records.push(entry);
  this._consider(entry);
  this.offsets.push(this.bytes);
  this.bytes+=buf.length;
  return entry.seq;
 }
 flush(){
  if(!this.file||!fs.existsSync(this.file))return;
  const fd=fs.openSync(this.file,"r");
  try{fs.fsyncSync(fd);}finally{fs.closeSync(fd);}
 }
 read(seq){
  if(!Number.isSafeInteger(seq)||seq<1||seq>this.offsets.length)return null;
  if(!this.file)return this.records[seq-1]||null;
  const start=this.offsets[seq-1],end=seq<this.offsets.length?
   this.offsets[seq]:this.bytes;
  const length=end-start;
  if(length>128*1024*1024)throw Error("Atlas record exceeds safe single-page read limit");
  const buf=Buffer.alloc(length),fd=fs.openSync(this.file,"r");
  try{
   let read=0;
   while(read<length){
    const n=fs.readSync(fd,buf,read,length-read,start+read);
    if(!n)throw Error("Atlas journal unexpectedly truncated");
    read+=n;
   }
  }finally{fs.closeSync(fd);}
  const entry=JSON.parse(buf.toString("utf8"));
  if(entry.seq!==seq)throw Error("Atlas event order changed on disk");
  return entry;
 }
 page({after=0,limit=60,kinds=null,onlyFailed=false}={}){
  const start=natural(Number(after));
  const size=Math.min(250,Math.max(1,natural(Number(limit),60)));
  const filter=safeKinds(kinds);
  const events=[];
  let index=Math.min(start,this.offsets.length);
  for(;index<this.offsets.length&&events.length<size;index++){
   const e=this.read(index+1);
   if(filter.length&&!filter.includes(e.type))continue;
   if(onlyFailed&&!(e.type==="search"&&!e.found))continue;
   events.push(e);
  }
  return {events,after:start,nextCursor:index,
   hasMore:index<this.offsets.length,totalEvents:this.offsets.length,
   completeJournal:true,filtered:filter,onlyFailed:!!onlyFailed,
   source:this.file?"persisted-original-brain-sidecar":"in-memory-unit-test"};
 }
 summary(){
  return {journalEvents:this.offsets.length,journalBytes:this.bytes,
   persisted:!!this.file,recoveredExisting:this.recoveredExisting,
   totalWorlds:this.counts.world||0,learnedOperatorEvents:this.counts.operator||0,
   searches:this.counts.search||0,executions:this.counts.execution||0,
   searchesFailed:Object.values(this.failedReasons).reduce((a,b)=>a+b,0),
   searchesFound:(this.counts.search||0)-
    Object.values(this.failedReasons).reduce((a,b)=>a+b,0),
   failuresByReason:{...this.failedReasons},
   successesByOperator:Object.fromEntries(this.usedInSuccess),
   failedSearchesByOperator:Object.fromEntries(this.usedInFailure),
   last:this.last,
   contents:"only actually OBSERVED corpus text, learned edit evidence, "+
    "explored finite search graphs, attempted paths, and their failures",
   doesNotContainTheoreticalEntireLanguage:true};
 }
 operatorCatalog(operators,{after=0,limit=60,onlyUnused=false}={}){
  const offset=natural(Number(after)),size=Math.min(250,Math.max(1,natural(Number(limit),60)));
  const data=[...operators.values()].map(op=>({
   key:op.key,kind:op.kind,from:op.from,to:op.to,
   left:op.left,right:op.right,
   observedSupport:op.sourceObservations,
   supportingExamples:op.evidence||[],
   pathsUsedSuccessful:this.usedInSuccess.get(op.key)||0,
   pathsUsedUnsuccessful:this.usedInFailure.get(op.key)||0,
  })).filter(x=>!onlyUnused||!x.pathsUsedSuccessful);
  return {operators:data.slice(offset,offset+size),
   totalOperators:data.length,after:offset,nextCursor:Math.min(data.length,offset+size),
   hasMore:offset+size<data.length,onlyUnused:!!onlyUnused,
   from:"original-Brain.ObservedTransformations.operators",
   noInventedOperators:true};
 }
}
