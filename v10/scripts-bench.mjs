import {ShapeOrgan} from './engine/organ.mjs';
import {train,evaluate} from './engine/train.mjs';
const E=Number(process.argv[2]||200),sizes=(process.argv[3]||'7').split(',').map(Number),seed=Number(process.argv[4]||7),count=Number(process.argv[5]||30),testSizes=(process.argv[6]||process.argv[3]||'7').split(',').map(Number);
const t0=Date.now(),org=new ShapeOrgan({seed}),ns=new ShapeOrgan({seed});
await train(org,{episodes:E,sizes,onProgress:h=>console.log('organ',h.episode,'bce0',h.bce0,'f1_0',h.f1_0,'ratio',h.ratio,'solved',h.solved,'loss',h.loss?.toFixed(3),Math.round((Date.now()-t0)/1000)+'s')});
await train(ns,{episodes:E,sizes,mode:'next-step',onProgress:h=>{}});
const R=evaluate(org,{count,sizes:testSizes,nextStep:ns,untrained:new ShapeOrgan({seed:seed+1})});console.table(Object.fromEntries(Object.entries(R).map(([k,v])=>{const {bySize,...r}=v;return [k,r];})));
for(const [k,v] of Object.entries(R))console.log(k,JSON.stringify(v.bySize));
console.log('s',Math.round((Date.now()-t0)/1000));
