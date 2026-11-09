// V43 observational files must never abort the original V42 CUDA trainer.
// Windows scanners/indexers sometimes hold the destination at rename time.
// Only sidecars use this helper: original .v8 Brain checkpoint atomicity stays unchanged.
import fs from 'node:fs';
import path from 'node:path';
let counter=0,failures=0;
const pause=typeof SharedArrayBuffer==='function'?new Int32Array(new SharedArrayBuffer(4)):null;
const recoverable=e=>['EPERM','EACCES','EBUSY'].includes(e?.code);
export function writeV43Telemetry(filename,data){
  const tmp=filename+'.'+process.pid+'.'+(++counter)+'.tmp';
  let succeeded=false;
  try{
    const contents=JSON.stringify(data);
    fs.mkdirSync(path.dirname(filename),{recursive:true});
    fs.writeFileSync(tmp,contents,'utf8');
    for(let attempt=0;attempt<4;attempt++){
      try{fs.renameSync(tmp,filename);succeeded=true;break;}
      catch(error){
        if(!recoverable(error))throw error;
        // Short, bounded delay; only a status sidecar, NEVER an original .v8 save.
        if(attempt<3&&pause)Atomics.wait(pause,0,0,20*(attempt+1));
      }
    }
    if(!succeeded){
      // Windows can deny overwrite-rename while still permitting in-place write.
      // An interrupted read may see incomplete JSON; the UI reader retries.
      fs.writeFileSync(filename,contents,'utf8');
      succeeded=true;
    }
  }catch(error){
    failures++;
    if(failures===1||failures%100===0)
      console.warn('V43 TELEMETRY DEGRADED (original training continues): '+String(error));
  }finally{
    try{fs.rmSync(tmp,{force:true});}catch{}
  }
  return succeeded;
}
