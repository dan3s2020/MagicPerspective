// Append-only, independent audit atlas for ALL OBSERVED transformations,
// world steps, predicted candidate graph edges and failed planning attempts.
// No in-memory cap, sampling, silent truncation or replacement of originals.
// The paged API reads byte offsets; full JSONL remains exportable on disk.
import fs from "node:fs";
import path from "node:path";
export const atlasPath = brainCheckpoint => String(brainCheckpoint)+".atlas.jsonl";
export class AtlasJournal{
 constructor(filepath){
  this.filepath=filepath;this.events=0;this.bytesAdded=0;this.closed=false;
  fs.mkdirSync(path.dirname(filepath),{recursive:true});
  this.fd=fs.openSync(filepath,"a");
 }
 record(event){
  if(this.closed)throw Error("Atlas journal is closed; refusing to silently lose event");
  const obj={schema:1,date:new Date().toISOString(),...event};
  const line=Buffer.from(JSON.stringify(obj)+"\n","utf8");
  let cursor=0;
  while(cursor<line.length){
   const wrote=fs.writeSync(this.fd,line,cursor,line.length-cursor);
   if(!wrote)throw Error("Atlas journal write returned zero bytes; no silent skip");
   cursor+=wrote;
  }
  this.events++;this.bytesAdded+=line.length;
  return {written:true,bytes:line.length,event:this.events};
 }
 sync(){if(!this.closed)fs.fsyncSync(this.fd);}
 close(){if(!this.closed){this.sync();fs.closeSync(this.fd);this.closed=true;}}
 status(){const stat=fs.statSync(this.filepath);
  return {path:this.filepath,eventsThisProcess:this.events,
    appendedBytesThisProcess:this.bytesAdded,
    totalBytes:stat.size,appendOnly:true,omittedRecords:0};}
}
export function readAtlasPage(filepath,{cursor=0,limit=50,kind=""}={}){
 if(!Number.isSafeInteger(cursor)||cursor<0||!Number.isSafeInteger(limit)||
    limit<1||limit>250||typeof kind!=="string"||kind.length>60)
   throw Error("Atlas cursor/limit/kind must be valid (1..250 entries)");
 if(!fs.existsSync(filepath))return {rows:[],cursor:0,nextCursor:0,end:true,totalBytes:0,
   appendOnly:true,preExistingUnrecorded:true};
 const totalBytes=fs.statSync(filepath).size;
 if(cursor>totalBytes)throw Error("Cursor is past end of persisted atlas");
 const fd=fs.openSync(filepath,"r"),chunk=Buffer.alloc(65536),rows=[];
 let at=cursor,partial=Buffer.alloc(0),done=false,scanned=0;
 try{
  while(at<totalBytes&&rows.length<limit){
   // Rare categories such as failures might occur once after millions
   // of observed edges. Never freeze the HTTP UI while filtering all
   // historic bytes; yield another cursor after a bounded 2MB scan.
   // Partial JSONL lines are ALWAYS completed, never cut/truncated.
   if(at>cursor && at-cursor>=2*1024*1024 && partial.length===0)break;
   const len=fs.readSync(fd,chunk,0,Math.min(chunk.length,totalBytes-at),at);
   if(!len)break;
   const data=Buffer.concat([partial,chunk.subarray(0,len)]),newlinePositions=[];
   for(let i=0;i<data.length;i++)if(data[i]===10)newlinePositions.push(i);
   let start=0,used=0;
   for(const idx of newlinePositions){
    const line=data.subarray(start,idx).toString("utf8");
    const record=JSON.parse(line);scanned++;
    used=idx+1;start=idx+1;
    if(!kind||record.type===kind)rows.push(record);
    if(rows.length>=limit)break;
   }
   const dataStart=at-partial.length;
   if(rows.length>=limit){at=dataStart+used;partial=Buffer.alloc(0);break;}
   at+=len;partial=data.subarray(start);
   // Atlas lines may contain long complete observed states. Never silently
   // cut a record in two or enforce a hidden maximum JSONL row length.
  }
  // While worker writes a final incomplete line, don't decode or skip it.
  done=at>=totalBytes;
  return {rows,cursor,nextCursor:at,end:done,totalBytes,scanned,scannedBytes:at-cursor,
    kind:kind||"all",appendOnly:true,omittedRecords:0,
    preExistingUnrecorded:false};
 }finally{fs.closeSync(fd);}
}
export function appendAtlasEvent(filepath,event){
 fs.mkdirSync(path.dirname(filepath),{recursive:true});
 fs.appendFileSync(filepath,JSON.stringify({schema:1,date:new Date().toISOString(),...event})+"\n","utf8");
}
