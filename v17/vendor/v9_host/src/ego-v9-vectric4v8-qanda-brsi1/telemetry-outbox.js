export const TELEMETRY_OUTBOX_NAMESPACE=Object.freeze({db:"octopus-ego-telemetry-outbox-v9-vectric4v8-qanda-brsi1",store:"events"});
export const TELEMETRY_OUTBOX_LIMITS=Object.freeze({maxEvents:128,maxBytes:16_000_000});
const encBytes=s=>typeof TextEncoder!=="undefined"?new TextEncoder().encode(s).byteLength:s.length;
const idOf=body=>[body?.campaignId||"unknown",body?.sessionId||"unknown",body?.eventSeq??"na"].join(":");
export function evidenceClass(body={}){
  const kind=String(body.kind||"");
  if(kind==="fatal")return{priority:100,protected:true};
  if(kind==="v9_vectric4v8_qanda_brsi1_interrogation"){const t=String(body.trigger||"periodic");if(t==="manual")return{priority:95,protected:true};if(t.startsWith("anomaly"))return{priority:80,protected:false};return{priority:60,protected:false};}
  if(kind==="session_start"||kind==="clean_shutdown")return{priority:70,protected:false};
  if(kind==="runtime_event"&&/error|fatal|stall|hang|lost|checkpoint|replay|rejection|worker|overflow|missing|history_reset|capture_cancelled/i.test(String(body.type||"")))return{priority:85,protected:false};
  return{priority:10,protected:false};
}
export function pruneOutboxRecords(records,limits=TELEMETRY_OUTBOX_LIMITS){
  const a=(records||[]).slice().sort((x,y)=>(Number(x.createdMs)||0)-(Number(y.createdMs)||0)),bytes=()=>a.reduce((q,x)=>q+(Number(x.bytes)||0),0),evicted=[],over=()=>a.length>limits.maxEvents||bytes()>limits.maxBytes;
  while(over()){let c=a.map((x,i)=>({x,i})).filter(q=>!q.x.protected);if(!c.length)c=a.map((x,i)=>({x,i})).filter(q=>String(q.x.kind||"")!=="fatal");if(!c.length)c=a.map((x,i)=>({x,i}));if(!c.length)break;c.sort((u,v)=>(Number(u.x.priority)||0)-(Number(v.x.priority)||0)||(Number(u.x.createdMs)||0)-(Number(v.x.createdMs)||0));const v=c[0];evicted.push(v.x);a.splice(v.i,1);}
  return{kept:a,evicted,bytes:bytes(),overflow:over(),forcedProtectedEvictions:evicted.filter(x=>x.protected).length};
}
function openDb(){return new Promise((resolve,reject)=>{if(typeof indexedDB==="undefined"){resolve(null);return;}const q=indexedDB.open(TELEMETRY_OUTBOX_NAMESPACE.db,1);q.onupgradeneeded=()=>{if(!q.result.objectStoreNames.contains(TELEMETRY_OUTBOX_NAMESPACE.store))q.result.createObjectStore(TELEMETRY_OUTBOX_NAMESPACE.store,{keyPath:"id"});};q.onsuccess=()=>resolve(q.result);q.onerror=()=>reject(q.error);});}
export class TelemetryOutbox{
  constructor(limits=TELEMETRY_OUTBOX_LIMITS){this.limits=limits;this.memory=new Map();this.writeChain=Promise.resolve();}
  _serial(fn){const p=this.writeChain.then(fn,fn);this.writeChain=p.catch(()=>{});return p;}
  async all(){const db=await openDb();if(!db)return[...this.memory.values()].sort((a,b)=>a.createdMs-b.createdMs);return new Promise((resolve,reject)=>{const tx=db.transaction(TELEMETRY_OUTBOX_NAMESPACE.store,"readonly"),q=tx.objectStore(TELEMETRY_OUTBOX_NAMESPACE.store).getAll();q.onsuccess=()=>resolve((q.result||[]).sort((a,b)=>a.createdMs-b.createdMs));q.onerror=()=>reject(q.error);tx.oncomplete=()=>db.close();});}
  async replace(records){const db=await openDb();if(!db){this.memory=new Map((records||[]).map(x=>[x.id,x]));return;}return new Promise((resolve,reject)=>{const tx=db.transaction(TELEMETRY_OUTBOX_NAMESPACE.store,"readwrite"),st=tx.objectStore(TELEMETRY_OUTBOX_NAMESPACE.store);st.clear();for(const x of records||[])st.put(x);tx.oncomplete=()=>{db.close();resolve();};tx.onerror=()=>{db.close();reject(tx.error);};});}
  async enqueue(body,json=JSON.stringify(body)){return this._serial(async()=>{const cls=evidenceClass(body),rec={id:idOf(body),kind:body?.kind||"unknown",trigger:body?.trigger||null,createdMs:Date.now(),bytes:encBytes(json),priority:cls.priority,protected:cls.protected,json},all=await this.all(),idx=all.findIndex(x=>x.id===rec.id);if(idx>=0)all[idx]=rec;else all.push(rec);const q=pruneOutboxRecords(all,this.limits);await this.replace(q.kept);return{stored:q.kept.some(x=>x.id===rec.id),evicted:q.evicted,overflow:q.overflow,forcedProtectedEvictions:q.forcedProtectedEvictions,count:q.kept.length,bytes:q.bytes,protected:rec.protected};});}
  async remove(id){return this._serial(async()=>{const all=await this.all();await this.replace(all.filter(x=>x.id!==id));});}
  async summary(){const all=await this.all();return{count:all.length,bytes:all.reduce((q,x)=>q+(Number(x.bytes)||0),0),protected:all.filter(x=>x.protected).length};}
}
