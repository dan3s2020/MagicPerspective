// Dedicated CPU worker for executable counterfactuals. Never executes edited
// modules in the live V17 brain. No held-out targets are sent to that brain.
import {parentPort,workerData} from 'node:worker_threads';
import {SelfCodeWorld,CodeEffectModel} from '../../../../experimental/self-world/code-world.mjs';
import {measureEdit,configureSealedLock} from '../../../../experimental/self-world/causal-laboratory.mjs';

const w=new SelfCodeWorld({sourceFiles:[{path:workerData.source,label:'engine.mjs'}],sandbox:workerData.sandbox,
  seed:workerData.seed});
parentPort.on('message',async m=>{
  try{
    if(m.kind==='probe'){
      const r=await measureEdit(w,m.slot,m.value,{seed:((workerData.seed||1)*811+ m.index*131)>>>0,steps:420,limit:200});
      parentPort.postMessage({kind:'probe',slot:m.slot,value:m.value,index:m.index,delta:r.delta,before:r.before,after:r.after});
    }else if(m.kind==='lock'){
      const learner=new CodeEffectModel();
      for(const p of m.probes)learner.observe(p);
      // New, untouched held-out examples for each assessment. The learner never
      // receives the seeds, text, or outcomes before predicting each effect.
      configureSealedLock(w,{steps:800,seed:((workerData.seed||1)+m.index*7907)>>>0});
      const audit=await w.lock.evaluate(x=>learner.predict(x));
      let promotion={status:'locked'};
      if(audit.unlocked){
        const best=m.probes.filter(x=>x.delta>0).sort((a,b)=>b.delta-a.delta)[0];
        if(best){
          const draft=w.previewCodeChange({id:best.slot,value:best.value});
          // Separate final holdout. The original V17 trainer is NEVER replaced.
          const held=await measureEdit(w,best.slot,best.value,{seed:((workerData.seed||1)+m.index*9973+12345)>>>0,steps:1800,limit:300});
          if(held.delta>0)promotion={status:'approved-sandbox-only',...w.commitSandboxDraft(draft.sha256,()=>true),heldoutGain:held.delta};
          else promotion={status:'rejected-on-final-holdout',heldoutGain:held.delta};
        }
      }
      parentPort.postMessage({kind:'lock',unlocked:audit.unlocked,accuracy:audit.accuracy,baseline:audit.baseline,
        attempts:audit.challenges,promotion});
    }else throw Error('Unknown evaluator request');
  }catch(err){parentPort.postMessage({kind:m.kind||'unknown',error:err.message});}
});
