// Isolated V42 3-SAT-as-hypermaze experiment.
// IMPORTANT: the test harness builds/prunes the complete assignment graph.
// This performs SAT-related enumeration outside V42; the V42 contribution
// measured here is ORIGINAL Discoverer.shapeGraph() goal-field navigation.
// No modification to V42, no fictitious zero-shot learned SAT reasoning.
import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {Discoverer, KIND} from '../transcend/torus-aether/worlds/exercise.mjs';

function literalTrue(lit, bits) {
  return bits[Math.abs(lit) - 1] === (lit > 0 ? 1 : 0);
}
function satisfied(clauses, bits) {
  return clauses.every(c => c.some(l => literalTrue(l, bits)));
}
function contradicted(clauses, prefix) {
  // Sound pruning: reject only an already-falsified complete clause.
  return clauses.some(c => c.every(l => {
    const varId = Math.abs(l) - 1;
    return varId < prefix.length && !literalTrue(l, prefix);
  }));
}
function independentEnumeration(n, clauses) {
  const witnesses = [];
  for (let i = 0; i < 2 ** n; i++) {
    const bits = Array.from({length:n}, (_, j) => (i >> j) & 1);
    if (satisfied(clauses, bits)) witnesses.push(bits);
  }
  return witnesses;
}
function makePlanted(seed, n, count) {
  let state = seed >>> 0;
  const rand = limit => {
    state ^= state << 13; state ^= state >>> 17; state ^= state << 5;
    return (state >>> 0) % limit;
  };
  const witness = Array.from({length:n}, () => rand(2));
  const clauses = [], seen = new Set();
  while (clauses.length < count) {
    const vars = [];
    while (vars.length < 3) {
      const v = rand(n) + 1;
      if (!vars.includes(v)) vars.push(v);
    }
    vars.sort((a,b) => a-b);
    const c = vars.map(v => rand(2) ? v : -v);
    if (!c.some(l => literalTrue(l, witness))) continue;
    const key = c.join(',');
    if (seen.has(key)) continue;
    seen.add(key); clauses.push(c);
  }
  // Test generator knows a witness, but it is NOT passed to the graph builder.
  assert(satisfied(clauses, witness));
  return {n, clauses};
}
function makeContradiction(world) {
  // All 8 possible clauses over x1,x2,x3 must be true, impossible.
  const blocking = [];
  for (let m = 0; m < 8; m++) {
    blocking.push([1,2,3].map((v,j) => (m & (1 << j)) ? v : -v));
  }
  return {n:world.n, clauses:[...world.clauses, ...blocking]};
}
function graphFromFormula(n, clauses) {
  // Every node is one partial Boolean assignment, in n-dimensional
  // assignment space. Two edges correspond to x_i=0 or x_i=1.
  // This is full explicit exploration (NOT a learned map).
  const nodes = [{bits:[], kind:KIND.self, edges:[]}];
  const successfulLeaves = [];
  let rejected = 0, evaluatedLeaves = 0, edgesBuilt = 0;
  for (let i = 0; i < nodes.length; i++) {
    const current = nodes[i];
    if (contradicted(clauses, current.bits)) {
      current.kind = KIND.wall;
      rejected++;
      continue;
    }
    if (current.bits.length === n) {
      evaluatedLeaves++;
      assert(satisfied(clauses, current.bits), 'Sound partial-clause pruning failed');
      successfulLeaves.push(i);
      continue;
    }
    for (const bit of [0,1]) {
      const to = nodes.length;
      nodes.push({bits:[...current.bits, bit], kind:KIND.floor, edges:[]});
      current.edges.push({to, action:bit});
      edgesBuilt++;
    }
  }
  const goal = nodes.length;
  for (const i of successfulLeaves) {
    nodes[i].edges.push({to:goal, action:'finish'});
    edgesBuilt++;
  }
  const kinds = nodes.map(x => x.kind).concat(KIND.target);
  const neighbors = nodes.map(x => x.edges).concat([[]]);
  assert.equal(kinds.length, neighbors.length);
  return {nodes, kinds, neighbors, goal, evaluatedLeaves,
    satisfyingLeaves:successfulLeaves.length, rejected, edgesBuilt};
}
function runOriginalV42(world, seed) {
  const {n,clauses} = world;
  assert(clauses.every(c => c.length === 3 && new Set(c.map(Math.abs)).size === 3));
  const graph = graphFromFormula(n,clauses);
  const brain = new Discoverer(seed);
  // The world provides a known positive GOAL kind, as a maze does.
  // This is a seeded goal association, not autonomous training.
  brain.endIn[KIND.target] = 1;
  brain.block[KIND.wall] += 99;
  const t0 = performance.now();
  const shaped = brain.shapeGraph(graph.kinds, graph.neighbors, 0, {details:true});
  const elapsedMs = +(performance.now() - t0).toFixed(3);
  const found = shaped?.targetReached === true;
  let solution = null;
  if (found) {
    let at = 0;
    solution = [];
    for (const edge of shaped.path) {
      assert.equal(edge.from, at);
      assert(graph.neighbors[at].some(e => e.to === edge.to && e.action === edge.action));
      if (edge.action !== 'finish') solution.push(edge.action);
      at = edge.to;
    }
    assert.equal(at, graph.goal);
    assert.equal(solution.length, n);
    assert(satisfied(clauses, solution), 'V42 proposed a violating assignment');
  }
  const brute = independentEnumeration(n, clauses);
  assert.equal(found, brute.length > 0, 'V42 result disagrees with independent exhaustive oracle');
  assert.equal(graph.satisfyingLeaves, brute.length);
  const report = {n, clauses:clauses.length, hash:createHash('sha256').update(JSON.stringify(world)).digest('hex').slice(0,16),
    result:found?'SAT':'UNSAT', solution, verified:found? satisfied(clauses, solution): brute.length===0,
    graphNodes:graph.kinds.length, graphEdges:graph.edgesBuilt, prunedPartialAssignments:graph.rejected,
    visitedCompleteAssignments:graph.evaluatedLeaves, totalPossibleAssignments:2**n,
    independentlyCountedSolutions:brute.length, shapeEdges:shaped?.path.length ?? 0,
    shapeTimeMs:elapsedMs, actualEngine:'Discoverer.shapeGraph on V42 checkout',
    fullGraphBuiltExternally:true, independentSATDiscoveryByV42:false};
  console.log('V42_3SAT_HYPERMAZE_RESULT ' + JSON.stringify(report));
  return report;
}
test('V42 original shapeGraph solves a complete 4-variable 3-SAT maze', () => {
  const world = {n:4, clauses:[
    [1,2,3],[-1,3,4],[1,-2,4],[-3,-4,2],[-1,-2,4],[1,2,-4]
  ]};
  const report = runOriginalV42(world, 8);
  assert.equal(report.result, 'SAT');
});
test('V42 original shapeGraph handles previously unseen planted 3-SAT mazes', () => {
  for (const [seed,n,count] of [[7,8,33],[19,9,38],[31,10,43],[47,11,48]]) {
    const report = runOriginalV42(makePlanted(seed,n,count),seed);
    assert.equal(report.result,'SAT');
  }
});
test('V42 original shapeGraph does not hallucinate paths in UNSAT mazes', () => {
  for (const [seed,n,count] of [[29,8,30],[53,10,40]]) {
    const report = runOriginalV42(makeContradiction(makePlanted(seed,n,count)), seed);
    assert.equal(report.result,'UNSAT');
    assert.equal(report.solution,null);
  }
});
test('V42 cannot produce a route without observed connecting paths', () => {
  const brain = new Discoverer(9);
  brain.endIn[KIND.target] = 1;
  // Goal is known but the assignment-space paths are not exposed.
  const route = brain.shapeGraph([KIND.self,KIND.target],[[],[]],0,{details:true});
  assert.equal(route,null);
  console.log('V42_3SAT_ABLATION ' + JSON.stringify({
    result:'NO_ROUTE_WITHOUT_OBSERVED_GRAPH', graphNodes:2,
    zeroShot3SATSolutionDemonstrated:false, originalV42Unmodified:true
  }));
});
