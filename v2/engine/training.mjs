import {RNG,makeWorld,shortestPath,blankBelief,observe,execute,neighbors,mask} from './world.mjs';
import {PerspectiveNet,CausalModel,geometricBaseline,shapeBCE} from './model.mjs';
import {Organism} from './organism.mjs';
const FAMILIES=['branched','braided','rooms'];
const avg=(s,n)=>s/Math.max(n,1);
// Acquisition never consults true walls to choose an action: local known corridors only.
export function snapshots(world,seed){
 const rng=new RNG(seed),n=world.n,b=blankBelief(n),snaps=[],experiences=[],visits=b.visits;
 let position=world.start;visits[position]++;observe(world,position,b);
 const capture=()=>({position,belief:{walls:b.walls.slice(),material:b.material.slice(),visits:b.visits.slice()},
   label:mask(shortestPath(world,position,world.goal).path,n)});
 snaps.push(capture());
 for(let t=0;t<Math.min(18,n*2);t++){
  const choices=neighbors(position,n).filter(i=>b.walls[i]===0);
  if(!choices.length)break;
  // Prefer unexplored positions but allow revisits. Based ONLY on observations/visits.
  const weights=choices.map(i=>1/(1+visits[i]*2));let v=rng.next()*weights.reduce((s,x)=>s+x,0);
  let choice=choices[choices.length-1];for(let j=0;j<choices.length;j++){v-=weights[j];if(v<=0){choice=choices[j];break}}
  const sensedMaterial=b.material[choice];
  const move=execute(world,position,choice);if(move.type!=='moved')throw Error('Sensor/world inconsistency');
  experiences.push({sensedMaterial,actualEffort:move.effort});
  position=move.position;visits[position]++;observe(world,position,b);
  if([3,8,16].includes(t))snaps.push(capture());
 }
 snaps.experiences=experiences;return snaps;
}
export function trainingExample(model,causal,episodeSeed,index,n=11,lr=.008){
 const family=FAMILIES[index%FAMILIES.length],world=makeWorld(episodeSeed,n,family),data=snapshots(world,episodeSeed^0xa5ab33),rng=new RNG(episodeSeed^0x49ae23);
 let loss=0;for(const snap of data)loss+=model.train(snap.belief,n,snap.position,world.goal,snap.label,rng,lr);
 // Causal supervision comes ONLY from local attempted actions and their observed outcomes.
 for(const experience of data.experiences)causal.learn(experience.sensedMaterial,experience.actualEffort);
 model.episodes++;return loss/data.length;
}
export function evaluate(model,{seed=980001,count=36,n=11,family='all',navigation=false,causal=new CausalModel()}={}){
 let bce=0,gbce=0,iou=0,giou=0,recall=0,nav={},q=0;
 for(let k=0;k<count;k++){
  const f=family==='all'?FAMILIES[k%3]:family;
  const w=makeWorld(seed+k*1901,n,f),b=blankBelief(n);b.visits[w.start]=1;observe(w,w.start,b);
  const truth=mask(shortestPath(w,w.start,w.goal).path,n);
  const a=shapeBCE(model.predict(b,n,w.start,w.goal),truth),g=shapeBCE(geometricBaseline(n,w.start,w.goal,b),truth);
  bce+=a.bce;gbce+=g.bce;iou+=a.iou;giou+=g.iou;recall+=a.recall;q++;
 }
 const result={count,n,family,seed,neuralBCE:+avg(bce,q).toFixed(5),geometricBCE:+avg(gbce,q).toFixed(5),
  neuralIoU:+avg(iou,q).toFixed(5),geometricIoU:+avg(giou,q).toFixed(5),neuralRecall:+avg(recall,q).toFixed(5),
  improved: bce<gbce};
 if(navigation){result.navigation={};for(const mode of ['shape','geometric','neutral']){
   let solved=0,cost=0,oracle=0,steps=0,miss=0;const take=Math.min(count,24);
   for(let k=0;k<take;k++){
    const f=family==='all'?FAMILIES[k%3]:family,w=makeWorld(seed+k*1901,n,f),agent=new Organism(w.seed,model,CausalModel.restore(causal.snapshot()),n,f,mode);
    // Causal model is frozen during evaluation; don't mutate the original training model.
    const opt=shortestPath(w,w.start,w.goal).cost;
    for(let j=0;j<n*n*5&&!agent.finished;j++){
     const action=agent.act();if(action.event==='no-route'||action.event==='invalid')break;
    }
    if(agent.finished){solved++;cost+=agent.effort;oracle+=opt;steps+=agent.steps}else miss++;
   }
   result.navigation[mode]={count:take,success:solved/take,averageCost:solved?+(cost/solved).toFixed(3):null,
    averageOptimalCost:solved?+(oracle/solved).toFixed(3):null,averageSteps:solved?+(steps/solved).toFixed(2):null,
    failures:miss};
  }}
 return result;
}
export async function train(model,causal,{episodes=1000,seed=20261103,n=11,lr=.008,interval=100,
 onProgress=()=>{},cancel=()=>false,yieldEvery=2,validateCount=30}={}){
 if(!Number.isInteger(episodes)||episodes<1||episodes>50000)throw Error('episodes must be 1..50000');
 const start=Date.now();let best=null,bestSnapshot=null,loss=0;
 const history=[];
 for(let ep=0;ep<episodes;ep++){
  if(cancel())break;
  loss=trainingExample(model,causal,seed+ep*7709,ep,n,lr);
  if((ep+1)%interval===0||ep===episodes-1){
   // The SAME multi-size validation suite is used across runs and training sizes.
   // This makes best-checkpoint selection comparable when the user changes world size.
   const suites=[7,11,15].map(size=>evaluate(model,{count:validateCount,seed:980001,n:size}));
   const mean=key=>suites.reduce((a,v)=>a+v[key],0)/suites.length;
   const record={episode:ep+1,trainLoss:+loss.toFixed(5),heldoutBCE:+mean('neuralBCE').toFixed(5),
    baselineBCE:+mean('geometricBCE').toFixed(5),heldoutIoU:+mean('neuralIoU').toFixed(5),
    bySize:suites.map(v=>({n:v.n,bce:v.neuralBCE,baselineBCE:v.geometricBCE,iou:v.neuralIoU})),elapsedMs:Date.now()-start};history.push(record);
   // Validation selects checkpoint; independent final test must use different seeds.
   if(!best||record.heldoutBCE<best.heldoutBCE){best=record;bestSnapshot={model:model.snapshot(),causal:causal.snapshot()};}
   onProgress({done:ep+1,total:episodes,latest:record,best,history:history.slice()});
  }
  if(ep%yieldEvery===0)await new Promise(resolve=>setImmediate(resolve));
 }
 return {best,bestSnapshot,history,trained: model.episodes,elapsedMs:Date.now()-start,interrupted:cancel()};
}
export function newBrains(seed=17){return {model:new PerspectiveNet(seed),causal:new CausalModel()}}
