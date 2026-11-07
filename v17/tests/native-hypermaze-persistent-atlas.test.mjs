// Strict original-brain/corpus atlas acceptance. No teacher answer leakage.
// The atlas MUST distinguish a missing edge from a cut-off maze search,
// preserve every recorded route (success AND failure) and survive restart.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {Brain} from "../transcend/torus-aether/devour/brain.mjs";
import {playExercise,KIND}
 from "../transcend/torus-aether/worlds/exercise.mjs";
import {makeMaze,seedOf,SEEDS}
 from "../transcend/torus-aether/worlds/labyrinth.mjs";
import {NativeGoalTextMaze}
 from "../research/text-hypermaze/goal-conditioned-native.mjs";
import {PersistentHypermazeAtlas}
 from "../research/text-hypermaze/persistent-atlas.mjs";

function trainedBrain(){
 const b=new Brain({rules:{depth:1,off:["R2","R4"],budEvery:100,
  empty:true,maxWires:32,fold:false},seed:11});
 b.enableEndogenousNoise();
 for(let i=0;i<80;i++){
  playExercise(makeMaze(seedOf(SEEDS.train,340+i*31),[7,9,11][i%3]),b.disc);
  if(i>=24&&b.disc.attract(KIND.target)>.2&&
    b.disc.conduct(KIND.floor)>=.5&&b.disc.self()>=0)break;
 }
 assert.ok(b.disc.attract(KIND.target)>.2);
 return b;
}
test("all observed edits, full explored paths and genuinely missing routes survive a JSONL atlas restart with no silent eviction",{
 timeout:120000
},()=>{
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),"mp-true-atlas-"));
 const file=path.join(tmp,"original-brain.v8.hypermaze-atlas.jsonl");
 try{
  const b=trainedBrain();
  const m=new NativeGoalTextMaze(b,{atlasFile:file,maxStates:250,maxDepth:5});
  const before=0;
  const realCorpus=["She is happy.","She is tired.",
   "He is tired.","He is calm.",
   "Știința este calmă.","Știința este rapidă.",
   "Experiența este rapidă.","Experiența este stabilă."].join("\n");
  const learned=m.observe(realCorpus);
  assert.equal(learned.learned,true);
  assert.equal(m.livedTexts,1);
  assert.ok(b.observedTransformations.operators.size>=6);
  const remembered=b.observedTransformations.seen;
  const correct=m.plan({start:"He is calm.",required:["She","calm"],
   recordAtlas:true,includeTopology:true});
  assert.equal(correct.found,true);
  assert.equal(correct.predicted,"She is calm.");
  assert.equal(correct.plannedBeforeFirstAction,true);
  assert.equal(correct.topology.complete,true,"If all reachable states are explored, report complete");
  assert.equal(correct.diagnostic.outcome,"path-found");
  assert.ok(correct.topology.nodes.some(n=>n.text==="She is calm."));
  const used=correct.actions.map(a=>a.key);
  assert.ok(used.every(Boolean),"Every action must cite an actually learned operator");
  const body=m.execute(correct,{enableNoise:false,trainNoise:false});
  assert.equal(body.solvedInternalGoal,true);
  assert.equal(body.executedFinal,correct.predicted);
  assert.ok(body.atlasExecutionSequence>correct.atlasSequence);
  const impossible=m.plan({start:"He is calm.",required:["unicorn"],
   recordAtlas:true,includeTopology:true});
  assert.equal(impossible.found,false);
  assert.equal(impossible.diagnostic.outcome,"no-path-in-finite-known-closure");
  assert.ok(impossible.diagnostic.missingTargetTokens.includes("unicorn"));
  assert.ok(impossible.diagnostic.causes.includes("missing-observed-goal-concepts"));
  assert.equal(impossible.topology.complete,true);
  const cut=m.plan({start:"He is calm.",required:["She","happy"],
   maxStates:4,maxDepth:1,recordAtlas:true,includeTopology:true});
  assert.equal(cut.topology.complete,false);
  assert.equal(cut.graph.completeKnownOperatorClosure,false);
  assert.ok(cut.graph.unexpandedFrontier>0);
  assert.equal(cut.diagnostic.outcome,"not-found-search-incomplete");
  assert.ok(cut.diagnostic.causes.some(x=>
    x==="state-budget-exhausted"||x==="depth-limit-reached"));
  assert.equal(b.observedTransformations.seen,remembered,
    "No frozen test may leak the wanted answer back into training");
  const orig=m.atlasSummary();
  assert.equal(orig.worldsByDomain.text,1);
  assert.equal(orig.searches,3);
  assert.equal(orig.searchesFound,1);
  assert.equal(orig.searchesFailed,2);
  assert.ok(orig.learnedOperatorEvents>=6);
  assert.ok(orig.journalEvents>12);
  assert.ok(fs.statSync(file).size>1000);
  const page=m.atlasPage({after:0,limit:5});
  assert.equal(page.events.length,5);
  assert.equal(page.nextCursor,5);
  assert.equal(page.hasMore,true);
  const paged=[];let after=0;
  while(true){
   const pg=m.atlasPage({after,limit:3});
   paged.push(...pg.events);
   if(!pg.hasMore)break;
   assert.ok(pg.nextCursor>after,"No endless cursor loop");
   after=pg.nextCursor;
  }
  assert.equal(paged.length,orig.journalEvents);
  assert.ok(paged.every((x,i)=>x.seq===i+1));
  const failures=m.atlasPage({after:0,limit:80,onlyFailed:true});
  assert.equal(failures.events.length,2);
  assert.ok(failures.events.every(x=>x.type==="search"&&!x.found));
  const known=m.atlasOperators({after:0,limit:250});
  assert.equal(known.totalOperators,b.observedTransformations.operators.size);
  assert.ok(known.operators.some(op=>used.includes(op.key)&&op.pathsUsedSuccessful>0));
  assert.ok(known.operators.some(op=>op.pathsUsedSuccessful===0));
  assert.ok(known.operators.some(op=>op.exploredDuringUnsuccessfulSearches>=1),
   "Original failed search explored actual known operator edges, but atlas forgot them");
  assert.ok(known.operators.some(op=>op.executedNativeBodySteps>0),
   "Original body executed real internal learned actions but atlas did not count them");
  assert.ok(known.operators.some(op=>op.exploredDuringSuccessfulSearches>0));
  assert.ok(known.operators.every(op=>
   Number.isSafeInteger(op.blockedByStructuralInvariant)&&
   Number.isSafeInteger(op.exploredDuringUnsuccessfulSearches)));
  assert.ok(orig.exploredInFailedSearchesByOperator);
  assert.ok(orig.executedStepsByOperator);
  m.atlasFlush();
  const exactBytes=fs.readFileSync(file);
  const reloaded=new NativeGoalTextMaze(b,{atlasFile:file,
    maxStates:250,maxDepth:5});
  const restored=reloaded.atlasSummary();
  assert.equal(restored.journalEvents,orig.journalEvents);
  assert.equal(restored.searchesFound,1);
  assert.equal(restored.searchesFailed,2);
  const counted=reloaded.atlasOperators({limit:250});
  assert.deepEqual(counted.operators,known.operators,
   "Atlas must reconstruct exact executed/explored/blocked action counts from journal on restart");
  assert.equal(reloaded.livedTexts,1);
  assert.deepEqual(reloaded.atlasPage({after:5,limit:2}).events,
   m.atlasPage({after:5,limit:2}).events);
  assert.ok(fs.readFileSync(file).equals(exactBytes),
   "Opening the atlas must never rewrite the original training evidence");
  console.log("NATIVE_FULL_ATLAS_RESTART_AND_MISSING_PATHS",JSON.stringify({
   observedTextBytes:Buffer.byteLength(realCorpus),
   learnedOperators:b.observedTransformations.operators.size,
   totalEvents:restored.journalEvents,success:restored.searchesFound,
   failure:restored.searchesFailed,
   missingWordReason:impossible.diagnostic.reason,
   finiteGraphCorrect:correct.topology.complete,
   boundedGraphIncomplete:!cut.topology.complete,
   preservedEveryJournalByte:true,originalBrainUnchanged:true,
   corpusEntireLanguageProved:false}));
  fs.appendFileSync(file,"{\"seq\":");
  assert.throws(()=>new PersistentHypermazeAtlas({file}),/Incomplete trailing atlas|Invalid atlas/,
   "A torn append must fail loudly, not silently lose a learned path");
 }finally{fs.rmSync(tmp,{recursive:true,force:true});}
});
test("atlas operator catalog includes every learned action and distinguishes used paths from unused edges",()=>{
 const b=trainedBrain(),m=new NativeGoalTextMaze(b);
 m.observe(["She is happy.","She is tired.","He is tired.","He is calm."].join("\n"));
 const opCount=b.observedTransformations.operators.size;
 const p=m.plan({start:"He is calm.",required:["She","calm"],recordAtlas:true});
 assert.equal(p.found,true);
 const c=m.atlasOperators({limit:250});
 assert.equal(c.totalOperators,opCount);
 assert.ok(c.operators.some(x=>x.pathsUsedSuccessful>0));
 const u=m.atlasOperators({limit:250,onlyUnused:true});
 assert.ok(u.totalOperators>=0&&u.totalOperators<opCount);
 assert.ok(u.operators.every(x=>x.pathsUsedSuccessful===0));
});

test("multiple separately observed language worlds retain reusable transformations after source-state eviction AND Brain.v8 restart",()=>{
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),"mp-cross-world-atlas-"));
 try{
  const checkpoint=path.join(tmp,"brain-original.v8"),
   atlasFile=checkpoint+".hypermaze-atlas.jsonl";
  const original=trainedBrain(),memory=original.observedTransformations;
  memory.maxObserved=4; // small test-only window proves long-term GLOBAL action retention
  const live=new NativeGoalTextMaze(original,{atlasFile,maxStates:250,maxDepth:5});
  const worlds=["She is happy.","She is tired.",
    "He is tired.","He is calm."];
  for(const text of worlds){
   const report=live.observe(text);
   assert.equal(report.learned,true);
  }
  const actionsBefore=memory.operators.size;
  assert.ok(actionsBefore>=4);
  const first=live.plan({start:"He is calm.",required:["She","calm"],
   recordAtlas:true});
  assert.equal(first.found,true);
  assert.equal(first.predicted,"She is calm.");
  // Later unrelated worlds evict every original source sentence from
  // the short CURRENT exercise context. The global learned operator grammar
  // is still present in the SAME Brain, and the exact corpus is in the atlas.
  for(let i=0;i<12;i++)live.observe("The unrelated observation "+i+
    " carries a different instrument marker.");
  assert.equal(memory.containsSentence("He is calm."),false);
  assert.ok(memory.evicted>=worlds.length);
  assert.ok(memory.operators.size>=actionsBefore);
  const liveAgain=live.plan({start:"He is calm.",required:["She","calm"],
   recordAtlas:true});
  assert.equal(liveAgain.found,true,
   "The model forgot cross-world transformations after a short observation window");
  assert.equal(liveAgain.predicted,"She is calm.");
  original.save(checkpoint);
  live.atlasFlush();
  const bytesBefore=fs.readFileSync(atlasFile);
  const restored=Brain.load(checkpoint);
  const resumed=new NativeGoalTextMaze(restored,{atlasFile,maxStates:250,maxDepth:5});
  assert.ok(resumed.atlasSummary().worldsByDomain.text>=16);
  assert.ok(restored.observedTransformations.operators.size>=actionsBefore);
  const afterRestart=resumed.plan({start:"He is calm.",
   required:["She","calm"],recordAtlas:true});
  assert.equal(afterRestart.predicted,"She is calm.",
   "The exact original learned shape did NOT survive a cross-world Brain.v8 reload");
  const history=resumed.atlasPage({after:0,limit:250,kinds:["world"]});
  assert.ok(history.events.some(x=>x.rawText==="She is happy."));
  assert.ok(history.events.some(x=>x.rawText==="He is calm."));
  assert.ok(fs.readFileSync(atlasFile).subarray(0,bytesBefore.length).equals(bytesBefore),
   "Appending a new route must never overwrite previously lived worlds");
  console.log("NATIVE_CROSS_WORLD_LONG_TERM_TRANSFER",JSON.stringify({
   separateActualWorldEpisodes:worlds.length+12,
   evictedCurrentWindowSources:memory.evicted,
   learnedOperatorsRetained:restored.observedTransformations.operators.size,
   unseenGoalBeforeRestart:liveAgain.predicted,
   unseenGoalAfterRestart:afterRestart.predicted,
   durableOldWorldTextAndPaths:true,
   noReferenceAnswerProvided:true,
   previousTinyStoriesGPUCheckpointNotTouched:true
  }));
 }finally{fs.rmSync(tmp,{recursive:true,force:true});}
});

test("genuine REPLAY across distant segmented worlds discovers a transform absent from the active window and composes an unseen answer before action",{
 timeout:100000
},()=>{
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),"mp-history-replay-"));
 try{
  const checkpoint=path.join(tmp,"brain.v8"),atlasFile=checkpoint+".hypermaze-atlas.jsonl";
  const brain=trainedBrain(),model=brain.observedTransformations;
  model.maxObserved=3; // intentionally tiny current segment memory
  const learner=new NativeGoalTextMaze(brain,{atlasFile,maxStates:250,maxDepth:7});
  const historic=["Alpha moon vessel is calm.","Alpha moon vessel is curious.",
    "Alpha moon vessel is happy."];
  for(const s of historic)learner.observe(s);
  for(let i=0;i<7;i++)
   learner.observe("The unrelated distant story "+i+" uses crystal markers.");
  assert.equal(model.containsSentence(historic[0]),false);
  assert.equal(model.containsSentence(historic[2]),false);
  const live=learner.observe("Beta moon vessel is happy.");
  const focusSequence=live.atlasWorldSequence;
  const heldout="Beta moon vessel is curious.";
  assert.equal(model.containsSentence(heldout),false);
  const query={start:"Alpha moon vessel is calm.",
   required:["Beta","curious"]};
  const before=learner.plan(query);
  assert.equal(before.found,false,
   "This test is invalid: it should need a missing Alpha→Beta action from distant observation");
  const realObservedBefore=model.seen;
  const replay=learner.replayArchivedWorlds({focusSequence,after:0,limit:250});
  assert.ok(replay.historicalWorldsScanned>=3);
  assert.ok(replay.newlyLearnedOperators>=2,
   "The original V17 Brain did NOT discover any missing historical action");
  assert.equal(model.seen,realObservedBefore,
   "Historical rehearsal must never masquerade as new actual corpus observations");
  assert.ok(model.historicalReplays>0);
  const newAction=[...model.operators.values()].find(op=>
    op.kind==="replace"&&op.from==="Alpha"&&op.to==="Beta");
  assert.ok(newAction,
   "Cross-world cold memory must learn exact Alpha→Beta from two originally observed sentences");
  const after=learner.plan(query,{recordAtlas:true});
  assert.equal(after.found,true,
   "The assembled hypermaze still cannot navigate a formerly missing dimension");
  assert.equal(after.predicted,heldout,
   "The original first-action shape failed a new, never-observed composition");
  assert.ok(after.actions.length>=2,
   "The solution should require compositional navigation, not memorized answer replay");
  assert.equal(model.containsSentence(heldout),false);
  const result=learner.execute(after,{trainNoise:false,enableNoise:false,maxSteps:20});
  assert.equal(result.executedFinal,heldout);
  assert.equal(result.solvedInternalGoal,true);
  const atlas=learner.atlasSummary();
  assert.equal(atlas.historicalReplayEvents,1);
  assert.ok(atlas.learnedOperatorEvents>=replay.newlyLearnedOperators);
  brain.save(checkpoint);learner.atlasFlush();
  const again=new NativeGoalTextMaze(Brain.load(checkpoint),
    {atlasFile,maxStates:250,maxDepth:7});
  assert.equal(again.plan(query).predicted,heldout,
   "Cross-world transformation vanished after original Brain.v8 restart");
  console.log("REAL_CROSS_WORLD_ARCHIVE_REPLAY_DISCOVERY",JSON.stringify({
   oldSourceWasEvicted:true,trainingWorldsBeforeFocus:10,
   genuineHistoricWorldsRead:replay.historicalWorldsScanned,
   newOperatorsLearned:replay.newlyLearnedOperators,
   replayNotCountedAsNewCorpus:true,
   firstShapeBeforeReplayFound:before.found,
   firstShapeAfterReplay:after.predicted,
   heldoutAnswerNeverObserved:true,
   executedLearnedPathSteps:result.actions,
   exactBrainAndAtlasResume:true,notGeneralNaturalLanguageUnderstanding:true
  }));
 }finally{fs.rmSync(tmp,{recursive:true,force:true});}
});

test("original Unicode long-world corpus >256 tokens yields actual reusable long-range transformations with ZERO silently rejected source tokens",{
 timeout:120000
},()=>{
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),"mp-full-long-native-"));
 try{
  const save=path.join(tmp,"original-brain.v8");
  const atlasFile=save+".hypermaze-atlas.jsonl";
  const brain=trainedBrain(),learner=new NativeGoalTextMaze(brain,{
   atlasFile,maxStates:150,maxDepth:3});
  const old=Array.from({length:950},(_,i)=>"cuvânt"+i);
  old[421]="veche";
  const revised=old.slice();revised[421]="nouă";
  const textA=old.join(" ")+".",textB=revised.join(" ")+".";
  const before=learner.observe(textA),after=learner.observe(textB);
  assert.equal(before.observed.longUnitsWindowed,1);
  assert.equal(after.observed.longUnitsWindowed,1);
  const model=brain.observedTransformations;
  assert.equal(model.rejectedLong,0,
   "A real original long world was completely DROPPED instead of learned in overlapping contiguous observed contexts");
  assert.equal(model.longUnitsWindowed,2);
  assert.ok(model.longWindowSlices>=8);
  assert.ok(model.operators.size>0);
  const edit=[...model.operators.values()].find(op=>
   op.kind==="replace"&&op.from==="veche"&&op.to==="nouă");
  assert.ok(edit,"Real edit in the middle of 950 original Unicode tokens was not learned");
  const extraWorld=old.slice();
  extraWorld[17]="completNevăzut";
  extraWorld[905]="încăNevăzut";
  const unseenStart=extraWorld.join(" ")+".";
  const unseenTarget=extraWorld.map(x=>x==="veche"?"nouă":x).join(" ")+".";
  assert.ok(!model.containsSentence(unseenTarget));
  assert.ok(!learner.atlasPage({after:0,limit:20}).events.some(x=>x.rawText===unseenTarget));
  const plan=learner.plan({start:unseenStart,required:["nouă"],
   maxStates:150,maxDepth:3,recordAtlas:true,includeTopology:true});
  assert.equal(plan.found,true,JSON.stringify(plan.diagnostic));
  assert.equal(plan.predicted,unseenTarget,
   "Failed to travel through an entirely unseen >950-token long sentence using a verified original edit axis");
  assert.equal(plan.referenceAnswerProvided,false);
  assert.equal(plan.plannedBeforeFirstAction,true);
  assert.ok(plan.initialShape.length>=2);
  const body=learner.execute(plan,{enableNoise:false,trainNoise:false});
  assert.equal(body.solvedInternalGoal,true);
  assert.equal(body.executedFinal,unseenTarget);
  const rows=learner.atlasPage({after:0,limit:250,kinds:["world"]}).events;
  assert.equal(rows.filter(x=>x.rawText===textA).length,1);
  assert.equal(rows.filter(x=>x.rawText===textB).length,1);
  assert.equal(rows.find(x=>x.rawText===textA).utf8Bytes,Buffer.byteLength(textA,"utf8"));
  assert.equal(rows.find(x=>x.rawText===textB).utf8Bytes,Buffer.byteLength(textB,"utf8"));
  assert.equal(rows.find(x=>x.rawText===textA).observedLongUnitWindows,1);
  brain.save(save);learner.atlasFlush();
  const resumed=new NativeGoalTextMaze(Brain.load(save),{
   atlasFile,maxStates:150,maxDepth:3});
  assert.equal(resumed.plan({start:unseenStart,required:["nouă"]}).predicted,unseenTarget);
  const rawTextFromDisk=resumed.atlasPage({after:0,limit:200,kinds:["world"]}).events
   .filter(x=>x.world==="text").map(x=>x.rawText);
  assert.deepEqual(rawTextFromDisk,[textA,textB],
   "The full original Unicode long-sentence bytes must survive real atlas restart, not only small working windows");
  console.log("ORIGINAL_LONG_UNICODE_OBSERVED_COMPLETE_WORLD",JSON.stringify({
   observedOriginalTokensPerEpisode:950,
   modelWorkingTokensPerWindow:model.maxTokens,
   exactLongOriginalUTF8Bytes:Buffer.byteLength(textA)+Buffer.byteLength(textB),
   observedRealLongWindows:model.longWindowSlices,
   originalTextSentencesDropped:model.rejectedLong,
   genuineLearnedMiddleReplacement:edit.from+"→"+edit.to,
   unseenLongTextPredictedBeforeAction:true,
   unseenLongTextExecutedInOriginalBrain:true,
   fullOriginalLongTextReopenedAfterCheckpoint:true,
   externalGeneralSemanticProof:false
  }));
 }finally{fs.rmSync(tmp,{recursive:true,force:true});}
});
