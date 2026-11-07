// Exactly the public, authentic OpenThoughts3-1.2M dataset records.
// No hand-written fixtures, no fabricated answers, no reference-answer
// constraints supplied to the original Discoverer.shapeGraph. No CUDA claim.
// Real JSONL is built from actual official Hugging Face Dataset Viewer rows,
// then fed to THE SAME native real-corpus-server/worker and original Brain.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import crypto from "node:crypto";
import os from "node:os";
import path from "node:path";
import net from "node:net";
import {Brain} from "../transcend/torus-aether/devour/brain.mjs";
import {tokenizeObservation} from "../transcend/torus-aether/worlds/observed-transformations.mjs";
import {qaPairsFromRealJSON} from "../research/text-hypermaze/openthoughts-jsonl-source.mjs";
import {launch} from "../research/text-hypermaze/real-corpus-server.mjs";

const delay=n=>new Promise(resolve=>setTimeout(resolve,n));
const port=()=>new Promise((resolve,reject)=>{
 const s=net.createServer();s.once("error",reject);
 s.listen(0,"127.0.0.1",()=>{const p=s.address().port;
  s.close(err=>err?reject(err):resolve(p));});
});
const api="https://datasets-server.huggingface.co/rows";
const dataset="open-thoughts/OpenThoughts3-1.2M";
async function realRows(offset,length){
 const params=new URLSearchParams({dataset,config:"default",split:"train",
  offset:String(offset),length:String(length)});
 // The official dataset viewer sporadically returns 502/503. Retry the
 // SAME exact offset and query, never change rows, invent data or silently
 // substitute a synthetic fixture. Terminal failure stays a real CI error.
 let response=null;
 for(let attempt=0;attempt<5;attempt++){
  try{
   response=await fetch(api+"?"+params,{
    headers:{"accept":"application/json","user-agent":"MagicPerspective-V29-evidence-audit"},
    signal:AbortSignal.timeout(50000)
   });
  }catch(error){
   if(attempt===4)throw Error("Authentic OpenThoughts3 source network failure at offset "+
    offset+": "+String(error?.message||error)+" (NO SYNTHETIC FALLBACK)");
   await delay(750*(attempt+1));continue;
  }
  if(response.ok)break;
  if(![429,500,502,503,504].includes(response.status)||attempt===4)
   throw Error("Authentic OpenThoughts3 API returned HTTP "+
    response.status+" for offset "+offset+" (NO SYNTHETIC FALLBACK)");
  await response.body?.cancel();
  await delay(750*(attempt+1));
 }
 if(!response?.ok)throw Error("Authentic OpenThoughts3 source unavailable at "+
  offset+" (NO SYNTHETIC FALLBACK)");
 const json=await response.json();
 if(!Array.isArray(json.rows)||json.rows.length!==length)throw Error(
  "Authentic dataset API returned incomplete real rows; NO fabricated replacements");
 return json.rows.map((x,i)=>{
  assert.equal(x.row_idx,offset+i,"Dataset row index mismatch; stop");
  const row=x.row;
  const pairs=qaPairsFromRealJSON(row);
  assert.equal(pairs.length,1,"Real dataset needs actual human/GPT Q/A pair");
  assert.ok(pairs[0].question.length>3&&pairs[0].answer.length>3);
  return row;
 });
}
async function status(base,done,timeout=230000){
 const deadline=Date.now()+timeout;
 while(Date.now()<deadline){
  const response=await fetch(base+"/api/status",{
   signal:AbortSignal.timeout(11000)});
  if(!response.ok)throw Error("Native HTTP real data status "+response.status);
  const obj=await response.json();
  if(obj.error)throw Error("Native actual data learner fatal: "+obj.error);
  if(obj.status&&done(obj.status))return obj.status;
  await delay(200);
 }
 throw Error("Authentic OpenThoughts3 native training timed out; no invented result");
}
test("PUBLIC REAL 96 OpenThoughts3 Q/A: stress SAME native Brain and score true frozen FULL natural answers (no synthetic fallback)",{
 timeout:400000
},async()=>{
 // Three distant windows from the real full dataset, so the actual model
 // encounters diverse Q/A instead of repetitive near-identical fixtures.
 const offsets=[0,210000,810000],length=32;
 const rows=(await Promise.all(offsets.map(x=>realRows(x,length)))).flat();
 assert.equal(rows.length,96);
 const realPairs=rows.map(x=>qaPairsFromRealJSON(x)[0]);
 const describeTokenLengths=s=>tokenizeObservation(s).length;
 const qLengths=realPairs.map(x=>describeTokenLengths(x.question));
 const aLengths=realPairs.map(x=>describeTokenLengths(x.answer));
 const lengths={questionTokens:{min:Math.min(...qLengths),max:Math.max(...qLengths),
    mean:qLengths.reduce((a,b)=>a+b,0)/qLengths.length},
  answerTokens:{min:Math.min(...aLengths),max:Math.max(...aLengths),
    mean:aLengths.reduce((a,b)=>a+b,0)/aLengths.length},
  answerOver128:aLengths.filter(x=>x>128).length,
  questionOver128:qLengths.filter(x=>x>128).length};
 const names=rows.map(x=>qaPairsFromRealJSON(x)[0].question);
 assert.equal(new Set(names).size,96,"Identical questions must not fake diversity");
 const root=fs.mkdtempSync(path.join(os.tmpdir(),"magic-v29-public-openthoughts-"));
 const data=path.join(root,"authentic-OpenThoughts3-sample.jsonl"),
  out=path.join(root,"original-Brain-checkpoints");
 const jsonl=rows.map(x=>JSON.stringify(x)).join("\n")+"\n";
 fs.writeFileSync(data,jsonl,"utf8");
 const size=fs.statSync(data).size;
 const hash=crypto.createHash("sha256").update(fs.readFileSync(data)).digest("hex");
 let app=null;
 try{
  app=await launch({data,out,port:await port(),autoStart:true,
   holdoutEvery:6,saveEvery:12,transitionEvery:128,
   windowTokens:64,maxTokensPerSegment:96,
   maxObserved:1800,maxOperators:12000,heapMB:1024});
  const measured=await status(app.base,s=>s.completed===true);
  assert.equal(measured.bytesRead,size);
  assert.equal(measured.rowsRead,96);
  assert.equal(measured.trainedRows,80);
  assert.equal(measured.heldoutRows,16);
  assert.equal(measured.qaFrozenHeldoutQuestions,16);
  // V30 atlas MUST show the REAL failures, not only paths drawn from
  // pre-provided partial synthetic goals. Gold answers are never stored.
  assert.equal(measured.atlasTotals?.qaEvaluationsTotal,16);
  assert.equal(measured.atlasTotals?.qaExactWholeAnswersTotal,
   measured.qaFrozenWholeRawExact);
  assert.equal(measured.atlasTotals?.failuresTotal,
   16-measured.qaFrozenWholeRawExact);
  assert.equal(measured.qaTrainingPairs,80);
  // Long-form replies are NOW physically observed in a bounded original
  // Brain sequential hypermaze rather than rejected above 128 tokens.
  // This is evidence consumption, NOT answer-generation success.
  assert.equal(measured.qaLongFormEpisodes,80);
  // V30: same Brain persists experience across source episodes but source
  // adjacency cannot masquerade as independently verified physical axes.
  assert.ok(measured.crossMazeMemory?.originalBrain);
  assert.equal(measured.crossMazeMemory.roleEpisodes,80);
  assert.equal(measured.crossMazeMemory.physicallyVerifiedEdges,0);
  assert.equal(measured.crossMazeMemory.observedChunks,
   measured.qaLongFormChunkNodes);
  assert.equal(measured.crossMazeMemory.observedSequentialEdges,
   measured.qaLongFormSequentialEdges);
  assert.ok(measured.crossMazeMemory.sharedExactChunkAnchors>=0);
  // Never assume or invent how many tokens a real corpus has.
  // This EXACT check uses the original model tokenizer and the genuine
  // training-only row split, no approximate duplicate regex.
  const expectedTrainAnswerTokens=realPairs.reduce((n,p,i)=>
   n+(i%6===5?0:tokenizeObservation(p.answer).length),0);
  const expectedTrainQuestionTokens=realPairs.reduce((n,p,i)=>
   n+(i%6===5?0:tokenizeObservation(p.question).length),0);
  assert.equal(measured.qaLongFormAnswerTokens,expectedTrainAnswerTokens);
  assert.equal(measured.qaLongFormQuestionTokens,expectedTrainQuestionTokens);
  assert.ok(measured.qaLongFormSequentialEdges>0);
  assert.ok(measured.qaLongFormActiveChunkDigests>0);
  // Real HTML and script must show precisely these factual counters,
  // not a decorative static canvas or numbers from unrelated simulated tasks.
  const actualHTML=await(await fetch(app.base+"/")).text();
  assert.match(actualHTML,/id="qaLongTokens"/);
  assert.match(actualHTML,/id="qaLongEdges"/);
  const actualJS=await(await fetch(app.base+
   "/transcend/torus-aether/ui/native-hypermaze.js")).text();
  assert.match(actualJS,/qaLongFormAnswerTokens/);
  assert.match(actualJS,/qaLongFormSequentialEdges/);
  assert.equal(measured.qaLongFormUnretained,0);
  assert.ok(measured.qaFrozenWholeRawExact>=0&&
   measured.qaFrozenWholeRawExact<=16);
  assert.equal(measured.qaFrozenGoalsFound>=0,true);
  assert.ok(Number.isSafeInteger(measured.operatorsDropped)&&
   measured.operatorsDropped>=0,
   "Original operator cap evictions are evidence about missing paths, not a test runner bug");
  const progress=JSON.parse(fs.readFileSync(path.join(out,
   "native-hypermaze-progress.json"),"utf8"));
  const loaded=Brain.load(path.join(out,progress.checkpoint));
  assert.equal(loaded.hypermazeCumulativeExperience.atlas.attemptsTotal,16);
  assert.equal(loaded.hypermazeCumulativeExperience.atlas.events.filter(
   e=>e.kind==="frozen-real-natural-language-qa").length,16);
  assert.ok(loaded.hypermazeCumulativeExperience.atlas.events.every(
   e=>e.withheldGoldAnswerNotPersisted===true),
   "Original Brain atlas must never train on or store heldout answer strings");
  assert.equal(loaded.qaRoleEvidence.longForm.episodes,80);
  assert.ok(loaded.qaRoleEvidence.longForm.sequences.length>0);
  assert.equal(loaded.qaRoleEvidence.longForm.sequences.length<=96,true);
  const actualHeldoutHashes=rows.flatMap((row,i)=>i%6===5?[
   crypto.createHash("sha256").update(
    qaPairsFromRealJSON(row)[0].answer).digest("hex")]:[]);
  assert.ok(loaded.qaRoleEvidence.longForm.sequences.every(seq=>
   !actualHeldoutHashes.includes(seq.answerSHA256)),
   "Actual long hidden answers must never be stored in native Brain");
  assert.equal(loaded.qaRoleEvidence?.examples.length,
   measured.qaLearnedPairs);
  assert.equal(loaded.qaRoleEvidence.examples.some(x=>rows.some((row,i)=>
   i%6===5&&qaPairsFromRealJSON(row)[0].question===x.question)),false,
   "Withheld REAL OpenThoughts3 Q/A leaked into native Brain");
  console.log("V31_LARGER_PUBLIC_OPENTHOUGHTS3_NATIVE_QA",JSON.stringify({
   officialDataset:"https://huggingface.co/datasets/"+dataset,
   exactOffsets:offsets,rowsPerOffset:length,
   realJSONLBytes:size,realFileSHA256:hash,
   fullRealQuestions:96,realTrainedPairs:measured.qaTrainingPairs,
   realHeldoutQuestions:measured.qaFrozenHeldoutQuestions,
   actuallyLearnedQAPairs:measured.qaLearnedPairs,
   completeLongRoleEpisodesWitnessed:measured.qaLongFormEpisodes,
   totalLongAnswerTokensWitnessed:measured.qaLongFormAnswerTokens,
   originalObservedSequentialEdges:measured.qaLongFormSequentialEdges,
   liveLongEpisodeChunkNodes:measured.qaLongFormActiveChunkDigests,
   longEpisodesRejected:measured.qaLongFormUnretained,
   tokenLengthDistribution:lengths,
   wholeAnswerRawExact:measured.qaFrozenWholeRawExact,
   wholeAnswerRawAccuracy:measured.qaWholeAnswerExactRate,
   wholeAnswerCanonicalExact:measured.qaFrozenWholeCanonicalExact,
   goalCoverage:measured.qaFrozenGoalCoverage,
   learnedQAAxes:measured.qaRoleWitnessedAxisEdges,
   originalOperatorCount:measured.learnedOperators,
   originalBrainCumulativeMemory:measured.crossMazeMemory,
   sourceOnlyChunksNotPhysicalActions:true,
   lastModelPrediction:measured.qaLastPrediction,
   preservedCheckpoint:true,device:"GitHub hosted CPU",
   realUsersPrivate594MBFileRead:false,
   evidenceRetainedMotifNodes:measured.crossMazeMemory.multiScaleActiveNodes,
   shortSharedAnchors:measured.crossMazeMemory.multiScaleSharedAnchors,
   originalOperatorDrops:measured.operatorsDropped,
   observedMotifNodeEvictions:measured.crossMazeMemory.multiScaleEvictedSingletons+
    measured.crossMazeMemory.multiScaleEvictedRepeated,
   sampleIsNotFullDataset:true,
   semanticSuccessOnFull1200000SamplesProven:false
  }));
 }finally{
  if(app)await app.close();
  fs.rmSync(root,{recursive:true,force:true});
 }
});
