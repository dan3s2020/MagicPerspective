import {makeWorld,oracle,publicInfo,key,RNG} from './world.mjs';
import {AssociationRule} from './dance.mjs';
import {Episode} from './agent.mjs';
const FAMILIES=['local','hierarchical','mixed'];
const avg=a=>a.length?a.reduce((s,v)=>s+v,0)/a.length:0;
export function linkBCE(rule,{seed=900000,count=12,n=33}={}){
 let positive=0,negative=0,np=0,nn=0;
 for(let t=0;t<count;t++){
  const w=makeWorld(seed+8191*t,n,FAMILIES[t%3]),info=publicInfo(w);
  const truth=new Set(w.edges.filter(e=>e.open).map(e=>key(e.a,e.b)));
  for(let a=0;a<n;a++)for(let b=a+1;b<n;b++){
   const p=rule.probability(info,a,b);
   if(truth.has(key(a,b))){positive-=Math.log(p);np++;}else{negative-=Math.log(1-p);nn++;}
  }
 }
 return {balanced:+((positive/np+negative/nn)/2).toFixed(5),positive:+(positive/np).toFixed(5),negative:+(negative/nn).toFixed(5)};
}
export async function train(rule,{episodes=300,n=33,seed=100001,onProgress=()=>{},cancel=()=>false}={}){
 if(!Number.isInteger(episodes)||episodes<1||episodes>10000)throw Error('Invalid training episode count');
 const rng=new RNG(seed),initial=linkBCE(rule,{seed:800008,count:9,n});
 const history=[],every=Math.max(10,Math.floor(episodes/12));let best=initial.balanced,checkpoint=rule.snapshot();let done=0;
 for(let i=0;i<episodes;i++){
  if(cancel())break;
  const w=makeWorld(seed+7919*i,n,FAMILIES[i%3]);
  const e=new Episode(w,rule,{online:true,dance:true});
  // Self-supervised association discovery; no oracle, teacher path, or true map is given to the learner.
  for(let s=0;s<Math.min(w.n*3,90)&&!e.solved;s++){
   const out=e.step();if(['stuck','limit'].includes(out.type))break;
  }
  rule.episodes++;done++;
  if(done%every===0||done===episodes){
   const value=linkBCE(rule,{seed:800008,count:9,n}),r={episode:rule.episodes,loss:value.balanced,positive:value.positive,negative:value.negative};
   history.push(r);if(value.balanced<best){best=value.balanced;checkpoint=rule.snapshot();}
   onProgress({done,total:episodes,history:history.slice(),best,latest:r});
  }
  if(i%2===0)await new Promise(resolve=>setImmediate(resolve));
 }
 return {initial,best,checkpoint,history,done,cancelled:cancel()};
}
export function evaluate(rule,{count=24,n=33,seed=990000}={}){
 if(!Number.isInteger(count)||count<3||count>120)throw Error('Invalid test world count');
 const modes=['dance-online','dance-frozen','no-dance','untrained'];
 const out={count,n,seed,linkBCE:linkBCE(rule,{seed,count,n}),modes:{}};
 for(const mode of modes){const rows=[];
  for(let i=0;i<count;i++){
   const w=makeWorld(seed+8191*i,n,FAMILIES[i%3]);
   const sameRule=mode==='untrained'?new AssociationRule(rule.seed):AssociationRule.restore(rule.snapshot());
   const episode=new Episode(w,sameRule,{online:mode==='dance-online',dance:mode!=='no-dance'});
   episode.run();rows.push(episode.summary());
  }
  out.modes[mode]={success:+avg(rows.map(x=>x.solved?1:0)).toFixed(4),
   penalizedCost:+avg(rows.map(x=>x.penalizedCost)).toFixed(3),
   solvedCost:rows.some(x=>x.solved)?+avg(rows.filter(x=>x.solved).map(x=>x.cost)).toFixed(3):null,
   initialF1:+avg(rows.map(x=>x.initialF1)).toFixed(4),
   coherence:+avg(rows.map(x=>x.localCoherence)).toFixed(4),
   knownPairs:+avg(rows.map(x=>x.discovered)).toFixed(1),
   learnedUpdates:mode==='dance-online'?rows.reduce((s,x)=>s+x.associations-rule.updates,0):0};
 }
 return out;
}
