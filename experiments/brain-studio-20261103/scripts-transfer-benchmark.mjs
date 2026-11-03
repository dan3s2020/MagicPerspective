// Transfer between three domains: one shared brain, identical evaluation seeds.
import {SharedBrain,oneEpisode,blindTest,DOMAINS} from './engine/studio.mjs';
import {mkdir,writeFile} from 'node:fs/promises';
const episodes=Number(process.argv[2]||120),worlds=Number(process.argv[3]||8),seed=Number(process.argv[4]||19);
if(!Number.isInteger(episodes)||episodes<10||episodes>50000||
 !Number.isInteger(worlds)||worlds<3||worlds>80||
 !Number.isInteger(seed)||seed<1)throw Error('Usage: node scripts-transfer-benchmark.mjs [episodes] [test_worlds] [seed]');

const trainOn=(list)=>{
 const brain=new SharedBrain(seed),start=performance.now(),checks=[];
 for(let i=0;i<episodes;i++){
  const domain=list[i%list.length];
  const sample=oneEpisode('universal',brain,{domain,size:11,seed:(730000+i*7919)>>>0,
   learn:true,explore:.2});
  if(i===0||(i+1)%Math.max(5,Math.floor(episodes/10))===0)
   checks.push({episode:i+1,domain,solved:sample.outcome.solved,loss:sample.outcome.loss,
    updates:brain.net.updates});
 }
 return {brain,checks,trainingMs:Math.round(performance.now()-start)};
};
const cases={
 'all-three':DOMAINS,
 'maze+network':['maze','network'],
 'maze+text':['maze','text'],
 'network+text':['network','text'],
 'text-only':['text'],
 'maze-only':['maze'],
 'network-only':['network']
};
const results={schema:'transfer-benchmark-1',episodes,worlds,seed,
 domains:DOMAINS,training:{},outcomes:{},note:'Scores may show no positive transfer. Same evaluation set, different trained domains.'};
for(const [label,trainDomains] of Object.entries(cases)){
 const result=trainOn(trainDomains);
 results.training[label]={domains:trainDomains,elapsedMs:result.trainingMs,curve:result.checks,
  weightsUpdated:result.brain.net.updates};
 results.outcomes[label]=blindTest('universal',result.brain,{count:worlds,size:11,
  seed:918273,domains:DOMAINS}).domains;
 console.log('DOMAIN_TRAIN',label,'time',result.trainingMs,'ms',
  'test',JSON.stringify(results.outcomes[label]));
}
await mkdir(new URL('./results/',import.meta.url),{recursive:true});
const path=new URL('./results/transfer-latest.json',import.meta.url);
await writeFile(path,JSON.stringify(results,null,2));
console.log('TRANSFER_REPORT',path.pathname);
