import {createEgoRuntime,connectedWithout,dirsForWorld,isSolid,key,occupiedMap,worldDimension} from "./world.js";
import {fragmentSporeState,reconstructSporeState} from "./spore-memory.js";

const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
function cosine(a,b){let d=0,aa=0,bb=0,n=Math.min(a?.length||0,b?.length||0);for(let i=0;i<n;i++){d+=a[i]*b[i];aa+=a[i]*a[i];bb+=b[i]*b[i];}return aa&&bb?d/Math.sqrt(aa*bb):0;}
function mkMeta(uid,parents=[],status="MATURE",step=0){return{uid,parents:[...parents],status,birthStep:step,birthActions:0,actions:0,rewardEMA:0,utilityEMA:0,waitEMA:0,causalProxy:0,lineage:parents.length?parents.join("+")+"->"+uid:"root:"+uid};}

export function createLifecycle(world,config){
  return{nextUid:world.cubes.length,meta:world.cubes.map((_,i)=>mkMeta(i)),dormant:[],events:[],births:0,retirements:0,fusions:0,reactivations:0,redundantKills:0,apoptosis:0,lastBirth:-1e9,lastDeath:-1e9,minCells:Math.max(2,Number(config.lifecycleMinCells)||2),maxCells:Math.max(2,Number(config.lifecycleMaxCells)||64),logicalFragments:[world.cubes.map((_,i)=>i)],fragmentations:0,reconstructions:0,sporeReconstructions:0,sporeReconstructionFailures:0,lastFragmentSignature:"all"};
}
export function noteCellOutcome(life,i,{reward=0,accepted=true,progress=0}={}){
  const m=life.meta[i];if(!m)return;m.actions++;m.rewardEMA=.97*m.rewardEMA+.03*reward;m.utilityEMA=.96*m.utilityEMA+.04*(reward+.4*progress);m.waitEMA=.97*m.waitEMA+.03*(accepted?0:1);m.causalProxy=.98*m.causalProxy+.02*Math.max(0,progress);
}
function freeAdjacent(world,parent){
  const p=world.cubes[parent],occ=occupiedMap(world.cubes),dirs=dirsForWorld(world);
  const rows=[];for(const[dx,dy,dz]of dirs){const x=p.x+dx,y=p.y+dy,z=(p.z||0)+dz;if(!isSolid(world,x,y,z)&&!occ.has(key(x,y,z)))rows.push({x,y,z});}
  return rows;
}
function parentScore(life,i,spatial){
  const m=life.meta[i];let frontier=0,p=spatial?.poses?.[i];if(p&&spatial?.map){for(const[dx,dy,dz]of [[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]])if(!spatial.map.has(key(p.x+dx,p.y+dy,p.z+dz)))frontier++;}
  return frontier+.8*Math.max(0,m?.utilityEMA||0)+.2*Math.max(0,m?.causalProxy||0)-.2*(m?.waitEMA||0);
}
function bestParent(world,life,spatial){
  let best=-1,score=-Infinity;for(let i=0;i<world.cubes.length;i++){if(!freeAdjacent(world,i).length)continue;const s=parentScore(life,i,spatial);if(s>score){score=s;best=i;}}return best;
}
function pushEvent(life,step,type,data={}){const e={step,type,...data};life.events.push(e);if(life.events.length>256)life.events.splice(0,life.events.length-256);return e;}
export function budCell(world,life,hStates,spatial,config,step,parent=null,hiddenOverride=null,parentsOverride=null){
  if(world.cubes.length>=life.maxCells)return null;
  const birthCooldown=Math.max(0,Number(config.lifecycleBirthCooldown)||0);if(step-life.lastBirth<birthCooldown)return null;
  const pi=parent??bestParent(world,life,spatial);if(pi<0)return null;const spots=freeAdjacent(world,pi);if(!spots.length)return null;
  const spot=spots[0],uid=life.nextUid++,parents=parentsOverride||[life.meta[pi]?.uid??pi];
  world.cubes.push(spot);world.egoRuntime.push(createEgoRuntime(world.cubes.length-1,world));world.swarmSize=world.cubes.length;
  const base=hiddenOverride?Float64Array.from(hiddenOverride):Float64Array.from(hStates[pi]||[]);hStates.push(base);
  life.meta.push(mkMeta(uid,parents,"PROVISIONAL",step));life.births++;life.lastBirth=step;
  if(spatial?.poses)spatial.poses.push(null);
  return pushEvent(life,step,"BUD",{cell:world.cubes.length-1,uid,parent:pi,parents});
}
export function retireCell(world,life,hStates,spatial,step,index,reason="RETIRE",config=null){
  if(world.cubes.length<=life.minCells||index<0||index>=world.cubes.length)return null;
  const deathCooldown=Math.max(0,Number(config?.lifecycleDeathCooldown)||0);if(step-life.lastDeath<deathCooldown&&!String(reason).includes("FAILED_GERMINATION"))return null;
  if(!connectedWithout(world.cubes,index,worldDimension(world)))return null;
  const m=life.meta[index],packet=fragmentSporeState({hidden:hStates[index]||[],meta:m},config||{}),spore={meta:structuredClone(m),packet,retiredStep:step};life.dormant.push(spore);if(life.dormant.length>128)life.dormant.shift();
  world.cubes.splice(index,1);world.egoRuntime.splice(index,1);hStates.splice(index,1);life.meta.splice(index,1);if(spatial?.poses)spatial.poses.splice(index,1);world.swarmSize=world.cubes.length;
  life.retirements++;life.lastDeath=step;if(reason.includes("REDUNDANT"))life.redundantKills++;if(reason.includes("APOPTOSIS"))life.apoptosis++;
  return pushEvent(life,step,reason,{index,uid:m?.uid});
}
export function lowestUsefulRetireCandidate(world,life,hStates){
  let best=-1,score=Infinity;for(let i=0;i<world.cubes.length;i++){if(!connectedWithout(world.cubes,i,worldDimension(world)))continue;const m=life.meta[i];let redundant=0;for(let j=0;j<world.cubes.length;j++)if(i!==j)redundant=Math.max(redundant,cosine(hStates[i],hStates[j]));const s=(m?.utilityEMA||0)+.35*(m?.causalProxy||0)-.15*(m?.waitEMA||0)-.12*Math.max(0,redundant-.75);if(s<score){score=s;best=i;}}return{index:best,score};
}
export function fusionBud(world,life,hStates,spatial,config,step){
  if(world.cubes.length<2||world.cubes.length>=life.maxCells)return null;let a=0,b=1,best=-Infinity;
  for(let i=0;i<hStates.length;i++)for(let j=i+1;j<hStates.length;j++){const comp=1-cosine(hStates[i],hStates[j]),u=Math.max(0,life.meta[i]?.utilityEMA||0)+Math.max(0,life.meta[j]?.utilityEMA||0),s=comp+.2*u;if(s>best){best=s;a=i;b=j;}}
  const n=Math.min(hStates[a]?.length||0,hStates[b]?.length||0),h=new Float64Array(n);for(let i=0;i<n;i++)h[i]=.5*(hStates[a][i]+hStates[b][i]);
  const ev=budCell(world,life,hStates,spatial,config,step,a,h,[life.meta[a]?.uid??a,life.meta[b]?.uid??b]);if(ev){life.fusions++;ev.type="FUSION_BUD";ev.parents=[a,b];}return ev;
}
export function reactivateDormant(world,life,hStates,spatial,config,step){
  if(!life.dormant.length||world.cubes.length>=life.maxCells)return null;const spore=life.dormant.pop(),pi=bestParent(world,life,spatial);if(pi<0){life.dormant.push(spore);return null;}
  const rebuilt=reconstructSporeState(spore.packet);if(!rebuilt.complete){life.sporeReconstructionFailures++;life.dormant.unshift(spore);pushEvent(life,step,"SPORE_RECONSTRUCTION_FAILED",{fromUid:spore.meta?.uid,fidelity:rebuilt.fidelity,missing:rebuilt.missing});return null;}
  life.sporeReconstructions++;const ev=budCell(world,life,hStates,spatial,config,step,pi,rebuilt.hidden,[spore.meta?.uid??-1]);if(ev){life.reactivations++;ev.type="REACTIVATE";ev.fromUid=spore.meta?.uid;ev.sporeFidelity=rebuilt.fidelity;}else life.dormant.push(spore);return ev;
}
export function lifecycleResourceStats(life){
  const used=Math.max(0,life.meta.length),slots=Math.max(used,Number(life.maxCells)||used||1),free=Math.max(0,slots-used),pressure=used/Math.max(1,slots);
  let useful=0,waste=0;for(const m of life.meta){const u=(Number(m.utilityEMA)||0)+.35*Math.max(0,Number(m.causalProxy)||0)-.15*Math.max(0,Number(m.waitEMA)||0);if(u>=0)useful+=u;else waste+=-u;}
  const efficiency=Math.tanh(useful/Math.max(1,used))/(1+.25*waste);
  return{slots,used,free,pressure:clamp(pressure,0,1),efficiency:clamp(efficiency,0,1),waste};
}
function fragmentSignature(groups){return groups.map(g=>g.map(i=>i).sort((a,b)=>a-b).join(",")).sort().join("|");}
export function rebuildLogicalFragments(life,hStates,config={},step=0){
  const n=life.meta.length,rawThreshold=Number(config.lifecycleFragmentSimilarity),threshold=clamp(Number.isFinite(rawThreshold)?rawThreshold:.62,-1,1),seen=new Set(),groups=[];
  for(let i=0;i<n;i++){
    if(seen.has(i))continue;const g=[],q=[i];seen.add(i);
    for(let h=0;h<q.length;h++){const a=q[h];g.push(a);for(let j=0;j<n;j++){if(seen.has(j))continue;const sim=cosine(hStates[a]||[],hStates[j]||[]),sameParent=life.meta[a]?.parents?.some(x=>life.meta[j]?.parents?.includes(x));if(sim>=threshold||sameParent){seen.add(j);q.push(j);}}}
    groups.push(g);
  }
  const oldCount=life.logicalFragments?.length||1,newCount=Math.max(1,groups.length),sig=fragmentSignature(groups);
  if(sig!==life.lastFragmentSignature){
    if(newCount>oldCount){life.fragmentations+=newCount-oldCount;pushEvent(life,step,"LOGICAL_FRAGMENT",{from:oldCount,to:newCount,groups:groups.map(x=>[...x])});}
    else if(newCount<oldCount){life.reconstructions+=oldCount-newCount;pushEvent(life,step,"LOGICAL_RECONSTRUCTION",{from:oldCount,to:newCount,groups:groups.map(x=>[...x])});}
    life.lastFragmentSignature=sig;
  }
  life.logicalFragments=groups;return groups;
}
export function lifecycleMaintenance(world,life,hStates,spatial,config,step){
  const out=[],matureAfter=Math.max(2,Number(config.lifecycleMaturationActions)||8);
  for(let i=life.meta.length-1;i>=0;i--){const m=life.meta[i];if(m.status!=="PROVISIONAL")continue;if(m.actions<matureAfter)continue;if(m.utilityEMA>-.02||m.causalProxy>.005){m.status="MATURE";out.push(pushEvent(life,step,"MATURE",{index:i,uid:m.uid,utility:m.utilityEMA}));}else{m.status="DYING";const ev=retireCell(world,life,hStates,spatial,step,i,"FAILED_GERMINATION",config);if(ev)out.push(ev);}}
  while(world.cubes.length>life.maxCells){const c=lowestUsefulRetireCandidate(world,life,hStates);if(c.index<0)break;const ev=retireCell(world,life,hStates,spatial,step,c.index,"APOPTOSIS_RESOURCE_PRESSURE",config);if(ev)out.push(ev);else break;}
  rebuildLogicalFragments(life,hStates,config,step);
  return out;
}
export function lifecycleSnapshot(life){return{cells:life.meta.map(m=>({...m})),births:life.births,retirements:life.retirements,fusions:life.fusions,reactivations:life.reactivations,redundantKills:life.redundantKills,apoptosis:life.apoptosis,dormant:life.dormant.length,sporeReconstructions:life.sporeReconstructions||0,sporeReconstructionFailures:life.sporeReconstructionFailures||0,resource:lifecycleResourceStats(life),logicalFragments:(life.logicalFragments||[]).map(g=>[...g]),fragmentations:life.fragmentations||0,reconstructions:life.reconstructions||0,events:life.events.slice(-64)};}
