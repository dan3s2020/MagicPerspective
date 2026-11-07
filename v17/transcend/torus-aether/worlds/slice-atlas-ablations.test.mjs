// Isolated geometric ablation: import the actual V22 Discoverer.shape().
// NOT the complete native V17 Brain; NOT language comprehension or CUDA.
import assert from 'node:assert/strict';
import {Discoverer, KIND} from './exercise.mjs';

class RNG {
  constructor(seed) { this.s = seed >>> 0; }
  next() { let x = this.s; x ^= x << 13; x ^= x >>> 17; x ^= x << 5; this.s = x >>> 0; return this.s / 4294967296; }
  int(n) { return Math.floor(this.next() * n); }
}
const D = 4, SIZE = D ** 4;
const coords = i => [i % 4, Math.floor(i / 4) % 4, Math.floor(i / 16) % 4, Math.floor(i / 64) % 4];
const index = c => c[0] + 4*c[1] + 16*c[2] + 64*c[3];

function graph(rng) {
  const walls = Array.from({length: SIZE}, () => rng.next() < 0.17);
  const nbr = Array.from({length: SIZE}, () => []);
  for (let i = 0; i < SIZE; i++) if (!walls[i]) {
    const c = coords(i);
    for (let axis = 0; axis < D; axis++) for (const delta of [-1, 1]) {
      const q = c.slice();
      q[axis] = (q[axis] + delta + 4) % 4;
      const j = index(q);
      if (!walls[j]) nbr[i].push({to:j, action:'axis'+axis+':'+(delta>0?'+':'-'), axis});
    }
  }
  return {walls,nbr};
}

function bfs(nbr,s,t) {
  const queue=[s], dist=new Int16Array(SIZE).fill(-1);
  dist[s]=0;
  for(let k=0;k<queue.length;k++){
    const v=queue[k];
    if(v===t) return dist[v];
    for(const {to} of nbr[v]) if(dist[to]<0) { dist[to]=dist[v]+1;queue.push(to); }
  }
  return -1;
}

function solve(world,start,goal,view='all',permutation=null,opts={}){
  const axes=view==='xy'?[0,1]:view==='zw'?[2,3]:[0,1,2,3];
  let neighbors=world.nbr.map(row=>row.filter(e=>axes.includes(e.axis)));
  if(opts.injectFalse){
    const rng=new RNG(opts.injectSeed),free=[];
    for(let j=0;j<SIZE;j++) if(!world.walls[j]) free.push(j);
    for(let j=0;j<SIZE;j++) if(!world.walls[j] && rng.next()<opts.injectFalse) {
      const to=free[rng.int(free.length)];
      if(to!==j&&!world.nbr[j].some(e=>e.to===to))
        neighbors[j].push({to,action:'unverified:proposed',axis:0,verified:false});
    }
  }
  if(opts.restrictVerified) neighbors=neighbors.map(row=>row.filter(e=>e.action!=='unverified:proposed'));
  const retina=Array.from(world.walls,w=>w?KIND.wall:KIND.floor);
  retina[start]=KIND.self;
  if(!opts.hideGoal) retina[goal]=KIND.target;

  let actualStart=start,actualRetina=retina,actualNeighbors=neighbors;
  if(permutation){
    const inv=new Array(SIZE);
    permutation.forEach((old,newid)=>inv[old]=newid);
    actualStart=inv[start];
    actualRetina=permutation.map(old=>retina[old]);
    actualNeighbors=permutation.map(old=>neighbors[old].map(e=>({...e,to:inv[e.to]})));
  }
  const topo={
    neighbors:actualNeighbors,
    conduct:k=>k===KIND.wall?0:1,
    attract:k=>k===KIND.target?1:0
  };
  const predicted=new Discoverer(411).shape(actualRetina,0,actualStart,topo)||[];
  const path=permutation?predicted.map(e=>({...e,from:permutation[e.from],to:permutation[e.to]})):predicted;
  let position=start,valid=true;
  const visited=new Set([position]);
  for(const edge of path){
    if(edge.from!==position||!world.nbr[position].some(e=>e.to===edge.to&&e.action===edge.action)||visited.has(edge.to)){
      valid=false;break;
    }
    position=edge.to;visited.add(position);
  }
  return {success:valid&&position===goal,valid,length:path.length,path};
}

const rng=new RNG(20261107),n=512;
const result={
  seed:20261107,worlds:n,nodesPerWorld:SIZE,blockedFraction:0.17,
  targetGiven:true,semanticTextTest:false,
  regimes:{xy:0,zw:0,full:0,relabel:0,noGoal:0,unverified1:0,unverified3:0,unverified10:0,verified10:0},
  oracleReachable:0,fullShortest:0,exactRelabelPath:0,samples:[]
};
for(let i=0;i<n;i++){
  const world=graph(rng),free=[];
  for(let j=0;j<SIZE;j++)if(!world.walls[j])free.push(j);
  const start=free[rng.int(free.length)];
  let goal=start;
  while(goal===start)goal=free[rng.int(free.length)];
  const optimal=bfs(world.nbr,start,goal);
  if(optimal>=0)result.oracleReachable++;
  const full=solve(world,start,goal),xy=solve(world,start,goal,'xy'),zw=solve(world,start,goal,'zw');
  const permutation=Array.from({length:SIZE},(_,j)=>j);
  for(let j=SIZE-1;j>0;j--){const k=rng.int(j+1);[permutation[k],permutation[j]]=[permutation[j],permutation[k]];}
  const relabel=solve(world,start,goal,'all',permutation);
  const noGoal=solve(world,start,goal,'all',null,{hideGoal:true});
  const unverified1=solve(world,start,goal,'all',null,{injectFalse:.01,injectSeed:1000+i});
  const unverified3=solve(world,start,goal,'all',null,{injectFalse:.03,injectSeed:3000+i});
  const unverified10=solve(world,start,goal,'all',null,{injectFalse:.1,injectSeed:10000+i});
  const verified10=solve(world,start,goal,'all',null,{injectFalse:.1,injectSeed:10000+i,restrictVerified:true});
  for(const [k,v] of Object.entries({xy,zw,full,relabel,noGoal,unverified1,unverified3,unverified10,verified10}))
    result.regimes[k]+=Number(v.success);
  if(full.success&&full.length===optimal)result.fullShortest++;
  if(JSON.stringify(full.path.map(e=>e.to))===JSON.stringify(relabel.path.map(e=>e.to)))result.exactRelabelPath++;
  if(result.samples.length<3)result.samples.push({
    start:coords(start),goal:coords(goal),optimal,
    full:full.length,xy:xy.success,zw:zw.success,
    actions:full.path.map(e=>e.action)
  });
}
assert.equal(result.oracleReachable,n);
assert.equal(result.regimes.full,n);
assert.equal(result.regimes.relabel,n);
assert.equal(result.fullShortest,n);
assert.equal(result.exactRelabelPath,n);
assert.equal(result.regimes.noGoal,0);
assert.equal(result.regimes.verified10,n);
assert.ok(result.regimes.unverified10<n);
console.log(JSON.stringify(result,null,2));
