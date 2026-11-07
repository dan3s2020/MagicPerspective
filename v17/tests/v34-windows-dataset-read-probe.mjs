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
