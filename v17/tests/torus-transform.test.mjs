import test from "node:test";
import assert from "node:assert/strict";
import {makeLevel, TWorld, TSEEDS, oracle} from "../transcend/torus-aether/worlds/transform.mjs";
import {CausalOrganism, ImmediateController, liveTask} from "../transcend/torus-aether/worlds/causal.mjs";

const moves = [3, 6, 1, 4];
test("the world: plates reverse, levers persist, doors change what is possible; the oracle solves or proves impossible", () => {
  for (let i = 0; i < 10; i++) { const L = makeLevel(TSEEDS.train + i * 7919, {goals: [["object"], ["self"], ["door"]][i % 3]}); assert.ok(L && L.optimal >= 3); }
  const I = makeLevel(TSEEDS.test + 500000, {goals: ["object"], impossible: true}); assert.equal(oracle(I), null);
});
test("the causal loop discovers itself and the rules, reaches unseen desired configurations and names what is impossible", () => {
  const org = new CausalOrganism(1), base = new ImmediateController(1);
  for (let i = 0, k = 0; k < 60; i++) { const L = makeLevel(TSEEDS.train + i * 7919, {goals: [["object"], ["self"], ["door"]][i % 3]}); if (!L) continue; k++;
    liveTask(L, new TWorld(L, moves), org); liveTask(L, new TWorld(L, moves), base); }
  assert.equal(org.moves().length, 4); assert.ok(org.selfKinds.size >= 3, "itself in several forms: " + org.selfKinds.size);
  let ok = 0, okBase = 0, n = 0; for (let i = 0; n < 12; i++) { const L = makeLevel(TSEEDS.test + i * 7919, {goals: [["object", "self"], ["self", "door"], ["object", "door"]][i % 3]}); if (!L) continue; n++;
    ok += liveTask(L, new TWorld(L, moves), org).solved; okBase += liveTask(L, new TWorld(L, moves), base).solved; }
  assert.ok(ok >= 9, "unseen desired configurations reached: " + ok + "/12"); assert.ok(ok > okBase + 4, "better than immediate rewards: " + ok + " vs " + okBase);
  let said = 0; for (let i = 0, m = 0; m < 4; i++) { const L = makeLevel(TSEEDS.test + 500000 + i * 7919, {goals: [["object"], ["self"]][i % 2], impossible: true}); if (!L) continue; m++; said += liveTask(L, new TWorld(L, moves), org).said === "limitation"; }
  assert.equal(said, 4);
});
