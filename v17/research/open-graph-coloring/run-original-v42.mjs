// ORIGINAL V42 Discoverer run on open DIMACS 250-vertex / 15,668-edge
// coloring instance. Complete 2^b local transformation space (b<=12).
// This is a bounded construction, not a proof of the unknown optimum.
import fs from 'node:fs';
import crypto from 'node:crypto';
import {performance} from 'node:perf_hooks';
import {fileURLToPath} from 'node:url';
import {Discoverer,KIND,makeMaze,seedOf,SEEDS,playExercise} from '../../transcend/torus-aether/worlds/exercise.mjs';
const SOURCE=fileURLToPath(new URL('./data/DSJC250.5.col',import.meta.url));
const source=fs.readFileSync(SOURCE,'utf8'),hash=crypto.createHash('sha256').update(source).digest('hex');
let n=0,declared=0;const edges=[];
for(const line of source.split(/\r?\n/)){
  if(line.startsWith('p ')){const a=line.trim().split(/\s+/);n=Number(a[2]);declared=Number(a[3])}
  if(line.startsWith('e ')){const a=line.trim().split(/\s+/);edges.push([Number(a[1])-1,Number(a[2])-1])}
}
if(n!==250||edges.length!==15668||declared!==31336)throw Error('Missing real DIMACS data; original source p-header counts 2*m, actual unique undirected edges m');
const adj=Array.from({length:n},()=>new Set());
for(const [u,v] of edges){
  if(u<0||v<0||u>=n||v>=n||u===v||adj[u].has(v))throw Error('Invalid graph constraint');
  adj[u].add(v);adj[v].add(u);
}
const validate=col=>({
  colors:new Set(col).size,
  conflicts:edges.filter(([u,v])=>col[u]===col[v]).length,
  vertices:n,edges:edges.length
});
const brain=new Discoverer(211);brain.temp=0;brain.noise=0;
let learnedWins=0;
for(let i=0;i<100;i++)learnedWins+=Number(
  playExercise(makeMaze(seedOf(SEEDS.train,i),i%2?9:7),brain,()=>{},{record:false}).solved);
if(brain.attract(KIND.target)<=.2||brain.conduct(KIND.wall)>=.5)
  throw Error('Original brain did not learn goal and wall');
console.log('ACTUAL_V42_ORIGINAL_LEARNED',JSON.stringify({trainingEpisodes:100,solved:learnedWins,
  targetAttraction:brain.attract(KIND.target),floorConductance:brain.conduct(KIND.floor),
  wallConductance:brain.conduct(KIND.wall)}));
let nativeCalls=0,nativePlans=0,nativeFailures=0,totalExplicitStates=0,nativeCpuMs=0;
function localCompleteSpace(candidate,k){
  const b=candidate.length,N=1<<b;
  if(b<1||b>12)throw Error('Invalid local exhaustive state size');
  const valid=new Uint8Array(N),size=new Uint8Array(N),kinds=new Array(N);
  valid[0]=1;
  for(let s=0;s<N;s++){
    if(s){
      const x=s&-s,j=31-Math.clz32(x),prior=s^x;
      size[s]=size[prior]+1;
      valid[s]=valid[prior]&&candidate.every((v,z)=>
        !(prior&(1<<z))||!adj[candidate[j]].has(v))?1:0;
    }
    kinds[s]=!valid[s]?KIND.wall:size[s]>=k?KIND.target:KIND.floor;
  }
  if(!kinds.includes(KIND.target))return null;
  kinds[0]=KIND.self;
  const neighbors=Array.from({length:N},(_,s)=>
    Array.from({length:b},(_,j)=>({to:s^(1<<j),action:j})));
  nativeCalls++;totalExplicitStates+=N;
  const t0=performance.now();
  const r=brain.shapeGraph(kinds,neighbors,0,{details:true});
  nativeCpuMs+=performance.now()-t0;
  if(!r?.targetReached){nativeFailures++;return null}
  let mask=0;
  for(const move of r.path){
    const next=mask^(1<<move.action);
    if(next!==move.to||!valid[next])throw Error('Original V42 chose invalid edge');
    mask=next;
  }
  const chosen=candidate.filter((v,j)=>mask&(1<<j));
  if(chosen.length<k||chosen.some((v,i)=>chosen.slice(i+1).some(u=>adj[v].has(u))))
    throw Error('Original V42 route not a valid independent set');
  nativePlans++;return chosen;
}
let random=831719;
const rand=()=>{random^=random<<13;random^=random>>>17;random^=random<<5;return(random>>>0)/4294967296};
const colors=Array(n).fill(-1),remaining=new Set([...Array(n).keys()]);
let classes=0;
while(remaining.size){
  const chosen=new Set();
  for(let steps=0;steps<n;steps++){
    const cand=[...remaining].filter(v=>!chosen.has(v)&&![...chosen].some(u=>adj[v].has(u)));
    if(!cand.length)break;
    const tie=new Map(cand.map(v=>[v,rand()]));
    cand.sort((a,b)=>adj[b].size-adj[a].size||tie.get(a)-tie.get(b));
    const w=cand.slice(0,12);
    let picked=null;
    for(const k of [4,3,2,1])if(k<=w.length){
      picked=localCompleteSpace(w,k);if(picked)break;
    }
    if(!picked)throw Error('Original V42 could not plan any valid local assignment');
    for(const v of picked){
      if(chosen.has(v)||![...chosen].every(u=>!adj[u].has(v)))
        throw Error('Local native route violates original full graph');
      chosen.add(v);
    }
  }
  if(!chosen.size)throw Error('No coloring progress');
  for(const v of chosen){colors[v]=classes;remaining.delete(v)}
  classes++;
}
const original=validate(colors);
if(original.conflicts||colors.some(x=>x<0))throw Error('Global independent verifier FAILED');
const report={
  input:{name:'DSJC250.5',sourceSha256:hash,vertices:n,edges:edges.length},
  solver:{name:'ORIGINAL UNMODIFIED V42 Discoverer.shapeGraph',
    originalTrainingEpisodes:100,originalTrainingSolved:learnedWins,
    nativeExplicitMapCalls:nativeCalls,nativeVerifiedPlans:nativePlans,
    nativeFailedPlans:nativeFailures,explicitStateOccurrences:totalExplicitStates,
    originalShapeGraphCpuMs:nativeCpuMs},
  known:{bestPublishedColors:28,lowerBound:26,globalOptimum:'UNSOLVED'},
  result:original,
  scope:'Full graph certificate assembled from COMPLETE bounded local state maps; no global coloring-optimality proof; no 2^250 space materialized.',
  certificate:colors
};
fs.writeFileSync(fileURLToPath(new URL('./full-certificate.json',import.meta.url)),JSON.stringify(report,null,2));
console.log('V42_REAL_OPEN_INSTANCE',JSON.stringify({...report,certificateHash:crypto.createHash('sha256').update(JSON.stringify(colors)).digest('hex'),certificate:undefined}));
