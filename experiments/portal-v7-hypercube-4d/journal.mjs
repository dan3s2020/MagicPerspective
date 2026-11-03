// Durable append-only experience log; original Portal4D V7 checkpoints untouched.
// Handles duplicate source events and atomic JSON graph snapshots. It is a
// separate provenance ledger, NOT a replacement neural model/checkpoint.
import {mkdir,readFile,appendFile,writeFile,rename} from 'node:fs/promises';
import {join} from 'node:path';
import {EvidenceGraph,GROWTH_SCHEMA,validateEvidence} from './growth.mjs';

const exists=async(path)=>{
 try{return await readFile(path,'utf8')}catch(e){
  if(e.code==='ENOENT')return null;
  throw e;
 }
};
const parseLines=text=>{
 if(!text)return [];
 if(!text.endsWith('\n'))throw Error(
  'Experience journal has an incomplete final line; stopping rather than silently losing evidence.');
 return text.split('\n').filter(Boolean).map((line,i)=>{
  let o;try{o=JSON.parse(line)}catch(e){throw Error('Corrupt evidence journal line '+(i+1)+': '+e.message)}
  if(!o||o.schema!==GROWTH_SCHEMA||!o.event)
   throw Error('Unsupported evidence journal line '+(i+1));
  return o;
 });
};
export class ExperienceJournal{
 constructor(folder,{checkpointEvery=50}={}){
  if(!folder||typeof folder!=='string')throw Error('A dedicated 4D evidence directory is required');
  if(!Number.isInteger(checkpointEvery)||checkpointEvery<1)
   throw Error('Invalid evidence checkpoint interval');
  this.folder=folder;this.checkpointEvery=checkpointEvery;
  this.snapshotPath=join(folder,'graph-snapshot.json');
  this.logPath=join(folder,'graph-events.jsonl');
  this.graph=new EvidenceGraph();this.loaded=false;
  this.queue=Promise.resolve();this.durableWrites=0;this.replayed=0;
 }
 async open(){
  if(this.loaded)throw Error('Evidence journal already opened');
  await mkdir(this.folder,{recursive:true});
  const snap=await exists(this.snapshotPath);
  if(snap){
   let parsed;
   try{parsed=JSON.parse(snap)}catch(e){throw Error('Invalid evidence snapshot: '+e.message)}
   this.graph=EvidenceGraph.restore(parsed);
  }
  const old=await exists(this.logPath);
  for(const row of parseLines(old)){
   if(!Number.isInteger(row.sequence)||row.sequence<1)
    throw Error('Missing sequence in evidence journal');
   const result=this.graph.ingest(row.event);
   if(result.accepted&&result.sequence!==row.sequence)
    throw Error('Evidence journal sequence mismatch at '+row.sequence);
   this.replayed++;
  }
  this.loaded=true;
  return {stats:this.graph.stats(),replayed:this.replayed};
 }
 async ingest(event){
  if(!this.loaded)throw Error('Call ExperienceJournal.open() before ingest');
  const perform=async()=>{
   const normalized=validateEvidence(event,this.graph);
   const signature=JSON.stringify(normalized);
   const existing=this.graph.events.get(normalized.event_id);
   if(existing){
    if(existing!==signature)throw Error('Conflicting persisted event id '+normalized.event_id);
    return {accepted:false,duplicate:true,sequence:this.graph.sequence,
     stats:this.graph.stats()};
   }
   // Persist BEFORE changing in-memory state; a crash after append will replay.
   const nextSeq=this.graph.sequence+1;
   await appendFile(this.logPath,JSON.stringify({
    schema:GROWTH_SCHEMA,sequence:nextSeq,event
   })+'\n','utf8');
   this.durableWrites++;
   const result=this.graph.ingest(event);
   if(result.sequence!==nextSeq)throw Error('Evidence sequence changed unexpectedly');
   if(result.sequence%this.checkpointEvery===0)await this.checkpointUnsafe();
   return result;
  };
  const result=this.queue.then(perform);
  this.queue=result.catch(()=>{});
  return result;
 }
 async checkpointUnsafe(){
  const file=this.snapshotPath+'.tmp';
  await writeFile(file,JSON.stringify(this.graph.serialize()),'utf8');
  await rename(file,this.snapshotPath);
  // Snapshot atomically includes all prior events; an interruption before
  // truncation only produces harmless duplicate journal records on recovery.
  await writeFile(this.logPath,'','utf8');
  return this.graph.stats();
 }
 async checkpoint(){
  if(!this.loaded)throw Error('Journal not opened');
  const task=this.queue.then(()=>this.checkpointUnsafe());
  this.queue=task.catch(()=>{});
  return task;
 }
 view(opts){return this.graph.view(opts)}
 stats(){return this.graph.stats()}
}
