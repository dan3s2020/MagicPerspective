import test from "node:test";import assert from "node:assert/strict";
import {CrossWorldAtlas,PRNG,tuple,advance} from "./atlas-engine.mjs";
const dims=6,side=3,N=side**dims,ACTIONS=Array.from({length:12},(_,i)=>"operation-"+i);
function step(n,action){const i=ACTIONS.indexOf(action),d=Math.floor(i/2),x=tuple(n,dims,side),delta=Array(dims).fill(0);
 let amount=i%2?-1:1;if(d>0&&x[d-1]%2===1)amount*=2;delta[d]=amount;
 return advance(n,delta,side,dims);
}
function oracle(start,goal,cells){const q=[start],seen=new Set([start]);for(let i=0;i<q.length;i++){
 const n=q[i];if(n===goal)return true;
 for(const a of ACTIONS){const p=step(n,a);if(cells[p]&&!seen.has(p)){seen.add(p);q.push(p)}}
 }return false;
}
test("genuine SIX-dimensional state-dependent transformations are learned from fragmented TEXT world experiences",()=>{
 const atlas=new CrossWorldAtlas({dims,side,actions:ACTIONS}),R=PRNG(211);
 for(let world=0;world<24;world++){
  const action=ACTIONS[world%12];let doc="";
  for(let i=0;i<100;i++){
   const from=Math.floor(R()*N),truth=step(from,action),to=R()<.05?Math.floor(R()*N):truth;
   doc+="At time "+i+" performing "+action+" from ("+tuple(from,dims,side).join(",")+
    ") moved into ("+tuple(to,dims,side).join(",")+").\n";
  }
  const e=atlas.ingestTextDocument(doc,{world:"previous-"+world});
  assert.equal(e.accepted,100);
 }
 const model=atlas.fit({allowContext:true});
 assert.equal(model.sourceWorlds,24);assert.equal(model.states,729);
 assert.equal(model.discoveredConditionalRules,10);
 const flat=CrossWorldAtlas.restore({...atlas.saveJSON(),allowContext:false});
 let success=0,flatSuccess=0;
 for(let seed=0;seed<80;seed++){
  const R=PRNG(11111+seed),cells=Uint8Array.from({length:N},()=>+(R()>.16));
  let start,goal;
  for(let attempts=0;attempts<500;attempts++){
   const a=Math.floor(R()*N),b=Math.floor(R()*N);
   if(a!==b&&cells[a]&&cells[b]&&oracle(a,b,cells)){start=a;goal=b;break}
  }
  assert.ok(Number.isInteger(start));
  const predicted=atlas.plan(start,goal,cells),naive=flat.plan(start,goal,cells);
  if(predicted.found&&atlas.evaluate(predicted,step,cells).success)success++;
  if(naive.found&&flat.evaluate(naive,step,cells).success)flatSuccess++;
 }
 const graph=atlas.completeAtlas(new Uint8Array(N).fill(1));
 assert.equal(graph.edges.length,729*12);
 assert.equal(success,80);
 assert.equal(flatSuccess,18);
 console.log("SIX_DIMENSIONAL_COMPLETE_ATLAS",JSON.stringify({
   states:729,edges:8748,crossWorldTextEvents:2400,conditionalRules:10,
   heldoutWorlds:80,correct:success,flat:flatSuccess}));
});
