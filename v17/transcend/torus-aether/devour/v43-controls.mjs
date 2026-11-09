// Verified native V43 control ACKs; never label accepted commands as complete.
import fs from "node:fs";

export async function requestV43WorkerAck(worker,action,{timeoutMs=90000}={}) {
  if(!worker)throw Error("Original Brain worker is absent");
  const name=action==="start"?"resume":action;
  if(!["resume","pause","save"].includes(name))throw Error("Unknown native V43 control");
  return new Promise((resolve,reject)=>{
    let settled=false;
    const cleanup=()=>{
      clearTimeout(t);
      worker.off?.("message",onMessage);
      worker.off?.("exit",onExit);
      worker.off?.("error",onError);
    };
    const done=(err,value)=>{
      if(settled)return;settled=true;cleanup();
      if(err)reject(err);else resolve(value);
    };
    const onMessage=m=>{
      if(m?.type==="fatal")return done(Error(m.text||"Original Brain fatal error"));
      if(typeof m?.text==="string"&&m.text.startsWith("Checkpoint save FAILED:")&&name==="save")
        return done(Error(m.text));
      if(name==="save"&&m?.type==="saved"&&Number.isFinite(m.MB)&&m.MB>0)
        return done(null,{action:"save",acknowledged:true,checkpointSaved:true,MB:m.MB});
      if(m?.type==="v43-control-ack"&&m.action===name)
        return done(null,{action,acknowledged:true,workerConfirmed:true,
          saved:false,at:m.at});
    };
    const onExit=code=>done(Error("Original Brain exited before "+name+" ACK: "+code));
    const onError=e=>done(e);
    const t=setTimeout(()=>done(Error("V43 "+name+" not acknowledged after "+timeoutMs+"ms")),timeoutMs);
    t.unref?.();
    worker.on("message",onMessage);worker.on("exit",onExit);worker.on("error",onError);
    try{worker.postMessage(name);}catch(e){done(e);}
  });
}
export function verifyV43SavedCheckpoint(saveFile) {
  if(!fs.existsSync(saveFile))throw Error("Original Brain did not create checkpoint");
  const st=fs.statSync(saveFile);
  if(!st.isFile()||st.size<64)
    throw Error("Original Brain checkpoint missing or empty after ACK");
  return {saveVerified:true,checkpoint:saveFile,bytes:st.size};
}
