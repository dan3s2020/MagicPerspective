// Numerical, not promotional, held-out measurement of the same cell network
// over all three domains. No "100%" labels without the underlying denominator.
import {GraphCellsBrain} from './engine/cells.mjs';
import {oneEpisode,blindTest,DOMAINS} from './engine/studio.mjs';
const ep=Number(process.argv[2]||45),worlds=Number(process.argv[3]||5);
if(!Number.isInteger(ep)||ep<3||ep>20000||
 !Number.isInteger(worlds)||worlds<3||worlds>50)throw Error('Usage: node scripts-cells-benchmark.mjs [3..20000 episodes] [3..50 worlds]');
const kinds={
 'all-domains':DOMAINS,
 'maze-only':['maze'],
 'network-only':['network'],
 'symbols-only':['text']
};
const report={schema:'graph-cells-benchmark.v1',ep,worlds,seed:314159,results:{},
 note:'All methods use the exact SAME graph-cell architecture. All blind seeds are disjoint from training and evaluation is read-only. No claim of positive transfer is made.'};
for(const [name,domains] of Object.entries(kinds)){
 const brain=new GraphCellsBrain(19),begin=performance.now(),loss=[],gradients=[],changes=[];
 for(let i=0;i<ep;i++){
  const d=domains[i%domains.length],s=(60005000+Math.imul(i,7919))>>>0;
  const r=oneEpisode('cells',brain,{domain:d,seed:s,size:9,learn:true,explore:.23});
  if(Number.isFinite(r.outcome.loss))loss.push(r.outcome.loss);
  gradients.push(r.outcome.learning?.gradientNorm??0);
  changes.push(r.outcome.learning?.weightDelta??0);
 }
 const evaluated=blindTest('cells',brain,{count:worlds,size:9,seed:931071,domains:DOMAINS});
 report.results[name]={trainedDomains:domains,episodes:brain.episodes,
  weightUpdates:brain.steps,elapsedSeconds:+((performance.now()-begin)/1000).toFixed(3),
  meanLoss:loss.reduce((s,x)=>s+x,0)/Math.max(1,loss.length),
  meanGradientNorm:gradients.reduce((s,x)=>s+x,0)/gradients.length,
  totalWeightMovement:changes.reduce((s,x)=>s+x,0),domains:evaluated.domains};
 console.log('GRAPH_CELLS',name,JSON.stringify(report.results[name]));
}
const {mkdir,writeFile}=await import('node:fs/promises');
await mkdir(new URL('./results/',import.meta.url),{recursive:true});
await writeFile(new URL('./results/cells-benchmark-latest.json',import.meta.url),JSON.stringify(report,null,2));
console.log('GRAPH_CELLS_COMPLETE',JSON.stringify({episodes:ep,worlds,domains:DOMAINS}));
