// Fair, seed-disjoint comparison of neural-only planning and hybrid causal planning.
// All methods share initial nine measured probes; active/random have equal extra budget.
// Transition tests for *all* methods exclude the union of extra queries, so labels
// are never tested on a state that one of the experimental methods just observed.
import {BASE,TOOLS,RNG,createWorld,senseProbes,encodeContext,generateTask} from './world.mjs';
import {makeBelief,hybridPrediction,observeExtra} from './hybrid.mjs';
import {testPlan} from './training.mjs';
const key=event=>event.tool+'@'+event.from.join(',');
const same=(a,b)=>a[0]===b[0]&&a[1]===b[1];
export function evaluateHybrid(model,{seed=6400021,worlds=30,extra=2,goalsPerWorld=3}={}){
 if(!Number.isInteger(worlds)||worlds<1||worlds>120||
  !Number.isInteger(extra)||extra<0||extra>15||
  !Number.isInteger(goalsPerWorld)||goalsPerWorld<1||goalsPerWorld>10)throw Error('Invalid hybrid evaluation budget');
 const methods=['neural-only','hybrid-probes','hybrid-active','hybrid-random'];
 const rows=Object.fromEntries(methods.map(name=>[name,{correct:0,total:0,solved:0,attempted:0,
  noPlan:0,causalUsed:0,neuralUsed:0,unresolved:0}]));
 let heldOutStates=0;
 for(let w=0;w<worlds;w++){
  const world=createWorld(((seed>>>0)+w*7919)>>>0),measured=senseProbes(world),
   context=encodeContext(measured),base=makeBelief(measured),
   active=makeBelief(measured),random=makeBelief(measured);
  const additionalActive=observeExtra(world,active,{extra,mode:'active',seed:seed+w*73});
  const additionalRandom=observeExtra(world,random,{extra,mode:'random',seed:seed+w*1039});
  const excluded=new Set([...measured,...additionalActive,...additionalRandom].map(key));
  const predict={
   'neural-only':(s,t)=>({state:model.predict(s,t,context).state,source:'neural-only'}),
   'hybrid-probes':(s,t)=>hybridPrediction(model,base,s,t,context),
   'hybrid-active':(s,t)=>hybridPrediction(model,active,s,t,context),
   'hybrid-random':(s,t)=>hybridPrediction(model,random,s,t,context)
  };
  for(const tool of TOOLS)for(let red=0;red<BASE;red++)for(let blue=0;blue<BASE;blue++){
   const state=[red,blue];
   if(excluded.has(key({tool,from:state})))continue;
   const expected=world.intervene(state,tool).to;heldOutStates++;
   for(const name of methods){
    const p=predict[name](state,tool),record=rows[name];
    record.total++;record.correct+=Number(same(expected,p.state));
    record.causalUsed+=Number(p.source==='causal');
    record.neuralUsed+=Number(p.source==='neural-fallback'||p.source==='neural-only');
    record.unresolved+=Number(p.source==='neural-fallback');
   }
  }
  for(let g=0;g<goalsPerWorld;g++){
   const task=generateTask(world,(((seed^0x4567)>>>0)+w*103+g*777)>>>0,{minSteps:2,maxSteps:5});
   if(!task.reachable)continue;
   for(const name of methods){
    const record=rows[name],trial=testPlan(world,task,(s,t)=>predict[name](s,t).state);
    record.attempted++;record.solved+=Number(trial.success);record.noPlan+=Number(!trial.found);
   }
  }
 }
 return {seed,worlds,extraProbes:extra,initialProbesPerWorld:9,
  heldOutStatesPerMode:heldOutStates,goalsPerWorld,
  models:Object.fromEntries(methods.map(name=>{
   const r=rows[name];return [name,{exactTransition:+(r.correct/Math.max(1,r.total)).toFixed(4),
    planningSuccess:+(r.solved/Math.max(1,r.attempted)).toFixed(4),
    solved:r.solved,attempted:r.attempted,transitions:r.total,
    neuralFallback:r.neuralUsed,causalPredictions:r.causalUsed,
    noPlan:r.noPlan,observationsPerWorld:9+(name.endsWith('active')||name.endsWith('random')?extra:0)}];
  }))};
}
