// An organism-owned, experience-trained choice of where/how much randomness to use.
// Decisions are made BEFORE an action/symbol is observed; feedback uses only lived
// before/after, observed task completion and prediction correctness. No BFS oracle.
// This class is serialized inside Brain.v8, not a UI-controlled random-number display.
const ARMS = Object.freeze([
  {site: 'none', strength: 0},
  {site: 'perception', strength: 0.12},
  {site: 'perception', strength: 0.42},
  {site: 'imagination', strength: 0.35},
  {site: 'imagination', strength: 1.0},
  {site: 'action', strength: 0.25},
  {site: 'action', strength: 1.0},
]);
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
export class NoiseAgency {
  constructor(seed = 1) {
    this.rng = (seed ^ 0x9e3779b9) >>> 0 || 1;
    this.policy = new Map();         // domain + locally observable uncertainty -> statistics per choice
    this.total = 0; this.noisy = 0; this.earned = 0;
    this.bySite = {none: 0, perception: 0, imagination: 0, action: 0};
    this.last = null;
    this.recent = [];
    this.seen = new Set();           // capped novelty memory; not an oracle or target solution
  }
  random() {
    let x = this.rng >>> 0;
    x ^= x << 13; x ^= x >>> 17; x ^= x << 5;
    this.rng = x >>> 0 || 1;
    return this.rng / 4294967296;
  }
  int(n) { return Math.floor(this.random() * n); }
  table(key) {
    let t = this.policy.get(key);
    if (!t) { t = ARMS.map(() => ({n: 0, total: 0})); this.policy.set(key, t); }
    return t;
  }
  // Input contains only the organism's own state of knowledge, never a teacher
  // route, map distance, privileged simulator mechanics or a correct answer.
  decide({domain, known = false, planned = false} = {}) {
    if (!['maze', 'transform', 'text'].includes(domain)) throw Error('Unknown noise domain');
    const key = domain + ':' + (known ? 'known' : 'unknown') + ':' + (planned ? 'plan' : 'search');
    const table = this.table(key), N = table.reduce((n, arm) => n + arm.n, 0);
    // Contextual bandit: every mode is genuinely available, including ZERO.
    // Exploration is chosen by the organism's own saved RNG and uncertainty.
    // Scores are derived from its *previous lived outcomes*, not from an
    // externally specified global noise rate or pre-scripted schedule.
    const indices = domain === 'text' ? [0, 1, 2, 3, 4] : ARMS.map((_, i) => i);
    let best = -Infinity, choices = [];
    for (const i of indices) {
      const a = table[i];
      const value = a.n ? a.total / a.n : 0;
      const uncertainty = 0.45 * Math.sqrt(Math.log(N + 2) / (a.n + 1));
      const estimate = value + uncertainty + (a.n === 0 ? 0.15 : 0);
      if (estimate > best + 1e-12) { best = estimate; choices = [i]; }
      else if (Math.abs(estimate - best) <= 1e-12) choices.push(i);
    }
    const arm = choices[this.int(choices.length)], selected = ARMS[arm];
    return {domain, key, arm, site: selected.site, strength: selected.strength};
  }
  // Disturb an INTERNAL COPIED perception only; actual physics is unchanged.
  perceive(values, decision) {
    if (decision?.site !== 'perception') return values;
    const a = values.slice();
    if (a.length < 2) return a;
    const edits = Math.max(1, Math.min(3, Math.ceil(a.length * decision.strength / 30)));
    for (let k = 0; k < edits; k++) {
      const i = this.int(a.length), j = this.int(a.length);
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
  // A selected action portal can emit a different output. The organism can
  // choose no noise, a weaker intervention, or a stronger intervention.
  output(action, count, decision, alternatives = null) {
    if (!decision || !['action', 'imagination'].includes(decision.site) || this.random() >= decision.strength) return action;
    const options = alternatives?.length ? alternatives : Array.from({length: count}, (_, i) => i);
    const others = options.filter(x => x !== action);
    return others.length ? others[this.int(others.length)] : action;
  }
  // Reward is environmental evidence, never a supplied ideal path:
  // a new observation is interesting, no effect is usually costly,
  // and the world actually ending in success is useful.
  // For text the only signal is whether the chosen predicted symbol was
  // subsequently observed; this is not a linguistic-understanding reward.
  learn(decision, {before = null, after = null, solved = false, correct = null} = {}) {
    if (!decision) return null;
    let reward = 0, changed = false, novel = false;
    if (correct !== null) reward = correct ? 0.65 : -0.25;
    else {
      if (!Array.isArray(before) || !Array.isArray(after)) throw Error('Real before/after required');
      changed = before.length !== after.length || before.some((v, i) => v !== after[i]);
      const signature = decision.domain + ':' + after.join(',');
      novel = !this.seen.has(signature);
      this.seen.add(signature);
      if (this.seen.size > 4096) this.seen.delete(this.seen.values().next().value);
      reward = (changed ? 0.18 : -0.16) + (novel ? 0.06 : 0) + (solved ? 2.0 : 0);
    }
    if (decision.site !== 'none') reward -= 0.035;   // interventions must justify their cost
    const arm = this.table(decision.key)[decision.arm];
    arm.n++; arm.total += reward;
    this.total++; this.earned += reward;
    if (decision.site !== 'none') this.noisy++;
    this.bySite[decision.site]++;
    this.last = {domain: decision.domain, site: decision.site, strength: decision.strength,
      context: decision.key, reward: Math.round(reward * 1000) / 1000,
      changed, novel, solved: !!solved, correct};
    this.recent.push(this.last);
    if (this.recent.length > 36) this.recent.shift();
    return this.last;
  }
  status() {
    const modes = {};
    for (const [key, values] of this.policy) {
      modes[key] = values.map((v, i) => ({site: ARMS[i].site, strength: ARMS[i].strength, n: v.n,
        reward: v.n ? Math.round((v.total / v.n) * 1000) / 1000 : null}));
    }
    return {enabled: true, decisions: this.total, noiseChoices: this.noisy,
      noiseRate: this.total ? Math.round(1000 * this.noisy / this.total) / 1000 : 0,
      cumulativeReward: Math.round(this.earned * 1000) / 1000,
      bySite: {...this.bySite}, last: this.last, contexts: modes, recent: this.recent.slice(-12)};
  }
}
