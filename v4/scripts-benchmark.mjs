import {writeFile,mkdir} from 'node:fs/promises';
import {makeBrain,evaluate,train} from './engine/training.mjs';
const episodes=Number(process.argv[2]||200),size=Number(process.argv[3]||9),count=Number(process.argv[4]||12);
if(!Number.isInteger(episodes)||episodes<1||episodes>20000||![5,7,9,11,13,15,17].includes(size)||!Number.isInteger(count)||count<3||count>60)throw Error('Usage: node scripts-benchmark.mjs <episodes 1..20000> <odd size 5..17> <count 3..60>');
const {net,perspective}=makeBrain();
const before=evaluate(net,perspective,{seed:4040500,count,size});
const result=await train(net,perspective,{episodes,size,seed:2000001,validationCount:6,onProgress:v=>{if(v.done===episodes||v.done%50===0)console.log(`Training ${v.done}/${episodes} | heldout F1 ${v.latest.heldoutF1} | neutral ${v.latest.neutralF1}`);}});
const selected=result.bestSnapshot??{net:net.snapshot(),perspective:perspective.snapshot()};
const {WorldNet}=await import('./engine/model.mjs');const {Perspective}=await import('./engine/perspective.mjs');
const after=evaluate(WorldNet.restore(selected.net),Perspective.restore(selected.perspective),{seed:4040500,count,size});
const report={version:'v4',testSeed:4040500,validationSeed:3030301,trainSeed:2000001,episodes,size,count,before,after,best:result.best,history:result.history,
 limitations:['Beam search may require explicit model-based fallback','Public potential-edge scaffold is known','Training uses oracle next-transition supervision','No proof of domain-general perspective invention','Cost and shape improvements are not presumed']};
await mkdir('results',{recursive:true});await writeFile('results/local-benchmark.json',JSON.stringify(report,null,2));
console.log(JSON.stringify({before:before.modes,after:after.modes,selected:result.best},null,2));
