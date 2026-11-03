import {makeWorld,oracle} from './world.mjs';
import {WorldNet,features,skeletonDistances} from './model.mjs';
import {Perspective} from './perspective.mjs';
import {Agent,routeMetrics} from './agent.mjs';
const families=['maze','braided','graph'];
const rndSeed=(seed,episode)=>((seed>>>0)+episode*7919)>>>0;
const mean=(sum,count)=>count?sum/count:0;
export function trainingEpisode(net,perspective,seed,kind,size){
 const world=makeWorld(seed,kind,size);const agent=new Agent(world,net,perspective,{online:true});
 const firstOracle=oracle(world),first=routeMetrics(agent.plan.edges,firstOracle.edges);
 let pathLoss=0,labels=0;const distances=skeletonDistances(agent.spec);
 // Teacher only supplies labels for training; no ground-truth walls enter model features or inference.
 for(let t=0;t<Math.max(8,world.nodes*2)&&!agent.finished;t++){
  const best=oracle(world,agent.position);
  const action=best.edges[0];if(action===undefined)break;
  const peers=agent.spec.links.filter(e=>(e.a===agent.position||e.b===agent.position)&&agent.belief.status[e.id]!==0);
  for(const e of peers){const x=features(agent.spec,agent.belief,agent.position,e,distances,perspective.weights,t);
   const target=e.id===action?1:0;
   const result=net.update(x,'policy',target,.055,'teacher');pathLoss+=result.error;labels++;}
  // Actual agent experiences real transitions and corrections; no teacher path passed to step().
  const response=agent.step(action);if(['invalid','finished'].includes(response.type))break;
 }
 net.episodes=(net.episodes||0)+1;
 return {policyError:mean(pathLoss,labels),firstF1:first.f1,steps:agent.steps,solved:agent.finished};
}
export function evaluate(net,perspective,{seed=4040500,count=12,size=9,kind='all',maxMoves=0}={}){
 const results={seed,count,size,worlds:{},modes:{},independent:true};
 const variants=['learned-online','learned-frozen','neutral'];
 for(const name of variants){let solved=0,sumCost=0,sumEfficiency=0,sumFirstF1=0,beam=0,failures=0,updates=0;
  for(let i=0;i<count;i++){
   const selected=kind==='all'?families[i%families.length]:kind;
   const world=makeWorld(rndSeed(seed,i),selected,size);
   const m=WorldNet.restore(net.snapshot()),p=Perspective.restore(perspective.snapshot());
   const a=new Agent(world,m,p,{online:name==='learned-online',mode:name==='neutral'?'neutral':'neural'});
   const opt=oracle(world);sumFirstF1+=a.initial.metrics.f1;
   if(a.initial.source==='learned beam rollout')beam++;
   const limit=maxMoves||world.nodes*4;
   for(let t=0;t<limit&&!a.finished;t++){
    const event=a.step();if(['invalid','no-hypothesis','finished'].includes(event.type))break;
   }
   if(a.finished){solved++;sumCost+=a.effort;sumEfficiency+=opt.cost/Math.max(a.effort,1e-4);}else failures++;
   updates+=m.updates-net.updates;
  }
  results.modes[name]={count,solved,success:mean(solved,count),failures,
   firstShapeF1:+mean(sumFirstF1,count).toFixed(4),meanCost:solved?+mean(sumCost,solved).toFixed(3):null,
   meanEfficiency:solved?+mean(sumEfficiency,solved).toFixed(4):null,
   beamRate:+mean(beam,count).toFixed(3),onlineUpdates:updates};
 }
 return results;
}
export async function train(net,perspective,{episodes=300,size=9,seed=2000001,onProgress=()=>{},cancel=()=>false,validationCount=6}={}){
 if(!Number.isInteger(episodes)||episodes<1||episodes>50000)throw Error('Invalid training episodes');
 let best=null,bestSnapshot=null,history=[];const every=Math.max(10,Math.floor(episodes/15));
 for(let i=0;i<episodes;i++){
  if(cancel())break;
  const kind=families[i%families.length];const sample=trainingEpisode(net,perspective,rndSeed(seed,i),kind,size);
  if((i+1)%every===0||i===episodes-1){
   const evalResult=evaluate(net,perspective,{seed:3030301,count:validationCount,size});
   const learned=evalResult.modes['learned-frozen'],control=evalResult.modes.neutral;
   const record={episode:i+1,policyError:+sample.policyError.toFixed(4),heldoutF1:learned.firstShapeF1,
     neutralF1:control.firstShapeF1,heldoutSuccess:learned.success,heldoutCost:learned.meanCost,
     controlCost:control.meanCost,onlineCost:evalResult.modes['learned-online'].meanCost};
   history.push(record);
   // Select on a fixed held-out suite, prioritizing valid solutions and actual route cost.
   const score=learned.success*1000+learned.meanEfficiency*100+learned.firstShapeF1*15;
   if(!best||score>best.score){best={...record,score};bestSnapshot={net:net.snapshot(),perspective:perspective.snapshot()};}
   onProgress({done:i+1,total:episodes,best,history:history.slice(),latest:record});
  }
  if(i%2===0)await new Promise(resolve=>setImmediate(resolve));
 }
 return {best,bestSnapshot,history,episodes:net.episodes||0,cancelled:cancel()};
}
export const makeBrain=(seed=17)=>({net:new WorldNet(seed),perspective:new Perspective()});
