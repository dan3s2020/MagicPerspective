import test from "node:test";
import assert from "node:assert/strict";
import {Discoverer, KIND} from "../transcend/torus-aether/worlds/exercise.mjs";
import {
  rational, equalRational, applyMathRule, verifyMathTransition,
  makeMathWorld, evaluateMathShape, trainOriginalDiscoverer, printRational
} from "../transcend/torus-aether/worlds/math.mjs";

test("exact symbolic algebra: each edge preserves solution, including fractions and negatives", () => {
  for (const a of [-9, -4, -2, 2, 3, 8])
    for (const b of [-11, -3, 2, 12])
      for (const c of [-79, -11, 1, 73])
        for (const mirror of [false, true]) {
          const w = makeMathWorld(a, b, c, {mirror});
          assert.equal(w.cells.size, 6);
          assert.equal(w.edges.size, 5);
          assert.equal(w.ret.filter(x => x === KIND.target).length, 2);
          for (const e of w.edges.values()) {
            assert.ok(verifyMathTransition(e.fromState, e.rule, e.toState), e.rule);
            const bad = {...e.toState, c:rational(e.toState.c.n + 1, e.toState.c.d)};
            assert.ok(!verifyMathTransition(e.fromState, e.rule, bad), "must reject a modified result");
          }
        }
});
test("an illegal rule is rejected; a=0 is not silently solved by division", () => {
  const w = makeMathWorld(3, 2, 11);
  const initial = w.cells.get(w.start);
  assert.equal(applyMathRule(initial, "subtract"), null);
  assert.throws(() => makeMathWorld(0, 2, 11), /Unsupported/);
  assert.throws(() => rational(2, 0), /denominator/);
  assert.ok(equalRational(rational(-2, -4), rational(1, 2)));
});
test("original V17 Discoverer.shape predicts legal math derivations BEFORE action on unseen coefficients", () => {
  const d = trainOriginalDiscoverer(140, 11);
  assert.ok(d.self() >= 0, "organism must learn its body");
  assert.ok(d.attract(KIND.target) > .2, "organism must learn the goal, not receive its hidden numerical solution");
  assert.ok(d.conduct(KIND.wall) < .5, "organism must learn the resistance of walls");
  let predictions = 0, successes = 0, valid = 0, shortest = 0, total = 0;
  let seed = 0x17c0ffee;
  const rng = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  for (let i = 0; i < 200; i++) {
    const a = (rng() < .5 ? -1 : 1) * (2 + Math.floor(rng() * 8));
    const b = (rng() < .5 ? -1 : 1) * (1 + Math.floor(rng() * 12));
    const c = Math.floor(rng() * 161) - 80, mirror = i % 2 === 1;
    const w = makeMathWorld(a,b,c,{mirror});
    const r = evaluateMathShape(w,d);
    total++; predictions += Number(r.predictedBeforeAction);
    successes += Number(r.solved); valid += Number(r.validSteps);
    shortest += Number(r.steps === r.optimalSteps);
    assert.equal(r.answer, printRational(rational(c - a*b, a)), "exact symbolic answer");
    assert.ok(r.solved, JSON.stringify({i,a,b,c,mirror,r}));
    assert.equal(r.steps, 2, "expected shortest first-action route");
  }
  console.log("MATH_NATIVE_SHAPE_HELDOUT",JSON.stringify({total,predictions,successes,valid,shortest,trainingMazeEpisodes:140,algorithm:"Discoverer.prototype.shape",mathRuleLearning:false}));
  assert.equal(successes,200);
});
test("frozen predictions depend only on original retinal geometry: no numeric-answer leakage", () => {
  const d = trainOriginalDiscoverer(140, 11);
  const a = makeMathWorld(3, 2, 11), b = makeMathWorld(-7, 11, -43);
  assert.deepEqual(a.ret,b.ret,"same geometry has same retinal input regardless of mathematical answer");
  let captured;
  const real = Discoverer.prototype.shape;
  d.shape = function(ret,n,me) { captured = {ret,n,me}; return real.call(this,ret,n,me); };
  const r = evaluateMathShape(a,d);
  assert.equal(r.solved,true);
  assert.ok(Array.isArray(captured.ret) && captured.ret.every(k => Number.isInteger(k) && k >= 0 && k <= 3));
  assert.deepEqual(Object.keys(captured).sort(),["me","n","ret"]);
  assert.deepEqual(r.frozenDirections,evaluateMathShape(b,d).frozenDirections);
  const noGoal = makeMathWorld(3,2,11);
  const altered = {...noGoal,ret:noGoal.ret.map(k => k === KIND.target ? KIND.wall : k)};
  assert.equal(evaluateMathShape(altered,d).predictedBeforeAction,false);
});
