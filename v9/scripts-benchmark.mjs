// node scripts-benchmark.mjs <episodes> <test worlds per kind> [seed]
import {writeFile,mkdir} from 'node:fs/promises';
import {UOrganism} from './engine/uorgan.mjs';
import {UKINDS} from './engine/graphs.mjs';
import {train,evaluate} from './engine/utraining.mjs';
const [episodes,perKind,seed]=[300,12,17].map((d,i)=>Number(process.argv[i+2]||d)),t0=Date.now(),org=new UOrganism(seed);
const r=await train(org,{episodes,onProgress:v=>console.log(`ep ${v.done}/${v.total} · drum ghicit ${v.latest.match0} (fără organ ${v.latest.classic.match0}) · cost ${v.latest.ratio} (fără organ ${v.latest.classic.ratio})`)});
const best=UOrganism.restore(r.bestSnapshot),test=evaluate(best,{count:perKind*UKINDS.length});
await mkdir('results',{recursive:true});await writeFile(`results/benchmark-${episodes}ep-seed${seed}.json`,JSON.stringify({version:'v9',seed,episodes,perKind,seconds:Math.round((Date.now()-t0)/1000),selected:r.best,democracy:best.democracy.snapshot().history.slice(-10),test,history:r.history},null,2));
for(const [k,v] of Object.entries(test.kinds)){console.log('\n'+k);console.table(Object.fromEntries(Object.entries(v).map(([m,x])=>[m,{drum0:x.match0,surprize:x.surprises,cost:x.ratio,rezolvat:x.solved}])));}
console.log('seconds',Math.round((Date.now()-t0)/1000));
