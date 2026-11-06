import test from "node:test";
import assert from "node:assert/strict";
import {AligningGraph} from "../transcend/torus-aether/align.mjs";
import {navigateWrittenText} from "../transcend/torus-aether/text-route-navigation.mjs";

const examples = [
 "Q: Find the recursive formula for K even.\nA: Okay, I need to solve this problem. The pattern for K=1 is a base case. For even K, split the positions and compare the results. Therefore the recurrence follows from the smaller case.\n\n",
 "Q: How do two players take turns?\nA: In this game, two players alternate turns modifying the configuration. If a position has no legal move, the previous player wins. For each position we calculate its successor states.\n\n",
 "Q: Explain how to solve a labyrinth.\nA: First identify the starting position and the goal. Discover the neighboring passages, then follow a path that reduces the distance to the exit. If blocked, explore an alternative route.\n\n",
 "Q: Explain an experiment.\nA: The experiment changes one parameter while keeping the other conditions fixed. We compare measured results on unseen cases to determine whether the hypothesis is supported.\n\n"
];
const corpus = Array.from({length:55}, (_, i) => examples[i % examples.length]).join("");
const rng = seed => () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
const ascii = s => [...s].map(c => c.charCodeAt(0));
const str = bytes => String.fromCharCode(...bytes);
function repetition8(s) {
  const grams = new Set(); let count = 0;
  for (let i = 0; i + 8 <= s.length; i++) {
    const g = s.slice(i, i + 8); if (grams.has(g)) count++; grams.add(g);
  }
  return count / Math.max(1, s.length - 7);
}
function known5(s) {
  const known = new Set(); for (let i = 0; i + 5 <= corpus.length; i++) known.add(corpus.slice(i, i + 5));
  let matched = 0; for (let i = 0; i + 5 <= s.length; i++) matched += +known.has(s.slice(i, i + 5));
  return matched / Math.max(1, s.length - 4);
}
function trained() {
  const a = new AligningGraph({g:8}); a.imagineEvery = 0;
  for (const c of corpus) a.live(c.charCodeAt(0));
  a.mem.lazy = true; a.fmem.lazy = true; a.mem.ready(true); a.fmem.ready(true);
  return a;
}
test("opt-in route navigator samples only supported characters and is deterministic for the same checkpoint + seed", () => {
  const graph = trained(), n = graph.mem.n, trust = graph.trust.size;
  const x = navigateWrittenText(graph, ascii("A: "), {max:230, T:.6, rand:rng(19)});
  const y = navigateWrittenText(graph, ascii("A: "), {max:230, T:.6, rand:rng(19)});
  assert.deepEqual(x, y);
  assert.equal(x.bytes.length, 230); assert.equal(x.route.generated, 230);
  assert.equal(graph.mem.n, n); assert.equal(graph.trust.size, trust);
  assert.equal(graph.imagining, false);
  assert.ok(x.route.path.every(p => p.candidates >= 1 && p.sources.length >= 1));
  assert.ok(x.route.path.every(p => typeof p.state === "string" && typeof p.character === "string"));
});
test("on a controlled looping text corpus, route memory improves repetition without destroying known 5-gram structure", () => {
  const graph = trained(), seeds = [2,7,11,19,29,47], prompt = ascii("A: "), T = .6, max = 450;
  const results = seeds.map(seed => {
    const baseline = str(graph.write(prompt, {max, T, rand:rng(seed)}));
    const routed = navigateWrittenText(graph, prompt, {max, T, rand:rng(seed)});
    return {seed, baseRepeat8: repetition8(baseline), routedRepeat8: repetition8(str(routed.bytes)), baseKnown5:known5(baseline), routeKnown5:known5(str(routed.bytes)), alternativeEdges:routed.route.alternativeEdges};
  });
  const avg = key => results.reduce((s,r)=>s+r[key],0)/results.length;
  console.log("REAL_V17_LOOP_ESCAPE_CONTROLLED", JSON.stringify(results));
  assert.ok(avg("routedRepeat8") < avg("baseRepeat8") - .05, "fewer repeated paths over 6 unseen random seeds");
  assert.ok(avg("routeKnown5") >= avg("baseKnown5") - .03, "preserve grounding in observed character sequences");
  assert.ok(results.some(r=>r.alternativeEdges>0), "at least one explored alternative edge from a revisited state");
});
test("high temperature retains freedom; forced transitions cannot be fabricated", () => {
  const graph = trained();
  for (const T of [0,.95,1.3,1.8]) {
    const r = navigateWrittenText(graph, ascii("A: "), {max:100,T,rand:rng(13),traceLimit:20});
    assert.equal(r.bytes.length,100);
    assert.ok(Number.isFinite(r.route.repetitionRate8));
    assert.ok(r.route.path.length <= 20);
  }
  const empty = new AligningGraph();
  const r = navigateWrittenText(empty, [], {max:30,T:.6,rand:rng(11)});
  assert.equal(r.route.generated,30);
  assert.equal(r.route.singleChoice,30);
  assert.ok(r.bytes.every(c=>c===32), "no invented connection when no proposal exists");
});
