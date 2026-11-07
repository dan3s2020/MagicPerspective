import test from "node:test";
import assert from "node:assert/strict";
import {Brain} from "../transcend/torus-aether/devour/brain.mjs";
const bytes=text=>Array.from(Buffer.from(text,"latin1"));

test("full ORIGINAL frozen evaluator preserves every metric when made responsive and asynchronous",{
 timeout:90000
},async()=>{
 const brain=new Brain({rules:"winner",seed:11});
 const text=bytes(("Q: A world changes its shape when the perspective moves.\n"+
     "A: The path responds to the same underlying rules.\n\n").repeat(5));
 for(const y of text)brain.live(y);
 const heldout=bytes(("Q: A different rule shifts a previously unseen path.\n"+
     "A: The world responds to another transformation.\n\n").repeat(4));
 const frozenBefore={
   chars:brain.chars||0,
   lived:brain.lived,
   trust:[...brain.align.trust.entries()],
   mem:brain.align.mem.n,
   graphNodes:brain.trace.nodes?.size??null
 };
 const expected=brain.test(heldout);
 const phases=[];
 const observed=await brain.testAsync(heldout,(phase,done,total)=>{
   phases.push({phase,done,total});
 });
 assert.deepEqual(observed,expected,
   "Frozen asynchronous tests must be identical, including full suffix AligningGraph accuracy");
 assert.ok(phases.some(p=>p.phase==="frozen original C+graph+field"));
 assert.ok(phases.some(p=>p.phase==="frozen original AligningGraph"));
 assert.equal(phases.at(-1)?.done,heldout.length-4);
 assert.equal(brain.chars||0,frozenBefore.chars);
 assert.equal(brain.lived,frozenBefore.lived);
 assert.deepEqual([...brain.align.trust.entries()],frozenBefore.trust);
 assert.equal(brain.align.mem.n,frozenBefore.mem);
 assert.equal(brain.trace.nodes?.size??null,frozenBefore.graphNodes);
 console.log("V17_REAL_FROZEN_EVALUATION_ASYNC_EXACT",JSON.stringify({
   originalMetrics:Object.keys(observed),fullHeldoutChars:heldout.length,
   originalHeldoutAligned:observed.aligned,
   heartbeatProgressSignals:phases.length,
   noTrainingLeakage:true,samePredictionOutcomes:true}));
});
