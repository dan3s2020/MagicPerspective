// V9 life: the organism lives networks of states of every kind, in turn, and corrects itself only from what it discovers.
import {makeUniversal,UKINDS,publicView,senseAt,truthRoute} from './graphs.mjs';
import {UOrganism,uMemory,uRemember} from './uorgan.mjs';
import {UEpisode,VARIANTS,shapeMatch} from './uagent.mjs';
export const SEEDS={train:6000013,validation:6060607,test:6121211};
export const TEST_VARIANTS=['v9','no-dreams','no-talk','no-democracy','one-voter','no-dance','untrained','classic'];
const seedOf=(b,i)=>((b>>>0)+i*7919)>>>0,avg=a=>a.length?a.reduce((x,y)=>x+y,0)/a.length:null;
export const restoreAny=s=>UOrganism.restore(s);
export function liveEpisode(org,seed,kind,size=15,variant='v9'){const ep=new UEpisode(makeUniversal(seed,kind,size),org,{variant,record:false}).run();org.episodes++;return ep.summary();}
export function evaluate(org,{seed=SEEDS.test,count=40,size=15,kinds=UKINDS,variants=TEST_VARIANTS}={}){
  const out={seed,count,size,variants:{},kinds:{}};
  for(const v of variants){const rows=[];
    for(let i=0;i<count;i++){const k=kinds[i%kinds.length],brain=VARIANTS[v].fresh?new UOrganism(org.seed,{voters:org.voters.length}):UOrganism.restore(org.snapshot());
      rows.push({kind:k,...new UEpisode(makeUniversal(seedOf(seed,i),k,size),brain,{variant:v,record:false}).run().summary()});}
    const agg=r=>({worlds:r.length,solved:r.filter(x=>x.solved).length/r.length,match0:avg(r.map(x=>x.match0)),meanMatch:avg(r.map(x=>x.meanMatch)),surprises:avg(r.map(x=>x.surprises)),ratio:avg(r.filter(x=>x.solved).map(x=>x.ratio))});
    out.variants[v]=agg(rows);for(const k of kinds){const r=rows.filter(x=>x.kind===k);if(r.length)(out.kinds[k]??={})[v]=agg(r);}}
  const round=o=>{for(const v of Object.values(o))for(const [k,x] of Object.entries(v))if(typeof x==='number')v[k]=+x.toFixed(4);};round(out.variants);for(const v of Object.values(out.kinds))round(v);return out;}
export const score=m=>m.match0+m.meanMatch-2*((m.ratio??3)-1)-.03*m.surprises+2*(m.solved-1);
export const MILESTONES=[0,5,15,40,100,250,600,1500,4000,10000,20000];
export function lightSnapshot(o){const s=JSON.parse(JSON.stringify(o.snapshot()));const strip=x=>{if(x&&typeof x==='object'){delete x.m;delete x.v;for(const y of Object.values(x))strip(y);}};strip(s);return s;}
export async function train(org,{episodes=200,size=15,validationCount=15,onProgress=()=>{},cancel=()=>false,onMilestone=()=>{}}={}){
  if(!Number.isInteger(episodes)||episodes<1||episodes>50000)throw Error('Invalid number of episodes');
  if(MILESTONES.includes(org.episodes))onMilestone(org.episodes,lightSnapshot(org));
  const every=Math.max(10,Math.floor(episodes/15)),history=[],snaps=[];let best=null,bestSnapshot=null;
  const val=o=>evaluate(o,{seed:SEEDS.validation,count:validationCount,size,variants:['no-dreams']}).variants['no-dreams'];
  const control=evaluate(org,{seed:SEEDS.validation,count:validationCount,size,variants:['classic']}).variants.classic;
  for(let i=0;i<episodes;i++){if(cancel())break;
    liveEpisode(org,seedOf(SEEDS.train,org.episodes),UKINDS[org.episodes%UKINDS.length],size);
    if(MILESTONES.includes(org.episodes))onMilestone(org.episodes,lightSnapshot(org));
    if((i+1)%every===0||i===episodes-1){const v=val(org);
      const rec={episode:org.episodes,match0:v.match0,meanMatch:v.meanMatch,ratio:v.ratio,surprises:v.surprises,solved:v.solved,classic:{match0:control.match0,ratio:control.ratio,meanMatch:control.meanMatch},score:+score(v).toFixed(4)};
      history.push(rec);snaps.push(org.snapshot());const k=history.length-1;
      if(k>=1){const lo=Math.max(0,k-2),win=history.slice(lo,k+1),a=win.reduce((s,h)=>s+h.score,0)/win.length,mid=lo+Math.floor((k-lo)/2);
        if(!best||a>best.windowScore){best={...history[mid],windowScore:+a.toFixed(4)};bestSnapshot=snaps[mid];}}
      else{best={...rec,windowScore:rec.score};bestSnapshot=snaps[0];}
      onProgress({done:i+1,total:episodes,latest:rec,best,history:history.slice()});}
    await new Promise(r=>setImmediate(r));}
  return {best,bestSnapshot,history,cancelled:cancel()};}
export const SHOWCASE=[{name:'Relief',seed:7001,kind:'relief'},{name:'Rețea',seed:7041,kind:'network'},{name:'Cu bucle',seed:7055,kind:'braided'},{name:'Labirint',seed:7027,kind:'maze'},{name:'Puzzle',seed:7069,kind:'puzzle'}];
export function imagineOnce(brain,world){const mem=uMemory(publicView(world));uRemember(mem,senseAt(world,world.start));const truth=truthRoute(world).nodes;
  if(!brain)return {truth};const p=brain.perceive(mem,world.start,{dreams:0});let err=0,c=0;
  for(let i=0;i<world.links.length;i++)if(mem.status[i]===-1){err+=Math.abs(p.p[i]-(world.links[i].open?1:0));c++;}
  return {status:Array.from(mem.status),seen:Array.from(mem.seen),imagined:Array.from(p.p,x=>+x.toFixed(2)),route:p.route,truth,mapError:+(err/c).toFixed(3),match:+shapeMatch(p.route,truth).toFixed(3)};}
