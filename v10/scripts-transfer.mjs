// D5 (messages 49, 53, 55): transfer. The same organism, without resetting its parameters, after mazes, enters worlds that are not mazes.
// Compared with an organism that starts those worlds from zero, at equal experience in the new world.
// node scripts-transfer.mjs <maze episodes> <new-world episodes> <seed> [mix]
// mix=1: the veteran keeps living in mazes too (one maze episode after each new-world episode), so the old world is not forgotten.
import {writeFile,mkdir} from 'node:fs/promises';
import {ShapeOrgan} from './engine/organ.mjs';
import {train,trainG,evaluate,evaluateG} from './engine/train.mjs';
const [EM,EN,seed]=[1500,150,7].map((d,i)=>Number(process.argv[i+2]||d)),t0=Date.now(),out={EM,EN,seed,kinds:{}},mix=process.argv[5]==='1';out.mix=mix;let mz=0;
const more=async(o,kind,k,s)=>{if(!mix)return trainG(o,{kind,episodes:k,every:1e9,seed:s});for(let i=0;i<k;i++){await trainG(o,{kind,episodes:1,every:1e9,seed:s+i*7919});await train(o,{episodes:1,sizes:[7,9],every:1e9,seed:5000011+(mz++)*7919});}};
const veteran=new ShapeOrgan({seed});await train(veteran,{episodes:EM,sizes:[7],every:1e9});
out.mazeBefore=evaluate(veteran,{count:24,sizes:[7,9],modes:['organ']}).organ;
for(const kind of ['graph','sat']){const rows=[];
  const v=ShapeOrgan.restore(veteran.snapshot()),f=new ShapeOrgan({seed:seed+100});
  const at=[0,25,50,100,EN].filter((x,i,a)=>x<=EN&&a.indexOf(x)===i);let done=0;
  for(const k of at){const more_=k-done;if(more_>0){await more(v,kind,more_,9000001+done*7919);await trainG(f,{kind,episodes:more_,every:1e9,seed:9000001+done*7919});done=k;}
    const ev=o=>evaluateG(o,{kind,count:30,modes:['organ']}).organ;rows.push({episodes:k,veteran:ev(v),fresh:ev(f)});
    console.log(kind,k,'veteran',JSON.stringify(rows.at(-1).veteran),'fresh',JSON.stringify(rows.at(-1).fresh),Math.round((Date.now()-t0)/1000)+'s');}
  out.kinds[kind]=rows;if(kind==='sat')out.mazeAfter=evaluate(v,{count:24,sizes:[7,9],modes:['organ']}).organ;}
await mkdir('results',{recursive:true});await writeFile(`results/transfer-${EM}-${EN}-seed${seed}${mix?'-mix':''}.json`,JSON.stringify(out,null,2));
console.log('maze before',JSON.stringify(out.mazeBefore),'maze after graph+sat',JSON.stringify(out.mazeAfter));
