// MagicPerspective V17: record the REAL AligningGraph.write() choices.
// No penalty, no reward, no temperature intervention, no new candidate and no learning.
// The 5D values are the already learned coordinates of SYMBOLS (Geometry.U).
// They are not invented embeddings of a whole sentence or proof of quantum physics.
const wrap = d => d - Math.round(d);
const display = bytes => String.fromCharCode(...bytes);
const vec = p => Array.isArray(p) && p.length >= 5 && p.slice(0,5).every(Number.isFinite) ? p.slice(0,5) : null;
const round = n => Number.isFinite(n) ? +n.toFixed(6) : null;

export class TextPathObserver {
  constructor(geo, {temperature, seed, lived = 0, geoSteps = 0} = {}) {
    this.geo = geo; this.temperature = temperature; this.seed = seed;
    this.lived = lived; this.geoSteps = geoSteps;
    this.steps = []; this.states = new Map(); this.transitions = new Map();
    this.prev = null; this.revisits = 0; this.branching = 0; this.positioned = 0;
    this.totalDistance = 0; this.withoutPosition = 0;
  }
  capture({step, history, formHistory, proposals, distribution, selected, trust}) {
    // Read the exact candidate weights used by the original sampler; never change them.
    const candidates = [...distribution].filter(([,w]) => Number.isFinite(w) && w > 0);
    const peak = Math.max(0, ...candidates.map(([,w]) => w));
    const T = this.temperature;
    let normalizer = 0;
    const weighted = candidates.map(([c,w]) => {
      const weight = T === 0 ? (c === selected ? 1 : 0) : Math.pow(w / peak, 1 / T);
      normalizer += weight;
      return {byte:c, weight, raw:w};
    });
    const choices = weighted.map(x => ({
      byte:x.byte, symbol:display([x.byte]), raw:round(x.raw),
      probability: normalizer ? round(x.weight / normalizer) : null
    })).sort((a,b)=>(b.probability??0)-(a.probability??0));
    let entropy = 0;
    for (const x of weighted) {
      const p = normalizer ? x.weight / normalizer : 0;
      if (p > 0) entropy -= p * Math.log2(p);
    }
    const chosen = choices.find(x=>x.byte===selected) || null;
    const before = history.length ? history.at(-1) : null;
    const from5 = before === null ? null : vec(this.geo.U.get(before));
    const to5 = vec(this.geo.U.get(selected));
    const delta5 = from5 && to5 ? from5.map((v,i)=>round(wrap(to5[i]-v))) : null;
    const distance5 = delta5 ? Math.hypot(...delta5) : null;
    if (delta5) { this.positioned++; this.totalDistance += distance5; }
    else this.withoutPosition++;
    const context = display(history.slice(-24)), abstractContext = display(formHistory.slice(-24));
    const contextKey = display(history.slice(-12)), visit = this.states.get(contextKey) || 0;
    if (visit) this.revisits++;
    this.states.set(contextKey,visit+1);
    if (candidates.length > 1) this.branching++;
    const edgeKey = contextKey + "\u0000" + selected;
    const edgeVisit = this.transitions.get(edgeKey) || 0; this.transitions.set(edgeKey,edgeVisit+1);
    const supporting = proposals.filter(p=>p.dist?.has(selected)).map(p=>({
      perspective:p.src, depth:p.d, matchedLength:p.k??null,
      occurrences:p.sup, votes:p.dist.get(selected), totalVotes:p.tot,
      trust:round(trust(p))
    })).sort((a,b)=>b.votes-a.votes);
    this.steps.push({
      step, before, byte:selected, symbol:display([selected]),
      context, abstractContext, contextVisit:visit, edgeVisit,
      alternatives:candidates.length, probability:chosen?.probability??null,
      entropyBits:round(entropy), topChoices:choices.slice(0,6),
      supportingPerspectives:supporting.slice(0,12),
      from5D:from5, to5D:to5, delta5D:delta5, distance5D:round(distance5)
    });
  }
  result() {
    return {
      semantics:"observed actual generator decisions; 5D coordinates are learned symbol positions, not whole-language-state positions",
      temperature:this.temperature, seed:this.seed, livedAtStart:this.lived, geoStepsAtStart:this.geoSteps,
      generated:this.steps.length,
      summary:{
        branchingSteps:this.branching, repeatedContextStates:this.revisits,
        repeatedEdges:this.steps.filter(x=>x.edgeVisit>0).length,
        known5DTransitions:this.positioned, missing5DTransitions:this.withoutPosition,
        torusDistance5D:round(this.totalDistance),
        distinctContextStates:this.states.size
      },
      steps:this.steps
    };
  }
}
