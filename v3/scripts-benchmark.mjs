import {newBrains,train,evaluate} from './engine/training.mjs';
const episodes=Number(process.argv[2]||600),n=Number(process.argv[3]||11);
const {model,causal}=newBrains(17);
const before=evaluate(model,{seed:990031,count:72,n,navigation:true,causal});
console.log('BEFORE',JSON.stringify(before));
const r=await train(model,causal,{episodes,n,interval:Math.max(20,Math.floor(episodes/8)),validateCount:30,onProgress:x=>console.log('PROGRESS',JSON.stringify(x.latest))});
if(r.bestSnapshot){const {PerspectiveNet,CausalModel}=await import('./engine/model.mjs');
 const best=PerspectiveNet.restore(r.bestSnapshot.model),bc=CausalModel.restore(r.bestSnapshot.causal);
 console.log('AFTER',JSON.stringify(evaluate(best,{seed:990031,count:72,n,navigation:true,causal:bc})));
}
console.log('BEST_VALIDATION',JSON.stringify(r.best));
