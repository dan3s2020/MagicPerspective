// A causal organ built strictly from measured intervention events.
// Unlike the neural net, its grammar of 13 candidate laws is predefined.
// It can abstain when observations contradict every candidate.
import {BASE,TOOLS,RNG,features} from './world.mjs';
import {HypothesisLearner} from './hypotheses.mjs';
const key=state=>state.join(',');
export function makeBelief(events){
 if(!Array.isArray(events))throw Error('Measured events array required');
 const organ=new HypothesisLearner();
 for(const event of events)organ.observe(event);
 return organ;
}
export function causalPrediction(organ,state,tool){
 const candidates=organ.candidates(tool);
 if(!candidates.length||candidates[0].mismatch!==0)
  return {state:null,source:'abstain',confidence:0,alternatives:candidates.length};
 const prediction=organ.predict(state,tool);
 if(prediction.unresolved||prediction.confidence!==1)
  return {state:null,source:'uncertain',confidence:prediction.confidence,alternatives:candidates.length};
 return {state:prediction.state,source:'causal',confidence:1,alternatives:candidates.length};
}
export function hybridPrediction(model,organ,state,tool,context){
 const causal=causalPrediction(organ,state,tool);
 if(causal.state!==null)return causal;
 const neural=model.predict(state,tool,context);
 return {state:neural.state,source:'neural-fallback',
  confidence:Math.min(...neural.confidence),alternatives:causal.alternatives};
}
// Inferred labels are produced by observationally consistent laws, without
// calling the world's secret teacher() or its intervene() method.
// Abstain instead of fabricating a label when candidate laws disagree.
export function inferTrainingSamples(observedEvents,context,{perTool=20,seed=19}={}){
 if(!Number.isInteger(perTool)||perTool<0||perTool>46)throw Error('Invalid inference budget');
 const organ=makeBelief(observedEvents),rng=new RNG(seed),samples=[];
 for(const tool of TOOLS){
  const seen=new Set(organ.events[tool].map(e=>key(e.from))),unseen=[];
  for(let a=0;a<BASE;a++)for(let b=0;b<BASE;b++){
   if(!seen.has(key([a,b])))unseen.push([a,b]);
  }
  for(let i=unseen.length-1;i>0;i--){
   const j=rng.int(i+1);[unseen[i],unseen[j]]=[unseen[j],unseen[i]];
  }
  let n=0;
  for(const state of unseen){
   if(n>=perTool)break;
   const prediction=causalPrediction(organ,state,tool);
   if(prediction.state===null)continue;
   samples.push({input:features(state,tool,context),target:prediction.state,
    provenance:'inferred-consensus'});n++;
  }
 }
 return {samples,summary:organ.summary()};
}
export function observeExtra(world,organ,{extra=0,mode='active',seed=11}={}){
 if(!Number.isInteger(extra)||extra<0||extra>30||!['active','random'].includes(mode))
  throw Error('Invalid observation budget or policy');
 const rng=new RNG(seed),events=[];
 for(let i=0;i<extra;i++){
  let selected;
  if(mode==='active')selected=organ.chooseIntervention();
  else{
   const unused=[];
   for(const tool of TOOLS){
    const seen=new Set(organ.events[tool].map(e=>key(e.from)));
    for(let a=0;a<BASE;a++)for(let b=0;b<BASE;b++){
     if(!seen.has(key([a,b])))unused.push({tool,state:[a,b]});
    }
   }
   selected=unused.length?unused[rng.int(unused.length)]:null;
  }
  if(!selected)break;
  const event=world.intervene(selected.state,selected.tool);
  organ.observe(event);events.push(event);
 }
 return events;
}
