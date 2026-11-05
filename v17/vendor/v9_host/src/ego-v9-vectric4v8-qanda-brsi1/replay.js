const DB_NAME="octopus-ego-replay-v9-vectric4v8-qanda-brsi1";
const DB_VERSION=1;
const RECORDS="records";
const META="meta";
const META_KEY="ring";

function openDb(){
  return new Promise((resolve,reject)=>{
    const q=indexedDB.open(DB_NAME,DB_VERSION);
    q.onupgradeneeded=()=>{
      const db=q.result;
      if(!db.objectStoreNames.contains(RECORDS))db.createObjectStore(RECORDS,{keyPath:"slot"});
      if(!db.objectStoreNames.contains(META))db.createObjectStore(META);
    };
    q.onsuccess=()=>resolve(q.result);
    q.onerror=()=>reject(q.error);
  });
}
function lcg(seed){
  let s=(seed>>>0)||1;
  return ()=>{s=(Math.imul(s,1664525)+1013904223)>>>0;return s/4294967296;};
}
export class ReplayStore{
  constructor(capacity=20000){
    this.capacity=Math.max(128,Math.floor(capacity)||20000);
  }
  async addMany(items){
    if(!items?.length)return 0;
    const db=await openDb();
    return new Promise((resolve,reject)=>{
      const tx=db.transaction([RECORDS,META],"readwrite");
      const rs=tx.objectStore(RECORDS),ms=tx.objectStore(META);
      const q=ms.get(META_KEY);
      let added=0;
      q.onsuccess=()=>{
        const st=q.result||{nextSlot:0,count:0,total:0};
        for(const item of items){
          const slot=st.nextSlot;
          rs.put({...item,slot});
          st.nextSlot=(slot+1)%this.capacity;
          st.count=Math.min(this.capacity,st.count+1);
          st.total=(st.total||0)+1;
          added++;
        }
        ms.put(st,META_KEY);
      };
      tx.oncomplete=()=>{db.close();resolve(added);};
      tx.onerror=()=>{db.close();reject(tx.error);};
    });
  }
  async sample(limit=64,seed=1){
    const db=await openDb();
    return new Promise((resolve,reject)=>{
      const tx=db.transaction([RECORDS,META],"readonly");
      const rs=tx.objectStore(RECORDS),ms=tx.objectStore(META);
      const q=ms.get(META_KEY),out=[];
      q.onsuccess=()=>{
        const st=q.result||{count:0};
        const n=Math.min(Math.max(0,Math.floor(limit)||0),st.count||0);
        if(!n)return;
        const rng=lcg(seed),used=new Set();
        while(used.size<n)used.add(Math.floor(rng()*st.count));
        for(const slot of used){
          const g=rs.get(slot);
          g.onsuccess=()=>{if(g.result)out.push(g.result);};
        }
      };
      tx.oncomplete=()=>{db.close();resolve(out);};
      tx.onerror=()=>{db.close();reject(tx.error);};
    });
  }
  async snapshot(){
    const db=await openDb();
    return new Promise((resolve,reject)=>{
      const tx=db.transaction([RECORDS,META],"readonly"),rs=tx.objectStore(RECORDS),ms=tx.objectStore(META);
      const qr=rs.getAll(),qm=ms.get(META_KEY);let records=[],meta={count:0,total:0,nextSlot:0};
      qr.onsuccess=()=>{records=(qr.result||[]).slice().sort((a,b)=>(a.slot??0)-(b.slot??0));};
      qm.onsuccess=()=>{meta=qm.result||meta;};
      tx.oncomplete=()=>{db.close();resolve({schemaVersion:1,capacity:this.capacity,meta:{...meta},records});};
      tx.onerror=()=>{db.close();reject(tx.error);};
    });
  }
  async restore(snapshot){
    const snap=snapshot&&typeof snapshot==="object"?snapshot:{records:[],meta:{count:0,total:0,nextSlot:0}};
    const records=Array.isArray(snap.records)?snap.records:[];
    const meta=snap.meta&&typeof snap.meta==="object"?snap.meta:{count:records.length,total:records.length,nextSlot:records.length%this.capacity};
    const db=await openDb();
    return new Promise((resolve,reject)=>{
      const tx=db.transaction([RECORDS,META],"readwrite"),rs=tx.objectStore(RECORDS),ms=tx.objectStore(META);
      rs.clear();ms.clear();
      for(const rec of records)rs.put(rec);
      ms.put({...meta},META_KEY);
      tx.oncomplete=()=>{db.close();resolve(records.length);};
      tx.onerror=()=>{db.close();reject(tx.error);};
    });
  }
  async stats(){
    const db=await openDb();
    return new Promise((resolve,reject)=>{
      const tx=db.transaction(META,"readonly"),q=tx.objectStore(META).get(META_KEY);
      q.onsuccess=()=>{const x=q.result||{count:0,total:0,nextSlot:0};db.close();resolve({...x,capacity:this.capacity});};
      q.onerror=()=>{db.close();reject(q.error);};
    });
  }
  async clear(){
    const db=await openDb();
    return new Promise((resolve,reject)=>{
      const tx=db.transaction([RECORDS,META],"readwrite");
      tx.objectStore(RECORDS).clear();tx.objectStore(META).clear();
      tx.oncomplete=()=>{db.close();resolve(true);};
      tx.onerror=()=>{db.close();reject(tx.error);};
    });
  }
}
