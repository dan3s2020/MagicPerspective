// SharedPerspective observed-experience bridge. One queue/model per ORIGINAL V17 Brain.
// Does not use solutions, BFS distance fields, simulator private mechanics, or held-out answers.
const DOMAIN = new Set(['maze', 'transform', 'text', 'selfcode']);
const cap = (n, lo, hi) => Math.min(hi, Math.max(lo, n));
const simple = value => {
  if (typeof value === 'string') return value.slice(0, 4096);
  if (Array.isArray(value)) return value.slice(0, 4096).map(v => typeof v === 'number' || typeof v === 'string' ? v : '?');
  return null;
};
export class SharedExperience {
  constructor({capacity = 384, seed = 11} = {}) {
    this.capacity = cap(capacity | 0, 8, 4096);
    this.seed = seed;
    this.queue = [];
    this.counts = {maze: 0, transform: 0, text: 0, selfcode: 0};
    this.total = 0;
    this.unknown = 0;
    this.latest = null;
    this.training = null;
    this.error = null;
  }
  observe({domain, before, action, after, context = ''} = {}) {
    if (!DOMAIN.has(domain)) throw Error('Unknown shared world: ' + domain);
    const b = simple(before), a = simple(after);
    if (b === null || a === null || action === undefined || action === null) throw Error('Transition missing a real observed state/action');
    if (Array.isArray(b) !== Array.isArray(a)) throw Error('Inconsistent state representations');
    const item = {domain, before: b, action: String(action).slice(0, 128), after: a, context: String(context).slice(0, 256)};
    if (this.queue.length >= this.capacity) this.queue.shift();
    this.queue.push(item); this.total++; this.counts[domain]++;
    this.latest = {domain, action: item.action, beforeLength: b.length, afterLength: a.length};
    return item;
  }
  observeMaze(before, after, action, n) { return this.observe({domain: 'maze', before, after, action: 'output:' + action, context: 'grid:' + n}); }
  observeTransform(before, after, action, n) { return this.observe({domain: 'transform', before, after, action: 'output:' + action, context: 'grid:' + n}); }
  observeText(event, prompt) {
    return this.observe({domain: 'text', before: event.before, after: event.after,
      action: 'speech-tool:' + event.action.tool + ':' + event.action.token,
      context: String(prompt).slice(0, 256)});
  }
  take(max = 128) { const n = cap(max | 0, 1, 4096); return this.queue.splice(0, n); }
  requeue(items) { this.queue = [...items, ...this.queue].slice(-this.capacity); }
  status() { return {version: 1, totalObserved: this.total, domains: {...this.counts}, queued: this.queue.length,
    latest: this.latest, training: this.training, error: this.error}; }
}
