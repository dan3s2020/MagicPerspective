// Isolated mathematics world for testing the ORIGINAL V17 Discoverer.shape().
// Each traversable tile is a symbolic equation state, never an arbitrary corridor.
// All transitions are legal, exact equivalence-preserving transformations.
// This does NOT claim learned symbolic rules or general mathematical competence.
import {Discoverer, KIND, makeMaze, playExercise, seedOf, SEEDS} from "./exercise.mjs";
import {ACTIONS} from "./labyrinth.mjs";

function gcd(a, b) { a = Math.abs(a); b = Math.abs(b); while (b) [a, b] = [b, a % b]; return a || 1; }
export function rational(n, d = 1) {
  if (!Number.isSafeInteger(n) || !Number.isSafeInteger(d) || d === 0)
    throw new RangeError("Unsafe or zero rational denominator");
  if (d < 0) { n = -n; d = -d; }
  const g = gcd(n, d); return Object.freeze({n: n / g, d: d / g});
}
const minusInteger = (r, k) => rational(r.n - k * r.d, r.d);
const overInteger = (r, k) => rational(r.n, r.d * k);
export const equalRational = (u, v) => u.n === v.n && u.d === v.d;

function state(stage, a, b, c) { return Object.freeze({stage, a, b, c}); }
function equivalentSolution(s) {
  if (!s || s.a === 0) throw new Error("Degenerate equation needs a separate goal class");
  return s.stage === "factored" ? minusInteger(overInteger(s.c, s.a), s.b) : overInteger(minusInteger(s.c, s.b), s.a);
}
function sameState(u, v) {
  return Boolean(u && v && u.stage === v.stage && u.a === v.a && u.b === v.b && equalRational(u.c, v.c));
}
export function applyMathRule(s, rule) {
  if (s.stage === "factored" && rule === "divide") return state("divided", 1, s.b, overInteger(s.c, s.a));
  if (s.stage === "factored" && rule === "distribute") return state("expanded", s.a, s.a * s.b, s.c);
  if (s.stage === "divided" && rule === "subtract") return state("isolated", 1, 0, minusInteger(s.c, s.b));
  if (s.stage === "expanded" && rule === "subtract") return state("offset", s.a, 0, minusInteger(s.c, s.b));
  if (s.stage === "offset" && rule === "divide") return state("isolated", 1, 0, overInteger(s.c, s.a));
  return null;
}
export function verifyMathTransition(from, rule, to) {
  const actual = applyMathRule(from, rule);
  return Boolean(actual && sameState(actual, to) &&
    equalRational(equivalentSolution(from), equivalentSolution(to)));
}
const isGoal = s => s.stage === "isolated" && s.a === 1 && s.b === 0;
export function printRational(r) { return r.d === 1 ? String(r.n) : r.n + "/" + r.d; }
export function printEquation(s) {
  if (s.stage === "factored") return s.a + "(x + " + s.b + ") = " + printRational(s.c);
  const lhs = s.a === 1 ? "x" : s.a + "x";
  return lhs + (s.b ? " + (" + s.b + ")" : "") + " = " + printRational(s.c);
}
function index(n, x, y) { return y * n + x; }
function next(n, p, direction) {
  const d = ACTIONS[direction], x = p % n + d[0], y = Math.floor(p / n) + d[1];
  return x < 0 || y < 0 || x >= n || y >= n ? -1 : index(n, x, y);
}

// The graph is built from transformations, not from the numerical answer.
// Two legal derivations are intentionally present. The semantic edges are
// inspected/verified independently of the geometry and prior to evaluation.
export function makeMathWorld(a, b, c, {mirror = false} = {}) {
  if (!Number.isSafeInteger(a) || a === 0 || Math.abs(a) < 2 || Math.abs(a) > 9 ||
      !Number.isSafeInteger(b) || b === 0 || Math.abs(b) > 12 ||
      !Number.isSafeInteger(c) || Math.abs(c) > 80) throw new RangeError("Unsupported benchmark equation");
  const n = 9, start = index(n, 4, 4), cells = new Map(), edges = new Map();
  const ret = new Array(n * n).fill(KIND.wall);
  const put = (x, y, s) => { const p = index(n, x, y); cells.set(p, s); ret[p] = isGoal(s) ? KIND.target : KIND.floor; return p; };
  const s0 = state("factored", a, b, rational(c)), initial = put(4, 4, s0);
  ret[initial] = KIND.self;
  const branch = (sign, rules) => {
    let x = 4, p = initial, s = s0;
    for (const rule of rules) {
      x += sign; const nextState = applyMathRule(s, rule);
      if (!nextState || !verifyMathTransition(s, rule, nextState)) throw new Error("Invalid generated rule");
      const q = put(x, 4, nextState);
      const dir = ACTIONS.findIndex(([dx, dy]) => dx === sign && dy === 0);
      edges.set(p + ":" + q, {from:p, to:q, action:dir, rule, fromState:s, toState:nextState});
      p = q; s = nextState;
    }
    if (!isGoal(s)) throw new Error("Unsolved branch");
  };
  branch(mirror ? 1 : -1, ["divide", "subtract"]);
  branch(mirror ? -1 : 1, ["distribute", "subtract", "divide"]);
  if (cells.size !== 6) throw new Error("Aliased mathematical states in geometry");
  return Object.freeze({a, b, c, n, ret, start, cells, edges, question:printEquation(s0)});
}

// Freeze the original prediction BEFORE taking any actions; then execute each
// move only if it corresponds to a verifiably legal symbolic rewrite.
export function evaluateMathShape(world, discoverer) {
  if (!(discoverer instanceof Discoverer) || typeof Discoverer.prototype.shape !== "function")
    throw new TypeError("Requires original V17 Discoverer");
  const frozen = discoverer.shape(world.ret.slice(), world.n, world.start);
  let pos = world.start, valid = true, steps = [], stopped = false;
  for (const direction of frozen || []) {
    const q = next(world.n, pos, direction);
    const edge = world.edges.get(pos + ":" + q);
    if (!edge || !verifyMathTransition(edge.fromState, edge.rule, edge.toState)) {
      valid = false; break;
    }
    steps.push({rule:edge.rule, from:printEquation(edge.fromState),
      to:printEquation(edge.toState), fromCell:pos, toCell:q});
    pos = q;
    if (world.ret[pos] === KIND.target) { stopped = true; break; }
  }
  return {problem:world.question, predictedBeforeAction:Array.isArray(frozen),
    solved:valid && stopped && world.ret[pos] === KIND.target,
    validSteps:valid, optimalSteps:2, steps:steps.length,
    answer:stopped ? printRational(equivalentSolution(world.cells.get(pos))) : null,
    trace:steps, frozenDirections:frozen};
}

// Original Discovery mechanism learns self/action effects, conductance,
// goal attraction and trust from actual V17 maze episodes; no target answers
// from the held-out math equations are used during calibration.
export function trainOriginalDiscoverer(episodes = 100, seed = 11) {
  const d = new Discoverer(seed);
  for (let i = 0; i < episodes; i++)
    playExercise(makeMaze(seedOf(SEEDS.train, i), 9), d);
  return d;
}
