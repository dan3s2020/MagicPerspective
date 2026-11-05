import {makeWorld,isSolid,isPassed,assertWorldInvariants,worldGridW,worldGridH} from "../vendor/v9_host/src/ego-v9-vectric4v8-qanda-brsi1/world.js";
import {mechanicalCandidates,actionResultCubes} from "../vendor/v9_host/src/ego-v9-vectric4v8-qanda-brsi1/mechanics-2d-v8.js";
import {resolveIntent} from "../vendor/v9_host/src/ego-v9-vectric4v8-qanda-brsi1/mechanics.js";

export const MAP_CELLS_SCHEMA="octopus-map-cells-world-v1";
export const MAP_GOAL_TOKEN="G0";
export const MAP_CELL_COUNT=2;
export const MAP_ACTUATORS=Object.freeze([
  {id:0,learnerName:"ACT0",v9Action:1,observerName:"+X"},
  {id:1,learnerName:"ACT1",v9Action:2,observerName:"-X"},
  {id:2,learnerName:"ACT2",v9Action:3,observerName:"+Y"},
  {id:3,learnerName:"ACT3",v9Action:4,observerName:"-Y"}
]);
export const MAP_V5_KINDS=Object.freeze(["direct","bend","s-curve","backtrack","maze-zigzag","spiral"]);
export const MAP_TRANSFER_KINDS=Object.freeze(["v1-wide","v1-funnel","v1-slit","v1-offset","v1-keyhole","v1-procedural"]);
export const MAP_SPLIT_SIZES=Object.freeze({train:12000,validation:1200,test:2400,transfer:2400});

const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,Number(x)||0));
function mix32(x){x=(Number(x)>>>0)+0x9e3779b9>>>0;x^=x>>>16;x=Math.imul(x,0x21f0aaad);x^=x>>>15;x=Math.imul(x,0x735a2d97);x^=x>>>15;return x>>>0;}
function splitOffset(split){return split==="train"?0x13570000:split==="validation"?0x24680000:split==="test"?0x35790000:0x468a0000;}
export function mapSpec(index=0,{split="train",baseSeed=20261004,maxGlobalActions=384}={}){
  const rawOrdinal=Math.max(0,Math.floor(Number(index)||0)),size=MAP_SPLIT_SIZES[split]||MAP_SPLIT_SIZES.train,ordinal=((rawOrdinal%size)+size)%size;
  const seed=mix32((Number(baseSeed)>>>0)^splitOffset(split)^Math.imul(ordinal+1,0x45d9f3b));
  let kinds;
  if(split==="transfer")kinds=MAP_TRANSFER_KINDS;
  else if(split!=="train")kinds=MAP_V5_KINDS;
  else{
    const phase=Math.floor(rawOrdinal/2000);
    kinds=phase<=0?MAP_V5_KINDS.slice(0,2)
      :phase===1?MAP_V5_KINDS.slice(0,3)
      :phase===2?MAP_V5_KINDS.slice(0,4)
      :phase===3?MAP_V5_KINDS.slice(0,5)
      :MAP_V5_KINDS;
  }
  const mapKind=kinds[ordinal%kinds.length];
  return Object.freeze({schema:"octopus-map-cells-spec-v1",split,ordinal,rawOrdinal,seed,mapKind,curriculumKinds:[...kinds],maxGlobalActions:Math.max(64,Math.floor(maxGlobalActions))});
}

export function createMapCellsWorld(specOrIndex=0,options={}){
  const spec=typeof specOrIndex==="object"&&specOrIndex?.schema?specOrIndex:mapSpec(specOrIndex,options);
  const world=makeWorld(0,spec.seed,spec.maxGlobalActions,spec.mapKind,MAP_CELL_COUNT,2);
  world.schema=MAP_CELLS_SCHEMA;
  world.mapCellsSpec=spec;
  world.energyCapacity=48;
  world.energy=48;
  world.failure=null;
  world.outcome=null;
  world.jointStep=0;
  world.lastJoint=null;
  assertWorldInvariants(world);
  return world;
}

export function mapObserverLayout(world){
  const gridW=worldGridW(world),gridH=worldGridH(world),free=new Uint8Array(gridW*gridH);
  for(let y=0;y<gridH;y++)for(let x=0;x<gridW;x++)free[y*gridW+x]=isSolid(world,x,y)?0:1;
  return{
    observerOnly:true,
    mapKind:world.mapCellsSpec?.mapKind||world.mapKind,
    gridW,gridH,
    free:Array.from(free),
    checkpoint:{...world.checkpoint},
    spawn:world.cubes.map(c=>({x:c.x,y:c.y}))
  };
}

export function mapObserverTruth(world){
  return{
    mapKind:world.mapCellsSpec?.mapKind||world.mapKind,
    seed:world.mapCellsSpec?.seed??world.seed,
    gridW:worldGridW(world),gridH:worldGridH(world),
    cubes:world.cubes.map(c=>({x:c.x,y:c.y})),
    checkpoint:{...world.checkpoint},
    energy:Number(world.energy)||0,
    energyCapacity:Number(world.energyCapacity)||1,
    jointStep:Number(world.jointStep)||0,
    success:Boolean(world.success),
    outcome:world.outcome||null,
    failure:world.failure||null
  };
}

function wall(world,p,dx,dy){return isSolid(world,p.x+dx,p.y+dy)?1:0;}
export function mapLearnerSensors(world,cellIndex){
  const i=Math.max(0,Math.min(1,Math.floor(Number(cellIndex)||0))),j=1-i,p=world.cubes[i],ri=world.egoRuntime[i],rj=world.egoRuntime[j];
  const ownDx=clamp((Number(ri.lastGlobalDx)||0),-1,1),ownDy=clamp((Number(ri.lastGlobalDy)||0),-1,1);
  const otherDx=clamp((Number(rj.lastGlobalDx)||0),-1,1),otherDy=clamp((Number(rj.lastGlobalDy)||0),-1,1);
  const mismatch=clamp(Math.hypot(Number(ri.motorMismatchX)||0,Number(ri.motorMismatchY)||0),0,1);
  const relX=clamp((world.cubes[j].x-p.x)/2,-1,1),relY=clamp((world.cubes[j].y-p.y)/2,-1,1);
  return Float64Array.of(
    wall(world,p,1,0),wall(world,p,-1,0),wall(world,p,0,1),wall(world,p,0,-1),
    relX,relY,
    ownDx,ownDy,otherDx,otherDy,
    mismatch,
    clamp((Number(world.energy)||0)/Math.max(1,Number(world.energyCapacity)||1)),
    .625
  );
}
export function mapLearnerPacket(world,cellIndex){
  return{schema:"octopus-map-cells-learner-packet-v1",sensors:Array.from(mapLearnerSensors(world,cellIndex)),desiredOutcome:MAP_GOAL_TOKEN,actuatorIds:[0,1,2,3]};
}
export function assertMapNoHiddenTruthLeak(packet){
  const t=JSON.stringify(packet);
  for(const x of ["mapKind","seed","checkpoint","distance","path","routeKind","gridW","gridH","x\":","y\":","observerName","+X","-X","+Y","-Y"]){
    if(t.includes(x))throw new Error("hidden map truth leaked into learner packet: "+x);
  }
  return true;
}

export function stepMapCellsWorld(world,learnerActions,confidences=[1,1],mechanicsCfg={}){
  if(world.success||world.failure)throw new Error("cannot step terminal map-cells world");
  const a=Array.from(learnerActions||[]).slice(0,2).map(x=>Math.max(0,Math.min(3,Math.floor(Number(x)||0))));
  while(a.length<2)a.push(0);
  const c=Array.from(confidences||[]).slice(0,2).map(x=>clamp(x,0,1));while(c.length<2)c.push(1);
  const v9Actions=a.map(x=>MAP_ACTUATORS[x].v9Action);
  const before=world.cubes.map(q=>({...q}));
  for(let i=0;i<2;i++){world.egoRuntime[i].intentAction=v9Actions[i];world.egoRuntime[i].confidence=c[i];}
  const results=[];
  for(let i=0;i<2;i++){world.globalStep++;results.push(resolveIntent(world,i,v9Actions[i],c[i],mechanicsCfg));}
  const after=world.cubes.map(q=>({...q}));
  const moved=results.map((r,i)=>Math.hypot(after[i].x-before[i].x,after[i].y-before[i].y));
  const rejected=results.map(r=>!r.accepted);
  const cost=results.reduce((s,r,i)=>s+.20+.18*c[i]+(r.accepted?.05:.12),0);
  world.energy=Math.max(0,(Number(world.energy)||0)-cost);
  world.jointStep++;
  const success=world.cubes.every(q=>isPassed(world,q));
  if(success){world.success=true;world.outcome=MAP_GOAL_TOKEN;}
  else if(world.energy<=1e-9){world.failure="energy";world.outcome="F_ENERGY";}
  else if(world.globalStep>=world.maxGlobalActions){world.failure="timeout";world.outcome="F_TIMEOUT";}
  const reward=success?1:world.failure==="energy"?-.15:world.failure==="timeout"?-.05:0;
  const row={
    jointStep:world.jointStep,learnerActions:a,v9Actions,
    observerNames:a.map(x=>MAP_ACTUATORS[x].observerName),
    before,after,accepted:results.map(r=>Boolean(r.accepted)),reasons:results.map(r=>r.reason),
    requested:results.map(r=>r.requested),actual:results.map(r=>r.actual),moved,rejected,
    netDrive:results.map(r=>Number(r.netDrive)||0),
    cost,reward,success,failure:world.failure,outcome:world.outcome
  };
  world.lastJoint=row;
  return row;
}

const stateKey=cubes=>cubes.map(c=>c.x+","+c.y).join("|");
export function mapOraclePath(specOrIndex=0,options={}){
  const world=createMapCellsWorld(specOrIndex,options),start=world.cubes.map(c=>({...c})),q=[start],seen=new Map([[stateKey(start),null]]),via=new Map();
  let head=0,goalKey=null;
  while(head<q.length&&seen.size<250000){
    const cubes=q[head++],k0=stateKey(cubes);
    world.cubes=cubes.map(c=>({...c}));
    if(cubes.every(c=>isPassed(world,c))){goalKey=k0;break;}
    for(let active=0;active<2;active++){
      world.cubes=cubes.map(c=>({...c}));
      const candidates=mechanicalCandidates(world,active);
      for(const cand of candidates){
        world.cubes=cubes.map(c=>({...c}));
        const next=actionResultCubes(world,cand),k=stateKey(next);
        if(seen.has(k))continue;
        seen.set(k,k0);via.set(k,{active,candidate:{kind:cand.kind,anchor:cand.anchor,turn:cand.turn,moves:cand.moves.map(m=>({...m}))}});q.push(next);
      }
    }
  }
  if(!goalKey)return{success:false,visited:seen.size,path:[]};
  const path=[];
  for(let k=goalKey;seen.get(k)!=null;k=seen.get(k))path.push(via.get(k));
  path.reverse();
  return{success:true,visited:seen.size,path,pathLength:path.length};
}

export function mapWorldContractProof({samples=6,baseSeed=20261004}={}){
  const packet=mapLearnerPacket(createMapCellsWorld(0,{split:"train",baseSeed}),0);assertMapNoHiddenTruthLeak(packet);
  const results={};
  for(const split of ["train","validation","test","transfer"]){
    let solved=0,total=0,maxPath=0;
    const n=Math.max(1,Math.floor(samples));
    for(let i=0;i<n;i++){const r=mapOraclePath(i,{split,baseSeed});total++;if(r.success){solved++;maxPath=Math.max(maxPath,r.pathLength);}}
    results[split]={solved,total,rate:solved/total,maxPath};
  }
  return{noLeak:true,cellCount:MAP_CELL_COUNT,actionCount:4,results,allOracleSolvable:Object.values(results).every(x=>x.rate===1)};
}
