// Explicit corpus/evaluation scheduling, independent of MagicPerspective V17 internals.
// Tracks repetition; held-out test bytes are never added to training by this module.
export function nextTrainingSlice(train,cursor,size=320){
 if(!Array.isArray(train)||train.length===0)throw Error('Empty training corpus');
 if(!Number.isSafeInteger(cursor)||cursor<0)throw Error('Invalid cursor');
 if(!Number.isInteger(size)||size<1)throw Error('Invalid chunk size');
 const at=cursor>=train.length?0:cursor;
 const slice=train.slice(at,at+size);
 return {slice,cursor:at+slice.length,wrapped:cursor>=train.length,at};
}
export function rotatingHeldout(held,index,size=420){
 if(!Array.isArray(held)||!held.length)return {bytes:[],offset:0};
 const sampleSize=Math.min(size,held.length);
 const windows=Math.max(1,Math.ceil(held.length/sampleSize));
 const offset=(Math.max(0,index)%windows)*sampleSize;
 const bytes=held.slice(offset,offset+sampleSize);
 return {bytes,offset,window:Math.max(0,index)%windows,totalWindows:windows};
}
export function byteEvidence(r,held,src){
 const {bytes,offset,window,totalWindows}=r;
 return {source:src,heldoutOffset:offset,heldoutWindow:window,totalWindows,
  n:bytes.length,persistence:bytes.length?bytes.reduce((sum,y,i)=>sum+(i>0&&y===bytes[i-1]),0)/bytes.length:null};
}
