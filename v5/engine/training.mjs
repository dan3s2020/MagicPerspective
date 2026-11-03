// Offline training, validation-based checkpoint selection and the blind four-control test.
import {makeWorld,oracle} from './world.mjs';
import {Organ} from './organ.mjs';
import {Episode,ece,calibrationBins,MODES} from './agent.mjs';
export const FAMILIES=['maze','braided','graph'];
export const SEEDS={train:5000011,validation:5050505,test:5090909};
const seedOf=(base,i)=>((base>>>0)+i*7919)>>>0;
const avg=a=>a.length?a.reduce((x,y)=>x+y,0)/a.length:null;
// The organism lives the episode on its OWN predicted route (on-policy). At every state the evaluator's optimal
// route from the current position is the target cloud for the shape organ; the pass organ learns from the window alone.
export function trainingEpisode(organ,seed,kind,size){
  const world=makeWorld(seed,kind,size),ep=new Episode(world,organ,{online:true,record:false});let loss=0,n=0;
  for(let t=0;t<world.nodes*3&&!ep.finished;t++){
    loss+=organ.learnShape(ep.perception,oracle(world,ep.position).edges);n++;
    const e=ep.step();if(e.type==='no-route'||e.type==='invalid')break;
  }
  organ.episodes++;return {shapeLoss:n?loss/n:0,solved:ep.finished,steps:ep.steps,f1_0:ep.initial.f1};
}
function organFor(mode,organ){return mode==='organ-untrained'?new Organ(organ.seed):Organ.restore(organ.snapshot());}
// Every control sees the same worlds (same seeds), the same 3x3 window, the same goal hint, the same decoder budget.
export function evaluate(organ,{seed=SEEDS.test,count=12,size=9,kind='all',modes=MODES}={}){
  const out={seed,count,size,kind,modes:{},families:{}};
  for(const mode of modes){const rows=[],bins=new Array(10).fill(0).map(()=>({n:0,p:0,y:0}));
    for(let i=0;i<count;i++){const k=kind==='all'?FAMILIES[i%FAMILIES.length]:kind,world=makeWorld(seedOf(seed,i),k,size);
      const ep=new Episode(world,organFor(mode,organ),{online:mode!=='organ-frozen',mode:mode==='classic'?'classic':'organ',record:false});
      calibrationBins(ep.perception.q,ep.belief,ep.initial.truthEdges,bins);ep.run();rows.push({kind:k,...ep.summary()});}
    const solved=rows.filter(r=>r.solved);
    out.modes[mode]={success:solved.length/count,f1_0:avg(rows.map(r=>r.f1_0)),bce_0:avg(rows.map(r=>r.bce_0)),valid_0:avg(rows.map(r=>r.valid_0?1:0)),
      meanF1:avg(rows.map(r=>r.meanF1)),efficiency:avg(solved.map(r=>r.efficiency)),effort:avg(solved.map(r=>r.effort)),resistance:avg(rows.map(r=>r.resistance)),ece_0:ece(bins)};
    for(const f of FAMILIES){const fr=rows.filter(r=>r.kind===f);if(!fr.length)continue;(out.families[f]??={})[mode]={f1_0:avg(fr.map(r=>r.f1_0)),bce_0:avg(fr.map(r=>r.bce_0)),efficiency:avg(fr.filter(r=>r.solved).map(r=>r.efficiency))};}
  }
  for(const m of Object.values(out.modes))for(const k of Object.keys(m))if(typeof m[k]==='number')m[k]=+m[k].toFixed(4);
  return out;
}
export const score=m=>m.success*2+m.f1_0+m.meanF1+(m.efficiency??0)-.5*m.bce_0;
export async function train(organ,{episodes=300,size=9,seed=SEEDS.train,validationCount=15,onProgress=()=>{},cancel=()=>false}={}){
  if(!Number.isInteger(episodes)||episodes<1||episodes>50000)throw Error('Invalid number of episodes');
  const every=Math.max(10,Math.floor(episodes/20)),history=[];let best=null,bestSnapshot=null,recent=[];
  const control=evaluate(organ,{seed:SEEDS.validation,count:validationCount,size,modes:['classic']}).modes.classic;
  for(let i=0;i<episodes;i++){if(cancel())break;
    recent.push(trainingEpisode(organ,seedOf(seed,organ.episodes),FAMILIES[i%3],size));
    if((i+1)%every===0||i===episodes-1){
      const v=evaluate(organ,{seed:SEEDS.validation,count:validationCount,size,modes:['organ-frozen']}).modes['organ-frozen'];
      const rec={episode:organ.episodes,shapeLoss:+avg(recent.map(r=>r.shapeLoss)).toFixed(4),f1_0:v.f1_0,bce_0:v.bce_0,meanF1:v.meanF1,efficiency:v.efficiency,success:v.success,
        classic:{f1_0:control.f1_0,bce_0:control.bce_0,meanF1:control.meanF1,efficiency:control.efficiency},score:+score(v).toFixed(4)};
      recent=[];history.push(rec);
      if(!best||rec.score>best.score){best=rec;bestSnapshot=organ.snapshot();}
      onProgress({done:i+1,total:episodes,latest:rec,best,history:history.slice()});
    }
    if(i%2===0)await new Promise(r=>setImmediate(r));
  }
  return {best,bestSnapshot,history,cancelled:cancel()};
}
