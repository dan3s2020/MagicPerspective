import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {Brain} from "../transcend/torus-aether/devour/brain.mjs";
import {NativeCrossEpisodeTransfer} from "../research/text-hypermaze/cross-episode-native.mjs";
import {NativeWorldAtlas} from "../research/text-hypermaze/native-world-atlas.mjs";
import {NativeAtlasRuntime} from "../research/text-hypermaze/native-atlas-server.mjs";

const rules={depth:1,off:["R2","R4"],budEvery:100,
 empty:true,maxWires:32,fold:false};
function build(){
 const b=new Brain({rules,seed:17});
 const paragraphs=[
  "The metal is cold. The metal is warm.",
  "The planet is cold. The planet is warm.",
  "The room is cold. The room is warm.",
  "The glass is cold. The glass is warm."
 ];
 for(const p of paragraphs)b.observedTransformations.observeText(p);
 assert.ok(b.observedTransformations.operators.size>=2);
 assert.ok(b.observedTransformations.records.size>=8);
 return b;
}
test("Original V17 observed text-contrast paths are present in the GLOBAL atlas without being promoted to a witnessed causal effect",()=>{
 const b=build(),engine=new NativeCrossEpisodeTransfer(b),
  atlas=new NativeWorldAtlas(b);
 const report=atlas.summary();
 assert.ok(report.originalNativeTextObservations>=8);
 assert.ok(report.originalNativeTextOperators>=2);
 assert.equal(report.witnessedEvents,0);
 assert.equal(report.trainedRules,0);
 assert.equal(report.nativeTextContrastsUsedAsPhysicalActions,false);
 assert.equal(engine.summary().reusableActions,0);
 const operators=atlas.page("textOperators",{offset:0,limit:1000});
 assert.equal(operators.total,b.observedTransformations.operators.size);
 assert.ok(operators.items.every(op=>op.admittedAsPhysicalTransformation===false));
 assert.ok(operators.items.some(op=>op.evidence.some(e=>e.from.includes("cold"))));
 const states=atlas.page("textStates",{offset:0,limit:1000});
 assert.equal(states.total,b.observedTransformations.records.size);
 assert.ok(states.items.some(x=>x.text.includes("warm")));
 const before=JSON.stringify(b.observedTransformations.report());
 const all=atlas.globalTopology({nodeLimit:1000,edgeLimit:2000});
 assert.ok(all.totalNodes>=8);
 assert.ok(all.textContrastEdges>=2);
 assert.equal(all.witnessedPhysicalEdges,0);
 assert.equal(all.nativeTextContrastRules,operators.total);
 assert.ok(all.edges.some(e=>e.status==="TEXT_CONTRAST_OBSERVED_NOT_CAUSAL"));
 assert.ok(all.nodes.some(n=>n.observedInTextCorpus&&!n.observedInRealWorld));
 assert.equal(all.noPhysicalClaimsFromCorpusTextContrasts,true);
 assert.equal(JSON.stringify(b.observedTransformations.report()),before,
  "Read-only atlas must NEVER train/rewrite original contrast operators");
 const second=atlas.globalTopology({nodeOffset:3,nodeLimit:2,edgeOffset:1,edgeLimit:2});
 assert.equal(second.nodes.length,2);assert.equal(second.edges.length,2);
 assert.equal(second.totalNodes,all.totalNodes);
 assert.equal(second.totalEdges,all.totalEdges);
 assert.equal(engine.summary().reusableActions,0);
});
test("Original V17 corpus text operators remain available after one original Brain checkpoint; raw eviction is honestly reported",()=>{
 const b=build();
 b.observedTransformations.maxObserved=8;
 b.observedTransformations.observeText("The fabric is cold. The fabric is warm.");
 assert.ok(b.observedTransformations.evicted>0);
 const model=new NativeCrossEpisodeTransfer(b);
 const atlas=new NativeWorldAtlas(b);
 assert.equal(atlas.summary().originalTextFullRawHistoryRetained,false);
 const folder=fs.mkdtempSync(path.join(os.tmpdir(),"mp-v30-existing-native-text-"));
 try{
  const file=path.join(folder,"original-v17.v8");b.save(file);
  const restored=Brain.load(file),runtime=new NativeAtlasRuntime(restored,{out:folder});
  assert.ok(runtime.status().originalNativeText.learnedTextContrastOperators>=2);
  assert.equal(runtime.status().originalNativeText.fullPastRawTextStatesRetained,false);
  assert.equal(runtime.atlas.page("textOperators",{limit:1000}).total,
    b.observedTransformations.operators.size);
  const all=runtime.atlas.globalTopology({nodeLimit:1000,edgeLimit:1000});
  assert.ok(all.textContrastEdges>=2);
  assert.ok(all.nativeTextStatesEvicted>0);
  assert.equal(all.allSourceHistoryPermanent,false);
  assert.equal(runtime.engine.summary().reusableActions,0,
    "Contrasts are NOT action-labelled observed physics");
 }finally{fs.rmSync(folder,{recursive:true,force:true});}
});
