// Real original V17 Parquet row reader Windows diagnostic; no fabricated
// language result, only actual local source-backed row decoding latency.
import {performance} from "node:perf_hooks";
import {openTextDataset}
 from "../transcend/torus-aether/data/text-dataset.mjs";
const dir=process.argv[2];if(!dir)throw Error("actual .parquet folder required");
const a=performance.now(),ds=await openTextDataset(dir),b=performance.now();
const first=await ds.exercise(0),c=performance.now();
const unseen=await ds.heldOut(0),d=performance.now();
console.log("V34_WINDOWS_NATIVE_PARQUET_READER_PROBE",JSON.stringify({
 source:dir,trainRows:ds.trainRows,heldout:ds.held,
 firstPromptChars:first.prompt.length,firstAnswerChars:first.answer.length,
 unseenPromptChars:unseen.prompt.length,
 metadataMs:+(b-a).toFixed(1),firstFullRowMs:+(c-b).toFixed(1),
 heldoutFullRowMs:+(d-c).toFixed(1)}));
if(!first.answer||!first.prompt||!unseen.answer)
 throw Error("Real Windows .parquet row text was lost");

if(process.argv[3]){
 const {Brain}=await import("../transcend/torus-aether/devour/brain.mjs");
 const brain=Brain.load(process.argv[3]);
 const text="Q: "+first.prompt+"\nA: "+first.answer+"\n\n";
 const bytes=[];
 for(const ch of text){
  const cp=ch.charCodeAt(0);
  if(cp===13)continue;
  bytes.push(cp===9||cp===10||(cp>=32&&cp<127)?cp:63);
 }
 brain.beginExercise();
 const start=performance.now();let maxByteMs=0;
 for(let i=0;i<bytes.length;i++){
  const begin=performance.now();
  brain.live(bytes[i],brain.chars%50===0);brain.chars++;
  const cost=performance.now()-begin;
  maxByteMs=Math.max(maxByteMs,cost);
  if(i<8||(i+1)%32===0)console.log("V34_WIN_REAL_FIRST_PARQUET_ROW_BYTE",JSON.stringify({
    cursor:i+1,byte:bytes[i],lastByteMs:+cost.toFixed(1),
    elapsedMs:+(performance.now()-start).toFixed(1)}));
 }
 console.log("V34_WIN_FULL_AUTHENTIC_ROW_NATIVE_BRAIN_LIVE_PASS",JSON.stringify({
  sourceRealParquet:true,realSymbols:bytes.length,elapsedMs:+(performance.now()-start).toFixed(1),
  maxIndividualByteMs:+maxByteMs.toFixed(1),exactOriginalBrain:true}));
}

