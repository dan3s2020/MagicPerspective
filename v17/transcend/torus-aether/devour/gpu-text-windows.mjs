// Pure, lossless windowing for unexpectedly large Parquet Q/A exercises.
// We do NOT truncate answers, change the order, insert fake characters, or count
// windows as independent dataset rows. The caller persists original-row offset.
export const DEFAULT_GPU_WINDOW_CHARS=4096;
export function gpuTextWindows(source,{maxChars=DEFAULT_GPU_WINDOW_CHARS,offset=0}={}){
 if(!source||!Number.isSafeInteger(source.length)||source.length<0)throw Error('Expected byte sequence');
 if(!Number.isSafeInteger(maxChars)||maxChars<256||maxChars>65536)throw Error('Invalid GPU window size');
 if(!Number.isSafeInteger(offset)||offset<0||offset>source.length)throw Error('Invalid resume offset');
 const chunks=[];
 for(let from=offset;from<source.length;from+=maxChars){
  const to=Math.min(from+maxChars,source.length);
  chunks.push({from,to,bytes:source.slice(from,to),complete:to===source.length});
 }
 return chunks;
}
export function resumeSourceState(brain){
 const rows=Number.isSafeInteger(brain.sourceRows)&&brain.sourceRows>=0?brain.sourceRows:
  Number.isSafeInteger(brain.exercises)&&brain.exercises>=0?brain.exercises:0;
 const offset=Number.isSafeInteger(brain.sourceOffset)&&brain.sourceOffset>=0?brain.sourceOffset:0;
 return {rows,offset};
}
export function applyCompletedWindow(brain,{rowChars,from,to}){
 if(!Number.isSafeInteger(rowChars)||rowChars<0||!Number.isSafeInteger(from)||!Number.isSafeInteger(to)||
   from<0||to<=from||to>rowChars||from!==(brain.sourceOffset||0))throw Error('Noncontiguous source window: checkpoint mismatch');
 brain.sourceOffset=to;
 if(to===rowChars){
  brain.sourceRows=(brain.sourceRows||0)+1;
  brain.sourceOffset=0;
  brain.sourceRowFingerprint=null;
  brain.sourceRowLength=0;
 }
 // Brain.exercises stays an ORIGINAL dataset-row count, not GPU micro-window count.
 brain.exercises=brain.sourceRows||0;
 return {rows:brain.sourceRows,offset:brain.sourceOffset,rowCompleted:to===rowChars};
}
