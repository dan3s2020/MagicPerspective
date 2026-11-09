// MagicPerspective V43 read-only mirror of the SAME original Brain's append-only
// exercise journal. No arbitrary paths from HTTP inputs, no synthetic results.
import fs from "node:fs/promises";
const lastGoodState=new Map(),lastGoodLive=new Map();
const transientRead=e=>e instanceof SyntaxError||["EPERM","EACCES","EBUSY"].includes(e?.code);

export async function readV43State(checkpoint){
  if(typeof checkpoint!=="string"||!checkpoint.endsWith(".v8"))return null;
  const filename=checkpoint+".v43-status.json";
  try{
    const stats=await fs.stat(filename);
    if(stats.size>32*1024*1024)throw Error("V43 status exceeds safe limit");
    const report=JSON.parse(await fs.readFile(filename,"utf8"));
    if(report?.format!=="magicperspective/v43-one-universe/v1")
      throw Error("V43 status source identity mismatch");
    lastGoodState.set(filename,report);
    return report;
  }catch(e){
    if(e.code==="ENOENT")return null;
    // An exceptional Windows in-place fallback may overlap a read.
    // Preserve LAST VERIFIED state instead of declaring original GPU dead.
    if(transientRead(e))return lastGoodState.get(filename)||null;
    throw e;
  }
}
// Read only the latest N complete lines using bounded reverse chunks; the
// entire OpenThoughts training journal is never materialized in server RAM.
export async function readV43Exercises(checkpoint,{before=null,limit=20}={}){
  if(typeof checkpoint!=="string"||!checkpoint.endsWith(".v8"))
    throw Error("Missing original native Brain checkpoint");
  if(!Number.isInteger(limit)||limit<1||limit>100||
     (before!==null&&(!Number.isSafeInteger(before)||before<1)))
    throw Error("Invalid V43 pagination");
  const file=checkpoint+".v43-exercises.jsonl",entries=[];
  let handle;
  try{handle=await fs.open(file,"r");}
  catch(e){if(e.code==="ENOENT")return {items:[],olderCursor:null};throw e;}
  try{
    const stat=await handle.stat();let position=stat.size;
    let remainder=Buffer.alloc(0);
    while(position>0&&entries.length<limit){
      const n=Math.min(65536,position);position-=n;
      const chunk=Buffer.allocUnsafe(n);
      const {bytesRead}=await handle.read(chunk,0,n,position);
      const joined=Buffer.concat([chunk.subarray(0,bytesRead),remainder]);
      // The first fragment may start in the middle of a UTF-8 symbol.
      // Keep it in BYTES until the next earlier chunk completes the line.
      const pieces=[];
      let begin=0;
      for(let i=0;i<joined.length;i++)if(joined[i]===10){
        pieces.push(joined.subarray(begin,i));begin=i+1;
      }
      pieces.push(joined.subarray(begin));
      remainder=pieces.shift();
      for(let i=pieces.length-1;i>=0&&entries.length<limit;i--){
        const raw=pieces[i].toString("utf8").trim();
        if(!raw)continue;
        let item;try{item=JSON.parse(raw);}catch{continue;}
        if(!item||!Number.isSafeInteger(item.id))continue;
        if(before!==null&&item.id>=before)continue;
        entries.push(item);
      }
    }
    // The first (oldest) line is not newline-terminated at byte 0.
    if(position===0&&remainder.length&&entries.length<limit){
      try{
        const item=JSON.parse(remainder.toString("utf8"));
        if(item&&Number.isSafeInteger(item.id)&&(before===null||item.id<before))
          entries.push(item);
      }catch{}
    }
    return {items:entries,olderCursor:entries.at(-1)?.id??null};
  }finally{await handle.close();}
}

export async function readV43Live(checkpoint){
  if(typeof checkpoint!=="string"||!checkpoint.endsWith(".v8"))return null;
  try{
    const filename=checkpoint+".v43-live.json";
    const info=await fs.stat(filename);
    if(info.size>8*1024*1024)throw Error("V43 live progress exceeds 8 MiB");
    const value=JSON.parse(await fs.readFile(filename,"utf8"));
    if(value?.format!=="magicperspective/v43-live/v1")
      throw Error("V43 live progress format mismatch");
    lastGoodLive.set(filename,value);
    return value;
  }catch(e){
    if(e.code==="ENOENT")return null;
    if(transientRead(e))return lastGoodLive.get(filename)||null;
    throw e;
  }
}
