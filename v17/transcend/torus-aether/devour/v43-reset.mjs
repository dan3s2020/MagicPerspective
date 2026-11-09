// V43: atomic reset boundary for ONE original Brain and all its sidecars.
// NEVER delete or replace anything outside the selected native checkpoint base.
import fs from "node:fs";
import path from "node:path";

export function v43OwnedSessionFiles(base) {
  const parent=path.dirname(base),name=path.basename(base);
  if(!name.endsWith(".v8"))throw Error("Reset only supports native .v8 Brain saves");
  if(!fs.existsSync(parent))return [];
  return fs.readdirSync(parent).filter(x=>
    x===name||x.startsWith(name+".")).sort()
    .map(x=>path.join(parent,x)).filter(x=>fs.statSync(x).isFile());
}
export function archiveV43Session(base,archiveRoot,{stamp=Date.now()}={}) {
  const files=v43OwnedSessionFiles(base);
  const destination=path.join(archiveRoot,"V43-RESET-"+stamp+"-"+path.basename(base));
  if(fs.existsSync(destination))throw Error("Reset archive collision: "+destination);
  fs.mkdirSync(destination,{recursive:true});
  const moved=[];
  try{
    for(const from of files){
      const to=path.join(destination,path.basename(from));
      fs.renameSync(from,to);
      moved.push({from,to});
    }
    const manifest={version:43,base,archivedAt:new Date().toISOString(),
      complete:true,files:moved.map(x=>path.basename(x.from))};
    fs.writeFileSync(path.join(destination,"RESET_MANIFEST.json"),JSON.stringify(manifest,null,2));
    return {destination,movedCount:moved.length,files:manifest.files,verified:true};
  }catch(err){
    for(const {from,to} of moved.reverse()){
      try{fs.renameSync(to,from);}catch{}
    }
    throw Error("Reset archive aborted; attempted rollback: "+err.message);
  }
}
export async function stopV43WorkerForReset(worker,{timeoutMs=25000}={}) {
  if(!worker)return {terminated:true,noPreviousWorker:true};
  try{worker.postMessage("shutdown-reset");}catch{}
  // worker.terminate() MUST finish before source files are moved or a new
  // worker gets the same checkpoint path. Never overlap two original Brains.
  const done=Promise.resolve().then(()=>worker.terminate());
  const timeout=new Promise((_,reject)=>{
    const t=setTimeout(()=>reject(Error("Reset worker did not terminate; files left untouched")),timeoutMs);
    t.unref?.();
    done.finally(()=>clearTimeout(t)).catch(()=>{});
  });
  await Promise.race([done,timeout]);
  return {terminated:true,noPreviousWorker:false};
}
