import {GRID_W,GRID_H,DEFAULT_SWARM_SIZE} from "./config.js";
import {RNG} from "./math.js";
import * as V8World from "./world-2d-v8.js";

export const key=(x,y,z=0)=>`${x},${y},${z}`;
export function worldDimension(world){return world?.physicalDimensions===3?3:2;}
export function worldGridW(world){return worldDimension(world)===3?world.gridW:V8World.worldGridW(world);}
export function worldGridH(world){return worldDimension(world)===3?world.gridH:V8World.worldGridH(world);}
export function worldGridD(world){return worldDimension(world)===3?world.gridD:1;}
export function dirsForWorld(world){return worldDimension(world)===3?[[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]]:[[1,0,0],[-1,0,0],[0,1,0],[0,-1,0]];}

function idx3(world,x,y,z){return (z*world.gridH+y)*world.gridW+x;}
export function isSolid(world,x,y,z=0){
  if(worldDimension(world)!==3)return V8World.isSolid(world,x,y);
  if(x<0||x>=world.gridW||y<0||y>=world.gridH||z<0||z>=world.gridD)return true;
  return world.free3d[idx3(world,x,y,z)]!==1;
}
export function occupiedMap(cubes,skip=-1){
  const m=new Map();
  for(let i=0;i<cubes.length;i++)if(i!==skip){const c=cubes[i];m.set(key(c.x,c.y,c.z||0),i);}
  return m;
}
export function cubesConnected(cubes,dim=2){
  if(!cubes.length)return true;
  const fake={physicalDimensions:dim},dirs=dirsForWorld(fake),occ=occupiedMap(cubes),seen=new Set([0]),q=[0];
  for(let qi=0;qi<q.length;qi++){
    const i=q[qi],p=cubes[i];
    for(const[dX,dY,dZ]of dirs){const j=occ.get(key(p.x+dX,p.y+dY,(p.z||0)+dZ));if(j!==undefined&&!seen.has(j)){seen.add(j);q.push(j);}}
  }
  return seen.size===cubes.length;
}
export function connectedWithout(cubes,skip,dim=2){if(cubes.length<=2)return true;return cubesConnected(cubes.filter((_,i)=>i!==skip),dim);}
export function destinationDegree(cubes,movingIdx,x,y,z=0,dim=2){
  const fake={physicalDimensions:dim},occ=occupiedMap(cubes,movingIdx);let d=0;
  for(const[dx,dy,dz]of dirsForWorld(fake))if(occ.has(key(x+dx,y+dy,z+dz)))d++;
  return d;
}

function carve(world,x,y,z){
  if(x>0&&x<world.gridW-1&&y>0&&y<world.gridH-1&&z>0&&z<world.gridD-1)world.free3d[idx3(world,x,y,z)]=1;
}
function carveBall(world,cx,cy,cz,r=2){
  for(let z=cz-r;z<=cz+r;z++)for(let y=cy-r;y<=cy+r;y++)for(let x=cx-r;x<=cx+r;x++)if(Math.abs(x-cx)+Math.abs(y-cy)+Math.abs(z-cz)<=r+1)carve(world,x,y,z);
}
function make3DWorld(stage,seed,maxGlobalActions,mapKind,swarmSize){
  const n=Math.max(2,Math.floor(Number(swarmSize)||DEFAULT_SWARM_SIZE)),rng=new RNG((seed>>>0)^0x3d9e3779);
  const gridW=Math.max(24,18+Math.ceil(n/3)),gridH=Math.max(16,12+Math.ceil(Math.sqrt(n))),gridD=Math.max(10,8+Math.ceil(Math.cbrt(n))*2);
  const world={stage,seed:seed>>>0,mapKind,routeKind:mapKind,physicalDimensions:3,v5Procedural:false,gridW,gridH,gridD,free3d:new Uint8Array(gridW*gridH*gridD),
    cubes:[],swarmSize:n,globalStep:0,maxGlobalActions,success:false,lastMove:null,lastMoves:[],simTime:0,egoRuntime:null,distanceField:null,
    checkpoint:{edge:"+X",plane:gridW-2,y:Math.floor(gridH/2),z:Math.floor(gridD/2),bandHalf:2}};
  let x=3,y=Math.floor(gridH/2),z=Math.floor(gridD/2);carveBall(world,x,y,z,Math.max(2,Math.ceil(Math.cbrt(n))));
  const targetX=gridW-3;
  while(x<targetX){
    carveBall(world,x,y,z,1);
    const branch=mapKind==="3d-branching"&&rng.next()<0.25;
    if(branch){
      let by=y,bz=z;for(let k=0;k<3+rng.int(5);k++){by=Math.max(2,Math.min(gridH-3,by+(rng.int(3)-1)));bz=Math.max(2,Math.min(gridD-3,bz+(rng.int(3)-1)));carveBall(world,x,by,bz,1);}
    }
    if(rng.next()<0.65)x++;else if(rng.next()<0.5)y=Math.max(2,Math.min(gridH-3,y+(rng.next()<0.5?-1:1)));else z=Math.max(2,Math.min(gridD-3,z+(rng.next()<0.5?-1:1)));
  }
  carveBall(world,targetX,world.checkpoint.y,world.checkpoint.z,3);
  for(let xx=x;xx<=targetX;xx++)carveBall(world,xx,world.checkpoint.y,world.checkpoint.z,1);
  const start={x:3,y:Math.floor(gridH/2),z:Math.floor(gridD/2)},front=[start],seen=new Set([key(start.x,start.y,start.z)]);
  while(front.length&&world.cubes.length<n){
    const p=front.shift();if(!isSolid(world,p.x,p.y,p.z))world.cubes.push({...p});
    const dirs=dirsForWorld(world).slice().sort(()=>rng.next()-.5);
    for(const[dx,dy,dz]of dirs){const q={x:p.x+dx,y:p.y+dy,z:p.z+dz},k=key(q.x,q.y,q.z);if(!seen.has(k)&&!isSolid(world,q.x,q.y,q.z)){seen.add(k);front.push(q);}}
  }
  if(world.cubes.length<n)throw new Error("3D start chamber cannot fit requested swarm");
  world.distanceField=buildDistanceField(world);
  world.egoRuntime=world.cubes.map((_,i)=>createEgoRuntime(i,world));
  assertWorldInvariants(world);return world;
}

export function isPassed(world,c){
  if(worldDimension(world)!==3)return V8World.isPassed(world,c);
  const cp=world.checkpoint,b=cp.bandHalf||2;
  return c.x>=cp.plane&&Math.abs(c.y-cp.y)<=b&&Math.abs((c.z||0)-cp.z)<=b;
}
export function checkpointZone(world,c){
  if(worldDimension(world)!==3)return V8World.checkpointZone(world,c);
  if(isPassed(world,c))return"PASSED";
  if(c.x===world.checkpoint.plane-1)return"IN_GATE";
  return"PRE_GATE";
}
export function checkpointVector(world,c){
  if(worldDimension(world)!==3){const q=V8World.checkpointVector(world,c);return{dx:q.dx,dy:q.dy,dz:0};}
  const cp=world.checkpoint;return{dx:cp.plane-c.x,dy:cp.y-c.y,dz:cp.z-(c.z||0)};
}
export function localGateHalfWidth(world,c){return worldDimension(world)===3?Math.max(0,Number(world.checkpoint?.bandHalf)||0):V8World.localGateHalfWidth(world,c);}

export function buildDistanceField(world){
  if(worldDimension(world)!==3)return V8World.buildDistanceField(world);
  const n=world.gridW*world.gridH*world.gridD,INF=1<<28,dist=new Int32Array(n);dist.fill(INF);
  const q=[],cp=world.checkpoint,b=cp.bandHalf||2;
  for(let z=0;z<world.gridD;z++)for(let y=0;y<world.gridH;y++){
    const x=cp.plane;if(!isSolid(world,x,y,z)&&Math.abs(y-cp.y)<=b&&Math.abs(z-cp.z)<=b){const k=idx3(world,x,y,z);dist[k]=0;q.push([x,y,z]);}
  }
  for(let h=0;h<q.length;h++){
    const[x,y,z]=q[h],base=dist[idx3(world,x,y,z)];
    for(const[dx,dy,dz]of dirsForWorld(world)){const nx=x+dx,ny=y+dy,nz=z+dz;if(isSolid(world,nx,ny,nz))continue;const k=idx3(world,nx,ny,nz);if(dist[k]>base+1){dist[k]=base+1;q.push([nx,ny,nz]);}}
  }
  return dist;
}
export function distanceAt(world,x,y,z=0){
  if(worldDimension(world)!==3)return V8World.distanceAt(world,x,y);
  if(isPassed(world,{x,y,z}))return 0;if(isSolid(world,x,y,z))return world.gridW+world.gridH+world.gridD;
  const v=world.distanceField[idx3(world,x,y,z)];return v>=(1<<27)?world.gridW+world.gridH+world.gridD:v;
}
export function createEgoRuntime(i,world){
  const c=world.cubes[i],d=distanceAt(world,c.x,c.y,c.z||0);
  return{intentAction:0,confidence:0,lastOwnActualDx:0,lastOwnActualDy:0,lastOwnActualDz:0,lastGlobalDx:0,lastGlobalDy:0,lastGlobalDz:0,sinceLastDx:0,sinceLastDy:0,sinceLastDz:0,motorMismatchX:0,motorMismatchY:0,motorMismatchZ:0,previousReward:0,pendingReward:0,initialDistance:d,maxProgress:0,enteredGate:false,crossedExit:false,actionCount:0,lastActiveGlobalStep:-1};
}
export function makeWorld(stage=0,seed=1,maxGlobalActions=4096,mapKind="stage",swarmSize=DEFAULT_SWARM_SIZE,physicalDimensions=2){
  if(physicalDimensions===3||String(mapKind).startsWith("3d-"))return make3DWorld(stage,seed,maxGlobalActions,mapKind,swarmSize);
  const w=V8World.makeWorld(stage,seed,maxGlobalActions,mapKind,swarmSize);
  w.physicalDimensions=2;w.cubes=w.cubes.map(c=>({...c,z:0}));w.swarmSize=w.cubes.length;w.egoRuntime=w.cubes.map((_,i)=>createEgoRuntime(i,w));return w;
}
export function cloneWorld(world){
  if(worldDimension(world)!==3){
    const w=V8World.cloneWorld(world);w.physicalDimensions=2;w.cubes=w.cubes.map(c=>({...c,z:c.z||0}));return w;
  }
  return{...world,free3d:Uint8Array.from(world.free3d),cubes:world.cubes.map(c=>({...c})),lastMoves:[...(world.lastMoves||[])],distanceField:Int32Array.from(world.distanceField),egoRuntime:world.egoRuntime.map(r=>({...r})),checkpoint:{...world.checkpoint},v9:world.v9?structuredClone(world.v9):undefined};
}
export function bodyMetrics(world){
  let sx=0,sy=0,sz=0,minX=Infinity,maxX=-Infinity,minY=Infinity,maxY=-Infinity,minZ=Infinity,maxZ=-Infinity,passed=0,inGate=0;
  for(const c of world.cubes){sx+=c.x;sy+=c.y;sz+=c.z||0;minX=Math.min(minX,c.x);maxX=Math.max(maxX,c.x);minY=Math.min(minY,c.y);maxY=Math.max(maxY,c.y);minZ=Math.min(minZ,c.z||0);maxZ=Math.max(maxZ,c.z||0);const zone=checkpointZone(world,c);if(zone==="PASSED")passed++;else if(zone==="IN_GATE")inGate++;}
  const n=Math.max(1,world.cubes.length);return{centroidX:sx/n,centroidY:sy/n,centroidZ:sz/n,minX,maxX,minY,maxY,minZ,maxZ,spanX:maxX-minX+1,spanY:maxY-minY+1,spanZ:maxZ-minZ+1,passed,inGate,preGate:n-passed-inGate};
}
export function assertWorldInvariants(world){
  if(!Array.isArray(world.cubes)||world.cubes.length<2)throw new Error("Swarm must contain at least 2 cells");
  const seen=new Set();for(const c of world.cubes){const k=key(c.x,c.y,c.z||0);if(seen.has(k))throw new Error("Duplicate occupancy");if(isSolid(world,c.x,c.y,c.z||0))throw new Error("Cell inside solid");seen.add(k);}
  if(!cubesConnected(world.cubes,worldDimension(world)))throw new Error("Body disconnected");return true;
}
