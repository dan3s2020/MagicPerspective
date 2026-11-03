import {CostRule} from './engine/brain.mjs';
import {trainEpisode,evaluate} from './engine/experiment.mjs';
import {makeWorld,KINDS} from './engine/world.mjs';
import {writeFile,mkdir} from 'node:fs/promises';
const episodes=Math.min(3000,Math.max(10,Number(process.argv[2]||150)));
const n=Math.min(65,Math.max(12,Number(process.argv[3]||33)));
const count=Math.min(60,Math.max(6,Number(process.argv[4]||24)));
const seed=Number(process.argv[5]||55),model=new CostRule(seed);
const mae=()=>{let sum=0,num=0;for(let i=0;i<21;i++){
 const w=makeWorld(900000+i*7193,n,KINDS[i%3]);for(const e of w.links){sum+=Math.abs(model.predict(e.sensor)-e.cost);num++;}}
 return sum/num;};
const before=evaluate(model,{count,n,seed:8700000}),beforeMAE=mae();
for(let i=0;i<episodes;i++)trainEpisode(model,i,{n,seed:1300000});
const after=evaluate(model,{count,n,seed:8700000}),afterMAE=mae();
const result={date:'2026-11-03',config:{episodes,n,count,seed},
 beforeMAE:+beforeMAE.toFixed(5),afterMAE:+afterMAE.toFixed(5),
 before:before.modes,after:after.modes,
 messageUpdates:model.messageUpdates,messageWeightDelta:model.messageW.map((x,i)=>+(x-(new CostRule(seed)).messageW[i]).toFixed(6)),
 caveat:'Fixed local message skeleton and objective; 12 trained weights controlling message correction, attention, temperature, damping. Targets from actual trajectories. Baselines use same worlds, message rounds and sensors. Does not demonstrate emerging general intelligence or transfer to SAT.'};
await mkdir('results',{recursive:true});await writeFile('results/latest-benchmark.json',JSON.stringify(result,null,2));
console.log(JSON.stringify(result,null,2));
