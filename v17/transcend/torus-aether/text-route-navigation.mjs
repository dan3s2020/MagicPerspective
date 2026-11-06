// Optional text-route navigation for the real V17 AligningGraph.
// Does not invent transitions, modify training memory, or claim a semantic/4D goal.
// It measures revisited context states and explores alternative *supported* edges.
import {SelfMem} from "./align.mjs";

const form = y => y >= 48 && y <= 57 ? 48 : y;
const chars = seq => String.fromCharCode(...seq);
export function navigateWrittenText(align, prompt, {max = 400, T = .6, rand = Math.random, stop = null, traceLimit = 80} = {}) {
  align.mem.ready(true); align.fmem.ready(true);
  const h = [], fh = [], self = new SelfMem(), fself = new SelfMem(), out = [], visited = new Map(), trace = [];
  const put = y => { h.push(y); fh.push(form(y)); self.add(y); fself.add(form(y)); };
  for (const y of prompt) put(y);
  let revisits = 0, alternativeEdges = 0, singleChoice = 0;
  const temperature = Number.isFinite(T) ? Math.max(0, T) : .6;
  const limit = Math.max(0, Math.min(100000, Math.floor(max)));
  const previousImagining = align.imagining;
  align.imagining = true;
  try {
    for (let step = 0; step < limit; step++) {
      const proposals = align.proposals(h, fh, self, fself), dist = align.distribution(proposals);
      const candidates = [...dist].filter(([, w]) => Number.isFinite(w) && w > 0);
      const context = chars(h.slice(-12));
      const taken = visited.get(context) || new Map();
      const seenState = taken.size > 0;
      if (seenState) revisits++;
      if (candidates.length <= 1) singleChoice++;
      let y = 32;
      if (candidates.length) {
        const peak = Math.max(...candidates.map(([, w]) => w));
        const scored = candidates.map(([c, w]) => {
          let penalty = 0;
          // Controlled experiments: memory-of-edge pressure is best at low T.
          if (temperature <= .75) penalty = 2.5 * (taken.get(c) || 0);
          // At medium T a repeat of a long context is a stronger signal than a common word.
          else if (temperature <= 1.15) {
            for (const [n, factor] of [[8, .65], [12, 1.1], [20, 1.7]]) {
              if (h.length < n) continue;
              const next = chars([...h.slice(-(n - 1)), c]);
              const old = chars(h.slice(Math.max(0, h.length - 4096), -n));
              if (old.includes(next)) penalty += factor;
            }
          }
          const logWeight = Math.log(w / peak) / Math.max(.00001, temperature) - penalty;
          return [c, logWeight];
        });
        if (!temperature) {
          let highest = -Infinity;
          for (const [c, w] of scored) if (w > highest) { highest = w; y = c; }
        } else {
          const top = Math.max(...scored.map(x => x[1]));
          const weights = scored.map(([c, w]) => [c, Math.exp(w - top)]);
          let sum = 0; for (const [, w] of weights) sum += w;
          let r = rand() * sum; y = weights.at(-1)[0];
          for (const [c, w] of weights) { r -= w; if (r <= 0) { y = c; break; } }
        }
      }
      if (stop && stop(y, out)) break;
      const newEdge = seenState && !taken.has(y);
      if (newEdge) alternativeEdges++;
      taken.set(y, (taken.get(y) || 0) + 1); visited.set(context, taken);
      out.push(y); put(y);
      if (traceLimit > 0) {
        // This is the *observed* decision path, not a projected spatial axis.
        const sources = [...new Set(proposals.filter(p => p.dist?.has(y)).map(p => p.src))];
        trace.push({step, state: context.slice(-12), character: String.fromCharCode(y), sources, candidates: candidates.length, revisited: seenState, newEdge});
        if (trace.length > traceLimit) trace.shift();
      }
    }
  } finally { align.imagining = previousImagining; }
  const gram = new Set(); let repeated8 = 0, sentenceEnds = 0;
  for (let i = 0; i + 8 <= out.length; i++) { const s = chars(out.slice(i, i + 8)); if (gram.has(s)) repeated8++; gram.add(s); }
  for (let i = 0; i < out.length; i++) if ((out[i] === 46 || out[i] === 33 || out[i] === 63) && (i + 1 === out.length || out[i + 1] <= 32)) sentenceEnds++;
  return {bytes: out, route: {temperature, generated: out.length, repeated8, repetitionRate8: repeated8 / Math.max(1, out.length - 7), revisits, alternativeEdges, singleChoice, sentenceEnds, visitedStates: visited.size, path: trace}};
}
