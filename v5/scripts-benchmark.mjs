// Reproducible V5 experiment: untrained vs trained organ vs classic planner on the same unseen worlds.
// Usage: node scripts-benchmark.mjs <episodes> <odd size> <test worlds> [organ seed]
import {writeFile,mkdir} from 'node:fs/promises';
import {Organ} from './engine/organ.mjs';
import {train,evaluate,SEEDS} from './engine/training.mjs';
const episodes=Number(process.argv[2]||300),size=Number(process.argv[3]||9),count=Number(process.argv[4]||30),organSeed=Number(process.argv[5]||17);
if(!Number.isInteger(episodes)||episodes<1||![5,7,9,11,13,15,17].includes(size)||!Number.isInteger(count)||count<3||count>300)throw Error('Usage: node scripts-benchmark.mjs <episodes> <odd size 5..17> <worlds 3..300> [seed]');
const t0=Date.now(),organ=new Organ(organSeed);
const before=evaluate(organ,{seed:SEEDS.test,count,size});
const result=await train(organ,{episodes,size,onProgress:v=>console.log(`ep ${v.done}/${v.total} · val F1₀ ${v.latest.f1_0} (classic ${v.latest.classic.f1_0}) · BCE₀ ${v.latest.bce_0} (classic ${v.latest.classic.bce_0}) · meanF1 ${v.latest.meanF1} · eff ${v.latest.efficiency}`)});
const selected=Organ.restore(result.bestSnapshot);
const after=evaluate(selected,{seed:SEEDS.test,count,size});
const report={version:'v5',organSeed,episodes,size,count,seeds:SEEDS,seconds:Math.round((Date.now()-t0)/1000),selected:result.best,after,beforeTraining:before.modes,history:result.history};
await mkdir('results',{recursive:true});await writeFile(`results/benchmark-${size}x${size}-${episodes}ep-seed${organSeed}.json`,JSON.stringify(report,null,2));
console.table(Object.fromEntries(Object.entries(after.modes).map(([k,v])=>[k,{success:v.success,'F1 step0':v.f1_0,'BCE step0':v.bce_0,'valid step0':v.valid_0,'mean F1':v.meanF1,'ECE step0':v.ece_0,efficiency:v.efficiency}])));
console.log('per family F1 step0:',JSON.stringify(Object.fromEntries(Object.entries(after.families).map(([f,m])=>[f,Object.fromEntries(Object.entries(m).map(([k,v])=>[k,+v.f1_0.toFixed(3)]))]))));
console.log('seconds',report.seconds);
