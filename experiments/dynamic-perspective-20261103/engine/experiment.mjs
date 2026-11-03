import {makeWorld,oracle,FAMILIES,key,localView} from './world.mjs';
import {Collective,MessageBrain} from './brain.mjs';
const mean=a=>a.length?a.reduce((s,x)=>s+x,0)/a.length:null;
const edges=route=>new Set(route.slice(1).map((v,i)=>key(route[i],v)));
export function f1(a,b){const x=edges(a),y=edges(b);let hit=0;for(const k of x)if(y.has(k))hit++;return x.size+y.size?2*hit/(x.size+y.size):1;}
export const MODES=['learned','bellman','off','shuffled','untrained'];
export function runOne(world,brain,mode='learned',{dynamic=true,training=false}={}){
 const model=mode==='untrained'?new MessageBrain(brain.seed):MessageBrain.restore(brain.snapshot());
 const c=new Collective(world,model,{mode:mode==='untrained'?'learned':mode,online:training});
 // Initial shape is captured BEFORE any physical movement, using only local messages.
 c.run({dynamic,maxMoves:world.n*5,learn:training});
 const initial=c.initialShape||{nodes:[world.start],connected:false};
 // Truth only in this evaluation scope; never in brain, choose, exchange, or learnTrajectory.
 // The initial oracle must be evaluated against initial frozen world, not post-mutation.
 return {solved:c.solved,cost:c.effort,steps:c.steps,initial,collective:c};
}
export function evaluate(brain,{count=18,n=33,seed=900000,changed=true,modes=MODES}={}){
 if(!Number.isInteger(count)||count<3||count>80)throw Error('count must be 3..80');
 const out={count,n,seed,changed,modes:{},byFamily:{}};
 for(const mode of modes){const rows=[];
  for(let i=0;i<count;i++){
   const world=makeWorld((seed+i*7919)>>>0,n,FAMILIES[i%FAMILIES.length]);
   const ideal=oracle(world),trial=runOne(world,brain,mode,{dynamic:changed});
   const punished=trial.cost+(trial.solved?0:ideal.cost+n*15);
   rows.push({family:world.family,success:trial.solved?1:0,cost:punished,
    firstF1:f1(trial.initial.nodes,ideal.route),firstConnected:trial.initial.connected?1:0,
    finalConnected:trial.collective.shape().connected?1:0,steps:trial.steps,changes:trial.collective.changes});
  }
  const summarize=group=>({success:+mean(group.map(x=>x.success)).toFixed(4),cost:+mean(group.map(x=>x.cost)).toFixed(3),
   firstF1:+mean(group.map(x=>x.firstF1)).toFixed(4),initialConnected:+mean(group.map(x=>x.firstConnected)).toFixed(4),
   steps:+mean(group.map(x=>x.steps)).toFixed(3),changedEndpoints:+mean(group.map(x=>x.changes)).toFixed(2)});
  out.modes[mode]=summarize(rows);
  for(const kind of FAMILIES){const group=rows.filter(x=>x.family===kind);if(group.length){out.byFamily[kind]??={};out.byFamily[kind][mode]=summarize(group);}}
 }
 return out;
}
export function trainEpisode(brain,num,{n=33,seed=130000}={}){
 const family=FAMILIES[num%FAMILIES.length],world=makeWorld((seed+num*5387)>>>0,n,family);
 // Train the same persistent brain from its own physically experienced transitions.
 const collective=new Collective(world,brain,{mode:'learned',online:true});
 collective.run({dynamic:true,maxMoves:n*5,learn:true});
 brain.episodes++;
 return {episode:brain.episodes,family,solved:collective.solved,cost:+collective.effort.toFixed(2),
  costUpdates:brain.costUpdates,ruleUpdates:brain.ruleUpdates,initialConnected:collective.initialShape?.connected||false,
  costMAE:brain.costUpdates?brain.costLoss/brain.costUpdates:0,
  ruleMAE:brain.ruleUpdates?brain.ruleLoss/brain.ruleUpdates:0,changes:collective.changes};
}
// A sensor-cost evaluation with separate unseen worlds, does not update brain.
export function costMAE(brain,{seed=880000,n=33,count=12}={}){
 let error=0,samples=0;for(let i=0;i<count;i++){
  const w=makeWorld(seed+i*8137,n,FAMILIES[i%3]);
  for(const e of w.links){const view=localView(w,e.a).links.find(l=>l.id===e.id);
   error+=Math.abs(brain.predictCost(view)-e.actual);samples++;}
 }
 return +(error/samples).toFixed(5);
}
