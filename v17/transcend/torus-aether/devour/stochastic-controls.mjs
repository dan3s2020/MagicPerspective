// V17 live stochastic controls: shared server/worker contract, not a browser-only simulation.
// The original deterministic model evaluation is preserved; sampling is reported separately.
import {argmax} from "../emergent.mjs";

export const CONTROL_SCHEMA = Object.freeze({
  wtemp: {min: 0, max: 2, step: .05, value: .6, role: "generation"},
  ttemp: {min: 0, max: 1.5, step: .05, value: .6, role: "evaluation"},
  ltemp: {min: 0, max: 1, step: .05, value: 0, role: "learning"},
  pnoise: {min: 0, max: .3, step: .01, value: 0, role: "perception"},
  gnoise: {min: 0, max: 10, step: 1, value: 3, role: "geometry"},
  glr: {min: .005, max: .1, step: .005, value: .03, role: "geometry"},
  repel: {min: 0, max: 1, step: .05, value: .3, role: "geometry"},
  cthr: {min: .2, max: 1, step: .05, value: .5, role: "concepts"}
});
export const CONTROL_KEYS = Object.freeze(Object.keys(CONTROL_SCHEMA));
export const DEFAULT_CONTROLS = Object.freeze(Object.fromEntries(
  CONTROL_KEYS.map(key => [key, CONTROL_SCHEMA[key].value])
));
export function normalizeControls(input = {}, fallback = DEFAULT_CONTROLS) {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw Error("controls must be an object");
  for (const k of Object.keys(input)) if (!CONTROL_SCHEMA[k]) throw Error("unknown control " + k);
  const out = {...DEFAULT_CONTROLS};
  for (const k of CONTROL_KEYS) {
    const value = input[k] ?? fallback[k] ?? DEFAULT_CONTROLS[k], v = Number(value);
    const rule = CONTROL_SCHEMA[k];
    if (value === "" || value === null || !Number.isFinite(v) || v < rule.min - 1e-10 || v > rule.max + 1e-10)
      throw Error("invalid " + k + ": " + String(value) + " (range " + rule.min + "–" + rule.max + ")");
    const steps = (v - rule.min) / rule.step;
    if (Math.abs(steps - Math.round(steps)) > 1e-6) throw Error(k + " must use step " + rule.step);
    out[k] = Number(v.toFixed(5));
  }
  return out;
}
export function controlsFromQuery(params, current = DEFAULT_CONTROLS) {
  const patch = {};
  for (const k of params.keys()) if (k !== "w") {
    if (!CONTROL_SCHEMA[k]) throw Error("unknown setting " + k);
    const values = params.getAll(k);
    if (values.length !== 1) throw Error("duplicate control " + k);
    patch[k] = values[0];
  }
  if (!Object.keys(patch).length) throw Error("no settings supplied");
  return normalizeControls(patch, current);
}
export function seededRng(seed) {
  let a = seed >>> 0;
  return () => {a = (a + 0x6D2B79F5) >>> 0; let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;};
}
// Independent held-out stochastic measurement: NEVER changes weights, observation ledger, or training RNG.
// The old argmax accuracy is still the canonical deterministic metric, even when T>0.
export function scoreSampling(brain, H, temperature, seed = 1729) {
  if (!Array.isArray(H) || H.length < 5) return {temperature, sampled: null, sampledMasked: null, disagreement: null, n: 0};
  const {chain, e} = brain;
  const keep = chain.rand;
  let sampled = 0, masked = 0, differs = 0, n = 0;
  chain.rand = seededRng(seed);
  try {
    for (let i = 4; i < H.length; i++) {
      const ctx = brain.ctxOf(H, i), h = brain.histOf(H, i), y = H[i];
      const p = chain.play(e, ctx, h).out, pm = chain.play(e, ctx, h, true).out;
      const pred = chain.pick(p, temperature), predM = chain.pick(pm, temperature);
      sampled += pred === y; masked += predM === y;
      differs += pred !== argmax(p); n++;
    }
  } finally {chain.rand = keep;}
  return {temperature, sampled: sampled / n, sampledMasked: masked / n, disagreement: differs / n, n};
}
// Sampling from the trained model's present state, not from held-out answers and not retraining.
export function writeSample(brain, {temperature = .6, length = 240, seed = 9137} = {}) {
  if (!Number.isFinite(temperature) || temperature < 0 || temperature > 2) throw Error("invalid generation temperature");
  if (!Number.isInteger(length) || length < 1 || length > 500) throw Error("invalid sample length");
  const {chain, e} = brain, keep = chain.rand, past = brain.past.slice();
  const out = [];
  chain.rand = seededRng(seed);
  try {
    for (let i = 0; i < length; i++) {
      const ctx = brain.ctxOf(past, past.length), h = brain.histOf(past, past.length);
      const y = chain.pick(chain.play(e, ctx, h).out, temperature);
      out.push(y);
      past.push(y); if (past.length > 64) past.splice(0, 32);
    }
  } finally {chain.rand = keep;}
  return {temperature, bytes: out, text: String.fromCharCode(...out)};
}
