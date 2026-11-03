import {MessageBrain} from './engine/brain.mjs';
import {trainEpisode,evaluate,costMAE} from './engine/experiment.mjs';
import {mkdir,writeFile} from 'node:fs/promises';
const episodes=Number(process.argv[2]??250),n=Number(process.argv[3]??33),count=Number(process.argv[4]??18),seed=Number(process.argv[5]??71);
if(!Number.isInteger(episodes)||episodes<1||episodes>10000)throw Error('episodes 1..10000');
const brain=new MessageBrain(seed),initial=costMAE(brain,{n}),first=evaluate(brain,{count,n,seed:920000,modes:['learned','bellman']});
for(let i=0;i<episodes;i++){trainEpisode(brain,i,{n,seed:440000+seed*100});if((i+1)%100===0)process.stdout.write('.');}
const final=costMAE(brain,{n}),results=evaluate(brain,{count,n,seed:920000});
const out={protocol:{episodes,n,count,seed,validationSeed:880000,testSeed:920000,dynamic:true},
 initialMAE:initial,finalMAE:final,initialRoute:first.modes,finalRoute:results,parameters:brain.snapshot()};
await mkdir(new URL('./results/',import.meta.url),{recursive:true});await writeFile(new URL('./results/latest-benchmark.json',import.meta.url),JSON.stringify(out,null,2));
console.log('\n'+JSON.stringify({initialMAE:initial,finalMAE:final,trained:results.modes.learned,bellman:results.modes.bellman,off:results.modes.off,shuffled:results.modes.shuffled,untrained:results.modes.untrained},null,2));
