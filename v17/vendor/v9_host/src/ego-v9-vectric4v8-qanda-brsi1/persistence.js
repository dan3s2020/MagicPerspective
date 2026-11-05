const DB_NAME="octopus-ego-ai-v9-vectric4v8-qanda-brsi1",STORE="state",KEY="trainer",PRETRAINED_KEY="pretrained-target-brain",FROZEN_RSI_KEY="manual-frozen-rsi-root";
function dbOpen(){
  return new Promise((resolve,reject)=>{
    const q=indexedDB.open(DB_NAME,1);
    q.onupgradeneeded=()=>{if(!q.result.objectStoreNames.contains(STORE))q.result.createObjectStore(STORE);};
    q.onsuccess=()=>resolve(q.result);q.onerror=()=>reject(q.error);
  });
}
async function putState(key,state){
  const db=await dbOpen();
  return new Promise((resolve,reject)=>{
    const tx=db.transaction(STORE,"readwrite");tx.objectStore(STORE).put(state,key);
    tx.oncomplete=()=>{db.close();resolve(true);};tx.onerror=()=>{db.close();reject(tx.error);};
  });
}
async function getState(key){
  const db=await dbOpen();
  return new Promise((resolve,reject)=>{
    const tx=db.transaction(STORE,"readonly"),q=tx.objectStore(STORE).get(key);
    q.onsuccess=()=>{db.close();resolve(q.result||null);};q.onerror=()=>{db.close();reject(q.error);};
  });
}
async function deleteState(key){
  const db=await dbOpen();
  return new Promise((resolve,reject)=>{
    const tx=db.transaction(STORE,"readwrite");tx.objectStore(STORE).delete(key);
    tx.oncomplete=()=>{db.close();resolve(true);};tx.onerror=()=>{db.close();reject(tx.error);};
  });
}
export async function saveTrainerState(state){return putState(KEY,state);}
export async function loadTrainerState(){return getState(KEY);}
export async function clearTrainerState(){return deleteState(KEY);}
export async function savePretrainedState(state){return putState(PRETRAINED_KEY,state);}
export async function loadPretrainedState(){return getState(PRETRAINED_KEY);}
export async function clearPretrainedState(){return deleteState(PRETRAINED_KEY);}

export async function saveFrozenRsiState(state){return putState(FROZEN_RSI_KEY,state);}
export async function loadFrozenRsiState(){return getState(FROZEN_RSI_KEY);}
export async function clearFrozenRsiState(){return deleteState(FROZEN_RSI_KEY);}

export async function saveNamedTrainerState(key,state){return putState("principal-expert:"+String(key),state);}
export async function loadNamedTrainerState(key){return getState("principal-expert:"+String(key));}
export async function clearNamedTrainerState(key){return deleteState("principal-expert:"+String(key));}
