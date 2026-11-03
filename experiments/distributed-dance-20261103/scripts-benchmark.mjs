import {CostRule} from './engine/brain.mjs';
import {trainEpisode,evaluate} from './engine/experiment.mjs';
import {makeWorld,KINDS} from './engine/world.mjs';
import {writeFile,mkdir} from 'node:fs/promises';
const episodes=Math.min(3000,Math.max(10,Number(process.argv[2]||150)));
const n=Math.min(65,Math.max(12,Number(process.argv[3]||33)));
const count=Math.min(60,Math.max(6,Number(process.argv[4]||24)));
const seed=Number(process.argv[5]||55),rule=new CostRule(seed);
const mae=()=>{let sum=0,num=0;for(let i=0;i<21;i++){
 const world=makeWorld(900000+i*7193,n,KINDS[i%3]);for(const e of world.links){sum+=Math.abs(rule.predict(e.sensor)-e.cost);num++;}}
 return sum/num;};
const baseline=evaluate(rule,{count,n,seed:8700000});const init=mae();
for(let i=0;i<episodes;i++)trainEpisode(rule,i,{n,seed:1300000});
const after=evaluate(rule,{count,n,seed:8700000}),loss=mae();
const out={date:'2026-11-03',config:{episodes,n,count,seed},beforeMAE:+init.toFixed(5),afterMAE:+loss.toFixed(5),before:baseline.modes,after:after.modes,limitations:'Message propagation is explicit distributed value iteration, not learned emergent intelligence. Cost prediction is learned from traversals. One seed is insufficient for statistical proof.'};
await mkdir('results',{recursive:true});await writeFile('results/latest-benchmark.json',JSON.stringify(out,null,2));console.log(JSON.stringify(out,null,2));
