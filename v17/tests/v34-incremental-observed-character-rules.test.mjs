import test from "node:test";
import assert from "node:assert/strict";
import {Brain} from "../transcend/torus-aether/devour/brain.mjs";
import {v34LiveResearch}
 from "../research/text-hypermaze/v34-live-research.mjs";

test("V34 real original V17 corpus: only NEW observed word contrasts produce incremental character rules and a frozen Unicode path in unseen context",()=>{
 const brain=new Brain({seed:11,rules:{depth:1,off:["R2","R4"],
  budEvery:100,empty:true,maxWires:32,fold:false}});
 const native=brain.observedTransformations;
 for(const s of [
  "The cat is near.","The cot is near.",
  "The bat is near.","The bot is near."
 ])native.observeSentence(s);
 const initial=v34LiveResearch(brain,{type:"character-status"});
 assert.equal(initial.operation,"real-original-V17-corpus-to-Unicode-transformations");
 assert.ok(initial.acceptedMinimalOneCharacterContrasts>=4,
  "Original corpus MUST actually reveal the one-character swaps");
 assert.ok(initial.structurallyReusableHypotheses>=1,
  "At least the a-to-o letter transfer must be discoverable from two previously seen contexts");
 assert.equal(initial.sourceIsNotIndependentPhysics,true);
 assert.ok(initial.rules.some(r=>r.from==="a"&&r.to==="o"));
 const repeat=v34LiveResearch(brain,{type:"character-status"});
 assert.equal(repeat.scannedOriginalSentencePairs,initial.scannedOriginalSentencePairs,
  "Re-reading status without new corpus must never reconstruct or duplicate old evidence");
 assert.equal(repeat.acceptedMinimalOneCharacterContrasts,
  initial.acceptedMinimalOneCharacterContrasts);
 const before=JSON.stringify(native.report());
 const heldout="The mat is near.",goal={5:"o"};
 assert.equal(native.containsSentence(heldout),false);
 const denied=v34LiveResearch(brain,{type:"character-plan",
  start:heldout,charSlots:goal,allowCorpusHypotheses:false,
  maxNodes:200,maxDepth:2});
 assert.equal(denied.found,false);
 const plan=v34LiveResearch(brain,{type:"character-plan",
  start:heldout,charSlots:goal,allowCorpusHypotheses:true,
  maxNodes:200,maxDepth:2});
 assert.equal(plan.found,true,JSON.stringify(plan.depthAndNodeDesignLimits).slice(0,750));
 assert.ok(plan.plannedBeforeAnyPhysicalAction);
 assert.ok(plan.candidatePath.some(p=>p.to==="The mot is near."),
  "An unseen word must be reachable by a previously observed one-character change");
 assert.equal(plan.externalPhysicalCorrectnessProven,false);
 assert.equal(plan.original5DCoordinatePathProven,false);
 assert.equal(JSON.stringify(native.report()),before,
  "V34 examination must not train on new question or on its goal");
 for(const s of ["The rat is near.","The rot is near."])native.observeSentence(s);
 const upgraded=v34LiveResearch(brain,{type:"character-status"});
 assert.ok(upgraded.acceptedMinimalOneCharacterContrasts>
  initial.acceptedMinimalOneCharacterContrasts);
 assert.ok(upgraded.scannedOriginalSentencePairs>=
  initial.scannedOriginalSentencePairs);
 assert.equal(upgraded.extraction,
  "INCREMENTAL_EVIDENCE_FROM_ALREADY_OBSERVED_ORIGINAL_CORPUS");
 const again=v34LiveResearch(brain,{type:"character-status"});
 assert.equal(again.scannedOriginalSentencePairs,
  upgraded.scannedOriginalSentencePairs);
 console.log("V34_INCREMENTAL_SOURCE_WORD_TO_UNSEEN_CHARACTER_PATH_PASS",JSON.stringify({
  corpusSentencePairs:upgraded.scannedOriginalSentencePairs,
  reusableUnicodeRules:upgraded.structurallyReusableHypotheses,
  genuinelyUnseenInput:heldout,proposedNext:"The mot is near.",
  originalBrain:brain.constructor.name,
  noOracleGoldDuringPlanning:true,
  independentPhysicalValidationNotClaimed:true,
  duplicateRebuildingPrevented:true
 }));
});
