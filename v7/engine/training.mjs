// Training = the organism lives many worlds and corrects itself from what it discovers. No teacher signal exists in V6.
// Validation picks the best brain on separate worlds; the blind test uses yet other worlds.
import {makeWorld,KINDS,sense,truthRoute} from './world.mjs';
import {restoreBrain,newBrainLike,emptyMemory,remember} from './organ.mjs';
import {Episode,MODES,shapeMatch} from './agent.mjs';
export const SEEDS={train:6000013,validation:6060607,test:6121211};
const seedOf=(b,i)=>((b>>>0)+i*7919)>>>0;
const avg=a=>a.length?a.reduce((x,y)=>x+y,0)/a.length:null;
export function liveEpisode(org,seed,kind,size,{record=false,onEpisode=null}={}){
 const ep=new Episode(makeWorld(seed,kind,size),org,{mode:'organ',online:true,record});
 ep.run();org.episodes++;
 if(onEpisode)onEpisode(ep);
 return ep.summary();
}
function brainFor(mode,org){return mode==='organ-untrained'?newBrainLike(org):restoreBrain(org.snapshot());}
export function evaluate(org,{seed=SEEDS.test,count=30,size=15,kind='all',modes=MODES,extra={}}={}){
  const out={seed,count,size,kind,modes:{},kinds:{}};
  for(const mode of [...modes,...Object.keys(extra)]){const rows=[];
    for(let i=0;i<count;i++){const k=kind==='all'?KINDS[i%KINDS.length]:kind;
      const brain=extra[mode]?restoreBrain(extra[mode].snapshot()):brainFor(mode,org);const ep=new Episode(makeWorld(seedOf(seed,i),k,size),brain,{mode:mode==='classic'?'classic':'organ',online:true,record:false});rows.push({kind:k,...ep.run().summary()});}
    const agg=r=>({worlds:r.length,solved:r.filter(x=>x.solved).length/r.length,match0:avg(r.map(x=>x.match0)),dev0:avg(r.map(x=>x.dev0)),meanMatch:avg(r.map(x=>x.meanMatch)),
      surprises:avg(r.map(x=>x.surprises)),ratio:avg(r.filter(x=>x.solved).map(x=>x.ratio))});
    out.modes[mode]=agg(rows);for(const k of KINDS){const r=rows.filter(x=>x.kind===k);if(r.length)(out.kinds[k]??={})[mode]=agg(r);}}
  const round=o=>{for(const v of Object.values(o))for(const [k,x] of Object.entries(v))if(typeof x==='number')v[k]=+x.toFixed(4);};
  round(out.modes);for(const v of Object.values(out.kinds))round(v);return out;}
export const score=m=>m.match0+m.meanMatch-2*((m.ratio??3)-1)-.03*m.surprises-.05*m.dev0;
// Moments of its life worth keeping, so we can later see how its imagination formed.
export const MILESTONES=[0,5,15,40,100,250,600,1500,4000,10000,20000];
export function lightSnapshot(org){const s=JSON.parse(JSON.stringify(org.snapshot()));const strip=o=>{if(o&&typeof o==='object'){delete o.m;delete o.v;for(const v of Object.values(o))strip(v);}};strip(s);return s;}
export async function train(org,{episodes=200,size=15,validationCount=24,onProgress=()=>{},cancel=()=>false,onMilestone=()=>{},seedOffset=null,onEpisode=null,previewEvery=10}={}){
  if(MILESTONES.includes(org.episodes))onMilestone(org.episodes,lightSnapshot(org));
  if(!Number.isInteger(episodes)||episodes<1||episodes>20000)throw Error('Invalid number of episodes');
  const every=Math.max(10,Math.floor(episodes/15)),history=[],snaps=[];let best=null,bestSnapshot=null;
  const control=evaluate(org,{seed:SEEDS.validation,count:validationCount,size,kind:'relief',modes:['classic']}).modes.classic;
  for(let i=0;i<episodes;i++){if(cancel())break;
    const preview=typeof onEpisode==='function'&&(i===0||(i+1)%previewEvery===0);
    liveEpisode(org,seedOf(SEEDS.train,seedOffset===null?org.episodes:seedOffset+i),
      KINDS[(seedOffset===null?i:seedOffset+i)%KINDS.length],size,
      {record:preview,onEpisode:preview?onEpisode:null});
    if(MILESTONES.includes(org.episodes))onMilestone(org.episodes,lightSnapshot(org));
    if((i+1)%every===0||i===episodes-1){
      const v=evaluate(org,{seed:SEEDS.validation,count:validationCount,size,kind:'relief',modes:['organ']}).modes.organ;
      const rec={episode:org.episodes,match0:v.match0,dev0:v.dev0,meanMatch:v.meanMatch,ratio:v.ratio,surprises:v.surprises,classic:{match0:control.match0,dev0:control.dev0,ratio:control.ratio,meanMatch:control.meanMatch},score:+score(v).toFixed(4)};
      // One validation is noisy: choose by the average of 3 neighbouring checks and keep the middle brain of the best stretch.
      history.push(rec);snaps.push(org.snapshot());const k=history.length-1;
      if(k>=1){const lo=Math.max(0,k-2),win=history.slice(lo,k+1),avgScore=win.reduce((a,h)=>a+h.score,0)/win.length,mid=lo+Math.floor((k-lo)/2);
        if(!best||avgScore>best.windowScore){best={...history[mid],windowScore:+avgScore.toFixed(4)};bestSnapshot=snaps[mid];}}
      else{best={...rec,windowScore:rec.score};bestSnapshot=snaps[0];}
      onProgress({done:i+1,total:episodes,latest:rec,best,history:history.slice()});}
    await new Promise(r=>setImmediate(r));}
  return {best,bestSnapshot,history,cancelled:cancel()};}

export const SHOWCASE=[{name:'Relief A',seed:7001,kind:'relief'},{name:'Relief B',seed:7013,kind:'relief'},{name:'Labirint',seed:7027,kind:'maze'}];
export function imagineOnce(brain,world){const mem=emptyMemory(world.n,world.start,world.goal);remember(mem,sense(world,world.start));
  const p=brain?brain.perceive(mem,world.start,{imagine:0,claim:false}):null,truth=truthRoute(world).cells;let err=0,c=0;
  const imagined=p?p.mean:null;if(p)for(let i=0;i<world.n*world.n;i++)if(Number.isNaN(mem.known[i])){err+=Math.abs(imagined[i]-world.h[i]);c++;}
  return {known:Array.from(mem.known,h=>Number.isNaN(h)?-1:+h.toFixed(2)),imagined:imagined?Array.from(imagined,h=>+h.toFixed(2)):null,
    route:p?p.route:[],truth,mapError:p?+(err/c).toFixed(3):null,match:p?+shapeMatch(p.route,truth).toFixed(3):null,slot:p?.slot??null};}
