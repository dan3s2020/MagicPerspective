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
  if(!worker)return {terminated:true,noPreviousWorker:true,acknowledged:true};
  // The shutdown is performed BY the old worker, so its own Python CUDA
  // subprocess is closed before the parent worker is terminated.
  await new Promise((resolve,reject)=>{
    let done=false;
    const cleanup=()=>{
      clearTimeout(timer);
      worker.off?.("message",onMessage);
      worker.off?.("error",onError);
      worker.off?.("exit",onExit);
    };
    const success=()=>{if(done)return;done=true;cleanup();resolve();};
    const failure=e=>{if(done)return;done=true;cleanup();reject(e);};
    const onMessage=m=>{
      if(m?.type==="v43-reset-error")failure(Error(m.error||"Native CUDA worker did not shut down"));
      if(m?.type==="v43-reset-ready"&&m.noGpuProcessRetained===true)success();
    };
    const onError=e=>failure(e);
    const onExit=code=>failure(Error("Old worker exited before CUDA reset acknowledgement: "+code));
    const timer=setTimeout(()=>failure(Error(
      "Old CUDA worker did not acknowledge shutdown within "+timeoutMs+"ms; reset refused, checkpoints untouched")),timeoutMs);
    timer.unref?.();
    worker.on("message",onMessage);
    worker.on("error",onError);
    worker.on("exit",onExit);
    try{worker.postMessage("shutdown-reset");}catch(e){failure(e);}
  });
  // ACK guarantees Python was already closed by its owning native worker.
  // Await old worker termination before archiving all of its files.
  await worker.terminate();
  return {terminated:true,noPreviousWorker:false,acknowledged:true};
}
