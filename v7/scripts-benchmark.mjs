// node scripts-benchmark.mjs <episodes> <odd size> <test worlds> [seed]
import {writeFile,mkdir} from 'node:fs/promises';
import {Organism,Organism7,restoreBrain} from './engine/organ.mjs';
import {train,evaluate} from './engine/training.mjs';
const [episodes,size,count,seed]=[300,15,40,17].map((d,i)=>Number(process.argv[i+2]||d)),organ=process.argv[6]||'v7';
const t0=Date.now(),org=organ==='v6'?new Organism(seed):new Organism7(seed);
const r=await train(org,{episodes,size,onProgress:v=>console.log(`ep ${v.done}/${v.total} · formă pas0 ${v.latest.match0} (clasic ${v.latest.classic.match0}) · abatere ${v.latest.dev0} (clasic ${v.latest.classic.dev0}) · drum/optim ${v.latest.ratio} (clasic ${v.latest.classic.ratio})`)});
const best=restoreBrain(r.bestSnapshot),test=evaluate(best,{count,size});
await mkdir('results',{recursive:true});
await writeFile(`results/benchmark-${organ}-${size}x${size}-${episodes}ep-seed${seed}.json`,JSON.stringify({version:'v7',organ,seed,episodes,size,count,seconds:Math.round((Date.now()-t0)/1000),selected:r.best,test,history:r.history},null,2));
for(const [k,v] of Object.entries(test.kinds))console.log('\n'+k),console.table(v);
console.log('seconds',Math.round((Date.now()-t0)/1000));
