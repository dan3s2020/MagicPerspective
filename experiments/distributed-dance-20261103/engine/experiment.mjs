import {makeWorld,oracle,KINDS} from './world.mjs';
import {CostRule,Collective} from './brain.mjs';
const mean=a=>a.length?a.reduce((s,v)=>s+v,0)/a.length:null;
const pairset=nodes=>new Set(nodes.slice(1).map((n,i)=>[Math.min(n,nodes[i]),Math.max(n,nodes[i])].join(':')));
const f1=(guess,truth)=>{const a=pairset(guess),b=pairset(truth);let hit=0;for(const e of a)if(b.has(e))hit++;return a.size+b.size?2*hit/(a.size+b.size):1;};
export const MODES=['real','off','shuffled','untrained'];
export function single(world,rule,mode='real',{learn=false,record=false}={}){
  const c=new Collective(world,mode==='untrained'?new CostRule(rule.seed):CostRule.restore(rule.snapshot()),{mode:mode==='untrained'?'real':mode});
  if(record)c.run(world.n*6,{learn});else{
    // Initial full distributed hypothesis; never consults the oracle or full hidden graph.
    for(let i=0;i<c.messageRounds;i++)c.exchange();
    c.sample('ready');
    while(!c.finished&&c.steps<world.n*6){let e=c.step({learn});if(e.type==='stuck')break;}
  }
  const opt=oracle(world),before=c.history.find(x=>x.type==='ready')||c.history[0];
  const first=before?.shape||[world.start],solved=c.finished;
  return {solved,cost:c.effort,penalized:c.effort+(solved?0:opt.cost+world.n*4),optimal:opt.cost,
    efficiency:solved?opt.cost/Math.max(c.effort,1):0,initialF1:f1(first,opt.route),
    initialConnected:first.at(-1)===world.goal,coherence:c.coherence(),phaseCoherence:c.phaseCoherence(),steps:c.steps,
    modelLoss:c.rule.updates?c.rule.loss/c.rule.updates:0,collective:c};
}
// Evaluation shares worlds and initial model across modes. No mode can mutate the trained checkpoint.
export function evaluate(rule,{count=12,n=33,seed=8700000,modes=MODES}={}){
 if(!Number.isInteger(count)||count<3||count>80)throw Error('Evaluation count 3..80');
 const out={seed,n,count,modes:{},families:{}};
 for(const mode of modes){const rows=[];
   for(let i=0;i<count;i++){
     const kind=KINDS[i%KINDS.length],w=makeWorld(seed+i*7919,n,kind);
     const r=single(w,rule,mode);rows.push({kind,...r,collective:undefined});
   }
   const values={success:mean(rows.map(x=>Number(x.solved))),cost:mean(rows.map(x=>x.penalized)),
     f1:mean(rows.map(x=>x.initialF1)),connected:mean(rows.map(x=>Number(x.initialConnected))),
     efficiency:mean(rows.map(x=>x.efficiency)),coherence:mean(rows.map(x=>x.coherence)),phaseCoherence:mean(rows.map(x=>x.phaseCoherence)),
     steps:mean(rows.map(x=>x.steps))};
   out.modes[mode]=Object.fromEntries(Object.entries(values).map(([k,v])=>[k,v===null?null:+v.toFixed(4)]));
   for(const kind of KINDS){const section=rows.filter(x=>x.kind===kind);if(section.length){out.families[kind]??={};out.families[kind][mode]={success:mean(section.map(x=>Number(x.solved))),cost:mean(section.map(x=>x.penalized))};}}
 }
 return out;
}
export function trainEpisode(rule,number,{n=33,seed=1300000}={}){
 const kind=KINDS[number%KINDS.length];
 const w=makeWorld((seed+number*7919)>>>0,n,kind);
 const c=new Collective(w,rule,{mode:'real'});
 c.run(w.n*5,{learn:true,rounds:Math.max(12,Math.floor(n*1.5))});
 // c itself used the SAME rule, updated only from costs of actions actually taken.
 return {episode:number+1,kind,solved:c.finished,effort:+c.effort.toFixed(3),updates:rule.updates,
  meanAbsoluteError:rule.updates?rule.loss/rule.updates:0,shapeInitial:c.history[0]?.shape.length||1};
}
