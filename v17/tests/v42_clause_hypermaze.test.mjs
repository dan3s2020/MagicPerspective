import test from 'node:test';
import assert from 'node:assert/strict';
import {performance} from 'node:perf_hooks';
import {Discoverer, KIND} from '../transcend/torus-aether/worlds/exercise.mjs';

// Unlike previous V42 tests, there is NO exhaustive prebuilt tree and no
// satisfying leaf labelled as a target. V42 sees hypothetical exploration
// frontiers, experiences clause failures, then reshapes its original field.
const status = (lit, assignment) => {
  const val = assignment[Math.abs(lit)-1];
  return val === -1 ? -1 : (val === (lit > 0 ? 1 : 0) ? 1 : 0);
};
const evaluate = (clauses,a) => clauses.every(c=>c.some(l=>status(l,a)===1));
const failedClause = (clauses,a) => clauses.some(c=>c.every(l=>status(l,a)===0));

class LearnedClauseTransformation {
  constructor(){this.success=[0,0];this.failure=[0,0];this.observations=0;}
  // Observe a real local intervention. The world supplies only whether
  // a previously open 3-clause became violated, not a hidden SAT witness.
  observe(threeStatuses, assignedLiteralTruth, failed) {
    assert.deepEqual([...threeStatuses].sort((a,b)=>a-b),[-1,0,0]);
    const a = Number(assignedLiteralTruth);
    this[failed?'failure':'success'][a]++;
    this.observations++;
  }
  infer(threeStatuses) {
    if (![-1,0,0].every((x,i)=>x===[...threeStatuses].sort((a,b)=>a-b)[i])) return null;
    if(this.observations<8) return null;
    const count=this.success[0]+this.success[1]+this.failure[0]+this.failure[1];
    if(count<8)return null;
    const score=b=>(this.success[b]+1)/(this.success[b]+this.failure[b]+2);
    const best=score(1)>score(0)?1:0;
    return score(best) >= .85 && score(best)-score(1-best) >= .5 ? best : null;
  }
  summary(){return {observations:this.observations, success:this.success.slice(), failure:this.failure.slice(),rule:this.infer([0,-1,0])};}
}
function learnLocalClauseRule(seed=912,examples=48) {
  const m=new LearnedClauseTransformation();
  let rng=seed>>>0;
  const rand=n=>{rng^=rng<<13;rng^=rng>>>17;rng^=rng<<5;return (rng>>>0)%n;};
  for(let i=0;i<examples;i++) {
    const clause=[1,2,3].map(v=>rand(2)?v:-v);
    const unknown=rand(3);
    const base=Array(3).fill(-1);
    for(let j=0;j<3;j++)if(j!==unknown)base[j] = clause[j] > 0 ? 0 : 1;
    const before=clause.map(l=>status(l,base));
    for(const litTruth of [0,1]) {
      const after=base.slice();
      const lit=clause[unknown];
      after[unknown]=(lit>0?litTruth:1-litTruth);
      const failed=failedClause([clause],after);
      m.observe(before,litTruth,failed);
    }
  }
  return m;
}
function propagateLearned(clauses,original,rule) {
  const a=original.slice();
  let forced=0, rounds=0;
  if(!rule) return {assignment:a,forced,conflict:failedClause(clauses,a)};
  while(rounds++<=a.length){
    let changed=false;
    for(const clause of clauses){
      const sts=clause.map(l=>status(l,a));
      if(sts.every(s=>s===0))return {assignment:a,forced,conflict:true};
      const inferred=rule.infer(sts);
      if(inferred===null)continue;
      const idx=sts.indexOf(-1),lit=clause[idx],v=Math.abs(lit)-1;
      const bit=lit>0?inferred:1-inferred;
      if(a[v] !== -1 && a[v] !== bit)return {assignment:a,forced,conflict:true};
      if(a[v]===-1){a[v]=bit;forced++;changed=true;}
    }
    if(!changed)break;
  }
  assert(rounds<=a.length+1);
  return {assignment:a,forced,conflict:failedClause(clauses,a)};
}
function selectVariable(clauses,a) {
  const votes=Array(a.length).fill(0);
  for(const clause of clauses){
    if(clause.some(l=>status(l,a)===1))continue;
    for(const l of clause)if(a[Math.abs(l)-1]===-1)votes[Math.abs(l)-1]++;
  }
  let best=-1;
  for(let i=0;i<a.length;i++)if(a[i]===-1 && (best===-1 || votes[i]>votes[best]))best=i;
  return best;
}
function independentDPLL(clauses,n) {
  let decisions=0;
  function dfs(a) {
    const p=a.slice();let changed=true;
    while(changed){
      changed=false;
      for(const c of clauses){
        const sts=c.map(l=>status(l,p));
        if(sts.includes(1))continue;
        const empty=sts.map((s,i)=>s===-1?i:-1).filter(i=>i>=0);
        if(!empty.length)return null;
        if(empty.length===1){const lit=c[empty[0]],v=Math.abs(lit)-1,value=lit>0?1:0;
          if(p[v]!==-1&&p[v]!==value)return null;
          if(p[v]===-1){p[v]=value;changed=true;}
        }
      }
    }
    if(evaluate(clauses,p))return p.map(v=>v<0?0:v);
    const v=p.findIndex(x=>x===-1);if(v<0)return null;
    for(const bit of [0,1]){const next=p.slice();next[v]=bit;decisions++;
      const solved=dfs(next);if(solved)return solved;
    }
    return null;
  }
  const solution=dfs(Array(n).fill(-1));
  return {sat:!!solution,solution,decisions};
}
function oracleEnumeration(clauses,n){
  let count=0,first=null;
  for(let mask=0;mask<2**n;mask++){
    const a=Array.from({length:n},(_,i)=>(mask>>>i)&1);
    if(evaluate(clauses,a)){count++;if(!first)first=a;}
  }
  return {sat:count>0,count,first};
}
function solveV42(clauses,n,{rule=null,maxProposals=6000,seed=77}={}) {
  const graph=[{a:Array(n).fill(-1),kind:KIND.self,edges:[],parent:-1}];
  const brain=new Discoverer(seed);
  // V42 was trained in maze-worlds to associate target kind with a goal;
  // that prior is seeded rather than pretending it learned SAT here.
  brain.endIn[KIND.target]=1;
  brain.block[KIND.wall]+=99;
  const kinds=[],neighbors=[];
  let shapes=0,proposals=0,forced=0,rejected=0,branches=0,goal=null;
  const addNode=(a,parent,action)=>{
    const id=graph.length;
    graph.push({a,kind:KIND.target,edges:[],parent});
    graph[parent].edges.push({to:id,action});branches++;
    return id;
  };
  const expand=(id)=>{
    const s=graph[id];
    const p=propagateLearned(clauses,s.a,rule);forced+=p.forced;s.a=p.assignment;
    if(p.conflict){s.kind=KIND.wall;rejected++;return;}
    if(evaluate(clauses,s.a)){
      goal=s.a.map(v=>v<0?0:v);
      return;
    }
    const v=selectVariable(clauses,s.a);
    if(v<0){s.kind=KIND.wall;rejected++;return;}
    s.kind=id===0?KIND.self:KIND.floor;
    for(const bit of [0,1]){
      const a=s.a.slice();a[v]=bit;
      addNode(a,id,{variable:v,bit});
    }
  };
  const t0=performance.now();
  expand(0);
  while(goal===null && proposals<maxProposals) {
    kinds.length=0;neighbors.length=0;
    for(const s of graph){kinds.push(s.kind);neighbors.push(s.edges);}
    const prediction=brain.shapeGraph(kinds,neighbors,0,{details:true}); shapes++;
    if(!prediction)break;
    assert.equal(prediction.targetReached,true);
    const last=prediction.path.at(-1);
    const leaf=graph[last.to];
    assert.equal(leaf.kind,KIND.target);
    proposals++;
    expand(last.to);
  }
  const exhausted=goal===null && proposals<maxProposals;
  const budgetExceeded=goal===null && proposals>=maxProposals;
  if(goal!==null)assert(evaluate(clauses,goal));
  return {sat:goal!==null,solution:goal,exhausted,proposals,graphNodes:graph.length,
    rejected,forced,branches,budgetExceeded,shapeCalls:shapes,elapsedMs:+(performance.now()-t0).toFixed(3)};
}
function makeRandom(seed,n,m,{plant=false}={}) {
  let state=seed>>>0;
  const rand=k=>{state^=state<<13;state^=state>>>17;state^=state<<5;return (state>>>0)%k;};
  const planted=Array.from({length:n},()=>rand(2));
  const clauses=[],seen=new Set();
  while(clauses.length<m){
    const vs=[];while(vs.length<3){const v=rand(n)+1;if(!vs.includes(v))vs.push(v);}
    vs.sort((a,b)=>a-b);
    const c=vs.map(v=>rand(2)?v:-v);
    if(plant&&!c.some(l=>planted[Math.abs(l)-1]===(l>0?1:0)))continue;
    const key=c.join(',');if(seen.has(key))continue;
    seen.add(key);clauses.push(c);
  }
  return {n,clauses};
}
function contradiction(n) {
  const clauses=[];
  for(let mask=0;mask<8;mask++)clauses.push([1,2,3].map((v,i)=>mask & 1<<i ? v:-v));
  return {n,clauses};
}
function forceTrue(n) {
  const clauses=[];
  for(let i=0;i<n;i++){
    const a=i+1,b=(i+1)%n+1,c=(i+2)%n+1;
    for(const sb of [-1,1])for(const sc of [-1,1])clauses.push([a,sb*b,sc*c]);
  }
  return {n,clauses};
}
function evaluateWorld(name,world,rule,requireOracle=true) {
  const {n,clauses}=world;
  const truth=independentDPLL(clauses,n);
  const raw=solveV42(clauses,n,{rule:null,maxProposals:15000});
  const learned=solveV42(clauses,n,{rule,maxProposals:15000});
  for(const out of [raw,learned]) {
    assert(!out.budgetExceeded,'Original V42 hit the proposed search budget');
    assert.equal(out.sat,truth.sat,'SAT mismatch');
    if(out.sat) assert(evaluate(clauses,out.solution));
  }
  if(requireOracle && n<=16){const brute=oracleEnumeration(clauses,n);assert.equal(brute.sat,truth.sat);}
  const r={name,n,m:clauses.length,sat:truth.sat,dpllDecisions:truth.decisions,
    baseline:{proposals:raw.proposals,nodes:raw.graphNodes,shapes:raw.shapeCalls,ms:raw.elapsedMs},
    learned:{proposals:learned.proposals,nodes:learned.graphNodes,shapes:learned.shapeCalls,ms:learned.elapsedMs,
      learnedForced:learned.forced,pruned:learned.rejected},speedupByProposals:raw.proposals/Math.max(learned.proposals,1)};
  console.log('V42_CLAUSE_HYPERMAZE '+JSON.stringify(r));return r;
}
const learned=learnLocalClauseRule();
test('local transformation is actually learned by observing interventions and generalizes across positions/signs',()=>{
  assert.equal(learned.infer([-1,0,0]),1);
  assert.equal(learned.infer([0,-1,0]),1);
  assert.equal(learned.infer([0,0,-1]),1);
  const fresh=new LearnedClauseTransformation();
  assert.equal(fresh.infer([0,0,-1]),null);
  assert.equal(learned.infer([1,0,-1]),null);
  assert(learned.observations>=96);
  console.log('V42_CLAUSE_MEMORY '+JSON.stringify(learned.summary()));
});
test('local learned transforms sound vs all 3-literal sign patterns and partial states',()=>{
  for(let mask=0;mask<8;mask++){
    const c=[1,2,3].map((v,i)=>(mask>>i)&1?v:-v);
    for(const u of [0,1,2])for(let b=0;b<4;b++){
      const a=Array(3).fill(-1),others=[0,1,2].filter(i=>i!==u);
      for(let k=0;k<2;k++)a[others[k]]=(b>>k)&1;
      const o=propagateLearned([c],a,learned);
      if(o.conflict)assert(failedClause([c],o.assignment));
      else assert(!failedClause([c],o.assignment));
      if(c.map(l=>status(l,a)).filter(x=>x===0).length===2&&a[u]<0){
        assert.equal(o.assignment[u],c[u]>0?1:0);
      }
    }
  }
});
test('V42 SAT small - independent truth-table checked',()=>{
  evaluateWorld('small_known',{n:4,clauses:[[1,2,3],[-1,3,4],[1,-2,4],[-3,-4,2],[-1,-2,4],[1,2,-4]]},learned);
});
test('V42 arbitrary UNSAT contradictory hypermaze',()=>{
  evaluateWorld('contradiction',contradiction(8),learned);
});
test('V42 unique solution requiring explicit clause transformations',()=>{
  const r=evaluateWorld('unique_synthetic',forceTrue(10),learned);
  assert.equal(r.sat,true);
  assert(r.learned.proposals<r.baseline.proposals);
});
test('V42 held-out random and planted 3SAT near satisfiability transition',()=>{
  let speedups=0;
  for(const [seed,n,m,plant] of [[109,11,46,false],[113,11,48,false],[127,12,50,false],[131,12,52,false],[137,12,50,true],[149,13,55,true]]){
    const r=evaluateWorld('seed'+seed,makeRandom(seed,n,m,{plant}),learned);
    if(r.speedupByProposals>1)speedups++;
  }
  assert(speedups>0);
});
test('V42 clause memory held-out 30 diverse randomly generated problems without preloaded answers',()=>{
  let sat=0,unsat=0,better=0,worse=0;
  for(let seed=500;seed<530;seed++){
    const n=10+(seed%5),m=Math.round(4.3*n);
    const r=evaluateWorld('heldout'+seed,makeRandom(seed*701,n,m,{plant:seed%3===0}),learned);
    if(r.sat)sat++;else unsat++;
    if(r.learned.proposals<r.baseline.proposals)better++;
    if(r.learned.proposals>r.baseline.proposals)worse++;
  }
  console.log('V42_HELDOUT_30_SUMMARY '+JSON.stringify({sat,unsat,better,worse}));
  assert(sat>0&&unsat>0);
});
test('V42 clause memory tested at larger n (SAT/UNSAT truth checked by independent DPLL)',()=>{
  for(const [seed,n,m,plant] of [[203,20,85,true],[205,24,103,true],[207,28,122,true],[211,32,150,true]]){
    const world=makeRandom(seed,n,m,{plant});
    const ref=independentDPLL(world.clauses,n);
    const out=solveV42(world.clauses,n,{rule:learned,maxProposals:5000});
    console.log('V42_LARGE_UNSEEN '+JSON.stringify({seed,n,m,sat:ref.sat,refDecisions:ref.decisions,
      ...out,solution:out.solution?.slice(0,16)}));
    assert(!out.budgetExceeded);
    assert.equal(out.sat,ref.sat);
    if(out.sat)assert(evaluate(world.clauses,out.solution));
  }
});
test('V42 phase-transition harder UNSAT/SAT mixtures (n 18-32)',()=>{
  for(const [seed,n,m] of [[301,18,77],[305,22,94],[307,26,111],[311,30,128],[313,32,137]]){
    const world=makeRandom(seed,n,m);
    const t=performance.now();
    const ref=independentDPLL(world.clauses,n);
    const dpllMs=+(performance.now()-t).toFixed(3);
    const out=solveV42(world.clauses,n,{rule:learned,maxProposals:12000});
    console.log('V42_HARDER_UNSEEN '+JSON.stringify({seed,n,m,sat:ref.sat,refDecisions:ref.decisions,
      dpllMs,proposals:out.proposals,graphNodes:out.graphNodes,forced:out.forced,
      exceeded:out.budgetExceeded,shapeCalls:out.shapeCalls,v42Ms:out.elapsedMs}));
    assert(!out.budgetExceeded);
    assert.equal(out.sat,ref.sat);
    if(out.sat)assert(evaluate(world.clauses,out.solution));
  }
});
