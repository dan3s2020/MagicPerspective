// Native V17 dataset progress derived from the SAME real source metadata and
// committed Brain.exercises count that the trainer uses for resuming work.
// Never infer training progress from graph-node count, GPU texture, or chars:
// Unicode/ASCII uniqueness saturates while dataset rows are still consumed.
//
// A source shard is the modulo index in worker.stream(): k=share; k<trainRows;
// k+=shares. Text-only fixture streams reserve every explicitly held row.
// No held-out examples count as training.
const whole=n=>Number.isFinite(Number(n))?Math.max(0,Math.floor(Number(n))):0;
const sourceCache=new WeakMap();
export function expectedExercises(source,share=0,shares=1){
 if(!source||!Number.isSafeInteger(share)||share<0||
    !Number.isSafeInteger(shares)||shares<1||share>=shares)return null;
 const cache=sourceCache.get(source);
 const key=share+":"+shares;
 if(cache?.has(key))return cache.get(key);
 let count=null;
 if(source.kind==="parquet"){
   const rows=whole(source.trainRows);
   count=rows>share?Math.ceil((rows-share)/shares):0;
 }else if(source.kind==="text"){
   const rows=whole(source.totalRows);
   count=rows>share?Math.ceil((rows-share)/shares):0;
   const held=source.heldSet||[];
   count-=held.filter(k=>Number.isInteger(k)&&k>=1&&k<=rows&&(k-1)%shares===share).length;
   count=Math.max(0,count);
 }
 if(!sourceCache.has(source))sourceCache.set(source,new Map());
 sourceCache.get(source).set(key,count);
 return count;
}
export function datasetProgress(source,share=0,shares=1,committedExercises=0){
 const expected=expectedExercises(source,share,shares),
   seen=whole(committedExercises),
   processed=expected===null?seen:Math.min(expected,seen),
   total=expected===null?null:expected,
   remaining=total===null?null:Math.max(0,total-processed),
   fraction=total===null||total===0?null:processed/total;
 return {
  kind:source?.kind||"unknown",
  datasetRows:Number.isSafeInteger(source?.totalRows)?source.totalRows:null,
  trainingRows:Number.isSafeInteger(source?.trainRows)?source.trainRows:null,
  heldOutRows:Number.isSafeInteger(source?.heldRows)?source.heldRows:null,
  fileCount:Number.isSafeInteger(source?.fileCount)?source.fileCount:null,
  workerShard:share,workerShards:shares,
  committedExercises:seen,
  processed,trainingTotal:total,remaining,
  fraction,percent:fraction===null?null:fraction*100,
  complete:total!==null&&processed>=total,
  measure:"committed-training-exercises; heldout-reserved; not distinct graph symbols; not byte fraction"
 };
}
export function overallDatasetProgress(source,slots,shares){
 if(!Array.isArray(slots)||!slots.length)return null;
 // Several arms may share one dataset shard; count its *maximum* committed
 // progress, not the sum of duplicates.
 const best=new Map();
 for(const slot of slots){
  if(!slot?.worlds?.includes("text"))continue;
  const share=slot.share;
  const previous=best.get(share)||0;
  const samples=slot.committedExercises||0;
  best.set(share,Math.max(previous,whole(samples)));
 }
 if(!best.size)return null;
 let processed=0;
 for(const [share,count]of best) {
   const target=expectedExercises(source,share,shares);
   processed+=target===null?count:Math.min(target,count);
 }
 const total=whole(source?.trainRows);
 return {processed,total,percent:total>0?100*processed/total:null,
  coveredShards:best.size,expectedShards:shares,
  complete:total>0&&processed>=total};
}
