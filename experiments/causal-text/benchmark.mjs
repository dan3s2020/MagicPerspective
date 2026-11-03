import {CausalNet} from './engine/model.mjs';
import {train,evaluate,SPLITS} from './engine/training.mjs';
import {evaluateHybrid} from './engine/comparison.mjs';
import {mkdir,writeFile} from 'node:fs/promises';
const episodes=Number(process.argv[2]||300),worlds=Number(process.argv[3]||24),seed=Number(process.argv[4]||17);
if(!Number.isInteger(episodes)||episodes<1||episodes>20000||
 !Number.isInteger(worlds)||worlds<3||worlds>300||
 !Number.isInteger(seed)||seed<1)throw Error('Usage: node benchmark.mjs [episodes] [test worlds] [model seed]');
const model=new CausalNet(seed);
const before=evaluate(model,{seed:SPLITS.test,worlds,statesPerTool:6,goalsPerWorld:3});
const hybridBefore=evaluateHybrid(model,{seed:6400021,worlds,extra:2,goalsPerWorld:3});
const training=await train(model,{episodes,validateEvery:Math.max(10,Math.floor(episodes/15)),validationWorlds:6,
 onProgress:p=>console.log('TRAIN',p.done+'/'+p.total,'loss',p.latest.loss,'validationExact',p.latest.validationExact,'plan',p.latest.validationPlan)});
const selected=CausalNet.restore(training.bestSnapshot);
const after=evaluate(selected,{seed:SPLITS.test,worlds,statesPerTool:6,goalsPerWorld:3});
const hybridAfter=evaluateHybrid(selected,{seed:6400021,worlds,extra:2,goalsPerWorld:3});
const report={version:'6.0.0-experiment',seed,episodes,worlds,splits:SPLITS,best:training.best,
 history:training.history,observedExamples:training.measuredExamples,
 inferredExamples:training.inferredExamples,
 before:before.modes,after:after.modes,
 hybridBefore:hybridBefore.models,hybridAfter:hybridAfter.models};
await mkdir(new URL('./results/',import.meta.url),{recursive:true});
const file=new URL('./results/local-v6-'+seed+'-'+episodes+'.json',import.meta.url);
await writeFile(file,JSON.stringify(report,null,2));
console.log('BLIND',JSON.stringify(after,null,2));
console.log('HYBRID_BLIND',JSON.stringify(hybridAfter,null,2));
console.log('INFERENCE_SOURCES',JSON.stringify({observedExamples:training.measuredExamples,inferredExamples:training.inferredExamples}));
console.log('REPORT',file.pathname);
