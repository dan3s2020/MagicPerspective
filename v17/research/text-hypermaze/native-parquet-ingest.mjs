// V30 genuine Parquet training into the SAME original V17 Brain.
// Uses the existing OpenThoughts3 reader and its held-out partition;
// no synthetic Q/A action semantics, no new language model, no next-character
// substitute, no hidden reference goal and no arbitrary dataset truncation.
//
// The original ObservedTransformations learns reusable text-edit contrasts
// across segments, which are distinct from physically verified action
// effects. V30 may explore them as HYPOTHESES with explicit opt-in.
//
// On resume the exact source inventory, training split and cursor are
// checked against the persisted original Brain checkpoint.
import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import {setImmediate as yieldLoop} from "node:timers/promises";
import {openTextDataset,HELD_OUT}
 from "../../transcend/torus-aether/data/text-dataset.mjs";

async function datasetSignature(ds,root){
 const files=[];
 for(const file of ds.files){
  const stat=await fs.stat(file.path);
  files.push({path:await fs.realpath(file.path),bytes:stat.size,
   modifiedMs:stat.mtimeMs});
 }
 return {root:await fs.realpath(root),
  files,sha256:crypto.createHash("sha256").update(JSON.stringify(files)).digest("hex"),
  note:"SHA256 of the source FILE INVENTORY, not a full 37GB content hash"};
}
export async function ingestNativeParquet(runtime,root,{saveEvery=5000,
 maxRows=0}={}){
 if(!runtime?.brain||!runtime?.engine||!runtime?.atlas||!runtime?.save)
  throw Error("Requires SAME original V17 Brain and atlas runtime");
 if(runtime.loading)throw Error("Already running witnessed world-event import");
 if(!Number.isSafeInteger(saveEvery)||saveEvery<1||saveEvery>1000000)
  throw Error("Invalid native Parquet checkpoint interval");
 if(!Number.isSafeInteger(maxRows)||maxRows<0)
  throw Error("Invalid Parquet training upper bound");
 const ds=await openTextDataset(root);
 if(ds.held!==HELD_OUT)
  throw Error("Original Parquet reader held-out split changed. Refusing to silently drop unknown examples.");
 if(ds.trainRows<=0||ds.held<1)
  throw Error("Source has insufficient rows for independent heldout");
 const inventory=await datasetSignature(ds,root);
 const brain=runtime.brain,previous=brain.crossEpisodeTextImport||null;
 if(previous&&(previous.inventorySha256!==inventory.sha256||
    previous.trainRows!==ds.trainRows||previous.heldOut!==ds.held))
  throw Error("OpenThoughts3 Parquet inventory/split changed. Refuse to mix checkpoint with another dataset.");
 const m=brain.crossEpisodeTextImport=previous||{
  inventorySha256:inventory.sha256,inventory:inventory.files,
  trainRows:ds.trainRows,heldOut:ds.held,cursor:0,
  promptCharacters:0,answerCharacters:0,
  processedTextWindows:0,newObservedStates:0,newTextOperators:0,
  skippedEmpty:0,readErrors:0,lastSavedCursor:0,
  sourceKind:"original-V17-OpenThoughts3-Parquet",sourceRoot:inventory.root,
  createdAt:new Date().toISOString()
 };
 const target=maxRows?Math.min(ds.trainRows,maxRows):ds.trainRows;
 if(m.cursor>target)throw Error("Requested limit lower than saved original Brain cursor");
 runtime.state="running";runtime.lastError=null;
 let begin=Date.now(),startCursor=m.cursor;
 m.sessionStartedAt=new Date(begin).toISOString();
 m.rowsPerSecond=0;
 for(let index=m.cursor;index<target;index++){
  let row;
  try{row=await ds.exercise(index);}
  catch(e){m.readErrors++;runtime.state="error";runtime.lastError=e.stack||e.message;throw e;}
  if(row.index!==index)throw Error("Original Parquet dataset cursor wrapped unexpectedly");
  const before=brain.observedTransformations.operators.size;
  const oldStates=brain.observedTransformations.newObservations;
  for(const value of [row.prompt,row.answer]){
   if(typeof value!=="string"||!value.trim()){m.skippedEmpty++;continue;}
   const actual=brain.observedTransformations.observeText(value);
   m.processedTextWindows+=actual.observedUnits;
  }
  m.newTextOperators+=brain.observedTransformations.operators.size-before;
  m.newObservedStates+=brain.observedTransformations.newObservations-oldStates;
  m.promptCharacters+=row.prompt?.length||0;
  m.answerCharacters+=row.answer?.length||0;
  m.cursor=index+1;
  if(m.cursor%saveEvery===0){
   m.lastSavedCursor=m.cursor;runtime.save();
  }
  if(m.cursor%32===0){
   const sec=Math.max(0.001,(Date.now()-begin)/1000);
   m.rowsPerSecond=+(Math.max(0,m.cursor-startCursor)/sec).toFixed(2);
  }
  if(m.cursor%2000===0){
   const sec=Math.max(1e-3,(Date.now()-begin)/1000);
   console.log("V30_REAL_OPENTHOUGHTS_NATIVE_CROSSWORLD",JSON.stringify({
    rowCursor:m.cursor,allTrainRows:ds.trainRows,
    heldoutNeverTrained:ds.held,observedTextStates:brain.observedTransformations.newObservations,
    learnedContrastOperators:brain.observedTransformations.operators.size,
    rowsPerSecond:(m.cursor-startCursor)/sec,
    sourceKind:m.sourceKind,semanticAnswerExactAccuracyNotEvaluated:true
   }));
  }
  if(m.cursor%32===0)await yieldLoop();
 }
 runtime.state=m.cursor>=ds.trainRows?"finished":"partial";
 m.rowsPerSecond=+(Math.max(0,m.cursor-startCursor)/
  Math.max(0.001,(Date.now()-begin)/1000)).toFixed(2);
 m.lastSavedCursor=m.cursor;runtime.save();
 return {
  rowsConsumed:m.cursor,totalTrainRows:ds.trainRows,heldoutExcluded:ds.held,
  completedAllTrainRows:m.cursor>=ds.trainRows,
  originalV17Brain:true,sourceInventoryFingerprint:inventory.sha256,
  accumulatedTextStates:brain.observedTransformations.newObservations,
  accumulatedOperators:brain.observedTransformations.operators.size,
  sourceFileCount:inventory.files.length,
  rawCharactersObserved:m.promptCharacters+m.answerCharacters,
  partialTrainingWasExplicit:maxRows>0,
  noQATransitionTreatedAsCausalWorldAction:true,
  notA70PercentSemanticAccuracyClaim:true
 };
}
