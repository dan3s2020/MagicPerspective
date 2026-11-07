// Isolated V17 graph #0 ablation. No patches to the native Brain or AligningGraph.
export const ARMS = Object.freeze(["full", "no-self", "no-self-fself"]);
export const QUESTIONS = Object.freeze([
  "so",
  "What is E[v] when S_v is empty?",
  "Describe your own graph and available paths.",
  "What is two plus two?"
]);
export const TEMPERATURES = Object.freeze([0, 0.6]);

export function installAblation(align, arm) {
  if (!ARMS.includes(arm)) throw Error("Unknown ablation arm: " + arm);
  if (!align || typeof align.proposals !== "function") throw Error("Expected native AligningGraph");
  if (arm === "full") return () => {};
  const original = align.proposals;
  const removed = new Set(arm === "no-self" ? ["self"] : ["self", "fself"]);
  align.proposals = function (...args) {
    return original.apply(this, args).filter(p => !removed.has(p.src));
  };
  return () => { align.proposals = original; };
}

export function summarizeTrace(trace, temperature) {
  const steps = Array.isArray(trace?.steps) ? trace.steps : [];
  const n = steps.length;
  let empty = 0, singleton = 0, multi = 0, repeated = 0, repeatedEdges = 0;
  let dominance = 0, sumEntropy = 0, validEntropy = 0, supported = 0;
  let memSupport = 0, selfSupport = 0, fselfSupport = 0, formSupport = 0;
  for (const s of steps) {
    const a = Number(s.alternatives) || 0;
    empty += +(a === 0); singleton += +(a === 1); multi += +(a > 1);
    repeated += +(Number(s.contextVisit) > 0);
    repeatedEdges += +(Number(s.edgeVisit) > 0);
    if (temperature > 0) {
      const choices = Array.isArray(s.topChoices) ? s.topChoices : [];
      dominance += +(choices.length && Number(choices[0].probability) >= 0.95);
      if (Number.isFinite(Number(s.entropyBits))) {
        sumEntropy += Number(s.entropyBits); validEntropy++;
      }
    }
    for (const p of s.supportingPerspectives || []) {
      supported++;
      const src = String(p.perspective || "");
      if (src.startsWith("mem")) memSupport++;
      else if (src === "self") selfSupport++;
      else if (src === "fself") fselfSupport++;
      else if (src.startsWith("form")) formSupport++;
    }
  }
  return {
    steps: n, emptySuccessorSteps: empty, singleCandidateSteps: singleton,
    multiCandidateSteps: multi, repeatedContextSteps: repeated,
    repeatedEdges, uniqueContexts: trace?.summary?.distinctContextStates ?? null,
    dominantStepsAt95Pct: temperature > 0 ? dominance : null,
    meanEntropyBits: temperature > 0 && validEntropy ? +(sumEntropy / validEntropy).toFixed(6) : null,
    supportCountsFromTruncatedTop12: {mem: memSupport, self: selfSupport, fself: fselfSupport, form: formSupport, total: supported}
  };
}

export function repeatedEightGrams(s) {
  const seen = new Set();
  let repeated = 0, total = 0;
  for (let i = 0; i + 8 <= s.length; i++) {
    const k = s.slice(i, i + 8);
    if (seen.has(k)) repeated++;
    seen.add(k); total++;
  }
  return total ? +(repeated / total).toFixed(6) : 0;
}
