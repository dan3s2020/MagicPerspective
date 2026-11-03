// Training = the organism lives many worlds and corrects itself from what it discovers. No teacher signal exists in V6.
// Validation picks the best brain on separate worlds; the blind test uses yet other worlds.
import {makeWorld,KINDS} from './world.mjs';
import {Organism} from './organ.mjs';
import {Episode,MODES} from './agent.mjs';
export const SEEDS={train:6000013,validation:6060607,test:6121211};
const seedOf=(b,i)=>((b>>>0)+i*7919)>>>0;
const avg=a=>a.length?a.reduce((x,y)=>x+y,0)/a.length:null;
export function liveEpisode(org,seed,kind,size){const ep=new Episode(makeWorld(seed,kind,size),org,{mode:'organ',online:true,record:false});ep.run();org.episodes++;return ep.summary();}
function brainFor(mode,org){return mode==='organ-untrained'?new Organism(org.seed):Organism.restore(org.snapshot());}
export function evaluate(org,{seed=SEEDS.test,count=30,size=15,kind='all',modes=MODES}={}){
  const out={seed,count,size,kind,modes:{},kinds:{}};
  for(const mode of modes){const rows=[];
    for(let i=0;i<count;i++){const k=kind==='all'?KINDS[i%KINDS.length]:kind;
      const ep=new Episode(makeWorld(seedOf(seed,i),k,size),brainFor(mode,org),{mode:mode==='classic'?'classic':'organ',online:true,record:false});rows.push({kind:k,...ep.run().summary()});}
    const agg=r=>({worlds:r.length,solved:r.filter(x=>x.solved).length/r.length,match0:avg(r.map(x=>x.match0)),dev0:avg(r.map(x=>x.dev0)),meanMatch:avg(r.map(x=>x.meanMatch)),
      surprises:avg(r.map(x=>x.surprises)),ratio:avg(r.filter(x=>x.solved).map(x=>x.ratio))});
    out.modes[mode]=agg(rows);for(const k of KINDS){const r=rows.filter(x=>x.kind===k);if(r.length)(out.kinds[k]??={})[mode]=agg(r);}}
  const round=o=>{for(const v of Object.values(o))for(const [k,x] of Object.entries(v))if(typeof x==='number')v[k]=+x.toFixed(4);};
  round(out.modes);for(const v of Object.values(out.kinds))round(v);return out;}
export const score=m=>m.match0+m.meanMatch-(m.ratio??3)+1-.05*m.dev0;
export async function train(org,{episodes=200,size=15,validationCount=10,onProgress=()=>{},cancel=()=>false}={}){
  if(!Number.isInteger(episodes)||episodes<1||episodes>20000)throw Error('Invalid number of episodes');
  const every=Math.max(10,Math.floor(episodes/15)),history=[];let best=null,bestSnapshot=null;
  const control=evaluate(org,{seed:SEEDS.validation,count:validationCount,size,kind:'relief',modes:['classic']}).modes.classic;
  for(let i=0;i<episodes;i++){if(cancel())break;
    liveEpisode(org,seedOf(SEEDS.train,org.episodes),KINDS[i%KINDS.length],size);
    if((i+1)%every===0||i===episodes-1){
      const v=evaluate(org,{seed:SEEDS.validation,count:validationCount,size,kind:'relief',modes:['organ']}).modes.organ;
      const rec={episode:org.episodes,match0:v.match0,dev0:v.dev0,meanMatch:v.meanMatch,ratio:v.ratio,surprises:v.surprises,classic:{match0:control.match0,dev0:control.dev0,ratio:control.ratio,meanMatch:control.meanMatch},score:+score(v).toFixed(4)};
      history.push(rec);if(!best||rec.score>best.score){best=rec;bestSnapshot=org.snapshot();}
      onProgress({done:i+1,total:episodes,latest:rec,best,history:history.slice()});}
    await new Promise(r=>setImmediate(r));}
  return {best,bestSnapshot,history,cancelled:cancel()};}
