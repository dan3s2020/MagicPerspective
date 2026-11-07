import test from "node:test";
import assert from "node:assert/strict";
import {causalEpisode,learnMissingCausalBit,evaluateHiddenCausalBit,onlineCausalMemory}
 from "../research/text-hypermaze/discover-hidden-causal-bit.mjs";

const make=(count,seed,loops,lever=true)=>Array.from({length:count},(_,i)=>
 causalEpisode(seed+i*7919,loops[i%loops.length],{lever}));

test("V17 ORIGINAL physics: two identical current 3x3 observations can predict two different NEXT physical futures",()=>{
 const closed=causalEpisode(41,0),open=causalEpisode(45,1);
 assert.deepEqual(closed.currentPatch,open.currentPatch);
 assert.equal(closed.observedNextActionOutcome,false);
 assert.equal(open.observedNextActionOutcome,true);
 assert.equal(closed.queryIssuedAfterHistoryWasFrozen,true);
 assert.equal(open.queryIssuedAfterHistoryWasFrozen,true);
 assert.equal(closed.history.includes(15),false,
  "must not accidentally include center symbol from FUTURE door probe");
 assert.equal(open.history.includes(15),false,
  "must not accidentally include center symbol from FUTURE door probe");
 assert.equal(closed.history.includes(8),false);
 assert.equal(open.history.filter(x=>x===8).length,1);
 console.log("REAL_V17_CAUSAL_PARTIAL_OBSERVATION_ALIASING",JSON.stringify({
  identicalCurrentPatch:true,closedProbeMoves:false,openProbeMoves:true,
  frozenHistoryBeforeProbe:true,noFutureDoorSymbolIncluded:true}));
});
test("three seeds: discover one predictive bit from PRE-PROBE sensory histories, generalize from 0..3 to unseen 4..7 lever tours",()=>{
 const reports=[];
 for(const seed of [17,19,23]){
   const train=make(240,seed*100+1,[0,1,2,3]),
     val=make(100,seed*100+10001,[0,1,2,3]),
     hold=make(200,seed*100+20001,[4,5,6,7]);
   const fitted=learnMissingCausalBit(train,val),result=evaluateHiddenCausalBit(fitted,hold,{seed:seed*13});
   assert.equal(fitted.additionalMemoryBits,1);
   assert.equal(fitted.selectedSymbol,8);
   assert.equal(fitted.validationBaseline,0.5);
   assert.equal(fitted.validationSelected,1);
   assert.equal(result.finalPatchUnique,1);
   assert.equal(result.baselineCorrect,100);
   assert.equal(result.selectedCorrect,200);
   assert.equal(result.lastFourCorrect,100);
   assert.ok(result.scrambledHistoryCorrect<=130,JSON.stringify(result));
   assert.equal(result.noFutureOutcomeIncludedInFeatures,true);
   assert.deepEqual(result.observedUnseenLoopCounts,[4,5,6,7]);
   reports.push({seed,selectedSymbol:fitted.selectedSymbol,
    validationCandidates:fitted.candidateResults,
    unseenFourToSevenTours:result});
 }
 console.log("NATIVE_V17_HIDDEN_BIT_AUTODISCOVERY",JSON.stringify(reports));
});
test("without the hidden lever mechanism, the learner correctly discovers no extra bit; output is already predictable",()=>{
 const train=make(240,341,[0,1,2,3],false),
   val=make(100,90021,[0,1,2,3],false),
   held=make(200,250321,[4,5,6,7],false);
 const fitted=learnMissingCausalBit(train,val),
   result=evaluateHiddenCausalBit(fitted,held);
 assert.equal(fitted.additionalMemoryBits,0);
 assert.equal(fitted.selectedSymbol,null);
 assert.equal(result.selectedCorrect,200);
 assert.equal(result.baselineCorrect,200);
 assert.equal(result.finalPatchUnique,1);
 console.log("REAL_V17_NO_UNNEEDED_CAUSAL_MEMORY",JSON.stringify({
  selected:fitted.selectedSymbol,addedBits:fitted.additionalMemoryBits,
  heldout:result}));
});
test("same learned hidden state bit is maintained online without retaining full local-observation history",()=>{
 const train=make(240,341,[0,1,2,3]),
  val=make(100,90021,[0,1,2,3]),
  fitted=learnMissingCausalBit(train,val);
 assert.equal(fitted.selectedSymbol,8);
 for(const tours of [0,1,2,3,4,5,6,7,16,32,64,128]){
   const episode=causalEpisode(33+tours*1399,tours);
   const summary=onlineCausalMemory(episode,fitted.selectedSymbol);
   assert.equal(summary.historyEntriesRetained,0);
   assert.equal(summary.additionalBits,1);
   assert.equal(summary.bit,Number(episode.observedNextActionOutcome));
   assert.equal(summary.bit,tours%2);
   if([0,1,4,16,64,128].includes(tours))
     console.log("CONSTANT_MEMORY_NATIVE_V17_CAUSAL_HISTORY",JSON.stringify({
       tours,historyObservations:episode.history.length,
       compressedHistoryBits:1,rememberedHistoryEntries:0,
       physicalDoorCanOpen:episode.observedNextActionOutcome}));
 }
});
test("control: shuffling historical observations breaks prediction, but the same final sensory patch is unchanged",()=>{
 const train=make(240,341,[0,1,2,3]),
  val=make(100,90021,[0,1,2,3]),
  hold=make(200,250321,[4,5,6,7]);
 const model=learnMissingCausalBit(train,val),actual=evaluateHiddenCausalBit(model,hold,{seed:29});
 assert.equal(actual.finalPatchUnique,1);
 assert.equal(actual.selectedCorrect,200);
 assert.ok(actual.scrambledHistoryCorrect<130,JSON.stringify(actual));
 console.log("SCRAMBLED_CAUSAL_HISTORY_CONTROL",JSON.stringify({
  original:actual.selectedCorrect,scrambled:actual.scrambledHistoryCorrect,
  baseline:actual.baselineCorrect,identicalPresentPatch:true,
  futureOutcomeDidNotLeak:true}));
});
