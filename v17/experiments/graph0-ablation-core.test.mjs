import test from "node:test";
import assert from "node:assert/strict";
import {AligningGraph} from "../transcend/torus-aether/align.mjs";
import {ARMS, installAblation, summarizeTrace, repeatedEightGrams} from "./graph0-ablation-core.mjs";

test("three explicit arms; native proposal sources filtered without editing prototype", () => {
  const a = new AligningGraph();
  const original = a.proposals;
  a.proposals = () => [
    {src:"mem",y:65}, {src:"form",y:66},
    {src:"self",y:67}, {src:"fself",y:68}
  ];
  const baseline = a.proposals;
  const undo1 = installAblation(a, "no-self");
  assert.deepEqual(a.proposals().map(x => x.src), ["mem", "form", "fself"]);
  undo1();
  assert.equal(a.proposals, baseline);
  const undo2 = installAblation(a, "no-self-fself");
  assert.deepEqual(a.proposals().map(x => x.src), ["mem", "form"]);
  undo2();
  assert.equal(a.proposals, baseline);
  a.proposals = original;
  assert.equal(Object.hasOwn(AligningGraph.prototype, "proposals"), true);
  assert.deepEqual(ARMS, ["full", "no-self", "no-self-fself"]);
  assert.throws(() => installAblation(a, "other"), /Unknown ablation/);
});

test("frozen native AligningGraph generation runs all three arms without changing learning counts", () => {
  const a = new AligningGraph({g: 8});
  a.imagineEvery = 0;
  const corpus = "Q: so\nA: so the code condensed.\n\nQ: yes\nA: yes yes yes.\n\n".repeat(4);
  for (const ch of corpus) a.live(ch.charCodeAt(0));
  a.begin();
  const before = {chars: a.mem.n, trust: a.trust.size, lived: a.lived};
  const original = a.proposals;
  const outputs = [];
  for (const arm of ARMS) {
    const undo = installAblation(a, arm);
    try {
      const out = a.write(Array.from("Q: so\nA: ", x=>x.charCodeAt(0)), {max: 60, T: 0.6, rand:()=>0.31});
      outputs.push(String.fromCharCode(...out));
      assert.equal(out.length, 60);
      assert.deepEqual({chars: a.mem.n, trust: a.trust.size, lived: a.lived}, before);
    } finally { undo(); }
    assert.equal(a.proposals, original);
  }
  assert.equal(outputs.length, 3);
  assert.equal(outputs.every(s => typeof s === "string"), true);
});

test("metrics distinguish singletons, repeated contexts and non-informative T=0 confidence", () => {
  const trace = {steps:[
    {alternatives:1,contextVisit:0,edgeVisit:0,entropyBits:0,topChoices:[{probability:1}],supportingPerspectives:[{perspective:"self"}]},
    {alternatives:3,contextVisit:1,edgeVisit:1,entropyBits:0.6,topChoices:[{probability:0.8}],supportingPerspectives:[{perspective:"mem"}]},
    {alternatives:0,contextVisit:1,edgeVisit:0,entropyBits:0,topChoices:[],supportingPerspectives:[]}
  ],summary:{distinctContextStates:2}};
  const a = summarizeTrace(trace, 0.6);
  assert.equal(a.singleCandidateSteps,1);
  assert.equal(a.multiCandidateSteps,1);
  assert.equal(a.emptySuccessorSteps,1);
  assert.equal(a.repeatedContextSteps,2);
  assert.equal(a.repeatedEdges,1);
  assert.equal(a.dominantStepsAt95Pct,1);
  assert.equal(a.meanEntropyBits,0.2);
  assert.equal(summarizeTrace(trace,0).dominantStepsAt95Pct,null);
  assert.equal(summarizeTrace(trace,0).meanEntropyBits,null);
  assert.equal(repeatedEightGrams("abcdefghabcdefgh"),1/9);
});
