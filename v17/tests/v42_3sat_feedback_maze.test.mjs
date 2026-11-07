// Real V42 original-shapeGraph closed-loop 3-SAT experiment.
// The full binary decision topology is created WITHOUT inspecting any clause
// and WITHOUT marking a satisfying assignment. Each candidate is judged
// by an external SAT evaluator only AFTER V42 produces the whole path.
// If false, just that candidate's exit is closed, then V42 reshapes.
// This tests whether V42 navigates an unknown-exit hypermaze; it is NOT
// evidence of polynomial-time SAT, transfer learning, or internal logic.
import test from 'node:test';
import assert from 'node:assert/strict';
import {Discoverer,KIND} from '../transcend/torus-aether/worlds/exercise.mjs';

const sat = (clauses,bits) => clauses.every(c => c.some(l =>
  bits[Math.abs(l)-1] === (l > 0 ? 1 : 0)));
function countSolutions(n,clauses) {
  let count=0;
  for(let mask=0;mask<2**n;mask++){
    const bits=Array.from({length:n},(_,i)=> (mask >> i) & 1);
    if(sat(clauses,bits)) count++;
  }
  return count;
}
function buildCandidateTopology(n) {
  // Graph builder receives ONLY n, not clauses or their satisfaction.
  // This is a complete hypothetical decision maze, NOT a pre-solved map.
  const bits=[[]], edges=[[]], kinds=[KIND.self], leaves=[];
  for(let i=0;i<bits.length;i++){
    if(bits[i].length === n){leaves.push(i);continue;}
    for(const bit of [0,1]){
      const to=bits.length;
      bits.push([...bits[i],bit]);edges.push([]);kinds.push(KIND.floor);
      edges[i].push({to,action:bit});
    }
  }
  const goal=bits.length;
  for(const i of leaves)edges[i].push({to:goal,action:'possible-exit'});
  kinds.push(KIND.target);edges.push([]);
  return {n,bits,edges,kinds,goal};
}
function runFeedbackMaze(n,clauses,seed) {
  const graph=buildCandidateTopology(n);
  const brain=new Discoverer(seed);
  // Known generic goal-kind prior from living a maze, no SAT witness.
  brain.endIn[KIND.target]=1;
  brain.block[KIND.wall]+=99;
  const tried=new Set(), max=2**n, start=performance.now();
  let found=null, exhausted=false, first=null, last=null;
  for(let attempt=1;attempt<=max+1;attempt++){
    const shape=brain.shapeGraph(graph.kinds,graph.edges,0,{details:true});
    if(!shape){
      exhausted=true; break;
    }
    assert.equal(shape.targetReached,true);
    const path=shape.path;
    assert.equal(path.length,n+1);
    const candidate=path.filter(x=>x.action!== 'possible-exit').map(x=>x.action);
    assert.equal(candidate.length,n);
    const key=candidate.join('');
    assert(!tried.has(key), 'Original shapeGraph repeated a rejected assignment');
    tried.add(key);
    if(!first)first=candidate;
    last=candidate;
    // This is the first moment SAT clauses are consulted.
    const allowed=sat(clauses,candidate);
    if(allowed){
      found=candidate;
      break;
    }
    const terminalEdge=path[path.length-1];
    const leaf=terminalEdge.from;
    assert.equal(terminalEdge.to,graph.goal);
    assert.deepEqual(graph.bits[leaf],candidate);
    // The world rejects this proposed exit; remember the wall.
    graph.edges[leaf]=[];
    graph.kinds[leaf]=KIND.wall;
    brain.block[KIND.wall]++;
  }
  const expected=countSolutions(n,clauses), actual=Boolean(found);
  assert.equal(actual,expected>0);
  if(!actual) {
    assert(exhausted,'UNSAT must exhaust the candidate maze');
    assert.equal(tried.size,2**n);
  }else{
    assert(sat(clauses,found));
  }
  const report={variables:n,clauses:clauses.length,result:actual?'SAT':'UNSAT',
    firstCandidate:first,solution:found,verified:true,
    proposalsTested:tried.size,totalPossible:2**n,
    graphNodes:graph.kinds.length,allExitsInitiallyHypothetical:true,
    goalEndpointsPreclassified:false,clausesInvisibleUntilCandidateFeedback:true,
    originalV42ShapeGraph:true,unsatExhaustionVerified:!actual&&exhausted,
    elapsedMs:+(performance.now()-start).toFixed(3),
    acceleratedVsBruteForce:false};
  console.log('V42_3SAT_REAL_FEEDBACK_RESULT '+JSON.stringify(report));
  return report;
}
function forceAllTrueClauses(n) {
  // Four 3-clauses for each xi encode the implication xi=1.
  // Each clause uses distinct variables and has exactly three literals.
  const cs=[];
  for(let i=0;i<n;i++){
    const a=i+1,b=((i+1)%n)+1,c=((i+2)%n)+1;
    for(const signB of [-1,1])for(const signC of [-1,1])
      cs.push([a,signB*b,signC*c]);
  }
  return cs;
}
const sample=[
  [1,2,3],[-1,3,4],[1,-2,4],[-3,-4,2],[-1,-2,4],[1,2,-4]
];
test('original V42 reaches a 3-SAT exit from success/failure feedback only',()=>{
  const r=runFeedbackMaze(4,sample,7);
  assert.equal(r.result,'SAT');
  assert.deepEqual(r.solution,[0,0,1,0]);
  assert.equal(r.proposalsTested,3);
});
test('original V42 learns which hypothetical exits fail (unique solution at last vertex)',()=>{
  const r=runFeedbackMaze(8,forceAllTrueClauses(8),41);
  assert.equal(r.result,'SAT');
  assert.deepEqual(r.solution,Array(8).fill(1));
  assert.equal(r.proposalsTested,256);
});
test('original V42 reports no path after all hypothetical exits are closed',()=>{
  const contradictions=[];
  for(let mask=0;mask<8;mask++)
    contradictions.push([1,2,3].map((v,j)=>(mask&(1<<j))?v:-v));
  const r=runFeedbackMaze(6,contradictions,19);
  assert.equal(r.result,'UNSAT');
  assert.equal(r.proposalsTested,64);
});
