import {Discoverer,KIND} from '../transcend/torus-aether/worlds/exercise.mjs';
import {performance} from 'node:perf_hooks';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';

const litStatus=(lit,a)=>a[Math.abs(lit)-1]===-1 ? -1 : (a[Math.abs(lit)-1]===(lit>0?1:0)?1:0);
const sat=(clauses,a)=>clauses.every(c=>c.some(l=>litStatus(l,a)===1));
const wrong=(clauses,a)=>clauses.some(c=>c.every(l=>litStatus(l,a)===0));
const rng=(seed)=>{let counter=0;return n=>{
  if(!Number.isInteger(n)||n<=0)throw Error('invalid rng bound');
  const limit=0x100000000-(0x100000000 % n);
  while(true){const x=createHash('sha256').update('MagicPerspective-hard3sat-v1|'+seed+'|'+(counter++)).digest().readUInt32LE(0);
    if(x<limit)return x%n;}
};};

export function randomThreshold(seed,n,m=Math.round(n*4.26)) {
  const rand=rng(seed),clauses=[],seen=new Set();
  // Independent random signed 3-clauses, distinct variable indexes.
  while(clauses.length<m){
    const variables=[];while(variables.length<3){const v=rand(n)+1;if(!variables.includes(v))variables.push(v);}
    variables.sort((a,b)=>a-b);
    const clause=variables.map(v=>rand(2)?v:-v);
    const key=clause.join(',');if(seen.has(key))continue;
    seen.add(key);clauses.push(clause);
  }
  return {family:'random-near-threshold',seed,n,clauses};
}

// A 3-regular connected Mobius-ladder graph: every vertex sees exactly
// three edge-variables. XOR constraints become four 3-CNF clauses each.
// Changing parity at a single vertex gives an algebraic UNSAT certificate:
// XOR of all left sides is 0 (each edge appears twice), while the XOR of
// the right sides is 1. This is not checked using a SAT search oracle.
export function parityGraph(vertices,unsat=false,seed=1){
  assert(vertices>=8&&vertices%2===0);
  const edges=[];const pairToId=new Map(),adj=Array.from({length:vertices},()=>[]);
  function add(i,j){let a=Math.min(i,j),b=Math.max(i,j),key=a+','+b;
    assert(!pairToId.has(key));const id=edges.length+1;pairToId.set(key,id);edges.push([a,b]);adj[a].push(id);adj[b].push(id);
  }
  for(let i=0;i<vertices;i++)add(i,(i+1)%vertices);
  for(let i=0;i<vertices/2;i++)add(i,i+vertices/2);
  assert(adj.every(row=>row.length===3));
  const rand=rng(seed);const witness=edges.map(()=>rand(2));
  const charges=adj.map(ids=>ids.reduce((p,id)=>p^witness[id-1],0));
  if(unsat)charges[0]^=1;
  const clauses=[];
  for(let v=0;v<vertices;v++){
    const ids=adj[v];
    for(let bits=0;bits<8;bits++){
      const actual=[0,1,2].map(j=>(bits>>j)&1);
      if((actual[0]^actual[1]^actual[2])===charges[v])continue;
      clauses.push(ids.map((id,j)=>actual[j]? -id:id));
    }
  }
  assert(clauses.length===4*vertices);
  assert(clauses.every(c=>new Set(c.map(Math.abs)).size===3));
  if(!unsat)assert(sat(clauses,witness));
  assert.equal(charges.reduce((p,x)=>p^x,0),unsat?1:0);
  return {family:unsat?'tseitin-parity-unsat':'tseitin-parity-sat',seed,n:edges.length,clauses,
    certificate:{vertices,edges:edges.length,chargeXor:charges.reduce((p,x)=>p^x,0),edgeMultiplicity:2,connected:true}};
}

// Local transformation learned previously from 48 two-choice interventions.
// This is unit propagation, NOT a novel solver. We implement its factual
// behavior for identical comparison against the published V42 integration.
function propagate(clauses,source){
  const a=source.slice();let forced=0;
  for(let step=0;step<=a.length;step++){
    let changed=false;
    for(const c of clauses){
      let unknown=-1,countUnknown=0,fulfilled=false;
      for(let j=0;j<c.length;j++){
        const s=litStatus(c[j],a);
        if(s===1){fulfilled=true;break;}
        if(s===-1){unknown=j;countUnknown++;}
      }
      if(fulfilled)continue;
      if(countUnknown===0)return {assignment:a,forced,conflict:true};
      if(countUnknown===1){
        const lit=c[unknown],v=Math.abs(lit)-1,bit=lit>0?1:0;
        if(a[v]!==-1&&a[v]!==bit)return {assignment:a,forced,conflict:true};
        if(a[v]===-1){a[v]=bit;changed=true;forced++;}
      }
    }
    if(!changed)break;
  }
  return {assignment:a,forced,conflict:wrong(clauses,a)};
}
function selectVariable(clauses,a){
  const votes=new Int32Array(a.length);
  for(const c of clauses){
    if(c.some(l=>litStatus(l,a)===1))continue;
    for(const l of c)if(a[Math.abs(l)-1]===-1)votes[Math.abs(l)-1]++;
  }
  let best=-1;for(let v=0;v<a.length;v++)if(a[v]===-1&&(best<0||votes[v]>votes[best]))best=v;
  return best;
}

export function runV42(world,{maxMs=1500,maxProposals=10000,seed=17}={}) {
  const {n,clauses}=world,graph=[{a:Array(n).fill(-1),kind:KIND.self,edges:[]}];
  const brain=new Discoverer(seed);brain.endIn[KIND.target]=1;brain.block[KIND.wall]+=99;
  // No SAT witness or actual satisfying exit passed into the shape operator.
  let calls=0,proposals=0,forced=0,rejected=0,solution=null,closed=false;
  function expand(i){
    const node=graph[i],p=propagate(clauses,node.a);node.a=p.assignment;forced+=p.forced;
    if(p.conflict){node.kind=KIND.wall;rejected++;return;}
    if(sat(clauses,node.a)){solution=node.a.map(x=>x<0?0:x);return;}
    const v=selectVariable(clauses,node.a);
    if(v<0){node.kind=KIND.wall;rejected++;return;}
    node.kind=i===0?KIND.self:KIND.floor;
    for(const bit of [0,1]){
      const a=node.a.slice();a[v]=bit;const to=graph.length;
      node.edges.push({to,action:{variable:v,bit}});
      graph.push({a,kind:KIND.target,edges:[]});
    }
  }
  const t0=performance.now();expand(0);
  while(solution===null&&proposals<maxProposals&&performance.now()-t0<maxMs){
    const shaped=brain.shapeGraph(graph.map(x=>x.kind),graph.map(x=>x.edges),0,{details:true});
    calls++;
    if(!shaped){closed=true;break;}
    assert(shaped.targetReached);
    const last=shaped.path.at(-1),frontier=graph[last.to];
    assert.equal(frontier.kind,KIND.target);
    proposals++;expand(last.to);
  }
  const ms=+(performance.now()-t0).toFixed(1);
  if(solution)assert(sat(clauses,solution));
  const exhausted=!solution&&closed;
  return {status:solution?'SAT':exhausted?'UNSAT':'UNKNOWN',solution,
    exhausted,calls,proposals,forced,rejected,graphNodes:graph.length,
    timeMs:ms,budgetMs:maxMs,maxProposals,
    originalV42ShapeGraph:true, externalUnitPropagation:true,goalKindsAreHypotheticalFrontiers:true};
}
export function worldHash(world){return createHash('sha256').update(JSON.stringify({n:world.n,clauses:world.clauses})).digest('hex').slice(0,16);}
