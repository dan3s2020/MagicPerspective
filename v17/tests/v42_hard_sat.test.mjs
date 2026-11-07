import test from 'node:test';
import assert from 'node:assert/strict';
import {randomThreshold,parityGraph,runV42,worldHash} from './v42_hard_sat_lab.mjs';

function clauseTrue(clause,a){return clause.some(l=>a[Math.abs(l)-1]===(l>0?1:0));}
function validate(world){
  const {n,clauses}=world;
  assert(n>=3);assert(clauses.length>0);
  for(const clause of clauses){
    assert.equal(clause.length,3);
    assert.equal(new Set(clause.map(Math.abs)).size,3);
    assert(clause.every(l=>Number.isInteger(l)&&Math.abs(l)<=n));
  }
}
function proveParityCNF(world){
  const grouped=new Map();
  for(const c of world.clauses){
    const key=c.map(Math.abs).sort((a,b)=>a-b).join(',');
    if(!grouped.has(key))grouped.set(key,[]);
    grouped.get(key).push(c);
  }
  let xorCharges=0;const incidence=Array(world.n).fill(0);
  for(const [key,cs] of grouped){
    assert.equal(cs.length,4,'Every factor must encode one 3-variable XOR equation');
    const vs=key.split(',').map(Number);
    for(const v of vs)incidence[v-1]++;
    const allowed=[];
    for(let mask=0;mask<8;mask++){
      const a=Array(world.n).fill(0);
      for(let j=0;j<3;j++)a[vs[j]-1]=(mask>>j)&1;
      if(cs.every(c=>clauseTrue(c,a)))allowed.push([0,1,2].map(j=>a[vs[j]-1]));
    }
    assert.equal(allowed.length,4);
    const parity=allowed[0][0]^allowed[0][1]^allowed[0][2];
    assert(allowed.every(bits=>(bits[0]^bits[1]^bits[2])===parity));
    xorCharges^=parity;
  }
  assert(incidence.every(n=>n===2),'Every Boolean edge variable appears in exactly two XOR equations');
  assert.equal(grouped.size*3,world.n*2);
  return {factors:grouped.size,xorCharges,unsatProved:xorCharges===1};
}

test('hard 3-SAT generators: deterministic, 3 literals, and independent parity UNSAT certificate',()=>{
  const w=randomThreshold(20261110,100);
  validate(w);assert.equal(worldHash(w),worldHash(randomThreshold(20261110,100)));
  assert.notEqual(worldHash(w),worldHash(randomThreshold(20261111,100)));
  for(const nVertices of [16,24,36,48]){
    for(const unsat of [false,true]){
      const world=parityGraph(nVertices,unsat,nVertices+17);
      validate(world);
      const proof=proveParityCNF(world);
      assert.equal(proof.unsatProved,unsat);
    }
  }
});

const cases=[
  {world:randomThreshold(20261107,40),budget:1500,oracle:'SAT'},
  {world:randomThreshold(20261108,60),budget:1500,oracle:'SAT'},
  {world:randomThreshold(20261109,80),budget:1500,oracle:'SAT'},
  {world:randomThreshold(20261110,100),budget:8000,oracle:'SAT'},
  {world:randomThreshold(20261111,150),budget:1500,oracle:'UNKNOWN'},
  {world:randomThreshold(20261112,200),budget:1500,oracle:'UNKNOWN'},
  {world:randomThreshold(20261113,300),budget:1500,oracle:'UNKNOWN'},
  {world:parityGraph(16,false,1),budget:3000,oracle:'SAT'},
  {world:parityGraph(16,true,1),budget:3000,oracle:'UNSAT'},
  {world:parityGraph(24,true,4),budget:3000,oracle:'UNSAT'},
  {world:parityGraph(36,true,7),budget:1500,oracle:'UNSAT'},
  {world:parityGraph(48,true,9),budget:1500,oracle:'UNSAT'},
];

test('original V42 actual shapeGraph on increasingly difficult 3-SAT formulas',()=>{
  for(const {world,budget,oracle} of cases){
    validate(world);
    const proof=world.family.includes('parity')?proveParityCNF(world):null;
    const out=runV42(world,{maxMs:budget,maxProposals:100000});
    assert(['SAT','UNSAT','UNKNOWN'].includes(out.status));
    if(out.status==='SAT'){
      assert.equal(oracle,'SAT','Invalid SAT claim against reference');
      assert(out.solution&&out.solution.length===world.n);
      assert(world.clauses.every(c=>clauseTrue(c,out.solution)));
    }
    if(out.status==='UNSAT'){
      assert.equal(oracle,'UNSAT','Invalid UNSAT claim against reference');
      assert(out.exhausted);
      assert(proof?.unsatProved);
    }
    // For time-limited cases, UNKNOWN is a valid measured result, not a failure.
    const {solution,...report}=out;
    console.log('V42_HARD_SAT_EVIDENCE '+JSON.stringify({family:world.family,n:world.n,m:world.clauses.length,
      seed:world.seed,hash:worldHash(world),knownReference:oracle,
      proof:proof||undefined,...report,witness:solution?.join('')}));
  }
});
