// Adversarial baseline: classic CPU TabuCol, NOT original V42.
// Starts exclusively from the full certificate ORIGINAL V42 produced.
// A 27-color legal certificate would improve the published 28-color bound.
// Keep provenance separate; don't attribute this search to V42's shapeGraph.
import fs from 'node:fs';
import {performance} from 'node:perf_hooks';
import {fileURLToPath} from 'node:url';
const raw=JSON.parse(fs.readFileSync(fileURLToPath(new URL('./full-certificate.json',import.meta.url))));
const n=raw.input.vertices,original=raw.certificate,source=fs.readFileSync(fileURLToPath(new URL('./data/DSJC250.5.col',import.meta.url)),'utf8');
const edges=source.split(/\r?\n/).filter(s=>s.startsWith('e ')).map(s=>s.trim().split(/\s+/).slice(1).map(x=>+x-1));
const adj=Array.from({length:n},()=>[]);
for(const [a,b]of edges){adj[a].push(b);adj[b].push(a)}
let seed=1701199;
const rng=()=>{seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;return(seed>>>0)/2**32};
const randInt=max=>Math.floor(rng()*max);
function check(c){
  let bad=0;for(const [u,v]of edges)bad+=Number(c[u]===c[v]);
  return {k:new Set(c).size,invalidEdges:bad};
}
function lowerInitial(c){
  const k=Math.max(...c)+1,counts=Array(k).fill(0);
  for(const x of c)counts[x]++;
  let rm=counts.indexOf(Math.min(...counts));
  const out=c.map(x=>x===rm?-1:x>rm?x-1:x);
  const keep=k-1;
  const lost=[...Array(n).keys()].filter(v=>out[v]<0);
  // Assign removed-class vertices to colors causing fewest immediate violations.
  for(const v of lost){
    const cost=Array(keep).fill(0);
    for(const u of adj[v])if(out[u]>=0)cost[out[u]]++;
    let min=Math.min(...cost),options=[];
    for(let z=0;z<keep;z++)if(cost[z]===min)options.push(z);
    out[v]=options[randInt(options.length)];
  }
  return out;
}
function improve(initial,k,budgetMs){
  const t0=performance.now(),c=initial.slice(),tabu=Array.from({length:n},()=>new Int32Array(k));
  const counts=Array.from({length:n},()=>new Int16Array(k));
  for(let v=0;v<n;v++)for(const u of adj[v])counts[v][c[u]]++;
  const active=new Set();let conflicts=0;
  for(let v=0;v<n;v++){conflicts+=counts[v][c[v]];if(counts[v][c[v]]>0)active.add(v)}
  conflicts/=2;
  let best=conflicts,bestC=c.slice(),steps=0,lastProgress=0;
  while(performance.now()-t0<budgetMs&&conflicts>0){
    steps++;
    let choice=null,bestDelta=Infinity,reservoir=0;
    for(const v of active){
      const own=c[v],ownCost=counts[v][own];
      for(let z=0;z<k;z++)if(z!==own){
        const delta=counts[v][z]-ownCost;
        const forbid=tabu[v][z]>steps && conflicts+delta>=best;
        if(forbid)continue;
        if(delta<bestDelta){bestDelta=delta;choice=[v,z];reservoir=1}
        else if(delta===bestDelta&&randInt(++reservoir)===0)choice=[v,z];
      }
    }
    if(!choice)break;
    const [v,z]=choice,old=c[v],actualDelta=counts[v][z]-counts[v][old];
    tabu[v][old]=steps+Math.floor(.6*conflicts)+randInt(10)+1;
    c[v]=z;conflicts+=actualDelta;
    for(const u of adj[v]){
      counts[u][old]--;counts[u][z]++;
      if(counts[u][c[u]]>0)active.add(u);else active.delete(u);
    }
    if(counts[v][z]>0)active.add(v);else active.delete(v);
    if(conflicts<best){best=conflicts;bestC=c.slice();lastProgress=steps}
    if(steps-lastProgress>12000&&best>0){
      c.splice(0,n,...bestC);
      for(let j=0;j<Math.max(3,Math.floor(n*.1));j++)c[randInt(n)]=randInt(k);
      for(let v=0;v<n;v++){counts[v].fill(0);for(const u of adj[v])counts[v][c[u]]++}
      conflicts=0;active.clear();
      for(let v=0;v<n;v++){conflicts+=counts[v][c[v]];if(counts[v][c[v]]>0)active.add(v)}
      conflicts/=2;lastProgress=steps;
    }
  }
  return {solved:best===0,colors:bestC,minConflicts:best,steps,
    elapsedMs:performance.now()-t0};
}
let current=original.slice(),bestKnown=check(current);
if(bestKnown.invalidEdges!==0)throw Error('Original V42 seed certificate invalid');
const records=[],globalStart=performance.now(),maxTotalMs=85000;
while(performance.now()-globalStart<maxTotalMs&&bestKnown.k>27){
  const target=bestKnown.k-1;
  let best=null;
  for(let attempt=0;attempt<4&&performance.now()-globalStart<maxTotalMs;attempt++){
    const rem=lowerInitial(current),remainingMs=maxTotalMs-(performance.now()-globalStart);
    const r=improve(rem,target,Math.min(9000,remainingMs));
    if(!best||r.minConflicts<best.minConflicts)best=r;
    if(r.solved)break;
  }
  const summary={target,solved:best.solved,minConflicts:best.minConflicts,
    steps:best.steps,elapsedMs:best.elapsedMs};
  records.push(summary);
  console.log('OPEN_GRAPH_COLORING_TABU_CONTROL',JSON.stringify(summary));
  if(!best.solved)break;
  current=best.colors;
  bestKnown=check(current);
  if(bestKnown.invalidEdges!==0||bestKnown.k>target)
    throw Error('Control solver produced invalid graph certificate');
  fs.writeFileSync(fileURLToPath(new URL('./tabu-control-best.json',import.meta.url)),JSON.stringify({
    attribution:'TabuCol, not original V42. Seed initial coloring independently supplied by V42.',
    source:raw.input,baseline:raw.result,actual:bestKnown,certificate:current,records
  },null,2));
}
console.log('OPEN_GRAPH_COLORING_RESULT',JSON.stringify({
  seedFromOriginalV42:raw.result,controlBest:bestKnown,openRecordIs28:bestKnown.k<28,
  cpuSeconds:(performance.now()-globalStart)/1000,
  trials:records,limit:'Control does NOT demonstrate original V42 global optimum discovery'
}));
