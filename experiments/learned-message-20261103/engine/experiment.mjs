// All message learning targets are observed returns-to-go on executed trajectories.
// No exact shortest path or evaluator truth enters optimizeMessages().
import {makeWorld,oracle,KINDS,RNG} from './world.mjs';
import {CostRule,Collective} from './brain.mjs';
const mean=a=>a.length?a.reduce((s,x)=>s+x,0)/a.length:null;
const pairset=nodes=>new Set(nodes.slice(1).map((n,i)=>[Math.min(n,nodes[i]),Math.max(n,nodes[i])].join(':')));
const f1=(guess,truth)=>{const a=pairset(guess),b=pairset(truth);let hit=0;
 for(const e of a)if(b.has(e))hit++;return a.size+b.size?2*hit/(a.size+b.size):1;};
export const MODES=['learned','bellman','off','shuffled','untrained'];
export function single(world,rule,mode='learned',{learn=false,record=false}={}){
 const model=mode==='untrained'?new CostRule(rule.seed):CostRule.restore(rule.snapshot());
 const c=new Collective(world,model,{mode:mode==='untrained'?'learned':mode});
 // Every condition receives identical physical links, sensor information and message budget.
 c.run(world.n*6,{learn,rounds:c.messageRounds});
 const opt=oracle(world),initial=c.history.find(h=>h.type==='ready')||c.history[0],guess=initial?.shape||[world.start];
 return {solved:c.finished,cost:c.effort,
  penalized:c.effort+(c.finished?0:world.n*30), // fixed failure penalty: no oracle used in reward
  optimal:opt.cost,efficiency:c.finished?opt.cost/Math.max(c.effort,1):0,
  initialF1:f1(guess,opt.route),initialConnected:guess.at(-1)===world.goal,
  coherence:c.coherence(),phaseCoherence:c.phaseCoherence(),steps:c.steps,
  modelLoss:c.rule.updates?c.rule.loss/c.rule.updates:0,collective:record?c:undefined};
}
export function evaluate(rule,{count=12,n=33,seed=8700000,modes=MODES}={}){
 if(!Number.isInteger(count)||count<3||count>80)throw Error('Evaluation count 3..80');
 const result={seed,n,count,modes:{},families:{}};
 for(const mode of modes){const rows=[];
  for(let i=0;i<count;i++){const kind=KINDS[i%KINDS.length],w=makeWorld(seed+i*7919,n,kind);
   rows.push({kind,...single(w,rule,mode)});
  }
  const values={success:mean(rows.map(x=>Number(x.solved))),cost:mean(rows.map(x=>x.penalized)),
   f1:mean(rows.map(x=>x.initialF1)),connected:mean(rows.map(x=>Number(x.initialConnected))),
   efficiency:mean(rows.map(x=>x.efficiency)),coherence:mean(rows.map(x=>x.coherence)),
   phaseCoherence:mean(rows.map(x=>x.phaseCoherence)),steps:mean(rows.map(x=>x.steps))};
  result.modes[mode]=Object.fromEntries(Object.entries(values).map(([k,v])=>[k,v===null?null:+v.toFixed(4)]));
  for(const kind of KINDS){const subset=rows.filter(x=>x.kind===kind);
   if(subset.length){result.families[kind]??={};result.families[kind][mode]={success:mean(subset.map(x=>Number(x.solved))),cost:mean(subset.map(x=>x.penalized))};}}
 }return result;
}
function huber(error){const d=Math.abs(error);return d<1?d*d*.5:d-.5;}
function learnedLoss(world,model,targets,rounds){
 const c=new Collective(world,model,{mode:'learned',messageRounds:rounds});
 for(let k=0;k<rounds;k++)c.exchange();
 let loss=0,count=0;
 for(const [id,observed] of targets){const predicted=c.nodes[id].value;
  if(!Number.isFinite(predicted)){loss+=12;count++;continue;}
  loss+=huber((predicted-observed)/9);count++;
 }
 return loss/Math.max(1,count);
}
export function optimizeMessages(model,world,targets,episode,{sigma=.16,learningRate=.013}={}){
 if(targets.size<3)return {updated:false,loss:null};
 const rng=new RNG((episode*2654435761+world.seed)>>>0),original=model.messageW.slice();
 const direction=original.map(()=>rng.next()<.5?-1:1);
 const probe=(sign)=>{const copy=CostRule.restore(model.snapshot());
  copy.messageW=original.map((x,i)=>x+sign*sigma*direction[i]);
  return learnedLoss(world,copy,targets,Math.max(16,world.n*3));};
 const positive=probe(1),negative=probe(-1);
 // Antithetic zeroth-order estimate of d(loss)/d(message parameters).
 const grad=cap((positive-negative)/(2*sigma),-12,12);
 const updated=original.map((x,i)=>cap(x-learningRate*grad*direction[i],-2.5,2.5));
 model.messageW=updated;model.messageUpdates++;
 const loss=learnedLoss(world,model,targets,Math.max(16,world.n*3));
 model.messageLoss+=loss;
 return {updated:true,loss,positive,negative,gradientNorm:Math.abs(grad)*Math.sqrt(direction.length)};
}
const cap=(x,a,b)=>Math.max(a,Math.min(b,x));
export function trainEpisode(rule,number,{n=33,seed=1300000}={}){
 const kind=KINDS[number%KINDS.length],world=makeWorld((seed+number*7919)>>>0,n,kind);
 const episode=new Collective(world,rule,{mode:'learned'});
 episode.run(world.n*5,{learn:true,rounds:episode.messageRounds});
 const returns=episode.observedReturns();
 const step=optimizeMessages(rule,world,returns,number+1);
 return {episode:number+1,kind,solved:episode.finished,effort:+episode.effort.toFixed(3),
  updates:rule.updates,messageUpdates:rule.messageUpdates,
  meanAbsoluteError:rule.updates?rule.loss/rule.updates:0,
  messageLoss:rule.messageUpdates?rule.messageLoss/rule.messageUpdates:null,
  currentMessageLoss:step.loss,messageUpdated:step.updated,
  shapeInitial:(episode.history.find(h=>h.type==='ready')?.shape||[]).length};
}
