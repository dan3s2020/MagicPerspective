// Isolated research prototype: language as a state graph.
// Paired demonstrations induce reusable token-position transformations.
// A generic search then composes them. This is not general English understanding.
const words = s => String(s).trim().split(/\s+/u).filter(Boolean);
const same = (a, b) => a.length === b.length && a.every((v, i) => v === b[i]);

export function induceTransformation(pairs) {
  if (!Array.isArray(pairs) || pairs.length < 3) throw Error('At least three paired demonstrations required');
  const examples = pairs.map(p => ({before: words(p.before), after: words(p.after)}));
  const n = examples[0].before.length, m = examples[0].after.length;
  if (!n || !m || examples.some(e => e.before.length !== n || e.after.length !== m)) {
    throw Error('For this prototype, each transformation family needs equal before/after lengths');
  }
  const src = [];
  for (let i = 0; i < n; i++) {
    const values = examples.map(e => e.before[i]);
    src.push(values.every(v => v === values[0]) ? {kind:'literal',value:values[0]} : {kind:'variable',slot:i});
  }
  const dst = [];
  for (let i = 0; i < m; i++) {
    const outputs = examples.map(e => e.after[i]), candidates = [];
    for (let j = 0; j < n; j++) {
      if (src[j].kind === 'variable' && same(outputs, examples.map(e => e.before[j]))) candidates.push(j);
    }
    if (candidates.length === 1) dst.push({kind:'copy',slot:candidates[0]});
    else if (outputs.every(v => v === outputs[0])) dst.push({kind:'literal',value:outputs[0]});
    else throw Error('Output position ' + i + ' is not uniquely explained by one source position');
  }
  const rule = {input:src,output:dst,examples:examples.length};
  for (const e of examples) {
    if (applyTransformation(rule,e.before.join(' ')) !== e.after.join(' ')) {
      throw Error('Induced rule does not fit the demonstrations');
    }
  }
  return rule;
}

export function applyTransformation(rule, sentence) {
  const input = words(sentence);
  if (input.length !== rule.input.length) return null;
  const slots = new Map();
  for (let i = 0; i < rule.input.length; i++) {
    const spec = rule.input[i];
    if (spec.kind === 'literal' && input[i] !== spec.value) return null;
    if (spec.kind === 'variable') slots.set(spec.slot,input[i]);
  }
  const result = rule.output.map(spec => spec.kind === 'literal' ? spec.value : slots.get(spec.slot));
  return result.some(v => v === undefined) ? null : result.join(' ');
}

export function discoverPath(start, rules, goal, {maxDepth=4,maxStates=1000}={}) {
  if (typeof goal !== 'function') throw Error('A goal evaluator is required');
  const queue = [{sentence:start,states:[start],used:[]}], seen = new Set([start]);
  for (let qi = 0; qi < queue.length; qi++) {
    const cur = queue[qi];
    if (goal(cur.sentence)) return {solved:true,states:cur.states,rules:cur.used,expanded:qi+1};
    if (cur.used.length >= maxDepth) continue;
    for (let k = 0; k < rules.length; k++) {
      const next = applyTransformation(rules[k],cur.sentence);
      if (next == null || seen.has(next)) continue;
      seen.add(next);
      queue.push({sentence:next,states:[...cur.states,next],used:[...cur.used,k]});
      if (queue.length > maxStates) return {solved:false,reason:'state budget reached',expanded:qi+1};
    }
  }
  return {solved:false,reason:'no reachable transformation',expanded:queue.length};
}
