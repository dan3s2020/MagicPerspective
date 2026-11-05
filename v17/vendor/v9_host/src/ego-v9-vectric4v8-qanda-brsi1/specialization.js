import {ACTION_N} from "./config.js";
import {RNG} from "./math.js";

const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const finite=x=>Number.isFinite(Number(x))?Number(x):0;
function dist(a,b){let q=0,n=Math.min(a?.length||0,b?.length||0);for(let i=0;i<n;i++){const d=finite(a[i])-finite(b[i]);q+=d*d;}return Math.sqrt(q);}
function cloneEntry(x){return{...x,actionBias:Float64Array.from(x.actionBias),bandBias:Float64Array.from(x.bandBias),fingerprint:x.fingerprint?Float64Array.from(x.fingerprint):null};}

export function fingerprintFromStats(s={}){
  const d=Math.max(1,finite(s.decisions));
  return Float64Array.of(
    finite(s.accepted)/d,finite(s.rejected)/d,finite(s.confidenceSum)/d,
    finite(s.rewardSum)/d,finite(s.selfDeltaSum)/d,finite(s.groupDeltaSum)/d,
    finite(s.wallContactSum)/d,finite(s.pushSum)/d,finite(s.pullSum)/d,
    finite(s.echoUse)/d,finite(s.signalUse)/d,finite(s.morphParentUse)/d,finite(s.energyCostSum)/d
  );
}
export function specialistQuality(s={}){
  const d=Math.max(1,finite(s.decisions));
  return finite(s.rewardSum)/d+.35*finite(s.selfDeltaSum)/d+.65*finite(s.groupDeltaSum)/d-.08*finite(s.rejected)/d+.05*finite(s.echoUse+s.signalUse)/d-.08*finite(s.energyCostSum)/d;
}
export function novelty(fp,others){if(!others?.length)return 1;let best=Infinity;for(const q of others)best=Math.min(best,dist(fp,q));return Number.isFinite(best)?best:0;}

export function createSpecializationSystem(seed,config={}){
  const cap=Math.max(1,Math.floor(Number(config.cSpecialistArchiveCap)||8)),bands=Math.max(8,Math.min(64,Math.floor(Number(config.corticalBands)||32))),rng=new RNG((seed>>>0)^0xC5EC1A1);
  const archive=[];
  for(let i=0;i<cap;i++)archive.push({slot:i,lineageId:i,parentLineage:null,generation:0,actionBias:Float64Array.from({length:ACTION_N},()=>rng.normal()*.005),bandBias:Float64Array.from({length:bands},()=>rng.normal()*.005),quality:0,novelty:1,fingerprint:null,usage:0});
  return{version:1,archive,nextLineage:cap,updates:0,mutations:0,lastEvolution:null};
}
export function specialistParameterCount(sys){return sys.archive.reduce((s,e)=>s+e.actionBias.length+e.bandBias.length,0);}
export function specialistEntry(sys,slot){return sys.archive[Math.max(0,Math.min(sys.archive.length-1,Math.floor(Number(slot)||0)))];}
export function assignSpecialists(sys,count,seed){
  const n=Math.max(0,Math.floor(Number(count)||0)),ids=sys.archive.map(x=>x.slot),rng=new RNG((seed>>>0)^0x51EC7);
  for(let i=ids.length-1;i>0;i--){const j=rng.int(i+1),x=ids[i];ids[i]=ids[j];ids[j]=x;}
  const out=new Array(n);for(let i=0;i<n;i++)out[i]=ids[i%ids.length];return out;
}
export function emptySpecialistStats(sys){
  return Object.fromEntries(sys.archive.map(e=>[e.slot,{slot:e.slot,decisions:0,accepted:0,rejected:0,confidenceSum:0,rewardSum:0,selfDeltaSum:0,groupDeltaSum:0,wallContactSum:0,pushSum:0,pullSum:0,echoUse:0,signalUse:0,morphParentUse:0,energyCostSum:0,actionCount:new Float64Array(ACTION_N),actionReward:new Float64Array(ACTION_N),bandActivation:new Float64Array(e.bandBias.length),bandReward:new Float64Array(e.bandBias.length)}]));
}
export function noteSpecialist(stats,slot,row={}){
  const s=stats[slot];if(!s)return;s.decisions++;if(row.accepted)s.accepted++;else s.rejected++;s.confidenceSum+=finite(row.confidence);s.rewardSum+=finite(row.reward);s.selfDeltaSum+=finite(row.selfDelta);s.groupDeltaSum+=finite(row.groupDelta);s.wallContactSum+=finite(row.wallContact);s.pushSum+=finite(row.push);s.pullSum+=finite(row.pull);s.energyCostSum+=finite(row.energyCost);if(row.action===7)s.echoUse++;if(row.action===8)s.signalUse++;if(Number.isInteger(row.action)&&row.action>=0&&row.action<ACTION_N){s.actionCount[row.action]++;s.actionReward[row.action]+=finite(row.reward);}
  const amps=row.bandAmplitudes||[];for(let b=0;b<Math.min(s.bandActivation.length,amps.length);b++){const a=Math.max(0,finite(amps[b]));s.bandActivation[b]+=a;s.bandReward[b]+=a*finite(row.reward);}
}
export function markMorphParent(stats,slot){if(stats[slot])stats[slot].morphParentUse++;}
export function mergeSpecialistStats(dst,src){
  for(const [id,row] of Object.entries(src||{})){if(!dst[id])dst[id]={...row,actionCount:Float64Array.from(row.actionCount||[]),actionReward:Float64Array.from(row.actionReward||[]),bandActivation:Float64Array.from(row.bandActivation||[]),bandReward:Float64Array.from(row.bandReward||[])};else{const d=dst[id];for(const k of ["decisions","accepted","rejected","confidenceSum","rewardSum","selfDeltaSum","groupDeltaSum","wallContactSum","pushSum","pullSum","echoUse","signalUse","morphParentUse","energyCostSum"])d[k]=(d[k]||0)+(row[k]||0);for(let i=0;i<ACTION_N;i++){d.actionCount[i]=(d.actionCount[i]||0)+(row.actionCount?.[i]||0);d.actionReward[i]=(d.actionReward[i]||0)+(row.actionReward?.[i]||0);}const bn=Math.max(d.bandActivation?.length||0,row.bandActivation?.length||0);if(!d.bandActivation||d.bandActivation.length<bn){const a=new Float64Array(bn),b=new Float64Array(bn);a.set(d.bandActivation||[]);b.set(d.bandReward||[]);d.bandActivation=a;d.bandReward=b;}for(let i=0;i<bn;i++){d.bandActivation[i]+=(row.bandActivation?.[i]||0);d.bandReward[i]+=(row.bandReward?.[i]||0);}}}
  return dst;
}
function mutateFrom(parent,slot,lineageId,rng,config){
  const sigma=Math.max(0,Number(config.cSpecialistMutationStd)||.025),fraction=clamp(Number(config.cSpecialistMutationFraction)||.35,0,1),e=cloneEntry(parent);e.slot=slot;e.lineageId=lineageId;e.parentLineage=parent.lineageId;e.generation=(parent.generation||0)+1;e.quality=parent.quality;e.novelty=0;e.usage=0;
  for(const a of [e.actionBias,e.bandBias])for(let i=0;i<a.length;i++)if(rng.next()<fraction)a[i]=clamp(a[i]+rng.normal()*sigma,-1.5,1.5);
  return e;
}
export function updateSpecialization(sys,stats,config={},batch=0){
  const lr=Math.max(0,Number(config.cSpecialistAdapterLR)||.01),rows=[];
  for(const e of sys.archive){
    const s=stats?.[e.slot]||{},fp=fingerprintFromStats(s),quality=specialistQuality(s),d=Math.max(1,finite(s.decisions)),baseline=finite(e.quality);
    e.usage=finite(s.decisions);e.quality=.9*baseline+.1*quality;e.fingerprint=fp;
    // Learn a lineage preference from reward relative to that lineage's prior
    // expected quality. Using the same-batch global mean as baseline makes a
    // single consistently successful action mathematically unlearnable.
    for(let a=0;a<ACTION_N;a++){const n=finite(s.actionCount?.[a]);if(!n)continue;const q=finite(s.actionReward?.[a])/n;e.actionBias[a]=clamp(e.actionBias[a]+lr*Math.tanh(q-baseline),-1.5,1.5);}
    for(let b=0;b<e.bandBias.length;b++){const n=finite(s.bandActivation?.[b]);if(!n)continue;const q=finite(s.bandReward?.[b])/n;e.bandBias[b]=clamp(e.bandBias[b]+.5*lr*Math.tanh(q-baseline),-1.5,1.5);}
    rows.push(e);
  }
  const fps=rows.filter(x=>x.fingerprint).map(x=>x.fingerprint);for(const e of rows)e.novelty=novelty(e.fingerprint,fps.filter(x=>x!==e.fingerprint));
  sys.updates++;
  const every=Math.max(2,Math.floor(Number(config.cSpecialistEvolutionEvery)||10));
  if(batch>0&&batch%every===0&&rows.length>1){
    const eligible=rows.filter(e=>e.usage>0),pool=eligible.length>=2?eligible:rows;
    const ranked=[...pool].sort((a,b)=>(b.quality+.20*b.novelty)-(a.quality+.20*a.novelty)),parent=ranked[0],victim=ranked.at(-1);
    if(parent&&victim&&parent.slot!==victim.slot){
      const rng=new RNG(((batch+1)*0x9e3779b1^sys.nextLineage)>>>0),child=mutateFrom(parent,victim.slot,sys.nextLineage++,rng,config);sys.archive[victim.slot]=child;sys.mutations++;sys.lastEvolution={batch,parent:parent.lineageId,replaced:victim.lineageId,child:child.lineageId,slot:victim.slot};
    }
  }
  return{updates:sys.updates,mutations:sys.mutations,lastEvolution:sys.lastEvolution,archive:sys.archive.map(e=>({slot:e.slot,lineageId:e.lineageId,parentLineage:e.parentLineage,generation:e.generation,quality:e.quality,novelty:e.novelty,usage:e.usage}))};
}
export function specializationSnapshot(sys){return{version:sys.version,updates:sys.updates,mutations:sys.mutations,lastEvolution:sys.lastEvolution,archive:sys.archive.map(e=>({slot:e.slot,lineageId:e.lineageId,parentLineage:e.parentLineage,generation:e.generation,quality:e.quality,novelty:e.novelty,usage:e.usage,actionBias:Array.from(e.actionBias),bandBias:Array.from(e.bandBias)}))};}
